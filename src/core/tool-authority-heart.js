import {
  buildConnectorToolGovernance,
  listConnectors,
  reviewConnectorPermission,
  verifyConnectorToolGovernance,
} from "./connector-governance.js";
import {
  buildExecutionRuntimePlan,
  inspectReadOnlyConnector,
  verifyExecutionRuntimePlan,
} from "./execution-runtime.js";
import { buildAuthorityDecision } from "./authority.js";
import {
  guardExternalWriteCompletion,
  isolateHeartbeatFailures,
  verifyExternalWriteCompletionGuard,
  verifyHeartbeatFailureIsolation,
} from "./tester-failure-guards.js";

const SCHEMA = "gpao_t.tool_authority_heart.v1";

export function buildToolAuthorityHeart({
  root,
  governance = buildConnectorToolGovernance({
    modelOutput: "GPAO-T should inspect local runtime state before proposing execution.",
    requestedSurface: "mcp",
    requestedTier: "read_only",
  }),
  executionPlan = buildExecutionRuntimePlan({ root }),
  connectorRegistry = listConnectors(),
  localReadReview = reviewConnectorPermission({
    connectorId: "local.filesystem",
    action: "read",
    task: "inspect GPAO-T local state",
  }),
  externalSendReview = reviewConnectorPermission({
    connectorId: "slack.oauth",
    action: "send",
    task: "send an external message",
  }),
  readOnlyInspection = inspectReadOnlyConnector({ root }),
  safeAuthorityDecision = buildAuthorityDecision({
    input: { text: "로컬 상태를 읽고 설명해줘" },
    admissionPacket: { admittedCells: [] },
  }),
  riskyAuthorityDecision = buildAuthorityDecision({
    input: { text: "토큰을 텔레그램으로 전송하고 오래된 파일을 삭제해줘" },
    admissionPacket: { admittedCells: [] },
  }),
  now = new Date().toISOString(),
  externalWriteGuard = guardExternalWriteCompletion({
    action: "git.push",
    claim: "푸시 완료했습니다.",
  }),
  heartbeatIsolation = isolateHeartbeatFailures({
    failures: [
      { id: "heartbeat.fixture.1" },
      { id: "heartbeat.fixture.2" },
      { id: "heartbeat.fixture.3" },
    ],
    mainChatStatus: "ready",
    now,
  }),
} = {}) {
  const governanceVerification = verifyConnectorToolGovernance({ governance });
  const executionVerification = verifyExecutionRuntimePlan({ plan: executionPlan });
  const observations = [
    ...classifyGovernance({ governance, governanceVerification }),
    ...classifyExecutionPlan({ executionPlan, executionVerification }),
    ...classifyConnectors({ connectorRegistry, localReadReview, externalSendReview, readOnlyInspection }),
    ...classifyAuthorityDecisions({ safeAuthorityDecision, riskyAuthorityDecision }),
    ...classifyTesterFailureGuards({ externalWriteGuard, heartbeatIsolation }),
  ];
  const severity = highestSeverity(observations);
  return {
    schema: `${SCHEMA}.summary`,
    generatedAt: now,
    status: severity === "P0" ? "blocked" : severity === "P1" || severity === "P2" ? "review" : "ready",
    severity,
    userVisibleStatus: buildUserVisibleStatus(observations),
    governance: {
      status: governanceVerification.status,
      selectedSurface: governance.selectedCandidateClass?.surface,
      selectedAuthorityTier: governance.selectedAuthorityTier?.id,
      modelOutputIsExecutionAuthority: governance.modelOutputToExecutionProposal?.outputIsExecutionAuthority,
      blockedActions: governance.blockedActions || [],
    },
    execution: {
      status: executionVerification.status,
      mode: executionPlan.mode,
      dryRunInvokesNow: executionPlan.dryRunPreview?.invokesNow,
      safetyInvariants: executionPlan.safetyInvariants,
    },
    connectors: {
      status: connectorRegistry.status,
      count: connectorRegistry.connectors?.length || 0,
      doctrine: connectorRegistry.connectorDoctrine,
      localReadStatus: localReadReview.status,
      externalSendStatus: externalSendReview.status,
      readOnlyInspectionStatus: readOnlyInspection.status,
    },
    authority: {
      safeStatus: safeAuthorityDecision.status,
      riskyStatus: riskyAuthorityDecision.status,
      riskyRequiredApprovals: riskyAuthorityDecision.requiredApprovals,
    },
    testerFailureGuards: {
      externalWriteCompletionStatus: externalWriteGuard.status,
      externalWriteCanClaimCompletion: externalWriteGuard.canClaimCompletion,
      heartbeatIsolationStatus: heartbeatIsolation.status,
      heartbeatVisibleChatMessages: heartbeatIsolation.visibleChatMessages.length,
    },
    observations,
    authorityBoundary: {
      modelOutputCanExecute: false,
      mcpInvocationNow: false,
      connectorActivationNow: false,
      externalSendNow: false,
      credentialReadWriteNow: false,
      destructiveActionNow: false,
      paidActionNow: false,
      durableMemoryPromotionNow: false,
    },
    completionClaimAllowed: false,
    completionClaimReason:
      "Tool/MCP/Authority Heart completion requires governance, execution preview, connector review, authority decision, and live UI evidence.",
    nextSafeAction: severity === "P0"
      ? "Repair authority leakage before opening any tool, MCP, or connector lane."
      : "Run live authority UI and dry-run preview QA after source contract verification.",
  };
}

