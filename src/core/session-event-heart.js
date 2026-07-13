import {
  buildLiveTurnIdentityMap,
  verifyLiveTurnIdentityMap,
} from "./live-turn-identity-mapping.js";
import {
  readSessionWorkspaceState,
  verifySessionWorkspaceBehavior,
} from "./session-workspace.js";
import {
  readConversationProgressEvents,
  readLiveTurnAbsorptionRuns,
} from "./live-turn-absorption-bridge.js";

const SCHEMA = "gpao_t.session_event_heart.v1";

export function buildSessionEventHeart({
  root,
  workspaceState,
  telegramIdentity,
  webchatIdentity,
  liveTurnRuns,
  progressEvents,
  now = new Date().toISOString(),
} = {}) {
  const state = workspaceState || readSessionWorkspaceState({ root, now });
  const sessionCheck = verifySessionWorkspaceBehavior({ root });
  const telegram = telegramIdentity || buildLiveTurnIdentityMap({
    sourceKind: "telegram_direct",
    agentId: "main",
    sessionKey: "agent:main:telegram:direct",
    sourceIdentity: {
      channel: "telegram",
      conversationLabel: "Telegram",
    },
  });
  const webchat = webchatIdentity || buildLiveTurnIdentityMap({
    sourceKind: "openclaw_web",
    agentId: "main",
    sessionKey: state.activeSessionId || "session.current",
    sourceIdentity: {
      channel: "webchat",
      sessionId: state.activeSessionId || "session.current",
      threadId: activeThreadId(state),
    },
  });
  const runs = liveTurnRuns || safeRead(() => readLiveTurnAbsorptionRuns({ root, limit: 25 }), []);
  const events = progressEvents || safeRead(() => readConversationProgressEvents({ root, limit: 50 }), []);
  const observations = [
    ...classifyWorkspace({ state, sessionCheck }),
    ...classifyIdentity("telegram_direct", telegram),
    ...classifyIdentity("webchat", webchat),
    ...classifyEventLedger({ runs, events }),
  ];
  const severity = highestSeverity(observations);
  return {
    schema: `${SCHEMA}.summary`,
    generatedAt: now,
    status: severity === "P0" ? "blocked" : severity === "P1" || severity === "P2" ? "review" : "ready",
    severity,
    userVisibleStatus: buildUserVisibleStatus(observations),
    workspace: {
      activeSessionId: state.activeSessionId,
      sessionCount: state.sessions?.length || 0,
      allowedActions: state.allowedActions || [],
      boundaries: state.boundaries || {},
    },
    identities: {
      telegramDirect: summarizeIdentity(telegram),
      webchat: summarizeIdentity(webchat),
    },
    eventLedger: {
      recentLiveTurnCount: runs.length,
      recentProgressEventCount: events.length,
      latestRunAt: runs[0]?.createdAt || runs[0]?.now || null,
      latestProgressAt: events[0]?.createdAt || events[0]?.now || null,
    },
    observations,
    authorityBoundary: {
      telegramExternalSend: "blocked",
      durableMemoryPromotion: "blocked",
      compatibilitySessionMetaWrite: "blocked",
      permanentDelete: "blocked",
    },
    completionClaimAllowed: false,
    completionClaimReason:
      "Session/Event Heart completion requires webchat and Telegram identity separation, event ledger readback, and live UI evidence.",
    nextSafeAction: severity === "P0"
      ? "Repair blocked session identity or authority gates before live hardening continues."
      : "Run live webchat and Telegram boundary evidence after source contract verification.",
  };
}

export function verifySessionEventHeart({
  heart = buildSessionEventHeart(),
} = {}) {
  const findings = [];
  const ids = new Set((heart.observations || []).map((item) => item.id));
  if (heart.schema !== `${SCHEMA}.summary`) findings.push("invalid_session_event_schema");
  if (heart.completionClaimAllowed !== false) findings.push("completion_gate_open");
  if (heart.authorityBoundary?.telegramExternalSend !== "blocked") findings.push("telegram_external_send_open");
  if (heart.authorityBoundary?.durableMemoryPromotion !== "blocked") findings.push("durable_memory_promotion_open");
  if (heart.authorityBoundary?.compatibilitySessionMetaWrite !== "blocked") findings.push("compatibility_session_meta_write_open");
  if (heart.authorityBoundary?.permanentDelete !== "blocked") findings.push("permanent_delete_open");
  if (!ids.has("telegram_direct_dedicated_session")) findings.push("telegram_direct_contract_missing");
  if (!ids.has("webchat_session_separated")) findings.push("webchat_contract_missing");
  if (!ids.has("session_workspace_ready")) findings.push("session_workspace_not_ready");
  if (heart.identities?.telegramDirect?.sessionId === heart.identities?.webchat?.sessionId) {
    findings.push("telegram_webchat_session_collision");
  }
  if (heart.userVisibleStatus?.language !== "gpao_t_user_safe") findings.push("user_safe_language_missing");
  return {
    schema: `${SCHEMA}.verification`,
    status: findings.length ? "blocked" : "ready",
    findings,
    observedIds: [...ids].sort(),
    completionClaimAllowed: false,
    nextSafeAction: findings.length
      ? "Repair Session/Event Heart identity and authority contract."
      : "Wire Session/Event Heart into CLI/API evidence and continue Memory/Context Heart.",
  };
}

