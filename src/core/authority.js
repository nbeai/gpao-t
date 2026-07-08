const RISKY_PATTERNS = [
  { pattern: /배포|deploy|publish|release/i, gate: "public_release_or_distribution" },
  { pattern: /삭제|delete|remove/i, gate: "data_deletion" },
  { pattern: /토큰|secret|api key|oauth/i, gate: "secret_or_account_boundary" },
  { pattern: /전송|send|email|slack|telegram/i, gate: "external_send" },
  { pattern: /자동|cron|schedule|반복/i, gate: "recurring_automation" },
];

export function buildAuthorityDecision({ input, admissionPacket }) {
  const text = input.text || "";
  const gates = RISKY_PATTERNS.filter((item) => item.pattern.test(text)).map((item) => item.gate);
  const highRiskCells = admissionPacket.admittedCells.filter((item) => item.cell.weights?.risk > 0.65);
  const requiredApprovals = [...new Set([...gates, ...highRiskCells.map(() => "high_risk_context_use")])];

  return {
    schema: "gpao_t.authority_decision.v0_1",
    status: requiredApprovals.length ? "needs_approval" : "allowed",
    requiredApprovals,
    allowedActions: requiredApprovals.length
      ? ["explain", "plan", "draft", "local_preview"]
      : ["explain", "plan", "draft", "local_preview", "local_read"],
    blockedActions: requiredApprovals.length
      ? ["external_action", "durable_mutation", "public_release", "secret_write"]
      : [],
    explanation: requiredApprovals.length
      ? "This turn can draft and preview locally, but live authority actions need explicit approval."
      : "No live authority boundary was detected for this local turn.",
  };
}
