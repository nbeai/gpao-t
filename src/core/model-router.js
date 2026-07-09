import { selectModelAdapter } from "./adapter-boundary.js";

const ROUTER_PROFILES = [
  {
    id: "fast_context_recovery",
    label: "빠른 맥락 회수",
    trigger: "short_follow_up_or_active_target_recovery",
    preferredClass: "fast_low_latency",
    latencyBudget: "low",
    costPolicy: "prefer_zero_or_low_cost",
    fallbackClass: "local_small_model",
    liveExecution: false,
  },
  {
    id: "balanced_reasoning",
    label: "균형 추론",
    trigger: "normal_task_preview_or_planning",
    preferredClass: "strong_reasoning",
    latencyBudget: "medium",
    costPolicy: "prefer_local_then_metered_after_approval",
    fallbackClass: "local_small_model",
    liveExecution: false,
  },
  {
    id: "private_summary",
    label: "민감 요약",
    trigger: "secret_account_or_private_context_boundary",
    preferredClass: "local_small_model",
    latencyBudget: "medium",
    costPolicy: "local_only_until_user_changes_privacy_policy",
    fallbackClass: "local_small_model",
    liveExecution: false,
  },
];

export function routeModel({ inputSignal, authorityDecision }) {
  const privacy = authorityDecision.requiredApprovals.includes("secret_or_account_boundary")
    ? "local_or_private"
    : "standard";
  const route = inputSignal.kind === "follow_up"
    ? "fast_context_recovery"
    : "balanced_reasoning";
  const preferredClass = route === "fast_context_recovery" ? "fast_low_latency" : "strong_reasoning";
  const adapterSelection = selectModelAdapter({
    preferredClass,
    privacy,
    fallbackClass: "local_small_model",
  });

  return {
    schema: "gpao_t.model_route.v0_1",
    status: "selected",
    route,
    privacy,
    preferredClass,
    fallbackClass: "local_small_model",
    adapterSelection,
    latencyBudget: route === "fast_context_recovery" ? "low" : "medium",
    costPolicy: privacy === "local_or_private"
      ? "local_only_until_user_changes_privacy_policy"
      : "prefer_local_then_metered_after_approval",
    liveExecution: false,
    providerBoundary: "selection_only_no_provider_call",
    reason: route === "fast_context_recovery"
      ? "Short follow-up turns should recover active target before deep reasoning."
      : "The turn needs a balanced reasoning path.",
  };
}

export function buildModelRouterBoundary({
  request = "GPAO-T에게 맡길 작업을 preview하고 알맞은 모델 경로를 판단한다.",
  inputSignal = { kind: "new_task" },
  authorityDecision = {
    requiredApprovals: [],
  },
} = {}) {
  const route = routeModel({ inputSignal, authorityDecision });
  const hasSecretBoundary = authorityDecision.requiredApprovals.includes("secret_or_account_boundary");
  const blockedActions = [
    "live model call",
    "provider credential read",
    "provider credential write",
    "external network request",
    "paid token spend",
    "model output persistence",
    "durable memory promotion",
    "tool execution from model output",
  ];

  return {
    schema: "gpao_t.model_router_boundary.v0_1",
    status: "ready",
    surface: "read_only_router_contract",
    request,
    route,
    providerBoundary: {
      localPreview: "allowed_for_selection_only",
      externalProviderCall: "blocked_until_provider_setup_task_approval_and_audit",
      credentialAccess: "blocked",
      networkAccess: "blocked",
      paidUsage: "blocked",
      secretOrAccountBoundary: hasSecretBoundary ? "local_or_private_required" : "not_detected",
    },
    routingPolicy: {
      fastPath: "short follow-up and active-target recovery use low-latency local preview selection first",
      deepPath: "planning and high-ambiguity work can select stronger reasoning only as preview until execution gates exist",
      privacyPath: "secret/account/private context keeps routing local/private until explicit user approval changes the boundary",
      fallbackPath: "if preferred adapter is unavailable, fall back to local_small_model before any external provider",
    },
    latencyCostFallback: {
      latencyBudget: route.latencyBudget,
      costPolicy: route.costPolicy,
      fallbackClass: route.fallbackClass,
      fallbackChain: route.adapterSelection.fallbackChain,
      selectedLatencyTier: route.adapterSelection.selectedLatencyTier,
      selectedCostTier: route.adapterSelection.selectedCostTier,
    },
    profiles: ROUTER_PROFILES,
    blockedActions,
    auditReplayRollback: {
      auditReference: "future_model_call_audit_record_required_before_live_execution",
      replayReference: "future_router_replay_suite_required_before_provider_enablement",
      rollbackReference: "provider_enablement_must_have_disable_and_fallback_path",
      writesAuditNow: false,
      invokesReplayNow: false,
      mutatesProviderConfigNow: false,
    },
    safetyInvariants: {
      readOnly: true,
      callsProvider: false,
      readsSecrets: false,
      writesSecrets: false,
      sendsNetworkRequest: false,
      spendsTokens: false,
      storesModelOutput: false,
      activatesTools: false,
      promotesDurableMemory: false,
    },
    nextSafeAction:
      "Expose this router boundary in the Control Center adapter panel and keep live provider calls blocked until provider setup, approval, audit, replay, and fallback gates exist.",
  };
}

export function verifyModelRouterBoundary({
  boundary = buildModelRouterBoundary(),
} = {}) {
  const findings = [];

  if (boundary.schema !== "gpao_t.model_router_boundary.v0_1") findings.push("invalid_schema");
  if (boundary.surface !== "read_only_router_contract") findings.push("surface_not_read_only");
  if (boundary.route?.liveExecution !== false) findings.push("route_live_execution_open");
  if (boundary.providerBoundary?.externalProviderCall !== "blocked_until_provider_setup_task_approval_and_audit") findings.push("external_provider_not_blocked");
  if (boundary.providerBoundary?.credentialAccess !== "blocked") findings.push("credential_access_not_blocked");
  if (boundary.providerBoundary?.networkAccess !== "blocked") findings.push("network_access_not_blocked");
  if (boundary.providerBoundary?.paidUsage !== "blocked") findings.push("paid_usage_not_blocked");
  if (!boundary.latencyCostFallback?.fallbackChain?.length) findings.push("missing_fallback_chain");
  if (!boundary.blockedActions?.includes("live model call")) findings.push("missing_live_model_block");
  if (boundary.auditReplayRollback?.writesAuditNow !== false) findings.push("audit_write_open");
  if (boundary.auditReplayRollback?.invokesReplayNow !== false) findings.push("replay_invocation_open");
  if (boundary.auditReplayRollback?.mutatesProviderConfigNow !== false) findings.push("provider_mutation_open");
  if (boundary.safetyInvariants?.callsProvider !== false) findings.push("provider_call_open");
  if (boundary.safetyInvariants?.readsSecrets !== false) findings.push("secret_read_open");
  if (boundary.safetyInvariants?.sendsNetworkRequest !== false) findings.push("network_send_open");
  if (boundary.safetyInvariants?.spendsTokens !== false) findings.push("token_spend_open");
  if (boundary.safetyInvariants?.activatesTools !== false) findings.push("tool_activation_open");

  return {
    schema: "gpao_t.model_router_boundary_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedRoute: boundary.route?.route,
    checkedAdapter: boundary.route?.adapterSelection?.selected?.id || null,
    checkedBlockedActions: boundary.blockedActions,
    nextSafeAction: findings.length
      ? "Fix model router boundary findings before exposing provider configuration."
      : boundary.nextSafeAction,
  };
}
