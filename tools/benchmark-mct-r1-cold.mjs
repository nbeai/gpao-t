import { performance } from "node:perf_hooks";
import { StateStore } from "../src/core/store.js";

const [stateDir, offsetText = "0"] = process.argv.slice(2);
if (!stateDir) throw new Error("state directory is required");

const offset = Number(offsetText);
const store = new StateStore(stateDir);

try {
  const number = 8001 + offset;
  const query = offset % 2 === 0
    ? `record-${String(number).padStart(5, "0")}`
    : `recodr${String(number).padStart(5, "0")}`;
  const started = performance.now();
  store.searchMemory(query, {
    sessionId: `session-${number % 4}`,
    limit: 10,
    budgetMs: 250
  });
  process.stdout.write(JSON.stringify({ sample: performance.now() - started }));
} finally {
  store.close();
}
