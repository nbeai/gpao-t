import { buildApprovalAuditReplay, writeApprovalAuditLocalRecords } from "./approval-audit-records.js";
import { buildExecutionApprovalPreview } from "./execution-approval.js";
import { resolveContextMesh } from "./memory-wiki.js";
import { routeModel } from "./model-router.js";
import { buildSkillExecutionPlan, routeSkillPacks } from "./skill-ecosystem.js";
import { readRuntimeState } from "./storage.js";
import { runTurn } from "./turn-kernel.js";

const DEFAULT_LOCAL_WORK_REQUEST = "GPAO-T 첫 로컬 작업 루프를 검증하고 다음 안전 행동을 정리해줘.";

const LOOP_BLOCKED_ACTIONS = [
  "live model call",
  "tool/CLI/MCP execution",
  "connector activation",
  "credential access",
  "external send",
  "paid action",
  "destructive action",
  "install/update/rollback execution",
  "public release",
  "durable memory promotion",
  "self-growth live apply",
];

export function buildFirstLocalWorkLoop({
  root,
  request = DEFAULT_LOCAL_WORK_REQUEST,
  sourceSurface = "/work-surface",
  confirmationState = "confirmed_for_local_record_only",
  now = new Date().toISOString(),
  writeLocalRecords = true,
} = {}) {
  const packet = buildLocalSubmissionPacket({ request, sourceSurface, confirmationState, now });
  const validation = validateLocalSubmissionPacket({ packet });

  if (!validation.ok) {
    return {
      schema: "gpao_t.first_local_work_loop.v1",
      status: "blocked",
      generatedAt: now,
      packet,
      validation,
      boundaryState: buildBoundaryState({ localJsonlRecordWrite: false }),
      blockedActions: LOOP_BLOCKED_ACTIONS,
      userVisibleSummary: "입력 조건이 맞지 않아 로컬 작업 루프를 만들지 않았습니다.",
      nextSafeAction: "빈 입력, 너무 긴 입력, 위험 신호를 수정한 뒤 다시 로컬 preview를 만듭니다.",
    };
  }

  const runtimeState = readRuntimeState({ root });
  const turnPreview = runTurn({ root, input: { text: packet.userInput.text }, priorFlow: runtimeState.activeFlow });
  const contextMesh = resolveContextMesh({
    root,
    request: packet.userInput.text,
    inputSignal: turnPreview.inputSignal,
    priorFlow: runtimeState.activeFlow,
  });
  const skillRoute = routeSkillPacks({ request: packet.userInput.text });
  const skillExecutionPlan = buildSkillExecutionPlan({ skillRoute });
  const modelRoute = routeModel({
    inputSignal: turnPreview.inputSignal,
    authorityDecision: turnPreview.authorityDecision,
  });
  const executionPreview = buildExecutionApprovalPreview({
    request: packet.userInput.text,
    proposal: buildLocalPreviewProposal({ packet, turnPreview }),
  });
  const recordWrite = writeLocalRecords
    ? writeApprovalAuditLocalRecords({
        root,
        proposal: executionPreview.proposal,
        request: packet.userInput.text,
        confirmationState,
        now,
      })
    : null;
  const replay = recordWrite?.approvalRecord
    ? buildApprovalAuditReplay({ root, recordId: recordWrite.approvalRecord.id })
    : buildApprovalAuditReplay({ root });

  return {
    schema: "gpao_t.first_local_work_loop.v1",
    status: recordWrite?.status === "blocked" ? "blocked" : "ready",
    mode: "local_submission_to_preview_and_record",
    generatedAt: now,
    packet,
    validation,
    taskPacket: {
      id: turnPreview.taskPacket.id,
      activeTargetId: turnPreview.taskPacket.activeTargetId,
      objective: turnPreview.taskPacket.objective,
      inputSignal: turnPreview.inputSignal.kind,
      requestType: turnPreview.taskPacket.requestType,
      targetSource: turnPreview.taskPacket.targetSource,
      stalePriorTarget: turnPreview.taskPacket.stalePriorTarget,
      selectedModelAdapter: turnPreview.taskPacket.selectedModelAdapter,
      admittedToolAdapters: turnPreview.taskPacket.admittedToolAdapters,
      authorityStatus: turnPreview.authorityDecision.status,
    },
    contextMesh: {
      status: contextMesh.status,
      retrievedCandidates: contextMesh.retrievedCandidates.slice(0, 3).map((candidate) => ({
        id: candidate.id,
        anchor: candidate.anchor,
        score: candidate.meshScore,
        lifecycle: candidate.lifecycle,
        admissionRole: candidate.admissionRole,
        answerAnchorEligible: candidate.answerAnchorEligible,
        downgradeReason: candidate.downgradeReason || null,
      })),
      boundary: "Context Mesh는 근거 후보만 제공합니다. 기억 승격이나 실행 권한이 아닙니다.",
    },
    skillRoute: {
      status: skillRoute.status,
      selectedPacks: skillRoute.selectedPacks.slice(0, 3).map((pack) => ({
        id: pack.id,
        title: pack.title,
        routeRole: pack.routeRole,
        score: pack.score,
      })),
      executionMode: skillExecutionPlan.executionMode,
      authority: skillExecutionPlan.authorityContract,
    },
    modelRoute: {
      route: modelRoute.route,
      selectedAdapterId: modelRoute.adapterSelection?.selected?.id || null,
      liveModelCall: false,
      boundary: "모델 라우터는 후보만 고릅니다. provider 호출과 token spend는 열리지 않습니다.",
    },
    localDraftPreview: buildLocalDraftPreview({ packet, turnPreview, contextMesh, skillRoute }),
    approvalAudit: {
      proposal: executionPreview.proposal,
      authorityDisplay: executionPreview.authorityDisplay,
      recordWrite: recordWrite || {
        status: "not_written",
        reason: "writeLocalRecords_false",
      },
      replay,
      rollbackReference: recordWrite?.approvalRecord?.rollbackReference || executionPreview.proposal.rollbackReference,
      localOnly: true,
    },
    boundaryState: buildBoundaryState({ localJsonlRecordWrite: writeLocalRecords && recordWrite?.status === "written_local_only" }),
    blockedActions: LOOP_BLOCKED_ACTIONS,
    userVisibleSummary:
      "입력을 로컬 작업 패킷으로 만들고, 맥락/스킬/권한을 붙인 뒤 로컬 기록과 replay 기준까지 확인했습니다. 외부 실행은 아직 없습니다.",
    nextSafeAction: "Work Surface에서 로컬 작업 루프 preview가 의도와 맞는지 확인하고, 다음에는 승인된 범위 안에서만 실제 실행 축을 엽니다.",
  };
}

