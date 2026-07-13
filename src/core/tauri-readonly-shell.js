import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBrowserLocalAppShellState, verifyBrowserLocalAppShell } from "./browser-local-app-shell.js";
import { buildTauriPackagedDesktopGate, verifyTauriPackagedDesktopGate } from "./tauri-packaged-desktop-gate.js";

const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));

const SOURCE_FILES = [
  "src-tauri/Cargo.toml",
  "src-tauri/build.rs",
  "src-tauri/tauri.conf.json",
  "src-tauri/src/main.rs",
  "src-tauri/capabilities/default.json",
  "tauri-shell/index.html",
];

const VISUAL_QA_BASELINE = {
  report: "docs/03-verification/evidence/tauri-shell-visual-qa-baseline-2026-07-09.json",
  desktop: "docs/03-verification/evidence/tauri-shell-visual-qa-2026-07-09-desktop-viewport-1440x960.jpg",
  mobile: "docs/03-verification/evidence/tauri-shell-visual-qa-2026-07-09-mobile-viewport-390x844.jpg",
  humanReport: "docs/03-verification/evidence/TAURI-SHELL-VISUAL-QA-BASELINE-2026-07-09.md",
};

export function buildTauriReadOnlyShellSlice({
  root = PROJECT_ROOT,
  sourceRoot = PROJECT_ROOT,
  gate = buildTauriPackagedDesktopGate(),
  appShellState = buildBrowserLocalAppShellState({ root }),
} = {}) {
  const gateVerification = verifyTauriPackagedDesktopGate({ gate });

  return {
    schema: "gpao_t.tauri_readonly_shell_slice.v0_1",
    status: gateVerification.status === "ready" ? "ready" : "blocked",
    sliceName: "tauri_read_mostly_shell_slice",
    targetShell: "tauri",
    sourceScaffoldReady: true,
    packagedDesktopImplementationStarted: true,
    packagedBuildExecuted: false,
    dependencyInstallExecuted: false,
    bundleOrSigningExecuted: false,
    runtimeBoundary: {
      frontendDist: "tauri-shell",
      tauriConfig: "src-tauri/tauri.conf.json",
      shellHtml: "tauri-shell/index.html",
      shellMode: "read_mostly_static_mirror_or_loopback_reader",
      readsFrom: [
        "GET /health",
        "GET /app-shell",
        "GET /app-shell/state",
        "GET /app-shell/verify",
        "GET /app-shell/tauri-gate",
        "GET /app-shell/tauri-gate/verify",
      ],
      localIpc: "blocked_in_this_slice",
      tauriCommands: [],
      persistentDaemon: "blocked",
      externalNavigation: "blocked",
      mutation: "blocked",
    },
    documentationAnchors: [
      "docs/README.md",
      "docs/03-engineering/TAURI-PACKAGED-DESKTOP-GATE.md",
      "docs/03-verification/VERIFY.md",
    ],
    sourceFiles: SOURCE_FILES.map((path) => ({
      path,
      required: true,
      status: fileExists({ root: sourceRoot, path }) ? "present" : "missing",
    })),
    mirroredState: {
      appShellStateSchema: appShellState.schema,
      appShellStatus: appShellState.status,
      lanes: appShellState.stateLanes.map((lane) => lane.id),
      panelCount: appShellState.panels.length,
      failureRecoveryStates: appShellState.failureRecoveryStates.length,
      nextSafeAction: appShellState.nextSafeAction,
    },
    allowedBehavior: [
      "open_desktop_window_after_future_tauri_run",
      "show_readonly_app_shell_state",
      "show_state_lanes",
      "show_panel_drilldowns",
      "show_evidence_inspection",
      "show_failure_recovery",
      "show_authority_boundary",
      "show_next_safe_action",
      "support_screenshot_qa",
    ],
    blockedBehavior: gate.blockedAuthorityActions,
    authorityBoundary: gate.authorityBoundary,
    screenshotQa: gate.screenshotQa,
    visualQaBaseline: {
      status: "ready",
      ...VISUAL_QA_BASELINE,
    },
    failureRecoveryStates: gate.failureRecoveryStates,
    nextSafeAction:
      "Design prerequisite doctor and dry-run executor contracts next; keep real install, update, rollback, Tauri build, IPC, connectors, models, tools, deployment, messenger, and automation blocked.",
  };
}

