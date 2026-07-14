import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fork } from "node:child_process";
import { assertFileMode, assertSafeStateDir } from "./paths.js";
import { RuntimeError } from "./errors.js";
import { createPermit } from "./permit.js";
import { StateWriterClient } from "./state-writer-client.js";
import { ProviderRegistry } from "./provider.js";

function requestDigest(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export class NativeRuntime {
  constructor({ stateDir, providerRegistry = new ProviderRegistry(), workerPath = path.resolve(new URL("./worker.js", import.meta.url).pathname), writerPath = path.resolve(new URL("./state-writer.js", import.meta.url).pathname), maxInflight = 4, maxQueue = 64, workerDispatchTimeoutMs = 250, workerResultTimeoutMs = 30_000, writerRequestTimeoutMs = 5_000, writerCloseTimeoutMs = 1_000, maxWorkerRestarts = 5, workerRestartWindowMs = 10_000, workerRestartBaseDelayMs = 25, workerStableWindowMs = 1_000 } = {}) {
    this.stateDir = assertSafeStateDir(stateDir);
    this.workerPath = workerPath;
    this.writerPath = writerPath;
    this.maxInflight = maxInflight;
    this.maxQueue = maxQueue;
    this.workerDispatchTimeoutMs = workerDispatchTimeoutMs;
    this.workerResultTimeoutMs = workerResultTimeoutMs;
    this.writerRequestTimeoutMs = writerRequestTimeoutMs;
    this.writerCloseTimeoutMs = writerCloseTimeoutMs;
    this.providerRegistry = providerRegistry;
    this.maxWorkerRestarts = maxWorkerRestarts;
    this.workerRestartWindowMs = workerRestartWindowMs;
    this.workerRestartBaseDelayMs = workerRestartBaseDelayMs;
    this.workerStableWindowMs = workerStableWindowMs;
    this.accepting = false;
    this.stopping = false;
    this.pending = new Map();
    this.finalizationQueue = new Map();
    this.finalizationRetryTimer = null;
    this.dispatchTimers = new Map();
    this.resultTimers = new Map();
    this.pumpRetryTimer = null;
    this.pumpPromise = null;
    this.progressClients = new Set();
    this.worker = null;
    this.respawning = false;
    this.workerRestartAttempts = 0;
    this.workerRestartWindowStarted = 0;
    this.workerStableTimer = null;
    this.generation = 0;
    this.instanceId = null;
    this.ownerToken = null;
    this.lockFd = null;
    this.lockToken = null;
    this.lockPath = path.join(this.stateDir, "runtime.lock");
    this.readyAt = null;
    this.writer = null;
    this.healthSnapshot = { status: "stopped", state: "offline", generation: 0, inflight: 0 };
  }

  async start() {
    if (this.accepting) return this;
    this.stopping = false;
    this.respawning = false;
    this.acquireLock();
    try {
      this.ownerToken = this.loadOwnerToken();
      this.instanceId = crypto.randomUUID();
      this.writer = new StateWriterClient({ stateDir: this.stateDir, writerPath: this.writerPath, requestTimeoutMs: this.writerRequestTimeoutMs, closeTimeoutMs: this.writerCloseTimeoutMs, onUnavailable: details => this.handleWriterUnavailable(details) });
      await this.writer.start();
      await this.writer.call("verifyCheckpoint");
      this.generation = (await this.writer.call("bootstrapRuntime", { instanceId: this.instanceId })).generation;
      this.accepting = true;
      this.healthSnapshot = { status: "ready", state: "online", generation: this.generation, inflight: 0 };
      this.readyAt = Date.now();
      this.spawnWorker();
      return this;
    } catch (error) {
      await this.writer?.close();
      this.writer = null;
      this.releaseLock();
      throw error;
    }
  }

  handleWriterUnavailable(details) {
    if (this.stopping || !this.accepting) return;
    this.accepting = false;
    this.healthSnapshot = { ...this.healthSnapshot, status: "failed", state: "degraded", stateWriterStatus: "unavailable", writerFailure: details };
  }

  acquireLock() {
    try {
      this.lockToken = crypto.randomUUID();
      this.lockFd = fs.openSync(this.lockPath, "wx", 0o600);
      fs.writeFileSync(this.lockFd, JSON.stringify({ pid: process.pid, token: this.lockToken, startedAt: Date.now() }));
    } catch (error) {
      if (error.code === "EEXIST") {
        let owner = null;
        try { owner = JSON.parse(fs.readFileSync(this.lockPath, "utf8")); } catch {}
        let alive = true;
        if (Number.isInteger(owner?.pid) && owner.pid > 0) {
          try { process.kill(owner.pid, 0); } catch (probeError) { alive = probeError.code !== "ESRCH"; }
        }
        if (!alive) {
          try {
            const current = JSON.parse(fs.readFileSync(this.lockPath, "utf8"));
            if (current?.token === owner?.token) fs.unlinkSync(this.lockPath);
          } catch {}
          return this.acquireLock();
        }
        throw new RuntimeError("runtime_already_running", "Another Native Runtime instance owns this state", 409, { ownerPid: owner?.pid ?? null, stale: false });
      }
      throw error;
    }
  }

  releaseLock() {
    if (this.lockFd !== null) {
      try { fs.closeSync(this.lockFd); } catch {}
      this.lockFd = null;
      try {
        const current = JSON.parse(fs.readFileSync(this.lockPath, "utf8"));
        if (current.token === this.lockToken) fs.unlinkSync(this.lockPath);
      } catch {}
      this.lockToken = null;
    }
  }

  loadOwnerToken() {
    const tokenPath = path.join(this.stateDir, "owner.token");
    if (!fs.existsSync(tokenPath)) fs.writeFileSync(tokenPath, `gpaon_${crypto.randomBytes(32).toString("hex")}\n`, { mode: 0o600 });
    fs.chmodSync(tokenPath, 0o600);
    assertFileMode(tokenPath, 0o600);
    return fs.readFileSync(tokenPath, "utf8").trim();
  }

  spawnWorker() {
    if (this.stopping || this.worker || this.respawning || this.healthSnapshot.status === "failed") return;
    this.respawning = true;
    const child = fork(this.workerPath, [], { execArgv: [], env: { ...process.env, GPAO_T_PERMIT_SECRET: this.ownerToken }, stdio: ["ignore", "ignore", "pipe", "ipc"] });
    this.worker = child;
    child.on("message", message => { void this.handleWorkerMessage(message); });
    child.on("error", () => {});
    child.once("spawn", () => {
      this.respawning = false;
      clearTimeout(this.workerStableTimer);
      this.workerStableTimer = setTimeout(() => {
        if (this.worker === child) {
          this.workerRestartAttempts = 0;
          this.workerRestartWindowStarted = Date.now();
        }
      }, this.workerStableWindowMs);
      this.workerStableTimer.unref();
      void this.pump().catch(() => {});
    });
    child.once("exit", () => {
      if (this.worker === child) this.worker = null;
      this.respawning = false;
      clearTimeout(this.workerStableTimer);
      this.workerStableTimer = null;
      if (this.stopping) return;
      void this.markInflightUncertain("worker_exit").catch(() => {});
      const now = Date.now();
      if (!this.workerRestartWindowStarted || now - this.workerRestartWindowStarted > this.workerRestartWindowMs) {
        this.workerRestartWindowStarted = now;
        this.workerRestartAttempts = 0;
      }
      this.workerRestartAttempts += 1;
      if (this.workerRestartAttempts > this.maxWorkerRestarts) {
        this.accepting = false;
        this.healthSnapshot = { ...this.healthSnapshot, status: "failed", state: "degraded", workerStatus: "crash-loop", workerCrashAttempts: this.workerRestartAttempts };
        return;
      }
      const delay = Math.min(this.workerRestartBaseDelayMs * (2 ** (this.workerRestartAttempts - 1)), 2_000);
      setTimeout(() => this.spawnWorker(), delay).unref();
    });
  }

  async markInflightUncertain(reason) {
    const entries = [...this.pending.values()];
    this.pending.clear();
    if (!entries.length) return;
    for (const entry of entries) {
      await this.writer.call("markUncertain", { commandId: entry.commandId, principalId: entry.principalId, generation: this.generation, reason });
      await this.emitProgress(entry.commandId, entry.principalId);
    }
    this.healthSnapshot.inflight = this.pending.size + this.finalizationQueue.size;
  }

  async submitTurn({ principalId, requestId, payload = {} }) {
    if (!this.accepting) throw new RuntimeError("runtime_not_ready", "Native Runtime is not accepting work", 503);
    if (!principalId || !requestId) throw new RuntimeError("invalid_request", "principalId and requestId are required", 400);
    const serialized = JSON.stringify(payload);
    if (Buffer.byteLength(serialized) > 64 * 1024) throw new RuntimeError("payload_too_large", "Turn payload exceeds 64 KiB", 413);
    const command = { id: crypto.randomUUID(), principalId, requestId, requestDigest: requestDigest(payload), payload, createdAt: Date.now() };
    const result = await this.writer.call("acceptCommand", { command, runtimeGeneration: this.generation, maxQueue: this.maxQueue });
    await this.emitProgress(result.commandId, principalId);
    void this.pump().catch(() => {});
    return result;
  }

  async pump() {
    if (this.pumpPromise) return this.pumpPromise;
    this.pumpPromise = (async () => {
      if (!this.accepting || !this.worker || !this.worker.connected) return;
      while (this.pending.size < this.maxInflight) {
        const row = (await this.writer.call("pendingOutbox", { limit: 1 }))[0];
        if (!row) break;
        const command = await this.writer.call("leaseCommand", { commandId: row.command_id, principalId: row.principal_id, generation: this.generation });
        if (!command) continue;
        const permit = createPermit(this.ownerToken, { commandId: command.id, principalId: command.principalId, requestDigest: requestDigest(command.payload), generation: this.generation });
        try {
          await this.writer.call("recordDispatch", { commandId: command.id, principalId: command.principalId, generation: this.generation });
        } catch (error) {
          await this.markOneUncertain(command.id, command.principalId, "dispatch_record_failed");
          throw error;
        }
        this.pending.set(command.id, { commandId: command.id, principalId: command.principalId, generation: this.generation, permit });
        this.healthSnapshot.inflight = this.pending.size + this.finalizationQueue.size;
        await this.emitProgress(command.id, command.principalId);
        const dispatchTimer = setTimeout(() => {
          if (this.pending.has(command.id)) void this.markOneUncertain(command.id, command.principalId, "worker_dispatch_timeout").catch(() => {});
        }, this.workerDispatchTimeoutMs);
        dispatchTimer.unref();
        this.dispatchTimers.set(command.id, dispatchTimer);
        const resultTimer = setTimeout(() => {
          if (this.pending.has(command.id)) void this.markOneUncertain(command.id, command.principalId, "worker_result_timeout").catch(() => {});
        }, this.workerResultTimeoutMs);
        resultTimer.unref();
        this.resultTimers.set(command.id, resultTimer);
        try {
          this.worker.send({ type: "execute", permit, payload: command.payload }, error => {
            clearTimeout(this.dispatchTimers.get(command.id));
            this.dispatchTimers.delete(command.id);
            if (error && this.pending.has(command.id)) void this.markOneUncertain(command.id, command.principalId, "worker_send_failed").catch(() => {});
          });
        } catch {
          await this.markOneUncertain(command.id, command.principalId, "worker_send_failed");
        }
      }
    })().finally(() => { this.pumpPromise = null; });
    return this.pumpPromise;
  }

  async markOneUncertain(commandId, principalId, reason) {
    this.pending.delete(commandId);
    this.clearWorkerTimers(commandId);
    await this.writer.call("markUncertain", { commandId, principalId, generation: this.generation, reason });
    this.healthSnapshot.inflight = this.pending.size + this.finalizationQueue.size;
    await this.emitProgress(commandId, principalId);
    void this.pump().catch(() => {});
  }

  async handleWorkerMessage(message) {
    if (!message || message.type !== "result") return;
    const pending = this.pending.get(message.commandId);
    if (!pending || message.generation !== this.generation || message.permitSignature !== pending.permit.signature) return;
    this.pending.delete(message.commandId);
    this.clearWorkerTimers(message.commandId);
    const completion = { message, pending };
    if (!await this.persistCompletion(completion)) {
      this.finalizationQueue.set(message.commandId, completion);
      this.healthSnapshot.inflight = this.pending.size + this.finalizationQueue.size;
      this.scheduleFinalizationRetry();
    }
  }

  async persistCompletion({ message, pending }) {
    const status = message.status === "succeeded" ? "succeeded" : "failed";
    const result = status === "succeeded" ? message.result : { error: message.error || { code: "worker_failed", message: "Worker failed" } };
    try {
      await this.writer.call("markTerminal", { commandId: message.commandId, principalId: pending.principalId, generation: this.generation, status, result });
    } catch {
      return false;
    }
    this.finalizationQueue.delete(message.commandId);
    this.healthSnapshot.inflight = this.pending.size + this.finalizationQueue.size;
    await this.emitProgress(message.commandId, pending.principalId);
    void this.pump().catch(() => {});
    return true;
  }

  clearWorkerTimers(commandId) {
    clearTimeout(this.dispatchTimers.get(commandId));
    clearTimeout(this.resultTimers.get(commandId));
    this.dispatchTimers.delete(commandId);
    this.resultTimers.delete(commandId);
  }

  scheduleFinalizationRetry() {
    if (this.finalizationRetryTimer || this.stopping) return;
    this.finalizationRetryTimer = setTimeout(() => {
      this.finalizationRetryTimer = null;
      void (async () => {
        for (const completion of [...this.finalizationQueue.values()]) if (await this.persistCompletion(completion)) this.finalizationQueue.delete(completion.message.commandId);
        if (this.finalizationQueue.size) this.scheduleFinalizationRetry();
      })();
    }, 25);
    this.finalizationRetryTimer.unref();
  }

  async markFinalizationsUncertain(reason) {
    const entries = [...this.finalizationQueue.values()];
    this.finalizationQueue.clear();
    if (!entries.length) return;
    for (const { pending } of entries) {
      await this.writer.call("markUncertain", { commandId: pending.commandId, principalId: pending.principalId, generation: this.generation, reason });
      await this.emitProgress(pending.commandId, pending.principalId);
    }
  }

  async getTurn(principalId, commandId) { return this.writer.call("getCommand", { commandId, principalId }); }

  async getProgress(principalId, commandId) {
    const turn = await this.getTurn(principalId, commandId);
    if (!turn) return null;
    return this.writer.call("getProgress", { commandId, principalId });
  }

  async subscribeProgress(principalId, commandId, response) {
    const progress = await this.getProgress(principalId, commandId);
    if (!progress) return false;
    if (this.progressClients.size >= 16) throw new RuntimeError("progress_capacity", "Progress stream capacity is full", 429);
    response.write(`event: snapshot\ndata: ${JSON.stringify(progress)}\n\n`);
    const turn = await this.getTurn(principalId, commandId);
    if (["succeeded", "failed", "uncertain"].includes(turn.status)) {
      response.end();
      return true;
    }
    const client = { principalId, commandId, response };
    this.progressClients.add(client);
    response.on("close", () => this.progressClients.delete(client));
    return true;
  }

  async emitProgress(commandId, principalId) {
    const clients = [...this.progressClients].filter(client => client.commandId === commandId && client.principalId === principalId);
    if (!clients.length) return;
    const progress = await this.writer.call("getProgress", { commandId, principalId });
    const turn = await this.getTurn(principalId, commandId);
    const payload = JSON.stringify(progress.at(-1));
    for (const client of clients) {
      try {
        if (!client.response.write(`event: progress\ndata: ${payload}\n\n`)) {
          client.response.destroy();
          this.progressClients.delete(client);
          continue;
        }
        if (["succeeded", "failed", "uncertain"].includes(turn.status)) {
          client.response.end();
          this.progressClients.delete(client);
        }
      } catch {
        this.progressClients.delete(client);
      }
    }
  }

  providerStatus() { return this.providerRegistry.snapshot(); }

  health() {
    return {
      ...this.healthSnapshot,
      instanceId: this.instanceId,
      readyAt: this.readyAt,
      stateDir: this.stateDir,
      stateWriter: "separate-process",
      stateWriterStatus: this.writer?.started ? "ready" : "unavailable",
      workerStatus: this.worker?.connected ? "ready" : (this.healthSnapshot.workerStatus || "unavailable"),
      workerCrashAttempts: this.workerRestartAttempts,
      providerRegistry: { ready: true, count: this.providerRegistry.entries.size }
    };
  }

  async doctor() { return { ...this.health(), provider: this.providerStatus(), integrity: await this.writer.call("verifyIntegrity"), readOnly: true, worker: Boolean(this.worker && this.worker.connected), ownerTokenMode: "0600" }; }

  async stop() {
    if (!this.writer) return;
    this.stopping = true;
    this.accepting = false;
    this.healthSnapshot = { ...this.healthSnapshot, status: "stopping", state: "draining" };
    try { await this.markInflightUncertain("runtime_shutdown"); } catch {}
    if (this.finalizationRetryTimer) clearTimeout(this.finalizationRetryTimer);
    this.finalizationRetryTimer = null;
    for (const timer of this.dispatchTimers.values()) clearTimeout(timer);
    for (const timer of this.resultTimers.values()) clearTimeout(timer);
    this.dispatchTimers.clear();
    this.resultTimers.clear();
    for (const client of this.progressClients) { try { client.response.end(); } catch {} }
    this.progressClients.clear();
    if (this.worker) {
      try { this.worker.disconnect(); } catch {}
      try { this.worker.kill(); } catch {}
      this.worker = null;
    }
    if (this.pumpPromise) {
      try { await this.pumpPromise; } catch {}
    }
    try { await this.markFinalizationsUncertain("runtime_shutdown"); } catch {}
    await this.writer.close();
    this.writer = null;
    this.releaseLock();
    this.healthSnapshot = { ...this.healthSnapshot, status: "stopped", state: "offline", inflight: 0 };
  }
}
