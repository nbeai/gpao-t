import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NativeRuntime } from "../src/core/runtime.js";
import { RuntimeError } from "../src/core/errors.js";

function tempState() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-") );
}

async function eventually(predicate, timeout = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await predicate();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("timed out waiting for condition");
}

test("boots with isolated state, owner token, and constant-time health", async () => {
  const stateDir = tempState();
  const runtime = await new NativeRuntime({ stateDir }).start();
  assert.equal(runtime.health().status, "ready");
  assert.equal(fs.statSync(path.join(stateDir, "owner.token")).mode & 0o777, 0o600);
  assert.equal(fs.statSync(stateDir).mode & 0o777, 0o700);
  const result = await runtime.submitTurn({ principalId: "owner:a", requestId: "r1", payload: { input: "hello" } });
  const turn = await eventually(async () => {
    const current = await runtime.getTurn("owner:a", result.commandId);
    return current?.status === "succeeded" && current;
  });
  assert.deepEqual(turn.receipt.result, { kind: "deterministic_worker_result", echo: "hello" });
  assert.equal((await runtime.doctor()).integrity.ok, true);
  await runtime.stop();
});

test("idempotency is principal-scoped and conflicts are explicit", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const first = await runtime.submitTurn({ principalId: "owner:a", requestId: "same", payload: { input: 1 } });
  const duplicate = await runtime.submitTurn({ principalId: "owner:a", requestId: "same", payload: { input: 1 } });
  assert.equal(duplicate.commandId, first.commandId);
  assert.equal(duplicate.deduplicated, true);
  await assert.rejects(() => runtime.submitTurn({ principalId: "owner:a", requestId: "same", payload: { input: 2 } }), error => error instanceof RuntimeError && error.code === "idempotency_conflict");
  const other = await runtime.submitTurn({ principalId: "owner:b", requestId: "same", payload: { input: 2 } });
  assert.notEqual(other.commandId, first.commandId);
  assert.equal(await runtime.getTurn("owner:b", first.commandId), null);
  await runtime.stop();
});

test("reversed worker completion cannot cross-wire request ownership", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState(), maxInflight: 2 }).start();
  const slow = await runtime.submitTurn({ principalId: "owner:a", requestId: "slow", payload: { input: "slow", delayMs: 100 } });
  const fast = await runtime.submitTurn({ principalId: "owner:a", requestId: "fast", payload: { input: "fast", delayMs: 1 } });
  await eventually(async () => {
    const slowTurn = await runtime.getTurn("owner:a", slow.commandId);
    const fastTurn = await runtime.getTurn("owner:a", fast.commandId);
    return slowTurn?.status === "succeeded" && fastTurn?.status === "succeeded";
  });
  assert.equal((await runtime.getTurn("owner:a", slow.commandId)).receipt.result.echo, "slow");
  assert.equal((await runtime.getTurn("owner:a", fast.commandId)).receipt.result.echo, "fast");
  await runtime.stop();
});

test("worker crash after dispatch becomes unknown and is not retried", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const result = await runtime.submitTurn({ principalId: "owner:a", requestId: "crash", payload: { mode: "crash-after-dispatch" } });
  const turn = await eventually(async () => {
    const current = await runtime.getTurn("owner:a", result.commandId);
    return current?.status === "uncertain" && current;
  });
  assert.equal(turn.receipt, null);
  const progress = await runtime.getProgress("owner:a", result.commandId);
  assert.equal(progress.at(-1).phase, "outcome_unknown");
  await runtime.stop();
});

test("worker removal recovers before a later local turn without breaking doctor", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  try {
    const removed = runtime.worker;
    removed.kill();
    await eventually(() => runtime.worker && runtime.worker !== removed && runtime.worker.connected, 2000);
    const result = await runtime.submitTurn({ principalId: "owner:a", requestId: "after-worker-removal", payload: { input: "recovered" } });
    await eventually(async () => (await runtime.getTurn("owner:a", result.commandId))?.status === "succeeded", 2000);
    assert.equal((await runtime.doctor()).integrity.ok, true);
  } finally { await runtime.stop(); }
});

test("worker crash loop trips a restart breaker instead of churning", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState(), maxWorkerRestarts: 1, workerStableWindowMs: 500 }).start();
  try {
    await runtime.submitTurn({ principalId: "owner:a", requestId: "crash-loop-1", payload: { mode: "crash-after-dispatch" } });
    await eventually(async () => runtime.health().workerStatus === "ready" && runtime.health().workerCrashAttempts === 1, 2000);
    await runtime.submitTurn({ principalId: "owner:a", requestId: "crash-loop-2", payload: { mode: "crash-after-dispatch" } });
    await eventually(async () => runtime.health().status === "failed" && runtime.health().workerStatus === "crash-loop", 2000);
    await assert.rejects(() => runtime.submitTurn({ principalId: "owner:a", requestId: "crash-loop-3", payload: { input: "blocked" } }), error => error instanceof RuntimeError && error.code === "runtime_not_ready");
  } finally {
    await runtime.stop();
  }
});

test("worker result timeout prevents an unresponsive task from staying running", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState(), workerResultTimeoutMs: 100 }).start();
  const result = await runtime.submitTurn({ principalId: "owner:a", requestId: "blackhole", payload: { mode: "blackhole" } });
  try {
    const turn = await eventually(async () => {
      const current = await runtime.getTurn("owner:a", result.commandId);
      return current?.status === "uncertain" && current;
    }, 2000);
    assert.equal(turn.receipt, null);
    assert.equal((await runtime.getProgress("owner:a", result.commandId)).at(-1).phase, "outcome_unknown");
  } finally {
    await runtime.stop();
  }
});

