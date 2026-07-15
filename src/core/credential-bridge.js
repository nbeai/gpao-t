import crypto from "node:crypto";
import { RuntimeError } from "./errors.js";

export const NATIVE_CREDENTIAL_BRIDGE_SCHEMA = "gpao_t3.native_credential_bridge.v1";

const OPERATIONS = new Set([
  "credential.status",
  "credential.revoke",
  "provider.invoke",
  "operation.cancel"
]);

const OUTCOMES = Object.freeze({
  "credential.status": new Set(["available", "missing"]),
  "credential.revoke": new Set(["revoked", "missing"]),
  "provider.invoke": new Set(["completed"]),
  "operation.cancel": new Set(["cancelled", "missing"])
});

const SECRET_KEY = /^(?:secret|api[_-]?key|token|password|credential|authorization|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key)$/i;
const RAW_SECRET_VALUE = /(?:^|[\s"'=])(?:sk-[a-z0-9_-]{12,}|sk_[a-z0-9_-]{12,}|bearer\s+[a-z0-9._~+\/-]{12,}|api[_-]?key\s*[=:]\s*\S+)/i;
const ID = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;
const GRANT_FIELDS = Object.freeze([
  "grantId",
  "issuerId",
  "principalId",
  "transportId",
  "credentialRef",
  "providerId",
  "modelId",
  "operation",
  "inputDigest",
  "expiresAt"
]);

function bridgeError(code, message, status = 400, details = undefined) {
  return new RuntimeError(code, message, status, details);
}

function assertPlainObject(value, code, message) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw bridgeError(code, message);
}

function assertKnownKeys(value, allowed, code, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw bridgeError(code, `${label} contains an unsupported field`, 400, { field: key });
  }
}

function secretPath(value, path = [], seen = new Set()) {
  if (typeof value === "string" && RAW_SECRET_VALUE.test(value)) return path.join(".") || "value";
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
    if (SECRET_KEY.test(key) && child !== undefined && child !== null && child !== "") return [...path, key].join(".");
    const found = secretPath(child, [...path, key], seen);
    if (found) return found;
  }
  return null;
}

function assertNoSecret(value, direction) {
  const field = secretPath(value);
  if (field) throw bridgeError(
    direction === "request" ? "credential_bridge_secret_forbidden" : "credential_bridge_secret_leak",
    direction === "request" ? "Raw secret material cannot enter the credential bridge" : "Credential bridge responses cannot expose raw secret material",
    direction === "request" ? 400 : 502,
    { field }
  );
}

function assertId(value, field) {
  if (typeof value !== "string" || !ID.test(value)) throw bridgeError("credential_bridge_invalid_request", `${field} is required`);
}

function assertDeadline(value, now) {
  if (!Number.isSafeInteger(value) || value <= now) throw bridgeError("credential_bridge_deadline_expired", "Credential bridge request deadline must be in the future", 409);
}

export function credentialBridgeInputDigest(input) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function credentialBridgeGrantPayload(grant) {
  return JSON.stringify(GRANT_FIELDS.map(field => [field, grant?.[field] ?? null]));
}

export function credentialBridgeGrantMac(grant, key) {
  if (!(typeof key === "string" || Buffer.isBuffer(key))) {
    throw bridgeError("credential_bridge_configuration_error", "A grant MAC key is required", 500);
  }
  return crypto.createHmac("sha256", key).update(credentialBridgeGrantPayload(grant)).digest("hex");
}

