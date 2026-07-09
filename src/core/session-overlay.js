import { classifyRequestTarget, hasFollowUpSignal } from "./context-admission-policy.js";

export function buildSessionOverlay({ input, priorFlow, inputSignal = { kind: "general_request" } } = {}) {
  const text = input?.text || "";
  const followUp = inputSignal.kind === "follow_up" || hasFollowUpSignal(text);
  const requestPolicy = classifyRequestTarget({ text, inputSignal, priorFlow });
  const activeTargetId = requestPolicy.activeTargetId;

  return {
    schema: "gpao_t.session_overlay.v0_1",
    flowKey: priorFlow?.flowKey || "local-dev-flow",
    activeTargetId,
    activeTargetLabel: labelActiveTarget(activeTargetId),
    requestType: requestPolicy.requestType,
    targetSource: requestPolicy.targetSource,
    continuityState: followUp && requestPolicy.carryPriorTarget ? "recovered" : "fresh",
    stalePriorTarget: requestPolicy.stalePriorTarget,
    staleReason: requestPolicy.staleReason || null,
    lastUserCorrection: priorFlow?.lastUserCorrection,
    doNotCarry: priorFlow?.doNotCarry || [],
    createdAt: priorFlow?.createdAt || new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

function labelActiveTarget(activeTargetId) {
  if (activeTargetId === "release-file") {
    return "배포 파일";
  }
  if (activeTargetId === "artifact") {
    return "작업 산출물";
  }
  return "GPAO-T runtime";
}
