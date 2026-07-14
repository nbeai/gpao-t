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
    const value = predicate();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("timed out waiting for condition");
}

test("boots with isolated state, owner token, and constant-time health", async () => {
  const stateDir = tempState();
  const runtime = new NativeRuntime({ stateDir }).start();
  assert.equal(runtime.health().status, "ready");
  assert.equal(fs.statSync(path.join(stateDir, "owner.token")).mode & 0o777, 0o600);
  assert.equal(fs.statSync(stateDir).mode & 0o777, 0o700);
  const result = runtime.submitTurn({ principalId: "owner:a", requestId: "r1", payload: { input: "hello" } });
  const turn = await eventually(() => runtime.getTurn("owner:a", result.commandId)?.status === "succeeded" && runtime.getTurn("owner:a", result.commandId));
  assert.deepEqual(turn.receipt.result, { kind: "deterministic_worker_result", echo: "hello" });
  assert.equal(runtime.doctor().integrity.ok, true);
  await runtime.stop();
});

test("idempotency is principal-scoped and conflicts are explicit", async () => {
  const runtime = new NativeRuntime({ stateDir: tempState() }).start();
  const first = runtime.submitTurn({ principalId: "owner:a", requestId: "same", payload: { input: 1 } });
  const duplicate = runtime.submitTurn({ principalId: "owner:a", requestId: "same", payload: { input: 1 } });
  assert.equal(duplicate.commandId, first.commandId);
  assert.equal(duplicate.deduplicated, true);
  assert.throws(() => runtime.submitTurn({ principalId: "owner:a", requestId: "same", payload: { input: 2 } }), error => error instanceof RuntimeError && error.code === "idempotency_conflict");
  const other = runtime.submitTurn({ principalId: "owner:b", requestId: "same", payload: { input: 2 } });
  assert.notEqual(other.commandId, first.commandId);
  assert.equal(runtime.getTurn("owner:b", first.commandId), null);
  await runtime.stop();
});

test("reversed worker completion cannot cross-wire request ownership", async () => {
  const runtime = new NativeRuntime({ stateDir: tempState(), maxInflight: 2 }).start();
  const slow = runtime.submitTurn({ principalId: "owner:a", requestId: "slow", payload: { input: "slow", delayMs: 100 } });
  const fast = runtime.submitTurn({ principalId: "owner:a", requestId: "fast", payload: { input: "fast", delayMs: 1 } });
  await eventually(() => runtime.getTurn("owner:a", slow.commandId)?.status === "succeeded" && runtime.getTurn("owner:a", fast.commandId)?.status === "succeeded");
  assert.equal(runtime.getTurn("owner:a", slow.commandId).receipt.result.echo, "slow");
  assert.equal(runtime.getTurn("owner:a", fast.commandId).receipt.result.echo, "fast");
  await runtime.stop();
});

test("worker crash after dispatch becomes unknown and is not retried", async () => {
  const runtime = new NativeRuntime({ stateDir: tempState() }).start();
  const result = runtime.submitTurn({ principalId: "owner:a", requestId: "crash", payload: { mode: "crash-after-dispatch" } });
  const turn = await eventually(() => runtime.getTurn("owner:a", result.commandId)?.status === "uncertain" && runtime.getTurn("owner:a", result.commandId));
  assert.equal(turn.receipt, null);
  const progress = runtime.getProgress("owner:a", result.commandId);
  assert.equal(progress.at(-1).phase, "outcome_unknown");
  await runtime.stop();
});

test("old generation results are ignored", async () => {
  const runtime = new NativeRuntime({ stateDir: tempState() }).start();
  const result = runtime.submitTurn({ principalId: "owner:a", requestId: "fence", payload: { input: "real" } });
  await eventually(() => runtime.getTurn("owner:a", result.commandId)?.status === "succeeded");
  const before = runtime.getTurn("owner:a", result.commandId).receipt.result;
  runtime.handleWorkerMessage({ type: "result", commandId: result.commandId, principalId: "owner:a", generation: runtime.generation - 1, permitSignature: "bad", status: "succeeded", result: { echo: "stale" } });
  assert.deepEqual(runtime.getTurn("owner:a", result.commandId).receipt.result, before);
  await runtime.stop();
});

test("live state and foreign OpenClaw paths are rejected", () => {
  assert.throws(() => new NativeRuntime({ stateDir: path.resolve(os.homedir(), ".gpao-t") }), error => error.code === "protected_live_path");
  assert.throws(() => new NativeRuntime({ stateDir: path.join(os.tmpdir(), ".openclaw") }), error => error.code === "foreign_state_path");
});
