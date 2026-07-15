import crypto from "node:crypto";
import { RuntimeError } from "./errors.js";
import { presentRuntimeStatus } from "./presentation-status.js";

export class ProviderConnectionCenter {
  constructor({ credentialStore, providerRegistry = null, verify = async () => ({ state: "ready" }), verifyTimeoutMs = 15_000, clock = () => Date.now() } = {}) {
    if (!credentialStore) throw new RuntimeError("connection_configuration_error", "A credential store is required", 500);
    this.credentialStore = credentialStore;
    this.verify = verify;
    this.providerRegistry = providerRegistry;
    this.verifyTimeoutMs = verifyTimeoutMs;
    this.clock = clock;
    this.connections = new Map();
    this.verifications = new Map();
  }

  status(providerId) {
    const entry = this.connections.get(providerId) || { providerId, state: "not_configured", credentialHandle: null, updatedAt: null, verifiedAt: null };
    return { schema: "gpao_t.provider_connection.v1", providerId: entry.providerId, state: entry.state, configured: entry.connectionType === "oauth" || Boolean(entry.credentialHandle), updatedAt: entry.updatedAt, verifiedAt: entry.verifiedAt, presentation: presentRuntimeStatus(entry.state) };
  }

  hydrate(entries = []) {
    for (const entry of entries) {
      if (!entry?.providerId || (!entry.credentialHandle && entry.connectionType !== "oauth")) continue;
      this.connections.set(entry.providerId, { providerId: entry.providerId, credentialHandle: entry.credentialHandle, connectionType: entry.connectionType || "api_key", state: entry.state || "not_configured", updatedAt: Number(entry.updatedAt || 0) || null, verifiedAt: Number(entry.verifiedAt || 0) || null });
    }
  }

  exportMetadata() {
    return [...this.connections.values()].map(({ providerId, credentialHandle, connectionType, state, updatedAt, verifiedAt }) => ({ providerId, credentialHandle, connectionType, state, updatedAt, verifiedAt }));
  }

  updateRegistry(providerId, state, connectionType = "api_key") {
    if (!this.providerRegistry) return;
    const configured = state === "ready" || state === "verifying";
    this.providerRegistry.updateConnection(providerId, {
      auth: { kind: connectionType === "oauth" ? "oauth" : "keychain", credentialPresent: configured },
      health: { state: state === "ready" ? "ready" : "unknown", failureClass: null, cooldownUntil: null }
    });
  }

  async refresh(providerId) {
    const entry = this.connections.get(providerId);
    if (!entry) return this.status(providerId);
    if (entry.connectionType === "oauth") {
      this.updateRegistry(providerId, entry.state, "oauth");
      return this.status(providerId);
    }
    if (!await this.credentialStore.has(entry.credentialHandle, providerId)) {
      this.connections.delete(providerId);
      this.providerRegistry?.updateConnection(providerId, { auth: { kind: "keychain", credentialPresent: false }, health: { state: "unknown", failureClass: null, cooldownUntil: null } });
      return this.status(providerId);
    }
    this.updateRegistry(providerId, entry.state, entry.connectionType);
    return this.status(providerId);
  }

  async configure({ providerId, secret }) {
    this.cancelVerification(providerId, "connection_reconfigured");
    const credential = await this.credentialStore.save({ providerId, secret });
    const entry = { providerId, state: "verifying", credentialHandle: credential.handle, connectionType: "api_key", updatedAt: this.clock(), verificationId: crypto.randomUUID() };
    this.connections.set(providerId, entry);
    this.updateRegistry(providerId, entry.state, entry.connectionType);
    return this.status(providerId);
  }

  async verifyConnection(providerId) {
    const entry = this.connections.get(providerId);
    if (!entry || !await this.credentialStore.has(entry.credentialHandle, providerId)) return this.status(providerId);
    const current = this.verifications.get(providerId);
    if (current?.promise) return current.promise;
    const controller = new AbortController();
    const verificationId = entry.verificationId;
    const timeout = setTimeout(() => controller.abort(new RuntimeError("provider_timeout", "Provider connection verification timed out", 504)), this.verifyTimeoutMs);
    timeout.unref?.();
    const verification = { verificationId, controller, promise: null };
    const complete = async () => {
      try {
        try {
          const result = await this.credentialStore.withCredential(entry.credentialHandle, providerId, secret => this.verify({ providerId, secret, credentialHandle: entry.credentialHandle, signal: controller.signal }));
          if (!this.isCurrentVerification(providerId, entry, verificationId)) return this.status(providerId);
          entry.state = result?.state === "ready" ? "ready" : (result?.state || "provider_unavailable");
        } catch (error) {
          if (!this.isCurrentVerification(providerId, entry, verificationId)) return this.status(providerId);
          entry.state = error.code === "auth_required" ? "auth_required" : "provider_unavailable";
        }
        entry.updatedAt = this.clock();
        entry.verifiedAt = entry.state === "ready" ? entry.updatedAt : null;
        this.updateRegistry(providerId, entry.state, entry.connectionType);
        return this.status(providerId);
      } finally {
        clearTimeout(timeout);
        if (this.verifications.get(providerId) === verification) this.verifications.delete(providerId);
      }
    };
    verification.promise = complete();
    this.verifications.set(providerId, verification);
    return verification.promise;
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
    this.cancelVerification(providerId, "connection_disconnected");
    const entry = this.connections.get(providerId);
    if (entry?.credentialHandle) await this.credentialStore.remove(entry.credentialHandle, providerId);
    this.connections.delete(providerId);
    this.providerRegistry?.updateConnection(providerId, { auth: { kind: entry?.connectionType === "oauth" ? "oauth" : "keychain", credentialPresent: false }, health: { state: "unknown", failureClass: null, cooldownUntil: null } });
    return this.status(providerId);
  }

  markOAuthReady(providerId) {
    const now = this.clock();
    this.connections.set(providerId, { providerId, credentialHandle: null, connectionType: "oauth", state: "ready", updatedAt: now, verifiedAt: now });
    this.updateRegistry(providerId, "ready", "oauth");
    return this.status(providerId);
  }

  cancelVerification(providerId, reason = "connection_changed") {
    const verification = this.verifications.get(providerId);
    if (!verification) return false;
    this.verifications.delete(providerId);
    verification.controller.abort(new RuntimeError("provider_verification_cancelled", "Provider connection verification was cancelled", 409, { reason }));
    return true;
  }

  isCurrentVerification(providerId, entry, verificationId) {
    return this.connections.get(providerId) === entry && entry.verificationId === verificationId;
  }
}
