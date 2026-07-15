import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NativeRuntime } from "../src/core/runtime.js";
import { MacOSNativeConnectionBackend } from "../src/core/macos-native-connection-backend.js";
import { SecureConnectionAgent } from "../src/core/secure-connection-agent.js";
import { MacOSProviderConnectionBackend } from "../src/core/macos-provider-connection-backend.js";
import { SecureConnectionProcessClient } from "../src/core/secure-connection-process-client.js";
import { OllamaLocalAdapter } from "../src/core/providers/ollama-local.js";

function stateDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-f2-native-backend-"));
}

function fakeCodex({ connected = true } = {}) {
  const calls = [];
  return {
    calls,
    async checkConnection() {
      calls.push({ operation: "check" });
      if (!connected) {
        const error = new Error("login required");
        error.code = "auth_required";
        throw error;
      }
      return { state: "ready" };
    },
    async invoke(plan, { input, signal }) {
      calls.push({ operation: "invoke", plan: structuredClone(plan), input, aborted: Boolean(signal?.aborted) });
      return { result: { text: `OAuth answer: ${input}` }, receipt: { ignored: "not exported" } };
    }
  };
}

test("macOS native backend treats the existing ChatGPT/Codex OAuth session as an opaque protected connection", async () => {
  const codex = fakeCodex();
  const backend = new MacOSNativeConnectionBackend({ codexAdapter: codex, models: ["gpt-5.5"], now: () => 100 });
  const agent = new SecureConnectionAgent({ backend, now: () => 10 });

  const opened = await agent.begin({ requestId: "open-1", providerId: "codex-oauth", authMethod: "oauth", deadline: 1000 });
  assert.deepEqual(opened, {
    schema: "gpao_t3.secure_connection_agent.v1",
    requestId: "open-1",
    credentialRef: "oauth:codex-oauth",
    authMethod: "oauth",
    state: "connected",
    models: ["gpt-5.5"]
  });
  const response = await agent.invoke({ requestId: "invoke-1", credentialRef: opened.credentialRef, providerId: "codex-oauth", modelId: "gpt-5.5", input: { message: "safe OAuth turn" }, deadline: 1000 });
  assert.equal(response.result.text, "OAuth answer: safe OAuth turn");
  assert.deepEqual(response.receipt, { providerId: "codex-oauth", modelId: "gpt-5.5", outcome: "completed", startedAt: 100, finishedAt: 100 });
  assert.doesNotMatch(JSON.stringify(response), /token|secret|authorization/i);

  const revoked = await agent.revoke({ requestId: "revoke-1", credentialRef: opened.credentialRef, deadline: 1000 });
  assert.equal(revoked.state, "revoked");
  assert.equal(codex.calls.filter(call => call.operation === "invoke").length, 1);
});

test("macOS native backend maps a missing Codex login to a recoverable account state", async () => {
  const backend = new MacOSNativeConnectionBackend({ codexAdapter: fakeCodex({ connected: false }) });
  const agent = new SecureConnectionAgent({ backend, now: () => 10 });
  await assert.rejects(
    () => agent.begin({ requestId: "open-2", providerId: "codex-oauth", authMethod: "oauth", deadline: 1000 }),
    error => error.code === "auth_required"
  );
  const status = await agent.status({ requestId: "status-2", credentialRef: "oauth:codex-oauth", deadline: 1000 });
  assert.equal(status.state, "auth_required");
});

test("a protected native OAuth connection completes a fresh OS turn without exposing its opaque reference", async () => {
  const runtime = await new NativeRuntime({
    stateDir: stateDir(),
    secureConnectionAgent: new SecureConnectionAgent({ backend: new MacOSNativeConnectionBackend({ codexAdapter: fakeCodex() }) })
  }).start();
  try {
    await runtime.beginProviderConnection({ providerId: "codex-oauth", authMethod: "oauth" });
    await runtime.setDefaultModelSelection({ providerId: "codex-oauth", modelId: "gpt-5.5" });
    const turn = await runtime.runOsTurn({ principalId: "owner:local", sessionId: "oauth-session", requestId: "fresh-oauth-turn", input: "한 문장으로 연결 상태를 알려줘." });
    assert.equal(turn.replyMode, "provider_response");
    assert.equal(turn.turn.status, "succeeded");
    assert.equal(turn.turn.receipt.result.kind, "provider_projected_result");
    assert.match(turn.turn.receipt.result.text, /^OAuth answer:/);
    assert.match(turn.turn.receipt.result.echo, /^OAuth answer:/);
    assert.equal(turn.turn.receipt.result.providerReceipt.providerId, "codex-oauth");
    const events = await runtime.replayTurnEvents({ principalId: "owner:local", commandId: turn.submitted.commandId });
    assert.equal(events.terminal.payload.providerReceipt.providerId, "codex-oauth");
    assert.doesNotMatch(JSON.stringify(turn), /oauth:codex-oauth/);
  } finally {
    await runtime.stop();
  }
});

