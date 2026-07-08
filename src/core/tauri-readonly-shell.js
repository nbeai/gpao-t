import { readFileSync } from "node:fs";
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
    failureRecoveryStates: gate.failureRecoveryStates,
    nextSafeAction:
      "Verify this source scaffold visually before any Tauri command, local IPC, dependency install, package build, signing, install/update/rollback, connector, model, tool, deployment, messenger, or automation gate is opened.",
  };
}

export function buildTauriReadOnlyShellHtml({
  state = buildTauriReadOnlyShellSlice(),
} = {}) {
  const lanes = state.mirroredState.lanes.map((lane) => `<li data-state-lane="${escapeHtml(lane)}">${escapeHtml(lane)}</li>`).join("");
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
</head>
<body data-tauri-shell="read-mostly" data-local-ipc="blocked" data-mutation="blocked">
  <main>
    <h1>GPAO-T Read-Mostly Tauri Shell</h1>
    <p data-boundary="read-only">This first packaged desktop source slice mirrors app-shell state and keeps all mutation authority blocked.</p>
    <section id="state-lanes" aria-label="Workflow, recovery, authority, and next action state lanes">
      <h2>State Lanes</h2>
      <ul>${lanes}</ul>
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
      <ul>${blocked}</ul>
    </section>
    <section id="next-safe-action" data-next-safe-action="visible">
      <h2>Next Safe Action</h2>
      <p>${escapeHtml(state.nextSafeAction)}</p>
    </section>
  </main>
</body>
</html>`;
}

export function verifyTauriReadOnlyShellSlice({
  root = PROJECT_ROOT,
  sourceRoot = PROJECT_ROOT,
  slice = buildTauriReadOnlyShellSlice({ root, sourceRoot }),
  html = buildTauriReadOnlyShellHtml({ state: slice }),
  appShellVerification = verifyBrowserLocalAppShell(),
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
      : "Capture packaged-shell visual QA next; keep Tauri commands, local IPC, mutation, install/update/rollback, connectors, models, tools, deployment, messenger, and automation blocked.",
  };
}

function fileExists({ root, path }) {
  try {
    readFileSync(join(root, path), "utf8");
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
