import { ProviderRegistry } from "./provider.js";
import { ProviderAdapterRegistry } from "./model-router.js";
import { OpenAiResponsesAdapter } from "./providers/openai-responses.js";
import { AnthropicMessagesAdapter } from "./providers/anthropic-messages.js";
import { CodexOAuthAdapter } from "./providers/codex-oauth.js";

function configured(environment, key) {
  return typeof environment?.[key] === "string" && environment[key].trim().length > 0;
}

function value(environment, key, fallback) {
  const candidate = environment?.[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : fallback;
}

function externalProvider({ id, adapter, priority, credentialPresent, modelId }) {
  return {
    id,
    adapter,
    adapterVersion: "0.1",
    priority,
    auth: { kind: "environment", credentialPresent },
    health: { state: credentialPresent ? "ready" : "unknown", failureClass: null, cooldownUntil: null },
    models: [{
      id: modelId,
      capabilities: ["text"],
      inputModalities: ["text"],
      outputModalities: ["text"],
      contextLimit: 0,
      responseLimit: 8_192,
      priority
    }]
  };
}

/**
 * Builds a process-local provider catalog. Credentials never enter the public
 * registry, persisted state, task packets, receipts, or logs.
 */
export function createNativeProviderCatalog({ environment = process.env, fetchImpl = fetch, emulator } = {}) {
  const openAiConfigured = configured(environment, "GPAO_T_OPENAI_API_KEY");
  const anthropicConfigured = configured(environment, "GPAO_T_ANTHROPIC_API_KEY");
  const registry = new ProviderRegistry({
    entries: [
      externalProvider({
        id: "openai",
        adapter: "openai-responses",
        priority: 20,
        credentialPresent: openAiConfigured,
        modelId: value(environment, "GPAO_T_OPENAI_MODEL", "gpt-5.6")
      }),
      {
        id: "codex-oauth",
        adapter: "codex-oauth",
        adapterVersion: "0.1",
        priority: 15,
        auth: { kind: "oauth", credentialPresent: value(environment, "GPAO_T_CODEX_OAUTH_ENABLED", "") === "1" },
        health: { state: value(environment, "GPAO_T_CODEX_OAUTH_ENABLED", "") === "1" ? "ready" : "unknown", failureClass: null, cooldownUntil: null },
        models: [{ id: value(environment, "GPAO_T_CODEX_OAUTH_MODEL", "gpt-5.5"), capabilities: ["text"], inputModalities: ["text"], outputModalities: ["text"], contextLimit: 0, responseLimit: 8_192, priority: 15 }]
      },
      externalProvider({
        id: "anthropic",
        adapter: "anthropic-messages",
        priority: 30,
        credentialPresent: anthropicConfigured,
        modelId: value(environment, "GPAO_T_ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
      }),
      {
        id: "gpao-t-emulator",
        adapter: "native-deterministic-emulator",
        adapterVersion: "0.1",
        priority: 100,
        auth: { kind: "none" },
        health: { state: "ready", failureClass: null, cooldownUntil: null },
        models: [{
          id: "deterministic-echo",
          capabilities: ["text", "streaming"],
          inputModalities: ["text"],
          outputModalities: ["text"],
          contextLimit: 65_536,
          responseLimit: 8_192,
          priority: 100
        }]
      }
    ]
  });
  const adapters = new ProviderAdapterRegistry({
    adapters: [
      { id: "openai-responses", adapter: new OpenAiResponsesAdapter({ fetchImpl, baseUrl: value(environment, "GPAO_T_OPENAI_BASE_URL", "https://api.openai.com/v1") }) },
      { id: "anthropic-messages", adapter: new AnthropicMessagesAdapter({ fetchImpl, baseUrl: value(environment, "GPAO_T_ANTHROPIC_BASE_URL", "https://api.anthropic.com") }) },
      { id: "codex-oauth", adapter: new CodexOAuthAdapter({ command: value(environment, "GPAO_T_CODEX_BIN", "codex") }) },
      { id: "native-deterministic-emulator", adapter: emulator }
    ]
  });
  const credentialResolver = async ({ providerId }) => {
    if (providerId === "openai") return openAiConfigured ? environment.GPAO_T_OPENAI_API_KEY.trim() : null;
    if (providerId === "anthropic") return anthropicConfigured ? environment.GPAO_T_ANTHROPIC_API_KEY.trim() : null;
    return null;
  };
  return { providerRegistry: registry, providerAdapters: adapters, credentialResolver };
}
