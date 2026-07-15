import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildExecutionApprovalPreview } from "./execution-approval.js";
import { buildFirstLocalWorkLoop } from "./first-local-work-loop.js";
import { runLiveTurnAbsorptionBridge } from "./live-turn-absorption-bridge.js";
import { buildMemoryReviewCandidate } from "./memory-candidate-review-queue.js";
import { searchMemory } from "./memory-search.js";
import { invokeModelLocally } from "./model-invocation.js";
import { inspectProviderAuthStores } from "./provider-auth-heart.js";
import { appendAuditEvent, readJsonlTail, runtimePaths } from "./storage.js";
import { buildToolAuthorityHeart } from "./tool-authority-heart.js";

const OS_TURN_FILE = "turns/os-turn-records.jsonl";

export function osTurnRecordsPath({ root } = {}) {
  return resolve(runtimePaths({ root }).runtimeRoot, OS_TURN_FILE);
}

export function runGpaoTOsTurn({
  root,
  request = "",
  sessionKey = "agent:main:main",
  sourceSurface = "/work-surface",
  source = "work_surface",
  sourceRef,
  providerMode = "local_fallback",
  now = new Date().toISOString(),
  writeLocalRecords = true,
} = {}) {
  const text = String(request || "").trim();
  const turnId = `os-turn.${Date.parse(now) || Date.now()}.${slug(sessionKey)}.${slug(text || "empty")}`;
  const stages = [];

  stages.push(stage("receive_input", text ? "ready" : "blocked", {
    userVisible: text ? "입력을 받았습니다." : "입력이 비어 있습니다.",
  }));

  if (!text) {
    return appendGpaoTOsTurnRecord({
      root,
      writeLocalRecords,
      record: {
        schema: "gpao_t.first_real_os_turn.v0_1",
        id: turnId,
        createdAt: now,
        status: "blocked",
        sessionKey,
        source: { kind: source, surface: sourceSurface, ref: sourceRef || null },
        request: text,
        stages,
        findings: ["request_missing"],
        userVisibleOsState: buildUserVisibleOsState({
          provider: { status: "not_started", visibleLabel: "대기" },
          tool: { status: "not_started", visibleLabel: "대기" },
          memory: { status: "not_started", visibleLabel: "대기" },
          growth: { status: "not_started", visibleLabel: "대기" },
        }),
        nextSafeAction: "메시지를 입력한 뒤 다시 실행합니다.",
      },
    });
  }

  const localLoop = buildFirstLocalWorkLoop({
    root,
    request: text,
    sourceSurface: normalizeLocalSubmissionSurface(sourceSurface),
    confirmationState: "confirmed_for_local_record_only",
    now,
    writeLocalRecords,
  });
  stages.push(stage("preflight_and_admission", localLoop.status, {
    packetId: localLoop.packet?.id || null,
    taskPacketId: localLoop.taskPacket?.id || null,
    authorityStatus: localLoop.taskPacket?.authorityStatus || null,
  }));

  const auth = inspectProviderAuthStores({ now });
  const provider = buildProviderDecision({ auth, providerMode });
  stages.push(stage("provider_auth", provider.status, {
    mode: provider.mode,
    visibleLabel: provider.visibleLabel,
  }));

  const memory = buildMemorySearchForTurn({ root, text });
  stages.push(stage("memory_search", memory.status, {
    resultCount: memory.resultCount,
    engine: memory.engine,
  }));

  const model = invokeModelLocally({ request: text, providerId: "local.deterministic", now });
  const answerText = String(model.output?.text || localLoop.localDraftPreview?.text || "").trim();
  stages.push(stage("model_response", "completed_local_fallback", {
    providerMode,
    boundary: model.output?.modelOutputBoundary || "draft_only_not_action_authority",
  }));

  const toolSupervision = buildSupervisedToolState({
    root,
    text,
    localLoop,
    sessionKey,
    turnId,
  });
  stages.push(stage("supervised_tool_loop", toolSupervision.status, {
    executionState: toolSupervision.executionState,
    authorityTier: toolSupervision.authorityTier,
  }));

  const liveTurn = runLiveTurnAbsorptionBridge({
    root,
    message: text,
    answerText,
    sessionKey,
    runId: turnId,
    agentId: "gpao-t",
    source: source === "telegram" ? "telegram_direct" : "controlled_smoke",
    sourceRef,
    priorFlow: localLoop.taskPacket,
    ackStatus: "os_turn_answer_recorded",
    userExpectation: "GPAO-T should answer through one auditable OS turn.",
    now,
  });
  stages.push(stage("post_answer_replay", liveTurn.answerReplayEvaluation?.status || "recorded", {
    preflightId: liveTurn.preflightRecord?.id || null,
    postAnswerId: liveTurn.postAnswerRecord?.id || null,
    evaluationId: liveTurn.answerReplayEvaluation?.id || null,
  }));

  const memoryCandidate = buildMemoryReviewCandidate({
    request: text,
    now,
    source: {
      refs: [
        turnId,
        liveTurn.id,
        liveTurn.preflightRecord?.id,
        liveTurn.postAnswerRecord?.id,
        liveTurn.answerReplayEvaluation?.id,
      ].filter(Boolean),
      label: "GPAO-T first real OS turn",
      rawExcerpt: `${text}\n\n${answerText}`.slice(0, 1400),
    },
    candidate: {
      title: `OS turn learning: ${text.slice(0, 48)}`,
      operatingPrinciple:
        "A GPAO-T answer should keep input, context, provider state, tool authority, replay, and growth candidates in one auditable turn record.",
      reason:
        "The user needs GPAO-T to behave like an operating system, not like separated chat, memory, and tool fragments.",
      expectedBenefit:
        "Future turns can reuse the same trace to explain which context was used, what was blocked, and what needs review.",
      anchor: localLoop.taskPacket?.activeTargetId || "first-real-os-turn",
      invalidConditions: [
        "provider response is not distinguishable from local fallback",
        "tool execution happens without approval",
        "memory candidate is promoted without replay and explicit approval",
      ],
    },
  });
  stages.push(stage("memory_candidate", memoryCandidate.status, {
    candidateId: memoryCandidate.id,
    applyState: memoryCandidate.authority?.applyState || null,
  }));

  const growth = buildGrowthCandidateState({ liveTurn, memoryCandidate });
  stages.push(stage("self_growth_candidate", growth.status, {
    candidateId: growth.id,
    authority: growth.authority,
  }));

  const auditEvent = appendAuditEvent({
    type: "os_turn.recorded",
    summary: "GPAO-T first real OS turn pipeline recorded one auditable local turn.",
    authority: "local_only",
    payload: {
      turnId,
      sessionKey,
      providerStatus: provider.status,
      modelStatus: model.status,
      liveTurnId: liveTurn.id,
      memoryCandidateId: memoryCandidate.id,
      growthCandidateId: growth.id,
    },
  }, { root, now });

  return appendGpaoTOsTurnRecord({
    root,
    writeLocalRecords,
    record: {
      schema: "gpao_t.first_real_os_turn.v0_1",
      id: turnId,
      createdAt: now,
      status: localLoop.status === "blocked" ? "blocked" : "completed_with_local_fallback",
      sessionKey,
      source: { kind: source, surface: sourceSurface, ref: sourceRef || null },
      request: text,
      stages,
      localLoop,
      provider,
      memory,
      model: {
        schema: model.schema,
        status: model.status,
        providerLane: model.packet?.provider?.lane || null,
        invokedExternally: false,
        output: model.output,
      },
      toolSupervision,
      replay: {
        liveTurnId: liveTurn.id,
        preflightId: liveTurn.preflightRecord?.id || null,
        postAnswerId: liveTurn.postAnswerRecord?.id || null,
        evaluationId: liveTurn.answerReplayEvaluation?.id || null,
        status: liveTurn.status,
      },
      memoryCandidate,
      selfGrowthCandidate: growth,
      auditEvent,
      userVisibleOsState: buildUserVisibleOsState({
        provider,
        tool: toolSupervision,
        memory,
        growth,
      }),
      nextTurnEffect: {
        status: "review_ready",
        uses: [
          "same turn id links future replay",
          "memory candidate can be reviewed before promotion",
          "tool proposal remains separated from model text",
        ],
        blockedUntilApproval: [
          "durable memory promotion",
          "provider network call",
          "tool/CLI/MCP execution",
          "self-growth live apply",
        ],
      },
      findings: collectFindings({ localLoop, provider, memory, toolSupervision, memoryCandidate }),
      nextSafeAction:
        "Expose this OS turn state on the user surface, then use fresh chat QA to prove the dashboard path writes the same turn record.",
    },
  });
}

