import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { RuntimeError } from "./errors.js";
import { PRODUCT_IDENTITY, STATE_OWNERSHIP, schemaName } from "./product-identity.js";
import { channelIdentityDigest, messengerSessionKind, normalizeChannelIdentity } from "./channel-envelope.js";
import { verifyResponseDocument } from "./response-document.js";
import { createSurfaceEvent } from "./surface-event.js";
import { approveGrowthProposal, createCanaryMutation, requestCanaryRollback, verifyCanaryRollback } from "./growth-engine.js";
import { MEMORY_SCOPE_ORDER } from "./mct-contract.js";

const CURRENT_SCHEMA_VERSION = 14;
const LEGACY_DATABASE_FILES = ["runtime.sqlite"];
const TELEMETRY_STAGES = new Set(["accepted", "dispatching", "responding", "completed", "failed", "cancelled", "uncertain"]);

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function publicMemorySourceKind(source) {
  const value = String(source || "").toLowerCase();
  if (/(?:owner|user|explicit)/.test(value)) return "owner";
  if (/(?:conversation|workspace|session|chat)/.test(value)) return "conversation";
  if (/(?:document|file|tool|web)/.test(value)) return "document";
  return "memory";
}

function publicGrowthTitle(detail = {}) {
  const keys = Object.keys(detail.proposedChange || {});
  const capacity = keys.some(key => ["maxAnchors", "maxSupporting"].includes(key));
  const relevance = keys.some(key => ["relevanceThreshold", "anchorThreshold"].includes(key));
  if (capacity && relevance) return "기억 선택 기준을 더 정확하게 조정";
  if (capacity) return "답변에 사용하는 기억의 양을 조정";
  if (relevance) return "관련성이 낮은 기억을 더 엄격하게 제외";
  return "반복된 작업 원리를 안전하게 개선";
}

