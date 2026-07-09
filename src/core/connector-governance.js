const CONNECTORS = [
  {
    id: "local.filesystem",
    label: "Local Files",
    type: "local",
    status: "preview_available",
    scopes: ["read_local_project_files"],
    defaultAccess: "read_preview",
    sensitivity: "local_data",
    activation: "local_preview_only",
  },
  {
    id: "browser.session",
    label: "Browser",
    type: "local_app",
    status: "blocked_until_user_session",
    scopes: ["read_current_page", "draft_browser_action"],
    defaultAccess: "draft_only",
    sensitivity: "session_data",
    activation: "requires_user_visible_session",
  },
  {
    id: "github.oauth",
    label: "GitHub",
    type: "oauth",
    status: "blocked_until_configured",
    scopes: ["repo_read", "issue_read", "pull_request_read", "draft_change"],
    defaultAccess: "read_candidate_only",
    sensitivity: "account_data",
    activation: "requires_oauth_setup_and_task_approval",
  },
  {
    id: "google.workspace.oauth",
    label: "Google Workspace",
    type: "oauth",
    status: "blocked_until_configured",
    scopes: ["calendar_read", "gmail_read", "drive_read", "draft_message"],
    defaultAccess: "read_candidate_only",
    sensitivity: "personal_or_business_data",
    activation: "requires_oauth_setup_and_task_approval",
  },
  {
    id: "notion.oauth",
    label: "Notion",
    type: "oauth",
    status: "blocked_until_configured",
    scopes: ["page_read", "database_read", "draft_page_update"],
    defaultAccess: "read_candidate_only",
    sensitivity: "workspace_data",
    activation: "requires_oauth_setup_and_task_approval",
  },
  {
    id: "slack.oauth",
    label: "Slack",
    type: "oauth",
    status: "blocked_until_configured",
    scopes: ["channel_read", "message_draft"],
    defaultAccess: "read_candidate_only",
    sensitivity: "team_communications",
    activation: "requires_oauth_setup_and_task_approval",
  },
];

const ACTION_GATES = {
  read: {
    allowedStatuses: ["preview_available"],
    requiredApproval: "connector_read_approval",
    blockedActions: [],
  },
  draft: {
    allowedStatuses: ["preview_available"],
    requiredApproval: "connector_draft_approval",
    blockedActions: [],
  },
  write: {
    allowedStatuses: [],
    requiredApproval: "connector_write_approval",
    blockedActions: ["external_mutation", "durable_mutation"],
  },
  send: {
    allowedStatuses: [],
    requiredApproval: "external_send",
    blockedActions: ["external_action", "external_send"],
  },
  automate: {
    allowedStatuses: [],
    requiredApproval: "recurring_automation",
    blockedActions: ["recurring_automation", "external_action"],
  },
};

const EXECUTION_CANDIDATE_CLASSES = [
  {
    id: "tool.local_read",
    label: "Local read tool",
    surface: "tool",
    examples: ["local file inspection", "local replay evidence read"],
    defaultAuthorityTier: "read_only",
    proposalCondition: "model_output_names_a_local_read_intent_and_task_packet_has_admitted_evidence",
    allowedPreviewState: "candidate_only",
  },
  {
    id: "cli.local_dry_run",
    label: "Local CLI dry-run",
    surface: "cli",
    examples: ["verify plan", "render preview", "doctor check"],
    defaultAuthorityTier: "dry_run",
    proposalCondition: "model_output_requests_a_non_mutating_command_and_confirmation_card_exists",
    allowedPreviewState: "approval_packet_preview_only",
  },
  {
    id: "mcp.read_only",
    label: "Read-only MCP query",
    surface: "mcp",
    examples: ["read docs", "inspect schema", "fetch local MCP resource"],
    defaultAuthorityTier: "read_only",
    proposalCondition: "model_output_identifies_read_scope_without_external_send_or_mutation",
    allowedPreviewState: "candidate_only",
  },
  {
    id: "connector.read",
    label: "Connector read",
    surface: "connector",
    examples: ["GitHub issue read", "calendar read", "Notion page read"],
    defaultAuthorityTier: "read_only",
    proposalCondition: "connector_is_configured_for_read_and_task_approval_is_present",
    allowedPreviewState: "blocked_until_connector_setup",
  },
  {
    id: "connector.write",
    label: "Connector write",
    surface: "connector",
    examples: ["create issue draft", "update page", "calendar edit"],
    defaultAuthorityTier: "write",
    proposalCondition: "write_scope_is_minimal_replayable_and_user_approved",
    allowedPreviewState: "blocked_until_write_approval",
  },
  {
    id: "external.send",
    label: "External send",
    surface: "connector",
    examples: ["send message", "post comment", "publish release"],
    defaultAuthorityTier: "external_send",
    proposalCondition: "recipient_payload_scope_and_rollback_or_compensation_are_visible",
    allowedPreviewState: "blocked_until_explicit_send_approval",
  },
  {
    id: "destructive.action",
    label: "Destructive action",
    surface: "tool_or_connector",
    examples: ["delete", "overwrite", "rollback that removes state"],
    defaultAuthorityTier: "destructive",
    proposalCondition: "destructive_intent_is_explicit_and_recovery_snapshot_exists",
    allowedPreviewState: "blocked_until_destructive_approval",
  },
];

