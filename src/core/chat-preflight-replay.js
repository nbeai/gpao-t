import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  buildLlmReadyPacketSurfaceState,
  buildLlmReadyTaskContextPacket,
} from "./llm-ready-task-context-packet.js";
import { buildMemoryReviewCandidate } from "./memory-candidate-review-queue.js";
import { runtimePaths } from "./storage.js";

const PREFLIGHT_FILE = "chat/preflight-records.jsonl";
const POST_ANSWER_FILE = "chat/post-answer-replay-records.jsonl";
const ANSWER_EVALUATION_FILE = "chat/answer-replay-evaluations.jsonl";

export function chatPreflightPath({ root } = {}) {
  return resolve(runtimePaths({ root }).runtimeRoot, PREFLIGHT_FILE);
}

export function postAnswerReplayPath({ root } = {}) {
  return resolve(runtimePaths({ root }).runtimeRoot, POST_ANSWER_FILE);
}

export function answerReplayEvaluationPath({ root } = {}) {
  return resolve(runtimePaths({ root }).runtimeRoot, ANSWER_EVALUATION_FILE);
}

export function buildChatPreflightPacket({
  root,
  message,
  sessionKey,
  runId,
  agentId,
  priorFlow,
  now = new Date().toISOString(),
} = {}) {
  const text = typeof message === "string" ? message.trim() : "";
  const findings = [];
  if (!text) findings.push("message_missing");
  const packet = text
    ? buildLlmReadyTaskContextPacket({
        root,
        input: { text },
        priorFlow,
        now,
      })
    : null;
  const surface = text
    ? buildLlmReadyPacketSurfaceState({
        root,
        input: { text },
        priorFlow,
        now,
      })
    : null;
  const record = {
    schema: "gpao_t.chat_preflight_packet.v0_1",
    id: `chat-preflight.${Date.parse(now) || 0}.${safeId(runId || sessionKey || "draft")}`,
    status: findings.length ? "blocked" : "ready",
    createdAt: now,
    sessionKey: sessionKey || null,
    runId: runId || null,
    agentId: agentId || null,
    messagePreview: text.slice(0, 220),
    findings,
    packet,
    surface,
    authorityBoundary: buildChatAuthorityBoundary(),
    nextSafeAction: findings.length
      ? "Keep the original chat send path unchanged and skip GPAO-T packet linkage for this empty input."
      : "Send the original user message unchanged; use this packet as pre-answer evidence only.",
  };
  return record;
}

export function appendChatPreflightPacket({
  root,
  message,
  sessionKey,
  runId,
  agentId,
  priorFlow,
  now = new Date().toISOString(),
} = {}) {
  const record = buildChatPreflightPacket({
    root,
    message,
    sessionKey,
    runId,
    agentId,
    priorFlow,
    now,
  });
  appendJsonl(chatPreflightPath({ root }), record);
  return record;
}

export function buildPostAnswerReplayRecord({
  root,
  preflightId,
  runId,
  sessionKey,
  ackStatus,
  answerText,
  now = new Date().toISOString(),
} = {}) {
  const text = typeof answerText === "string" ? answerText.trim() : "";
  const record = {
    schema: "gpao_t.chat_post_answer_replay_record.v0_1",
    id: `chat-post-answer.${Date.parse(now) || 0}.${safeId(runId || preflightId || "unknown")}`,
    status: "review_only",
    createdAt: now,
    preflightId: preflightId || null,
    runId: runId || null,
    sessionKey: sessionKey || null,
    ackStatus: ackStatus || null,
    answerPreview: text.slice(0, 500),
    replayChecks: {
      answerKeepsActiveTarget: "pending_review",
      answerUsesAnchorOnlyWhenAdmitted: "pending_review",
      authorityBoundaryNamedWhenBlocked: "pending_review",
      memoryPromotionSkipped: "blocked",
    },
    authorityBoundary: buildChatAuthorityBoundary(),
    nextSafeAction:
      "Review this post-answer record before turning it into a growth proposal or memory candidate.",
  };
  return record;
}

