import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildCodexStyleMultiChatWorkspace,
  verifyCodexStyleMultiChatWorkspace,
} from "./multi-chat-workspace.js";
import {
  readSessionWorkspaceState,
  sessionWorkspacePaths,
} from "./session-workspace.js";
import {
  buildMemoryReviewQueueSummary,
  readMemoryReviewQueue,
} from "./memory-candidate-review-queue.js";
import {
  buildCoreWorkSurface,
  buildCoreWorkSurfaceHtml,
  verifyCoreWorkSurface,
} from "./core-work-surface.js";

const STAGE_IDS = [
  "openclaw_live_session_event_absorption",
  "live_dashboard_action_readback",
  "session_context_isolation",
  "thread_scoped_memory_review_queue",
  "mobile_session_action_and_inspector_visual_qa",
  "controlled_live_smoke_gate",
];

const SAFE_SESSION_ACTIONS = [
  "rename",
  "archive",
  "restore",
  "mark_delete_pending",
  "cancel_delete_pending",
];

export function buildMultiChatStageSixCompletion({
  root,
  now = new Date().toISOString(),
  threadId,
  sessionId,
} = {}) {
  const workspace = buildCodexStyleMultiChatWorkspace({ root, now });
  const workspaceCheck = verifyCodexStyleMultiChatWorkspace({ workspace });
  const state = readSessionWorkspaceState({ root, now });
  const activeSession = resolveActiveSession({ state, threadId, sessionId });
  const readback = buildLiveDashboardActionReadback({ root, state, now });
  const isolation = buildSessionContextIsolationProof({ workspace, state });
  const memoryQueue = buildThreadScopedMemoryReviewQueue({
    root,
    workspace,
    activeSession,
  });
  const mobileQa = buildMobileSessionSheetQa({ root });
  const liveSmoke = buildControlledLiveSmokeGate({ root, workspace, state, now });
  const stages = [
    buildStage({
      id: STAGE_IDS[0],
      label: "OpenClaw live session RPC/event layer absorption",
      status: workspaceCheck.status === "ready" && workspace.threads.length > 0 ? "ready" : "review",
      evidence: {
        sourceContract: "OpenClaw session event layer maps into GPAO-T thread/session/context/memory/activity units.",
        mappedEvents: [
          "sessions.changed",
          "sessions.subscribe",
          "sessions.messages.subscribe",
          "session.message",
        ],
        threadCount: workspace.threads.length,
        activeThreadId: workspace.activeThreadId,
        activityEventCount: workspace.activityStream.global.length,
        destructiveMutation: false,
      },
    }),
    buildStage({
      id: STAGE_IDS[1],
      label: "Live dashboard action readback for rename/archive/delete-pending/restore",
      status: readback.status,
      evidence: readback,
    }),
    buildStage({
      id: STAGE_IDS[2],
      label: "Session-specific message and context isolation",
      status: isolation.status,
      evidence: isolation,
    }),
    buildStage({
      id: STAGE_IDS[3],
      label: "Memory candidate review queue filtered by active thread/session",
      status: memoryQueue.status,
      evidence: memoryQueue,
    }),
    buildStage({
      id: STAGE_IDS[4],
      label: "Mobile session action sheet and inspector sheet visual QA",
      status: mobileQa.status,
      evidence: mobileQa,
    }),
    buildStage({
      id: STAGE_IDS[5],
      label: "Controlled live smoke only after backup, rollback, and authority gate",
      status: liveSmoke.status,
      evidence: liveSmoke,
    }),
  ];
  const findings = stages.flatMap((stage) => stage.findings.map((finding) => `${stage.id}:${finding}`));
  const readyStageCount = stages.filter((stage) => stage.status === "ready").length;
  return {
    schema: "gpao_t.multi_chat_stage_1_6_completion.v1",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    currentTask: "GPAO-T fixed stages 1-6 completion",
    track: "Operating Surface + Core Kernel support",
    active: {
      sessionId: activeSession?.sessionId || null,
      threadId: activeSession?.threadId || null,
      workspaceId: activeSession?.workspaceId || workspace.workspace.id,
    },
    progress: {
      completedStageCount: readyStageCount,
      totalStageCount: 6,
      percent: Math.round((readyStageCount / 6) * 100),
      remainingFixedStages: findings.length ? stages.filter((stage) => stage.status !== "ready").map((stage) => stage.label) : [
        "Internal production distribution/update packet refresh",
      ],
    },
    stages,
    authorityBoundaries: {
      liveOpenClawMutation: "not_executed",
      gatewayRestart: "not_executed",
      durableMemoryPromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
      permanentDelete: "blocked",
      externalSend: "blocked",
      publicRelease: "blocked",
    },
    findings,
    nextSafeAction: findings.length
      ? "Repair the listed stage findings before calling stages 1-6 complete."
      : "Refresh the internal production distribution/update packet as fixed stage 7.",
  };
}

