import { selectModelAdapter } from "./adapter-boundary.js";
import { buildTimeoutBudget, verifyTimeoutBudget } from "./tester-failure-guards.js";

const ROUTER_PROFILES = [
  {
    id: "fast_context_recovery",
    label: "빠른 맥락 회수",
    trigger: "short_follow_up_or_active_target_recovery",
    requestTypes: ["short_follow_up", "active_target_recovery", "new_session_noun_binding"],
    speed: "high",
    quality: "target_recovery_before_depth",
    cost: "lowest_available",
    risk: "wrong_anchor_or_stale_context",
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
    requestTypes: ["new_task", "planning", "work_surface_preview", "implementation_shape"],
    speed: "medium",
    quality: "balanced_reasoning_with_context_check",
    cost: "local_first_metered_after_approval",
    risk: "overthinking_or_unapproved_provider_call",
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
    requestTypes: ["secret_boundary", "account_boundary", "private_context_summary"],
    speed: "medium",
    quality: "privacy_preserving_summary",
    cost: "local_only",
    risk: "secret_leak_or_external_provider_drift",
    preferredClass: "local_small_model",
    latencyBudget: "medium",
    costPolicy: "local_only_until_user_changes_privacy_policy",
    fallbackClass: "local_small_model",
    liveExecution: false,
  },
  {
    id: "deep_design_review",
    label: "깊은 설계 검토",
    trigger: "architecture_policy_or_high_impact_design",
    requestTypes: ["architecture_review", "policy_review", "high_impact_design", "multi_step_plan"],
    speed: "low_to_medium",
    quality: "higher_reasoning_depth_with_replay_before_action",
    cost: "budgeted_after_preview",
    risk: "latency_cost_growth_or_premature_execution",
    preferredClass: "strong_reasoning",
    latencyBudget: "medium_to_high",
    costPolicy: "require_budget_visibility_before_metered_provider",
    fallbackClass: "local_small_model",
    liveExecution: false,
  },
];

const TASK_PACKET_CANDIDATE_CONDITIONS = [
  {
    id: "admitted_context_only",
    rule: "Only Context Mesh candidates admitted into the current task packet may become model input candidates.",
    blocksWhenMissing: "raw_memory_dump_or_unadmitted_context",
  },
  {
    id: "authority_boundary_attached",
    rule: "Task packet must carry authority status before route selection can be considered executable.",
    blocksWhenMissing: "missing_authority_decision",
  },
  {
    id: "active_target_visible",
    rule: "If the request is a follow-up, active target recovery evidence must be visible before deep routing.",
    blocksWhenMissing: "ambiguous_follow_up_target",
  },
  {
    id: "skill_route_preview_only",
    rule: "Skill and tool routes may inform the prompt candidate but cannot become tool execution authority.",
    blocksWhenMissing: "tool_route_as_action",
  },
];

const FAILURE_STATES = [
  {
    id: "no_safe_adapter",
    userVisibleState: "사용 가능한 안전 모델 경로 없음",
    recovery: "fall back to local preview explanation and ask for provider setup only at an approval boundary",
  },
  {
    id: "context_not_admitted",
    userVisibleState: "현재 요청에 쓸 맥락이 아직 선별되지 않음",
    recovery: "run Context Mesh resolve/admission before model routing",
  },
  {
    id: "privacy_boundary",
    userVisibleState: "민감 정보 경계 때문에 외부 모델 경로 잠김",
    recovery: "use local/private preview route or ask for explicit policy approval later",
  },
  {
    id: "provider_unconfigured",
    userVisibleState: "외부 provider 설정 없음",
    recovery: "keep provider as plan-only and use local fallback chain",
  },
  {
    id: "tool_execution_requested",
    userVisibleState: "모델 출력이 도구 실행으로 이어질 수 있어 멈춤",
    recovery: "convert output into preview/approval packet before any tool, CLI, or MCP action",
  },
];

