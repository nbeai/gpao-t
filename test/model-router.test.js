import assert from "node:assert/strict";
import test from "node:test";
import { ProviderInvocationError, ProviderRegistry } from "../src/core/provider.js";
import { ModelRouter, ProviderAdapterRegistry } from "../src/core/model-router.js";
import { ProviderRouteHealth } from "../src/core/provider-route-health.js";
import { OpenAiResponsesAdapter } from "../src/core/providers/openai-responses.js";
import { AnthropicMessagesAdapter } from "../src/core/providers/anthropic-messages.js";
import { GeminiGenerateContentAdapter } from "../src/core/providers/gemini-generate-content.js";

function registry() {
  return new ProviderRegistry({ entries: [
    { id: "fast", adapter: "fake-fast", priority: 1, auth: { kind: "none" }, health: { state: "ready" }, models: [{ id: "fast-1", priority: 1, capabilities: ["text"], inputModalities: ["text"], outputModalities: ["text"] }] },
    { id: "backup", adapter: "fake-backup", priority: 2, auth: { kind: "none" }, health: { state: "ready" }, models: [{ id: "backup-1", capabilities: ["text"], inputModalities: ["text"], outputModalities: ["text"] }] }
  ] });
}

test("model router selects by route policy and falls back only after safe failures", async () => {
  const calls = [];
  const adapters = new ProviderAdapterRegistry({ adapters: [
    { id: "fake-fast", adapter: { invoke: async () => { calls.push("fast"); const error = new Error("limited"); error.failureClass = "rate_limited"; error.retryable = true; error.externalEffect = false; throw error; } } },
    { id: "fake-backup", adapter: { invoke: async plan => { calls.push("backup"); return { result: { text: "backup answer" }, receipt: { schema: "gpao_t.provider_receipt.v1", runId: plan.runId } }; } } }
  ] });
  const router = new ModelRouter({ providerRegistry: registry(), adapterRegistry: adapters });
  const result = await router.invoke({ runId: "run", sessionId: "session", generation: 1, idempotencyKey: "key", input: "hello", sourceContextDigest: "trace", selection: { allowCrossProviderFallback: true } });
  assert.deepEqual(calls, ["fast", "backup"]);
  assert.equal(result.provider.id, "backup");
  assert.equal(result.fallbackUsed, true);
});

test("cross-provider fallback requires explicit authority", async () => {
  const calls = [];
  const adapters = new ProviderAdapterRegistry({ adapters: [
    { id: "fake-fast", adapter: { invoke: async () => { calls.push("fast"); throw new ProviderInvocationError("rate_limited", "limited"); } } },
    { id: "fake-backup", adapter: { invoke: async () => { calls.push("backup"); return { result: { text: "must not run" }, receipt: {} }; } } }
  ] });
  const router = new ModelRouter({ providerRegistry: registry(), adapterRegistry: adapters });
  await assert.rejects(() => router.invoke({ runId: "run", sessionId: "session", generation: 1, idempotencyKey: "key", input: "hello", sourceContextDigest: "trace" }), error => error.failureClass === "rate_limited");
  assert.deepEqual(calls, ["fast"]);
});

test("router aborts a stalled adapter at its local deadline", async () => {
  const adapters = new ProviderAdapterRegistry({ adapters: [
    { id: "fake-fast", adapter: { invoke: async (_plan, { signal }) => new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })) } },
    { id: "fake-backup", adapter: { invoke: async () => ({ result: { text: "must not run" }, receipt: {} }) } }
  ] });
  const router = new ModelRouter({ providerRegistry: registry(), adapterRegistry: adapters });
  await assert.rejects(() => router.invoke({ runId: "run", sessionId: "session", generation: 1, idempotencyKey: "key", input: "hello", sourceContextDigest: "trace", timeoutMs: 15 }), error => error.failureClass === "provider_timeout");
});