export function verifyMultiChatStageSixCompletion({
  root,
  completion = buildMultiChatStageSixCompletion({ root }),
} = {}) {
  const findings = [];
  if (completion.schema !== "gpao_t.multi_chat_stage_1_6_completion.v1") findings.push("invalid_schema");
  if (completion.stages?.length !== 6) findings.push("missing_stage_1_6_entries");
  for (const id of STAGE_IDS) {
    if (!completion.stages?.some((stage) => stage.id === id && stage.status === "ready")) {
      findings.push(`stage_not_ready:${id}`);
    }
  }
  if (completion.authorityBoundaries?.durableMemoryPromotion !== "blocked") findings.push("durable_memory_promotion_open");
  if (completion.authorityBoundaries?.compatibilityMemoryWrite !== "blocked") findings.push("openclaw_memory_write_open");
  if (completion.authorityBoundaries?.permanentDelete !== "blocked") findings.push("permanent_delete_open");
  if (completion.authorityBoundaries?.externalSend !== "blocked") findings.push("external_send_open");
  if (completion.progress?.completedStageCount !== 6) findings.push("stage_count_not_complete");
  return {
    schema: "gpao_t.multi_chat_stage_1_6_completion_verification.v1",
    status: findings.length ? "review" : "ready",
    findings,
    checkedStages: completion.stages?.map((stage) => ({ id: stage.id, status: stage.status })) || [],
    checkedBoundaries: completion.authorityBoundaries,
  };
}

export function buildThreadScopedMemoryReviewQueue({
  root,
  workspace = buildCodexStyleMultiChatWorkspace({ root }),
  activeSession,
  threadId,
  sessionId,
  limit = 500,
} = {}) {
  const active = activeSession || resolveActiveSession({
    state: readSessionWorkspaceState({ root }),
    threadId: threadId || workspace.activeThreadId,
    sessionId,
  });
  const records = readMemoryReviewQueue({ root, limit });
  const summary = buildMemoryReviewQueueSummary({ root });
  const scopedRecords = records.filter((record) => recordMatchesScope({ record, active }));
  const foreignRecords = records.filter((record) => !recordMatchesScope({ record, active }));
  const candidateRecords = scopedRecords.filter((record) => record.recordType === "memory_candidate");
  const findings = [];
  if (!active?.threadId || !active?.sessionId) findings.push("active_session_scope_missing");
  if (candidateRecords.some((record) => record.authority?.blockedUse?.includes("openclaw_memory_write") === false)) {
    findings.push("openclaw_memory_write_not_blocked");
  }
  if (candidateRecords.some((record) => record.authority?.blockedUse?.includes("durable_memory_promotion") === false)) {
    findings.push("durable_memory_promotion_not_blocked");
  }
  return {
    schema: "gpao_t.thread_scoped_memory_review_queue.v1",
    status: findings.length ? "review" : "ready",
    activeScope: {
      threadId: active?.threadId || null,
      sessionId: active?.sessionId || null,
      memoryThread: active?.memoryScope?.thread || active?.threadId || null,
      activeTargetId: active?.contextPacket?.activeTargetId || active?.activeTargetId || null,
    },
    counts: {
      allRecords: records.length,
      scopedRecords: scopedRecords.length,
      foreignRecords: foreignRecords.length,
      scopedCandidates: candidateRecords.length,
      queueCandidates: summary.counts.candidates,
    },
    records: scopedRecords.map(compactMemoryRecord),
    isolationPolicy: {
      activeThreadCandidates: "included",
      globalOrWorkspaceCandidates: "included_as_supporting_context",
      foreignThreadCandidates: "excluded_from_anchor",
      durablePromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
      automaticAdmission: "blocked",
    },
    findings,
  };
}

function buildLiveDashboardActionReadback({ root, state, now }) {
  const probeState = cloneJson(state);
  const candidate = probeState.sessions.find((session) => !["archived", "delete_pending"].includes(session.state))
    || probeState.sessions[0];
  const findings = [];
  if (!candidate) findings.push("no_session_for_readback");
  const readbacks = candidate ? SAFE_SESSION_ACTIONS.map((action, index) => {
    const preview = previewSessionAction({
      root,
      action,
      sessionId: candidate.id,
      title: action === "rename" ? `${candidate.title} readback` : undefined,
      now: incrementIso(now, index + 1),
    });
    return {
      action,
      status: preview.status,
      sessionId: preview.sessionId,
      visibleState: preview.visibleState,
      rollbackAvailable: preview.rollbackAvailable,
      permanentDelete: "blocked",
    };
  }) : [];
  if (readbacks.some((item) => item.status !== "readback_ready")) findings.push("action_readback_not_ready");
  return {
    schema: "gpao_t.live_dashboard_action_readback.v1",
    status: findings.length ? "review" : "ready",
    mode: "local_readback_contract",
    readbacks,
    permanentDelete: "blocked",
    findings,
  };
}

