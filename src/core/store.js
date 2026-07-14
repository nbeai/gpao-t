import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { RuntimeError } from "./errors.js";

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function json(value) {
  return JSON.stringify(value === undefined ? null : value);
}

export class StateStore {
  constructor(stateDir) {
    this.stateDir = stateDir;
    fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
    this.dbPath = path.join(stateDir, "runtime.sqlite");
    this.db = new DatabaseSync(this.dbPath);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  migrate() {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
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
      this.setMeta("schema_version", "1");
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

  createCommand(command) {
    this.db.prepare("INSERT INTO commands(id, principal_id, request_id, request_digest, payload_json, status, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?)").run(command.id, command.principalId, command.requestId, command.requestDigest, json(command.payload), "accepted", command.createdAt, command.createdAt);
    this.db.prepare("INSERT INTO outbox(id, command_id, principal_id, state, generation, attempts, created_at, updated_at) VALUES(?, ?, ?, 'pending', NULL, 0, ?, ?)").run(crypto.randomUUID(), command.id, command.principalId, command.createdAt, command.createdAt);
  }

  acceptCommand(command, runtimeGeneration, maxQueue = 64) {
    return this.transaction(() => {
      const existing = this.findByRequest(command.principalId, command.requestId);
      if (existing) {
        if (existing.request_digest !== command.requestDigest) throw new RuntimeError("idempotency_conflict", "Request id was already used with a different payload", 409);
        return { commandId: existing.id, status: existing.status, deduplicated: true };
      }
      if (this.countActiveOutbox() >= maxQueue) throw new RuntimeError("backpressure", "Native Runtime queue is full", 429, { maxQueue });
      this.createCommand(command);
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
    const now = Date.now();
    const row = this.db.prepare("SELECT * FROM outbox WHERE command_id = ? AND state = 'pending'").get(commandId);
    if (!row) return false;
    this.db.prepare("UPDATE outbox SET state = 'leased', generation = ?, attempts = attempts + 1, updated_at = ? WHERE command_id = ? AND state = 'pending'").run(generation, now, commandId);
    this.db.prepare("UPDATE commands SET status = 'running', updated_at = ? WHERE id = ? AND status = 'accepted'").run(now, commandId);
    return true;
  }

  markUncertain(commandId, principalId, generation, reason) {
    const now = Date.now();
    this.db.prepare("UPDATE outbox SET state = 'uncertain', updated_at = ? WHERE command_id = ? AND state = 'leased'").run(now, commandId);
    this.db.prepare("UPDATE commands SET status = 'uncertain', updated_at = ? WHERE id = ? AND principal_id = ? AND status = 'running'").run(now, commandId, principalId);
    this.appendEvent({ commandId, principalId, type: "turn.outcome.unknown", payload: { reason }, runtimeGeneration: generation });
    this.addProgress(commandId, principalId, "outcome_unknown", { reason });
  }

  markTerminal(commandId, principalId, generation, status, result) {
    const now = Date.now();
    const outboxState = status === "succeeded" ? "completed" : "failed";
    this.db.prepare("UPDATE outbox SET state = ?, updated_at = ? WHERE command_id = ? AND state = 'leased' AND generation = ?").run(outboxState, now, commandId, generation);
    const changed = this.db.prepare("UPDATE commands SET status = ?, updated_at = ? WHERE id = ? AND principal_id = ? AND status = 'running'").run(status, now, commandId, principalId);
    if (changed.changes !== 1) return false;
    this.db.prepare("INSERT OR REPLACE INTO receipts(command_id, principal_id, status, result_json, created_at) VALUES(?, ?, ?, ?, ?)").run(commandId, principalId, status, json(result), now);
    this.appendEvent({ commandId, principalId, type: `turn.${status}`, payload: result, runtimeGeneration: generation });
    this.addProgress(commandId, principalId, status, { result });
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
    return { ok: true, events: rows.length, checkpoint };
  }

  close() {
    this.db.close();
  }
}
