import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fork } from "node:child_process";
import { assertFileMode, assertSafeStateDir } from "./paths.js";
import { RuntimeError } from "./errors.js";
import { createPermit } from "./permit.js";
import { StateWriterClient } from "./state-writer-client.js";
import { DeterministicProviderEmulator } from "./provider.js";
import { ModelRouter } from "./model-router.js";
import { ProtectedConnectionClient } from "./protected-connection.js";
import { SecureConnectionTransport } from "./secure-connection-transport.js";
import { createNativeProviderCatalog } from "./provider-catalog.js";
import { createFoundationSocketRegistry } from "./socket-registry.js";
import { ExecutionRouter } from "./execution-router.js";
import { ExecutionController } from "./execution-controller.js";
import { assertPayloadHasNoSecrets } from "./secret-hygiene.js";
import { NativeOsTurnPipeline } from "./os-turn.js";
import { LocalHybridMemory } from "./local-memory.js";
import { createFoundationToolRegistry } from "./tool-registry.js";
import { LocalSessionAuthority } from "./local-session.js";
import { UnsupportedSecureCredentialBackend } from "./credential-store.js";
import { ProviderConnectionCenter } from "./provider-connection.js";
import { ProviderRouteHealth } from "./provider-route-health.js";
import { createFoundationConnectorCatalog } from "./connector-catalog.js";
import { ConnectorController } from "./connector-controller.js";
import { createConnectionConcierge } from "./connection-concierge.js";
import { EventRouter } from "./event-router.js";

