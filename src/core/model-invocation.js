import { buildModelRouterPolicy, routeModel } from "./model-router.js";

const PROVIDER_LANES = [
  {
    id: "openclaw.oauth",
    label: "OpenClaw OAuth / session",
    lane: "oauth_session",
    provider: "openclaw_compatible",
    authMode: "oauth_or_session_auth",
    credentialSurface: "external_session_not_local_secret",
    primaryUse: "ChatGPT/Codex account based interactive use",
    costMode: "account_plan_or_provider_policy",
    status: "requires_connected_session",
    invokesExternally: true,
  },
  {
    id: "openai.api_key",
    label: "OpenAI API key",
    lane: "api_key",
    provider: "openai",
    authMode: "api_key",
    credentialSurface: "environment_or_future_vault",
    primaryUse: "team member API provider lane",
    costMode: "metered_api_billing",
    status: "requires_key_and_budget_policy",
    invokesExternally: true,
  },
  {
    id: "anthropic.api_key",
    label: "Anthropic API key",
    lane: "api_key",
    provider: "anthropic",
    authMode: "api_key",
    credentialSurface: "environment_or_future_vault",
    primaryUse: "team member API provider lane",
    costMode: "metered_api_billing",
    status: "requires_key_and_budget_policy",
    invokesExternally: true,
  },
  {
    id: "local.deterministic",
    label: "Local deterministic preview",
    lane: "local_private",
    provider: "local",
    authMode: "none",
    credentialSurface: "none",
    primaryUse: "safe local invocation proof and offline fallback",
    costMode: "zero_external_cost",
    status: "ready",
    invokesExternally: false,
  },
];

const INVOCATION_BLOCKED_ACTIONS = [
  "external provider call without approval",
  "credential read/write",
  "paid token spend without budget policy",
  "tool/CLI/MCP execution from model output",
  "connector activation",
  "external send",
  "durable memory promotion",
];

const LIVE_INVOCATION_REQUIRED_APPROVALS = [
  "provider_connection_visible",
  "credential_source_visible",
  "budget_or_account_plan_visible",
  "task_packet_visible",
  "user_invocation_confirmation",
  "audit_replay_reference_visible",
];

export function buildModelProviderRegistry({ env = process.env } = {}) {
  const providers = PROVIDER_LANES.map((provider) => {
    const configured = inferProviderConfigured({ provider, env });
    return {
      ...provider,
      configured,
      connectionState: configured ? "configured_or_session_available" : provider.status,
      firstClassLane: true,
      defaultExecutableNow: provider.id === "local.deterministic",
      hiddenSecretValue: true,
    };
  });

  return {
    schema: "gpao_t.model_provider_registry.v1",
    status: "ready",
    doctrine: "OAuth/session and API key lanes are both first-class model connection paths.",
    providers,
    routingAxes: ["capability", "latency", "cost", "privacy", "authority", "fallback"],
    invariants: {
      chatgptPlanIsNotApiCredit: true,
      oauthLaneIsNotApiKeyLane: true,
      apiKeyLaneIsNotOAuthLane: true,
      modelOutputIsNotToolAuthority: true,
    },
    nextSafeAction:
      "Use local deterministic invocation for proof, and require explicit connection/approval before OAuth or API provider calls.",
  };
}

