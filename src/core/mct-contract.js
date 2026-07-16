export const MCT_CONTRACT_VERSION = 1;

export const MCT_CANONICAL_TYPES = Object.freeze([
  "RawObservation", "MemoryRecord", "RetrievalHit", "TCellCandidate", "TCellCore",
  "AdmissionDecision", "TaskPacket", "ResponseInfluence", "OutcomeObservation",
  "GrowthProposal", "ReplayResult", "MutationLedger", "RollbackReceipt"
]);

export const MCT_SURFACE_EVENT_TYPES = Object.freeze([
  "memory.retrieved", "memory.admitted", "memory.rejected", "memory.influenced",
  "growth.proposed", "growth.replayed", "growth.applied", "growth.rolled_back"
]);

export const MCT_SURFACE_EVENT_PAYLOADS = Object.freeze({
  "memory.retrieved": Object.freeze(["candidateIds", "sourceCount"]),
  "memory.admitted": Object.freeze(["decisionIds", "answerAnchorIds", "supportingContextIds"]),
  "memory.rejected": Object.freeze(["candidateId", "reasonCode"]),
  "memory.influenced": Object.freeze(["responseDocumentId", "influenceIds"]),
  "growth.proposed": Object.freeze(["proposalId", "scope", "approvalState"]),
  "growth.replayed": Object.freeze(["proposalId", "replayResultId", "passed"]),
  "growth.applied": Object.freeze(["mutationId", "scope", "expiresAt", "rollbackReceiptId"]),
  "growth.rolled_back": Object.freeze(["mutationId", "rollbackReceiptId", "verified"])
});

const MCT_PAYLOAD_VALUE_RULES = Object.freeze({
  candidateIds: value => Array.isArray(value) && value.every(item => typeof item === "string" && item.length > 0),
  sourceCount: value => Number.isInteger(value) && value >= 0,
  decisionIds: value => Array.isArray(value) && value.every(item => typeof item === "string" && item.length > 0),
  answerAnchorIds: value => Array.isArray(value) && value.every(item => typeof item === "string" && item.length > 0),
  supportingContextIds: value => Array.isArray(value) && value.every(item => typeof item === "string" && item.length > 0),
  candidateId: value => typeof value === "string" && value.length > 0,
  reasonCode: value => ["scope_mismatch", "trace_missing", "authority_denied", "conflict_detected", "stale", "budget_exceeded", "user_rejected", "relevance_below_threshold", "entailment_not_supported", "review_required", "supporting_context_capacity_exceeded", "answer_anchor_capacity_degraded_to_support"].includes(value),
  responseDocumentId: value => typeof value === "string" && value.length > 0,
  influenceIds: value => Array.isArray(value) && value.every(item => typeof item === "string" && item.length > 0),
  proposalId: value => typeof value === "string" && value.length > 0,
  scope: value => MEMORY_SCOPE_ORDER.includes(value),
  approvalState: value => ["candidate", "review_required", "approved", "rejected"].includes(value),
  replayResultId: value => typeof value === "string" && value.length > 0,
  passed: value => typeof value === "boolean",
  mutationId: value => typeof value === "string" && value.length > 0,
  expiresAt: value => value === null || (Number.isInteger(value) && value >= 0),
  rollbackReceiptId: value => typeof value === "string" && value.length > 0,
  verified: value => typeof value === "boolean"
});

