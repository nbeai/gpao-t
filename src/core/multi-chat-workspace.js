import { readSessionWorkspaceState, verifySessionWorkspaceBehavior } from "./session-workspace.js";

export function buildCodexStyleMultiChatWorkspace({
  root,
  now = new Date().toISOString(),
} = {}) {
  const state = readSessionWorkspaceState({ root, now });
  const sessionCheck = verifySessionWorkspaceBehavior({ root });
  const activeSession = state.sessions.find((session) => session.id === state.activeSessionId)
    || state.sessions.find((session) => session.state === "active")
    || state.sessions[0];

  const threads = state.sessions.map((session) => ({
    id: session.threadId,
    sessionId: session.sessionId,
    workspaceId: session.workspaceId,
    title: session.title,
    titleMode: session.titleMode,
    status: session.state === "delete_pending" ? "deleted_pending" : session.state,
    pinned: session.pinned,
    groupId: session.groupId,
    activeTargetId: session.contextPacket.activeTargetId,
    contextPacketId: session.contextPacket.id,
    memoryScope: session.memoryScope,
    replayState: session.replayState,
    authorityGate: session.authorityGate,
    activitySummary: session.activitySummary,
    lastOpenedAt: session.lastOpenedAt,
    lastUserActivityAt: session.lastUserActivityAt,
    lastAgentActivityAt: session.lastAgentActivityAt,
  }));

  return {
    schema: "gpao_t.codex_style_multi_chat_workspace.v1",
    status: sessionCheck.status === "ready" ? "ready" : "review",
    generatedAt: now,
    workspace: state.workspace,
    activeThreadId: activeSession?.threadId || null,
    activeSessionId: state.activeSessionId,
    layoutContract: {
      desktop: "session_rail_active_chat_workspace_inspector",
      mobile: "recent_pinned_list_active_chat_activity_sheet",
      multiPane: "planned_after_session_isolation_contract",
      tabCloseEndsSession: false,
    },
    lifecycleContract: {
      create: "local_session_state_write",
      rename: "local_session_state_write",
      archive: "reversible_local_state",
      restore: "reversible_local_state",
      delete: "delete_pending_only",
      permanentDelete: "blocked_until_owner_approval_backup_replay_rollback",
    },
    memoryContextContract: {
      scopes: ["global", "workspace", "group", "thread", "ephemeral"],
      answerAnchorRule: "thread_context_requires_active_target_admission_and_replay",
      candidateRule: "global_workspace_group_thread_memory_remains_candidate_until_review",
      leakPrevention: "inactive_thread_context_defaults_to_supporting_or_stale",
      durablePromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
      automaticAdmission: "blocked",
    },
    authorityContract: {
      localSessionStateWrite: "allowed",
      activityRead: "allowed",
      replayRead: "allowed",
      memoryCandidateReview: "allowed",
      durableMemoryPromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
      permanentDelete: "blocked",
      externalSend: "blocked",
      connectorActivation: "blocked",
      modelProviderCall: "blocked",
    },
    rail: {
      pinned: threads.filter((thread) => thread.pinned && !["archived", "deleted_pending"].includes(thread.status)),
      recent: threads.filter((thread) => ["active", "draft", "waiting_approval", "blocked"].includes(thread.status)),
      archived: threads.filter((thread) => ["archived", "deleted_pending"].includes(thread.status)),
    },
    activeThread: threads.find((thread) => thread.sessionId === state.activeSessionId) || threads[0] || null,
    threads,
    activityStream: buildActivityStream({ state, threads }),
    verification: sessionCheck,
    nextSafeAction:
      "Connect this contract to the live GPAO-T session event layer only after UI readback, rollback, and visual QA are prepared.",
  };
}

export function verifyCodexStyleMultiChatWorkspace({
  workspace = buildCodexStyleMultiChatWorkspace(),
} = {}) {
  const findings = [];
  if (workspace.schema !== "gpao_t.codex_style_multi_chat_workspace.v1") findings.push("invalid_schema");
  if (workspace.layoutContract?.desktop !== "session_rail_active_chat_workspace_inspector") {
    findings.push("desktop_layout_contract_missing");
  }
  if (workspace.layoutContract?.tabCloseEndsSession !== false) findings.push("tab_close_session_confusion_open");
  if (!Array.isArray(workspace.threads) || workspace.threads.length === 0) findings.push("missing_threads");
  if (!workspace.activeThreadId || !workspace.activeSessionId) findings.push("missing_active_identity");
  if (workspace.threads.some((thread) => !thread.contextPacketId || !thread.memoryScope)) {
    findings.push("missing_thread_context_or_memory_scope");
  }
  if (workspace.threads.some((thread) => thread.authorityGate?.permanentDelete !== "blocked")) {
    findings.push("permanent_delete_open");
  }
  if (workspace.authorityContract?.durableMemoryPromotion !== "blocked") findings.push("durable_memory_promotion_open");
  if (workspace.authorityContract?.compatibilityMemoryWrite !== "blocked") findings.push("openclaw_memory_write_open");
  if (workspace.authorityContract?.externalSend !== "blocked") findings.push("external_send_open");
  if (workspace.memoryContextContract?.answerAnchorRule !== "thread_context_requires_active_target_admission_and_replay") {
    findings.push("answer_anchor_rule_missing");
  }
  if (!workspace.activityStream?.global?.length) findings.push("missing_activity_stream");

  return {
    schema: "gpao_t.codex_style_multi_chat_workspace_verification.v1",
    status: findings.length ? "review" : "ready",
    findings,
    checkedThreadCount: workspace.threads?.length || 0,
    checkedBoundaries: workspace.authorityContract,
  };
}

function buildActivityStream({ state, threads }) {
  const global = threads.map((thread) => ({
    id: `activity.${thread.sessionId}`,
    workspaceId: thread.workspaceId,
    threadId: thread.id,
    sessionId: thread.sessionId,
    type: "session_state",
    actor: "system",
    summary: `${thread.title} · ${thread.status}`,
    severity: thread.status === "blocked" || thread.status === "deleted_pending" ? "review" : "info",
    createdAt: thread.activitySummary.lastEventAt,
  }));
  return {
    schema: "gpao_t.multi_chat_activity_stream.v1",
    global,
    activeSession: global.filter((event) => event.sessionId === state.activeSessionId),
    rawEventRef: ".gpao-t/events/audit.jsonl",
  };
}
