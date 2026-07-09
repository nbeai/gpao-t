import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runDoctor, runTurn } from "../src/index.js";
import releaseFixture from "../fixtures/replay/release-file-active-target.json" with { type: "json" };

describe("GPAO-T turn kernel", () => {
  it("recovers the active target for a short Korean follow-up", () => {
    const result = runTurn(releaseFixture);

    assert.equal(result.sessionOverlay.continuityState, "recovered");
    assert.equal(result.sessionOverlay.activeTargetId, "release-file");
    assert.equal(result.inputSignal.kind, "follow_up");
    assert.equal(result.admissionPacket.status, "ready");
    assert.equal(result.taskPacket.activeTargetId, "release-file");
    assert.equal(result.adapterPlan.status, "preview");
    assert.equal(result.taskPacket.selectedModelAdapter, "local.fast.stub");
    assert.match(result.userVisibleState.summary, /맥락/);
  });

  it("downgrades stale release-file continuity for a general Work Surface request", () => {
    const result = runTurn({
      input: { text: "GPAO-T 첫 로컬 작업 루프를 검증하고 다음 안전 행동을 정리해줘." },
      priorFlow: releaseFixture.priorFlow,
    });

    assert.equal(result.inputSignal.kind, "general_request");
    assert.equal(result.sessionOverlay.activeTargetId, "general-runtime");
    assert.equal(result.sessionOverlay.requestType, "work_surface_general_request");
    assert.equal(result.sessionOverlay.stalePriorTarget, true);
    assert.equal(result.taskPacket.activeTargetId, "general-runtime");
    assert.equal(result.taskPacket.stalePriorTarget, true);
    assert.equal(
      result.admissionPacket.admittedCells.some((cell) => cell.role === "anchor" && cell.cell.anchor === "release-file"),
      false,
    );
  });

  it("gates distribution-like action while allowing local preview", () => {
    const result = runTurn({
      input: { text: "이 배포파일을 바로 publish 해줘" },
      priorFlow: releaseFixture.priorFlow,
    });

    assert.equal(result.authorityDecision.status, "needs_approval");
    assert.ok(result.authorityDecision.requiredApprovals.includes("public_release_or_distribution"));
    assert.ok(result.toolPlan.admittedTools.includes("local_draft"));
    assert.ok(result.authorityDecision.blockedActions.includes("public_release"));
  });

  it("adds intent-based skill routing to the task packet and user-visible state", () => {
    const result = runTurn({
      input: { text: "디자인 좋은 웹앱을 실제로 작동하게 만들어줘" },
    });
    const selectedIds = result.taskPacket.skillRoute.selectedPacks.map((pack) => pack.id);

    assert.equal(result.skillRoute.intentProfile.primaryIntents.includes("build_or_modify_app"), true);
    assert.equal(result.skillRoute.intentProfile.primaryIntents.includes("improve_visual_quality"), true);
    assert.equal(selectedIds.includes("gpao-webapp-builder-pack"), true);
    assert.equal(selectedIds.includes("gpao-visual-design-pack"), true);
    assert.equal(result.taskPacket.trace.includes("route_skill_packs"), true);
    assert.equal(result.taskPacket.trace.includes("build_skill_execution_plan"), true);
    assert.equal(result.taskPacket.skillExecutionPlan.status, "ready");
    assert.ok(result.taskPacket.skillExecutionPlan.selectedSkills.some((skill) => skill.id === "gpao-webapp-builder-pack"));
    assert.equal(result.taskPacket.skillExecutionPlan.qualityGateContract.status, "ready");
    assert.ok(result.userVisibleState.selectedSkills.some((skill) => skill.id === "gpao-visual-design-pack"));
    assert.equal(result.userVisibleState.skillExecutionMode, "local_execution_plan");
    assert.match(result.userVisibleState.nextSafeAction, /스킬팩/);
  });

  it("routes authority-heavy growth requests through governance skill support", () => {
    const result = runTurn({
      input: { text: "자가성장 업그레이드를 자동화하되 승인 경계를 지켜줘" },
    });
    const selectedIds = result.taskPacket.skillRoute.selectedPacks.map((pack) => pack.id);

    assert.equal(result.skillRoute.intentProfile.primaryIntents.includes("self_growth_or_governance"), true);
    assert.equal(selectedIds.includes("gpao-growth-governance-pack"), true);
    assert.ok(result.taskPacket.skillRoute.selectedPacks.some((pack) => pack.routeRole === "authority_guard"));
    assert.equal(result.taskPacket.skillExecutionPlan.executionMode, "local_preview_with_authority_gate");
    assert.equal(result.taskPacket.skillExecutionPlan.authorityContract.status, "review_required");
  });

  it("keeps a doctor check for the first implementation target", () => {
    const result = runDoctor();

    assert.equal(result.status, "ready");
    assert.deepEqual(result.missing, []);
    assert.equal(result.developmentPrinciples.path, "docs/DEVELOPMENT-PRINCIPLES.md");
  });
});
