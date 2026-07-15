import { ProviderInvocationError, createInvocationPlan, normalizeProviderFailure } from "./provider.js";

function rank(value, fallback = 100) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeSelection(selection = {}) {
  return {
    preferredProviderId: selection.preferredProviderId || selection.providerId || null,
    preferredModelId: selection.preferredModelId || selection.modelId || null
  };
}

function readyCandidates(registry, { requiredCapabilities = ["text"], preferredProviderId = null, preferredModelId = null } = {}) {
  registry.refreshHealth?.();
  const providers = registry.snapshot().providers;
  const candidates = [];
  for (const provider of providers) {
    if (provider.health.state !== "ready" || provider.auth.state !== "configured") continue;
    if (preferredProviderId && provider.id !== preferredProviderId) continue;
    for (const model of provider.models) {
      if (preferredModelId && model.id !== preferredModelId) continue;
      if (!requiredCapabilities.every(capability => model.capabilities.includes(capability))) continue;
      candidates.push({ provider, model });
    }
  }
  return candidates.sort((left, right) => {
    const leftPreferred = left.provider.id === preferredProviderId && left.model.id === preferredModelId ? 0 : 1;
    const rightPreferred = right.provider.id === preferredProviderId && right.model.id === preferredModelId ? 0 : 1;
    return leftPreferred - rightPreferred
      || rank(left.model.priority, rank(left.provider.priority)) - rank(right.model.priority, rank(right.provider.priority))
      || left.provider.id.localeCompare(right.provider.id)
      || left.model.id.localeCompare(right.model.id);
  });
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
    if (!adapter) throw new ProviderInvocationError("provider_unavailable", "No GPAO-T adapter is available for this provider");
    return adapter;
  }

  async invoke({ adapterId, plan, input, credential, signal }) {
    return this.require(adapterId).invoke(plan, { input, credential, signal });
  }
}

export class ModelRouter {
  constructor({ providerRegistry, adapterRegistry, credentialResolver = async () => null, routeHealth = null } = {}) {
    this.providerRegistry = providerRegistry;
    this.adapterRegistry = adapterRegistry;
    this.credentialResolver = credentialResolver;
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

  async invoke({ runId, sessionId, generation, idempotencyKey, input, sourceContextDigest, selection = {}, timeoutMs = 30_000, responseBudget = 8_192, signal } = {}) {
    const normalizedSelection = normalizeSelection(selection);
    const candidates = this.select(normalizedSelection);
    const failures = [];
    for (let index = 0; index < candidates.length; index += 1) {
      const { provider, model } = candidates[index];
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
        throw new ProviderInvocationError("provider_unavailable", "The selected provider is temporarily unavailable", {
          routeHealthReason: admission.reason,
          retryAt: admission.retryAt
        });
      }
      let routeHealthReceipt = null;
      try {
        const credential = await this.credentialResolver({ providerId: provider.id, modelId: model.id });
        const controller = new AbortController();
        const cancel = () => controller.abort(signal?.reason || new ProviderInvocationError("external_outcome_unknown", "Provider request was cancelled"));
        if (signal?.aborted) cancel();
        else signal?.addEventListener("abort", cancel, { once: true });
        const deadline = setTimeout(() => controller.abort(new ProviderInvocationError("provider_timeout", "Provider response exceeded the local deadline")), timeoutMs);
        let result;
        try {
          result = await this.adapterRegistry.invoke({ adapterId: provider.adapter, plan, input, credential, signal: controller.signal });
        } finally {
          clearTimeout(deadline);
          signal?.removeEventListener("abort", cancel);
        }
        routeHealthReceipt = this.#settleRouteHealth(admission?.lease, { ok: true });
        return { provider, model, providerPlan: plan, providerResult: result, routeHealthReceipt, failures, fallbackUsed: index > 0 };
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
}
