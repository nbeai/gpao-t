import assert from "node:assert/strict";
import test from "node:test";
import { SecureConnectionAgent } from "../src/core/secure-connection-agent.js";

const NOW = 1_700_000_000_000;
const deadline = () => NOW + 10_000;

function backend() {
  const records = new Map();
  return {
    async begin(request) {
      const credentialRef = `ref-${request.authMethod}`;
      records.set(credentialRef, { providerId: request.providerId, authMethod: request.authMethod, state: "connected", models: ["model-main"] });
      return { credentialRef, authMethod: request.authMethod, state: "connected", models: ["model-main"] };
    },
    async status({ credentialRef }) {
      const record = records.get(credentialRef);
      return { credentialRef, authMethod: record.authMethod, state: record.state, models: record.models };
    },
    async revoke({ credentialRef }) {
      const record = records.get(credentialRef);
      record.state = "revoked";
      return { credentialRef, authMethod: record.authMethod, state: record.state, models: record.models };
    },
    async invoke({ providerId, modelId }) {
      return { result: { text: "secure agent answer", usage: 3 }, receipt: { providerId, modelId, outcome: "completed" } };
    }
  };
}

test("secure connection agent starts API-key and OAuth handoff without receiving acquisition material", async () => {
  const agent = new SecureConnectionAgent({ backend: backend(), now: () => NOW });
  const apiKey = await agent.begin({ requestId: "api-begin", providerId: "openai", authMethod: "api_key", deadline: deadline() });
  const oauth = await agent.begin({ requestId: "oauth-begin", providerId: "openai", authMethod: "oauth", deadline: deadline() });

  assert.deepEqual(Object.keys(apiKey).sort(), ["authMethod", "credentialRef", "models", "requestId", "schema", "state"]);
  assert.equal(apiKey.authMethod, "api_key");
  assert.equal(oauth.authMethod, "oauth");
  assert.equal("acquisition" in apiKey, false);
});

test("secure connection agent reports status and revocation with opaque references only", async () => {
  const agent = new SecureConnectionAgent({ backend: backend(), now: () => NOW });
  const connection = await agent.begin({ requestId: "local-begin", providerId: "local", authMethod: "local", deadline: deadline() });
  const status = await agent.status({ requestId: "local-status", credentialRef: connection.credentialRef, deadline: deadline() });
  const revoked = await agent.revoke({ requestId: "local-revoke", credentialRef: connection.credentialRef, deadline: deadline() });

  assert.equal(status.state, "connected");
  assert.equal(revoked.state, "revoked");
  const diagnostic = agent.diagnostic({ code: "native_backend_failed", details: { apiKey: "sk-F2-SENTINEL-SECRET-123456" } });
  assert.equal(JSON.stringify(diagnostic).includes("sk-F2-SENTINEL-SECRET-123456"), false);
});

test("secure connection agent fails closed without an OS-native backend and rejects raw secret fields", async () => {
  const unavailable = new SecureConnectionAgent({ now: () => NOW });
  await assert.rejects(
    () => unavailable.begin({ requestId: "blocked-begin", providerId: "openai", authMethod: "api_key", deadline: deadline() }),
    error => error.code === "secure_connection_agent_unavailable"
  );

  const agent = new SecureConnectionAgent({ backend: backend(), now: () => NOW });
  await assert.rejects(
    () => agent.begin({ requestId: "bad-begin", providerId: "openai", authMethod: "api_key", apiKey: "sk-F2-SENTINEL-SECRET-123456", deadline: deadline() }),
    error => error.code === "secure_connection_agent_invalid_request"
  );
});

test("secure connection agent returns only an allowlisted provider result", async () => {
  const agent = new SecureConnectionAgent({ backend: backend(), now: () => NOW });
  const connection = await agent.begin({ requestId: "invoke-begin", providerId: "openai", authMethod: "api_key", deadline: deadline() });
  const result = await agent.invoke({ requestId: "invoke", credentialRef: connection.credentialRef, providerId: "openai", modelId: "model-main", input: { message: "hello" }, deadline: deadline() });
  assert.deepEqual(result.result, { text: "secure agent answer", usage: 3 });
  assert.deepEqual(result.receipt, { providerId: "openai", modelId: "model-main", outcome: "completed" });
});
