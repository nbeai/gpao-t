import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NativeRuntime } from "../src/core/runtime.js";
import { ProviderRegistry } from "../src/core/provider.js";
import { ProviderAdapterRegistry } from "../src/core/model-router.js";
import { ProtectedConnectionClient, PROTECTED_CONNECTION_SCHEMA } from "../src/core/protected-connection.js";

function tempState() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-f2-runtime-"));
}

function protectedClient() {
  const requests = [];
  return {
    requests,
    client: new ProtectedConnectionClient({
      transport: {
        async send(request) {
          requests.push(structuredClone(request));
          if (request.operation === "connection.begin" || request.operation === "connection.status") {
            return {
              schema: PROTECTED_CONNECTION_SCHEMA,
              operation: request.operation,
              requestId: request.requestId,
              credentialRef: "f2-openai-ref",
              authMethod: "api_key",
              state: "connected",
              models: ["gpt-protected"]
            };
          }
          if (request.operation === "connection.revoke") {
            return {
              schema: PROTECTED_CONNECTION_SCHEMA,
              operation: request.operation,
              requestId: request.requestId,
              credentialRef: request.credentialRef,
              authMethod: "api_key",
              state: "revoked",
              models: ["gpt-protected"]
            };
          }
          return {
            schema: PROTECTED_CONNECTION_SCHEMA,
            operation: "provider.invoke",
            requestId: request.requestId,
            operationId: request.requestId,
            state: "completed",
            result: { text: "보호된 GPAO-T3 응답", usage: 4 },
            receipt: { providerId: request.providerId, modelId: request.modelId, outcome: "completed" }
          };
        }
      }
    })
  };
}

test("F2 protected connection completes one real OS turn without secret material entering runtime state", async () => {
  const bridge = protectedClient();
  const providerRegistry = new ProviderRegistry({ entries: [{
    id: "openai", adapter: "protected-test", priority: 1,
    display: { name: "OpenAI", authMethods: ["api_key", "oauth"], description: "test" },
    auth: { kind: "keychain", credentialPresent: false },
    health: { state: "unknown" },
    models: [{ id: "gpt-protected", priority: 1, capabilities: ["text"], inputModalities: ["text"], outputModalities: ["text"] }]
  }] });
  const runtime = await new NativeRuntime({
    stateDir: tempState(), providerRegistry, providerAdapters: new ProviderAdapterRegistry(), protectedConnectionClient: bridge.client
  }).start();
  try {
    const connection = await runtime.beginProviderConnection({ providerId: "openai", authMethod: "api_key" });
    assert.equal(connection.state, "ready");
    await runtime.setDefaultModelSelection({ providerId: "openai", modelId: "gpt-protected" });
    const result = await runtime.runOsTurn({ principalId: "owner:f2", sessionId: "f2-session", requestId: "f2-turn", input: "연결 테스트" });
    assert.equal(result.replyMode, "provider_response");
    assert.equal(result.turn.status, "succeeded");
    assert.equal(result.turn.receipt.result.kind, "provider_projected_result");
    assert.equal(result.turn.receipt.result.text, "보호된 GPAO-T3 응답");
    assert.equal(result.turn.receipt.result.echo, "보호된 GPAO-T3 응답");
    assert.equal(result.turn.receipt.result.providerReceipt.providerId, "openai");
    assert.equal(result.providerReceipt.outcome, "completed");
    const events = await runtime.replayTurnEvents({ principalId: "owner:f2", commandId: result.submitted.commandId });
    assert.equal(events.terminal.payload.kind, "provider_projected_result");
    assert.equal(events.terminal.payload.providerReceipt.outcome, "completed");
    assert.equal(bridge.requests.filter(request => request.operation === "provider.invoke").length, 1);
    assert.equal(JSON.stringify({ result, requests: bridge.requests }).includes("F2-SENTINEL-SECRET"), false);
    assert.equal(JSON.stringify(result).includes("credentialRef"), false);
  } finally {
    await runtime.stop();
  }
});
