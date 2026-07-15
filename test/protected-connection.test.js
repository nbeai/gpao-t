import assert from "node:assert/strict";
import test from "node:test";
import { ProtectedConnectionClient, PROTECTED_CONNECTION_SCHEMA } from "../src/core/protected-connection.js";

const NOW = 1_800_000_000_000;

function requestId(number) {
  return `request-${number}`;
}

function fakeTransport() {
  const requests = [];
  return {
    requests,
    async send(request) {
      requests.push(request);
      if (request.operation === "connection.begin") {
        return {
          schema: PROTECTED_CONNECTION_SCHEMA,
          operation: request.operation,
          requestId: request.requestId,
          credentialRef: "credential-main",
          authMethod: request.authMethod,
          state: "connected",
          models: ["model-main"]
        };
      }
      if (request.operation === "connection.status" || request.operation === "connection.revoke") {
        return {
          schema: PROTECTED_CONNECTION_SCHEMA,
          operation: request.operation,
          requestId: request.requestId,
          credentialRef: request.credentialRef,
          authMethod: "oauth",
          state: request.operation === "connection.revoke" ? "revoked" : "connected",
          models: ["model-main"]
        };
      }
      if (request.operation === "provider.invoke") {
        return {
          schema: PROTECTED_CONNECTION_SCHEMA,
          operation: request.operation,
          requestId: request.requestId,
          operationId: request.requestId,
          state: "completed",
          receipt: { providerId: request.providerId, modelId: request.modelId, outcome: "completed" }
        };
      }
      return {
        schema: PROTECTED_CONNECTION_SCHEMA,
        operation: request.operation,
        requestId: request.requestId,
        operationId: request.operationId,
        state: "cancelled"
      };
    }
  };
}

function client(transport = fakeTransport()) {
  return new ProtectedConnectionClient({ transport, now: () => NOW });
}

test("API-key and OAuth connections expose the same typed public state shape", async () => {
  const transport = fakeTransport();
  const contract = client(transport);
  const apiKey = await contract.connection.begin({ requestId: requestId(1), providerId: "openai", authMethod: "api_key", deadline: NOW + 1_000 });
  const oauth = await contract.connection.begin({ requestId: requestId(2), providerId: "openai", authMethod: "oauth", deadline: NOW + 1_000 });

  assert.deepEqual(Object.keys(apiKey).sort(), Object.keys(oauth).sort());
  assert.equal(apiKey.schema, PROTECTED_CONNECTION_SCHEMA);
  assert.equal(apiKey.state, oauth.state);
  assert.deepEqual(apiKey.models, oauth.models);
  assert.equal(apiKey.authMethod, "api_key");
  assert.equal(oauth.authMethod, "oauth");
  assert.equal(Object.hasOwn(transport.requests[0], "secret"), false);
});

test("connection and provider operations stay secret-free and project a redacted public receipt", async () => {
  const transport = fakeTransport();
  const contract = client(transport);
  const status = await contract.connection.status({ requestId: requestId(3), credentialRef: "credential-main", deadline: NOW + 1_000 });
  const invocation = await contract.provider.invoke({ requestId: requestId(4), credentialRef: status.credentialRef, providerId: "openai", modelId: "model-main", input: { message: "hello" }, deadline: NOW + 1_000 });
  const cancelled = await contract.provider.cancel({ requestId: requestId(5), operationId: requestId(4), deadline: NOW + 1_000 });
  const revoked = await contract.connection.revoke({ requestId: requestId(6), credentialRef: status.credentialRef, deadline: NOW + 1_000 });

  assert.deepEqual(invocation.receipt, { providerId: "openai", modelId: "model-main", outcome: "completed" });
  assert.equal(cancelled.state, "cancelled");
  assert.equal(revoked.state, "revoked");
  assert.doesNotMatch(JSON.stringify([status, invocation, cancelled, revoked]), /api[_-]?key|token|password|secret/i);
});

test("sentinel secrets are rejected before transport ingress and at transport egress", async () => {
  const ingress = fakeTransport();
  const contract = client(ingress);
  await assert.rejects(
    () => contract.connection.begin({ requestId: requestId(7), providerId: "openai", authMethod: "api_key", secret: "F2-SENTINEL-SECRET", deadline: NOW + 1_000 }),
    error => error.code === "protected_connection_secret_forbidden"
  );
  assert.equal(ingress.requests.length, 0);

  const egress = client({
    async send(request) {
      return {
        schema: PROTECTED_CONNECTION_SCHEMA,
        operation: request.operation,
        requestId: request.requestId,
        credentialRef: "credential-main",
        authMethod: request.authMethod,
        state: "connected",
        models: ["model-main"],
        receipt: { secret: "F2-SENTINEL-SECRET" }
      };
    }
  });
  await assert.rejects(
    () => egress.connection.begin({ requestId: requestId(8), providerId: "openai", authMethod: "oauth", deadline: NOW + 1_000 }),
    error => error.code === "protected_connection_secret_leak"
  );
});

test("deadline and cancellation report unknown outcome without an automatic retry", async () => {
  let calls = 0;
  const contract = client({
    async send(_request, { signal }) {
      calls += 1;
      await new Promise(resolve => signal.addEventListener("abort", resolve, { once: true }));
      return {};
    }
  });
  await assert.rejects(
    () => contract.provider.invoke({ requestId: requestId(9), credentialRef: "credential-main", providerId: "openai", modelId: "model-main", input: { message: "hello" }, deadline: NOW + 1 }),
    error => error.code === "protected_connection_outcome_unknown" && error.details.reason === "deadline_exceeded" && error.details.retry === "manual_review_required"
  );
  assert.equal(calls, 1);

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => contract.provider.cancel({ requestId: requestId(10), operationId: requestId(9), deadline: NOW + 1_000 }, { signal: controller.signal }),
    error => error.code === "protected_connection_outcome_unknown" && error.details.reason === "cancelled"
  );
  assert.equal(calls, 1);
});
