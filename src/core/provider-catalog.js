import { ProviderRegistry } from "./provider.js";
import { ProviderAdapterRegistry } from "./model-router.js";
import { OpenAiResponsesAdapter } from "./providers/openai-responses.js";
import { AnthropicMessagesAdapter } from "./providers/anthropic-messages.js";
import { CodexOAuthAdapter } from "./providers/codex-oauth.js";
import { GeminiGenerateContentAdapter } from "./providers/gemini-generate-content.js";
import { OllamaLocalAdapter } from "./providers/ollama-local.js";
import { createTrustedProviderCatalog } from "./provider-catalog-policy.js";

function configured(environment, key) {
  return typeof environment?.[key] === "string" && environment[key].trim().length > 0;
}

function value(environment, key, fallback) {
  const candidate = environment?.[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : fallback;
}

const ADAPTER_VERSIONS = Object.freeze({
  "openai-responses": "0.1",
  "anthropic-messages": "0.1",
  "gemini-generate-content": "0.1",
  "codex-oauth": "0.1",
  "ollama-local": "0.1",
  "native-deterministic-emulator": "0.1"
});

function externalProvider({ id, adapter, priority, credentialPresent, modelId, display }) {
  return {
    id,
    adapter,
    adapterVersion: "0.1",
    priority,
    display,
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
export function createNativeProviderCatalog({ environment = process.env, fetchImpl = fetch, emulator, allowEnvironmentCredentialCompatibility = false } = {}) {
  const trustedCatalog = createTrustedProviderCatalog({ adapterVersions: ADAPTER_VERSIONS });
  const providerDefinition = id => trustedCatalog.providers.find(provider => provider.id === id);
  const openAiConfigured = allowEnvironmentCredentialCompatibility && configured(environment, "GPAO_T3_OPENAI_API_KEY");
  const anthropicConfigured = allowEnvironmentCredentialCompatibility && configured(environment, "GPAO_T3_ANTHROPIC_API_KEY");
  const registry = new ProviderRegistry({
    entries: [
      externalProvider({
        id: "openai",
        adapter: "openai-responses",
        priority: 20,
        credentialPresent: openAiConfigured,
        modelId: value(environment, "GPAO_T3_OPENAI_MODEL", "gpt-5.6"),
        display: { name: "OpenAI API", authMethods: ["api_key"], description: "OpenAI API 키로 연결합니다." }
      }),
      {
        id: "codex-oauth",
        adapter: "codex-oauth",
        adapterVersion: "0.1",
        priority: 15,
        display: { name: "ChatGPT / Codex", authMethods: ["oauth"], description: "기기에 이미 로그인된 Codex 계정을 사용합니다." },
        auth: { kind: "oauth", credentialPresent: value(environment, "GPAO_T3_CODEX_OAUTH_ENABLED", "") === "1" },
        health: { state: value(environment, "GPAO_T3_CODEX_OAUTH_ENABLED", "") === "1" ? "ready" : "unknown", failureClass: null, cooldownUntil: null },
        models: [{ id: value(environment, "GPAO_T3_CODEX_OAUTH_MODEL", "gpt-5.5"), capabilities: ["text"], inputModalities: ["text"], outputModalities: ["text"], contextLimit: 0, responseLimit: 8_192, priority: 15 }]
      },
      externalProvider({
        id: "anthropic",
        adapter: "anthropic-messages",
        priority: 30,
        credentialPresent: anthropicConfigured,
        modelId: value(environment, "GPAO_T3_ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
        display: { name: "Anthropic Claude API", authMethods: ["api_key"], description: "Anthropic API 키로 연결합니다." }
      }),
      externalProvider({
        id: "google-gemini",
        adapter: "gemini-generate-content",
        priority: 40,
        credentialPresent: allowEnvironmentCredentialCompatibility && (configured(environment, "GPAO_T3_GEMINI_API_KEY") || configured(environment, "GEMINI_API_KEY")),
        modelId: value(environment, "GPAO_T3_GEMINI_MODEL", "gemini-3.5-flash"),
        display: { name: "Google Gemini API", authMethods: ["api_key"], description: "Google AI Studio API 키로 연결합니다." }
      }),
      {
        id: "local-ollama",
        adapter: "ollama-local",
        adapterVersion: "0.1",
        priority: 80,
        display: { name: "로컬 모델 (Ollama)", authMethods: ["local"], description: "이 기기의 Ollama 모델을 연결합니다." },
        auth: { kind: "local", credentialPresent: false },
        health: { state: "unknown", failureClass: null, cooldownUntil: null },
        models: [{ id: "local-model-pending", capabilities: ["text"], inputModalities: ["text"], outputModalities: ["text"], contextLimit: 0, responseLimit: 8_192, priority: 80 }]
      },
      {
        id: "local-model",
        adapter: "native-deterministic-emulator",
        adapterVersion: "0.1",
        priority: 90,
        display: { name: "GPAO-T3 로컬 확인 엔진", authMethods: ["local"], description: "런타임 확인과 복구에 사용하는 내장 엔진입니다." },
        auth: { kind: "local", credentialPresent: true },
        health: { state: "ready", failureClass: null, cooldownUntil: null },
        models: [{
          id: "deterministic-echo",
          capabilities: ["text", "streaming"],
          inputModalities: ["text"],
          outputModalities: ["text"],
          contextLimit: 65_536,
          responseLimit: 8_192,
          priority: 90
        }]
      },
      {
        id: "gpao-t-emulator",
        adapter: "native-deterministic-emulator",
        adapterVersion: "0.1",
        priority: 100,
        display: { name: "GPAO-T3 로컬 확인 모델", authMethods: ["none"], description: "런타임 복구와 내부 확인용 모델입니다." },
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
      { id: "openai-responses", adapter: new OpenAiResponsesAdapter({ fetchImpl, baseUrl: providerDefinition("openai").baseUrl }) },
      { id: "anthropic-messages", adapter: new AnthropicMessagesAdapter({ fetchImpl, baseUrl: providerDefinition("anthropic").baseUrl }) },
      { id: "gemini-generate-content", adapter: new GeminiGenerateContentAdapter({ fetchImpl, baseUrl: providerDefinition("google-gemini").baseUrl }) },
      { id: "codex-oauth", adapter: new CodexOAuthAdapter({ command: value(environment, "GPAO_T3_CODEX_BIN", "codex") }) },
      { id: "ollama-local", adapter: new OllamaLocalAdapter() },
      { id: "native-deterministic-emulator", adapter: emulator }
    ]
  });
  const credentialResolver = async ({ providerId }) => {
    if (!allowEnvironmentCredentialCompatibility) return null;
    if (providerId === "openai") return openAiConfigured ? environment.GPAO_T3_OPENAI_API_KEY.trim() : null;
    if (providerId === "anthropic") return anthropicConfigured ? environment.GPAO_T3_ANTHROPIC_API_KEY.trim() : null;
    if (providerId === "google-gemini") return configured(environment, "GPAO_T3_GEMINI_API_KEY") ? environment.GPAO_T3_GEMINI_API_KEY.trim() : (configured(environment, "GEMINI_API_KEY") ? environment.GEMINI_API_KEY.trim() : null);
    return null;
  };
  return { providerRegistry: registry, providerAdapters: adapters, credentialResolver };
}