export function buildAnswerReplayEvaluation({
  root,
  preflightRecord,
  postAnswerRecord,
  preflightId,
  postAnswerId,
  runId,
  sessionKey,
  answerText,
  userExpectation,
  now = new Date().toISOString(),
} = {}) {
  const text = typeof answerText === "string" ? answerText.trim() : "";
  const activeTarget =
    preflightRecord?.packet?.activeTarget ||
    preflightRecord?.surface?.packet?.activeTarget ||
    null;
  const targetText = [
    activeTarget?.id,
    activeTarget?.title,
    preflightRecord?.messagePreview,
    userExpectation,
  ].filter(Boolean).join(" ");
  const targetScore = scoreSignals(text, replayTokens(targetText));
  const findings = [];
  if (!text) findings.push("answer_text_missing");
  if (text && targetText && targetScore <= 0) findings.push("active_target_signal_missing");
  const status = findings.includes("answer_text_missing") ? "needs_answer_text" : "review_only";

  return {
    schema: "gpao_t.chat_answer_replay_evaluation.v0_1",
    id: `chat-answer-eval.${Date.parse(now) || 0}.${safeId(runId || postAnswerId || preflightId || "unknown")}`,
    status,
    createdAt: now,
    preflightId: preflightId || preflightRecord?.id || null,
    postAnswerId: postAnswerId || postAnswerRecord?.id || null,
    runId: runId || postAnswerRecord?.runId || preflightRecord?.runId || null,
    sessionKey: sessionKey || postAnswerRecord?.sessionKey || preflightRecord?.sessionKey || null,
    answerPreview: text.slice(0, 800),
    replayChecks: {
      answerTextCaptured: text ? "ready" : "blocked",
      answerKeepsActiveTarget: targetText ? (targetScore > 0 ? "review_signal_present" : "review_signal_missing") : "pending_review",
      answerUsesAnchorOnlyWhenAdmitted: "pending_review",
      memoryCandidateMayBeDrafted: text ? "review_only_allowed" : "blocked",
      memoryPromotionSkipped: "blocked",
    },
    measurements: {
      activeTargetSignalScore: targetScore,
      answerChars: text.length,
    },
    authorityBoundary: buildChatAuthorityBoundary(),
    findings,
    nextSafeAction: text
      ? "Convert this answer evaluation into a review-only memory candidate only; keep apply and durable memory blocked."
      : "Capture assistant answer text before candidate drafting or replay scoring.",
  };
}

export function appendAnswerReplayEvaluation({
  root,
  preflightRecord,
  postAnswerRecord,
  preflightId,
  postAnswerId,
  runId,
  sessionKey,
  answerText,
  userExpectation,
  now = new Date().toISOString(),
} = {}) {
  const record = buildAnswerReplayEvaluation({
    root,
    preflightRecord,
    postAnswerRecord,
    preflightId,
    postAnswerId,
    runId,
    sessionKey,
    answerText,
    userExpectation,
    now,
  });
  appendJsonl(answerReplayEvaluationPath({ root }), record);
  return record;
}

export function buildAnswerReplayMemoryCandidate({
  evaluation,
  preflightRecord,
  postAnswerRecord,
  request = "GPAO-T chat answer replay review",
  now = new Date().toISOString(),
} = {}) {
  if (!evaluation || evaluation.schema !== "gpao_t.chat_answer_replay_evaluation.v0_1") {
    return buildMemoryReviewCandidate({
      source: { label: "missing chat answer replay evaluation", refs: [], rawExcerpt: "" },
      candidate: {
        title: "Blocked chat answer replay memory candidate",
        operatingPrinciple: "",
        reason: "",
      },
      request,
      now,
    });
  }
  const activeTarget =
    preflightRecord?.packet?.activeTarget ||
    preflightRecord?.surface?.packet?.activeTarget ||
    null;
  const answerPreview = evaluation.answerPreview || postAnswerRecord?.answerPreview || "";
  const canDraft = evaluation.status === "review_only" && Boolean(answerPreview);
  return buildMemoryReviewCandidate({
    source: {
      label: "GPAO-T chat answer replay evaluation",
      refs: canDraft ? [
        evaluation.id,
        evaluation.preflightId,
        evaluation.postAnswerId,
        preflightRecord?.id,
        postAnswerRecord?.id,
      ].filter(Boolean) : [],
      rawExcerpt: canDraft ? answerPreview : "",
    },
    candidate: {
      title: `Chat replay learning for ${activeTarget?.id || evaluation.sessionKey || "GPAO-T chat"}`,
      operatingPrinciple: canDraft
        ? "A chat answer may become GPAO-T growth material only after its original answer text is captured, replayed, and kept as review-only evidence before any memory apply gate."
        : "",
      reason: canDraft
        ? "The answer text exists and can be evaluated as local replay evidence without changing inherited runtime memory, session metadata, or durable GPAO-T memory."
        : "",
      expectedBenefit:
        "Keeps GPAO-T context growth grounded in raw answer evidence while preventing hidden memory promotion.",
      anchor: activeTarget?.id || "chat-answer-replay",
      invalidConditions: [
        "assistant_answer_text_missing",
        "source_preflight_record_missing",
        "read_only_replay_not_run",
        "explicit_apply_gate_not_approved",
      ],
    },
    request,
    now,
  });
}

