import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SCHEMA = "gpao_t.provider_auth_heart.v1";
const DEFAULT_AGENT_ID = "main";

export function buildProviderAuthHeartContract({
  stateDir = process.env.GPAO_T_STATE_DIR || join(homedir(), ".gpao-t"),
  legacyStateDir = process.env.OPENCLAW_STATE_DIR || join(homedir(), ".openclaw"),
  agentId = DEFAULT_AGENT_ID,
} = {}) {
  const agentStoreDir = join(stateDir, "agents", agentId, "agent");
  const legacyAgentStoreDir = join(legacyStateDir, "agents", agentId, "agent");
  const canonicalStore = join(agentStoreDir, "gpao-t-agent.sqlite");
  const runtimeCompatibilityStore = join(agentStoreDir, "openclaw-agent.sqlite");
  const compatibilityStores = [
    runtimeCompatibilityStore,
    join(legacyAgentStoreDir, "openclaw-agent.sqlite"),
  ];

  return {
    schema: "gpao_t.provider_auth_heart_contract.v1",
    status: "ready",
    agentId,
    stateDir,
    legacyStateDir,
    canonicalStateRoot: stateDir,
    canonicalStore,
    activeRuntimeStore: canonicalStore,
    runtimeCompatibilityStore,
    productNamedMirror: canonicalStore,
    compatibilityStores,
    productBoundary: {
      userFacingName: "GPAO-T",
      comparisonProductName: "OpenClaw",
      openClawVisibleToUser: false,
      openClawAllowedOnlyAsInternalCompatibilityReference: true,
    },
    invariants: {
      canonicalStateRootIsGpaoT: true,
      canonicalStoreNameIsGpaoT: true,
      activeCompatibilityFilenameIsInternalOnly: true,
      runtimeCompatibilityStoreIsMirrorOnly: true,
      productNamedMirrorIsRuntimeAuthority: true,
      compatibilityStoreNamesAreNotProductIdentity: true,
      repairMustNotPrintSecrets: true,
      freshChatRequiredAfterRepair: true,
      health200IsNotCompletion: true,
    },
    nextSafeAction:
      "Inspect the canonical GPAO-T auth store and compatibility mirrors without reading secret values.",
  };
}

export function inspectProviderAuthStores({
  stateDir,
  legacyStateDir,
  agentId = DEFAULT_AGENT_ID,
  now = new Date().toISOString(),
} = {}) {
  const contract = buildProviderAuthHeartContract({ stateDir, legacyStateDir, agentId });
  const canonical = statStore(contract.activeRuntimeStore, "active_runtime");
  const productMirror = statStore(contract.productNamedMirror, "product_named_mirror");
  const runtimeCompatibility = statStore(contract.runtimeCompatibilityStore, "runtime_compatibility_mirror");
  const compatibility = contract.compatibilityStores.map((store) => statStore(store, "compatibility"));
  const usableCompatibility = compatibility.filter((store) => store.exists && store.size > 0);
  const findings = [];

  if (!canonical.exists) findings.push("active_auth_store_missing");
  if (canonical.exists && canonical.size === 0) findings.push("active_auth_store_empty");
  if (!usableCompatibility.length) findings.push("compatibility_auth_store_missing_or_empty");
  if (!canonical.exists && usableCompatibility.length) findings.push("repairable_from_compatibility_store");
  if (canonical.exists && canonical.size > 0 && runtimeCompatibility.exists && runtimeCompatibility.size !== canonical.size) {
    findings.push("runtime_compatibility_mirror_stale_after_runtime_activity");
  }

  const repairRequired = findings.some((finding) => [
    "active_auth_store_missing",
    "active_auth_store_empty",
    "repairable_from_compatibility_store",
  ].includes(finding));

  return {
    schema: `${SCHEMA}.inventory`,
    generatedAt: now,
    status: repairRequired ? "repair_required" : "ready",
    contract,
    stores: {
      canonical,
      activeRuntime: canonical,
      productMirror,
      runtimeCompatibility,
      compatibility,
    },
    secretSafety: {
      readsSecretValues: false,
      recordsSecretValues: false,
      evidenceContainsOnlyPathPresenceSizeAndMtime: true,
    },
    findings,
    userVisibleState: buildProviderAuthUserState({ findings, canonical, usableCompatibility }),
    nextSafeAction: repairRequired
      ? "Run a gated repair/migration path, then verify health, dashboard, fresh chat, and logs."
      : "Keep the provider/auth store aligned and verify fresh chat before completion claims.",
  };
}

