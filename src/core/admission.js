const DEFAULT_WEIGHTS = {
  relevance: 0.5,
  confidence: 0.5,
  freshness: 0.5,
  risk: 0.2,
  cost: 0.2,
};

export function buildAdmissionPacket({ inputSignal, sessionOverlay, contextRuntime }) {
  const cells = contextRuntime.retrievedCells.map((cell) => {
    const scoring = scoreAdmission({ cell, inputSignal, sessionOverlay });
    const role = classifyCellRole({ cell, inputSignal, sessionOverlay, scoring });
    return {
      id: cell.id,
      role,
      admitted: role !== "rejected",
      admissionScore: scoring.total,
      scoreBreakdown: scoring.breakdown,
      reason: buildAdmissionReason({ cell, role, inputSignal, sessionOverlay }),
      recoveryHint: buildRecoveryHint({ cell, role, inputSignal, sessionOverlay, scoring }),
      cell,
    };
  });
  const admittedCells = cells.filter((cell) => cell.admitted);
  const rejectedCells = cells.filter((cell) => !cell.admitted);

  return {
    schema: "gpao_t.admission_packet.v0_1",
    status: admittedCells.some((cell) => cell.role === "anchor") ? "ready" : "review",
    inputSignal,
    flowKey: sessionOverlay.flowKey,
    activeTargetId: sessionOverlay.activeTargetId,
    admittedCells,
    rejectedCells,
    scoringSummary: {
      admitted: admittedCells.length,
      rejected: rejectedCells.length,
      strongestAnchor: admittedCells.find((cell) => cell.role === "anchor")?.id || null,
      reviewReasons: cells
        .filter((cell) => cell.role === "conflict" || cell.role === "rejected")
        .map((cell) => `${cell.id}: ${cell.reason}`),
    },
    trace: [
      "retrieved_context_is_not_automatically_admitted",
      "admission_score_explains_current_turn_use",
      "active_target_cells_win_over_generic_memory",
      "authority_boundary_is_checked_after_admission",
    ],
  };
}

export function scoreAdmission({ cell, inputSignal, sessionOverlay }) {
  const weights = cell.weights || DEFAULT_WEIGHTS;
  const breakdown = [];
  let total = 0;

  if (cell.anchor === sessionOverlay.activeTargetId) {
    breakdown.push({ signal: "active_target_anchor", value: 40, detail: `anchor matches ${sessionOverlay.activeTargetId}` });
    total += 40;
  }
  if (sessionOverlay.activeReferent?.entity && cell.anchor === `referent:${sessionOverlay.activeReferent.entity}`) {
    breakdown.push({
      signal: "active_referent_anchor",
      value: 36,
      detail: `referent matches ${sessionOverlay.activeReferent.entity}`,
    });
    total += 36;
  }
  if (cell.admissionRole === "stale_supporting") {
    breakdown.push({ signal: "stale_supporting_downgrade", value: -10, detail: cell.downgradeReason || "stale supporting context" });
    total -= 10;
  }
  if (cell.radius?.validFor?.includes(inputSignal.kind)) {
    breakdown.push({ signal: "input_signal_fit", value: 15, detail: `valid for ${inputSignal.kind}` });
    total += 15;
  }
  if (cell.meshScore) {
    const value = Math.min(20, Math.round(cell.meshScore * 3));
    breakdown.push({ signal: "context_mesh_score", value, detail: `meshScore ${cell.meshScore}` });
    total += value;
  }
  if (weights.confidence >= 0.55) {
    const value = Math.round(weights.confidence * 10);
    breakdown.push({ signal: "confidence", value, detail: `confidence ${weights.confidence}` });
    total += value;
  }
  if (weights.risk > 0.8) {
    breakdown.push({ signal: "high_risk_penalty", value: -50, detail: `risk ${weights.risk}` });
    total -= 50;
  }
  if (cell.lifecycle === "candidate") {
    breakdown.push({ signal: "candidate_penalty", value: -5, detail: "candidate memory is useful but not durable truth" });
    total -= 5;
  }
  if (cell.relations?.contradicts?.includes(sessionOverlay.activeTargetId)) {
    breakdown.push({ signal: "conflict_penalty", value: -60, detail: `contradicts ${sessionOverlay.activeTargetId}` });
    total -= 60;
  }

  return { total, breakdown };
}

function classifyCellRole({ cell, inputSignal, sessionOverlay, scoring }) {
  if (cell.relations?.contradicts?.includes(sessionOverlay.activeTargetId)) {
    return "conflict";
  }
  if ((cell.weights || DEFAULT_WEIGHTS).risk > 0.8 || scoring.total < 5) {
    return "rejected";
  }
  if (cell.admissionRole === "stale_supporting") {
    return "support";
  }
  if (cell.answerAnchorEligible === false) {
    return "support";
  }
  if (sessionOverlay.activeReferent?.entity && cell.anchor === `referent:${sessionOverlay.activeReferent.entity}`) {
    return cell.answerAnchorEligible ? "anchor" : "support";
  }
  if (cell.anchor === sessionOverlay.activeTargetId) {
    return "anchor";
  }
  if (cell.radius?.validFor?.includes(inputSignal.kind)) {
    return "support";
  }
  return "support";
}

function buildAdmissionReason({ cell, role, inputSignal, sessionOverlay }) {
  if (role === "anchor") {
    return `cell ${cell.id} anchors the active target ${sessionOverlay.activeTargetId}`;
  }
  if (role === "conflict") {
    return `cell ${cell.id} may conflict with active target ${sessionOverlay.activeTargetId}`;
  }
  if (role === "rejected") {
    return `cell ${cell.id} exceeded the current risk boundary`;
  }
  return `cell ${cell.id} supports ${inputSignal.kind}`;
}

function buildRecoveryHint({ cell, role, inputSignal, sessionOverlay, scoring }) {
  if (role === "anchor") {
    return `Use this as the current-turn anchor because it matches ${sessionOverlay.activeTargetId} with score ${scoring.total}.`;
  }
  if (role === "support") {
    if (cell.admissionRole === "stale_supporting") {
      return `cell ${cell.id} is stale/supporting only for ${inputSignal.kind}`;
    }
    return `Use as supporting context only; it fits ${inputSignal.kind} but is not the active target anchor.`;
  }
  if (role === "conflict") {
    return "Do not answer from this cell until the conflict is resolved or the user clarifies the target.";
  }
  return "Keep out of the TaskPacket; ask a clarifying question or gather stronger evidence if needed.";
}