export function appendPostAnswerReplayRecord({
  root,
  preflightId,
  runId,
  sessionKey,
  ackStatus,
  answerText,
  now = new Date().toISOString(),
} = {}) {
  const record = buildPostAnswerReplayRecord({
    root,
    preflightId,
    runId,
    sessionKey,
    ackStatus,
    answerText,
    now,
  });
  appendJsonl(postAnswerReplayPath({ root }), record);
  return record;
}

export function readChatPreflightPackets({ root, limit = 50 } = {}) {
  return readJsonl(chatPreflightPath({ root }), limit);
}

export function readPostAnswerReplayRecords({ root, limit = 50 } = {}) {
  return readJsonl(postAnswerReplayPath({ root }), limit);
}

export function readAnswerReplayEvaluations({ root, limit = 50 } = {}) {
  return readJsonl(answerReplayEvaluationPath({ root }), limit);
}

export function verifyChatPreflightReplay({ root } = {}) {
  const preflight = buildChatPreflightPacket({
    root,
    message: "이어서 OpenClaw 흡수 방향을 기준으로 지파오티 작업 원칙을 확인해줘.",
    sessionKey: "agent:main:main",
    runId: "run.verify",
    priorFlow: { flowKey: "gpao-t-openclaw", activeTargetId: "openclaw-absorption" },
    now: "2026-07-11T06:00:00.000Z",
  });
  const postAnswer = buildPostAnswerReplayRecord({
    root,
    preflightId: preflight.id,
    runId: "run.verify",
    sessionKey: "agent:main:main",
    ackStatus: "in_flight",
    now: "2026-07-11T06:01:00.000Z",
  });
  const evaluation = buildAnswerReplayEvaluation({
    root,
    preflightRecord: preflight,
    postAnswerRecord: postAnswer,
    answerText: "OpenClaw 흡수 방향을 기준으로 지파오티 작업 원칙을 유지합니다.",
    now: "2026-07-11T06:02:00.000Z",
  });
  const memoryCandidate = buildAnswerReplayMemoryCandidate({
    evaluation,
    preflightRecord: preflight,
    postAnswerRecord: postAnswer,
    now: "2026-07-11T06:03:00.000Z",
  });
  const findings = [];
  if (preflight.schema !== "gpao_t.chat_preflight_packet.v0_1") findings.push("invalid_preflight_schema");
  if (preflight.status !== "ready") findings.push("preflight_not_ready");
  if (preflight.packet?.authorityBoundary?.compatibilityMemoryWrite !== "blocked") {
    findings.push("openclaw_memory_write_open");
  }
  if (preflight.authorityBoundary?.mutatesChatMessage !== false) findings.push("chat_message_mutation_open");
  if (postAnswer.replayChecks.memoryPromotionSkipped !== "blocked") {
    findings.push("memory_promotion_not_blocked");
  }
  if (evaluation.replayChecks.memoryPromotionSkipped !== "blocked") {
    findings.push("evaluation_memory_promotion_not_blocked");
  }
  if (memoryCandidate.status !== "review_only") {
    findings.push("answer_memory_candidate_not_review_only");
  }
  return {
    schema: "gpao_t.chat_preflight_replay_verification.v0_1",
    status: findings.length ? "review" : "ready",
    findings,
    preflight,
    postAnswer,
    evaluation,
    memoryCandidate,
    nextSafeAction: findings.length
      ? "Repair chat preflight/replay invariants before wiring into OpenClaw chat send."
      : "Wire preflight as a non-blocking step before chat.send; keep post-answer replay and memory candidates review-only.",
  };
}

function buildChatAuthorityBoundary() {
  return {
    mutatesChatMessage: false,
    blocksChatSend: false,
    compatibilityMemoryWrite: "blocked",
    durableMemoryPromotion: "blocked",
    sessionMetaWrite: "blocked",
    connectorWrite: "blocked",
    externalSend: "blocked",
    automaticAdmission: "blocked",
  };
}

function appendJsonl(file, record) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(record)}\n`, { flag: "a" });
}

function readJsonl(file, limit) {
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => JSON.parse(line));
}

function replayTokens(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^0-9a-z가-힣_-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 24);
}

function scoreSignals(text, tokens) {
  if (!text || !tokens?.length) return 0;
  const haystack = text.toLowerCase();
  const hits = tokens.filter((token) => haystack.includes(token.toLowerCase())).length;
  return Number((hits / tokens.length).toFixed(3));
}

function safeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_.:-]+/g, "-").slice(0, 120) || "unknown";
}
