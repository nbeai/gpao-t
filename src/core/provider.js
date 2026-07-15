import { RuntimeError } from "./errors.js";

export const AUTH_STATES = Object.freeze([
  "configured",
  "auth_required",
  "expired",
  "revoked",
  "invalid",
  "provider_unavailable",
  "unknown"
]);

export const FAILURE_CLASSES = Object.freeze([
  "auth_required",
  "rate_limited",
  "provider_timeout",
  "provider_unavailable",
  "invalid_request",
  "external_outcome_unknown",
  "failed"
]);

const SECRET_KEY = /^(?:secret|token|api[_-]?key|password|authorization|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key|credential)$/i;

const FAILURE_SPECS = Object.freeze({
  auth_required: { retryable: false, externalEffect: false, status: 401 },
  rate_limited: { retryable: true, externalEffect: false, status: 429 },
  provider_timeout: { retryable: true, externalEffect: false, status: 504 },
  provider_unavailable: { retryable: true, externalEffect: false, status: 503 },
  invalid_request: { retryable: false, externalEffect: false, status: 400 },
  external_outcome_unknown: { retryable: false, externalEffect: true, status: 502 },
  failed: { retryable: false, externalEffect: false, status: 502 }
});

function rawSecretPath(value, parents = []) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = rawSecretPath(value[index], [...parents, String(index)]);
      if (found) return found;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value)) {
    const credentialValue = key === "value" && parents.some(parent => /credential|auth|secret/i.test(parent));
    if ((SECRET_KEY.test(key) || credentialValue) && child !== undefined && child !== null && child !== "") {
      return [...parents, key].join(".");
    }
    const found = rawSecretPath(child, [...parents, key]);
    if (found) return found;
  }
  return null;
}

export function assertNoRawSecretMaterial(value) {
  const found = rawSecretPath(value);
  if (found) {
    throw new RuntimeError("secret_material_forbidden", "Raw credential material cannot enter the native runtime contract", 400, { field: found });
  }
  return true;
}

function validAuthState(value) {
  return AUTH_STATES.includes(value) ? value : null;
}

export function authStatusFromProfile(profile = {}) {
  assertNoRawSecretMaterial(profile);
  if (profile.kind === "none" || profile.sourceKind === "none") return { state: "configured", sourceKind: "none" };
  const explicit = validAuthState(profile.state || profile.status);
  if (explicit) return { state: explicit, sourceKind: profile.sourceKind || profile.kind || "unknown" };
  if (profile.credentialPresent === true || profile.configured === true) return { state: "configured", sourceKind: profile.sourceKind || profile.kind || "unknown" };
  if (profile.credentialPresent === false || profile.configured === false) return { state: "auth_required", sourceKind: profile.sourceKind || profile.kind || "unknown" };
  return { state: "unknown", sourceKind: profile.sourceKind || profile.kind || "unknown" };
}

const DEFAULT_PROVIDER = Object.freeze({
  id: "gpao-t-emulator",
  adapter: "native-deterministic-emulator",
  adapterVersion: "0.1",
  auth: { kind: "none" },
  health: { state: "ready", failureClass: null, cooldownUntil: null },
  models: [{
    id: "deterministic-echo",
    capabilities: ["text", "streaming"],
    inputModalities: ["text"],
    outputModalities: ["text"],
    contextLimit: 65_536,
    responseLimit: 8_192
  }]
});

function publicProvider(entry) {
  return {
    id: entry.id,
    adapter: entry.adapter,
    adapterVersion: entry.adapterVersion,
    priority: entry.priority,
    auth: { ...entry.auth },
    health: { ...entry.health },
    models: entry.models.map(model => ({ ...model, capabilities: [...model.capabilities], inputModalities: [...model.inputModalities], outputModalities: [...model.outputModalities] }))
  };
}

export class ProviderRegistry {
  constructor({ entries = [DEFAULT_PROVIDER] } = {}) {
    this.entries = new Map();
    for (const entry of entries) this.register(entry);
  }

