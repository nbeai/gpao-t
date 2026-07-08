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
  buildControlCenterHtml,
  buildControlCenterServingContract,
  buildControlCenterSnapshot,
  buildControlCenterSummary,
  buildControlCenterUiContract,
  buildControlCenterUiSnapshot,
  buildOperationsContractSummary,
  buildOperationsReliabilityContract,
  buildRuntimeDataContract,
  captureMemoryEntry,
  handleGatewayRequest,
  renderControlCenterHtml,
  startControlCenterPreviewServer,
  validateControlCenterUiSnapshot,
  verifyControlCenterPreviewServing,
} from "../src/index.js";
import releaseFixture from "../fixtures/replay/release-file-active-target.json" with { type: "json" };

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DATA_SCHEMA_PATH = fileURLToPath(new URL("../schema/gpao-t-runtime-data-schema.json", import.meta.url));
const UI_SCHEMA_PATH = fileURLToPath(new URL("../schema/gpao-t-control-center-ui-schema.json", import.meta.url));

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
    assert.match(html, /href="#next-safe-action"/);
    assert.match(html, /href="#authority-boundary"/);
    assert.match(html, /id="decision-strip"/);
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
    assert.match(html, /<strong>Panel ID<\/strong>/);
    assert.match(html, /<strong>Status<\/strong>/);
    assert.match(html, /<strong>Next<\/strong>/);
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
    assert.match(html, /\.topbar \{[\s\S]*position: sticky/);
    assert.match(html, /\.topbar \{[\s\S]*position: fixed/);
    assert.match(html, /\.layout \{[\s\S]*padding-top: 140px/);
    assert.match(html, /\.topbar-action \{[\s\S]*-webkit-line-clamp: 2/);
    assert.match(html, /\.panel-actions \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    assert.match(html, /\.panel-action \{[\s\S]*overflow-wrap: anywhere/);
    assert.match(html, /\.inspector \{[\s\S]*scroll-margin-top: 202px/);
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

  it("serves the static Control Center over loopback and verifies page content", async () => {
    const root = tempRoot();
    const preview = await startControlCenterPreviewServer({
      root,
      now: "2026-07-08T00:04:00.000Z",
    });

    try {
      const health = await fetchJson(`http://127.0.0.1:${preview.port}/health`);
      const page = await fetchText(preview.url);

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

async function fetchJson(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.json(),
  };
}