const AUTHORITY_TIERS = [
  {
    id: "read_only",
    status: "preview_candidate_allowed",
    approvalBoundary: "task_scope_visible",
    auditRequirement: "candidate_trace",
    rollbackReference: "not_required_for_read_only_preview",
  },
  {
    id: "dry_run",
    status: "preview_candidate_allowed",
    approvalBoundary: "confirmation_card_before_invocation",
    auditRequirement: "dry_run_plan_and_expected_no_write_effects",
    rollbackReference: "not_required_until_invocation_opens",
  },
  {
    id: "write",
    status: "blocked",
    approvalBoundary: "explicit_write_approval",
    auditRequirement: "before_after_diff_and_replay_case",
    rollbackReference: "rollback_or_compensation_required_before_apply",
  },
  {
    id: "external_send",
    status: "blocked",
    approvalBoundary: "explicit_external_send_approval",
    auditRequirement: "recipient_payload_scope_and_delivery_receipt",
    rollbackReference: "compensation_or_retraction_plan_required",
  },
  {
    id: "destructive",
    status: "blocked",
    approvalBoundary: "explicit_destructive_approval",
    auditRequirement: "snapshot_replay_and_recovery_plan",
    rollbackReference: "verified_restore_path_required_before_apply",
  },
  {
    id: "paid_action",
    status: "blocked",
    approvalBoundary: "explicit_cost_approval",
    auditRequirement: "cost_ceiling_and_provider_receipt",
    rollbackReference: "not_reversible_cost_must_be_preapproved",
  },
];

const MODEL_OUTPUT_PROPOSAL_CONDITIONS = [
  "model_output_must_be_structured_as_execution_candidate_not_action",
  "candidate_must_name_surface_tool_cli_mcp_or_connector",
  "candidate_must_map_to_authority_tier",
  "task_packet_context_and_skill_route_must_be_attached",
  "risk_classification_must_be_visible_to_user",
  "approval_boundary_must_be_resolved_before_invocation",
  "audit_replay_rollback_reference_must_exist_for_mutating_or_external_tiers",
];

const OPENCLAW_INSPIRED_SUBSTRATE = [
  "gateway_routes_expose_tool_and_connector_state",
  "adapter_registry_keeps_capability_metadata_separate_from_execution",
  "doctor_health_style_checks_can_verify_readiness_without_activation",
  "event_log_can_record_review_or_future_execution_evidence",
  "GPAO_T_authority_layer_overrides_connector_convenience",
];

export function listConnectors() {
  return {
    schema: "gpao_t.connector_registry.v0_1",
    status: "ready",
    connectors: CONNECTORS,
    governanceRule: "connected_does_not_mean_executable",
    connectorDoctrine: "connected_readable_writable_sendable_automatable_are_separate_permissions",
    nextSafeAction: "Review connector permissions locally before OAuth setup, token storage, write access, sends, or automation.",
  };
}