  register(entry) {
    assertNoRawSecretMaterial(entry);
    if (!entry?.id || !entry?.adapter) throw new RuntimeError("invalid_provider", "Provider id and adapter are required", 400);
    if (!Array.isArray(entry.models) || entry.models.length === 0) throw new RuntimeError("invalid_provider", "Provider must expose at least one model", 400);
    const normalized = {
      id: String(entry.id),
      adapter: String(entry.adapter),
      adapterVersion: String(entry.adapterVersion || "0.0"),
      priority: Number.isFinite(entry.priority) ? Number(entry.priority) : 100,
      auth: authStatusFromProfile(entry.auth || entry.credentialSource || { kind: "none" }),
      health: {
        state: entry.health?.state || "unknown",
        failureClass: entry.health?.failureClass || null,
        cooldownUntil: entry.health?.cooldownUntil || null
      },
      models: entry.models.map(model => ({
        id: String(model.id),
        capabilities: [...(model.capabilities || [])],
        inputModalities: [...(model.inputModalities || [])],
        outputModalities: [...(model.outputModalities || [])],
        contextLimit: Number(model.contextLimit || 0),
        responseLimit: Number(model.responseLimit || 0),
        priority: Number.isFinite(model.priority) ? Number(model.priority) : 100
      }))
    };
    this.entries.set(normalized.id, normalized);
    return publicProvider(normalized);
  }

  get(providerId) {
    const entry = this.entries.get(providerId);
    return entry ? publicProvider(entry) : null;
  }

  snapshot() {
    return { schema: "gpao_t.provider_registry.v1", providers: [...this.entries.values()].map(publicProvider) };
  }

  recordFailure(providerId, failure, { now = Date.now(), cooldownMs = 30_000 } = {}) {
    const entry = this.entries.get(providerId);
    if (!entry) return null;
    const normalized = normalizeProviderFailure(failure);
    entry.health.failureClass = normalized.failureClass;
    if (normalized.failureClass === "auth_required") {
      entry.auth = { ...entry.auth, state: "auth_required" };
      entry.health.state = "unknown";
      entry.health.cooldownUntil = null;
    } else if (normalized.failureClass === "rate_limited") {
      entry.health.state = "cooldown";
      entry.health.cooldownUntil = now + Math.max(1, Number(normalized.details?.cooldownMs || cooldownMs));
    } else if (normalized.failureClass === "provider_unavailable" || normalized.failureClass === "provider_timeout") {
      entry.health.state = "degraded";
      entry.health.cooldownUntil = now + Math.max(1, Number(normalized.details?.cooldownMs || cooldownMs));
    }
    return publicProvider(entry);
  }

  refreshHealth(now = Date.now()) {
    for (const entry of this.entries.values()) {
      if (["cooldown", "degraded"].includes(entry.health.state) && entry.health.cooldownUntil && entry.health.cooldownUntil <= now) {
        entry.health = { state: "ready", failureClass: null, cooldownUntil: null };
      }
    }
  }
}

export function createInvocationPlan(input = {}) {
  assertNoRawSecretMaterial(input);
  const required = ["runId", "sessionId", "generation", "idempotencyKey", "providerId", "modelId"];
  for (const key of required) if (input[key] === undefined || input[key] === null || input[key] === "") throw new RuntimeError("invalid_invocation_plan", `${key} is required`, 400);
  return {
    schema: "gpao_t.provider_invocation_plan.v1",
    runId: String(input.runId),
    sessionId: String(input.sessionId),
    generation: Number(input.generation),
    idempotencyKey: String(input.idempotencyKey),
    providerId: String(input.providerId),
    modelId: String(input.modelId),
    scenario: String(input.scenario || "success"),
    inputDigest: String(input.inputDigest || "redacted"),
    authorityPermitDigest: String(input.authorityPermitDigest || "redacted"),
    sourceContextDigest: String(input.sourceContextDigest || "none"),
    timeoutMs: Math.max(1, Number(input.timeoutMs || 1000)),
    responseBudget: Math.max(1, Number(input.responseBudget || 8192)),
    simulatedDelayMs: Math.max(0, Number(input.simulatedDelayMs || 0))
  };
}

export class ProviderInvocationError extends RuntimeError {
  constructor(failureClass, message, details = {}) {
    const spec = FAILURE_SPECS[failureClass] || FAILURE_SPECS.failed;
    super(failureClass, message, spec.status, { failureClass, retryable: spec.retryable, externalEffect: spec.externalEffect, ...details });
    this.failureClass = failureClass;
    this.retryable = spec.retryable;
    this.externalEffect = spec.externalEffect;
  }
}

function providerFailure(failureClass, message, details) {
  if (!FAILURE_CLASSES.includes(failureClass)) failureClass = "failed";
  return new ProviderInvocationError(failureClass, message, details);
}

