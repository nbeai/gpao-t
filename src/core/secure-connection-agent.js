import { RuntimeError } from "./errors.js";

export const SECURE_CONNECTION_AGENT_SCHEMA = "gpao_t3.secure_connection_agent.v1";
export const SECURE_CONNECTION_AUTH_METHODS = Object.freeze(["api_key", "oauth", "local"]);
export const SECURE_CONNECTION_STATES = Object.freeze([
  "not_connected", "connecting", "connected", "auth_required", "expired", "unavailable", "revoked", "unknown"
]);

const AUTH_METHODS = new Set(SECURE_CONNECTION_AUTH_METHODS);
const CONNECTION_STATES = new Set(SECURE_CONNECTION_STATES);
const IDENTIFIER = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;
const RAW_SECRET_KEY = /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret|credential(?!ref))/i;

function failure(code, message, status = 400, details = undefined) {
  return new RuntimeError(code, message, status, details);
}

function assertIdentifier(value, field) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    throw failure("secure_connection_agent_invalid_request", `${field} is required`);
  }
}

function assertDeadline(deadline, now) {
  if (!Number.isSafeInteger(deadline) || deadline <= now) {
    throw failure("secure_connection_agent_deadline_expired", "Secure connection request deadline must be in the future", 409);
  }
}

function assertObject(value, code, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw failure(code, message);
}

function assertOnlyKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw failure("secure_connection_agent_invalid_request", `${label} contains an unsupported field`, 400, { field: key });
  }
}

function assertOpaqueRequest(value, operation, now) {
  assertObject(value, "secure_connection_agent_invalid_request", "Secure connection request must be an object");
  assertOnlyKeys(value, new Set(["requestId", "credentialRef", "deadline"]), `${operation} request`);
  assertIdentifier(value.requestId, "requestId");
  assertIdentifier(value.credentialRef, "credentialRef");
  assertDeadline(value.deadline, now);
}

function assertInvokeRequest(value, now) {
  assertObject(value, "secure_connection_agent_invalid_request", "Secure provider request must be an object");
  assertOnlyKeys(value, new Set(["requestId", "credentialRef", "providerId", "modelId", "input", "responseBudget", "deadline"]), "provider invoke request");
  assertIdentifier(value.requestId, "requestId");
  assertIdentifier(value.credentialRef, "credentialRef");
  assertIdentifier(value.providerId, "providerId");
  assertIdentifier(value.modelId, "modelId");
  if (!value.input || typeof value.input !== "object" || Array.isArray(value.input)) {
    throw failure("secure_connection_agent_invalid_request", "Provider input must be structured", 400);
  }
  if (value.responseBudget !== undefined && (!Number.isSafeInteger(value.responseBudget) || value.responseBudget < 1 || value.responseBudget > 65_536)) {
    throw failure("secure_connection_agent_invalid_request", "responseBudget must be a bounded integer", 400);
  }
  assertDeadline(value.deadline, now);
}

function redactBoundaryPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const copy = {};
  for (const [key, child] of Object.entries(value)) {
    copy[key] = RAW_SECRET_KEY.test(key) ? "[redacted]" : redactBoundaryPayload(child);
  }
  return copy;
}

function assertPublicConnection(response, request) {
  assertObject(response, "secure_connection_agent_invalid_response", "Secure backend response must be an object");
  for (const key of Object.keys(response)) {
    if (!["credentialRef", "authMethod", "state", "models"].includes(key)) {
      throw failure("secure_connection_agent_invalid_response", "Secure backend response contains an unsupported field", 502, { field: key });
    }
  }
  assertIdentifier(response.credentialRef, "response.credentialRef");
  if (!AUTH_METHODS.has(response.authMethod)) throw failure("secure_connection_agent_invalid_response", "Secure backend authMethod is invalid", 502);
  if (!CONNECTION_STATES.has(response.state)) throw failure("secure_connection_agent_invalid_response", "Secure backend state is invalid", 502);
  if (!Array.isArray(response.models) || response.models.some(model => typeof model !== "string" || !IDENTIFIER.test(model))) {
    throw failure("secure_connection_agent_invalid_response", "Secure backend models are invalid", 502);
  }
  return Object.freeze({
    schema: SECURE_CONNECTION_AGENT_SCHEMA,
    requestId: request.requestId,
    credentialRef: response.credentialRef,
    authMethod: response.authMethod,
    state: response.state,
    models: Object.freeze([...response.models])
  });
}

