const RISKY_PATTERNS = [
  {
    pattern: /배포|deploy|publish|release/i,
    negatedPatterns: [
      /\b(?:do\s+not|don't|dont|never|avoid)\s+(?:deploy|publish|release)(?:\s+(?:or|and)\s+(?:deploy|publish|release))*\b/gi,
      /(?:배포|출시|공개)\s*(?:하지\s*마(?:세요)?|하지\s*말(?:아|고)?|하지\s*않(?:아|도록)|안\s*(?:해|하세요)|금지)/gi,
    ],
    gate: "public_release_or_distribution",
  },
  {
    pattern: /삭제|delete|remove/i,
    negatedPatterns: [/\b(?:do\s+not|don't|dont|never|avoid)\s+(?:delete|remove)\b/gi],
    gate: "data_deletion",
  },
  {
    pattern: /토큰|secret|api key|oauth/i,
    negatedPatterns: [],
    gate: "secret_or_account_boundary",
  },
  {
    pattern: /전송|send|email|slack|telegram/i,
    negatedPatterns: [/\b(?:do\s+not|don't|dont|never|avoid)\s+(?:send|email)\b/gi],
    gate: "external_send",
  },
  {
    pattern: /자동|cron|schedule|반복/i,
    negatedPatterns: [/\b(?:do\s+not|don't|dont|never|avoid)\s+(?:schedule|automate)\b/gi],
    gate: "recurring_automation",
  },
];
const RECOVERED_TARGET_GATES = new Map([
  ["release-file", "public_release_or_distribution"],
]);
const REFERENTIAL_EXECUTION_PATTERN = /\b(?:do|run|execute|ship)\s+(?:it|that)\b|\bgo\s+ahead\b|\bproceed(?:\s+with\s+(?:it|that))?\b/gi;
const NEGATED_EXECUTION_PREFIX = /(?:\bdo\s+not|\bdon't|\bdont|\bnever|\bavoid)\s*$/i;
const KOREAN_EXECUTION_PATTERN = /그대로\s*(?:해|진행해|실행해)|(?:지금|바로)\s*(?:해|진행해|실행해)|(?:진행|실행)\s*해|해\s*줘/i;
const KOREAN_NEGATED_EXECUTION_PATTERN = /하지\s*마|하지\s*말|하지\s*않|안\s*해|금지/i;

export function buildAuthorityDecision({ input, admissionPacket }) {
  const text = input.text || "";
  const gates = RISKY_PATTERNS
    .filter((item) => hasAffirmativeRiskSignal(text, item))
    .map((item) => item.gate);
  const recoveredTargetGate = resolveRecoveredTargetGate({ text, admissionPacket });
  const highRiskCells = admissionPacket.admittedCells.filter((item) => item.cell.weights?.risk > 0.65);
  const requiredApprovals = [...new Set([
    ...gates,
    ...(recoveredTargetGate ? [recoveredTargetGate] : []),
    ...highRiskCells.map(() => "high_risk_context_use"),
  ])];

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

function hasAffirmativeRiskSignal(text, { pattern, negatedPatterns }) {
  const remaining = negatedPatterns.reduce(
    (value, negatedPattern) => value.replace(negatedPattern, " "),
    String(text),
  );
  return pattern.test(remaining);
}

function resolveRecoveredTargetGate({ text, admissionPacket }) {
  if (admissionPacket.targetSource !== "prior_flow_follow_up") {
    return null;
  }
  if (!hasAffirmativeReferentialExecution(text)) {
    return null;
  }
  return RECOVERED_TARGET_GATES.get(admissionPacket.activeTargetId) || null;
}

function hasAffirmativeReferentialExecution(text) {
  const normalized = String(text);
  REFERENTIAL_EXECUTION_PATTERN.lastIndex = 0;
  for (let match = REFERENTIAL_EXECUTION_PATTERN.exec(normalized); match; match = REFERENTIAL_EXECUTION_PATTERN.exec(normalized)) {
    const prefix = normalized.slice(Math.max(0, match.index - 24), match.index);
    if (!NEGATED_EXECUTION_PREFIX.test(prefix)) {
      return true;
    }
  }
  return KOREAN_EXECUTION_PATTERN.test(normalized) && !KOREAN_NEGATED_EXECUTION_PATTERN.test(normalized);
}
