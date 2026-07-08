import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  appendReplayRecoveryRecord,
  appendSelfGrowthProposal,
  buildSelfGrowthProposal,
  handleGatewayRequest,
  readSelfGrowthProposals,
} from "../src/index.js";
import releaseFixture from "../fixtures/replay/release-file-active-target.json" with { type: "json" };

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-growth-proposals-"));
}

describe("GPAO-T self-growth proposals", () => {
  it("does not persist proposals when replay recovery evidence is insufficient", () => {
    const root = tempRoot();
    const preview = buildSelfGrowthProposal({ root, target: "release-file" });
    const proposed = appendSelfGrowthProposal({ root, target: "release-file" });

    assert.equal(preview.schema, "gpao_t.self_growth_proposal.v0_1");
    assert.equal(preview.proposalKind, "review_only_self_growth");
    assert.equal(preview.status, "insufficient_evidence");
    assert.equal(proposed.status, "insufficient_evidence");
    assert.deepEqual(readSelfGrowthProposals({ root }), []);
  });

  it("creates a review-only proposal from repeated recovery history", () => {
    const root = tempRoot();
    appendReplayRecoveryRecord({ root, fixture: releaseFixture, now: "2026-07-08T00:00:00.000Z" });
    appendReplayRecoveryRecord({ root, fixture: releaseFixture, now: "2026-07-08T00:01:00.000Z" });
    const proposal = appendSelfGrowthProposal({
      root,
      target: "release-file",
      now: "2026-07-08T00:02:00.000Z",
    });
    const proposals = readSelfGrowthProposals({ root });

    assert.equal(proposal.status, "proposed");
    assert.equal(proposal.proposalKind, "review_only_self_growth");
    assert.equal(proposal.target.id, "release-file");
    assert.equal(proposal.evidence.count, 2);
    assert.equal(proposal.authority.durableMemoryPromotion, "blocked");
    assert.equal(proposal.authority.osRuleMutation, "blocked");
    assert.equal(proposal.replayGate.status, "pending");
    assert.match(proposal.proposal.operatingPrinciple, /배포파일/);
    assert.equal(proposals.length, 1);
  });

  it("exposes preview, propose, and proposal list through the gateway", () => {
    const root = tempRoot();
    appendReplayRecoveryRecord({ root, fixture: releaseFixture, now: "2026-07-08T00:00:00.000Z" });
    appendReplayRecoveryRecord({ root, fixture: releaseFixture, now: "2026-07-08T00:01:00.000Z" });

    const preview = handleGatewayRequest({
      root,
      method: "POST",
      path: "/growth/preview",
      body: { target: "release-file" },
    });
    const propose = handleGatewayRequest({
      root,
      method: "POST",
      path: "/growth/propose",
      body: { target: "release-file" },
    });
    const proposals = handleGatewayRequest({ root, method: "GET", path: "/growth/proposals" });

    assert.equal(preview.status, 200);
    assert.equal(propose.status, 200);
    assert.equal(proposals.status, 200);
    assert.equal(preview.body.status, "proposed");
    assert.equal(propose.body.status, "proposed");
    assert.equal(proposals.body.length, 1);
  });
});
