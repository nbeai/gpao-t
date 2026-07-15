import { createTaskPacket } from "./task-packet.js";
import { LocalHybridMemory } from "./local-memory.js";
import { admitTcellCandidates, createReplayAndGrowthCandidate } from "./tcell.js";
import { normalizeProviderFailure } from "./provider.js";
import { createRepairPlan } from "./repair-plan.js";

async function waitForTerminal(runtime, principalId, commandId, timeoutMs = 4_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const turn = await runtime.getTurn(principalId, commandId);
    if (["succeeded", "failed", "uncertain", "cancelled"].includes(turn?.status)) return turn;
    await new Promise(resolve => setTimeout(resolve, 15));
  }
  return runtime.getTurn(principalId, commandId);
}

export class NativeOsTurnPipeline {
  constructor({ runtime, memory = new LocalHybridMemory() } = {}) { this.runtime = runtime; this.memory = memory; }

  async run({ principalId, sessionId = principalId, requestId, input, activeGoal = null, authority = {} }) {
    const memorySearch = this.memory.search(input, { sessionId });
    const taskPacket = createTaskPacket({ sessionId, input, activeGoal, memoryCandidates: memorySearch.results, authority });
    const admission = admitTcellCandidates(taskPacket, memorySearch.results);
    const selection = { ...(authority.modelSelection || {}), allowCrossProviderFallback: Boolean(authority.allowCrossProviderFallback) };
    const selectedProviderId = selection.preferredProviderId || selection.providerId || null;
    let routed;
    try {
      routed = await this.runtime.modelRouter.invoke({
        runId: taskPacket.id,
        sessionId,
        generation: this.runtime.generation,
        idempotencyKey: `${principalId}:${requestId}`,
        input,
        sourceContextDigest: JSON.stringify(admission.trace),
        selection,
        protectedConnection: selectedProviderId ? this.runtime.protectedConnectionMetadata(selectedProviderId) : null
      });
    } catch (error) {
      const providerFailure = normalizeProviderFailure(error);
      return { schema: "gpao_t.os_turn.v1", taskPacket, memory: memorySearch, admission, providerPlan: error.providerPlan || null, providerFailure, repairPlan: createRepairPlan(providerFailure.failureClass), replyMode: "provider_blocked", replay: null, growthCandidate: null };
    }
    const { providerPlan, providerResult } = routed;
    const submitted = await this.runtime.controller.submit({ principalId, requestId, payload: { input: providerResult.result.text, taskPacketId: taskPacket.id, contextDigest: admission.trace, providerReceipt: providerResult.receipt } });
    const turn = await waitForTerminal(this.runtime, principalId, submitted.commandId);
    const { replay, growthCandidate } = createReplayAndGrowthCandidate({ taskPacket, admission, outcome: turn });
    const observation = turn?.status === "succeeded"
      ? this.memory.ingest({ text: input, source: "turn_observation", traceRef: taskPacket.id, sessionId, reviewed: false })
      : { accepted: false, reason: "non_terminal_success" };
    return { schema: "gpao_t.os_turn.v1", submitted, taskPacket, memory: memorySearch, admission, providerPlan, providerRoute: { providerId: routed.provider.id, modelId: routed.model.id, fallbackUsed: routed.fallbackUsed, failures: routed.failures }, providerReceipt: providerResult.receipt, turn, observation, replyMode: turn?.status === "succeeded" ? (routed.provider.adapter === "native-deterministic-emulator" ? "provider_emulator" : "provider_response") : "blocked_or_failed", replay, growthCandidate };
  }
}
