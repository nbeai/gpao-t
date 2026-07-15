import crypto from "node:crypto";
import { RuntimeError } from "./errors.js";
import { assertMctRecord, MEMORY_SCOPE_ORDER, REJECTED_CANDIDATE_RETENTION_MS } from "./mct-contract.js";
import { canonicalDigest } from "./canonical-json.js";
import { SEALED_GROWTH_REPLAY_CASE_IDS, runSealedGrowthReplay } from "./growth-replay-registry.js";
import { applyGrowthPolicyChange, DEFAULT_GROWTH_ADMISSION_POLICY, validateGrowthPolicyChange } from "./growth-policy.js";

const MUTATION_TYPES = new Set(["update_admission_rule"]);
const MAX_CANARY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
function requiredText(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new RuntimeError(code, "성장 제안의 필수 설명이 비어 있습니다.", 400);
  return normalized;
}
function normalizeScope(scope, ownerId) {
  const level = scope?.level || "session";
  if (!MEMORY_SCOPE_ORDER.includes(level) || level === "turn") throw new RuntimeError("growth_scope_invalid", "성장 적용 범위가 올바르지 않습니다.", 400);
  return {
    level, turnId: null,
    sessionId: level === "session" ? requiredText(scope?.sessionId, "growth_scope_session_required") : null,
    projectId: level === "project" ? requiredText(scope?.projectId, "growth_scope_project_required") : null,
    userId: requiredText(ownerId, "growth_owner_required")
  };
}
function base({ schema, id: recordId, scope, traceRefs, authority, lifecycle, now, expiresAt = null, invalidConditions }) {
  return {
    schema, version: 1, id: recordId, scope,
    trace: { refs: [...new Set(traceRefs)], evidenceLevel: "user_confirmed" }, authority, lifecycle,
    createdAt: now, updatedAt: now, expiresAt, invalidConditions
  };
}
function observationKey(observation) { return String(observation?.failureClass || observation?.correctionClass || observation?.target || "").trim(); }

export function createGrowthProposal(input = {}) {
  const now = Number.isInteger(input.now) ? input.now : Date.now();
  const observations = Array.isArray(input.observations) ? input.observations.map((entry, index) => ({
    id: String(entry?.id || `observation_${index + 1}`), kind: entry?.kind === "user_correction" ? "user_correction" : "failure",
    signature: observationKey(entry), traceRef: requiredText(entry?.traceRef, "growth_observation_trace_required"),
    occurredAt: Number.isInteger(entry?.occurredAt) ? entry.occurredAt : now
  })) : [];
  const uniqueIds = new Set(observations.map(entry => entry.id));
  const uniqueTraces = new Set(observations.map(entry => entry.traceRef));
  const signatures = new Set(observations.map(entry => entry.signature).filter(Boolean));
  if (observations.length < 2 || uniqueIds.size !== observations.length || uniqueTraces.size !== observations.length || signatures.size !== 1) throw new RuntimeError("growth_recurrence_required", "같은 교정이나 실패가 서로 다른 근거에서 두 번 이상 확인되어야 성장 후보가 됩니다.", 409);
  if (!MUTATION_TYPES.has(input.mutationType)) throw new RuntimeError("growth_mutation_type_invalid", "현재 안전하게 제한 적용할 수 없는 성장 변경 유형입니다.", 400);
  const proposedChange = validateGrowthPolicyChange(input.proposedChange || {});
  const scope = normalizeScope(input.scope, input.ownerId);
  const replayCaseIds = [...SEALED_GROWTH_REPLAY_CASE_IDS.evaluation];
  const record = assertMctRecord({
    ...base({ schema: "gpao_t3.growth_proposal.v1", id: input.id || id("growth"), scope, traceRefs: observations.map(entry => entry.traceRef), authority: { allowedUse: "mutation_proposal", durablePromotion: false, decisionClass: "A0", decisionId: null }, lifecycle: "candidate", now, invalidConditions: ["source_correction_retracted", "replay_regression", "authority_rejected"] }),
    diagnosis: requiredText(input.diagnosis, "growth_diagnosis_required"), targetScope: scope,
    status: "review_required", replayCaseIds
  });
  return { record, detail: { observedOutcome: input.observedOutcome ? String(input.observedOutcome) : observations[0].signature, target: requiredText(input.target, "growth_target_required"), mutationType: input.mutationType, proposedChange, observations, recurrenceCount: observations.length } };
}