function assertGrant(grant, request, now, { principalId, transportId, verifyGrant }) {
  assertPlainObject(grant, "credential_bridge_invalid_grant", "A structured invocation grant is required");
  assertKnownKeys(grant, new Set([...GRANT_FIELDS, "signature"]), "credential_bridge_invalid_grant", "Invocation grant");
  assertId(grant.grantId, "invocationGrant.grantId");
  assertId(grant.issuerId, "invocationGrant.issuerId");
  assertId(grant.principalId, "invocationGrant.principalId");
  assertId(grant.transportId, "invocationGrant.transportId");
  assertId(grant.credentialRef, "invocationGrant.credentialRef");
  if (typeof grant.signature !== "string" || !/^[a-f0-9]{64}$/i.test(grant.signature)) {
    throw bridgeError("credential_bridge_invalid_grant", "Invocation grant signature is required", 403);
  }
  if (!Number.isSafeInteger(grant.expiresAt) || grant.expiresAt <= now) throw bridgeError("credential_bridge_grant_expired", "Invocation grant has expired", 409);
  if (principalId && grant.principalId !== principalId) throw bridgeError("credential_bridge_grant_mismatch", "Invocation grant does not belong to this principal", 403);
  if (grant.transportId !== transportId) throw bridgeError("credential_bridge_grant_mismatch", "Invocation grant is not valid for this bridge transport", 403, { field: "transportId" });
  for (const field of ["credentialRef", "providerId", "modelId", "operation", "inputDigest"]) {
    if (grant[field] !== undefined && grant[field] !== request[field]) {
      throw bridgeError("credential_bridge_grant_mismatch", `Invocation grant does not match ${field}`, 403, { field });
    }
  }
  let verified = false;
  try {
    verified = verifyGrant(Object.freeze({ ...grant }));
  } catch {
    verified = false;
  }
  if (verified !== true) throw bridgeError("credential_bridge_grant_invalid", "Invocation grant issuer verification failed", 403);
}

function validateRequest(request, now, grantContext) {
  assertPlainObject(request, "credential_bridge_invalid_request", "Credential bridge request must be an object");
  assertNoSecret(request, "request");
  assertKnownKeys(request, new Set(["operation", "operationId", "credentialRef", "invocationGrant", "providerId", "modelId", "input", "inputDigest", "deadline"]), "credential_bridge_invalid_request", "Credential bridge request");
  if (!OPERATIONS.has(request.operation)) throw bridgeError("credential_bridge_operation_unsupported", "Credential bridge operation is not supported", 400);
  assertId(request.operationId, "operationId");
  assertId(request.credentialRef, "credentialRef");
  assertDeadline(request.deadline, now);

  if (request.operation === "provider.invoke") {
    assertId(request.providerId, "providerId");
    assertId(request.modelId, "modelId");
    const hasInput = request.input !== undefined;
    const hasDigest = request.inputDigest !== undefined;
    if (hasInput === hasDigest) throw bridgeError("credential_bridge_invalid_request", "provider.invoke requires exactly one of input or inputDigest");
    if (hasDigest && (typeof request.inputDigest !== "string" || request.inputDigest.length < 16)) {
      throw bridgeError("credential_bridge_invalid_request", "inputDigest must be a stable digest");
    }
    const inputDigest = hasInput ? credentialBridgeInputDigest(request.input) : request.inputDigest;
    if (typeof request.invocationGrant?.inputDigest !== "string" || request.invocationGrant.inputDigest !== inputDigest) {
      throw bridgeError("credential_bridge_grant_mismatch", "Invocation grant does not match the request input", 403, { field: "inputDigest" });
    }
    request = { ...request, inputDigest };
  } else if (request.input !== undefined || request.inputDigest !== undefined || request.modelId !== undefined) {
    throw bridgeError("credential_bridge_invalid_request", `${request.operation} cannot receive model input`);
  }

  assertGrant(request.invocationGrant, request, now, grantContext);
  return Object.freeze({ ...request, invocationGrant: Object.freeze({ ...request.invocationGrant }) });
}

function validateResponse(response, request) {
  assertPlainObject(response, "credential_bridge_invalid_response", "Credential bridge response must be an object");
  assertNoSecret(response, "response");
  assertKnownKeys(response, new Set(["schema", "operation", "operationId", "outcome", "result"]), "credential_bridge_invalid_response", "Credential bridge response");
  if (response.schema !== NATIVE_CREDENTIAL_BRIDGE_SCHEMA) throw bridgeError("credential_bridge_invalid_response", "Credential bridge response schema is not supported", 502);
  if (response.operation !== request.operation || response.operationId !== request.operationId) {
    throw bridgeError("credential_bridge_invalid_response", "Credential bridge response does not match its request", 502);
  }
  if (!OUTCOMES[request.operation].has(response.outcome)) {
    throw bridgeError("credential_bridge_invalid_response", "Credential bridge response outcome is not supported", 502);
  }
  if (response.result !== undefined && (response.result === null || typeof response.result !== "object" || Array.isArray(response.result))) {
    throw bridgeError("credential_bridge_invalid_response", "Credential bridge response result must be an object", 502);
  }
  return Object.freeze({ ...response, result: response.result ? Object.freeze({ ...response.result }) : undefined });
}