const REPLAY_AUDIT_CRITERIA = [
  "route profile must match request type and authority boundary",
  "fast follow-up must recover active target before deep reasoning",
  "private/secret boundary must keep provider route local/private",
  "fallback chain must prefer local adapters before external providers",
  "model output must never directly execute tool/CLI/MCP actions",
  "audit record must name route, adapter, input candidate source, blocked actions, and user-visible recovery state before live execution exists",
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

export function buildModelRouterPolicy({
  request = "GPAO-T 작업 요청을 어떤 모델 route profile로 보낼지 검토한다.",
  inputSignal = { kind: "new_task" },
  authorityDecision = {
    requiredApprovals: [],
  },
} = {}) {
  const boundary = buildModelRouterBoundary({ request, inputSignal, authorityDecision });
  const timeoutBudget = buildTimeoutBudget({ request });
  const timeoutVerification = verifyTimeoutBudget({ budget: timeoutBudget });

  return {
    schema: "gpao_t.model_router_policy.v0_1",
    status: "ready",
    surface: "read_only_replay_policy_contract",
    request,
    selectedRoute: boundary.route.route,
    selectedAdapter: boundary.route.adapterSelection.selected?.id || null,
    routeProfiles: ROUTER_PROFILES,
    decisionMatrix: {
      speed: "prefer fast path for follow-up recovery and defer deep reasoning until the active target is safe",
      quality: "prefer stronger reasoning only after context, authority, and expected output are visible",
      cost: "prefer local/zero-cost preview; metered provider routes require explicit future approval and budget visibility",
      risk: "privacy, stale context, wrong anchor, provider setup, and tool execution risk can block or downgrade a route",
    },
    contextMeshTaskPacket: {
      candidateOnly: true,
      becomesModelInputWhen: TASK_PACKET_CANDIDATE_CONDITIONS,
      blockedUntil: [
        "context_admission_visible",
        "authority_boundary_visible",
        "active_target_recovered_when_follow_up",
        "prompt_candidate_reviewed",
      ],
      rawMemoryDumpAllowed: false,
    },
    fallbackAndFailure: {
      fallbackOrder: boundary.latencyCostFallback.fallbackChain,
      failureStates: FAILURE_STATES,
      defaultRecoveryState: "stay_in_preview_and_show_next_safe_action",
    },
    timeoutBudget,
    timeoutVerification: {
      status: timeoutVerification.status,
      findings: timeoutVerification.findings,
    },
    modelOutputBoundary: {
      outputIsActionAuthority: false,
      toolCliMcpExecution: "blocked_until_preview_approval_replay_and_audit",
      allowedNextForm: "local_draft_or_approval_packet_preview",
      forbiddenDirectActions: [
        "tool execution",
        "CLI command execution",
        "MCP mutation",
        "connector activation",
        "external send",
        "durable memory promotion",
      ],
    },
    replayAudit: {
      requiredCriteria: REPLAY_AUDIT_CRITERIA,
      replaySuiteStatus: "design_only_not_invoked",
      writesAuditNow: false,
      invokesReplayNow: false,
      storesModelOutputNow: false,
    },
    blockedActions: boundary.blockedActions,
    safetyInvariants: {
      readOnly: true,
      callsProvider: false,
      readsSecrets: false,
      writesSecrets: false,
      sendsNetworkRequest: false,
      spendsTokens: false,
      persistsModelOutput: false,
      executesToolFromOutput: false,
      activatesConnector: false,
      promotesDurableMemory: false,
    },
    nextSafeAction:
      "Use this policy as the last read-only Model Router gate before connector/tool governance; keep provider and tool execution blocked.",
  };
}

export function verifyModelRouterPolicy({
  policy = buildModelRouterPolicy(),
} = {}) {
  const findings = [];

  if (policy.schema !== "gpao_t.model_router_policy.v0_1") findings.push("invalid_schema");
  if (policy.surface !== "read_only_replay_policy_contract") findings.push("surface_not_read_only_policy");
  if ((policy.routeProfiles || []).length < 4) findings.push("missing_route_profiles");
  for (const axis of ["speed", "quality", "cost", "risk"]) {
    if (!policy.decisionMatrix?.[axis]) findings.push(`missing_${axis}_policy`);
  }
  if ((policy.contextMeshTaskPacket?.becomesModelInputWhen || []).length < 4) findings.push("missing_task_packet_conditions");
  if (policy.contextMeshTaskPacket?.rawMemoryDumpAllowed !== false) findings.push("raw_memory_dump_allowed");
  if ((policy.fallbackAndFailure?.failureStates || []).length < 5) findings.push("missing_failure_states");
  if (!policy.timeoutBudget) findings.push("missing_timeout_budget");
  if (policy.timeoutVerification?.status !== "ready") findings.push("timeout_budget_not_ready");
  if (policy.modelOutputBoundary?.outputIsActionAuthority !== false) findings.push("model_output_action_authority_open");
  if (policy.modelOutputBoundary?.toolCliMcpExecution !== "blocked_until_preview_approval_replay_and_audit") findings.push("tool_cli_mcp_boundary_open");
  if ((policy.replayAudit?.requiredCriteria || []).length < 6) findings.push("missing_replay_audit_criteria");
  if (policy.replayAudit?.writesAuditNow !== false) findings.push("audit_write_open");
  if (policy.replayAudit?.invokesReplayNow !== false) findings.push("replay_invocation_open");
  if (policy.replayAudit?.storesModelOutputNow !== false) findings.push("model_output_storage_open");
  if (policy.safetyInvariants?.callsProvider !== false) findings.push("provider_call_open");
  if (policy.safetyInvariants?.executesToolFromOutput !== false) findings.push("tool_execution_open");
  if (policy.safetyInvariants?.activatesConnector !== false) findings.push("connector_activation_open");
  if (policy.safetyInvariants?.promotesDurableMemory !== false) findings.push("durable_memory_promotion_open");

  return {
    schema: "gpao_t.model_router_policy_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedProfiles: (policy.routeProfiles || []).map((profile) => profile.id),
    checkedFailureStates: (policy.fallbackAndFailure?.failureStates || []).map((state) => state.id),
    checkedReplayCriteria: policy.replayAudit?.requiredCriteria || [],
    nextSafeAction: findings.length
      ? "Fix Model Router policy findings before connector/tool governance."
      : policy.nextSafeAction,
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
