import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NativeRuntime } from "../src/core/runtime.js";
import { NativeOsTurnPipeline } from "../src/core/os-turn.js";
import { LocalHybridMemory } from "../src/core/local-memory.js";
import { createFoundationToolRegistry } from "../src/core/tool-registry.js";
import { createToolCall, createToolPermit } from "../src/core/tool-permit.js";

function stateDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-os-turn-")); }

test("one native OS turn preserves memory candidates, admission, receipt, replay, and review-only growth", async () => {
  const runtime = await new NativeRuntime({ stateDir: stateDir() }).start();
  const memory = new LocalHybridMemory();
  memory.ingest({ text: "윤님은 GPAO-T의 빠른 로컬 기억 검색을 중요하게 생각한다.", source: "owner_note", traceRef: "note-1", userId: "owner:a", reviewed: true });
  try {
  const result = await new NativeOsTurnPipeline({ runtime, memory }).run({ principalId: "owner:a", sessionId: "session-a", requestId: "os-turn-1", input: "빠른 로컬 기억 검색 원칙을 알려줘" });
    assert.equal(result.turn.status, "succeeded");
    assert.equal(result.replyMode, "provider_emulator");
    assert.equal(result.providerReceipt.schema, "gpao_t3.provider_receipt.v1");
    assert.equal(result.turn.receipt.result.kind, "provider_projected_result");
    assert.equal(result.turn.receipt.result.text, "GPAO-T3 deterministic provider response");
    assert.equal(result.turn.receipt.result.providerReceipt.schema, "gpao_t3.provider_receipt.v1");
    assert.equal(result.providerRoute.decision.schema, "gpao_t3.model_route_decision.v1");
    assert.equal(result.providerRoute.decision.selected.providerId, "local-model");
    assert.equal(result.providerRoute.decision.selected.modelId, "deterministic-echo");
    assert.equal(result.memory.results.length, 1);
    assert.equal(result.admission.admitted.length, 1);
    assert.equal(result.contextInfluence.state, "held");
    assert.equal(result.contextInfluence.reason, "a2_authority_required");
    assert.equal(result.contextInfluence.durableMemoryPromotion, false);
    assert.equal(result.growthCandidate.applyState, "candidate_only");
    assert.equal(result.taskPacket.authority.durablePromotion, false);
  } finally { await runtime.stop(); }
});

test("reviewed local context cannot become a durable influence without explicit A2 authority", async () => {
  const runtime = await new NativeRuntime({ stateDir: stateDir() }).start();
  const memory = new LocalHybridMemory();
  memory.ingest({ text: "승인된 영향 원칙은 승인된 영향만 다음 행동에 사용하며 다시 적용할 때도 A2 승인이 필요하다.", source: "owner_note", traceRef: "note-f5", userId: "owner:a", reviewed: true });
  const pipeline = new NativeOsTurnPipeline({ runtime, memory, contextInfluence: runtime.contextInfluence });
  try {
    const first = await pipeline.run({ principalId: "owner:a", sessionId: "session-a", requestId: "f5-1", input: "승인된 영향 원칙을 설명해줘" });
    assert.equal(first.contextInfluence.state, "held");
    assert.equal(first.contextInfluence.reason, "a2_authority_required");
    const second = await pipeline.run({ principalId: "owner:a", sessionId: "session-a", requestId: "f5-2", input: "승인된 영향 원칙을 다시 적용해줘" });
    assert.equal(second.approvedInfluences.length, 0);
    assert.equal(second.admission.admitted[0].admission, "supporting_context");
  } finally { await runtime.stop(); }
});

test("a pasted provider secret is rejected before task packet, provider, or memory handling", async () => {
  const memory = new LocalHybridMemory();
  const runtime = await new NativeRuntime({ stateDir: stateDir(), memory }).start();
  try {
    await assert.rejects(() => runtime.runOsTurn({ principalId: "owner:a", sessionId: "session-a", requestId: "secret-turn", input: "please use sk-1234567890abcdef" }), error => error.code === "secret_in_turn_payload");
    assert.equal(memory.entries.size, 0);
  } finally { await runtime.stop(); }
});

test("a successful turn becomes only a fast, review-only memory candidate for a later turn", async () => {
  const runtime = await new NativeRuntime({ stateDir: stateDir() }).start();
  const memory = new LocalHybridMemory();
  const pipeline = new NativeOsTurnPipeline({ runtime, memory });
  try {
    const first = await pipeline.run({ principalId: "owner:a", sessionId: "session-a", requestId: "memory-1", input: "GPAO-T는 빠른 로컬 기억 검색을 우선한다" });
    assert.equal(first.observation.accepted, true);
    const second = await pipeline.run({ principalId: "owner:a", sessionId: "session-a", requestId: "memory-2", input: "빠른 로컬 기억 검색 원칙을 다시 알려줘" });
    assert.equal(second.memory.results.length, 1);
    assert.equal(second.memory.results[0].admission, "search_support_candidate");
    assert.equal(second.admission.admitted.length, 0);
    assert.equal(second.admission.held.length, 1);
  } finally { await runtime.stop(); }
});

test("local recall is isolated between conversations by default", async () => {
  const runtime = await new NativeRuntime({ stateDir: stateDir() }).start();
  const memory = new LocalHybridMemory();
  const pipeline = new NativeOsTurnPipeline({ runtime, memory });
  try {
    await pipeline.run({ principalId: "owner:a", sessionId: "session-a", requestId: "isolation-1", input: "대화 A의 고유한 단어는 은하수다" });
    const other = await pipeline.run({ principalId: "owner:a", sessionId: "session-b", requestId: "isolation-2", input: "은하수라는 단어를 찾아줘" });
    assert.equal(other.memory.results.length, 0);
  } finally { await runtime.stop(); }
});

test("foundation tools remain authority-bound and read-only by default", async () => {
  const secret = "tool-permit-test-secret";
  const tools = createFoundationToolRegistry({ permitSecret: secret });
  const call = createToolCall({ taskPacketId: "task-1", commandId: "command-1", principalId: "owner:a", generation: 1, toolId: "local.runtime_status", action: "read", args: {}, idempotencyKey: "safe-read" });
  await assert.rejects(() => tools.execute({ toolId: "local.runtime_status", call, args: {}, permit: null }), error => error.code === "tool_review_required");
  const permit = createToolPermit(secret, call, { effect: "read" });
  const receipt = await tools.execute({ toolId: "local.runtime_status", call, args: {}, permit });
  assert.equal(receipt.effect, "read");
});

test("tool permits cannot be reused for another principal, action, or input", async () => {
  const secret = "tool-permit-binding-secret";
  const tools = createFoundationToolRegistry({ permitSecret: secret });
  const call = createToolCall({ taskPacketId: "task-1", commandId: "command-1", principalId: "owner:a", generation: 1, toolId: "local.runtime_status", action: "read", args: { scope: "one" }, idempotencyKey: "bound" });
  const permit = createToolPermit(secret, call, { effect: "read" });
  const altered = { ...call, principalId: "owner:b" };
  await assert.rejects(() => tools.execute({ toolId: "local.runtime_status", call: altered, args: { scope: "one" }, permit }), error => error.code === "tool_review_required");
  const wrongArgs = { ...call, argsDigest: "different" };
  await assert.rejects(() => tools.execute({ toolId: "local.runtime_status", call: wrongArgs, args: { scope: "two" }, permit }), error => error.code === "tool_review_required");
});
