const CRITICAL_CATEGORIES = new Set(["runtime", "worker", "state_integrity", "heartbeat"]);

function item({ category, status = "ok", title, detail, nextAction = "none", evidence = {}, autoRetry = false }) {
  return {
    schema: "gpao_t3.recovery_item.v1",
    category,
    status,
    title,
    detail,
    nextAction,
    autoRetry,
    evidence
  };
}

function providerRecovery(provider = {}) {
  const providers = Array.isArray(provider.providers) ? provider.providers : [];
  const external = providers.filter(entry => !["local-model", "gpao-t-emulator"].includes(entry.id));
  const connected = external.filter(entry => entry.auth?.state === "configured" && entry.health?.state === "ready");
  const blocked = external.filter(entry => ["unavailable", "degraded"].includes(entry.health?.state));
  const needsConnection = external.filter(entry => entry.auth?.state === "auth_required" || entry.auth?.state === "not_configured");
  if (connected.length) {
    return item({
      category: "model_auth",
      title: "AI 연결 사용 가능",
      detail: `${connected[0].display?.name || connected[0].id} 연결을 사용할 수 있습니다.`,
      evidence: { connected: connected.length, checked: external.length }
    });
  }
  return item({
    category: "model_auth",
    status: blocked.length ? "blocked" : "review",
    title: blocked.length ? "AI 연결 복구 필요" : "AI 연결 확인 필요",
    detail: blocked.length ? "일부 AI 연결은 다시 인증하거나 상태를 확인해야 합니다." : "외부 AI 계정은 아직 연결되지 않았고 로컬 모델만 사용할 수 있습니다.",
    nextAction: "open_connection_center",
    evidence: { blocked: blocked.length, needsConnection: needsConnection.length, checked: external.length }
  });
}

function connectionCellRecovery(connectionCells = {}) {
  const cells = Array.isArray(connectionCells.cells) ? connectionCells.cells : [];
  const needsReview = cells.filter(cell => ["needs_setup_review", "degraded", "unavailable"].includes(cell.seamlessState));
  const approvalRequired = cells.filter(cell => cell.seamlessState === "approval_required");
  if (!needsReview.length) {
    return item({
      category: "tool_channel",
      title: "도구와 채널 상태 확인됨",
      detail: approvalRequired.length ? "쓰기, 전송, 외부 실행은 승인 후에만 진행됩니다." : "읽기 도구는 바로 사용할 수 있습니다.",
      nextAction: approvalRequired.length ? "request_explicit_approval_before_external_action" : "none",
      evidence: { cells: cells.length, approvalRequired: approvalRequired.length }
    });
  }
  return item({
    category: "tool_channel",
    status: "review",
    title: "도구 연결 검토 필요",
    detail: "설정 검토나 상태 확인이 필요한 도구가 있습니다. 외부 전송과 쓰기는 자동 실행하지 않습니다.",
    nextAction: "open_connection_center",
    evidence: { cells: cells.length, needsReview: needsReview.map(cell => cell.id) }
  });
}

function memoryRecovery(contextInfluence = {}) {
  if (contextInfluence.durableMemoryPromotion === true) {
    return item({
      category: "memory_growth",
      status: "blocked",
      title: "기억 승격 경계 확인 필요",
      detail: "검토 없이 기억이 오래 남는 상태로 승격될 수 있어 먼저 차단해야 합니다.",
      nextAction: "disable_durable_memory_promotion",
      evidence: { durableMemoryPromotion: true }
    });
  }
  return item({
    category: "memory_growth",
    title: "기억 영향 경계 정상",
    detail: contextInfluence.activeCount > 0 ? "승인된 영향은 장부에서 확인하고 되돌릴 수 있습니다." : "승인 전 기억은 답변 기준으로 쓰지 않습니다.",
    nextAction: contextInfluence.activeCount > 0 ? "open_memory_ledger" : "none",
    evidence: {
      activeCount: contextInfluence.activeCount || 0,
      rolledBackCount: contextInfluence.rolledBackCount || 0,
      durableMemoryPromotion: false
    }
  });
}

function localDashboardRecovery(localSessions = {}) {
  const active = Array.isArray(localSessions.active) ? localSessions.active.length : 0;
  return item({
    category: "browser_dashboard",
    status: active ? "ok" : "review",
    title: active ? "대시보드 세션 정상" : "대시보드 세션 확인 필요",
    detail: active ? "현재 로컬 대시보드 세션이 유효합니다." : "브라우저가 열려 있지 않으면 대시보드를 다시 열어 세션을 갱신하세요.",
    nextAction: active ? "none" : "open_local_dashboard",
    evidence: { activeSessions: active }
  });
}