export function buildProviderAuthRepairPlan({
  inventory = inspectProviderAuthStores(),
  now = new Date().toISOString(),
} = {}) {
  const actions = [];
  const canonical = inventory.stores?.canonical;
  const compatibility = inventory.stores?.compatibility || [];
  const source = compatibility.find((store) => store.exists && store.size > 0) || null;

  if (inventory.findings?.includes("active_auth_store_missing") && source) {
    actions.push({
      id: "copy_compatibility_store_to_canonical_gpao_t_store",
      status: "requires_apply_gate",
      from: source.path,
      to: canonical.path,
      secretHandling: "copy_file_without_printing_values",
    });
  }
  if (inventory.findings?.includes("active_auth_store_empty") && source) {
    actions.push({
      id: "replace_empty_canonical_gpao_t_store_from_compatibility",
      status: "requires_apply_gate",
      from: source.path,
      to: canonical.path,
      secretHandling: "copy_file_without_printing_values",
    });
  }
  if (canonical?.exists && canonical.size > 0 && inventory.stores?.runtimeCompatibility?.exists === false) {
    actions.push({
      id: "create_internal_runtime_compatibility_mirror",
      status: "requires_apply_gate",
      from: canonical.path,
      to: inventory.contract.runtimeCompatibilityStore,
      secretHandling: "copy_file_without_printing_values",
      userFacingMeaning: "GPAO-T canonical auth remains authoritative; compatibility mirror only supports the current bundled engine.",
    });
  }
  if (inventory.findings?.includes("runtime_compatibility_mirror_stale_after_runtime_activity")) {
    actions.push({
      id: "refresh_internal_runtime_compatibility_mirror",
      status: "requires_apply_gate",
      from: canonical.path,
      to: inventory.contract.runtimeCompatibilityStore,
      secretHandling: "copy_file_without_printing_values",
      userFacingMeaning: "GPAO-T canonical auth remains authoritative; compatibility mirror is refreshed for the bundled engine.",
    });
  }
  const verification = [
    "runtime_health",
    "dashboard_opens_without_manual_token",
    "provider_health_readback",
    "fresh_chat_turn",
    "gateway_error_log_window_no_new_missing_provider_auth",
  ];

  return {
    schema: `${SCHEMA}.repair_plan`,
    generatedAt: now,
    status: actions.length ? "repair_available" : "no_repair_needed",
    inventoryStatus: inventory.status,
    actions,
    requiredApplyGate: actions.some((action) => action.status === "requires_apply_gate"),
    forbiddenActions: [
      "print_api_key_or_oauth_token",
      "mark_complete_from_health_200_only",
      "overwrite_auth_store_without_backup",
      "show_openclaw_identity_in_user_surface",
    ],
    requiredVerificationAfterRepair: verification,
    userVisibleRecoveryMessage: buildProviderAuthRecoveryMessage({ inventory }),
    nextSafeAction: actions.length
      ? "Create a backup, apply the selected repair, restart if needed, then run the full user-experience verification bundle."
      : "No repair action is needed now; keep this check in install/reinstall completion gates.",
  };
}

