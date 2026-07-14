import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { NativeRuntime } from "../src/core/runtime.js";

const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-bench-"));
const runtime = await new NativeRuntime({ stateDir, maxInflight: 4 }).start();
const samples = [];
for (let index = 0; index < 500; index += 1) {
  const start = performance.now();
  await runtime.submitTurn({ principalId: "bench", requestId: `r-${index}`, payload: { input: index } });
  samples.push(performance.now() - start);
}
samples.sort((a, b) => a - b);
const percentile = p => samples[Math.min(samples.length - 1, Math.floor(samples.length * p))];
console.log(JSON.stringify({ samples: samples.length, p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99), stateDir }, null, 2));
await runtime.stop();
