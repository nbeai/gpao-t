import { ProviderInvocationError } from "../provider.js";

function failureFromResponse(response) {
  if (response.status === 401 || response.status === 403) return new ProviderInvocationError("auth_required", "Provider authentication failed");
  if (response.status === 429) return new ProviderInvocationError("rate_limited", "Provider rate limit is active");
  if (response.status >= 500) return new ProviderInvocationError("provider_unavailable", "Provider is unavailable");
  return new ProviderInvocationError("invalid_request", "Provider rejected the request");
}

export class AnthropicMessagesAdapter {
  constructor({ fetchImpl = fetch, baseUrl = "https://api.anthropic.com", version = "2023-06-01" } = {}) {
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.version = version;
  }

  async checkConnection({ credential, signal } = {}) {
    if (!credential) throw new ProviderInvocationError("auth_required", "A provider credential is required");
    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/v1/models`, {
        headers: { "x-api-key": credential, "anthropic-version": this.version }, signal
      });
    } catch {
      throw new ProviderInvocationError("provider_unavailable", "Provider network request failed");
    }
    if (!response.ok) throw failureFromResponse(response);
    const payload = await response.json();
    const models = (payload.data || []).map(model => String(model?.id || ""))
      .filter(id => /^claude-/i.test(id)).slice(0, 128);
    if (!models.length) throw new ProviderInvocationError("provider_unavailable", "No compatible provider model is available");
    return { state: "ready", models };
  }

  async invoke(plan, { input, credential, signal } = {}) {
    if (!credential) throw new ProviderInvocationError("auth_required", "A provider credential is required");
    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        headers: { "x-api-key": credential, "anthropic-version": this.version, "content-type": "application/json" },
        body: JSON.stringify({ model: plan.modelId, max_tokens: plan.responseBudget, messages: [{ role: "user", content: input }] }),
        signal
      });
    } catch (error) {
      if (signal?.aborted) throw signal.reason instanceof ProviderInvocationError ? signal.reason : new ProviderInvocationError("external_outcome_unknown", "Provider request was interrupted", { cancellation: "cancelled_in_flight" });
      throw new ProviderInvocationError("provider_unavailable", "Provider network request failed");
    }
    if (!response.ok) throw failureFromResponse(response);
    const payload = await response.json();
    const text = (payload.content || []).filter(block => block?.type === "text").map(block => block.text || "").join("");
    if (!text) throw new ProviderInvocationError("failed", "Provider returned no text output");
    return { status: "succeeded", runId: plan.runId, providerId: plan.providerId, modelId: plan.modelId, result: { text }, receipt: { schema: "gpao_t3.provider_receipt.v1", runId: plan.runId, generation: plan.generation, terminal: true, providerResponseId: payload.id || null, stopReason: payload.stop_reason || null } };
  }
}
