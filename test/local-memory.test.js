import assert from "node:assert/strict";
import test from "node:test";
import { LocalHybridMemory } from "../src/core/local-memory.js";

test("local memory search stays bounded and degrades instead of blocking a turn", () => {
  const memory = new LocalHybridMemory({ maxEntries: 500 });
  for (let index = 0; index < 500; index += 1) memory.ingest({ text: `GPAO-T local memory candidate ${index} runtime context`, traceRef: `trace-${index}`, reviewed: index % 2 === 0 });
  const result = memory.search("GPAO-T local runtime context", { budgetMs: 120, sessionId: "session-a" });
  assert.ok(result.elapsedMs <= 120.5);
  assert.ok(result.results.length <= 12);
  assert.ok(result.degraded === null || result.degraded === "latency_budget_exceeded");
});
