import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  appendReplayRecoveryRecord,
  appendSelfGrowthProposal,
  buildBrowserLocalAppShellContract,
  buildBrowserLocalAppShellHtml,
  buildBrowserLocalAppShellState,
  buildControlCenterHtml,
  buildControlCenterServingContract,
  buildControlCenterSnapshot,
  buildControlCenterSummary,
  buildControlCenterUiContract,
  buildControlCenterUiSnapshot,
  buildTauriPackagedDesktopGate,
  buildTauriReadOnlyShellHtml,
  buildTauriReadOnlyShellSlice,
  buildOperationsContractSummary,
  buildOperationsReliabilityContract,
  buildRuntimeDataContract,
  captureMemoryEntry,
  handleGatewayRequest,
  renderControlCenterHtml,
  startControlCenterPreviewServer,
  validateControlCenterUiSnapshot,
  verifyBrowserLocalAppShell,
  verifyControlCenterPreviewServing,
  verifyTauriPackagedDesktopGate,
  verifyTauriReadOnlyShellSlice,
} from "../src/index.js";
import releaseFixture from "../fixtures/replay/release-file-active-target.json" with { type: "json" };

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DATA_SCHEMA_PATH = fileURLToPath(new URL("../schema/gpao-t-runtime-data-schema.json", import.meta.url));
const UI_SCHEMA_PATH = fileURLToPath(new URL("../schema/gpao-t-control-center-ui-schema.json", import.meta.url));
const TAURI_CONFIG_PATH = fileURLToPath(new URL("../src-tauri/tauri.conf.json", import.meta.url));
const TAURI_CAPABILITY_PATH = fileURLToPath(new URL("../src-tauri/capabilities/default.json", import.meta.url));
const TAURI_SHELL_HTML_PATH = fileURLToPath(new URL("../tauri-shell/index.html", import.meta.url));
const APP_SHELL_BASELINE_JSON = fileURLToPath(new URL(
  "../docs/03-verification/evidence/app-shell-screenshot-qa-baseline-2026-07-09.json",
  import.meta.url,
));
const APP_SHELL_BASELINE_DOC = fileURLToPath(new URL(
  "../docs/03-verification/evidence/APP-SHELL-SCREENSHOT-QA-BASELINE-2026-07-09.md",
  import.meta.url,
));
const TAURI_SHELL_BASELINE_JSON = fileURLToPath(new URL(
  "../docs/03-verification/evidence/tauri-shell-visual-qa-baseline-2026-07-09.json",
  import.meta.url,
));
const TAURI_SHELL_BASELINE_DOC = fileURLToPath(new URL(
  "../docs/03-verification/evidence/TAURI-SHELL-VISUAL-QA-BASELINE-2026-07-09.md",
  import.meta.url,
));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-control-center-"));
}

