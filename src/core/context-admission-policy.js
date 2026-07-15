const RELEASE_TARGET = "release-file";
const GENERAL_TARGET = "general-runtime";
const NON_ANCHOR_LIFECYCLES = new Set([
  "raw_signal",
  "candidate",
  "stale",
  "conflicted",
  "rejected",
  "archived",
]);
const KOREAN_FOLLOW_UP_PATTERN = /그럼|그건|그거|거기|그곳|저기|그 집|그 가게|아까|이어서|방금|계속|후기|예약/i;
const ENGLISH_FOLLOW_UP_PATTERN = /\b(?:then|that|it)\b/i;

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
  const authorityUse = classifyCellAuthorityUse(candidate);
  const releaseCandidateOnGeneralRequest = anchor === RELEASE_TARGET
    && requestPolicy.activeTargetId !== RELEASE_TARGET
    && requestPolicy.requestType !== "continuity_follow_up";

  if (!authorityUse.candidateEvidenceAllowed) {
    return {
      targetMatch,
      admissionRole: "blocked",
      answerAnchorEligible: false,
      downgradeReason: "candidate authority blocks current-turn context use",
    };
  }

  if (releaseCandidateOnGeneralRequest && authorityUse.supportingContextAllowed) {
    return {
      targetMatch: false,
      admissionRole: "stale_supporting",
      answerAnchorEligible: false,
      downgradeReason: "release-file candidate is stale/supporting for a general Work Surface request",
    };
  }

  if (targetMatch && authorityUse.answerAnchorAllowed) {
    return {
      targetMatch: true,
      admissionRole: "answer_anchor",
      answerAnchorEligible: true,
      downgradeReason: null,
    };
  }

  if (authorityUse.supportingContextAllowed) {
    return {
      targetMatch,
      admissionRole: "supporting_context",
      answerAnchorEligible: false,
      downgradeReason: targetMatch
        ? authorityUse.answerAnchorDeniedReason
        : candidate?.radius?.validFor?.includes(inputSignal.kind)
        ? "candidate fits the request type but does not match the active target"
        : "candidate is available only as non-anchor context",
    };
  }

  return {
    targetMatch,
    admissionRole: "candidate_evidence",
    answerAnchorEligible: false,
    downgradeReason: "candidate may be retrieved for review but is not admitted context",
  };
}

export function classifyCellAuthorityUse(candidate = {}) {
  const lifecycle = candidate?.lifecycle || "unknown";
  const allowedUse = normalizeUses(candidate?.authority?.allowedUse);
  const blockedUse = normalizeUses(candidate?.authority?.blockedUse);
  const hasExplicitAllowedUse = allowedUse.size > 0;
  const allContextUseBlocked = allowedUse.has("none")
    || allowedUse.has("blocked")
    || blockedUse.has("all_context_use")
    || blockedUse.has("context_use")
    || blockedUse.has("admit_for_current_turn");
  const lifecycleAllowsAnchor = !NON_ANCHOR_LIFECYCLES.has(lifecycle);
  const answerAnchorAllowedByUse = !hasExplicitAllowedUse || hasAny(allowedUse, [
    "answer_anchor",
    "admit",
    "admit_for_current_turn",
  ]);
  const supportingContextAllowedByUse = !hasExplicitAllowedUse || hasAny(allowedUse, [
    "answer_anchor",
    "supporting_context",
    "admit",
    "admit_for_current_turn",
  ]);
  const candidateEvidenceAllowedByUse = !hasExplicitAllowedUse || hasAny(allowedUse, [
    "answer_anchor",
    "supporting_context",
    "candidate_evidence",
    "candidate_only",
    "review_only",
    "admit",
    "admit_for_current_turn",
    "retrieve",
    "review",
    "explain",
  ]);
  const answerAnchorAllowed = lifecycleAllowsAnchor
    && answerAnchorAllowedByUse
    && !allContextUseBlocked
    && !blockedUse.has("answer_anchor");
  const supportingContextAllowed = supportingContextAllowedByUse
    && !allContextUseBlocked
    && !blockedUse.has("supporting_context");
  const candidateEvidenceAllowed = candidateEvidenceAllowedByUse
    && !allContextUseBlocked
    && !blockedUse.has("candidate_evidence");

  return {
    lifecycle,
    answerAnchorAllowed,
    supportingContextAllowed,
    candidateEvidenceAllowed,
    answerAnchorDeniedReason: !lifecycleAllowsAnchor
      ? `lifecycle '${lifecycle}' cannot become answer_anchor before review`
      : blockedUse.has("answer_anchor")
      ? "candidate authority explicitly blocks answer_anchor"
      : "candidate allowedUse does not permit answer_anchor",
  };
}

export function hasReleaseSignal(text) {
  return /배포파일|배포 파일|GPAO-T Operating Package|GPAO Operating Package|release[-\s]?file|release package|package file/i.test(text);
}

export function hasFollowUpSignal(text) {
  const normalized = String(text);
  return KOREAN_FOLLOW_UP_PATTERN.test(normalized) || ENGLISH_FOLLOW_UP_PATTERN.test(normalized);
}

function normalizeUses(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return new Set(values.map((item) => String(item).trim()).filter(Boolean));
}

function hasAny(values, candidates) {
  return candidates.some((candidate) => values.has(candidate));
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
