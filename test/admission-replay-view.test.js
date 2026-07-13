import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildReplayRecoveryView,
  captureMemoryEntry,
  handleGatewayRequest,
  runRuntimeTurn,
} from "../src/index.js";
import releaseFixture from "../fixtures/replay/release-file-active-target.json" with { type: "json" };

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-admission-"));
}

describe("GPAO-T admission scoring and replay recovery view", () => {
  it("adds score breakdown and recovery hints to admitted T-cells", () => {
    const root = tempRoot();
    captureMemoryEntry({
      root,
      title: "GPAO package noun binding",
      body: "배포파일 should resolve to GPAO-T Operating Package in this product flow.",
    });
    const result = runRuntimeTurn({
      root,
      input: { text: "그럼 배포파일은?" },
      priorFlow: { flowKey: "gpao-t-dev-flow", activeTargetId: "release-file" },
    });
    const candidate = result.admissionPacket.admittedCells.find((cell) => cell.id.includes("tcell.candidate"));

    assert.ok(candidate.admissionScore > 0);
    assert.ok(candidate.scoreBreakdown.some((item) => item.signal === "active_target_anchor"));
    assert.match(candidate.recoveryHint, /current-turn anchor|supporting context/);
    assert.equal(result.admissionPacket.scoringSummary.strongestAnchor.startsWith("tcell."), true);
    assert.ok(result.admissionPacket.trace.includes("admission_score_explains_current_turn_use"));
  });

  it("builds a replay recovery view explaining what was admitted", () => {
    const view = buildReplayRecoveryView({ fixture: releaseFixture });

    assert.equal(view.schema, "gpao_t.replay_recovery_view.v0_1");
    assert.equal(view.activeTarget.id, "release-file");
    assert.equal(view.recovery.status, "recovered");
    assert.ok(view.admitted[0].scoreBreakdown.length > 0);
    assert.match(view.nextSafeAction, /로컬 초안과 검증 계획/);
  });

  it("exposes replay recovery view through the gateway", () => {
    const response = handleGatewayRequest({
      method: "POST",
      path: "/replay/recovery",
      body: { fixture: releaseFixture },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.recovery.status, "recovered");
    assert.equal(response.body.activeTarget.id, "release-file");
  });
});
