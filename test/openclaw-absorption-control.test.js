import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildDashboardForkMap,
  buildLabUiSlicePackage,
  buildMemoryKnowledgeControlArchitecture,
  buildMemoryReplayApplyGate,
  buildOpenClawLiveTurnHookReadinessGate,
  buildOpenClawAbsorptionOneStopPackage,
  buildOpenClawSourceCallPathPass,
  handleGatewayRequest,
  verifyOpenClawLiveTurnHookReadinessGate,
  verifyOpenClawAbsorptionOneStopPackage,
} from "../src/index.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

describe("GPAO-T OpenClaw absorption control", () => {
  it("fixes memory knowledge control boundaries before OpenClaw live mutation", () => {
    const architecture = buildMemoryKnowledgeControlArchitecture();

    assert.equal(architecture.schema, "gpao_t.memory_knowledge_control_architecture.v0_1");
    assert.deepEqual(architecture.sequence, [
      "openclaw_memory",
      "raw_data_vault",
      "source_record",
      "llm_wiki_compiler",
      "context_mesh",
      "tcell_admission",
      "knowledge_loop",
      "task_packet",
    ]);
    assert.equal(architecture.authority.liveMutationAllowed, false);
    assert.equal(
      architecture.stateBoundaries.some(
        (boundary) =>
          boundary.id === "knowledge_loop_candidate" &&
          boundary.mayNotDo.includes("durable_memory_promotion"),
      ),
      true,
    );
  });

  it("separates memory candidates, replay evidence, apply requests, and rollback", () => {
    const gate = buildMemoryReplayApplyGate();

    assert.equal(gate.schema, "gpao_t.memory_replay_apply_gate.v0_1");
    assert.deepEqual(gate.sequence, [
      "source_truth",
      "memory_candidate",
      "replay_evidence",
      "apply_request",
      "rollback_receipt",
    ]);
    assert.equal(gate.currentLivePolicy.sourceRead, "allowed");
    assert.equal(gate.currentLivePolicy.candidateReview, "allowed");
    assert.equal(gate.currentLivePolicy.replayEvidence, "required_before_apply");
    assert.equal(gate.currentLivePolicy.durableMemoryPromotion, "blocked_until_user_approval_and_rollback");
    assert.equal(
      gate.gates.some(
        (item) =>
          item.id === "replay_evidence" &&
          item.blocks.includes("belief-only improvement claims"),
      ),
      true,
    );
    assert.equal(gate.authority.liveMutationAllowed, false);
  });

  it("maps the OpenClaw chat source call path with GPAO-T landing zones", () => {
    const pass = buildOpenClawSourceCallPathPass();

    assert.equal(pass.schema, "gpao_t.openclaw_source_call_path_pass.v0_1");
    assert.deepEqual(pass.path.map((item) => item.step), [
      "ui_submit",
      "gateway_chat_send",
      "agent_dispatch",
      "context_engine",
      "tool_and_approval",
      "transcript_and_session",
    ]);
    assert.equal(
      pass.mutationCandidates.includes("add GpaoControlClient wrapper over GatewayBrowserClient.request"),
      true,
    );
    assert.equal(pass.authority.liveMutationAllowed, false);
  });

  it("keeps OpenClaw shell and composer while introducing GPAO-T work pane organs", () => {
    const map = buildDashboardForkMap();
    const introduced = map.introduce.map((item) => item.component);

    assert.equal(map.schema, "gpao_t.dashboard_fork_map.v0_1");
    assert.equal(map.keep.includes("composer, queue, retry, abort, reconnect, model controls"), true);
    assert.deepEqual(introduced, [
      "GpaoControlClient",
      "GpaoAppContext",
      "GpaoWorkPane",
      "GpaoInspector",
    ]);
    assert.equal(map.visualRules.some((rule) => /nested cards/.test(rule)), true);
  });

  it("builds a lab patch package without claiming live OpenClaw mutation", () => {
    const slice = buildLabUiSlicePackage();

    assert.equal(slice.schema, "gpao_t.openclaw_lab_ui_slice_package.v0_1");
    assert.match(slice.patchFile, /openclaw-dashboard-gpao-workpane-slice-001\.patch/);
    assert.equal(slice.targetFiles.includes("ui/src/pages/chat/chat-pane.ts"), true);
    assert.equal(
      slice.acceptance.includes("No live OpenClaw mutation is required to inspect the patch."),
      true,
    );
    assert.equal(slice.authority.liveMutationAllowed, false);
  });

  it("verifies the one-stop package is local-ready and live-not-mutated", () => {
    const pkg = buildOpenClawAbsorptionOneStopPackage();
    const verification = verifyOpenClawAbsorptionOneStopPackage(pkg);

    assert.equal(pkg.schema, "gpao_t.openclaw_absorption_one_stop_package.v0_1");
    assert.equal(pkg.status, "local_package_ready_live_not_mutated");
    assert.equal(pkg.phases.length, 5);
    assert.equal(pkg.flowKeeper.driftCheck.openClawInternalAbsorption, "pass");
    assert.equal(verification.status, "ready");
    assert.equal(verification.liveMutationAllowed, false);
  });

  it("prepares live turn hook readiness without opening live mutation", () => {
    const gate = buildOpenClawLiveTurnHookReadinessGate({ root: ROOT });
    const check = verifyOpenClawLiveTurnHookReadinessGate({ root: ROOT });

    assert.equal(gate.schema, "gpao_t.openclaw_live_turn_hook_readiness_gate.v0_1");
    assert.equal(gate.status, "ready_for_authorized_live_hook_stage");
    assert.equal(gate.bridgeContract.originalMessageMutation, false);
    assert.equal(gate.bridgeContract.providerBehaviorChange, "blocked_in_v1");
    assert.equal(gate.hookSequence.map((step) => step.id).includes("pre_send_preflight"), true);
    assert.equal(gate.hookSequence.map((step) => step.id).includes("post_answer_replay"), true);
    assert.equal(gate.diffPlan.forbiddenInThisGate.includes("write live OpenClaw files"), true);
    assert.equal(gate.rollbackPlan.requiredBeforeApply.includes("backup every touched live file"), true);
    assert.equal(gate.visualQaPlan.requiredEvidence.includes("Control Center live-turn lane screenshot"), true);
    assert.equal(gate.livePatchExecutorContract.dryRunDefaultRequired, true);
    assert.equal(gate.livePatchExecutorContract.applyFlagRequired, true);
    assert.equal(gate.livePatchExecutorContract.approvalTokenRequired, true);
    assert.equal(gate.livePatchExecutorContract.preApplyManifestRequired, true);
    assert.equal(gate.livePatchExecutorContract.currentHashGuardRequired, true);
    assert.equal(gate.livePatchExecutorContract.postApplyReadbackRequired, true);
    assert.equal(gate.authorityBoundary.liveMutationExecuted, false);
    assert.equal(gate.authorityBoundary.liveMutationAllowedByThisGate, false);
    assert.equal(gate.authorityBoundary.gatewayRestartAllowedNow, false);
    assert.equal(gate.authorityBoundary.telegramExternalSendAllowedNow, false);
    assert.equal(check.status, "ready");
    assert.equal(check.liveMutationAllowed, false);
  });

  it("exposes live turn hook readiness through the Gateway", () => {
    const gate = handleGatewayRequest({
      method: "GET",
      path: "/openclaw/live-turn-hook/readiness",
      root: ROOT,
    });
    const check = handleGatewayRequest({
      method: "GET",
      path: "/openclaw/live-turn-hook/readiness/verify",
      root: ROOT,
    });

    assert.equal(gate.status, 200);
    assert.equal(gate.body.status, "ready_for_authorized_live_hook_stage");
    assert.equal(gate.body.authorityBoundary.liveMutationAllowedByThisGate, false);
    assert.equal(check.status, 200);
    assert.equal(check.body.status, "ready");
  });
});
