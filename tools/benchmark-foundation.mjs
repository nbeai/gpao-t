import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import { NativeRuntime } from "../src/core/runtime.js";

function waitForLine(child, expected) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const onData = chunk => {
      buffer += String(chunk);
      if (buffer.includes(expected)) {
        child.stdout.off("data", onData);
        resolve();
      }
    };
    child.stdout.on("data", onData);
    child.once("error", reject);
    child.once("exit", code => { if (code !== 0) reject(new Error(`lock worker exited ${code}`)); });
  });
}

const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-benchmark-"));
const runtime = new NativeRuntime({ stateDir }).start();
const seed = runtime.submitTurn({ principalId: "benchmark", requestId: "seed", payload: { input: "seed" } });
while (runtime.getTurn("benchmark", seed.commandId)?.status !== "succeeded") await new Promise(resolve => setTimeout(resolve, 5));
const holder = spawn(process.execPath, [path.resolve("tools/hold-sqlite-lock.mjs"), path.join(stateDir, "runtime.sqlite"), "80"], { stdio: ["ignore", "pipe", "inherit"], env: { ...process.env, NODE_NO_WARNINGS: "1" } });
await waitForLine(holder, "locked");
let maxDelayMs = 0;
const timerExpected = Date.now() + 10;
const timer = setTimeout(() => { maxDelayMs = Date.now() - timerExpected; }, 10);
const started = performance.now();
let submitError = null;
try {
  runtime.submitTurn({ principalId: "benchmark", requestId: "lock-probe", payload: { input: "lock" } });
} catch (error) {
  submitError = { code: error.code || "sqlite_error", message: error.message };
}
const submitDurationMs = performance.now() - started;
clearTimeout(timer);
await new Promise(resolve => holder.once("exit", resolve));
await runtime.stop();
fs.rmSync(stateDir, { recursive: true, force: true });

const receipt = {
  schema: "gpao_t.native_foundation_benchmark.v1",
  stateWriter: "node:sqlite DatabaseSync on runtime process",
  lockHoldMs: 80,
  submitDurationMs,
  timerDelayMs: maxDelayMs,
  submitError,
  gate: maxDelayMs >= 20 || submitError ? "blocked" : "pass",
  interpretation: maxDelayMs >= 20
    ? "SQLite writer contention can delay the runtime event loop; move durable writes behind an asynchronous boundary before G4 promotion."
    : submitError
      ? "The runtime stayed alive but durable submission was rejected during writer contention; close the asynchronous state-writer/backpressure contract before G4 promotion."
      : "This probe did not observe a 20ms event-loop stall; continue with broader load and restart measurements."
};
console.log(JSON.stringify(receipt, null, 2));
if (receipt.gate === "blocked") process.exitCode = 1;
