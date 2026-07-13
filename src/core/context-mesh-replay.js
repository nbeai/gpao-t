import { runRuntimeTurn } from "./runtime.js";

export function buildAppliedContextMeshReplay({
  root,
  request,
  priorFlow,
  expectedAnchor,
  expectedRole = "anchor",
  now = new Date().toISOString(),
} = {}) {
  const findings = [];
  if (!request) findings.push("request_missing");
  if (!expectedAnchor) findings.push("expected_anchor_missing");

  if (findings.length) {
    return {
      schema: "gpao_t.applied_context_mesh_replay.v0_1",
      status: "blocked",
      createdAt: now,
      findings,
      authority: buildReplayAuthority(),
      nextSafeAction: "Provide request and expected anchor before replay.",
    };
  }

  const turn = runRuntimeTurn({
    root,
    input: { text: request },
    priorFlow,
    persist: false,
    now,
  });
  const appliedCandidates = turn.contextRuntime.mesh.retrievedCandidates.filter((candidate) =>
    candidate.lifecycle === "reviewed" &&
    candidate.source?.surface === "memory_review_queue"
  );
  const matchedCandidate = appliedCandidates.find((candidate) => candidate.anchor === expectedAnchor) || null;
  const admitted = turn.admissionPacket.admittedCells.find((cell) => cell.id === matchedCandidate?.id) || null;
  const expectedRoleMatched = Boolean(admitted && admitted.role === expectedRole);

  return {
    schema: "gpao_t.applied_context_mesh_replay.v0_1",
    status: matchedCandidate && expectedRoleMatched ? "passed" : "review",
    createdAt: now,
    request,
    expectedAnchor,
    expectedRole,
    activeTargetId: turn.taskPacket.activeTargetId,
    inputSignal: turn.inputSignal,
    appliedCandidate: matchedCandidate
      ? {
          id: matchedCandidate.id,
          anchor: matchedCandidate.anchor,
          admissionRole: matchedCandidate.admissionRole,
          answerAnchorEligible: matchedCandidate.answerAnchorEligible,
          meshScore: matchedCandidate.meshScore,
          lifecycle: matchedCandidate.lifecycle,
        }
      : null,
    admission: admitted
      ? {
          id: admitted.id,
          role: admitted.role,
          admissionScore: admitted.admissionScore,
          reason: admitted.reason,
          recoveryHint: admitted.recoveryHint,
        }
      : null,
    counts: {
      retrievedAppliedCandidates: appliedCandidates.length,
      admittedCells: turn.admissionPacket.admittedCells.length,
      rejectedCells: turn.admissionPacket.rejectedCells.length,
    },
    authority: buildReplayAuthority(),
    findings: [
      ...(matchedCandidate ? [] : ["applied_candidate_not_retrieved"]),
      ...(matchedCandidate && !admitted ? ["applied_candidate_not_admitted"] : []),
      ...(matchedCandidate && admitted && admitted.role !== expectedRole
        ? [`expected_role_${expectedRole}_but_got_${admitted.role}`]
        : []),
    ],
    trace: [
      "run_runtime_turn_without_persistence",
      "filter_applied_memory_review_queue_candidates",
      "compare_context_mesh_retrieval_with_admission_packet",
      "prove_retrieved_is_not_automatic_anchor",
    ],
    nextSafeAction: matchedCandidate && expectedRoleMatched
      ? "Expose this replay state in the UI before enabling user-facing apply/rollback controls."
      : "Inspect active target, request type, and admission role before relying on the applied candidate.",
  };
}

export function verifyAppliedContextMeshReplay({ root, now = "2026-07-11T01:20:00.000Z" } = {}) {
  const anchorReplay = buildAppliedContextMeshReplay({
    root,
    now,
    request: "이어서 그 기준으로 지파오티 메모리 적용 원칙을 확인해줘.",
    priorFlow: { flowKey: "gpao-t-memory-flow", activeTargetId: "memory-review-queue" },
    expectedAnchor: "memory-review-queue",
    expectedRole: "anchor",
  });
  const supportReplay = buildAppliedContextMeshReplay({
    root,
    now: "2026-07-11T01:21:00.000Z",
    request: "GPAO-T 첫 로컬 작업 루프를 검증하고 다음 안전 행동을 정리해줘.",
    priorFlow: { flowKey: "gpao-t-memory-flow", activeTargetId: "memory-review-queue" },
    expectedAnchor: "memory-review-queue",
    expectedRole: "support",
  });
  const findings = [];
  if (anchorReplay.status !== "passed") findings.push("anchor_replay_failed");
  if (supportReplay.status !== "passed") findings.push("support_replay_failed");
  if (anchorReplay.authority.mutationAllowedNow !== false) findings.push("replay_mutation_open");
  if (supportReplay.admission?.role === "anchor") findings.push("support_replay_became_anchor");

  return {
    schema: "gpao_t.applied_context_mesh_replay_verification.v0_1",
    status: findings.length ? "review" : "ready",
    findings,
    anchorReplay,
    supportReplay,
  };
}

