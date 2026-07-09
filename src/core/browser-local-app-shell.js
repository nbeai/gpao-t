import { buildControlCenterSnapshot, buildControlCenterSummary } from "./control-center.js";
import {
  buildControlCenterUiContract,
  buildControlCenterUiSnapshot,
  validateControlCenterUiSnapshot,
} from "./control-center-ui-contract.js";
import { buildLocalControlCenterDesignContract } from "./design-contract.js";
import { runDoctor } from "./doctor.js";

export const BROWSER_LOCAL_ALLOWED_GET_ROUTES = [
  "/health",
  "/work-surface",
  "/work-surface/state",
  "/work-surface/verify",
  "/work-surface/submission-gate",
  "/work-surface/submission-gate/verify",
  "/work-surface/submission-validation-gate",
  "/work-surface/submission-validation-gate/verify",
  "/work-surface/execution-flow",
  "/work-surface/execution-flow/confirmation",
  "/work-surface/execution-flow/verify",
  "/sessions",
  "/sessions/verify",
  "/control-center",
  "/control-center/summary",
  "/control-center/design",
  "/control-center/ui-contract",
  "/control-center/ui-snapshot",
  "/control-center/ui-validate",
  "/app-shell/production-hardening",
  "/app-shell/production-hardening/state",
  "/app-shell/production-hardening/verify",
];

export const BROWSER_LOCAL_BLOCKED_POST_ROUTES = [
  "/turn",
  "/connectors/review",
  "/adapters/plan",
  "/memory/capture",
  "/mesh/resolve",
  "/growth/application-gate",
  "/growth/application-gate/record",
  "/ops/install-hardening/record",
  "/skill/execute-record",
];

const BLOCKED_ACTIONS = [
  "POST routes",
  "connector activation",
  "model activation",
  "tool activation",
  "install execution",
  "update execution",
  "rollback execution",
  "durable memory promotion",
  "self-growth apply",
  "deployment",
  "messenger surfaces",
  "recurring automation",
];

const FAILURE_RECOVERY_STATES = [
  {
    id: "runtime_unavailable",
    label: "Runtime unavailable",
    recovery: "Keep shell actions blocked and ask the user to run `gpao-t control serve-check` or restart the loopback preview.",
  },
  {
    id: "health_not_ready",
    label: "Health not ready",
    recovery: "Show doctor findings from `GET /health` and keep shell actions blocked.",
  },
  {
    id: "snapshot_invalid",
    label: "Snapshot invalid",
    recovery: "Show UI validation findings from `GET /control-center/ui-validate` and block shell progression.",
  },
  {
    id: "stale_snapshot",
    label: "Stale snapshot",
    recovery: "Show a stale-state marker and allow only a read-only refresh.",
  },
  {
    id: "port_conflict",
    label: "Port conflict",
    recovery: "Use an alternate explicit loopback port and do not retry silently.",
  },
  {
    id: "permission_blocked",
    label: "Permission blocked",
    recovery: "Show the blocked local permission and keep the action manual.",
  },
  {
    id: "overflow_regression",
    label: "Overflow regression",
    recovery: "Block visual-quality claims until desktop and mobile screenshot QA pass.",
  },
  {
    id: "authority_hidden",
    label: "Authority hidden",
    recovery: "Block shell progression until authority boundary text is visible.",
  },
  {
    id: "next_action_hidden",
    label: "Next action hidden",
    recovery: "Block shell progression until next safe action is visible.",
  },
];

const SCREENSHOT_QA = {
  requiredViewports: [
    { label: "desktop", width: 1440, height: 960 },
    { label: "mobile", width: 390, height: 844 },
  ],
  requiredSignals: [
    "nonblank_viewport",
    "panel_navigation_visible",
    "evidence_inspector_visible",
    "failure_recovery_state_visible",
    "no_horizontal_overflow",
    "authority_boundary_visible",
    "next_safe_action_visible",
    "mobile_fixed_topbar_action_or_decision_strip_visible",
    "no_external_activation",
  ],
};

