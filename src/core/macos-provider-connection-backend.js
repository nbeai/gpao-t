import { RuntimeError } from "./errors.js";
import { MacKeychainCredentialStore } from "./credential-store.js";
import { MacOSSecretAcquirer } from "./macos-secret-acquirer.js";
import { MacOSNativeConnectionBackend } from "./macos-native-connection-backend.js";
import { OpenAiResponsesAdapter } from "./providers/openai-responses.js";
import { AnthropicMessagesAdapter } from "./providers/anthropic-messages.js";
import { GeminiGenerateContentAdapter } from "./providers/gemini-generate-content.js";
import { OllamaLocalAdapter } from "./providers/ollama-local.js";

const DEFINITIONS = Object.freeze({
  openai: Object.freeze({ authMethod: "api_key", models: Object.freeze(["gpt-5.6"]) }),
  anthropic: Object.freeze({ authMethod: "api_key", models: Object.freeze(["claude-sonnet-4-20250514"]) }),
  "google-gemini": Object.freeze({ authMethod: "api_key", models: Object.freeze(["gemini-3.5-flash"]) }),
  "local-ollama": Object.freeze({ authMethod: "local", models: Object.freeze(["local-model-pending"]) }),
  "local-model": Object.freeze({ authMethod: "local", models: Object.freeze(["deterministic-echo"]) })
});

const FAILURE_MESSAGES = Object.freeze({
  auth_required: ["Provider authentication needs to be renewed", 401],
  rate_limited: ["The provider is rate limited. Wait before trying again", 429],
  provider_timeout: ["The provider did not respond in time", 504],
  provider_unavailable: ["The provider is temporarily unavailable", 503],
  content_blocked: ["The provider blocked this request", 409],
  invalid_request: ["The provider rejected this request", 400],
  failed: ["The provider did not return a usable answer", 502],
  external_outcome_unknown: ["The provider outcome is unknown and will not be retried automatically", 504]
});

function connection(providerId, state, credentialRef = null, models = null) {
  const definition = DEFINITIONS[providerId];
  return { credentialRef: credentialRef || `${definition.authMethod}:${providerId}`, authMethod: definition.authMethod, state, models: [...(models || definition.models)] };
}

function safeProviderFailure(code) {
  const [message, status] = FAILURE_MESSAGES[code] || FAILURE_MESSAGES.failed;
  return new RuntimeError(code in FAILURE_MESSAGES ? code : "failed", message, status);
}

export class MacOSProviderConnectionBackend {
  constructor({ credentialStore = new MacKeychainCredentialStore(), acquirer = new MacOSSecretAcquirer(), codexBackend = new MacOSNativeConnectionBackend(), adapters = null, now = () => Date.now() } = {}) {
    this.credentialStore = credentialStore;
    this.acquirer = acquirer;
    this.codexBackend = codexBackend;
    this.adapters = adapters || new Map([
      ["openai", new OpenAiResponsesAdapter()],
      ["anthropic", new AnthropicMessagesAdapter()],
      ["google-gemini", new GeminiGenerateContentAdapter()],
      ["local-ollama", new OllamaLocalAdapter()]
    ]);
    this.providerModels = new Map();
    this.providerResponseLimits = new Map();
    this.now = now;
  }

  definition(providerId) {
    const definition = DEFINITIONS[providerId];
    if (!definition) throw new RuntimeError("secure_connection_method_unavailable", "This provider connection is not supported", 501);
    return definition;
  }

  async begin(request) {
    if (request.providerId === "codex-oauth") return this.codexBackend.begin(request);
    const definition = this.definition(request.providerId);
    if (request.authMethod !== definition.authMethod) throw new RuntimeError("secure_connection_method_unavailable", "The selected connection method does not match this provider", 400);
    if (request.providerId === "local-ollama") {
      const health = await this.adapters.get(request.providerId).checkConnection();
      this.localModels = health.models;
      return connection(request.providerId, "connected", null, health.models);
    }
    if (definition.authMethod === "local") return connection(request.providerId, "connected");
    let secret = await this.acquirer.acquire({ providerId: request.providerId });
    let saved = null;
    try {
      saved = await this.credentialStore.save({ providerId: request.providerId, secret });
      const adapter = this.adapters.get(request.providerId);
      if (!adapter?.checkConnection) return connection(request.providerId, "connected", saved.handle);
      const checked = await this.credentialStore.withCredential(saved.handle, request.providerId, async credential => {
        try { return await adapter.checkConnection({ credential }); }
        catch (error) { return { providerFailure: String(error?.code || error?.failureClass || "failed") }; }
      });
      if (checked.providerFailure) throw safeProviderFailure(checked.providerFailure);
      this.providerModels.set(request.providerId, [...checked.models]);
      this.providerResponseLimits.set(request.providerId, new Map(Object.entries(checked.responseLimits || {})));
      return connection(request.providerId, "connected", saved.handle, checked.models);
    } catch (error) {
      if (saved) await this.credentialStore.remove(saved.handle, request.providerId).catch(() => {});
      throw error;
    } finally { secret = null; }
  }

