import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  appendAnswerReplayEvaluation,
  appendChatPreflightPacket,
  appendPostAnswerReplayRecord,
  buildAnswerReplayEvaluation,
  buildAnswerReplayMemoryCandidate,
  buildChatPreflightPacket,
  buildPostAnswerReplayRecord,
} from "./chat-preflight-replay.js";
import { runAutoMemoryGrowthLoop } from "./auto-memory-growth-loop.js";
import { appendAuditEvent, runtimePaths } from "./storage.js";
import { buildLiveTurnIdentityMap } from "./live-turn-identity-mapping.js";

const LIVE_TURN_FILE = "live-turn/absorption-runs.jsonl";
const LIVE_TURN_PROGRESS_FILE = "live-turn/progress-events.jsonl";

export function liveTurnAbsorptionBridgePath({ root } = {}) {
  return resolve(runtimePaths({ root }).runtimeRoot, LIVE_TURN_FILE);
}

export function liveTurnProgressPath({ root } = {}) {
  return resolve(runtimePaths({ root }).runtimeRoot, LIVE_TURN_PROGRESS_FILE);
}

export function buildLiveTurnAbsorptionPolicy() {
  return {
    schema: "gpao_t.live_turn_absorption_policy.v0_1",
    status: "ready",
    mode: "local_bridge_before_live_mutation",
    absorbs: [
      "openclaw_web_session_turn",
      "telegram_direct_turn",
      "gateway_chat_turn",
      "controlled_smoke_turn",
    ],
    requiredTrace: [
      "bridge_id",
      "run_id",
      "session_key",
      "source_kind",
      "source_proof_ref_for_live_sources",
      "preflight_id",
      "post_answer_id_when_answer_exists",
      "answer_replay_evaluation_id_when_answer_exists",
      "auto_memory_growth_run_id_when_safe",
    ],
    invariants: {
      originalMessageMutation: false,
      providerBehaviorChange: "blocked_in_v1",
      liveOpenClawMutation: "blocked_in_v1",
      telegramExternalSend: "blocked_in_v1",
      durableMemoryPromotion: "blocked_in_v1",
      compatibilityMemoryWrite: "blocked_in_v1",
      localTraceWrite: "allowed",
      postAnswerReplay: "required_when_answer_text_exists",
      autoGrowth: "local_only_and_authority_classified",
    },
    nextSafeAction:
      "Use this bridge as the local evidence path before wiring any real OpenClaw or Telegram send hook.",
  };
}

export function classifyLiveTurnSource({ source, sourceRef } = {}) {
  const kind = typeof source === "string" ? source : source?.kind;
  const normalized = safeId(kind || "controlled_smoke");
  const known = new Set([
    "openclaw_web",
    "telegram_direct",
    "gateway_chat",
    "controlled_smoke",
  ]);
  const proofRef = sourceRef || source?.sourceRef || source?.ref || null;
  const proof = classifyLiveSourceProof({ kind: normalized, proofRef });
  return {
    schema: "gpao_t.live_turn_source_classification.v0_1",
    kind: proof.liveProofRequired && !proof.liveProofAccepted
      ? "controlled_smoke"
      : known.has(normalized) ? normalized : "controlled_smoke",
    originalKind: kind || null,
    sourceRef: proofRef,
    sourceProof: proof,
    channel: source?.channel || inferChannel(normalized),
    status: proof.liveProofRequired && !proof.liveProofAccepted
      ? "downgraded_to_controlled_smoke_missing_live_source_proof"
      : known.has(normalized) ? "recognized" : "normalized_to_controlled_smoke",
  };
}