test("provider failure updates redacted health status for user-safe recovery", async () => {
  const registryInstance = registry();
  const adapters = new ProviderAdapterRegistry({ adapters: [
    { id: "fake-fast", adapter: { invoke: async () => { throw new ProviderInvocationError("rate_limited", "limited", { cooldownMs: 1234 }); } } },
    { id: "fake-backup", adapter: { invoke: async () => ({ result: { text: "must not run" }, receipt: {} }) } }
  ] });
  const router = new ModelRouter({ providerRegistry: registryInstance, adapterRegistry: adapters });
  await assert.rejects(() => router.invoke({ runId: "run", sessionId: "session", generation: 1, idempotencyKey: "key", input: "hello", sourceContextDigest: "trace" }), error => error.failureClass === "rate_limited");
  const provider = registryInstance.get("fast");
  assert.equal(provider.health.state, "cooldown");
  assert.equal(provider.health.failureClass, "rate_limited");
  assert.ok(provider.health.cooldownUntil > Date.now());
});

test("explicit user model selection never silently falls back", async () => {
  const adapters = new ProviderAdapterRegistry({ adapters: [
    { id: "fake-fast", adapter: { invoke: async () => { const error = new Error("limited"); error.failureClass = "rate_limited"; error.retryable = true; error.externalEffect = false; throw error; } } },
    { id: "fake-backup", adapter: { invoke: async () => ({ result: { text: "must not run" }, receipt: {} }) } }
  ] });
  const router = new ModelRouter({ providerRegistry: registry(), adapterRegistry: adapters });
  await assert.rejects(() => router.invoke({ runId: "run", sessionId: "session", generation: 1, idempotencyKey: "key", input: "hello", sourceContextDigest: "trace", selection: { preferredProviderId: "fast", preferredModelId: "fast-1" } }), error => error.failures.length === 1);
});

test("explicit unavailable model selection is blocked instead of falling through to another provider", async () => {
  const calls = [];
  const adapters = new ProviderAdapterRegistry({ adapters: [
    { id: "fake-fast", adapter: { invoke: async () => { calls.push("fast"); return { result: { text: "must not run" }, receipt: {} }; } } },
    { id: "fake-backup", adapter: { invoke: async () => { calls.push("backup"); return { result: { text: "must not run" }, receipt: {} }; } } }
  ] });
  const router = new ModelRouter({ providerRegistry: registry(), adapterRegistry: adapters });
  await assert.rejects(() => router.invoke({ runId: "run", sessionId: "session", generation: 1, idempotencyKey: "key", input: "hello", sourceContextDigest: "trace", selection: { providerId: "fast", modelId: "missing-model" } }), error => error.failureClass === "invalid_request");
  assert.deepEqual(calls, []);
});

test("model router admits and settles the optional provider route health policy", async () => {
  let now = 1_000;
  const health = new ProviderRouteHealth({ now: () => now });
  const adapters = new ProviderAdapterRegistry({ adapters: [
    { id: "fake-fast", adapter: { invoke: async () => { now += 17; return { result: { text: "healthy answer" }, receipt: {} }; } } },
    { id: "fake-backup", adapter: { invoke: async () => ({ result: { text: "must not run" }, receipt: {} }) } }
  ] });
  const router = new ModelRouter({ providerRegistry: registry(), adapterRegistry: adapters, routeHealth: health });
  const result = await router.invoke({ runId: "run", sessionId: "session", generation: 1, idempotencyKey: "key", input: "hello", sourceContextDigest: "trace" });
  assert.equal(result.routeHealthReceipt.outcome, "succeeded");
  assert.equal(result.routeHealthReceipt.latencyMs, 17);
  assert.equal(health.snapshot("fast").inFlight, 0);
});

test("model router refuses a provider route health admission before external invocation", async () => {
  const health = new ProviderRouteHealth({ policy: { maxConcurrent: 1 } });
  const held = health.admit({ providerId: "fast" });
  const calls = [];
  const adapters = new ProviderAdapterRegistry({ adapters: [
    { id: "fake-fast", adapter: { invoke: async () => { calls.push("fast"); return { result: { text: "must not run" }, receipt: {} }; } } },
    { id: "fake-backup", adapter: { invoke: async () => { calls.push("backup"); return { result: { text: "must not run" }, receipt: {} }; } } }
  ] });
  const router = new ModelRouter({ providerRegistry: registry(), adapterRegistry: adapters, routeHealth: health });
  await assert.rejects(() => router.invoke({ runId: "run", sessionId: "session", generation: 1, idempotencyKey: "key", input: "hello", sourceContextDigest: "trace", selection: { preferredProviderId: "fast", preferredModelId: "fast-1" } }), error => error.failureClass === "provider_unavailable" && error.details.routeHealthReason === "provider_concurrency_limited");
  assert.deepEqual(calls, []);
  health.settle({ lease: held.lease, outcome: { ok: true } });
});

