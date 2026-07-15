import crypto from "node:crypto";
import { RuntimeError } from "./errors.js";

function validSecret(value) { return typeof value === "string" && value.length >= 8; }

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
    if (value === entry.secret) throw new RuntimeError("credential_leak_prevented", "Credential values cannot leave the secure store", 500);
    return value;
  }

  remove(handle) { return this.entries.delete(handle); }
}