export function classifyLiveSourceProof({ kind, proofRef } = {}) {
  const liveProofRequired = kind === "openclaw_web" || kind === "telegram_direct";
  const ref = String(proofRef || "").trim();
  const liveProofAccepted = !liveProofRequired || (
    kind === "openclaw_web"
      ? /^(openclaw|gateway|safari|http|https):\/\//i.test(ref) || /^openclaw:/i.test(ref)
      : /^telegram:(update|direct|chat|user|8601204821)/i.test(ref)
  );
  return {
    schema: "gpao_t.live_source_proof.v0_1",
    liveProofRequired,
    liveProofAccepted,
    proofRef: ref || null,
    finding: liveProofRequired && !liveProofAccepted
      ? "live_source_proof_missing_or_unaccepted"
      : null,
  };
}

export function runLiveTurnAbsorptionBridge({
  root,
  message = "",
  answerText = "",
  sessionKey = "agent:main:main",
  runId,
  agentId = "assistant",
  source = "controlled_smoke",
  sourceRef,
  sourceIdentity,
  priorFlow,
  ackStatus = "original_send_preserved",
  userExpectation,
  now = new Date().toISOString(),
} = {}) {
  const text = String(message || "").trim();
  const answer = String(answerText || "").trim();
  const sourceClassification = classifyLiveTurnSource({ source, sourceRef });
  const identityMap = buildLiveTurnIdentityMap({
    sourceKind: sourceClassification.kind,
    agentId,
    sessionKey,
    sourceIdentity,
  });
  const stableRunId =
    runId || `live-turn.${Date.parse(now) || 0}.${safeId(sessionKey || sourceClassification.kind)}`;
  const bridgeId = `live-bridge.${Date.parse(now) || 0}.${safeId(stableRunId)}`;
  const policy = buildLiveTurnAbsorptionPolicy();
  const base = {
    schema: "gpao_t.live_turn_absorption_run.v0_1",
    id: bridgeId,
    createdAt: now,
    runId: stableRunId,
    sessionKey,
    agentId,
    source: sourceClassification,
    policy,
    sourceProof: sourceClassification.sourceProof,
    identityMap,
    originalSendContract: buildOriginalSendContract({ message: text, source: sourceClassification }),
  };
  const progressBase = {
    root,
    runId: stableRunId,
    sessionKey,
    sourceKind: sourceClassification.kind,
    startedAt: now,
    now,
  };
  const progressEvents = [
    appendConversationProgressEvent({
      ...progressBase,
      phase: "context_retrieval",
      label: "맥락 회수 중",
      detail: "원본 메시지, 세션 정체성, live source proof를 대조합니다.",
    }),
  ];

  if (!text) {
    progressEvents.push(appendConversationProgressEvent({
      ...progressBase,
      phase: "blocked",
      label: "입력 확인 필요",
      detail: "원본 사용자 메시지가 없어 live turn 흡수를 중단했습니다.",
    }));
    return appendLiveTurnAbsorptionRun({
      root,
      record: {
        ...base,
        status: "blocked",
        findings: ["message_missing"],
        traceLink: buildTraceLink({
          bridgeId,
          runId: stableRunId,
          sessionKey,
          source: sourceClassification,
          identityMap,
        }),
        nextSafeAction: "Capture the original user message before live turn absorption.",
        progressEvents,
      },
    });
  }

  const preflightRecord = appendChatPreflightPacket({
    root,
    message: text,
    sessionKey,
    runId: stableRunId,
    agentId,
    priorFlow,
    now,
  });
  progressEvents.push(appendConversationProgressEvent({
    ...progressBase,
    phase: answer ? "verifying" : "drafting",
    label: answer ? "답변 검증 중" : "답변 대기 중",
    detail: answer
      ? "답변을 replay, memory candidate, local growth gate로 검증합니다."
      : "원본 전송 경로는 유지하고 answer capture를 기다립니다.",
  }));
  let postAnswerRecord = null;
  let answerReplayEvaluation = null;
  let answerMemoryCandidatePreview = null;
  let autoMemoryGrowth = null;

  if (answer) {
    postAnswerRecord = appendPostAnswerReplayRecord({
      root,
      preflightId: preflightRecord.id,
      runId: stableRunId,
      sessionKey,
      ackStatus,
      answerText: answer,
      now,
    });
    answerReplayEvaluation = appendAnswerReplayEvaluation({
      root,
      preflightRecord,
      postAnswerRecord,
      answerText: answer,
      userExpectation,
      now,
    });
    answerMemoryCandidatePreview = buildAnswerReplayMemoryCandidate({
      evaluation: answerReplayEvaluation,
      preflightRecord,
      postAnswerRecord,
      request: `Live turn absorption replay: ${text}`,
      now,
    });
    autoMemoryGrowth = runAutoMemoryGrowthLoop({
      root,
      now,
      text: buildGrowthText({ message: text, answer }),
      growthSignalText: text,
      request: `Live turn absorption post-answer growth: ${text}`,
      source: {
        kind: `live_turn_${sourceClassification.kind}`,
        refs: [
          bridgeId,
          stableRunId,
          preflightRecord.id,
          postAnswerRecord.id,
          answerReplayEvaluation.id,
        ],
        label: "GPAO-T live turn replay evidence",
        rawExcerpt: answer.slice(0, 1000),
      },
    });
    progressEvents.push(appendConversationProgressEvent({
      ...progressBase,
      phase: "self_growth_review",
      label: "자가성장 후보 검토 중",
      detail: "답변 품질 변화 후보를 review-only 성장 루프로 분리합니다.",
    }));
  }

  const auditEvent = appendAuditEvent({
    type: "live_turn_absorption.recorded",
    summary: "GPAO-T live turn absorption bridge recorded local trace evidence.",
    authority: "local_only",
    payload: {
      bridgeId,
      runId: stableRunId,
      sessionKey,
        sourceKind: sourceClassification.kind,
        gpaoSessionId: identityMap.gpao?.sessionId || null,
        gpaoThreadId: identityMap.gpao?.threadId || null,
        preflightId: preflightRecord.id,
      postAnswerId: postAnswerRecord?.id || null,
      answerReplayEvaluationId: answerReplayEvaluation?.id || null,
      autoMemoryGrowthRunId: autoMemoryGrowth?.id || null,
    },
  }, { root, now });

  return appendLiveTurnAbsorptionRun({
    root,
    record: {
      ...base,
      status: answer ? "post_answer_growth_recorded" : "preflight_ready_waiting_for_answer",
      preflightRecord,
      postAnswerRecord,
      answerReplayEvaluation,
      answerMemoryCandidatePreview,
      autoMemoryGrowth,
      auditEvent,
      traceLink: buildTraceLink({
        bridgeId,
        runId: stableRunId,
        sessionKey,
        source: sourceClassification,
        identityMap,
        preflightRecord,
        postAnswerRecord,
        answerReplayEvaluation,
        autoMemoryGrowth,
      }),
      authorityBoundary: buildLiveTurnAuthorityBoundary(),
      findings: collectFindings({ preflightRecord, postAnswerRecord, answerReplayEvaluation, autoMemoryGrowth }),
      progressEvents: [
        ...progressEvents,
        appendConversationProgressEvent({
          ...progressBase,
          phase: "complete",
          label: answer ? "답변 경로 기록 완료" : "사전 점검 완료",
          detail: answer
            ? "preflight, post-answer replay, local growth trace가 기록되었습니다."
            : "preflight trace가 준비되었고 answer capture를 기다립니다.",
        }),
      ],
      nextSafeAction: answer
        ? "Review Control Center live-turn lane, then wire the same bridge around the actual OpenClaw/Telegram answer path."
        : "Keep original send path unchanged and call the bridge again with answerText after the assistant answer is captured.",
    },
  });
}

