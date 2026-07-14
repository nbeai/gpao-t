import assert from "node:assert/strict";
import test from "node:test";
import {
  DeterministicProviderEmulator,
  ProviderInvocationError,
  ProviderRegistry,
  authStatusFromProfile,
  createInvocationPlan,
  fallbackEligible,
  invokeWithFallback,
  normalizeProviderFailure
} from "../src/core/provider.js";

function plan(overrides = {}) {
  return createInvocationPlan({
    runId: "run-1",
    sessionId: "session-1",
    generation: 3,
    idempotencyKey: "idem-1",
    providerId: "gpao-t-emulator",
    modelId: "deterministic-echo",
    ...overrides
  });
}

test("provider registry exposes redacted auth and model capability status", () => {
  const registry = new ProviderRegistry({ entries: [{
    id: "fixture-provider",
    adapter: "fixture",
    adapterVersion: "1",
    auth: { kind: "env", credentialPresent: false },
    health: { state: "ready" },
    models: [{ id: "fixture-model", capabilities: ["text"], inputModalities: ["text"], outputModalities: ["text"], contextLimit: 100, responseLimit: 20 }]
  }] });
  const snapshot = registry.snapshot();
  assert.equal(snapshot.schema, "gpao_t.provider_registry.v1");
  assert.equal(snapshot.providers[0].auth.state, "auth_required");
  assert.deepEqual(snapshot.providers[0].models[0].capabilities, ["text"]);
  assert.doesNotMatch(JSON.stringify(snapshot), /credentialPresent|secret-value|token-value/);
});

test("raw credential material is rejected before it can enter registry or plan", () => {
  assert.throws(() => new ProviderRegistry({ entries: [{
    id: "unsafe",
    adapter: "fixture",
    auth: { kind: "env", token: "secret-value" },
    models: [{ id: "model", capabilities: ["text"] }]
  }] }), error => error.code === "secret_material_forbidden");
  assert.throws(() => plan({ credentialSource: { value: "secret-value" } }), error => error.code === "secret_material_forbidden");
});

test("auth profile states are typed without reading a secret", () => {
  assert.deepEqual(authStatusFromProfile({ kind: "none" }), { state: "configured", sourceKind: "none" });
  assert.equal(authStatusFromProfile({ kind: "oauth", status: "expired" }).state, "expired");
  assert.equal(authStatusFromProfile({ kind: "env", credentialPresent: false }).state, "auth_required");
  assert.equal(authStatusFromProfile({ kind: "env" }).state, "unknown");
});

test("invocation plan is typed, bounded, and secret-free", () => {
  const invocation = plan({ scenario: "success", timeoutMs: 250, responseBudget: 64 });
  assert.equal(invocation.schema, "gpao_t.provider_invocation_plan.v1");
  assert.equal(invocation.timeoutMs, 250);
  assert.equal(invocation.responseBudget, 64);
  assert.equal(Object.hasOwn(invocation, "input"), false);
});

test("deterministic provider returns a canonical receipt", async () => {
  const provider = new DeterministicProviderEmulator();
  const result = await provider.invoke(plan());
  assert.equal(result.status, "succeeded");
  assert.equal(result.receipt.terminal, true);
  assert.equal(result.receipt.generation, 3);
});

test("streaming is a projection with ordered chunks and a terminal receipt", async () => {
  const provider = new DeterministicProviderEmulator({ chunkDelayMs: 0 });
  const chunks = [];
  for await (const chunk of provider.stream(plan({ scenario: "stream" }))) chunks.push(chunk);
  assert.deepEqual(chunks.map(chunk => chunk.seq), [1, 2, 3, 4]);
  assert.equal(chunks.at(-1).terminal, true);
  assert.equal(chunks.at(-1).text, "GPAO-T provider stream");
  assert.equal(chunks.at(-1).receipt.generation, 3);
});

test("provider failures preserve stable class and side-effect semantics", async () => {
  const provider = new DeterministicProviderEmulator();
  for (const [scenario, expected] of [
    ["auth_required", "auth_required"],
    ["rate_limited", "rate_limited"],
    ["provider_unavailable", "provider_unavailable"],
    ["invalid_request", "invalid_request"],
    ["provider_timeout", "provider_timeout"],
    ["unknown_outcome", "external_outcome_unknown"]
  ]) {
    await assert.rejects(() => provider.invoke(plan({ scenario, timeoutMs: 1 })), error => {
      assert.equal(error instanceof ProviderInvocationError, true);
      assert.equal(error.failureClass, expected);
      return error.code === expected;
    });
  }
  const unknown = normalizeProviderFailure(new Error("unmapped"));
  assert.equal(unknown.failureClass, "failed");
});

test("cancellation distinguishes before-send and in-flight cases", async () => {
  const provider = new DeterministicProviderEmulator();
  await assert.rejects(() => provider.invoke(plan({ scenario: "cancelled_before_send" })), error => error.details.cancellation === "cancelled_before_send");
  const controller = new AbortController();
  const pending = provider.invoke(plan({ simulatedDelayMs: 50 }), { signal: controller.signal });
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(() => pending, error => error.details.cancellation === "cancelled_in_flight");
});

test("fallback is allowed before an external effect and blocked after unknown outcome", async () => {
  const provider = new DeterministicProviderEmulator();
  const recovered = await invokeWithFallback({
    plans: [plan({ scenario: "provider_unavailable" }), plan({ providerId: "gpao-t-emulator-2" })],
    invoke: current => provider.invoke(current)
  });
  assert.equal(recovered.fallbackUsed, true);
  assert.equal(recovered.failures[0].failureClass, "provider_unavailable");
  assert.equal(fallbackEligible({ failureClass: "external_outcome_unknown", externalEffect: true }), false);
  await assert.rejects(() => invokeWithFallback({
    plans: [plan({ scenario: "unknown_outcome" }), plan()],
    invoke: current => provider.invoke(current)
  }), error => error.failureClass === "external_outcome_unknown" && error.failures.length === 1);
});