test("model router settles retry-after failures and never falls back after an unknown external outcome", async () => {
  const health = new ProviderRouteHealth();
  const calls = [];
  const adapters = new ProviderAdapterRegistry({ adapters: [
    { id: "fake-fast", adapter: { invoke: async () => { calls.push("fast"); throw new ProviderInvocationError("external_outcome_unknown", "unknown outcome", { retryAfterSeconds: 2 }); } } },
    { id: "fake-backup", adapter: { invoke: async () => { calls.push("backup"); return { result: { text: "must not run" }, receipt: {} }; } } }
  ] });
  const router = new ModelRouter({ providerRegistry: registry(), adapterRegistry: adapters, routeHealth: health });
  await assert.rejects(() => router.invoke({ runId: "run", sessionId: "session", generation: 1, idempotencyKey: "key", input: "hello", sourceContextDigest: "trace", selection: { allowCrossProviderFallback: true } }), error => error.failureClass === "external_outcome_unknown" && error.failures[0].routeHealthReceipt.outcome === "failed");
  assert.deepEqual(calls, ["fast"]);
  assert.equal(health.snapshot("fast").inFlight, 0);
});

test("OpenAI and Anthropic adapters map official response envelopes without exposing credentials", async () => {
  const openai = new OpenAiResponsesAdapter({ baseUrl: "https://provider.test/v1", fetchImpl: async (_url, init) => {
    assert.match(init.headers.authorization, /^Bearer /);
    return new Response(JSON.stringify({ id: "resp_1", output_text: "OpenAI answer" }), { status: 200 });
  } });
  const anthropic = new AnthropicMessagesAdapter({ baseUrl: "https://provider.test", fetchImpl: async (_url, init) => {
    assert.ok(init.headers["x-api-key"]);
    return new Response(JSON.stringify({ id: "msg_1", stop_reason: "end_turn", content: [{ type: "text", text: "Anthropic answer" }] }), { status: 200 });
  } });
  const plan = { runId: "run", sessionId: "session", generation: 1, providerId: "provider", modelId: "model", responseBudget: 32 };
  assert.equal((await openai.invoke(plan, { input: "hello", credential: "private-key" })).result.text, "OpenAI answer");
  assert.equal((await anthropic.invoke(plan, { input: "hello", credential: "private-key" })).result.text, "Anthropic answer");
});

test("Gemini adapter maps generateContent output without exposing its credential", async () => {
  const gemini = new GeminiGenerateContentAdapter({ baseUrl: "https://provider.test/v1beta", fetchImpl: async (url, init) => {
    assert.match(url, /:generateContent$/);
    assert.doesNotMatch(url, /key=/);
    assert.equal(init.headers["x-goog-api-key"], "private-gemini-key");
    assert.deepEqual(JSON.parse(init.body), { contents: [{ role: "user", parts: [{ text: "hello" }] }], generationConfig: { candidateCount: 1, maxOutputTokens: 32 } });
    return new Response(JSON.stringify({ responseId: "gemini_1", modelVersion: "test-version", usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2, totalTokenCount: 5 }, candidates: [{ finishReason: "STOP", content: { parts: [{ text: "Gemini answer" }, { inlineData: {} }] } }, { content: { parts: [{ text: "must not join" }] } }] }), { status: 200 });
  } });
  const plan = { runId: "run", sessionId: "session", generation: 1, providerId: "google-gemini", modelId: "gemini-test", responseBudget: 32 };
  const result = await gemini.invoke(plan, { input: "hello", credential: "private-gemini-key" });
  assert.equal(result.result.text, "Gemini answer");
  assert.equal(result.receipt.providerResponseId, "gemini_1");
  assert.equal(result.receipt.stopReason, "STOP");
  assert.deepEqual(result.receipt.usage, { promptTokens: 3, outputTokens: 2, totalTokens: 5 });
});
