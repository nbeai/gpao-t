import assert from "node:assert/strict";
import test from "node:test";
import {
  NativeCredentialBridgeClient,
  NATIVE_CREDENTIAL_BRIDGE_SCHEMA,
  credentialBridgeGrantMac,
  credentialBridgeInputDigest
} from "../src/core/credential-bridge.js";

const NOW = 1_800_000_000_000;
const GRANT_MAC_KEY = "test-only-grant-mac-key";
const TRANSPORT_ID = "native-secure-bridge";

function request(overrides = {}) {
  const input = { messages: [{ role: "user", content: "hello" }] };
  const base = {
    operationId: "op-100",
    credentialRef: "cred-openai-main",
    invocationGrant: {
      grantId: "grant-100",
      issuerId: "gpao-t3-core",
      principalId: "owner-yoon",
      transportId: TRANSPORT_ID,
      credentialRef: "cred-openai-main",
      providerId: "openai",
      modelId: "gpt-5-5",
      operation: "provider.invoke",
      inputDigest: credentialBridgeInputDigest(input),
      expiresAt: NOW + 10_000,
      signature: ""
    },
    providerId: "openai",
    modelId: "gpt-5-5",
    input,
    deadline: NOW + 500
  };
  const next = { ...base, ...overrides, invocationGrant: { ...base.invocationGrant, ...overrides.invocationGrant } };
  next.invocationGrant.signature = credentialBridgeGrantMac(next.invocationGrant, GRANT_MAC_KEY);
  return next;
}

function responseFor(request, overrides = {}) {
  return {
    schema: NATIVE_CREDENTIAL_BRIDGE_SCHEMA,
    operation: request.operation,
    operationId: request.operationId,
    outcome: "completed",
    result: { text: "safe projected result" },
    ...overrides
  };
}

function client(send, options = {}) {
  return new NativeCredentialBridgeClient({
    transport: { send },
    now: () => NOW,
    principalId: "owner-yoon",
    transportId: TRANSPORT_ID,
    verifyGrant: grant => credentialBridgeGrantMac(grant, GRANT_MAC_KEY) === grant.signature,
    ...options
  });
}

test("credential bridge sends a safe provider invocation through an injected transport", async () => {
  let seen;
  const bridge = client(async payload => {
    seen = payload;
    return responseFor(payload);
  });

  const result = await bridge.invoke(request());
  assert.equal(result.outcome, "completed");
  assert.equal(seen.operation, "provider.invoke");
  assert.equal(seen.invocationGrant.principalId, "owner-yoon");
  assert.equal(Object.hasOwn(seen, "apiKey"), false);
});

test("credential bridge rejects nested secret ingress before transport use", async () => {
  let calls = 0;
  const bridge = client(async () => { calls += 1; return {}; });
  const unsafe = request({ input: { messages: [{ role: "user", content: "hello", metadata: { password: "not-allowed" } }] } });

  await assert.rejects(() => bridge.invoke(unsafe), error => error.code === "credential_bridge_secret_forbidden");
  assert.equal(calls, 0);
});

test("credential bridge rejects raw secret-like egress", async () => {
  const bridge = client(async payload => responseFor(payload, { result: { apiKey: "sk-abcdefghijklmnop" } }));
  await assert.rejects(() => bridge.invoke(request()), error => error.code === "credential_bridge_secret_leak");
});

test("credential bridge rejects unknown response schemas and mismatched operations", async () => {
  const unknownSchema = client(async payload => responseFor(payload, { schema: "unknown.bridge.v0" }));
  await assert.rejects(() => unknownSchema.invoke(request()), error => error.code === "credential_bridge_invalid_response");

  const wrongOperation = client(async payload => responseFor(payload, { operation: "credential.status", outcome: "available" }));
  await assert.rejects(() => wrongOperation.invoke(request()), error => error.code === "credential_bridge_invalid_response");
});

test("credential bridge rejects unsupported operations before transport use", async () => {
  let calls = 0;
  const bridge = client(async () => { calls += 1; return {}; });
  await assert.rejects(() => bridge.request({ ...request(), operation: "credential.export" }), error => error.code === "credential_bridge_operation_unsupported");
  assert.equal(calls, 0);
});

test("credential bridge rejects expired and mismatched invocation grants", async () => {
  const bridge = client(async () => { throw new Error("transport must not run"); });
  const expired = request({ invocationGrant: { ...request().invocationGrant, expiresAt: NOW } });
  await assert.rejects(() => bridge.invoke(expired), error => error.code === "credential_bridge_grant_expired");

  const mismatched = request({ invocationGrant: { ...request().invocationGrant, credentialRef: "cred-other" } });
  await assert.rejects(() => bridge.invoke(mismatched), error => error.code === "credential_bridge_grant_mismatch");

  const changedInput = request({ input: { messages: [{ role: "user", content: "different request" }] } });
  await assert.rejects(() => bridge.invoke(changedInput), error => error.code === "credential_bridge_grant_mismatch" && error.details.field === "inputDigest");
});

test("credential bridge rejects grants with an invalid issuer signature before transport use", async () => {
  let calls = 0;
  const bridge = client(async () => { calls += 1; return {}; });
  const tampered = request();
  tampered.invocationGrant.signature = `${tampered.invocationGrant.signature.startsWith("0") ? "1" : "0"}${tampered.invocationGrant.signature.slice(1)}`;

  await assert.rejects(() => bridge.invoke(tampered), error => error.code === "credential_bridge_grant_invalid");
  assert.equal(calls, 0);
});

test("credential bridge rejects a grant sent to a different transport", async () => {
  let calls = 0;
  const bridge = client(async () => { calls += 1; return {}; }, { transportId: "other-secure-bridge" });

  await assert.rejects(() => bridge.invoke(request()), error => error.code === "credential_bridge_grant_mismatch" && error.details.field === "transportId");
  assert.equal(calls, 0);
});

test("credential bridge consumes each grant before I/O and rejects reuse", async () => {
  let calls = 0;
  const bridge = client(async payload => {
    calls += 1;
    return responseFor(payload);
  });
  const safeRequest = request();

  await bridge.invoke(safeRequest);
  await assert.rejects(() => bridge.invoke(safeRequest), error => error.code === "credential_bridge_grant_consumed");
  assert.equal(calls, 1);
});

test("credential bridge requires a verifier and transport identity", () => {
  assert.throws(
    () => new NativeCredentialBridgeClient({ transport: { send: async () => ({}) } }),
    /transportId is required/
  );
});

test("credential bridge marks timeout and cancellation as unknown outcomes without retrying", async () => {
  let calls = 0;
  const bridge = client(async (_payload, { signal }) => {
    calls += 1;
    await new Promise(resolve => signal.addEventListener("abort", resolve, { once: true }));
    return {};
  });
  await assert.rejects(() => bridge.invoke(request({ deadline: NOW + 1 })), error => error.code === "credential_bridge_outcome_unknown" && error.details.reason === "deadline_exceeded");
  assert.equal(calls, 1);

  const controller = new AbortController();
  controller.abort(new Error("owner cancelled"));
  await assert.rejects(() => bridge.invoke(request({ invocationGrant: { grantId: "grant-101" } }), { signal: controller.signal }), error => error.code === "credential_bridge_outcome_unknown" && error.details.reason === "cancelled");
  assert.equal(calls, 1);
});
