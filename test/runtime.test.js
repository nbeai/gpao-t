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

test("old generation results are ignored", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const result = await runtime.submitTurn({ principalId: "owner:a", requestId: "fence", payload: { input: "real" } });
  await eventually(async () => (await runtime.getTurn("owner:a", result.commandId))?.status === "succeeded");
  const before = (await runtime.getTurn("owner:a", result.commandId)).receipt.result;
  runtime.handleWorkerMessage({ type: "result", commandId: result.commandId, principalId: "owner:a", generation: runtime.generation - 1, permitSignature: "bad", status: "succeeded", result: { echo: "stale" } });
  assert.deepEqual((await runtime.getTurn("owner:a", result.commandId)).receipt.result, before);
  await runtime.stop();
});

test("live state and foreign OpenClaw paths are rejected", () => {
  assert.throws(() => new NativeRuntime({ stateDir: path.resolve(os.homedir(), ".gpao-t") }), error => error.code === "protected_live_path");
  assert.throws(() => new NativeRuntime({ stateDir: path.join(os.tmpdir(), ".openclaw") }), error => error.code === "foreign_state_path");
});