export function readGpaoTOsTurnRecords({ root, limit = 20 } = {}) {
  return readJsonlTail(osTurnRecordsPath({ root }), { limit, tolerateInvalid: true });
}

export function verifyGpaoTOsTurn({ record } = {}) {
  const findings = [];
  if (record?.schema !== "gpao_t.first_real_os_turn.v0_1") findings.push("invalid_schema");
  if (!record?.id?.startsWith("os-turn.")) findings.push("missing_os_turn_id");
  if (!record?.request) findings.push("missing_request");
  if (!record?.localLoop?.taskPacket?.activeTargetId) findings.push("missing_task_packet");
  if (!record?.provider?.mode) findings.push("missing_provider_mode");
  if (record?.model?.invokedExternally !== false) findings.push("unexpected_external_model_invocation");
  if (!["not_invoked", "completed_dry_run_invocation"].includes(record?.toolSupervision?.executionState)) {
    findings.push("tool_execution_open");
  }
  if (record?.toolSupervision?.executionState === "completed_dry_run_invocation") {
    if (record?.toolSupervision?.dryRunInvocation?.status !== "completed_dry_run_invocation") {
      findings.push("tool_dry_run_record_missing");
    }
    if (!record?.toolSupervision?.progressEvents?.some((event) => event.phase === "tool_running" || event.tool?.status === "running")) {
      findings.push("tool_progress_running_missing");
    }
    if (!record?.toolSupervision?.progressEvents?.some((event) => event.phase === "tool_complete" || event.tool?.status === "complete")) {
      findings.push("tool_progress_complete_missing");
    }
  }
  if (record?.memoryCandidate?.status !== "review_only") findings.push("memory_candidate_not_review_only");
  if (record?.memoryCandidate?.authority?.applyState !== "blocked_until_replay_and_explicit_approval") {
    findings.push("memory_apply_gate_not_blocked");
  }
  if (!record?.replay?.preflightId || !record?.replay?.postAnswerId || !record?.replay?.evaluationId) {
    findings.push("replay_trace_incomplete");
  }
  if (!record?.selfGrowthCandidate?.authority?.includes("review_only")) findings.push("growth_candidate_not_review_only");
  if (!record?.userVisibleOsState?.items?.length) findings.push("user_visible_state_missing");
  return {
    schema: "gpao_t.first_real_os_turn_verification.v0_1",
    ok: findings.length === 0,
    status: findings.length ? "blocked" : "ready",
    findings,
    nextSafeAction: findings.length
      ? "Repair the OS turn pipeline before claiming completion."
      : "Use the same route from Work Surface/dashboard submit and verify in the browser.",
  };
}

