import crypto from "node:crypto";

const DEFAULT_POLICY = Object.freeze({
  maxConcurrent: 2,
  circuitFailureThreshold: 3,
  circuitCooldownMs: 30_000
});

const CIRCUIT_FAILURES = new Set([
  "provider_timeout",
  "provider_unavailable",
  "failed"
]);

function positiveInteger(value, fallback, name) {
  const normalized = value ?? fallback;
  if (!Number.isInteger(normalized) || normalized < 1) throw new Error(`provider_route_health_invalid_${name}`);
  return normalized;
}

function normalizePolicy(policy = {}) {
  return {
    maxConcurrent: positiveInteger(policy.maxConcurrent, DEFAULT_POLICY.maxConcurrent, "max_concurrent"),
    circuitFailureThreshold: positiveInteger(policy.circuitFailureThreshold, DEFAULT_POLICY.circuitFailureThreshold, "failure_threshold"),
    circuitCooldownMs: positiveInteger(policy.circuitCooldownMs, DEFAULT_POLICY.circuitCooldownMs, "circuit_cooldown")
  };
}

function retryAfterMs(outcome = {}) {
  const fromMs = Number(outcome.retryAfterMs ?? outcome.details?.retryAfterMs ?? outcome.details?.cooldownMs);
  if (Number.isFinite(fromMs) && fromMs > 0) return Math.ceil(fromMs);
  const fromSeconds = Number(outcome.retryAfterSeconds ?? outcome.details?.retryAfterSeconds);
  return Number.isFinite(fromSeconds) && fromSeconds > 0 ? Math.ceil(fromSeconds * 1000) : 0;
}

function providerIdOf(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("provider_route_health_invalid_provider");
  return value.trim();
}

function publicState(providerId, state) {
  return Object.freeze({
    providerId,
    inFlight: state.inFlight,
    consecutiveFailures: state.consecutiveFailures,
    cooldownUntil: state.cooldownUntil,
    circuit: state.circuit,
    recoveryProbeInFlight: state.recoveryProbeInFlight
  });
}

/**
 * Deterministic, in-process route health policy. It does not invoke providers;
 * callers receive an admission lease and must settle it with a redacted outcome.
 */
export class ProviderRouteHealth {
  constructor({ now = () => Date.now(), policy = {} } = {}) {
    if (typeof now !== "function") throw new Error("provider_route_health_invalid_clock");
    this.now = now;
    this.policy = normalizePolicy(policy);
    this.providers = new Map();
  }

  admit({ providerId, policy } = {}) {
    const id = providerIdOf(providerId);
    const effectivePolicy = normalizePolicy({ ...this.policy, ...policy });
    const state = this.#state(id);
    const now = this.now();

    if (state.cooldownUntil > now) return this.#blocked(id, state, "provider_cooldown", effectivePolicy);

    const recoveryProbe = state.circuit === "open";
    if (recoveryProbe && state.recoveryProbeInFlight) return this.#blocked(id, state, "recovery_probe_in_flight", effectivePolicy);
    if (!recoveryProbe && state.inFlight >= effectivePolicy.maxConcurrent) return this.#blocked(id, state, "provider_concurrency_limited", effectivePolicy);

    state.inFlight += 1;
    if (recoveryProbe) state.recoveryProbeInFlight = true;
    const lease = Object.freeze({
      schema: "gpao_t3.provider_route_lease.v1",
      leaseId: crypto.randomUUID(),
      providerId: id,
      admittedAt: now,
      recoveryProbe,
      policy: effectivePolicy
    });
    return Object.freeze({ admitted: true, lease, state: publicState(id, state) });
  }

  settle({ lease, outcome = {} } = {}) {
    if (!lease?.leaseId || !lease.providerId || !Number.isFinite(lease.admittedAt)) throw new Error("provider_route_health_invalid_lease");
    if (this.settled?.has(lease.leaseId)) throw new Error("provider_route_health_lease_already_settled");
    this.settled ||= new Set();
    this.settled.add(lease.leaseId);

    const state = this.#state(lease.providerId);
    if (state.inFlight < 1) throw new Error("provider_route_health_invalid_inflight");
    state.inFlight -= 1;
    if (lease.recoveryProbe) state.recoveryProbeInFlight = false;

    const finishedAt = this.now();
    const succeeded = outcome.ok === true;
    const failureClass = succeeded ? null : String(outcome.failureClass || "failed");
    const retryAfter = failureClass === "rate_limited" ? retryAfterMs(outcome) : 0;
    let action = succeeded ? "accepted" : "recorded";

    if (succeeded) {
      state.consecutiveFailures = 0;
      state.circuit = "closed";
      state.cooldownUntil = 0;
      if (lease.recoveryProbe) action = "recovery_probe_succeeded";
    } else if (failureClass === "rate_limited") {
      state.cooldownUntil = Math.max(state.cooldownUntil, finishedAt + retryAfter);
      action = "rate_limit_cooldown";
    } else if (CIRCUIT_FAILURES.has(failureClass)) {
      state.consecutiveFailures += 1;
      if (lease.recoveryProbe || state.consecutiveFailures >= lease.policy.circuitFailureThreshold) {
        state.circuit = "open";
        state.cooldownUntil = Math.max(state.cooldownUntil, finishedAt + lease.policy.circuitCooldownMs);
        action = lease.recoveryProbe ? "recovery_probe_failed" : "circuit_opened";
      }
    }

    return Object.freeze({
      schema: "gpao_t3.provider_route_latency_receipt.v1",
      leaseId: lease.leaseId,
      providerId: lease.providerId,
      recoveryProbe: lease.recoveryProbe,
      outcome: succeeded ? "succeeded" : "failed",
      failureClass,
      action,
      admittedAt: lease.admittedAt,
      finishedAt,
      latencyMs: Math.max(0, finishedAt - lease.admittedAt),
      retryAfterMs: retryAfter || null,
      state: publicState(lease.providerId, state)
    });
  }

  snapshot(providerId) {
    const id = providerIdOf(providerId);
    return publicState(id, this.#state(id));
  }

  #blocked(providerId, state, reason, policy) {
    return Object.freeze({
      admitted: false,
      reason,
      retryAt: state.cooldownUntil || null,
      policy,
      state: publicState(providerId, state)
    });
  }

  #state(providerId) {
    if (!this.providers.has(providerId)) {
      this.providers.set(providerId, { inFlight: 0, consecutiveFailures: 0, cooldownUntil: 0, circuit: "closed", recoveryProbeInFlight: false });
    }
    return this.providers.get(providerId);
  }
}
