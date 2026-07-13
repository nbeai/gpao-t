import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { appendAuditEvent, runtimePaths } from "./storage.js";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SESSION_FILE = "state/session-workspace.json";

export const SESSION_STATE_LABELS = {
  active: "진행 중",
  draft: "초안",
  waiting_approval: "확인 필요",
  blocked: "멈춤",
  archived: "보관됨",
  delete_pending: "삭제 대기",
};

const MUTATING_ACTIONS = new Set([
  "new_session",
  "select_session",
  "rename",
  "toggle_pin",
  "archive",
  "restore",
  "mark_delete_pending",
  "cancel_delete_pending",
]);

export function sessionWorkspacePaths({ root = PACKAGE_ROOT } = {}) {
  const paths = runtimePaths({ root });
  return {
    ...paths,
    sessionFile: resolve(paths.runtimeRoot, SESSION_FILE),
  };
}

export function readSessionWorkspaceState({ root = PACKAGE_ROOT, now = new Date().toISOString() } = {}) {
  const paths = sessionWorkspacePaths({ root });
  if (!existsSync(paths.sessionFile)) {
    return defaultSessionWorkspaceState({ now });
  }
  return normalizeSessionWorkspaceState(JSON.parse(readFileSync(paths.sessionFile, "utf8")), { now });
}