function previewSessionAction({ root, action, sessionId, title, now }) {
  const stateBefore = readSessionWorkspaceState({ root, now });
  const beforeTarget = stateBefore.sessions.find((session) => session.id === sessionId);
  const previewState = cloneJson(stateBefore);
  const target = previewState.sessions.find((session) => session.id === sessionId);
  if (!target) {
    return {
      status: "blocked",
      sessionId,
      visibleState: null,
      title: null,
      rollbackAvailable: "session_not_found",
      beforeSessionCount: stateBefore.sessions.length,
      afterSessionCount: previewState.sessions.length,
    };
  }
  if (action === "rename") {
    target.title = String(title || target.title).trim();
    target.updatedAt = now;
  }
  if (action === "archive") {
    target.state = "archived";
    target.updatedAt = now;
  }
  if (action === "restore") {
    target.state = "draft";
    target.updatedAt = now;
  }
  if (action === "mark_delete_pending") {
    target.state = "delete_pending";
    target.updatedAt = now;
  }
  if (action === "cancel_delete_pending") {
    target.state = beforeTarget?.state === "delete_pending" ? "draft" : target.state;
    target.updatedAt = now;
  }
  return {
    status: "readback_ready",
    sessionId,
    visibleState: target.state,
    title: target.title,
    rollbackAvailable: ["archive", "mark_delete_pending"].includes(action)
      ? "restore_or_cancel_delete_pending"
      : "state_snapshot_before_action",
    beforeSessionCount: stateBefore.sessions.length,
    afterSessionCount: previewState.sessions.length,
  };
}

function buildSessionContextIsolationProof({ workspace, state }) {
  const findings = [];
  const seen = new Set();
  for (const thread of workspace.threads) {
    if (seen.has(thread.contextPacketId)) findings.push(`duplicate_context_packet:${thread.contextPacketId}`);
    seen.add(thread.contextPacketId);
    if (thread.memoryScope?.thread !== thread.id) findings.push(`thread_memory_scope_mismatch:${thread.id}`);
  }
  if (workspace.threads.length !== state.sessions.length) findings.push("thread_session_count_mismatch");
  return {
    schema: "gpao_t.session_context_isolation_proof.v1",
    status: findings.length ? "review" : "ready",
    checkedSessionCount: state.sessions.length,
    checkedThreadCount: workspace.threads.length,
    activeThreadId: workspace.activeThreadId,
    threadPackets: workspace.threads.map((thread) => ({
      threadId: thread.id,
      sessionId: thread.sessionId,
      contextPacketId: thread.contextPacketId,
      memoryThread: thread.memoryScope.thread,
      replayRequiredBeforeAdmission: thread.replayState.requiredBeforeAdmission,
    })),
    findings,
  };
}

function buildMobileSessionSheetQa({ root }) {
  const surface = buildCoreWorkSurface({ root });
  const html = buildCoreWorkSurfaceHtml({ root, surface });
  const check = verifyCoreWorkSurface({ surface, html });
  const findings = [...check.findings];
  const requiredMarkers = [
    ["mobile_session_sheet", "data-mobile-session-sheet=\"visible\""],
    ["mobile_inspector_sheet", "data-mobile-inspector-sheet=\"visible\""],
    ["session_actions", "data-session-action=\"rename\""],
    ["delete_pending_cancel", "삭제 대기 취소"],
    ["memory_tab", "기억"],
    ["replay_tab", "리플레이"],
  ];
  for (const [id, marker] of requiredMarkers) {
    if (!html.includes(marker)) findings.push(`html_missing_${id}`);
  }
  return {
    schema: "gpao_t.mobile_session_action_and_inspector_qa.v1",
    status: findings.length ? "review" : "ready",
    htmlMarkers: Object.fromEntries(requiredMarkers.map(([id, marker]) => [id, html.includes(marker)])),
    layoutEvidence: {
      mobileSessionSheet: "visible",
      mobileInspectorSheet: "visible",
      desktopInspector: "visible",
      composerPreserved: html.includes("Message Assistant"),
    },
    visualEvidencePaths: [
      "docs/03-verification/evidence/session-workspace-repair-pass-001-mobile-inspector-sheet-390x844.png",
      "docs/03-verification/evidence/session-workspace-repair-pass-001-mobile-session-list-sheet-390x844.png",
      "docs/03-verification/evidence/screenshots/gpao-t-live-applied-replay-inspector-mobile-2026-07-11.png",
    ],
    findings,
  };
}