function classifyWorkspace({ state, sessionCheck }) {
  const observations = [];
  observations.push({
    id: sessionCheck.status === "ready" ? "session_workspace_ready" : "session_workspace_review",
    severity: sessionCheck.status === "ready" ? "info" : "P0",
    ok: sessionCheck.status === "ready",
    userLabel: sessionCheck.status === "ready" ? "대화 작업공간 정상" : "대화 작업공간 검토 필요",
    userMessage: sessionCheck.status === "ready"
      ? "GPAO-T 세션 목록과 활성 세션 기준이 확인되었습니다."
      : "GPAO-T 세션 작업공간의 정체성 또는 권한 경계가 맞지 않습니다.",
    details: { findings: sessionCheck.findings || [] },
  });
  if (!state.sessions?.length) {
    observations.push({
      id: "session_list_empty",
      severity: "P1",
      ok: false,
      userLabel: "세션 목록 없음",
      userMessage: "대화창 목록이 비어 있어 사용자 작업 흐름을 이어가기 어렵습니다.",
    });
  }
  return observations;
}

function classifyIdentity(label, identityMap) {
  const verification = verifyLiveTurnIdentityMap(identityMap);
  const observations = [];
  observations.push({
    id: verification.status === "passed" ? `${label}_identity_ready` : `${label}_identity_review`,
    severity: verification.status === "passed" ? "info" : "P0",
    ok: verification.status === "passed",
    userLabel: label === "telegram_direct" ? "텔레그램 전용 세션" : "웹 대화 세션",
    userMessage: verification.status === "passed"
      ? "세션 정체성과 권한 경계가 확인되었습니다."
      : "세션 정체성 또는 권한 경계가 맞지 않습니다.",
    details: { findings: verification.findings },
  });
  if (label === "telegram_direct" && identityMap.gpao?.directSessionPolicy === "single_dedicated_direct_session") {
    observations.push({
      id: "telegram_direct_dedicated_session",
      severity: "info",
      ok: true,
      userLabel: "텔레그램 단일 전용 세션",
      userMessage: "텔레그램은 코덱스식 여러 창이 아니라 하나의 전용 소통 세션으로 고정됩니다.",
    });
  }
  if (label === "webchat" && identityMap.gpao?.sessionId !== "session.telegram.direct") {
    observations.push({
      id: "webchat_session_separated",
      severity: "info",
      ok: true,
      userLabel: "웹 대화 세션 분리",
      userMessage: "웹 대화창은 텔레그램 전용 세션과 분리된 세션 정체성을 가집니다.",
    });
  }
  return observations;
}

function classifyEventLedger({ runs, events }) {
  return [{
    id: runs.length || events.length ? "event_ledger_readable" : "event_ledger_empty",
    severity: runs.length || events.length ? "info" : "P2",
    ok: Boolean(runs.length || events.length),
    userLabel: runs.length || events.length ? "이벤트 기록 읽기 가능" : "이벤트 기록 없음",
    userMessage: runs.length || events.length
      ? "최근 대화/도구 진행 기록을 읽을 수 있습니다."
      : "최근 대화/도구 진행 기록이 아직 비어 있습니다. 실제 대화 QA에서 채워야 합니다.",
  }];
}

function summarizeIdentity(identityMap) {
  return {
    sourceKind: identityMap.sourceKind,
    channel: identityMap.channel,
    sessionKey: identityMap.gpao?.sessionKey || null,
    sessionId: identityMap.gpao?.sessionId || null,
    threadId: identityMap.gpao?.threadId || null,
    contextPacketId: identityMap.gpao?.contextPacketId || null,
    directSessionPolicy: identityMap.gpao?.directSessionPolicy || null,
  };
}

function activeThreadId(state) {
  const active = state.sessions?.find((session) => session.id === state.activeSessionId) || state.sessions?.[0];
  return active?.threadId || "thread.current";
}

function highestSeverity(observations) {
  const order = ["P0", "P1", "P2", "info"];
  return order.find((severity) => observations.some((item) => item.severity === severity)) || "info";
}

function buildUserVisibleStatus(observations) {
  const firstProblem = observations.find((item) => item.severity === "P0")
    || observations.find((item) => item.severity === "P1")
    || observations.find((item) => item.severity === "P2");
  if (firstProblem) {
    return {
      language: "gpao_t_user_safe",
      label: firstProblem.severity === "P0" ? "복구 필요" : "검토 필요",
      message: firstProblem.userMessage,
    };
  }
  return {
    language: "gpao_t_user_safe",
    label: "세션 흐름 정상",
    message: "GPAO-T 대화창과 텔레그램 전용 세션의 정체성이 분리되어 있습니다.",
  };
}

function safeRead(read, fallback) {
  try {
    return read();
  } catch {
    return fallback;
  }
}