export function evaluateGrowthReplay({ proposal, detail, datasetSplit = "evaluation", baselinePolicy = DEFAULT_GROWTH_ADMISSION_POLICY, now = Date.now() } = {}) {
  if (proposal?.schema !== "gpao_t3.growth_proposal.v1" || !detail) throw new RuntimeError("growth_proposal_invalid", "검증할 성장 제안이 올바르지 않습니다.", 400);
  now = Math.max(now, proposal.createdAt);
  const evaluation = runSealedGrowthReplay({ proposal, detail, datasetSplit, baselinePolicy });
  const record = assertMctRecord({
    ...base({ schema: "gpao_t3.replay_result.v1", id: id("replay"), scope: proposal.scope, traceRefs: proposal.trace.refs, authority: { allowedUse: "replay_only", durablePromotion: false, decisionClass: "A0", decisionId: null }, lifecycle: "reviewed", now, invalidConditions: ["fixture_digest_changed", "proposal_changed"] }),
    kind: "comparative", proposalId: proposal.id, datasetSplit, passed: evaluation.passed,
    metrics: evaluation.metrics
  });
  return { record, detail: evaluation };
}

export function approveGrowthProposal(bundle, authority = {}, now = Date.now()) {
  const proposal = bundle?.record;
  if (proposal?.status !== "review_required") throw new RuntimeError("growth_review_unavailable", "검토할 수 있는 성장 후보가 아닙니다.", 409);
  now = Math.max(now, proposal.createdAt);
  if (authority.approved !== true) return { record: assertMctRecord({ ...proposal, lifecycle: "rejected", status: "rejected", updatedAt: now, expiresAt: proposal.createdAt + REJECTED_CANDIDATE_RETENTION_MS }), detail: bundle.detail };
  if (authority.decisionClass !== "A2" || authority.principalId !== proposal.scope.userId) throw new RuntimeError("growth_a2_required", "자가성장 적용에는 범위가 결합된 명시적 A2 승인이 필요합니다.", 403);
  const decisionId = `growth_a2_${crypto.createHash("sha256").update(`${proposal.id}\0${authority.principalId}\0${JSON.stringify(proposal.scope)}\0${now}`).digest("hex")}`;
  return { record: assertMctRecord({ ...proposal, authority: { allowedUse: "mutation_apply", durablePromotion: true, decisionClass: "A2", decisionId }, lifecycle: "reviewed", status: "approved", updatedAt: now }), detail: bundle.detail };
}

export function createCanaryMutation({ proposalBundle, replayBundle, ttlMs = 24 * 60 * 60 * 1000, snapshotDigest, snapshotPolicy, now = Date.now() } = {}) {
  const proposal = proposalBundle?.record;
  const replay = replayBundle?.record;
  const replayDetail = replayBundle?.detail;
  now = Math.max(now, proposal?.createdAt || 0, replay?.createdAt || 0);
  if (proposal?.status !== "approved" || proposal?.authority?.decisionClass !== "A2") throw new RuntimeError("growth_approval_required", "승인된 성장 제안만 제한 적용할 수 있습니다.", 409);
  if (replay?.proposalId !== proposal.id || replay?.passed !== true || replay?.datasetSplit !== "evaluation" || replayDetail?.sealed !== true || replayDetail?.fixtureDigest !== canonicalDigest("gpao_t3.sealed_growth_replay.v1", replayDetail.cases) || replay.metrics.regressionCount !== 0 || replay.metrics.recurrenceDelta >= 0) throw new RuntimeError("growth_replay_required", "서버가 봉인한 회귀 없는 replay 검증이 먼저 필요합니다.", 409);
  if (!/^sha256:[a-f0-9]{64}$/.test(String(snapshotDigest || ""))) throw new RuntimeError("growth_snapshot_required", "제한 적용 전 정책 snapshot이 필요합니다.", 409);
  if (canonicalDigest("gpao_t3.growth_policy_snapshot.v1", snapshotPolicy) !== snapshotDigest) throw new RuntimeError("growth_snapshot_required", "제한 적용 전 정책 snapshot이 일치하지 않습니다.", 409);
  if (replayDetail.baselineDigest !== snapshotDigest || canonicalDigest("gpao_t3.growth_policy_snapshot.v1", replayDetail.baselinePolicy) !== snapshotDigest) throw new RuntimeError("growth_replay_baseline_changed", "replay 이후 활성 성장 정책이 바뀌어 다시 검증해야 합니다.", 409);
  const boundedTtl = Math.min(Math.max(1, Number(ttlMs) || 0), MAX_CANARY_TTL_MS);
  const rollbackReceiptId = id("rollback");
  const mutationId = id("mutation");
  const mutation = assertMctRecord({
    ...base({ schema: "gpao_t3.mutation_ledger.v1", id: mutationId, scope: proposal.scope, traceRefs: [...proposal.trace.refs, replay.id], authority: proposal.authority, lifecycle: "promoted", now, expiresAt: now + boundedTtl, invalidConditions: ["canary_expired", "replay_regression", "user_rollback"] }),
    proposalId: proposal.id, mutationKind: "scoped_influence", authorityDecisionId: proposal.authority.decisionId,
    rollbackReceiptId, state: "canary"
  });
  const rollbackReceipt = assertMctRecord({
    ...base({ schema: "gpao_t3.rollback_receipt.v1", id: rollbackReceiptId, scope: proposal.scope, traceRefs: [mutationId], authority: { allowedUse: "rollback", durablePromotion: true, decisionClass: "A2", decisionId: proposal.authority.decisionId }, lifecycle: "reviewed", now, invalidConditions: ["snapshot_mismatch", "projection_not_purged"] }),
    mutationId, snapshotDigest, projectionPurge: false, verified: false
  });
  return {
    mutation: { record: mutation, detail: { replayResultId: replay.id, mutationType: proposalBundle.detail.mutationType, proposedChange: proposalBundle.detail.proposedChange, recurrenceBefore: proposalBundle.detail.recurrenceCount, recurrenceAfter: replay.metrics.recurrenceAfter, falseAnchorDelta: replay.metrics.wrongAnchorDelta } },
    rollbackReceipt: { record: rollbackReceipt, detail: { snapshotPolicy: structuredClone(snapshotPolicy), reason: null, requestedAt: null, verifiedAt: null, postRollbackReplay: false } }
  };
}

