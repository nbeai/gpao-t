import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { patchLiveGrowthHandler } from "../tools/apply-live-self-growth-authority-hardening.mjs";

const FIXTURE = `
async function handler(params) {
  const answerText = stringParam(params.answerText);
  const autoMemoryGrowth = answerText ? runAutoMemoryGrowthLoop({
			root: resolveGpaoTRuntimeRoot(),
			text: answerText,
			request: stringParam(params.userExpectation) || stringParam(params.activeTarget),
			source: {},
			candidate: {
				title: candidateDraft.candidate.title,
				operatingPrinciple: candidateDraft.candidate.operatingPrinciple,
				reason: candidateDraft.candidate.reason,
				anchor: candidateDraft.candidate.anchor
			},
			target: "context_mesh_candidate"
		}) : null;
  return {
    automaticLocalCandidateApply: "allowed_after_source_replay_and_rollback_gates",
    autoMemoryGrowth
  };
}
`;

describe("GPAO-T live self-growth authority hardening patch", () => {
  it("loads the current kernel and removes the generic automatic apply path", () => {
    const result = patchLiveGrowthHandler(FIXTURE);

    assert.equal(result.status, "patched");
    assert.match(result.source, /await import\("\.\/gpao-t-runtime-kernel\/core\/auto-memory-growth-loop\.js"\)/);
    assert.match(result.source, /growthSignalText: stringParam\(params\.userExpectation\)/);
    assert.doesNotMatch(result.source, /title: candidateDraft\.candidate\.title/);
    assert.match(result.source, /blocked_until_explicit_user_approval/);
  });

  it("is idempotent after the authority hardening is present", () => {
    const once = patchLiveGrowthHandler(FIXTURE);
    const twice = patchLiveGrowthHandler(once.source);

    assert.equal(twice.status, "already_hardened");
    assert.equal(twice.source, once.source);
  });
});