export function buildModelInvocationPacket({
  request = "GPAO-T 작업을 모델에 맡기기 전 안전한 호출 패킷을 만든다.",
  providerId = "local.deterministic",
  inputSignal = { kind: "new_task" },
  authorityDecision = { requiredApprovals: [] },
  env = process.env,
} = {}) {
  const registry = buildModelProviderRegistry({ env });
  const provider = registry.providers.find((item) => item.id === providerId) || registry.providers.at(-1);
  const route = routeModel({ inputSignal, authorityDecision });
  const policy = buildModelRouterPolicy({ request, inputSignal, authorityDecision });
  const external = provider.invokesExternally === true;
  const needsApproval = external || provider.authMode !== "none";

  return {
    schema: "gpao_t.model_invocation_packet.v1",
    status: provider.defaultExecutableNow ? "ready" : "approval_required",
    request,
    route: {
      id: route.route,
      selectedAdapterId: route.adapterSelection?.selected?.id || null,
      costPolicy: route.costPolicy,
      latencyBudget: route.latencyBudget,
    },
    provider: {
      id: provider.id,
      label: provider.label,
      lane: provider.lane,
      provider: provider.provider,
      authMode: provider.authMode,
      configured: provider.configured,
      invokesExternally: external,
      costMode: provider.costMode,
    },
    taskPacketInputPolicy: policy.contextMeshTaskPacket,
    outputBoundary: policy.modelOutputBoundary,
    approval: {
      required: needsApproval,
      reason: needsApproval
        ? "외부 provider, 계정/session, API key, 비용 또는 네트워크 경계가 있으므로 명시 승인 전 호출하지 않습니다."
        : "로컬 deterministic preview는 외부 호출, 비밀키, 비용 없이 실행할 수 있습니다.",
      requiredBeforeExternalCall: [
        "connection_status_visible",
        "provider_scope_visible",
        "budget_or_plan_policy_visible",
        "task_packet_visible",
        "audit_replay_reference_visible",
        "user_invocation_confirmation",
      ],
    },
    blockedActions: provider.defaultExecutableNow ? [
      "tool/CLI/MCP execution from model output",
      "connector activation",
      "external send",
      "durable memory promotion",
    ] : INVOCATION_BLOCKED_ACTIONS,
    safetyInvariants: {
      readsSecrets: false,
      writesSecrets: false,
      sendsNetworkRequest: false,
      spendsTokens: false,
      executesToolFromOutput: false,
      storesOutputDurably: false,
    },
  };
}

export function invokeModelLocally({
  request = "GPAO-T 작업을 로컬 preview로 정리해줘.",
  providerId = "local.deterministic",
  now = new Date().toISOString(),
} = {}) {
  const packet = buildModelInvocationPacket({ request, providerId });
  const isLocal = packet.provider.id === "local.deterministic";

  if (!isLocal) {
    return {
      schema: "gpao_t.model_invocation_result.v1",
      status: "approval_required",
      generatedAt: now,
      packet,
      output: null,
      invokedProvider: false,
      userVisibleSummary:
        "이 provider lane은 정식 경로로 준비됐지만, 계정/API/비용/네트워크 경계 때문에 아직 호출하지 않았습니다.",
      nextSafeAction: "연결 상태와 승인 패킷을 먼저 확인한 뒤 외부 호출을 별도 단계로 엽니다.",
    };
  }

  const normalized = request.trim().replace(/\s+/g, " ");
  const focus = normalized.length > 120 ? `${normalized.slice(0, 117)}...` : normalized;
  return {
    schema: "gpao_t.model_invocation_result.v1",
    status: "completed_local_invocation",
    generatedAt: now,
    packet,
    invokedProvider: "local.deterministic",
    output: {
      role: "assistant",
      type: "local_preview_draft",
      text:
        `요청을 로컬 preview로 정리했습니다. 핵심 작업은 "${focus}"이며, ` +
        "다음 단계는 맥락 후보, 스킬 경로, 권한 경계를 붙인 뒤 외부 실행 없이 초안을 검토하는 것입니다.",
      modelOutputBoundary: "draft_only_not_action_authority",
    },
    blockedActions: packet.blockedActions,
    userVisibleSummary:
      "외부 호출 없이 로컬 모델 호출 proof를 완료했습니다. 결과는 초안이며 도구 실행 권한이 아닙니다.",
    nextSafeAction: "이 결과를 Work Surface draft로 보여주고, 실제 provider 호출은 OAuth/API 연결 승인 뒤에만 엽니다.",
  };
}