describe("GPAO-T Local Control Center readiness", () => {
  it("builds an inspectable empty-state snapshot without starting a daemon", () => {
    const root = tempRoot();
    const snapshot = buildControlCenterSnapshot({ root });

    assert.equal(snapshot.schema, "gpao_t.control_center_snapshot.v0_1");
    assert.equal(snapshot.controlCenterReadiness, "data_contract_before_ui");
    assert.equal(snapshot.surface, "local_control_center_data_contract");
    assert.equal(snapshot.panels.length, snapshot.counts.panels);
    assert.equal(snapshot.counts.memoryEntries, 0);
    assert.equal(snapshot.counts.installHardeningReports, 0);
    assert.equal(snapshot.counts.dataSurfaces >= 8, true);
    assert.equal(snapshot.counts.modelAdapters, 4);
    assert.equal(snapshot.counts.connectors, 6);
    assert.equal(snapshot.counts.growthApplicationGates, 0);
    assert.equal(snapshot.authorityBoundary.connectorActivation, "blocked_until_explicit_approval");
    assert.equal(snapshot.authorityBoundary.growthApplication, "blocked_in_this_slice");
    assert.equal(snapshot.authorityBoundary.installExecution, "blocked_until_user_approval");
    assert.equal(snapshot.authorityBoundary.externalModelCall, "blocked_until_configured_and_approved");
    assert.ok(snapshot.panels.some((panel) => panel.id === "memory" && panel.status === "review"));
    assert.ok(snapshot.panels.some((panel) => panel.id === "ops" && panel.status === "blocked"));
    assert.ok(snapshot.panels.some((panel) => panel.id === "connectors" && panel.status === "review"));
    assert.ok(snapshot.panels.some((panel) => panel.id === "skill-ecosystem" && panel.status === "ready"));
  });

  it("exposes local data schema and operations reliability contracts", () => {
    const data = buildRuntimeDataContract();
    const reliability = buildOperationsReliabilityContract();
    const summary = buildOperationsContractSummary();
    const cliData = JSON.parse(execFileSync(process.execPath, [CLI, "ops", "data"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliReliability = JSON.parse(execFileSync(process.execPath, [CLI, "ops", "reliability"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliSummary = JSON.parse(execFileSync(process.execPath, [CLI, "ops", "contract"], {
      cwd: ROOT,
      encoding: "utf8",
    }));

    assert.equal(data.schema, "gpao_t.runtime_data_contract.v0_1");
    assert.equal(data.status, "ready");
    assert.equal(data.storageRoot, ".gpao-t");
    assert.equal(data.surfaces.some((surface) => surface.path === ".gpao-t/state/runtime.json"), true);
    assert.equal(data.migrationPolicy.migrationRequiredNow, false);
    assert.equal(reliability.schema, "gpao_t.operations_reliability_contract.v0_1");
    assert.equal(reliability.status, "ready");
    assert.equal(reliability.retryPolicy.previewCommands, "safe_to_retry");
    assert.equal(reliability.idempotencyPolicy.readCommands, "idempotent");
    assert.equal(summary.status, "ready");
    assert.equal(cliData.status, "ready");
    assert.equal(cliReliability.status, "ready");
    assert.equal(cliSummary.status, "ready");
    const schema = JSON.parse(readFileSync(DATA_SCHEMA_PATH, "utf8"));
    assert.equal(schema.$id, "gpao_t.runtime_data_schema.v0_1");
    assert.equal(schema.required.includes("runtimeState"), true);
  });

  it("summarizes memory, recovery, growth, and adapters for a future UI", () => {
    const root = tempRoot();
    captureMemoryEntry({
      root,
      title: "배포파일 meaning",
      body: "배포파일 means GPAO Operating Package / GPAO for OpenClaw in this product flow.",
    });
    appendReplayRecoveryRecord({ root, fixture: releaseFixture, now: "2026-07-08T00:00:00.000Z" });
    appendReplayRecoveryRecord({ root, fixture: releaseFixture, now: "2026-07-08T00:01:00.000Z" });
    appendSelfGrowthProposal({ root, target: "release-file", now: "2026-07-08T00:02:00.000Z" });

    const summary = buildControlCenterSummary({ root });

    assert.equal(summary.schema, "gpao_t.control_center_summary.v0_1");
    assert.equal(summary.controlCenterReadiness, "data_contract_before_ui");
    assert.equal(summary.counts.memoryEntries, 1);
    assert.equal(summary.counts.tcellCandidates, 1);
    assert.equal(summary.counts.recoveryRecords, 2);
    assert.equal(summary.counts.installHardeningReports, 0);
    assert.equal(summary.counts.growthProposals, 1);
    assert.equal(summary.counts.growthApplicationGates, 0);
    assert.equal(summary.counts.blockedConnectors, 5);
    assert.ok(summary.panels.some((panel) => panel.id === "growth" && panel.status === "review"));
    assert.match(summary.nextSafeAction, /Resolve blocked panel|Review panel/);
  });

  it("builds a UI snapshot contract between runtime data and static rendering", () => {
    const root = tempRoot();
    const snapshot = buildControlCenterSnapshot({ root });
    const contract = buildControlCenterUiContract();
    const uiSnapshot = buildControlCenterUiSnapshot({ snapshot });
    const validation = validateControlCenterUiSnapshot({ uiSnapshot });
    const cliContract = JSON.parse(execFileSync(process.execPath, [CLI, "control", "ui-contract"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliSnapshot = JSON.parse(execFileSync(process.execPath, [CLI, "control", "ui-snapshot"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliValidation = JSON.parse(execFileSync(process.execPath, [CLI, "control", "ui-validate"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayContract = handleGatewayRequest({ method: "GET", path: "/control-center/ui-contract" });
    const gatewaySnapshot = handleGatewayRequest({ method: "GET", path: "/control-center/ui-snapshot" });
    const gatewayValidation = handleGatewayRequest({ method: "GET", path: "/control-center/ui-validate" });
    const schema = JSON.parse(readFileSync(UI_SCHEMA_PATH, "utf8"));

    assert.equal(contract.schema, "gpao_t.control_center_ui_contract.v0_1");
    assert.equal(contract.schemaFile, "schema/gpao-t-control-center-ui-schema.json");
    assert.equal(contract.renderedSurface.kind, "static_html_reader");
    assert.equal(contract.renderedSurface.interactionMode, "no_script_local_inspection");
    assert.equal(contract.renderedSurface.interactionSurfaces.includes("anchor_panel_navigation"), true);
    assert.equal(contract.renderedSurface.interactionSurfaces.includes("focus_navigation"), true);
    assert.equal(contract.renderedSurface.interactionSurfaces.includes("details_summary_panel_inspector"), true);
    assert.equal(contract.renderedSurface.interactionSurfaces.includes("panel_drilldown_links"), true);
    assert.equal(contract.renderedSurface.interactionSurfaces.includes("state_workflow_views"), true);
    assert.equal(contract.renderedSurface.interactionSurfaces.includes("mobile_next_safe_action_strip"), true);
    assert.equal(contract.authorityBoundary.startsDaemon, false);
    assert.equal(contract.authorityBoundary.connectsAccounts, false);
    assert.equal(uiSnapshot.schema, "gpao_t.control_center_ui_snapshot.v0_1");
    assert.equal(uiSnapshot.sourceSnapshotSchema, "gpao_t.control_center_snapshot.v0_1");
    assert.equal(uiSnapshot.sourceDesignSchema, "gpao_t.local_control_center_design_contract.v0_1");
    assert.equal(uiSnapshot.firstViewport.title, "GPAO-T Local Control Center");
    assert.equal(uiSnapshot.firstViewport.counts.panels, snapshot.counts.panels);
    assert.equal(uiSnapshot.panels.some((panel) => panel.id === "memory" && panel.group === "Context"), true);
    assert.equal(validation.status, "ready");
    assert.equal(cliContract.schema, contract.schema);
    assert.equal(cliSnapshot.schema, uiSnapshot.schema);
    assert.equal(cliValidation.status, "ready");
    assert.equal(gatewayContract.status, 200);
    assert.equal(gatewaySnapshot.body.schema, uiSnapshot.schema);
    assert.equal(gatewayValidation.body.status, "ready");
    assert.equal(schema.$id, "gpao_t.control_center_ui_schema.v0_1");
    assert.equal(schema.required.includes("uiSnapshot"), true);
  });

  it("exposes Control Center snapshot and summary through CLI and gateway", () => {
    const cliOutput = execFileSync(process.execPath, [CLI, "control", "summary"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliSummary = JSON.parse(cliOutput);
    const snapshot = handleGatewayRequest({ method: "GET", path: "/control-center" });
    const summary = handleGatewayRequest({ method: "GET", path: "/control-center/summary" });

    assert.equal(cliSummary.schema, "gpao_t.control_center_summary.v0_1");
    assert.equal(snapshot.status, 200);
    assert.equal(summary.status, 200);
    assert.equal(snapshot.body.schema, "gpao_t.control_center_snapshot.v0_1");
    assert.equal(summary.body.schema, "gpao_t.control_center_summary.v0_1");
  });

  it("renders a static Local Control Center UI reader without external activation", () => {
    const root = tempRoot();
    const snapshot = buildControlCenterSnapshot({ root });
    const html = buildControlCenterHtml({ snapshot });
    const render = renderControlCenterHtml({
      root,
      outputPath: "control-center.html",
      now: "2026-07-08T00:03:00.000Z",
    });
    const renderedHtml = readFileSync(render.outputPath, "utf8");

    assert.match(html, /GPAO-T Local Control Center/);
    assert.match(html, /정적 UI reader/);
    assert.match(html, /다음 안전 행동/);
    assert.match(html, /권한 경계/);
    assert.match(html, /data-panel="memory"/);
    assert.match(html, /data-group="Context"/);
    assert.match(html, /href="#panel-memory"/);
    assert.match(html, /id="panel-memory"/);
    assert.match(html, /id="workflow-state-view"/);
    assert.match(html, /aria-label="Workflow, recovery, authority, and next action states"/);
    assert.match(html, /data-state-card="workflow"/);
    assert.match(html, /data-state-card="recovery"/);
    assert.match(html, /data-state-card="authority"/);
    assert.match(html, /data-state-card="next"/);
    assert.match(html, /href="#inspect-memory"/);
    assert.match(html, /<details class="inspector" id="inspect-memory" data-panel-inspector="memory">/);
    assert.match(html, /<summary>운영 드릴다운<\/summary>/);
    assert.match(html, /data-panel-action="authority" href="#authority-boundary"/);
    assert.match(html, /data-panel-action="next" href="#next-safe-action"/);
    assert.match(html, /aria-label="Control Center panel inspector"/);
    assert.match(html, /Interaction: no-script local inspection/);
    assert.match(html, /status-blocked/);
    assert.doesNotMatch(html, /<script/i);
    assert.equal(render.schema, "gpao_t.local_control_center_render.v0_1");
    assert.equal(render.status, "rendered_static_html");
    assert.equal(render.uiContractSchema, "gpao_t.control_center_ui_contract.v0_1");
    assert.equal(render.uiSnapshotSchema, "gpao_t.control_center_ui_snapshot.v0_1");
    assert.equal(render.uiValidationStatus, "ready");
    assert.equal(render.renderEvidence, "static_html_file_written");
    assert.equal(render.executableSurfaces.includes("gpao-t control render [output.html]"), true);
    assert.equal(render.authorityBoundary.startsDaemon, false);
    assert.equal(render.authorityBoundary.connectsAccounts, false);
    assert.equal(render.authorityBoundary.callsExternalModels, false);
    assert.equal(render.authorityBoundary.executesExternalTools, false);
    assert.equal(render.authorityBoundary.deploysOrPublishes, false);
    assert.equal(render.counts.panels, snapshot.counts.panels);
    assert.equal(existsSync(render.outputPath), true);
    assert.equal(renderedHtml, html);
  });

  it("exposes static UI reader output through CLI", () => {
    const htmlOutput = execFileSync(process.execPath, [CLI, "control", "html"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const renderOutput = execFileSync(process.execPath, [
      CLI,
      "control",
      "render",
      "test-output/control-center.html",
    ], {
      cwd: tempRoot(),
      encoding: "utf8",
    });
    const render = JSON.parse(renderOutput);

    assert.match(htmlOutput, /<html lang="ko">/);
    assert.match(htmlOutput, /Operating Objects/);
    assert.match(htmlOutput, /Panels/);
    assert.match(htmlOutput, /운영 드릴다운/);
    assert.match(htmlOutput, /panel-actions/);
    assert.match(htmlOutput, /workflow-state-view/);
    assert.match(htmlOutput, /state-ribbon/);
    assert.equal(render.schema, "gpao_t.local_control_center_render.v0_1");
    assert.equal(existsSync(render.outputPath), true);
  });

  it("keeps first Control Center interactions local, inspectable, and script-free", () => {
    const html = buildControlCenterHtml();

    assert.match(html, /href="#panel-runtime"/);
    assert.match(html, /href="#panel-skill-ecosystem"/);
    assert.match(html, /href="#panel-authority"/);
    assert.match(html, /aria-label="Control Center focus navigation"/);
    assert.match(html, /href="#decision-strip"/);
    assert.match(html, /href="#workflow-state-view"/);
    assert.match(html, /href="#next-safe-action"/);
    assert.match(html, /href="#authority-boundary"/);
    assert.match(html, /id="decision-strip"/);
    assert.match(html, /id="workflow-state-view"/);
    assert.match(html, /id="next-safe-action"/);
    assert.match(html, /id="authority-boundary"/);
    assert.match(html, /\.panel:target/);
    assert.match(html, /\.inspector:target/);
    assert.match(html, /scroll-margin-top/);
    assert.match(html, /data-panel-inspector="skill-ecosystem"/);
    assert.match(html, /href="#inspect-runtime"/);
    assert.match(html, /id="inspect-runtime"/);
    assert.match(html, /data-panel-action="inspect"/);
    assert.match(html, /data-panel-action="authority"/);
    assert.match(html, /data-panel-action="next"/);
    assert.match(html, /data-state-pill="workflow"/);
    assert.match(html, /data-state-pill="recovery"/);
    assert.match(html, /data-state-pill="authority"/);
    assert.match(html, /data-state-pill="next"/);
    assert.match(html, /<strong>Panel ID<\/strong>/);
    assert.match(html, /<strong>Status<\/strong>/);
    assert.match(html, /<strong>Next<\/strong>/);
    assert.match(html, /<strong>Workflow State<\/strong>/);
    assert.match(html, /<strong>Recovery State<\/strong>/);
    assert.match(html, /<strong>Authority State<\/strong>/);
    assert.match(html, /<strong>Next State<\/strong>/);
    assert.match(html, /<strong>Authority<\/strong>/);
    assert.match(html, /<strong>Evidence<\/strong>/);
    assert.match(html, /<strong>Return<\/strong>/);
    assert.doesNotMatch(html, /onclick=/i);
    assert.doesNotMatch(html, /addEventListener/i);
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /https?:\/\/(?!127\.0\.0\.1|localhost)/i);
  });

  it("keeps responsive visual hardening rules in the static Control Center reader", () => {
    const html = buildControlCenterHtml();

    assert.match(html, /@media \(max-width: 640px\)/);
    assert.match(html, /overflow-x: hidden/);
    assert.match(html, /max-width: 100vw/);
    assert.match(html, /mobile-next-action/);
    assert.match(html, /aria-label="Mobile next safe action"/);
    assert.match(html, /class="topbar-action">다음 행동:/);
    assert.match(html, /focus-strip/);
    assert.match(html, /\.focus-strip \{[\s\S]*flex-wrap: wrap/);
    assert.match(html, /\.workflow-state-view \{[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
    assert.match(html, /\.state-card \{[\s\S]*min-height: 82px/);
    assert.match(html, /\.state-ribbon \{[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
    assert.match(html, /\.state-pill \{[\s\S]*overflow-wrap: anywhere/);
    assert.match(html, /\.topbar \{[\s\S]*position: sticky/);
    assert.match(html, /\.topbar \{[\s\S]*position: fixed/);
    assert.match(html, /\.layout \{[\s\S]*padding-top: 140px/);
    assert.match(html, /\.topbar-action \{[\s\S]*-webkit-line-clamp: 2/);
    assert.match(html, /\.workflow-state-view \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(html, /\.state-ribbon \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(html, /\.panel-actions \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    assert.match(html, /\.panel-action \{[\s\S]*overflow-wrap: anywhere/);
    assert.match(html, /\.inspector \{[\s\S]*scroll-margin-top: 242px/);
    assert.match(html, /\.side-section \{[\s\S]*scroll-margin-top: 140px/);
    assert.match(html, /#next-safe-action-aside \{[\s\S]*display: none/);
    assert.match(html, /nav \{ order: 3; \}/);
    assert.match(html, /main \{ order: 1; \}/);
    assert.match(html, /aside \{ order: 2; \}/);
    assert.match(html, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(html, /width: calc\(50% - 5px\)/);
    assert.match(html, /white-space: normal/);
    assert.match(html, /overflow-wrap: anywhere/);
  });

  it("defines browser-safe local serving and screenshot verification boundaries", () => {
    const contract = buildControlCenterServingContract();

    assert.equal(contract.schema, "gpao_t.control_center_serving_contract.v0_1");
    assert.equal(contract.status, "ready");
    assert.equal(contract.servingMode, "browser_safe_loopback_preview");
    assert.equal(contract.host, "127.0.0.1");
    assert.equal(contract.routes.some((route) => route.path === "/control-center"), true);
    assert.equal(contract.previewLifecycle.serveCheck, "ephemeral_start_verify_stop");
    assert.equal(contract.previewLifecycle.serve, "explicit_manual_preview_until_signal");
    assert.equal(contract.previewLifecycle.persistentDaemon, false);
    assert.equal(contract.screenshotVerification.status, "required_before_richer_behavior");
    assert.equal(contract.screenshotVerification.requiredViewports.length, 2);
    assert.equal(contract.screenshotVerification.requiredVisibleText.includes("권한 경계"), true);
    assert.equal(contract.screenshotVerification.requiredSelectors.includes(".focus-strip"), true);
    assert.equal(contract.screenshotVerification.requiredSelectors.includes(".mobile-next-action"), true);
    assert.equal(
      contract.screenshotVerification.requiredInteractionSignals.includes("mobile_sticky_topbar_or_decision_strip_visible"),
      true,
    );
    assert.equal(contract.authorityBoundary.loopbackOnly, true);
    assert.equal(contract.authorityBoundary.startsPersistentDaemon, false);
    assert.equal(contract.authorityBoundary.deploysOrPublishes, false);
  });

  it("defines the browser-local app-shell first slice as read-mostly and GET-only", () => {
    const contract = buildBrowserLocalAppShellContract();
    const state = buildBrowserLocalAppShellState({ root: tempRoot(), now: "2026-07-09T00:00:00.000Z" });

    assert.equal(contract.schema, "gpao_t.browser_local_app_shell_contract.v0_1");
    assert.equal(contract.shellKind, "browser_local_app_shell");
    assert.equal(contract.runtimeBoundary.transport, "127.0.0.1_http");
    assert.equal(contract.runtimeBoundary.localIpc, "blocked_in_first_slice");
    assert.equal(contract.runtimeBoundary.packagedDesktopTarget, "tauri_after_browser_local_proof");
    assert.equal(contract.allowedGetRoutes.includes("/health"), true);
    assert.equal(contract.allowedGetRoutes.includes("/control-center/ui-validate"), true);
    assert.equal(contract.blockedPostRoutes.includes("/turn"), true);
    assert.equal(contract.blockedActions.includes("connector activation"), true);
    assert.equal(contract.blockedActions.includes("model activation"), true);
    assert.equal(contract.blockedActions.includes("tool activation"), true);
    assert.equal(contract.blockedActions.includes("install execution"), true);
    assert.equal(contract.blockedActions.includes("rollback execution"), true);
    assert.equal(contract.blockedActions.includes("durable memory promotion"), true);
    assert.equal(contract.blockedActions.includes("self-growth apply"), true);
    assert.equal(contract.blockedActions.includes("deployment"), true);
    assert.equal(contract.blockedActions.includes("messenger surfaces"), true);
    assert.equal(contract.blockedActions.includes("recurring automation"), true);
    assert.equal(contract.authorityBoundary.mutationAuthority, "none_in_first_slice");
    assert.equal(contract.auditReplayRollback.auditWritesFromShell, false);
    assert.equal(contract.screenshotQa.requiredViewports.length, 2);
    assert.equal(contract.failureRecoveryStates.some((failure) => failure.id === "runtime_unavailable"), true);
    assert.equal(contract.failureRecoveryStates.some((failure) => failure.id === "snapshot_invalid"), true);
    assert.equal(state.schema, "gpao_t.browser_local_app_shell_state.v0_1");
    assert.equal(state.sourceRoutes.every((route) => route.method === "GET"), true);
    assert.equal(state.blockedRoutes.every((route) => route.method === "POST" && route.mode === "blocked"), true);
    assert.equal(state.panels.length > 0, true);
    assert.equal(state.uiValidation.status, "ready");
    assert.equal(state.stateLanes.length, 4);
    assert.equal(state.stateLanes.some((lane) => lane.id === "workflow" && lane.source === "GET /control-center/summary"), true);
    assert.equal(state.stateLanes.some((lane) => lane.id === "recovery"), true);
    assert.equal(state.stateLanes.some((lane) => lane.id === "authority" && lane.status === "ready"), true);
    assert.equal(state.stateLanes.some((lane) => lane.id === "next"), true);
    assert.equal(state.panels.every((panel) => panel.workflowState && panel.recoveryState && panel.authorityState && panel.nextActionState), true);
  });

  it("renders the browser-local app shell with panel navigation, evidence inspection, and recovery state", () => {
    const state = buildBrowserLocalAppShellState({
      root: tempRoot(),
      runtimeAvailable: false,
      staleSnapshot: true,
      now: "2026-07-09T00:01:00.000Z",
    });
    const html = buildBrowserLocalAppShellHtml({ state });
    const verification = verifyBrowserLocalAppShell({ html, state });

    assert.match(html, /GPAO-T Browser-Local App Shell/);
    assert.match(html, /127\.0\.0\.1 read-mostly shell/);
    assert.match(html, /POST and external activation blocked/);
    assert.match(html, /data-app-shell="browser-local"/);
    assert.match(html, /data-interaction-mode="read-mostly-get"/);
    assert.match(html, /href="#shell-panel-runtime"/);
    assert.match(html, /data-shell-panel="runtime"/);
    assert.match(html, /id="shell-state-lanes"/);
    assert.match(html, /data-state-lane="workflow"/);
    assert.match(html, /data-state-lane="recovery"/);
    assert.match(html, /data-state-lane="authority"/);
    assert.match(html, /data-state-lane="next"/);
    assert.match(html, /data-workflow-state="runtime"/);
    assert.match(html, /state drilldown/);
    assert.match(html, /Workflow State/);
    assert.match(html, /Recovery State/);
    assert.match(html, /Authority State/);
    assert.match(html, /Next Action State/);
    assert.match(html, /data-evidence-inspection="runtime"/);
    assert.match(html, /id="shell-failure-recovery"/);
    assert.match(html, /data-failure-recovery-state="runtime_unavailable" data-active="true"/);
    assert.match(html, /data-failure-recovery-state="stale_snapshot" data-active="true"/);
    assert.match(html, /id="shell-screenshot-qa"/);
    assert.match(html, /nonblank_viewport/);
    assert.match(html, /connector activation/);
    assert.match(html, /durable memory promotion/);
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /<form/i);
    assert.doesNotMatch(html, /method=["']?post/i);
    assert.doesNotMatch(html, /https?:\/\/(?!127\.0\.0\.1|localhost)/i);
    assert.equal(verification.status, "ready");
  });

  it("closes the packaged desktop Tauri gate without opening mutation authority", () => {
    const gate = buildTauriPackagedDesktopGate();
    const verification = verifyTauriPackagedDesktopGate({ gate });
    const cliGate = JSON.parse(execFileSync(process.execPath, [CLI, "control", "tauri-gate"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "tauri-gate-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayGate = handleGatewayRequest({ method: "GET", path: "/app-shell/tauri-gate" });
    const gatewayCheck = handleGatewayRequest({ method: "GET", path: "/app-shell/tauri-gate/verify" });

    assert.equal(gate.schema, "gpao_t.tauri_packaged_desktop_gate.v0_1");
    assert.equal(gate.status, "ready");
    assert.equal(gate.gateClosed, true);
    assert.equal(gate.packagedDesktopImplementationStarted, false);
    assert.equal(gate.targetShell, "tauri");
    assert.equal(gate.shellBoundary.browserLocal.transport, "127.0.0.1_http");
    assert.equal(gate.shellBoundary.tauriFirstSlice.localIpc, "blocked_in_first_tauri_slice");
    assert.equal(gate.shellBoundary.tauriFirstSlice.mutation, "blocked");
    assert.equal(gate.firstSlice.implementationAllowedNow, false);
    assert.equal(gate.firstSlice.allowedRoutes.every((route) => route.startsWith("GET ")), true);
    assert.equal(gate.firstSlice.blockedRoutes.includes("/turn"), true);
    assert.equal(gate.blockedAuthorityActions.includes("OAuth setup"), true);
    assert.equal(gate.blockedAuthorityActions.includes("token or secret storage"), true);
    assert.equal(gate.blockedAuthorityActions.includes("connector activation"), true);
    assert.equal(gate.blockedAuthorityActions.includes("model activation"), true);
    assert.equal(gate.blockedAuthorityActions.includes("tool activation"), true);
    assert.equal(gate.blockedAuthorityActions.includes("external send"), true);
    assert.equal(gate.blockedAuthorityActions.includes("install execution"), true);
    assert.equal(gate.blockedAuthorityActions.includes("update execution"), true);
    assert.equal(gate.blockedAuthorityActions.includes("rollback execution"), true);
    assert.equal(gate.blockedAuthorityActions.includes("durable memory promotion"), true);
    assert.equal(gate.blockedAuthorityActions.includes("self-growth apply"), true);
    assert.equal(gate.blockedAuthorityActions.includes("deployment"), true);
    assert.equal(gate.blockedAuthorityActions.includes("messenger surfaces"), true);
    assert.equal(gate.blockedAuthorityActions.includes("recurring automation"), true);
    assert.equal(gate.authorityBoundary.mutationAuthority, "none_in_first_tauri_slice");
    assert.equal(gate.sourceControlRollback.sourceRollback, "local_git_required_before_tauri_slice");
    assert.equal(gate.screenshotQa.requiredSignals.includes("state_lanes_visible"), true);
    assert.equal(gate.screenshotQa.requiredSignals.includes("panel_drilldown_visible"), true);
    assert.equal(gate.screenshotQa.requiredSignals.includes("mobile_fixed_topbar_action_or_decision_strip_visible"), true);
    assert.equal(gate.installUpdateRollbackOrder[0], "1_browser_local_app_shell_proof");
    assert.equal(gate.installUpdateRollbackOrder.includes("7_install_update_rollback_executor_gate_after_approval"), true);
    assert.equal(gate.failureRecoveryStates.some((state) => state.id === "loopback_runtime_unavailable"), true);
    assert.equal(gate.failureRecoveryStates.some((state) => state.id === "ipc_not_allowed"), true);
    assert.equal(verification.status, "ready");
    assert.equal(cliGate.schema, gate.schema);
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayGate.status, 200);
    assert.equal(gatewayGate.body.schema, gate.schema);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("adds the first read-mostly Tauri shell source slice without enabling IPC or packaging", () => {
    const slice = buildTauriReadOnlyShellSlice({ root: ROOT });
    const html = buildTauriReadOnlyShellHtml({ state: slice });
    const verification = verifyTauriReadOnlyShellSlice({ root: ROOT, slice, html });
    const cliSlice = JSON.parse(execFileSync(process.execPath, [CLI, "control", "tauri-shell-slice"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "tauri-shell-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliHtml = execFileSync(process.execPath, [CLI, "control", "tauri-shell-html"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const gatewaySlice = handleGatewayRequest({ method: "GET", path: "/app-shell/tauri-shell/slice", root: ROOT });
    const gatewayHtml = handleGatewayRequest({ method: "GET", path: "/app-shell/tauri-shell", root: ROOT });
    const gatewayCheck = handleGatewayRequest({ method: "GET", path: "/app-shell/tauri-shell/verify", root: ROOT });
    const tauriConfig = JSON.parse(readFileSync(TAURI_CONFIG_PATH, "utf8"));
    const tauriCapability = JSON.parse(readFileSync(TAURI_CAPABILITY_PATH, "utf8"));
    const sourceHtml = readFileSync(TAURI_SHELL_HTML_PATH, "utf8");

    assert.equal(slice.schema, "gpao_t.tauri_readonly_shell_slice.v0_1");
    assert.equal(slice.status, "ready");
    assert.equal(slice.targetShell, "tauri");
    assert.equal(slice.sourceScaffoldReady, true);
    assert.equal(slice.packagedDesktopImplementationStarted, true);
    assert.equal(slice.packagedBuildExecuted, false);
    assert.equal(slice.dependencyInstallExecuted, false);
    assert.equal(slice.bundleOrSigningExecuted, false);
    assert.equal(slice.runtimeBoundary.frontendDist, "tauri-shell");
    assert.equal(slice.runtimeBoundary.tauriConfig, "src-tauri/tauri.conf.json");
    assert.equal(slice.runtimeBoundary.localIpc, "blocked_in_this_slice");
    assert.equal(slice.runtimeBoundary.tauriCommands.length, 0);
    assert.equal(slice.runtimeBoundary.mutation, "blocked");
    assert.equal(slice.documentationAnchors.includes("docs/README.md"), true);
    assert.equal(slice.documentationAnchors.includes("docs/03-engineering/TAURI-PACKAGED-DESKTOP-GATE.md"), true);
    assert.equal(slice.documentationAnchors.includes("docs/03-verification/VERIFY.md"), true);
    assert.equal(slice.sourceFiles.every((file) => file.status === "present"), true);
    assert.equal(slice.mirroredState.lanes.includes("workflow"), true);
    assert.equal(slice.mirroredState.lanes.includes("recovery"), true);
    assert.equal(slice.mirroredState.lanes.includes("authority"), true);
    assert.equal(slice.mirroredState.lanes.includes("next"), true);
    assert.equal(slice.blockedBehavior.includes("OAuth setup"), true);
    assert.equal(slice.blockedBehavior.includes("install execution"), true);
    assert.equal(slice.blockedBehavior.includes("rollback execution"), true);
    assert.equal(verification.status, "ready");
    assert.equal(cliSlice.schema, slice.schema);
    assert.equal(cliCheck.status, "ready");
    assert.match(cliHtml, /GPAO-T Read-Mostly Tauri Shell/);
    assert.equal(gatewaySlice.status, 200);
    assert.equal(gatewaySlice.body.schema, slice.schema);
    assert.equal(gatewayHtml.status, 200);
    assert.match(gatewayHtml.body, /data-tauri-shell="read-mostly"/);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
    assert.equal(tauriConfig.productName, "GPAO-T");
    assert.equal(tauriConfig.identifier, "app.gpao.t.local");
    assert.equal(tauriConfig.build.frontendDist, "../tauri-shell");
    assert.equal(tauriConfig.bundle.active, false);
    assert.equal(tauriCapability.permissions.length, 0);
    assert.match(sourceHtml, /data-tauri-shell="read-mostly"/);
    assert.match(sourceHtml, /data-local-ipc="blocked"/);
    assert.match(sourceHtml, /data-mobile-action-line="visible"/);
    assert.match(sourceHtml, /data-panel-navigation="visible"/);
    assert.match(sourceHtml, /data-evidence-inspection="visible"/);
    assert.doesNotMatch(sourceHtml, /<script/i);
    assert.doesNotMatch(sourceHtml, /<form/i);
  });

  it("keeps app-shell-specific screenshot QA baseline evidence separate and replayable", () => {
    const baseline = JSON.parse(readFileSync(APP_SHELL_BASELINE_JSON, "utf8"));
    const baselineDoc = readFileSync(APP_SHELL_BASELINE_DOC, "utf8");
    const desktopBytes = readFileSync(baseline.evidenceFiles.desktop);
    const mobileBytes = readFileSync(baseline.evidenceFiles.mobile);

    assert.equal(baseline.schema, "gpao_t.app_shell_screenshot_qa_baseline.v0_1");
    assert.equal(baseline.status, "ready");
    assert.equal(baseline.target.endsWith("/app-shell"), true);
    assert.equal(baseline.fileFormat, "jpeg");
    assert.equal(baseline.invariants.getOnly, true);
    assert.equal(baseline.invariants.readMostly, true);
    assert.equal(baseline.invariants.noExternalActivation, true);
    assert.equal(baseline.invariants.postBlocked, true);
    assert.equal(baseline.invariants.authorityBoundaryVisible, true);
    assert.equal(baseline.invariants.failureRecoveryStateVisible, true);
    assert.equal(baseline.invariants.nextSafeActionVisible, true);
    assert.equal(baseline.checks.length, 2);
    assert.equal(baseline.checks.every((check) => check.target === "/app-shell"), true);
    assert.equal(baseline.checks.every((check) => check.nonblankViewport), true);
    assert.equal(baseline.checks.every((check) => check.panelNavigationVisible), true);
    assert.equal(baseline.checks.every((check) => check.evidenceInspectors === 9), true);
    assert.equal(baseline.checks.every((check) => check.failureRecoveryStates === 9), true);
    assert.equal(baseline.checks.every((check) => check.authorityBoundaryVisible), true);
    assert.equal(baseline.checks.every((check) => check.nextSafeActionVisible), true);
    assert.equal(baseline.checks.every((check) => check.screenshotQaVisible), true);
    assert.equal(baseline.checks.every((check) => check.noHorizontalOverflow), true);
    assert.equal(baseline.checks.every((check) => check.noTopbarOverlap), true);
    assert.equal(baseline.checks.every((check) => !check.hasScript && !check.hasForm), true);
    assert.equal(existsSync(baseline.evidenceFiles.desktop), true);
    assert.equal(existsSync(baseline.evidenceFiles.mobile), true);
    assert.equal(desktopBytes[0], 0xff);
    assert.equal(desktopBytes[1], 0xd8);
    assert.equal(mobileBytes[0], 0xff);
    assert.equal(mobileBytes[1], 0xd8);
    assert.match(baselineDoc, /App Shell Screenshot QA Baseline/);
    assert.match(baselineDoc, /app-shell-baseline-2026-07-09-desktop-viewport-1440x960\.jpg/);
    assert.match(baselineDoc, /app-shell-baseline-2026-07-09-mobile-viewport-390x844\.jpg/);
  });

  it("keeps packaged-shell visual QA baseline evidence separate and replayable", () => {
    const baseline = JSON.parse(readFileSync(TAURI_SHELL_BASELINE_JSON, "utf8"));
    const baselineDoc = readFileSync(TAURI_SHELL_BASELINE_DOC, "utf8");
    const desktopBytes = readFileSync(baseline.evidenceFiles.desktop);
    const mobileBytes = readFileSync(baseline.evidenceFiles.mobile);

    assert.equal(baseline.schema, "gpao_t.tauri_shell_visual_qa_baseline.v0_1");
    assert.equal(baseline.status, "ready");
    assert.equal(baseline.target.endsWith("/app-shell/tauri-shell"), true);
    assert.equal(baseline.fileFormat, "jpeg");
    assert.equal(baseline.invariants.readMostly, true);
    assert.equal(baseline.invariants.localIpcBlocked, true);
    assert.equal(baseline.invariants.mutationBlocked, true);
    assert.equal(baseline.invariants.noScript, true);
    assert.equal(baseline.invariants.noForm, true);
    assert.equal(baseline.invariants.noExternalActivation, true);
    assert.equal(baseline.invariants.authorityBoundaryVisible, true);
    assert.equal(baseline.invariants.failureRecoveryStateVisible, true);
    assert.equal(baseline.invariants.nextSafeActionVisible, true);
    assert.equal(baseline.invariants.mobileActionLineVisible, true);
    assert.equal(baseline.checks.length, 2);
    assert.equal(baseline.checks.every((check) => check.target === "/app-shell/tauri-shell"), true);
    assert.equal(baseline.checks.every((check) => check.shellMarker === "read-mostly"), true);
    assert.equal(baseline.checks.every((check) => check.localIpc === "blocked"), true);
    assert.equal(baseline.checks.every((check) => check.mutation === "blocked"), true);
    assert.equal(baseline.checks.every((check) => check.nonblankViewport), true);
    assert.equal(baseline.checks.every((check) => check.panelNavigationVisible), true);
    assert.equal(baseline.checks.every((check) => check.stateLanesVisible), true);
    assert.equal(baseline.checks.every((check) => check.evidenceInspectorVisible), true);
    assert.equal(baseline.checks.every((check) => check.failureRecoveryVisible), true);
    assert.equal(baseline.checks.every((check) => check.authorityBoundaryVisible), true);
    assert.equal(baseline.checks.every((check) => check.nextSafeActionVisible), true);
    assert.equal(baseline.checks.every((check) => check.mobileFixedTopbarActionLineVisible), true);
    assert.equal(baseline.checks.every((check) => check.noHorizontalOverflow), true);
    assert.equal(baseline.checks.every((check) => !check.hasScript && !check.hasForm), true);
    assert.equal(baseline.checks.every((check) => check.externalLinks.length === 0), true);
    assert.equal(existsSync(baseline.evidenceFiles.desktop), true);
    assert.equal(existsSync(baseline.evidenceFiles.mobile), true);
    assert.equal(desktopBytes[0], 0xff);
    assert.equal(desktopBytes[1], 0xd8);
    assert.equal(mobileBytes[0], 0xff);
    assert.equal(mobileBytes[1], 0xd8);
    assert.match(baselineDoc, /Tauri Shell Visual QA Baseline/);
    assert.match(baselineDoc, /tauri-shell-visual-qa-2026-07-09-desktop-viewport-1440x960\.jpg/);
    assert.match(baselineDoc, /tauri-shell-visual-qa-2026-07-09-mobile-viewport-390x844\.jpg/);
  });

  it("serves the static Control Center over loopback and verifies page content", async () => {
    const root = tempRoot();
    const preview = await startControlCenterPreviewServer({
      root,
      now: "2026-07-08T00:04:00.000Z",
    });

    try {
      const health = await fetchJson(`http://127.0.0.1:${preview.port}/health`);
      const page = await fetchText(preview.url);
      const appShell = await fetchText(`http://127.0.0.1:${preview.port}/app-shell`);
      const appShellContract = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/contract`);
      const appShellState = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/state`);
      const appShellVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/verify`);
      const tauriGate = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-gate`);
      const tauriGateVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-gate/verify`);
      const tauriShell = await fetchText(`http://127.0.0.1:${preview.port}/app-shell/tauri-shell`);
      const tauriShellSlice = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-shell/slice`);
      const tauriShellVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-shell/verify`);
      const controlSummary = await fetchJson(`http://127.0.0.1:${preview.port}/control-center/summary`);
      const blockedPost = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell`, { method: "POST" });

      assert.equal(preview.schema, "gpao_t.control_center_preview_server.v0_1");
      assert.equal(preview.status, "serving");
      assert.match(preview.url, /^http:\/\/127\.0\.0\.1:\d+\/control-center$/);
      assert.equal(preview.contract.authorityBoundary.loopbackOnly, true);
      assert.equal(preview.contract.authorityBoundary.startsPersistentDaemon, false);
      assert.equal(health.status, 200);
      assert.equal(health.body.status, "ready");
      assert.equal(page.status, 200);
      assert.match(page.body, /GPAO-T Local Control Center/);
      assert.match(page.body, /다음 안전 행동/);
      assert.doesNotMatch(page.body, /<script/i);
      assert.equal(appShell.status, 200);
      assert.match(appShell.body, /GPAO-T Browser-Local App Shell/);
      assert.doesNotMatch(appShell.body, /<script/i);
      assert.equal(appShellContract.body.schema, "gpao_t.browser_local_app_shell_contract.v0_1");
      assert.equal(appShellState.body.schema, "gpao_t.browser_local_app_shell_state.v0_1");
      assert.equal(appShellVerify.body.status, "ready");
      assert.equal(tauriGate.body.schema, "gpao_t.tauri_packaged_desktop_gate.v0_1");
      assert.equal(tauriGateVerify.body.status, "ready");
      assert.equal(tauriShell.status, 200);
      assert.match(tauriShell.body, /GPAO-T Read-Mostly Tauri Shell/);
      assert.match(tauriShell.body, /data-mobile-action-line="visible"/);
      assert.doesNotMatch(tauriShell.body, /<script/i);
      assert.equal(tauriShellSlice.body.schema, "gpao_t.tauri_readonly_shell_slice.v0_1");
      assert.equal(tauriShellVerify.body.status, "ready");
      assert.equal(controlSummary.body.schema, "gpao_t.control_center_summary.v0_1");
      assert.equal(blockedPost.status, 405);
      assert.equal(blockedPost.body.status, "blocked");
      assert.equal(blockedPost.body.reason, "browser_local_app_shell_first_slice_is_get_only");
    } finally {
      await preview.close();
    }
  });

  it("runs serving smoke verification through function and CLI without leaving a server running", async () => {
    const root = tempRoot();
    const verification = await verifyControlCenterPreviewServing({
      root,
      now: "2026-07-08T00:05:00.000Z",
    });
    const cliOutput = execFileSync(process.execPath, [CLI, "control", "serve-check"], {
      cwd: tempRoot(),
      encoding: "utf8",
    });
    const cliVerification = JSON.parse(cliOutput);

    assert.equal(verification.schema, "gpao_t.control_center_serving_verification.v0_1");
    assert.equal(verification.status, "ready");
    assert.equal(verification.findings.length, 0);
    assert.equal(verification.healthStatus, 200);
    assert.equal(verification.pageStatus, 200);
    assert.equal(verification.appShellStatus, 200);
    assert.equal(verification.tauriGateStatus, 200);
    assert.equal(verification.tauriShellSliceStatus, 200);
    assert.equal(verification.blockedPostStatus, 405);
    assert.equal(verification.authorityBoundary.loopbackOnly, true);
    assert.equal(cliVerification.status, "ready");
    assert.equal(cliVerification.findings.length, 0);
  });
});

async function fetchText(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.text(),
  };
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  return {
    status: response.status,
    body: await response.json(),
  };
}
