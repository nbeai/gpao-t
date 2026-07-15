import { ProviderInvocationError } from "../provider.js";

function failureFromResponse(response) {
  if (response.status === 401 || response.status === 403) return new ProviderInvocationError("auth_required", "Provider authentication failed");
  if (response.status === 429) return new ProviderInvocationError("rate_limited", "Provider rate limit is active");
  if (response.status >= 500) return new ProviderInvocationError("provider_unavailable", "Provider is unavailable");
  return new ProviderInvocationError("invalid_request", "Provider rejected the request");
}

function outputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text) return payload.output_text;
  const blocks = Array.isArray(payload?.output) ? payload.output : [];
  return blocks.flatMap(block => Array.isArray(block.content) ? block.content : [])
    .filter(block => block?.type === "output_text" || block?.type === "text")
    .map(block => block.text || "").join("");
}

export class OpenAiResponsesAdapter {
  constructor({ fetchImpl = fetch, baseUrl = "https://api.openai.com/v1" } = {}) {
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async invoke(plan, { input, credential, signal } = {}) {
    if (!credential) throw new ProviderInvocationError("auth_required", "A provider credential is required");
    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/responses`, {
        method: "POST",
        headers: { authorization: `Bearer ${credential}`, "content-type": "application/json", "idempotency-key": plan.idempotencyKey },
        body: JSON.stringify({ model: plan.modelId, input, max_output_tokens: plan.responseBudget }),
        signal
      });
    } catch (error) {
      if (signal?.aborted) throw signal.reason instanceof ProviderInvocationError ? signal.reason : new ProviderInvocationError("external_outcome_unknown", "Provider request was interrupted", { cancellation: "cancelled_in_flight" });
      throw new ProviderInvocationError("provider_unavailable", "Provider network request failed");
    }
    if (!response.ok) throw failureFromResponse(response);
    const payload = await response.json();
    const text = outputText(payload);
    if (!text) throw new ProviderInvocationError("failed", "Provider returned no text output");
    return { status: "succeeded", runId: plan.runId, providerId: plan.providerId, modelId: plan.modelId, result: { text }, receipt: { schema: "gpao_t.provider_receipt.v1", runId: plan.runId, generation: plan.generation, terminal: true, providerResponseId: payload.id || null } };
  }
}