function unknownOutcomeError(reason, operationId) {
  return bridgeError(
    "credential_bridge_outcome_unknown",
    "Credential bridge did not confirm a safe result; review before trying again",
    504,
    { reason, operationId, retry: "manual_review_required" }
  );
}

export class NativeCredentialBridgeClient {
  constructor({ transport, now = () => Date.now(), principalId = null, transportId = null, verifyGrant = null, consumedGrantIds = new Set() } = {}) {
    if (!transport || typeof transport.send !== "function") throw bridgeError("credential_bridge_configuration_error", "A credential bridge transport is required", 500);
    if (typeof now !== "function") throw bridgeError("credential_bridge_configuration_error", "A clock function is required", 500);
    assertId(transportId, "transportId");
    if (typeof verifyGrant !== "function") throw bridgeError("credential_bridge_configuration_error", "A credential bridge grant verifier is required", 500);
    if (!consumedGrantIds || typeof consumedGrantIds.has !== "function" || typeof consumedGrantIds.add !== "function") {
      throw bridgeError("credential_bridge_configuration_error", "A consumed grant store is required", 500);
    }
    this.transport = transport;
    this.now = now;
    this.principalId = principalId;
    this.transportId = transportId;
    this.verifyGrant = verifyGrant;
    this.consumedGrantIds = consumedGrantIds;
  }

  async request(request, { signal = null } = {}) {
    const now = this.now();
    const safeRequest = validateRequest(request, now, {
      principalId: this.principalId,
      transportId: this.transportId,
      verifyGrant: this.verifyGrant
    });
    if (this.consumedGrantIds.has(safeRequest.invocationGrant.grantId)) {
      throw bridgeError("credential_bridge_grant_consumed", "Invocation grant has already been used", 409);
    }
    // Consume before I/O: an interrupted privileged call may have completed remotely.
    this.consumedGrantIds.add(safeRequest.invocationGrant.grantId);
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    const timeoutMs = Math.max(1, safeRequest.deadline - now);
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new Error("credential bridge deadline exceeded"));
    }, timeoutMs);
    if (signal?.aborted) {
      clearTimeout(timer);
      throw unknownOutcomeError("cancelled", safeRequest.operationId);
    }

    const cancelled = new Promise((_, reject) => {
      controller.signal.addEventListener("abort", () => reject(unknownOutcomeError(timedOut ? "deadline_exceeded" : "cancelled", safeRequest.operationId)), { once: true });
    });
    signal?.addEventListener("abort", abort, { once: true });

    try {
      // This boundary deliberately makes one attempt only: a cancelled or timed-out privileged request may have an indeterminate external outcome.
      const response = await Promise.race([this.transport.send(safeRequest, { signal: controller.signal }), cancelled]);
      return validateResponse(response, safeRequest);
    } catch (error) {
      if (error instanceof RuntimeError) throw error;
      if (controller.signal.aborted) throw unknownOutcomeError(timedOut ? "deadline_exceeded" : "cancelled", safeRequest.operationId);
      throw bridgeError("credential_bridge_transport_failed", "Credential bridge transport failed without a confirmed result", 502, {
        operationId: safeRequest.operationId,
        retry: "manual_review_required"
      });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }

  status(request, options) { return this.request({ ...request, operation: "credential.status" }, options); }
  revoke(request, options) { return this.request({ ...request, operation: "credential.revoke" }, options); }
  invoke(request, options) { return this.request({ ...request, operation: "provider.invoke" }, options); }
  cancel(request, options) { return this.request({ ...request, operation: "operation.cancel" }, options); }
}
