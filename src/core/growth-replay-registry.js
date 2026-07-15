import { canonicalDigest } from "./canonical-json.js";
import { RuntimeError } from "./errors.js";
import { applyGrowthPolicyChange, DEFAULT_GROWTH_ADMISSION_POLICY } from "./growth-policy.js";
import { createTaskPacket } from "./task-packet.js";
import { admitTcellCandidates } from "./tcell.js";

const REPLAY_NOW = 1_784_160_000_000;

function approvedCandidate(id, score = 0.9) {
  return Object.freeze({
    id, text: `중요한 작업의 승인 원칙 ${id}`, source: "sealed_growth_replay",
    traceRef: `trace-${id}`, sessionId: "growth-replay-session", userId: "owner:a", score,
    reviewed: true, approvedInfluence: true, sourceResolved: true, sourceInvalidated: false,
    influenceId: `influence-${id}`,
    authority: Object.freeze({ allowedUse: "answer_anchor", durablePromotion: true, decisionClass: "A2", decisionId: `decision-${id}` }),
    createdAt: REPLAY_NOW - 1_000, updatedAt: REPLAY_NOW - 1_000
  });
}

function capacityFixture(id) {
  return Object.freeze({
    id, request: "중요한 작업의 승인 원칙을 알려줘",
    candidates: Object.freeze([approvedCandidate(`${id}-1`), approvedCandidate(`${id}-2`), approvedCandidate(`${id}-3`)]),
    expectedStates: Object.freeze(["answer_anchor", "answer_anchor", "supporting_context"])
  });
}

function relevanceFixture(id) {
  return Object.freeze({
    id, request: "중요한 작업의 승인 원칙을 알려줘",
    candidates: Object.freeze([approvedCandidate(`${id}-low`, 0.18)]),
    expectedStates: Object.freeze(["rejected"])
  });
}

const CASES = Object.freeze({
  evaluation: Object.freeze([capacityFixture("admission.anchor-cap.evaluation.v1"), relevanceFixture("admission.low-relevance.evaluation.v1")]),
  holdout: Object.freeze([capacityFixture("admission.anchor-cap.holdout.v1"), relevanceFixture("admission.low-relevance.holdout.v1")])
});

export const SEALED_GROWTH_REPLAY_CASE_IDS = Object.freeze(Object.fromEntries(Object.entries(CASES).map(([split, cases]) => [split, Object.freeze(cases.map(item => item.id))])));

function executeCase(fixture, policy) {
  const taskPacket = createTaskPacket({ sessionId: "growth-replay-session", input: fixture.request, userId: "owner:a", contextWindow: 4096 });
  const admission = admitTcellCandidates(taskPacket, fixture.candidates, { ...policy, now: REPLAY_NOW });
  const actualStates = admission.decisions.map(decision => decision.state);
  const failureCount = fixture.expectedStates.reduce((count, expected, index) => count + Number(actualStates[index] !== expected), 0);
  const wrongAnchor = fixture.expectedStates.reduce((count, expected, index) => count + Number(actualStates[index] === "answer_anchor" && expected !== "answer_anchor"), 0);
  return { id: fixture.id, expectedStates: [...fixture.expectedStates], actualStates, quality: 1 - (failureCount / fixture.expectedStates.length), failureCount, wrongAnchor };
}

export function runSealedGrowthReplay({ proposal, detail, datasetSplit, baselinePolicy = DEFAULT_GROWTH_ADMISSION_POLICY }) {
  const fixtures = CASES[datasetSplit];
  if (!fixtures || !["evaluation", "holdout"].includes(datasetSplit)) throw new RuntimeError("growth_replay_split_invalid", "지원하지 않는 replay 데이터 분할입니다.", 400);
  const expectedIds = SEALED_GROWTH_REPLAY_CASE_IDS[datasetSplit];
  if (datasetSplit === "evaluation" && (proposal.replayCaseIds.length !== expectedIds.length || proposal.replayCaseIds.some((value, index) => value !== expectedIds[index]))) throw new RuntimeError("growth_replay_fixture_unsealed", "서버가 봉인한 replay 사례만 사용할 수 있습니다.", 409);
  const effectiveBaseline = applyGrowthPolicyChange(DEFAULT_GROWTH_ADMISSION_POLICY, baselinePolicy);
  const candidatePolicy = applyGrowthPolicyChange(effectiveBaseline, detail.proposedChange || {});
  const cases = fixtures.map(fixture => {
    const baseline = executeCase(fixture, effectiveBaseline);
    const candidate = executeCase(fixture, candidatePolicy);
    return {
      id: fixture.id, baselineQuality: baseline.quality, candidateQuality: candidate.quality,
      baselineFailure: baseline.failureCount, candidateFailure: candidate.failureCount,
      baselineWrongAnchor: baseline.wrongAnchor, candidateWrongAnchor: candidate.wrongAnchor,
      baselineStates: baseline.actualStates, candidateStates: candidate.actualStates, expectedStates: baseline.expectedStates
    };
  });
  const regressionCount = cases.filter(item => item.candidateQuality < item.baselineQuality || item.candidateWrongAnchor > item.baselineWrongAnchor || item.candidateFailure > item.baselineFailure).length;
  const recurrenceBefore = cases.reduce((sum, item) => sum + item.baselineFailure, 0);
  const recurrenceAfter = cases.reduce((sum, item) => sum + item.candidateFailure, 0);
  const wrongAnchorDelta = cases.reduce((sum, item) => sum + item.candidateWrongAnchor - item.baselineWrongAnchor, 0);
  const qualityDelta = cases.reduce((sum, item) => sum + item.candidateQuality - item.baselineQuality, 0) / cases.length;
  const metrics = { caseCount: cases.length, regressionCount, recurrenceBefore, recurrenceAfter, recurrenceDelta: recurrenceAfter - recurrenceBefore, wrongAnchorDelta, qualityDelta };
  return {
    sealed: true,
    baselinePolicy: effectiveBaseline,
    baselineDigest: canonicalDigest("gpao_t3.growth_policy_snapshot.v1", effectiveBaseline),
    candidatePolicy,
    fixtureDigest: canonicalDigest("gpao_t3.sealed_growth_replay.v1", cases),
    cases,
    metrics,
    passed: cases.length >= 2 && regressionCount === 0 && metrics.recurrenceDelta < 0 && wrongAnchorDelta <= 0 && qualityDelta > 0
  };
}

export function verifyRestoredGrowthPolicy(policy, snapshotPolicy, snapshotDigest) {
  const restored = canonicalDigest("gpao_t3.growth_policy_snapshot.v1", policy) === snapshotDigest
    && canonicalDigest("gpao_t3.growth_policy_snapshot.v1", snapshotPolicy) === snapshotDigest;
  const currentOutcomes = CASES.holdout.map(fixture => executeCase(fixture, policy));
  const snapshotOutcomes = CASES.holdout.map(fixture => executeCase(fixture, snapshotPolicy));
  return restored && canonicalDigest("gpao_t3.rollback_holdout.v1", currentOutcomes) === canonicalDigest("gpao_t3.rollback_holdout.v1", snapshotOutcomes);
}