test("worker timeout frees the inflight slot for the next queued turn", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState(), maxInflight: 1, workerResultTimeoutMs: 100 }).start();
  try {
    const first = await runtime.submitTurn({ principalId: "owner:a", requestId: "timeout-first", payload: { mode: "blackhole" } });
    const second = await runtime.submitTurn({ principalId: "owner:a", requestId: "timeout-second", payload: { input: "next" } });
    await eventually(async () => (await runtime.getTurn("owner:a", first.commandId))?.status === "uncertain", 2000);
    await eventually(async () => (await runtime.getTurn("owner:a", second.commandId))?.status === "succeeded", 2000);
  } finally {
    await runtime.stop();
  }
});

test("runtime lock release never removes a newer owner lock", async () => {
  const stateDir = tempState();
  const first = await new NativeRuntime({ stateDir }).start();
  const lockPath = path.join(stateDir, "runtime.lock");
  fs.writeFileSync(lockPath, JSON.stringify({ pid: process.pid, token: "new-owner", startedAt: Date.now() }));
  await first.stop();
  assert.equal(JSON.parse(fs.readFileSync(lockPath, "utf8")).token, "new-owner");
  await assert.rejects(() => new NativeRuntime({ stateDir }).start(), error => error instanceof RuntimeError && error.code === "runtime_already_running");
  fs.unlinkSync(lockPath);
});

test("dead owner lock is safely reclaimed", async () => {
  const stateDir = tempState();
  fs.writeFileSync(path.join(stateDir, "runtime.lock"), JSON.stringify({ pid: 99_999_999, token: "dead-owner", startedAt: Date.now() }));
  const runtime = await new NativeRuntime({ stateDir }).start();
  await runtime.stop();
});

test("old generation results are ignored", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const result = await runtime.submitTurn({ principalId: "owner:a", requestId: "fence", payload: { input: "real" } });
  await eventually(async () => (await runtime.getTurn("owner:a", result.commandId))?.status === "succeeded");
  const before = (await runtime.getTurn("owner:a", result.commandId)).receipt.result;
  runtime.handleWorkerMessage({ type: "result", commandId: result.commandId, principalId: "owner:a", generation: runtime.generation - 1, permitSignature: "bad", status: "succeeded", result: { echo: "stale" } });
  assert.deepEqual((await runtime.getTurn("owner:a", result.commandId)).receipt.result, before);
  await runtime.stop();
});

test("route plans are permit-bound, secret-free, and use a ready local socket", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const result = await runtime.submitTurn({ principalId: "owner:a", requestId: "route", payload: { input: "route" } });
  await eventually(async () => (await runtime.getTurn("owner:a", result.commandId))?.status === "succeeded");
  const sockets = (await runtime.doctor()).sockets;
  assert.equal(sockets.sockets[0].id, "local-deterministic-worker");
  assert.equal(sockets.sockets[0].permitRequired, true);
  await runtime.stop();
});

test("cancelled before dispatch records a terminal cancellation without execution", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const originalPump = runtime.pump;
  runtime.pump = async () => {};
  const result = await runtime.submitTurn({ principalId: "owner:a", requestId: "cancel-before", payload: { input: "stop" } });
  const cancelled = await runtime.cancelTurn({ principalId: "owner:a", commandId: result.commandId });
  assert.equal(cancelled.cancellation, "cancelled_before_dispatch");
  assert.equal((await runtime.getTurn("owner:a", result.commandId)).status, "cancelled");
  assert.equal((await runtime.getProgress("owner:a", result.commandId)).at(-1).phase, "cancelled");
  runtime.pump = originalPump;
  await runtime.stop();
});

test("cancelled in flight records bounded uncertainty and rejects late completion", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState(), workerResultTimeoutMs: 2_000 }).start();
  const result = await runtime.submitTurn({ principalId: "owner:a", requestId: "cancel-in-flight", payload: { input: "stop", delayMs: 400 } });
  await eventually(() => runtime.pending.has(result.commandId));
  const cancelled = await runtime.cancelTurn({ principalId: "owner:a", commandId: result.commandId });
  assert.equal(cancelled.cancellation, "cancelled_in_flight");
  assert.equal((await runtime.getTurn("owner:a", result.commandId)).status, "uncertain");
  await new Promise(resolve => setTimeout(resolve, 450));
  assert.equal((await runtime.getTurn("owner:a", result.commandId)).status, "uncertain");
  await runtime.stop();
});

test("live GPAO-T state is rejected", () => {
  assert.throws(() => new NativeRuntime({ stateDir: path.resolve(os.homedir(), ".gpao-t") }), error => error.code === "protected_live_path");
});

test("connector controls persist safe state without granting tool authority", async () => {
  const stateDir = tempState();
  const first = await new NativeRuntime({ stateDir }).start();
  try {
    assert.equal(first.connectorStatus().connectors.find(entry => entry.id === "local.workspace-read").enabled, true);
    const receipt = await first.setConnectorEnabled("local.workspace-read", false);
    assert.equal(receipt.executionAuthorityGranted, false);
    assert.equal(first.connectorStatus().connectors.find(entry => entry.id === "local.workspace-read").enabled, false);
  } finally {
    await first.stop();
  }
  const second = await new NativeRuntime({ stateDir }).start();
  try {
    assert.equal(second.connectorStatus().connectors.find(entry => entry.id === "local.workspace-read").enabled, false);
    assert.equal((await second.doctor()).connectors.schema, "gpao_t.connector_center.v1");
  } finally {
    await second.stop();
  }
});