function fakeProtectedApiBoundary() {
  const secrets = new Map();
  const calls = [];
  return {
    calls,
    acquirer: { async acquire({ providerId }) { calls.push({ operation: "acquire", providerId }); return `fixture-${providerId}-credential`; } },
    store: {
      async save({ providerId, secret }) { calls.push({ operation: "save", providerId, via: "protected-store" }); secrets.set(providerId, secret); return { handle: `keychain:${providerId}` }; },
      async has(handle, providerId) { return handle === `keychain:${providerId}` && secrets.has(providerId); },
      async withCredential(handle, providerId, fn) { if (!secrets.has(providerId)) throw new Error("missing"); return fn(secrets.get(providerId)); },
      async remove(handle, providerId) { return secrets.delete(providerId); }
    },
    adapters: new Map(["openai", "anthropic", "google-gemini"].map(providerId => [providerId, {
      async invoke(plan, { input, credential }) {
        calls.push({ operation: "invoke", providerId, modelId: plan.modelId, credentialUsedInsideBoundary: credential.startsWith("fixture-") });
        return { result: { text: `${providerId}: ${input}` } };
      }
    }]))
  };
}

test("macOS provider backend gives OpenAI Anthropic and Gemini the same protected API-key lifecycle", async () => {
  const boundary = fakeProtectedApiBoundary();
  const backend = new MacOSProviderConnectionBackend({ credentialStore: boundary.store, acquirer: boundary.acquirer, adapters: boundary.adapters, now: () => 100 });
  const agent = new SecureConnectionAgent({ backend, now: () => 10 });
  const models = { openai: "gpt-5.6", anthropic: "claude-sonnet-4-20250514", "google-gemini": "gemini-3.5-flash" };
  for (const [providerId, modelId] of Object.entries(models)) {
    const opened = await agent.begin({ requestId: `open-${providerId}`, providerId, authMethod: "api_key", deadline: 1000 });
    assert.equal(opened.credentialRef, `keychain:${providerId}`);
    assert.equal(opened.state, "connected");
    const answer = await agent.invoke({ requestId: `turn-${providerId}`, credentialRef: opened.credentialRef, providerId, modelId, input: { message: "hello" }, deadline: 1000 });
    assert.equal(answer.result.text, `${providerId}: hello`);
    assert.doesNotMatch(JSON.stringify({ opened, answer }), /fixture-.*-credential/);
    assert.equal((await agent.revoke({ requestId: `revoke-${providerId}`, credentialRef: opened.credentialRef, deadline: 1000 })).state, "revoked");
    assert.equal((await agent.status({ requestId: `status-${providerId}`, credentialRef: opened.credentialRef, deadline: 1000 })).state, "auth_required");
  }
  assert.equal(boundary.calls.filter(call => call.operation === "acquire").length, 3);
  assert.ok(boundary.calls.filter(call => call.operation === "invoke").every(call => call.credentialUsedInsideBoundary));
});

test("API provider discovery replaces stale defaults before the first protected invocation", async () => {
  const boundary = fakeProtectedApiBoundary();
  boundary.adapters.set("anthropic", {
    async checkConnection({ credential }) {
      assert.match(credential, /^fixture-anthropic-/);
      return { state: "ready", models: ["claude-current-account-model"] };
    },
    async invoke(plan, { input }) {
      return { result: { text: `${plan.modelId}: ${input}` } };
    }
  });
  const agent = new SecureConnectionAgent({ backend: new MacOSProviderConnectionBackend({ credentialStore: boundary.store, acquirer: boundary.acquirer, adapters: boundary.adapters }), now: () => 10 });
  const opened = await agent.begin({ requestId: "open-discovered-anthropic", providerId: "anthropic", authMethod: "api_key", deadline: 1000 });
  assert.deepEqual(opened.models, ["claude-current-account-model"]);
  const answer = await agent.invoke({ requestId: "turn-discovered-anthropic", credentialRef: opened.credentialRef, providerId: "anthropic", modelId: opened.models[0], input: { message: "hello" }, deadline: 1000 });
  assert.equal(answer.result.text, "claude-current-account-model: hello");
});

test("local model uses the same connection contract without credential acquisition", async () => {
  const boundary = fakeProtectedApiBoundary();
  const agent = new SecureConnectionAgent({ backend: new MacOSProviderConnectionBackend({ credentialStore: boundary.store, acquirer: boundary.acquirer, adapters: boundary.adapters }), now: () => 10 });
  const opened = await agent.begin({ requestId: "open-local", providerId: "local-model", authMethod: "local", deadline: 1000 });
  const answer = await agent.invoke({ requestId: "turn-local", credentialRef: opened.credentialRef, providerId: "local-model", modelId: "deterministic-echo", input: { message: "local hello" }, deadline: 1000 });
  assert.equal(opened.state, "connected");
  assert.equal(answer.result.text, "local hello");
  assert.equal(boundary.calls.some(call => call.operation === "acquire"), false);
});

