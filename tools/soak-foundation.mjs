import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { NativeRuntime } from "../src/core/runtime.js";

const total = 2000;
const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-soak-"));
const runtime = await new NativeRuntime({ stateDir, maxInflight: 8, maxQueue: total + 16 }).start();
const samples = [];
const commandIds = [];
const started = performance.now();
for (let index = 0; index < total; index += 1) {
  const submitStarted = performance.now();
  const accepted = await runtime.submitTurn({ principalId: "soak", requestId: `soak-${index}`, payload: { input: index } });
  samples.push(performance.now() - submitStarted);
  commandIds.push(accepted.commandId);
}
const acceptedDurationMs = performance.now() - started;
const deadline = Date.now() + 30_000;
async function terminalCount() {
  let succeeded = 0;
  for (const commandId of commandIds) {
    if ((await runtime.getTurn("soak", commandId))?.status === "succeeded") succeeded += 1;
  }
  return succeeded;
}
while (Date.now() < deadline) {
  if (await terminalCount() === total) break;
  await new Promise(resolve => setTimeout(resolve, 25));
}
const failed = total - await terminalCount();
samples.sort((a, b) => a - b);
const percentile = p => samples[Math.min(samples.length - 1, Math.floor(samples.length * p))];
const integrity = (await runtime.doctor()).integrity;
const stopStarted = performance.now();
await runtime.stop();
const stopDurationMs = performance.now() - stopStarted;
const receipt = {
  schema: "gpao_t.native_foundation_soak.v1",
  turns: total,
  acceptedDurationMs,
  p50Ms: percentile(0.5),
  p95Ms: percentile(0.95),
  p99Ms: percentile(0.99),
  failed,
  stopDurationMs,
  integrity,
  gate: failed === 0 && stopDurationMs < 5_000 ? "pass" : "blocked"
};
fs.rmSync(stateDir, { recursive: true, force: true });
console.log(JSON.stringify(receipt, null, 2));
if (receipt.gate === "blocked") process.exitCode = 1;