export function buildBrowserLocalAppShellContract() {
  return {
    schema: "gpao_t.browser_local_app_shell_contract.v0_1",
    status: "ready",
    shellKind: "browser_local_app_shell",
    implementationSlice: "read_mostly_first_slice",
    runtimeBoundary: {
      transport: "127.0.0.1_http",
      localIpc: "blocked_in_first_slice",
      packagedDesktopTarget: "tauri_after_browser_local_proof",
      electron: "deferred_fallback_only",
    },
    allowedGetRoutes: BROWSER_LOCAL_ALLOWED_GET_ROUTES,
    blockedPostRoutes: BROWSER_LOCAL_BLOCKED_POST_ROUTES,
    allowedActions: [
      "read_health",
      "read_control_center_state",
      "navigate_panels",
      "inspect_evidence",
      "show_authority_boundary",
      "show_next_safe_action",
      "show_failure_recovery_state",
      "run_screenshot_qa",
    ],
    blockedActions: BLOCKED_ACTIONS,
    authorityBoundary: {
      mutationAuthority: "none_in_first_slice",
      connectorActivation: "blocked",
      externalModelCall: "blocked",
      externalToolExecution: "blocked",
      installUpdateRollback: "blocked",
      durableMemoryPromotion: "blocked",
      selfGrowthApply: "blocked",
      deployment: "blocked",
      messenger: "blocked",
      automation: "blocked",
    },
    auditReplayRollback: {
      auditWritesFromShell: false,
      replayEvidence: "snapshot_ui_validation_and_screenshot_qa_only",
      sourceRollback: "local_git",
      runtimeRollback: "blocked_until_snapshot_export_import_and_approval",
      packageRollback: "later_hardening_gate",
    },
    screenshotQa: SCREENSHOT_QA,
    failureRecoveryStates: FAILURE_RECOVERY_STATES,
    nextSafeAction:
      "Use browser-local state lanes and screenshot QA as the regression anchor before any packaged desktop, IPC, mutation, connector, model, tool, deployment, messenger, or automation gate.",
  };
}

export function buildBrowserLocalAppShellState({
  root,
  now = new Date().toISOString(),
  runtimeAvailable = true,
  staleSnapshot = false,
  portConflict = false,
  permissionBlocked = false,
  overflowRegression = false,
  authorityHidden = false,
  nextActionHidden = false,
} = {}) {
  const contract = buildBrowserLocalAppShellContract();
  const health = runtimeAvailable
    ? runDoctor({ root })
    : {
        schema: "gpao_t.doctor.v0_1",
        status: "blocked",
        missing: ["loopback_runtime_unavailable"],
        nextAction: "Restart the loopback preview before using the app shell.",
      };
  const snapshot = buildControlCenterSnapshot({ root });
  const summary = buildControlCenterSummary({ root });
  const design = buildLocalControlCenterDesignContract();
  const uiContract = buildControlCenterUiContract();
  const uiSnapshot = buildControlCenterUiSnapshot({ snapshot, designContract: design, uiContract });
  const uiValidation = validateControlCenterUiSnapshot({ uiSnapshot });

  const stateFlags = {
    runtime_unavailable: !runtimeAvailable,
    health_not_ready: health.status !== "ready",
    snapshot_invalid: uiValidation.status === "blocked",
    stale_snapshot: staleSnapshot,
    port_conflict: portConflict,
    permission_blocked: permissionBlocked,
    overflow_regression: overflowRegression,
    authority_hidden: authorityHidden || !Object.keys(snapshot.authorityBoundary || {}).length,
    next_action_hidden: nextActionHidden || !snapshot.nextSafeAction,
  };
  const failureRecoveryStates = contract.failureRecoveryStates.map((state) => ({
    ...state,
    active: Boolean(stateFlags[state.id]),
  }));
  const activeFailureStates = failureRecoveryStates.filter((state) => state.active);
  const stateLanes = buildAppShellStateLanes({
    contract,
    health,
    summary,
    uiValidation,
    activeFailureStates,
  });

  return {
    schema: "gpao_t.browser_local_app_shell_state.v0_1",
    status: activeFailureStates.length ? "review" : "ready",
    generatedAt: now,
    contractSchema: contract.schema,
    sourceRoutes: contract.allowedGetRoutes.map((path) => ({
      method: "GET",
      path,
      mode: "read_only",
      status: path === "/health" ? health.status : "ready",
    })),
    blockedRoutes: contract.blockedPostRoutes.map((path) => ({
      method: "POST",
      path,
      mode: "blocked",
      reason: "browser_local_shell_first_slice_is_read_mostly",
    })),
    health,
    summary,
    uiValidation,
    stateLanes,
    panels: summary.panels.map((panel) => ({
      ...panel,
      anchor: `#shell-panel-${panel.id}`,
      inspector: `#shell-evidence-${panel.id}`,
      evidenceLabel: `${panel.id} evidence`,
      authority: derivePanelAuthority({ panelId: panel.id, authorityBoundary: summary.authorityBoundary }),
      workflowState: derivePanelWorkflowState(panel),
      recoveryState: derivePanelRecoveryState({ panel, activeFailureStates }),
      authorityState: derivePanelAuthority({ panelId: panel.id, authorityBoundary: summary.authorityBoundary }),
      nextActionState: panel.nextSafeAction || "Inspect this panel before any deeper behavior is added.",
    })),
    authorityBoundary: contract.authorityBoundary,
    blockedActions: contract.blockedActions,
    screenshotQa: contract.screenshotQa,
    failureRecoveryStates,
    activeFailureStates,
    nextSafeAction: activeFailureStates.length
      ? activeFailureStates[0].recovery
      : "Use panel navigation, state lanes, and evidence inspection; keep all mutating actions blocked.",
  };
}

