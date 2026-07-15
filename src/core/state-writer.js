import { StateStore } from "./store.js";

const stateDir = process.argv[2];
const store = new StateStore(stateDir);
const queue = [];
let running = false;
let closed = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isDatabaseBusy(error) {
  return error?.code === "ERR_SQLITE_ERROR" && /database is locked|database is busy/i.test(error.message || "");
}

async function withBusyRetry(fn) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return fn();
    } catch (error) {
      if (!isDatabaseBusy(error) || attempt >= 40) throw error;
      await sleep(Math.min(10 + attempt * 5, 100));
    }
  }
}

function execute(op, args) {
  switch (op) {
    case "bootstrapRuntime":
      return store.transaction(() => {
        const generation = Number(store.getMeta("runtime_generation") || 0) + 1;
        store.setMeta("runtime_generation", String(generation));
        store.setMeta("runtime_instance_id", args.instanceId);
        store.markAllLeasedUncertain(generation, "runtime_restart");
        const channelRecovery = store.recoverChannelRuntime();
        const toolRecovery = store.recoverToolInvocations(generation);
        const surfaceRecovery = store.recoverIncompleteSurfaceTurns();
        return { generation, channelRecovery, toolRecovery, surfaceRecovery };
      });
    case "acceptCommand":
      return store.acceptCommand(args.command, args.runtimeGeneration, args.maxQueue);
    case "countActiveOutbox":
      return store.countActiveOutbox();
    case "getCommand":
      return store.getCommand(args.commandId, args.principalId);
    case "getProgress":
      return store.getProgress(args.commandId, args.principalId);
    case "getTurnEvents":
      return store.getTurnEvents(args.commandId, args.principalId);
    case "saveResponseDocument":
      return store.transaction(() => store.saveResponseDocument(args.principalId, args.document));
    case "getResponseDocument":
      return store.getResponseDocument(args.responseDocumentId, args.principalId);
    case "appendSurfaceEvent":
      return store.transaction(() => store.appendSurfaceEvent(args.principalId, args.event));
    case "replaySurfaceEvents":
      return store.replaySurfaceEvents(args.principalId, args.turnId, args.afterSequence, args.limit);
    case "getSurfaceTurnSummary":
      return store.getSurfaceTurnSummary(args.principalId, args.turnId);
    case "findSurfaceTurnByRequest":
      return store.findSurfaceTurnByRequest(args.principalId, args.sessionId, args.requestId);
    case "getTelemetry":
      return store.getTelemetry(args.commandId, args.principalId);
    case "cancelCommand":
      return store.transaction(() => store.cancelCommand(args.commandId, args.principalId, args.generation));
    case "pendingOutbox":
      return store.pendingOutbox(args.limit);
    case "leaseCommand":
      return store.transaction(() => {
        if (!store.lease(args.commandId, args.generation)) return null;
        return store.getCommand(args.commandId, args.principalId);
      });
    case "recordDispatch":
      return store.transaction(() => {
        store.appendEvent({ commandId: args.commandId, principalId: args.principalId, type: "turn.dispatched", payload: { generation: args.generation, state: "dispatching", route: args.routePlan || null }, runtimeGeneration: args.generation });
        store.addProgress(args.commandId, args.principalId, "dispatching", { generation: args.generation, route: args.routePlan || null });
        store.addTelemetry(args.commandId, args.principalId, "dispatching", { generation: args.generation });
        return true;
      });
    case "recordResponding":
      return store.transaction(() => {
        if (store.getCommand(args.commandId, args.principalId)?.status !== "running") return false;
        store.appendEvent({ commandId: args.commandId, principalId: args.principalId, type: "turn.responding", payload: { generation: args.generation, state: "responding" }, runtimeGeneration: args.generation });
        store.addProgress(args.commandId, args.principalId, "responding", { generation: args.generation });
        store.addTelemetry(args.commandId, args.principalId, "responding", { generation: args.generation });
        return true;
      });
    case "markUncertain":
      return store.transaction(() => store.markUncertain(args.commandId, args.principalId, args.generation, args.reason));
    case "markTerminal":
      return store.transaction(() => store.markTerminal(args.commandId, args.principalId, args.generation, args.status, args.result));
    case "verifyCheckpoint":
      return store.verifyCheckpoint();
    case "verifyIntegrity":
      return store.verifyIntegrity();
    case "getPreference":
      return store.getPreference(args.key);
    case "setPreference":
      return store.transaction(() => store.setPreference(args.key, args.value));
    case "identitySnapshot":
      return store.identitySnapshot();
    case "stateOwnership":
      return store.stateOwnership();
    case "ingestChannelInbound":
      return store.transaction(() => store.ingestChannelInbound(args.envelope));
    case "completeChannelInbound":
      return store.transaction(() => store.completeChannelInbound(args.inboundId, args.outcome, args.checkpoint));
    case "claimNextChannelInbound":
      return store.transaction(() => store.claimNextChannelInbound());
    case "prepareChannelDelivery":
      return store.transaction(() => store.prepareChannelDelivery(args.envelope));
    case "markChannelDeliverySending":
      return store.transaction(() => store.markChannelDeliverySending(args.deliveryId));
    case "finishChannelDelivery":
      return store.transaction(() => store.finishChannelDelivery(args.deliveryId, args.outcome, { externalMessageId: args.externalMessageId, errorCode: args.errorCode }));
    case "getChannelDelivery":
      return store.getChannelDelivery(args.deliveryId);
    case "reconcileChannelDelivery":
      return store.transaction(() => store.reconcileChannelDelivery(args.deliveryId, args.outcome, args.externalMessageId));
    case "retryChannelDelivery":
      return store.transaction(() => store.retryChannelDelivery(args.deliveryId));
    case "channelRuntimeStatus":
      return store.channelRuntimeStatus();
    case "listMessengerSessions":
      return store.listMessengerSessions();
    case "getMessengerSession":
      return store.getMessengerSession(args.sessionId);
    case "recordToolInvocation":
      return store.transaction(() => store.recordToolInvocation(args.record, args.generation));
    case "getToolInvocation":
      return store.getToolInvocation(args.invocationId, args.principalId);
    case "createWorkspace":
      return store.transaction(() => store.createWorkspace(args));
    case "listWorkspaces":
      return store.listWorkspaces(args.principalId, { includeArchived: args.includeArchived });
    case "updateWorkspace":
      return store.transaction(() => store.updateWorkspace(args.sessionId, args.principalId, args.changes));
    case "deleteWorkspace":
      return store.transaction(() => store.deleteWorkspace(args.sessionId, args.principalId));
    case "appendWorkspaceMessage":
      return store.transaction(() => store.appendWorkspaceMessage(args));
    case "getWorkspace":
      return store.getWorkspace(args.sessionId, args.principalId);
    case "addMemoryCandidate":
      return store.transaction(() => store.addMemoryCandidate(args.record));
    case "listMemory":
      return store.listMemory(args);
    case "searchMemory":
      return store.searchMemory(args.query, args);
    case "saveMctAdmissionBundle":
      return store.transaction(() => store.saveMctAdmissionBundle(args.bundle));
    case "getMctAdmissionBundle":
      return store.getMctAdmissionBundle(args.taskPacketId);
    case "saveMctResponseInfluences":
      return store.transaction(() => store.saveMctResponseInfluences(args.records));
    case "listMctResponseInfluences":
      return store.listMctResponseInfluences(args.responseDocumentId);
    case "memorySearchStatus":
      return store.memorySearchStatus();
    case "rebuildMemorySearchIndex":
      return store.rebuildMemorySearchIndex();
    case "repairMemorySearchIndexBatch":
      return store.transaction(() => store.repairMemorySearchIndexBatch(args));
    case "deleteMemory":
      return store.transaction(() => store.deleteMemory(args.memoryId));
    case "reviewMemory":
      return store.transaction(() => store.reviewMemory(args.memoryId, args.decision, args.authority));
    case "promoteMemory":
      return store.transaction(() => store.promoteMemory(args.memoryId, args));
    case "listContextInfluences":
      return store.listContextInfluences();
    case "rollbackContextInfluence":
      return store.transaction(() => store.rollbackContextInfluence(args.influenceId, args.reason));
    case "saveGrowthProposal":
      return store.transaction(() => store.saveGrowthProposal(args.bundle));
    case "listGrowthProposals":
      return store.listGrowthProposals(args.ownerId, args);
    case "getGrowthProposal":
      return store.getGrowthProposal(args.proposalId);
    case "getGrowthProposalBundle":
      return store.getGrowthProposalBundle(args.proposalId);
    case "saveGrowthReplayResult":
      return store.transaction(() => store.saveGrowthReplayResult(args.bundle));
    case "reviewGrowthProposal":
      return store.transaction(() => store.reviewGrowthProposal(args.proposalId, args.decision, args.authority));
    case "applyGrowthMutation":
      return store.transaction(() => store.applyGrowthMutation(args.proposalId, args.replayResultId, args));
    case "listGrowthMutations":
      return store.listGrowthMutations(args.ownerId, args);
    case "getRollbackReceiptBundle":
      return store.getRollbackReceiptBundle(args.receiptId);
    case "expireGrowthMutations":
      return store.transaction(() => store.expireGrowthMutations(args.now));
    case "rollbackGrowthMutation":
      return store.transaction(() => store.rollbackGrowthMutation(args.mutationId, args));
    case "verifyGrowthRollback":
      return store.transaction(() => store.verifyGrowthRollback(args.mutationId, args));
    case "close":
      store.close();
      closed = true;
      return { closed: true };
    default:
      throw new Error(`Unknown state writer operation: ${op}`);
  }
}

async function pump() {
  if (running) return;
  running = true;
  while (queue.length && !closed) {
    const message = queue.shift();
    try {
      const result = await withBusyRetry(() => execute(message.op, message.args));
      process.send?.({ id: message.id, ok: true, result });
    } catch (error) {
      process.send?.({ id: message.id, ok: false, error: { code: error.code || "state_writer_error", message: error.message || "State writer operation failed", status: error.status || 500, details: error.details } });
    }
  }
  running = false;
  if (closed) setImmediate(() => process.exit(0));
}

process.on("message", message => {
  if (!message?.id || closed) return;
  queue.push(message);
  void pump();
});

process.once("disconnect", () => {
  if (!closed) {
    try { store.close(); } catch {}
    process.exit(0);
  }
});
