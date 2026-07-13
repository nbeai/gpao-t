import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  buildSkillExecutionPlan,
  buildSkillReadinessReport,
  listSkillPacks,
  routeSkillPacks,
} from "../src/index.js";
import replayFixture from "../fixtures/replay/human-response-kernel-v1.json" with { type: "json" };

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CANON_PATH = `${ROOT}/docs/00-canon/GPAO-T-HUMAN-CENTERED-RESPONSE-CANON-ko.md`;

describe("GPAO-T Human Response Kernel", () => {
  it("ships a response canon that is T-cell based instead of a copied persona prompt", () => {
    const canon = readFileSync(CANON_PATH, "utf8");

    assert.match(canon, /Human Response T-cells/);
    assert.match(canon, /현재 사용자의 입력을 가장 먼저 보존한다/);
    assert.doesNotMatch(canon, /너는 BEAI/);
    assert.doesNotMatch(canon, /BEAI\(비아이\)/);

    for (const id of [
      "HRT-001",
      "HRT-002",
      "HRT-003",
      "HRT-004",
      "HRT-005",
      "HRT-006",
      "HRT-007",
      "HRT-008",
      "HRT-009",
      "HRT-010",
      "HRT-011",
      "HRT-012",
    ]) {
      assert.match(canon, new RegExp(id));
    }
  });

  it("registers the human response kernel as a production skill pack with replay and authority boundaries", () => {
    const registry = listSkillPacks();
    const pack = registry.packs.find((item) => item.id === "gpao-human-response-kernel-pack");

    assert.equal(registry.status, "ready");
    assert.ok(pack);
    assert.equal(pack.category, "core");
    assert.equal(pack.priority, 101);
    assert.ok(pack.outputArtifacts.includes("usable_answer"));
    assert.equal(pack.authorityBoundary.externalAction, "blocked_until_approval");

    const readiness = buildSkillReadinessReport();
    assert.equal(readiness.status, "ready");
    assert.equal(readiness.totalFindings, 0);
  });

  it("routes explicit response-quality failures through the human response kernel", () => {
    const route = routeSkillPacks({
      request: "말귀를 못 알아듣고 검색 안 하고 추측으로 답변하는 문제를 고쳐줘",
    });
    const selectedIds = route.selectedPacks.map((pack) => pack.id);
    const responsePack = route.selectedPacks.find((pack) => pack.id === "gpao-human-response-kernel-pack");

    assert.equal(route.status, "ready");
    assert.equal(route.intentProfile.primaryIntents.includes("human_response_quality"), true);
    assert.equal(route.intentProfile.qualityNeeds.includes("response_fit"), true);
    assert.equal(selectedIds.includes("gpao-human-response-kernel-pack"), true);
    assert.equal(responsePack.routeRole, "response_kernel");
    assert.equal(responsePack.firstQualityGate, "The current user input is preserved as the primary answer anchor.");
  });

  it("expands the response kernel into an execution contract without live mutation", () => {
    const plan = buildSkillExecutionPlan({
      request: "바로 쓸 수 있는 초안을 먼저 주고, 모르는 건 추측하지 말아줘",
    });
    const responseSkill = plan.selectedSkills.find((skill) => skill.id === "gpao-human-response-kernel-pack");

    assert.equal(plan.status, "ready");
    assert.ok(responseSkill);
    assert.ok(plan.artifactContract.candidateArtifacts.includes("artifact_draft"));
    assert.ok(plan.qualityGateContract.gates.includes("Artifact requests produce the usable draft or result before meta explanation."));
    assert.equal(responseSkill.authorityBoundary.promptCanonMutation, "review_required");
    assert.equal(plan.authorityContract.liveActionRule.includes("approval-gated"), true);
  });

  it("keeps replay cases concrete enough to catch the known response failures", () => {
    assert.equal(replayFixture.schema, "gpao_t.human_response_kernel_replay.v0_1");
    assert.equal(replayFixture.status, "ready");
    assert.equal(replayFixture.cases.length >= 5, true);

    for (const replayCase of replayFixture.cases) {
      assert.ok(replayCase.id);
      assert.ok(replayCase.input);
      assert.equal(replayCase.requiredTcells.length > 0, true);
      assert.equal(replayCase.expectedBehavior.length > 0, true);
      assert.equal(replayCase.rejectionSignals.length > 0, true);
    }

    assert.ok(replayFixture.cases.some((item) => item.id === "current_place_information_request"));
    assert.ok(replayFixture.cases.some((item) => item.rejectionSignals.some((signal) => signal.includes("검색 없이"))));
  });
});
