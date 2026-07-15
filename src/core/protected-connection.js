import { RuntimeError } from "./errors.js";

export const PROTECTED_CONNECTION_SCHEMA = "gpao_t.protected_connection.v1";
export const PROTECTED_CONNECTION_AUTH_METHODS = Object.freeze(["api_key", "oauth", "local"]);
export const PROTECTED_CONNECTION_STATES = Object.freeze([
  "not_connected", "connecting", "connected", "auth_required", "expired", "unavailable", "revoked", "unknown"
]);

const AUTH_METHODS = new Set(PROTECTED_CONNECTION_AUTH_METHODS);
const CONNECTION_STATES = new Set(PROTECTED_CONNECTION_STATES);
const OPERATIONS = new Set(["connection.begin", "connection.status", "connection.revoke", "provider.invoke", "operation.cancel"]);
const IDENTIFIER = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;
const SENSITIVE_KEY = /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret|credential(?!ref))/i;
const RAW_SECRET = /(?:^|[\s"'=])(?:sk[-_][a-z0-9_-]{8,}|bearer\s+[a-z0-9._~+\/-]{12,}|api[_-]?key\s*[=:]\s*\S+)/i;

function failure(code, message, status = 400, details = undefined) {
  return new RuntimeError(code, message, status, details);
}

function assertObject(value, code, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw failure(code, message);
}

function assertId(value, field) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) throw failure("protected_connection_invalid_request", `${field} is required`);
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

function assertNoSecret(value, direction) {
  const field = secretPath(value);
  if (!field) return;
  throw failure(
    direction === "request" ? "protected_connection_secret_forbidden" : "protected_connection_secret_leak",
    direction === "request" ? "Raw secrets cannot enter the protected connection contract" : "Protected connection responses cannot expose raw secrets",
    direction === "request" ? 400 : 502,
    { field }
  );
}

function assertDeadline(deadline, now) {
  if (!Number.isSafeInteger(deadline) || deadline <= now) {
    throw failure("protected_connection_deadline_expired", "Protected connection request deadline must be in the future", 409);
  }
}

function assertKnownKeys(value, allowed, label, code = "protected_connection_invalid_request", status = 400) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw failure(code, `${label} contains an unsupported field`, status, { field: key });
  }
}

function validateRequest(operation, request, now) {
  assertObject(request, "protected_connection_invalid_request", "Protected connection request must be an object");
  assertNoSecret(request, "request");
  const allowed = new Set(["requestId", "providerId", "authMethod", "credentialRef", "modelId", "input", "operationId", "deadline"]);
  assertKnownKeys(request, allowed, "Protected connection request");
  assertId(request.requestId, "requestId");
  assertDeadline(request.deadline, now);

  if (operation === "connection.begin") {
    assertId(request.providerId, "providerId");
    if (!AUTH_METHODS.has(request.authMethod)) throw failure("protected_connection_auth_method_invalid", "authMethod must be api_key, oauth, or local");
    if (request.credentialRef !== undefined || request.modelId !== undefined || request.input !== undefined || request.operationId !== undefined) {
      throw failure("protected_connection_invalid_request", "connection.begin accepts providerId and authMethod only");
    }
  } else if (operation === "connection.status" || operation === "connection.revoke") {
    assertId(request.credentialRef, "credentialRef");
    if (request.providerId !== undefined || request.authMethod !== undefined || request.modelId !== undefined || request.input !== undefined || request.operationId !== undefined) {
      throw failure("protected_connection_invalid_request", `${operation} accepts credentialRef only`);
    }
  } else if (operation === "provider.invoke") {
    assertId(request.credentialRef, "credentialRef");
    assertId(request.providerId, "providerId");
    assertId(request.modelId, "modelId");
    if (request.input === undefined || request.authMethod !== undefined || request.operationId !== undefined) {
      throw failure("protected_connection_invalid_request", "provider.invoke requires credentialRef, providerId, modelId, and input");
    }
  } else {
    assertId(request.operationId, "operationId");
    if (request.providerId !== undefined || request.authMethod !== undefined || request.credentialRef !== undefined || request.modelId !== undefined || request.input !== undefined) {
      throw failure("protected_connection_invalid_request", "operation.cancel accepts operationId only");
    }
  }
  return Object.freeze({ operation, ...request });
}

function publicConnection(response, request) {
  assertId(response.credentialRef, "response.credentialRef");
  if (!AUTH_METHODS.has(response.authMethod)) throw failure("protected_connection_invalid_response", "Response authMethod is invalid", 502);
  if (!CONNECTION_STATES.has(response.state)) throw failure("protected_connection_invalid_response", "Response connection state is invalid", 502);
  if (!Array.isArray(response.models) || response.models.some(model => typeof model !== "string" || !IDENTIFIER.test(model))) {
    throw failure("protected_connection_invalid_response", "Response models must be identifier strings", 502);
  }
  return Object.freeze({
    schema: PROTECTED_CONNECTION_SCHEMA,
    requestId: request.requestId,
    credentialRef: response.credentialRef,
    authMethod: response.authMethod,
    state: response.state,
    models: Object.freeze([...response.models])
  });
}

