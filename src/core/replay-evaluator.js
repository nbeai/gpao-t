export function evaluateReplay({ baseline, candidate, latencyBudgetMs = 150 } = {}) {
  const baselineSafe = baseline?.safe !== false;
  const candidateSafe = candidate?.safe !== false;
  const improved = Number(candidate?.quality || 0) > Number(baseline?.quality || 0);
  const latencyOk = Number(candidate?.latencyMs || 0) <= latencyBudgetMs;
  const passed = baselineSafe && candidateSafe && improved && latencyOk;
  return {
    schema: "gpao_t3.replay_evaluation.v1",
    passed,
    baseline: { quality: Number(baseline?.quality || 0), safe: baselineSafe, latencyMs: Number(baseline?.latencyMs || 0) },
    candidate: { quality: Number(candidate?.quality || 0), safe: candidateSafe, latencyMs: Number(candidate?.latencyMs || 0) },
    decision: passed ? "review_ready" : "hold",
    reasons: [!improved && "quality_not_improved", !candidateSafe && "candidate_safety_failed", !latencyOk && "latency_budget_exceeded"].filter(Boolean),
    durablePromotion: false,
    rollback: "not_applied"
  };
}
