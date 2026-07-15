import { ProviderInvocationError } from "../provider.js";

function failureFromResponse(response) {
  if (response.status === 401 || response.status === 403) return new ProviderInvocationError("auth_required", "Provider authentication failed");
  if (response.status === 429) return new ProviderInvocationError("rate_limited", "Provider rate limit is active");
  if (response.status === 408 || response.status === 504) return new ProviderInvocationError("provider_timeout", "Provider response timed out");
  if (response.status >= 500) return new ProviderInvocationError("provider_unavailable", "Provider is unavailable");
  return new ProviderInvocationError("invalid_request", "Provider rejected the request");
}

function outputText(payload) {
  return (payload?.candidates?.[0]?.content?.parts || [])
    .filter(part => typeof part?.text === "string")
    .map(part => part.text).join("");
}

function modelPriority(id) {
  if (/^gemini-[\d.]+-flash$/i.test(id)) return 10;
  if (/^gemini-[\d.]+-flash-(?:latest|preview)/i.test(id)) return 20;
  if (/^gemini-[\d.]+-pro$/i.test(id)) return 30;
  return 100;
}

export class GeminiGenerateContentAdapter {
  constructor({ fetchImpl = fetch, baseUrl = "https://generativelanguage.googleapis.com/v1beta" } = {}) {
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async checkConnection({ credential, signal } = {}) {
    if (!credential) throw new ProviderInvocationError("auth_required", "A provider credential is required");
    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/models`, { headers: { "x-goog-api-key": credential }, signal });
    } catch {
      throw new ProviderInvocationError("provider_unavailable", "Provider network request failed");
    }
    if (!response.ok) throw failureFromResponse(response);
    const payload = await response.json();
    const compatible = (payload.models || [])
      .filter(model => (model?.supportedGenerationMethods || []).includes("generateContent"))
      .map(model => ({ id: String(model?.name || "").replace(/^models\//, ""), outputLimit: Number(model?.outputTokenLimit || 0) }))
      .filter(model => model.id && !/(?:embedding|image|tts|robotics|computer-use|deep-research|aqa)/i.test(model.id))
      .sort((left, right) => modelPriority(left.id) - modelPriority(right.id) || right.id.localeCompare(left.id))
      .slice(0, 128);
    const models = compatible.map(model => model.id);
    if (!models.length) throw new ProviderInvocationError("provider_unavailable", "No compatible provider model is available");
    return { state: "ready", models, responseLimits: Object.fromEntries(compatible.map(model => [model.id, model.outputLimit]).filter(([, limit]) => limit > 0)) };
  }

  async invoke(plan, { input, credential, signal } = {}) {
    if (!credential) throw new ProviderInvocationError("auth_required", "A provider credential is required");
    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/models/${encodeURIComponent(plan.modelId)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": credential },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: input }] }], generationConfig: { candidateCount: 1, maxOutputTokens: plan.responseBudget } }),
        signal
      });
    } catch (error) {
      if (signal?.aborted) throw signal.reason instanceof ProviderInvocationError ? signal.reason : new ProviderInvocationError("external_outcome_unknown", "Provider request was interrupted", { cancellation: "cancelled_in_flight" });
      throw new ProviderInvocationError("provider_unavailable", "Provider network request failed");
    }
    if (!response.ok) throw failureFromResponse(response);
    const payload = await response.json();
    if (!payload?.candidates?.length && payload?.promptFeedback?.blockReason) throw new ProviderInvocationError("content_blocked", "Provider safety policy blocked this request", { reason: String(payload.promptFeedback.blockReason).slice(0, 80) });
    const text = outputText(payload);
    if (!text) throw new ProviderInvocationError("failed", "Provider returned no text output");
    const candidate = payload.candidates[0];
    return { status: "succeeded", runId: plan.runId, providerId: plan.providerId, modelId: plan.modelId, result: { text }, receipt: { schema: "gpao_t3.provider_receipt.v1", runId: plan.runId, generation: plan.generation, terminal: true, providerResponseId: payload.responseId || null, stopReason: candidate.finishReason || null, modelVersion: payload.modelVersion || null, usage: { promptTokens: payload.usageMetadata?.promptTokenCount ?? null, outputTokens: payload.usageMetadata?.candidatesTokenCount ?? null, totalTokens: payload.usageMetadata?.totalTokenCount ?? null } } };
  }
}