export function appendConversationProgressEvent({
  root,
  runId,
  sessionKey = "agent:main:main",
  sourceKind = "controlled_smoke",
  phase,
  label,
  detail = "",
  tool,
  startedAt,
  elapsedMs,
  now = new Date().toISOString(),
} = {}) {
  const computedElapsedMs = Number.isFinite(elapsedMs)
    ? elapsedMs
    : Number.isFinite(Date.parse(startedAt)) && Number.isFinite(Date.parse(now))
    ? Math.max(0, Date.parse(now) - Date.parse(startedAt))
    : null;
  const event = {
    schema: "gpao_t.conversation_progress.v1",
    id: `progress.${Date.parse(now) || Date.now()}.${safeId(runId || sessionKey)}.${safeId(phase || "event")}`,
    createdAt: now,
    runId: runId || null,
    sessionKey,
    sourceKind,
    phase: phase || "working",
    label: label || "진행 중",
    detail,
    tool: tool || null,
    elapsedMs: computedElapsedMs,
    display: {
      surface: "compact_lane",
      bodyNoise: "blocked",
      expandableTrace: "available",
    },
  };
  const file = liveTurnProgressPath({ root });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(event)}\n`, { flag: "a" });
  return event;
}

export function appendToolProgressEvent({
  root,
  runId,
  sessionKey = "agent:main:main",
  sourceKind = "controlled_smoke",
  toolName,
  status = "running",
  summary,
  command,
  fileRefs = [],
  startedAt,
  elapsedMs,
  now = new Date().toISOString(),
} = {}) {
  const normalizedStatus = new Set(["running", "complete", "error", "blocked"]).has(status)
    ? status
    : "running";
  const phase = {
    running: "tool_running",
    complete: "tool_complete",
    error: "tool_error",
    blocked: "tool_blocked",
  }[normalizedStatus];
  const label = {
    running: "도구 실행 중",
    complete: "도구 실행 완료",
    error: "도구 오류",
    blocked: "도구 실행 대기",
  }[normalizedStatus];
  return appendConversationProgressEvent({
    root,
    runId,
    sessionKey,
    sourceKind,
    phase,
    label,
    detail: summary || `${toolName || "tool"} ${normalizedStatus}`,
    startedAt,
    elapsedMs,
    tool: {
      name: toolName || "tool",
      status: normalizedStatus,
      command: command || null,
      fileRefs: Array.isArray(fileRefs) ? fileRefs.slice(0, 12) : [],
      bodyLogPolicy: "compact_lane_only",
      expandableTrace: true,
    },
    now,
  });
}

export function readConversationProgressEvents({ root, limit = 50, sessionKey, runId } = {}) {
  const file = liveTurnProgressPath({ root });
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-Math.max(limit * 4, limit))
    .map((line) => JSON.parse(line))
    .filter((event) => !sessionKey || event.sessionKey === sessionKey)
    .filter((event) => !runId || event.runId === runId)
    .slice(-limit);
}

export function buildConversationProgressLane({ root, limit = 12 } = {}) {
  const events = readConversationProgressEvents({ root, limit });
  const latest = events.at(-1) || null;
  const toolEvents = events.filter((event) => event.tool);
  const completeIndex = events.findIndex((event) => ["complete", "tool_complete"].includes(event.phase));
  const hasMidProgressBeforeComplete = completeIndex > 0
    ? events
      .slice(0, completeIndex)
      .some((event) => !["context_retrieval", "complete", "tool_complete"].includes(event.phase))
    : false;
  const firstProgressUnderTarget = events[0]?.elapsedMs === null || events[0]?.elapsedMs <= 3000;
  const bodyLogLeakFindings = toolEvents
    .filter((event) => event.tool?.bodyLogPolicy !== "compact_lane_only")
    .map((event) => event.id);
  return {
    schema: "gpao_t.conversation_progress_lane.v0_1",
    status: latest?.phase === "blocked" || bodyLogLeakFindings.length ? "review" : "ready",
    latest,
    events,
    toolEvents,
    visibleItems: events.map((event) => ({
      id: event.id,
      phase: event.phase,
      label: event.label,
      detail: event.detail,
      toolName: event.tool?.name || null,
      toolStatus: event.tool?.status || null,
      expandableTrace: event.display?.expandableTrace === "available" || event.tool?.expandableTrace === true,
    })),
    uxContract: {
      firstProgressTargetMs: 3000,
      firstProgressUnderTarget,
      longTurnMidProgressRequired: true,
      hasMidProgressBeforeComplete,
      tokenStreamingRequiredButNotSufficient: true,
      toolLogsInBody: "blocked",
      bodyLogLeakFindings,
    },
  };
}

export function readLiveTurnAbsorptionRuns({ root, limit = 50 } = {}) {
  const file = liveTurnAbsorptionBridgePath({ root });
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => JSON.parse(line));
}

export function buildLiveTurnAbsorptionSummary({ root } = {}) {
  const runs = readLiveTurnAbsorptionRuns({ root, limit: 500 });
  const latest = runs.at(-1) || null;
  const progressLane = buildConversationProgressLane({ root });
  const postAnswerRuns = runs.filter((run) => run.status === "post_answer_growth_recorded");
  const waitingRuns = runs.filter((run) => run.status === "preflight_ready_waiting_for_answer");
  const blockedRuns = runs.filter((run) => run.status === "blocked");
  return {
    schema: "gpao_t.live_turn_absorption_summary.v0_1",
    status: blockedRuns.length ? "review" : "ready",
    totalRuns: runs.length,
    postAnswerGrowthRecorded: postAnswerRuns.length,
    waitingForAnswer: waitingRuns.length,
    blockedRuns: blockedRuns.length,
    latest,
    progressLane,
    authorityBoundary: buildLiveTurnAuthorityBoundary(),
    nextSafeAction: latest
      ? latest.nextSafeAction
      : "Run a local live-turn absorption smoke before wiring the bridge into live OpenClaw.",
  };
}

export function verifyLiveTurnAbsorptionBridge({ root } = {}) {
  const preflight = buildChatPreflightPacket({
    root,
    message: "지파오티 작업 흐름을 라이브 OpenClaw 턴에 연결해줘.",
    sessionKey: "agent:main:main",
    runId: "live-turn.verify",
    now: "2026-07-11T08:00:00.000Z",
  });
  const postAnswer = buildPostAnswerReplayRecord({
    root,
    preflightId: preflight.id,
    runId: "live-turn.verify",
    sessionKey: "agent:main:main",
    ackStatus: "original_send_preserved",
    answerText: "라이브 OpenClaw 턴을 GPAO-T preflight와 replay에 연결합니다.",
    now: "2026-07-11T08:01:00.000Z",
  });
  const evaluation = buildAnswerReplayEvaluation({
    root,
    preflightRecord: preflight,
    postAnswerRecord: postAnswer,
    answerText: "라이브 OpenClaw 턴을 GPAO-T preflight와 replay에 연결합니다.",
    now: "2026-07-11T08:02:00.000Z",
  });
  const policy = buildLiveTurnAbsorptionPolicy();
  const findings = [];
  if (policy.invariants.originalMessageMutation !== false) findings.push("original_message_mutation_open");
  if (policy.invariants.providerBehaviorChange !== "blocked_in_v1") findings.push("provider_behavior_change_open");
  if (policy.invariants.liveOpenClawMutation !== "blocked_in_v1") findings.push("live_openclaw_mutation_open");
  if (preflight.authorityBoundary?.mutatesChatMessage !== false) findings.push("preflight_mutates_message");
  if (postAnswer.replayChecks?.memoryPromotionSkipped !== "blocked") findings.push("post_answer_memory_promotion_open");
  if (evaluation.replayChecks?.memoryPromotionSkipped !== "blocked") findings.push("evaluation_memory_promotion_open");
  return {
    schema: "gpao_t.live_turn_absorption_bridge_verification.v0_1",
    status: findings.length ? "review" : "passed",
    findings,
    policy,
    preflight,
    postAnswer,
    evaluation,
    nextSafeAction: findings.length
      ? "Repair live turn bridge invariants before live OpenClaw wiring."
      : "Use the bridge for local trace capture, then add the narrow live hook behind the same authority boundary.",
  };
}

function appendLiveTurnAbsorptionRun({ root, record }) {
  const file = liveTurnAbsorptionBridgePath({ root });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(record)}\n`, { flag: "a" });
  return record;
}

