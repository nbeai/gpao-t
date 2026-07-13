const RELEASE_TARGET = "release-file";
const GENERAL_TARGET = "general-runtime";

export function classifyRequestTarget({ text = "", inputSignal = { kind: "general_request" }, priorFlow } = {}) {
  const normalized = String(text);
  const explicitRelease = hasReleaseSignal(normalized);
  const followUp = inputSignal.kind === "follow_up" || hasFollowUpSignal(normalized);
  const artifact = inputSignal.kind === "artifact_request";
  const priorTarget = priorFlow?.activeTargetId || null;

  if (explicitRelease) {
    return {
      requestType: followUp ? "release_file_follow_up" : "release_file_request",
      activeTargetId: RELEASE_TARGET,
      carryPriorTarget: priorTarget === RELEASE_TARGET,
      targetSource: "explicit_request",
      stalePriorTarget: false,
    };
  }

  if (followUp && priorTarget) {
    return {
      requestType: "continuity_follow_up",
      activeTargetId: priorTarget,
      carryPriorTarget: true,
      targetSource: "prior_flow_follow_up",
      stalePriorTarget: false,
    };
  }

  if (artifact) {
    return {
      requestType: "artifact_request",
      activeTargetId: inferArtifactTarget(normalized),
      carryPriorTarget: false,
      targetSource: "current_request",
      stalePriorTarget: Boolean(priorTarget),
    };
  }

  return {
    requestType: isWorkSurfaceRequest(normalized) ? "work_surface_general_request" : "general_work_request",
    activeTargetId: GENERAL_TARGET,
    carryPriorTarget: false,
    targetSource: "current_request",
    stalePriorTarget: Boolean(priorTarget && priorTarget !== GENERAL_TARGET),
    staleReason: priorTarget && priorTarget !== GENERAL_TARGET
      ? `prior active target '${priorTarget}' is supporting-only for this request type`
      : null,
  };
}

export function classifyContextCandidateUse({ candidate, requestPolicy, inputSignal = { kind: "general_request" } } = {}) {
  const anchor = candidate?.anchor || "unknown";
  const targetMatch = anchor === requestPolicy.activeTargetId;
  const releaseCandidateOnGeneralRequest = anchor === RELEASE_TARGET
    && requestPolicy.activeTargetId !== RELEASE_TARGET
    && requestPolicy.requestType !== "continuity_follow_up";

  if (releaseCandidateOnGeneralRequest) {
    return {
      targetMatch: false,
      admissionRole: "stale_supporting",
      answerAnchorEligible: false,
      downgradeReason: "release-file candidate is stale/supporting for a general Work Surface request",
    };
  }

  if (targetMatch) {
    return {
      targetMatch: true,
      admissionRole: "answer_anchor",
      answerAnchorEligible: true,
      downgradeReason: null,
    };
  }

  if (candidate?.radius?.validFor?.includes(inputSignal.kind)) {
    return {
      targetMatch: false,
      admissionRole: "supporting_context",
      answerAnchorEligible: false,
      downgradeReason: "candidate fits the request type but does not match the active target",
    };
  }

  return {
    targetMatch: false,
    admissionRole: "supporting_context",
    answerAnchorEligible: false,
    downgradeReason: "candidate is available only as non-anchor context",
  };
}

export function hasReleaseSignal(text) {
  return /배포파일|배포 파일|GPAO-T Operating Package|GPAO Operating Package|release[-\s]?file|release package|package file/i.test(text);
}

export function hasFollowUpSignal(text) {
  return /그럼|그건|그거|거기|그곳|저기|그 집|그 가게|아까|이어서|방금|계속|후기|예약|then|that|it/i.test(text);
}

function inferArtifactTarget(text) {
  if (hasReleaseSignal(text) || /배포|release|package/i.test(text)) {
    return RELEASE_TARGET;
  }
  return "artifact";
}

function isWorkSurfaceRequest(text) {
  return /work surface|작업 표면|작업 루프|로컬 작업|첫 작업|첫 로컬/i.test(text);
}
