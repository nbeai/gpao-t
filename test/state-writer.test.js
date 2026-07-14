import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { NativeRuntime } from "../src/core/runtime.js";
import { RuntimeError } from "../src/core/errors.js";

function tempState() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-writer-"));
}

function waitForLine(child, expected) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = chunk => {
      buffer += String(chunk);
      if (!buffer.includes(expected)) {
        return;
      }
      child.stdout.off("data", onData);
      resolve();
    };
    child.stdout.on("data", onData);
    child.once("error", reject);
    child.once("exit", code => { if (code !== 0) reject(new Error(`lock worker exited ${code}`)); });
  });
}

async function eventually(predicate, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await predicate();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("timed out waiting for state writer result");
}

test("writer lock does not stall the runtime loop and durable submit waits safely", async () => {
  const stateDir = tempState();
  const runtime = await new NativeRuntime({ stateDir }).start();
  let holder;
  try {
    const seed = await runtime.submitTurn({ principalId: "owner:a", requestId: "seed", payload: { input: "seed" } });
    await eventually(async () => (await runtime.getTurn("owner:a", seed.commandId))?.status === "succeeded");
    holder = spawn(process.execPath, [path.resolve("tools/hold-sqlite-lock.mjs"), path.join(stateDir, "runtime.sqlite"), "80"], { stdio: ["ignore", "pipe", "inherit"], env: { ...process.env, NODE_NO_WARNINGS: "1" } });
    await waitForLine(holder, "locked");
    const holderExit = new Promise(resolve => holder.once("exit", resolve));
    let timerDelayMs = null;
    const expected = Date.now() + 10;
    const timer = setTimeout(() => { timerDelayMs = Date.now() - expected; }, 10);
    const started = performance.now();
    const accepted = await runtime.submitTurn({ principalId: "owner:a", requestId: "lock-probe", payload: { input: "lock" } });
    const durationMs = performance.now() - started;
    clearTimeout(timer);
    await holderExit;
    assert.equal(accepted.deduplicated, false);
    assert.ok(durationMs >= 60, `durable writer should wait for lock release, got ${durationMs}ms`);
    assert.ok((timerDelayMs ?? 0) < 20, `runtime event loop stalled for ${timerDelayMs}ms`);
    await eventually(async () => (await runtime.getTurn("owner:a", accepted.commandId))?.status === "succeeded");
  } finally {
    if (holder && holder.exitCode === null) holder.kill();
    await runtime.stop();
  }
});

test("writer lock during worker completion preserves the final receipt", async () => {
  const stateDir = tempState();
  const runtime = await new NativeRuntime({ stateDir }).start();
  let holder;
  try {
    const accepted = await runtime.submitTurn({ principalId: "owner:a", requestId: "completion-lock", payload: { input: "completion", delayMs: 25 } });
    holder = spawn(process.execPath, [path.resolve("tools/hold-sqlite-lock.mjs"), path.join(stateDir, "runtime.sqlite"), "80"], { stdio: ["ignore", "pipe", "inherit"], env: { ...process.env, NODE_NO_WARNINGS: "1" } });
    await waitForLine(holder, "locked");
    const holderExit = new Promise(resolve => holder.once("exit", resolve));
    await eventually(async () => (await runtime.getTurn("owner:a", accepted.commandId))?.status === "succeeded");
    await holderExit;
    assert.equal((await runtime.getTurn("owner:a", accepted.commandId)).receipt.result.echo, "completion");
  } finally {
    if (holder && holder.exitCode === null) holder.kill();
    await runtime.stop();
  }
});

test("writer makes queue backpressure atomic without dropping the first accepted turn", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState(), maxQueue: 1, maxInflight: 1 }).start();
  try {
    const first = await runtime.submitTurn({ principalId: "owner:a", requestId: "first", payload: { input: "first", delayMs: 500 } });
    await assert.rejects(() => runtime.submitTurn({ principalId: "owner:a", requestId: "second", payload: { input: "second" } }), error => error instanceof RuntimeError && error.code === "backpressure");
    assert.equal((await runtime.getTurn("owner:a", first.commandId)).status, "running");
  } finally {
    await runtime.stop();
  }
});

test("restart preserves durable receipts and advances the runtime generation", async () => {
  const stateDir = tempState();
  const firstRuntime = await new NativeRuntime({ stateDir }).start();
  const accepted = await firstRuntime.submitTurn({ principalId: "owner:a", requestId: "restart", payload: { input: "restart" } });
  await eventually(async () => (await firstRuntime.getTurn("owner:a", accepted.commandId))?.status === "succeeded");
  const firstGeneration = firstRuntime.generation;
  await firstRuntime.stop();

  const secondRuntime = await new NativeRuntime({ stateDir }).start();
  try {
    assert.equal(secondRuntime.generation, firstGeneration + 1);
    assert.equal((await secondRuntime.getTurn("owner:a", accepted.commandId)).receipt.result.echo, "restart");
    assert.equal((await secondRuntime.doctor()).integrity.ok, true);
  } finally {
    await secondRuntime.stop();
  }
});

test("shutdown drains writer operations within the bounded local deadline", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState(), maxInflight: 1, maxQueue: 16 }).start();
  for (let index = 0; index < 8; index += 1) {
    await runtime.submitTurn({ principalId: "owner:a", requestId: `shutdown-${index}`, payload: { input: index, delayMs: 250 } });
  }
  const started = performance.now();
  await runtime.stop();
  assert.ok(performance.now() - started < 2_000, "shutdown exceeded the bounded local deadline");
});
