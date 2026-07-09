import { buildCoreWorkSurface } from "./core-work-surface.js";

const BLOCKED_EXECUTION_ACTIONS = [
  "live model call",
  "tool/CLI/MCP execution",
  "connector activation",
  "external network/send",
  "approval write",
  "install/update/rollback",
  "durable memory promotion",
];

export function buildWorkSurfaceSubmissionDecisionGate({
  root,
  draftRequest,
  now = new Date().toISOString(),
} = {}) {
  const workSurface = buildCoreWorkSurface({ root, draftRequest, now });

  return {
    schema: "gpao_t.work_surface_submission_decision_gate.v0_1",
    status: "ready",
    gateMode: "design_only_no_live_submission",
    generatedAt: now,
    sourceSurface: "/work-surface",
    inputPacketSchema: {
      schema: "gpao_t.work_submission_candidate.v0_1",
      description: "User draft input normalized into a preview-only submission candidate.",
      requiredFields: [
        "draftText",
        "sourceSurface",
        "locale",
        "createdAt",
        "submissionMode",
      ],
      optionalFields: [
        "activeTargetId",
        "userVisibleIntent",
        "attachmentReferences",
        "requestedOutputShape",
      ],
      fieldRules: [
        { field: "draftText", rule: "required string, trimmed, non-empty before preview" },
        { field: "sourceSurface", rule: "must be /work-surface in this gate" },
        { field: "submissionMode", rule: "must be preview_only_not_submitted" },
        { field: "attachmentReferences", rule: "metadata references only; no file read or upload in this gate" },
      ],
      blockedFields: [
        "modelProviderToken",
        "connectorCredential",
        "externalSendTarget",
        "approvalRecordId",
        "durableMemoryPromotion",
      ],
    },
    exampleInputPacket: {
      schema: "gpao_t.work_submission_candidate.v0_1",
      draftText: workSurface.workspaceThread.composer.draftRequest,
      sourceSurface: "/work-surface",
      locale: workSurface.workspaceThread.language,
      activeTargetId: workSurface.taskState.activeTargetId,
      userVisibleIntent: workSurface.taskState.objective,
      attachmentReferences: [],
      requestedOutputShape: "unknown_until_preview",
      createdAt: now,
      submissionMode: "preview_only_not_submitted",
    },
    immediatePreviewState: {
      schema: "gpao_t.work_submission_preview_state.v0_1",
      status: "preview_ready",
      lifecycle: [
        "draft_normalized",
        "context_mesh_preview_attached",
        "skill_route_preview_attached",
        "authority_boundary_attached",
        "user_confirmation_required",
        "stop_before_execution",
      ],
      visibleToUser: [
        "normalized task objective",
        "Context Mesh / Memory Wiki candidates",
        "Skill Pack route preview",
        "authority boundary and blocked actions",
        "review/block reason when submission cannot proceed",
      ],
      writesState: false,
      invokesModel: false,
      executesTools: false,
      activatesConnectors: false,
    },
    contextMeshAttachment: {
      mode: "preview_only",
      status: workSurface.contextPreview.status,
      candidateCount: workSurface.contextPreview.retrievedCandidates.length,
      topCandidate: workSurface.contextPreview.retrievedCandidates[0] || null,
      durablePromotion: "blocked",
    },
    skillRouteAttachment: {
      mode: "preview_only",
      status: workSurface.skillRoutePreview.status,
      executionMode: workSurface.skillRoutePreview.executionMode,
      selectedPacks: workSurface.skillRoutePreview.selectedPacks,
      liveSkillExecution: false,
    },
    authorityBoundary: {
      status: "closed_before_execution",
      userCanConfirmPreview: true,
      userCanSubmitLiveNow: false,
      liveModelCall: "blocked",
      toolCliMcpExecution: "blocked",
      connectorActivation: "blocked",
      externalNetworkSend: "blocked",
      approvalWrite: "blocked",
      installUpdateRollback: "blocked",
      durableMemoryPromotion: "blocked",
      blockedActions: BLOCKED_EXECUTION_ACTIONS,
    },
    preSubmitUserConfirmation: {
      status: "required_before_future_submission",
      userMustSee: [
        "what task GPAO-T understood",
        "which context evidence is being used",
        "which skill route is proposed",
        "which actions remain blocked",
        "where execution will stop",
      ],
      allowedConfirmationNow: "review_preview_only",
      disallowedConfirmationNow: "execute_or_send",
    },
    reviewAndBlockedConditions: [
      {
        condition: "empty_or_whitespace_input",
        outcome: "blocked",
        recovery: "Ask user to enter a task before building preview state.",
      },
      {
        condition: "ambiguous_target_or_missing_active_context",
        outcome: "review",
        recovery: "Show active target uncertainty and ask for clarification before future submission.",
      },
      {
        condition: "authority_sensitive_request_detected",
        outcome: "review",
        recovery: "Keep preview state visible and require explicit later approval before any external action.",
      },
      {
        condition: "requests_external_send_connector_or_tool_execution",
        outcome: "blocked",
        recovery: "Stop before execution and route to a separate approval/execution gate.",
      },
      {
        condition: "requests_durable_memory_or_self_growth_apply",
        outcome: "blocked",
        recovery: "Route to memory/growth replay, audit, rollback, and approval gates.",
      },
    ],
    stopLine: {
      name: "preview_ready_stop_before_execution",
      stopsBefore: BLOCKED_EXECUTION_ACTIONS,
      nextGateRequired: "submission_validation_and_confirmation_gate",
      liveSubmissionImplemented: false,
    },
    nextSafeAction:
      "Design the submission validation and confirmation gate before implementing live submission. Keep model/tool/connector execution and external send blocked.",
  };
}

