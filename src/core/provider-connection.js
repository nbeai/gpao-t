import { RuntimeError } from "./errors.js";
import { presentRuntimeStatus } from "./presentation-status.js";

const AUTH_METHODS = new Set(["api_key", "oauth", "local"]);
const CONNECTION_STATES = new Set(["not_connected", "connecting", "connected", "auth_required", "expired", "unavailable", "revoked", "unknown"]);
const RUNTIME_STATES = Object.freeze({
  not_connected: "not_configured",
  connecting: "verifying",
  connected: "ready",
  unavailable: "provider_unavailable",
  revoked: "auth_required",
  unknown: "provider_unavailable"
});
const IDENTIFIER = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;
const SENSITIVE_KEY = /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret|credential(?!ref))/i;
const RAW_SECRET = /(?:^|[\s"'=])(?:sk[-_][a-z0-9_-]{8,}|bearer\s+[a-z0-9._~+\/-]{12,}|api[_-]?key\s*[=:]\s*\S+)/i;
const CONNECTION_FIELDS = new Set(["providerId", "credentialRef", "authMethod", "state", "models"]);

function failure(code, message, details = undefined) {
  return new RuntimeError(code, message, 400, details);
}

function secretPath(value, path = [], seen = new Set()) {
  if (typeof value === "string" && RAW_SECRET.test(value)) return path.join(".") || "value";
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = secretPath(value[index], [...path, String(index)], seen);
      if (found) return found;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key) && child !== undefined && child !== null && child !== "") return [...path, key].join(".");
    const found = secretPath(child, [...path, key], seen);
    if (found) return found;
  }
  return null;
}

function validateConnection(connection) {
  if (!connection || typeof connection !== "object" || Array.isArray(connection)) {
    throw failure("protected_connection_invalid_request", "Protected connection metadata must be an object");
  }
  const sensitiveField = secretPath(connection);
  if (sensitiveField) {
    throw failure("protected_connection_secret_forbidden", "Raw secrets cannot enter provider connection metadata", { field: sensitiveField });
  }
  for (const key of Object.keys(connection)) {
    if (!CONNECTION_FIELDS.has(key)) throw failure("protected_connection_invalid_request", "Protected connection metadata contains an unsupported field", { field: key });
  }
  const { providerId, credentialRef, authMethod, state, models } = connection;
  if (typeof providerId !== "string" || !IDENTIFIER.test(providerId)) throw failure("protected_connection_invalid_request", "providerId is required");
  if (typeof credentialRef !== "string" || !IDENTIFIER.test(credentialRef)) throw failure("protected_connection_invalid_request", "credentialRef is required");
  if (!AUTH_METHODS.has(authMethod)) throw failure("protected_connection_invalid_request", "authMethod is invalid");
  if (!CONNECTION_STATES.has(state)) throw failure("protected_connection_invalid_request", "state is invalid");
  if (!Array.isArray(models) || models.some(model => typeof model !== "string" || !IDENTIFIER.test(model))) {
    throw failure("protected_connection_invalid_request", "models must contain provider model identifiers");
  }
  return Object.freeze({ providerId, credentialRef, authMethod, state, models: Object.freeze([...models]) });
}

function runtimeState(state) {
  return RUNTIME_STATES[state] || state;
}

export class ProviderConnectionCenter {
  constructor({ providerRegistry = null, clock = () => Date.now() } = {}) {
    this.providerRegistry = providerRegistry;
    this.clock = clock;
    this.connections = new Map();
  }

  status(providerId) {
    const entry = this.connections.get(providerId);
    const state = entry ? runtimeState(entry.state) : "not_configured";
    return {
      schema: "gpao_t3.provider_connection.v2",
      providerId,
      state,
      configured: Boolean(entry),
      updatedAt: entry?.updatedAt || null,
      verifiedAt: entry?.state === "connected" ? entry.updatedAt : null,
      models: entry ? [...entry.models] : [],
      presentation: presentRuntimeStatus(state)
    };
  }

  hydrate(entries = []) {
    for (const entry of entries) {
      try {
        this.adopt(entry);
      } catch {
        // Persisted legacy secret-bearing records are intentionally not revived.
      }
    }
  }

  exportMetadata() {
    return [...this.connections.values()].map(({ providerId, credentialRef, authMethod, state, models }) => ({
      providerId,
      credentialRef,
      authMethod,
      state,
      models: [...models]
    }));
  }

  protectedMetadata(providerId) {
    const entry = this.connections.get(providerId);
    if (!entry || entry.state !== "connected") return null;
    return Object.freeze({ credentialRef: entry.credentialRef, authMethod: entry.authMethod });
  }

  updateRegistry(providerId, state, authMethod, models = []) {
    if (!this.providerRegistry) return;
    const connected = state === "connected";
    this.providerRegistry.updateConnection(providerId, {
      auth: { kind: authMethod === "oauth" ? "oauth" : "keychain", credentialPresent: connected },
      health: { state: connected ? "ready" : "unknown", failureClass: null, cooldownUntil: null },
      models
    });
  }

  adopt(connection) {
    const protectedConnection = validateConnection(connection);
    const entry = { ...protectedConnection, updatedAt: this.clock() };
    this.connections.set(entry.providerId, entry);
    this.updateRegistry(entry.providerId, entry.state, entry.authMethod, entry.models);
    return this.status(entry.providerId);
  }

  refresh(connection) {
    return this.adopt(connection);
  }

  async credential(providerId) {
    if (!providerId) throw new RuntimeError("invalid_provider", "A valid provider id is required", 400);
    throw new RuntimeError(
      "credential_boundary_enforced",
      "Raw provider credentials cannot leave the protected credential boundary",
      501
    );
  }

  async disconnect(providerId) {
    const entry = this.connections.get(providerId);
    this.connections.delete(providerId);
    this.providerRegistry?.updateConnection(providerId, {
      auth: { kind: entry?.authMethod === "oauth" ? "oauth" : "keychain", credentialPresent: false },
      health: { state: "unknown", failureClass: null, cooldownUntil: null }
    });
    return this.status(providerId);
  }
}