function assertPublicInvocation(response, request) {
  assertObject(response, "secure_connection_agent_invalid_response", "Secure provider response must be an object");
  assertOnlyKeys(response, new Set(["result", "receipt"]), "secure provider response");
  assertObject(response.result, "secure_connection_agent_invalid_response", "Secure provider result is required");
  assertOnlyKeys(response.result, new Set(["text", "usage"]), "secure provider result");
  if (typeof response.result.text !== "string") throw failure("secure_connection_agent_invalid_response", "Secure provider result text is required", 502);
  if (response.result.usage !== undefined && (!Number.isFinite(response.result.usage) || response.result.usage < 0)) {
    throw failure("secure_connection_agent_invalid_response", "Secure provider usage is invalid", 502);
  }
  assertObject(response.receipt, "secure_connection_agent_invalid_response", "Secure provider receipt is required");
  return Object.freeze({
    schema: SECURE_CONNECTION_AGENT_SCHEMA,
    requestId: request.requestId,
    result: Object.freeze(response.result.usage === undefined ? { text: response.result.text } : { text: response.result.text, usage: response.result.usage }),
    receipt: Object.freeze({ ...response.receipt })
  });
}

/**
 * The only interface an OS-native credential adapter must implement. The
 * adapter owns secret acquisition and storage; Node receives opaque metadata.
 */
export class SecureConnectionAgent {
  constructor({ backend = null, now = () => Date.now() } = {}) {
    if (backend !== null && (typeof backend !== "object" || typeof backend.begin !== "function" || typeof backend.status !== "function" || typeof backend.revoke !== "function" || typeof backend.invoke !== "function")) {
      throw failure("secure_connection_agent_configuration_error", "A secure backend must implement begin, status, revoke, and invoke", 500);
    }
    if (typeof now !== "function") throw failure("secure_connection_agent_configuration_error", "A clock function is required", 500);
    this.backend = backend;
    this.now = now;
  }

  unavailable() {
    throw failure(
      "secure_connection_agent_unavailable",
      "A qualified OS-native secure connection agent is not installed",
      503
    );
  }

  async begin(request) {
    const now = this.now();
    assertObject(request, "secure_connection_agent_invalid_request", "Connection begin request must be an object");
    assertOnlyKeys(request, new Set(["requestId", "providerId", "authMethod", "deadline"]), "connection begin request");
    const { requestId, providerId, authMethod, deadline } = request;
    assertIdentifier(requestId, "requestId");
    assertIdentifier(providerId, "providerId");
    if (!AUTH_METHODS.has(authMethod)) throw failure("secure_connection_agent_auth_method_invalid", "authMethod must be api_key, oauth, or local");
    assertDeadline(deadline, now);
    if (!this.backend) this.unavailable();

    // The native agent owns key entry and OAuth handoff. Node only asks it to begin.
    const response = await this.backend.begin({ requestId, providerId, authMethod, deadline }, { now });
    return assertPublicConnection(response, { requestId });
  }

  async status(request) {
    const now = this.now();
    assertOpaqueRequest(request, "connection status", now);
    if (!this.backend) this.unavailable();
    const response = await this.backend.status({ ...request }, { now });
    return assertPublicConnection(response, request);
  }

  async revoke(request) {
    const now = this.now();
    assertOpaqueRequest(request, "connection revoke", now);
    if (!this.backend) this.unavailable();
    const response = await this.backend.revoke({ ...request }, { now });
    return assertPublicConnection(response, request);
  }

  async invoke(request, { signal = null } = {}) {
    const now = this.now();
    assertInvokeRequest(request, now);
    if (!this.backend?.invoke) this.unavailable();
    const response = await this.backend.invoke({ ...request }, { now, signal });
    return assertPublicInvocation(response, request);
  }

  /** Safe diagnostics for a UI/Doctor surface. Never expose acquisition data. */
  diagnostic(error) {
    const code = error?.code || "secure_connection_agent_failed";
    return Object.freeze({
      schema: SECURE_CONNECTION_AGENT_SCHEMA,
      code,
      state: code === "secure_connection_agent_unavailable" ? "unavailable" : "unknown",
      detail: redactBoundaryPayload(error?.details)
    });
  }
}
