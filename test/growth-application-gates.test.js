import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  appendGrowthApplicationGate,
  appendReplayRecoveryRecord,
  appendSelfGrowthProposal,
  buildGrowthApplicationGate,
  buildGrowthApplicationGateSummary,
  handleGatewayRequest,
  readGrowthApplicationGates,
} from "../src/index.js";
import releaseFixture from "../fixtures/replay/release-file-active-target.json" with { type: "json" };

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-growth-application-gates-"));
}

function seedProposal(root) {
  appendReplayRecoveryRecord({ root, fixture: releaseFixture, now: "2026-07-08T00:00:00.000Z" });
  appendReplayRecoveryRecord({ root, fixture: releaseFixture, now: "2026-07-08T00:01:00.000Z" });
  return appendSelfGrowthProposal({
    root,
    target: "release-file",
    now: "2026-07-08T00:02:00.000Z",
  });
}

describe("GPAO-T growth application gates", () => {
  it("blocks application when no proposal exists", () => {
    const root = tempRoot();
    const gate = buildGrowthApplicationGate({ root, target: "release-file" });

    assert.equal(gate.schema, "gpao_t.growth_application_gate.v0_1");
    assert.equal(gate.status, "blocked_live_mutation");
    assert.equal(gate.reviewStatus, "not_ready");
    assert.equal(gate.proposal, null);
    assert.equal(gate.application.canApplyNow, false);
    assert.match(gate.nextSafeAction, /proposal/);
  });

  it("records replay, approval, audit, and rollback gates without live mutation", () => {
    const root = tempRoot();
    const proposal = seedProposal(root);
    const gate = appendGrowthApplicationGate({
      root,
      proposalId: proposal.id,
      approvalStatus: "approved_for_apply",
      now: "2026-07-08T00:03:00.000Z",
    });
    const gates = readGrowthApplicationGates({ root });

    assert.equal(gate.status, "blocked_live_mutation");
    assert.equal(gate.reviewStatus, "review_passed_apply_blocked");
    assert.equal(gate.replayGate.status, "passed");
    assert.equal(gate.approvalGate.passed, true);
    assert.equal(gate.auditGate.status, "required_before_apply");
    assert.equal(gate.rollbackGate.status, "plan_available");
    assert.equal(gate.authorityBoundary.liveRuntimeMutation, "blocked_in_this_slice");
    assert.equal(gate.application.canApplyNow, false);
    assert.equal(gate.application.reversibleApplyEngine, "not_implemented_required_before_live_mutation");
    assert.equal(gates.length, 1);
  });

  it("summarizes blocked growth applications for the Control Center", () => {
    const root = tempRoot();
    seedProposal(root);
    appendGrowthApplicationGate({
      root,
      target: "release-file",
      approvalStatus: "requested",
      now: "2026-07-08T00:03:00.000Z",
    });
    const summary = buildGrowthApplicationGateSummary({ root });

    assert.equal(summary.schema, "gpao_t.growth_application_gate_summary.v0_1");
    assert.equal(summary.status, "review");
    assert.equal(summary.totalGates, 1);
    assert.equal(summary.blockedLiveMutations, 1);
    assert.equal(summary.authorityBoundary.liveRuntimeMutation, "blocked_in_this_slice");
  });

  it("exposes application gates through CLI and gateway", () => {
    const root = tempRoot();
    const proposal = seedProposal(root);
    const gate = handleGatewayRequest({
      root,
      method: "POST",
      path: "/growth/application-gate",
      body: { proposalId: proposal.id, approvalStatus: "approved_for_apply" },
    });
    const record = handleGatewayRequest({
      root,
      method: "POST",
      path: "/growth/application-gate/record",
      body: { proposalId: proposal.id, approvalStatus: "requested" },
    });
    const list = handleGatewayRequest({ root, method: "GET", path: "/growth/application-gates" });
    const summary = handleGatewayRequest({ root, method: "GET", path: "/growth/application-gates/summary" });
    const cliOutput = execFileSync(process.execPath, [CLI, "growth", "gate-summary"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliSummary = JSON.parse(cliOutput);

    assert.equal(gate.status, 200);
    assert.equal(record.status, 200);
    assert.equal(list.status, 200);
    assert.equal(summary.status, 200);
    assert.equal(gate.body.reviewStatus, "review_passed_apply_blocked");
    assert.equal(record.body.reviewStatus, "awaiting_approval");
    assert.equal(list.body.length, 1);
    assert.equal(summary.body.totalGates, 1);
    assert.equal(cliSummary.schema, "gpao_t.growth_application_gate_summary.v0_1");
  });
});