export function buildBrowserLocalAppShellHtml({ state } = {}) {
  const shellState = state || buildBrowserLocalAppShellState();
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GPAO-T Browser-Local App Shell</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fa;
      --surface: #ffffff;
      --muted: #5f6f7f;
      --text: #17202a;
      --line: #d9e1e8;
      --ready: #0b7a53;
      --blocked: #b42318;
      --review: #986000;
      --accent: #2656a3;
    }
    * { box-sizing: border-box; }
    html, body { max-width: 100%; overflow-x: hidden; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      gap: 14px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--line);
      background: var(--surface);
    }
    h1, h2, h3, p { margin: 0; letter-spacing: 0; }
    h1 { font-size: 19px; }
    .subtitle, .muted { color: var(--muted); font-size: 13px; overflow-wrap: anywhere; }
    .topbar-action { color: var(--muted); font-size: 12px; max-width: 520px; overflow-wrap: anywhere; }
    .topbar-action p { margin: 0; }
    .mobile-action-line {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      margin-top: 6px;
      color: var(--muted);
    }
    .mobile-action-line span {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 3px 8px;
      background: #ffffff;
      color: var(--muted);
      font-weight: 800;
    }
    .mobile-panel-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .mobile-panel-nav a {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 3px 8px;
      background: #edf2f7;
      color: var(--text);
      font-size: 12px;
      font-weight: 800;
      text-decoration: none;
    }
    .layout {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr) 320px;
      min-height: calc(100vh - 58px);
    }
    nav, aside { padding: 16px; background: var(--surface); }
    nav { border-right: 1px solid var(--line); }
    aside { border-left: 1px solid var(--line); }
    main { padding: 16px; min-width: 0; }
    .nav-title { margin-bottom: 10px; color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; }
    .nav-link {
      display: block;
      padding: 8px;
      border-radius: 6px;
      color: var(--text);
      font-size: 13px;
      text-decoration: none;
      overflow-wrap: anywhere;
    }
    .nav-link:hover, .nav-link:focus-visible { background: #edf2f7; outline: 1px solid var(--accent); }
    .strip {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 12px;
    }
    .state-lanes {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 12px;
    }
    .card, .panel, .side {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      box-shadow: 0 1px 2px rgba(23, 32, 42, 0.06);
    }
    .card, .side { padding: 12px; }
    .panel {
      padding: 14px;
      scroll-margin-top: 86px;
    }
    .panel + .panel { margin-top: 12px; }
    .panel:target, .evidence:target { outline: 2px solid var(--accent); outline-offset: 2px; }
    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 8px;
    }
    .status {
      border: 1px solid currentColor;
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.2;
      white-space: nowrap;
    }
    .status-ready { color: var(--ready); }
    .status-review { color: var(--review); }
    .status-blocked { color: var(--blocked); }
    .next {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--line);
      font-size: 13px;
      overflow-wrap: anywhere;
    }
    .actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .action {
      min-height: 32px;
      padding: 7px 8px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #edf2f7;
      color: var(--text);
      font-size: 12px;
      font-weight: 800;
      text-align: center;
      text-decoration: none;
      overflow-wrap: anywhere;
    }
    .evidence {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
      scroll-margin-top: 86px;
    }
    .evidence summary {
      cursor: pointer;
      font-weight: 800;
      font-size: 13px;
    }
    .list {
      display: grid;
      gap: 8px;
      margin-top: 10px;
    }
    .row {
      display: grid;
      grid-template-columns: 104px minmax(0, 1fr);
      gap: 8px;
      font-size: 12px;
    }
    .row strong { color: var(--muted); overflow-wrap: anywhere; }
    .row span { overflow-wrap: anywhere; }
    .state-card h3 {
      margin-bottom: 6px;
      font-size: 13px;
    }
    .state-card p { font-size: 12px; overflow-wrap: anywhere; }
    .state-card .source { margin-top: 8px; color: var(--muted); font-size: 11px; }
    .side + .side { margin-top: 12px; }
    .blocked-list {
      margin: 8px 0 0;
      padding-left: 18px;
      color: var(--muted);
      font-size: 12px;
    }
    .blocked-list li + li { margin-top: 4px; }
    @media (max-width: 920px) {
      .layout { grid-template-columns: 1fr; }
      nav, aside { border: 0; border-bottom: 1px solid var(--line); }
      nav { order: 3; }
      main { order: 1; }
      aside { order: 2; }
    }
    @media (max-width: 640px) {
      .topbar {
        position: fixed;
        width: 100%;
        flex-direction: column;
        padding: 12px 14px;
      }
      .layout { padding-top: 220px; }
      main, nav, aside { padding: 12px; }
      .strip { grid-template-columns: 1fr; }
      .state-lanes { grid-template-columns: 1fr; }
      .actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .panel, .evidence { scroll-margin-top: 260px; }
    }
  </style>
