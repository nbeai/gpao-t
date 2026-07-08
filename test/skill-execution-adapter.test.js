import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  appendSkillExecutionRun,
  buildControlCenterSummary,
  buildSkillExecutionRun,
  buildSkillExecutionSummary,
  handleGatewayRequest,
  readSkillExecutionHistory,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-skill-execution-"));
}

describe("GPAO-T Skill Execution Adapter", () => {
  it("turns a routed skill plan into local artifacts, quality gates, replay evidence, and growth signals", () => {
    const run = buildSkillExecutionRun({
      request: "디자인 좋은 웹앱을 실제로 작동하게 만들어줘",
      now: "2026-07-08T00:00:00.000Z",
    });

    assert.equal(run.schema, "gpao_t.skill_execution_run.v0_1");
    assert.equal(run.executionBaseline, "skill_execution_adapter_v0_1");
    assert.equal(run.status, "ready");
    assert.equal(run.executionMode, "local_execution_plan");
    assert.equal(run.localArtifacts.some((artifact) => artifact.artifactName === "working_app"), true);
    assert.equal(run.localArtifacts.some((artifact) => artifact.artifactName === "visual_qa_report"), true);
    assert.equal(run.qualityGateResults.every((result) => result.status === "pass"), true);
    assert.equal(run.replayEvidence.status, "ready");
    assert.equal(run.growthSignalCandidates.length > 0, true);
    assert.equal(run.authorityBoundary.liveSkillMutation, "blocked_until_approval_replay_audit_and_rollback");
  });

  it("keeps authority-heavy growth execution in local preview with review-required boundaries", () => {
    const run = buildSkillExecutionRun({
      request: "자가성장 업그레이드를 자동화하되 승인 경계를 지켜줘",
      now: "2026-07-08T00:01:00.000Z",
    });

    assert.equal(run.status, "ready");
    assert.equal(run.executionMode, "local_preview_with_authority_gate");
    assert.equal(run.localArtifacts.some((artifact) => artifact.artifactName === "upgrade_proposal"), true);
    assert.equal(run.localArtifacts.some((artifact) => artifact.artifactName === "approval_card"), true);
    assert.equal(run.qualityGateResults.every((result) => result.status === "pass"), true);
    assert.equal(run.userVisibleSummary.nextSafeAction.includes("승인"), true);
    assert.equal(run.authorityBoundary.externalSend, "blocked_until_explicit_approval");
  });

  it("records local execution evidence without promoting memory or mutating live skills", () => {
    const root = tempRoot();
    const run = appendSkillExecutionRun({
      root,
      request: "디자인 좋은 웹앱을 만들어줘",
      now: "2026-07-08T00:02:00.000Z",
    });
    const history = readSkillExecutionHistory({ root });
    const summary = buildSkillExecutionSummary({ root });

    assert.equal(run.persistence.state, "written");
    assert.equal(existsSync(run.persistence.historyFile), true);
    assert.equal(history.length, 1);
    assert.equal(summary.totalRuns, 1);
    assert.equal(summary.status, "ready");
    assert.equal(summary.growthSignalCandidates.length > 0, true);
  });

  it("exposes skill execution through CLI, gateway, and Control Center summary", () => {
    const cliRun = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "skill",
      "execute",
      "디자인 좋은 웹앱을 만들어줘",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const root = tempRoot();
    const gatewayRun = handleGatewayRequest({
      method: "POST",
      path: "/skill/execute",
      body: { request: "디자인 좋은 웹앱을 만들어줘" },
    });
    const gatewayRecord = handleGatewayRequest({
      root,
      method: "POST",
      path: "/skill/execute/record",
      body: { request: "디자인 좋은 웹앱을 만들어줘" },
    });
    const summary = buildControlCenterSummary();
    const skillPanel = summary.panels.find((panel) => panel.id === "skill-ecosystem");

    assert.equal(cliRun.status, "ready");
    assert.equal(cliRun.localArtifacts.some((artifact) => artifact.artifactName === "working_app"), true);
    assert.equal(gatewayRun.status, 200);
    assert.equal(gatewayRun.body.schema, "gpao_t.skill_execution_run.v0_1");
    assert.equal(gatewayRecord.status, 200);
    assert.equal(gatewayRecord.body.persistence.state, "written");
    assert.equal(skillPanel.status === "ready" || skillPanel.status === "review", true);
    assert.equal(summary.counts.skillExecutionRuns >= 0, true);
  });
});