function json(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function memoryScopeIdentity(record) {
  return json({
    level: record.scopeLevel,
    sessionId: record.scopeLevel === "session" ? record.sessionId : null,
    projectId: record.scopeLevel === "project" ? record.projectId : null,
    userId: record.userId,
    channelId: record.channelId || null
  });
}

function searchText(value) {
  return String(value || "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, " ").trim();
}

function quotedFtsTerms(values) {
  return [...new Set(values.filter(Boolean))].slice(0, 32).map(value => `"${value.replaceAll('"', '""')}"`).join(" OR ");
}

function lexicalFtsQuery(value) {
  return quotedFtsTerms(searchText(value).match(/[\p{L}\p{N}_-]{2,}/gu) || []);
}

function vectorFtsQuery(value) {
  const compact = searchText(value).replaceAll(" ", "");
  const grams = [];
  for (let index = 0; index <= compact.length - 3; index += 1) grams.push(compact.slice(index, index + 3));
  return quotedFtsTerms(grams);
}

function localVector(value, dimensions = 64) {
  const compact = searchText(value).replaceAll(" ", "");
  const vector = new Array(dimensions).fill(0);
  for (let index = 0; index <= compact.length - 3; index += 1) {
    const gram = compact.slice(index, index + 3);
    let hash = 2166136261;
    for (const character of gram) { hash ^= character.codePointAt(0); hash = Math.imul(hash, 16777619); }
    vector[(hash >>> 0) % dimensions] += (hash & 1) === 0 ? 1 : -1;
  }
  const norm = Math.sqrt(vector.reduce((sum, number) => sum + number * number, 0)) || 1;
  return vector.map(number => number / norm);
}

function cosine(left, right) {
  return left.reduce((sum, number, index) => sum + number * (right[index] || 0), 0);
}

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const beforePrevious = [...previous];
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      let value = Math.min(current[rightIndex - 1] + 1, previous[rightIndex] + 1, previous[rightIndex - 1] + cost);
      if (leftIndex > 1 && rightIndex > 1 && left[leftIndex - 1] === right[rightIndex - 2] && left[leftIndex - 2] === right[rightIndex - 1]) value = Math.min(value, beforePrevious[rightIndex - 2] + 1);
      current.push(value);
    }
    beforePrevious.splice(0, beforePrevious.length, ...previous);
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function fuzzyTokenScore(query, text) {
  const queryTokens = (searchText(query).match(/[\p{L}\p{N}_-]{3,}/gu) || []).map(token => token.replace(/[^\p{L}\p{N}]/gu, ""));
  const textTokens = (searchText(text).match(/[\p{L}\p{N}_-]{3,}/gu) || []).slice(0, 48).map(token => token.replace(/[^\p{L}\p{N}]/gu, ""));
  let best = 0;
  for (const left of queryTokens) for (const right of textTokens) {
    if (Math.abs(left.length - right.length) > 2) continue;
    best = Math.max(best, 1 - editDistance(left, right) / Math.max(left.length, right.length, 1));
  }
  return Math.max(0, best);
}

export class StateStore {
  constructor(stateDir) {
    this.stateDir = stateDir;
    fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
    this.dbPath = path.join(stateDir, PRODUCT_IDENTITY.databaseFile);
    this.adoptLegacyDatabase();
    this.db = new DatabaseSync(this.dbPath);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  adoptLegacyDatabase() {
    if (fs.existsSync(this.dbPath)) return;
    for (const legacyName of LEGACY_DATABASE_FILES) {
      const legacyPath = path.join(this.stateDir, legacyName);
      if (!fs.existsSync(legacyPath)) continue;
      fs.renameSync(legacyPath, this.dbPath);
      for (const suffix of ["-wal", "-shm"]) {
        if (fs.existsSync(`${legacyPath}${suffix}`)) fs.renameSync(`${legacyPath}${suffix}`, `${this.dbPath}${suffix}`);
      }
      return;
    }
  }

  migrate() {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);");
      const startingVersion = Number(this.getMeta("schema_version") || 0);
      if (!Number.isInteger(startingVersion) || startingVersion < 0 || startingVersion > CURRENT_SCHEMA_VERSION) {
        throw new RuntimeError("unsupported_state_schema", "Saved GPAO-T3 state uses an unsupported schema version", 409, { startingVersion, supportedVersion: CURRENT_SCHEMA_VERSION });
      }
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS preferences (
          key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS commands (
          id TEXT PRIMARY KEY,
          principal_id TEXT NOT NULL,
          request_id TEXT NOT NULL,
          request_digest TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          UNIQUE(principal_id, request_id)
        );
        CREATE TABLE IF NOT EXISTS outbox (
          id TEXT PRIMARY KEY,
          command_id TEXT NOT NULL UNIQUE,
          principal_id TEXT NOT NULL,
          state TEXT NOT NULL,
          generation INTEGER,
          attempts INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY(command_id) REFERENCES commands(id)
        );
        CREATE TABLE IF NOT EXISTS events (
          seq INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id TEXT NOT NULL UNIQUE,
          command_id TEXT,
          principal_id TEXT,
          type TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          runtime_generation INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          prev_hash TEXT NOT NULL,
          hash TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS receipts (
          command_id TEXT PRIMARY KEY,
          principal_id TEXT NOT NULL,
          status TEXT NOT NULL,
          result_json TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY(command_id) REFERENCES commands(id)
        );
        CREATE TABLE IF NOT EXISTS progress (
          seq INTEGER PRIMARY KEY AUTOINCREMENT,
          command_id TEXT NOT NULL,
          principal_id TEXT NOT NULL,
          phase TEXT NOT NULL,
          detail_json TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY(command_id) REFERENCES commands(id)
        );
        CREATE INDEX IF NOT EXISTS idx_commands_principal ON commands(principal_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_outbox_state ON outbox(state, created_at);
        CREATE INDEX IF NOT EXISTS idx_events_principal ON events(principal_id, seq);
        CREATE INDEX IF NOT EXISTS idx_progress_command ON progress(command_id, seq);
      `);
      if (startingVersion < 2) {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS state_ownership (
            domain TEXT PRIMARY KEY,
            owner TEXT NOT NULL,
            durability TEXT NOT NULL,
            table_name TEXT,
            updated_at INTEGER NOT NULL
          );
        `);
      }
      if (startingVersion < 3) {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS turn_stage_telemetry (
            seq INTEGER PRIMARY KEY AUTOINCREMENT,
            command_id TEXT NOT NULL,
            principal_id TEXT NOT NULL,
            stage TEXT NOT NULL,
            elapsed_from_accept_ms INTEGER NOT NULL,
            detail_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(command_id) REFERENCES commands(id)
          );
          CREATE INDEX IF NOT EXISTS idx_turn_stage_telemetry_command ON turn_stage_telemetry(command_id, seq);
        `);
      }
      if (startingVersion < 4) {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS messenger_sessions (
            session_id TEXT PRIMARY KEY,
            session_kind TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            adapter_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            peer_kind TEXT NOT NULL,
            peer_id TEXT NOT NULL,
            thread_id TEXT,
            identity_digest TEXT NOT NULL UNIQUE,
            context_scope TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );
          CREATE TABLE IF NOT EXISTS channel_bindings (
            binding_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            identity_digest TEXT NOT NULL UNIQUE,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY(session_id) REFERENCES messenger_sessions(session_id)
          );
          CREATE TABLE IF NOT EXISTS channel_inbound (
            inbound_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            adapter_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            event_id TEXT NOT NULL,
            cursor_value TEXT,
            scope_key TEXT NOT NULL,
            status TEXT NOT NULL,
            envelope_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            UNIQUE(adapter_id, account_id, event_id),
            FOREIGN KEY(session_id) REFERENCES messenger_sessions(session_id)
          );
          CREATE TABLE IF NOT EXISTS channel_checkpoints (
            adapter_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            scope_key TEXT NOT NULL,
            cursor_value TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY(adapter_id, account_id, scope_key)
          );
          CREATE TABLE IF NOT EXISTS channel_deliveries (
            delivery_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            status TEXT NOT NULL,
            envelope_json TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            external_message_id TEXT,
            last_error_code TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY(session_id) REFERENCES messenger_sessions(session_id),
            UNIQUE(session_id, idempotency_key)
          );
          CREATE INDEX IF NOT EXISTS idx_channel_inbound_session ON channel_inbound(session_id, created_at);
          CREATE INDEX IF NOT EXISTS idx_channel_inbound_status ON channel_inbound(status, created_at);
          CREATE INDEX IF NOT EXISTS idx_channel_deliveries_status ON channel_deliveries(status, created_at);
        `);
      }
      if (startingVersion < 5) {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS session_workspaces (
            session_id TEXT PRIMARY KEY,
            principal_id TEXT NOT NULL,
            title TEXT NOT NULL,
            pinned INTEGER NOT NULL DEFAULT 0,
            archived INTEGER NOT NULL DEFAULT 0,
            deleted INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );
          CREATE TABLE IF NOT EXISTS workspace_messages (
            message_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            text TEXT NOT NULL,
            trace_ref TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(session_id) REFERENCES session_workspaces(session_id)
          );
          CREATE TABLE IF NOT EXISTS memory_wiki (
            memory_id TEXT PRIMARY KEY,
            session_id TEXT,
            text TEXT NOT NULL,
            source TEXT NOT NULL,
            trace_ref TEXT NOT NULL,
            review_state TEXT NOT NULL,
            replay_state TEXT NOT NULL,
            promotion_state TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );
          CREATE TABLE IF NOT EXISTS context_influences (
            influence_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            source_memory_id TEXT NOT NULL,
            text TEXT NOT NULL,
            trace_ref TEXT NOT NULL,
            state TEXT NOT NULL,
            replay_score REAL NOT NULL,
            rollback_token TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            applied_at INTEGER NOT NULL,
            rolled_back_at INTEGER,
            rollback_reason TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_workspace_principal ON session_workspaces(principal_id, archived, updated_at);
          CREATE INDEX IF NOT EXISTS idx_workspace_messages_session ON workspace_messages(session_id, created_at);
          CREATE INDEX IF NOT EXISTS idx_memory_wiki_session ON memory_wiki(session_id, review_state, updated_at);
          CREATE INDEX IF NOT EXISTS idx_context_influence_session ON context_influences(session_id, state, applied_at);
        `);
      }
      if (startingVersion < 6) {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS response_documents (
            response_document_id TEXT PRIMARY KEY,
            turn_id TEXT NOT NULL,
            session_id TEXT NOT NULL,
            principal_id TEXT NOT NULL,
            digest TEXT NOT NULL,
            document_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            UNIQUE(principal_id, turn_id)
          );
          CREATE TABLE IF NOT EXISTS surface_event_journal (
            seq INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT NOT NULL UNIQUE,
            turn_id TEXT NOT NULL,
            session_id TEXT NOT NULL,
            principal_id TEXT NOT NULL,
            turn_sequence INTEGER NOT NULL,
            type TEXT NOT NULL,
            source_event_id TEXT,
            response_document_id TEXT,
            digest TEXT NOT NULL,
            event_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            UNIQUE(principal_id, turn_id, turn_sequence),
            FOREIGN KEY(response_document_id) REFERENCES response_documents(response_document_id)
          );
          CREATE INDEX IF NOT EXISTS idx_response_documents_session ON response_documents(principal_id, session_id, created_at);
          CREATE INDEX IF NOT EXISTS idx_surface_event_turn ON surface_event_journal(principal_id, turn_id, turn_sequence);
        `);
      }
      if (startingVersion < 7) {
        this.db.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS memory_lexical_fts USING fts5(memory_id UNINDEXED, text, tokenize='unicode61 remove_diacritics 2');
          CREATE VIRTUAL TABLE IF NOT EXISTS memory_vector_fts USING fts5(memory_id UNINDEXED, text, tokenize='trigram');
          CREATE TABLE IF NOT EXISTS memory_vector_projection (memory_id TEXT PRIMARY KEY, algorithm TEXT NOT NULL, dimensions INTEGER NOT NULL, vector_json TEXT NOT NULL, updated_at INTEGER NOT NULL);
          DELETE FROM memory_lexical_fts;
          DELETE FROM memory_vector_fts;
          INSERT INTO memory_lexical_fts(memory_id, text) SELECT memory_id, text FROM memory_wiki;
          INSERT INTO memory_vector_fts(memory_id, text) SELECT memory_id, lower(replace(text, ' ', '')) FROM memory_wiki;
        `);
        const projection = this.db.prepare("INSERT OR REPLACE INTO memory_vector_projection(memory_id, algorithm, dimensions, vector_json, updated_at) VALUES(?, 'char_trigram_hash_v1', 64, ?, ?)");
        for (const row of this.db.prepare("SELECT memory_id, text, updated_at FROM memory_wiki").all()) projection.run(row.memory_id, json(localVector(row.text)), row.updated_at);
      }
      if (startingVersion < 8) {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS mct_task_packets (
            task_packet_id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            digest TEXT NOT NULL,
            packet_json TEXT NOT NULL,
            created_at INTEGER NOT NULL
          );
          CREATE TABLE IF NOT EXISTS mct_tcell_candidates (
            candidate_id TEXT PRIMARY KEY,
            source_candidate_id TEXT NOT NULL,
            task_packet_id TEXT NOT NULL,
            digest TEXT NOT NULL,
            candidate_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(task_packet_id) REFERENCES mct_task_packets(task_packet_id)
          );
          CREATE TABLE IF NOT EXISTS mct_admission_decisions (
            decision_id TEXT PRIMARY KEY,
            candidate_id TEXT NOT NULL,
            source_candidate_id TEXT NOT NULL,
            task_packet_id TEXT NOT NULL,
            state TEXT NOT NULL,
            digest TEXT NOT NULL,
            decision_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(task_packet_id) REFERENCES mct_task_packets(task_packet_id),
            FOREIGN KEY(candidate_id) REFERENCES mct_tcell_candidates(candidate_id)
          );
          CREATE TABLE IF NOT EXISTS mct_response_influences (
            influence_id TEXT PRIMARY KEY,
            response_document_id TEXT NOT NULL,
            decision_id TEXT NOT NULL,
            candidate_id TEXT NOT NULL,
            role TEXT NOT NULL,
            digest TEXT NOT NULL,
            influence_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(response_document_id) REFERENCES response_documents(response_document_id),
            FOREIGN KEY(decision_id) REFERENCES mct_admission_decisions(decision_id)
          );
          CREATE INDEX IF NOT EXISTS idx_mct_task_packet_session ON mct_task_packets(session_id, created_at);
          CREATE INDEX IF NOT EXISTS idx_mct_decision_task ON mct_admission_decisions(task_packet_id, state);
          CREATE INDEX IF NOT EXISTS idx_mct_influence_response ON mct_response_influences(response_document_id, role);
        `);
      }
      if (startingVersion < 9) {
        this.db.exec(`
          ALTER TABLE memory_wiki ADD COLUMN scope_level TEXT NOT NULL DEFAULT 'session';
          ALTER TABLE memory_wiki ADD COLUMN project_id TEXT;
          ALTER TABLE memory_wiki ADD COLUMN user_id TEXT;
          ALTER TABLE memory_wiki ADD COLUMN channel_id TEXT;
          UPDATE memory_wiki SET scope_level = CASE WHEN session_id IS NULL THEN 'user_global' ELSE 'session' END;
          UPDATE memory_wiki SET user_id = 'local-owner' WHERE scope_level = 'user_global' AND user_id IS NULL;
          CREATE INDEX IF NOT EXISTS idx_memory_wiki_scope ON memory_wiki(scope_level, session_id, project_id, user_id, updated_at);
        `);
      }
      if (startingVersion < 10) {
        this.db.exec(`
          ALTER TABLE memory_wiki ADD COLUMN contradiction_group TEXT;
          ALTER TABLE memory_wiki ADD COLUMN supersedes_memory_id TEXT;
          ALTER TABLE memory_wiki ADD COLUMN invalidated_at INTEGER;
          CREATE INDEX IF NOT EXISTS idx_memory_wiki_relation ON memory_wiki(contradiction_group, updated_at);
        `);
      }
      if (startingVersion < 11) {
        this.db.exec(`
          ALTER TABLE memory_wiki ADD COLUMN authority_decision_id TEXT;
          UPDATE memory_wiki SET user_id = 'local-owner' WHERE user_id IS NULL;
          ALTER TABLE context_influences ADD COLUMN scope_level TEXT NOT NULL DEFAULT 'session';
          ALTER TABLE context_influences ADD COLUMN project_id TEXT;
          ALTER TABLE context_influences ADD COLUMN user_id TEXT;
          ALTER TABLE context_influences ADD COLUMN channel_id TEXT;
          ALTER TABLE context_influences ADD COLUMN authority_decision_id TEXT;
          UPDATE context_influences SET user_id = 'local-owner' WHERE user_id IS NULL;
          CREATE INDEX IF NOT EXISTS idx_context_influence_owner ON context_influences(user_id, scope_level, session_id, project_id, state, applied_at);
        `);
      }
      if (startingVersion < 12) {
        this.db.exec(`
          ALTER TABLE memory_wiki ADD COLUMN authority_decision_class TEXT;
          ALTER TABLE memory_wiki ADD COLUMN authority_principal_id TEXT;
          ALTER TABLE memory_wiki ADD COLUMN authority_scope TEXT;
        `);
      }
      if (startingVersion < 13) {
        this.db.exec(`
          UPDATE memory_wiki SET authority_decision_id = NULL, authority_decision_class = NULL, authority_principal_id = NULL, authority_scope = NULL
          WHERE authority_decision_id IS NOT NULL AND (authority_decision_class IS NULL OR authority_principal_id IS NULL OR authority_scope IS NULL);
        `);
      }
      if (startingVersion < 14) {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS mct_growth_proposals (
            proposal_id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL,
            scope_level TEXT NOT NULL,
            status TEXT NOT NULL,
            digest TEXT NOT NULL,
            proposal_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            expires_at INTEGER
          );
          CREATE TABLE IF NOT EXISTS mct_replay_results (
            replay_result_id TEXT PRIMARY KEY,
            proposal_id TEXT NOT NULL,
            passed INTEGER NOT NULL,
            digest TEXT NOT NULL,
            result_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(proposal_id) REFERENCES mct_growth_proposals(proposal_id)
          );
          CREATE TABLE IF NOT EXISTS mct_mutation_ledger (
            mutation_id TEXT PRIMARY KEY,
            proposal_id TEXT NOT NULL,
            replay_result_id TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            status TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            digest TEXT NOT NULL,
            mutation_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY(proposal_id) REFERENCES mct_growth_proposals(proposal_id),
            FOREIGN KEY(replay_result_id) REFERENCES mct_replay_results(replay_result_id)
          );
          CREATE TABLE IF NOT EXISTS mct_rollback_receipts (
            rollback_receipt_id TEXT PRIMARY KEY,
            mutation_id TEXT NOT NULL UNIQUE,
            verified INTEGER NOT NULL,
            digest TEXT NOT NULL,
            receipt_json TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY(mutation_id) REFERENCES mct_mutation_ledger(mutation_id)
          );
          CREATE INDEX IF NOT EXISTS idx_mct_growth_owner ON mct_growth_proposals(owner_id, status, updated_at);
          CREATE INDEX IF NOT EXISTS idx_mct_replay_proposal ON mct_replay_results(proposal_id, created_at);
          CREATE INDEX IF NOT EXISTS idx_mct_mutation_owner ON mct_mutation_ledger(owner_id, status, expires_at);
        `);
      }
      const statement = this.db.prepare("INSERT INTO state_ownership(domain, owner, durability, table_name, updated_at) VALUES(?, ?, ?, ?, ?) ON CONFLICT(domain) DO UPDATE SET owner = excluded.owner, durability = excluded.durability, table_name = excluded.table_name, updated_at = excluded.updated_at");
      const ownershipUpdatedAt = Date.now();
      for (const entry of STATE_OWNERSHIP) statement.run(entry.domain, entry.owner, entry.durability, entry.table, ownershipUpdatedAt);
      this.setMeta("schema_version", String(CURRENT_SCHEMA_VERSION));
      this.setMeta("product_id", PRODUCT_IDENTITY.productId);
      this.setMeta("state_namespace", PRODUCT_IDENTITY.stateNamespace);
      this.setMeta("database_file", PRODUCT_IDENTITY.databaseFile);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  transaction(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  getMeta(key) {
    return this.db.prepare("SELECT value FROM meta WHERE key = ?").get(key)?.value;
  }

  setMeta(key, value) {
    this.db.prepare("INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, String(value));
  }

  getPreference(key) {
    const row = this.db.prepare("SELECT value_json, updated_at FROM preferences WHERE key = ?").get(key);
    return row ? { value: JSON.parse(row.value_json), updatedAt: row.updated_at } : null;
  }

  setPreference(key, value) {
    const updatedAt = Date.now();
    this.db.prepare("INSERT INTO preferences(key, value_json, updated_at) VALUES(?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at").run(key, json(value), updatedAt);
    return { value, updatedAt };
  }

  createWorkspace({ sessionId, principalId, title = "새 대화" }) {
    const now = Date.now();
    const existing = this.db.prepare("SELECT * FROM session_workspaces WHERE session_id = ? AND principal_id = ?").get(sessionId, principalId);
    if (existing) return this.workspaceRecord(existing);
    this.db.prepare("INSERT INTO session_workspaces(session_id, principal_id, title, created_at, updated_at) VALUES(?, ?, ?, ?, ?)").run(sessionId, principalId, String(title).slice(0, 120) || "새 대화", now, now);
    return this.workspaceRecord(this.db.prepare("SELECT * FROM session_workspaces WHERE session_id = ?").get(sessionId));
  }

  listWorkspaces(principalId, { includeArchived = false } = {}) {
    const rows = this.db.prepare(`SELECT * FROM session_workspaces WHERE principal_id = ? AND deleted = 0 ${includeArchived ? "" : "AND archived = 0"} ORDER BY pinned DESC, updated_at DESC`).all(principalId);
    return { schema: "gpao_t3.session_workspaces.v1", workspaces: rows.map(row => this.workspaceRecord(row)) };
  }

  workspaceRecord(row) {
    return { sessionId: row.session_id, title: row.title, pinned: Boolean(row.pinned), archived: Boolean(row.archived), createdAt: row.created_at, updatedAt: row.updated_at };
  }

  updateWorkspace(sessionId, principalId, changes = {}) {
    const row = this.db.prepare("SELECT * FROM session_workspaces WHERE session_id = ? AND principal_id = ? AND deleted = 0").get(sessionId, principalId);
    if (!row) throw new RuntimeError("workspace_not_found", "대화 작업공간을 찾을 수 없습니다.", 404);
    const title = "title" in changes ? String(changes.title || "새 대화").slice(0, 120) : row.title;
    const pinned = "pinned" in changes ? Number(changes.pinned === true) : row.pinned;
    const archived = "archived" in changes ? Number(changes.archived === true) : row.archived;
    this.db.prepare("UPDATE session_workspaces SET title = ?, pinned = ?, archived = ?, updated_at = ? WHERE session_id = ? AND principal_id = ?").run(title, pinned, archived, Date.now(), sessionId, principalId);
    return this.workspaceRecord(this.db.prepare("SELECT * FROM session_workspaces WHERE session_id = ?").get(sessionId));
  }

  deleteWorkspace(sessionId, principalId) {
    const changed = this.db.prepare("UPDATE session_workspaces SET deleted = 1, updated_at = ? WHERE session_id = ? AND principal_id = ? AND deleted = 0").run(Date.now(), sessionId, principalId);
    return { sessionId, deleted: changed.changes === 1 };
  }

  appendWorkspaceMessage({ messageId, sessionId, principalId, role, text, traceRef = null }) {
    if (!["user", "assistant", "system"].includes(role)) throw new RuntimeError("workspace_message_invalid", "지원하지 않는 대화 역할입니다.", 400);
    const workspace = this.db.prepare("SELECT session_id FROM session_workspaces WHERE session_id = ? AND principal_id = ? AND deleted = 0").get(sessionId, principalId);
    if (!workspace) throw new RuntimeError("workspace_not_found", "대화 작업공간을 찾을 수 없습니다.", 404);
    const normalized = String(text || "");
    if (!normalized || Buffer.byteLength(normalized) > 1024 * 1024) throw new RuntimeError("workspace_message_invalid", "대화 내용이 비어 있거나 너무 큽니다.", 400);
    const now = Date.now();
    this.db.prepare("INSERT OR IGNORE INTO workspace_messages(message_id, session_id, role, text, trace_ref, created_at) VALUES(?, ?, ?, ?, ?, ?)").run(messageId, sessionId, role, normalized, traceRef, now);
    this.db.prepare("UPDATE session_workspaces SET updated_at = ? WHERE session_id = ?").run(now, sessionId);
    return { messageId, sessionId, role, text: normalized, traceRef, createdAt: now };
  }

  getWorkspace(sessionId, principalId) {
    const row = this.db.prepare("SELECT * FROM session_workspaces WHERE session_id = ? AND principal_id = ? AND deleted = 0").get(sessionId, principalId);
    if (!row) return null;
    const provenanceQuery = this.db.prepare(`
      SELECT i.response_document_id, i.role, w.source, w.scope_level
      FROM mct_response_influences i
      JOIN mct_admission_decisions d ON d.decision_id = i.decision_id
      LEFT JOIN memory_wiki w ON w.memory_id = d.source_candidate_id
      WHERE d.task_packet_id = ?
      ORDER BY i.created_at, i.influence_id
    `);
    const messages = this.db.prepare("SELECT message_id, role, text, trace_ref, created_at FROM workspace_messages WHERE session_id = ? ORDER BY rowid").all(sessionId).map(message => {
      const provenanceRows = message.role === "assistant" && message.trace_ref ? provenanceQuery.all(message.trace_ref) : [];
      const sources = provenanceRows.map(item => ({ sourceKind: publicMemorySourceKind(item.source), scope: item.scope_level || "session", role: item.role }));
      return {
        messageId: message.message_id,
        role: message.role,
        text: message.text,
        traceRef: message.trace_ref,
        createdAt: message.created_at,
        provenance: sources.length ? { responseDocumentId: provenanceRows[0].response_document_id, usedCount: sources.length, sources } : null
      };
    });
    return { schema: "gpao_t3.session_workspace.v1", ...this.workspaceRecord(row), messages };
  }

  addMemoryCandidate(record) {
    const now = record.createdAt || Date.now();
    const scopeLevel = record.scopeLevel || (record.sessionId ? "session" : null);
    if (!scopeLevel || !["session", "project", "user_global"].includes(scopeLevel)) throw new RuntimeError("memory_scope_required", "기억 저장에는 명시적인 범위가 필요합니다.", 400);
    if (scopeLevel === "session" && !record.sessionId) throw new RuntimeError("memory_scope_required", "세션 기억에는 대화 ID가 필요합니다.", 400);
    if (scopeLevel === "project" && !record.projectId) throw new RuntimeError("memory_scope_required", "프로젝트 기억에는 프로젝트 ID가 필요합니다.", 400);
    if (scopeLevel === "user_global" && !record.userId) throw new RuntimeError("memory_scope_required", "전역 기억에는 사용자 ID가 필요합니다.", 400);
    const ownerId = record.userId || "local-owner";
    if (record.supersedesMemoryId) {
      const superseded = this.getMemoryRecord(record.supersedesMemoryId);
      const sameScope = superseded && superseded.userId === ownerId && superseded.scopeLevel === scopeLevel && (superseded.channelId || null) === (record.channelId || null) && (scopeLevel !== "session" || superseded.sessionId === record.sessionId) && (scopeLevel !== "project" || superseded.projectId === record.projectId);
      if (!sameScope) throw new RuntimeError("memory_supersession_scope_mismatch", "교체할 기억은 동일한 사용자와 실제 범위에 있어야 합니다.", 409);
    }
    const changed = this.db.prepare("INSERT OR IGNORE INTO memory_wiki(memory_id, session_id, text, source, trace_ref, review_state, replay_state, promotion_state, created_at, updated_at, scope_level, project_id, user_id, channel_id, contradiction_group, supersedes_memory_id) VALUES(?, ?, ?, ?, ?, 'candidate', 'untested', 'candidate', ?, ?, ?, ?, ?, ?, ?, ?)").run(record.id, record.sessionId || null, record.text, record.source, record.traceRef, now, now, scopeLevel, record.projectId || null, ownerId, record.channelId || null, record.contradictionGroup || null, record.supersedesMemoryId || null);
    if (changed.changes === 1) {
      this.db.prepare("INSERT INTO memory_lexical_fts(memory_id, text) VALUES(?, ?)").run(record.id, record.text);
      this.db.prepare("INSERT INTO memory_vector_fts(memory_id, text) VALUES(?, ?)").run(record.id, searchText(record.text).replaceAll(" ", ""));
      this.db.prepare("INSERT INTO memory_vector_projection(memory_id, algorithm, dimensions, vector_json, updated_at) VALUES(?, 'char_trigram_hash_v1', 64, ?, ?)").run(record.id, json(localVector(record.text)), now);
      if (record.supersedesMemoryId) {
        this.db.prepare("UPDATE memory_wiki SET invalidated_at = ?, promotion_state = CASE WHEN promotion_state = 'approved' THEN 'rolled_back' ELSE promotion_state END, updated_at = ? WHERE memory_id = ? AND user_id = ? AND invalidated_at IS NULL").run(now, now, record.supersedesMemoryId, ownerId);
        this.db.prepare("UPDATE context_influences SET state = 'rolled_back', rolled_back_at = ?, rollback_reason = 'source_superseded' WHERE source_memory_id = ? AND user_id = ? AND state = 'applied'").run(now, record.supersedesMemoryId, ownerId);
      }
    }
    return this.getMemoryRecord(record.id);
  }

  saveMctAdmissionBundle(bundle) {
    const packet = bundle?.taskPacket;
    if (!packet?.id || !packet.sessionId || !Array.isArray(bundle.candidates) || !Array.isArray(bundle.decisions)) throw new RuntimeError("invalid_mct_admission_bundle", "MCT admission bundle is incomplete", 400);
    const packetJson = json(packet);
    this.db.prepare("INSERT OR IGNORE INTO mct_task_packets(task_packet_id, session_id, digest, packet_json, created_at) VALUES(?, ?, ?, ?, ?)").run(packet.id, packet.sessionId, digest(packetJson), packetJson, packet.createdAt);
    const insertCandidate = this.db.prepare("INSERT OR IGNORE INTO mct_tcell_candidates(candidate_id, source_candidate_id, task_packet_id, digest, candidate_json, created_at) VALUES(?, ?, ?, ?, ?, ?)");
    for (const candidate of bundle.candidates) {
      const candidateJson = json(candidate);
      insertCandidate.run(candidate.id, candidate.sourceCandidateId, packet.id, digest(candidateJson), candidateJson, candidate.createdAt);
    }
    const insertDecision = this.db.prepare("INSERT OR IGNORE INTO mct_admission_decisions(decision_id, candidate_id, source_candidate_id, task_packet_id, state, digest, decision_json, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)");
    for (const decision of bundle.decisions) {
      const decisionJson = json(decision);
      insertDecision.run(decision.id, decision.candidateId, decision.sourceCandidateId, packet.id, decision.state, digest(decisionJson), decisionJson, decision.createdAt);
    }
    return { schema: "gpao_t3.mct_admission_receipt.v1", taskPacketId: packet.id, candidateCount: bundle.candidates.length, decisionCount: bundle.decisions.length, persisted: true };
  }

  getMctAdmissionBundle(taskPacketId) {
    const packet = this.db.prepare("SELECT packet_json FROM mct_task_packets WHERE task_packet_id = ?").get(taskPacketId);
    if (!packet) return null;
    return {
      taskPacket: JSON.parse(packet.packet_json),
      candidates: this.db.prepare("SELECT candidate_json FROM mct_tcell_candidates WHERE task_packet_id = ? ORDER BY rowid").all(taskPacketId).map(row => JSON.parse(row.candidate_json)),
      decisions: this.db.prepare("SELECT decision_json FROM mct_admission_decisions WHERE task_packet_id = ? ORDER BY rowid").all(taskPacketId).map(row => JSON.parse(row.decision_json))
    };
  }

  saveMctResponseInfluences(records) {
    const insert = this.db.prepare("INSERT OR IGNORE INTO mct_response_influences(influence_id, response_document_id, decision_id, candidate_id, role, digest, influence_json, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)");
    for (const record of records) {
      const recordJson = json(record);
      insert.run(record.id, record.responseDocumentId, record.admissionDecisionId, record.candidateId, record.role, digest(recordJson), recordJson, record.createdAt);
    }
    return { schema: "gpao_t3.response_influence_receipt.v1", influenceIds: records.map(record => record.id), persisted: true };
  }

  listMctResponseInfluences(responseDocumentId) {
    return this.db.prepare("SELECT influence_json FROM mct_response_influences WHERE response_document_id = ? ORDER BY rowid").all(responseDocumentId).map(row => JSON.parse(row.influence_json));
  }

  searchMemory(query, { sessionId = null, projectId = null, userId = "local-owner", channelId = null, limit = 12, budgetMs = 250 } = {}) {
    if (typeof sessionId !== "string" || !sessionId) throw new RuntimeError("memory_scope_required", "기억 검색에는 현재 대화 범위가 필요합니다.", 400);
    const started = performance.now();
    const retrievedAt = Date.now();
    const queryId = `query_${digest(`${sessionId || "global"}\0${String(query || "")}`)}`;
    const boundedLimit = Math.max(1, Math.min(50, Number(limit) || 12));
    const candidateLimit = Math.min(300, boundedLimit * 12);
    const lexicalQuery = lexicalFtsQuery(query);
    const vectorQuery = vectorFtsQuery(query);
    const queryVector = localVector(query);
    const candidates = new Map();
    const collect = (rows, key, valueFor = (_, index) => 1 / (index + 1)) => rows.forEach((row, index) => {
      const current = candidates.get(row.memory_id) || { row, lexical: 0, fuzzy: 0, vector: 0 };
      current[key] = valueFor(row, index);
      candidates.set(row.memory_id, current);
    });
    const scopeSql = "AND w.user_id = ? AND w.invalidated_at IS NULL AND ((w.scope_level = 'session' AND w.session_id = ?) OR (w.scope_level = 'project' AND w.project_id = ?) OR w.scope_level = 'user_global') AND (w.channel_id IS NULL OR w.channel_id = ?)";
    const scopeArgs = [userId || "local-owner", sessionId, projectId || "", channelId || ""];
    if (lexicalQuery) {
      const sql = `SELECT w.*, bm25(memory_lexical_fts) AS rank FROM memory_lexical_fts JOIN memory_wiki w ON w.memory_id = memory_lexical_fts.memory_id WHERE memory_lexical_fts MATCH ? ${scopeSql} ORDER BY rank LIMIT ?`;
      collect(this.db.prepare(sql).all(lexicalQuery, ...scopeArgs, candidateLimit), "lexical");
    }
    if (vectorQuery && performance.now() - started <= budgetMs) {
      const sql = `SELECT w.*, p.vector_json, bm25(memory_vector_fts) AS rank FROM memory_vector_fts JOIN memory_wiki w ON w.memory_id = memory_vector_fts.memory_id JOIN memory_vector_projection p ON p.memory_id = w.memory_id WHERE memory_vector_fts MATCH ? ${scopeSql} ORDER BY rank LIMIT ?`;
      const rows = this.db.prepare(sql).all(vectorQuery, ...scopeArgs, candidateLimit);
      rows.forEach((row, index) => {
        const current = candidates.get(row.memory_id) || { row, lexical: 0, fuzzy: 0, vector: 0 };
        current.fuzzy = Math.max((1 / (index + 1)) * 0.25, fuzzyTokenScore(query, row.text));
        current.vector = Math.max(0, cosine(queryVector, JSON.parse(row.vector_json)));
        candidates.set(row.memory_id, current);
      });
    }
    const now = Date.now();
    const ranked = [...candidates.values()].map(({ row, lexical, fuzzy, vector }) => {
      const reviewed = row.review_state === "reviewed" ? 1 : 0;
      const freshness = Math.max(0, 1 - ((now - row.updated_at) / (365 * 24 * 60 * 60 * 1000)));
      const score = lexical * 0.5 + fuzzy * 0.28 + vector * 0.12 + reviewed * 0.07 + freshness * 0.03;
      const scope = row.scope_level === "project"
        ? { level: "project", turnId: null, sessionId: null, projectId: row.project_id, userId: null }
        : row.scope_level === "user_global"
          ? { level: "user_global", turnId: null, sessionId: null, projectId: null, userId: row.user_id }
          : { level: "session", turnId: null, sessionId: row.session_id, projectId: null, userId: null };
      const retrievalHit = {
        schema: "gpao_t3.retrieval_hit.v1", version: 1, id: `hit_${digest(`${queryId}\0${row.memory_id}`)}`,
        scope, trace: { refs: [row.trace_ref], evidenceLevel: row.review_state === "reviewed" ? "user_confirmed" : "session_trace" },
        authority: { allowedUse: "candidate_only", durablePromotion: false, decisionClass: "A0", decisionId: null },
        lifecycle: "candidate", createdAt: retrievedAt, updatedAt: retrievedAt, expiresAt: null,
        invalidConditions: ["source_deleted", "scope_changed", "user_correction"],
        memoryRecordId: row.memory_id, queryId, scores: { lexical, semantic: 0, fuzzy, localVector: vector, combined: score }, retrievedAt
      };
      return {
        id: row.memory_id, source: row.source, text: row.text.slice(0, 600), score, confidence: score,
        scores: { lexical, fuzzy, localVector: vector, reviewed: reviewed * 0.07, freshness: freshness * 0.03, combined: score },
        reason: "sqlite_fts5_hybrid", traceRef: row.trace_ref, sessionId: row.session_id, scopeLevel: row.scope_level, projectId: row.project_id, userId: row.user_id, channelId: row.channel_id,
        contradictionGroup: row.contradiction_group, supersedesMemoryId: row.supersedes_memory_id, invalidatedAt: row.invalidated_at,
        reviewed: Boolean(reviewed), allowedUse: reviewed ? "supporting_context" : "candidate_only", createdAt: row.created_at, updatedAt: row.updated_at,
        sourceResolved: true, sourceInvalidated: false,
        authority: { allowedUse: row.promotion_state === "approved" ? "answer_anchor" : (reviewed ? "supporting_context" : "candidate_only"), durablePromotion: row.promotion_state === "approved", decisionClass: row.promotion_state === "approved" ? "A2" : "A0", decisionId: row.authority_decision_id || null },
        replayPassed: row.replay_state === "passed", promotionState: row.promotion_state,
        admission: "search_support_candidate", retrievalHit
      };
    }).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
    const elapsedMs = performance.now() - started;
    return {
      schema: "gpao_t3.memory_search_result.v1", results: ranked.slice(0, boundedLimit),
      degraded: elapsedMs > budgetMs ? "latency_budget_exceeded" : null, elapsedMs,
      receipt: { mode: "sqlite_fts5_lexical_fuzzy_local_vector", semanticAvailable: false, vectorAlgorithm: "char_trigram_hash_v1", vectorDimensions: 64, lexicalCandidates: [...candidates.values()].filter(value => value.lexical > 0).length, fuzzyCandidates: [...candidates.values()].filter(value => value.fuzzy > 0).length, localVectorCandidates: [...candidates.values()].filter(value => value.vector > 0).length, candidateCount: candidates.size, limit: boundedLimit }
    };
  }

  rebuildMemorySearchIndex() {
    return this.transaction(() => {
      this.db.exec("DELETE FROM memory_lexical_fts; DELETE FROM memory_vector_fts; DELETE FROM memory_vector_projection;");
      const rows = this.db.prepare("SELECT memory_id, text FROM memory_wiki ORDER BY memory_id").all();
      const lexical = this.db.prepare("INSERT INTO memory_lexical_fts(memory_id, text) VALUES(?, ?)");
      const vector = this.db.prepare("INSERT INTO memory_vector_fts(memory_id, text) VALUES(?, ?)");
      const projection = this.db.prepare("INSERT INTO memory_vector_projection(memory_id, algorithm, dimensions, vector_json, updated_at) VALUES(?, 'char_trigram_hash_v1', 64, ?, ?)");
      for (const row of rows) {
        lexical.run(row.memory_id, row.text);
        vector.run(row.memory_id, searchText(row.text).replaceAll(" ", ""));
        projection.run(row.memory_id, json(localVector(row.text)), Date.now());
      }
      return { schema: "gpao_t3.memory_search_rebuild.v1", rebuilt: rows.length, verified: this.memorySearchStatus().parity };
    });
  }

  repairMemorySearchIndexBatch({ limit = 100 } = {}) {
    const bounded = Math.max(1, Math.min(500, Number(limit) || 100));
    this.db.exec(`
      DELETE FROM memory_lexical_fts WHERE memory_id NOT IN (SELECT memory_id FROM memory_wiki);
      DELETE FROM memory_vector_fts WHERE memory_id NOT IN (SELECT memory_id FROM memory_wiki);
      DELETE FROM memory_vector_projection WHERE memory_id NOT IN (SELECT memory_id FROM memory_wiki);
    `);
    const rows = this.db.prepare(`SELECT memory_id, text, updated_at FROM memory_wiki w WHERE
      NOT EXISTS (SELECT 1 FROM memory_lexical_fts f WHERE f.memory_id = w.memory_id) OR
      NOT EXISTS (SELECT 1 FROM memory_vector_fts f WHERE f.memory_id = w.memory_id) OR
      NOT EXISTS (SELECT 1 FROM memory_vector_projection p WHERE p.memory_id = w.memory_id)
      ORDER BY memory_id LIMIT ?`).all(bounded);
    const lexical = this.db.prepare("INSERT INTO memory_lexical_fts(memory_id, text) VALUES(?, ?)");
    const vectorCandidate = this.db.prepare("INSERT INTO memory_vector_fts(memory_id, text) VALUES(?, ?)");
    const projection = this.db.prepare("INSERT INTO memory_vector_projection(memory_id, algorithm, dimensions, vector_json, updated_at) VALUES(?, 'char_trigram_hash_v1', 64, ?, ?)");
    for (const row of rows) {
      this.db.prepare("DELETE FROM memory_lexical_fts WHERE memory_id = ?").run(row.memory_id);
      this.db.prepare("DELETE FROM memory_vector_fts WHERE memory_id = ?").run(row.memory_id);
      this.db.prepare("DELETE FROM memory_vector_projection WHERE memory_id = ?").run(row.memory_id);
      lexical.run(row.memory_id, row.text);
      vectorCandidate.run(row.memory_id, searchText(row.text).replaceAll(" ", ""));
      projection.run(row.memory_id, json(localVector(row.text)), row.updated_at);
    }
    const status = this.memorySearchStatus();
    return { schema: "gpao_t3.memory_search_repair_batch.v1", repaired: rows.length, remaining: status.parity ? 0 : 1, status };
  }

  memorySearchStatus() {
    const canonical = Number(this.db.prepare("SELECT count(*) AS count FROM memory_wiki").get().count);
    const lexical = Number(this.db.prepare("SELECT count(*) AS count FROM memory_lexical_fts").get().count);
    const localVectorCandidates = Number(this.db.prepare("SELECT count(*) AS count FROM memory_vector_fts").get().count);
    const localVector = Number(this.db.prepare("SELECT count(*) AS count FROM memory_vector_projection").get().count);
    return { schema: "gpao_t3.memory_search_status.v1", canonical, lexical, localVectorCandidates, localVector, parity: canonical === lexical && canonical === localVectorCandidates && canonical === localVector };
  }

  deleteMemory(memoryId) {
    const existing = this.getMemoryRecord(memoryId);
    if (!existing) return { memoryId, deleted: false, projectionsPurged: false, influencesPurged: 0 };
    const influencesPurged = this.db.prepare("DELETE FROM context_influences WHERE source_memory_id = ?").run(memoryId).changes;
    this.db.prepare("DELETE FROM memory_lexical_fts WHERE memory_id = ?").run(memoryId);
    this.db.prepare("DELETE FROM memory_vector_fts WHERE memory_id = ?").run(memoryId);
    this.db.prepare("DELETE FROM memory_vector_projection WHERE memory_id = ?").run(memoryId);
    const deleted = this.db.prepare("DELETE FROM memory_wiki WHERE memory_id = ?").run(memoryId).changes === 1;
    return { memoryId, deleted, projectionsPurged: deleted, influencesPurged };
  }

  getMemoryRecord(memoryId) {
    const row = this.db.prepare("SELECT * FROM memory_wiki WHERE memory_id = ?").get(memoryId);
    return row ? this.memoryRecord(row) : null;
  }

  memoryRecord(row) {
    return { id: row.memory_id, sessionId: row.session_id, scopeLevel: row.scope_level, projectId: row.project_id, userId: row.user_id, channelId: row.channel_id, contradictionGroup: row.contradiction_group, supersedesMemoryId: row.supersedes_memory_id, invalidatedAt: row.invalidated_at, authorityDecisionId: row.authority_decision_id, authorityDecisionClass: row.authority_decision_class, authorityPrincipalId: row.authority_principal_id, authorityScope: row.authority_scope, text: row.text, source: row.source, traceRef: row.trace_ref, reviewed: row.review_state === "reviewed", reviewState: row.review_state, replayState: row.replay_state, promotionState: row.promotion_state, createdAt: row.created_at, updatedAt: row.updated_at };
  }

  listMemory({ sessionId = null, projectId = null, userId = null, channelId = null, allOwners = false, limit = 100 } = {}) {
    if (!userId && allOwners !== true) throw new RuntimeError("memory_owner_required", "기억 목록에는 사용자 범위가 필요합니다.", 400);
    const rows = allOwners === true
      ? this.db.prepare("SELECT * FROM memory_wiki ORDER BY updated_at DESC LIMIT ?").all(limit)
      : sessionId
        ? this.db.prepare("SELECT * FROM memory_wiki WHERE user_id = ? AND session_id = ? AND (channel_id IS NULL OR channel_id = ?) ORDER BY updated_at DESC LIMIT ?").all(userId, sessionId, channelId || "", limit)
        : projectId
          ? this.db.prepare("SELECT * FROM memory_wiki WHERE user_id = ? AND project_id = ? AND (channel_id IS NULL OR channel_id = ?) ORDER BY updated_at DESC LIMIT ?").all(userId, projectId, channelId || "", limit)
          : this.db.prepare("SELECT * FROM memory_wiki WHERE user_id = ? AND (channel_id IS NULL OR channel_id = ?) ORDER BY updated_at DESC LIMIT ?").all(userId, channelId || "", limit);
    return { schema: "gpao_t3.memory_wiki.v1", entries: rows.map(row => this.memoryRecord(row)) };
  }

  reviewMemory(memoryId, decision, authority = null) {
    if (!['reviewed', 'rejected'].includes(decision)) throw new RuntimeError("memory_review_invalid", "기억 검토 결정이 올바르지 않습니다.", 400);
    const now = Date.now();
    const memory = this.getMemoryRecord(memoryId);
    if (!memory) throw new RuntimeError("memory_not_found", "검토할 기억 후보를 찾을 수 없습니다.", 404);
    if (typeof authority?.principalId !== "string" || authority.principalId !== memory.userId) throw new RuntimeError("memory_review_forbidden", "자신의 기억 후보만 검토할 수 있습니다.", 403);
    const boundScopeIdentity = memoryScopeIdentity(memory);
    const explicitA2 = decision === "reviewed" && authority?.durablePromotion === true && authority?.decisionClass === "A2" && typeof authority?.principalId === "string" && authority.principalId === memory.userId;
    const authorityDecisionId = explicitA2 ? `memory_a2_${digest(`${memoryId}\0${authority.principalId}\0${boundScopeIdentity}\0${now}`)}` : null;
    const changed = this.db.prepare("UPDATE memory_wiki SET review_state = ?, authority_decision_id = ?, authority_decision_class = ?, authority_principal_id = ?, authority_scope = ?, updated_at = ? WHERE memory_id = ? AND promotion_state = 'candidate'").run(decision, authorityDecisionId, explicitA2 ? "A2" : null, explicitA2 ? authority.principalId : null, explicitA2 ? boundScopeIdentity : null, now, memoryId);
    if (changed.changes !== 1) throw new RuntimeError("memory_not_found", "검토할 기억 후보를 찾을 수 없습니다.", 404);
    return this.getMemoryRecord(memoryId);
  }

  updateMemoryScope(memoryId, { ownerId, scopeLevel, sessionId = null, projectId = null, approved = false } = {}) {
    const memory = this.getMemoryRecord(memoryId);
    if (!memory || memory.userId !== ownerId) throw new RuntimeError("memory_not_found", "범위를 바꿀 기억 후보를 찾을 수 없습니다.", 404);
    if (memory.promotionState !== "candidate") throw new RuntimeError("memory_scope_change_blocked", "이미 사용 중인 기억은 먼저 영향을 되돌려야 범위를 바꿀 수 있습니다.", 409);
    if (!["session", "project", "user_global"].includes(scopeLevel)) throw new RuntimeError("memory_scope_invalid", "기억 범위가 올바르지 않습니다.", 400);
    const currentRank = MEMORY_SCOPE_ORDER.indexOf(memory.scopeLevel);
    const nextRank = MEMORY_SCOPE_ORDER.indexOf(scopeLevel);
    if (nextRank > currentRank && approved !== true) throw new RuntimeError("memory_scope_approval_required", "기억 범위를 넓히려면 사용자의 명시적 승인이 필요합니다.", 409);
    if (scopeLevel === "session" && !sessionId) throw new RuntimeError("memory_scope_required", "대화 범위에는 현재 대화가 필요합니다.", 400);
    if (scopeLevel === "project" && !projectId) throw new RuntimeError("memory_scope_required", "프로젝트 범위에는 프로젝트가 필요합니다.", 400);
    const now = Date.now();
    this.db.prepare(`
      UPDATE memory_wiki
      SET scope_level = ?, session_id = ?, project_id = ?, review_state = 'candidate', replay_state = 'pending',
          authority_decision_id = NULL, authority_decision_class = NULL, authority_principal_id = NULL, authority_scope = NULL, updated_at = ?
      WHERE memory_id = ?
    `).run(scopeLevel, scopeLevel === "session" ? sessionId : null, scopeLevel === "project" ? projectId : null, now, memoryId);
    return this.getMemoryRecord(memoryId);
  }

  promoteMemory(memoryId, { replayPassed, replayScore = 1 } = {}) {
    const memory = this.getMemoryRecord(memoryId);
    if (!memory) throw new RuntimeError("memory_not_found", "승격할 기억 후보를 찾을 수 없습니다.", 404);
    if (!memory.reviewed || replayPassed !== true || !memory.authorityDecisionId || memory.authorityDecisionClass !== "A2" || memory.authorityPrincipalId !== memory.userId || memory.authorityScope !== memoryScopeIdentity(memory)) throw new RuntimeError("memory_promotion_blocked", "범위가 결합된 명시적 A2 승인과 replay 통과가 모두 필요합니다.", 409);
    const existing = this.db.prepare("SELECT * FROM context_influences WHERE source_memory_id = ? AND state = 'applied'").get(memoryId);
    if (existing) return this.contextInfluenceRecord(existing);
    const now = Date.now(); const influenceId = `ctx_${crypto.randomUUID()}`; const rollbackToken = `rollback_${crypto.randomUUID()}`;
    this.db.prepare("INSERT INTO context_influences(influence_id, session_id, source_memory_id, text, trace_ref, state, replay_score, rollback_token, created_at, applied_at, scope_level, project_id, user_id, channel_id, authority_decision_id) VALUES(?, ?, ?, ?, ?, 'applied', ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(influenceId, memory.sessionId || "", memory.id, memory.text, memory.traceRef, Math.max(0, Math.min(1, Number(replayScore))), rollbackToken, now, now, memory.scopeLevel, memory.projectId || null, memory.userId, memory.channelId || null, memory.authorityDecisionId);
    this.db.prepare("UPDATE memory_wiki SET replay_state = 'passed', promotion_state = 'approved', updated_at = ? WHERE memory_id = ?").run(now, memoryId);
    return this.contextInfluenceRecord(this.db.prepare("SELECT c.*, w.memory_id AS source_exists, w.invalidated_at AS source_invalidated_at FROM context_influences c LEFT JOIN memory_wiki w ON w.memory_id = c.source_memory_id WHERE c.influence_id = ?").get(influenceId));
  }

  contextInfluenceRecord(row) {
    return { id: row.influence_id, state: row.state, sourceCandidateId: row.source_memory_id, text: row.text, traceRef: row.trace_ref, scope: { level: row.scope_level, sessionId: row.session_id || null, projectId: row.project_id, userId: row.user_id, channelId: row.channel_id }, authorityDecisionId: row.authority_decision_id, sourceResolved: Boolean(row.source_exists) && row.source_invalidated_at == null, sourceInvalidated: row.source_invalidated_at != null, replayScore: row.replay_score, rollbackToken: row.rollback_token, createdAt: row.created_at, appliedAt: row.applied_at, rolledBackAt: row.rolled_back_at, rollbackReason: row.rollback_reason };
  }

  listContextInfluences(ownerId = null) {
    const base = "SELECT c.*, w.memory_id AS source_exists, w.invalidated_at AS source_invalidated_at FROM context_influences c LEFT JOIN memory_wiki w ON w.memory_id = c.source_memory_id";
    const rows = ownerId ? this.db.prepare(`${base} WHERE c.user_id = ? ORDER BY c.applied_at DESC`).all(ownerId) : this.db.prepare(`${base} ORDER BY c.applied_at DESC`).all();
    return rows.map(row => this.contextInfluenceRecord(row));
  }

  rollbackContextInfluence(influenceId, reason, ownerId = null) {
    const now = Date.now();
    const changed = ownerId
      ? this.db.prepare("UPDATE context_influences SET state = 'rolled_back', rolled_back_at = ?, rollback_reason = ? WHERE influence_id = ? AND user_id = ? AND state = 'applied'").run(now, reason, influenceId, ownerId)
      : this.db.prepare("UPDATE context_influences SET state = 'rolled_back', rolled_back_at = ?, rollback_reason = ? WHERE influence_id = ? AND state = 'applied'").run(now, reason, influenceId);
    const row = ownerId ? this.db.prepare("SELECT * FROM context_influences WHERE influence_id = ? AND user_id = ?").get(influenceId, ownerId) : this.db.prepare("SELECT * FROM context_influences WHERE influence_id = ?").get(influenceId);
    if (changed.changes === 1 && row) this.db.prepare("UPDATE memory_wiki SET promotion_state = 'rolled_back', updated_at = ? WHERE memory_id = ?").run(now, row.source_memory_id);
    return { rolledBack: changed.changes === 1, entry: row ? this.contextInfluenceRecord(this.db.prepare("SELECT * FROM context_influences WHERE influence_id = ?").get(influenceId)) : null };
  }

  saveGrowthProposal(bundle) {
    const proposal = bundle.record;
    const serialized = json(bundle);
    const changed = this.db.prepare("INSERT OR IGNORE INTO mct_growth_proposals(proposal_id, owner_id, scope_level, status, digest, proposal_json, created_at, updated_at, expires_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      proposal.id, proposal.scope.userId, proposal.scope.level, proposal.status, digest(serialized), serialized, proposal.createdAt, proposal.updatedAt, proposal.expiresAt
    );
    if (changed.changes === 0) {
      const existing = this.getGrowthProposalBundle(proposal.id);
      if (digest(json(existing)) !== digest(serialized)) throw new RuntimeError("growth_proposal_conflict", "같은 성장 제안 ID에 다른 내용이 이미 있습니다.", 409);
    }
    return this.getGrowthProposalBundle(proposal.id);
  }

  getGrowthProposalBundle(proposalId) {
    const row = this.db.prepare("SELECT proposal_json FROM mct_growth_proposals WHERE proposal_id = ?").get(proposalId);
    return row ? JSON.parse(row.proposal_json) : null;
  }
  getGrowthProposal(proposalId) { return this.getGrowthProposalBundle(proposalId)?.record || null; }

  listGrowthProposals(ownerId, { status = null, limit = 100 } = {}) {
    const rows = status
      ? this.db.prepare("SELECT proposal_json FROM mct_growth_proposals WHERE owner_id = ? AND status = ? ORDER BY updated_at DESC LIMIT ?").all(ownerId, status, Math.min(100, limit))
      : this.db.prepare("SELECT proposal_json FROM mct_growth_proposals WHERE owner_id = ? ORDER BY updated_at DESC LIMIT ?").all(ownerId, Math.min(100, limit));
    return { schema: "gpao_t3.growth_proposals.v1", proposals: rows.map(row => JSON.parse(row.proposal_json).record) };
  }

  growthSurfaceStatus(ownerId, { limit = 100 } = {}) {
    const rows = this.db.prepare("SELECT proposal_json FROM mct_growth_proposals WHERE owner_id = ? ORDER BY updated_at DESC LIMIT ?").all(ownerId, Math.min(100, limit));
    const replayQuery = this.db.prepare("SELECT result_json FROM mct_replay_results WHERE proposal_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1");
    const mutationQuery = this.db.prepare("SELECT mutation_json FROM mct_mutation_ledger WHERE proposal_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1");
    const items = rows.map(row => {
      const proposal = JSON.parse(row.proposal_json);
      const replayRow = replayQuery.get(proposal.record.id);
      const replay = replayRow ? JSON.parse(replayRow.result_json) : null;
      const mutationRow = mutationQuery.get(proposal.record.id);
      const mutation = mutationRow ? JSON.parse(mutationRow.mutation_json) : null;
      const receipt = mutation ? this.getRollbackReceiptBundle(mutation.record.rollbackReceiptId) : null;
      const mutationState = mutation?.record?.state || null;
      const state = mutationState === "canary" ? "observing"
        : mutationState === "rolled_back" ? "rolled_back"
          : proposal.record.status === "rejected" ? "rejected"
            : replay?.record?.passed === true ? (proposal.record.status === "approved" ? "ready_to_apply" : "ready_for_approval")
              : replay ? "not_improved" : "checking";
      return {
        proposalId: proposal.record.id,
        title: publicGrowthTitle(proposal.detail),
        reason: `같은 교정이나 실패가 ${proposal.detail.recurrenceCount}번 확인되었습니다.`,
        scope: proposal.record.scope.level,
        proposalStatus: proposal.record.status,
        state,
        replayResultId: replay?.record?.id || null,
        replayPassed: replay?.record?.passed === true,
        mutationId: mutation?.record?.id || null,
        expiresAt: mutation?.record?.expiresAt || null,
        rollbackVerified: receipt?.record?.verified === true
      };
    });
    return { schema: "gpao_t3.growth_surface.v1", items };
  }

  saveGrowthReplayResult(bundle) {
    const result = bundle.record;
    const proposal = this.getGrowthProposal(result.proposalId);
    if (!proposal) throw new RuntimeError("growth_proposal_not_found", "검증할 성장 제안을 찾을 수 없습니다.", 404);
    const serialized = json(bundle);
    this.db.prepare("INSERT OR IGNORE INTO mct_replay_results(replay_result_id, proposal_id, passed, digest, result_json, created_at) VALUES(?, ?, ?, ?, ?, ?)").run(result.id, result.proposalId, Number(result.passed), digest(serialized), serialized, result.createdAt);
    return this.getGrowthReplayResultBundle(result.id);
  }

  getGrowthReplayResultBundle(replayResultId) {
    const row = this.db.prepare("SELECT result_json FROM mct_replay_results WHERE replay_result_id = ?").get(replayResultId);
    return row ? JSON.parse(row.result_json) : null;
  }
  getGrowthReplayResult(replayResultId) { return this.getGrowthReplayResultBundle(replayResultId)?.record || null; }

  reviewGrowthProposal(proposalId, decision, authority) {
    const bundle = this.getGrowthProposalBundle(proposalId);
    if (!bundle) throw new RuntimeError("growth_proposal_not_found", "검토할 성장 제안을 찾을 수 없습니다.", 404);
    const reviewed = approveGrowthProposal(bundle, { ...authority, approved: decision === "approved" });
    const serialized = json(reviewed);
    const changed = this.db.prepare("UPDATE mct_growth_proposals SET status = ?, digest = ?, proposal_json = ?, updated_at = ?, expires_at = ? WHERE proposal_id = ? AND status = 'review_required'").run(reviewed.record.status, digest(serialized), serialized, reviewed.record.updatedAt, reviewed.record.expiresAt, proposalId);
    if (changed.changes !== 1) throw new RuntimeError("growth_review_unavailable", "이미 검토된 성장 제안입니다.", 409);
    return reviewed;
  }

  applyGrowthMutation(proposalId, replayResultId, { ownerId, ttlMs, snapshotDigest, snapshotPolicy } = {}) {
    const proposalBundle = this.getGrowthProposalBundle(proposalId);
    const replayBundle = this.getGrowthReplayResultBundle(replayResultId);
    if (!proposalBundle || proposalBundle.record.scope.userId !== ownerId) throw new RuntimeError("growth_proposal_not_found", "적용할 성장 제안을 찾을 수 없습니다.", 404);
    const unreconciledExpiry = this.db.prepare("SELECT mutation_id FROM mct_mutation_ledger WHERE proposal_id = ? AND status = 'canary' AND expires_at <= ? LIMIT 1").get(proposalId, Date.now());
    if (unreconciledExpiry) throw new RuntimeError("growth_expiry_reconciliation_required", "만료된 성장 변경의 복구 검증을 먼저 완료해야 합니다.", 409);
    const existing = this.db.prepare("SELECT mutation_json FROM mct_mutation_ledger WHERE proposal_id = ? AND status = 'canary' AND expires_at > ?").get(proposalId, Date.now());
    if (existing) {
      const mutation = JSON.parse(existing.mutation_json);
      return { mutation, rollbackReceipt: this.getRollbackReceiptBundle(mutation.record.rollbackReceiptId), deduplicated: true };
    }
    const latestCreatedAt = this.db.prepare("SELECT MAX(created_at) AS value FROM mct_mutation_ledger").get()?.value || 0;
    const created = createCanaryMutation({ proposalBundle, replayBundle, ttlMs, snapshotDigest, snapshotPolicy, now: Math.max(Date.now(), latestCreatedAt + 1) });
    const mutationJson = json(created.mutation);
    const receiptJson = json(created.rollbackReceipt);
    this.db.prepare("INSERT INTO mct_mutation_ledger(mutation_id, proposal_id, replay_result_id, owner_id, status, expires_at, digest, mutation_json, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(created.mutation.record.id, proposalId, replayResultId, ownerId, created.mutation.record.state, created.mutation.record.expiresAt, digest(mutationJson), mutationJson, created.mutation.record.createdAt, created.mutation.record.updatedAt);
    this.db.prepare("INSERT INTO mct_rollback_receipts(rollback_receipt_id, mutation_id, verified, digest, receipt_json, created_at, updated_at) VALUES(?, ?, 0, ?, ?, ?, ?)").run(created.rollbackReceipt.record.id, created.mutation.record.id, digest(receiptJson), receiptJson, created.rollbackReceipt.record.createdAt, created.rollbackReceipt.record.updatedAt);
    return { ...created, deduplicated: false };
  }

  getRollbackReceiptBundle(receiptId) {
    const row = this.db.prepare("SELECT receipt_json FROM mct_rollback_receipts WHERE rollback_receipt_id = ?").get(receiptId);
    return row ? JSON.parse(row.receipt_json) : null;
  }
  getRollbackReceipt(receiptId) { return this.getRollbackReceiptBundle(receiptId)?.record || null; }

  listGrowthMutations(ownerId, { activeOnly = false, limit = 100 } = {}) {
    const rows = ownerId == null
      ? (activeOnly
          ? this.db.prepare("SELECT mutation_json FROM mct_mutation_ledger WHERE status = 'canary' AND expires_at > ? ORDER BY created_at DESC LIMIT ?").all(Date.now(), Math.min(500, limit))
          : this.db.prepare("SELECT mutation_json FROM mct_mutation_ledger ORDER BY created_at DESC LIMIT ?").all(Math.min(500, limit)))
      : (activeOnly
          ? this.db.prepare("SELECT mutation_json FROM mct_mutation_ledger WHERE owner_id = ? AND status = 'canary' AND expires_at > ? ORDER BY created_at DESC LIMIT ?").all(ownerId, Date.now(), Math.min(100, limit))
          : this.db.prepare("SELECT mutation_json FROM mct_mutation_ledger WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?").all(ownerId, Math.min(100, limit)));
    return { schema: "gpao_t3.mutation_ledgers.v1", mutations: rows.map(row => JSON.parse(row.mutation_json)) };
  }

  expireGrowthMutations(now = Date.now()) {
    const rows = this.db.prepare("SELECT mutation_id, owner_id FROM mct_mutation_ledger WHERE status = 'canary' AND expires_at <= ? ORDER BY expires_at").all(now);
    const receipts = rows.map(row => this.rollbackGrowthMutation(row.mutation_id, { ownerId: row.owner_id, reason: "canary_expired" }));
    return { expired: receipts.length, receipts };
  }

  rollbackGrowthMutation(mutationId, { ownerId, reason } = {}) {
    const row = this.db.prepare("SELECT mutation_json FROM mct_mutation_ledger WHERE mutation_id = ?").get(mutationId);
    if (!row) throw new RuntimeError("growth_mutation_not_found", "복구할 성장 변경을 찾을 수 없습니다.", 404);
    const mutation = JSON.parse(row.mutation_json);
    if (mutation.record.scope.userId !== ownerId) throw new RuntimeError("growth_mutation_not_found", "복구할 성장 변경을 찾을 수 없습니다.", 404);
    const receipt = this.getRollbackReceiptBundle(mutation.record.rollbackReceiptId);
    const rolledBack = requestCanaryRollback(mutation, receipt, reason);
    if (!rolledBack.changed) return rolledBack;
    const mutationJson = json(rolledBack.mutation);
    const receiptJson = json(rolledBack.rollbackReceipt);
    this.db.prepare("UPDATE mct_mutation_ledger SET status = 'rolled_back', digest = ?, mutation_json = ?, updated_at = ? WHERE mutation_id = ? AND status = 'canary'").run(digest(mutationJson), mutationJson, rolledBack.mutation.record.updatedAt, mutationId);
    this.db.prepare("UPDATE mct_rollback_receipts SET verified = 0, digest = ?, receipt_json = ?, updated_at = ? WHERE rollback_receipt_id = ?").run(digest(receiptJson), receiptJson, rolledBack.rollbackReceipt.record.updatedAt, receipt.record.id);
    return rolledBack;
  }

  verifyGrowthRollback(mutationId, { ownerId, projectionPurge, snapshotRestored, postRollbackReplay } = {}) {
    const row = this.db.prepare("SELECT mutation_json FROM mct_mutation_ledger WHERE mutation_id = ? AND status = 'rolled_back'").get(mutationId);
    if (!row) throw new RuntimeError("growth_mutation_not_found", "검증할 성장 복구 기록을 찾을 수 없습니다.", 404);
    const mutation = JSON.parse(row.mutation_json);
    if (mutation.record.scope.userId !== ownerId) throw new RuntimeError("growth_mutation_not_found", "검증할 성장 복구 기록을 찾을 수 없습니다.", 404);
    const receipt = this.getRollbackReceiptBundle(mutation.record.rollbackReceiptId);
    const verified = verifyCanaryRollback(receipt, { projectionPurge, snapshotRestored, postRollbackReplay });
    const serialized = json(verified);
    this.db.prepare("UPDATE mct_rollback_receipts SET verified = ?, digest = ?, receipt_json = ?, updated_at = ? WHERE rollback_receipt_id = ?").run(Number(verified.record.verified), digest(serialized), serialized, verified.record.updatedAt, verified.record.id);
    return verified;
  }

  verifyGrowthJournal() {
    const specifications = [
      ["mct_growth_proposals", "proposal_id", "proposal_json", row => row.id === row.record.id && row.owner_id === row.record.scope.userId && row.status === row.record.status && row.scope_level === row.record.scope.level && row.expires_at === row.record.expiresAt],
      ["mct_replay_results", "replay_result_id", "result_json", row => row.id === row.record.id && row.proposal_id === row.record.proposalId && Boolean(row.passed) === row.record.passed],
      ["mct_mutation_ledger", "mutation_id", "mutation_json", row => row.id === row.record.id && row.proposal_id === row.record.proposalId && row.replay_result_id === row.detail.replayResultId && row.owner_id === row.record.scope.userId && row.status === row.record.state && row.expires_at === row.record.expiresAt],
      ["mct_rollback_receipts", "rollback_receipt_id", "receipt_json", row => row.id === row.record.id && row.mutation_id === row.record.mutationId && Boolean(row.verified) === row.record.verified]
    ];
    const counts = {};
    for (const [table, idColumn, jsonColumn, matchesColumns] of specifications) {
      const rows = this.db.prepare(`SELECT *, ${idColumn} AS id, ${jsonColumn} AS body FROM ${table}`).all();
      for (const row of rows) {
        const envelope = JSON.parse(row.body);
        if (digest(row.body) !== row.digest || !matchesColumns({ ...row, ...envelope })) throw new RuntimeError("growth_journal_integrity_failed", "성장 변경 감사 기록의 무결성을 확인할 수 없습니다.", 500, { table, id: row.id });
      }
      counts[table] = rows.length;
    }
    return { ok: true, counts };
  }

  identitySnapshot() {
    return {
      schema: schemaName("state_identity.v1"),
      productId: this.getMeta("product_id"),
      stateNamespace: this.getMeta("state_namespace"),
      databaseFile: this.getMeta("database_file"),
      schemaVersion: Number(this.getMeta("schema_version") || 0),
      currentSchemaVersion: CURRENT_SCHEMA_VERSION
    };
  }

  stateOwnership() {
    return {
      schema: schemaName("state_ownership.v1"),
      domains: this.db.prepare("SELECT domain, owner, durability, table_name FROM state_ownership ORDER BY domain").all()
        .map(row => ({ domain: row.domain, owner: row.owner, durability: row.durability, table: row.table_name }))
    };
  }

  ensureMessengerSession(identityInput) {
    const identity = normalizeChannelIdentity(identityInput);
    const identityDigest = channelIdentityDigest(identity);
    const existing = this.db.prepare("SELECT * FROM messenger_sessions WHERE identity_digest = ?").get(identityDigest);
    if (existing) return this.channelSessionRecord(existing);
    const now = Date.now();
    const sessionId = crypto.randomUUID();
    this.db.prepare("INSERT INTO messenger_sessions(session_id, session_kind, channel_id, adapter_id, account_id, peer_kind, peer_id, thread_id, identity_digest, context_scope, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 'isolated', ?, ?)")
      .run(sessionId, messengerSessionKind(identity), identity.channelId, identity.adapterId, identity.accountId, identity.peer.kind, identity.peer.id, identity.threadId, identityDigest, now, now);
    this.db.prepare("INSERT INTO channel_bindings(binding_id, session_id, identity_digest, created_at, updated_at) VALUES(?, ?, ?, ?, ?)")
      .run(crypto.randomUUID(), sessionId, identityDigest, now, now);
    return this.channelSessionRecord(this.db.prepare("SELECT * FROM messenger_sessions WHERE session_id = ?").get(sessionId));
  }

  channelSessionRecord(row) {
    return {
      sessionId: row.session_id, sessionKind: row.session_kind, channelId: row.channel_id,
      adapterId: row.adapter_id, accountId: row.account_id,
      peer: { kind: row.peer_kind, id: row.peer_id }, threadId: row.thread_id,
      contextScope: row.context_scope, createdAt: row.created_at, updatedAt: row.updated_at
    };
  }

  listMessengerSessions() {
    return this.db.prepare("SELECT * FROM messenger_sessions ORDER BY updated_at DESC, session_id").all().map(row => {
      const session = this.channelSessionRecord(row);
      const inbound = this.db.prepare("SELECT status, envelope_json, created_at FROM channel_inbound WHERE session_id = ? ORDER BY created_at, inbound_id").all(row.session_id)
        .map(entry => ({ role: "user", status: entry.status, createdAt: entry.created_at, text: JSON.parse(entry.envelope_json).message.text || "" }));
      const outbound = this.db.prepare("SELECT status, envelope_json, created_at FROM channel_deliveries WHERE session_id = ? ORDER BY created_at, delivery_id").all(row.session_id)
        .map(entry => ({ role: "assistant", status: entry.status, createdAt: entry.created_at, text: JSON.parse(entry.envelope_json).content.text || "" }));
      return { ...session, messages: [...inbound, ...outbound].sort((a, b) => a.createdAt - b.createdAt) };
    });
  }

  getMessengerSession(sessionId) {
    const row = this.db.prepare("SELECT * FROM messenger_sessions WHERE session_id = ?").get(sessionId);
    return row ? this.channelSessionRecord(row) : null;
  }

  ingestChannelInbound(envelope) {
    const existing = this.db.prepare("SELECT * FROM channel_inbound WHERE adapter_id = ? AND account_id = ? AND event_id = ?")
      .get(envelope.identity.adapterId, envelope.identity.accountId, envelope.eventId);
    if (existing) {
      if (existing.status === "retryable") {
        const active = this.db.prepare("SELECT inbound_id FROM channel_inbound WHERE session_id = ? AND status = 'claimed' LIMIT 1").get(existing.session_id);
        if (!active) {
          this.db.prepare("UPDATE channel_inbound SET status = 'claimed', updated_at = ? WHERE inbound_id = ? AND status = 'retryable'").run(Date.now(), existing.inbound_id);
          return { inboundId: existing.inbound_id, sessionId: existing.session_id, status: "claimed", deduplicated: false, reclaimed: true };
        }
      }
      return { inboundId: existing.inbound_id, sessionId: existing.session_id, status: existing.status, deduplicated: true };
    }
    const session = this.ensureMessengerSession(envelope.identity);
    const scopeKey = channelIdentityDigest(envelope.identity);
    const checkpoint = this.db.prepare("SELECT cursor_value FROM channel_checkpoints WHERE adapter_id = ? AND account_id = ? AND scope_key = ?")
      .get(envelope.identity.adapterId, envelope.identity.accountId, scopeKey)?.cursor_value;
    const stale = checkpoint !== undefined && envelope.cursor !== null && compareCursor(envelope.cursor, checkpoint) <= 0;
    const inboundId = crypto.randomUUID();
    const now = Date.now();
    const active = this.db.prepare("SELECT inbound_id FROM channel_inbound WHERE session_id = ? AND status = 'claimed' LIMIT 1").get(session.sessionId);
    const status = stale ? "suppressed_stale" : active ? "queued" : "claimed";
    this.db.prepare("INSERT INTO channel_inbound(inbound_id, session_id, adapter_id, account_id, event_id, cursor_value, scope_key, status, envelope_json, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(inboundId, session.sessionId, envelope.identity.adapterId, envelope.identity.accountId, envelope.eventId, envelope.cursor, scopeKey, status, json(envelope), now, now);
    return { inboundId, sessionId: session.sessionId, sessionKind: session.sessionKind, status, deduplicated: stale, checkpoint: checkpoint || null };
  }

  completeChannelInbound(inboundId, outcome, checkpoint = true) {
    if (!["handled", "retryable", "suppressed"].includes(outcome)) throw new RuntimeError("channel_inbound_outcome_invalid", "Inbound outcome is invalid", 400);
    const row = this.db.prepare("SELECT * FROM channel_inbound WHERE inbound_id = ?").get(inboundId);
    if (!row) throw new RuntimeError("channel_inbound_not_found", "Inbound channel record does not exist", 404);
    if (row.status !== "claimed") return { inboundId, status: row.status, changed: false };
    const now = Date.now();
    this.db.prepare("UPDATE channel_inbound SET status = ?, updated_at = ? WHERE inbound_id = ? AND status = 'claimed'").run(outcome, now, inboundId);
    if (checkpoint && outcome === "handled" && row.cursor_value !== null) {
      const current = this.db.prepare("SELECT cursor_value FROM channel_checkpoints WHERE adapter_id = ? AND account_id = ? AND scope_key = ?").get(row.adapter_id, row.account_id, row.scope_key)?.cursor_value;
      if (current === undefined || compareCursor(row.cursor_value, current) > 0) {
        this.db.prepare("INSERT INTO channel_checkpoints(adapter_id, account_id, scope_key, cursor_value, updated_at) VALUES(?, ?, ?, ?, ?) ON CONFLICT(adapter_id, account_id, scope_key) DO UPDATE SET cursor_value = excluded.cursor_value, updated_at = excluded.updated_at")
          .run(row.adapter_id, row.account_id, row.scope_key, row.cursor_value, now);
      }
    }
    let nextInbound = null;
    if (outcome !== "retryable") {
      const next = this.db.prepare("SELECT inbound_id FROM channel_inbound WHERE session_id = ? AND status = 'queued' ORDER BY created_at, inbound_id LIMIT 1").get(row.session_id);
      if (next) {
        this.db.prepare("UPDATE channel_inbound SET status = 'claimed', updated_at = ? WHERE inbound_id = ? AND status = 'queued'").run(now, next.inbound_id);
        const promoted = this.db.prepare("SELECT inbound_id, session_id, status, envelope_json FROM channel_inbound WHERE inbound_id = ?").get(next.inbound_id);
        nextInbound = { inboundId: promoted.inbound_id, sessionId: promoted.session_id, status: promoted.status, envelope: JSON.parse(promoted.envelope_json) };
      }
    }
    return { inboundId, status: outcome, changed: true, nextInbound };
  }

  claimNextChannelInbound() {
    const next = this.db.prepare(`
      SELECT candidate.inbound_id
      FROM channel_inbound candidate
      WHERE candidate.status IN ('retryable', 'queued')
        AND NOT EXISTS (
          SELECT 1 FROM channel_inbound active
          WHERE active.session_id = candidate.session_id AND active.status = 'claimed'
        )
      ORDER BY CASE candidate.status WHEN 'retryable' THEN 0 ELSE 1 END, candidate.created_at, candidate.inbound_id
      LIMIT 1
    `).get();
    if (!next) return null;
    const now = Date.now();
    const changed = this.db.prepare("UPDATE channel_inbound SET status = 'claimed', updated_at = ? WHERE inbound_id = ? AND status IN ('retryable', 'queued')").run(now, next.inbound_id);
    if (changed.changes !== 1) return null;
    const row = this.db.prepare("SELECT inbound_id, session_id, status, envelope_json FROM channel_inbound WHERE inbound_id = ?").get(next.inbound_id);
    return { inboundId: row.inbound_id, sessionId: row.session_id, status: row.status, envelope: JSON.parse(row.envelope_json) };
  }

  recoverChannelRuntime() {
    const now = Date.now();
    const inbound = this.db.prepare("UPDATE channel_inbound SET status = 'retryable', updated_at = ? WHERE status = 'claimed'").run(now).changes;
    const deliveries = this.db.prepare("UPDATE channel_deliveries SET status = 'unknown', last_error_code = 'runtime_restart_during_send', updated_at = ? WHERE status = 'sending'").run(now).changes;
    return { inboundReleasedForReplay: inbound, deliveriesRequiringReconcile: deliveries };
  }

  prepareChannelDelivery(envelope) {
    const session = this.ensureMessengerSession(envelope.identity);
    const existing = this.db.prepare("SELECT * FROM channel_deliveries WHERE session_id = ? AND idempotency_key = ?").get(session.sessionId, envelope.idempotencyKey);
    if (existing) return { ...this.channelDeliveryRecord(existing), deduplicated: true, blockedReason: existing.status === "unknown" ? "reconcile_required" : null };
    const deliveryId = crypto.randomUUID();
    const now = Date.now();
    this.db.prepare("INSERT INTO channel_deliveries(delivery_id, session_id, idempotency_key, status, envelope_json, attempts, created_at, updated_at) VALUES(?, ?, ?, 'prepared', ?, 0, ?, ?)")
      .run(deliveryId, session.sessionId, envelope.idempotencyKey, json(envelope), now, now);
    return { deliveryId, sessionId: session.sessionId, idempotencyKey: envelope.idempotencyKey, status: "prepared", attempts: 0, deduplicated: false };
  }

  markChannelDeliverySending(deliveryId) {
    const now = Date.now();
    const changed = this.db.prepare("UPDATE channel_deliveries SET status = 'sending', attempts = attempts + 1, updated_at = ? WHERE delivery_id = ? AND status = 'prepared'").run(now, deliveryId);
    if (changed.changes !== 1) throw new RuntimeError("channel_delivery_state_conflict", "Channel delivery is not prepared", 409, { deliveryId });
    return this.getChannelDelivery(deliveryId);
  }

  finishChannelDelivery(deliveryId, outcome, { externalMessageId = null, errorCode = null } = {}) {
    if (!["delivered", "failed", "unknown"].includes(outcome)) throw new RuntimeError("channel_delivery_outcome_invalid", "Channel delivery outcome is invalid", 400);
    if (outcome === "delivered" && !externalMessageId) throw new RuntimeError("channel_delivery_receipt_invalid", "Delivered channel messages require an external message id", 502);
    const now = Date.now();
    const changed = this.db.prepare("UPDATE channel_deliveries SET status = ?, external_message_id = ?, last_error_code = ?, updated_at = ? WHERE delivery_id = ? AND status = 'sending'")
      .run(outcome, externalMessageId, errorCode, now, deliveryId);
    if (changed.changes !== 1) throw new RuntimeError("channel_delivery_state_conflict", "Channel delivery is not in flight", 409, { deliveryId });
    return this.getChannelDelivery(deliveryId);
  }

  getChannelDelivery(deliveryId) {
    const row = this.db.prepare("SELECT * FROM channel_deliveries WHERE delivery_id = ?").get(deliveryId);
    return row ? this.channelDeliveryRecord(row) : null;
  }

  channelDeliveryRecord(row) {
    return {
      deliveryId: row.delivery_id, sessionId: row.session_id, idempotencyKey: row.idempotency_key,
      status: row.status, envelope: JSON.parse(row.envelope_json), attempts: row.attempts,
      externalMessageId: row.external_message_id, lastErrorCode: row.last_error_code,
      createdAt: row.created_at, updatedAt: row.updated_at
    };
  }

  reconcileChannelDelivery(deliveryId, outcome, externalMessageId = null) {
    if (!["delivered", "not_sent", "unknown"].includes(outcome)) throw new RuntimeError("channel_reconcile_invalid", "Channel reconciliation outcome is invalid", 400);
    const status = outcome === "not_sent" ? "reconciled_not_sent" : outcome;
    if (outcome === "delivered" && !externalMessageId) throw new RuntimeError("channel_delivery_receipt_invalid", "Reconciled delivery requires an external message id", 502);
    const now = Date.now();
    const changed = this.db.prepare("UPDATE channel_deliveries SET status = ?, external_message_id = COALESCE(?, external_message_id), updated_at = ? WHERE delivery_id = ? AND status = 'unknown'")
      .run(status, externalMessageId, now, deliveryId);
    if (changed.changes !== 1 && !this.getChannelDelivery(deliveryId)) throw new RuntimeError("channel_delivery_not_found", "Channel delivery does not exist", 404);
    return this.getChannelDelivery(deliveryId);
  }

  retryChannelDelivery(deliveryId) {
    const now = Date.now();
    const changed = this.db.prepare("UPDATE channel_deliveries SET status = 'prepared', last_error_code = NULL, updated_at = ? WHERE delivery_id = ? AND status = 'reconciled_not_sent'").run(now, deliveryId);
    if (changed.changes !== 1) throw new RuntimeError("channel_retry_not_safe", "Channel delivery must be reconciled as not sent before retry", 409, { deliveryId });
    return this.getChannelDelivery(deliveryId);
  }

  channelRuntimeStatus() {
    const sessions = this.db.prepare("SELECT COUNT(*) AS count FROM messenger_sessions").get().count;
    const inbound = this.db.prepare("SELECT status, COUNT(*) AS count FROM channel_inbound GROUP BY status ORDER BY status").all();
    const deliveries = this.db.prepare("SELECT status, COUNT(*) AS count FROM channel_deliveries GROUP BY status ORDER BY status").all();
    const unknown = deliveries.find(entry => entry.status === "unknown")?.count || 0;
    return { sessions, inbound, deliveries, reconcileRequired: unknown, contextBoundary: "isolated_until_admitted" };
  }

  recordToolInvocation(record, runtimeGeneration) {
    this.appendEvent({ commandId: null, principalId: record.principalId, type: `tool.${record.status}`, payload: record, runtimeGeneration });
    return this.getToolInvocation(record.invocationId, record.principalId);
  }

  getToolInvocation(invocationId, principalId) {
    const rows = this.db.prepare("SELECT type, payload_json, created_at FROM events WHERE principal_id = ? AND type LIKE 'tool.%' ORDER BY seq").all(principalId);
    let current = null;
    for (const row of rows) {
      const payload = JSON.parse(row.payload_json);
      if (payload.invocationId === invocationId) current = { ...payload, eventType: row.type, updatedAt: row.created_at };
    }
    return current;
  }

  recoverToolInvocations(runtimeGeneration) {
    const rows = this.db.prepare("SELECT principal_id, payload_json FROM events WHERE type LIKE 'tool.%' ORDER BY seq").all();
    const latest = new Map();
    for (const row of rows) { const payload = JSON.parse(row.payload_json); latest.set(payload.invocationId, { ...payload, principalId: row.principal_id }); }
    let unknown = 0; let expiredApproval = 0;
    for (const record of latest.values()) {
      if (record.status === "executing") {
        this.recordToolInvocation({ ...record, status: "unknown", outcome: "unknown", reason: "runtime_restart_during_tool_execution", receipt: null }, runtimeGeneration); unknown += 1;
      } else if (record.status === "awaiting_approval") {
        this.recordToolInvocation({ ...record, status: "cancelled", outcome: "not_completed", reason: "approval_expired_on_runtime_restart", receipt: null }, runtimeGeneration); expiredApproval += 1;
      }
    }
    return { unknown, expiredApproval };
  }

  appendEvent(input) {
    const now = input.createdAt || Date.now();
    const previous = this.db.prepare("SELECT hash FROM events ORDER BY seq DESC LIMIT 1").get()?.hash || "GENESIS";
    const eventId = input.eventId || crypto.randomUUID();
    const payloadJson = json(input.payload || {});
    const material = JSON.stringify({ eventId, commandId: input.commandId || null, principalId: input.principalId || null, type: input.type, payloadJson, runtimeGeneration: input.runtimeGeneration, createdAt: now, prevHash: previous });
    const hash = digest(material);
    this.db.prepare("INSERT INTO events(event_id, command_id, principal_id, type, payload_json, runtime_generation, created_at, prev_hash, hash) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)").run(eventId, input.commandId || null, input.principalId || null, input.type, payloadJson, input.runtimeGeneration, now, previous, hash);
    const last = this.db.prepare("SELECT seq FROM events ORDER BY seq DESC LIMIT 1").get();
    this.setMeta("event_checkpoint", json({ seq: last.seq, hash }));
    return { eventId, seq: last.seq, hash };
  }

  addProgress(commandId, principalId, phase, detail = {}) {
    const createdAt = Date.now();
    this.db.prepare("INSERT INTO progress(command_id, principal_id, phase, detail_json, created_at) VALUES(?, ?, ?, ?, ?)").run(commandId, principalId, phase, json(detail), createdAt);
    return this.db.prepare("SELECT seq, command_id, principal_id, phase, detail_json, created_at FROM progress WHERE rowid = last_insert_rowid()").get();
  }

  getProgress(commandId, principalId) {
    return this.db.prepare("SELECT seq, command_id, principal_id, phase, detail_json, created_at FROM progress WHERE command_id = ? AND principal_id = ? ORDER BY seq").all(commandId, principalId).map(row => ({ ...row, detail: JSON.parse(row.detail_json) }));
  }

  addTelemetry(commandId, principalId, stage, detail = {}, createdAt = Date.now()) {
    if (!TELEMETRY_STAGES.has(stage)) throw new RuntimeError("telemetry_stage_invalid", "Telemetry stage is not part of the GPAO-T3 control contract", 400, { stage });
    const acceptedAt = this.db.prepare("SELECT created_at FROM commands WHERE id = ? AND principal_id = ?").get(commandId, principalId)?.created_at;
    if (!acceptedAt) throw new RuntimeError("telemetry_command_missing", "Telemetry requires an accepted command", 409);
    const existing = this.db.prepare("SELECT stage, elapsed_from_accept_ms, detail_json, created_at FROM turn_stage_telemetry WHERE command_id = ? AND principal_id = ? AND stage = ? ORDER BY seq LIMIT 1").get(commandId, principalId, stage);
    if (existing) return { stage: existing.stage, elapsedFromAcceptMs: existing.elapsed_from_accept_ms, detail: JSON.parse(existing.detail_json), createdAt: existing.created_at, deduplicated: true };
    const elapsed = Math.max(0, createdAt - acceptedAt);
    this.db.prepare("INSERT INTO turn_stage_telemetry(command_id, principal_id, stage, elapsed_from_accept_ms, detail_json, created_at) VALUES(?, ?, ?, ?, ?, ?)").run(commandId, principalId, stage, elapsed, json(detail), createdAt);
    return { stage, elapsedFromAcceptMs: elapsed, createdAt };
  }

  getTelemetry(commandId, principalId) {
    return {
      schema: "gpao_t3.turn_stage_telemetry.v1",
      commandId,
      stages: this.db.prepare("SELECT stage, elapsed_from_accept_ms, detail_json, created_at FROM turn_stage_telemetry WHERE command_id = ? AND principal_id = ? ORDER BY seq").all(commandId, principalId)
        .map(row => ({ stage: row.stage, elapsedFromAcceptMs: row.elapsed_from_accept_ms, detail: JSON.parse(row.detail_json), createdAt: row.created_at }))
    };
  }

  getTurnEvents(commandId, principalId) {
    return this.db.prepare("SELECT event_id, type, payload_json, created_at FROM events WHERE command_id = ? AND principal_id = ? ORDER BY seq").all(commandId, principalId).map(row => ({
      eventId: row.event_id,
      type: row.type,
      payload: JSON.parse(row.payload_json),
      createdAt: row.created_at
    }));
  }

  saveResponseDocument(principalId, document) {
    if (!principalId || !verifyResponseDocument(document)) throw new RuntimeError("invalid_response_document", "Response document failed canonical digest verification", 400);
    const serialized = json(document);
    const existing = this.db.prepare("SELECT digest FROM response_documents WHERE response_document_id = ? AND principal_id = ?").get(document.id, principalId);
    if (existing) {
      if (existing.digest !== document.digest) throw new RuntimeError("response_document_conflict", "Response document id already refers to different content", 409);
      return { id: document.id, digest: document.digest, deduplicated: true };
    }
    this.db.prepare("INSERT INTO response_documents(response_document_id, turn_id, session_id, principal_id, digest, document_json, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)")
      .run(document.id, document.turnId, document.sessionId, principalId, document.digest, serialized, document.createdAt);
    return { id: document.id, digest: document.digest, deduplicated: false };
  }

  getResponseDocument(responseDocumentId, principalId) {
    const row = this.db.prepare("SELECT document_json FROM response_documents WHERE response_document_id = ? AND principal_id = ?").get(responseDocumentId, principalId);
    return row ? JSON.parse(row.document_json) : null;
  }

  appendSurfaceEvent(principalId, event) {
    if (!principalId) throw new RuntimeError("invalid_surface_event", "Surface event principal is required", 400);
    const verified = createSurfaceEvent({ ...event, eventId: event.eventId, createdAt: event.createdAt });
    if (verified.digest !== event.digest) throw new RuntimeError("surface_event_digest_mismatch", "Surface event failed canonical digest verification", 400);
    const responseDocumentId = event.type === "text.complete" ? event.payload.responseDocumentId : null;
    if (responseDocumentId) {
      const document = this.getResponseDocument(responseDocumentId, principalId);
      if (!document || document.digest !== event.payload.digest) throw new RuntimeError("surface_event_response_missing", "Surface event response reference is not durable", 409);
    }
    try {
      this.db.prepare("INSERT INTO surface_event_journal(event_id, turn_id, session_id, principal_id, turn_sequence, type, source_event_id, response_document_id, digest, event_json, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(event.eventId, event.turnId, event.sessionId, principalId, event.sequence, event.type, event.sourceEventId, responseDocumentId, event.digest, json(event), event.createdAt);
    } catch (error) {
      if (!/UNIQUE constraint failed/i.test(error.message || "")) throw error;
      const existing = this.db.prepare("SELECT event_id, digest FROM surface_event_journal WHERE principal_id = ? AND turn_id = ? AND turn_sequence = ?").get(principalId, event.turnId, event.sequence);
      if (existing?.event_id === event.eventId && existing.digest === event.digest) return { eventId: event.eventId, cursor: `${event.turnId}:${event.sequence}`, deduplicated: true };
      throw new RuntimeError("surface_event_sequence_conflict", "Surface event sequence already refers to a different event", 409);
    }
    return { eventId: event.eventId, cursor: `${event.turnId}:${event.sequence}`, deduplicated: false };
  }

  appendAuxiliarySurfaceEvent(principalId, input) {
    const sequence = (this.db.prepare("SELECT MAX(turn_sequence) AS value FROM surface_event_journal WHERE principal_id = ? AND turn_id = ?").get(principalId, input.turnId)?.value || 0) + 1;
    const event = createSurfaceEvent({ ...input, sequence, correlationId: input.correlationId || input.turnId });
    this.appendSurfaceEvent(principalId, event);
    return event;
  }

  replaySurfaceEvents(principalId, turnId, afterSequence = 0, limit = 256) {
    if (!Number.isInteger(afterSequence) || afterSequence < 0 || !Number.isInteger(limit) || limit < 1 || limit > 512) throw new RuntimeError("surface_event_cursor_invalid", "Surface event cursor is invalid", 400);
    const rows = this.db.prepare("SELECT event_json FROM surface_event_journal WHERE principal_id = ? AND turn_id = ? AND turn_sequence > ? ORDER BY turn_sequence LIMIT ?").all(principalId, turnId, afterSequence, limit + 1);
    const hasMore = rows.length > limit;
    const events = rows.slice(0, limit).map(row => JSON.parse(row.event_json));
    return { schema: "gpao_t3.surface_event_replay.v1", events, nextCursor: `${turnId}:${events.at(-1)?.sequence || afterSequence}`, hasMore };
  }

  getSurfaceTurnSummary(principalId, turnId) {
    const rows = this.db.prepare("SELECT event_json FROM surface_event_journal WHERE principal_id = ? AND turn_id = ? ORDER BY turn_sequence").all(principalId, turnId);
    if (!rows.length) return null;
    let terminal = null;
    let complete = null;
    let lastSequence = 0;
    for (const row of rows) {
      const event = JSON.parse(row.event_json);
      lastSequence = event.sequence;
      if (event.type === "text.complete") complete = event;
      if (event.terminal) terminal = event;
    }
    return { terminal, complete, lastSequence };
  }

  findSurfaceTurnByRequest(principalId, sessionId, requestId) {
    const rows = this.db.prepare("SELECT turn_id, event_json FROM surface_event_journal WHERE principal_id = ? AND session_id = ? AND type = 'turn.accepted' ORDER BY seq DESC").all(principalId, sessionId);
    for (const row of rows) {
      const event = JSON.parse(row.event_json);
      if (event.payload?.requestId !== requestId) continue;
      const summary = this.getSurfaceTurnSummary(principalId, row.turn_id);
      return { turnId:row.turn_id, requestDigest:event.payload.requestDigest || null, status:summary?.terminal ? summary.terminal.type.split(".").at(-1) : "running" };
    }
    return null;
  }

  recoverIncompleteSurfaceTurns() {
    const rows = this.db.prepare("SELECT principal_id, turn_id, session_id, turn_sequence, event_id, event_json FROM surface_event_journal ORDER BY seq").all();
    const latest = new Map();
    for (const row of rows) latest.set(`${row.principal_id}:${row.turn_id}`, { ...row, event:JSON.parse(row.event_json) });
    let failed = 0;
    for (const row of latest.values()) {
      if (row.event.terminal) continue;
      const event = createSurfaceEvent({
        turnId:row.turn_id, sessionId:row.session_id, sequence:row.turn_sequence + 1,
        type:"turn.failed", correlationId:row.turn_id, causationId:row.event_id,
        payload:{ code:"runtime_restart", message:"재시작 전에 끝나지 않은 작업입니다.", recoveryAvailable:true }, terminal:true
      });
      this.appendSurfaceEvent(row.principal_id, event);
      failed += 1;
    }
    return { failed };
  }

  verifySurfaceJournal() {
    const rows = this.db.prepare("SELECT event_id, event_json, digest FROM surface_event_journal ORDER BY seq").all();
    for (const row of rows) {
      const event = JSON.parse(row.event_json);
      const verified = createSurfaceEvent({ ...event, eventId: event.eventId, createdAt: event.createdAt });
      if (verified.digest !== row.digest || event.digest !== row.digest) throw new RuntimeError("surface_event_integrity_failed", "Surface event journal was modified", 500, { eventId: row.event_id });
    }
    return { ok: true, events: rows.length };
  }

  createCommand(command) {
    this.db.prepare("INSERT INTO commands(id, principal_id, request_id, request_digest, payload_json, status, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)").run(command.id, command.principalId, command.requestId, command.requestDigest, json(command.payload), "accepted", command.createdAt, command.createdAt);
    this.db.prepare("INSERT INTO outbox(id, command_id, principal_id, state, generation, attempts, created_at, updated_at) VALUES(?, ?, ?, 'pending', NULL, 0, ?, ?)").run(crypto.randomUUID(), command.id, command.principalId, command.createdAt, command.createdAt);
  }

  acceptCommand(command, runtimeGeneration, maxQueue = 64) {
    return this.transaction(() => {
      const currentGeneration = Number(this.getMeta("runtime_generation") || 0);
      if (currentGeneration !== runtimeGeneration) throw new RuntimeError("stale_generation", "Command belongs to an old runtime generation", 409, { currentGeneration, runtimeGeneration });
      const existing = this.findByRequest(command.principalId, command.requestId);
      if (existing) {
        if (existing.request_digest !== command.requestDigest) throw new RuntimeError("idempotency_conflict", "Request id was already used with a different payload", 409);
        return { commandId: existing.id, status: existing.status, deduplicated: true };
      }
      if (this.countActiveOutbox() >= maxQueue) throw new RuntimeError("backpressure", "Native Runtime queue is full", 429, { maxQueue, retryable: true });
      this.createCommand(command);
      this.addTelemetry(command.id, command.principalId, "accepted", { requestId: command.requestId }, command.createdAt);
      this.appendEvent({ commandId: command.id, principalId: command.principalId, type: "turn.accepted", payload: { requestId: command.requestId }, runtimeGeneration });
      this.addProgress(command.id, command.principalId, "accepted", { requestId: command.requestId });
      return { commandId: command.id, status: "accepted", deduplicated: false };
    });
  }

  findByRequest(principalId, requestId) {
    return this.db.prepare("SELECT * FROM commands WHERE principal_id = ? AND request_id = ?").get(principalId, requestId);
  }

  getCommand(id, principalId) {
    const row = this.db.prepare("SELECT * FROM commands WHERE id = ? AND principal_id = ?").get(id, principalId);
    if (!row) return null;
    const receipt = this.db.prepare("SELECT * FROM receipts WHERE command_id = ? AND principal_id = ?").get(id, principalId);
    return {
      id: row.id,
      principalId: row.principal_id,
      requestId: row.request_id,
      status: row.status,
      payload: JSON.parse(row.payload_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      receipt: receipt ? { status: receipt.status, result: receipt.result_json ? JSON.parse(receipt.result_json) : null, createdAt: receipt.created_at } : null
    };
  }

  pendingOutbox(limit) {
    return this.db.prepare("SELECT * FROM outbox WHERE state = 'pending' ORDER BY created_at, id LIMIT ?").all(limit);
  }

  countActiveOutbox() {
    return this.db.prepare("SELECT COUNT(*) AS count FROM outbox WHERE state IN ('pending', 'leased')").get().count;
  }

  lease(commandId, generation) {
    if (Number(this.getMeta("runtime_generation") || 0) !== generation) return false;
    const now = Date.now();
    const row = this.db.prepare("SELECT * FROM outbox WHERE command_id = ? AND state = 'pending'").get(commandId);
    if (!row) return false;
    this.db.prepare("UPDATE outbox SET state = 'leased', generation = ?, attempts = attempts + 1, updated_at = ? WHERE command_id = ? AND state = 'pending'").run(generation, now, commandId);
    this.db.prepare("UPDATE commands SET status = 'running', updated_at = ? WHERE id = ? AND status = 'accepted'").run(now, commandId);
    return true;
  }

  markUncertain(commandId, principalId, generation, reason) {
    const now = Date.now();
    const row = this.db.prepare("SELECT generation FROM outbox WHERE command_id = ? AND state = 'leased'").get(commandId);
    if (!row) return false;
    if (reason !== "runtime_restart" && row.generation !== generation) throw new RuntimeError("stale_generation", "Outcome belongs to an old runtime generation", 409, { rowGeneration: row.generation, runtimeGeneration: generation });
    const changedOutbox = this.db.prepare("UPDATE outbox SET state = 'uncertain', updated_at = ? WHERE command_id = ? AND state = 'leased'").run(now, commandId);
    if (changedOutbox.changes !== 1) return false;
    this.db.prepare("UPDATE commands SET status = 'uncertain', updated_at = ? WHERE id = ? AND principal_id = ? AND status = 'running'").run(now, commandId, principalId);
    this.appendEvent({ commandId, principalId, type: "turn.outcome.unknown", payload: { reason }, runtimeGeneration: generation });
    this.addProgress(commandId, principalId, "uncertain", { reason });
    this.addTelemetry(commandId, principalId, "uncertain", { reason }, now);
    return true;
  }

  cancelCommand(commandId, principalId, generation) {
    if (Number(this.getMeta("runtime_generation") || 0) !== generation) throw new RuntimeError("stale_generation", "Cancellation belongs to an old runtime generation", 409);
    const now = Date.now();
    const row = this.db.prepare("SELECT state, generation FROM outbox WHERE command_id = ? AND principal_id = ?").get(commandId, principalId);
    if (!row) return { changed: false, kind: "not_found" };
    if (row.state === "pending") {
      const changed = this.db.prepare("UPDATE outbox SET state = 'cancelled', updated_at = ? WHERE command_id = ? AND principal_id = ? AND state = 'pending'").run(now, commandId, principalId);
      if (changed.changes !== 1) return { changed: false, kind: "race_lost" };
      this.db.prepare("UPDATE commands SET status = 'cancelled', updated_at = ? WHERE id = ? AND principal_id = ? AND status = 'accepted'").run(now, commandId, principalId);
      this.appendEvent({ commandId, principalId, type: "turn.cancelled", payload: { cancellation: "cancelled_before_dispatch" }, runtimeGeneration: generation });
      this.addProgress(commandId, principalId, "cancelled", { cancellation: "cancelled_before_dispatch" });
      this.addTelemetry(commandId, principalId, "cancelled", { cancellation: "cancelled_before_dispatch" }, now);
      return { changed: true, kind: "cancelled_before_dispatch" };
    }
    if (row.state === "leased" && row.generation === generation) {
      const changed = this.markUncertain(commandId, principalId, generation, "cancelled_in_flight");
      return { changed, kind: changed ? "cancelled_in_flight" : "race_lost" };
    }
    return { changed: false, kind: row.state };
  }

  markTerminal(commandId, principalId, generation, status, result) {
    const now = Date.now();
    const outboxState = status === "succeeded" ? "completed" : "failed";
    const row = this.db.prepare("SELECT generation FROM outbox WHERE command_id = ? AND state = 'leased' AND generation = ?").get(commandId, generation);
    if (!row) throw new RuntimeError("stale_generation", "Terminal result belongs to an old or non-leased command", 409, { runtimeGeneration: generation });
    this.db.prepare("UPDATE outbox SET state = ?, updated_at = ? WHERE command_id = ? AND state = 'leased' AND generation = ?").run(outboxState, now, commandId, generation);
    const changed = this.db.prepare("UPDATE commands SET status = ?, updated_at = ? WHERE id = ? AND principal_id = ? AND status = 'running'").run(status, now, commandId, principalId);
    if (changed.changes !== 1) return false;
    this.db.prepare("INSERT OR REPLACE INTO receipts(command_id, principal_id, status, result_json, created_at) VALUES(?, ?, ?, ?, ?)").run(commandId, principalId, status, json(result), now);
    this.appendEvent({ commandId, principalId, type: `turn.${status}`, payload: result, runtimeGeneration: generation });
    this.addProgress(commandId, principalId, status === "succeeded" ? "completed" : "failed", { result });
    this.addTelemetry(commandId, principalId, status === "succeeded" ? "completed" : "failed", {}, now);
    return true;
  }

  markAllLeasedUncertain(generation, reason) {
    const rows = this.db.prepare("SELECT command_id, principal_id FROM outbox WHERE state = 'leased'").all();
    for (const row of rows) this.markUncertain(row.command_id, row.principal_id, generation, reason);
    return rows.length;
  }

  getCheckpoint() {
    const value = this.getMeta("event_checkpoint");
    return value ? JSON.parse(value) : { seq: 0, hash: "GENESIS" };
  }

  verifyCheckpoint() {
    const checkpoint = this.getCheckpoint();
    const last = this.db.prepare("SELECT seq, hash FROM events ORDER BY seq DESC LIMIT 1").get();
    const actual = last ? { seq: last.seq, hash: last.hash } : { seq: 0, hash: "GENESIS" };
    if (actual.seq !== checkpoint.seq || actual.hash !== checkpoint.hash) throw new RuntimeError("event_checkpoint_drift", "Event checkpoint does not match the event tail", 500, { checkpoint, actual });
    return { ok: true, checkpoint };
  }

  verifyIntegrity() {
    let previous = "GENESIS";
    let lastSeq = 0;
    const rows = this.db.prepare("SELECT * FROM events ORDER BY seq").all();
    for (const row of rows) {
      if (row.seq !== lastSeq + 1 || row.prev_hash !== previous) throw new RuntimeError("event_integrity_failed", "Event chain is discontinuous or modified", 500, { seq: row.seq });
      const material = JSON.stringify({ eventId: row.event_id, commandId: row.command_id, principalId: row.principal_id, type: row.type, payloadJson: row.payload_json, runtimeGeneration: row.runtime_generation, createdAt: row.created_at, prevHash: row.prev_hash });
      if (digest(material) !== row.hash) throw new RuntimeError("event_integrity_failed", "Event hash verification failed", 500, { seq: row.seq });
      previous = row.hash;
      lastSeq = row.seq;
    }
    const checkpoint = this.getCheckpoint();
    if (checkpoint.seq !== lastSeq || checkpoint.hash !== previous) throw new RuntimeError("event_checkpoint_drift", "Event checkpoint does not match the event log", 500, { checkpoint, lastSeq, lastHash: previous });
    return { ok: true, events: rows.length, checkpoint, surfaceJournal: this.verifySurfaceJournal(), growthJournal: this.verifyGrowthJournal() };
  }

  close() {
    this.db.close();
  }
}

function compareCursor(left, right) {
  const a = String(left);
  const b = String(right);
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) return a === b ? 0 : (BigInt(a) > BigInt(b) ? 1 : -1);
  return a.localeCompare(b);
}