export function verifyProviderAuthHeart({
  inventory = inspectProviderAuthStores(),
  repairPlan = buildProviderAuthRepairPlan({ inventory }),
} = {}) {
  const findings = [];

  if (inventory.schema !== `${SCHEMA}.inventory`) findings.push("invalid_inventory_schema");
  if (inventory.secretSafety?.readsSecretValues !== false) findings.push("secret_value_reading_open");
  if (inventory.secretSafety?.recordsSecretValues !== false) findings.push("secret_value_recording_open");
  if (inventory.contract?.productBoundary?.openClawVisibleToUser !== false) findings.push("openclaw_user_surface_open");
  if (inventory.contract?.canonicalStore !== inventory.contract?.productNamedMirror) findings.push("canonical_store_not_product_named");
  if (inventory.contract?.invariants?.canonicalStoreNameIsGpaoT !== true) findings.push("canonical_store_name_not_gpao_t");
  if (inventory.contract?.invariants?.runtimeCompatibilityStoreIsMirrorOnly !== true) {
    findings.push("runtime_compatibility_mirror_boundary_missing");
  }
  if (inventory.contract?.invariants?.freshChatRequiredAfterRepair !== true) findings.push("fresh_chat_gate_missing");
  if (inventory.contract?.invariants?.health200IsNotCompletion !== true) findings.push("health_only_completion_gate_open");
  if (repairPlan.forbiddenActions?.includes("print_api_key_or_oauth_token") !== true) findings.push("secret_print_forbidden_action_missing");
  if (repairPlan.requiredVerificationAfterRepair?.includes("fresh_chat_turn") !== true) findings.push("fresh_chat_repair_verification_missing");
  if (repairPlan.requiredVerificationAfterRepair?.includes("gateway_error_log_window_no_new_missing_provider_auth") !== true) {
    findings.push("post_repair_log_window_missing");
  }
  if (inventory.status === "repair_required" && repairPlan.status === "no_repair_needed") findings.push("repair_required_but_no_plan");

  return {
    schema: `${SCHEMA}.verification`,
    status: findings.length ? "blocked" : "ready",
    findings,
    inventoryStatus: inventory.status,
    repairPlanStatus: repairPlan.status,
    completionClaimAllowed: false,
    completionClaimReason:
      "Provider/Auth Heart completion still requires install/reinstall/repair scenario evidence, fresh chat, UI readback, and log review.",
    nextSafeAction: findings.length
      ? "Repair the Provider/Auth Heart contract before implementation."
      : "Use this contract as the first Provider/Auth Heart gate, then wire it into repair/install verification.",
  };
}

function statStore(path, role) {
  if (!existsSync(path)) {
    return {
      path,
      role,
      exists: false,
      size: 0,
      mtimeMs: null,
    };
  }
  const stat = statSync(path);
  return {
    path,
    role,
    exists: true,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    mode: (stat.mode & 0o777).toString(8).padStart(3, "0"),
  };
}

function buildProviderAuthUserState({ findings, canonical, usableCompatibility }) {
  if (!canonical.exists && usableCompatibility.length) {
    return {
      status: "needs_repair",
      label: "모델 연결 복구 필요",
      message: "GPAO-T의 모델 연결 정보가 호환 저장소에는 있지만 현재 실행 경로에는 연결되지 않았습니다.",
    };
  }
  if (!canonical.exists || canonical.size === 0) {
    return {
      status: "needs_setup",
      label: "모델 연결 설정 필요",
      message: "GPAO-T가 아직 사용할 수 있는 모델 연결 정보를 찾지 못했습니다.",
    };
  }
  return {
    status: "connected_candidate",
    label: "모델 연결 후보 정상",
    message: "GPAO-T의 모델 연결 저장소가 확인되었습니다. 완료 판단에는 실제 새 대화 응답 검증이 추가로 필요합니다.",
  };
}

function buildProviderAuthRecoveryMessage({ inventory }) {
  const state = inventory.userVisibleState || {};
  if (state.status === "needs_repair") {
    return "GPAO-T의 모델 연결 정보가 현재 실행 경로와 어긋났습니다. 비밀값을 표시하지 않고 연결 저장소를 동기화한 뒤 새 대화 응답까지 확인하겠습니다.";
  }
  if (state.status === "needs_setup") {
    return "GPAO-T가 사용할 모델 연결을 찾지 못했습니다. 연결 설정을 확인한 뒤 새 대화가 실제로 응답하는지 검증해야 합니다.";
  }
  if (state.status === "review") {
    return "GPAO-T의 모델 연결 저장소가 서로 달라 보입니다. 덮어쓰기 전에 백업과 복구 계획을 먼저 확인해야 합니다.";
  }
  return "GPAO-T의 모델 연결 저장소는 확인되었습니다. 그래도 완료 판단은 새 대화 응답과 로그 검토까지 통과해야 합니다.";
}
