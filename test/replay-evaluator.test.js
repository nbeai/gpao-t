import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReplay } from "../src/core/replay-evaluator.js";

test("replay advances only safe, faster-enough quality improvements", () => {
  const accepted = evaluateReplay({ baseline: { quality: 0.6, safe: true, latencyMs: 40 }, candidate: { quality: 0.8, safe: true, latencyMs: 70 } });
  assert.equal(accepted.passed, true);
  assert.equal(accepted.decision, "review_ready");
  assert.equal(accepted.durablePromotion, false);
  const rejected = evaluateReplay({ baseline: { quality: 0.8, safe: true }, candidate: { quality: 0.9, safe: false, latencyMs: 20 } });
  assert.equal(rejected.passed, false);
  assert.equal(rejected.decision, "hold");
  assert.equal(rejected.rollback, "not_applied");
});
