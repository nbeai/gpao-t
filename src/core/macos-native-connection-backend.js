import { RuntimeError } from "./errors.js";
import { CodexOAuthAdapter } from "./providers/codex-oauth.js";

const CODEX_PROVIDER_ID = "codex-oauth";
const CODEX_CREDENTIAL_REF = "oauth:codex-oauth";
const DEFAULT_MODELS = Object.freeze(["gpt-5.5"]);

function failure(code, message, status = 400) {
  return new RuntimeError(code, message, status);
}

function codexConnection({ state = "connected", models = DEFAULT_MODELS } = {}) {
  return {
    credentialRef: CODEX_CREDENTIAL_REF,
    authMethod: "oauth",
    state,
    models: [...models]
  };
}

function isAuthFailure(error) {
  return error?.code === "auth_required" || error?.code === "provider_auth_required";
}

/**
 * macOS's first qualified protected backend. Codex owns the OAuth session;
 * GPAO-T3 checks and invokes it without reading, copying, or revoking its
 * token. Disconnect only removes GPAO-T3's local connection reference.
 */
export class MacOSNativeConnectionBackend {
  constructor({ codexAdapter = new CodexOAuthAdapter(), models = DEFAULT_MODELS, now = () => Date.now() } = {}) {
    if (!codexAdapter || typeof codexAdapter.checkConnection !== "function" || typeof codexAdapter.invoke !== "function") {
      throw failure("native_connection_backend_invalid", "A Codex OAuth adapter is required", 500);
    }
    if (!Array.isArray(models) || models.length === 0 || models.some(model => typeof model !== "string" || !model)) {
      throw failure("native_connection_backend_invalid", "A non-empty model list is required", 500);
    }
    this.codexAdapter = codexAdapter;
    this.models = [...models];
    this.now = now;
  }

  assertCodex(request) {
    if (request.providerId !== CODEX_PROVIDER_ID || request.authMethod !== "oauth") {
      throw failure("secure_connection_method_unavailable", "This protected backend currently supports the selected account connection only", 501);
    }
  }

  assertReference(request) {
    if (request.credentialRef !== CODEX_CREDENTIAL_REF) {
      throw failure("credential_not_found", "This account connection is no longer available", 404);
    }
  }

  async verify() {
    try {
      await this.codexAdapter.checkConnection();
      return codexConnection({ models: this.models });
    } catch (error) {
      if (isAuthFailure(error)) return codexConnection({ state: "auth_required", models: this.models });
      throw failure("secure_connection_unavailable", "The account connection could not be checked. Try again shortly.", 503);
    }
  }

  async begin(request) {
    this.assertCodex(request);
    const connection = await this.verify();
    if (connection.state !== "connected") {
      throw failure("auth_required", "ChatGPT / Codex account connection is required", 401);
    }
    return connection;
  }

  async status(request) {
    this.assertReference(request);
    return this.verify();
  }

  async revoke(request) {
    this.assertReference(request);
    return codexConnection({ state: "revoked", models: this.models });
  }

  async invoke(request, { signal = null } = {}) {
    this.assertReference(request);
    if (request.providerId !== CODEX_PROVIDER_ID) throw failure("credential_provider_mismatch", "The selected account does not match this model", 409);
    if (!this.models.includes(request.modelId)) throw failure("invalid_model_selection", "The selected model is not available for this account", 400);
    const message = request.input?.message;
    if (typeof message !== "string" || !message.trim()) throw failure("invalid_provider_input", "A message is required", 400);
    const startedAt = this.now();
    const response = await this.codexAdapter.invoke({
      runId: request.requestId,
      providerId: CODEX_PROVIDER_ID,
      modelId: request.modelId,
      generation: 0
    }, { input: message, signal });
    const finishedAt = this.now();
    return {
      result: response.result.usage === undefined
        ? { text: response.result.text }
        : { text: response.result.text, usage: response.result.usage },
      receipt: {
        providerId: CODEX_PROVIDER_ID,
        modelId: request.modelId,
        outcome: "completed",
        startedAt,
        finishedAt
      }
    };
  }
}
