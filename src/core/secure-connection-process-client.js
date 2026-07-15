import crypto from "node:crypto";
import path from "node:path";
import { fork } from "node:child_process";
import { RuntimeError } from "./errors.js";

const MESSAGES = Object.freeze({
  auth_required: "Provider authentication needs to be renewed",
  rate_limited: "The provider is rate limited. Wait before trying again",
  provider_timeout: "The provider did not respond in time",
  provider_unavailable: "The provider is temporarily unavailable",
  content_blocked: "The provider blocked this request",
  invalid_request: "The provider rejected this request",
  failed: "The provider did not return a usable answer",
  external_outcome_unknown: "The provider outcome is unknown and will not be retried automatically",
  credential_acquisition_cancelled: "Model connection was cancelled",
  credential_acquisition_unavailable: "The secure credential prompt could not open",
  credential_store_unavailable: "The secure credential store is unavailable",
  credential_not_found: "This model connection is no longer available",
  secure_connection_method_unavailable: "This connection method is unavailable",
  invalid_model_selection: "The selected model is unavailable",
  invalid_provider_input: "A message is required",
  credential_provider_mismatch: "The selected connection does not match this provider",
  secure_connection_agent_invalid_request: "The secure connection request is invalid"
});

export class SecureConnectionProcessClient {
  constructor({ processPath = path.resolve(new URL("./secure-connection-process.js", import.meta.url).pathname), requestTimeoutMs = 60_000 } = {}) {
    this.isIsolatedProcess = true;
    this.processPath = processPath;
    this.requestTimeoutMs = requestTimeoutMs;
    this.child = null;
    this.pending = new Map();
  }

  async start() {
    if (this.child?.connected) return this;
    const env = Object.fromEntries(Object.entries({ PATH: process.env.PATH, HOME: process.env.HOME, USER: process.env.USER, TMPDIR: process.env.TMPDIR, CODEX_HOME: process.env.CODEX_HOME }).filter(([, value]) => typeof value === "string"));
    const child = fork(this.processPath, [], { execArgv: [], env, stdio: ["ignore", "ignore", "pipe", "ipc"] });
    this.child = child;
    child.stderr.on("data", () => {});
    child.on("message", message => this.handleMessage(message));
    child.once("exit", () => {
      this.child = null;
      for (const entry of this.pending.values()) entry.reject(new RuntimeError("secure_connection_process_unavailable", "The secure connection service stopped", 503));
      this.pending.clear();
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new RuntimeError("secure_connection_process_unavailable", "The secure connection service did not start", 503)), 5_000);
      const ready = message => { if (message?.type !== "ready") return; clearTimeout(timer); child.off("message", ready); resolve(); };
      child.on("message", ready);
      child.once("error", error => { clearTimeout(timer); reject(error); });
    });
    return this;
  }

  handleMessage(message) {
    if (!message?.id) return;
    const entry = this.pending.get(message.id);
    if (!entry) return;
    this.pending.delete(message.id);
    clearTimeout(entry.timer);
    if (message.ok) entry.resolve(message.result);
    else {
      const code = MESSAGES[message.error?.code] ? message.error.code : "secure_connection_process_failed";
      entry.reject(new RuntimeError(code, MESSAGES[code] || "The secure connection service failed", message.error?.status || 500));
    }
  }

  call(operation, request, { signal = null } = {}) {
    if (!this.child?.connected) return Promise.reject(new RuntimeError("secure_connection_process_unavailable", "The secure connection service is unavailable", 503));
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        try { this.child?.send({ type: "cancel", id }); } catch {}
        reject(new RuntimeError("protected_connection_outcome_unknown", "The secure connection outcome is unknown", 504));
      }, this.requestTimeoutMs);
      timer.unref();
      const abort = () => {
        this.pending.delete(id);
        clearTimeout(timer);
        try { this.child?.send({ type: "cancel", id }); } catch {}
        reject(new RuntimeError("protected_connection_outcome_unknown", "The secure connection outcome is unknown", 504));
      };
      signal?.addEventListener("abort", abort, { once: true });
      this.pending.set(id, {
        timer,
        resolve: value => { signal?.removeEventListener("abort", abort); resolve(value); },
        reject: error => { signal?.removeEventListener("abort", abort); reject(error); }
      });
      this.child.send({ id, operation, request });
    });
  }

  begin(request) { return this.call("begin", request); }
  status(request) { return this.call("status", request); }
  revoke(request) { return this.call("revoke", request); }
  invoke(request, options) { return this.call("invoke", request, options); }

  async stop() {
    const child = this.child;
    if (!child) return;
    this.child = null;
    try { child.disconnect(); } catch {}
    if (child.exitCode === null) try { child.kill("SIGTERM"); } catch {}
  }

  diagnostic() {
    return { schema: "gpao_t3.secure_connection_process_status.v1", isolation: "separate_process", state: this.child?.connected ? "ready" : "offline" };
  }
}
