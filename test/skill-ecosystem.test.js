import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  appendSkillExecutionRun,
  buildControlCenterSummary,
  buildSkillBuildQueue,
  buildSkillCandidateAtlas,
  buildSkillEcosystemPlan,
  buildSkillExecutionPlan,
  buildSkillExecutionRun,
  buildSkillExecutionSummary,
  buildSkillIntentProfile,
  buildSkillManifestStandard,
  buildSkillManualFirstPlan,
  buildSkillProductionRoadmap,
  buildSkillProductionStatus,
  buildSkillReadinessReport,
  handleGatewayRequest,
  listSkillPacks,
  readSkillExecutionHistory,
  routeSkillPacks,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-skill-execution-"));
}

describe("GPAO-T Skill Ecosystem", () => {
  it("defines the prime rule and required manifest lifecycle", () => {
    const manifest = buildSkillManifestStandard();

    assert.equal(manifest.schema, "gpao_t.skill_manifest_standard.v0_1");
    assert.equal(manifest.status, "ready");
    assert.match(manifest.primeRule, /real user problem/);
    assert.equal(manifest.requiredFields.includes("tcellPrinciple"), true);
    assert.equal(manifest.requiredFields.includes("qualityGates"), true);
    assert.equal(manifest.lifecycle.includes("research"), true);
    assert.equal(manifest.lifecycle.includes("replay"), true);
    assert.equal(manifest.automationPolicy.liveSkillMutation, "approval_and_replay_required");
  });

  it("turns manual-first automation guidance into an executable skill governance surface", () => {
    const plan = buildSkillManualFirstPlan();

    assert.equal(plan.schema, "gpao_t.skill_manual_first_plan.v0_1");
    assert.equal(plan.status, "ready");
    assert.match(plan.principle, /manual/);
    assert.equal(plan.stages.some((stage) => stage.id === "manual_preview"), true);
    assert.equal(plan.stages.some((stage) => stage.id === "dry_run_replay"), true);
    assert.equal(plan.automationBias.liveSkillMutation, "approval_replay_rollback_required");
    assert.match(plan.completionRule, /manual preview/);
  });

  it("ships base packs across core, design, builder, domain, data, evidence, governance, and quality work", () => {
    const registry = listSkillPacks();

    assert.equal(registry.schema, "gpao_t.skill_pack_registry.v0_1");
    assert.equal(registry.status, "ready");
    assert.equal(registry.total >= 11, true);
    assert.deepEqual(registry.categories, [
      "artifact",
      "builder",
      "core",
      "data",
      "design",
      "domain",
      "evidence",
      "governance",
      "quality",
    ]);
    assert.equal(registry.packs.some((pack) => pack.id === "gpao-visual-design-pack"), true);
    assert.equal(registry.packs.some((pack) => pack.id === "gpao-korean-business-pack"), true);
    assert.equal(registry.packs.some((pack) => pack.id === "gpao-replay-evaluation-pack"), true);
    assert.equal(registry.packs.some((pack) => pack.id === "gpao-quality-audit-pack"), true);
    assert.equal(registry.packs.some((pack) => pack.id === "gpao-local-app-qa-pack"), true);
  });

  it("lists the full skill candidate atlas before individual pack production", () => {
    const atlas = buildSkillCandidateAtlas();
    const phaseOne = buildSkillCandidateAtlas({ phase: "phase-1" });

    assert.equal(atlas.schema, "gpao_t.skill_candidate_atlas.v0_1");
    assert.equal(atlas.status, "ready");
    assert.equal(atlas.allCandidates >= 20, true);
    assert.deepEqual(atlas.phaseSummary.find((item) => item.phase === "phase-1"), {
      phase: "phase-1",
      total: 9,
      seedPacks: 6,
      productionPacks: 3,
      plannedCandidates: 0,
    });
    assert.equal(atlas.productionPolicy.buildBundlesBeforeSinglePacks, true);
    assert.equal(atlas.candidates.some((candidate) => candidate.id === "gpao-replay-evaluation-pack"), true);
    assert.equal(atlas.candidates.some((candidate) => candidate.id === "gpao-tcell-research-pack"), true);
    assert.equal(phaseOne.candidates.every((candidate) => candidate.phase === "phase-1"), true);
    assert.equal(phaseOne.candidates.some((candidate) => candidate.id === "gpao-quality-audit-pack"), true);
  });

  it("turns the skill atlas into a phased production roadmap and build queue", () => {
    const roadmap = buildSkillProductionRoadmap();
    const queue = buildSkillBuildQueue({ phase: "phase-1" });
    const productionStatus = buildSkillProductionStatus({ phase: "phase-1" });

    assert.equal(roadmap.schema, "gpao_t.skill_production_roadmap.v0_1");
    assert.equal(roadmap.status, "ready");
    assert.equal(roadmap.phases.length, 3);
    assert.equal(roadmap.buildBundles.some((bundle) => bundle.id === "bundle.foundation-six"), true);
    assert.equal(roadmap.buildBundles.some((bundle) => bundle.id === "bundle.quality-loop"), true);
    assert.equal(queue.schema, "gpao_t.skill_build_queue.v0_1");
    assert.equal(queue.status, "ready");
    assert.equal(queue.items[0].phase, "phase-1");
    assert.equal(queue.items[0].productionChecklist.some((item) => item.item === "quality_gate_replay"), true);
    assert.equal(queue.items
      .find((item) => item.id === "gpao-replay-evaluation-pack")
      .productionChecklist
      .some((item) => item.item === "manifest" && item.status === "present_production"), true);
    assert.equal(productionStatus.schema, "gpao_t.skill_production_status.v0_1");
    assert.equal(productionStatus.status, "ready");
    assert.equal(productionStatus.totalCandidates, 9);
    assert.equal(productionStatus.producedPacks, 9);
    assert.equal(productionStatus.blockers.length, 0);
    assert.equal(productionStatus.packs.every((pack) => pack.registryStatus === "registered"), true);
  });

  it("keeps the ecosystem ready only when every pack has research, gates, replay, authority, and growth signals", () => {
    const readiness = buildSkillReadinessReport();

    assert.equal(readiness.schema, "gpao_t.skill_ecosystem_readiness.v0_1");
    assert.equal(readiness.status, "ready");
    assert.equal(readiness.totalFindings, 0);
    assert.equal(readiness.authorityBoundary.externalSendOrDeploy, "blocked_until_approval");
  });

  it("routes design-heavy app work toward visual design and web/app builder packs", () => {
    const route = routeSkillPacks({
      request: "한국 일반 사용자가 보기 좋은 웹앱 UI 디자인과 랜딩페이지를 만들어줘",
    });

    assert.equal(route.schema, "gpao_t.skill_route.v0_1");
    assert.equal(route.status, "ready");
    const selectedIds = route.selectedPacks.map((pack) => pack.id);
    assert.equal(selectedIds.includes("gpao-visual-design-pack"), true);
    assert.equal(selectedIds.includes("gpao-webapp-builder-pack"), true);
    assert.equal(route.routingPolicy.runQualityGatesBeforeCompletion, true);
  });

  it("profiles user intent before routing skills", () => {
    const profile = buildSkillIntentProfile({
      request: "한국 사업자를 위한 최신 통계와 공시 자료를 근거로 사업계획서 초안을 만들어줘",
    });

    assert.equal(profile.schema, "gpao_t.skill_intent_profile.v0_1");
    assert.equal(profile.routingBaseline, "intent_profile_before_keyword_match_v0_1_1");
    assert.equal(profile.status, "ready");
    assert.equal(profile.primaryIntents.includes("research_evidence"), true);
    assert.equal(profile.primaryIntents.includes("korean_business"), true);
    assert.equal(profile.primaryIntents.includes("document_artifact"), true);
    assert.equal(profile.qualityNeeds.includes("source_grounding"), true);
    assert.equal(profile.outputNeeds.includes("document"), true);
  });

  it("routes mixed business research document work by intent, output, and quality needs", () => {
    const route = routeSkillPacks({
      request: "한국 사업자를 위한 최신 통계와 공시 자료를 근거로 사업계획서 초안을 만들어줘",
    });
    const selectedIds = route.selectedPacks.map((pack) => pack.id);

    assert.equal(route.intentProfile.primaryIntents.includes("research_evidence"), true);
    assert.equal(route.routingBaseline, "intent_profile_task_packet_v0_1_1");
    assert.equal(selectedIds.includes("gpao-research-evidence-pack"), true);
    assert.equal(selectedIds.includes("gpao-korean-business-pack"), true);
    assert.equal(route.selectedPacks.some((pack) => pack.intentReasons.includes("matched_output_artifact")), true);
    assert.equal(route.routeQuality.intentCoverage, "covered");
  });

  it("turns selected skill packs into execution steps, artifacts, quality gates, and authority contracts", () => {
    const plan = buildSkillExecutionPlan({
      request: "디자인 좋은 웹앱을 실제로 작동하게 만들어줘",
    });
    const selectedIds = plan.selectedSkills.map((skill) => skill.id);

    assert.equal(plan.schema, "gpao_t.skill_execution_plan.v0_1");
    assert.equal(plan.status, "ready");
    assert.equal(plan.executionMode, "local_execution_plan");
    assert.equal(selectedIds.includes("gpao-visual-design-pack"), true);
    assert.equal(selectedIds.includes("gpao-webapp-builder-pack"), true);
    assert.ok(plan.selectedSkills.every((skill) => skill.executionSteps.length >= 4));
    assert.equal(plan.artifactContract.candidateArtifacts.includes("working_app"), true);
    assert.equal(plan.qualityGateContract.status, "ready");
    assert.match(plan.qualityGateContract.completionRule, /quality gates/);
  });

  it("keeps skill execution authority-gated when the intent needs approval", () => {
    const plan = buildSkillExecutionPlan({
      request: "자가성장 업그레이드를 자동화하되 승인 경계를 지켜줘",
    });

    assert.equal(plan.status, "ready");
    assert.equal(plan.executionMode, "local_preview_with_authority_gate");
    assert.equal(plan.authorityContract.status, "review_required");
    assert.equal(plan.selectedSkills[0].id, "gpao-growth-governance-pack");
    assert.match(plan.authorityContract.liveActionRule, /approval-gated/);
  });

  it("runs selected skills as local preview artifacts without live mutation", () => {
    const run = buildSkillExecutionRun({
      request: "디자인 좋은 웹앱을 실제로 작동하게 만들어줘",
      now: "2026-07-08T00:00:00.000Z",
    });

    assert.equal(run.schema, "gpao_t.skill_execution_run.v0_1");
    assert.equal(run.status, "ready");
    assert.equal(run.executionMode, "local_execution_plan");
    assert.equal(run.localArtifacts.some((artifact) => artifact.artifactName === "working_app"), true);
    assert.equal(run.qualityGateResults.every((result) => result.status === "pass"), true);
    assert.equal(run.authorityBoundary.liveSkillMutation, "blocked_until_approval_replay_audit_and_rollback");
    assert.equal(run.authorityBoundary.localPreview, "allowed");
  });

  it("records skill execution history as local evidence only", () => {
    const root = tempRoot();
    const run = appendSkillExecutionRun({
      root,
      request: "자가성장 업그레이드 제안을 검토용으로 만들어줘",
      now: "2026-07-08T00:00:00.000Z",
    });
    const history = readSkillExecutionHistory({ root });
    const summary = buildSkillExecutionSummary({ root });

    assert.equal(run.persistence.state, "written");
    assert.match(run.persistence.historyFile, /\.gpao-t/);
    assert.equal(history.length, 1);
    assert.equal(summary.schema, "gpao_t.skill_execution_summary.v0_1");
    assert.equal(summary.totalRuns, 1);
    assert.equal(summary.growthSignalCandidates.length > 0, true);
  });

  it("keeps ambiguous user requests anchored to core thinking instead of pretending a domain fit", () => {
    const route = routeSkillPacks({ request: "좋아. 진행해." });

    assert.equal(route.intentProfile.ambiguity, "high");
    assert.equal(route.selectedPacks[0].id, "gpao-core-thinking-pack");
    assert.equal(route.selectedPacks[0].routeRole, "intent_recovery");
    assert.equal(route.selectedPacks[0].intentReasons.includes("forced_core_for_ambiguity_or_continuity"), true);
  });

  it("exposes CLI surfaces for ecosystem, readiness, packs, and routing", () => {
    const ecosystem = JSON.parse(execFileSync(process.execPath, [CLI, "skill", "ecosystem"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const atlas = JSON.parse(execFileSync(process.execPath, [CLI, "skill", "atlas", "phase-1"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const roadmap = JSON.parse(execFileSync(process.execPath, [CLI, "skill", "roadmap"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const buildQueue = JSON.parse(execFileSync(process.execPath, [CLI, "skill", "build-queue", "phase-1"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const productionStatus = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "skill",
      "production-status",
      "phase-1",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const readiness = JSON.parse(execFileSync(process.execPath, [CLI, "skill", "readiness"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const intent = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "skill",
      "intent",
      "디자인 좋은 웹앱을 만들어줘",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const manualFirst = JSON.parse(execFileSync(process.execPath, [CLI, "skill", "manual-first"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const executionPlan = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "skill",
      "execute-plan",
      "디자인 좋은 웹앱을 만들어줘",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const executionRun = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "skill",
      "execute",
      "디자인 좋은 웹앱을 만들어줘",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const designPacks = JSON.parse(execFileSync(process.execPath, [CLI, "skill", "packs", "design"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const route = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "skill",
      "route",
      "디자인 좋은 웹앱을 만들어줘",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    }));

    assert.equal(ecosystem.status, "ready");
    assert.equal(ecosystem.candidateAtlas.totalCandidates >= 20, true);
    assert.equal(atlas.status, "ready");
    assert.equal(atlas.candidates.every((candidate) => candidate.phase === "phase-1"), true);
    assert.equal(roadmap.status, "ready");
    assert.equal(buildQueue.status, "ready");
    assert.equal(productionStatus.status, "ready");
    assert.equal(productionStatus.producedPacks, 9);
    assert.equal(intent.primaryIntents.includes("build_or_modify_app"), true);
    assert.equal(readiness.status, "ready");
    assert.equal(manualFirst.status, "ready");
    assert.equal(executionPlan.status, "ready");
    assert.equal(executionPlan.qualityGateContract.status, "ready");
    assert.equal(executionRun.schema, "gpao_t.skill_execution_run.v0_1");
    assert.equal(executionRun.authorityBoundary.localPreview, "allowed");
    assert.equal(manualFirst.stages[0].id, "manual_preview");
    assert.equal(designPacks.total, 1);
    assert.equal(designPacks.packs[0].id, "gpao-visual-design-pack");
    assert.equal(route.selectedPacks[0].id, "gpao-visual-design-pack");
  });

  it("exposes skill execution adapter through the gateway", () => {
    const root = tempRoot();
    const atlas = handleGatewayRequest({ root, method: "GET", path: "/skill/atlas" });
    const roadmap = handleGatewayRequest({ root, method: "GET", path: "/skill/roadmap" });
    const queue = handleGatewayRequest({
      root,
      method: "GET",
      path: "/skill/build-queue",
      body: { phase: "phase-1" },
    });
    const productionStatus = handleGatewayRequest({
      root,
      method: "GET",
      path: "/skill/production-status",
      body: { phase: "phase-1" },
    });
    const run = handleGatewayRequest({
      root,
      method: "POST",
      path: "/skill/execute",
      body: { request: "디자인 좋은 웹앱을 만들어줘" },
    });
    const record = handleGatewayRequest({
      root,
      method: "POST",
      path: "/skill/execute/record",
      body: { request: "디자인 좋은 웹앱을 만들어줘" },
    });
    const history = handleGatewayRequest({ root, method: "GET", path: "/skill/execution-history" });
    const summary = handleGatewayRequest({ root, method: "GET", path: "/skill/execution-summary" });

    assert.equal(atlas.status, 200);
    assert.equal(atlas.body.schema, "gpao_t.skill_candidate_atlas.v0_1");
    assert.equal(roadmap.status, 200);
    assert.equal(roadmap.body.schema, "gpao_t.skill_production_roadmap.v0_1");
    assert.equal(queue.status, 200);
    assert.equal(queue.body.schema, "gpao_t.skill_build_queue.v0_1");
    assert.equal(productionStatus.status, 200);
    assert.equal(productionStatus.body.schema, "gpao_t.skill_production_status.v0_1");
    assert.equal(productionStatus.body.status, "ready");
    assert.equal(run.status, 200);
    assert.equal(run.body.schema, "gpao_t.skill_execution_run.v0_1");
    assert.equal(record.status, 200);
    assert.equal(record.body.persistence.state, "written");
    assert.equal(history.body.length, 1);
    assert.equal(summary.body.totalRuns, 1);
  });

  it("adds skill ecosystem status to the local control center summary", () => {
    const summary = buildControlCenterSummary();
    const panel = summary.panels.find((item) => item.id === "skill-ecosystem");

    assert.equal(Boolean(panel), true);
    assert.equal(panel.status, "ready");
    assert.equal(summary.counts.skillPacks >= 11, true);
    assert.equal(summary.counts.skillCandidates >= 20, true);
    assert.equal(summary.counts.phaseOneProducedSkillPacks, 9);
    assert.equal(summary.counts.phaseOneSkillProductionBlockers, 0);
  });

  it("documents the future GPAO-T integration contract without pretending live skill execution exists", () => {
    const plan = buildSkillEcosystemPlan();

    assert.equal(plan.status, "ready");
    assert.equal(plan.routingBaseline, "intent_profile_task_packet_v0_1_1");
    assert.equal(plan.documentationContract.implementationTruthSource, "src/core/skill-ecosystem.js");
    assert.match(plan.documentationContract.userReadableBaseline, /GPAO-T-BASE-SKILL-PACKS-ko\.md/);
    assert.equal(plan.integrationContract.registrySurface, "gpao-t skill packs");
    assert.equal(plan.integrationContract.productionStatusSurface, "gpao-t skill production-status [phase]");
    assert.equal(plan.phaseProductionBaseline.status, "ready");
    assert.equal(plan.phaseProductionBaseline.producedPacks, 9);
    assert.match(plan.integrationContract.runtimeHook, /turn kernel/);
    assert.equal(plan.positioning.notThis.includes("a pile of prompt templates"), true);
  });
});