function requestDigest(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function protectedConnectionRecord(providerId, connection) {
  return {
    providerId,
    credentialRef: connection.credentialRef,
    authMethod: connection.authMethod,
    state: connection.state,
    models: connection.models
  };
}

export class NativeRuntime {
  constructor({ stateDir, providerRegistry = null, providerAdapter = new DeterministicProviderEmulator(), providerAdapters = null, credentialResolver = null, credentialStore = null, connectionCenter = null, protectedConnectionClient = null, secureConnectionAgent = null, providerEnvironment = process.env, allowEnvironmentCredentialCompatibility = false, providerFetch = fetch, socketRegistry = createFoundationSocketRegistry(), memory = new LocalHybridMemory(), toolRegistry = createFoundationToolRegistry(), connectorCatalog = null, connectorController = null, connectionConcierge = null, routeHealth = null, eventRouter = new EventRouter(), workerPath = path.resolve(new URL("./worker.js", import.meta.url).pathname), writerPath = path.resolve(new URL("./state-writer.js", import.meta.url).pathname), maxInflight = 4, maxQueue = 64, workerDispatchTimeoutMs = 250, workerResultTimeoutMs = 30_000, writerRequestTimeoutMs = 5_000, writerCloseTimeoutMs = 1_000, maxWorkerRestarts = 5, workerRestartWindowMs = 10_000, workerRestartBaseDelayMs = 25, workerStableWindowMs = 1_000 } = {}) {
    this.stateDir = assertSafeStateDir(stateDir);
    this.workerPath = workerPath;
    this.writerPath = writerPath;
    this.maxInflight = maxInflight;
    this.maxQueue = maxQueue;
    this.workerDispatchTimeoutMs = workerDispatchTimeoutMs;
    this.workerResultTimeoutMs = workerResultTimeoutMs;
    this.writerRequestTimeoutMs = writerRequestTimeoutMs;
    this.writerCloseTimeoutMs = writerCloseTimeoutMs;
    const providerCatalog = createNativeProviderCatalog({ environment: providerEnvironment, fetchImpl: providerFetch, emulator: providerAdapter, allowEnvironmentCredentialCompatibility });
    this.providerRegistry = providerRegistry || providerCatalog.providerRegistry;
    this.providerAdapter = providerAdapter;
    this.providerAdapters = providerAdapters || providerCatalog.providerAdapters;
    this.catalogCredentialResolver = credentialResolver || providerCatalog.credentialResolver;
    this.protectedConnectionClient = protectedConnectionClient || (secureConnectionAgent
      ? new ProtectedConnectionClient({ transport: new SecureConnectionTransport({ agent: secureConnectionAgent }) })
      : null);
    this.connectionCenter = connectionCenter || new ProviderConnectionCenter({ providerRegistry: this.providerRegistry });
    this.routeHealth = routeHealth || new ProviderRouteHealth();
    this.modelRouter = new ModelRouter({
      providerRegistry: this.providerRegistry,
      adapterRegistry: this.providerAdapters,
      // User-entered credentials never cross the Node runtime boundary. The
      // future native credential bridge invokes providers on the protected side.
      credentialResolver: async route => this.catalogCredentialResolver(route),
      protectedInvoker: this.protectedConnectionClient
        ? ({ plan, input, credentialRef, authMethod, signal }) => this.protectedConnectionClient.provider.invoke({
          requestId: crypto.randomUUID(),
          credentialRef,
          providerId: plan.providerId,
          modelId: plan.modelId,
          input: { message: input },
          deadline: Date.now() + plan.timeoutMs
        }, { signal })
        : null,
      routeHealth: this.routeHealth
    });
    this.connectorCatalog = connectorCatalog || createFoundationConnectorCatalog();
    this.connectorController = connectorController || new ConnectorController({ catalog: this.connectorCatalog });
    this.connectionConcierge = connectionConcierge || createConnectionConcierge({
      providerCatalog: this.providerRegistry,
      connectorCatalog: this.connectorCatalog
    });
    this.eventRouter = eventRouter;
    this.socketRegistry = socketRegistry;
    this.router = new ExecutionRouter({ socketRegistry });
    this.controller = new ExecutionController({ runtime: this });
    this.memory = memory;
    this.tools = toolRegistry;
    this.osTurns = new NativeOsTurnPipeline({ runtime: this, memory: this.memory });
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
    this.osTurnInflight = new Map();
    this.worker = null;
    this.respawning = false;
    this.workerRestartAttempts = 0;
    this.workerRestartWindowStarted = 0;
    this.workerStableTimer = null;
    this.generation = 0;
    this.instanceId = null;
    this.ownerToken = null;
    this.localSessions = null;
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
      this.tools.setPermitSecret?.(this.ownerToken);
      this.localSessions = new LocalSessionAuthority({ secret: this.ownerToken });
      this.instanceId = crypto.randomUUID();
      this.writer = new StateWriterClient({ stateDir: this.stateDir, writerPath: this.writerPath, requestTimeoutMs: this.writerRequestTimeoutMs, closeTimeoutMs: this.writerCloseTimeoutMs, onUnavailable: details => this.handleWriterUnavailable(details) });
      await this.writer.start();
      await this.writer.call("verifyIntegrity");
      this.generation = (await this.writer.call("bootstrapRuntime", { instanceId: this.instanceId })).generation;
      await this.hydrateProviderConnections();
      await this.hydrateConnectorControls();
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
    const child = fork(this.workerPath, [], { execArgv: [], env: { GPAO_T_PERMIT_SECRET: this.ownerToken }, stdio: ["ignore", "ignore", "pipe", "ipc"] });
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
      this.emitTurnEvent(entry.commandId, "turn.uncertain", { reason });
      await this.emitProgress(entry.commandId, entry.principalId);
    }
    this.healthSnapshot.inflight = this.pending.size + this.finalizationQueue.size;
  }

  async submitTurn({ principalId, requestId, payload = {} }) {
    if (!this.accepting) throw new RuntimeError("runtime_not_ready", "Native Runtime is not accepting work", 503);
    if (!principalId || !requestId) throw new RuntimeError("invalid_request", "principalId and requestId are required", 400);
    assertPayloadHasNoSecrets(payload);
    const serialized = JSON.stringify(payload);
    if (Buffer.byteLength(serialized) > 64 * 1024) throw new RuntimeError("payload_too_large", "Turn payload exceeds 64 KiB", 413);
    const command = { id: crypto.randomUUID(), principalId, requestId, requestDigest: requestDigest(payload), payload, createdAt: Date.now() };
    const result = await this.writer.call("acceptCommand", { command, runtimeGeneration: this.generation, maxQueue: this.maxQueue });
    if (!result.deduplicated) this.emitTurnEvent(result.commandId, "turn.accepted", { requestId });
    await this.emitProgress(result.commandId, principalId);
    void this.pump().catch(() => {});
    return result;
  }

  async cancelTurn({ principalId, commandId }) {
    if (!principalId || !commandId) throw new RuntimeError("invalid_cancel_request", "principalId and commandId are required", 400);
    const turn = await this.getTurn(principalId, commandId);
    if (!turn) return null;
    if (["succeeded", "failed", "uncertain", "cancelled"].includes(turn.status)) return { commandId, status: turn.status, changed: false };
    const cancellation = await this.writer.call("cancelCommand", { commandId, principalId, generation: this.generation });
    if (cancellation.changed && cancellation.kind === "cancelled_in_flight") {
      this.pending.delete(commandId);
      this.clearWorkerTimers(commandId);
      this.healthSnapshot.inflight = this.pending.size + this.finalizationQueue.size;
      void this.pump().catch(() => {});
    }
    if (cancellation.changed) await this.emitProgress(commandId, principalId);
    const current = await this.getTurn(principalId, commandId);
    if (cancellation.changed && current?.status === "cancelled") this.emitTurnEvent(commandId, "turn.cancelled", { cancellation: cancellation.kind });
    if (cancellation.changed && current?.status === "uncertain") this.emitTurnEvent(commandId, "turn.uncertain", { reason: cancellation.kind });
    return { commandId, status: current?.status || "unknown", changed: cancellation.changed, cancellation: cancellation.kind };
  }

  retryTurn(input) { return this.controller.retry(input); }

  reconcileTurn(input) { return this.controller.reconcile(input); }

  async runOsTurn({ principalId, sessionId = principalId, requestId, input, activeGoal = null, authority = {} }) {
    if (!principalId || !requestId || typeof input !== "string" || !input.trim()) {
      throw new RuntimeError("invalid_os_turn", "A session, request id, and message are required", 400);
    }
    assertPayloadHasNoSecrets({ input });
    const idempotencyKey = `${principalId}:${sessionId}:${requestId}`;
    const inFlight = this.osTurnInflight.get(idempotencyKey);
    if (inFlight) return inFlight;
    const run = (async () => {
      const explicitSelection = authority.modelSelection?.preferredProviderId || authority.modelSelection?.providerId || authority.modelSelection?.preferredModelId || authority.modelSelection?.modelId;
      const defaultSelection = explicitSelection ? null : await this.defaultModelSelection();
      const effectiveAuthority = defaultSelection ? { ...authority, modelSelection: defaultSelection } : authority;
      return this.osTurns.run({ principalId, sessionId, requestId, input, activeGoal, authority: effectiveAuthority });
    })();
    this.osTurnInflight.set(idempotencyKey, run);
    try {
      return await run;
    } finally {
      if (this.osTurnInflight.get(idempotencyKey) === run) this.osTurnInflight.delete(idempotencyKey);
    }
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
        let routePlan;
        try {
          routePlan = this.router.plan({ command, generation: this.generation, permit });
        } catch (error) {
          await this.writer.call("markTerminal", {
            commandId: command.id,
            principalId: command.principalId,
            generation: this.generation,
            status: "failed",
            result: { error: { code: error.code || "route_plan_failed", message: "Execution route could not be prepared" } }
          });
          this.emitTurnEvent(command.id, "turn.failed", { reason: error.code || "route_plan_failed" });
          await this.emitProgress(command.id, command.principalId);
          continue;
        }
        try {
          await this.writer.call("recordDispatch", { commandId: command.id, principalId: command.principalId, generation: this.generation });
        } catch (error) {
          await this.markOneUncertain(command.id, command.principalId, "dispatch_record_failed");
          throw error;
        }
        this.pending.set(command.id, { commandId: command.id, principalId: command.principalId, generation: this.generation, permit, routePlan });
        this.emitTurnEvent(command.id, "turn.dispatched", { socketId: routePlan.destination.socketId, generation: this.generation });
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
          this.worker.send({ type: "execute", permit, routePlan, payload: command.payload }, error => {
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
    this.emitTurnEvent(commandId, "turn.uncertain", { reason });
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
    this.emitTurnEvent(message.commandId, status === "succeeded" ? "turn.succeeded" : "turn.failed", status === "succeeded" ? {} : { reason: result.error?.code || "worker_failed" });
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
      this.emitTurnEvent(pending.commandId, "turn.uncertain", { reason });
      await this.emitProgress(pending.commandId, pending.principalId);
    }
  }

  async getTurn(principalId, commandId) { return this.writer.call("getCommand", { commandId, principalId }); }

  async replayTurnEvents({ principalId, commandId, cursor, limit } = {}) {
    if (!await this.getTurn(principalId, commandId)) return null;
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
      throw new RuntimeError("invalid_event_limit", "Event replay limit must be a positive integer", 400);
    }
    try {
      const stored = await this.writer.call("getTurnEvents", { commandId, principalId });
      this.eventRouter.restore({ runId: commandId, events: stored });
      return this.eventRouter.replay({ runId: commandId, cursor, limit });
    } catch (error) {
      if (error.message === "event_router_invalid_cursor") {
        throw new RuntimeError("invalid_event_cursor", "Event cursor does not belong to this turn", 400);
      }
      throw error;
    }
  }

  emitTurnEvent(commandId, type, payload = {}) {
    try {
      return this.eventRouter.emit({ runId: commandId, type, payload });
    } catch {
      // Event observation is intentionally fail-open: it cannot interrupt a turn already persisted by StateWriter.
      return null;
    }
  }

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
    if (["succeeded", "failed", "uncertain", "cancelled"].includes(turn.status)) {
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
        if (["succeeded", "failed", "uncertain", "cancelled"].includes(turn.status)) {
          client.response.end();
          this.progressClients.delete(client);
        }
      } catch {
        this.progressClients.delete(client);
      }
    }
  }

  providerStatus() { return this.providerRegistry.snapshot(); }

  async hydrateProviderConnections() {
    const preference = await this.writer.call("getPreference", { key: "provider_connections" });
    this.connectionCenter.hydrate(preference?.value || []);
    for (const entry of this.connectionCenter.exportMetadata()) await this.refreshProviderConnection(entry.providerId, { persist: false });
  }

  async persistProviderConnections() {
    return this.writer.call("setPreference", { key: "provider_connections", value: this.connectionCenter.exportMetadata() });
  }

  async hydrateConnectorControls() {
    const preference = await this.writer.call("getPreference", { key: "connector_controls" });
    for (const saved of preference?.value || []) {
      if (!this.connectorCatalog.get(saved?.id)) continue;
      if (typeof saved.setupState === "string" && saved.setupState !== "not_started") this.connectorController.setSetupState(saved.id, saved.setupState);
      if (saved.health && typeof saved.health === "object") this.connectorController.recordHealth(saved.id, saved.health);
      if (saved.enabled === true) this.connectorController.enable(saved.id);
      else this.connectorController.disable(saved.id);
    }
  }

  async persistConnectorControls() {
    return this.writer.call("setPreference", { key: "connector_controls", value: this.connectorController.list().map(entry => ({ id: entry.id, enabled: entry.enabled, health: entry.health, setupState: entry.setupState })) });
  }

  connectorStatus() {
    return { schema: "gpao_t.connector_center.v1", connectors: this.connectorController.list() };
  }

  proposeConnectionSetup(input) {
    return this.connectionConcierge.propose(input);
  }

  async setConnectorEnabled(connectorId, enabled) {
    const receipt = enabled === true ? this.connectorController.enable(connectorId) : this.connectorController.disable(connectorId);
    await this.persistConnectorControls();
    return receipt;
  }

  requireProtectedConnectionClient() {
    if (!this.protectedConnectionClient) {
      throw new RuntimeError("protected_connection_agent_unavailable", "The GPAO-T secure connection agent is not installed", 503);
    }
    return this.protectedConnectionClient;
  }

  protectedConnectionMetadata(providerId) {
    return this.connectionCenter.protectedMetadata(providerId);
  }

  async beginProviderConnection({ providerId, authMethod }) {
    const provider = this.providerRegistry.get(providerId);
    if (!provider) throw new RuntimeError("invalid_provider", "The selected GPAO-T provider is unavailable", 404);
    if (!provider.display.authMethods.includes(authMethod)) throw new RuntimeError("unsupported_connection", "This GPAO-T provider does not support the selected connection method", 400);
    const connection = await this.requireProtectedConnectionClient().connection.begin({
      requestId: crypto.randomUUID(), providerId, authMethod, deadline: Date.now() + 15_000
    });
    const status = this.connectionCenter.adopt(protectedConnectionRecord(providerId, connection));
    await this.persistProviderConnections();
    return status;
  }

  async refreshProviderConnection(providerId, { persist = true } = {}) {
    const metadata = this.connectionCenter.protectedMetadata(providerId);
    if (!metadata) return this.connectionCenter.status(providerId);
    const connection = await this.requireProtectedConnectionClient().connection.status({
      requestId: crypto.randomUUID(), credentialRef: metadata.credentialRef, deadline: Date.now() + 15_000
    });
    const status = this.connectionCenter.refresh(protectedConnectionRecord(providerId, connection));
    if (persist) await this.persistProviderConnections();
    return status;
  }

  async disconnectProvider(providerId) {
    const metadata = this.connectionCenter.protectedMetadata(providerId);
    if (metadata && this.protectedConnectionClient) {
      const connection = await this.protectedConnectionClient.connection.revoke({
        requestId: crypto.randomUUID(), credentialRef: metadata.credentialRef, deadline: Date.now() + 15_000
      });
      this.connectionCenter.refresh(protectedConnectionRecord(providerId, connection));
    }
    const status = await this.connectionCenter.disconnect(providerId);
    await this.persistProviderConnections();
    return status;
  }

  async defaultModelSelection() {
    const preference = await this.writer.call("getPreference", { key: "default_model_selection" });
    return preference?.value || null;
  }

  async setDefaultModelSelection(selection) {
    const providerId = String(selection?.providerId || selection?.preferredProviderId || "");
    const modelId = String(selection?.modelId || selection?.preferredModelId || "");
    const provider = this.providerRegistry.get(providerId);
    if (!provider || !provider.models.some(model => model.id === modelId)) {
      throw new RuntimeError("invalid_model_selection", "The selected GPAO-T model is unavailable", 400);
    }
    if (provider.auth.state !== "configured" || provider.health.state !== "ready") {
      throw new RuntimeError("model_connection_required", "The selected GPAO-T model needs a working connection", 409);
    }
    const value = { preferredProviderId: providerId, preferredModelId: modelId };
    await this.writer.call("setPreference", { key: "default_model_selection", value });
    return value;
  }

  async connectionCenterStatus() {
    for (const entry of this.connectionCenter.exportMetadata()) await this.refreshProviderConnection(entry.providerId);
    return {
      schema: "gpao_t.connection_center.v1",
      providers: this.providerStatus().providers.map(provider => ({ ...provider, connection: this.connectionCenter.status(provider.id) })),
      defaultSelection: await this.defaultModelSelection()
    };
  }

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

  publicHealth() {
    const { stateDir, instanceId, ...publicHealth } = this.health();
    return publicHealth;
  }

  async doctor() {
    const provider = this.providerStatus();
    return { ...this.health(), provider, providerRouteHealth: provider.providers.map(entry => this.routeHealth.snapshot(entry.id)), connectors: this.connectorStatus(), sockets: this.socketRegistry.snapshot(), tools: this.tools.snapshot(), localSessions: this.localSessions?.snapshot(), integrity: await this.writer.call("verifyIntegrity"), readOnly: true, worker: Boolean(this.worker && this.worker.connected), ownerTokenMode: "0600" };
  }

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