export function verifyWorkSurfaceSubmissionDecisionGate({
  gate = buildWorkSurfaceSubmissionDecisionGate(),
} = {}) {
  const findings = [];

  if (gate.schema !== "gpao_t.work_surface_submission_decision_gate.v0_1") findings.push("invalid_submission_gate_schema");
  if (gate.gateMode !== "design_only_no_live_submission") findings.push("submission_gate_not_design_only");
  if (gate.exampleInputPacket?.submissionMode !== "preview_only_not_submitted") findings.push("example_packet_not_preview_only");
  if (!gate.inputPacketSchema?.requiredFields?.includes("draftText")) findings.push("missing_draft_text_schema");
  if (gate.immediatePreviewState?.writesState !== false) findings.push("preview_state_writes_enabled");
  if (gate.immediatePreviewState?.invokesModel !== false) findings.push("preview_state_model_enabled");
  if (gate.immediatePreviewState?.executesTools !== false) findings.push("preview_state_tools_enabled");
  if (gate.immediatePreviewState?.activatesConnectors !== false) findings.push("preview_state_connectors_enabled");
  if (gate.contextMeshAttachment?.mode !== "preview_only") findings.push("context_mesh_not_preview_only");
  if (gate.skillRouteAttachment?.liveSkillExecution !== false) findings.push("skill_execution_open");
  if (gate.authorityBoundary?.userCanSubmitLiveNow !== false) findings.push("live_submission_open");
  if (gate.authorityBoundary?.externalNetworkSend !== "blocked") findings.push("external_send_not_blocked");
  if (gate.authorityBoundary?.approvalWrite !== "blocked") findings.push("approval_write_not_blocked");
  if (gate.authorityBoundary?.durableMemoryPromotion !== "blocked") findings.push("durable_memory_not_blocked");
  if (!gate.reviewAndBlockedConditions?.some((condition) => condition.outcome === "blocked")) findings.push("missing_blocked_conditions");
  if (gate.stopLine?.liveSubmissionImplemented !== false) findings.push("live_submission_implemented");

  return {
    schema: "gpao_t.work_surface_submission_decision_gate_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedBoundaries: gate.authorityBoundary?.blockedActions || [],
    nextSafeAction: findings.length
      ? "Fix submission decision gate findings before any submission implementation design."
      : gate.nextSafeAction,
  };
}
