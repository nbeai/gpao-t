import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NativeRuntime } from "../src/core/runtime.js";
import { ProviderRegistry } from "../src/core/provider.js";
import { ProviderAdapterRegistry } from "../src/core/model-router.js";
import { SecureConnectionAgent } from "../src/core/secure-connection-agent.js";

function tempState() { return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-f2-agent-runtime-")); }

test("F2 secure agent transport completes a protected OS turn without exposing the acquisition boundary", async () => {
  const secureConnectionAgent = new SecureConnectionAgent({ backend: {
    async begin({ providerId, authMethod }) { return { credentialRef: "native-openai-ref", authMethod, state: "connected", models: ["gpt-native"] }; },
    async status({ credentialRef }) { return { credentialRef, authMethod: "oauth", state: "connected", models: ["gpt-native"] }; },
    async revoke({ credentialRef }) { return { credentialRef, authMethod: "oauth", state: "revoked", models: ["gpt-native"] }; },
    async invoke({ providerId, modelId }) { return { result: { text: "native secure response" }, receipt: { providerId, modelId, outcome: "completed" } }; }
  } });
  const providerRegistry = new ProviderRegistry({ entries: [{
    id: "openai", adapter: "secure-agent", priority: 1,
    display: { name: "OpenAI", authMethods: ["api_key", "oauth"], description: "test" },
    auth: { kind: "keychain", credentialPresent: false }, health: { state: "unknown" },
    models: [{ id: "gpt-native", priority: 1, capabilities: ["text"], inputModalities: ["text"], outputModalities: ["text"] }]
  }] });
  const runtime = await new NativeRuntime({ stateDir: tempState(), providerRegistry, providerAdapters: new ProviderAdapterRegistry(), secureConnectionAgent }).start();
  try {
    await runtime.beginProviderConnection({ providerId: "openai", authMethod: "oauth" });
    await runtime.setDefaultModelSelection({ providerId: "openai", modelId: "gpt-native" });
    const result = await runtime.runOsTurn({ principalId: "owner:agent", sessionId: "agent-session", requestId: "agent-turn", input: "안전한 연결" });
    assert.equal(result.replyMode, "provider_response");
    assert.equal(result.turn.receipt.result.echo, "native secure response");
    assert.equal(JSON.stringify(result).includes("native-openai-ref"), false);
  } finally { await runtime.stop(); }
});
