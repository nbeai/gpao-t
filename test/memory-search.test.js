import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
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

  it("does not rebuild the index inside fast-lane live turns", () => {
    const stateDir = tempStateDir();
    mkdirSync(join(stateDir, "workspace"), { recursive: true });
    writeFileSync(
      join(stateDir, "workspace", "MEMORY.md"),
      "이 문서는 색인이 만들어진 뒤에만 빠른 대화 경로에서 검색됩니다.\n",
    );

    const result = searchMemory({
      stateDir,
      query: "빠른 대화 경로",
      limit: 3,
      allowBuild: false,
    });

    assert.equal(result.status, "needs_index");
    assert.equal(result.results.length, 0);
    assert.equal(result.findings.includes("memory_search_index_missing"), true);
    assert.equal(existsSync(join(stateDir, "memory", "search-index.json")), false);
  });

  it("indexes only the bounded tail of large JSONL logs to protect turn latency", () => {
    const stateDir = tempStateDir();
    mkdirSync(join(stateDir, "chat"), { recursive: true });
    const oldNoise = "오래된 반복 로그 ".repeat(6000);
    const records = [
      ...Array.from({ length: 180 }, (_, index) => ({
        id: `old.${index}`,
        createdAt: "2026-07-12T00:00:00.000Z",
        messagePreview: `${oldNoise}${index}`,
        packet: { rawUserUtterance: "old unrelated context" },
      })),
      {
        id: "recent.context.mesh.fast-lane",
        createdAt: "2026-07-13T00:05:00.000Z",
        messagePreview: "최근 GPAO-T fast-lane Context Mesh 기억은 답변 속도를 지키며 검색되어야 한다.",
        packet: { rawUserUtterance: "fast-lane memory tail read" },
      },
    ];
    writeJsonl(join(stateDir, "chat", "preflight-records.jsonl"), records);

    const index = buildMemorySearchIndex({ stateDir, now: "2026-07-13T00:06:00.000Z" });
    const result = searchMemory({ stateDir, query: "fast-lane Context Mesh 기억", limit: 5 });

    assert.equal(index.performance.boundedReads, true);
    assert.equal(index.performance.maxJsonlTailBytes, 512 * 1024);
    assert.ok(index.performance.elapsedMs >= 0);
    assert.ok(result.results.some((item) => item.title.includes("fast-lane")));
    assert.equal(result.engine.mode, "local_hybrid_memory_search");
  });

  it("indexes bounded live agent session transcripts as context memory", () => {
    const stateDir = tempStateDir();
    mkdirSync(join(stateDir, "agents", "main", "sessions"), { recursive: true });
    writeFileSync(join(stateDir, "agents", "main", "sessions", "sessions.json"), `${JSON.stringify({
      sessions: [{
        id: "context-session",
        title: "이전 대화 파악 가능 여부",
      }],
    })}\n`);
    writeJsonl(join(stateDir, "agents", "main", "sessions", "context-session.jsonl"), [
      {
        type: "message",
        timestamp: "2026-07-13T17:35:25.000Z",
        message: {
          role: "user",
          content: "우리가 지금까지 어떤 대화들을 나누었는지 세션 전체에 대해 파악 가능하니?",
        },
      },
      {
        type: "message",
        timestamp: "2026-07-13T17:35:37.000Z",
        message: {
          role: "assistant",
          content: [{
            type: "text",
            text: "지금 하시던 일은 GPAO-T가 세션 기억과 과거 대화 맥락을 얼마나 복원할 수 있는지 테스트하는 것입니다.",
          }],
        },
      },
    ]);

    const index = buildMemorySearchIndex({ stateDir, now: "2026-07-13T17:36:00.000Z" });
    const status = getMemorySearchStatus({ stateDir });
    const result = searchMemory({ stateDir, query: "세션 기억 과거 대화 맥락 복원 테스트", limit: 5 });

    assert.equal(index.counts.sources.agent_session_transcript, 1);
    assert.equal(status.sources.find((source) => source.id === "agent_session_transcript").status, "ready");
    assert.ok(result.results.some((item) => item.source === "agent_session_transcript"));
    assert.ok(result.results.some((item) => item.title === "이전 대화 파악 가능 여부"));
  });
});
