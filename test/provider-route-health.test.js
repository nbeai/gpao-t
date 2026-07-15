import assert from "node:assert/strict";
import test from "node:test";
import { ProviderRouteHealth } from "../src/core/provider-route-health.js";

function clock(start = 1_000) {
  let value = start;
  return { now: () => value, advance: milliseconds => { value += milliseconds; } };
}

test("provider route health enforces a deterministic per-provider concurrency limit", () => {
  const time = clock();
  const health = new ProviderRouteHealth({ now: time.now, policy: { maxConcurrent: 1 } });
  const first = health.admit({ providerId: "openai" });
  const second = health.admit({ providerId: "openai" });
  const otherProvider = health.admit({ providerId: "anthropic" });

  assert.equal(first.admitted, true);
  assert.equal(second.admitted, false);
  assert.equal(second.reason, "provider_concurrency_limited");
  assert.equal(otherProvider.admitted, true);
  health.settle({ lease: first.lease, outcome: { ok: true } });
  assert.equal(health.admit({ providerId: "openai" }).admitted, true);
});

test("rate limits honor retry-after cooldown without opening the circuit", () => {
  const time = clock();
  const health = new ProviderRouteHealth({ now: time.now });
  const admitted = health.admit({ providerId: "gemini" });
  const receipt = health.settle({ lease: admitted.lease, outcome: { failureClass: "rate_limited", retryAfterSeconds: 2 } });

  assert.equal(receipt.action, "rate_limit_cooldown");
  assert.equal(receipt.retryAfterMs, 2_000);
  assert.equal(receipt.state.circuit, "closed");
  assert.equal(health.admit({ providerId: "gemini" }).reason, "provider_cooldown");
  time.advance(2_000);
  assert.equal(health.admit({ providerId: "gemini" }).admitted, true);
});

test("bounded consecutive failures open the circuit and permit one recovery probe", () => {
  const time = clock();
  const health = new ProviderRouteHealth({ now: time.now, policy: { circuitFailureThreshold: 2, circuitCooldownMs: 100 } });

  for (let index = 0; index < 2; index += 1) {
    const admitted = health.admit({ providerId: "anthropic" });
    health.settle({ lease: admitted.lease, outcome: { failureClass: "provider_timeout" } });
  }
  assert.equal(health.snapshot("anthropic").circuit, "open");
  assert.equal(health.admit({ providerId: "anthropic" }).reason, "provider_cooldown");

  time.advance(100);
  const probe = health.admit({ providerId: "anthropic" });
  assert.equal(probe.admitted, true);
  assert.equal(probe.lease.recoveryProbe, true);
  assert.equal(health.admit({ providerId: "anthropic" }).reason, "recovery_probe_in_flight");
  const receipt = health.settle({ lease: probe.lease, outcome: { ok: true } });
  assert.equal(receipt.action, "recovery_probe_succeeded");
  assert.equal(receipt.state.circuit, "closed");
});

test("failure receipts record latency and a failed recovery probe reopens the circuit", () => {
  const time = clock();
  const health = new ProviderRouteHealth({ now: time.now, policy: { circuitFailureThreshold: 1, circuitCooldownMs: 50 } });
  const first = health.admit({ providerId: "openai" });
  time.advance(17);
  const opened = health.settle({ lease: first.lease, outcome: { failureClass: "provider_unavailable" } });
  assert.equal(opened.action, "circuit_opened");
  assert.equal(opened.latencyMs, 17);
  assert.equal(opened.schema, "gpao_t.provider_route_latency_receipt.v1");

  time.advance(50);
  const probe = health.admit({ providerId: "openai" });
  time.advance(3);
  const failedProbe = health.settle({ lease: probe.lease, outcome: { failureClass: "provider_timeout" } });
  assert.equal(failedProbe.action, "recovery_probe_failed");
  assert.equal(failedProbe.state.circuit, "open");
  assert.equal(failedProbe.latencyMs, 3);
  assert.throws(() => health.settle({ lease: probe.lease, outcome: { ok: true } }), /lease_already_settled/);
});