export function reviewConnectorPermission({
  connectorId,
  action = "read",
  task = "unspecified",
} = {}) {
  const connector = CONNECTORS.find((item) => item.id === connectorId);
  const gate = ACTION_GATES[action] || ACTION_GATES.read;

  if (!connector) {
    return {
      schema: "gpao_t.connector_permission_review.v0_1",
      status: "blocked",
      connectorId,
      action,
      task,
      reason: "unknown_connector",
      requiredApprovals: ["connector_selection_review"],
      blockedActions: ["connector_activation"],
      nextSafeAction: "Choose a known connector from the local registry.",
    };
  }

  const status = gate.allowedStatuses.includes(connector.status) ? "preview" : "blocked";
  const requiredApprovals = status === "preview"
    ? []
    : [...new Set([gate.requiredApproval, "connector_setup_review"])];
  const blockedActions = status === "preview"
    ? ["external_action", "secret_write", "durable_mutation"]
    : [...new Set([...gate.blockedActions, "connector_activation", "secret_write"])];

  return {
    schema: "gpao_t.connector_permission_review.v0_1",
    status,
    connector,
    action,
    task,
    connectorDoctrine: "readable_does_not_mean_writable_or_executable",
    access: {
      connected: connector.status === "preview_available",
      readable: status === "preview" && action === "read",
      writable: false,
      executable: false,
      automatable: false,
    },
    requiredApprovals,
    blockedActions,
    audit: {
      required: true,
      eventType: "connector.permission_review",
      tokenStorage: "not_configured",
      rollback: action === "read" || action === "draft" ? "not_required_for_preview" : "required_before_apply",
    },
    nextSafeAction: status === "preview"
      ? "Use this connector only for local preview evidence; do not write, send, automate, or store secrets."
      : "Keep connector inactive until setup, replay, audit, rollback, and explicit approval gates exist.",
  };
}

export function buildConnectorToolGovernance({
  modelOutput = "unspecified model output",
  requestedSurface = "tool",
  requestedTier = "read_only",
} = {}) {
  const candidateClass = EXECUTION_CANDIDATE_CLASSES.find((candidate) =>
    candidate.surface === requestedSurface || candidate.id === requestedSurface
  ) || EXECUTION_CANDIDATE_CLASSES[0];
  const authorityTier = AUTHORITY_TIERS.find((tier) =>
    tier.id === (requestedTier || candidateClass.defaultAuthorityTier)
  ) || AUTHORITY_TIERS[0];

  return {
    schema: "gpao_t.connector_tool_governance.v0_1",
    status: "review",
    surface: "read_only_governance_contract",
    modelOutput,
    selectedCandidateClass: candidateClass,
    selectedAuthorityTier: authorityTier,
    candidateClasses: EXECUTION_CANDIDATE_CLASSES,
    authorityTiers: AUTHORITY_TIERS,
    modelOutputToExecutionProposal: {
      outputIsExecutionAuthority: false,
      outputMayBecomeProposalWhen: MODEL_OUTPUT_PROPOSAL_CONDITIONS,
      proposalForm: "local_execution_candidate_preview",
      requiredPreviewFields: [
        "candidate_id",
        "surface",
        "authority_tier",
        "task_packet_reference",
        "risk_classification",
        "approval_boundary",
        "audit_reference",
        "replay_reference",
        "rollback_reference",
      ],
      blockedUntil: "preview_confirmation_approval_replay_audit_and_rollback_references_exist",
    },
    approvalBoundary: {
      readOnly: "task_scope_visible_no_external_activation",
      dryRun: "confirmation_required_before_invocation",
      write: "blocked_until_explicit_write_approval",
      externalSend: "blocked_until_explicit_external_send_approval",
      destructive: "blocked_until_snapshot_replay_rollback_and_explicit_destructive_approval",
      paidAction: "blocked_until_cost_ceiling_and_explicit_cost_approval",
    },
    auditReplayRollback: {
      auditReference: "future_event_log_entry_required_before_invocation",
      replayReference: "replay_case_required_for_write_external_or_destructive_tiers",
      rollbackReference: "rollback_or_compensation_plan_required_before_mutation",
      writesAuditNow: false,
      invokesReplayNow: false,
      executesRollbackNow: false,
    },
    openClawInspiredSubstrate: OPENCLAW_INSPIRED_SUBSTRATE,
    blockedActions: [
      "actual_tool_execution",
      "cli_command_execution",
      "mcp_invocation",
      "connector_activation",
      "external_network_or_send",
      "credential_read_or_write",
      "paid_action",
      "destructive_action",
      "durable_memory_promotion",
    ],
    safetyInvariants: {
      executesTool: false,
      runsCli: false,
      invokesMcp: false,
      activatesConnector: false,
      sendsExternalNetworkRequest: false,
      readsOrWritesCredentials: false,
      spendsMoney: false,
      performsDestructiveAction: false,
      promotesDurableMemory: false,
    },
    nextSafeAction: "Use this governance contract as the execution-candidate boundary before designing any live tool, CLI, MCP, or connector invocation.",
  };
}

