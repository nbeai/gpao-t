import crypto from "node:crypto";
import { RuntimeError } from "./errors.js";
import { presentRuntimeStatus } from "./presentation-status.js";

export class ProviderConnectionCenter {
  constructor({ credentialStore, verify = async () => ({ state: "ready" }) } = {}) {
    if (!credentialStore) throw new RuntimeError("connection_configuration_error", "A credential store is required", 500);
    this.credentialStore = credentialStore;
    this.verify = verify;
    this.connections = new Map();
  }

  status(providerId) {
    const entry = this.connections.get(providerId) || { providerId, state: "not_configured", credentialHandle: null, updatedAt: null };
    return { schema: "gpao_t.provider_connection.v1", providerId: entry.providerId, state: entry.state, configured: Boolean(entry.credentialHandle), updatedAt: entry.updatedAt, presentation: presentRuntimeStatus(entry.state) };
  }

  configure({ providerId, secret }) {
    const credential = this.credentialStore.save({ providerId, secret });
    const entry = { providerId, state: "verifying", credentialHandle: credential.handle, updatedAt: Date.now(), verificationId: crypto.randomUUID() };
    this.connections.set(providerId, entry);
    return this.status(providerId);
  }

  async verifyConnection(providerId) {
    const entry = this.connections.get(providerId);
    if (!entry || !this.credentialStore.has(entry.credentialHandle, providerId)) return this.status(providerId);
    try {
      const result = await this.credentialStore.withCredential(entry.credentialHandle, providerId, secret => this.verify({ providerId, secret, credentialHandle: entry.credentialHandle }));
      entry.state = result?.state === "ready" ? "ready" : (result?.state || "provider_unavailable");
    } catch (error) {
      entry.state = error.code === "auth_required" ? "auth_required" : "provider_unavailable";
    }
    entry.updatedAt = Date.now();
    return this.status(providerId);
  }

  disconnect(providerId) {
    const entry = this.connections.get(providerId);
    if (entry?.credentialHandle) this.credentialStore.remove(entry.credentialHandle);
    this.connections.delete(providerId);
    return this.status(providerId);
  }
}
