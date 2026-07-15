import { ProviderInvocationError, createInvocationPlan, normalizeProviderFailure } from "./provider.js";

const IDENTIFIER = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;
const AUTH_METHODS = new Set(["api_key", "oauth", "local"]);
const RAW_SECRET = /(?:^|[\s"'=])(?:sk[-_][a-z0-9_-]{8,}|bearer\s+[a-z0-9._~+\/-]{12,}|api[_-]?key\s*[=:]\s*\S+)/i;

function rank(value, fallback = 100) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeSelection(selection = {}) {
  return {
    preferredProviderId: selection.preferredProviderId || selection.providerId || null,
    preferredModelId: selection.preferredModelId || selection.modelId || null,
    routePolicy: normalizeRoutePolicy(selection.routePolicy || selection.policy || {})
  };
}

function normalizeRoutePolicy(policy = {}) {
  const optimizeFor = ["balanced", "latency", "cost", "authority"].includes(policy.optimizeFor) ? policy.optimizeFor : "balanced";
  return {
    optimizeFor,
    maxLatencyMs: Number.isFinite(policy.maxLatencyMs) ? policy.maxLatencyMs : null,
    maxCostRank: Number.isFinite(policy.maxCostRank) ? policy.maxCostRank : null,
    maxAuthorityRank: Number.isFinite(policy.maxAuthorityRank) ? policy.maxAuthorityRank : null
  };
}

function policyWeights(policy) {
  if (policy.optimizeFor === "latency") return { latency: 4, cost: 1, authority: 1, priority: 1 };
  if (policy.optimizeFor === "cost") return { latency: 1, cost: 20, authority: 1, priority: 1 };
  if (policy.optimizeFor === "authority") return { latency: 1, cost: 1, authority: 20, priority: 1 };
  return { latency: 2, cost: 2, authority: 2, priority: 1 };
}

function routeMetrics(provider, model) {
  return {
    latencyMs: rank(model.routePolicy?.latencyMs, rank(provider.routePolicy?.latencyMs, 1000)),
    costRank: rank(model.routePolicy?.costRank, rank(provider.routePolicy?.costRank, 100)),
    authorityRank: rank(model.routePolicy?.authorityRank, rank(provider.routePolicy?.authorityRank, 50)),
    priority: rank(model.priority, rank(provider.priority))
  };
}

function routeScore(metrics, policy) {
  const weights = policyWeights(policy);
  return (metrics.latencyMs * weights.latency)
    + (metrics.costRank * weights.cost)
    + (metrics.authorityRank * weights.authority)
    + (metrics.priority * weights.priority);
}

function candidateAllowed(metrics, policy) {
  if (policy.maxLatencyMs !== null && metrics.latencyMs > policy.maxLatencyMs) return false;
  if (policy.maxCostRank !== null && metrics.costRank > policy.maxCostRank) return false;
  if (policy.maxAuthorityRank !== null && metrics.authorityRank > policy.maxAuthorityRank) return false;
  return true;
}

function protectedConnectionMetadata(connection) {
  if (connection === undefined || connection === null) return null;
  if (!connection || typeof connection !== "object" || Array.isArray(connection)) {
    throw new ProviderInvocationError("invalid_request", "Protected connection metadata must be an object");
  }
  for (const key of Object.keys(connection)) {
    if (!["credentialRef", "authMethod"].includes(key)) {
      throw new ProviderInvocationError("invalid_request", "Protected connection metadata contains an unsupported field", { field: key });
    }
  }
  if (typeof connection.credentialRef !== "string" || !IDENTIFIER.test(connection.credentialRef) || RAW_SECRET.test(connection.credentialRef)) {
    throw new ProviderInvocationError("invalid_request", "Protected connection credentialRef must be an opaque identifier");
  }
  if (!AUTH_METHODS.has(connection.authMethod)) {
    throw new ProviderInvocationError("invalid_request", "Protected connection authMethod is invalid");
  }
  return Object.freeze({ credentialRef: connection.credentialRef, authMethod: connection.authMethod });
}

function readyCandidates(registry, { requiredCapabilities = ["text"], preferredProviderId = null, preferredModelId = null, routePolicy = {} } = {}) {
  registry.refreshHealth?.();
  const policy = normalizeRoutePolicy(routePolicy);
  const providers = registry.snapshot().providers;
  const candidates = [];
  for (const provider of providers) {
    if (provider.health.state !== "ready" || provider.auth.state !== "configured") continue;
    if (preferredProviderId && provider.id !== preferredProviderId) continue;
    for (const model of provider.models) {
      if (preferredModelId && model.id !== preferredModelId) continue;
      if (!requiredCapabilities.every(capability => model.capabilities.includes(capability))) continue;
      const metrics = routeMetrics(provider, model);
      if (!candidateAllowed(metrics, policy)) continue;
      candidates.push({ provider, model, metrics, score: routeScore(metrics, policy) });
    }
  }
  return candidates.sort((left, right) => {
    const leftPreferred = left.provider.id === preferredProviderId && left.model.id === preferredModelId ? 0 : 1;
    const rightPreferred = right.provider.id === preferredProviderId && right.model.id === preferredModelId ? 0 : 1;
    return leftPreferred - rightPreferred
      || left.score - right.score
      || left.metrics.priority - right.metrics.priority
      || left.provider.id.localeCompare(right.provider.id)
      || left.model.id.localeCompare(right.model.id);
  });
}

function routeDecision({ candidates, selected, selection, failures = [], fallbackUsed = false }) {
  return {
    schema: "gpao_t3.model_route_decision.v1",
    policy: selection.routePolicy,
    selected: selected ? {
      providerId: selected.provider.id,
      modelId: selected.model.id,
      adapter: selected.provider.adapter,
      score: selected.score,
      metrics: selected.metrics
    } : null,
    considered: candidates.map(candidate => ({
      providerId: candidate.provider.id,
      modelId: candidate.model.id,
      score: candidate.score,
      metrics: candidate.metrics
    })),
    failures: failures.map(failure => ({
      providerId: failure.providerId,
      modelId: failure.modelId,
      failureClass: failure.failureClass,
      externalEffect: failure.externalEffect,
      routeHealthReason: failure.routeHealthReason || null
    })),
    fallbackUsed
  };
}

export class ProviderAdapterRegistry {
  constructor({ adapters = [] } = {}) {
    this.adapters = new Map();
    for (const entry of adapters) this.register(entry);
  }

  register({ id, adapter }) {
    if (!id || typeof adapter?.invoke !== "function") throw new TypeError("A provider adapter id and invoke function are required");
    this.adapters.set(String(id), adapter);
  }

  require(id) {
    const adapter = this.adapters.get(String(id));
    if (!adapter) throw new ProviderInvocationError("provider_unavailable", "No GPAO-T3 connection adapter is available for this provider");
    return adapter;
  }

  async invoke({ adapterId, plan, input, credential, signal }) {
    return this.require(adapterId).invoke(plan, { input, credential, signal });
  }

  supportsStreaming(adapterId) {
    return typeof this.require(adapterId).stream === "function";
  }

  stream({ adapterId, plan, input, credential, signal }) {
    const adapter = this.require(adapterId);
    if (typeof adapter.stream !== "function") throw new ProviderInvocationError("provider_unavailable", "Provider adapter does not support streaming");
    return adapter.stream(plan, { input, credential, signal });
  }
}

export class ModelRouter {
  constructor({ providerRegistry, adapterRegistry, credentialResolver = async () => null, protectedInvoker = null, routeHealth = null } = {}) {
    if (protectedInvoker !== null && typeof protectedInvoker !== "function") throw new TypeError("A protected invoker must be a function");
    this.providerRegistry = providerRegistry;
    this.adapterRegistry = adapterRegistry;
    this.credentialResolver = credentialResolver;
    this.protectedInvoker = protectedInvoker;
    this.routeHealth = routeHealth;
  }

  select(options = {}) {
    const selection = normalizeSelection(options);
    const candidates = readyCandidates(this.providerRegistry, { ...options, ...selection });
    if (candidates.length) return candidates;
    const requested = selection.preferredProviderId
      ? this.providerRegistry.get(selection.preferredProviderId)
      : null;
    if (requested?.auth.state !== "configured") throw new ProviderInvocationError("auth_required", "The selected provider needs a connection");
    if (selection.preferredProviderId || selection.preferredModelId) throw new ProviderInvocationError("invalid_request", "The selected model is unavailable for this request");
    throw new ProviderInvocationError("provider_unavailable", "No ready provider can satisfy this request");
  }

  async invoke({ runId, sessionId, generation, idempotencyKey, input, sourceContextDigest, selection = {}, protectedConnection = null, timeoutMs = 30_000, responseBudget = 8_192, signal, onDelta } = {}) {
    const normalizedSelection = normalizeSelection(selection);
    const protectedMetadata = protectedConnectionMetadata(protectedConnection);
    if (protectedMetadata && !this.protectedInvoker) {
      throw new ProviderInvocationError("provider_unavailable", "No protected provider invoker is configured");
    }
    const candidates = this.select(normalizedSelection);
    const failures = [];
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const { provider, model } = candidate;
      const plan = createInvocationPlan({
        runId,
        sessionId,
        generation,
        idempotencyKey,
        providerId: provider.id,
        modelId: model.id,
        inputDigest: "runtime-redacted",
        authorityPermitDigest: "runtime-bound",
        sourceContextDigest,
        timeoutMs,
        responseBudget
      });
      const admission = this.routeHealth?.admit({ providerId: provider.id });
      if (admission && !admission.admitted) {
        const blocked = new ProviderInvocationError("provider_unavailable", "The selected provider is temporarily unavailable", {
          routeHealthReason: admission.reason,
          retryAt: admission.retryAt
        });
        failures.push({ providerId: provider.id, modelId: model.id, routeHealthReceipt: null, failureClass: "provider_unavailable", externalEffect: false, routeHealthReason: admission.reason });
        const requested = Boolean(normalizedSelection.preferredProviderId || normalizedSelection.preferredModelId);
        const nextCandidate = candidates[index + 1] || null;
        const crossProvider = nextCandidate && nextCandidate.provider.id !== provider.id;
        if (!requested && nextCandidate && (!crossProvider || selection.allowCrossProviderFallback === true)) continue;
        throw Object.assign(blocked, { failures, providerPlan: plan });
      }
      let routeHealthReceipt = null;
      try {
        const credential = protectedMetadata ? null : await this.credentialResolver({ providerId: provider.id, modelId: model.id });
        const controller = new AbortController();
        const cancel = () => controller.abort(signal?.reason || new ProviderInvocationError("external_outcome_unknown", "Provider request was cancelled"));
        if (signal?.aborted) cancel();
        else signal?.addEventListener("abort", cancel, { once: true });
        const deadline = setTimeout(() => controller.abort(new ProviderInvocationError("provider_timeout", "Provider response exceeded the local deadline")), timeoutMs);
        let result;
        try {
          const streamSupported = !protectedMetadata && model.capabilities.includes("streaming") && this.adapterRegistry.supportsStreaming(provider.adapter);
          if (typeof onDelta === "function" && streamSupported) {
            let terminal = null;
            for await (const chunk of this.adapterRegistry.stream({ adapterId: provider.adapter, plan, input, credential, signal: controller.signal })) {
              if (chunk.type === "delta" && chunk.text) await onDelta({ text: chunk.text, sequence: chunk.seq, providerId: provider.id, modelId: model.id });
              if (chunk.terminal) terminal = chunk;
            }
            if (!terminal) throw new ProviderInvocationError("external_outcome_unknown", "Provider stream ended without a terminal receipt");
            result = { status: "succeeded", runId: plan.runId, providerId: provider.id, modelId: model.id, result: { text: terminal.text }, receipt: terminal.receipt };
          } else {
            result = protectedMetadata
              ? await this.#invokeProtected({ plan, input, protectedMetadata, signal: controller.signal })
              : await this.adapterRegistry.invoke({ adapterId: provider.adapter, plan, input, credential, signal: controller.signal });
          }
        } finally {
          clearTimeout(deadline);
          signal?.removeEventListener("abort", cancel);
        }
        routeHealthReceipt = this.#settleRouteHealth(admission?.lease, { ok: true });
        const fallbackUsed = index > 0;
        return { provider, model, providerPlan: plan, providerResult: result, routeHealthReceipt, failures, fallbackUsed, routeDecision: routeDecision({ candidates, selected: candidate, selection: normalizedSelection, failures, fallbackUsed }) };
      } catch (error) {
        const failure = normalizeProviderFailure(error);
        routeHealthReceipt ||= this.#settleRouteHealth(admission?.lease, { ...failure, ok: false });
        this.providerRegistry.recordFailure?.(provider.id, failure);
        failures.push({ providerId: provider.id, modelId: model.id, routeHealthReceipt, ...failure });
        const requested = Boolean(normalizedSelection.preferredProviderId || normalizedSelection.preferredModelId);
        const nextCandidate = candidates[index + 1] || null;
        const crossProvider = nextCandidate && nextCandidate.provider.id !== provider.id;
        const canFallback = !requested && failure.failureClass !== "external_outcome_unknown" && failure.externalEffect === false && ["rate_limited", "provider_timeout", "provider_unavailable"].includes(failure.failureClass)
          && (!crossProvider || selection.allowCrossProviderFallback === true);
        if (!canFallback || index === candidates.length - 1) throw Object.assign(error, { failures, providerPlan: plan });
      }
    }
    throw new ProviderInvocationError("failed", "No model route completed");
  }

  #settleRouteHealth(lease, outcome) {
    return lease ? this.routeHealth.settle({ lease, outcome }) : null;
  }

  async #invokeProtected({ plan, input, protectedMetadata, signal }) {
    try {
      return await this.protectedInvoker({
        plan,
        input,
        credentialRef: protectedMetadata.credentialRef,
        authMethod: protectedMetadata.authMethod,
        signal
      });
    } catch (error) {
      if (error?.code === "protected_connection_outcome_unknown") {
        throw new ProviderInvocationError("external_outcome_unknown", "Protected provider outcome is unknown", {
          protectedOutcome: "unknown"
        });
      }
      throw error;
    }
  }
}