export function verifyConnectorToolGovernance({
  governance = buildConnectorToolGovernance(),
} = {}) {
  const findings = [];

  if (governance.schema !== "gpao_t.connector_tool_governance.v0_1") {
    findings.push("schema_mismatch");
  }
  if (governance.candidateClasses.length < 6) {
    findings.push("candidate_classes_too_small");
  }
  if (!governance.candidateClasses.some((candidate) => candidate.surface === "cli")) {
    findings.push("missing_cli_candidate_class");
  }
  if (!governance.candidateClasses.some((candidate) => candidate.surface === "mcp")) {
    findings.push("missing_mcp_candidate_class");
  }
  if (!governance.authorityTiers.some((tier) => tier.id === "destructive" && tier.status === "blocked")) {
    findings.push("missing_blocked_destructive_tier");
  }
  if (governance.modelOutputToExecutionProposal.outputIsExecutionAuthority !== false) {
    findings.push("model_output_can_execute");
  }
  if (governance.modelOutputToExecutionProposal.outputMayBecomeProposalWhen.length < 6) {
    findings.push("proposal_conditions_incomplete");
  }
  if (governance.auditReplayRollback.writesAuditNow !== false) {
    findings.push("audit_write_opened");
  }
  if (governance.auditReplayRollback.invokesReplayNow !== false) {
    findings.push("replay_invocation_opened");
  }
  if (governance.auditReplayRollback.executesRollbackNow !== false) {
    findings.push("rollback_execution_opened");
  }
  if (!governance.openClawInspiredSubstrate.includes("GPAO_T_authority_layer_overrides_connector_convenience")) {
    findings.push("missing_gpao_t_authority_precedence");
  }
  const invariantValues = Object.values(governance.safetyInvariants);
  if (invariantValues.some(Boolean)) {
    findings.push("safety_invariant_opened_execution");
  }

  return {
    schema: "gpao_t.connector_tool_governance_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checked: [
      "candidate_classification",
      "authority_tiers",
      "model_output_proposal_boundary",
      "approval_boundary",
      "audit_replay_rollback_references",
      "openclaw_substrate_with_gpao_t_authority_precedence",
      "no_live_execution_or_activation",
    ],
    nextSafeAction: findings.length
      ? "Repair governance findings before opening connector/tool design."
      : "Expose this read-only governance proof in Control Center before live execution design.",
  };
}

export function buildConnectorGovernanceSummary() {
  const registry = listConnectors();
  const toolGovernance = buildConnectorToolGovernance();
  const byStatus = registry.connectors.reduce((acc, connector) => {
    acc[connector.status] = (acc[connector.status] || 0) + 1;
    return acc;
  }, {});
  const blocked = registry.connectors.filter((connector) => connector.status !== "preview_available");

  return {
    schema: "gpao_t.connector_governance_summary.v0_1",
    status: "review",
    governanceRule: registry.governanceRule,
    connectorDoctrine: registry.connectorDoctrine,
    totalConnectors: registry.connectors.length,
    byStatus,
    blockedConnectors: blocked.map((connector) => connector.id),
    toolGovernance,
    authorityBoundary: {
      oauthSetup: "blocked_until_explicit_approval",
      tokenStorage: "not_configured",
      writeAccess: "blocked_until_task_approval",
      externalSend: "blocked_until_explicit_approval",
      recurringAutomation: "blocked_until_replay_audit_rollback_approval",
      toolCliMcpExecution: toolGovernance.modelOutputToExecutionProposal.blockedUntil,
    },
    nextSafeAction: toolGovernance.nextSafeAction,
  };
}
