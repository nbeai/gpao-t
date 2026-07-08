import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  buildLocalControlCenterDesignContract,
  handleGatewayRequest,
} from "../src/index.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const DESIGN_RECIPE = `${ROOT}/docs/LOCAL-CONTROL-CENTER-DESIGN-RECIPE.md`;
const README = `${ROOT}/docs/README.md`;
const PRINCIPLES = `${ROOT}/docs/DEVELOPMENT-PRINCIPLES.md`;
const HUMAN_READABILITY_CHECK = `${ROOT}/docs/03-verification/CONTROL-CENTER-HUMAN-READABILITY-CHECK.md`;
const APP_SHELL_DECISION_GATE = `${ROOT}/docs/03-engineering/APP-SHELL-DECISION-GATE.md`;

describe("GPAO-T Local Control Center design recipe", () => {
  it("adapts BEAI design.md into a GPAO-T UI implementation contract", () => {
    const text = readFileSync(DESIGN_RECIPE, "utf8");

    assert.match(text, /Source doctrine: `\/Users\/jyp\/Documents\/Playground 2\/beai-harness-for-codex\/design\.md`/);
    assert.match(text, /Local Control Center is an operating desk/);
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

    assert.match(readme, /LOCAL-CONTROL-CENTER-DESIGN-RECIPE\.md/);
    assert.match(readme, /Work \/ Context \/ Evidence \/ Growth \/ Authority/);
    assert.match(principles, /BEAI Harness `design\.md`/);
    assert.match(principles, /LOCAL-CONTROL-CENTER-DESIGN-RECIPE\.md/);
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
    assert.match(appShell, /Status: ready for decision, not approved for implementation/);
    assert.match(appShell, /Loopback-only or local IPC/);
    assert.match(appShell, /No OAuth setup, token storage, external model call/);
    assert.match(appShell, /Technology decision record/);
    assert.match(appShell, /app-shell decision gate open, implementation not started/);
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
});