export function verifyToolAuthorityHeart({
  heart = buildToolAuthorityHeart(),
} = {}) {
  const findings = [];
  const ids = new Set((heart.observations || []).map((item) => item.id));
  if (heart.schema !== `${SCHEMA}.summary`) findings.push("invalid_tool_authority_schema");
  if (heart.completionClaimAllowed !== false) findings.push("completion_gate_open");
  if (heart.authorityBoundary?.modelOutputCanExecute !== false) findings.push("model_output_execution_open");
  if (heart.authorityBoundary?.mcpInvocationNow !== false) findings.push("mcp_invocation_open");
  if (heart.authorityBoundary?.connectorActivationNow !== false) findings.push("connector_activation_open");
  if (heart.authorityBoundary?.externalSendNow !== false) findings.push("external_send_open");
  if (heart.authorityBoundary?.credentialReadWriteNow !== false) findings.push("credential_boundary_open");
  if (heart.authorityBoundary?.destructiveActionNow !== false) findings.push("destructive_action_open");
  if (!ids.has("governance_contract_ready")) findings.push("governance_contract_not_ready");
  if (!ids.has("execution_preview_ready")) findings.push("execution_preview_not_ready");
  if (!ids.has("connector_permission_separation_ready")) findings.push("connector_permission_separation_missing");
  if (!ids.has("authority_decision_blocks_risky_request")) findings.push("risky_authority_not_blocked");
  if (!ids.has("external_write_claim_guard_ready")) findings.push("external_write_claim_guard_missing");
  if (!ids.has("heartbeat_failure_isolation_ready")) findings.push("heartbeat_failure_isolation_missing");
  if (heart.userVisibleStatus?.language !== "gpao_t_user_safe") findings.push("user_safe_language_missing");
  return {
    schema: `${SCHEMA}.verification`,
    status: findings.length ? "blocked" : "ready",
    findings,
    observedIds: [...ids].sort(),
    completionClaimAllowed: false,
    nextSafeAction: findings.length
      ? "Repair Tool/MCP/Authority Heart before expanding execution."
      : "Run the full Runtime Heart verification and live evidence pass.",
  };
}

function classifyTesterFailureGuards({ externalWriteGuard, heartbeatIsolation }) {
  const externalWriteVerification = verifyExternalWriteCompletionGuard({
    action: externalWriteGuard.action,
    claim: "푸시 완료했습니다.",
  });
  const heartbeatVerification = verifyHeartbeatFailureIsolation({ isolation: heartbeatIsolation });
  const externalReady = externalWriteVerification.status === "ready"
    && externalWriteGuard.status === "blocked"
    && externalWriteGuard.canClaimCompletion === false;
  const heartbeatReady = heartbeatVerification.status === "ready"
    && heartbeatIsolation.visibleChatMessages.length === 0;
  return [
    {
      id: externalReady ? "external_write_claim_guard_ready" : "external_write_claim_guard_blocked",
      severity: externalReady ? "info" : "P0",
      ok: externalReady,
      userLabel: externalReady ? "외부 실행 완료 주장 보호 정상" : "외부 실행 완료 주장 보호 문제",
      userMessage: externalReady
        ? "GitHub push 같은 외부 쓰기는 실제 실행 영수증 없이는 완료로 말하지 않습니다."
        : "실제 실행 영수증 없이 외부 쓰기 완료를 말할 위험이 있습니다.",
      details: { status: externalWriteGuard.status, findings: externalWriteVerification.findings },
    },
    {
      id: heartbeatReady ? "heartbeat_failure_isolation_ready" : "heartbeat_failure_isolation_blocked",
      severity: heartbeatReady ? "info" : "P0",
      ok: heartbeatReady,
      userLabel: heartbeatReady ? "상태 점검 경고 격리 정상" : "상태 점검 경고 격리 문제",
      userMessage: heartbeatReady
        ? "Heartbeat 경고는 Doctor로 모이고 정상 대화창에 반복 출력되지 않습니다."
        : "Heartbeat 경고가 대화창 흐름을 오염시킬 위험이 있습니다.",
      details: { status: heartbeatIsolation.status, findings: heartbeatVerification.findings },
    },
  ];
}

