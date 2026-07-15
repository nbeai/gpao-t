import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildMemorySearchIndex } from "../src/core/memory-search.js";
import { buildLlmReadyTaskContextPacket } from "../src/core/llm-ready-task-context-packet.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-llm-memory-search-"));
}

describe("GPAO-T LLM-ready packet memory search", () => {
  it("attaches local memory search results without treating them as admitted anchors", () => {
    const root = tempRoot();
    const runtimeRoot = join(root, ".gpao-t");
    mkdirSync(join(runtimeRoot, "chat"), { recursive: true });
    writeFileSync(join(runtimeRoot, "chat", "preflight-records.jsonl"), `${JSON.stringify({
      id: "preflight.memory.1",
      createdAt: "2026-07-13T00:00:00.000Z",
      messagePreview: "세션 전체 대화 검색은 GPAO-T 기본기입니다.",
      packet: { rawUserUtterance: "세션 전체 대화 검색" },
      labels: { endpoint: "memory search baseline" },
    })}\n`);
    buildMemorySearchIndex({ stateDir: runtimeRoot, now: "2026-07-13T00:00:30.000Z" });

    const packet = buildLlmReadyTaskContextPacket({
      root,
      input: { text: "세션 전체 대화 검색이 가능하니?" },
      now: "2026-07-13T00:01:00.000Z",
    });

    assert.equal(packet.memorySearch.status, "ready");
    assert.ok(packet.memorySearch.results.length >= 1);
    assert.equal(packet.memorySearch.results[0].admissionRole, "search_support_candidate");
    assert.equal(packet.memorySearch.results[0].answerAnchorEligible, false);
    assert.ok(packet.responseContract.forbiddenModes.includes("answer_from_unadmitted_memory"));
    assert.equal(packet.sourceState.memorySearchStatus, "ready");
  });

  it("keeps the packet fast when memory index is missing", () => {
    const root = tempRoot();
    const runtimeRoot = join(root, ".gpao-t");
    mkdirSync(join(runtimeRoot, "chat"), { recursive: true });
    writeFileSync(join(runtimeRoot, "chat", "preflight-records.jsonl"), `${JSON.stringify({
      id: "preflight.memory.no-index",
      createdAt: "2026-07-13T00:02:00.000Z",
      messagePreview: "색인이 없어도 대화 턴은 멈추면 안 됩니다.",
      packet: { rawUserUtterance: "fast lane should not rebuild index" },
    })}\n`);

    const packet = buildLlmReadyTaskContextPacket({
      root,
      input: { text: "색인이 없을 때도 바로 답할 수 있니?" },
      now: "2026-07-13T00:03:00.000Z",
    });

    assert.equal(packet.memorySearch.status, "needs_index");
    assert.equal(packet.memorySearch.results.length, 0);
    assert.equal(packet.memorySearch.findings.includes("memory_search_index_missing"), true);
    assert.equal(packet.sourceState.memorySearchStatus, "needs_index");
  });
});
