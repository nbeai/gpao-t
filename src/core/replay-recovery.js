import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runRuntimeTurn } from "./runtime.js";

export function buildReplayRecoveryView({ fixture, fixturePath, root } = {}) {
  const replayFixture = fixture || JSON.parse(readFileSync(resolve(fixturePath), "utf8"));
  const result = runRuntimeTurn({
    ...replayFixture,
    root,
    persist: false,
  });

  return {
    schema: "gpao_t.replay_recovery_view.v0_1",
    status: result.admissionPacket.status,
    input: result.inputSignal,
    activeTarget: {
      id: result.sessionOverlay.activeTargetId,
      label: result.sessionOverlay.activeTargetLabel,
      continuityState: result.sessionOverlay.continuityState,
    },
    admitted: result.admissionPacket.admittedCells.map(formatCellView),
    rejected: result.admissionPacket.rejectedCells.map(formatCellView),
    recovery: buildRecoverySummary(result),
    nextSafeAction: result.userVisibleState.nextSafeAction,
    trace: result.taskPacket.trace,
  };
}

function formatCellView(cell) {
  return {
    id: cell.id,
    role: cell.role,
    admissionScore: cell.admissionScore,
    reason: cell.reason,
    recoveryHint: cell.recoveryHint,
    scoreBreakdown: cell.scoreBreakdown,
  };
}

function buildRecoverySummary(result) {
  const anchor = result.admissionPacket.admittedCells
    .filter((cell) => cell.role === "anchor")
    .sort((a, b) => b.admissionScore - a.admissionScore)[0];
  if (anchor) {
    return {
      status: "recovered",
      summary: `Recovered active target '${result.sessionOverlay.activeTargetId}' through ${anchor.id}.`,
      confidence: anchor.admissionScore >= 55 ? "high" : "review",
    };
  }
  return {
    status: "needs_clarification",
    summary: "No admitted anchor matched the active target; ask a clarifying question before answering.",
    confidence: "low",
  };
}
