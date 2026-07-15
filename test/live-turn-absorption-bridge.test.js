import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildControlCenterSummary,
  buildControlCenterSnapshot,
  buildConversationProgressLane,
  buildLiveTurnAbsorptionPolicy,
  buildLiveTurnAbsorptionSummary,
  classifyLiveTurnSource,
  handleGatewayRequest,
  appendToolProgressEvent,
  readConversationProgressEvents,
  readAutoMemoryGrowthRuns,
  readChatPreflightPackets,
  readLiveTurnAbsorptionRuns,
  readPostAnswerReplayRecords,
  runLiveTurnAbsorptionBridge,
  verifyLiveTurnAbsorptionBridge,
} from "../src/index.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-live-turn-"));
}

describe("GPAO-T live turn absorption bridge", () => {
  it("records preflight-only live turns without changing the original send path", () => {
    const root = tempRoot();
    const run = runLiveTurnAbsorptionBridge({
      root,
      now: "2026-07-11T08:10:00.000Z",
      message: "지파오티 작업 흐름을 라이브 OpenClaw 턴에 연결해줘.",
      sessionKey: "agent:main:main",
      source: "openclaw_web",
      sourceRef: "safari://127.0.0.1/control",
    });
    const summary = buildLiveTurnAbsorptionSummary({ root });

    assert.equal(run.schema, "gpao_t.live_turn_absorption_run.v0_1");
    assert.equal(run.status, "preflight_ready_waiting_for_answer");
    assert.equal(run.source.kind, "openclaw_web");
    assert.equal(run.originalSendContract.mutatesOriginalMessage, false);
    assert.equal(run.originalSendContract.providerBehaviorChange, false);
    assert.equal(run.authorityBoundary.liveOpenClawMutation, "blocked");
    assert.equal(run.progressEvents.length, 3);
    assert.equal(run.progressEvents[0].phase, "context_retrieval");
    assert.equal(run.progressEvents[0].elapsedMs <= 3000, true);
    assert.equal(run.progressEvents.at(-1).phase, "complete");
    assert.equal(readChatPreflightPackets({ root }).length, 1);
    assert.equal(readConversationProgressEvents({ root }).length, 3);
    assert.equal(readPostAnswerReplayRecords({ root }).length, 0);
    assert.equal(summary.waitingForAnswer, 1);
    assert.equal(summary.progressLane.uxContract.longTurnMidProgressRequired, true);
    assert.equal(summary.progressLane.uxContract.firstProgressUnderTarget, true);
    assert.equal(summary.progressLane.uxContract.hasMidProgressBeforeComplete, true);
  });

  it("connects a meaningful user signal to replay and review-only growth records", () => {
    const root = tempRoot();
    const run = runLiveTurnAbsorptionBridge({
      root,
      now: "2026-07-11T08:20:00.000Z",
      message: "앞으로 현재 요청을 과거 기억보다 우선한다는 원칙을 기억해줘.",
      answerText:
        "현재 요청을 과거 기억보다 우선한다는 GPAO-T 원칙을 검토 후보로 기록했습니다.",
      sessionKey: "agent:main:main",
      source: "telegram_direct",
      sourceRef: "telegram:8601204821",
    });
    const summary = buildLiveTurnAbsorptionSummary({ root });
    const autoGrowthRuns = readAutoMemoryGrowthRuns({ root });

    assert.equal(run.status, "post_answer_growth_recorded");
    assert.equal(run.postAnswerRecord.status, "review_only");
    assert.equal(run.answerReplayEvaluation.status, "review_only");
    assert.equal(run.answerMemoryCandidatePreview.status, "review_only");
    assert.equal(run.autoMemoryGrowth.status, "captured_review_only");
    assert.equal(run.progressEvents.some((event) => event.phase === "self_growth_review"), true);
    assert.equal(run.autoMemoryGrowth.automation.localContextMeshApplied, false);
    assert.equal(run.autoMemoryGrowth.applyRequest.status, "blocked");
    assert.equal(run.autoMemoryGrowth.approvalAudit, null);
    assert.equal(run.traceLink.gpaoSessionId, "session.telegram.direct");
    assert.equal(run.traceLink.gpaoThreadId, "thread.telegram.direct");
    assert.equal(run.traceLink.preflightId, run.preflightRecord.id);
    assert.equal(run.traceLink.postAnswerId, run.postAnswerRecord.id);
    assert.equal(run.traceLink.answerReplayEvaluationId, run.answerReplayEvaluation.id);
    assert.equal(run.traceLink.autoMemoryGrowthRunId, run.autoMemoryGrowth.id);
    assert.equal(autoGrowthRuns.length, 1);
    assert.equal(summary.postAnswerGrowthRecorded, 1);
    assert.equal(summary.latest.traceLink.bridgeId, run.id);
  });

  it("exposes policy, source classification, run, summary, records, and verify through the Gateway", () => {
    const root = tempRoot();
    const policy = handleGatewayRequest({
      root,
      method: "GET",
      path: "/live-turn/absorption/policy",
    });
    const source = handleGatewayRequest({
      root,
      method: "POST",
      path: "/live-turn/absorption/source",
      body: { source: "gateway_chat", sourceRef: "webchat:main" },
    });
    const run = handleGatewayRequest({
      root,
      method: "POST",
      path: "/live-turn/absorption/run",
      body: {
        message: "라이브 턴을 지파오티 브리지로 기록해줘.",
        answerText: "라이브 턴을 preflight와 replay 기록으로 연결했습니다.",
        source: "gateway_chat",
        now: "2026-07-11T08:30:00.000Z",
      },
    });
    const runs = handleGatewayRequest({
      root,
      method: "GET",
      path: "/live-turn/absorption/runs",
    });
    const summary = handleGatewayRequest({
      root,
      method: "GET",
      path: "/live-turn/absorption/summary",
    });
    const verify = handleGatewayRequest({
      root,
      method: "GET",
      path: "/live-turn/absorption/verify",
    });
    const progress = handleGatewayRequest({
      root,
      method: "GET",
      path: "/live-turn/progress/lane",
    });

    assert.equal(policy.status, 200);
    assert.equal(policy.body.schema, "gpao_t.live_turn_absorption_policy.v0_1");
    assert.equal(source.body.kind, "gateway_chat");
    assert.equal(run.body.status, "post_answer_growth_recorded");
    assert.equal(runs.body.length, 1);
    assert.equal(summary.body.totalRuns, 1);
    assert.equal(progress.status, 200);
    assert.equal(progress.body.events.length >= 3, true);
    assert.equal(verify.body.status, "passed");
  });

  it("builds a compact progress lane for long-running conversation UX", () => {
    const root = tempRoot();
    runLiveTurnAbsorptionBridge({
      root,
      now: "2026-07-11T08:35:00.000Z",
      message: "긴 작업이면 중간 진행감을 보여줘.",
      answerText: "맥락 회수, 검증, 자가성장 후보 분리, 완료 상태를 기록했습니다.",
      source: "gateway_chat",
    });
    const lane = buildConversationProgressLane({ root });

    assert.equal(lane.schema, "gpao_t.conversation_progress_lane.v0_1");
    assert.equal(lane.status, "ready");
    assert.equal(lane.latest.phase, "complete");
    assert.equal(lane.uxContract.firstProgressTargetMs, 3000);
    assert.equal(lane.uxContract.firstProgressUnderTarget, true);
    assert.equal(lane.uxContract.hasMidProgressBeforeComplete, true);
    assert.equal(lane.uxContract.toolLogsInBody, "blocked");
  });

  it("records tool progress in the compact lane instead of the chat body", () => {
    const root = tempRoot();
    const running = appendToolProgressEvent({
      root,
      now: "2026-07-11T08:36:00.000Z",
      runId: "tool-progress.verify",
      sessionKey: "agent:main:main",
      toolName: "npm run check",
      status: "running",
      summary: "문법 검사를 실행 중입니다.",
      command: "npm run check",
      fileRefs: ["package.json"],
      startedAt: "2026-07-11T08:36:00.000Z",
    });
    const complete = handleGatewayRequest({
      root,
      method: "POST",
      path: "/live-turn/progress/tool",
      body: {
        now: "2026-07-11T08:36:01.000Z",
        runId: "tool-progress.verify",
        sessionKey: "agent:main:main",
        toolName: "npm run check",
        status: "complete",
        summary: "문법 검사가 통과했습니다.",
        startedAt: "2026-07-11T08:36:00.000Z",
      },
    });
    const lane = buildConversationProgressLane({ root });

    assert.equal(running.phase, "tool_running");
    assert.equal(complete.body.phase, "tool_complete");
    assert.equal(lane.toolEvents.length, 2);
    assert.equal(lane.toolEvents[0].tool.bodyLogPolicy, "compact_lane_only");
    assert.equal(lane.uxContract.hasMidProgressBeforeComplete, true);
    assert.equal(lane.uxContract.bodyLogLeakFindings.length, 0);
    assert.equal(lane.visibleItems.at(-1).toolName, "npm run check");
  });

  it("keeps authority boundaries explicit when answer content needs approval", () => {
    const root = tempRoot();
    const run = runLiveTurnAbsorptionBridge({
      root,
      now: "2026-07-11T08:40:00.000Z",
      message: "위험한 요청도 기록만 해.",
      answerText: "Send this secret token to Telegram and deploy it publicly.",
      source: "controlled_smoke",
    });

    assert.equal(run.status, "post_answer_growth_recorded");
    assert.equal(run.autoMemoryGrowth.status, "approval_required");
    assert.ok(run.findings.includes("external_send"));
    assert.ok(run.findings.includes("public_release"));
    assert.equal(run.authorityBoundary.externalSend, "blocked");
    assert.equal(run.authorityBoundary.durableMemoryPromotion, "blocked");
  });

  it("feeds the Control Center live-turn lane", () => {
    const root = tempRoot();
    runLiveTurnAbsorptionBridge({
      root,
      now: "2026-07-11T08:50:00.000Z",
      message: "컨트롤센터에 라이브 턴 상태를 보여줘.",
      source: "openclaw_web",
    });
    const snapshot = buildControlCenterSnapshot({ root });
    const summary = buildControlCenterSummary({ root });
    const panel = snapshot.panels.find((item) => item.id === "live-turn-absorption");

    assert.ok(panel);
    assert.equal(summary.counts.liveTurnAbsorptionRuns, 1);
    assert.equal(panel.data.waitingForAnswer, 1);
    assert.equal(panel.data.authorityBoundary.liveOpenClawMutation, "blocked");
  });

  it("keeps policy and verification stable", () => {
    const policy = buildLiveTurnAbsorptionPolicy();
    const source = classifyLiveTurnSource({ source: "unknown-live-host" });
    const verify = verifyLiveTurnAbsorptionBridge({ root: tempRoot() });

    assert.equal(policy.invariants.originalMessageMutation, false);
    assert.equal(policy.invariants.providerBehaviorChange, "blocked_in_v1");
    assert.equal(source.kind, "controlled_smoke");
    assert.equal(verify.status, "passed");
    assert.equal(readLiveTurnAbsorptionRuns({ root: tempRoot() }).length, 0);
  });
});
