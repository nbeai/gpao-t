import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
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

const execFileAsync = promisify(execFile);

function validProviderId(providerId) {
  return /^[a-z0-9][a-z0-9-]{1,63}$/i.test(String(providerId || ""));
}

/**
 * Stores provider keys in the signed-in macOS user's Keychain. Public runtime
 * state retains only a provider id and never a raw secret or a keychain value.
 */
export class MacKeychainCredentialStore {
  constructor({ service = "nbeai.gpao-t", exec = execFileAsync } = {}) {
    this.service = service;
    this.exec = exec;
    this.cache = new Map();
  }

  account(providerId) {
    if (!validProviderId(providerId)) throw new RuntimeError("invalid_provider", "A valid provider id is required", 400);
    return `provider:${providerId}`;
  }

  async command(args) {
    try {
      return await this.exec("security", args, { maxBuffer: 16 * 1024 });
    } catch (error) {
      throw new RuntimeError("credential_store_unavailable", "macOS secure credential storage is unavailable", 503, { cause: error?.code || "keychain_command_failed" });
    }
  }

  async save({ providerId, secret }) {
    if (!validSecret(secret)) throw new RuntimeError("invalid_credential", "A valid provider credential is required", 400);
    const account = this.account(providerId);
    // The secret is passed only to the short-lived Keychain command, never logged or persisted by GPAO-T.
    await this.command(["add-generic-password", "-a", account, "-s", this.service, "-w", secret, "-U"]);
    this.cache.set(account, secret);
    return { handle: `keychain:${providerId}`, providerId: String(providerId), storage: "macos-keychain" };
  }

  async has(handle, providerId) {
    const account = this.account(providerId);
    if (handle && handle !== `keychain:${providerId}`) return false;
    if (this.cache.has(account)) return true;
    try {
      await this.exec("security", ["find-generic-password", "-a", account, "-s", this.service], { maxBuffer: 16 * 1024 });
      return true;
    } catch {
      return false;
    }
  }

  async withCredential(handle, providerId, fn) {
    if (!await this.has(handle, providerId)) throw new RuntimeError("credential_not_found", "Provider credential is not available", 404);
    const account = this.account(providerId);
    let secret = this.cache.get(account);
    if (!secret) {
      const result = await this.command(["find-generic-password", "-w", "-a", account, "-s", this.service]);
      secret = String(result.stdout || "").trim();
      if (!validSecret(secret)) throw new RuntimeError("credential_not_found", "Provider credential is not available", 404);
      this.cache.set(account, secret);
    }
    const value = await fn(secret);
    if (value === secret) throw new RuntimeError("credential_leak_prevented", "Credential values cannot leave the secure store", 500);
    return value;
  }

  async remove(handle, providerId) {
    if (handle && handle !== `keychain:${providerId}`) return false;
    const account = this.account(providerId);
    try { await this.command(["delete-generic-password", "-a", account, "-s", this.service]); } catch (error) {
      if (error.code === "credential_store_unavailable") return false;
      throw error;
    }
    this.cache.delete(account);
    return true;
  }
}
