import crypto from "node:crypto";
import { RuntimeError } from "./errors.js";

function validSecret(value) { return typeof value === "string" && value.length >= 8; }

function containsSecret(value, secret, seen = new Set()) {
  if (value === secret) return true;
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  return Object.values(value).some(entry => containsSecret(entry, secret, seen));
}

export class EphemeralCredentialStore {
  constructor() { this.entries = new Map(); }

  save({ providerId, secret }) {
    if (!providerId || !validSecret(secret)) throw new RuntimeError("invalid_credential", "A valid provider credential is required", 400);
    const handle = `cred_${crypto.randomUUID()}`;
    this.entries.set(handle, { providerId: String(providerId), secret, createdAt: Date.now() });
    return { handle, providerId: String(providerId), storage: "ephemeral" };
  }

  has(handle, providerId) {
    const entry = this.entries.get(handle);
    return Boolean(entry && entry.providerId === providerId);
  }

  async withCredential(handle, providerId, fn) {
    const entry = this.entries.get(handle);
    if (!entry || entry.providerId !== providerId) throw new RuntimeError("credential_not_found", "Provider credential is not available", 404);
    const value = await fn(entry.secret);
    if (containsSecret(value, entry.secret)) throw new RuntimeError("credential_leak_prevented", "Credential values cannot leave the secure store", 500);
    return value;
  }

  remove(handle) { return this.entries.delete(handle); }
}

function validProviderId(providerId) {
  return /^[a-z0-9][a-z0-9-]{1,63}$/i.test(String(providerId || ""));
}

/**
 * Platform-neutral default until a qualified OS/OAuth backend is installed.
 * It deliberately exposes no secret read/write path to the Core.
 */
export class UnsupportedSecureCredentialBackend {
  constructor({ backendId = "secure-backend-pending" } = {}) {
    this.backendId = backendId;
  }

  account(providerId) {
    if (!validProviderId(providerId)) throw new RuntimeError("invalid_provider", "A valid provider id is required", 400);
    return `provider:${providerId}`;
  }

  unsupported() {
    throw new RuntimeError(
      "credential_store_unsupported",
      "Provider connection requires a qualified secure credential backend",
      501
    );
  }

  async save({ providerId, secret }) {
    if (!validSecret(secret)) throw new RuntimeError("invalid_credential", "A valid provider credential is required", 400);
    this.account(providerId);
    this.unsupported();
  }

  async has(handle, providerId) {
    this.account(providerId);
    if (handle && handle !== `keychain:${providerId}`) return false;
    return false;
  }

  async withCredential(handle, providerId, fn) {
    this.account(providerId);
    if (handle && handle !== `keychain:${providerId}`) throw new RuntimeError("credential_not_found", "Provider credential is not available", 404);
    if (typeof fn !== "function") throw new RuntimeError("invalid_credential_callback", "A credential callback is required", 400);
    this.unsupported();
  }

  async remove(handle, providerId) {
    if (handle && handle !== `keychain:${providerId}`) return false;
    this.account(providerId);
    return false;
  }
}

// Compatibility name for the macOS reference backend. The Core must use the
// platform-neutral class above; a real Keychain backend is a future adapter.
export class MacKeychainCredentialStore extends UnsupportedSecureCredentialBackend {
  constructor(options = {}) { super({ backendId: "macos-keychain-reference", ...options }); }
}