export async function invokeModelProvider({
  request = "GPAO-T 작업을 실제 provider 호출 후보로 처리한다.",
  providerId = "local.deterministic",
  approval = {},
  env = process.env,
  transport,
  now = new Date().toISOString(),
} = {}) {
  const packet = buildModelInvocationPacket({ request, providerId, env });
  const external = packet.provider.invokesExternally === true;

  if (!external) {
    return invokeModelLocally({ request, providerId, now });
  }

  const approvalCheck = verifyProviderInvocationApproval({ packet, approval });
  if (approvalCheck.status !== "ready") {
    return {
      schema: "gpao_t.model_provider_invocation_result.v1",
      status: "blocked",
      generatedAt: now,
      packet,
      approvalCheck,
      invokedProvider: false,
      output: null,
      userVisibleSummary:
        "실제 provider 호출은 준비됐지만, 연결/비용/승인 조건이 아직 충족되지 않아 실행하지 않았습니다.",
      nextSafeAction: approvalCheck.nextSafeAction,
    };
  }

  if (typeof transport !== "function") {
    return {
      schema: "gpao_t.model_provider_invocation_result.v1",
      status: "transport_required",
      generatedAt: now,
      packet,
      approvalCheck,
      invokedProvider: false,
      output: null,
      userVisibleSummary:
        "승인 조건은 충족됐지만, 실제 provider transport가 연결되지 않아 외부 호출을 실행하지 않았습니다.",
      nextSafeAction: "OAuth/session 또는 API provider transport를 연결한 뒤 같은 승인 패킷으로 호출합니다.",
    };
  }

  const transportResult = await transport({
    provider: packet.provider,
    request,
    packet,
    approval,
  });

  return {
    schema: "gpao_t.model_provider_invocation_result.v1",
    status: "completed_provider_invocation",
    generatedAt: now,
    packet,
    approvalCheck,
    invokedProvider: packet.provider.id,
    output: {
      role: "assistant",
      type: "provider_draft",
      text: String(transportResult?.text || transportResult?.output || ""),
      modelOutputBoundary: "draft_only_not_action_authority",
      providerReceipt: {
        id: transportResult?.id || null,
        usage: transportResult?.usage || null,
      },
    },
    safetyInvariants: {
      executesToolFromOutput: false,
      activatesConnector: false,
      sendsExternalMessage: false,
      promotesDurableMemory: false,
    },
    userVisibleSummary:
      "실제 provider 호출 결과를 초안으로 받았습니다. 이 출력은 도구 실행 권한이 아니며 Work Surface에서 검토되어야 합니다.",
    nextSafeAction: "초안을 Work Surface에 표시하고, 도구/커넥터 실행은 별도 approval flow로 넘깁니다.",
  };
}

export function verifyProviderInvocationApproval({
  packet = buildModelInvocationPacket({ providerId: "openai.api_key" }),
  approval = {},
} = {}) {
  const findings = [];
  const required = LIVE_INVOCATION_REQUIRED_APPROVALS;
  const granted = Array.isArray(approval.granted) ? approval.granted : [];

  if (packet.provider?.invokesExternally !== true) findings.push("provider_is_not_external");
  if (packet.provider?.configured !== true) findings.push("provider_not_configured");
  if (approval.confirmed !== true) findings.push("user_invocation_confirmation_missing");
  if (approval.allowNetwork !== true) findings.push("network_approval_missing");
  if (approval.allowPaidUsage !== true && packet.provider?.costMode !== "account_plan_or_provider_policy") {
    findings.push("paid_usage_policy_missing");
  }
  for (const item of required) {
    if (!granted.includes(item)) findings.push(`missing_${item}`);
  }

  return {
    schema: "gpao_t.model_provider_invocation_approval_check.v1",
    status: findings.length ? "blocked" : "ready",
    findings,
    requiredApprovals: required,
    grantedApprovals: granted,
    nextSafeAction: findings.length
      ? "연결 상태, 비용/계정 정책, task packet, 사용자 확인, audit/replay reference를 먼저 채웁니다."
      : "Provider transport를 호출해도 되지만, 출력은 초안이며 도구 실행 권한이 아닙니다.",
  };
}