export function buildAppliedReplayInspectorState({
  root,
  request,
  priorFlow,
  expectedAnchor,
  expectedRole = "anchor",
  now = new Date().toISOString(),
} = {}) {
  const replay = buildAppliedContextMeshReplay({
    root,
    request,
    priorFlow,
    expectedAnchor,
    expectedRole,
    now,
  });
  const trace = Array.isArray(replay.trace) ? replay.trace : [];
  const role = replay.admission?.role ?? "review";
  const replayPassed = replay.status === "passed";
  const hasCandidate = Boolean(replay.appliedCandidate);

  return {
    schema: "gpao_t.surface.applied_replay_inspector_state.v0_1",
    status: replay.status,
    createdAt: replay.createdAt,
    expectedAnchor: replay.expectedAnchor,
    activeTargetId: replay.activeTargetId,
    appliedCandidate: replay.appliedCandidate,
    admission: replay.admission,
    authority: replay.authority,
    labels: {
      candidate: hasCandidate ? replay.appliedCandidate.anchor : "대기",
      replay: replayPassed ? "통과" : replay.status === "blocked" ? "차단" : "검토",
      role,
      automaticMemory: "아님",
      inheritedRuntimeMemory: replay.authority.compatibilityMemoryWrite === "blocked" ? "미기록" : "확인",
      rollback: hasCandidate ? "가능" : "대기",
    },
    tones: {
      candidate: hasCandidate ? "ready" : "waiting",
      replay: replayPassed ? "ready" : replay.status === "blocked" ? "blocked" : "waiting",
      role: role === "anchor" ? "active" : role === "support" ? "ready" : "waiting",
      automaticMemory: "blocked",
      inheritedRuntimeMemory: replay.authority.compatibilityMemoryWrite === "blocked" ? "blocked" : "waiting",
      rollback: hasCandidate ? "ready" : "waiting",
    },
    userLine: role === "anchor"
      ? "이 후보는 현재 목표와 맞아 답변 기준으로 쓸 수 있습니다."
      : role === "support"
        ? "이 후보는 관련 맥락이지만 현재 목표의 기준점은 아닙니다."
        : "적용된 Context Mesh 후보는 replay를 통과해야 답변 기준이 됩니다.",
    blockedAuthorities: [
      ...(replay.authority.durableMemoryPromotion === "blocked" ? ["durable_memory"] : []),
      ...(replay.authority.compatibilityMemoryWrite === "blocked" ? ["openclaw_memory"] : []),
      ...(replay.authority.sessionMetaWrite === "blocked" ? ["session_meta"] : []),
      ...(replay.authority.externalSend === "blocked" ? ["external_send"] : []),
      ...(replay.authority.automaticAdmission === "blocked" ? ["automatic_admission"] : []),
    ],
    uiContract: {
      primaryTrack: "operating_surface",
      secondaryTrack: "core_kernel",
      targetSurface: "gpao_work_pane_inspector",
      sidecarSurface: false,
      liveMutation: false,
      controlLabels: ["적용 후보", "Replay", "현재 역할", "자동 기억", "기존 런타임 기억", "Rollback"],
    },
    findings: replay.findings,
    trace: [...trace, "map_replay_to_compact_dashboard_inspector_state"],
    nextSafeAction: replayPassed
      ? "Render this state in the GPAO-T work pane inspector with apply/rollback controls still gated."
      : "Keep the inspector in review state until replay/admission proof passes.",
  };
}

export function verifyAppliedReplayInspectorState({ root, now = "2026-07-11T01:22:00.000Z" } = {}) {
  const anchorInspector = buildAppliedReplayInspectorState({
    root,
    now,
    request: "이어서 그 기준으로 지파오티 메모리 적용 원칙을 확인해줘.",
    priorFlow: { flowKey: "gpao-t-memory-flow", activeTargetId: "memory-review-queue" },
    expectedAnchor: "memory-review-queue",
    expectedRole: "anchor",
  });
  const supportInspector = buildAppliedReplayInspectorState({
    root,
    now: "2026-07-11T01:23:00.000Z",
    request: "GPAO-T 첫 로컬 작업 루프를 검증하고 다음 안전 행동을 정리해줘.",
    priorFlow: { flowKey: "gpao-t-memory-flow", activeTargetId: "memory-review-queue" },
    expectedAnchor: "memory-review-queue",
    expectedRole: "support",
  });
  const findings = [];
  if (anchorInspector.labels.role !== "anchor") findings.push("anchor_role_not_visible");
  if (supportInspector.labels.role !== "support") findings.push("support_role_not_visible");
  if (!anchorInspector.blockedAuthorities.includes("openclaw_memory")) {
    findings.push("openclaw_memory_boundary_not_visible");
  }
  if (anchorInspector.uiContract.sidecarSurface !== false) findings.push("sidecar_surface_opened");
  if (anchorInspector.uiContract.liveMutation !== false) findings.push("live_mutation_opened");
  return {
    schema: "gpao_t.surface.applied_replay_inspector_state_verification.v0_1",
    status: findings.length ? "review" : "ready",
    findings,
    anchorInspector,
    supportInspector,
  };
}

function buildReplayAuthority() {
  return {
    mutationAllowedNow: false,
    durableMemoryPromotion: "blocked",
    compatibilityMemoryWrite: "blocked",
    sessionMetaWrite: "blocked",
    externalSend: "blocked",
    automaticAdmission: "blocked",
  };
}
