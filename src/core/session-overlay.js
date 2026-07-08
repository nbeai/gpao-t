export function buildSessionOverlay({ input, priorFlow } = {}) {
  const text = input?.text || "";
  const followUp = isFollowUp(text);
  const activeTargetId = priorFlow?.activeTargetId || inferActiveTarget(text);

  return {
    schema: "gpao_t.session_overlay.v0_1",
    flowKey: priorFlow?.flowKey || "local-dev-flow",
    activeTargetId,
    activeTargetLabel: labelActiveTarget(activeTargetId),
    continuityState: followUp && activeTargetId ? "recovered" : "fresh",
    lastUserCorrection: priorFlow?.lastUserCorrection,
    doNotCarry: priorFlow?.doNotCarry || [],
    createdAt: priorFlow?.createdAt || new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

function isFollowUp(text) {
  return /그럼|그건|그거|아까|이어서|then|that|it/i.test(text);
}

function inferActiveTarget(text) {
  if (/배포|release|package|파일/.test(text)) {
    return "release-file";
  }
  return "general-runtime";
}

function labelActiveTarget(activeTargetId) {
  if (activeTargetId === "release-file") {
    return "배포 파일";
  }
  return "GPAO-T runtime";
}