export function verifyFirstLocalWorkLoop({ loop = buildFirstLocalWorkLoop({ writeLocalRecords: false }) } = {}) {
  const findings = [];

  if (loop.schema !== "gpao_t.first_local_work_loop.v1") findings.push("invalid_loop_schema");
  if (!["ready", "blocked"].includes(loop.status)) findings.push("invalid_loop_status");
  if (!loop.packet?.id?.startsWith("work.local.")) findings.push("missing_local_packet_id");
  if (loop.packet?.sourceSurface !== "/work-surface") findings.push("invalid_source_surface");
  if (!loop.validation?.ok && loop.status !== "blocked") findings.push("invalid_validation_state");
  if (loop.status === "ready" && !loop.taskPacket?.objective) findings.push("missing_task_packet_objective");
  if (loop.status === "ready" && !loop.contextMesh?.boundary?.includes("권한이 아닙니다")) findings.push("context_mesh_boundary_missing");
  if (loop.status === "ready" && !loop.skillRoute?.executionMode) findings.push("missing_skill_route_execution_mode");
  if (loop.modelRoute?.liveModelCall !== false) findings.push("live_model_call_open");
  if (loop.boundaryState?.toolCliMcpExecution !== false) findings.push("tool_cli_mcp_execution_open");
  if (loop.boundaryState?.connectorActivation !== false) findings.push("connector_activation_open");
  if (loop.boundaryState?.externalSend !== false) findings.push("external_send_open");
  if (loop.boundaryState?.credentialAccess !== false) findings.push("credential_access_open");
  if (loop.boundaryState?.paidAction !== false) findings.push("paid_action_open");
  if (loop.boundaryState?.destructiveAction !== false) findings.push("destructive_action_open");
  if (loop.boundaryState?.durableMemoryPromotion !== false) findings.push("durable_memory_promotion_open");
  if (loop.boundaryState?.selfGrowthLiveApply !== false) findings.push("self_growth_live_apply_open");
  if (loop.status === "ready" && loop.localDraftPreview?.status !== "ready") findings.push("local_draft_preview_missing");
  if (loop.status === "ready" && !loop.approvalAudit?.proposal?.rollbackReference) findings.push("rollback_reference_missing");
  if (loop.status === "ready" && loop.approvalAudit?.localOnly !== true) findings.push("approval_audit_not_local_only");
  if (loop.status === "ready" && loop.approvalAudit?.recordWrite?.status !== "written_local_only") {
    findings.push("local_approval_audit_record_not_written");
  }
  if (!loop.blockedActions?.includes("external send")) findings.push("external_send_not_blocked");

  return {
    schema: "gpao_t.first_local_work_loop_verification.v1",
    ok: findings.length === 0,
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedBoundaries: LOOP_BLOCKED_ACTIONS,
    nextSafeAction: findings.length
      ? "Fix First Local Work Loop contract findings before visual QA."
      : loop.nextSafeAction,
  };
}

