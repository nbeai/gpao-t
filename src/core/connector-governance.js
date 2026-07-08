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

export function buildConnectorGovernanceSummary() {
  const registry = listConnectors();
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
    authorityBoundary: {
      oauthSetup: "blocked_until_explicit_approval",
      tokenStorage: "not_configured",
      writeAccess: "blocked_until_task_approval",
      externalSend: "blocked_until_explicit_approval",
      recurringAutomation: "blocked_until_replay_audit_rollback_approval",
    },
    nextSafeAction: "Use connector reviews as local planning evidence before any real account, token, send, write, or automation step.",
  };
}
