import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { StateStore } from "../src/core/store.js";
import { NativeRuntime } from "../src/core/runtime.js";
import { ContextInfluenceLedger } from "../src/core/context-influence.js";

const schema = JSON.parse(fs.readFileSync(new URL("../src/schemas/mct-contract.v1.schema.json", import.meta.url), "utf8"));

function candidate(id, text, sessionId = "session-a") {
  return { id, text, source: "r1_fixture", traceRef: `trace-${id}`, sessionId, reviewed: false, createdAt: Date.now() };
}

test("MCT-R1 SQLite hybrid search survives restart, isolates scope, rebuilds, and purges projections", () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-mct-r1-"));
  try {
    let store = new StateStore(stateDir);
    store.transaction(() => {
      store.addMemoryCandidate(candidate("memory-korean", "사용자는 최소 승인과 매끄러운 대화 흐름을 원한다"));
      store.addMemoryCandidate(candidate("memory-code", "runtime semantic context packet authority boundary"));
      store.addMemoryCandidate(candidate("memory-other", "다른 세션의 비공개 맥락", "session-b"));
    });
    let result = store.searchMemory("매끄러운 대화 승인", { sessionId: "session-a", limit: 5 });
    assert.throws(() => store.searchMemory("비공개 맥락"), error => error.code === "memory_scope_required");
    assert.equal(result.results[0].id, "memory-korean");
    assert.equal(result.results.some(entry => entry.id === "memory-other"), false);
    assert.equal(result.receipt.mode, "sqlite_fts5_lexical_fuzzy_local_vector_semantic");
    assert.equal(result.receipt.semanticProvider, "provider_neutral");
    assert.equal(result.receipt.vectorAlgorithm, "char_trigram_hash_v1");
    assert.ok(result.results[0].scores.lexical > 0 || result.results[0].scores.localVector > 0);
    const validate = new Ajv2020({ strict: false }).compile(schema);
    assert.equal(validate(result.results[0].retrievalHit), true, JSON.stringify(validate.errors));
    assert.equal(store.memorySearchStatus().parity, true);
    store.db.exec("DROP TABLE memory_semantic_fts; UPDATE meta SET value = '14' WHERE key = 'schema_version';");
    store.close();

    store = new StateStore(stateDir);
    assert.equal(store.identitySnapshot().schemaVersion, 15);
    assert.equal(store.memorySearchStatus().semanticCandidates, 3);
    assert.equal(store.memorySearchStatus().parity, true);
    result = store.searchMemory("semantic context authority", { sessionId: "session-a", limit: 5 });
    assert.equal(result.results[0].id, "memory-code");
    store.db.prepare("UPDATE memory_semantic_fts SET features = ? WHERE memory_id = ?").run("corrupted_feature", "memory-code");
    assert.equal(store.memorySearchStatus().parity, false);
    assert.equal(store.repairMemorySearchIndexBatch({ limit: 1 }).status.parity, true);
    store.db.exec("DROP TABLE memory_semantic_fts");
    store.close();
    store = new StateStore(stateDir);
    assert.equal(store.identitySnapshot().schemaVersion, 15);
    assert.equal(store.memorySearchStatus().semanticCandidates, 3);
    assert.equal(store.memorySearchStatus().parity, true);
    store.db.prepare("DELETE FROM memory_vector_fts WHERE memory_id = ?").run("memory-code");
    assert.equal(store.memorySearchStatus().parity, false);
    assert.equal(store.transaction(() => store.repairMemorySearchIndexBatch({ limit: 1 })).status.parity, true);
    store.db.prepare("DELETE FROM memory_vector_fts WHERE memory_id = ?").run("memory-code");
    assert.deepEqual(store.rebuildMemorySearchIndex(), { schema: "gpao_t3.memory_search_rebuild.v1", rebuilt: 3, verified: true });
    assert.throws(() => store.transaction(() => { store.addMemoryCandidate(candidate("memory-rollback", "rollback fixture")); throw new Error("rollback"); }), /rollback/);
    assert.equal(store.getMemoryRecord("memory-rollback"), null);
    assert.equal(store.memorySearchStatus().parity, true);
    const deleted = store.transaction(() => store.deleteMemory("memory-code"));
    assert.equal(deleted.deleted, true);
    assert.equal(deleted.projectionsPurged, true);
    assert.equal(store.searchMemory("semantic context authority", { sessionId: "session-a" }).results.some(entry => entry.id === "memory-code"), false);
    assert.equal(store.memorySearchStatus().parity, true);
    store.close();
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
});

test("MCT-R1 runtime deletion rehydrates influence and repair never blocks foreground retrieval", async () => {
  const influence = new ContextInfluenceLedger();
  influence.hydrate([{ id: "influence-1", state: "applied", sourceCandidateId: "memory-1", text: "승인된 기억", traceRef: "trace-1", scope: { sessionId: "session-a" }, replayScore: 1, rollbackToken: "rollback-1", createdAt: 1, appliedAt: 1 }]);
  const calls = [];
  const runtime = {
    writer: { call: async op => { calls.push(op); return op === "deleteMemory" ? { memoryId: "memory-1", deleted: true } : []; } },
    memory: { entries: new Map([["memory-1", {}]]), search: () => ({ results: [], degraded: null, elapsedMs: 0 }) },
    contextInfluence: influence,
    memorySearchRepairActive: false
  };
  await NativeRuntime.prototype.deleteMemory.call(runtime, "memory-1");
  assert.deepEqual(calls, ["deleteMemory", "listContextInfluences"]);
  assert.equal(influence.activeForTask({ sessionId: "session-a", input: "승인된 기억" }).length, 0);
  runtime.memorySearchRepairActive = true;
  let writerCalled = false;
  runtime.writer.call = async () => { writerCalled = true; };
  const fallback = await NativeRuntime.prototype.searchMemory.call(runtime, "기억", { sessionId: "session-a" });
  assert.equal(writerCalled, false);
  assert.equal(fallback.degraded, "index_repair_in_progress");
});