function wait(ms, signal) {
  if (signal?.aborted) return Promise.reject(providerFailure("failed", "Provider operation was already aborted", { cancellation: "cancelled_before_send" }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(providerFailure("failed", "Provider operation was cancelled in flight", { cancellation: "cancelled_in_flight" }));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function cancellationFailure(kind) {
  return providerFailure("failed", `Provider operation ${kind}`, { cancellation: kind, retryable: false });
}

export class DeterministicProviderEmulator {
  constructor({ chunkDelayMs = 1 } = {}) {
    this.chunkDelayMs = chunkDelayMs;
  }

  async invoke(plan, { signal } = {}) {
    if (signal?.aborted || plan.scenario === "cancelled_before_send") throw cancellationFailure("cancelled_before_send");
    if (plan.scenario === "auth_required") throw providerFailure("auth_required", "Provider authentication is required");
    if (plan.scenario === "rate_limited") throw providerFailure("rate_limited", "Provider rate limit is active", { cooldownMs: 1000 });
    if (plan.scenario === "provider_unavailable") throw providerFailure("provider_unavailable", "Provider is unavailable");
    if (plan.scenario === "invalid_request") throw providerFailure("invalid_request", "Provider rejected the invocation plan");
    if (plan.scenario === "unknown_outcome") {
      await wait(Math.min(plan.simulatedDelayMs || 1, 10), signal);
      throw providerFailure("external_outcome_unknown", "External provider outcome is unknown");
    }
    if (plan.scenario === "provider_timeout") {
      await wait(plan.timeoutMs, signal);
      throw providerFailure("provider_timeout", "Provider response exceeded the local deadline");
    }
    if (plan.scenario === "cancelled_in_flight") {
      await wait(Math.max(plan.simulatedDelayMs, 1), signal);
      throw cancellationFailure("cancelled_in_flight");
    }
    await wait(plan.simulatedDelayMs, signal);
    return {
      status: "succeeded",
      runId: plan.runId,
      providerId: plan.providerId,
      modelId: plan.modelId,
      result: { text: "GPAO-T deterministic provider response" },
      receipt: { schema: "gpao_t.provider_receipt.v1", runId: plan.runId, generation: plan.generation, terminal: true }
    };
  }

  async *stream(plan, { signal } = {}) {
    if (plan.scenario !== "stream") return yield* this.streamFromInvoke(plan, { signal });
    if (signal?.aborted) throw cancellationFailure("cancelled_before_send");
    const chunks = ["GPAO-T", " provider", " stream"];
    let answer = "";
    for (let index = 0; index < chunks.length; index += 1) {
      await wait(this.chunkDelayMs, signal);
      answer += chunks[index];
      yield { runId: plan.runId, generation: plan.generation, seq: index + 1, type: "delta", text: chunks[index], terminal: false };
    }
    yield { runId: plan.runId, generation: plan.generation, seq: chunks.length + 1, type: "terminal", text: answer, terminal: true, receipt: { schema: "gpao_t.provider_receipt.v1", runId: plan.runId, generation: plan.generation, terminal: true } };
  }

  async *streamFromInvoke(plan, { signal } = {}) {
    const result = await this.invoke(plan, { signal });
    yield { runId: plan.runId, generation: plan.generation, seq: 1, type: "terminal", text: result.result.text, terminal: true, receipt: result.receipt };
  }
}

export function normalizeProviderFailure(error) {
  if (error instanceof ProviderInvocationError) {
    return {
      failureClass: error.failureClass,
      retryable: error.retryable,
      externalEffect: error.externalEffect,
      status: error.status,
      details: error.details || {}
    };
  }
  if (error && FAILURE_CLASSES.includes(error.failureClass)) {
    const spec = FAILURE_SPECS[error.failureClass];
    return {
      failureClass: error.failureClass,
      retryable: error.retryable ?? spec.retryable,
      externalEffect: error.externalEffect ?? spec.externalEffect,
      status: error.status ?? spec.status,
      details: error.details || {}
    };
  }
  return { failureClass: "failed", retryable: false, externalEffect: false, status: 502, details: { cause: "unmapped_provider_error" } };
}

export function fallbackEligible(failure) {
  const normalized = normalizeProviderFailure(failure);
  return normalized.externalEffect === false && normalized.failureClass !== "external_outcome_unknown";
}

export async function invokeWithFallback({ plans, invoke, signal }) {
  const failures = [];
  for (let index = 0; index < plans.length; index += 1) {
    try {
      return { ...await invoke(plans[index], { signal }), fallbackUsed: index > 0, failures };
    } catch (error) {
      const failure = normalizeProviderFailure(error);
      failures.push(failure);
      if (!fallbackEligible(failure) || index === plans.length - 1) throw Object.assign(error, { failures });
    }
  }
  throw providerFailure("failed", "No provider plan was available");
}
