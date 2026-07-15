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
import { createFoundationToolSuite } from "./foundation-tool-suite.js";
import { LocalSessionAuthority } from "./local-session.js";
import { UnsupportedSecureCredentialBackend } from "./credential-store.js";
import { ProviderConnectionCenter } from "./provider-connection.js";
import { ProviderRouteHealth } from "./provider-route-health.js";
import { createFoundationConnectorCatalog } from "./connector-catalog.js";
import { ConnectorController } from "./connector-controller.js";
import { createConnectionConcierge } from "./connection-concierge.js";
import { EventRouter } from "./event-router.js";
import { ConnectionCellRegistry } from "./connection-cell.js";
import { ContextInfluenceLedger } from "./context-influence.js";
import { buildRecoveryReport } from "./recovery-doctor.js";
import { PRODUCT_IDENTITY, schemaName } from "./product-identity.js";
import { createControlFrame } from "./control-frame.js";
import { CapabilityPlatform } from "./capability-platform.js";
import { createFoundationCapabilityManifests } from "./foundation-capabilities.js";
import { MessengerRuntime } from "./messenger-runtime.js";
import { ToolInvocationController } from "./tool-invocation-controller.js";
import { createResponseDocument } from "./response-document.js";
import { createSurfaceEvent, createTextCompleteEvent } from "./surface-event.js";
import { canonicalDigest } from "./canonical-json.js";

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
  constructor({ stateDir, providerRegistry = null, providerAdapter = new DeterministicProviderEmulator(), providerAdapters = null, credentialResolver = null, credentialStore = null, connectionCenter = null, protectedConnectionClient = null, secureConnectionAgent = null, providerEnvironment = process.env, allowEnvironmentCredentialCompatibility = false, providerFetch = fetch, socketRegistry = createFoundationSocketRegistry(), memory = new LocalHybridMemory(), contextInfluence = new ContextInfluenceLedger(), toolRegistry = null, workspaceRoots = null, channelAdapters = {}, connectorCatalog = null, connectorController = null, connectionConcierge = null, routeHealth = null, eventRouter = new EventRouter(), workerPath = path.resolve(new URL("./worker.js", import.meta.url).pathname), writerPath = path.resolve(new URL("./state-writer.js", import.meta.url).pathname), maxInflight = 4, maxQueue = 64, workerDispatchTimeoutMs = 250, workerResultTimeoutMs = 30_000, writerRequestTimeoutMs = 5_000, writerCloseTimeoutMs = 1_000, maxWorkerRestarts = 5, workerRestartWindowMs = 10_000, workerRestartBaseDelayMs = 25, workerStableWindowMs = 1_000 } = {}) {
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
    this.secureConnectionAgent = secureConnectionAgent;
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
          responseBudget: plan.responseBudget,
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
    this.capabilities = new CapabilityPlatform({ manifests: createFoundationCapabilityManifests() });
    this.messenger = new MessengerRuntime();
    this.channelAdapters = Object.freeze({ ...channelAdapters });
    this.socketRegistry = socketRegistry;
    this.router = new ExecutionRouter({ socketRegistry });
    this.controller = new ExecutionController({ runtime: this });
    this.memory = memory;
    this.contextInfluence = contextInfluence;
    this.tools = toolRegistry || createFoundationToolSuite({ runtime: this, stateDir: this.stateDir, workspaceRoots, channelAdapters });
    this.toolInvocations = null;
    this.connectionCells = new ConnectionCellRegistry({ connectorController: this.connectorController, toolRegistry: this.tools });
    this.osTurns = new NativeOsTurnPipeline({ runtime: this, memory: this.memory, contextInfluence: this.contextInfluence });
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
    this.channelPollTimer = null;
    this.channelPolls = new Map();
    this.osTurnInflight = new Map();
    this.osTurnV2Jobs = new Map();
    this.osTurnV2Requests = new Map();
    this.surfaceEventClients = new Set();
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
      await this.secureConnectionAgent?.start?.();
      await Promise.all(Object.values(this.channelAdapters).map(adapter => adapter.start?.()).filter(Boolean));
      this.ownerToken = this.loadOwnerToken();
      this.tools.setPermitSecret?.(this.ownerToken);
      this.localSessions = new LocalSessionAuthority({ secret: this.ownerToken });
      this.instanceId = crypto.randomUUID();
      this.writer = new StateWriterClient({ stateDir: this.stateDir, writerPath: this.writerPath, requestTimeoutMs: this.writerRequestTimeoutMs, closeTimeoutMs: this.writerCloseTimeoutMs, onUnavailable: details => this.handleWriterUnavailable(details) });
      await this.writer.start();
      this.messenger.setWriter(this.writer);
      await this.writer.call("verifyIntegrity");
      this.generation = (await this.writer.call("bootstrapRuntime", { instanceId: this.instanceId })).generation;
      if (Object.keys(this.channelAdapters).length > 0) await this.drainPendingChannelInbound();
      this.toolInvocations = new ToolInvocationController({ registry: this.tools, writer: this.writer, secret: this.ownerToken, generation: this.generation });
      const memoryWiki = await this.writer.call("listMemory", { allOwners: true, limit: this.memory.maxEntries || 500 });
      this.memory.hydrate?.(memoryWiki.entries);
      this.contextInfluence.hydrate?.(await this.writer.call("listContextInfluences"));
      await this.hydrateProviderConnections();
      await this.hydrateConnectorControls();
      this.accepting = true;
      this.healthSnapshot = { status: "ready", state: "online", generation: this.generation, inflight: 0 };
      this.readyAt = Date.now();
      this.spawnWorker();
      this.startChannelPolling();
      return this;
    } catch (error) {
      await this.writer?.close();
      this.writer = null;
      this.releaseLock();
      await this.secureConnectionAgent?.stop?.();
      await Promise.allSettled(Object.values(this.channelAdapters).map(adapter => adapter.stop?.()).filter(Boolean));
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
    if (!fs.existsSync(tokenPath)) fs.writeFileSync(tokenPath, `gpaot3_${crypto.randomBytes(32).toString("hex")}\n`, { mode: 0o600 });
    fs.chmodSync(tokenPath, 0o600);
    assertFileMode(tokenPath, 0o600);
    return fs.readFileSync(tokenPath, "utf8").trim();
  }

  spawnWorker() {
    if (this.stopping || this.worker || this.respawning || this.healthSnapshot.status === "failed") return;
    this.respawning = true;
    const child = fork(this.workerPath, [], { execArgv: [], env: { GPAO_T3_PERMIT_SECRET: this.ownerToken }, stdio: ["ignore", "ignore", "pipe", "ipc"] });
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

  async runOsTurn({ principalId, sessionId = principalId, requestId, input, activeGoal = null, authority = {}, signal, onTextDelta, onSurfaceEvent } = {}) {
    if (!principalId || !requestId || typeof input !== "string" || !input.trim()) {
      throw new RuntimeError("invalid_os_turn", "A session, request id, and message are required", 400);
    }
    assertPayloadHasNoSecrets({ input });
    const idempotencyKey = `${principalId}:${sessionId}:${requestId}`;
    const inFlight = this.osTurnInflight.get(idempotencyKey);
    if (inFlight) return inFlight;
    const run = (async () => {
      const workspacePrincipalId = principalId.replace(/:conversation:[^:]+$/, "");
      const workspace = await this.writer.call("createWorkspace", { sessionId, principalId: workspacePrincipalId, title: input.slice(0, 36) || "새 대화" });
      if (workspace.title === "새 대화") await this.writer.call("updateWorkspace", { sessionId, principalId: workspacePrincipalId, changes: { title: input.slice(0, 36) || "새 대화" } });
      await this.writer.call("appendWorkspaceMessage", { messageId: `user_${sessionId}_${requestId}`, sessionId, principalId: workspacePrincipalId, role: "user", text: input, traceRef: requestId });
      const explicitSelection = authority.modelSelection?.preferredProviderId || authority.modelSelection?.providerId || authority.modelSelection?.preferredModelId || authority.modelSelection?.modelId;
      const defaultSelection = explicitSelection ? null : await this.defaultModelSelection();
      const effectiveAuthority = defaultSelection ? { ...authority, modelSelection: defaultSelection } : authority;
      const result = await this.osTurns.run({ principalId, sessionId, requestId, input, activeGoal, authority: effectiveAuthority, signal, onTextDelta, onSurfaceEvent });
      const repairReply = result.repairPlan
        ? `지금은 요청을 끝내지 못했습니다.\n\n${result.repairPlan.title}\n${result.repairPlan.detail}\n${result.repairPlan.action}`
        : null;
      const reply = result.turn?.receipt?.result?.text || result.turn?.receipt?.result?.echo || repairReply;
      if (reply) await this.writer.call("appendWorkspaceMessage", { messageId: `assistant_${sessionId}_${requestId}`, sessionId, principalId: workspacePrincipalId, role: "assistant", text: reply, traceRef: result.taskPacket?.id || requestId });
      return result;
    })();
    this.osTurnInflight.set(idempotencyKey, run);
    try {
      return await run;
    } finally {
      if (this.osTurnInflight.get(idempotencyKey) === run) this.osTurnInflight.delete(idempotencyKey);
    }
  }

  async appendSurfaceEvent(job, type, payload = {}, options = {}) {
    job.sequence += 1;
    const base = {
      turnId: job.turnId, sessionId: job.sessionId, sequence: job.sequence, type,
      correlationId: job.turnId, causationId: options.causationId || job.lastEventId || null,
      parentEventId: options.parentEventId || null, attempt: options.attempt || 1,
      sourceEventId: options.sourceEventId || null, payload, terminal: options.terminal === true
    };
    const event = type === "text.complete"
      ? createTextCompleteEvent({ ...base, responseDocument: options.responseDocument })
      : createSurfaceEvent(base);
    await this.writer.call("appendSurfaceEvent", { principalId: job.principalId, event });
    job.lastEventId = event.eventId;
    job.status = event.terminal ? type.split(".").at(-1) : job.status;
    this.publishSurfaceEvent(job.principalId, event);
    return event;
  }

  publishSurfaceEvent(principalId, event) {
    for (const client of [...this.surfaceEventClients]) {
      if (client.principalId !== principalId || client.turnId !== event.turnId) continue;
      if (client.replaying) { client.queue.push(event); continue; }
      try {
        client.response.write(`id: ${event.turnId}:${event.sequence}\nevent: surface\ndata: ${JSON.stringify(event)}\n\n`);
        if (event.terminal) { client.response.end(); this.surfaceEventClients.delete(client); }
      } catch {
        this.surfaceEventClients.delete(client);
      }
    }
  }

  async startOsTurnV2({ principalId, sessionId, requestId, input, activeGoal = null, authority = {} }) {
    if (!principalId || !requestId || typeof input !== "string" || !input.trim()) throw new RuntimeError("invalid_os_turn", "A session, request id, and message are required", 400);
    assertPayloadHasNoSecrets({ input });
    const requestKey = `${principalId}:${sessionId}:${requestId}`;
    const durableRequestDigest = canonicalDigest("gpao_t3.os_turn_request.v2", { input, activeGoal, authority });
    const existingRequest = this.osTurnV2Requests.get(requestKey);
    if (existingRequest) {
      if (existingRequest.requestDigest !== durableRequestDigest) throw new RuntimeError("idempotency_conflict", "Request id was already used with different input", 409);
      return { schema: "gpao_t3.os_turn_acceptance.v2", turnId: existingRequest.turnId, status: "accepted", deduplicated: true, eventUrl: `/v2/os-turns/${existingRequest.turnId}/events`, cancelUrl: `/v2/os-turns/${existingRequest.turnId}/cancel` };
    }
    const durableExisting = await this.writer.call("findSurfaceTurnByRequest", { principalId, sessionId, requestId });
    if (durableExisting) {
      if (durableExisting.requestDigest && durableExisting.requestDigest !== durableRequestDigest) throw new RuntimeError("idempotency_conflict", "Request id was already used with different input", 409);
      this.osTurnV2Requests.set(requestKey, { turnId:durableExisting.turnId, requestDigest:durableExisting.requestDigest || durableRequestDigest });
      return { schema: "gpao_t3.os_turn_acceptance.v2", turnId: durableExisting.turnId, status: durableExisting.status, deduplicated: true, eventUrl: `/v2/os-turns/${durableExisting.turnId}/events`, cancelUrl: `/v2/os-turns/${durableExisting.turnId}/cancel` };
    }
    const turnId = `os_${crypto.randomUUID()}`;
    const job = { turnId, principalId, sessionId, requestId, sequence: 0, lastEventId: null, status: "accepted", promise: null, abortController: new AbortController(), cancelRequested: false };
    this.osTurnV2Jobs.set(turnId, job);
    this.osTurnV2Requests.set(requestKey, { turnId, requestDigest:durableRequestDigest });
    await this.appendSurfaceEvent(job, "turn.accepted", { requestId, requestDigest: durableRequestDigest });
    job.promise = this.executeOsTurnV2(job, { input, activeGoal, authority }).catch(() => {});
    return { schema: "gpao_t3.os_turn_acceptance.v2", turnId, status: "accepted", deduplicated: false, eventCursor: `${turnId}:1`, eventUrl: `/v2/os-turns/${turnId}/events`, cancelUrl: `/v2/os-turns/${turnId}/cancel` };
  }

  async executeOsTurnV2(job, { input, activeGoal, authority }) {
    try {
      const result = await this.runOsTurn({
        principalId: `${job.principalId}:conversation:${job.sessionId}`, sessionId: job.sessionId,
        requestId: job.requestId, input, activeGoal, authority, signal: job.abortController.signal,
        onTextDelta: delta => this.appendSurfaceEvent(job, "text.delta", { text: delta.text, providerId: delta.providerId, modelId: delta.modelId }),
        onSurfaceEvent: (type, payload) => this.appendSurfaceEvent(job, type, payload)
      });
      if (job.cancelRequested) {
        await this.appendSurfaceEvent(job, "turn.cancelled", { cancellation: "cancelled_in_flight" }, { terminal: true });
        return;
      }
      const repairReply = result.repairPlan ? `지금은 요청을 끝내지 못했습니다.\n\n${result.repairPlan.title}\n${result.repairPlan.detail}\n${result.repairPlan.action}` : null;
      const reply = result.turn?.receipt?.result?.text || result.turn?.receipt?.result?.echo || repairReply || "요청을 처리하지 못했습니다.";
      const document = createResponseDocument({ turnId: job.turnId, sessionId: job.sessionId, blocks: [{ kind: "markdown", text: reply }] });
      if (result.repairPlan) await this.appendSurfaceEvent(job, "recovery.started", { diagnosticCode:result.repairPlan.diagnosticCode || result.repairPlan.state, automatic:false });
      await this.writer.call("saveResponseDocument", { principalId: job.principalId, document });
      const responseInfluence = await this.persistMctResponseInfluences({ document, admission: result.admission, retrievalElapsedMs: result.memory?.elapsedMs });
      if (responseInfluence.influenceIds.length) await this.appendSurfaceEvent(job, "memory.influenced", { responseDocumentId: document.id, influenceIds: responseInfluence.influenceIds });
      await this.appendSurfaceEvent(job, "text.complete", {}, { responseDocument: document });
      if (result.repairPlan) await this.appendSurfaceEvent(job, "recovery.completed", { responseDocumentId:document.id, userActionAvailable:true });
      const succeeded = result.turn?.status === "succeeded";
      await this.appendSurfaceEvent(job, succeeded ? "turn.completed" : "turn.failed", {
        responseDocumentId: document.id, digest: document.digest,
        recoveryAvailable: Boolean(result.repairPlan)
      }, { terminal: true });
      job.result = result;
      job.responseDocumentId = document.id;
    } catch (error) {
      const cancelled = job.cancelRequested && error?.failureClass !== "external_outcome_unknown";
      await this.appendSurfaceEvent(job, cancelled ? "turn.cancelled" : "turn.failed", cancelled
        ? { cancellation: "cancelled_in_flight" }
        : { code: error.code || error.failureClass || "os_turn_failed", message: "요청을 마치지 못했습니다.", recoveryAvailable: true }, { terminal: true });
      job.error = error;
    }
  }

  async cancelOsTurnV2(principalId, turnId) {
    const job = this.osTurnV2Jobs.get(turnId);
    if (!job || job.principalId !== principalId) return null;
    const current = await this.getOsTurnV2(principalId, turnId);
    if (current?.terminal) return { schema: "gpao_t3.os_turn_cancellation.v2", turnId, status: current.status, changed: false };
    job.cancelRequested = true;
    job.abortController.abort(new RuntimeError("turn_cancelled", "The user cancelled this turn", 409));
    return { schema: "gpao_t3.os_turn_cancellation.v2", turnId, status: "cancelling", changed: true };
  }

  async replayOsTurnV2(principalId, turnId, cursor, limit = 256) {
    let afterSequence = 0;
    if (cursor) {
      const [cursorTurnId, rawSequence] = String(cursor).split(":");
      afterSequence = Number(rawSequence);
      if (cursorTurnId !== turnId || !Number.isInteger(afterSequence) || afterSequence < 0) throw new RuntimeError("surface_event_cursor_invalid", "Surface event cursor is invalid", 400);
    }
    return this.writer.call("replaySurfaceEvents", { principalId, turnId, afterSequence, limit });
  }

  async getOsTurnV2(principalId, turnId) {
    const summary = await this.writer.call("getSurfaceTurnSummary", { principalId, turnId });
    if (!summary) return null;
    const responseDocument = summary.complete ? await this.writer.call("getResponseDocument", { principalId, responseDocumentId: summary.complete.payload.responseDocumentId }) : null;
    return { schema: "gpao_t3.os_turn_status.v2", turnId, status: summary.terminal ? summary.terminal.type.split(".").at(-1) : "running", terminal: Boolean(summary.terminal), nextCursor: `${turnId}:${summary.lastSequence}`, responseDocument };
  }

  async subscribeOsTurnV2(principalId, turnId, cursor, response) {
    const client = { principalId, turnId, response, replaying:true, queue:[] };
    this.surfaceEventClients.add(client);
    response.on("close", () => this.surfaceEventClients.delete(client));
    let replayCursor = cursor;
    let found = false;
    let terminal = false;
    let lastSequence = Number(String(cursor || "").split(":").at(-1)) || 0;
    do {
      const replay = await this.replayOsTurnV2(principalId, turnId, replayCursor, 256);
      found ||= replay.events.length > 0;
      if (replay.events.length) {
        response.write(`event: snapshot\ndata: ${JSON.stringify(replay)}\n\n`);
        lastSequence = replay.events.at(-1).sequence;
        terminal ||= replay.events.some(event => event.terminal);
      }
      replayCursor = replay.nextCursor;
      if (!replay.hasMore) break;
    } while (true);
    if (!found && !this.osTurnV2Jobs.has(turnId)) { this.surfaceEventClients.delete(client); return false; }
    client.replaying = false;
    for (const event of client.queue.sort((left, right) => left.sequence - right.sequence)) {
      if (event.sequence <= lastSequence) continue;
      response.write(`id: ${event.turnId}:${event.sequence}\nevent: surface\ndata: ${JSON.stringify(event)}\n\n`);
      lastSequence = event.sequence;
      terminal ||= event.terminal;
    }
    client.queue.length = 0;
    if (terminal) { response.end(); this.surfaceEventClients.delete(client); }
    return true;
  }

  contextInfluenceStatus() {
    return this.contextInfluence.snapshot();
  }

  async addMemoryObservation(input) {
    const observation = this.memory.ingest(input);
    if (observation.accepted && observation.record) {
      await this.writer.call("addMemoryCandidate", { record: { ...observation.record, ...Object.fromEntries(["scopeLevel", "projectId", "userId", "channelId", "contradictionGroup", "supersedesMemoryId"].filter(key => input[key] != null).map(key => [key, input[key]])) } });
      if (input.supersedesMemoryId) this.contextInfluence.hydrate?.(await this.writer.call("listContextInfluences"));
    }
    return { accepted: observation.accepted, id: observation.id, reason: observation.reason };
  }

  async searchMemory(query, options = {}) {
    if (this.memorySearchRepairActive || !this.writer) {
      const fallback = this.memory.search(query, options);
      return { ...fallback, degraded: fallback.degraded || (this.memorySearchRepairActive ? "index_repair_in_progress" : null), receipt: { mode: "bounded_memory_fallback" } };
    }
    try {
      return await this.writer.call("searchMemory", { query, ...options });
    } catch {
      const fallback = this.memory.search(query, options);
      return { ...fallback, degraded: fallback.degraded || "sqlite_projection_unavailable", receipt: { mode: "bounded_memory_fallback" } };
    }
  }

  persistMctAdmission(admission) {
    return this.writer.call("saveMctAdmissionBundle", { bundle: { taskPacket: admission.taskPacket, candidates: admission.candidates, decisions: admission.decisions } });
  }

  getMctAdmission(taskPacketId) {
    return this.writer.call("getMctAdmissionBundle", { taskPacketId });
  }

  async persistMctResponseInfluences({ document, admission, retrievalElapsedMs = 0 } = {}) {
    const selected = admission?.decisions?.filter(decision => ["answer_anchor", "supporting_context"].includes(decision.state)) || [];
    if (!selected.length) return { schema: "gpao_t3.response_influence_receipt.v1", influenceIds: [], persisted: true, records: [] };
    const candidateById = new Map(admission.admitted.map(candidate => [candidate.tcellCandidateId, candidate]));
    const now = Date.now();
    const records = selected.map(decision => {
      const candidate = candidateById.get(decision.candidateId);
      const role = decision.state;
      const id = `response_influence_${requestDigest({ responseDocumentId: document.id, decisionId: decision.id }).slice(0, 24)}`;
      return {
        schema: "gpao_t3.response_influence.v1", version: 1, id,
        scope: admission.taskPacket.scope,
        trace: { refs: [...decision.traceRefs], evidenceLevel: decision.trace.evidenceLevel },
        authority: { allowedUse: role, durablePromotion: false, decisionClass: "A1", decisionId: null },
        lifecycle: "reviewed", createdAt: now, updatedAt: now, expiresAt: null,
        invalidConditions: ["response_deleted", "admission_invalidated", "source_deleted"],
        responseDocumentId: document.id, candidateId: decision.candidateId, admissionDecisionId: decision.id,
        role, blockIds: document.blocks.map(block => block.id),
        tokenCost: Math.ceil(Buffer.byteLength(String(candidate?.text || ""), "utf8") / 4),
        latencyMs: Math.max(0, Number(retrievalElapsedMs) || 0)
      };
    });
    const receipt = await this.writer.call("saveMctResponseInfluences", { records });
    return { ...receipt, records };
  }

  listMctResponseInfluences(responseDocumentId) {
    return this.writer.call("listMctResponseInfluences", { responseDocumentId });
  }

  memorySearchStatus() { return this.writer.call("memorySearchStatus"); }
  async rebuildMemorySearchIndex({ batchSize = 100 } = {}) {
    if (this.memorySearchRepairPromise) return this.memorySearchRepairPromise;
    this.memorySearchRepairActive = true;
    this.memorySearchRepairPromise = (async () => {
      let receipt;
      do {
        receipt = await this.writer.call("repairMemorySearchIndexBatch", { limit: batchSize });
        if (receipt.remaining) await new Promise(resolve => setImmediate(resolve));
      } while (receipt.remaining);
      return receipt;
    })().finally(() => { this.memorySearchRepairActive = false; this.memorySearchRepairPromise = null; });
    return this.memorySearchRepairPromise;
  }
  async deleteMemory(memoryId) {
    const result = await this.writer.call("deleteMemory", { memoryId });
    if (result.deleted) this.memory.entries?.delete(memoryId);
    if (result.deleted) this.contextInfluence.hydrate?.(await this.writer.call("listContextInfluences"));
    return result;
  }

  async applyReplayApprovedContext({ admission, replay } = {}) {
    if (replay?.passed !== true) return { schema: "gpao_t3.context_influence_update.v1", state: "held", reason: "replay_failed", applied: [], durableMemoryPromotion: false };
    const applied = [];
    for (const candidate of admission?.admitted || []) {
      if (!candidate.reviewed || candidate.approvedInfluence) continue;
      try { applied.push(await this.writer.call("promoteMemory", { memoryId: candidate.id, replayPassed: true, replayScore: candidate.score || 0.5 })); } catch (error) { if (error.code !== "memory_not_found") throw error; }
    }
    if (applied.length) this.contextInfluence.hydrate?.(await this.writer.call("listContextInfluences"));
    return { schema: "gpao_t3.context_influence_update.v1", state: applied.length ? "applied" : "held", reason: applied.length ? "review_and_replay_passed" : "no_reviewed_memory", applied, durableMemoryPromotion: applied.length > 0 };
  }

  listMemoryWiki(input = {}) { return this.writer.call("listMemory", input); }
  async reviewMemory(memoryId, decision, authority = null) { const entry = await this.writer.call("reviewMemory", { memoryId, decision, authority }); this.memory.review?.(memoryId, decision === "reviewed"); return entry; }
  createWorkspace(input) { return this.writer.call("createWorkspace", input); }
  listWorkspaces(principalId, options = {}) { return this.writer.call("listWorkspaces", { principalId, ...options }); }
  getWorkspace(principalId, sessionId) { return this.writer.call("getWorkspace", { principalId, sessionId }); }
  updateWorkspace(principalId, sessionId, changes) { return this.writer.call("updateWorkspace", { principalId, sessionId, changes }); }
  deleteWorkspace(principalId, sessionId) { return this.writer.call("deleteWorkspace", { principalId, sessionId }); }

  requireToolInvocations() {
    if (!this.toolInvocations) throw new RuntimeError("tool_unavailable", "도구 실행 서비스가 아직 준비되지 않았습니다.", 503);
    return this.toolInvocations;
  }

  beginToolInvocation(input) { return this.requireToolInvocations().begin(input); }
  approveToolInvocation(input) { return this.requireToolInvocations().approve(input); }
  cancelToolInvocation(input) { return this.requireToolInvocations().cancel(input); }
  getToolInvocation(input) { return this.requireToolInvocations().get(input); }
  setToolEnabled(toolId, enabled) { return this.tools.setReadiness(toolId, enabled ? "ready" : "disabled"); }

  rollbackContextInfluence(id, reason) {
    return this.contextInfluence.rollback(id, { reason });
  }

  async rollbackContextInfluenceDurable(id, reason) {
    const result = await this.writer.call("rollbackContextInfluence", { influenceId: id, reason });
    this.contextInfluence.hydrate?.(await this.writer.call("listContextInfluences"));
    return { schema: "gpao_t3.context_influence_rollback.v1", ...result };
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
          await this.writer.call("recordDispatch", { commandId: command.id, principalId: command.principalId, generation: this.generation, routePlan });
        } catch (error) {
          await this.markOneUncertain(command.id, command.principalId, "dispatch_record_failed");
          throw error;
        }
        this.pending.set(command.id, { commandId: command.id, principalId: command.principalId, generation: this.generation, permit, routePlan });
        this.emitTurnEvent(command.id, "turn.dispatched", { socketId: routePlan.destination.socketId, generation: this.generation, state: "dispatching", route: routePlan });
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
            if (!error && this.pending.has(command.id)) {
              void (async () => {
                const recorded = await this.writer.call("recordResponding", { commandId: command.id, principalId: command.principalId, generation: this.generation });
                if (recorded) {
                  this.emitTurnEvent(command.id, "turn.responding", { generation: this.generation, state: "responding" });
                  await this.emitProgress(command.id, command.principalId);
                }
              })().catch(() => {});
            }
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
    this.emitTurnEvent(message.commandId, status === "succeeded" ? "turn.succeeded" : "turn.failed", status === "succeeded" ? result : { reason: result.error?.code || "worker_failed" });
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

  async getTurnControl(principalId, commandId) {
    const turn = await this.getTurn(principalId, commandId);
    if (!turn) return null;
    const telemetry = await this.writer.call("getTelemetry", { commandId, principalId });
    return { ...turn, controlStatus: telemetry.stages.at(-1)?.stage || "accepted" };
  }

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

  async getTelemetry(principalId, commandId) {
    const turn = await this.getTurn(principalId, commandId);
    if (!turn) return null;
    return this.writer.call("getTelemetry", { commandId, principalId });
  }

  async subscribeProgress(principalId, commandId, response) {
    const progress = await this.getProgress(principalId, commandId);
    if (!progress) return false;
    if (this.progressClients.size >= 16) throw new RuntimeError("progress_capacity", "Progress stream capacity is full", 429);
    response.write(`event: snapshot\ndata: ${JSON.stringify(progress)}\n\n`);
    const latest = progress.at(-1);
    const reconnectFrame = createControlFrame({
      runId: commandId,
      sequence: latest?.seq || 0,
      type: "reconnect",
      createdAt: Date.now(),
      payload: { generation: this.generation, reconnectRequired: true }
    });
    response.write(`event: reconnect\ndata: ${JSON.stringify({ frame: reconnectFrame, latestPhase: latest?.phase || "accepted" })}\n\n`);
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
    return { schema: schemaName("connector_center.v1"), connectors: this.connectorController.list() };
  }

  connectionCellStatus() {
    return this.connectionCells.snapshot();
  }

  planConnectionCell(input) {
    return this.connectionCells.plan(input);
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
      throw new RuntimeError("protected_connection_agent_unavailable", "The GPAO-T3 secure connection service is not installed", 503);
    }
    return this.protectedConnectionClient;
  }

  protectedConnectionMetadata(providerId) {
    return this.connectionCenter.protectedMetadata(providerId);
  }

  async beginProviderConnection({ providerId, authMethod }) {
    const provider = this.providerRegistry.get(providerId);
    if (!provider) throw new RuntimeError("invalid_provider", "The selected GPAO-T3 provider is unavailable", 404);
    if (!provider.display.authMethods.includes(authMethod)) throw new RuntimeError("unsupported_connection", "This GPAO-T3 provider does not support the selected connection method", 400);
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
      throw new RuntimeError("invalid_model_selection", "The selected GPAO-T3 model is unavailable", 400);
    }
    if (provider.auth.state !== "configured" || provider.health.state !== "ready") {
      throw new RuntimeError("model_connection_required", "The selected GPAO-T3 model needs a working connection", 409);
    }
    const value = { preferredProviderId: providerId, preferredModelId: modelId };
    await this.writer.call("setPreference", { key: "default_model_selection", value });
    return value;
  }

  async connectionCenterStatus() {
    for (const entry of this.connectionCenter.exportMetadata()) await this.refreshProviderConnection(entry.providerId);
    return {
      schema: schemaName("connection_center.v1"),
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
      providerRegistry: { ready: true, count: this.providerRegistry.entries.size },
      protectedConnection: this.secureConnectionAgent?.isIsolatedProcess
        ? this.secureConnectionAgent.diagnostic()
        : { schema: schemaName("secure_connection_process_status.v1"), isolation: this.secureConnectionAgent ? "in_process_test_adapter" : "unavailable", state: this.secureConnectionAgent ? "ready" : "offline" },
      product: PRODUCT_IDENTITY.productId
    };
  }

  publicHealth() {
    const { stateDir, instanceId, ...publicHealth } = this.health();
    return publicHealth;
  }

  async doctor() {
    const provider = this.providerStatus();
    const health = { ...this.health(), ownerTokenMode: "0600" };
    const connectionCells = this.connectionCellStatus();
    const localSessions = this.localSessions?.snapshot();
    const integrity = await this.writer.call("verifyIntegrity");
    const contextInfluence = this.contextInfluenceStatus();
    const stateIdentity = await this.writer.call("identitySnapshot");
    const stateOwnership = await this.writer.call("stateOwnership");
    const worker = Boolean(this.worker && this.worker.connected);
    const messenger = await this.messenger.status();
    const recovery = buildRecoveryReport({ health, provider, connectionCells, integrity, worker, localSessions, contextInfluence });
    return { ...health, provider, providerRouteHealth: provider.providers.map(entry => this.routeHealth.snapshot(entry.id)), connectors: this.connectorStatus(), connectionCells, capabilities: this.capabilities.search({ limit: 100 }), messenger, sockets: this.socketRegistry.snapshot(), tools: this.tools.snapshot(), localSessions, contextInfluence, stateIdentity, stateOwnership, integrity, recovery, readOnly: true, worker };
  }

  async channelConnectionStatus() {
    const channels = [];
    for (const [channelId, adapter] of Object.entries(this.channelAdapters)) {
      let connection;
      try { connection = adapter.connectionStatus ? await adapter.connectionStatus() : { state: "not_configured" }; }
      catch (error) { connection = { state: error?.code === "telegram_auth_required" ? "auth_required" : "unavailable" }; }
      channels.push({ channelId, capability: adapter.capability.manifest.id, connection });
    }
    return { schema: schemaName("channel_connections.v1"), channels };
  }

  async connectChannel(channelId) {
    const adapter = this.channelAdapters[channelId];
    if (!adapter?.connect) throw new RuntimeError("channel_connection_unavailable", "이 메신저 연결은 아직 사용할 수 없습니다.", 404);
    const connection = await adapter.connect();
    const connectorId = `channel.${channelId}`;
    if (connection.state === "connected" && this.connectorCatalog.get(connectorId)) {
      this.connectorController.setSetupState(connectorId, "connected");
      this.connectorController.recordHealth(connectorId, { state: "ready", checkedAt: new Date().toISOString() });
      this.connectorController.enable(connectorId);
      await this.persistConnectorControls();
    }
    return connection;
  }

  async disconnectChannel(channelId) {
    const adapter = this.channelAdapters[channelId];
    if (!adapter?.disconnect) throw new RuntimeError("channel_connection_unavailable", "이 메신저 연결은 아직 사용할 수 없습니다.", 404);
    const connection = await adapter.disconnect();
    const connectorId = `channel.${channelId}`;
    if (this.connectorCatalog.get(connectorId)) {
      this.connectorController.disable(connectorId);
      this.connectorController.setSetupState(connectorId, "disconnected");
      this.connectorController.recordHealth(connectorId, { state: "unknown", checkedAt: new Date().toISOString() });
      await this.persistConnectorControls();
    }
    return connection;
  }

  async pollChannel(channelId, options = {}) {
    const adapter = this.channelAdapters[channelId];
    if (!adapter?.poll) throw new RuntimeError("channel_connection_unavailable", "이 메신저 연결은 아직 사용할 수 없습니다.", 404);
    const inflight = this.channelPolls.get(channelId);
    if (inflight) return inflight;
    const poll = (async () => {
      const batch = await adapter.poll(options);
      const ingested = [];
      let handled = 0;
      for (const update of batch.updates || []) {
        const result = await this.messenger.ingest(adapter, update);
        ingested.push(result);
        let current = result.status === "claimed" ? result : null;
        while (current) {
          const completed = await this.messenger.completeInbound({ inboundId: current.inboundId, outcome: "handled", checkpoint: true });
          if (completed.changed) handled += 1;
          current = completed.nextInbound || null;
        }
      }
      handled += await this.drainPendingChannelInbound();
      return { schema: schemaName("channel_poll_result.v1"), channelId, received: batch.updates?.length || 0, handled, ingested };
    })();
    this.channelPolls.set(channelId, poll);
    try { return await poll; }
    finally { if (this.channelPolls.get(channelId) === poll) this.channelPolls.delete(channelId); }
  }

  async drainPendingChannelInbound(limit = 1_000) {
    let current = await this.messenger.claimNextInbound();
    let handled = 0;
    while (current && handled < limit) {
      const completed = await this.messenger.completeInbound({ inboundId: current.inboundId, outcome: "handled", checkpoint: true });
      if (completed.changed) handled += 1;
      current = completed.nextInbound || await this.messenger.claimNextInbound();
    }
    return handled;
  }

  startChannelPolling() {
    if (this.channelPollTimer || Object.keys(this.channelAdapters).length === 0) return;
    const poll = async () => {
      if (!this.accepting || this.stopping) return;
      for (const [channelId, adapter] of Object.entries(this.channelAdapters)) {
        try {
          const status = await adapter.connectionStatus?.();
          if (status?.state === "connected") await this.pollChannel(channelId);
        } catch {}
      }
    };
    this.channelPollTimer = setInterval(() => { void poll(); }, 3_000);
    this.channelPollTimer.unref?.();
    void poll();
  }

  async sendMessengerSession({ principalId, sessionId, text }) {
    const session = await this.messenger.session(sessionId);
    if (!session) throw new RuntimeError("messenger_session_not_found", "메신저 대화를 찾을 수 없습니다.", 404);
    const invocation = await this.beginToolInvocation({
      principalId, requestId: `messenger-send:${crypto.randomUUID()}`, toolId: "messaging.send", action: "send",
      args: {
        channelId: session.channelId,
        envelope: {
          identity: { adapterId: session.adapterId, channelId: session.channelId, accountId: session.accountId, peer: session.peer, threadId: session.threadId },
          idempotencyKey: `messenger:${crypto.randomUUID()}`,
          content: { text: String(text || "") }
        }
      }
    });
    if (invocation.status !== "awaiting_approval") throw new RuntimeError("channel_send_approval_required", "메신저 전송 전에 내용을 확인해야 합니다.", 409);
    return this.approveToolInvocation({ principalId, invocationId: invocation.invocationId, approvalId: `local_dashboard:${invocation.invocationId}` });
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
    for (const client of this.surfaceEventClients) { try { client.response.end(); } catch {} }
    this.surfaceEventClients.clear();
    if (this.channelPollTimer) clearInterval(this.channelPollTimer);
    this.channelPollTimer = null;
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
    this.messenger.setWriter(null);
    this.toolInvocations = null;
    await this.secureConnectionAgent?.stop?.();
    await Promise.allSettled(Object.values(this.channelAdapters).map(adapter => adapter.stop?.()).filter(Boolean));
    this.channelPolls.clear();
    await this.tools.stop?.();
    this.releaseLock();
    this.healthSnapshot = { ...this.healthSnapshot, status: "stopped", state: "offline", inflight: 0 };
  }
}
