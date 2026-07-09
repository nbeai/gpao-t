import {
  buildApprovalAuditLocalRecordSubstrate,
  buildApprovalAuditReplay,
  writeApprovalAuditLocalRecords,
} from "./approval-audit-records.js";
import { buildExecutionApprovalPreview } from "./execution-approval.js";

const BLOCKED_LIVE_ACTIONS = [
  "live model call",
  "tool/CLI/MCP execution",
  "connector activation",
  "credential access",
  "external send",
  "paid action",
  "destructive action",
  "public release",
  "durable memory promotion",
];

export function buildWorkSurfaceExecutionFlow({
  root,
  request = "GPAO-T 실행 전 확인 흐름을 로컬 기록 기준으로 보여줘.",
  proposal,
  confirmationChoice,
  now = new Date().toISOString(),
} = {}) {
  const preview = buildExecutionApprovalPreview(proposal ? { proposal, request } : { request });
  const substrate = buildApprovalAuditLocalRecordSubstrate({ root });
  const replay = buildApprovalAuditReplay({ root });
  const confirmationControl = buildWorkSurfaceExecutionConfirmationControl({
    proposal: preview.proposal,
    confirmationChoice,
    now,
  });

  return {
    schema: "gpao_t.work_surface_execution_governance_flow.v1",
    status: "ready_for_local_record_review",
    mode: "proposal_to_local_record_to_replay_no_invocation",
    createdAt: now,
    headline: "실행 확인 흐름",
    userMessage:
      "실행 후보를 바로 실행하지 않고, 제안과 권한을 확인한 뒤 로컬 승인/감사 기록과 replay 기준으로만 이어갑니다.",
    proposal: preview.proposal,
    authority: {
      selected: preview.authorityDisplay,
      legend: preview.authorityLegend,
      productLabel: preview.authorityDisplay.label,
      liveInvocation: "blocked",
    },
    flowStages: buildExecutionFlowStages({ preview, substrate, replay }),
    confirmationControl,
    localRecord: {
      status: "available_after_confirmation",
      storage: substrate.storage,
      counts: substrate.counts,
      latestApprovalRecord: substrate.latest.approvalRecord,
      latestAuditRecord: substrate.latest.auditRecord,
      writesDuringRender: false,
      writeCommand: "gpao-t control work-surface-execution-record [text]",
    },
    replay: {
      status: replay.status,
      recordId: replay.recordId,
      rollbackReference: replay.rollbackReference,
      userMessage: replay.userMessage,
      executionState: replay.executionState,
    },
    confirmation: {
      state: confirmationControl.state,
      requiredBeforeLocalRecordWrite: true,
      userChoices: confirmationControl.choices,
      packet: confirmationControl.packet,
    },
    blockedLiveActions: BLOCKED_LIVE_ACTIONS,
    boundaries: {
      localJsonlRecordWrite: "allowed_after_explicit_confirmation",
      liveModelCall: "blocked",
      toolCliMcpExecution: "blocked",
      connectorActivation: "blocked",
      credentialAccess: "blocked",
      externalSend: "blocked",
      paidAction: "blocked",
      destructiveAction: "blocked",
      durableMemoryPromotion: "blocked",
    },
    nextSafeAction:
      "제안과 권한이 의도와 맞는지 확인한 뒤, 필요한 경우 로컬 승인/감사 기록만 남기고 replay와 rollback 기준을 읽습니다.",
  };
}

export function recordWorkSurfaceExecutionFlow({
  root,
  request = "GPAO-T 실행 확인 흐름 로컬 기록",
  proposal,
  confirmationChoice = "matches_intent",
  confirmationState = "confirmed_for_local_record_only",
  now = new Date().toISOString(),
} = {}) {
  const confirmationControl = buildWorkSurfaceExecutionConfirmationControl({
    proposal,
    confirmationChoice,
    now,
  });
  if (!confirmationControl.writeAllowed) {
    return {
      schema: "gpao_t.work_surface_execution_governance_record_result.v1",
      status: "blocked",
      reason: "explicit_confirmation_required",
      confirmationControl,
      blockedLiveActions: BLOCKED_LIVE_ACTIONS,
      nextSafeAction: confirmationControl.nextSafeAction,
    };
  }

  const writeResult = writeApprovalAuditLocalRecords({
    root,
    proposal,
    request,
    confirmationState,
    now,
  });
  const flow = buildWorkSurfaceExecutionFlow({ root, request, proposal, confirmationChoice, now });

  return {
    schema: "gpao_t.work_surface_execution_governance_record_result.v1",
    status: writeResult.status,
    flowStatus: flow.status,
    writeResult,
    flow,
    blockedLiveActions: BLOCKED_LIVE_ACTIONS,
    nextSafeAction:
      writeResult.status === "written_local_only"
        ? "저장된 로컬 기록을 replay로 읽고 rollback 기준을 확인합니다. 실제 실행은 여전히 열지 않습니다."
        : "로컬 기록 저장 조건을 먼저 고칩니다. 실제 실행은 열지 않습니다.",
  };
}