export function buildTauriReadOnlyShellHtml({
  state = buildTauriReadOnlyShellSlice(),
} = {}) {
  const lanes = state.mirroredState.lanes
    .map((lane) => `<li class="lane-card" data-state-lane="${escapeHtml(lane)}"><span>${escapeHtml(lane)}</span><strong>visible</strong></li>`)
    .join("");
  const blocked = state.blockedBehavior.map((action) => `<li>${escapeHtml(action)}</li>`).join("");
  const failures = state.failureRecoveryStates
    .map((failure) => `<li data-failure-recovery-state="${escapeHtml(failure.id)}">${escapeHtml(failure.label)}: ${escapeHtml(failure.recovery)}</li>`)
    .join("");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GPAO-T Read-Mostly Tauri Shell</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --panel: #ffffff;
      --ink: #17202a;
      --muted: #5d6978;
      --line: #d9e0e8;
      --accent: #146c94;
      --safe: #257254;
      --warn: #8a5a00;
      --blocked: #8a2734;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-width: 320px;
      color: var(--ink);
      background: var(--bg);
      letter-spacing: 0;
    }
    .shell-frame {
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
    }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 5;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: center;
      padding: 14px 24px;
      border-bottom: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(10px);
    }
    .brand {
      min-width: 0;
    }
    .brand strong {
      display: block;
      font-size: 20px;
      line-height: 1.15;
    }
    .brand span,
    .decision-strip {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
    }
    .decision-strip {
      max-width: 540px;
      padding: 10px 12px;
      border: 1px solid #b9d7c8;
      border-radius: 8px;
      background: #eef8f2;
      color: #185b41;
    }
    main {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 28px 0 42px;
    }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
      gap: 18px;
      align-items: stretch;
      margin-bottom: 18px;
    }
    .intro,
    section {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: 0 10px 24px rgba(23, 32, 42, 0.06);
    }
    .intro {
      padding: 24px;
    }
    h1, h2 {
      margin: 0;
      letter-spacing: 0;
    }
    h1 {
      max-width: 760px;
      font-size: clamp(28px, 4vw, 48px);
      line-height: 1.04;
    }
    h2 {
      font-size: 16px;
      line-height: 1.2;
    }
    p {
      margin: 10px 0 0;
      color: var(--muted);
      line-height: 1.55;
    }
    .status-card {
      padding: 18px;
      border-color: #b9d7c8;
      background: #fbfefc;
    }
    .status-card strong {
      display: inline-block;
      margin-bottom: 8px;
      color: var(--safe);
    }
    .panel-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 18px 0;
    }
    .panel-nav a {
      display: inline-flex;
      min-height: 34px;
      align-items: center;
      padding: 7px 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      color: var(--accent);
      background: #fff;
      text-decoration: none;
      font-size: 13px;
      font-weight: 650;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    section {
      padding: 18px;
      overflow-wrap: anywhere;
    }
    ul {
      margin: 12px 0 0;
      padding: 0;
      list-style: none;
    }
    li {
      padding: 10px 0;
      border-top: 1px solid var(--line);
      color: var(--muted);
      line-height: 1.45;
    }
    li:first-child {
      border-top: 0;
    }
    .lane-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .lane-card {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #f8fafc;
      color: var(--ink);
    }
    .lane-card strong {
      color: var(--safe);
      font-size: 12px;
    }
    .boundary-list li {
      color: var(--blocked);
    }
    .evidence-row {
      display: grid;
      grid-template-columns: 150px minmax(0, 1fr);
      gap: 10px;
      padding-top: 10px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      line-height: 1.45;
    }
    .evidence-row:first-of-type {
      margin-top: 12px;
    }
    .evidence-row strong {
      color: var(--ink);
    }
    .safe-action {
      border-color: #f0d08b;
      background: #fffaf0;
    }
    .safe-action h2 {
      color: var(--warn);
    }
    @media (max-width: 760px) {
      .topbar {
        grid-template-columns: 1fr;
        gap: 10px;
        padding: 12px 14px;
      }
      .decision-strip {
        width: 100%;
      }
      main {
        width: min(100vw - 20px, 620px);
        padding-top: 16px;
      }
      .hero,
      .grid,
      .lane-list,
      .evidence-row {
        grid-template-columns: 1fr;
      }
      .intro,
      section {
        padding: 16px;
      }
      .panel-nav {
        position: sticky;
        top: 86px;
        z-index: 4;
        padding: 8px 0;
        background: var(--bg);
      }
      .panel-nav a {
        flex: 1 1 45%;
        justify-content: center;
      }
    }
  </style>
</head>
<body data-tauri-shell="read-mostly" data-local-ipc="blocked" data-mutation="blocked">
  <div class="shell-frame">
    <header class="topbar" data-mobile-action-line="visible" data-authority-boundary="visible" data-next-safe-action="visible">
      <div class="brand">
        <strong>GPAO-T</strong>
        <span>Read-mostly packaged shell source slice</span>
      </div>
      <div class="decision-strip">Next: prerequisite doctor and dry-run executor contracts only. Build, IPC, mutation, execution, connectors, models, tools, deployment, messenger, and automation stay blocked.</div>
    </header>
    <main>
      <div class="hero">
        <div class="intro">
          <h1>GPAO-T Read-Mostly Tauri Shell</h1>
          <p data-boundary="read-only">This first packaged desktop source slice mirrors app-shell state and keeps all mutation authority blocked.</p>
        </div>
        <section class="status-card" id="shell-status" data-evidence-inspection="visible" data-failure-recovery="visible">
          <strong>Local inspection only</strong>
          <h2>Packaged desktop boundary</h2>
          <p>No Tauri command, local IPC, dependency install, package build, signing, connector, model, tool, external send, or automation is active in this slice.</p>
        </section>
      </div>
      <nav class="panel-nav" aria-label="Packaged shell panel navigation" data-panel-navigation="visible">
        <a href="#state-lanes">State</a>
        <a href="#authority-boundary">Authority</a>
        <a href="#failure-recovery">Recovery</a>
        <a href="#blocked-actions">Blocked</a>
        <a href="#evidence-inspector">Evidence</a>
        <a href="#next-safe-action">Next</a>
      </nav>
      <div class="grid">
        <section id="state-lanes" aria-label="Workflow, recovery, authority, and next action state lanes">
          <h2>State Lanes</h2>
          <ul class="lane-list">${lanes}</ul>
        </section>
        <section id="authority-boundary" data-authority-boundary="visible">
          <h2>Authority Boundary</h2>
          <p>Local IPC, Tauri commands, POST routes, connector/model/tool activation, OAuth/token, install/update/rollback, durable memory promotion, self-growth apply, deployment, messenger, and automation remain blocked.</p>
        </section>
        <section id="failure-recovery" data-failure-recovery="visible">
          <h2>Failure / Recovery</h2>
          <ul>${failures}</ul>
        </section>
        <section id="blocked-actions">
          <h2>Blocked Actions</h2>
          <ul class="boundary-list">${blocked}</ul>
        </section>
        <section id="evidence-inspector" data-evidence-inspection="visible">
          <h2>Evidence Inspector</h2>
          <div class="evidence-row"><strong>Source</strong><span>${escapeHtml(state.runtimeBoundary.shellHtml)}</span></div>
          <div class="evidence-row"><strong>Config</strong><span>${escapeHtml(state.runtimeBoundary.tauriConfig)}</span></div>
          <div class="evidence-row"><strong>Mirrored panels</strong><span>${escapeHtml(state.mirroredState.panelCount)}</span></div>
          <div class="evidence-row"><strong>Recovery states</strong><span>${escapeHtml(state.mirroredState.failureRecoveryStates)}</span></div>
        </section>
        <section class="safe-action" id="next-safe-action" data-next-safe-action="visible">
          <h2>Next Safe Action</h2>
          <p>${escapeHtml(state.nextSafeAction)}</p>
        </section>
      </div>
    </main>
  </div>
</body>
</html>`;
}

export function verifyTauriReadOnlyShellSlice({
  root = PROJECT_ROOT,
  sourceRoot = PROJECT_ROOT,
  slice = buildTauriReadOnlyShellSlice({ root, sourceRoot }),
  html = buildTauriReadOnlyShellHtml({ state: slice }),
  appShellVerification = verifyBrowserLocalAppShell({
    state: buildBrowserLocalAppShellState({ root }),
  }),
} = {}) {
  const findings = [];

  if (slice.schema !== "gpao_t.tauri_readonly_shell_slice.v0_1") findings.push("invalid_slice_schema");
  if (slice.status !== "ready") findings.push("slice_not_ready");
  if (slice.targetShell !== "tauri") findings.push("target_shell_not_tauri");
  if (slice.packagedBuildExecuted !== false) findings.push("packaged_build_executed");
  if (slice.dependencyInstallExecuted !== false) findings.push("dependency_install_executed");
  if (slice.bundleOrSigningExecuted !== false) findings.push("bundle_or_signing_executed");
  if (slice.runtimeBoundary.localIpc !== "blocked_in_this_slice") findings.push("local_ipc_not_blocked");
  if (slice.runtimeBoundary.tauriCommands.length !== 0) findings.push("tauri_commands_present");
  if (slice.runtimeBoundary.mutation !== "blocked") findings.push("mutation_not_blocked");
  for (const file of slice.sourceFiles) {
    if (file.status !== "present") findings.push(`missing_source_file:${file.path}`);
  }
  if (!slice.mirroredState.lanes.includes("workflow")) findings.push("workflow_lane_not_mirrored");
  if (!slice.mirroredState.lanes.includes("recovery")) findings.push("recovery_lane_not_mirrored");
  if (!slice.mirroredState.lanes.includes("authority")) findings.push("authority_lane_not_mirrored");
  if (!slice.mirroredState.lanes.includes("next")) findings.push("next_lane_not_mirrored");
  if (!html.includes("GPAO-T Read-Mostly Tauri Shell")) findings.push("html_missing_title");
  if (!/data-tauri-shell="read-mostly"/.test(html)) findings.push("html_missing_readonly_marker");
  if (!/data-local-ipc="blocked"/.test(html)) findings.push("html_missing_ipc_block_marker");
  if (!/data-authority-boundary="visible"/.test(html)) findings.push("html_missing_authority_boundary");
  if (!/data-next-safe-action="visible"/.test(html)) findings.push("html_missing_next_safe_action");
  if (!/data-mobile-action-line="visible"/.test(html)) findings.push("html_missing_mobile_action_line");
  if (!/data-panel-navigation="visible"/.test(html)) findings.push("html_missing_panel_navigation");
  if (!/data-evidence-inspection="visible"/.test(html)) findings.push("html_missing_evidence_inspection");
  if (slice.visualQaBaseline?.status !== "ready") findings.push("visual_qa_baseline_not_ready");
  for (const path of Object.values(VISUAL_QA_BASELINE)) {
    if (!fileExists({ root: sourceRoot, path })) findings.push(`missing_visual_qa_baseline:${path}`);
  }
  try {
    const baseline = JSON.parse(readFileSync(join(sourceRoot, VISUAL_QA_BASELINE.report), "utf8"));
    if (baseline.status !== "ready") findings.push("visual_qa_report_not_ready");
  } catch {
    findings.push("visual_qa_report_unreadable");
  }
  if (/<script/i.test(html)) findings.push("script_tag_present");
  if (/<form/i.test(html)) findings.push("form_present");
  if (/method=["']?post/i.test(html)) findings.push("post_form_present");
  if (/https?:\/\/(?!127\.0\.0\.1|localhost)/i.test(html)) findings.push("external_url_present");
  if (appShellVerification.status !== "ready") findings.push("browser_local_app_shell_not_ready");

  return {
    schema: "gpao_t.tauri_readonly_shell_slice_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    sourceFiles: slice.sourceFiles,
    appShellVerificationStatus: appShellVerification.status,
    authorityBoundary: slice.authorityBoundary,
    screenshotQa: slice.screenshotQa,
    nextSafeAction: findings.length
      ? "Fix read-mostly Tauri shell source-slice findings before any visual QA or packaged desktop work."
      : "Design prerequisite doctor and dry-run executor contracts next; keep real install, update, rollback, Tauri build, IPC, connectors, models, tools, deployment, messenger, and automation blocked.",
  };
}

function fileExists({ root, path }) {
  return existsSync(join(root, path));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