</head>
<body data-app-shell="browser-local" data-interaction-mode="read-mostly-get">
  <header class="topbar">
    <div>
      <h1>GPAO-T Browser-Local App Shell</h1>
      <p class="subtitle">127.0.0.1 read-mostly shell · POST and external activation blocked</p>
    </div>
    <div class="topbar-action">
      <p data-next-safe-action="shell"><strong>다음 안전 행동:</strong> ${escapeHtml(shellState.nextSafeAction)}</p>
      <div class="mobile-panel-nav" data-panel-navigation="topbar" aria-label="Mobile panel navigation">
        <a href="#shell-panel-runtime">Runtime</a>
        <a href="#shell-panel-authority">Authority</a>
        <a href="#shell-screenshot-qa">QA</a>
      </div>
      <div class="mobile-action-line" aria-label="Mobile shell safety line">
        <span data-authority-boundary="topbar">Authority blocked</span>
        <span data-screenshot-qa="topbar">Screenshot QA required</span>
      </div>
    </div>
  </header>
  <div class="layout">
    <nav class="panel-nav" aria-label="Browser-local shell panel navigation">
      <p class="nav-title">Panels</p>
      ${shellState.panels.map((panel) => `<a class="nav-link" href="${panel.anchor}">${escapeHtml(panel.label)}</a>`).join("")}
      <p class="nav-title" style="margin-top:16px;">Evidence</p>
      <a class="nav-link" href="#shell-failure-recovery">Failure / Recovery</a>
      <a class="nav-link" href="#shell-screenshot-qa">Screenshot QA</a>
      <a class="nav-link" href="#shell-authority">Authority Boundary</a>
    </nav>
    <main>
      <section class="strip" aria-label="Browser-local shell status">
        <div class="card"><h2>${escapeHtml(shellState.status)}</h2><p class="muted">Shell state</p></div>
        <div class="card"><h2>${shellState.panels.length}</h2><p class="muted">Readable panels</p></div>
        <div class="card"><h2>${shellState.activeFailureStates.length}</h2><p class="muted">Active recovery states</p></div>
      </section>
      <section class="state-lanes" id="shell-state-lanes" aria-label="Workflow, recovery, authority, and next action state lanes">
        ${shellState.stateLanes.map(renderStateLane).join("")}
      </section>
      ${shellState.panels.map(renderPanel).join("")}
    </main>
    <aside>
      <section class="side" id="shell-authority" data-authority-boundary="side">
        <h2>Authority Boundary</h2>
        <p class="muted">First slice exposes read-only and blocked states. It does not mutate runtime state.</p>
        <ul class="blocked-list">
          ${shellState.blockedActions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}
        </ul>
      </section>
      <section class="side" id="shell-failure-recovery">
        <h2>Failure / Recovery</h2>
        <div class="list">
          ${shellState.failureRecoveryStates.map(renderFailureState).join("")}
        </div>
      </section>
      <section class="side" id="shell-screenshot-qa" data-screenshot-qa="side">
        <h2>Screenshot QA</h2>
        <p class="muted">Required before claiming browser-local shell visual quality.</p>
        <ul class="blocked-list">
          ${shellState.screenshotQa.requiredSignals.map((signal) => `<li>${escapeHtml(signal)}</li>`).join("")}
        </ul>
      </section>
    </aside>
  </div>
