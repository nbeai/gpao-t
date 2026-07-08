import { runTurn } from "./turn-kernel.js";
import {
  appendAuditEvent,
  initializeRuntimeState,
  readRuntimeState,
  writeRuntimeState,
} from "./storage.js";

export function runRuntimeTurn({
  input,
  priorFlow,
  root,
  persist = true,
  now = new Date().toISOString(),
} = {}) {
  const state = initializeRuntimeState({ root, now });
  const result = runTurn({
    input,
    root,
    priorFlow: priorFlow || state.activeFlow || undefined,
  });

  if (!persist) {
    return result;
  }

  const nextState = {
    ...readRuntimeState({ root }),
    updatedAt: now,
    activeFlow: {
      flowKey: result.sessionOverlay.flowKey,
      activeTargetId: result.sessionOverlay.activeTargetId,
      activeTargetLabel: result.sessionOverlay.activeTargetLabel,
      continuityState: result.sessionOverlay.continuityState,
      taskPacketId: result.taskPacket.id,
      updatedAt: now,
    },
    counters: {
      turns: state.counters.turns + 1,
      approvalsNeeded: state.counters.approvalsNeeded + (result.authorityDecision.status === "needs_approval" ? 1 : 0),
      events: state.counters.events + 1,
    },
  };
  writeRuntimeState(nextState, { root });

  const event = appendAuditEvent({
    type: result.authorityDecision.status === "needs_approval"
      ? "turn.authority_needed"
      : "turn.completed",
    authority: result.authorityDecision.status,
    summary: result.userVisibleState.summary,
    payload: {
      inputSignal: result.inputSignal,
      activeTargetId: result.sessionOverlay.activeTargetId,
      taskPacketId: result.taskPacket.id,
      modelRoute: result.modelRoute.route,
      requiredApprovals: result.authorityDecision.requiredApprovals,
    },
  }, { root, now });

  return {
    ...result,
    persistence: {
      schema: "gpao_t.persistence_result.v0_1",
      state: "written",
      eventId: event.id,
      activeFlow: nextState.activeFlow,
    },
  };
}
