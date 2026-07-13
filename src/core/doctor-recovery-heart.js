const SCHEMA = "gpao_t.doctor_recovery_heart.v1";

export function buildDoctorRecoveryHeart({
  sourceDoctor,
  installHealth,
  providerAuthInventory,
  providerAuthRepairPlan,
  now = new Date().toISOString(),
} = {}) {
  const observations = [
    ...classifySourceDoctor(sourceDoctor),
    ...classifyInstallHealth(installHealth),
    ...classifyProviderAuth({ providerAuthInventory, providerAuthRepairPlan }),
  ];
  const severity = highestSeverity(observations);
  const blocked = observations.filter((item) => item.severity === "P0");
  const review = observations.filter((item) => item.severity === "P1" || item.severity === "P2");

  return {
    schema: `${SCHEMA}.summary`,
    generatedAt: now,
    status: blocked.length ? "blocked" : review.length ? "review" : "ready",
    userVisibleStatus: buildUserVisibleStatus({ blocked, review }),
    severity,
    observations,
    recoveryPlan: buildRecoveryPlan(observations),
    completionClaimAllowed: false,
    completionClaimReason:
      "Doctor/Recovery Heart completion requires runtime health, install integrity, provider/auth, fresh chat, and log-window evidence.",
    nextSafeAction: blocked.length
      ? "Fix P0 runtime blockers before claiming GPAO-T is healthy."
      : review.length
        ? "Resolve or explicitly classify review findings before a clean live/install seal."
        : "Run fresh chat and log-window evidence before any completion claim.",
  };
}

export function verifyDoctorRecoveryHeart({
  heart = buildDoctorRecoveryHeart(),
} = {}) {
  const findings = [];
  const ids = new Set((heart.observations || []).map((item) => item.id));

  if (heart.schema !== `${SCHEMA}.summary`) findings.push("invalid_doctor_recovery_schema");
  if (heart.completionClaimAllowed !== false) findings.push("completion_gate_open");
  if (!Array.isArray(heart.observations)) findings.push("observations_missing");
  if (!Array.isArray(heart.recoveryPlan?.actions)) findings.push("recovery_actions_missing");
  if (heart.recoveryPlan?.authorityBoundary?.dangerousRepairRequiresApproval !== true) {
    findings.push("dangerous_repair_authority_gate_missing");
  }
  if (!ids.has("provider_auth_completion_requires_fresh_chat")) {
    findings.push("provider_auth_fresh_chat_observation_missing");
  }
  if (heart.userVisibleStatus?.language !== "gpao_t_user_safe") findings.push("user_safe_language_missing");

  return {
    schema: `${SCHEMA}.verification`,
    status: findings.length ? "blocked" : "ready",
    findings,
    observedIds: [...ids].sort(),
    completionClaimAllowed: false,
    nextSafeAction: findings.length
      ? "Repair the Doctor/Recovery Heart summary contract."
      : "Wire this summary into live doctor/health evidence and continue recovery hardening.",
  };
}

function classifySourceDoctor(sourceDoctor) {
  if (!sourceDoctor) return [];
  if (sourceDoctor.status === "ready") {
    return [{
      id: "source_doctor_ready",
      severity: "info",
      ok: true,
      userLabel: "소스 기본 점검 통과",
      userMessage: "GPAO-T 소스의 필수 파일 구조는 확인되었습니다.",
    }];
  }
  return [{
    id: "source_doctor_blocked",
    severity: "P0",
    ok: false,
    userLabel: "소스 기본 파일 누락",
    userMessage: "GPAO-T 실행에 필요한 기본 파일이 누락되어 먼저 복구해야 합니다.",
    details: { missing: sourceDoctor.missing || [] },
  }];
}

function classifyInstallHealth(installHealth) {
  if (!installHealth?.checks) return [];
  const observations = [];
  for (const check of installHealth.checks) {
    if (check.id === "distribution" && check.ok === false) {
      observations.push({
        id: "install_integrity_drift",
        severity: "P1",
        ok: false,
        userLabel: "설치 무결성 검토 필요",
        userMessage: "현재 설치된 GPAO-T 파일이 배포 manifest와 일부 다릅니다. 실행은 될 수 있지만 깨끗한 설치 봉인은 아닙니다.",
        technicalReason: check.reason,
      });
    }
    if (check.id === "health" && check.ok === true) {
      observations.push({
        id: "service_health_ok",
        severity: "info",
        ok: true,
        userLabel: "로컬 서비스 응답 정상",
        userMessage: "GPAO-T 로컬 서비스가 health 요청에 응답했습니다.",
      });
    }
    if (check.id === "health" && check.ok === false) {
      const sandbox = String(check.reason || "").includes("EPERM");
      observations.push({
        id: sandbox ? "loopback_blocked_by_sandbox" : "service_health_unreachable",
        severity: sandbox ? "P2" : "P0",
        ok: false,
        userLabel: sandbox ? "검증 환경 제한" : "로컬 서비스 응답 실패",
        userMessage: sandbox
          ? "현재 검증 환경이 localhost 접근을 막았습니다. 비샌드박스 검증으로 다시 확인해야 합니다."
          : "GPAO-T 로컬 서비스가 health 요청에 응답하지 않았습니다.",
        technicalReason: check.reason,
      });
    }
    if (check.id === "provider-auth-heart") {
      observations.push({
        id: check.ok ? "provider_auth_heart_ready" : "provider_auth_heart_needs_repair",
        severity: check.ok ? "info" : "P0",
        ok: check.ok,
        userLabel: check.userVisibleState?.label || "모델 연결 상태",
        userMessage: check.userVisibleState?.message || "GPAO-T 모델 연결 상태를 확인했습니다.",
        details: {
          inventoryStatus: check.inventoryStatus,
          repairPlanStatus: check.repairPlanStatus,
        },
      });
    }
  }
  return observations;
}

