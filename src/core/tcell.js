export function admitTcellCandidates(taskPacket, candidates, { maxAnchors = 3 } = {}) {
  const admitted = [];
  const held = [];
  for (const candidate of candidates) {
    if (!candidate.traceRef || candidate.score <= 0) { held.push({ ...candidate, admission: "review_needed", reason: "missing_trace_or_relevance" }); continue; }
    if (admitted.length < maxAnchors && candidate.reviewed) admitted.push({ ...candidate, admission: "supporting_context", reason: "reviewed_trace_and_relevance" });
    else held.push({ ...candidate, admission: "review_needed", reason: "not_reviewed_for_anchor" });
  }
  return { schema: "gpao_t.admission_decision.v1", taskPacketId: taskPacket.id, admitted, held, blocked: false, durableMemoryPromotion: false, trace: { candidateCount: candidates.length, admittedCount: admitted.length } };
}

export function createReplayAndGrowthCandidate({ taskPacket, admission, outcome }) {
  const replay = { schema: "gpao_t.replay_record.v1", taskPacketId: taskPacket.id, outcome: outcome.status, passed: outcome.status === "succeeded", checkedAt: Date.now(), sourceTrace: admission.trace };
  const growthCandidate = { schema: "gpao_t.growth_candidate.v1", id: `growth_${taskPacket.id}`, reason: outcome.status === "succeeded" ? "observe_success_pattern" : "inspect_failure_pattern", risk: "review_required", replay, applyState: "candidate_only", rollback: "not_applied" };
  return { replay, growthCandidate };
}