test("Ollama discovers installed models and invokes one through the protected local contract", async () => {
  const requests = [];
  const ollama = new OllamaLocalAdapter({
    fetchImpl: async (url, options = {}) => {
      requests.push({ url, options });
      if (url.endsWith("/api/tags")) {
        return new Response(JSON.stringify({ models: [{ name: "qwen3:8b" }, { model: "gemma3:4b" }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ message: { content: "local Ollama answer" } }), { status: 200 });
    }
  });
  const boundary = fakeProtectedApiBoundary();
  boundary.adapters.set("local-ollama", ollama);
  const backend = new MacOSProviderConnectionBackend({ credentialStore: boundary.store, acquirer: boundary.acquirer, adapters: boundary.adapters, now: () => 100 });
  const agent = new SecureConnectionAgent({ backend, now: () => 10 });

  const opened = await agent.begin({ requestId: "open-ollama", providerId: "local-ollama", authMethod: "local", deadline: 1000 });
  assert.deepEqual(opened.models, ["qwen3:8b", "gemma3:4b"]);
  const answer = await agent.invoke({ requestId: "turn-ollama", credentialRef: opened.credentialRef, providerId: "local-ollama", modelId: "qwen3:8b", input: { message: "hello local model" }, deadline: 1000 });
  assert.equal(answer.result.text, "local Ollama answer");
  assert.equal(JSON.parse(requests[1].options.body).model, "qwen3:8b");
  assert.equal(boundary.calls.some(call => call.operation === "acquire"), false);
});

test("Ollama model discovery replaces the pending catalog model in the runtime registry", async () => {
  const boundary = fakeProtectedApiBoundary();
  boundary.adapters.set("local-ollama", new OllamaLocalAdapter({
    fetchImpl: async () => new Response(JSON.stringify({ models: [{ name: "llama3.2:3b" }] }), { status: 200 })
  }));
  const runtime = await new NativeRuntime({
    stateDir: stateDir(),
    secureConnectionAgent: new SecureConnectionAgent({ backend: new MacOSProviderConnectionBackend({ credentialStore: boundary.store, acquirer: boundary.acquirer, adapters: boundary.adapters }) })
  }).start();
  try {
    await runtime.beginProviderConnection({ providerId: "local-ollama", authMethod: "local" });
    const provider = runtime.providerStatus().providers.find(entry => entry.id === "local-ollama");
    assert.equal(provider.auth.state, "configured");
    assert.equal(provider.health.state, "ready");
    assert.deepEqual(provider.models.map(model => model.id), ["llama3.2:3b"]);
  } finally { await runtime.stop(); }
});

test("Ollama unavailability is recoverable and its endpoint is restricted to loopback", async () => {
  const unavailable = new OllamaLocalAdapter({ fetchImpl: async () => { throw new Error("not running"); } });
  const boundary = fakeProtectedApiBoundary();
  boundary.adapters.set("local-ollama", unavailable);
  const agent = new SecureConnectionAgent({ backend: new MacOSProviderConnectionBackend({ credentialStore: boundary.store, acquirer: boundary.acquirer, adapters: boundary.adapters }), now: () => 10 });
  await assert.rejects(
    () => agent.begin({ requestId: "open-missing-ollama", providerId: "local-ollama", authMethod: "local", deadline: 1000 }),
    error => error.code === "provider_unavailable"
  );
  assert.throws(() => new OllamaLocalAdapter({ baseUrl: "https://example.com" }), /loopback HTTP URL/);
  assert.throws(() => new OllamaLocalAdapter({ baseUrl: "http://127.0.0.1:11434?redirect=1" }), /loopback HTTP URL/);
});

test("secure connection process keeps local connection and invocation behind IPC", async () => {
  const client = await new SecureConnectionProcessClient().start();
  try {
    const opened = await client.begin({ requestId: "process-open", providerId: "local-model", authMethod: "local", deadline: Date.now() + 5_000 });
    assert.equal(opened.state, "connected");
    assert.equal(opened.credentialRef, "local:local-model");
    const answer = await client.invoke({ requestId: "process-turn", credentialRef: opened.credentialRef, providerId: "local-model", modelId: "deterministic-echo", input: { message: "isolated local" }, deadline: Date.now() + 5_000 });
    assert.equal(answer.result.text, "isolated local");
    assert.equal(answer.receipt.providerId, "local-model");
  } finally { await client.stop(); }
});
