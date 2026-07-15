import { ProviderInvocationError } from "../provider.js";

export class OllamaLocalAdapter {
  constructor({ fetchImpl = fetch, baseUrl = "http://127.0.0.1:11434" } = {}) {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" || !["127.0.0.1", "::1", "localhost"].includes(url.hostname) || url.username || url.password || url.search || url.hash) {
      throw new TypeError("Ollama endpoint must be a clean loopback HTTP URL");
    }
    this.fetchImpl = fetchImpl;
    this.baseUrl = url.origin;
  }

  async checkConnection({ signal } = {}) {
    let response;
    try { response = await this.fetchImpl(`${this.baseUrl}/api/tags`, { signal }); }
    catch { throw new ProviderInvocationError("provider_unavailable", "Local model service is unavailable"); }
    if (!response.ok) throw new ProviderInvocationError("provider_unavailable", "Local model service is unavailable");
    const payload = await response.json();
    const models = (payload.models || []).map(model => String(model.name || model.model || "")).filter(model => /^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(model));
    if (!models.length) throw new ProviderInvocationError("provider_unavailable", "No local model is installed");
    return { state: "ready", models: [...new Set(models)] };
  }

  async invoke(plan, { input, signal } = {}) {
    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/api/chat`, {
        method: "POST", headers: { "content-type": "application/json" }, signal,
        body: JSON.stringify({ model: plan.modelId, stream: false, messages: [{ role: "user", content: input }], options: { num_predict: plan.responseBudget } })
      });
    } catch {
      if (signal?.aborted) throw new ProviderInvocationError("external_outcome_unknown", "Local model request was interrupted");
      throw new ProviderInvocationError("provider_unavailable", "Local model service is unavailable");
    }
    if (!response.ok) throw new ProviderInvocationError(response.status === 404 ? "invalid_request" : "provider_unavailable", "Local model request failed");
    const payload = await response.json();
    const text = payload?.message?.content;
    if (typeof text !== "string" || !text) throw new ProviderInvocationError("failed", "Local model returned no text output");
    return { status: "succeeded", runId: plan.runId, providerId: plan.providerId, modelId: plan.modelId, result: { text }, receipt: { schema: "gpao_t3.provider_receipt.v1", runId: plan.runId, generation: plan.generation, terminal: true, local: true } };
  }
}
