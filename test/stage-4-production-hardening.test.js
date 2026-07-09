import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  buildStage4ProductionHardening,
  buildStage4ProductionHardeningHtml,
  handleGatewayRequest,
  startControlCenterPreviewServer,
  verifyStage4ProductionHardening,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-stage-4-"));
}

describe("Stage 4 local app / desktop production hardening", () => {
  it("builds a stage 4 readiness state without opening build, install, connector, model, or external authority", () => {
    const state = buildStage4ProductionHardening();

    assert.equal(state.schema, "gpao_t.stage_4_production_hardening.v1");
    assert.equal(state.status, "ready");
    assert.equal(state.stage.current, 4);
    assert.equal(state.stage.total, 4);
    assert.equal(state.localServing.loopbackOnly, true);
    assert.equal(state.localServing.persistentDaemon, false);
    assert.equal(state.tauriShell.packagedBuildExecuted, false);
    assert.equal(state.tauriShell.dependencyInstallExecuted, false);
    assert.equal(state.tauriShell.bundleOrSigningExecuted, false);
    assert.equal(state.tauriShell.localIpc, "blocked_in_this_slice");
    assert.ok(state.tauriScaffold.every((file) => file.status === "present"));
    assert.ok(state.readinessChecks.some((check) => check.id === "replay_rollback_reference" && check.status === "ready"));
    assert.ok(state.blockedActions.includes("live model call"));
    assert.ok(state.blockedActions.includes("connector activation"));
    assert.ok(state.blockedActions.includes("external send"));
    assert.ok(state.blockedActions.includes("public release/deployment"));
    assert.ok(state.blockedActions.includes("durable memory promotion"));
  });

  it("renders no-script production hardening HTML with Korean product language", () => {
    const state = buildStage4ProductionHardening();
    const html = buildStage4ProductionHardeningHtml({ state });
    const verification = verifyStage4ProductionHardening({ state, html });

    assert.equal(verification.status, "ready");
    assert.match(html, /4단계/);
    assert.match(html, /제품화 준비/);
    assert.match(html, /권한 경계/);
    assert.match(html, /다음 안전 행동/);
    assert.match(html, /실제 빌드 없음/);
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /<form/i);
    assert.doesNotMatch(html, /actual_tool_execution|dry_run|credential_access/);
  });

  it("flags missing Tauri scaffold as a review/blocking recovery state", () => {
    const root = tempRoot();
    const state = buildStage4ProductionHardening({ root, sourceRoot: root });

    assert.equal(state.status, "review");
    assert.ok(state.readinessChecks.some((check) => check.id === "tauri_source_scaffold" && check.status === "blocked"));
    assert.ok(state.failureRecoveryStates.some((failure) => failure.id === "tauri_scaffold_missing" && failure.active));
    assert.equal(verifyStage4ProductionHardening({ state }).status, "blocked");
  });

  it("exposes Stage 4 through CLI and Gateway", () => {
    const cliState = JSON.parse(execFileSync(process.execPath, [CLI, "control", "stage-4-production-hardening"], {
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "stage-4-production-hardening-check"], {
      encoding: "utf8",
    }));
    const gatewayState = handleGatewayRequest({ method: "GET", path: "/app-shell/production-hardening" });
    const gatewayCheck = handleGatewayRequest({ method: "GET", path: "/app-shell/production-hardening/verify" });

    assert.equal(cliState.schema, "gpao_t.stage_4_production_hardening.v1");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayState.status, 200);
    assert.equal(gatewayState.body.schema, "gpao_t.stage_4_production_hardening.v1");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("serves Stage 4 through the browser-local preview server", async () => {
    const preview = await startControlCenterPreviewServer();
    try {
      const page = await fetch(`http://${preview.host}:${preview.port}/app-shell/production-hardening`);
      const state = await fetch(`http://${preview.host}:${preview.port}/app-shell/production-hardening/state`);
      const check = await fetch(`http://${preview.host}:${preview.port}/app-shell/production-hardening/verify`);

      const html = await page.text();
      const stateBody = await state.json();
      const checkBody = await check.json();

      assert.equal(page.status, 200);
      assert.match(html, /GPAO-T Local App Hardening/);
      assert.doesNotMatch(html, /<script/i);
      assert.equal(stateBody.schema, "gpao_t.stage_4_production_hardening.v1");
      assert.equal(checkBody.status, "ready");
    } finally {
      await preview.close();
    }
  });
});
