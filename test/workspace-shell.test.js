import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  buildGpaoTWorkspaceShell,
  buildGpaoTWorkspaceShellHtml,
  handleGatewayRequest,
  verifyGpaoTWorkspaceShell,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-workspace-shell-"));
}

describe("GPAO-T Workspace Shell v0.1", () => {
  it("builds an owned workspace shell without opening live runtime mutation", () => {
    const root = tempRoot();
    const shell = buildGpaoTWorkspaceShell({ root });

    assert.equal(shell.schema, "gpao_t.workspace_shell.v0_1");
    assert.equal(shell.shellKind, "gpao_t_owned_workspace_shell");
    assert.equal(shell.sourceStrategy.runtimeSubstrate, "absorbed_local_runtime_reference");
    assert.equal(shell.sourceStrategy.codex, "multi_chat_work_rhythm_reference");
    assert.equal(shell.sourceStrategy.gpaoT, "product_owned_user_environment");
    assert.equal(shell.sourceStrategy.liveRuntimeMutation, false);
    assert.equal(shell.layout.pattern, "session_rail_active_work_session_inspector");
    assert.equal(shell.layout.left.actions.some((action) => action.id === "new_session"), true);
    assert.equal(shell.layout.right.tabs.some((tab) => tab.id === "authority"), true);
    assert.equal(shell.chatConditionStatus.conditions.length, 10);
    assert.equal(shell.operatingSignals.schema, "gpao_t.workspace_operating_signals.v0_1");
    assert.equal(shell.operatingSignals.activeTargetStrip.status, "visible");
    assert.equal(shell.operatingSignals.activeTargetStrip.replayProof.schema, "gpao_t.active_target_replay_proof.v0_1");
    assert.equal(shell.operatingSignals.activeTargetStrip.replayProof.status, "review_candidate");
    assert.equal(
      shell.operatingSignals.activeTargetStrip.replayProof.recoveredTarget,
      shell.operatingSignals.activeTargetStrip.activeTargetId,
    );
    assert.equal(
      shell.operatingSignals.activeTargetStrip.replayProof.rejectedAuthority.includes("live_openclaw_mutation"),
      true,
    );
    assert.equal(
      shell.operatingSignals.activeTargetStrip.replayProof.rejectedAuthority.includes("durable_memory_promotion"),
      true,
    );
    assert.equal(
      shell.operatingSignals.activeTargetStrip.replayProof.rejectedAuthority.includes("external_send"),
      true,
    );
    assert.equal(shell.operatingSignals.activeTargetStrip.replayProof.traceRefs.length > 0, true);
    assert.equal(shell.operatingSignals.activeTargetStrip.replayProof.replayRefs.length > 0, true);
    assert.equal(shell.firstCompletion.progress.readyStages, 6);
    assert.equal(shell.operatingSignals.progressLane.steps.some((step) => step.id === "first_completion"), true);
    assert.equal(shell.operatingSignals.progressLane.steps.length, 6);
    assert.match(shell.operatingSignals.progressLane.mobileSummary.text, /권한/);
    assert.equal(shell.operatingSignals.localFirstSignal.liveRuntimeRequired, false);
    assert.equal(shell.reviewConditionNarrowing.length, 3);
    assert.equal(shell.visualQaEvidence.status, "os_pass_002_local_proof");
    assert.match(shell.visualQaEvidence.osPass002EvidenceJson, /workspace-shell-os-pass-002/);
    assert.match(shell.visualQaEvidence.desktopScreenshot, /workspace-shell-desktop/);
    assert.match(shell.visualQaEvidence.mobileScreenshot, /workspace-shell-mobile/);
    assert.equal(shell.boundaries.liveRuntimeUiOverwrite, false);
    assert.equal(shell.boundaries.gatewayRestart, false);
    assert.equal(shell.boundaries.liveTurnExecution, false);
  });

  it("renders a no-script shell html with chat condition and three-pane markers", () => {
    const root = tempRoot();
    const shell = buildGpaoTWorkspaceShell({ root });
    const html = buildGpaoTWorkspaceShellHtml({ root, shell });
    const verification = verifyGpaoTWorkspaceShell({ shell, html });

    assert.equal(verification.status, "ready");
    assert.match(html, /data-gpao-t-workspace-shell="owned-workspace"/);
    assert.match(html, /data-live-runtime-mutation="false"/);
    assert.match(html, /data-session-rail="left"/);
    assert.match(html, /data-active-work-session="center"/);
    assert.match(html, /data-session-inspector="right"/);
    assert.match(html, /data-active-target-strip="visible"/);
    assert.match(html, /data-active-target-replay="visible"/);
    assert.match(html, /data-progress-lane="compact"/);
    assert.match(html, /data-first-completion="visible"/);
    assert.match(html, /1차 완료선/);
    assert.match(html, /data-mobile-progress-lane="compressed"/);
    assert.match(html, /data-local-first-latency-signal="visible"/);
    assert.match(html, /data-chat-condition-status="visible"/);
    assert.match(html, /data-chat-condition-disclosure="quiet"/);
    assert.doesNotMatch(html, /<script/i);
  });

  it("exposes CLI and Gateway routes for state, html, and verify", () => {
    const cliState = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "control",
      "workspace-shell",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    assert.equal(cliState.schema, "gpao_t.workspace_shell.v0_1");

    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "control",
      "workspace-shell-check",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    assert.equal(cliCheck.status, "ready");

    const cliHtml = execFileSync(process.execPath, [
      CLI,
      "control",
      "workspace-shell-html",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.match(cliHtml, /GPAO-T 작업 대시보드/);

    const gatewayState = handleGatewayRequest({ method: "GET", path: "/gpao-t-workspace/state" });
    assert.equal(gatewayState.status, 200);
    assert.equal(gatewayState.body.schema, "gpao_t.workspace_shell.v0_1");

    const gatewayHtml = handleGatewayRequest({ method: "GET", path: "/gpao-t-workspace" });
    assert.equal(gatewayHtml.status, 200);
    assert.match(gatewayHtml.body, /GPAO-T 작업 대시보드/);

    const gatewayVerify = handleGatewayRequest({ method: "GET", path: "/gpao-t-workspace/verify" });
    assert.equal(gatewayVerify.status, 200);
    assert.equal(gatewayVerify.body.status, "ready");
  });
});
