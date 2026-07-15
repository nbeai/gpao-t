import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { RuntimeSocketRegistry, createFoundationSocketRegistry } from "../src/core/socket-registry.js";
import { ExecutionRouter } from "../src/core/execution-router.js";
import { NativeRuntime } from "../src/core/runtime.js";
import { RuntimeError } from "../src/core/errors.js";

function tempState() { return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-contract-")); }
async function eventually(predicate, timeout = 4_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await predicate();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("timed out waiting for state");
}

test("socket registry rejects underspecified sockets and exposes only declared metadata", () => {
  const registry = new RuntimeSocketRegistry();
  assert.throws(() => registry.register({ id: "bad", kind: "tool" }), error => error instanceof RuntimeError && error.code === "invalid_socket");
  assert.equal(registry.register({ id: "safe-tool", kind: "tool", capabilities: ["read"], readiness: "ready", permitRequired: true, timeoutMs: 500, failureClasses: ["timeout"] }).permitRequired, true);
});

test("router creates a secret-free permit-bound plan and rejects removed sockets", () => {
  const registry = createFoundationSocketRegistry();
  const router = new ExecutionRouter({ socketRegistry: registry });
  const plan = router.plan({ command: { id: "run-1", principalId: "owner:a", requestId: "one", requestDigest: "digest", payload: {} }, generation: 3, permit: { commandId: "run-1", signature: "permit-secret-never-exposed", expiresAt: Date.now() + 1000 } });
  assert.equal(plan.destination.socketId, "local-deterministic-worker");
  assert.equal(JSON.stringify(plan).includes("permit-secret-never-exposed"), false);
  registry.unregister("local-deterministic-worker");
  assert.throws(() => router.plan({ command: { id: "run-2", principalId: "owner:a", requestId: "two", requestDigest: "digest", payload: {} }, generation: 3, permit: { commandId: "run-2", signature: "signature", expiresAt: Date.now() + 1000 } }), error => error.code === "socket_not_found");
});

test("controller retries only local known failures and holds unknown outcomes", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState(), workerResultTimeoutMs: 120 }).start();
  try {
    const failed = await runtime.controller.submit({ principalId: "owner:a", requestId: "failed", payload: { mode: "fail" } });
    await eventually(async () => (await runtime.controller.get({ principalId: "owner:a", commandId: failed.commandId }))?.status === "failed");
    const retried = await runtime.controller.retry({ principalId: "owner:a", commandId: failed.commandId, requestId: "recovered", payload: { input: "recovered" } });
    await eventually(async () => (await runtime.controller.get({ principalId: "owner:a", commandId: retried.commandId }))?.status === "succeeded");
    const unknown = await runtime.controller.submit({ principalId: "owner:a", requestId: "unknown", payload: { mode: "blackhole" } });
    await eventually(async () => (await runtime.controller.get({ principalId: "owner:a", commandId: unknown.commandId }))?.status === "uncertain", 2_000);
    await assert.rejects(() => runtime.controller.retry({ principalId: "owner:a", commandId: unknown.commandId, requestId: "no-retry" }), error => error.code === "retry_requires_review");
  } finally { await runtime.stop(); }
});

test("progress reconnect starts with durable ordered snapshot and ends terminal-safe", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const writes = [];
  const response = { write: value => { writes.push(value); return true; }, end: () => {}, on: () => {} };
  try {
    const accepted = await runtime.submitTurn({ principalId: "owner:a", requestId: "progress", payload: { input: "slow", delayMs: 100 } });
    await runtime.subscribeProgress("owner:a", accepted.commandId, response);
    await eventually(async () => (await runtime.getTurn("owner:a", accepted.commandId))?.status === "succeeded");
    const events = await runtime.getProgress("owner:a", accepted.commandId);
    assert.ok(writes.some(value => value.startsWith("event: snapshot")));
    assert.deepEqual(events.map(item => item.seq), [...events].map(item => item.seq).sort((a, b) => a - b));
    assert.equal(events.at(-1).phase, "succeeded");
  } finally { await runtime.stop(); }
});
