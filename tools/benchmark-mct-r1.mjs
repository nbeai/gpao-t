import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { Worker } from "node:worker_threads";
import { spawnSync } from "node:child_process";
import { StateStore } from "../src/core/store.js";
import { createMctR0Corpus } from "../test/fixtures/mct-r0-corpus.js";
import { canonicalDigest } from "../src/core/canonical-json.js";

const seal = JSON.parse(fs.readFileSync(new URL("../test/fixtures/mct-r0-seal.json", import.meta.url), "utf8"));

const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-mct-r1-bench-"));
let store = new StateStore(stateDir);

function percentile(samples, ratio) {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * ratio)];
}

function processColdRun() {
  const samples = [];
  for (let offset = 0; offset < 20; offset += 1) {
    const result = spawnSync(process.execPath, [
      new URL("./benchmark-mct-r1-cold.mjs", import.meta.url).pathname,
      stateDir,
      String(offset)
    ], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || "cold benchmark process failed");
    samples.push(JSON.parse(result.stdout).sample);
  }
  return samples;
}

async function concurrentRun() {
  const workers = [];
  for (let index = 0; index < 4; index += 1) {
    const worker = new Worker(new URL("./benchmark-mct-r1-worker.mjs", import.meta.url), { workerData: { stateDir, start: index * 50, end: (index + 1) * 50 } });
    await new Promise((resolve, reject) => {
      worker.once("message", message => message?.type === "ready" && resolve());
      worker.once("error", reject);
    });
    workers.push(worker);
  }
  const results = workers.map(worker => new Promise((resolve, reject) => {
    worker.once("message", message => message?.type === "complete" && resolve(message));
    worker.once("error", reject);
  }));
  workers.forEach(worker => worker.postMessage({ type: "start" }));
  return Promise.all(results);
}
try {
  const corpus = createMctR0Corpus();
  const corpusDigest = canonicalDigest(seal.dataset.canonicalDigestDomain, corpus);
  if (corpusDigest !== seal.dataset.canonicalDigest) throw new Error("sealed corpus digest mismatch");
  const ingestStarted = performance.now();
  store.transaction(() => {
    for (const record of corpus) store.addMemoryCandidate({
      id: record.id, text: record.content, source: "mct_r0_sealed_corpus", traceRef: `trace-${record.id}`,
      sessionId: `session-${Number(record.id.slice(-5)) % 4}`, reviewed: Number(record.id.slice(-5)) % 3 === 0,
      createdAt: 1_700_000_000_000 + Number(record.id.slice(-5))
    });
  });
  const ingestMs = performance.now() - ingestStarted;
  const samples = [];
  let exactReciprocalRank = 0;
  let exactRecallAt10 = 0;
  let fuzzyReciprocalRank = 0;
  let fuzzyRecallAt10 = 0;
  for (let offset = 0; offset < 200; offset += 1) {
    const number = 8001 + (offset % 2000);
    const id = `mct-r0-${String(number).padStart(5, "0")}`;
    const sessionId = `session-${number % 4}`;
    const started = performance.now();
    const exact = offset % 2 === 0;
    const query = exact ? `record-${String(number).padStart(5, "0")}` : `recodr${String(number).padStart(5, "0")}`;
    const result = store.searchMemory(query, { sessionId, limit: 10, budgetMs: 250 });
    samples.push(performance.now() - started);
    const rank = result.results.findIndex(entry => entry.id === id);
    if (rank >= 0 && exact) { exactRecallAt10 += 1; exactReciprocalRank += 1 / (rank + 1); }
    if (rank >= 0 && !exact) { fuzzyRecallAt10 += 1; fuzzyReciprocalRank += 1 / (rank + 1); }
  }
  const indexParity = store.memorySearchStatus().parity;
  store.close();
  store = null;
  const processColdSamples = processColdRun();
  const concurrent = await concurrentRun();
  const concurrentSamples = concurrent.flatMap(result => result.samples);
  const half = concurrentSamples.length / 2;
  const concurrentExactRecall = concurrent.reduce((sum, result) => sum + result.exactRecallAt10, 0) / half;
  const concurrentExactMrr = concurrent.reduce((sum, result) => sum + result.exactReciprocalRank, 0) / half;
  const concurrentFuzzyRecall = concurrent.reduce((sum, result) => sum + result.fuzzyRecallAt10, 0) / half;
  const concurrentFuzzyMrr = concurrent.reduce((sum, result) => sum + result.fuzzyReciprocalRank, 0) / half;
  const receipt = {
    schema: "gpao_t3.mct_r1_benchmark.v1", corpusEntries: corpus.length, queries: samples.length,
    mode: "sqlite_fts5_lexical_fuzzy_local_vector", semanticEvaluated: false, vectorAlgorithm: "char_trigram_hash_v1", corpusDigest, concurrency: [1, 4], environment: { platform: process.platform, arch: process.arch, node: process.version },
    temperatureContract: seal.dataset.temperatureContract,
    ingestMs,
    processCold: { p50Ms: percentile(processColdSamples, 0.5), p95Ms: percentile(processColdSamples, 0.95), samples: processColdSamples.length },
    sequential: { warmP50Ms: percentile(samples, 0.5), warmP95Ms: percentile(samples, 0.95), exactRecallAt10: exactRecallAt10 / 100, exactMrr: exactReciprocalRank / 100, fuzzyVectorRecallAt10: fuzzyRecallAt10 / 100, fuzzyVectorMrr: fuzzyReciprocalRank / 100 },
    concurrent4: { freshConnectionWarmOsCacheP95Ms: percentile(concurrent.map(result => result.samples[0]), 0.95), warmP50Ms: percentile(concurrentSamples, 0.5), warmP95Ms: percentile(concurrentSamples, 0.95), exactRecallAt10: concurrentExactRecall, exactMrr: concurrentExactMrr, fuzzyVectorRecallAt10: concurrentFuzzyRecall, fuzzyVectorMrr: concurrentFuzzyMrr },
    indexParity
  };
  receipt.gate = receipt.processCold.p95Ms <= 250 && receipt.sequential.warmP95Ms <= 250 && receipt.concurrent4.warmP95Ms <= 250 && receipt.sequential.exactRecallAt10 >= 0.9 && receipt.concurrent4.exactRecallAt10 >= 0.9 && receipt.sequential.exactMrr >= 0.8 && receipt.concurrent4.exactMrr >= 0.8 && receipt.sequential.fuzzyVectorRecallAt10 >= 0.8 && receipt.concurrent4.fuzzyVectorRecallAt10 >= 0.8 && receipt.indexParity ? "pass" : "fail";
  console.log(JSON.stringify(receipt, null, 2));
  if (receipt.gate !== "pass") process.exitCode = 1;
} finally {
  store?.close();
  fs.rmSync(stateDir, { recursive: true, force: true });
}
