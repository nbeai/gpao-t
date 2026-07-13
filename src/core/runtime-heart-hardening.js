import { buildDoctorRecoveryHeart, verifyDoctorRecoveryHeart } from "./doctor-recovery-heart.js";
import {
  buildProviderAuthRepairPlan,
  inspectProviderAuthStores,
  verifyProviderAuthHeart,
} from "./provider-auth-heart.js";
import { buildSessionEventHeart, verifySessionEventHeart } from "./session-event-heart.js";
import { buildMemoryContextHeart, verifyMemoryContextHeart } from "./memory-context-heart.js";
import { buildToolAuthorityHeart, verifyToolAuthorityHeart } from "./tool-authority-heart.js";
import { runDoctor } from "./doctor.js";

const SCHEMA = "gpao_t.runtime_heart_hardening.v1";

export function buildRuntimeHeartHardening({
  root,
  installHealth,
  stateDir,
  legacyStateDir,
  now = new Date().toISOString(),
} = {}) {
  const providerAuthInventory = inspectProviderAuthStores({ stateDir, legacyStateDir });
  const providerAuthRepairPlan = buildProviderAuthRepairPlan({ inventory: providerAuthInventory });
  const providerAuthVerification = verifyProviderAuthHeart({
    inventory: providerAuthInventory,
    repairPlan: providerAuthRepairPlan,
  });
  const doctorRecovery = buildDoctorRecoveryHeart({
    sourceDoctor: runDoctor({ root }),
    installHealth,
    providerAuthInventory,
    providerAuthRepairPlan,
    now,
  });
  const sessionEvent = buildSessionEventHeart({ root, now });
  const memoryContext = buildMemoryContextHeart({ root, now });
  const toolAuthority = buildToolAuthorityHeart({ root, now });
  const hearts = {
    providerAuth: {
      status: providerAuthVerification.status,
      completionClaimAllowed: providerAuthVerification.completionClaimAllowed,
      inventoryStatus: providerAuthInventory.status,
      repairPlanStatus: providerAuthRepairPlan.status,
    },
    doctorRecovery,
    sessionEvent,
    memoryContext,
    toolAuthority,
  };
  const verifications = {
    providerAuth: providerAuthVerification,
    doctorRecovery: verifyDoctorRecoveryHeart({ heart: doctorRecovery }),
    sessionEvent: verifySessionEventHeart({ heart: sessionEvent }),
    memoryContext: verifyMemoryContextHeart({ heart: memoryContext }),
    toolAuthority: verifyToolAuthorityHeart({ heart: toolAuthority }),
  };
  const observations = buildObservations({ hearts, verifications });
  const severity = highestSeverity(observations);
  return {
    schema: `${SCHEMA}.summary`,
    generatedAt: now,
    status: severity === "P0" ? "blocked" : severity === "P1" || severity === "P2" ? "review" : "ready",
    severity,
    userVisibleStatus: buildUserVisibleStatus(observations),
    hearts,
    verifications,
    observations,
    completionClaimAllowed: false,
    completionClaimReason:
      "Runtime Heart completion requires five source gates, live health, fresh chat, UI readback, and log-window evidence.",
    nextSafeAction: severity === "P0"
      ? "Fix blocked Runtime Heart findings before live hardening continues."
      : "Run live browser/API/log evidence and close remaining install integrity review items.",
  };
}

export function verifyRuntimeHeartHardening({
  hardening = buildRuntimeHeartHardening(),
} = {}) {
  const findings = [];
  if (hardening.schema !== `${SCHEMA}.summary`) findings.push("invalid_runtime_heart_schema");
  if (hardening.completionClaimAllowed !== false) findings.push("completion_gate_open");
  for (const [id, verification] of Object.entries(hardening.verifications || {})) {
    if (!["ready", "passed"].includes(verification.status)) findings.push(`${id}_verification_not_ready`);
  }
  if (hardening.hearts?.providerAuth?.completionClaimAllowed !== false) {
    findings.push("provider_auth_completion_gate_open");
  }
  if (hardening.hearts?.doctorRecovery?.completionClaimAllowed !== false) {
    findings.push("doctor_recovery_completion_gate_open");
  }
  if (hardening.hearts?.sessionEvent?.completionClaimAllowed !== false) {
    findings.push("session_event_completion_gate_open");
  }
  if (hardening.hearts?.memoryContext?.completionClaimAllowed !== false) {
    findings.push("memory_context_completion_gate_open");
  }
  if (hardening.hearts?.toolAuthority?.completionClaimAllowed !== false) {
    findings.push("tool_authority_completion_gate_open");
  }
  return {
    schema: `${SCHEMA}.verification`,
    status: findings.length ? "blocked" : "ready",
    findings,
    observedHeartStatuses: {
      providerAuth: hardening.hearts?.providerAuth?.status,
      doctorRecovery: hardening.hearts?.doctorRecovery?.status,
      sessionEvent: hardening.hearts?.sessionEvent?.status,
      memoryContext: hardening.hearts?.memoryContext?.status,
      toolAuthority: hardening.hearts?.toolAuthority?.status,
    },
    completionClaimAllowed: false,
    nextSafeAction: findings.length
      ? "Repair Runtime Heart verification findings."
      : "Proceed to live evidence pass and distribution drift decision.",
  };
}

function buildObservations({ hearts, verifications }) {
  return [
    {
      id: verifications.providerAuth.status === "ready" ? "provider_auth_gate_ready" : "provider_auth_gate_blocked",
      severity: verifications.providerAuth.status === "ready" ? "info" : "P0",
      ok: verifications.providerAuth.status === "ready",
      userLabel: "모델 연결 Heart",
      userMessage: "GPAO-T 모델 연결 저장소와 복구 계획 기준을 확인했습니다.",
    },
    heartObservation("doctor_recovery_gate", hearts.doctorRecovery),
    heartObservation("session_event_gate", hearts.sessionEvent),
    heartObservation("memory_context_gate", hearts.memoryContext),
    heartObservation("tool_authority_gate", hearts.toolAuthority),
  ];
}

function heartObservation(prefix, heart) {
  return {
    id: `${prefix}_${heart.status}`,
    severity: heart.status === "blocked" ? "P0" : heart.status === "review" ? heart.severity || "P1" : "info",
    ok: heart.status !== "blocked",
    userLabel: heart.userVisibleStatus?.label || prefix,
    userMessage: heart.userVisibleStatus?.message || "Runtime Heart 상태를 확인했습니다.",
  };
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
    label: "Runtime Heart 기본 상태 정상",
    message: "GPAO-T의 모델 연결, 진단/복구, 세션, 메모리, 도구 권한 Heart가 소스 기준으로 확인되었습니다.",
  };
}
