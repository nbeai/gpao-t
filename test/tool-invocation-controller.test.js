import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NativeRuntime } from "../src/core/runtime.js";
import { ToolRegistry } from "../src/core/tool-registry.js";
import { RuntimeError } from "../src/core/errors.js";

async function stateDir() { return fs.mkdtemp(path.join(os.tmpdir(), "gpao-t3-tool-invocation-")); }

test("tool lifecycle executes reads automatically and persists receipts across restart", async () => {
  const root = await stateDir();
  let runtime = await new NativeRuntime({ stateDir: root, workspaceRoots: { test: root } }).start();
  const invocation = await runtime.beginToolInvocation({ principalId: "owner:test", requestId: "status-1", toolId: "runtime.status", action: "status", args: {} });
  assert.equal(invocation.status, "succeeded");
  assert.equal(invocation.receipt.result.status, "ready");
  await runtime.stop();
  runtime = await new NativeRuntime({ stateDir: root, workspaceRoots: { test: root } }).start();
  try { assert.equal((await runtime.getToolInvocation({ principalId: "owner:test", invocationId: invocation.invocationId })).status, "succeeded"); }
  finally { await runtime.stop(); }
});

test("local writes require a separate approval and leave a durable rollback receipt", async () => {
  const root = await stateDir();
  const runtime = await new NativeRuntime({ stateDir: root, workspaceRoots: { test: root } }).start();
  try {
    const pending = await runtime.beginToolInvocation({ principalId: "owner:test", requestId: "write-1", toolId: "files.mutate", action: "write", args: { rootId: "test", path: "approved.txt", text: "approved" } });
    assert.equal(pending.status, "awaiting_approval");
    await assert.rejects(fs.stat(path.join(root, "approved.txt")));
    const completed = await runtime.approveToolInvocation({ principalId: "owner:test", invocationId: pending.invocationId, approvalId: "user-approved" });
    assert.equal(completed.status, "succeeded");
    assert.ok(completed.receipt.result.rollbackId);
    assert.equal(await fs.readFile(path.join(root, "approved.txt"), "utf8"), "approved");
  } finally { await runtime.stop(); }
});

test("a restart expires pending approval instead of executing stale arguments", async () => {
  const root = await stateDir();
  let runtime = await new NativeRuntime({ stateDir: root, workspaceRoots: { test: root } }).start();
  const pending = await runtime.beginToolInvocation({ principalId: "owner:test", requestId: "write-restart", toolId: "files.mutate", action: "write", args: { rootId: "test", path: "never.txt", text: "never" } });
  await runtime.stop();
  runtime = await new NativeRuntime({ stateDir: root, workspaceRoots: { test: root } }).start();
  try {
    const recovered = await runtime.getToolInvocation({ principalId: "owner:test", invocationId: pending.invocationId });
    assert.equal(recovered.status, "cancelled");
    assert.equal(recovered.reason, "approval_expired_on_runtime_restart");
    await assert.rejects(fs.stat(path.join(root, "never.txt")));
  } finally { await runtime.stop(); }
});

test("in-flight cancellation becomes durable unknown and tool failures include a repair action", async () => {
  const root = await stateDir();
  const registry = new ToolRegistry({ tools: [
    { id: "test.slow", capabilities: ["test"], operations: ["run"], effect: "local_write", approval: "explicit", timeoutMs: 5_000, execute: async () => new Promise(() => {}) },
    { id: "test.missing", capabilities: ["test"], operations: ["run"], effect: "read", execute: async () => { throw new RuntimeError("tool_dependency_missing", "필요한 구성 요소가 없습니다.", 503); } }
  ] });
  const runtime = await new NativeRuntime({ stateDir: root, toolRegistry: registry }).start();
  try {
    const pending = await runtime.beginToolInvocation({ principalId: "owner:test", requestId: "slow-1", toolId: "test.slow", action: "run", args: {} });
    const approval = runtime.approveToolInvocation({ principalId: "owner:test", invocationId: pending.invocationId, approvalId: "approved" });
    await new Promise(resolve => setTimeout(resolve, 10));
    const cancelled = await runtime.cancelToolInvocation({ principalId: "owner:test", invocationId: pending.invocationId });
    await approval;
    assert.equal(cancelled.status, "unknown");
    assert.equal((await runtime.getToolInvocation({ principalId: "owner:test", invocationId: pending.invocationId })).failure.repair.id, "reconcile_before_retry");
    const failed = await runtime.beginToolInvocation({ principalId: "owner:test", requestId: "missing-1", toolId: "test.missing", action: "run", args: {} });
    assert.equal(failed.status, "failed");
    assert.equal(failed.failure.repair.id, "repair_dependency");
  } finally { await runtime.stop(); }
});