export function verifyWorkSurfaceExecutionFlow({ root, flow = buildWorkSurfaceExecutionFlow({ root }) } = {}) {
  const findings = [];
  if (flow.schema !== "gpao_t.work_surface_execution_governance_flow.v1") findings.push("invalid_schema");
  if (flow.mode !== "proposal_to_local_record_to_replay_no_invocation") findings.push("invalid_mode");
  if (!flow.proposal?.toolKind) findings.push("missing_proposal_tool_kind");
  if (!flow.proposal?.actionType) findings.push("missing_proposal_action_type");
  if (!flow.proposal?.authorityLevel) findings.push("missing_proposal_authority_level");
  if ((flow.flowStages || []).length !== 5) findings.push("flow_stage_count_mismatch");
  if (flow.confirmationControl?.schema !== "gpao_t.work_surface_execution_confirmation_control.v1") {
    findings.push("missing_confirmation_control");
  }
  if (flow.confirmationControl?.writeAllowed !== false) findings.push("render_confirmation_allows_write");
  if (flow.confirmationControl?.packet?.executionState !== "not_executed") {
    findings.push("confirmation_packet_execution_state_not_locked");
  }
  if (flow.localRecord?.writesDuringRender !== false) findings.push("render_writes_record");
  if (flow.boundaries?.localJsonlRecordWrite !== "allowed_after_explicit_confirmation") {
    findings.push("local_record_write_boundary_not_explicit");
  }
  for (const [key, value] of Object.entries(flow.boundaries || {})) {
    if (key !== "localJsonlRecordWrite" && value !== "blocked") findings.push(`${key}_open`);
  }
  for (const action of BLOCKED_LIVE_ACTIONS) {
    if (!flow.blockedLiveActions.includes(action)) findings.push(`missing_blocked_action:${action}`);
  }
  return {
    schema: "gpao_t.work_surface_execution_governance_flow_check.v1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedBoundaries: flow.boundaries,
    nextSafeAction: findings.length
      ? "Fix execution governance flow before user-facing integration."
      : flow.nextSafeAction,
  };
}

export function buildWorkSurfaceExecutionConfirmationControl({
  proposal,
  confirmationChoice = "not_selected",
  now = new Date().toISOString(),
} = {}) {
  const normalizedChoice = normalizeConfirmationChoice(confirmationChoice);
  const writeAllowed = normalizedChoice === "matches_intent";
  const state = writeAllowed ? "confirmed_for_local_record_only" : confirmationStateForChoice(normalizedChoice);
  const proposalId = proposal?.id || "proposal.local_draft_preview";
  return {
    schema: "gpao_t.work_surface_execution_confirmation_control.v1",
    status: writeAllowed ? "ready_to_write_local_record" : "waiting_for_user_confirmation",
    state,
    createdAt: now,
    headline: "승인 기록 남기기 전 확인",
    userMessage: "실행 승인이 아니라 로컬 기록을 남겨도 되는지 확인합니다.",
    selectedChoice: normalizedChoice,
    writeAllowed,
    choices: [
      {
        id: "matches_intent",
        label: "의도와 맞음",
        tone: "ready",
        result: "로컬 승인/감사 기록 저장 가능",
      },
      {
        id: "needs_changes",
        label: "수정 필요",
        tone: "review",
        result: "작업 입력으로 돌아감",
      },
      {
        id: "hold",
        label: "보류",
        tone: "locked",
        result: "미리보기만 유지",
      },
    ],
    packet: {
      schema: "gpao_t.work_surface_execution_confirmation_packet.v1",
      proposalId,
      selectedChoice: normalizedChoice,
      confirmationState: state,
      scope: "local_approval_audit_record_only",
      executionState: "not_executed",
      localRecordWrite: writeAllowed ? "allowed_after_explicit_confirmation" : "blocked_until_matches_intent",
      blockedActions: BLOCKED_LIVE_ACTIONS,
    },
    nextSafeAction: writeAllowed
      ? "로컬 승인/감사 기록만 남기고 replay와 rollback 기준을 읽습니다. 실제 실행은 열지 않습니다."
      : "의도와 맞으면 '의도와 맞음'으로 확인합니다. 수정이 필요하거나 애매하면 기록을 남기지 않습니다.",
  };
}

function buildExecutionFlowStages({ preview, substrate, replay }) {
  return [
    {
      id: "proposal",
      step: 1,
      label: "실행 후보",
      state: "보임",
      userMeaning: `${preview.proposal.toolKind} · ${preview.authorityDisplay.label}`,
    },
    {
      id: "confirmation",
      step: 2,
      label: "의도 확인",
      state: "사용자 확인 전",
      userMeaning: "의도와 맞음, 수정 필요, 보류 중 하나로 판단합니다.",
    },
    {
      id: "local_record",
      step: 3,
      label: "로컬 기록",
      state: "명시적 확인 후 가능",
      userMeaning: `승인 ${substrate.counts.approvalRecords} · 감사 ${substrate.counts.auditRecords}`,
    },
    {
      id: "replay",
      step: 4,
      label: "리플레이",
      state: replay.status === "ready" ? "읽기 가능" : "아직 없음",
      userMeaning: replay.userMessage,
    },
    {
      id: "rollback",
      step: 5,
      label: "되돌리기 기준",
      state: "실행 없음",
      userMeaning: replay.rollbackReference,
    },
  ];
}

function normalizeConfirmationChoice(choice) {
  if (choice === "confirmed_for_local_record_only") return "matches_intent";
  if (choice === "needs_changes" || choice === "hold" || choice === "matches_intent") return choice;
  return "not_selected";
}

function confirmationStateForChoice(choice) {
  if (choice === "needs_changes") return "needs_changes_before_local_record";
  if (choice === "hold") return "held_preview_only";
  return "not_confirmed_in_browser_surface";
}
