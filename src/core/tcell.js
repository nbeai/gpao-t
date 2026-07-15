import crypto from "node:crypto";
import { assertTaskPacket } from "./mct-contract.js";

const STATE_SHAPE = Object.freeze({
  not_activated: ["hold", "none", "normal"],
  activated_candidate: ["hold", "candidate", "normal"],
  supporting_context: ["allow", "support", "normal"],
  answer_anchor: ["allow", "anchor", "normal"],
  review_needed: ["hold", "candidate", "review"],
  conflict_boundary: ["hold", "support", "conflict"],
  blocked: ["deny", "none", "blocked"],
  rejected: ["deny", "none", "normal"]
});

const NEGATION = /(?:하지\s*마|하지\s*않|말아|금지|무시|사용하지|따르지|아니|없|never|\bnot\b|don't|do not|ignore|stop)/iu;
const CURRENT_OVERRIDE = /(?:이전|기존|과거|앞선).{0,20}(?:기억|맥락|지시|설정|원칙).{0,20}(?:무시|사용하지|따르지|폐기)|(?:ignore|discard).{0,20}(?:prior|previous).{0,20}(?:memory|context|instruction)/iu;
const APPROVAL_REQUIRED = /(?:승인|확인).{0,12}(?:요청|받|필요)|(?:ask|request|require).{0,12}(?:approval|permission|confirmation)|(?:before).{0,20}(?:delet|send|publish|execut)/iu;
const APPROVAL_BYPASS = /(?:승인|확인).{0,12}(?:없이|생략|묻지|요청하지)|(?:without|skip|bypass|do not ask|don't ask).{0,12}(?:approval|permission|confirmation)?/iu;
const TOKEN = /[\p{L}\p{N}_-]{2,}/gu;

function digest(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 24);
}

function tokens(value) {
  return [...new Set((String(value || "").normalize("NFC").toLowerCase().match(TOKEN) || []).map(token => token.replace(/(?:ing|ed|es|s)$/u, "")))];
}

function overlap(left, right) {
  const a = tokens(left);
  const b = new Set(tokens(right));
  if (!a.length) return 0;
  return a.filter(token => b.has(token)).length / a.length;
}

function estimatedTokens(value) {
  return Math.ceil(Buffer.byteLength(String(value || ""), "utf8") / 4);
}

function hardConflict(candidate, currentRequest) {
  if (candidate.hardConflict === true || CURRENT_OVERRIDE.test(currentRequest)) return true;
  const candidateText = candidate.text || candidate.summary || "";
  const approvalPolicyConflict = (APPROVAL_REQUIRED.test(candidateText) && APPROVAL_BYPASS.test(currentRequest)) || (APPROVAL_BYPASS.test(candidateText) && APPROVAL_REQUIRED.test(currentRequest));
  if (approvalPolicyConflict && overlap(candidateText, currentRequest) >= 0.1) return true;
  const polarityDiffers = NEGATION.test(candidateText) !== NEGATION.test(currentRequest);
  return polarityDiffers && NEGATION.test(currentRequest) && overlap(candidateText, currentRequest) >= 0.25;
}

function candidateScope(candidate, taskPacket) {
  if (candidate.scopeLevel === "user_global") return { level: "user_global", turnId: null, sessionId: null, projectId: null, userId: candidate.userId };
  if (candidate.scopeLevel === "project") return { level: "project", turnId: null, sessionId: null, projectId: candidate.projectId, userId: candidate.userId };
  if (!candidate.sessionId) return taskPacket.scope;
  return { level: "session", turnId: null, sessionId: candidate.sessionId, projectId: null, userId: candidate.userId };
}

function scopeAllowed(candidate, taskPacket) {
  const channelAllowed = !candidate.channelId || candidate.channelId === taskPacket.contextIdentity.channelId;
  if (!channelAllowed) return false;
  if (candidate.scopeLevel === "user_global") return Boolean(candidate.userId) && candidate.userId === taskPacket.contextIdentity.userId;
  if (candidate.scopeLevel === "project") return Boolean(candidate.projectId) && candidate.projectId === taskPacket.contextIdentity.projectId && candidate.userId === taskPacket.contextIdentity.userId;
  return (!candidate.sessionId || candidate.sessionId === taskPacket.sessionId) && candidate.userId === taskPacket.contextIdentity.userId;
}

function shapeCandidate(taskPacket, candidate, now, staleAfterMs) {
  const traceRef = candidate.traceRef || candidate.retrievalHit?.trace?.refs?.[0] || null;
  const createdAt = Number.isInteger(candidate.createdAt) ? candidate.createdAt : now;
  const approved = candidate.approvedInfluence === true && candidate.authority?.durablePromotion === true && candidate.authority?.decisionClass === "A2" && Boolean(candidate.authority?.decisionId);
  const reviewed = approved || candidate.reviewed === true;
  const lifecycle = approved ? "promoted" : (reviewed ? "reviewed" : "candidate");
  return {
    schema: "gpao_t3.tcell_candidate.v1",
    version: 1,
    id: `tcell_${digest(`${taskPacket.id}\0${candidate.id}`)}`,
    scope: candidateScope(candidate, taskPacket),
    trace: { refs: traceRef ? [traceRef] : [`missing_trace_${candidate.id}`], evidenceLevel: approved || reviewed ? "user_confirmed" : "session_trace" },
    authority: candidate.authority || { allowedUse: reviewed ? "supporting_context" : "candidate_only", durablePromotion: false, decisionClass: "A0", decisionId: null },
    lifecycle,
    createdAt,
    updatedAt: Number.isInteger(candidate.updatedAt) ? candidate.updatedAt : createdAt,
    expiresAt: null,
    invalidConditions: ["source_deleted", "scope_changed", "current_request_conflict"],
    pi: String(candidate.text || candidate.summary || candidate.source || candidate.id),
    x: [traceRef || `missing_trace_${candidate.id}`],
    radius: { scopeRefs: [candidate.sessionId || taskPacket.sessionId], constraints: ["current_request_priority", "session_scope", `stale_after_ms:${staleAfterMs}`] },
    replayCaseId: candidate.influenceId || `replay_pending_${candidate.id}`,
    sourceCandidateId: candidate.id,
    relation: { contradictionGroup: candidate.contradictionGroup || null, supersededBy: candidate.supersededBy || null },
    source: candidate
  };
}

function decide(taskPacket, cell, candidate, { relevanceThreshold, anchorThreshold, staleAfterMs, now }) {
  const score = Math.max(0, Math.min(1, Number(candidate.score || candidate.confidence || 0)));
  const conflict = hardConflict(candidate, taskPacket.currentRequest);
  const scope = scopeAllowed(candidate, taskPacket);
  const trace = candidate.sourceResolved === true && candidate.sourceInvalidated !== true && Boolean(candidate.traceRef || candidate.retrievalHit?.trace?.refs?.length);
  const sourceAuthority = candidate.authority || cell.authority;
  const authority = candidate.authorityDenied !== true && sourceAuthority?.decisionClass !== "denied";
  const allowedUse = sourceAuthority?.allowedUse || "candidate_only";
  const anchorAuthority = candidate.approvedInfluence === true && sourceAuthority?.durablePromotion === true && sourceAuthority?.decisionClass === "A2" && Boolean(sourceAuthority?.decisionId);
  const freshness = candidate.invalidatedAt == null && candidate.sourceInvalidated !== true && now - cell.updatedAt <= staleAfterMs;
  const checks = { currentRequest: !conflict, scope, trace, authority, conflict: !conflict, freshness };
  let state;
  let reasonCode;
  if (!scope) [state, reasonCode] = ["rejected", "scope_mismatch"];
  else if (score < relevanceThreshold) [state, reasonCode] = ["rejected", "relevance_below_threshold"];
  else if (!authority) [state, reasonCode] = ["blocked", "authority_denied"];
  else if (conflict) [state, reasonCode] = ["conflict_boundary", "conflict_detected"];
  else if (!trace) [state, reasonCode] = ["review_needed", "trace_missing"];
  else if (!freshness) [state, reasonCode] = ["review_needed", "stale"];
  else if (anchorAuthority && allowedUse === "answer_anchor" && score >= anchorThreshold) [state, reasonCode] = ["answer_anchor", "approved_replay_trace_within_radius"];
  else if (candidate.reviewed === true && ["supporting_context", "answer_anchor"].includes(allowedUse)) [state, reasonCode] = ["supporting_context", "reviewed_trace_relevant"];
  else [state, reasonCode] = ["review_needed", "review_required"];
  const [permission, role, risk] = STATE_SHAPE[state];
  const createdAt = now;
  return {
    schema: "gpao_t3.admission_decision.v1", version: 1,
    id: `decision_${digest(`${taskPacket.id}\0${cell.id}`)}`,
    scope: taskPacket.scope,
    trace: { refs: [...cell.trace.refs], evidenceLevel: cell.trace.evidenceLevel },
    authority: { allowedUse: state === "answer_anchor" ? "answer_anchor" : (state === "supporting_context" || state === "conflict_boundary" ? "supporting_context" : "candidate_only"), durablePromotion: false, decisionClass: "A0", decisionId: null },
    lifecycle: state === "rejected" ? "rejected" : "reviewed",
    createdAt, updatedAt: createdAt,
    expiresAt: state === "rejected" ? createdAt + 30 * 24 * 60 * 60 * 1000 : null,
    invalidConditions: ["current_request_changed", "source_changed", "authority_changed"],
    candidateId: cell.id,
    sourceCandidateId: candidate.id,
    taskPacketId: taskPacket.id,
    state, permission, role, risk, checks, reason: reasonCode,
    requiredEvidence: state === "review_needed" ? [reasonCode] : [],
    blockedBy: [!scope && "scope", !authority && "authority", conflict && "current_request_conflict", !trace && "trace", !freshness && "freshness"].filter(Boolean),
    traceRefs: [...cell.trace.refs],
    replayRefs: candidate.influenceId ? [candidate.influenceId] : [],
    score
  };
}

function ref(decision) {
  return { candidateId: decision.candidateId, admissionDecisionId: decision.id };
}

export function admitTcellCandidates(taskPacket, candidates, { maxAnchors = 3, maxSupporting = 6, relevanceThreshold = 0.15, anchorThreshold = relevanceThreshold, staleAfterMs = 365 * 24 * 60 * 60 * 1000, now = Date.now() } = {}) {
  const relationAware = candidates.map(candidate => ({ ...candidate }));
  const groups = new Map();
  for (const candidate of relationAware.filter(item => item.contradictionGroup)) {
    const group = groups.get(candidate.contradictionGroup) || [];
    group.push(candidate);
    groups.set(candidate.contradictionGroup, group);
  }
  for (const group of groups.values()) {
    group.sort((left, right) => (right.updatedAt || right.createdAt || 0) - (left.updatedAt || left.createdAt || 0) || left.id.localeCompare(right.id));
    for (const stale of group.slice(1)) { stale.hardConflict = true; stale.supersededBy = group[0].id; }
  }
  const byExplicitId = new Map(relationAware.map(candidate => [candidate.id, candidate]));
  for (const candidate of relationAware) {
    if (!candidate.supersedesMemoryId) continue;
    const superseded = byExplicitId.get(candidate.supersedesMemoryId);
    if (superseded) { superseded.hardConflict = true; superseded.supersededBy = candidate.id; }
  }
  const shaped = relationAware.map(candidate => shapeCandidate(taskPacket, candidate, now, staleAfterMs));
  const decisions = shaped.map((cell, index) => decide(taskPacket, cell, relationAware[index], { relevanceThreshold, anchorThreshold, staleAfterMs, now }));
  let anchorCount = 0;
  let supportCount = 0;
  for (const decision of decisions) {
    if (decision.state === "answer_anchor" && anchorCount++ >= maxAnchors) {
      decision.state = "supporting_context";
      [decision.permission, decision.role, decision.risk] = STATE_SHAPE.supporting_context;
      decision.authority.allowedUse = "supporting_context";
      decision.reason = "answer_anchor_capacity_degraded_to_support";
    }
    if (decision.state === "supporting_context" && supportCount++ >= maxSupporting) {
      decision.state = "review_needed";
      [decision.permission, decision.role, decision.risk] = STATE_SHAPE.review_needed;
      decision.authority.allowedUse = "candidate_only";
      decision.reason = "supporting_context_capacity_exceeded";
    }
  }
  let memoryTokens = 0;
  const providerBase = ["[현재 처리 입력]", "[현재 사용자 요청 - 최우선]", taskPacket.currentRequest].join("\n");
  const providerMemoryHeader = ["[GPAO-T3 승인된 맥락]", "아래 맥락은 현재 요청과 충돌하지 않는 범위에서만 사용하세요. 현재 사용자 요청이 항상 우선합니다."].join("\n");
  const maximumProviderInput = taskPacket.budget.contextWindow - taskPacket.budget.output - taskPacket.budget.reserve;
  const providerMemoryLimit = Math.max(0, maximumProviderInput - estimatedTokens(providerBase) - estimatedTokens(providerMemoryHeader));
  const effectiveMemoryLimit = Math.min(taskPacket.budget.memory, providerMemoryLimit);
  const budgetOrder = [
    ...decisions.filter(item => item.state === "answer_anchor"),
    ...decisions.filter(item => item.state === "supporting_context")
  ];
  const sourceById = new Map(relationAware.map(candidate => [candidate.id, candidate]));
  for (const decision of budgetOrder) {
    const source = sourceById.get(decision.sourceCandidateId);
    const label = decision.state === "answer_anchor" ? `[검증된 답변 기준 | ${decision.id}] ` : `[참고 맥락 | ${decision.id}] `;
    const cost = estimatedTokens(`${label}${source?.text || ""}\n`);
    if (memoryTokens + cost <= effectiveMemoryLimit) {
      memoryTokens += cost;
      continue;
    }
    decision.state = "review_needed";
    [decision.permission, decision.role, decision.risk] = STATE_SHAPE.review_needed;
    decision.authority.allowedUse = "candidate_only";
    decision.reason = "budget_exceeded";
    decision.requiredEvidence = ["larger_memory_budget_or_narrower_context"];
    decision.blockedBy = [...new Set([...decision.blockedBy, "prompt_budget"])];
  }
  const packet = {
    ...taskPacket,
    updatedAt: now,
    lifecycle: "reviewed",
    answerAnchors: decisions.filter(item => item.state === "answer_anchor").map(ref),
    supportingContext: decisions.filter(item => item.state === "supporting_context").map(ref),
    conflictBoundaries: decisions.filter(item => item.state === "conflict_boundary").map(ref),
    blockedCells: decisions.filter(item => item.state === "blocked").map(ref),
    rejectedCells: decisions.filter(item => ["rejected", "review_needed"].includes(item.state)).map(ref),
    traceRefs: [...new Set([...(taskPacket.traceRefs || []), ...decisions.flatMap(item => item.traceRefs)])],
    replayRefs: [...new Set(decisions.flatMap(item => item.replayRefs))],
    uncertaintyReport: decisions.filter(item => ["review_needed", "conflict_boundary", "blocked"].includes(item.state)).map(item => `${item.sourceCandidateId}:${item.reason}`)
  };
  assertTaskPacket(packet, decisions);
  const bySourceId = sourceById;
  const admitted = decisions.filter(item => ["answer_anchor", "supporting_context"].includes(item.state)).map(item => ({ ...bySourceId.get(item.sourceCandidateId), admission: item.state, admissionDecisionId: item.id, tcellCandidateId: item.candidateId, reason: item.reason }));
  const held = decisions.filter(item => !["answer_anchor", "supporting_context"].includes(item.state)).map(item => ({ ...bySourceId.get(item.sourceCandidateId), admission: item.state, admissionDecisionId: item.id, tcellCandidateId: item.candidateId, reason: item.reason }));
  return {
    schema: "gpao_t3.admission_batch.v1",
    taskPacketId: taskPacket.id,
    taskPacket: packet,
    candidates: shaped.map(({ source, ...cell }) => cell),
    decisions,
    admitted,
    held,
    blocked: decisions.some(item => item.state === "blocked"),
    durableMemoryPromotion: false,
    useState: packet.answerAnchors.length ? "answer_anchor" : (packet.supportingContext.length ? "supporting_context" : "activated_candidate"),
    trace: {
      candidateCount: candidates.length,
      admittedCount: admitted.length,
      answerAnchorCount: packet.answerAnchors.length,
      supportingContextCount: packet.supportingContext.length,
      conflictCount: packet.conflictBoundaries.length,
      blockedCount: packet.blockedCells.length,
      heldCount: held.length
    }
  };
}

function truncateToEstimatedTokens(value, maximum) {
  if (maximum <= 0) return "";
  const input = String(value || "");
  if (estimatedTokens(input) <= maximum) return input;
  let output = "";
  for (const character of input) {
    if (estimatedTokens(output + character) > maximum) break;
    output += character;
  }
  return output;
}

export function composeAdmittedProviderInput({ currentRequest, providerInput, admission } = {}) {
  const admittedById = new Map(admission.admitted.map(candidate => [candidate.tcellCandidateId, candidate]));
  const lines = [];
  for (const anchor of admission.taskPacket.answerAnchors) {
    const candidate = admittedById.get(anchor.candidateId);
    if (candidate) lines.push(`[검증된 답변 기준 | ${anchor.admissionDecisionId}] ${candidate.text}`);
  }
  for (const support of admission.taskPacket.supportingContext) {
    const candidate = admittedById.get(support.candidateId);
    if (candidate) lines.push(`[참고 맥락 | ${support.admissionDecisionId}] ${candidate.text}`);
  }
  const budget = admission.taskPacket.budget;
  const maximumInputTokens = budget.contextWindow - budget.output - budget.reserve;
  const request = String(currentRequest || "");
  if (estimatedTokens(request) > maximumInputTokens) {
    const error = new RangeError("current_request_exceeds_model_context");
    error.code = "current_request_exceeds_model_context";
    throw error;
  }
  const memorySection = lines.length ? [
    "[GPAO-T3 승인된 맥락]",
    "아래 맥락은 현재 요청과 충돌하지 않는 범위에서만 사용하세요. 현재 사용자 요청이 항상 우선합니다.",
    ...lines
  ].join("\n") : "";
  const requestSection = [
    "[현재 처리 입력]",
    "[현재 사용자 요청 - 최우선]",
    currentRequest
  ].join("\n");
  const fixedTokens = estimatedTokens([memorySection, requestSection].filter(Boolean).join("\n"));
  if (fixedTokens > maximumInputTokens) {
    const error = new RangeError("admitted_context_exceeds_model_context");
    error.code = "admitted_context_exceeds_model_context";
    throw error;
  }
  const detailLabel = "[도구 및 작업 세부]\n";
  const detailBudget = Math.max(0, maximumInputTokens - fixedTokens - estimatedTokens(detailLabel));
  const normalizedProviderInput = String(providerInput || "") === request ? "" : truncateToEstimatedTokens(providerInput, detailBudget);
  return [memorySection, normalizedProviderInput ? `${detailLabel}${normalizedProviderInput}` : "", requestSection].filter(Boolean).join("\n");
}

export function createReplayAndGrowthCandidate({ taskPacket, admission, outcome }) {
  const replay = { schema: "gpao_t3.replay_record.v1", taskPacketId: taskPacket.id, outcome: outcome.status, passed: outcome.status === "succeeded", checkedAt: Date.now(), sourceTrace: admission.trace };
  const growthCandidate = { schema: "gpao_t3.growth_candidate.v1", id: `growth_${taskPacket.id}`, reason: outcome.status === "succeeded" ? "observe_success_pattern" : "inspect_failure_pattern", risk: "review_required", replay, applyState: "candidate_only", rollback: "not_applied" };
  return { replay, growthCandidate };
}