export function verifyModelInvocation({
  registry = buildModelProviderRegistry(),
  localResult = invokeModelLocally(),
} = {}) {
  const findings = [];
  const providers = registry.providers || [];

  if (registry.schema !== "gpao_t.model_provider_registry.v1") findings.push("invalid_registry_schema");
  if (!providers.some((provider) => provider.lane === "oauth_session")) findings.push("missing_oauth_session_lane");
  if (!providers.some((provider) => provider.lane === "api_key")) findings.push("missing_api_key_lane");
  if (!providers.some((provider) => provider.id === "local.deterministic" && provider.defaultExecutableNow)) {
    findings.push("missing_local_invocation_lane");
  }
  if (registry.invariants?.chatgptPlanIsNotApiCredit !== true) findings.push("missing_chatgpt_plan_api_boundary");
  if (localResult.schema !== "gpao_t.model_invocation_result.v1") findings.push("invalid_local_result_schema");
  if (localResult.status !== "completed_local_invocation") findings.push("local_invocation_not_completed");
  if (localResult.packet?.outputBoundary?.outputIsActionAuthority !== false) findings.push("model_output_action_authority_open");
  if (localResult.packet?.safetyInvariants?.readsSecrets !== false) findings.push("secret_read_open");
  if (localResult.packet?.safetyInvariants?.sendsNetworkRequest !== false) findings.push("network_send_open");
  if (localResult.packet?.safetyInvariants?.spendsTokens !== false) findings.push("token_spend_open");
  if (localResult.output?.modelOutputBoundary !== "draft_only_not_action_authority") findings.push("output_boundary_missing");

  return {
    schema: "gpao_t.model_invocation_verification.v1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedLanes: providers.map((provider) => provider.id),
    checkedOutputBoundary: localResult.output?.modelOutputBoundary || null,
    nextSafeAction: findings.length
      ? "Repair model invocation lane findings before exposing provider calls."
      : "Wire OAuth/API connection setup later; keep local deterministic invocation as the safe proof lane.",
  };
}

export async function verifyProviderInvocationRuntime({
  env = {
    OPENAI_API_KEY: "test-key",
  },
} = {}) {
  const approval = {
    confirmed: true,
    allowNetwork: true,
    allowPaidUsage: true,
    granted: LIVE_INVOCATION_REQUIRED_APPROVALS,
  };
  const result = await invokeModelProvider({
    providerId: "openai.api_key",
    request: "테스트 provider transport로 초안을 생성한다.",
    env,
    approval,
    transport: async ({ request }) => ({
      id: "test-provider-receipt",
      text: `provider draft: ${request}`,
      usage: { promptTokens: 0, completionTokens: 0, testTransport: true },
    }),
  });
  const findings = [];

  if (result.status !== "completed_provider_invocation") findings.push("provider_invocation_not_completed");
  if (result.output?.modelOutputBoundary !== "draft_only_not_action_authority") findings.push("output_boundary_missing");
  if (result.safetyInvariants?.executesToolFromOutput !== false) findings.push("tool_execution_open");
  if (result.safetyInvariants?.activatesConnector !== false) findings.push("connector_activation_open");

  return {
    schema: "gpao_t.model_provider_invocation_runtime_verification.v1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedProvider: result.invokedProvider,
    checkedReceipt: result.output?.providerReceipt?.id || null,
    nextSafeAction: findings.length
      ? "Repair provider invocation runtime before opening live provider setup."
      : "Connect real OAuth/session and API transports under the same approval contract.",
  };
}

function inferProviderConfigured({ provider, env }) {
  if (provider.id === "local.deterministic") return true;
  if (provider.id === "openai.api_key") return Boolean(env.OPENAI_API_KEY);
  if (provider.id === "anthropic.api_key") return Boolean(env.ANTHROPIC_API_KEY);
  if (provider.id === "openclaw.oauth") {
    return Boolean(env.OPENCLAW_SESSION || env.OPENCLAW_GATEWAY_TOKEN || env.GPAO_T_OPENCLAW_SESSION);
  }
  return false;
}