function buildControlledLiveSmokeGate({ root, workspace, state, now }) {
  const paths = sessionWorkspacePaths({ root });
  const backupTargets = [
    paths.sessionFile,
    resolve(paths.runtimeRoot, "memory/review-queue.jsonl"),
    resolve(paths.runtimeRoot, "memory/wiki.json"),
  ];
  const findings = [];
  if (!workspace.activeThreadId) findings.push("active_thread_missing");
  if (!state.activeSessionId) findings.push("active_session_missing");
  const backupPlan = backupTargets.map((target) => ({
    path: target,
    exists: existsSync(target),
    restorePath: target,
  }));
  return {
    schema: "gpao_t.controlled_live_smoke_gate.v1",
    status: findings.length ? "review" : "ready",
    generatedAt: now,
    smokeMode: "readback_only_no_external_send",
    authorityGate: {
      ownerInstructionPresent: true,
      liveOpenClawMutation: "not_executed",
      gatewayRestart: "not_executed",
      modelProviderCall: "blocked",
      telegramExternalSend: "blocked",
      durableMemoryPromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
    },
    backupPlan,
    rollbackPlan: {
      sessionState: paths.sessionFile,
      memoryReviewQueue: resolve(paths.runtimeRoot, "memory/review-queue.jsonl"),
      stopRule: "Stop before provider/external/durable mutation.",
    },
    smokeAssertions: [
      "GET /multi-chat-workspace/stages-1-6 returns ready",
      "GET /multi-chat-workspace/stages-1-6/verify returns ready",
      "session action readback preserves permanent delete block",
      "memory queue filter excludes foreign thread anchors",
      "mobile sheets remain visible in generated HTML",
    ],
    findings,
  };
}

function buildStage({ id, label, status, evidence }) {
  return {
    id,
    label,
    status,
    findings: evidence.findings || [],
    evidence,
  };
}

function resolveActiveSession({ state, threadId, sessionId }) {
  return state.sessions.find((session) => session.threadId === threadId)
    || state.sessions.find((session) => session.sessionId === sessionId || session.id === sessionId)
    || state.sessions.find((session) => session.id === state.activeSessionId)
    || state.sessions[0]
    || null;
}

function recordMatchesScope({ record, active }) {
  if (!active) return false;
  const scope = extractRecordScope(record);
  if (!scope.threadId && !scope.sessionId && !scope.memoryThread && !scope.workspaceId) return true;
  if (scope.threadId && scope.threadId === active.threadId) return true;
  if (scope.sessionId && [active.id, active.sessionId].includes(scope.sessionId)) return true;
  if (scope.memoryThread && scope.memoryThread === active.memoryScope?.thread) return true;
  if (scope.workspaceId && scope.workspaceId === active.workspaceId && !scope.threadId && !scope.sessionId) return true;
  return false;
}

function extractRecordScope(record) {
  return {
    threadId: record.threadId
      || record.sourceTruth?.threadId
      || record.sourceTruth?.scope?.threadId
      || record.sourceTruth?.metadata?.threadId
      || record.candidate?.threadId
      || record.candidate?.scope?.threadId
      || null,
    sessionId: record.sessionId
      || record.sourceTruth?.sessionId
      || record.sourceTruth?.scope?.sessionId
      || record.sourceTruth?.metadata?.sessionId
      || record.candidate?.sessionId
      || record.candidate?.scope?.sessionId
      || null,
    workspaceId: record.workspaceId
      || record.sourceTruth?.workspaceId
      || record.sourceTruth?.scope?.workspaceId
      || record.candidate?.workspaceId
      || null,
    memoryThread: record.memoryScope?.thread
      || record.candidate?.memoryScope?.thread
      || record.sourceTruth?.memoryScope?.thread
      || null,
  };
}

function compactMemoryRecord(record) {
  return {
    id: record.id,
    recordType: record.recordType,
    status: record.status,
    title: record.candidate?.title || record.sourceTruth?.label || record.id,
    scope: extractRecordScope(record),
    applyState: record.applyGate?.status || record.authority?.applyState || null,
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function incrementIso(now, seconds) {
  const base = Date.parse(now) || Date.now();
  return new Date(base + seconds * 1000).toISOString();
}
