import assert from "node:assert/strict";
import test from "node:test";

import {
  patchReplayEvaluatorSource,
} from "../tools/apply-live-gpao-t-replay-evaluator-patch.mjs";

const source = `function buildBridgeAnswerReplayEvaluation(params) {
\tconst answerText = stringParam(params.answerText);
\tconst targetSignal = stringParam(params.activeTarget) || "gpao-t-turn-runtime";
\tconst targetScore = scoreSignals(answerText, replayTokens([targetSignal, stringParam(params.userExpectation)].join(" ")));
\tconst findings = [];
\tif (answerText && targetSignal && targetScore <= 0) findings.push("active_target_signal_missing");
\tconst evaluation = { replayChecks: {
\t\t\tanswerKeepsActiveTarget: answerText ? targetScore > 0 ? "review_signal_present" : "review_signal_missing" : "blocked",
\t\t}, measurements: {
\t\t\tactiveTargetSignalScore: targetScore,
\t\t\tanswerChars: answerText.length
\t\t} };
}
function replayTokens(value) { return []; }
function scoreSignals(text, tokens) { return 0; }`;

test("live replay evaluator recognizes explicit validation markers", () => {
  const patched = patchReplayEvaluatorSource(source);
  assert.match(patched, /explicitMarkerSignalScore/);
  assert.match(patched, /replayExplicitMarkers/);
  assert.match(patched, /targetSignalPresent/);
  assert.doesNotMatch(patched, /targetScore <= 0/);
});

test("live replay evaluator patch is idempotent", () => {
  const once = patchReplayEvaluatorSource(source);
  assert.equal(patchReplayEvaluatorSource(once), once);
});
