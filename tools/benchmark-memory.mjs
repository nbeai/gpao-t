import { performance } from "node:perf_hooks";
import { LocalHybridMemory } from "../src/core/local-memory.js";

const memory = new LocalHybridMemory({ maxEntries: 500 });
for (let index = 0; index < 500; index += 1) memory.ingest({ text: `GPAO-T3 runtime local memory context candidate ${index}`, traceRef: `seed-${index}`, reviewed: index % 3 === 0 });
const samples = [];
for (let index = 0; index < 200; index += 1) { const started = performance.now(); memory.search("GPAO-T3 local runtime context", { budgetMs: 120, sessionId: "benchmark" }); samples.push(performance.now() - started); }
samples.sort((a, b) => a - b);
const p95 = samples[Math.floor(samples.length * 0.95)];
const receipt = { schema: "gpao_t3.local_memory_benchmark.v1", corpusEntries: 500, queries: 200, p50Ms: samples[Math.floor(samples.length * 0.5)], p95Ms: p95, budgetMs: 120, gate: p95 <= 120 ? "pass" : "fail" };
console.log(JSON.stringify(receipt, null, 2));
if (receipt.gate !== "pass") process.exitCode = 1;
