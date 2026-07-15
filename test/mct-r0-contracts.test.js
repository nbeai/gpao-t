import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import {
  MCT_CANONICAL_TYPES,
  MCT_SURFACE_EVENT_PAYLOADS,
  MCT_SURFACE_EVENT_TYPES,
  PROMPT_BUDGET_CONTRACT,
  REJECTED_CANDIDATE_RETENTION_MS,
  allocatePromptBudget,
  assertMctRecord,
  assertTaskPacket,
  classifyMctApproval,
  resolveMemoryApprovalScope
} from "../src/core/mct-contract.js";
import { canonicalDigest } from "../src/core/canonical-json.js";
import { createTaskPacket } from "../src/core/task-packet.js";
import { SURFACE_EVENT_TYPES, createSurfaceEvent } from "../src/core/surface-event.js";
import { createMctR0Corpus, MCT_R0_CORPUS_GENERATOR, MCT_R0_CORPUS_SEED } from "./fixtures/mct-r0-corpus.js";

const seal = JSON.parse(fs.readFileSync(new URL("./fixtures/mct-r0-seal.json", import.meta.url), "utf8"));
const schema = JSON.parse(fs.readFileSync(new URL("../src/schemas/mct-contract.v1.schema.json", import.meta.url), "utf8"));

test("R0 keeps the canonical MCT type vocabulary without parallel aliases", () => {
  assert.deepEqual(MCT_CANONICAL_TYPES, [
    "RawObservation", "MemoryRecord", "RetrievalHit", "TCellCandidate", "TCellCore",
    "AdmissionDecision", "TaskPacket", "ResponseInfluence", "OutcomeObservation",
    "GrowthProposal", "ReplayResult", "MutationLedger", "RollbackReceipt"
  ]);
  for (const forbidden of ["CanonicalMemoryRecord", "TaskContextPacket", "ResponseInfluenceLedger", "ReplayCase", "MutationRecord"]) assert.equal(MCT_CANONICAL_TYPES.includes(forbidden), false);
});

test("R0 extends the WP8-R SurfaceEvent v1 registry instead of replacing it", () => {
  const samples = {
    "memory.retrieved": { candidateIds: ["candidate-1"], sourceCount: 1 },
    "memory.admitted": { decisionIds: ["decision-1"], answerAnchorIds: [], supportingContextIds: ["candidate-1"] },
    "memory.rejected": { candidateId: "candidate-2", reasonCode: "scope_mismatch" },
    "memory.influenced": { responseDocumentId: "response-1", influenceIds: ["influence-1"] },
    "growth.proposed": { proposalId: "proposal-1", scope: "session", approvalState: "review_required" },
    "growth.replayed": { proposalId: "proposal-1", replayResultId: "replay-1", passed: true },
    "growth.applied": { mutationId: "mutation-1", scope: "session", expiresAt: 100, rollbackReceiptId: "rollback-1" },
    "growth.rolled_back": { mutationId: "mutation-1", rollbackReceiptId: "rollback-1", verified: true }
  };
  for (const type of MCT_SURFACE_EVENT_TYPES) {
    assert.equal(SURFACE_EVENT_TYPES.includes(type), true);
    assert.deepEqual(Object.keys(samples[type]), [...MCT_SURFACE_EVENT_PAYLOADS[type]]);
    const event = createSurfaceEvent({ turnId: "turn-1", sessionId: "session-1", sequence: 1, type, correlationId: "turn-1", payload: samples[type] });
    assert.equal(event.schema, "gpao_t3.surface_event.v1");
  }
  assert.throws(() => createSurfaceEvent({ turnId: "turn-1", sessionId: "session-1", sequence: 1, type: "memory.retrieved", correlationId: "turn-1", payload: { candidateIds: [] } }), error => error.code === "invalid_surface_event_payload");
  assert.throws(() => createSurfaceEvent({ turnId: "turn-1", sessionId: "session-1", sequence: 1, type: "memory.retrieved", correlationId: "turn-1", payload: { candidateIds: [], sourceCount: "1" } }), error => error.code === "invalid_surface_event_payload");
  assert.throws(() => createSurfaceEvent({ turnId: "turn-1", sessionId: "session-1", sequence: 1, type: "growth.replayed", correlationId: "turn-1", payload: { proposalId: "proposal-1", replayResultId: "replay-1", passed: "yes" } }), error => error.code === "invalid_surface_event_payload");
  assert.throws(() => createSurfaceEvent({ turnId: "turn-1", sessionId: "session-1", sequence: 1, type: "growth.proposed", correlationId: "turn-1", payload: { proposalId: "proposal-1", scope: "session", approvalState: "silently_applied" } }), error => error.code === "invalid_surface_event_payload");
});

test("prompt budget reserves the current request and output before memory", () => {
  const budget = allocatePromptBudget(128000);
  const allocated = Object.entries(budget).filter(([key]) => key !== "contextWindow").reduce((sum, [, value]) => sum + value, 0);
  assert.equal(allocated, budget.contextWindow);
  assert.equal(budget.memory, 12800);
  assert.equal(budget.output, 32000);
  assert.equal(PROMPT_BUDGET_CONTRACT.shrinkOrder[0], "memory.supporting_context");
  assert.ok(PROMPT_BUDGET_CONTRACT.invariants.includes("current_request_never_evicted_by_memory"));
  assert.throws(() => allocatePromptBudget(1024), /at least 2048/);
  const packet = createTaskPacket({ sessionId: "session-r0", input: "현재 요청을 보존한다", activeGoal: "R0 계약 검증", contextWindow: 4096, userId: "owner:r0" });
  assert.equal(assertTaskPacket(packet), packet);
  assert.throws(() => assertTaskPacket({ ...packet, budget: { ...packet.budget, memory: 99999 } }), error => error.code === "invalid_mct_task_packet" && error.findings.includes("budget_sum_mismatch"));
  assert.throws(() => assertTaskPacket({ ...packet, answerAnchors: ["candidate-1"] }), error => error.findings.includes("answer_anchor_admission_link_missing") && error.findings.includes("invalid_packet_reference:answerAnchors"));
});