function buildOriginalSendContract({ message, source }) {
  return {
    schema: "gpao_t.live_turn_original_send_contract.v0_1",
    originalMessagePreview: String(message || "").slice(0, 500),
    sourceKind: source.kind,
    mutatesOriginalMessage: false,
    blocksOriginalSend: false,
    providerBehaviorChange: false,
    liveOpenClawMutation: "blocked",
    telegramExternalSend: "blocked",
    note:
      "The bridge records local GPAO-T evidence only; the host must send the original user message unchanged.",
  };
}

function buildTraceLink({
  bridgeId,
  runId,
  sessionKey,
  source,
  identityMap,
  preflightRecord,
  postAnswerRecord,
  answerReplayEvaluation,
  autoMemoryGrowth,
}) {
  return {
    bridgeId,
    runId,
    sessionKey,
    sourceKind: source.kind,
    sourceProofStatus: source.sourceProof?.liveProofAccepted === false ? "missing_or_unaccepted" : "accepted_or_not_required",
    gpaoSessionId: identityMap?.gpao?.sessionId || null,
    gpaoThreadId: identityMap?.gpao?.threadId || null,
    gpaoContextPacketId: identityMap?.gpao?.contextPacketId || null,
    preflightId: preflightRecord?.id || null,
    postAnswerId: postAnswerRecord?.id || null,
    answerReplayEvaluationId: answerReplayEvaluation?.id || null,
    autoMemoryGrowthRunId: autoMemoryGrowth?.id || null,
  };
}

