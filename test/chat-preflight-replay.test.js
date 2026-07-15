import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  appendAnswerReplayEvaluation,
  appendChatPreflightPacket,
  appendPostAnswerReplayRecord,
  buildAnswerReplayEvaluation,
  buildAnswerReplayMemoryCandidate,
  buildChatPreflightPacket,
  buildPostAnswerReplayRecord,
  readAnswerReplayEvaluations,
  captureMemoryEntry,
  handleGatewayRequest,
  readChatPreflightPackets,
  readPostAnswerReplayRecords,
  verifyChatPreflightReplay,
} from "../src/index.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-chat-preflight-"));
}

function seedOpenClawAbsorptionCandidate(root) {
  return captureMemoryEntry({
    root,
    now: "2026-07-11T06:00:00.000Z",
    title: "OpenClaw absorption",
    body: "OpenClaw is the material body being absorbed into GPAO-T, not the final product goal.",
    tags: ["gpao-t", "openclaw"],
    source: "user",
  });
}

describe("GPAO-T chat preflight and post-answer replay", () => {
  it("builds a non-mutating LLM-ready packet before chat send", () => {
    const root = tempRoot();
    seedOpenClawAbsorptionCandidate(root);

    const record = buildChatPreflightPacket({
      root,
      message: "이어서 OpenClaw 흡수 방향을 기준으로 지파오티 작업 원칙을 확인해줘.",
      sessionKey: "agent:main:main",
      runId: "run.preflight",
      priorFlow: { flowKey: "gpao-t-openclaw", activeTargetId: "openclaw-absorption" },
      now: "2026-07-11T06:01:00.000Z",
    });

    assert.equal(record.schema, "gpao_t.chat_preflight_packet.v0_1");
    assert.equal(record.status, "ready");
    assert.equal(record.packet.activeTarget.id, "openclaw-absorption");
    assert.equal(record.authorityBoundary.mutatesChatMessage, false);
    assert.equal(record.authorityBoundary.blocksChatSend, false);
    assert.equal(record.authorityBoundary.compatibilityMemoryWrite, "blocked");
    assert.equal(record.authorityBoundary.automaticAdmission, "blocked");
  });

  it("records preflight and post-answer evidence without durable memory promotion", () => {
    const root = tempRoot();
    seedOpenClawAbsorptionCandidate(root);

    const preflight = appendChatPreflightPacket({
      root,
      message: "지파오티 작업 흐름을 이어서 정리해줘.",
      sessionKey: "agent:main:main",
      runId: "run.record",
      now: "2026-07-11T06:02:00.000Z",
    });
    const postAnswer = appendPostAnswerReplayRecord({
      root,
      preflightId: preflight.id,
      runId: "run.record",
      sessionKey: "agent:main:main",
      ackStatus: "in_flight",
      answerText: "작업 흐름을 정리했습니다.",
      now: "2026-07-11T06:03:00.000Z",
    });

    assert.equal(readChatPreflightPackets({ root }).length, 1);
    assert.equal(readPostAnswerReplayRecords({ root }).length, 1);
    assert.equal(postAnswer.status, "review_only");
    assert.equal(postAnswer.replayChecks.memoryPromotionSkipped, "blocked");
    assert.equal(postAnswer.authorityBoundary.durableMemoryPromotion, "blocked");
  });

  it("turns captured answer text into review-only replay evaluation and memory candidate", () => {
    const root = tempRoot();
    seedOpenClawAbsorptionCandidate(root);

    const preflight = buildChatPreflightPacket({
      root,
      message: "OpenClaw를 지파오티로 흡수하는 작업 원칙을 유지해줘.",
      sessionKey: "agent:main:main",
      runId: "run.answer",
      priorFlow: { flowKey: "gpao-t-openclaw", activeTargetId: "openclaw-absorption" },
      now: "2026-07-11T06:06:00.000Z",
    });
    const postAnswer = buildPostAnswerReplayRecord({
      root,
      preflightId: preflight.id,
      runId: "run.answer",
      sessionKey: "agent:main:main",
      ackStatus: "completed",
      answerText: "OpenClaw 흡수 방향을 기준으로 지파오티 작업 원칙을 유지합니다.",
      now: "2026-07-11T06:07:00.000Z",
    });
    const evaluation = appendAnswerReplayEvaluation({
      root,
      preflightRecord: preflight,
      postAnswerRecord: postAnswer,
      answerText: postAnswer.answerPreview,
      now: "2026-07-11T06:08:00.000Z",
    });
    const candidate = buildAnswerReplayMemoryCandidate({
      evaluation,
      preflightRecord: preflight,
      postAnswerRecord: postAnswer,
      now: "2026-07-11T06:09:00.000Z",
    });

    assert.equal(evaluation.schema, "gpao_t.chat_answer_replay_evaluation.v0_1");
    assert.equal(evaluation.status, "review_only");
    assert.equal(evaluation.replayChecks.answerTextCaptured, "ready");
    assert.equal(evaluation.replayChecks.memoryPromotionSkipped, "blocked");
    assert.equal(candidate.schema, "gpao_t.memory_review_candidate.v0_1");
    assert.equal(candidate.status, "review_only");
    assert.equal(candidate.authority.applyState, "blocked_until_replay_and_explicit_approval");
    assert.equal(readAnswerReplayEvaluations({ root }).length, 1);
  });

  it("blocks memory candidate admission when answer text is missing", () => {
    const evaluation = buildAnswerReplayEvaluation({
      preflightId: "chat-preflight.missing",
      postAnswerId: "chat-post-answer.missing",
      now: "2026-07-11T06:10:00.000Z",
    });
    const candidate = buildAnswerReplayMemoryCandidate({
      evaluation,
      now: "2026-07-11T06:11:00.000Z",
    });

    assert.equal(evaluation.status, "needs_answer_text");
    assert.equal(evaluation.replayChecks.answerTextCaptured, "blocked");
    assert.equal(candidate.status, "blocked");
    assert.ok(candidate.findings.includes("source_truth_missing"));
  });

  it("recognizes an explicit replay marker even when Korean particles follow it", () => {
    const evaluation = buildAnswerReplayEvaluation({
      preflightRecord: {
        messagePreview: "제품명과 ID-QA-932를 포함해 한 문장으로 답해.",
      },
      answerText: "저는 nBeAI. GPAO-T의 에이전트입니다. ID-QA-932",
      now: "2026-07-14T02:41:10.237Z",
    });

    assert.equal(evaluation.replayChecks.answerKeepsActiveTarget, "review_signal_present");
    assert.deepEqual(evaluation.measurements.explicitMarkers, ["id-qa-932"]);
    assert.equal(evaluation.measurements.explicitMarkerSignalScore, 1);
    assert.equal(evaluation.findings.includes("active_target_signal_missing"), false);
  });

  it("exposes gateway routes for preflight and replay records", () => {
    const root = tempRoot();
    seedOpenClawAbsorptionCandidate(root);

    const preflight = handleGatewayRequest({
      root,
      method: "POST",
      path: "/chat/preflight-record",
      body: {
        message: "이어서 OpenClaw 흡수 방향을 기준으로 지파오티 작업 원칙을 확인해줘.",
        sessionKey: "agent:main:main",
        runId: "run.gateway",
        priorFlow: { flowKey: "gpao-t-openclaw", activeTargetId: "openclaw-absorption" },
        now: "2026-07-11T06:04:00.000Z",
      },
    });
    const replay = handleGatewayRequest({
      root,
      method: "POST",
      path: "/chat/post-answer-replay-record",
      body: {
        preflightId: preflight.body.id,
        sessionKey: "agent:main:main",
        runId: "run.gateway",
        ackStatus: "started",
        now: "2026-07-11T06:05:00.000Z",
      },
    });
    const answerEvaluation = handleGatewayRequest({
      root,
      method: "POST",
      path: "/chat/answer-replay-evaluation-record",
      body: {
        preflightId: preflight.body.id,
        postAnswerId: replay.body.id,
        sessionKey: "agent:main:main",
        runId: "run.gateway",
        answerText: "OpenClaw 흡수 방향을 기준으로 지파오티 작업 원칙을 유지합니다.",
        now: "2026-07-11T06:05:30.000Z",
      },
    });
    const verify = handleGatewayRequest({
      root,
      method: "GET",
      path: "/chat/preflight-replay/verify",
    });

    assert.equal(preflight.status, 200);
    assert.equal(preflight.body.status, "ready");
    assert.equal(replay.status, 200);
    assert.equal(replay.body.status, "review_only");
    assert.equal(answerEvaluation.status, 200);
    assert.equal(answerEvaluation.body.status, "review_only");
    assert.equal(verify.status, 200);
    assert.equal(verify.body.status, "ready");
    assert.equal(existsSync(join(root, ".gpao-t", "chat", "preflight-records.jsonl")), true);
  });

  it("keeps verify invariants ready", () => {
    const root = tempRoot();
    seedOpenClawAbsorptionCandidate(root);

    const result = verifyChatPreflightReplay({ root });

    assert.equal(result.status, "ready");
    assert.equal(result.preflight.authorityBoundary.mutatesChatMessage, false);
    assert.equal(result.preflight.authorityBoundary.blocksChatSend, false);
    assert.equal(result.postAnswer.replayChecks.memoryPromotionSkipped, "blocked");
  });
});
