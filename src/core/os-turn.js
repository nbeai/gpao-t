import { createTaskPacket } from "./task-packet.js";
import { LocalHybridMemory } from "./local-memory.js";
import { admitTcellCandidates, createReplayAndGrowthCandidate } from "./tcell.js";
import { createInvocationPlan, normalizeProviderFailure } from "./provider.js";
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
    const provider = this.runtime.providerRegistry.snapshot().providers[0];
    const providerPlan = createInvocationPlan({ runId: taskPacket.id, sessionId, generation: this.runtime.generation, idempotencyKey: `${principalId}:${requestId}`, providerId: provider.id, modelId: provider.models[0].id, inputDigest: "local-turn-input", authorityPermitDigest: "runtime-bound", sourceContextDigest: JSON.stringify(admission.trace) });
    let providerResult;
    try { providerResult = await this.runtime.providerAdapter.invoke(providerPlan); }
    catch (error) { const providerFailure = normalizeProviderFailure(error); return { schema: "gpao_t.os_turn.v1", taskPacket, memory: memorySearch, admission, providerPlan, providerFailure, repairPlan: createRepairPlan(providerFailure.failureClass), replyMode: "provider_blocked", replay: null, growthCandidate: null }; }
    const submitted = await this.runtime.controller.submit({ principalId, requestId, payload: { input: providerResult.result.text, taskPacketId: taskPacket.id, contextDigest: admission.trace, providerReceipt: providerResult.receipt } });
    const turn = await waitForTerminal(this.runtime, principalId, submitted.commandId);
    const { replay, growthCandidate } = createReplayAndGrowthCandidate({ taskPacket, admission, outcome: turn });
    const observation = turn?.status === "succeeded"
      ? this.memory.ingest({ text: input, source: "turn_observation", traceRef: taskPacket.id, sessionId, reviewed: false })
      : { accepted: false, reason: "non_terminal_success" };
    return { schema: "gpao_t.os_turn.v1", submitted, taskPacket, memory: memorySearch, admission, providerPlan, providerReceipt: providerResult.receipt, turn, observation, replyMode: turn?.status === "succeeded" ? "provider_emulator" : "blocked_or_failed", replay, growthCandidate };
  }
}
