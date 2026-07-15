import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createHttpServer } from "../src/core/http.js";
import { NativeRuntime } from "../src/core/runtime.js";
import { ProviderInvocationError } from "../src/core/provider.js";
import { EphemeralCredentialStore } from "../src/core/credential-store.js";

function tempState() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-http-"));
}

async function eventually(url, predicate, init) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < 4000) {
    const response = await fetch(url, init);
    const body = await response.json();
    last = { status: response.status, body };
    if (predicate(response, body)) return body;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`timed out waiting for HTTP state: ${JSON.stringify(last)}`);
}

test("HTTP health is public, work is owner-authenticated, and turn state is scoped", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const { server } = createHttpServer(runtime, { port: 0 });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  try {

  const health = await fetch(`${base}/health`).then(response => response.json());
  assert.equal(health.status, "ready");
  assert.equal("stateDir" in health, false);
  const unauthorized = await fetch(`${base}/v1/doctor`);
  assert.equal(unauthorized.status, 401);
  const dashboard = await fetch(`${base}/`);
  assert.equal(dashboard.status, 200);
  const dashboardHtml = await dashboard.text();
  assert.match(dashboardHtml, /nBeAI\. GPAO-T/);
  assert.match(dashboardHtml, /무엇을 함께 해볼까요/);
  const localSession = dashboard.headers.get("set-cookie");
  assert.match(localSession, /HttpOnly/);
  assert.equal((await fetch(`${base}/v1/doctor`, { headers: { cookie: localSession } })).status, 200);
  const localOsTurn = await fetch(`${base}/v1/os-turns`, {
    method: "POST",
    headers: { cookie: localSession, "content-type": "application/json" },
    body: JSON.stringify({ requestId: "local-browser-turn", sessionId: "56a09944-c239-4a14-a2c0-70d58a3f1fa0", input: "local browser path" })
  });
  assert.equal(localOsTurn.status, 200);
  assert.equal((await localOsTurn.json()).turn.status, "succeeded");
  const providers = await fetch(`${base}/v1/providers`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(providers.schema, "gpao_t.provider_registry.v1");
  assert.equal(providers.providers.find(provider => provider.id === "gpao-t-emulator").auth.state, "configured");
  assert.equal(providers.providers.find(provider => provider.id === "openai").auth.state, "auth_required");
  assert.equal((await fetch(`${base}/v1/providers/gpao-t-emulator`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } })).status, 200);
  const sockets = await fetch(`${base}/v1/sockets`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(sockets.sockets[0].id, "local-deterministic-worker");
  const tools = await fetch(`${base}/v1/tools`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(tools.tools[0].id, "local.runtime_status");
  const connectors = await fetch(`${base}/v1/connectors`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(connectors.schema, "gpao_t.connector_center.v1");
  assert.equal(connectors.connectors.find(entry => entry.id === "web.search").enabled, false);
  const connectionProposal = await fetch(`${base}/v1/connection-proposals`, {
    method: "POST",
    headers: { cookie: localSession, "content-type": "application/json" },
    body: JSON.stringify({ input: "웹 검색 연결해줘" })
  });
  assert.equal(connectionProposal.status, 200);
  const proposalBody = await connectionProposal.json();
  assert.equal(proposalBody.status, "proposed");
  assert.equal(proposalBody.execute, false);
  assert.equal(proposalBody.proposals[0].connectorId, "web.search");
  const connectorToggle = await fetch(`${base}/v1/connectors/local.workspace-read/enabled`, {
    method: "PUT",
    headers: { cookie: localSession, origin: base, "content-type": "application/json" },
    body: JSON.stringify({ enabled: false })
  });
  assert.equal(connectorToggle.status, 200);
  assert.equal((await connectorToggle.json()).executionAuthorityGranted, false);
  const blockedConnectorToggle = await fetch(`${base}/v1/connectors/local.workspace-read/enabled`, {
    method: "PUT",
    headers: { cookie: localSession, origin: "http://attacker.invalid", "content-type": "application/json" },
    body: JSON.stringify({ enabled: true })
  });
  assert.equal(blockedConnectorToggle.status, 403);

  const osTurnResponse = await fetch(`${base}/v1/os-turns`, {
    method: "POST",
    headers: { authorization: `Bearer ${runtime.ownerToken}`, "content-type": "application/json" },
    body: JSON.stringify({ requestId: "os-http-1", sessionId: "43c9712f-5f7d-4ca9-8ea6-41e7b0885e2e", input: "native OS turn" })
  });
  assert.equal(osTurnResponse.status, 200);
  const osTurn = await osTurnResponse.json();
  assert.equal(osTurn.schema, "gpao_t.os_turn.v1");
  assert.equal(osTurn.turn.status, "succeeded");
  assert.equal(osTurn.growthCandidate.applyState, "candidate_only");

  const accepted = await fetch(`${base}/v1/turns`, {
    method: "POST",
    headers: { authorization: `Bearer ${runtime.ownerToken}`, "content-type": "application/json" },
    body: JSON.stringify({ requestId: "http-1", payload: { input: "http" } })
  }).then(response => response.json());
  const completed = await eventually(`${base}/v1/turns/${accepted.commandId}`, (_response, body) => body.status === "succeeded", { headers: { authorization: `Bearer ${runtime.ownerToken}` } });
  assert.equal(completed.receipt.result.echo, "http");

  const progress = await fetch(`${base}/v1/progress/${accepted.commandId}`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.text());
  assert.match(progress, /event: snapshot/);
  const doctor = await fetch(`${base}/v1/doctor`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(doctor.readOnly, true);
  assert.equal(doctor.integrity.ok, true);

  const queued = await fetch(`${base}/v1/turns`, {
    method: "POST",
    headers: { authorization: `Bearer ${runtime.ownerToken}`, "content-type": "application/json" },
    body: JSON.stringify({ requestId: "http-cancel", payload: { input: "cancel", delayMs: 300 } })
  }).then(response => response.json());
  const cancellation = await fetch(`${base}/v1/turns/${queued.commandId}/cancel`, { method: "POST", headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.ok(["uncertain", "cancelled", "succeeded"].includes(cancellation.status));

  runtime.handleWriterUnavailable({ code: "test" });
  assert.equal((await fetch(`${base}/health`)).status, 200);
  assert.equal((await fetch(`${base}/ready`)).status, 503);

  } finally {
    await new Promise(resolve => server.close(resolve));
    await runtime.stop();
  }
});

test("provider failure returns a user-safe repair plan without internal detail", async () => {
  const providerAdapter = { invoke: async () => { throw new ProviderInvocationError("auth_required", "raw provider failure detail"); } };
  const runtime = await new NativeRuntime({ stateDir: tempState(), providerAdapter }).start();
  const { server } = createHttpServer(runtime, { port: 0 });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${base}/v1/os-turns`, {
      method: "POST",
      headers: { authorization: `Bearer ${runtime.ownerToken}`, "content-type": "application/json" },
      body: JSON.stringify({ requestId: "provider-repair", sessionId: "fbe843a4-383e-44ab-9f6b-a7df2a498ce1", input: "provider recovery" })
    });
    const body = await response.json();
    assert.equal(response.status, 409);
    assert.equal(body.replyMode, "provider_blocked");
    assert.equal(body.repairPlan.state, "auth_required");
    assert.ok(body.repairPlan.action);
    assert.doesNotMatch(JSON.stringify(body.repairPlan), /raw provider failure detail/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await runtime.stop();
  }
});

test("connection center stores only a redacted connection state and persists a verified default model", async () => {
  const secret = "http-connection-secret";
  const runtime = await new NativeRuntime({
    stateDir: tempState(),
    credentialStore: new EphemeralCredentialStore(),
    providerEnvironment: {},
    providerFetch: async (_url, options) => {
      assert.equal(options.headers.authorization, `Bearer ${secret}`);
      return new Response(JSON.stringify({ id: "verify-1", output_text: "GPAO-T connection verified." }), { status: 200 });
    }
  }).start();
  const { server } = createHttpServer(runtime, { port: 0 });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const dashboard = await fetch(`${base}/`);
    const cookie = dashboard.headers.get("set-cookie");
    const headers = { cookie, origin: base, "content-type": "application/json" };
    const before = await fetch(`${base}/v1/connection-center`, { headers: { cookie } }).then(response => response.json());
    assert.equal(before.providers.find(provider => provider.id === "openai").connection.state, "not_configured");
    const configured = await fetch(`${base}/v1/connections/openai/api-key`, { method: "PUT", headers, body: JSON.stringify({ secret }) });
    assert.equal(configured.status, 200);
    assert.doesNotMatch(JSON.stringify(await configured.json()), new RegExp(secret));
    const verified = await fetch(`${base}/v1/connections/openai/verify`, { method: "POST", headers }).then(response => response.json());
    assert.equal(verified.connection.state, "ready");
    const selected = await fetch(`${base}/v1/model-selection/default`, { method: "PUT", headers, body: JSON.stringify({ providerId: "openai", modelId: "gpt-5.6" }) });
    assert.equal(selected.status, 200);
    const status = await fetch(`${base}/v1/connection-center`, { headers: { cookie } }).then(response => response.json());
    assert.deepEqual(status.defaultSelection, { preferredProviderId: "openai", preferredModelId: "gpt-5.6" });
    assert.doesNotMatch(JSON.stringify(status), new RegExp(secret));
    const blockedOrigin = await fetch(`${base}/v1/connections/openai/api-key`, { method: "PUT", headers: { ...headers, origin: "http://attacker.invalid" }, body: JSON.stringify({ secret }) });
    assert.equal(blockedOrigin.status, 403);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await runtime.stop();
  }
});

test("SSE progress reconnect replays a durable snapshot after a real client disconnect", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const { server } = createHttpServer(runtime, { port: 0 });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { authorization: `Bearer ${runtime.ownerToken}`, "content-type": "application/json" };
  try {
    const accepted = await fetch(`${base}/v1/turns`, { method: "POST", headers, body: JSON.stringify({ requestId: "sse-reconnect", payload: { input: "slow", delayMs: 250 } }) }).then(response => response.json());
    const first = await fetch(`${base}/v1/progress/${accepted.commandId}`, { headers });
    assert.equal(first.status, 200);
    const reader = first.body.getReader();
    const firstChunk = await reader.read();
    assert.match(new TextDecoder().decode(firstChunk.value), /event: snapshot/);
    await reader.cancel();
    const resumed = await fetch(`${base}/v1/progress/${accepted.commandId}`, { headers });
    const resumedText = await resumed.text();
    assert.match(resumedText, /event: snapshot/);
    assert.match(resumedText, /event: progress/);
    const final = await eventually(`${base}/v1/turns/${accepted.commandId}`, (_response, body) => body.status === "succeeded", { headers });
    assert.equal(final.status, "succeeded");
  } finally {
    await new Promise(resolve => server.close(resolve));
    await runtime.stop();
  }
});
