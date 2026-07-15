import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createHttpServer } from "../src/core/http.js";
import { NativeRuntime } from "../src/core/runtime.js";
import { ProviderRegistry } from "../src/core/provider.js";
import { ProviderAdapterRegistry } from "../src/core/model-router.js";
import { ProtectedConnectionClient, PROTECTED_CONNECTION_SCHEMA } from "../src/core/protected-connection.js";

const SENTINEL_SECRET = "f2-browser-secret-must-not-cross";

function tempState() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-f2-connection-http-"));
}

function providerRegistry() {
  return new ProviderRegistry({ entries: [{
    id: "openai",
    adapter: "protected-test",
    priority: 1,
    display: { name: "OpenAI", authMethods: ["api_key", "oauth"], description: "test" },
    auth: { kind: "keychain", credentialPresent: false },
    health: { state: "unknown" },
    models: [{ id: "gpt-protected", priority: 1, capabilities: ["text"], inputModalities: ["text"], outputModalities: ["text"] }]
  }] });
}

function protectedClient() {
  const requests = [];
  const stateByReference = new Map();
  let invocations = 0;
  const client = new ProtectedConnectionClient({ transport: {
    async send(request, { signal }) {
      requests.push(structuredClone(request));
      assert.equal(JSON.stringify(request).includes(SENTINEL_SECRET), false);
      if (request.operation === "connection.begin") {
        const credentialRef = `ref-${request.authMethod}`;
        stateByReference.set(credentialRef, "connected");
        return {
          schema: PROTECTED_CONNECTION_SCHEMA, operation: request.operation, requestId: request.requestId,
          credentialRef, authMethod: request.authMethod, state: "connected", models: ["gpt-protected"]
        };
      }
      if (request.operation === "connection.status" || request.operation === "connection.revoke") {
        const state = request.operation === "connection.revoke" ? "revoked" : stateByReference.get(request.credentialRef);
        if (request.operation === "connection.revoke") stateByReference.set(request.credentialRef, state);
        return {
          schema: PROTECTED_CONNECTION_SCHEMA, operation: request.operation, requestId: request.requestId,
          credentialRef: request.credentialRef, authMethod: request.credentialRef.endsWith("oauth") ? "oauth" : "api_key", state, models: ["gpt-protected"]
        };
      }
      invocations += 1;
      if (request.input?.message === "unknown") {
        await new Promise(resolve => signal.addEventListener("abort", resolve, { once: true }));
        return {};
      }
      return {
        schema: PROTECTED_CONNECTION_SCHEMA, operation: request.operation, requestId: request.requestId, operationId: request.requestId,
        state: "completed", result: { text: "protected response", usage: 2 },
        receipt: { providerId: request.providerId, modelId: request.modelId, outcome: "completed" }
      };
    }
  } });
  return { client, requests, get invocations() { return invocations; } };
}

async function startRuntime() {
  const bridge = protectedClient();
  const runtime = await new NativeRuntime({
    stateDir: tempState(),
    providerRegistry: providerRegistry(),
    providerAdapters: new ProviderAdapterRegistry(),
    protectedConnectionClient: bridge.client
  }).start();
  const { server } = createHttpServer(runtime, { port: 0 });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { runtime, server, base: `http://127.0.0.1:${server.address().port}`, bridge };
}

test("F2 HTTP qualification keeps API key and OAuth equal, blocks browser secrets, and records bounded protected work", async () => {
  const fixture = await startRuntime();
  try {
    const dashboard = await fetch(`${fixture.base}/`);
    const cookie = dashboard.headers.get("set-cookie");
    const headers = { cookie, origin: fixture.base, "content-type": "application/json" };

    const rejected = await fetch(`${fixture.base}/v1/connections/openai`, {
      method: "POST", headers, body: JSON.stringify({ authMethod: "api_key", secret: SENTINEL_SECRET })
    });
    assert.equal(rejected.status, 400);
    assert.equal((await rejected.json()).code, "protected_connection_secret_forbidden");
    assert.equal(fixture.bridge.requests.length, 0);

    const startedAt = performance.now();
    const apiKey = await fetch(`${fixture.base}/v1/connections/openai`, {
      method: "POST", headers, body: JSON.stringify({ authMethod: "api_key" })
    }).then(response => response.json());
    const apiElapsedMs = performance.now() - startedAt;
    assert.ok(apiElapsedMs < 1_000, `API-key connection overhead must stay bounded, got ${apiElapsedMs}ms`);
    assert.equal(apiKey.connection.state, "ready");
    assert.equal("credentialRef" in apiKey.connection, false);

    const apiRefresh = await fetch(`${fixture.base}/v1/connections/openai/refresh`, { method: "POST", headers }).then(response => response.json());
    assert.equal(apiRefresh.connection.state, "ready");
    const apiRevoked = await fetch(`${fixture.base}/v1/connections/openai`, { method: "DELETE", headers }).then(response => response.json());
    assert.equal(apiRevoked.connection.state, "not_configured");

    const oauth = await fetch(`${fixture.base}/v1/connections/openai`, {
      method: "POST", headers, body: JSON.stringify({ authMethod: "oauth" })
    }).then(response => response.json());
    assert.deepEqual(Object.keys(apiKey.connection).sort(), Object.keys(oauth.connection).sort());
    assert.equal(oauth.connection.state, "ready");
    const oauthRefresh = await fetch(`${fixture.base}/v1/connections/openai/refresh`, { method: "POST", headers }).then(response => response.json());
    assert.equal(oauthRefresh.connection.state, "ready");
    const oauthRevoked = await fetch(`${fixture.base}/v1/connections/openai`, { method: "DELETE", headers }).then(response => response.json());
    assert.equal(oauthRevoked.connection.state, "not_configured");

    const unknown = await fixture.bridge.client.provider.invoke({
      requestId: "unknown-once", credentialRef: "ref-oauth", providerId: "openai", modelId: "gpt-protected",
      input: { message: "unknown" }, deadline: Date.now() + 5
    }).catch(error => error);
    assert.equal(unknown.code, "protected_connection_outcome_unknown");
    assert.equal(unknown.details.retry, "manual_review_required");
    assert.equal(fixture.bridge.requests.filter(request => request.requestId === "unknown-once").length, 1);
    assert.equal(JSON.stringify({ apiKey, apiRefresh, apiRevoked, oauth, oauthRefresh, oauthRevoked, requests: fixture.bridge.requests }).includes(SENTINEL_SECRET), false);
  } finally {
    await new Promise(resolve => fixture.server.close(resolve));
    await fixture.runtime.stop();
  }
});
