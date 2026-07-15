import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { createTaskPacket } from "../src/core/task-packet.js";
import { admitTcellCandidates, composeAdmittedProviderInput } from "../src/core/tcell.js";
import { StateStore } from "../src/core/store.js";
import { NativeRuntime } from "../src/core/runtime.js";
import { boundedMemorySearch } from "../src/core/os-turn.js";
import { MCT_R2_CASES, MCT_R2_NOW } from "./fixtures/mct-r2-cases.js";

const schema = JSON.parse(fs.readFileSync(new URL("../src/schemas/mct-contract.v1.schema.json", import.meta.url), "utf8"));
const validate = new Ajv2020({ strict: false }).compile(schema);

function packet(request) {
  return createTaskPacket({ sessionId: "session-a", input: request, activeGoal: "현재 요청 우선", contextWindow: 4096, userId: "owner:a" });
}

async function eventually(predicate, timeout = 4_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await predicate();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("MCT-R2 turn timed out");
}

test("MCT-R2 gives every candidate a schema-valid task-relative admission decision", () => {
  let correct = 0;
  let wrongAnchor = 0;
  for (const fixture of MCT_R2_CASES) {
    const result = admitTcellCandidates(packet(fixture.request), [fixture.candidate], { now: MCT_R2_NOW });
    const decision = result.decisions[0];
    assert.equal(decision.state, fixture.expected, fixture.id);
    assert.equal(validate(result.candidates[0]), true, `${fixture.id} candidate: ${JSON.stringify(validate.errors)}`);
    assert.equal(validate(decision), true, `${fixture.id} decision: ${JSON.stringify(validate.errors)}`);
    assert.equal(validate(result.taskPacket), true, `${fixture.id} packet: ${JSON.stringify(validate.errors)}`);
    if (decision.state === fixture.expected) correct += 1;
    if (decision.state === "answer_anchor" && fixture.expected !== "answer_anchor") wrongAnchor += 1;
  }
  assert.equal(correct / MCT_R2_CASES.length, 1);
  assert.equal(wrongAnchor, 0);
});

test("MCT-R2 prompt contains only admitted context and ends with the current request", () => {
  const request = "승인을 자동으로 요청하지 마";
  const candidates = [
    { ...MCT_R2_CASES[0].candidate, id: "safe-anchor", text: "위험한 삭제는 실행 전에 확인한다", traceRef: "trace-safe" },
    { ...MCT_R2_CASES[2].candidate, id: "conflict", traceRef: "trace-conflict" }
  ];
  const admission = admitTcellCandidates(packet(request), candidates, { now: MCT_R2_NOW });
  const input = composeAdmittedProviderInput({ currentRequest: request, providerInput: request, admission });
  assert.match(input, /위험한 삭제는 실행 전에 확인한다/);
  assert.doesNotMatch(input, /승인을 자동으로 요청한다/);
  assert.ok(input.endsWith(request));
  assert.equal(admission.taskPacket.conflictBoundaries.length, 1);
  assert.equal(admission.taskPacket.answerAnchors.length, 1);
});

test("MCT-R2 relation projection keeps only the newest contradiction-group member anchorable", () => {
  const request = "대화 승인 원칙을 알려줘";
  const base = MCT_R2_CASES[0].candidate;
  const admission = admitTcellCandidates(packet(request), [
    { ...base, id: "old-rule", traceRef: "trace-old", text: "대화마다 승인을 요청한다", contradictionGroup: "approval-policy", updatedAt: MCT_R2_NOW - 10_000 },
    { ...base, id: "new-rule", traceRef: "trace-new", text: "위험한 작업에만 승인을 요청한다", contradictionGroup: "approval-policy", updatedAt: MCT_R2_NOW - 1_000 }
  ], { now: MCT_R2_NOW });
  const oldDecision = admission.decisions.find(item => item.sourceCandidateId === "old-rule");
  const newDecision = admission.decisions.find(item => item.sourceCandidateId === "new-rule");
  assert.equal(oldDecision.state, "conflict_boundary");
  assert.equal(admission.candidates.find(item => item.sourceCandidateId === "old-rule").relation.supersededBy, "new-rule");
  assert.equal(newDecision.state, "answer_anchor");
});

