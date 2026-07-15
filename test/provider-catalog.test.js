import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NativeRuntime } from "../src/core/runtime.js";

function stateDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-provider-catalog-")); }

test("environment-backed provider configuration enters the standard OS turn without exposing its credential", async () => {
  const credential = "catalog-test-secret-must-not-appear";
  const calls = [];
  const runtime = await new NativeRuntime({
    stateDir: stateDir(),
    providerEnvironment: {
      GPAO_T_OPENAI_API_KEY: credential,
      GPAO_T_OPENAI_MODEL: "test-openai-model"
    },
    providerFetch: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ id: "mock-response", output_text: "mocked provider answer" }), { status: 200, headers: { "content-type": "application/json" } });
    }
  }).start();
  try {
    const result = await runtime.runOsTurn({ principalId: "owner:test", sessionId: "catalog-session", requestId: "catalog-turn", input: "Use configured provider" });
    assert.equal(result.turn.status, "succeeded");
    assert.equal(result.replyMode, "provider_response");
    assert.equal(result.providerRoute.providerId, "openai");
    assert.equal(result.providerRoute.modelId, "test-openai-model");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.openai.com/v1/responses");
    assert.equal(calls[0].options.headers.authorization, `Bearer ${credential}`);
    const publicStatus = JSON.stringify(runtime.providerStatus());
    assert.doesNotMatch(publicStatus, new RegExp(credential));
    assert.doesNotMatch(JSON.stringify(result), new RegExp(credential));
  } finally {
    await runtime.stop();
  }
});

test("unconfigured external providers remain visible as connection-required while the local fallback stays ready", async () => {
  const runtime = await new NativeRuntime({ stateDir: stateDir(), providerEnvironment: {} }).start();
  try {
    const providers = runtime.providerStatus().providers;
    assert.equal(providers.find(provider => provider.id === "openai").auth.state, "auth_required");
    assert.equal(providers.find(provider => provider.id === "anthropic").auth.state, "auth_required");
    assert.equal(providers.find(provider => provider.id === "gpao-t-emulator").health.state, "ready");
  } finally {
    await runtime.stop();
  }
});

test("concurrent duplicate OS requests share one external provider invocation", async () => {
  let calls = 0;
  const runtime = await new NativeRuntime({
    stateDir: stateDir(),
    providerEnvironment: { GPAO_T_OPENAI_API_KEY: "duplicate-test-secret" },
    providerFetch: async () => {
      calls += 1;
      await new Promise(resolve => setTimeout(resolve, 20));
      return new Response(JSON.stringify({ id: "single-response", output_text: "single answer" }), { status: 200 });
    }
  }).start();
  try {
    const input = { principalId: "owner:test", sessionId: "duplicate-session", requestId: "duplicate-request", input: "only invoke once" };
    const [first, second] = await Promise.all([runtime.runOsTurn(input), runtime.runOsTurn(input)]);
    assert.equal(calls, 1);
    assert.equal(first.providerReceipt.providerResponseId, "single-response");
    assert.equal(second.providerReceipt.providerResponseId, "single-response");
  } finally {
    await runtime.stop();
  }
});
