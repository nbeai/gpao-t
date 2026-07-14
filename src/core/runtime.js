import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fork } from "node:child_process";
import { assertFileMode, assertSafeStateDir } from "./paths.js";
import { RuntimeError } from "./errors.js";
import { createPermit } from "./permit.js";
import { StateStore } from "./store.js";

function requestDigest(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export class NativeRuntime {
  constructor({ stateDir, workerPath = path.resolve(new URL("./worker.js", import.meta.url).pathname), maxInflight = 4, maxQueue = 64 } = {}) {
    this.stateDir = assertSafeStateDir(stateDir);
    this.workerPath = workerPath;
    this.maxInflight = maxInflight;
    this.maxQueue = maxQueue;
    this.accepting = false;
    this.stopping = false;
    this.pending = new Map();
    this.progressClients = new Set();
    this.worker = null;
    this.respawning = false;
    this.generation = 0;
    this.instanceId = null;
    this.ownerToken = null;
    this.lockFd = null;
    this.lockPath = path.join(this.stateDir, "runtime.lock");
    this.readyAt = null;
    this.healthSnapshot = { status: "stopped", state: "offline", generation: 0, inflight: 0 };
  }

  start() {
    if (this.accepting) return this;
    this.acquireLock();
    try {
      this.ownerToken = this.loadOwnerToken();
      this.store = new StateStore(this.stateDir);
      const priorGeneration = Number(this.store.getMeta("runtime_generation") || 0);
      this.generation = priorGeneration + 1;
      this.instanceId = crypto.randomUUID();
      this.store.transaction(() => {
        this.store.setMeta("runtime_generation", String(this.generation));
        this.store.setMeta("runtime_instance_id", this.instanceId);
        this.store.markAllLeasedUncertain(this.generation, "runtime_restart");
      });
      this.accepting = true;
      this.healthSnapshot = { status: "ready", state: "online", generation: this.generation, inflight: 0 };
      this.readyAt = Date.now();
      this.spawnWorker();
      return this;
    } catch (error) {
      this.releaseLock();
      throw error;
    }
  }

  acquireLock() {
    try {
      this.lockFd = fs.openSync(this.lockPath, "wx", 0o600);
      fs.writeFileSync(this.lockFd, JSON.stringify({ pid: process.pid, startedAt: Date.now() }));
    } catch (error) {
      if (error.code === "EEXIST") throw new RuntimeError("runtime_already_running", "Another Native Runtime instance owns this state", 409);
      throw error;
    }
  }

  releaseLock() {
    if (this.lockFd !== null) {
      try { fs.closeSync(this.lockFd); } catch {}
      this.lockFd = null;
      try { fs.unlinkSync(this.lockPath); } catch {}
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
    if (this.stopping || this.worker || this.respawning) return;
    this.respawning = true;
    const child = fork(this.workerPath, [], { env: { ...process.env, GPAO_T_PERMIT_SECRET: this.ownerToken }, stdio: ["ignore", "ignore", "ignore", "ipc"] });
    this.worker = child;
    child.on("message", message => this.handleWorkerMessage(message));
    child.on("error", () => {});
    child.once("spawn", () => { this.respawning = false; this.pump(); });
    child.once("exit", () => {
      if (this.worker === child) this.worker = null;
      this.respawning = false;
      if (this.stopping) return;
      this.markInflightUncertain("worker_exit");
      setTimeout(() => this.spawnWorker(), 25).unref();
    });
  }

  markInflightUncertain(reason) {
    const entries = [...this.pending.values()];
    this.pending.clear();
    if (!entries.length) return;
    this.store.transaction(() => {
      for (const entry of entries) this.store.markUncertain(entry.commandId, entry.principalId, this.generation, reason);
    });
    for (const entry of entries) this.emitProgress(entry.commandId, entry.principalId);
    this.healthSnapshot.inflight = 0;
  }

  submitTurn({ principalId, requestId, payload = {} }) {
    if (!this.accepting) throw new RuntimeError("runtime_not_ready", "Native Runtime is not accepting work", 503);
    if (!principalId || !requestId) throw new RuntimeError("invalid_request", "principalId and requestId are required", 400);
    const serialized = JSON.stringify(payload);
    if (Buffer.byteLength(serialized) > 64 * 1024) throw new RuntimeError("payload_too_large", "Turn payload exceeds 64 KiB", 413);
    const active = this.store.countActiveOutbox();
    if (active >= this.maxQueue) throw new RuntimeError("backpressure", "Native Runtime queue is full", 429, { maxQueue: this.maxQueue });
    const requestDigestValue = requestDigest(payload);
    const existing = this.store.findByRequest(principalId, requestId);
    if (existing) {
      if (existing.request_digest !== requestDigestValue) throw new RuntimeError("idempotency_conflict", "Request id was already used with a different payload", 409);
      return { commandId: existing.id, status: existing.status, deduplicated: true };
    }
    const command = { id: crypto.randomUUID(), principalId, requestId, requestDigest: requestDigestValue, payload, createdAt: Date.now() };
    this.store.transaction(() => {
      this.store.createCommand(command);
      this.store.appendEvent({ commandId: command.id, principalId, type: "turn.accepted", payload: { requestId }, runtimeGeneration: this.generation });
      this.store.addProgress(command.id, principalId, "accepted", { requestId });
    });
    this.emitProgress(command.id, principalId);
    this.pump();
    return { commandId: command.id, status: "accepted", deduplicated: false };
  }

  pump() {
    if (!this.accepting || !this.worker || !this.worker.connected) return;
    while (this.pending.size < this.maxInflight) {
      const row = this.store.pendingOutbox(1)[0];
      if (!row) break;
      const leased = this.store.transaction(() => {
        if (!this.store.lease(row.command_id, this.generation)) return null;
        const command = this.store.getCommand(row.command_id, row.principal_id);
        const permit = createPermit(this.ownerToken, { commandId: command.id, principalId: command.principalId, requestDigest: requestDigest(command.payload), generation: this.generation });
        this.store.appendEvent({ commandId: command.id, principalId: command.principalId, type: "turn.dispatched", payload: { generation: this.generation }, runtimeGeneration: this.generation });
        this.store.addProgress(command.id, command.principalId, "running", { generation: this.generation });
        return { command, permit };
      });
      if (!leased) break;
      this.pending.set(leased.command.id, { commandId: leased.command.id, principalId: leased.command.principalId, generation: this.generation, permit: leased.permit });
      this.healthSnapshot.inflight = this.pending.size;
      this.emitProgress(leased.command.id, leased.command.principalId);
      try {
        this.worker.send({ type: "execute", permit: leased.permit, payload: leased.command.payload });
      } catch {
        this.markOneUncertain(leased.command.id, leased.command.principalId, "worker_send_failed");
      }
    }
  }

  markOneUncertain(commandId, principalId, reason) {
    this.pending.delete(commandId);
    this.store.transaction(() => this.store.markUncertain(commandId, principalId, this.generation, reason));
    this.healthSnapshot.inflight = this.pending.size;
    this.emitProgress(commandId, principalId);
  }

  handleWorkerMessage(message) {
    if (!message || message.type !== "result") return;
    const pending = this.pending.get(message.commandId);
    if (!pending || message.generation !== this.generation || message.permitSignature !== pending.permit.signature) return;
    this.pending.delete(message.commandId);
    const status = message.status === "succeeded" ? "succeeded" : "failed";
    const result = status === "succeeded" ? message.result : { error: message.error || { code: "worker_failed", message: "Worker failed" } };
    this.store.transaction(() => this.store.markTerminal(message.commandId, pending.principalId, this.generation, status, result));
    this.healthSnapshot.inflight = this.pending.size;
    this.emitProgress(message.commandId, pending.principalId);
    this.pump();
  }

  getTurn(principalId, commandId) {
    return this.store.getCommand(commandId, principalId);
  }

  getProgress(principalId, commandId) {
    const turn = this.getTurn(principalId, commandId);
    if (!turn) return null;
    return this.store.getProgress(commandId, principalId);
  }

  subscribeProgress(principalId, commandId, response) {
    const progress = this.getProgress(principalId, commandId);
    if (!progress) return false;
    if (this.progressClients.size >= 16) throw new RuntimeError("progress_capacity", "Progress stream capacity is full", 429);
    response.write(`event: snapshot\ndata: ${JSON.stringify(progress)}\n\n`);
    const turn = this.getTurn(principalId, commandId);
    if (turn.status === "succeeded" || turn.status === "failed" || turn.status === "uncertain") {
      response.end();
      return true;
    }
    const client = { principalId, commandId, response };
    this.progressClients.add(client);
    response.on("close", () => this.progressClients.delete(client));
    return true;
  }

  emitProgress(commandId, principalId) {
    const clients = [...this.progressClients].filter(client => client.commandId === commandId && client.principalId === principalId);
    if (!clients.length) return;
    const progress = this.store.getProgress(commandId, principalId);
    const turn = this.getTurn(principalId, commandId);
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

  health() {
    return { ...this.healthSnapshot, instanceId: this.instanceId, readyAt: this.readyAt, stateDir: this.stateDir };
  }

  doctor() {
    return { ...this.health(), integrity: this.store.verifyIntegrity(), readOnly: true, worker: Boolean(this.worker && this.worker.connected), ownerTokenMode: "0600" };
  }

  async stop() {
    if (!this.store) return;
    this.stopping = true;
    this.accepting = false;
    this.healthSnapshot = { ...this.healthSnapshot, status: "stopping", state: "draining" };
    this.markInflightUncertain("runtime_shutdown");
    for (const client of this.progressClients) {
      try { client.response.end(); } catch {}
    }
    this.progressClients.clear();
    if (this.worker) {
      try { this.worker.disconnect(); } catch {}
      try { this.worker.kill(); } catch {}
      this.worker = null;
    }
    this.store.close();
    this.releaseLock();
    this.healthSnapshot = { ...this.healthSnapshot, status: "stopped", state: "offline", inflight: 0 };
  }
}
