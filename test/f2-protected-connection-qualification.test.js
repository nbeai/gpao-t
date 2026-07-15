import assert from "node:assert/strict";
import test from "node:test";
import { ProtectedConnectionClient, PROTECTED_CONNECTION_SCHEMA } from "../src/core/protected-connection.js";
import { ProviderConnectionCenter } from "../src/core/provider-connection.js";

const NOW = 1_800_000_000_000;
const SENTINEL_SECRET = "F2-SENTINEL-SECRET";

function connectionMetadata(providerId, connection) {
  return {
    providerId,
    credentialRef: connection.credentialRef,
    authMethod: connection.authMethod,
    state: connection.state,
    models: connection.models
  };
}

function fakeTransport() {
  const requests = [];
  const vault = new Map([
    ["ref-api-key", { authMethod: "api_key", state: "connected", secret: SENTINEL_SECRET }],
    ["ref-oauth", { authMethod: "oauth", state: "connected", secret: SENTINEL_SECRET }]
  ]);
  let invokes = 0;

  return {
    requests,
    get invokes() {
      return invokes;
    },
    setState(credentialRef, state) {
      vault.get(credentialRef).state = state;
    },
    async send(request, { signal }) {
      requests.push(structuredClone(request));
      assert.equal(JSON.stringify(request).includes(SENTINEL_SECRET), false);

      if (request.operation === "connection.begin") {
        const credentialRef = request.authMethod === "api_key" ? "ref-api-key" : "ref-oauth";
        const record = vault.get(credentialRef);
        return {
          schema: PROTECTED_CONNECTION_SCHEMA,
          operation: request.operation,
          requestId: request.requestId,
          credentialRef,
          authMethod: record.authMethod,
          state: record.state,
          models: ["model-main"]
        };
      }

      if (request.operation === "connection.status" || request.operation === "connection.revoke") {
        const record = vault.get(request.credentialRef);
        if (request.operation === "connection.revoke") record.state = "revoked";
        return {
          schema: PROTECTED_CONNECTION_SCHEMA,
          operation: request.operation,
          requestId: request.requestId,
          credentialRef: request.credentialRef,
          authMethod: record.authMethod,
          state: record.state,
          models: ["model-main"]
        };
      }

      invokes += 1;
      if (request.input.mode === "unknown") {
        await new Promise(resolve => signal.addEventListener("abort", resolve, { once: true }));
        return {};
      }
      return {
        schema: PROTECTED_CONNECTION_SCHEMA,
        operation: request.operation,
        requestId: request.requestId,
        operationId: request.requestId,
        state: "completed",
        result: { text: "safe result", usage: 3 },
        receipt: { providerId: request.providerId, modelId: request.modelId, outcome: "completed" }
      };
    }
  };
}

test("F2 protected connection qualification keeps API-key and OAuth equivalent without secret or retry escape hatches", async () => {
  const transport = fakeTransport();
  const client = new ProtectedConnectionClient({ transport, now: () => NOW });
  const apiKeyCenter = new ProviderConnectionCenter({ clock: () => NOW });
  const oauthCenter = new ProviderConnectionCenter({ clock: () => NOW });

  const apiKey = await client.connection.begin({ requestId: "f2-api-begin", providerId: "openai", authMethod: "api_key", deadline: NOW + 1_000 });
  const oauth = await client.connection.begin({ requestId: "f2-oauth-begin", providerId: "openai", authMethod: "oauth", deadline: NOW + 1_000 });
  const apiKeyStatus = apiKeyCenter.adopt(connectionMetadata("openai", apiKey));
  const oauthStatus = oauthCenter.adopt(connectionMetadata("openai", oauth));

  assert.deepEqual(Object.keys(apiKey).sort(), Object.keys(oauth).sort());
  assert.deepEqual(apiKeyStatus, oauthStatus);
  assert.equal(apiKeyStatus.state, "ready");
  assert.equal("credentialRef" in apiKeyStatus, false);
  assert.equal("authMethod" in apiKeyStatus, false);

  const completed = await client.provider.invoke({
    requestId: "f2-invoke-completed",
    credentialRef: apiKey.credentialRef,
    providerId: "openai",
    modelId: "model-main",
    input: { message: "safe" },
    deadline: NOW + 1_000
  });
  assert.deepEqual(completed.receipt, { providerId: "openai", modelId: "model-main", outcome: "completed" });
  assert.deepEqual(completed.result, { text: "safe result", usage: 3 });

  transport.setState(oauth.credentialRef, "expired");
  const expired = await client.connection.status({ requestId: "f2-oauth-expired", credentialRef: oauth.credentialRef, deadline: NOW + 1_000 });
  assert.equal(oauthCenter.refresh(connectionMetadata("openai", expired)).state, "expired");

  const revoked = await client.connection.revoke({ requestId: "f2-api-revoke", credentialRef: apiKey.credentialRef, deadline: NOW + 1_000 });
  assert.equal(apiKeyCenter.refresh(connectionMetadata("openai", revoked)).state, "auth_required");

  await assert.rejects(
    () => client.provider.invoke({
      requestId: "f2-invoke-unknown",
      credentialRef: oauth.credentialRef,
      providerId: "openai",
      modelId: "model-main",
      input: { mode: "unknown" },
      deadline: NOW + 5
    }),
    error => error.code === "protected_connection_outcome_unknown"
      && error.details.reason === "deadline_exceeded"
      && error.details.retry === "manual_review_required"
  );
  assert.equal(transport.invokes, 2);
  assert.equal(transport.requests.filter(request => request.requestId === "f2-invoke-unknown").length, 1);

  const publicArtifacts = {
    apiKeyStatus,
    oauthStatus,
    apiKeyExport: apiKeyCenter.exportMetadata(),
    oauthExport: oauthCenter.exportMetadata(),
    completed,
    expired,
    revoked,
    requests: transport.requests
  };
  assert.equal(JSON.stringify(publicArtifacts).includes(SENTINEL_SECRET), false);
  assert.match(JSON.stringify(publicArtifacts), /ref-api-key|ref-oauth/);
  assert.equal(JSON.stringify(publicArtifacts).includes("api_key"), true);
});
