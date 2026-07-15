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
  const favicon = await fetch(`${base}/favicon.ico`);
  assert.equal(favicon.status, 200);
  assert.equal(favicon.headers.get("content-type"), "image/jpeg");
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
  const asyncTurnResponse = await fetch(`${base}/v2/os-turns`, {
    method: "POST",
    headers: { cookie: localSession, "content-type": "application/json" },
    body: JSON.stringify({ requestId: "local-browser-v2", sessionId: "56a09944-c239-4a14-a2c0-70d58a3f1fa0", input: "비동기 대화" })
  });
  assert.equal(asyncTurnResponse.status, 202);
  const asyncTurn = await asyncTurnResponse.json();
  assert.match(asyncTurn.turnId, /^os_/);
  const asyncCompleted = await eventually(`${base}/v2/os-turns/${asyncTurn.turnId}`, (_response, body) => body.terminal === true, { headers: { cookie: localSession } });
  assert.equal(asyncCompleted.status, "completed");
  assert.equal(asyncCompleted.responseDocument.blocks[0].kind, "markdown");
  const asyncEvents = await fetch(`${base}/v2/os-turns/${asyncTurn.turnId}/events?cursor=${encodeURIComponent(`${asyncTurn.turnId}:1`)}`, { headers: { cookie: localSession } }).then(response => response.text());
  assert.match(asyncEvents, /text\.complete/);
  assert.match(asyncEvents, /turn\.completed/);
  const providers = await fetch(`${base}/v1/providers`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(providers.schema, "gpao_t3.provider_registry.v1");
  assert.equal(providers.providers.find(provider => provider.id === "gpao-t-emulator").auth.state, "configured");
  assert.equal(providers.providers.find(provider => provider.id === "openai").auth.state, "auth_required");
  assert.equal((await fetch(`${base}/v1/providers/gpao-t-emulator`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } })).status, 200);
  const sockets = await fetch(`${base}/v1/sockets`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(sockets.sockets[0].id, "local-deterministic-worker");
  const tools = await fetch(`${base}/v1/tools`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(tools.tools[0].id, "local.runtime_status");
  const readInvocation = await fetch(`${base}/v1/tool-invocations`, {
    method: "POST", headers: { cookie: localSession, "content-type": "application/json" },
    body: JSON.stringify({ requestId: "tool-read-1", toolId: "runtime.status", action: "status", args: {} })
  });
  assert.equal(readInvocation.status, 200);
  assert.equal((await readInvocation.json()).status, "succeeded");
  const writePreview = await fetch(`${base}/v1/tool-invocations`, {
    method: "POST", headers: { cookie: localSession, "content-type": "application/json" },
    body: JSON.stringify({ requestId: "tool-write-1", toolId: "files.mutate", action: "write", args: { rootId: "runtime", path: "dashboard-approved.txt", text: "approved" } })
  });
  assert.equal(writePreview.status, 202);
  const pendingTool = await writePreview.json();
  assert.equal(pendingTool.status, "awaiting_approval");
  const approvedTool = await fetch(`${base}/v1/tool-invocations/${pendingTool.invocationId}/approve`, {
    method: "POST", headers: { cookie: localSession, origin: base, "content-type": "application/json" }, body: JSON.stringify({ approved: true })
  }).then(response => response.json());
  assert.equal(approvedTool.status, "succeeded");
  assert.ok(approvedTool.receipt.result.rollbackId);
  const durableTool = await fetch(`${base}/v1/tool-invocations/${pendingTool.invocationId}`, { headers: { cookie: localSession } }).then(response => response.json());
  assert.equal(durableTool.status, "succeeded");
  const disabledTool = await fetch(`${base}/v1/tools/runtime.status/enabled`, { method: "PUT", headers: { cookie: localSession, origin: base, "content-type": "application/json" }, body: JSON.stringify({ enabled: false }) }).then(response => response.json());
  assert.equal(disabledTool.readiness, "disabled");
  const enabledTool = await fetch(`${base}/v1/tools/runtime.status/enabled`, { method: "PUT", headers: { cookie: localSession, origin: base, "content-type": "application/json" }, body: JSON.stringify({ enabled: true }) }).then(response => response.json());
  assert.equal(enabledTool.readiness, "ready");
  const capabilities = await fetch(`${base}/v1/capabilities?group=runtime`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(capabilities.schema, "gpao_t3.capability_search.v1");
  assert.equal(capabilities.capabilities[0].id, "foundation.runtime");
  assert.equal("inputSchema" in capabilities.capabilities[0], false);
  const capability = await fetch(`${base}/v1/capabilities/foundation.runtime`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(capability.inputSchema.type, "object");
  assert.equal(capability.protocol.selected.minor, 2);
  const influenceLedger = await fetch(`${base}/v1/context-influence`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(influenceLedger.schema, "gpao_t3.context_influence_ledger.v1");
  assert.equal(influenceLedger.durableMemoryPromotion, false);
  const connectors = await fetch(`${base}/v1/connectors`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(connectors.schema, "gpao_t3.connector_center.v1");
  assert.equal(connectors.connectors.find(entry => entry.id === "web.search").enabled, false);
  const cells = await fetch(`${base}/v1/connection-cells`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(cells.schema, "gpao_t3.connection_cell_registry.v1");
  assert.ok(cells.cells.some(cell => cell.id === "mcp.external" && cell.kind === "mcp"));
  assert.ok(cells.cells.some(cell => cell.id === "channel.telegram" && cell.execution.approvalRequired === true));
  const messenger = await fetch(`${base}/v1/messenger`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } }).then(response => response.json());
  assert.equal(messenger.schema, "gpao_t3.messenger_runtime_status.v1");
  assert.equal(messenger.contextBoundary, "isolated_until_admitted");
  assert.equal(messenger.reconcileRequired, 0);
  const readCellPlan = await fetch(`${base}/v1/connection-cells/plan`, {
    method: "POST",
    headers: { authorization: `Bearer ${runtime.ownerToken}`, "content-type": "application/json" },
    body: JSON.stringify({ cellId: "tool.local.runtime_status", args: { query: "health" } })
  }).then(response => response.json());
  assert.equal(readCellPlan.status, "admitted");
  assert.equal(readCellPlan.automatic, true);
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
  assert.equal(osTurn.schema, "gpao_t3.os_turn.v1");
  assert.equal(osTurn.turn.status, "succeeded");
  assert.equal(osTurn.growthCandidate.applyState, "candidate_only");

  const accepted = await fetch(`${base}/v1/turns`, {
    method: "POST",
    headers: { authorization: `Bearer ${runtime.ownerToken}`, "content-type": "application/json" },
    body: JSON.stringify({ requestId: "http-1", payload: { input: "http" } })
  }).then(response => response.json());
  const completed = await eventually(`${base}/v1/turns/${accepted.commandId}`, (_response, body) => body.status === "succeeded", { headers: { authorization: `Bearer ${runtime.ownerToken}` } });
  assert.equal(completed.receipt.result.echo, "http");
  const eventResponse = await fetch(`${base}/v1/turns/${accepted.commandId}/events`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } });
  assert.equal(eventResponse.status, 200);
  const eventReplay = await eventResponse.json();
  assert.deepEqual(eventReplay.events.map(event => event.type), ["turn.accepted", "turn.dispatched", "turn.responding", "turn.succeeded"]);
  assert.equal(eventReplay.terminal.type, "turn.succeeded");
  const invalidCursor = await fetch(`${base}/v1/turns/${accepted.commandId}/events?cursor=other:1`, { headers: { authorization: `Bearer ${runtime.ownerToken}` } });
  assert.equal(invalidCursor.status, 400);
  assert.equal((await invalidCursor.json()).code, "invalid_event_cursor");

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

test("HTTP never serializes internal RuntimeError details to a local dashboard response", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const { server } = createHttpServer(runtime, { port: 0 });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const dashboard = await fetch(`${base}/`);
    const cookie = dashboard.headers.get("set-cookie");
    const response = await fetch(`${base}/v1/connectors/mcp.external/enabled`, {
      method: "PUT",
      headers: { cookie, origin: base, "content-type": "application/json" },
      body: JSON.stringify({ enabled: true })
    });
    const body = await response.json();
    assert.equal(response.status, 409);
    assert.equal(body.code, "connector_setup_review_required");
    assert.equal("details" in body, false);
    assert.doesNotMatch(JSON.stringify(body), /not_started|credential_handle|secret/i);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await runtime.stop();
  }
});

test("the common connection endpoint rejects browser credentials before a secure agent call", async () => {
  const secret = "http-connection-secret";
  const runtime = await new NativeRuntime({ stateDir: tempState(), providerEnvironment: {} }).start();
  const { server } = createHttpServer(runtime, { port: 0 });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const dashboard = await fetch(`${base}/`);
    const cookie = dashboard.headers.get("set-cookie");
    const headers = { cookie, origin: base, "content-type": "application/json" };
    const configured = await fetch(`${base}/v1/connections/openai`, { method: "POST", headers, body: JSON.stringify({ authMethod: "api_key", secret }) });
    assert.equal(configured.status, 400);
    const body = await configured.json();
    assert.equal(body.code, "protected_connection_secret_forbidden");
    assert.doesNotMatch(JSON.stringify(body), new RegExp(secret));
    const source = fs.readFileSync(new URL("../src/core/http.js", import.meta.url), "utf8");
    assert.doesNotMatch(source, /body\.secret/);
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
    assert.match(resumedText, /event: reconnect/);
    assert.match(resumedText, /event: progress/);
    const final = await eventually(`${base}/v1/turns/${accepted.commandId}`, (_response, body) => body.status === "succeeded", { headers });
    assert.equal(final.status, "succeeded");
    assert.equal(final.controlStatus, "completed");
    const telemetry = await fetch(`${base}/v1/turns/${accepted.commandId}/telemetry`, { headers }).then(response => response.json());
    assert.equal(telemetry.schema, "gpao_t3.turn_stage_telemetry.v1");
    assert.deepEqual(telemetry.stages.map(stage => stage.stage), ["accepted", "dispatching", "responding", "completed"]);
    assert.ok(telemetry.stages.every(stage => stage.elapsedFromAcceptMs >= 0));
  } finally {
    await new Promise(resolve => server.close(resolve));
    await runtime.stop();
  }
});
