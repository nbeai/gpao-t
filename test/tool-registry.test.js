import assert from "node:assert/strict";
import test from "node:test";
import { createToolCall, createToolPermit } from "../src/core/tool-permit.js";
import { ToolRegistry } from "../src/core/tool-registry.js";

const secret = "test-permit-secret";

function approvedInvocation({ registry, toolId = "external.example", args = { query: "status" } } = {}) {
  const call = createToolCall({ taskPacketId: "task_1", commandId: "command_1", principalId: "user_1", generation: 1, toolId, action: "run", args, idempotencyKey: "idempotency_1" });
  const permit = createToolPermit(secret, call, { effect: registry.describe(toolId).effect, approvalId: "approval_1" });
  return { call, permit, args };
}

test("delivers an AbortSignal to a supported executor and returns its receipt", async () => {
  let receivedSignal;
  const registry = new ToolRegistry({ permitSecret: secret, tools: [{ id: "external.example", capabilities: ["lookup"], effect: "external_send", timeoutMs: 100, execute: async (_args, context) => {
    receivedSignal = context.signal;
    return { ok: true };
  } }] });
  const { call, permit, args } = approvedInvocation({ registry });

  const receipt = await registry.execute({ toolId: "external.example", call, permit, args });
  assert.equal(receipt.status, "succeeded");
  assert.ok(receivedSignal instanceof AbortSignal);
  assert.equal(receivedSignal.aborted, false);
});

test("times out an unresponsive executor, aborts its signal, and requires manual review", async () => {
  let receivedSignal;
  const registry = new ToolRegistry({ permitSecret: secret, tools: [{ id: "external.example", capabilities: ["lookup"], effect: "external_send", timeoutMs: 20, execute: async (_args, context) => {
    receivedSignal = context.signal;
    await new Promise(() => {});
  } }] });
  const { call, permit, args } = approvedInvocation({ registry });

  await assert.rejects(
    () => registry.execute({ toolId: "external.example", call, permit, args }),
    error => error.code === "tool_outcome_unknown" && error.status === 504 && error.details.reason === "deadline_exceeded" && error.details.retry === "manual_review_required"
  );
  assert.equal(receivedSignal.aborted, true);
});

test("redacts executor failures and never performs an automatic retry", async () => {
  let attempts = 0;
  const registry = new ToolRegistry({ permitSecret: secret, tools: [{ id: "external.example", capabilities: ["lookup"], effect: "external_send", execute: async () => {
    attempts += 1;
    throw new Error("token=super-secret-value");
  } }] });
  const { call, permit, args } = approvedInvocation({ registry });

  await assert.rejects(
    () => registry.execute({ toolId: "external.example", call, permit, args }),
    error => error.code === "tool_execution_failed" && error.message === "Tool execution failed" && error.details.retry === "manual_review_required" && !JSON.stringify(error).includes("super-secret-value")
  );
  assert.equal(attempts, 1);
});

test("idempotency is scoped to principal, tool, action, and arguments and remains bounded", async () => {
  let attempts = 0;
  const registry = new ToolRegistry({ permitSecret: secret, maxOutcomes: 2, tools: [{ id: "external.example", capabilities: ["lookup"], operations: ["run", "inspect"], effect: "external_send", execute: async args => ({ attempt: ++attempts, value: args.value }) }] });
  const invoke = async ({ principalId, action, value, key }) => {
    const args = { value };
    const call = createToolCall({ taskPacketId: `task_${principalId}_${action}`, commandId: `command_${principalId}_${action}`, principalId, generation: 1, toolId: "external.example", action, args, idempotencyKey: key });
    const permit = createToolPermit(secret, call, { effect: "external_send", approvalId: "approved" });
    return registry.execute({ toolId: "external.example", call, permit, args });
  };
  const first = await invoke({ principalId: "one", action: "run", value: 1, key: "shared" });
  const second = await invoke({ principalId: "two", action: "run", value: 1, key: "shared" });
  const third = await invoke({ principalId: "two", action: "inspect", value: 1, key: "shared" });
  assert.deepEqual([first.result.attempt, second.result.attempt, third.result.attempt], [1, 2, 3]);
  assert.equal(registry.outcomes.size, 2);
});

test("secret-shaped tool input and output are blocked before they can escape", async () => {
  let ran = false;
  const registry = new ToolRegistry({ permitSecret: secret, tools: [{ id: "external.example", capabilities: ["lookup"], effect: "external_send", execute: async () => { ran = true; return { text: "Bearer abcdefghijklmnopqrstuvwxyz" }; } }] });
  const input = approvedInvocation({ registry, args: { text: "sk-abcdefghijklmnop" } });
  await assert.rejects(() => registry.execute({ toolId: "external.example", ...input }), error => error.code === "secret_in_capability_payload");
  assert.equal(ran, false);
  const output = approvedInvocation({ registry, args: { query: "safe" } });
  await assert.rejects(() => registry.execute({ toolId: "external.example", ...output }), error => error.code === "secret_in_capability_payload" && !JSON.stringify(error).includes("abcdefghijklmnopqrstuvwxyz"));
});