function updateRecovery(releaseState = {}) {
  const hasRollback = Boolean(releaseState.rollbackReady || releaseState.lastSnapshot || releaseState.currentVersion);
  return item({
    category: "update_rollback",
    status: hasRollback ? "ok" : "review",
    title: hasRollback ? "업데이트 복구 기준 확인됨" : "업데이트/롤백은 다음 단계 검증 필요",
    detail: hasRollback ? "업데이트 상태와 롤백 기준을 확인할 수 있습니다." : "F8에서 clean install, update, rollback을 실제로 검증해야 합니다.",
    nextAction: hasRollback ? "none" : "continue_to_distribution_gate",
    evidence: {
      currentVersion: releaseState.currentVersion || null,
      rollbackReady: Boolean(releaseState.rollbackReady)
    }
  });
}

export function buildRecoveryReport({
  health = {},
  provider = {},
  connectionCells = {},
  integrity = {},
  worker = false,
  localSessions = {},
  contextInfluence = {},
  releaseState = {}
} = {}) {
  const items = [
    item({
      category: "runtime",
      status: health.status === "ready" ? "ok" : "blocked",
      title: health.status === "ready" ? "런타임 정상" : "런타임 확인 필요",
      detail: health.status === "ready" ? "요청을 받을 준비가 되어 있습니다." : "현재 요청을 안전하게 받을 수 없습니다.",
      nextAction: health.status === "ready" ? "none" : "restart_runtime_or_run_doctor",
      evidence: { status: health.status || "unknown", state: health.state || "unknown" }
    }),
    item({
      category: "worker",
      status: worker && health.workerStatus === "ready" ? "ok" : "blocked",
      title: worker && health.workerStatus === "ready" ? "작업자 정상" : "작업자 복구 필요",
      detail: worker && health.workerStatus === "ready" ? "백그라운드 작업자가 응답할 수 있습니다." : "작업자 상태가 불안정합니다. 자동 반복 대신 재시작과 상태 확인이 필요합니다.",
      nextAction: worker && health.workerStatus === "ready" ? "none" : "restart_runtime_or_wait_for_worker_recovery",
      evidence: { workerStatus: health.workerStatus || "unknown", workerCrashAttempts: health.workerCrashAttempts || 0 }
    }),
    item({
      category: "state_integrity",
      status: integrity.ok ? "ok" : "blocked",
      title: integrity.ok ? "기록 무결성 정상" : "기록 무결성 확인 필요",
      detail: integrity.ok ? "저장된 이벤트와 상태 기록을 읽을 수 있습니다." : "스냅샷 또는 마지막 정상 상태로 복구하기 전까지 새 실행을 줄여야 합니다.",
      nextAction: integrity.ok ? "none" : "restore_last_verified_snapshot",
      evidence: { ok: Boolean(integrity.ok) }
    }),
    providerRecovery(provider),
    connectionCellRecovery(connectionCells),
    memoryRecovery(contextInfluence),
    localDashboardRecovery(localSessions),
    updateRecovery(releaseState),
    item({
      category: "port_local",
      status: health.ownerTokenMode === "0600" || health.status === "ready" ? "ok" : "review",
      title: "로컬 접근 경계 확인",
      detail: "대시보드 작업은 로컬 세션 또는 소유자 인증 경계 안에서만 허용됩니다.",
      nextAction: "keep_local_only_boundary",
      evidence: { stateWriterStatus: health.stateWriterStatus || "unknown", localAuthorityMode: health.ownerTokenMode === "0600" ? "local_owner_only" : "unknown" }
    }),
    item({
      category: "heartbeat",
      status: health.status === "ready" && health.stateWriterStatus === "ready" ? "ok" : "blocked",
      title: health.status === "ready" && health.stateWriterStatus === "ready" ? "상태 심박 정상" : "상태 심박 확인 필요",
      detail: health.status === "ready" && health.stateWriterStatus === "ready" ? "런타임, 기록기, 작업자 상태가 Doctor에 보고됩니다." : "상태 기록기가 불안정하면 새 실행보다 복구 확인이 먼저입니다.",
      nextAction: health.status === "ready" && health.stateWriterStatus === "ready" ? "none" : "run_doctor_before_new_work",
      evidence: { readyAt: health.readyAt || null, stateWriterStatus: health.stateWriterStatus || "unknown" }
    })
  ];
  const blocked = items.filter(entry => entry.status === "blocked");
  const review = items.filter(entry => entry.status === "review");
  const criticalBlocked = blocked.filter(entry => CRITICAL_CATEGORIES.has(entry.category));
  const status = criticalBlocked.length ? "blocked" : (blocked.length || review.length ? "review" : "ready");
  const nextActions = items.filter(entry => entry.nextAction !== "none").map(entry => ({
    category: entry.category,
    title: entry.title,
    action: entry.nextAction
  }));
  return {
    schema: "gpao_t3.recovery_report.v1",
    status,
    summary: {
      total: items.length,
      ok: items.filter(entry => entry.status === "ok").length,
      review: review.length,
      blocked: blocked.length,
      criticalBlocked: criticalBlocked.length
    },
    noAutomaticRetryForUnknownOutcome: true,
    unknownOutcomePolicy: "reconcile_before_retry",
    items,
    nextActions
  };
}