</body>
</html>`;
}

export function verifyBrowserLocalAppShell({ html, state } = {}) {
  const shellHtml = html || buildBrowserLocalAppShellHtml({ state });
  const findings = [];
  const requiredText = [
    "GPAO-T Browser-Local App Shell",
    "127.0.0.1 read-mostly shell",
    "Authority Boundary",
    "Failure / Recovery",
    "Screenshot QA",
    "POST and external activation blocked",
  ];

  for (const text of requiredText) {
    if (!shellHtml.includes(text)) findings.push(`missing_text:${text}`);
  }
  if (/<script/i.test(shellHtml)) findings.push("script_tag_present");
  if (/<form/i.test(shellHtml)) findings.push("form_present");
  if (/method=["']?post/i.test(shellHtml)) findings.push("post_form_present");
  if (/https?:\/\/(?!127\.0\.0\.1|localhost)/i.test(shellHtml)) findings.push("external_url_present");
  if (!/data-app-shell="browser-local"/.test(shellHtml)) findings.push("missing_browser_local_marker");
  if (!/data-shell-panel=/.test(shellHtml)) findings.push("missing_panel_marker");
  if (!/data-failure-recovery-state=/.test(shellHtml)) findings.push("missing_failure_recovery_marker");
  if (!/data-state-lane="workflow"/.test(shellHtml)) findings.push("missing_workflow_state_lane");
  if (!/data-state-lane="recovery"/.test(shellHtml)) findings.push("missing_recovery_state_lane");
  if (!/data-state-lane="authority"/.test(shellHtml)) findings.push("missing_authority_state_lane");
  if (!/data-state-lane="next"/.test(shellHtml)) findings.push("missing_next_action_state_lane");
  if (!/data-workflow-state=/.test(shellHtml)) findings.push("missing_panel_state_drilldown");

  return {
    schema: "gpao_t.browser_local_app_shell_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    screenshotQa: buildBrowserLocalAppShellContract().screenshotQa,
    authorityBoundary: buildBrowserLocalAppShellContract().authorityBoundary,
    nextSafeAction: findings.length
      ? "Fix browser-local shell findings before screenshot QA."
      : "Use /app-shell state lanes and screenshot QA as the read-only regression anchor before opening packaged desktop or mutation gates.",
  };
}

function renderPanel(panel) {
  return `<article class="panel" id="shell-panel-${escapeHtml(panel.id)}" data-shell-panel="${escapeHtml(panel.id)}" data-panel="${escapeHtml(panel.id)}">
    <div class="panel-head">
      <div>
        <h2>${escapeHtml(panel.label)}</h2>
        <p class="muted">${escapeHtml(panel.headline)}</p>
      </div>
      <span class="status status-${escapeHtml(panel.status)}">${escapeHtml(panel.status)}</span>
    </div>
    <p class="next"><strong>Next:</strong> ${escapeHtml(panel.nextSafeAction)}</p>
    <div class="actions">
      <a class="action" href="${panel.inspector}">Evidence</a>
      <a class="action" href="#shell-authority">Authority</a>
    </div>
    <details class="evidence" id="shell-state-${escapeHtml(panel.id)}" data-workflow-state="${escapeHtml(panel.id)}">
      <summary>state drilldown</summary>
      <div class="list">
        <div class="row"><strong>Workflow</strong><span>${escapeHtml(panel.workflowState)}</span></div>
        <div class="row"><strong>Recovery</strong><span>${escapeHtml(panel.recoveryState)}</span></div>
        <div class="row"><strong>Authority</strong><span>${escapeHtml(panel.authorityState)}</span></div>
        <div class="row"><strong>Next</strong><span>${escapeHtml(panel.nextActionState)}</span></div>
      </div>
    </details>
    <details class="evidence" id="shell-evidence-${escapeHtml(panel.id)}" data-evidence-inspection="${escapeHtml(panel.id)}">
      <summary>${escapeHtml(panel.evidenceLabel)}</summary>
      <div class="list">
        <div class="row"><strong>Panel ID</strong><span>${escapeHtml(panel.id)}</span></div>
        <div class="row"><strong>Status</strong><span>${escapeHtml(panel.status)}</span></div>
        <div class="row"><strong>Authority</strong><span>${escapeHtml(panel.authority)}</span></div>
        <div class="row"><strong>Transport</strong><span>GET-only 127.0.0.1 HTTP source routes</span></div>
      </div>
    </details>
  </article>`;
}

function renderStateLane(lane) {
  return `<article class="card state-card" data-state-lane="${escapeHtml(lane.id)}">
    <h3>${escapeHtml(lane.label)}</h3>
    <p><span class="status status-${escapeHtml(lane.status)}">${escapeHtml(lane.status)}</span></p>
    <p style="margin-top:8px;">${escapeHtml(lane.summary)}</p>
    <p class="source">${escapeHtml(lane.source)}</p>
  </article>`;
}

function renderFailureState(state) {
  const status = state.active ? "review" : "ready";
  return `<div class="card" data-failure-recovery-state="${escapeHtml(state.id)}" data-active="${state.active ? "true" : "false"}">
    <div class="row"><strong>${escapeHtml(state.label)}</strong><span class="status status-${status}">${state.active ? "active" : "standby"}</span></div>
    <p class="muted" style="margin-top:6px;">${escapeHtml(state.recovery)}</p>
  </div>`;
}

function derivePanelAuthority({ panelId, authorityBoundary }) {
  const authorityMap = {
    adapters: authorityBoundary.externalModelCall,
    connectors: authorityBoundary.connectorActivation,
    growth: authorityBoundary.growthApplication,
    memory: authorityBoundary.durableMemoryPromotion,
    ops: authorityBoundary.installExecution,
    authority: "read_only_boundary_review",
  };
  return authorityMap[panelId] || "read_only";
}

function buildAppShellStateLanes({ contract, health, summary, uiValidation, activeFailureStates }) {
  return [
    {
      id: "workflow",
      label: "Workflow State",
      status: summary.status === "blocked" ? "blocked" : "ready",
      summary: `${summary.panels.length} panels are readable through GET-only shell state.`,
      source: "GET /control-center/summary",
    },
    {
      id: "recovery",
      label: "Recovery State",
      status: activeFailureStates.length ? "review" : "ready",
      summary: activeFailureStates.length
        ? `${activeFailureStates.length} recovery state(s) need attention before deeper behavior.`
        : "No active recovery state blocks read-only inspection.",
      source: "GET /health + GET /control-center/ui-validate",
    },
    {
      id: "authority",
      label: "Authority State",
      status: "ready",
      summary: `${contract.blockedActions.length} mutating action classes remain blocked.`,
      source: "browser-local app-shell contract",
    },
    {
      id: "next",
      label: "Next Action State",
      status: health.status === "ready" && uiValidation.status === "ready" ? "ready" : "review",
      summary: activeFailureStates[0]?.recovery || "Continue with read-only inspection; do not activate connectors, tools, deployment, or memory promotion.",
      source: "derived from doctor, UI validation, and active recovery state",
    },
  ];
}

function derivePanelWorkflowState(panel) {
  if (panel.status === "blocked") return "blocked_panel_requires_recovery_before_deeper_behavior";
  if (panel.status === "review") return "review_panel_readable_but_not_actionable";
  return "ready_panel_readable";
}

function derivePanelRecoveryState({ panel, activeFailureStates }) {
  if (activeFailureStates.length) return `shell_recovery_attention:${activeFailureStates[0].id}`;
  if (panel.status === "blocked") return "panel_blocked_but_shell_actions_remain_read_only";
  return "no_active_shell_recovery";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
