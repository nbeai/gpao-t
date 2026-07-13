import { runRuntimeTurn } from "./runtime.js";
import { searchMemory } from "./memory-search.js";
import { runtimePaths } from "./storage.js";

export function buildLlmReadyTaskContextPacket({
  root,
  input,
  priorFlow,
  responseMode = "answer",
  now = new Date().toISOString(),
} = {}) {
  const text = typeof input === "string" ? input : input?.text;
  const findings = [];
  if (!text) findings.push("input_text_missing");

  if (findings.length) {
    return {
      schema: "gpao_t.llm_ready_task_context_packet.v0_1",
      status: "blocked",
      createdAt: now,
      findings,
      authorityBoundary: buildAuthorityBoundary(),
      nextSafeAction: "Provide input.text before constructing the LLM-ready packet.",
    };
  }

  const turn = runRuntimeTurn({
    root,
    input: { ...(typeof input === "object" && input ? input : {}), text },
    priorFlow,
    persist: false,
    now,
  });
  const admittedMemory = turn.admissionPacket.admittedCells.map(formatAdmittedCell);
  const excludedMemory = turn.admissionPacket.rejectedCells.map(formatExcludedCell);
  const memorySearch = buildMemorySearchAttachment({ root, text });
  const admittedAnchors = admittedMemory.filter((cell) => cell.role === "anchor");
  const support = admittedMemory.filter((cell) => cell.role === "support");
  const blockedCandidates = [
    ...excludedMemory,
    ...turn.contextRuntime.mesh.retrievedCandidates
      .filter((candidate) => candidate.answerAnchorEligible === false)
      .map((candidate) => ({
        id: candidate.id,
        anchor: candidate.anchor,
        reason: candidate.downgradeReason || "candidate is supporting-only for this turn",
      })),
  ];
  const requiredResponseMode = normalizeResponseMode(responseMode);
  const authorityBoundary = buildAuthorityBoundary(turn);

  return {
    schema: "gpao_t.llm_ready_task_context_packet.v0_1",
    status: authorityBoundary.requiresApproval ? "ready_with_authority_boundary" : "ready",
    createdAt: now,
    rawUserUtterance: text,
    activeTarget: {
      id: turn.taskPacket.activeTargetId,
      requestType: turn.taskPacket.requestType,
      targetSource: turn.taskPacket.targetSource,
      stalePriorTarget: turn.taskPacket.stalePriorTarget,
      staleReason: turn.taskPacket.staleReason,
    },
    endpointCenter: {
      id: turn.taskPacket.activeTargetId,
      objective: turn.taskPacket.objective,
      responseMode: requiredResponseMode,
    },
    restoredIntent: {
      inputSignal: turn.inputSignal,
      activeReferent: turn.taskPacket.activeReferent,
      continuityHandoff: turn.taskPacket.continuityHandoff,
      userVisibleSummary: turn.userVisibleState.summary,
    },
    responseContract: {
      requiredMode: requiredResponseMode,
      forbiddenModes: [
        "answer_from_unadmitted_memory",
        "treat_candidate_as_durable_truth",
        "write_openclaw_memory",
        "promote_durable_memory",
        "external_send",
        "automatic_admission_without_replay",
      ],
    },
    admittedMemory,
    excludedMemory,
    memorySearch,
    admittedTCellAnchors: admittedAnchors,
    admittedSupport: support,
    blockedCandidates,
    authorityBoundary,
    traceRefs: [
      ...turn.taskPacket.trace,
      ...turn.admissionPacket.trace,
      "assemble_llm_ready_task_context_packet",
    ],
    replayExpectation: {
      required: true,
      expectedChecks: [
        "answer_keeps_active_target",
        "answer_uses_anchor_only_when_admitted",
        "answer_names_authority_boundary_when_action_is_blocked",
        "answer_does_not_promote_memory_without_apply_gate",
      ],
    },
    llmInputDiscipline: {
      finalAnswerGeneratedBy: "external_llm_or_host_model",
      gpaoTDoes: "restore_intent_admit_context_bound_authority_prepare_packet",
      gpaoTDoesNot: "replace_the_final_llm_generator",
    },
    sourceState: {
      meshStatus: turn.contextRuntime.mesh.status,
      retrievedCandidateCount: turn.contextRuntime.mesh.retrievedCandidates.length,
      memorySearchStatus: memorySearch.status,
      memorySearchResultCount: memorySearch.results?.length || 0,
      admittedCount: admittedMemory.length,
      excludedCount: excludedMemory.length,
    },
    nextSafeAction:
      "Use this packet as the answer-input contract; keep memory writes and automatic admission behind separate Apply Gate receipts.",
  };
}

