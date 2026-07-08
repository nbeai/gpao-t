import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  appendReplayRecoveryRecord,
  buildRecoveryHistorySummary,
  handleGatewayRequest,
  readReplayRecoveryHistory,
} from "../src/index.js";
import releaseFixture from "../fixtures/replay/release-file-active-target.json" with { type: "json" };

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-replay-history-"));
}

describe("GPAO-T replay recovery history", () => {
  it("records replay recovery views as local history without external activation", () => {
    const root = tempRoot();
    const record = appendReplayRecoveryRecord({
      root,
      fixture: releaseFixture,
      now: "2026-07-08T00:00:00.000Z",
    });
    const history = readReplayRecoveryHistory({ root });

    assert.equal(record.schema, "gpao_t.replay_recovery_record.v0_1");
    assert.equal(record.status, "recovered");
    assert.equal(record.activeTarget.id, "release-file");
    assert.equal(history.length, 1);
    assert.equal(history[0].view.recovery.status, "recovered");
  });

  it("summarizes repeated recovery targets", () => {
    const root = tempRoot();
    appendReplayRecoveryRecord({ root, fixture: releaseFixture, now: "2026-07-08T00:00:00.000Z" });
    appendReplayRecoveryRecord({ root, fixture: releaseFixture, now: "2026-07-08T00:01:00.000Z" });
    const summary = buildRecoveryHistorySummary({ root });

    assert.equal(summary.status, "ready");
    assert.equal(summary.totalRecords, 2);
    assert.equal(summary.byStatus.recovered, 2);
    assert.equal(summary.byTarget["release-file"], 2);
    assert.deepEqual(summary.repeatedTargets, [{ target: "release-file", count: 2 }]);
    assert.match(summary.nextSafeAction, /replay-proven improvements/);
  });

  it("exposes replay history and summary through the gateway", () => {
    const root = tempRoot();
    const record = handleGatewayRequest({
      root,
      method: "POST",
      path: "/replay/record",
      body: { fixture: releaseFixture },
    });
    const history = handleGatewayRequest({ root, method: "GET", path: "/recovery/history" });
    const summary = handleGatewayRequest({ root, method: "GET", path: "/recovery/summary" });

    assert.equal(record.status, 200);
    assert.equal(history.status, 200);
    assert.equal(summary.status, 200);
    assert.equal(history.body.length, 1);
    assert.equal(summary.body.byStatus.recovered, 1);
  });
});
