import path from "node:path";
import { fork } from "node:child_process";
import crypto from "node:crypto";
import { RuntimeError } from "./errors.js";

export class StateWriterClient {
  constructor({ stateDir, writerPath = path.resolve(new URL("./state-writer.js", import.meta.url).pathname), maxPending = 256, requestTimeoutMs = 5_000, closeTimeoutMs = 1_000, onUnavailable } = {}) {
    this.stateDir = stateDir;
    this.writerPath = writerPath;
    this.maxPending = maxPending;
    this.requestTimeoutMs = requestTimeoutMs;
    this.closeTimeoutMs = closeTimeoutMs;
    this.pending = new Map();
    this.child = null;
    this.started = false;
    this.closed = false;
    this.closing = false;
    this.onUnavailable = onUnavailable;
  }

  async start() {
    if (this.started) return this;
    this.closed = false;
    this.closing = false;
    this.child = fork(this.writerPath, [this.stateDir], { execArgv: [], stdio: ["ignore", "ignore", "pipe", "ipc"] });
    this.child.on("message", message => this.handleMessage(message));
    this.child.on("error", () => {});
    this.child.once("exit", (code, signal) => {
      this.started = false;
      const error = new RuntimeError("state_writer_unavailable", "Native Runtime state writer stopped", 503, { retryable: true });
      for (const entry of this.pending.values()) entry.reject(error);
      this.pending.clear();
      this.child = null;
      if (!this.closing) {
        try { this.onUnavailable?.({ code, signal }); } catch {}
      }
    });
    await new Promise((resolve, reject) => {
      const child = this.child;
      const onSpawn = () => { cleanup(); resolve(); };
      const onError = error => { cleanup(); reject(error); };
      const cleanup = () => { child.off("spawn", onSpawn); child.off("error", onError); };
      child.once("spawn", onSpawn);
      child.once("error", onError);
    });
    this.started = true;
    return this;
  }

  call(op, args = {}, timeoutMs = this.requestTimeoutMs) {
    if (!this.started || !this.child || this.closed) return Promise.reject(new RuntimeError("state_writer_unavailable", "Native Runtime state writer is not available", 503, { retryable: true }));
    if (this.pending.size >= this.maxPending) return Promise.reject(new RuntimeError("state_writer_backpressure", "Native Runtime state writer queue is full", 429, { retryable: true, maxPending: this.maxPending }));
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const entry = this.pending.get(id);
        if (!entry) return;
        this.pending.delete(id);
        entry.reject(new RuntimeError("state_writer_timeout", "Native Runtime state writer did not respond before the deadline", 503, { retryable: true, outcome: "unknown", operation: op }));
      }, timeoutMs);
      timer.unref();
      this.pending.set(id, {
        resolve: value => { clearTimeout(timer); resolve(value); },
        reject: error => { clearTimeout(timer); reject(error); }
      });
      try {
        this.child.send({ id, op, args }, error => {
          if (!error) return;
          const entry = this.pending.get(id);
          if (!entry) return;
          this.pending.delete(id);
          entry.reject(new RuntimeError("state_writer_unavailable", "Native Runtime could not reach the state writer", 503, { retryable: true }));
        });
      } catch {
        this.pending.delete(id);
        reject(new RuntimeError("state_writer_unavailable", "Native Runtime could not reach the state writer", 503, { retryable: true }));
      }
    });
  }

  handleMessage(message) {
    if (!message?.id) return;
    const entry = this.pending.get(message.id);
    if (!entry) return;
    this.pending.delete(message.id);
    if (message.ok) entry.resolve(message.result);
    else entry.reject(new RuntimeError(message.error.code, message.error.message, message.error.status, message.error.details));
  }

  async close() {
    if (!this.child) return;
    const child = this.child;
    this.closing = true;
    try { await this.call("close", {}, this.closeTimeoutMs); } catch {}
    this.closed = true;
    try { child.disconnect(); } catch {}
    try { child.kill(); } catch {}
    this.child = null;
    this.started = false;
  }
}