export function mctSurfacePayloadFindings(type, payload) {
  const required = MCT_SURFACE_EVENT_PAYLOADS[type];
  if (!required) return [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return ["payload_not_object"];
  const missing = required.filter(key => !(key in payload));
  const extra = Object.keys(payload).filter(key => !required.includes(key));
  const invalid = required.filter(key => key in payload && !MCT_PAYLOAD_VALUE_RULES[key]?.(payload[key]));
  return [...missing.map(key => `missing:${key}`), ...extra.map(key => `unsupported:${key}`), ...invalid.map(key => `invalid:${key}`)];
}

export const MEMORY_SCOPE_ORDER = Object.freeze(["turn", "session", "project", "user_global"]);
export const REJECTED_CANDIDATE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const PROMPT_BUDGET_CONTRACT = Object.freeze({
  schema: "gpao_t3.prompt_budget_contract.v1",
  minimumContextWindow: 2048,
  allocation: Object.freeze({ system: 0.125, currentRequest: 0.125, recentConversation: 0.2, memory: 0.1, toolResults: 0.15, output: 0.25, reserve: 0.05 }),
  shrinkOrder: Object.freeze(["memory.supporting_context", "recent_conversation.oldest_first", "tool_results.detail", "memory.answer_anchor_nonessential"]),
  invariants: Object.freeze(["current_request_never_evicted_by_memory", "minimum_output_never_evicted_by_memory", "memory_never_exceeds_budget", "every_answer_anchor_has_admission_decision"])
});

export function allocatePromptBudget(contextWindow) {
  if (!Number.isInteger(contextWindow) || contextWindow < PROMPT_BUDGET_CONTRACT.minimumContextWindow) throw new TypeError("contextWindow must be an integer of at least 2048 tokens");
  const allocation = Object.fromEntries(Object.entries(PROMPT_BUDGET_CONTRACT.allocation).map(([key, ratio]) => [key, Math.floor(contextWindow * ratio)]));
  allocation.reserve += contextWindow - Object.values(allocation).reduce((sum, value) => sum + value, 0);
  return Object.freeze({ contextWindow, ...allocation });
}

export function taskPacketFindings(packet, decisions = []) {
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) return ["packet_not_object"];
  const budget = packet.budget;
  if (!budget || typeof budget !== "object" || Array.isArray(budget)) return ["budget_not_object"];
  const keys = ["system", "currentRequest", "recentConversation", "memory", "toolResults", "output", "reserve"];
  const invalid = keys.filter(key => !Number.isInteger(budget[key]) || budget[key] < 0);
  const findings = invalid.map(key => `invalid_budget:${key}`);
  if (!Number.isInteger(budget.contextWindow) || budget.contextWindow < PROMPT_BUDGET_CONTRACT.minimumContextWindow) findings.push("invalid_budget:contextWindow");
  if (budget.output === 0) findings.push("minimum_output_missing");
  if (budget.currentRequest === 0) findings.push("current_request_budget_missing");
  if (invalid.length === 0 && Number.isInteger(budget.contextWindow) && keys.reduce((sum, key) => sum + budget[key], 0) !== budget.contextWindow) findings.push("budget_sum_mismatch");
  if (Array.isArray(packet.answerAnchors)) {
    for (const anchor of packet.answerAnchors) {
      if (!anchor || typeof anchor.candidateId !== "string" || typeof anchor.admissionDecisionId !== "string") findings.push("answer_anchor_admission_link_missing");
    }
  }
  if (packet.schema !== "gpao_t3.task_packet.v1") return findings;
  const decisionById = new Map(decisions.map(decision => [decision.id, decision]));
  const stateLists = [
    ["answerAnchors", new Set(["answer_anchor"])],
    ["supportingContext", new Set(["supporting_context", "answer_anchor"])],
    ["conflictBoundaries", new Set(["conflict_boundary"])],
    ["blockedCells", new Set(["blocked"])],
    ["rejectedCells", new Set(["rejected", "review_needed"])]
  ];
  for (const [key, allowed] of stateLists) {
    if (!Array.isArray(packet[key])) { findings.push(`invalid_packet_list:${key}`); continue; }
    for (const reference of packet[key]) {
      if (!reference || typeof reference.candidateId !== "string" || typeof reference.admissionDecisionId !== "string") {
        findings.push(`invalid_packet_reference:${key}`);
        continue;
      }
      if (decisions.length) {
        const decision = decisionById.get(reference.admissionDecisionId);
        if (!decision || decision.candidateId !== reference.candidateId || !allowed.has(decision.state)) findings.push(`admission_state_mismatch:${key}`);
      }
    }
  }
  if (typeof packet.currentRequest !== "string" || !packet.currentRequest.trim()) findings.push("current_request_missing");
  if (!Array.isArray(packet.traceRefs) || packet.traceRefs.length === 0) findings.push("task_packet_trace_missing");
  return findings;
}

export function assertTaskPacket(packet, decisions = []) {
  const findings = taskPacketFindings(packet, decisions);
  if (findings.length > 0) {
    const error = new TypeError("invalid_mct_task_packet");
    error.code = "invalid_mct_task_packet";
    error.findings = findings;
    throw error;
  }
  return packet;
}

export function mctRecordFindings(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return ["record_not_object"];
  const findings = [];
  if (!Number.isInteger(record.createdAt) || !Number.isInteger(record.updatedAt) || record.updatedAt < record.createdAt) findings.push("invalid_record_timeline");
  if (record.expiresAt !== null && (!Number.isInteger(record.expiresAt) || record.expiresAt < record.createdAt)) findings.push("invalid_expiry_timeline");
  const requiresDurableA2 = record.lifecycle === "promoted" || record.schema === "gpao_t3.mutation_ledger.v1";
  if (requiresDurableA2 && (record.authority?.durablePromotion !== true || record.authority?.decisionClass !== "A2" || typeof record.authority?.decisionId !== "string" || !record.authority.decisionId)) findings.push("durable_a2_authority_required");
  if (record.schema === "gpao_t3.mutation_ledger.v1" && record.authorityDecisionId !== record.authority?.decisionId) findings.push("mutation_authority_trace_mismatch");
  if (record.lifecycle === "rejected" && record.expiresAt !== record.createdAt + REJECTED_CANDIDATE_RETENTION_MS) findings.push("rejected_candidate_retention_mismatch");
  return findings;
}

export function assertMctRecord(record) {
  const findings = mctRecordFindings(record);
  if (findings.length > 0) {
    const error = new TypeError("invalid_mct_record");
    error.code = "invalid_mct_record";
    error.findings = findings;
    throw error;
  }
  return record;
}

export function resolveMemoryApprovalScope({ requestedScope, explicit = false } = {}) {
  if (!requestedScope) return "session";
  if (!MEMORY_SCOPE_ORDER.includes(requestedScope)) throw new TypeError("unsupported memory scope");
  if (requestedScope === "user_global" && !explicit) return "session";
  return requestedScope;
}

export function classifyMctApproval(action) {
  const automatic = new Set(["retrieve", "admit", "read", "analyze", "local_draft", "safe_retry", "index_repair", "replay_prepare", "growth_candidate_capture"]);
  const notify = new Set(["memory_influenced", "automatic_recovery", "growth_candidate_created"]);
  if (automatic.has(action)) return "A0";
  if (notify.has(action)) return "A1";
  return "A2";
}
