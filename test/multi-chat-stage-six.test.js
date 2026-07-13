import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { mkdtempSync } from "node:fs";
import { describe, it } from "node:test";
import {
  applySessionWorkspaceAction,
  buildMultiChatStageSixCompletion,
  buildThreadScopedMemoryReviewQueue,
  handleGatewayRequest,
  memoryReviewQueuePath,
  readSessionWorkspaceState,
  verifyMultiChatStageSixCompletion,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-stage-six-"));
}

function seedThreadScopedQueue({ root, activeThreadId, activeSessionId, foreignThreadId }) {
  const file = memoryReviewQueuePath({ root });
  mkdirSync(dirname(file), { recursive: true });
  const records = [
    {
      schema: "gpao_t.memory_review_candidate.v0_1",
      recordType: "memory_candidate",
      id: "memq.active-thread",
      status: "review_only",
      threadId: activeThreadId,
      sessionId: activeSessionId,
      sourceTruth: {
        label: "active thread source",
        refs: ["session.active"],
        rawExcerpt: "현재 thread에서 나온 후보",
      },
      candidate: {
        title: "active thread 기억 후보",
        operatingPrinciple: "현재 thread 안에서만 anchor로 쓴다.",
        reason: "다른 대화창과 섞이면 안 된다.",
      },
      authority: {
        blockedUse: ["durable_memory_promotion", "openclaw_memory_write", "automatic_admission"],
      },
      applyGate: { status: "blocked" },
    },
    {
      schema: "gpao_t.memory_review_candidate.v0_1",
      recordType: "memory_candidate",
      id: "memq.foreign-thread",
      status: "review_only",
      threadId: foreignThreadId,
      sessionId: "session.foreign",
      sourceTruth: {
        label: "foreign thread source",
        refs: ["session.foreign"],
        rawExcerpt: "다른 thread에서 나온 후보",
      },
      candidate: {
        title: "foreign thread 기억 후보",
        operatingPrinciple: "다른 thread 후보다.",
        reason: "active thread에서는 제외되어야 한다.",
      },
      authority: {
        blockedUse: ["durable_memory_promotion", "openclaw_memory_write", "automatic_admission"],
      },
      applyGate: { status: "blocked" },
    },
  ];
  writeFileSync(file, `${records.map((record) => JSON.stringify(record)).join("\n")}\n`);
}

describe("GPAO-T multi-chat fixed stages 1-6", () => {
  it("builds a ready stage 1-6 completion package without opening authority boundaries", () => {
    const root = tempRoot();
    applySessionWorkspaceAction({
      root,
      action: "new_session",
      title: "현재 작업 세션",
      request: "active thread 맥락으로 답해줘",
      now: "2026-07-11T08:00:00.000Z",
    });
    applySessionWorkspaceAction({
      root,
      action: "new_session",
      title: "다른 작업 세션",
      request: "이건 섞이면 안 되는 세션",
      now: "2026-07-11T08:01:00.000Z",
    });
    const state = readSessionWorkspaceState({ root, now: "2026-07-11T08:02:00.000Z" });
    const active = state.sessions.find((session) => session.id === state.activeSessionId);
    const foreign = state.sessions.find((session) => session.id !== state.activeSessionId);
    seedThreadScopedQueue({
      root,
      activeThreadId: active.threadId,
      activeSessionId: active.sessionId,
      foreignThreadId: foreign.threadId,
    });

    const completion = buildMultiChatStageSixCompletion({ root, now: "2026-07-11T08:03:00.000Z" });
    const check = verifyMultiChatStageSixCompletion({ root, completion });

    assert.equal(completion.status, "ready");
    assert.equal(completion.progress.completedStageCount, 6);
    assert.equal(completion.progress.percent, 100);
    assert.deepEqual(completion.progress.remainingFixedStages, ["Test-team dispatch/update packet refresh"]);
    assert.equal(check.status, "ready");
    assert.equal(completion.authorityBoundaries.durableMemoryPromotion, "blocked");
    assert.equal(completion.authorityBoundaries.compatibilityMemoryWrite, "blocked");
    assert.equal(completion.authorityBoundaries.externalSend, "blocked");
    assert.equal(completion.authorityBoundaries.liveOpenClawMutation, "not_executed");
  });

  it("filters memory review records by active thread/session and excludes foreign thread anchors", () => {
    const root = tempRoot();
    applySessionWorkspaceAction({
      root,
      action: "new_session",
      title: "메모리 격리 세션",
      now: "2026-07-11T08:10:00.000Z",
    });
    const state = readSessionWorkspaceState({ root, now: "2026-07-11T08:11:00.000Z" });
    const active = state.sessions.find((session) => session.id === state.activeSessionId);
    seedThreadScopedQueue({
      root,
      activeThreadId: active.threadId,
      activeSessionId: active.sessionId,
      foreignThreadId: "thread.foreign.scope",
    });

    const queue = buildThreadScopedMemoryReviewQueue({ root });
    assert.equal(queue.status, "ready");
    assert.equal(queue.counts.scopedCandidates, 1);
    assert.equal(queue.records[0].id, "memq.active-thread");
    assert.equal(queue.isolationPolicy.foreignThreadCandidates, "excluded_from_anchor");
    assert.equal(queue.isolationPolicy.durablePromotion, "blocked");
    assert.equal(queue.isolationPolicy.compatibilityMemoryWrite, "blocked");
  });

  it("exposes stage 1-6 completion through Gateway and CLI", () => {
    const root = tempRoot();
    applySessionWorkspaceAction({
      root,
      action: "new_session",
      title: "Gateway stage check",
      now: "2026-07-11T08:20:00.000Z",
    });
    const state = readSessionWorkspaceState({ root, now: "2026-07-11T08:21:00.000Z" });
    const active = state.sessions.find((session) => session.id === state.activeSessionId);
    seedThreadScopedQueue({
      root,
      activeThreadId: active.threadId,
      activeSessionId: active.sessionId,
      foreignThreadId: "thread.other.gateway",
    });

    const gateway = handleGatewayRequest({ root, method: "GET", path: "/multi-chat-workspace/stages-1-6" });
    const gatewayCheck = handleGatewayRequest({ root, method: "GET", path: "/multi-chat-workspace/stages-1-6/verify" });
    assert.equal(gateway.status, 200);
    assert.equal(gateway.body.status, "ready");
    assert.equal(gatewayCheck.body.status, "ready");

    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "multi-chat-stages-1-6-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    assert.equal(cliCheck.status, "ready");
  });
});