test("MCT-R2 resolves explicit supersession and policy conflicts before anchoring", () => {
  const base = MCT_R2_CASES[0].candidate;
  const supersession = admitTcellCandidates(packet("삭제 승인 원칙을 알려줘"), [
    { ...base, id: "old-explicit", text: "삭제 전에 승인을 요청한다", traceRef: "trace-old-explicit" },
    { ...base, id: "new-explicit", text: "위험한 삭제 전에만 승인을 요청한다", traceRef: "trace-new-explicit", supersedesMemoryId: "old-explicit" }
  ], { now: MCT_R2_NOW });
  assert.equal(supersession.decisions.find(item => item.sourceCandidateId === "old-explicit").state, "conflict_boundary");
  assert.equal(supersession.candidates.find(item => item.sourceCandidateId === "old-explicit").relation.supersededBy, "new-explicit");

  const policyConflict = admitTcellCandidates(packet("From now on ask before deleting"), [{
    ...base, id: "approval-bypass", text: "Delete automatically without asking", traceRef: "trace-bypass"
  }], { now: MCT_R2_NOW });
  assert.equal(policyConflict.decisions[0].state, "conflict_boundary");
});

test("MCT-R2 requires resolved live trace and honors invalidation even for approved influence", () => {
  const base = MCT_R2_CASES[0].candidate;
  const phantom = admitTcellCandidates(packet("승인 원칙을 알려줘"), [{ ...base, id: "phantom", traceRef: "nonexistent-source", sourceResolved: false }], { now: MCT_R2_NOW });
  assert.equal(phantom.decisions[0].state, "review_needed");
  assert.equal(phantom.decisions[0].reason, "trace_missing");

  const invalidated = admitTcellCandidates(packet("승인 원칙을 알려줘"), [{ ...base, id: "invalidated", invalidatedAt: MCT_R2_NOW - 1, sourceInvalidated: true }], { now: MCT_R2_NOW });
  assert.equal(invalidated.decisions[0].state, "review_needed");
  assert.equal(invalidated.decisions[0].reason, "trace_missing");

  const staleApproved = admitTcellCandidates(packet("승인 원칙을 알려줘"), [{
    ...base,
    id: "stale-approved",
    approvedInfluence: true,
    createdAt: MCT_R2_NOW - 400 * 24 * 60 * 60 * 1000,
    updatedAt: MCT_R2_NOW - 400 * 24 * 60 * 60 * 1000,
    authority: { allowedUse: "answer_anchor", durablePromotion: true, decisionClass: "A2", decisionId: "decision-stale" }
  }], { now: MCT_R2_NOW });
  assert.equal(staleApproved.decisions[0].state, "review_needed");
  assert.equal(staleApproved.decisions[0].reason, "stale");
});

test("MCT-R2 canonical authority cap cannot be laundered into an answer anchor", () => {
  const base = MCT_R2_CASES[0].candidate;
  const admission = admitTcellCandidates(packet("승인 원칙을 알려줘"), [{
    ...base,
    id: "authority-cap",
    approvedInfluence: true,
    allowedUse: "answer_anchor",
    authority: { allowedUse: "supporting_context", durablePromotion: false, decisionClass: "A0", decisionId: null }
  }], { now: MCT_R2_NOW });
  assert.equal(admission.decisions[0].state, "supporting_context");
  assert.equal(admission.taskPacket.answerAnchors.length, 0);
});