  parseReference(credentialRef) {
    if (credentialRef === "oauth:codex-oauth") return { providerId: "codex-oauth", authMethod: "oauth" };
    for (const providerId of Object.keys(DEFINITIONS)) {
      const definition = DEFINITIONS[providerId];
      if (credentialRef === `${definition.authMethod}:${providerId}` || credentialRef === `keychain:${providerId}`) return { providerId, authMethod: definition.authMethod };
    }
    throw new RuntimeError("credential_not_found", "This model connection is no longer available", 404);
  }

  async status(request) {
    const reference = this.parseReference(request.credentialRef);
    if (reference.providerId === "codex-oauth") return this.codexBackend.status(request);
    if (reference.providerId === "local-ollama") {
      try {
        const health = await this.adapters.get(reference.providerId).checkConnection();
        this.localModels = health.models;
        return connection(reference.providerId, "connected", request.credentialRef, health.models);
      } catch { return connection(reference.providerId, "unavailable", request.credentialRef, this.localModels || []); }
    }
    if (reference.authMethod === "local") return connection(reference.providerId, "connected", request.credentialRef);
    const exists = await this.credentialStore.has(request.credentialRef, reference.providerId);
    return connection(reference.providerId, exists ? "connected" : "auth_required", request.credentialRef, this.providerModels.get(reference.providerId));
  }

  async revoke(request) {
    const reference = this.parseReference(request.credentialRef);
    if (reference.providerId === "codex-oauth") return this.codexBackend.revoke(request);
    if (reference.authMethod !== "local") await this.credentialStore.remove(request.credentialRef, reference.providerId);
    this.providerModels.delete(reference.providerId);
    this.providerResponseLimits.delete(reference.providerId);
    return connection(reference.providerId, "revoked", request.credentialRef);
  }

  async invoke(request, { signal = null } = {}) {
    const reference = this.parseReference(request.credentialRef);
    if (reference.providerId !== request.providerId) throw new RuntimeError("credential_provider_mismatch", "The selected connection does not match this provider", 409);
    if (reference.providerId === "codex-oauth") return this.codexBackend.invoke(request, { signal });
    const definition = this.definition(reference.providerId);
    const availableModels = reference.providerId === "local-ollama"
      ? (this.localModels || [])
      : (this.providerModels.get(reference.providerId) || definition.models);
    if (!availableModels.includes(request.modelId)) throw new RuntimeError("invalid_model_selection", "The selected model is not available for this connection", 400);
    const message = request.input?.message;
    if (typeof message !== "string" || !message.trim()) throw new RuntimeError("invalid_provider_input", "A message is required", 400);
    const startedAt = this.now();
    if (reference.providerId === "local-model") return this.publicResult(request, message, startedAt);
    const adapter = this.adapters.get(reference.providerId);
    if (!adapter) throw new RuntimeError("provider_unavailable", "The provider adapter is unavailable", 503);
    const invokeAdapter = async credential => {
      try {
        const discoveredLimit = this.providerResponseLimits.get(reference.providerId)?.get(request.modelId);
        const responseBudget = Math.min(Math.max(1, Number(request.responseBudget || 1_024)), Number(discoveredLimit || 8_192));
        const response = await adapter.invoke({
          runId: request.requestId, providerId: request.providerId, modelId: request.modelId,
          generation: 0, idempotencyKey: request.requestId, responseBudget
        }, { input: message, credential, signal });
        return { text: response.result.text, usage: response.result.usage };
      } catch (error) {
        return { providerFailure: String(error?.code || error?.failureClass || "failed") };
      }
    };
    const outcome = reference.authMethod === "local" ? await invokeAdapter(undefined) : await this.credentialStore.withCredential(request.credentialRef, reference.providerId, invokeAdapter);
    if (outcome.providerFailure) throw safeProviderFailure(outcome.providerFailure);
    return this.publicResult(request, outcome.text, startedAt, outcome.usage);
  }

  publicResult(request, text, startedAt, usage = undefined) {
    return {
      result: usage === undefined ? { text } : { text, usage },
      receipt: { providerId: request.providerId, modelId: request.modelId, outcome: "completed", startedAt, finishedAt: this.now() }
    };
  }
}

export const MACOS_PROVIDER_DEFINITIONS = DEFINITIONS;