function publicInvocation(response, request) {
  if (!new Set(["completed", "unknown"]).has(response.state)) {
    throw failure("protected_connection_invalid_response", "Response invocation state is invalid", 502);
  }
  assertId(response.operationId, "response.operationId");
  if (response.operationId !== request.requestId) throw failure("protected_connection_invalid_response", "Response operationId does not match requestId", 502);
  assertObject(response.receipt, "protected_connection_invalid_response", "Response receipt is required");
  const allowed = new Set(["providerId", "modelId", "outcome", "startedAt", "finishedAt"]);
  assertKnownKeys(response.receipt, allowed, "Response receipt", "protected_connection_invalid_response", 502);
  return Object.freeze({
    schema: PROTECTED_CONNECTION_SCHEMA,
    requestId: request.requestId,
    state: response.state,
    receipt: Object.freeze({ ...response.receipt })
  });
}

function publicCancellation(response, request) {
  if (!new Set(["cancelled", "unknown", "missing"]).has(response.state)) {
    throw failure("protected_connection_invalid_response", "Response cancellation state is invalid", 502);
  }
  assertId(response.operationId, "response.operationId");
  if (response.operationId !== request.operationId) throw failure("protected_connection_invalid_response", "Response operationId does not match cancellation target", 502);
  return Object.freeze({ schema: PROTECTED_CONNECTION_SCHEMA, requestId: request.requestId, operationId: response.operationId, state: response.state });
}

function validateResponse(response, request) {
  assertObject(response, "protected_connection_invalid_response", "Protected connection response must be an object");
  assertNoSecret(response, "response");
  assertKnownKeys(response, new Set(["schema", "operation", "requestId", "credentialRef", "authMethod", "state", "models", "operationId", "receipt"]), "Protected connection response", "protected_connection_invalid_response", 502);
  if (response.schema !== PROTECTED_CONNECTION_SCHEMA || response.operation !== request.operation || response.requestId !== request.requestId) {
    throw failure("protected_connection_invalid_response", "Protected connection response does not match its request", 502);
  }
  if (request.operation.startsWith("connection.")) return publicConnection(response, request);
  if (request.operation === "provider.invoke") return publicInvocation(response, request);
  return publicCancellation(response, request);
}

function unknownOutcome(reason, requestId) {
  return failure("protected_connection_outcome_unknown", "Protected connection did not confirm a safe result; review before trying again", 504, {
    reason,
    requestId,
    retry: "manual_review_required"
  });
}

export class ProtectedConnectionClient {
  constructor({ transport, now = () => Date.now() } = {}) {
    if (!transport || typeof transport.send !== "function") throw failure("protected_connection_configuration_error", "A protected connection transport is required", 500);
    if (typeof now !== "function") throw failure("protected_connection_configuration_error", "A clock function is required", 500);
    this.transport = transport;
    this.now = now;
    this.connection = Object.freeze({
      begin: (request, options) => this.request("connection.begin", request, options),
      status: (request, options) => this.request("connection.status", request, options),
      revoke: (request, options) => this.request("connection.revoke", request, options)
    });
    this.provider = Object.freeze({
      invoke: (request, options) => this.request("provider.invoke", request, options),
      cancel: (request, options) => this.request("operation.cancel", request, options)
    });
  }

  async request(operation, request, { signal = null } = {}) {
    if (!OPERATIONS.has(operation)) throw failure("protected_connection_operation_unsupported", "Protected connection operation is not supported");
    const now = this.now();
    const safeRequest = validateRequest(operation, request, now);
    if (signal?.aborted) throw unknownOutcome("cancelled", safeRequest.requestId);

    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort(signal?.reason);
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new Error("protected connection deadline exceeded"));
    }, Math.max(1, safeRequest.deadline - now));
    signal?.addEventListener("abort", abort, { once: true });
    const cancelled = new Promise((_, reject) => controller.signal.addEventListener("abort", () => reject(unknownOutcome(timedOut ? "deadline_exceeded" : "cancelled", safeRequest.requestId)), { once: true }));

    try {
      const response = await Promise.race([this.transport.send(safeRequest, { signal: controller.signal }), cancelled]);
      return validateResponse(response, safeRequest);
    } catch (error) {
      if (error instanceof RuntimeError) throw error;
      if (controller.signal.aborted) throw unknownOutcome(timedOut ? "deadline_exceeded" : "cancelled", safeRequest.requestId);
      throw unknownOutcome("transport_failed", safeRequest.requestId);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }
}
