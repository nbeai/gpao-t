import { performance } from "node:perf_hooks";
import { ProviderAdapterRegistry, ModelRouter } from "../src/core/model-router.js";
import { ProviderRegistry } from "../src/core/provider.js";

function percentile(samples, fraction) {
  return samples[Math.min(samples.length - 1, Math.floor(samples.length * fraction))];
}

const registry = new ProviderRegistry({
  entries: ["fast", "backup", "local"].map((id, index) => ({
    id,
    adapter: id,
    priority: index + 1,
    auth: { kind: "none" },
    health: { state: "ready" },
    models: [{ id: `${id}-text`, capabilities: ["text"], inputModalities: ["text"], outputModalities: ["text"], priority: index + 1 }]
  }))
});
const adapters = new ProviderAdapterRegistry({
  adapters: ["fast", "backup", "local"].map(id => ({
    id,
    adapter: { invoke: async plan => ({ status: "succeeded", result: { text: "ok" }, receipt: { runId: plan.runId, terminal: true } }) }
  }))
});
const router = new ModelRouter({ providerRegistry: registry, adapterRegistry: adapters });
const samples = [];
for (let index = 0; index < 1_000; index += 1) {
  const started = performance.now();
  await router.invoke({ runId: `router-${index}`, sessionId: "benchmark", generation: 1, idempotencyKey: `key-${index}`, input: "router benchmark", sourceContextDigest: "none" });
  samples.push(performance.now() - started);
}
samples.sort((left, right) => left - right);
const receipt = {
  schema: "gpao_t.model_router_benchmark.v1",
  sampleCount: samples.length,
  providers: 3,
  p50Ms: percentile(samples, 0.5),
  p95Ms: percentile(samples, 0.95),
  p99Ms: percentile(samples, 0.99),
  thresholdsMs: { p95: 5, p99: 10 },
  scope: "in-process route selection, plan construction, adapter dispatch; excludes network and model latency"
};
receipt.gate = receipt.p95Ms <= receipt.thresholdsMs.p95 && receipt.p99Ms <= receipt.thresholdsMs.p99 ? "pass" : "blocked";
console.log(JSON.stringify(receipt, null, 2));
if (receipt.gate !== "pass") process.exitCode = 1;