function appendGpaoTOsTurnRecord({ root, record, writeLocalRecords = true } = {}) {
  if (!writeLocalRecords) return record;
  const file = osTurnRecordsPath({ root });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(record)}\n`, { flag: "a" });
  return record;
}

function buildProviderDecision({ auth, providerMode }) {
  const wantsProvider = providerMode === "provider";
  const ready = auth.status === "ready";
  if (wantsProvider && ready) {
    return {
      schema: "gpao_t.os_turn_provider_state.v0_1",
      status: "provider_ready_but_not_invoked_in_local_pipeline",
      mode: "provider_available",
      visibleLabel: "실제 모델 연결 준비됨",
      authStatus: auth.status,
      invokedExternally: false,
      boundary: "This local OS turn does not perform network provider calls without an explicit transport and approval.",
    };
  }
  return {
    schema: "gpao_t.os_turn_provider_state.v0_1",
    status: wantsProvider ? "provider_not_ready_using_local_fallback" : "local_fallback_selected",
    mode: "local_fallback",
    visibleLabel: wantsProvider ? "연결 점검 필요 · 로컬 대체응답" : "로컬 대체응답",
    authStatus: auth.status,
    authFindings: auth.findings,
    invokedExternally: false,
    boundary: "Local fallback is a draft response, not proof of external provider invocation.",
  };
}

function buildMemorySearchForTurn({ root, text }) {
  try {
    const search = searchMemory({
      stateDir: runtimePaths({ root }).runtimeRoot,
      query: text,
      limit: 5,
      allowBuild: false,
    });
    return {
      schema: "gpao_t.os_turn_memory_state.v0_1",
      status: search.status === "ready" ? "ready" : "needs_index",
      visibleLabel: search.status === "ready"
        ? (search.results.length ? "관련 기억 확인" : "관련 기억 없음")
        : "기억 색인 준비 필요",
      engine: search.engine?.mode || "local_hybrid_memory_search",
      resultCount: search.results.length,
      results: search.results,
      findings: search.findings || [],
      nextSafeAction: search.nextSafeAction || null,
      boundary: "Search results are context evidence, not automatic durable memory promotion.",
    };
  } catch (error) {
    return {
      schema: "gpao_t.os_turn_memory_state.v0_1",
      status: "degraded",
      visibleLabel: "기억 검색 제한",
      engine: "local_hybrid_memory_search",
      resultCount: 0,
      results: [],
      error: error.message,
      boundary: "The turn continues, but memory search must be repaired before quality claims.",
    };
  }
}

function buildSupervisedToolState({ root, text, localLoop, sessionKey, turnId }) {
  const proposal = {
    id: `tool-proposal.${slug(text)}`,
    title: "승인 전 도구 후보",
    toolKind: "local_preview",
    authorityLevel: "dry_run",
    expectedEffect: "요청을 처리하기 전에 필요한 도구 실행 가능성을 미리 검토합니다.",
    risk: "실행 전 확인 단계이며 실제 CLI/MCP/커넥터는 호출하지 않습니다.",
    rollbackReference: "no_mutation_preview_only",
  };
  const approvalPreview = buildExecutionApprovalPreview({ request: text, proposal });
  const heart = buildToolAuthorityHeart({ root });
  const dryRunInvocation = localLoop?.executionDryRunInvocation?.status === "completed_dry_run_invocation"
    ? {
      ...localLoop.executionDryRunInvocation,
      approvalCheck: {
        ...localLoop.executionDryRunInvocation.approvalCheck,
        sessionKey,
        runId: turnId,
      },
    }
    : null;
  return {
    schema: "gpao_t.os_turn_tool_supervision.v0_1",
    status: dryRunInvocation ? "completed_dry_run" : "review_required",
    visibleLabel: dryRunInvocation ? "안전 dry-run 완료" : "도구 실행 전 검토",
    executionState: dryRunInvocation?.status || approvalPreview.proposal.executionState,
    authorityTier: approvalPreview.authorityDisplay?.id || "dry_run",
    proposal: approvalPreview.proposal,
    approval: {
      status: approvalPreview.status,
      writesPacketNow: approvalPreview.approvalPacket?.writesPacketNow,
      opensInvocationNow: approvalPreview.approvalPacket?.opensInvocationNow,
    },
    dryRunInvocation,
    progressEvents: dryRunInvocation?.progressEvents || [],
    heart,
    boundary: dryRunInvocation
      ? "Only the whitelisted dry-run lane ran inside this OS turn. Mutating tool execution still requires a separate approval packet."
      : "Model text never grants tool authority. Execution requires a separate approval packet.",
  };
}

function buildGrowthCandidateState({ liveTurn, memoryCandidate }) {
  const autoGrowth = liveTurn.autoMemoryGrowth;
  return {
    schema: "gpao_t.os_turn_self_growth_candidate.v0_1",
    id: autoGrowth?.id || `growth-review.${memoryCandidate.id}`,
    status: autoGrowth?.status || "review_only",
    visibleLabel: "자가성장 후보 생성",
    sourceRefs: [
      liveTurn.id,
      liveTurn.answerReplayEvaluation?.id,
      memoryCandidate.id,
      autoGrowth?.id,
    ].filter(Boolean),
    authority: "review_only_blocked_until_replay_and_explicit_approval",
    candidate: autoGrowth?.candidate || {
      title: "First real OS turn growth candidate",
      reason: "A complete turn trace is available for replay before future behavior changes.",
    },
  };
}

function buildUserVisibleOsState({ provider, tool, memory, growth }) {
  return {
    schema: "gpao_t.os_turn_user_visible_state.v0_1",
    status: "ready",
    title: "이번 요청의 GPAO-T 처리 흐름",
    items: [
      {
        id: "provider",
        label: "모델 연결",
        state: provider.visibleLabel || provider.status,
        technicalMeaning: "실제 provider 응답인지 로컬 대체응답인지 구분합니다.",
      },
      {
        id: "memory",
        label: "맥락/기억",
        state: memory.visibleLabel || memory.status,
        technicalMeaning: "답변에 참고할 수 있는 로컬 기억 후보입니다. 자동 저장은 아닙니다.",
      },
      {
        id: "tool",
        label: "도구",
        state: tool.visibleLabel || tool.status,
        technicalMeaning: "모델 답변과 도구 실행 권한을 분리합니다.",
      },
      {
        id: "growth",
        label: "자가성장",
        state: growth.visibleLabel || growth.status,
        technicalMeaning: "다음부터 더 잘하기 위한 후보입니다. 승인 전 적용되지 않습니다.",
      },
    ],
  };
}

function stage(name, status, details = {}) {
  return { name, status, details };
}

function normalizeLocalSubmissionSurface(sourceSurface) {
  const surface = String(sourceSurface || "");
  if (surface === "/work-surface" || surface.startsWith("/work-surface/")) return "/work-surface";
  if (surface === "/chat" || surface.startsWith("/chat") || surface.includes("chat")) return "/work-surface";
  return "/work-surface";
}

function collectFindings({ localLoop, provider, memory, toolSupervision, memoryCandidate }) {
  return [
    ...(localLoop.status === "blocked" ? ["local_loop_blocked"] : []),
    ...(provider.status.includes("not_ready") ? ["provider_not_ready_local_fallback_used"] : []),
    ...(memory.status !== "ready" ? ["memory_search_degraded"] : []),
    ...(!["not_invoked", "completed_dry_run_invocation"].includes(toolSupervision.executionState)
      ? ["tool_execution_state_unexpected"]
      : []),
    ...(memoryCandidate.status !== "review_only" ? ["memory_candidate_not_review_only"] : []),
  ];
}

function slug(value) {
  return String(value || "item")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "item";
}
