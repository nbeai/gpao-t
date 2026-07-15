import assert from "node:assert/strict";
import test from "node:test";
import { ProviderInvocationError, ProviderRegistry } from "../src/core/provider.js";
import { ModelRouter, ProviderAdapterRegistry } from "../src/core/model-router.js";
import { OpenAiResponsesAdapter } from "../src/core/providers/openai-responses.js";
import { AnthropicMessagesAdapter } from "../src/core/providers/anthropic-messages.js";

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
