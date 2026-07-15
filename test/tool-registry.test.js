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