test("ambiguous remember requests stay session scoped and risky actions require A2", () => {
  assert.equal(resolveMemoryApprovalScope({}), "session");
  assert.equal(resolveMemoryApprovalScope({ requestedScope: "user_global" }), "session");
  assert.equal(resolveMemoryApprovalScope({ requestedScope: "user_global", explicit: true }), "user_global");
  assert.equal(classifyMctApproval("retrieve"), "A0");
  assert.equal(classifyMctApproval("memory_influenced"), "A1");
  assert.equal(classifyMctApproval("external_send"), "A2");
});

test("sealed corpus, metrics, retention, and rejection gates are complete", () => {
  const corpus = createMctR0Corpus();
  assert.equal(corpus.length, seal.dataset.records);
  assert.equal(seal.dataset.seed, MCT_R0_CORPUS_SEED);
  assert.equal(seal.dataset.generator, MCT_R0_CORPUS_GENERATOR);
  assert.equal(canonicalDigest(seal.dataset.canonicalDigestDomain, corpus), seal.dataset.canonicalDigest);
  assert.equal(Object.values(seal.dataset.splits).reduce((sum, value) => sum + value, 0), seal.dataset.records);
  assert.equal(Object.values(seal.dataset.composition).reduce((sum, value) => sum + value, 0), 1);
  assert.equal(seal.referenceEnvironments.length, 2);
  assert.equal(seal.safetyFixtureExpectations.scopeLeakage, 0);
  assert.equal(seal.safetyFixtureExpectations.rollbackCompleteness, 1);
  assert.match(seal.absoluteMetricScope, /sealed fixtures/);
  assert.match(seal.retention.sourceDeletionRule, /fts_vector_ui_projection/);
  assert.ok(seal.rejectionConditions.includes("foreground_chat_blocks_on_index_rebuild_or_replay"));
});

test("canonical MCT schema compiles and validates separated object types", () => {
  const ajv = new Ajv2020({ strict: false });
  const validate = ajv.compile(schema);
  for (const type of MCT_CANONICAL_TYPES) assert.ok(schema.$defs[type], `missing schema definition: ${type}`);
  const record = {
    schema: "gpao_t3.memory_record.v1", version: 1, id: "memory-1",
    scope: { level: "session", turnId: null, sessionId: "session-1", projectId: null, userId: null },
    trace: { refs: ["message-1"], evidenceLevel: "user_confirmed" },
    authority: { allowedUse: "candidate_only", durablePromotion: false, decisionClass: "A0", decisionId: null },
    lifecycle: "candidate", createdAt: 1, updatedAt: 1, expiresAt: null,
    invalidConditions: ["user_correction"], content: "사용자는 짧은 승인을 선호한다.", recordKind: "preference"
  };
  assert.equal(validate(record), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...record, trace: { refs: [], evidenceLevel: "raw" } }), false);
  assert.equal(validate({ ...record, undeclared: true }), false);
  assert.equal(validate({ ...record, authority: { ...record.authority, durablePromotion: true, decisionClass: "A1", decisionId: "approval-1" } }), false);
  assert.equal(validate({ ...record, lifecycle: "rejected", expiresAt: null }), false);
  assert.equal(validate({ ...record, lifecycle: "promoted", authority: { ...record.authority, durablePromotion: false, decisionClass: "A0" } }), false);
  assert.equal(assertMctRecord(record), record);
  const rejected = { ...record, lifecycle: "rejected", expiresAt: record.createdAt + REJECTED_CANDIDATE_RETENTION_MS };
  assert.equal(assertMctRecord(rejected), rejected);
  assert.throws(() => assertMctRecord({ ...rejected, expiresAt: rejected.expiresAt + 1 }), error => error.findings.includes("rejected_candidate_retention_mismatch"));
  assert.throws(() => assertMctRecord({ ...record, lifecycle: "promoted" }), error => error.findings.includes("durable_a2_authority_required"));
  const mutation = {
    ...record,
    schema: "gpao_t3.mutation_ledger.v1",
    id: "mutation-1",
    scope: { level: "project", turnId: null, sessionId: null, projectId: "project-1", userId: null },
    authority: { allowedUse: "mutation_apply", durablePromotion: true, decisionClass: "A2", decisionId: "approval-1" },
    lifecycle: "promoted",
    proposalId: "proposal-1",
    mutationKind: "identity_policy",
    authorityDecisionId: "approval-1",
    rollbackReceiptId: "rollback-1",
    state: "stabilized"
  };
  delete mutation.content;
  delete mutation.recordKind;
  assert.equal(validate(mutation), true, JSON.stringify(validate.errors));
  assert.equal(assertMctRecord(mutation), mutation);
  assert.equal(validate({ ...mutation, authority: { allowedUse: "mutation_apply", durablePromotion: false, decisionClass: "A0", decisionId: null } }), false);
  assert.throws(() => assertMctRecord({ ...mutation, authorityDecisionId: "approval-other" }), error => error.findings.includes("mutation_authority_trace_mismatch"));
});