function buildLocalSubmissionPacket({ request, sourceSurface, confirmationState, now }) {
  const text = String(request || "").trim();
  const id = `work.local.${now.replaceAll(/[^0-9]/g, "").slice(0, 14)}.${hashText(text)}`;
  return {
    schema: "gpao_t.work_surface_local_submission_packet.v1",
    id,
    createdAt: now,
    sourceSurface,
    language: "ko",
    userInput: {
      text,
      length: text.length,
    },
    confirmationState,
    preExecutionState: "preview_confirmed_local_only",
    requestedOutput: "local_draft_preview_with_context_skill_authority_and_record_link",
    authorityIntent: "local_record_and_replay_only",
  };
}

function validateLocalSubmissionPacket({ packet }) {
  const findings = [];
  if (packet.schema !== "gpao_t.work_surface_local_submission_packet.v1") findings.push("invalid_packet_schema");
  if (packet.sourceSurface !== "/work-surface") findings.push("source_surface_must_be_work_surface");
  if (!packet.userInput.text) findings.push("empty_input");
  if (packet.userInput.length > 4000) findings.push("input_too_long");
  if (packet.confirmationState !== "confirmed_for_local_record_only") findings.push("confirmation_state_must_be_local_only");
  if (/(send|post|deploy|delete|rm\s+-rf|결제|전송|배포|삭제|구매)/i.test(packet.userInput.text)) {
    findings.push("risk_signal_requires_review_before_live_action");
  }
  return {
    schema: "gpao_t.work_surface_local_submission_validation.v1",
    ok: findings.length === 0,
    status: findings.length ? "review_needed" : "ready",
    findings,
    userMessage: findings.length
      ? "입력에 확인이 필요한 신호가 있어 실제 실행 전 검토가 필요합니다."
      : "로컬 preview와 로컬 기록으로 처리할 수 있는 입력입니다.",
  };
}

function buildLocalPreviewProposal({ packet, turnPreview }) {
  return {
    id: `proposal.${packet.id}`,
    source: "work_surface_local_submission",
    toolKind: "local_record",
    actionType: "write",
    authorityLevel: "write",
    expectedEffect: "작업 이해, 맥락 후보, 스킬 경로, 권한 경계를 로컬 기록과 preview로 남깁니다.",
    risk: "외부 실행은 없지만 로컬 기록에 사용자의 작업 문장이 남습니다.",
    rollbackReference: `local_record_replay:${turnPreview.taskPacket.id}`,
  };
}

function buildLocalDraftPreview({ packet, turnPreview, contextMesh, skillRoute }) {
  const primaryContext = contextMesh.retrievedCandidates.find((candidate) => candidate.answerAnchorEligible)
    || contextMesh.retrievedCandidates.find((candidate) => candidate.admissionRole !== "stale_supporting");
  const primarySkill = skillRoute.selectedPacks[0];
  return {
    schema: "gpao_t.first_local_work_loop_draft_preview.v1",
    status: "ready",
    headline: "이렇게 처리될 예정입니다",
    understoodTask: turnPreview.taskPacket.objective,
    expectedOutput:
      "로컬 초안에는 이해한 작업, 쓸 맥락, 스킬 경로, 권한 경계, 기록/replay 기준이 함께 표시됩니다.",
    contextAnchor: primaryContext?.anchor || "강한 Context Mesh 후보 없음",
    skillRoute: primarySkill?.title || "핵심 사고 정리 경로",
    authorityBoundary: "모델 호출, 도구 실행, 커넥터, 외부 전송은 계속 잠겨 있습니다.",
    recordLink: packet.id,
    userReviewChoices: ["의도와 맞음", "수정 필요", "보류"],
  };
}

function buildBoundaryState({ localJsonlRecordWrite = false } = {}) {
  return {
    localJsonlRecordWrite,
    modelCall: false,
    toolCliMcpExecution: false,
    connectorActivation: false,
    credentialAccess: false,
    externalSend: false,
    paidAction: false,
    destructiveAction: false,
    installUpdateRollbackExecution: false,
    publicRelease: false,
    durableMemoryPromotion: false,
    selfGrowthLiveApply: false,
  };
}

function hashText(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").slice(0, 8);
}