function classifyGovernance({ governance, governanceVerification }) {
  const ready = governanceVerification.status === "ready"
    && governance.modelOutputToExecutionProposal?.outputIsExecutionAuthority === false
    && Object.values(governance.safetyInvariants || {}).every((value) => value === false);
  return [{
    id: ready ? "governance_contract_ready" : "governance_contract_blocked",
    severity: ready ? "info" : "P0",
    ok: ready,
    userLabel: ready ? "도구 권한 계약 정상" : "도구 권한 계약 문제",
    userMessage: ready
      ? "모델 출력은 실행 권한이 아니며, 도구/MCP/커넥터는 후보와 승인 경계를 거칩니다."
      : "모델 출력이나 도구 후보가 승인 없이 실행될 위험이 있습니다.",
    details: { findings: governanceVerification.findings || [] },
  }];
}

function classifyExecutionPlan({ executionPlan, executionVerification }) {
  const ready = executionVerification.status === "ready"
    && executionPlan.dryRunPreview?.invokesNow === false
    && Object.values(executionPlan.safetyInvariants || {}).every((value) => value === false);
  return [{
    id: ready ? "execution_preview_ready" : "execution_preview_blocked",
    severity: ready ? "info" : "P0",
    ok: ready,
    userLabel: ready ? "실행 미리보기 경계 정상" : "실행 미리보기 경계 문제",
    userMessage: ready
      ? "현재 단계는 읽기와 dry-run 미리보기이며, 실제 실행은 열려 있지 않습니다."
      : "실행 계획이 승인 없이 명령 실행이나 외부 행동을 열 수 있습니다.",
    details: { findings: executionVerification.findings || [] },
  }];
}

function classifyConnectors({ connectorRegistry, localReadReview, externalSendReview, readOnlyInspection }) {
  const separated = connectorRegistry.governanceRule === "connected_does_not_mean_executable"
    && localReadReview.status === "preview"
    && localReadReview.access?.writable === false
    && localReadReview.access?.executable === false
    && externalSendReview.status === "blocked"
    && readOnlyInspection.status === "ready";
  return [{
    id: separated ? "connector_permission_separation_ready" : "connector_permission_separation_blocked",
    severity: separated ? "info" : "P0",
    ok: separated,
    userLabel: separated ? "커넥터 권한 분리 정상" : "커넥터 권한 분리 문제",
    userMessage: separated
      ? "연결됨, 읽기 가능, 쓰기 가능, 실행 가능, 전송 가능, 자동화 가능을 분리해서 판단합니다."
      : "커넥터 권한이 한 번에 열릴 위험이 있습니다.",
    details: {
      localReadStatus: localReadReview.status,
      externalSendStatus: externalSendReview.status,
      readOnlyInspectionStatus: readOnlyInspection.status,
    },
  }];
}

function classifyAuthorityDecisions({ safeAuthorityDecision, riskyAuthorityDecision }) {
  const blocked = riskyAuthorityDecision.status === "needs_approval"
    && riskyAuthorityDecision.requiredApprovals.includes("secret_or_account_boundary")
    && riskyAuthorityDecision.requiredApprovals.includes("external_send")
    && riskyAuthorityDecision.requiredApprovals.includes("data_deletion");
  return [
    {
      id: safeAuthorityDecision.status === "allowed" ? "safe_local_authority_allowed" : "safe_local_authority_review",
      severity: safeAuthorityDecision.status === "allowed" ? "info" : "P1",
      ok: safeAuthorityDecision.status === "allowed",
      userLabel: "로컬 읽기 권한 판단",
      userMessage: safeAuthorityDecision.status === "allowed"
        ? "로컬 읽기/설명 요청은 안전한 미리보기 범위에서 허용됩니다."
        : "안전한 로컬 읽기 요청이 과도하게 막혔습니다.",
    },
    {
      id: blocked ? "authority_decision_blocks_risky_request" : "authority_decision_risky_request_open",
      severity: blocked ? "info" : "P0",
      ok: blocked,
      userLabel: blocked ? "위험 요청 승인 차단 정상" : "위험 요청 승인 차단 문제",
      userMessage: blocked
        ? "비밀, 외부 전송, 삭제 요청은 승인 없이는 실행되지 않습니다."
        : "비밀, 외부 전송, 삭제 요청이 승인 없이 열릴 위험이 있습니다.",
      details: { requiredApprovals: riskyAuthorityDecision.requiredApprovals || [] },
    },
  ];
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
    label: "도구/권한 기본 상태 정상",
    message: "GPAO-T는 가능 기능보다 허용된 행동을 먼저 판단합니다.",
  };
}
