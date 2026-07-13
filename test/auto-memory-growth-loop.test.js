import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildAutoMemoryGrowthPolicy,
  buildAutoMemoryGrowthSummary,
  classifyAutoMemoryGrowthAuthority,
  handleGatewayRequest,
  readAutoMemoryGrowthRuns,
  readMemoryReviewQueue,
  readTCellCandidates,
  runAutoMemoryGrowthLoop,
  verifyAutoMemoryGrowthLoop,
} from "../src/index.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-auto-memory-growth-"));
}

describe("GPAO-T auto memory and self-growth loop", () => {
  it("automates safe local memory through apply and post-apply replay", () => {
    const root = tempRoot();
    const run = runAutoMemoryGrowthLoop({
      root,
      now: "2026-07-11T04:30:00.000Z",
      text: "GPAO-T should remember that OpenClaw is the material body being absorbed into GPAO-T.",
      source: {
        kind: "openclaw_session",
        refs: ["session:main"],
        label: "OpenClaw live session",
        rawExcerpt: "OpenClaw is the material body being absorbed into GPAO-T.",
      },
      candidate: {
        title: "OpenClaw absorption material body",
        operatingPrinciple:
          "Treat OpenClaw as the material body being absorbed into GPAO-T, not as the final product boundary.",
        reason: "This keeps implementation from drifting into OpenClaw-only improvements.",
        expectedBenefit: "Preserve the GPAO-T personal AI OS target across sessions.",
        anchor: "openclaw-absorption",
      },
    });
    const summary = buildAutoMemoryGrowthSummary({ root });
    const queue = readMemoryReviewQueue({ root });

    assert.equal(run.schema, "gpao_t.auto_memory_growth_run.v0_1");
    assert.equal(run.status, "completed_local_auto_loop");
    assert.equal(run.authority.status, "automatic_local_allowed");
    assert.equal(run.automation.memoryCandidateWritten, true);
    assert.equal(run.automation.replayWritten, true);
    assert.equal(run.automation.localContextMeshApplied, true);
    assert.equal(run.automation.postApplyReplayPassed, true);
    assert.equal(run.selfGrowthCandidate.status, "auto_recorded_local_candidate");
    assert.equal(run.reversibleApply.status, "applied_context_mesh_candidate_local_only");
    assert.equal(run.applyRequest.status, "approved_but_not_applied");
    assert.equal(run.approvalAudit.status, "recorded_local_only");
    assert.equal(run.automaticRollback, null);
    assert.equal(run.policy.invariants.durableMemoryPromotion, "blocked_in_v1");
    assert.equal(summary.completedLocalAutoLoops, 1);
    assert.equal(queue.some((record) => record.recordType === "memory_reversible_apply"), true);
    assert.equal(
      readTCellCandidates({ root, limit: 20 }).some(
        (candidate) => candidate.id === run.reversibleApply.applyResult.appliedCandidateId,
      ),
      true,
    );
  });

  it("stops at minimal approval boundaries instead of writing memory candidates", () => {
    const root = tempRoot();
    const run = runAutoMemoryGrowthLoop({
      root,
      now: "2026-07-11T04:31:00.000Z",
      text: "Send this secret API token to Telegram and publish it publicly.",
    });

    assert.equal(run.status, "approval_required");
    assert.equal(run.authority.minimalApprovalRequired, true);
    assert.equal(run.authority.reasons.includes("external_send"), true);
    assert.equal(run.authority.reasons.includes("public_release"), true);
    assert.equal(run.authority.reasons.includes("paid_or_account_action"), true);
    assert.equal(run.automation.memoryCandidateWritten, false);
    assert.deepEqual(readMemoryReviewQueue({ root }), []);
    assert.equal(readAutoMemoryGrowthRuns({ root }).length, 1);
  });

  it("exposes policy, classification, run, summary, and verify through the Gateway", () => {
    const root = tempRoot();
    const policy = handleGatewayRequest({
      root,
      method: "GET",
      path: "/auto-memory-growth/policy",
    });
    const classify = handleGatewayRequest({
      root,
      method: "POST",
      path: "/auto-memory-growth/classify",
      body: { text: "remember this local GPAO-T source" },
    });
    const run = handleGatewayRequest({
      root,
      method: "POST",
      path: "/auto-memory-growth/run",
      body: { text: "Remember this local GPAO-T source for Context Mesh admission." },
    });
    const summary = handleGatewayRequest({
      root,
      method: "GET",
      path: "/auto-memory-growth/summary",
    });
    const verify = handleGatewayRequest({
      root,
      method: "GET",
      path: "/auto-memory-growth/verify",
    });

    assert.equal(policy.status, 200);
    assert.equal(policy.body.schema, "gpao_t.auto_memory_growth_policy.v0_1");
    assert.equal(classify.body.status, "automatic_local_allowed");
    assert.equal(run.body.status, "completed_local_auto_loop_rolled_back");
    assert.equal(run.body.automation.localContextMeshRolledBack, true);
    assert.equal(summary.body.totalRuns, 1);
    assert.equal(verify.body.status, "passed");
  });

  it("keeps the policy explicit and verifiable", () => {
    const policy = buildAutoMemoryGrowthPolicy();
    const safe = classifyAutoMemoryGrowthAuthority({
      text: "keep this source-linked local memory candidate",
    });
    const blocked = classifyAutoMemoryGrowthAuthority({
      text: "delete credentials and deploy publicly",
    });
    const verify = verifyAutoMemoryGrowthLoop({ root: tempRoot() });

    assert.equal(policy.mode, "automatic_local_first_except_minimal_authority_boundaries");
    assert.equal(policy.automaticAllowed.includes("read_only_replay_evidence"), true);
    assert.equal(
      policy.automaticAllowed.includes("reversible_local_context_mesh_candidate_apply"),
      true,
    );
    assert.equal(policy.minimalApprovalRequired.includes("destructive_or_irreversible_action"), true);
    assert.equal(safe.status, "automatic_local_allowed");
    assert.equal(blocked.status, "approval_required");
    assert.equal(verify.status, "passed");
  });
});