test("MCT-R2 memory pressure cannot evict the current request or minimum output", () => {
  const request = "현재 요청은 반드시 보존한다";
  const smallPacket = createTaskPacket({ sessionId: "session-a", input: request, contextWindow: 2048, userId: "owner:a" });
  const huge = { ...MCT_R2_CASES[0].candidate, id: "huge-anchor", traceRef: "trace-huge", text: "긴기억 ".repeat(2_000) };
  const admission = admitTcellCandidates(smallPacket, [huge], { now: MCT_R2_NOW });
  assert.equal(admission.decisions[0].state, "review_needed");
  assert.equal(admission.decisions[0].reason, "budget_exceeded");
  assert.equal(admission.taskPacket.answerAnchors.length, 0);
  assert.equal(admission.taskPacket.currentRequest, request);
  assert.ok(admission.taskPacket.budget.currentRequest > 0);
  assert.ok(admission.taskPacket.budget.output > 0);
  assert.ok(composeAdmittedProviderInput({ currentRequest: request, providerInput: request, admission }).endsWith(request));
});

test("MCT-R2 SQLite scope projection blocks cross-session, project, user, and channel leakage", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-mct-r2-scope-"));
  try {
    const store = new StateStore(dir);
    store.transaction(() => {
      store.addMemoryCandidate({ id: "session-a", text: "범위검증 세션A", source: "scope", traceRef: "trace-a", sessionId: "session-a", userId: "owner:a" });
      store.addMemoryCandidate({ id: "project-a", text: "범위검증 프로젝트A", source: "scope", traceRef: "trace-p", scopeLevel: "project", projectId: "project-a", userId: "owner:a" });
      store.addMemoryCandidate({ id: "user-a", text: "범위검증 사용자A", source: "scope", traceRef: "trace-u", scopeLevel: "user_global", userId: "owner:a" });
      store.addMemoryCandidate({ id: "channel-a", text: "범위검증 채널A", source: "scope", traceRef: "trace-c", sessionId: "session-a", userId: "owner:a", channelId: "telegram:a" });
      store.addMemoryCandidate({ id: "same-session-owner-b", text: "범위검증 타사용자", source: "scope", traceRef: "trace-b", sessionId: "session-a", userId: "owner:b" });
      store.addMemoryCandidate({ id: "same-project-owner-b", text: "범위검증 타프로젝트사용자", source: "scope", traceRef: "trace-pb", scopeLevel: "project", projectId: "project-a", userId: "owner:b" });
    });
    const allowed = store.searchMemory("범위검증", { sessionId: "session-a", projectId: "project-a", userId: "owner:a", channelId: "telegram:a" }).results.map(item => item.id);
    assert.deepEqual(new Set(allowed), new Set(["session-a", "project-a", "user-a", "channel-a"]));
    const isolated = store.searchMemory("범위검증", { sessionId: "session-b", projectId: "project-b", userId: "owner:b", channelId: "telegram:b" }).results;
    assert.deepEqual(isolated, []);
    assert.deepEqual(new Set(store.listMemory({ sessionId: "session-a", userId: "owner:a", channelId: "telegram:a" }).entries.map(item => item.id)), new Set(["session-a", "channel-a"]));
    assert.equal(store.listMemory({ sessionId: "session-a", userId: "owner:b", channelId: "telegram:a" }).entries.some(item => item.id === "session-a"), false);
    store.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("MCT-R2 actual provider input and output reserve fit the selected context window", () => {
  const request = "현재 요청을 우선한다";
  const taskPacket = createTaskPacket({ sessionId: "session-a", input: request, contextWindow: 2048, userId: "owner:a" });
  const admission = admitTcellCandidates(taskPacket, [MCT_R2_CASES[0].candidate], { now: MCT_R2_NOW });
  const input = composeAdmittedProviderInput({ currentRequest: request, providerInput: `도구 결과 ${"상세 ".repeat(5_000)}`, admission });
  const estimatedInputTokens = Math.ceil(Buffer.byteLength(input, "utf8") / 4);
  assert.ok(estimatedInputTokens + taskPacket.budget.output + taskPacket.budget.reserve <= taskPacket.budget.contextWindow);
  assert.ok(input.endsWith(request));
});

test("MCT-R2 degrades admitted memory when request plus wrappers approach the model limit", () => {
  const request = `현재 요청 ${"보존 ".repeat(700)}`;
  const taskPacket = createTaskPacket({ sessionId: "session-a", input: request, contextWindow: 2048, userId: "owner:a" });
  const admission = admitTcellCandidates(taskPacket, [MCT_R2_CASES[0].candidate], { now: MCT_R2_NOW });
  const input = composeAdmittedProviderInput({ currentRequest: request, providerInput: request, admission });
  const total = Math.ceil(Buffer.byteLength(input, "utf8") / 4) + taskPacket.budget.output + taskPacket.budget.reserve;
  assert.ok(total <= taskPacket.budget.contextWindow, `provider context total ${total}`);
  assert.ok(input.endsWith(request));
});

test("MCT-R2 durable supersession invalidates the source and rolls back its approved influence", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-mct-r2-supersede-"));
  try {
    const store = new StateStore(dir);
    store.transaction(() => store.addMemoryCandidate({ id: "old", text: "삭제 전에 항상 승인한다", source: "owner", traceRef: "trace-old", sessionId: "session-a", userId: "owner:a" }));
    store.transaction(() => store.reviewMemory("old", "reviewed", { durablePromotion: true, decisionClass: "A2", principalId: "owner:a", scope: "session" }));
    const influence = store.transaction(() => store.promoteMemory("old", { replayPassed: true }));
    assert.equal(influence.sourceResolved, true);
    store.transaction(() => store.addMemoryCandidate({ id: "new", text: "위험한 삭제 전에 승인한다", source: "owner", traceRef: "trace-new", sessionId: "session-a", userId: "owner:a", supersedesMemoryId: "old" }));
    assert.equal(store.getMemoryRecord("old").invalidatedAt > 0, true);
    assert.equal(store.listContextInfluences().find(item => item.id === influence.id).state, "rolled_back");
    assert.equal(store.searchMemory("항상 승인", { sessionId: "session-a", userId: "owner:a" }).results.some(item => item.id === "old"), false);
    assert.throws(() => store.transaction(() => store.addMemoryCandidate({ id: "cross-scope", text: "다른 대화에서 교체 시도", source: "owner", traceRef: "trace-cross", sessionId: "session-b", userId: "owner:a", supersedesMemoryId: "new" })), error => error.code === "memory_supersession_scope_mismatch");
    store.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("MCT-R2 generic review cannot manufacture durable A2 promotion authority", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-mct-r2-authority-"));
  try {
    const store = new StateStore(dir);
    store.transaction(() => store.addMemoryCandidate({ id: "generic-review", text: "검토와 승격은 다르다", source: "owner", traceRef: "trace-review", sessionId: "session-a", userId: "owner:a" }));
    const reviewed = store.transaction(() => store.reviewMemory("generic-review", "reviewed", { principalId: "owner:a", durablePromotion: false, decisionClass: "A0" }));
    assert.equal(reviewed.authorityDecisionId, null);
    assert.throws(() => store.transaction(() => store.promoteMemory("generic-review", { replayPassed: true })), error => error.code === "memory_promotion_blocked");
    assert.throws(() => store.transaction(() => store.reviewMemory("generic-review", "rejected", { principalId: "owner:b", durablePromotion: false, decisionClass: "A0" })), error => error.code === "memory_review_forbidden");
    store.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("MCT-R2 hard retrieval deadline degrades to no-memory without blocking the conversation", async () => {
  const started = performance.now();
  const result = await boundedMemorySearch(signal => new Promise(resolve => {
    const timer = setTimeout(() => resolve({ results: [{ id: "late" }] }), 100);
    signal.addEventListener("abort", () => { clearTimeout(timer); resolve({ results: [] }); }, { once: true });
  }), 20);
  const elapsed = performance.now() - started;
  assert.equal(result.degraded, "hard_deadline_exceeded");
  assert.deepEqual(result.results, []);
  assert.ok(elapsed < 80, `deadline elapsed ${elapsed}ms`);
});

test("MCT-R2 repeated non-cooperative retrieval timeouts stay bounded without one global blocker", async () => {
  let started = 0;
  const resolvers = [];
  const slow = () => new Promise(resolve => {
    started += 1;
    resolvers.push(resolve);
  });
  const results = await Promise.all(Array.from({ length: 20 }, () => boundedMemorySearch(slow, 10)));
  assert.equal(started, 4);
  assert.equal(results.filter(result => result.degraded === "hard_deadline_exceeded").length, 4);
  assert.equal(results.filter(result => result.degraded === "search_backpressure").length, 16);
  const recovered = await boundedMemorySearch(() => Promise.resolve({ results: [], degraded: null }), 10);
  assert.equal(recovered.degraded, null);
  resolvers.forEach(resolve => resolve({ results: [] }));
});

test("MCT-R2 admission ledger survives restart without projection drift", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-mct-r2-ledger-"));
  try {
    const admission = admitTcellCandidates(packet(MCT_R2_CASES[0].request), [MCT_R2_CASES[0].candidate], { now: MCT_R2_NOW });
    let store = new StateStore(dir);
    const receipt = store.transaction(() => store.saveMctAdmissionBundle(admission));
    assert.equal(receipt.persisted, true);
    store.close();
    store = new StateStore(dir);
    const restored = store.getMctAdmissionBundle(admission.taskPacket.id);
    assert.deepEqual(restored.taskPacket, admission.taskPacket);
    assert.deepEqual(restored.candidates, admission.candidates);
    assert.deepEqual(restored.decisions, admission.decisions);
    assert.equal(store.identitySnapshot().schemaVersion, 13);
    store.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("MCT-R2 emits durable retrieval, admission, influence and canonical response ledgers", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-mct-r2-events-"));
  const runtime = await new NativeRuntime({ stateDir: dir }).start();
  try {
    const memory = await runtime.addMemoryObservation({ text: "사용자는 매끄러운 대화 흐름을 중요하게 생각한다", source: "owner_note", traceRef: "owner-note-r2", sessionId: "session-a", userId: "owner:a", reviewed: false });
    await runtime.reviewMemory(memory.id, "reviewed", { durablePromotion: true, decisionClass: "A2", principalId: "owner:a", scope: "session" });
    const accepted = await runtime.startOsTurnV2({ principalId: "owner:a", sessionId: "session-a", requestId: "mct-r2-events", input: "매끄러운 대화 흐름 원칙을 알려줘" });
    const completed = await eventually(async () => { const status = await runtime.getOsTurnV2("owner:a", accepted.turnId); return status?.terminal ? status : null; });
    assert.equal(completed.status, "completed");
    const replay = await runtime.replayOsTurnV2("owner:a", accepted.turnId);
    const types = replay.events.map(event => event.type);
    assert.ok(types.indexOf("memory.retrieved") < types.indexOf("memory.admitted"));
    assert.ok(types.indexOf("memory.admitted") < types.indexOf("memory.influenced"));
    assert.ok(types.indexOf("memory.influenced") < types.indexOf("text.complete"));
    const influenceEvent = replay.events.find(event => event.type === "memory.influenced");
    const influences = await runtime.listMctResponseInfluences(influenceEvent.payload.responseDocumentId);
    assert.equal(influences.length, influenceEvent.payload.influenceIds.length);
    assert.equal(validate(influences[0]), true, JSON.stringify(validate.errors));
    const admissionEvent = replay.events.find(event => event.type === "memory.admitted");
    const taskPacketId = runtime.osTurnV2Jobs.get(accepted.turnId).result.taskPacket.id;
    const bundle = await runtime.getMctAdmission(taskPacketId);
    assert.ok(admissionEvent.payload.decisionIds.length > 0);
    assert.equal(bundle.taskPacket.id, taskPacketId);
    assert.equal(bundle.decisions.length, admissionEvent.payload.decisionIds.length);
  } finally {
    await runtime.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