export function writeSessionWorkspaceState(state, { root = PACKAGE_ROOT, now = new Date().toISOString() } = {}) {
  const paths = sessionWorkspacePaths({ root });
  const normalized = normalizeSessionWorkspaceState({ ...state, updatedAt: now }, { now });
  mkdirSync(dirname(paths.sessionFile), { recursive: true });
  writeFileSync(paths.sessionFile, `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}

export function applySessionWorkspaceAction({
  root = PACKAGE_ROOT,
  action,
  sessionId,
  title,
  request,
  now = new Date().toISOString(),
} = {}) {
  const before = readSessionWorkspaceState({ root, now });
  if (!MUTATING_ACTIONS.has(action)) {
    return actionResult({
      status: "blocked",
      reason: "unsupported_or_destructive_action",
      message: "지원하지 않거나 되돌리기 어려운 세션 행동은 열지 않습니다.",
      state: before,
      action,
      sessionId,
    });
  }

  const state = cloneState(before);
  let target = sessionId ? state.sessions.find((session) => session.id === sessionId) : null;

  if (action === "new_session") {
    const session = buildNewSession({ title, request, now });
    state.sessions = state.sessions.map((item) => item.state === "active" ? { ...item, state: "draft" } : item);
    state.sessions.unshift(session);
    state.activeSessionId = session.id;
    state.updatedAt = now;
    const written = writeAndAudit({ root, state, action, session, now });
    return actionResult({
      status: "applied",
      message: "새 세션을 만들고 활성 세션으로 전환했습니다.",
      state: written,
      action,
      sessionId: session.id,
    });
  }

  if (!target) {
    return actionResult({
      status: "blocked",
      reason: "session_not_found",
      message: "대상 세션을 찾지 못했습니다.",
      state: before,
      action,
      sessionId,
    });
  }

  if (action === "select_session") {
    if (["archived", "delete_pending"].includes(target.state)) {
      return actionResult({
        status: "review",
        reason: "restore_before_select",
        message: "보관 또는 삭제 대기 세션은 먼저 복구해야 활성화할 수 있습니다.",
        state: before,
        action,
        sessionId,
      });
    }
    state.sessions = state.sessions.map((session) => {
      if (session.id === target.id) return { ...session, state: "active", updatedAt: now };
      return session.state === "active" ? { ...session, state: "draft" } : session;
    });
    state.activeSessionId = target.id;
  }

  if (action === "rename") {
    if (!title || !String(title).trim()) {
      return actionResult({
        status: "blocked",
        reason: "title_required",
        message: "이름 변경에는 새 제목이 필요합니다.",
        state: before,
        action,
        sessionId,
      });
    }
    state.sessions = state.sessions.map((session) => (
      session.id === target.id
        ? { ...session, title: String(title).trim(), titleMode: "manual", updatedAt: now }
        : session
    ));
  }

  if (action === "toggle_pin") {
    state.sessions = state.sessions.map((session) => (
      session.id === target.id ? { ...session, pinned: !session.pinned, updatedAt: now } : session
    ));
  }

  if (action === "archive") {
    state.sessions = state.sessions.map((session) => (
      session.id === target.id ? { ...session, state: "archived", updatedAt: now } : session
    ));
    if (state.activeSessionId === target.id) state.activeSessionId = nextActiveSessionId(state.sessions, target.id);
    state.sessions = ensureOneActiveSession(state.sessions, state.activeSessionId, now);
  }

  if (action === "restore") {
    state.sessions = state.sessions.map((session) => (
      session.id === target.id && ["archived", "delete_pending"].includes(session.state)
        ? { ...session, state: "draft", updatedAt: now }
        : session
    ));
  }

  if (action === "mark_delete_pending") {
    state.sessions = state.sessions.map((session) => (
      session.id === target.id ? { ...session, state: "delete_pending", updatedAt: now } : session
    ));
    if (state.activeSessionId === target.id) state.activeSessionId = nextActiveSessionId(state.sessions, target.id);
    state.sessions = ensureOneActiveSession(state.sessions, state.activeSessionId, now);
  }

  if (action === "cancel_delete_pending") {
    state.sessions = state.sessions.map((session) => (
      session.id === target.id && session.state === "delete_pending"
        ? { ...session, state: "draft", updatedAt: now }
        : session
    ));
  }

  state.updatedAt = now;
  const latestTarget = state.sessions.find((session) => session.id === sessionId) || target;
  const written = writeAndAudit({ root, state, action, session: latestTarget, now });
  return actionResult({
    status: "applied",
    message: userMessageForAction(action),
    state: written,
    action,
    sessionId,
  });
}

export function verifySessionWorkspaceBehavior({ root = PACKAGE_ROOT } = {}) {
  const state = readSessionWorkspaceState({ root });
  const findings = [];
  if (state.schema !== "gpao_t.session_workspace_state.v1") findings.push("invalid_schema");
  if (!Array.isArray(state.sessions) || state.sessions.length === 0) findings.push("missing_sessions");
  if (!state.sessions.some((session) => session.state === "active")) findings.push("missing_active_session");
  if (!state.workspace?.id) findings.push("missing_workspace_id");
  if (state.sessions.some((session) => !session.threadId || !session.sessionId)) findings.push("missing_thread_session_identity");
  if (state.sessions.some((session) => !session.contextPacket?.scope)) findings.push("missing_session_context_packet");
  if (state.sessions.some((session) => !session.memoryScope?.thread)) findings.push("missing_session_memory_scope");
  if (state.sessions.some((session) => session.memoryScope?.durablePromotion !== "blocked")) {
    findings.push("durable_memory_promotion_open");
  }
  if (state.sessions.some((session) => session.authorityGate?.permanentDelete !== "blocked")) {
    findings.push("permanent_delete_gate_open");
  }
  if (state.sessions.some((session) => session.state === "permanent_delete")) findings.push("permanent_delete_open");
  if (state.allowedActions.includes("permanent_delete")) findings.push("permanent_delete_allowed");
  if (state.boundaries.permanentDelete !== "blocked") findings.push("permanent_delete_boundary_open");
  if (state.boundaries.externalActivation !== "blocked") findings.push("external_activation_open");
  if (state.boundaries.compatibilityMemoryWrite !== "blocked") findings.push("openclaw_memory_write_open");
  if (state.boundaries.automaticAdmission !== "blocked") findings.push("automatic_admission_open");
  return {
    schema: "gpao_t.session_workspace_behavior_verification.v1",
    status: findings.length ? "review" : "ready",
    findings,
    checkedActions: state.allowedActions,
    checkedBoundaries: state.boundaries,
  };
}

export function deriveSessionTitleFromRequest(request, {
  fallback = "새 작업 세션",
  maxLength = 28,
} = {}) {
  const normalized = String(request || "")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[`*_#>~|{}[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return fallback;

  const firstSentence = normalized
    .split(/(?<=[.!?。！？])\s+|[\r\n]+/)
    .map((sentence) => sentence.trim())
    .find((sentence) => sentence && !/^(좋아|자|그럼|이제|일단|그리고|그러면|음|흠)[.!?\s]*$/i.test(sentence)) ||
    normalized;
  const commandTrimmed = firstSentence
    .replace(/^(좋아|자|그럼|이제|일단|그리고|그러면|음|흠)[,.\s]+/i, "")
    .replace(/(해줘|해봐|진행해|진행하자|부탁해|알려줘|만들어줘)[.!?\s]*$/i, "")
    .trim() || firstSentence;
  if (commandTrimmed.length <= maxLength) return commandTrimmed;

  const words = commandTrimmed.split(/\s+/);
  let title = "";
  for (const word of words) {
    const candidate = title ? `${title} ${word}` : word;
    if (candidate.length > maxLength) break;
    title = candidate;
  }
  if (title.length >= 6) return title;
  return `${commandTrimmed.slice(0, Math.max(6, maxLength - 1)).trim()}…`;
}

export function defaultSessionWorkspaceState({ now = new Date().toISOString() } = {}) {
  return normalizeSessionWorkspaceState({
    schema: "gpao_t.session_workspace_state.v1",
    status: "ready",
    activeSessionId: "session.current",
    workspace: {
      id: "workspace.gpao-t.local",
      title: "nBeAI. GPAO-T",
      authorityPolicyId: "gpao-t.local.preview-authority",
      memoryPolicyId: "gpao-t.review-only-memory",
    },
    createdAt: now,
    updatedAt: now,
    allowedActions: [...MUTATING_ACTIONS],
    boundaries: {
      permanentDelete: "blocked",
      modelCall: "blocked",
      toolExecution: "blocked",
      connectorActivation: "blocked",
      externalActivation: "blocked",
      durableMemoryPromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
      automaticAdmission: "blocked",
    },
    sessions: [
      sessionRecord({
        id: "session.current",
        title: "지금 맡긴 작업",
        state: "active",
        lastActivity: now,
        project: "GPAO-T",
        hint: "일반 작업 흐름",
        request: "GPAO-T 첫 작업 표면을 설계하고 다음 안전 행동을 정리해줘.",
      }),
      sessionRecord({
        id: "session.draft.control-center",
        title: "Control Center 정리",
        state: "draft",
        lastActivity: now,
        project: "GPAO-T",
        hint: "보조 인스펙터",
        request: "Control Center는 보조 검토 표면으로 유지",
      }),
      sessionRecord({
        id: "session.waiting.approval",
        title: "승인 기록 검토",
        state: "waiting_approval",
        lastActivity: now,
        project: "GPAO-T",
        hint: "저장 전 확인",
        request: "승인/감사 로컬 기록 확인",
      }),
      sessionRecord({
        id: "session.blocked.connector",
        title: "커넥터 실행",
        state: "blocked",
        lastActivity: now,
        project: "GPAO-T",
        hint: "외부 전송 없음",
        request: "커넥터 활성화는 승인 전 잠김",
      }),
      sessionRecord({
        id: "session.archived.design",
        title: "디자인 기준 정리",
        state: "archived",
        lastActivity: now,
        project: "GPAO-T",
        hint: "보관됨",
        request: "Visual Reference 기반 정리",
      }),
      sessionRecord({
        id: "session.delete-pending.old-dashboard",
        title: "이전 대시보드 실험",
        state: "delete_pending",
        lastActivity: now,
        project: "GPAO-T",
        hint: "복구 가능",
        request: "영구 삭제 전 대기",
      }),
    ],
  }, { now });
}

function normalizeSessionWorkspaceState(state, { now }) {
  const sessions = (state.sessions || []).map((session) => sessionRecord(session));
  const activeSessionId = sessions.some((session) => session.id === state.activeSessionId)
    ? state.activeSessionId
    : sessions.find((session) => session.state === "active")?.id || sessions[0]?.id || null;
  const normalized = {
    schema: "gpao_t.session_workspace_state.v1",
    status: state.status || "ready",
    activeSessionId,
    workspace: {
      id: state.workspace?.id || "workspace.gpao-t.local",
      title: state.workspace?.title || "nBeAI. GPAO-T",
      authorityPolicyId: state.workspace?.authorityPolicyId || "gpao-t.local.preview-authority",
      memoryPolicyId: state.workspace?.memoryPolicyId || "gpao-t.review-only-memory",
    },
    createdAt: state.createdAt || now,
    updatedAt: state.updatedAt || now,
    allowedActions: [...new Set([...(state.allowedActions || []), ...MUTATING_ACTIONS])],
    boundaries: {
      permanentDelete: "blocked",
      modelCall: "blocked",
      toolExecution: "blocked",
      connectorActivation: "blocked",
      externalActivation: "blocked",
      durableMemoryPromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
      automaticAdmission: "blocked",
      ...(state.boundaries || {}),
    },
    sessions,
  };
  normalized.sessions = ensureOneActiveSession(normalized.sessions, normalized.activeSessionId, now);
  normalized.activeSessionId = normalized.sessions.find((session) => session.state === "active")?.id || normalized.activeSessionId;
  return normalized;
}

function sessionRecord(session) {
  const id = session.id;
  const threadId = session.threadId || idToThreadId(id);
  const sessionId = session.sessionId || id;
  const state = SESSION_STATE_LABELS[session.state] ? session.state : "draft";
  const title = session.title || "새 작업";
  const lastActivity = session.lastActivity || session.updatedAt || session.createdAt || new Date().toISOString();
  return {
    id,
    threadId,
    sessionId,
    workspaceId: session.workspaceId || "workspace.gpao-t.local",
    title,
    titleMode: session.titleMode || "manual",
    state,
    stateLabel: SESSION_STATE_LABELS[state],
    pinned: Boolean(session.pinned),
    groupId: session.groupId || "group.ungrouped",
    lifecycle: {
      status: stateToLifecycleStatus(state),
      canArchive: !["archived", "delete_pending"].includes(state),
      canRestore: ["archived", "delete_pending"].includes(state),
      canMarkDeletePending: state !== "delete_pending",
      permanentDelete: "blocked",
      restoreRequiredBeforeSelect: ["archived", "delete_pending"].includes(state),
      ...(session.lifecycle || {}),
    },
    lastActivity,
    lastOpenedAt: session.lastOpenedAt || lastActivity,
    lastUserActivityAt: session.lastUserActivityAt || lastActivity,
    lastAgentActivityAt: session.lastAgentActivityAt || lastActivity,
    project: session.project || "GPAO-T",
    hint: session.hint || "로컬 작업",
    request: session.request || "",
    activeTargetId: session.activeTargetId || "general-runtime",
    contextPacket: normalizeContextPacket({
      packet: session.contextPacket,
      sessionId,
      threadId,
      request: session.request,
      activeTargetId: session.activeTargetId,
    }),
    memoryScope: normalizeMemoryScope({ memoryScope: session.memoryScope, threadId }),
    replayState: normalizeReplayState(session.replayState),
    authorityGate: normalizeAuthorityGate(session.authorityGate),
    activitySummary: normalizeActivitySummary({ activitySummary: session.activitySummary, state, lastActivity }),
    createdAt: session.createdAt || session.lastActivity || new Date().toISOString(),
    updatedAt: session.updatedAt || session.lastActivity || new Date().toISOString(),
  };
}

function buildNewSession({ title, request, now }) {
  const manualTitle = String(title || "").trim();
  const safeTitle = manualTitle || deriveSessionTitleFromRequest(request);
  const id = `session.local.${Date.parse(now) || Date.now()}`;
  return sessionRecord({
    id,
    title: safeTitle,
    titleMode: manualTitle ? "manual" : "auto_from_first_input",
    state: "active",
    lastActivity: now,
    project: "GPAO-T",
    hint: "새 로컬 세션",
    request: request || "",
    createdAt: now,
    updatedAt: now,
  });
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function nextActiveSessionId(sessions, excludedId) {
  return sessions.find((session) => (
    session.id !== excludedId && ["active", "draft", "waiting_approval", "blocked"].includes(session.state)
  ))?.id || null;
}

function ensureOneActiveSession(sessions, activeSessionId, now) {
  let activeAssigned = false;
  const preferred = activeSessionId || sessions.find((session) => session.state === "active")?.id;
  return sessions.map((session) => {
    if (!activeAssigned && session.id === preferred && !["archived", "delete_pending"].includes(session.state)) {
      activeAssigned = true;
      return { ...session, state: "active", stateLabel: SESSION_STATE_LABELS.active, updatedAt: session.updatedAt || now };
    }
    if (session.state === "active") return { ...session, state: "draft", stateLabel: SESSION_STATE_LABELS.draft };
    return { ...session, stateLabel: SESSION_STATE_LABELS[session.state] };
  });
}

function writeAndAudit({ root, state, action, session, now }) {
  const written = writeSessionWorkspaceState(state, { root, now });
  appendAuditEvent({
    type: "session_workspace.action",
    summary: userMessageForAction(action),
    payload: {
      action,
      sessionId: session?.id,
      sessionState: session?.state,
      externalActivation: "blocked",
      permanentDelete: "blocked",
    },
  }, { root, now });
  return written;
}

function actionResult({ status, reason, message, state, action, sessionId }) {
  return {
    schema: "gpao_t.session_workspace_action_result.v1",
    status,
    reason: reason || null,
    action,
    sessionId: sessionId || null,
    message,
    state,
    boundaries: state.boundaries,
  };
}

function userMessageForAction(action) {
  return {
    new_session: "새 세션을 만들었습니다.",
    select_session: "활성 세션을 전환했습니다.",
    rename: "세션 이름을 바꿨습니다.",
    toggle_pin: "세션 고정을 전환했습니다.",
    archive: "세션을 보관했습니다.",
    restore: "세션을 복구했습니다.",
    mark_delete_pending: "세션을 삭제 대기로 옮겼습니다. 아직 영구 삭제는 아닙니다.",
    cancel_delete_pending: "삭제 대기를 취소했습니다.",
  }[action] || "세션 작업을 적용했습니다.";
}

function idToThreadId(id) {
  if (!id) return "thread.local.unknown";
  return String(id).replace(/^session[.:]/, "thread.");
}

function stateToLifecycleStatus(state) {
  return {
    active: "running",
    draft: "idle",
    waiting_approval: "waiting_for_user",
    blocked: "blocked",
    archived: "archived",
    delete_pending: "delete_pending",
  }[state] || "idle";
}

function normalizeContextPacket({ packet = {}, sessionId, threadId, request = "", activeTargetId = "general-runtime" } = {}) {
  return {
    id: packet.id || `context.${sessionId}`,
    sessionId,
    threadId,
    scope: packet.scope || "thread",
    activeTargetId: packet.activeTargetId || activeTargetId || "general-runtime",
    sourceSummary: packet.sourceSummary || request || "세션 내부 맥락",
    admittedMemoryRefs: Array.isArray(packet.admittedMemoryRefs) ? packet.admittedMemoryRefs : [],
    excludedMemoryRefs: Array.isArray(packet.excludedMemoryRefs) ? packet.excludedMemoryRefs : [],
    ephemeralRefs: Array.isArray(packet.ephemeralRefs) ? packet.ephemeralRefs : [`session:${sessionId}`],
    globalMemoryRefs: Array.isArray(packet.globalMemoryRefs) ? packet.globalMemoryRefs : [],
    workspaceMemoryRefs: Array.isArray(packet.workspaceMemoryRefs) ? packet.workspaceMemoryRefs : [],
    authorityStatus: packet.authorityStatus || "admission_required_before_answer_anchor",
    freshness: packet.freshness || "current_session",
  };
}

function normalizeMemoryScope({ memoryScope = {}, threadId } = {}) {
  return {
    global: memoryScope.global || "candidate_only",
    workspace: memoryScope.workspace || "candidate_only",
    group: memoryScope.group || "candidate_only",
    thread: memoryScope.thread || threadId,
    ephemeral: memoryScope.ephemeral || "turn_context_only",
    durablePromotion: "blocked",
    compatibilityMemoryWrite: "blocked",
    automaticAdmission: "blocked",
  };
}

function normalizeReplayState(replayState = {}) {
  return {
    status: replayState.status || "not_run",
    requiredBeforeAdmission: replayState.requiredBeforeAdmission !== false,
    beforeAfterEvidence: replayState.beforeAfterEvidence || "required_before_memory_anchor",
    lastReplayId: replayState.lastReplayId || null,
  };
}

function normalizeAuthorityGate(authorityGate = {}) {
  return {
    status: authorityGate.status || "locked",
    localSessionStateWrite: "allowed",
    rename: "allowed",
    archive: "allowed",
    restore: "allowed",
    deletePending: "allowed",
    permanentDelete: "blocked",
    durableMemoryPromotion: "blocked",
    compatibilityMemoryWrite: "blocked",
    externalSend: "blocked",
    connectorActivation: "blocked",
    modelProviderCall: "blocked",
  };
}

function normalizeActivitySummary({ activitySummary = {}, state, lastActivity } = {}) {
  return {
    status: activitySummary.status || "local_summary_ready",
    lastEventAt: activitySummary.lastEventAt || lastActivity,
    visibleEvents: Array.isArray(activitySummary.visibleEvents)
      ? activitySummary.visibleEvents
      : [`session_state:${state}`],
    rawEventRef: activitySummary.rawEventRef || ".gpao-t/events/audit.jsonl",
  };
}
