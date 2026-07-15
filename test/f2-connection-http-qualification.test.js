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
import { createRepairPlan } from "../src/core/repair-plan.js";

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

function protectedClientWithConnectionStates(states) {
  const requests = [];
  let index = 0;
  const client = new ProtectedConnectionClient({ transport: {
    async send(request) {
      requests.push(structuredClone(request));
      const state = states[Math.min(index, states.length - 1)];
      if (request.operation === "connection.begin") index += 1;
      return {
        schema: PROTECTED_CONNECTION_SCHEMA,
        operation: request.operation,
        requestId: request.requestId,
        credentialRef: "ref-state",
        authMethod: request.authMethod || "oauth",
        state,
        models: ["gpt-protected"]
      };
    }
  } });
  return { client, requests };
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

test("F2 recovery matrix exposes one safe user action for blocked connection states", async () => {
  const cases = [
    { protectedState: "auth_required", expectedState: "auth_required", expectedAction: "reconnect_provider" },
    { protectedState: "expired", expectedState: "expired", expectedAction: "reconnect_provider" },
    { protectedState: "unavailable", expectedState: "provider_unavailable", expectedAction: "retry_or_view_status" },
    { protectedState: "unknown", expectedState: "provider_unavailable", expectedAction: "retry_or_view_status" }
  ];

  for (const item of cases) {
    const bridge = protectedClientWithConnectionStates([item.protectedState]);
    const runtime = await new NativeRuntime({
      stateDir: tempState(),
      providerRegistry: providerRegistry(),
      providerAdapters: new ProviderAdapterRegistry(),
      protectedConnectionClient: bridge.client
    }).start();
    try {
      const status = await runtime.beginProviderConnection({ providerId: "openai", authMethod: "oauth" });
      assert.equal(status.state, item.expectedState);
      assert.equal(status.presentation.action, item.expectedAction);
      assert.equal("credentialRef" in status, false);
      assert.equal(JSON.stringify(status).includes(SENTINEL_SECRET), false);
      assert.equal(bridge.requests.length, 1);
    } finally {
      await runtime.stop();
    }
  }

  const repairCases = [
    { code: "auth_required", state: "auth_required", action: "reconnect_provider" },
    { code: "rate_limited", state: "rate_limited", action: "wait_or_choose_alternate" },
    { code: "provider_unavailable", state: "provider_unavailable", action: "retry_or_view_status" },
    { code: "external_outcome_unknown", state: "outcome_unknown", action: "reconcile_before_retry" }
  ];
  for (const item of repairCases) {
    const plan = createRepairPlan(item.code);
    assert.equal(plan.schema, "gpao_t3.repair_plan.v1");
    assert.equal(plan.state, item.state);
    assert.equal(plan.action, item.action);
    assert.equal(JSON.stringify(plan).includes(SENTINEL_SECRET), false);
  }
});

test("F2 protected invocation cancel and timeout stay manual-review without automatic retry", async () => {
  const transportRequests = [];
  const client = new ProtectedConnectionClient({ transport: {
    async send(request, { signal }) {
      transportRequests.push(structuredClone(request));
      await new Promise(resolve => signal.addEventListener("abort", resolve, { once: true }));
      return {};
    }
  } });

  const timeout = await client.provider.invoke({
    requestId: "timeout-once",
    credentialRef: "ref-oauth",
    providerId: "openai",
    modelId: "gpt-protected",
    input: { message: "slow" },
    deadline: Date.now() + 5
  }).catch(error => error);
  assert.equal(timeout.code, "protected_connection_outcome_unknown");
  assert.equal(timeout.details.reason, "deadline_exceeded");
  assert.equal(timeout.details.retry, "manual_review_required");
  assert.equal(transportRequests.filter(request => request.requestId === "timeout-once").length, 1);

  const controller = new AbortController();
  const cancelled = client.provider.invoke({
    requestId: "cancel-once",
    credentialRef: "ref-oauth",
    providerId: "openai",
    modelId: "gpt-protected",
    input: { message: "cancel" },
    deadline: Date.now() + 1_000
  }, { signal: controller.signal }).catch(error => error);
  controller.abort();
  const cancelResult = await cancelled;
  assert.equal(cancelResult.code, "protected_connection_outcome_unknown");
  assert.equal(cancelResult.details.reason, "cancelled");
  assert.equal(cancelResult.details.retry, "manual_review_required");
  assert.equal(transportRequests.filter(request => request.requestId === "cancel-once").length, 1);
});
