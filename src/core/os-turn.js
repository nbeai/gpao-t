import { createTaskPacket } from "./task-packet.js";
import { LocalHybridMemory } from "./local-memory.js";
import { admitTcellCandidates, composeAdmittedProviderInput, createReplayAndGrowthCandidate } from "./tcell.js";
import { normalizeProviderFailure } from "./provider.js";
import { createRepairPlan } from "./repair-plan.js";
import { ContextInfluenceLedger } from "./context-influence.js";
import { prepareTurnToolFlow } from "./turn-tool-orchestrator.js";

const activeMemorySearches = new Set();
const MAX_ACTIVE_MEMORY_SEARCHES = 4;

async function waitForTerminal(runtime, principalId, commandId, timeoutMs = 4_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const turn = await runtime.getTurn(principalId, commandId);
    if (["succeeded", "failed", "uncertain", "cancelled"].includes(turn?.status)) return turn;
    await new Promise(resolve => setTimeout(resolve, 15));
  }
  return runtime.getTurn(principalId, commandId);
}

export async function boundedMemorySearch(search, timeoutMs = 250) {
  if (activeMemorySearches.size >= MAX_ACTIVE_MEMORY_SEARCHES) {
    return { schema: "gpao_t3.memory_search_result.v1", results: [], degraded: "search_backpressure", elapsedMs: 0, receipt: { mode: "degraded_no_memory", candidateCount: 0, limit: 0 } };
  }
  const controller = new AbortController();
  const work = Promise.resolve().then(() => search(controller.signal));
  activeMemorySearches.add(work);
  work.finally(() => activeMemorySearches.delete(work)).catch(() => {});
  let timer;
  try {
    return await Promise.race([
      work,
      new Promise(resolve => { timer = setTimeout(() => { activeMemorySearches.delete(work); controller.abort("hard_deadline_exceeded"); resolve({ schema: "gpao_t3.memory_search_result.v1", results: [], degraded: "hard_deadline_exceeded", elapsedMs: timeoutMs, receipt: { mode: "degraded_no_memory", candidateCount: 0, limit: 0 } }); }, timeoutMs); })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function boundedAdmissionPersistence(write, timeoutMs = 200) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(write).then(receipt => ({ ok: true, receipt })).catch(error => ({ ok: false, error })),
      new Promise(resolve => { timer = setTimeout(() => resolve({ ok: false, timeout: true }), timeoutMs); })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export class NativeOsTurnPipeline {
  constructor({ runtime, memory = new LocalHybridMemory(), contextInfluence = new ContextInfluenceLedger() } = {}) {
    this.runtime = runtime;
    this.memory = memory;
    this.contextInfluence = contextInfluence;
    this.runtimeManagedContext = memory === runtime?.memory && contextInfluence === runtime?.contextInfluence;
  }

  async run({ principalId, sessionId = principalId, requestId, input, activeGoal = null, authority = {}, signal, onTextDelta, onSurfaceEvent } = {}) {
    const userId = String(principalId || "local-owner").split(":conversation:")[0];
    const memorySearch = await boundedMemorySearch(() => this.runtimeManagedContext && this.runtime.searchMemory
      ? this.runtime.searchMemory(input, { sessionId, userId, projectId: authority.projectId || null, channelId: authority.channelId || null, budgetMs: 225 })
      : this.memory.search(input, { sessionId, userId, budgetMs: 225 }));
    const approvedInfluences = this.contextInfluence.activeForTask({ sessionId, userId, projectId: authority.projectId || null, channelId: authority.channelId || null, input });
    const taskCandidates = [...approvedInfluences, ...memorySearch.results];
    if (taskCandidates.length) await onSurfaceEvent?.("memory.retrieved", { candidateIds: taskCandidates.map(candidate => candidate.id), sourceCount: taskCandidates.length });
    const initialTaskPacket = createTaskPacket({ sessionId, input, activeGoal, contextWindow: authority.modelContextWindow || 32_768, userId, projectId: authority.projectId || null, channelId: authority.channelId || null });
    let admission = admitTcellCandidates(initialTaskPacket, taskCandidates);
    if (this.runtimeManagedContext && this.runtime.persistMctAdmission) {
      const persistence = await boundedAdmissionPersistence(() => this.runtime.persistMctAdmission(admission));
      if (!persistence.ok) {
        admission = admitTcellCandidates(initialTaskPacket, []);
        admission.persistenceDegraded = persistence.timeout ? "admission_persistence_timeout" : "admission_persistence_failed";
      } else admission.persistence = persistence.receipt;
    }
    const taskPacket = admission.taskPacket;
    for (const decision of admission.decisions.filter(item => ["rejected", "conflict_boundary", "blocked", "review_needed"].includes(item.state))) {
      await onSurfaceEvent?.("memory.rejected", { candidateId: decision.sourceCandidateId, reasonCode: decision.reason });
    }
    if (taskCandidates.length) await onSurfaceEvent?.("memory.admitted", {
      decisionIds: admission.decisions.map(decision => decision.id),
      answerAnchorIds: taskPacket.answerAnchors.map(item => item.candidateId),
      supportingContextIds: taskPacket.supportingContext.map(item => item.candidateId)
    });
    const toolFlow = await prepareTurnToolFlow(this.runtime, { principalId, requestId, input, onEvent:onSurfaceEvent });
    if (toolFlow.state === "blocked") {
      return { schema: "gpao_t3.os_turn.v1", taskPacket, memory: memorySearch, approvedInfluences, admission, toolFlow, providerPlan: null, providerRoute: null, providerFailure: null, repairPlan: toolFlow.repairPlan, replyMode: "tool_blocked", replay: null, growthCandidate: null, contextInfluence: null };
    }
    const selection = { ...(authority.modelSelection || {}), allowCrossProviderFallback: Boolean(authority.allowCrossProviderFallback) };
    const selectedProviderId = selection.preferredProviderId || selection.providerId || null;
    let routed;
    try {
      routed = await this.runtime.modelRouter.invoke({
        runId: taskPacket.id,
        sessionId,
        generation: this.runtime.generation,
        idempotencyKey: `${principalId}:${requestId}`,
        input: composeAdmittedProviderInput({ currentRequest: input, providerInput: toolFlow.providerInput, admission }),
        sourceContextDigest: JSON.stringify({ taskPacketId: taskPacket.id, answerAnchors: taskPacket.answerAnchors, supportingContext: taskPacket.supportingContext, admission: admission.trace, toolEvidenceDigest: toolFlow.evidenceDigest }),
        selection,
        responseBudget: taskPacket.budget.output,
        protectedConnection: selectedProviderId ? this.runtime.protectedConnectionMetadata(selectedProviderId) : null,
        signal,
        onDelta: onTextDelta
      });
    } catch (error) {
      const providerFailure = normalizeProviderFailure(error);
      return { schema: "gpao_t3.os_turn.v1", taskPacket, memory: memorySearch, approvedInfluences, admission, toolFlow, providerPlan: error.providerPlan || null, providerRoute: error.routeDecision || null, providerFailure, repairPlan: createRepairPlan(providerFailure.failureClass), replyMode: "provider_blocked", replay: null, growthCandidate: null, contextInfluence: null };
    }
    const { providerPlan, providerResult } = routed;
    const submitted = await this.runtime.controller.submit({ principalId, requestId, payload: { input: providerResult.result.text, taskPacketId: taskPacket.id, contextDigest: admission.trace, providerReceipt: providerResult.receipt } });
    const turn = await waitForTerminal(this.runtime, principalId, submitted.commandId);
    const { replay, growthCandidate } = createReplayAndGrowthCandidate({ taskPacket, admission, outcome: turn });
    const contextInfluence = this.runtimeManagedContext && this.runtime.applyReplayApprovedContext
      ? await this.runtime.applyReplayApprovedContext({ taskPacket, admission, replay, growthCandidate })
      : this.contextInfluence.recordTurnOutcome({ taskPacket, admission, replay, growthCandidate });
    const observation = turn?.status === "succeeded"
      ? (this.runtimeManagedContext && this.runtime.addMemoryObservation
          ? await this.runtime.addMemoryObservation({ text: input, source: "turn_observation", traceRef: taskPacket.id, sessionId, userId, projectId: authority.projectId || null, channelId: authority.channelId || null, reviewed: false })
          : this.memory.ingest({ text: input, source: "turn_observation", traceRef: taskPacket.id, sessionId, userId, reviewed: false }))
      : { accepted: false, reason: "non_terminal_success" };
    return { schema: "gpao_t3.os_turn.v1", submitted, taskPacket, memory: memorySearch, approvedInfluences, admission, toolFlow, providerPlan, providerRoute: { providerId: routed.provider.id, modelId: routed.model.id, fallbackUsed: routed.fallbackUsed, failures: routed.failures, decision: routed.routeDecision }, providerReceipt: providerResult.receipt, turn, observation, replyMode: turn?.status === "succeeded" ? (routed.provider.adapter === "native-deterministic-emulator" ? "provider_emulator" : "provider_response") : "blocked_or_failed", replay, growthCandidate, contextInfluence };
  }
}