function buildMemorySearchAttachment({ root, text }) {
  try {
    const stateDir = runtimePaths({ root }).runtimeRoot;
    const search = searchMemory({ stateDir, query: text, limit: 5 });
    return {
      schema: "gpao_t.llm_ready.memory_search_attachment.v0_1",
      status: "ready",
      rule: "Search results are source-linked context candidates; they are not durable truth and do not bypass T-cell admission.",
      engine: search.engine,
      index: search.index,
      results: search.results.map((result) => ({
        id: result.id,
        source: result.source,
        title: result.title,
        score: result.score,
        createdAt: result.createdAt,
        excerpt: result.excerpt,
        path: result.path,
        admissionRole: "search_support_candidate",
        answerAnchorEligible: false,
      })),
    };
  } catch (error) {
    return {
      schema: "gpao_t.llm_ready.memory_search_attachment.v0_1",
      status: "degraded",
      rule: "Memory search failed closed; current request remains primary and no missing result may become answer authority.",
      error: error.message,
      results: [],
    };
  }
}

export function buildLlmReadyPacketSurfaceState({
  root,
  input,
  priorFlow,
  responseMode,
  now = new Date().toISOString(),
} = {}) {
  const packet = buildLlmReadyTaskContextPacket({
    root,
    input,
    priorFlow,
    responseMode,
    now,
  });
  const anchor = packet.admittedTCellAnchors?.[0] || null;

  return {
    schema: "gpao_t.surface.llm_ready_packet_state.v0_1",
    status: packet.status,
    createdAt: packet.createdAt,
    labels: {
      activeTarget: packet.activeTarget?.id || "대기",
      endpoint: packet.endpointCenter?.objective || "입력 대기",
      anchor: anchor?.anchor || "없음",
      supportCount: String(packet.admittedSupport?.length || 0),
      memorySearch: packet.memorySearch?.status === "ready"
        ? `${packet.memorySearch.results?.length || 0}개`
        : "검색 제한",
      blocked: packet.authorityBoundary?.requiresApproval ? "승인 필요" : "로컬 가능",
      memoryWrite: "차단",
      automaticAdmission: "차단",
    },
    tones: {
      activeTarget: packet.activeTarget?.stalePriorTarget ? "review" : "ready",
      anchor: anchor ? "ready" : "waiting",
      memorySearch: packet.memorySearch?.status === "ready" ? "ready" : "review",
      blocked: packet.authorityBoundary?.requiresApproval ? "blocked" : "ready",
      memoryWrite: "blocked",
      automaticAdmission: "blocked",
    },
    packet,
    userLine:
      "답변 전에 현재 목표, admission된 맥락, 차단된 기억/권한을 하나의 LLM 입력 패킷으로 고정합니다.",
    uiContract: {
      targetSurface: "gpao_work_pane_inspector",
      sidecarSurface: false,
      liveMutation: false,
      controlLabels: ["현재 목표", "입력 패킷", "Anchor", "Support", "기억 검색", "차단 권한", "Replay 기대값"],
    },
    nextSafeAction: packet.nextSafeAction,
  };
}