function buildLiveTurnAuthorityBoundary() {
  return {
    localTraceWrite: "allowed",
    originalMessageMutation: "blocked",
    providerBehaviorChange: "blocked",
    liveOpenClawMutation: "blocked",
    compatibilityMemoryWrite: "blocked",
    sessionMetaWrite: "blocked",
    durableMemoryPromotion: "blocked",
    externalSend: "blocked",
    publicRelease: "blocked",
  };
}

function buildGrowthText({ message, answer }) {
  return [
    "GPAO-T live turn absorption evidence.",
    `User message: ${message}`,
    `Assistant answer: ${answer}`,
  ].join("\n");
}

function collectFindings({ preflightRecord, postAnswerRecord, answerReplayEvaluation, autoMemoryGrowth }) {
  const findings = [];
  if (preflightRecord?.status !== "ready") findings.push("preflight_not_ready");
  if (postAnswerRecord && postAnswerRecord.replayChecks?.memoryPromotionSkipped !== "blocked") {
    findings.push("post_answer_memory_promotion_not_blocked");
  }
  if (answerReplayEvaluation?.status === "needs_answer_text") findings.push("answer_text_missing");
  if (autoMemoryGrowth?.status === "approval_required") {
    findings.push(...(autoMemoryGrowth.findings || ["auto_memory_growth_approval_required"]));
  }
  if (autoMemoryGrowth?.status === "captured_review_only") {
    findings.push("auto_growth_review_only_not_applied");
  }
  return [...new Set(findings)];
}

function inferChannel(kind) {
  if (kind === "telegram_direct") return "telegram";
  if (kind === "openclaw_web") return "webchat";
  if (kind === "gateway_chat") return "gateway";
  return "controlled";
}

function safeId(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9_.:-]+/g, "-").slice(0, 120) || "unknown";
}
