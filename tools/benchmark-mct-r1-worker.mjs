import { parentPort, workerData } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { StateStore } from "../src/core/store.js";

const store = new StateStore(workerData.stateDir);
parentPort.postMessage({ type: "ready" });
parentPort.once("message", message => {
  if (message?.type !== "start") return;
  const samples = [];
  let exactReciprocalRank = 0;
  let exactRecallAt10 = 0;
  let fuzzyReciprocalRank = 0;
  let fuzzyRecallAt10 = 0;
  for (let offset = workerData.start; offset < workerData.end; offset += 1) {
    const number = 8001 + (offset % 2000);
    const id = `mct-r0-${String(number).padStart(5, "0")}`;
    const started = performance.now();
    const exact = offset % 2 === 0;
    const query = exact ? `record-${String(number).padStart(5, "0")}` : `recodr${String(number).padStart(5, "0")}`;
    const result = store.searchMemory(query, { sessionId: `session-${number % 4}`, limit: 10, budgetMs: 250 });
    samples.push(performance.now() - started);
    const rank = result.results.findIndex(entry => entry.id === id);
    if (rank >= 0 && exact) { exactRecallAt10 += 1; exactReciprocalRank += 1 / (rank + 1); }
    if (rank >= 0 && !exact) { fuzzyRecallAt10 += 1; fuzzyReciprocalRank += 1 / (rank + 1); }
  }
  store.close();
  parentPort.postMessage({ type: "complete", samples, exactReciprocalRank, exactRecallAt10, fuzzyReciprocalRank, fuzzyRecallAt10 });
});