export function verifyLlmReadyTaskContextPacket({ root } = {}) {
  const packet = buildLlmReadyTaskContextPacket({
    root,
    input: { text: "이어서 OpenClaw 흡수 방향을 기준으로 지파오티 작업 원칙을 확인해줘." },
    priorFlow: { flowKey: "gpao-t-memory-flow", activeTargetId: "openclaw-absorption" },
    now: "2026-07-11T05:00:00.000Z",
  });
  const surface = buildLlmReadyPacketSurfaceState({
    root,
    input: { text: "이어서 OpenClaw 흡수 방향을 기준으로 지파오티 작업 원칙을 확인해줘." },
    priorFlow: { flowKey: "gpao-t-memory-flow", activeTargetId: "openclaw-absorption" },
    now: "2026-07-11T05:01:00.000Z",
  });
  const findings = [];
  if (packet.schema !== "gpao_t.llm_ready_task_context_packet.v0_1") findings.push("invalid_packet_schema");
  if (!packet.rawUserUtterance) findings.push("raw_user_utterance_missing");
  if (!packet.activeTarget?.id) findings.push("active_target_missing");
  if (!packet.endpointCenter?.objective) findings.push("endpoint_center_missing");
  if (!Array.isArray(packet.admittedMemory)) findings.push("admitted_memory_not_array");
  if (!Array.isArray(packet.excludedMemory)) findings.push("excluded_memory_not_array");
  if (!packet.memorySearch || !Array.isArray(packet.memorySearch.results)) {
    findings.push("memory_search_attachment_missing");
  }
  if (!packet.responseContract?.forbiddenModes?.includes("answer_from_unadmitted_memory")) {
    findings.push("unadmitted_memory_not_forbidden");
  }
  if (packet.authorityBoundary?.compatibilityMemoryWrite !== "blocked") findings.push("openclaw_memory_write_open");
  if (packet.authorityBoundary?.durableMemoryPromotion !== "blocked") findings.push("durable_memory_promotion_open");
  if (packet.authorityBoundary?.automaticAdmission !== "blocked") findings.push("automatic_admission_open");
  if (surface.uiContract?.sidecarSurface !== false) findings.push("surface_became_sidecar");
  if (surface.uiContract?.liveMutation !== false) findings.push("surface_live_mutation_open");

  return {
    schema: "gpao_t.llm_ready_task_context_packet_verification.v0_1",
    status: findings.length ? "review" : "ready",
    findings,
    packet,
    surface,
    nextSafeAction: findings.length
      ? "Fix the LLM-ready packet before dashboard or chat-flow wiring."
      : "Expose this packet in the dashboard inspector before wiring it into live chat.send.",
  };
}

function formatAdmittedCell(cell) {
  return {
    id: cell.id,
    role: cell.role,
    anchor: cell.cell?.anchor || null,
    admissionScore: cell.admissionScore,
    reason: cell.reason,
    recoveryHint: cell.recoveryHint,
    sourceRefs: cell.cell?.source?.refs || [],
    lifecycle: cell.cell?.lifecycle || null,
    authority: {
      blockedUse: cell.cell?.authority?.blockedUse || [],
    },
  };
}

function formatExcludedCell(cell) {
  return {
    id: cell.id,
    role: cell.role,
    anchor: cell.cell?.anchor || null,
    admissionScore: cell.admissionScore,
    reason: cell.reason,
    recoveryHint: cell.recoveryHint,
  };
}

function buildAuthorityBoundary(turn) {
  return {
    requiresApproval: turn?.authorityDecision?.status === "needs_approval",
    requiredApprovals: turn?.authorityDecision?.requiredApprovals || [],
    blockedActions: turn?.authorityDecision?.blockedActions || [],
    mutationAllowedNow: false,
    compatibilityMemoryWrite: "blocked",
    durableMemoryPromotion: "blocked",
    sessionMetaWrite: "blocked",
    connectorWrite: "blocked",
    externalSend: "blocked",
    automaticAdmission: "blocked",
  };
}

function normalizeResponseMode(mode) {
  if (["answer", "plan", "code", "review", "explain"].includes(mode)) return mode;
  return "answer";
}
