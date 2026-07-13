import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  buildGpaoTDesignReferenceGate,
  buildLocalControlCenterDesignContract,
  handleGatewayRequest,
  verifyGpaoTDesignReferenceGate,
} from "../src/index.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const DESIGN_RECIPE = `${ROOT}/docs/GPAO-T-DASHBOARD-DESIGN-RECIPE.md`;
const README = `${ROOT}/docs/README.md`;
const PRINCIPLES = `${ROOT}/docs/DEVELOPMENT-PRINCIPLES.md`;
const HUMAN_READABILITY_CHECK = `${ROOT}/docs/03-verification/CONTROL-CENTER-HUMAN-READABILITY-CHECK.md`;
const APP_SHELL_DECISION_GATE = `${ROOT}/docs/03-engineering/APP-SHELL-DECISION-GATE.md`;
const APP_SHELL_TECHNOLOGY_DECISION = `${ROOT}/docs/03-engineering/APP-SHELL-TECHNOLOGY-DECISION.md`;
const API_BOUNDARIES = `${ROOT}/docs/03-engineering/API-BOUNDARIES.md`;
const SECURITY_NOTES = `${ROOT}/docs/03-engineering/SECURITY-NOTES.md`;

describe("GPAO-T dashboard design recipe", () => {
  it("adapts BEAI design.md into a GPAO-T UI implementation contract", () => {
    const text = readFileSync(DESIGN_RECIPE, "utf8");

    assert.match(text, /Source doctrine: `\/Users\/jyp\/Documents\/Playground 2\/beai-harness-for-codex\/design\.md`/);
    assert.match(text, /GPAO-T dashboard is an operating desk/);
    assert.match(text, /Work \/ Context \/ Evidence \/ Growth \/ Authority/);
    assert.match(text, /Current Work/);
    assert.match(text, /Context Mesh/);
    assert.match(text, /Evidence \/ Replay/);
    assert.match(text, /Growth/);
    assert.match(text, /Authority/);
    assert.match(text, /Model \/ Tool Adapters/);
    assert.match(text, /Connectors/);
    assert.match(text, /Ops/);
  });

  it("keeps authority, status, and no-daemon boundaries visible before UI build", () => {
    const text = readFileSync(DESIGN_RECIPE, "utf8");

    assert.match(text, /ready \| review \| blocked \| approval_required \| not_applicable/);
    assert.match(text, /Status color must always have a text label/);
    assert.match(text, /No hidden external action or live mutation/i);
    assert.match(text, /should not:\n\n- start a daemon/);
    assert.match(text, /read the existing `control snapshot` contract/);
  });

  it("links the recipe from README and development principles", () => {
    const readme = readFileSync(README, "utf8");
    const principles = readFileSync(PRINCIPLES, "utf8");

    assert.match(readme, /GPAO-T-DASHBOARD-DESIGN-RECIPE\.md/);
    assert.match(readme, /Work \/ Context \/ Evidence \/ Growth \/ Authority/);
    assert.match(principles, /BEAI Harness `design\.md`/);
    assert.match(principles, /GPAO-T-DASHBOARD-DESIGN-RECIPE\.md/);
  });

  it("keeps human-readability and app-shell decision gates explicit before implementation", () => {
    const readme = readFileSync(README, "utf8");
    const readability = readFileSync(HUMAN_READABILITY_CHECK, "utf8");
    const appShell = readFileSync(APP_SHELL_DECISION_GATE, "utf8");

    assert.match(readme, /CONTROL-CENTER-HUMAN-READABILITY-CHECK\.md/);
    assert.match(readme, /APP-SHELL-DECISION-GATE\.md/);
    assert.match(readability, /Status: passed/);
    assert.match(readability, /Mobile fixed topbar action line or decision strip remains visible/);
    assert.match(readability, /no `<script>`, no external activation, and no hidden mutation path/);
    assert.match(readability, /This is not an app-shell implementation approval/);
    assert.match(appShell, /Status: decision closed, implementation not started/);
    assert.match(appShell, /Loopback-only or local IPC/);
    assert.match(appShell, /No OAuth setup, token storage, external model call/);
    assert.match(appShell, /Technology decision record/);
    assert.match(appShell, /app-shell decision gate closed, implementation not started/);
  });

  it("locks the app-shell technology, runtime boundary, and blocked-action decision", () => {
    const readme = readFileSync(README, "utf8");
    const decision = readFileSync(APP_SHELL_TECHNOLOGY_DECISION, "utf8");
    const api = readFileSync(API_BOUNDARIES, "utf8");
    const security = readFileSync(SECURITY_NOTES, "utf8");

    assert.match(readme, /APP-SHELL-TECHNOLOGY-DECISION\.md/);
    assert.match(readme, /browser-local shell over `127\.0\.0\.1` read-mostly HTTP/);
    assert.match(decision, /Status: decided/);
    assert.match(decision, /first app-shell target is a browser-local shell/);
    assert.match(decision, /first packaged desktop shell target is Tauri/);
    assert.match(decision, /Electron is not selected for the first GPAO-T app shell/);
    assert.match(decision, /GET \/control-center\/ui-validate/);
    assert.match(decision, /POST \/turn/);
    assert.match(decision, /Tauri command\/IPC only for explicit, approved local actions/);
    assert.match(decision, /runtime_unavailable/);
    assert.match(decision, /snapshot_invalid/);
    assert.match(decision, /authority_hidden/);
    assert.match(decision, /next_action_hidden/);
    assert.match(decision, /desktop viewport: `1440x960`/);
    assert.match(decision, /mobile viewport: `390x844`/);
    assert.match(api, /first GPAO-T app-shell slice is browser-local and read-mostly over `127\.0\.0\.1` HTTP/);
    assert.match(api, /GET \/control-center\/ui-snapshot/);
    assert.match(api, /POST \/turn/);
    assert.match(security, /browser-local, loopback-only, read-mostly, and no-external-activation/);
    assert.match(security, /Electron is deferred/);
  });

  it("exposes the design recipe as a runtime design contract", () => {
    const contract = buildLocalControlCenterDesignContract();
    const cliOutput = execFileSync(process.execPath, [CLI, "control", "design"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliContract = JSON.parse(cliOutput);
    const gateway = handleGatewayRequest({ method: "GET", path: "/control-center/design" });

    assert.equal(contract.schema, "gpao_t.local_control_center_design_contract.v0_1");
    assert.equal(contract.implementationBoundary.startsDaemon, false);
    assert.equal(contract.implementationBoundary.readsControlSnapshot, true);
    assert.equal(contract.implementationBoundary.firstUiRole, "static_visual_reader_for_existing_control_snapshot");
    assert.equal(contract.documentationContract.userReadableOverview, "docs/README.md");
    assert.equal(contract.documentationContract.executableSurfaces.includes("gpao-t control design"), true);
    assert.ok(contract.informationArchitecture.objectTypes.includes("Authority"));
    assert.ok(contract.qualityGate.includes("no_marketing_hero"));
    assert.equal(cliContract.schema, contract.schema);
    assert.equal(gateway.status, 200);
    assert.equal(gateway.body.schema, contract.schema);
  });

  it("requires the GPAO-T design reference gate for every UI/UX slice", () => {
    const gate = buildGpaoTDesignReferenceGate({
      slice: "approval-record-write-gate-implementation-design",
      surface: "Control Center Design Reference panel",
    });
    const verification = verifyGpaoTDesignReferenceGate({ gate });
    const cliOutput = execFileSync(process.execPath, [
      CLI,
      "control",
      "design-reference-gate",
      "approval-record-write-gate-implementation-design",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliGate = JSON.parse(cliOutput);
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "design-reference-gate-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gateway = handleGatewayRequest({ method: "GET", path: "/control-center/design-reference-gate" });
    const gatewayVerify = handleGatewayRequest({ method: "GET", path: "/control-center/design-reference-gate/verify" });

    assert.equal(gate.schema, "gpao_t.design_reference_gate.v0_1");
    assert.equal(gate.status, "required_for_every_ui_ux_slice");
    assert.equal(gate.mode, "evidence_contract_only_no_execution");
    assert.equal(gate.language, "ko");
    assert.equal(gate.referenceAxes.length, 5);
    assert.equal(gate.referenceAxes.some((axis) => axis.label === "Codex급 시각/대화 UX"), true);
    assert.equal(gate.referenceAxes.some((axis) => axis.label === "Claude Code급 운영/권한 UX"), true);
    assert.equal(gate.evidenceRequirements.length, 10);
    assert.equal(gate.evidenceRequirements.every((item) => item.required === true), true);
    assert.equal(gate.evidenceRequirements.some((item) => item.id === "desktop_screenshot"), true);
    assert.equal(gate.evidenceRequirements.some((item) => item.id === "mobile_screenshot"), true);
    assert.equal(gate.evidenceRequirements.some((item) => item.id === "korean_typography_line_break_review"), true);
    assert.equal(gate.requiredReportFields.includes("appliedSurfaces"), true);
    assert.equal(gate.requiredReportFields.includes("visualAdjustments"), true);
    assert.equal(gate.requiredReportFields.includes("desktopMobileFindings"), true);
    assert.equal(gate.requiredReportFields.includes("codexLevelFit"), true);
    assert.equal(gate.requiredReportFields.includes("claudeCodeLevelFit"), true);
    assert.equal(gate.requiredReportFields.includes("remainingAestheticRisks"), true);
    assert.equal(gate.requiredReportFields.includes("userPerceivedQualityRisk"), true);
    assert.equal(gate.blockedActions.includes("actual approval record write"), true);
    assert.equal(gate.blockedActions.includes("audit write"), true);
    assert.equal(gate.blockedActions.includes("tool/CLI/MCP execution"), true);
    assert.equal(gate.blockedActions.includes("durable memory promotion"), true);
    assert.equal(gate.deferredProductPolishRisks.some((risk) => risk.id === "control_center_density"), true);
    assert.equal(gate.deferredProductPolishRisks.some((risk) => risk.id === "product_wide_icon_system"), true);
    assert.equal(gate.deferredProductPolishRisks.some((risk) => risk.id === "mixed_english_technical_labels"), true);
    assert.equal(Object.values(gate.safetyInvariants).every((value) => value === false), true);
    assert.equal(verification.status, "ready");
    assert.equal(cliGate.schema, gate.schema);
    assert.equal(cliGate.slice, "approval-record-write-gate-implementation-design");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gateway.status, 200);
    assert.equal(gateway.body.schema, gate.schema);
    assert.equal(gatewayVerify.status, 200);
    assert.equal(gatewayVerify.body.status, "ready");
  });
});