function classifyProviderAuth({ providerAuthInventory, providerAuthRepairPlan }) {
  const observations = [{
    id: "provider_auth_completion_requires_fresh_chat",
    severity: "P1",
    ok: false,
    userLabel: "새 대화 검증 필요",
    userMessage: "모델 연결 저장소가 정상 후보여도, 실제 새 대화가 성공하고 로그 오류가 없어야 완료라고 말할 수 있습니다.",
  }];
  if (!providerAuthInventory) return observations;
  observations.push({
    id: providerAuthInventory.status === "ready" ? "provider_auth_inventory_ready" : "provider_auth_inventory_repair_required",
    severity: providerAuthInventory.status === "ready" ? "info" : "P0",
    ok: providerAuthInventory.status === "ready",
    userLabel: providerAuthInventory.userVisibleState?.label || "모델 연결 저장소",
    userMessage: providerAuthInventory.userVisibleState?.message || "GPAO-T 모델 연결 저장소를 확인했습니다.",
    details: {
      inventoryStatus: providerAuthInventory.status,
      repairPlanStatus: providerAuthRepairPlan?.status || null,
    },
  });
  return observations;
}

function highestSeverity(observations) {
  const order = ["P0", "P1", "P2", "info"];
  return order.find((severity) => observations.some((item) => item.severity === severity)) || "info";
}

function buildUserVisibleStatus({ blocked, review }) {
  if (blocked.length) {
    return {
      language: "gpao_t_user_safe",
      label: "복구 필요",
      message: blocked[0].userMessage,
    };
  }
  if (review.length) {
    return {
      language: "gpao_t_user_safe",
      label: "검토 필요",
      message: review[0].userMessage,
    };
  }
  return {
    language: "gpao_t_user_safe",
    label: "기본 상태 정상",
    message: "GPAO-T의 기본 런타임 상태가 정상 후보입니다. 완료 판단에는 새 대화와 로그 검증이 더 필요합니다.",
  };
}

function buildRecoveryPlan(observations) {
  const actions = [];
  if (observations.some((item) => item.id === "install_integrity_drift")) {
    actions.push({
      id: "rebuild_or_reinstall_from_canonical_distribution",
      authority: "local_repair_with_receipt",
      userLabel: "배포본 기준 재설치 또는 manifest 재봉인",
      safeDefault: "diagnose_first",
    });
  }
  if (observations.some((item) => item.id === "service_health_unreachable")) {
    actions.push({
      id: "restart_local_service_after_backup",
      authority: "local_service_repair",
      userLabel: "로컬 서비스 재시작",
      safeDefault: "backup_then_restart",
    });
  }
  if (observations.some((item) => item.id === "loopback_blocked_by_sandbox")) {
    actions.push({
      id: "rerun_health_outside_sandbox",
      authority: "read_only_verification",
      userLabel: "비샌드박스 health 재검증",
      safeDefault: "verify_only",
    });
  }
  if (observations.some((item) => item.id === "provider_auth_inventory_repair_required")) {
    actions.push({
      id: "run_provider_auth_repair_plan",
      authority: "secret_safe_local_repair",
      userLabel: "모델 연결 저장소 복구",
      safeDefault: "backup_then_apply_gate",
    });
  }
  actions.push({
    id: "fresh_chat_and_log_window_verification",
    authority: "read_only_or_user_visible_smoke",
    userLabel: "새 대화와 오류 로그 확인",
    safeDefault: "required_before_completion",
  });

  return {
    schema: `${SCHEMA}.recovery_plan`,
    actions,
    authorityBoundary: {
      dangerousRepairRequiresApproval: true,
      secretValuesMustNotBePrinted: true,
      health200CannotCloseRecovery: true,
    },
  };
}