export function requestCanaryRollback(mutationBundle, receiptBundle, reason, now = Date.now()) {
  if (mutationBundle?.record?.rollbackReceiptId !== receiptBundle?.record?.id) throw new RuntimeError("growth_rollback_unavailable", "복구 준비 기록을 찾을 수 없습니다.", 409);
  if (mutationBundle.record.state === "rolled_back") return { mutation: mutationBundle, rollbackReceipt: receiptBundle, changed: false };
  now = Math.max(now, mutationBundle.record.createdAt, receiptBundle.record.createdAt);
  return {
    mutation: { record: assertMctRecord({ ...mutationBundle.record, state: "rolled_back", lifecycle: "rolled_back", updatedAt: now }), detail: { ...mutationBundle.detail } },
    rollbackReceipt: { record: { ...receiptBundle.record, updatedAt: now }, detail: { ...receiptBundle.detail, reason: requiredText(reason, "growth_rollback_reason_required"), requestedAt: now } },
    changed: true
  };
}

export function verifyCanaryRollback(receiptBundle, { projectionPurge, snapshotRestored, postRollbackReplay }, now = Date.now()) {
  now = Math.max(now, receiptBundle.record.createdAt);
  const verified = projectionPurge === true && snapshotRestored === true && postRollbackReplay === true;
  return {
    record: assertMctRecord({ ...receiptBundle.record, lifecycle: verified ? "rolled_back" : "reviewed", projectionPurge: projectionPurge === true, verified, updatedAt: now }),
    detail: { ...receiptBundle.detail, verifiedAt: now, postRollbackReplay: postRollbackReplay === true, snapshotRestored: snapshotRestored === true }
  };
}

export function projectGrowthAdmissionPolicy(mutations = [], context = {}, now = Date.now()) {
  let policy = { ...DEFAULT_GROWTH_ADMISSION_POLICY };
  const mutationIds = [];
  const matchesScope = record => record.scope.userId === context.userId && (record.scope.level === "user_global" || (record.scope.level === "project" && record.scope.projectId === context.projectId) || (record.scope.level === "session" && record.scope.sessionId === context.sessionId));
  const orderedMutations = [...mutations].sort((left, right) => {
    const leftRecord = left.record || left;
    const rightRecord = right.record || right;
    return leftRecord.createdAt - rightRecord.createdAt || leftRecord.id.localeCompare(rightRecord.id);
  });
  for (const bundle of orderedMutations) {
    const record = bundle.record || bundle;
    const detail = bundle.detail || {};
    if (record.state !== "canary" || record.expiresAt <= now || detail.mutationType !== "update_admission_rule" || !matchesScope(record)) continue;
    policy = applyGrowthPolicyChange(policy, detail.proposedChange || {});
    mutationIds.push(record.id);
  }
  return { policy, mutationIds };
}

export const GROWTH_LIMITS = Object.freeze({ maxCanaryTtlMs: MAX_CANARY_TTL_MS, minimumReplayCases: 2 });
