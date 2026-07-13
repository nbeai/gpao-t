import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildMemorySearchIndex,
  getMemorySearchStatus,
  searchMemory,
} from "../src/core/memory-search.js";

function tempStateDir() {
  return mkdtempSync(join(tmpdir(), "gpao-t-memory-search-"));
}

function writeJsonl(path, records) {
  writeFileSync(path, records.map((record) => JSON.stringify(record)).join("\n") + "\n");
}

describe("GPAO-T baseline memory search", () => {
  it("builds a local search index from Memory Wiki, chat records, workspace notes, and audit events", () => {
    const stateDir = tempStateDir();
    mkdirSync(join(stateDir, "memory"), { recursive: true });
    mkdirSync(join(stateDir, "chat"), { recursive: true });
    mkdirSync(join(stateDir, "workspace", "memory"), { recursive: true });
    mkdirSync(join(stateDir, "events"), { recursive: true });

    writeFileSync(join(stateDir, "memory", "wiki.json"), `${JSON.stringify({
      schema: "gpao_t.memory_wiki.v0_1",
      entries: [{
        title: "GPAO-T memory baseline",
        body: "Embedding search is optional. Local lexical search must always work as a baseline.",
        tags: ["context-mesh", "memory"],
        createdAt: "2026-07-13T00:00:00.000Z",
      }],
    })}\n`);
    writeJsonl(join(stateDir, "chat", "preflight-records.jsonl"), [{
      id: "preflight.1",
      createdAt: "2026-07-13T00:01:00.000Z",
      messagePreview: "우리가 지금까지 어떤 대화를 했는지 검색해줘",
      packet: { rawUserUtterance: "전체 세션 기억 검색이 필요해" },
      labels: { endpoint: "memory search baseline" },
    }]);
    writeFileSync(join(stateDir, "workspace", "MEMORY.md"), "GPAO-T keeps source-linked memory and context mesh notes.\n");
    writeJsonl(join(stateDir, "events", "audit.jsonl"), [{
      id: "evt.1",
      type: "memory.index",
      createdAt: "2026-07-13T00:02:00.000Z",
      summary: "Memory search index was rebuilt.",
      payload: { source: "test" },
    }]);

    const statusBefore = getMemorySearchStatus({ stateDir });
    const index = buildMemorySearchIndex({ stateDir, now: "2026-07-13T00:03:00.000Z" });
    const statusAfter = getMemorySearchStatus({ stateDir });
    const result = searchMemory({ stateDir, query: "전체 세션 기억 검색", limit: 3 });

    assert.equal(statusBefore.status, "needs_index");
    assert.equal(index.status, "ready");
    assert.ok(index.counts.documents >= 4);
    assert.equal(statusAfter.status, "ready");
    assert.equal(statusAfter.embeddingSearch.status, "ready");
    assert.equal(statusAfter.embeddingSearch.provider, "local_hash");
    assert.equal(statusAfter.embeddingSearch.externalQuotaRequired, false);
    assert.equal(result.status, "ready");
    assert.equal(result.engine.mode, "local_hybrid_memory_search");
    assert.equal(result.engine.semantic, "gpao_t.local_hash_embedding.v0_1");
    assert.ok(result.results.length >= 1);
    assert.equal(result.results[0].scoreBreakdown.engine, "hybrid_local_lexical_semantic");
    assert.equal(result.results[0].source, "chat_preflight");
  });

  it("keeps meaning-style search available without an external embedding provider", () => {
    const stateDir = tempStateDir();
    mkdirSync(join(stateDir, "workspace"), { recursive: true });
    writeFileSync(
      join(stateDir, "workspace", "MEMORY.md"),
      "사용자가 긴 대화의 흐름을 다시 물으면 세션 기록, 메모리 위키, 작업공간 문서를 함께 찾아야 한다.\n",
    );

    const index = buildMemorySearchIndex({ stateDir, now: "2026-07-13T00:04:00.000Z" });
    const result = searchMemory({ stateDir, query: "대화 맥락을 다시 파악할 수 있니", limit: 3 });

    assert.equal(index.engine.semantic, "gpao_t.local_hash_embedding.v0_1");
    assert.equal(result.status, "ready");
    assert.ok(result.results.length >= 1);
    assert.ok(result.results[0].scoreBreakdown.semantic > 0);
  });
});
