export function percentile(samples, ratio) {
  if (!samples.length) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

export function estimateContextTokens(text) {
  return Math.max(0, Math.ceil(Buffer.byteLength(String(text || ""), "utf8") / 3));
}

export function summarizeRetrieval(cases, observations) {
  const byId = new Map(observations.map(item => [item.caseId, item]));
  const positive = cases.filter(item => item.shouldFind && item.gate !== false);
  const restraint = cases.filter(item => !item.shouldFind && item.kind !== "cross_session");
  const isolation = cases.filter(item => item.kind === "cross_session");
  const semantic = cases.filter(item => item.shouldFind && item.kind.includes("semantic"));
  let reciprocalRank = 0;
  let correct = 0;
  let contextTokens = 0;
  for (const fixture of positive) {
    const observation = byId.get(fixture.id) || { markers:[], contextText:"" };
    const rank = observation.markers.indexOf(fixture.expectedMarker);
    if (rank >= 0) { correct += 1; reciprocalRank += 1 / (rank + 1); }
  }
  for (const observation of observations) contextTokens += estimateContextTokens(observation.contextText);
  const noResultCorrect = restraint.filter(fixture => (byId.get(fixture.id)?.markers || []).length === 0).length;
  const leaks = isolation.filter(fixture => (byId.get(fixture.id)?.markers || []).includes(fixture.expectedMarker)).length;
  const isolationFalseRecalls = isolation.filter(fixture => (byId.get(fixture.id)?.markers || []).length > 0).length;
  const semanticCorrect = semantic.filter(fixture => (byId.get(fixture.id)?.markers || []).includes(fixture.expectedMarker)).length;
  const latencies = observations.map(item => item.latencyMs).filter(Number.isFinite);
  return {
    cases: cases.length,
    positiveCases: positive.length,
    recallAt5: positive.length ? correct / positive.length : 1,
    mrr: positive.length ? reciprocalRank / positive.length : 1,
    semanticRecallAt5: semantic.length ? semanticCorrect / semantic.length : null,
    noResultRestraint: restraint.length ? noResultCorrect / restraint.length : 1,
    crossSessionLeakageRate: isolation.length ? leaks / isolation.length : 0,
    crossSessionFalseRecallRate: isolation.length ? isolationFalseRecalls / isolation.length : 0,
    latency: { p50Ms: percentile(latencies, 0.5), p95Ms: percentile(latencies, 0.95), samples:latencies.length },
    retrievedContextTokens: contextTokens,
    correctRetrievalsPer1000ContextTokens: contextTokens ? (correct * 1000) / contextTokens : correct ? null : 0
  };
}
