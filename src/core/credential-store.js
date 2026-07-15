import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { RuntimeError } from "./errors.js";

function validSecret(value) { return typeof value === "string" && value.length >= 8; }

function validKeychainSecret(value) {
  return validSecret(value) && !/[\r\n]/.test(value);
}

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

const DEFAULT_KEYCHAIN_SERVICE = "ai.nbeai.gpao-t3.credentials";

function keychainHandle(providerId) {
  return `keychain:${providerId}`;
}

function assertValidKeychainService(service) {
  if (!/^[a-z0-9][a-z0-9._-]{2,127}$/i.test(String(service || ""))) {
    throw new RuntimeError("invalid_credential_store", "A valid Keychain service id is required", 400);
  }
  return String(service);
}

function genericKeychainFailure() {
  return new RuntimeError(
    "credential_store_unavailable",
    "The secure credential store is unavailable. Try again or reconnect the provider.",
    503
  );
}

function keychainHelperPath() {
  const candidates = [
    process.env.GPAO_T3_KEYCHAIN_HELPER,
    path.join(path.dirname(process.execPath), "gpao-t3-keychain-helper"),
    path.resolve(new URL("../../.gpao-t3/build/bin/gpao-t3-keychain-helper", import.meta.url).pathname)
  ].filter(Boolean);
  return candidates.find(candidate => {
    try { fs.accessSync(candidate, fs.constants.X_OK); return true; } catch { return false; }
  }) || null;
}

/**
 * Runs the macOS `security` utility without ever placing password material in
 * argv, process errors, or returned command metadata. `-w` is deliberately
 * last: the utility reads the password from stdin instead of an argument.
 */
async function runMacSecurity({ args, input, captureStdout = false }) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      const helper = keychainHelperPath();
      if (!helper) throw new Error("helper unavailable");
      const command = args[0];
      const operation = command === "add-generic-password" ? "save"
        : command === "delete-generic-password" ? "delete"
          : command === "find-generic-password" && captureStdout ? "read" : "has";
      const account = args[args.indexOf("-a") + 1];
      const service = args[args.indexOf("-s") + 1];
      child = spawn(helper, [operation, service, account], {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        env: {}
      });
    } catch {
      reject(genericKeychainFailure());
      return;
    }

    let stdout = "";
    child.stdout.on("data", chunk => {
      if (captureStdout) stdout += chunk;
    });
    // Drain stderr without retaining it: Keychain diagnostics can include
    // provider-specific information and must never become runtime output.
    child.stderr.on("data", () => {});
    child.on("error", () => reject(genericKeychainFailure()));
    child.on("close", code => {
      if (code !== 0) {
        resolve({ ok: false });
        return;
      }
      resolve({ ok: true, stdout: captureStdout ? stdout.replace(/\r?\n$/, "") : undefined });
    });

    if (typeof input === "string") child.stdin.end(`${input}\n`);
    else child.stdin.end();
  });
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

/**
 * macOS-only credential adapter. The Core sees just an opaque handle; a raw
 * credential exists only inside this adapter while a provider call is active.
 */
export class MacKeychainCredentialStore {
  constructor({
    service = DEFAULT_KEYCHAIN_SERVICE,
    runner = runMacSecurity
  } = {}) {
    this.backendId = "macos-keychain";
    this.service = assertValidKeychainService(service);
    if (typeof runner !== "function") throw new RuntimeError("invalid_credential_store", "A credential store runner is required", 400);
    this.runner = runner;
  }

  account(providerId) {
    if (!validProviderId(providerId)) throw new RuntimeError("invalid_provider", "A valid provider id is required", 400);
    return `provider:${providerId}`;
  }

  matches(handle, providerId) {
    return handle === keychainHandle(providerId);
  }

  async save({ providerId, secret }) {
    if (!validKeychainSecret(secret)) throw new RuntimeError("invalid_credential", "A valid provider credential is required", 400);
    const account = this.account(providerId);
    const result = await this.runner({
      args: ["add-generic-password", "-a", account, "-s", this.service, "-U", "-w"],
      input: secret,
      captureStdout: false
    });
    if (!result?.ok) throw genericKeychainFailure();
    return { handle: keychainHandle(providerId), providerId: String(providerId), storage: "macos-keychain" };
  }

  async has(handle, providerId) {
    if (!this.matches(handle, providerId)) return false;
    const account = this.account(providerId);
    const result = await this.runner({
      args: ["find-generic-password", "-a", account, "-s", this.service],
      captureStdout: false
    });
    return Boolean(result?.ok);
  }

  async withCredential(handle, providerId, fn) {
    if (!this.matches(handle, providerId)) throw new RuntimeError("credential_not_found", "Provider credential is not available", 404);
    if (typeof fn !== "function") throw new RuntimeError("invalid_credential_callback", "A credential callback is required", 400);
    const account = this.account(providerId);
    const result = await this.runner({
      args: ["find-generic-password", "-a", account, "-s", this.service, "-w"],
      captureStdout: true
    });
    let secret = result?.stdout;
    if (!result?.ok || !validSecret(secret)) throw new RuntimeError("credential_not_found", "Provider credential is not available", 404);

    try {
      const value = await fn(secret);
      if (containsSecret(value, secret)) throw new RuntimeError("credential_leak_prevented", "Credential values cannot leave the secure store", 500);
      return value;
    } catch (error) {
      if (error?.code === "credential_leak_prevented") throw error;
      throw new RuntimeError("credential_callback_failed", "The provider credential could not be used safely", 502);
    } finally {
      secret = null;
    }
  }

  async remove(handle, providerId) {
    if (!this.matches(handle, providerId)) return false;
    const account = this.account(providerId);
    const result = await this.runner({
      args: ["delete-generic-password", "-a", account, "-s", this.service],
      captureStdout: false
    });
    return Boolean(result?.ok);
  }
}
