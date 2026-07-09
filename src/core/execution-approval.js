import { buildConnectorToolGovernance } from "./connector-governance.js";

const AUTHORITY_DISPLAY = [
  {
    id: "read_only",
    icon: "eye",
    label: "읽기 전용",
    shortLabel: "읽기",
    description: "자료를 확인하지만 실행하거나 바꾸지 않습니다.",
    tone: "ready",
    colorRole: "status.ready",
  },
  {
    id: "dry_run",
    icon: "scan",
    label: "미리보기만",
    shortLabel: "미리보기",
    description: "실제 적용 없이 계획과 예상 결과만 확인합니다.",
    tone: "review",
    colorRole: "status.review",
  },
  {
    id: "write",
    icon: "edit-3",
    label: "저장 전 확인",
    shortLabel: "저장 확인",
    description: "파일이나 연결된 공간을 바꾸기 전에 별도 확인이 필요합니다.",
    tone: "approval_required",
    colorRole: "status.approval_required",
  },
  {
    id: "external_send",
    icon: "send",
    label: "외부 전송 전 확인",
    shortLabel: "전송 확인",
    description: "메시지, 댓글, 게시처럼 밖으로 나가는 행동은 멈춰서 확인합니다.",
    tone: "approval_required",
    colorRole: "status.approval_required",
  },
  {
    id: "destructive",
    icon: "octagon-alert",
    label: "되돌리기 어려움",
    shortLabel: "고위험",
    description: "삭제, 덮어쓰기, 복구가 어려운 변경은 스냅샷과 되돌리기 경로가 필요합니다.",
    tone: "blocked",
    colorRole: "status.blocked",
  },
  {
    id: "paid_action",
    icon: "circle-dollar-sign",
    label: "비용 발생 가능",
    shortLabel: "비용 확인",
    description: "비용이 생길 수 있는 행동은 한도와 결제 주체를 먼저 확인합니다.",
    tone: "approval_required",
    colorRole: "status.approval_required",
  },
];

const DEFAULT_PROPOSAL = {
  id: "proposal.local_draft_preview",
  source: "model_skill_user_request_preview",
  toolKind: "cli",
  actionType: "dry_run",
  authorityLevel: "dry_run",
  expectedEffect: "작업 계획과 예상 결과를 로컬 preview로 보여줍니다.",
  risk: "실제 실행은 없지만 사용자가 실행될 내용을 오해할 수 있습니다.",
  rollbackReference: "실제 변경이 없으므로 롤백 대신 preview 폐기만 필요합니다.",
};

const REQUIRED_APPROVAL_PACKET_FIELDS = [
  "packet_id",
  "proposal_id",
  "source",
  "tool_kind",
  "action_type",
  "authority_level",
  "expected_effect",
  "risk",
  "rollback_reference",
  "user_confirmation_state",
  "scope",
  "created_at",
  "expires_at",
  "audit_reference",
  "replay_reference",
];

const VALIDATION_RULES = [
  {
    id: "required_fields_present",
    label: "필수 항목 확인",
    rule: "required_fields_present",
    userMessage: "무엇을 실행하려는지 설명하는 필수 항목이 모두 있어야 합니다.",
  },
  {
    id: "authority_level_allowed",
    label: "권한 단계 확인",
    rule: "authority_level_in_known_set",
    userMessage: "권한 단계는 읽기 전용, 미리보기만, 저장 전 확인, 외부 전송 전 확인, 되돌리기 어려움, 비용 발생 가능 중 하나여야 합니다.",
  },
  {
    id: "risk_visible",
    label: "위험 표시",
    rule: "risk_must_be_user_visible",
    userMessage: "위험은 숨기지 않고 짧고 자연스러운 문장으로 보여줘야 합니다.",
  },
  {
    id: "rollback_reference_required",
    label: "되돌리기 기준",
    rule: "rollback_or_compensation_required_for_mutating_external_destructive_paid_tiers",
    userMessage: "저장, 전송, 삭제, 비용 행동은 되돌리기 또는 보상 기준이 필요합니다.",
  },
  {
    id: "confirmation_before_invocation",
    label: "실행 전 확인",
    rule: "user_confirmation_required_before_invocation",
    userMessage: "사용자가 확인하기 전에는 실행으로 넘어가지 않습니다.",
  },
  {
    id: "audit_write_design_only",
    label: "감사 기록은 설계만",
    rule: "audit_write_must_remain_false_in_this_slice",
    userMessage: "이번 단계에서는 감사 기록을 쓰지 않고, 어떤 기록이 필요할지만 보여줍니다.",
  },
];

const AUDIT_TARGET_FIELD_ORDER = [
  "proposal_id",
  "source",
  "requested_action",
  "authority_level",
  "expected_effect",
  "risk",
  "rollback_reference",
  "user_confirmation_state",
];

const APPROVAL_RECORD_FIELD_ORDER = [
  "record_id",
  "packet_id",
  "proposal_id",
  "authority_level",
  "confirmation_state",
  "scope",
  "expires_at",
  "audit_reference",
  "replay_reference",
  "rollback_reference",
];

const APPROVAL_RECORD_FLOW_STAGES = [
  {
    id: "preview",
    step: 1,
    label: "미리보기",
    status: "visible",
    userMeaning: "무엇을 하려는지 먼저 봅니다.",
  },
  {
    id: "confirmation",
    step: 2,
    label: "확인",
    status: "not_confirmed",
    userMeaning: "의도와 맞는지 사용자가 확인합니다.",
  },
  {
    id: "approval_packet",
    step: 3,
    label: "승인 패킷",
    status: "검토 필요",
    userMeaning: "저장 전에 필요한 항목이 모두 있는지 봅니다.",
  },
  {
    id: "record_preview",
    step: 4,
    label: "기록 미리보기",
    status: "저장 전 확인",
    userMeaning: "저장될 기록의 모양만 보여줍니다.",
  },
  {
    id: "write_gate",
    step: 5,
    label: "쓰기 잠금",
    status: "차단됨",
    userMeaning: "이번 단계에서는 실제 저장하지 않습니다.",
  },
];

function buildAuditTarget({ proposal, authorityDisplay }) {
  return {
    proposal_id: proposal.id,
    source: proposal.source,
    requested_action: `${proposal.toolKind}.${proposal.actionType}`,
    authority_level: proposal.authorityLevel,
    authority_label: authorityDisplay.label,
    expected_effect: proposal.expectedEffect,
    risk: proposal.risk,
    rollback_reference: proposal.rollbackReference,
    user_confirmation_state: "not_confirmed",
  };
}

function buildPlannedAuditItems({ auditTarget }) {
  return [
    {
      id: "proposal_id",
      label: "제안 ID",
      value: auditTarget.proposal_id,
      userMeaning: "어떤 실행 제안에서 나온 기록인지 구분합니다.",
      required: true,
    },
    {
      id: "source",
      label: "출처",
      value: auditTarget.source,
      userMeaning: "모델, 스킬, 사용자 요청 중 어디에서 제안이 시작됐는지 남깁니다.",
      required: true,
    },
    {
      id: "requested_action",
      label: "요청 행동",
      value: auditTarget.requested_action,
      userMeaning: "실제로 하려던 행동 종류를 짧게 남깁니다.",
      required: true,
    },
    {
      id: "authority_level",
      label: "권한 단계",
      value: `${auditTarget.authority_label} · ${auditTarget.authority_level}`,
      userMeaning: "읽기, 미리보기, 저장, 전송, 고위험, 비용 중 어떤 경계인지 남깁니다.",
      required: true,
    },
    {
      id: "expected_effect",
      label: "예상 효과",
      value: auditTarget.expected_effect,
      userMeaning: "사용자가 무엇이 바뀌거나 확인될 예정인지 이해할 수 있게 합니다.",
      required: true,
    },
    {
      id: "risk",
      label: "위험",
      value: auditTarget.risk,
      userMeaning: "위험을 숨기지 않고 짧고 차분한 문장으로 남깁니다.",
      required: true,
    },
    {
      id: "rollback_reference",
      label: "되돌리기 기준",
      value: auditTarget.rollback_reference,
      userMeaning: "문제가 생겼을 때 무엇을 기준으로 멈추거나 되돌릴지 남깁니다.",
      required: true,
    },
    {
      id: "user_confirmation_state",
      label: "사용자 확인",
      value: auditTarget.user_confirmation_state,
      userMeaning: "사용자가 아직 확인하지 않았는지, 수정/보류인지 구분합니다.",
      required: true,
    },
  ];
}

function buildApprovalRecordPreview({ preview, auditProof }) {
  return {
    record_id: "approval_record.preview_only",
    packet_id: preview.approvalPacket.packetId,
    proposal_id: preview.proposal.id,
    authority_level: `${preview.authorityDisplay.label} · ${preview.proposal.authorityLevel}`,
    confirmation_state: preview.proposal.confirmationState,
    scope: "local_preview_only",
    expires_at: "preview_only_not_scheduled",
    audit_reference: auditProof.futureEvent.writePath,
    replay_reference: "replay.reference.required_before_write",
    rollback_reference: preview.proposal.rollbackReference,
  };
}

function buildApprovalRecordPreviewItems({ approvalRecordPreview }) {
  return [
    {
      id: "record_id",
      label: "기록 ID",
      value: approvalRecordPreview.record_id,
      userMeaning: "어떤 승인 기록인지 구분합니다.",
    },
    {
      id: "packet_id",
      label: "승인 패킷",
      value: approvalRecordPreview.packet_id,
      userMeaning: "어떤 승인 패킷에서 나온 기록인지 연결합니다.",
    },
    {
      id: "proposal_id",
      label: "실행 제안",
      value: approvalRecordPreview.proposal_id,
      userMeaning: "무엇을 실행하려던 제안인지 연결합니다.",
    },
    {
      id: "authority_level",
      label: "권한 단계",
      value: approvalRecordPreview.authority_level,
      userMeaning: "저장 전 확인인지, 전송 전 확인인지 같은 경계를 남깁니다.",
    },
    {
      id: "confirmation_state",
      label: "확인 상태",
      value: approvalRecordPreview.confirmation_state,
      userMeaning: "아직 확인 전인지, 수정/보류인지 보여줍니다.",
    },
    {
      id: "scope",
      label: "범위",
      value: approvalRecordPreview.scope,
      userMeaning: "이 기록이 어디까지 허용되는지 좁게 남깁니다.",
    },
    {
      id: "expires_at",
      label: "만료",
      value: approvalRecordPreview.expires_at,
      userMeaning: "오래된 승인이 재사용되지 않도록 기준을 둡니다.",
    },
    {
      id: "audit_reference",
      label: "감사 기준",
      value: approvalRecordPreview.audit_reference,
      userMeaning: "나중에 감사 기록과 연결될 위치입니다. 지금은 쓰지 않습니다.",
    },
    {
      id: "replay_reference",
      label: "리플레이 기준",
      value: approvalRecordPreview.replay_reference,
      userMeaning: "나중에 같은 판단을 재검토할 기준입니다.",
    },
    {
      id: "rollback_reference",
      label: "되돌리기 기준",
      value: approvalRecordPreview.rollback_reference,
      userMeaning: "문제가 생겼을 때 멈추거나 되돌릴 기준입니다.",
    },
  ];
}

export function buildAuditWriteDesignProof({
  proposal = DEFAULT_PROPOSAL,
  request = "GPAO-T 실행 후보의 감사 기록 대상을 확인한다.",
} = {}) {
  const preview = buildExecutionApprovalPreview({ proposal, request });
  const auditTarget = buildAuditTarget({
    proposal: preview.proposal,
    authorityDisplay: preview.authorityDisplay,
  });
  const plannedAuditItems = buildPlannedAuditItems({ auditTarget });

  return {
    schema: "gpao_t.audit_write_design_proof.v0_1",
    status: "review",
    mode: "design_proof_only_no_write",
    language: "ko",
    title: "기록 예정 항목",
    userMessage: "실행 제안이 생겼을 때 무엇을 감사 기록 대상으로 남길지 먼저 확인합니다. 아직 기록은 쓰지 않습니다.",
    auditTarget,
    plannedAuditItems,
    requiredFields: AUDIT_TARGET_FIELD_ORDER,
    futureEvent: {
      eventType: "execution.proposal.audit_previewed",
      writePath: ".gpao-t/events/audit.jsonl",
      writePathStatus: "reference_only_not_written",
      appendOnlyRequired: true,
      timestampRequired: true,
      replayReferenceRequired: true,
      rollbackReferenceRequired: true,
    },
    displayContract: {
      controlCenter: {
        panelId: "execution-approval",
        sectionLabel: "기록 예정 항목",
        visibleItemCount: plannedAuditItems.length,
      },
      workSurface: {
        sectionId: "execution-audit-preview",
        sectionLabel: "기록될 예정인 항목",
        visibleItemCount: plannedAuditItems.length,
      },
      koreanUx: {
        tone: "차분하게, 숨기지 않고, 겁주지 않기",
        shortStatus: "기록 설계만 · 실제 기록 없음",
        mobileReadability: "긴 한글 문장은 카드 안에서 줄바꿈되고, 상태 라벨은 짧게 유지한다.",
      },
    },
    validation: {
      schema: "gpao_t.audit_write_design_validation.v0_1",
      status: "ready",
      rules: [
        {
          id: "all_required_audit_targets_visible",
          label: "기록 대상 확인",
          userMessage: "제안 ID, 출처, 요청 행동, 권한 단계, 예상 효과, 위험, 되돌리기 기준, 사용자 확인 상태가 보여야 합니다.",
        },
        {
          id: "no_audit_write_now",
          label: "실제 기록 없음",
          userMessage: "이번 단계에서는 audit 파일에 아무것도 쓰지 않습니다.",
        },
        {
          id: "no_approval_record_write_now",
          label: "승인 기록 없음",
          userMessage: "승인 기록 저장은 다음 별도 gate 전까지 열지 않습니다.",
        },
        {
          id: "no_invocation_from_audit_design",
          label: "실행 연결 없음",
          userMessage: "기록 설계가 도구 실행이나 dry-run 호출로 이어지지 않습니다.",
        },
      ],
    },
    blockedActions: [
      "actual_tool_execution",
      "cli_command_execution",
      "mcp_invocation",
      "connector_activation",
      "external_network_or_send",
      "credential_read_or_write",
      "paid_action",
      "destructive_action",
      "approval_record_write",
      "audit_write",
      "dry_run_invocation",
      "durable_memory_promotion",
    ],
    safetyInvariants: {
      writesAudit: false,
      writesApprovalRecord: false,
      invokesDryRun: false,
      executesTool: false,
      runsCli: false,
      invokesMcp: false,
      activatesConnector: false,
      sendsExternalNetworkRequest: false,
      readsOrWritesCredentials: false,
      spendsMoney: false,
      performsDestructiveAction: false,
      promotesDurableMemory: false,
    },
    nextSafeAction: "Control Center와 work-surface에서 기록 예정 항목을 확인한다. 로컬 승인/감사 기록은 JSONL로 남길 수 있고, 실제 실행은 열지 않는다.",
  };
}

export function buildApprovalRecordWriteUxDesign({
  proposal = DEFAULT_PROPOSAL,
  request = "GPAO-T 승인 기록 저장 전 화면 흐름을 확인한다.",
} = {}) {
  const preview = buildExecutionApprovalPreview({ proposal, request });
  const auditProof = buildAuditWriteDesignProof({ proposal, request });
  const approvalRecordPreview = buildApprovalRecordPreview({ preview, auditProof });
  const recordItems = buildApprovalRecordPreviewItems({ approvalRecordPreview });

  return {
    schema: "gpao_t.approval_record_write_ux_design.v0_1",
    status: "review",
    mode: "ux_design_only_no_write",
    language: "ko",
    title: "승인 기록 저장 전 확인",
    userMessage: "승인 기록이 무엇이고 무엇이 저장될 예정인지 먼저 보여줍니다. 아직 저장하지 않습니다.",
    designReference: {
      sourceDocuments: [
        "docs/LOCAL-CONTROL-CENTER-DESIGN-RECIPE.md",
        "docs/02-design/CODEX-LEVEL-DESIGN-REFERENCE.md",
        "docs/02-design/CLAUDE-CODE-LEVEL-OPERATING-UX-REFERENCE.md",
      ],
      codexLevel: {
        applied: true,
        principles: [
          "work surface first",
          "small visible state",
          "inline preview before deep inspection",
          "reviewable result",
          "safe next action",
        ],
      },
      claudeCodeLevel: {
        applied: true,
        principles: [
          "permission and execution governance",
          "preview -> confirmation -> approval -> audit -> replay -> rollback",
          "model/tool/CLI/MCP/connector cannot look active before authority gates",
          "hooks/skills/MCP/automation must appear as reviewable proposals first",
        ],
      },
      koreanQualityGate: {
        applied: true,
        checks: [
          "짧은 한국어 상태 라벨",
          "긴 문장 카드 줄바꿈",
          "저장 전 확인과 아직 실행 없음 구분",
          "경고는 보이되 과장하지 않기",
        ],
      },
    },
    flow: {
      schema: "gpao_t.approval_record_write_flow.v0_1",
      status: "visible_prewrite_only",
      stages: APPROVAL_RECORD_FLOW_STAGES,
      currentStage: "record_preview",
      stopLine: "write_gate",
      userCanUnderstand: [
        "승인 기록이 무엇인지",
        "무엇이 저장될 예정인지",
        "아직 무엇이 실행되지 않았는지",
        "어떤 권한 단계인지",
        "다음에 무엇을 확인해야 하는지",
      ],
    },
    approvalRecordPreview,
    recordItems,
    requiredRecordFields: APPROVAL_RECORD_FIELD_ORDER,
    writeGate: {
      schema: "gpao_t.approval_record_write_gate.preview.v0_1",
      status: "blocked_until_future_explicit_gate",
      label: "저장 전 확인",
      shortStatus: "저장 설계만 · 실제 저장 없음",
      writesApprovalRecordNow: false,
      createsApprovalDirectoryNow: false,
      readsApprovalStoreNow: false,
      duplicateCheck: "future_required_before_write",
      expiryCheck: "future_required_before_write",
      scopeCheck: "future_required_before_write",
      recoveryStateOnFailure: "승인 기록을 저장하지 않고, 수정 필요 상태로 남깁니다.",
    },
    displayContract: {
      controlCenter: {
        panelId: "execution-approval",
        sectionLabel: "승인 기록 저장 전 확인",
        visibleItemCount: recordItems.length,
      },
      workSurface: {
        sectionId: "approval-record-preview",
        sectionLabel: "저장 전 확인",
        visibleItemCount: recordItems.length,
      },
      stateLanguage: [
        "미리보기",
        "확인",
        "승인 패킷",
        "기록 미리보기",
        "쓰기 잠금",
        "저장 전 확인",
        "아직 실행 없음",
      ],
    },
    blockedActions: [
      "approval_record_write",
      "approval_directory_create",
      "approval_store_read",
      "audit_write",
      "dry_run_invocation",
      "actual_tool_execution",
      "cli_command_execution",
      "mcp_invocation",
      "connector_activation",
      "external_network_or_send",
      "credential_read_or_write",
      "paid_action",
      "destructive_action",
      "durable_memory_promotion",
    ],
    safetyInvariants: {
      writesApprovalRecord: false,
      createsApprovalDirectory: false,
      readsApprovalStore: false,
      writesAudit: false,
      invokesDryRun: false,
      executesTool: false,
      runsCli: false,
      invokesMcp: false,
      activatesConnector: false,
      sendsExternalNetworkRequest: false,
      readsOrWritesCredentials: false,
      spendsMoney: false,
      performsDestructiveAction: false,
      promotesDurableMemory: false,
    },
    nextSafeAction: "승인 기록 저장 전 화면을 검토한다. 로컬 JSONL 기록은 가능하지만 실행, 외부 전송, 비용/파괴 행동은 열지 않는다.",
  };
}

export function buildExecutionApprovalPreview({
  proposal = DEFAULT_PROPOSAL,
  request = "GPAO-T 실행 후보를 승인 전 preview로 확인한다.",
} = {}) {
  const governance = buildConnectorToolGovernance({
    modelOutput: request,
    requestedSurface: proposal.toolKind,
    requestedTier: proposal.authorityLevel,
  });
  const authorityDisplay = AUTHORITY_DISPLAY.find((item) => item.id === proposal.authorityLevel)
    || AUTHORITY_DISPLAY[1];
  const auditTarget = buildAuditTarget({ proposal, authorityDisplay });
  const plannedAuditItems = buildPlannedAuditItems({ auditTarget });
  const approvalRecordPreview = buildApprovalRecordPreview({
    preview: {
      proposal: {
        ...proposal,
        confirmationState: "not_confirmed",
      },
      approvalPacket: { packetId: "preview_packet_not_written" },
      authorityDisplay,
    },
    auditProof: {
      futureEvent: { writePath: ".gpao-t/events/audit.jsonl" },
    },
  });
  const approvalRecordItems = buildApprovalRecordPreviewItems({ approvalRecordPreview });

  return {
    schema: "gpao_t.execution_approval_preview.v0_1",
    status: "review",
    surface: "execution_proposal_confirmation_before_invocation",
    language: "ko",
    designBasis: {
      source: "beai-harness-for-codex/design.md",
      principles: [
        "현재 무엇을 하려는지 먼저 보여준다.",
        "검증됨, 검토 필요, 차단됨, 승인 필요를 섞지 않는다.",
        "위험은 숨기지 않되 과장하지 않는다.",
        "한국어 상태 문구는 짧고 모바일에서 줄바꿈 가능해야 한다.",
      ],
    },
    proposal: {
      ...proposal,
      title: "실행 전 확인할 제안",
      userSummary: `${authorityDisplay.label}: ${proposal.expectedEffect}`,
      confirmationState: "not_confirmed",
      executionState: "not_invoked",
    },
    authorityDisplay,
    authorityLegend: AUTHORITY_DISPLAY,
    approvalPacket: {
      schema: "gpao_t.approval_packet.preview.v0_1",
      mode: "validation_design_only",
      packetId: "preview_packet_not_written",
      requiredFields: REQUIRED_APPROVAL_PACKET_FIELDS,
      allowedAuthorityLevels: AUTHORITY_DISPLAY.map((item) => item.id),
      userConfirmationStates: ["not_confirmed", "confirmed_preview_only", "needs_changes", "held"],
      rejectedWhen: [
        "missing_required_field",
        "unknown_authority_level",
        "scope_exceeds_visible_proposal",
        "risk_or_expected_effect_missing",
        "rollback_reference_missing_for_non_readonly_tier",
        "packet_expired",
        "user_confirmation_missing",
      ],
      writesPacketNow: false,
      opensInvocationNow: false,
    },
    validation: {
      schema: "gpao_t.approval_packet_validation_design.v0_1",
      status: "ready",
      rules: VALIDATION_RULES,
      resultForDefaultProposal: "preview_valid_but_not_approved",
      blocksInvocation: true,
    },
    auditWriteDesign: {
      schema: "gpao_t.audit_write_design.v0_1",
      status: "design_only",
      auditTarget,
      plannedAuditItems,
      requiredAuditFields: AUDIT_TARGET_FIELD_ORDER,
      auditWriteNow: false,
      storagePathNow: "not_created",
      eventTypeFuture: "execution.approval_packet.reviewed",
      replayReferenceRequired: true,
      rollbackReferenceRequired: true,
      userVisibleSummary: "기록 설계만 · 실제 기록 없음",
    },
    approvalRecordWriteUx: {
      schema: "gpao_t.approval_record_write_ux_design.inline.v0_1",
      status: "design_only",
      flowStages: APPROVAL_RECORD_FLOW_STAGES,
      approvalRecordPreview,
      recordItems: approvalRecordItems,
      requiredRecordFields: APPROVAL_RECORD_FIELD_ORDER,
      writesApprovalRecordNow: false,
      userVisibleSummary: "저장 설계만 · 실제 저장 없음",
    },
    uxContract: {
      schema: "gpao_t.execution_approval_ux_contract.v0_1",
      status: "ready",
      defaultLocale: "ko-KR",
      title: "실행 전 확인",
      noExecutionNotice: "아직 실행된 것은 없습니다.",
      primaryQuestion: "무엇이 실행될 예정인지 확인하세요.",
      tone: "calm_clear_not_scary",
      density: "compact_operating_desk",
      mobileRules: [
        "권한 라벨은 2줄 안에서 자연스럽게 줄바꿈된다.",
        "긴 한글 설명은 overflow 없이 카드 안에서 줄바꿈된다.",
        "상태 라벨은 색상만으로 구분하지 않고 아이콘, 라벨, 설명을 함께 둔다.",
        "모바일 fixed topbar action line과 authority anchor spacing을 깨지 않는다.",
      ],
      visualQa: {
        desktop: "desktop_nonblank_no_overflow_authority_visible_next_action_visible",
        mobile: "mobile_nonblank_no_overflow_sticky_action_line_authority_visible",
        screenshotsRequiredBeforeLiveInvocation: true,
      },
    },
    controlCenterView: {
      panelId: "execution-approval",
      headline: "실행 후보를 승인 패킷으로 보기 전에 확인한다. 아직 실행되거나 기록되지 않는다.",
      visibleFields: [
        "proposal",
        "authorityDisplay",
        "approvalPacket.requiredFields",
        "validation.rules",
        "auditWriteDesign",
        "approvalRecordWriteUx",
        "blockedActions",
      ],
    },
    workSurfaceView: {
      sectionId: "execution-proposal-confirmation",
      headline: "이 작업이 실제로 무엇을 하려는지 먼저 확인합니다.",
      confirmationChoices: [
        { id: "matches_intent", label: "의도와 맞음", result: "preview_only_next_gate" },
        { id: "needs_changes", label: "수정 필요", result: "revise_proposal_before_packet" },
        { id: "hold", label: "보류", result: "stop_without_invocation" },
      ],
    },
    governanceReference: {
      schema: governance.schema,
      selectedCandidateClass: governance.selectedCandidateClass,
      selectedAuthorityTier: governance.selectedAuthorityTier,
    },
    blockedActions: [
      "actual_tool_execution",
      "cli_command_execution",
      "mcp_invocation",
      "connector_activation",
      "external_network_or_send",
      "credential_read_or_write",
      "paid_action",
      "destructive_action",
      "approval_record_write",
      "audit_write",
      "durable_memory_promotion",
    ],
    safetyInvariants: {
      executesTool: false,
      runsCli: false,
      invokesMcp: false,
      activatesConnector: false,
      sendsExternalNetworkRequest: false,
      readsOrWritesCredentials: false,
      spendsMoney: false,
      performsDestructiveAction: false,
      writesApprovalRecord: false,
      writesAudit: false,
      promotesDurableMemory: false,
    },
    nextSafeAction: "Control Center와 work-surface에서 제안과 승인 패킷을 읽고, 승인/감사 기록은 로컬 JSONL로 남긴다. 실제 실행은 계속 열지 않는다.",
  };
}

export function verifyExecutionApprovalPreview({
  preview = buildExecutionApprovalPreview(),
} = {}) {
  const findings = [];

  if (preview.schema !== "gpao_t.execution_approval_preview.v0_1") findings.push("schema_mismatch");
  if (preview.language !== "ko") findings.push("korean_default_missing");
  if (!preview.proposal?.toolKind) findings.push("proposal_missing_tool_kind");
  if (!preview.proposal?.actionType) findings.push("proposal_missing_action_type");
  if (!preview.proposal?.authorityLevel) findings.push("proposal_missing_authority_level");
  if (!preview.proposal?.expectedEffect) findings.push("proposal_missing_expected_effect");
  if (!preview.proposal?.risk) findings.push("proposal_missing_risk");
  if (!preview.proposal?.rollbackReference) findings.push("proposal_missing_rollback_reference");
  if (preview.proposal?.executionState !== "not_invoked") findings.push("proposal_invoked");
  if ((preview.authorityLegend || []).length !== 6) findings.push("authority_legend_incomplete");
  if (!preview.authorityLegend?.every((item) => item.icon && item.label && item.description && item.colorRole)) {
    findings.push("authority_display_missing_icon_label_description_or_color");
  }
  if (!preview.authorityLegend?.some((item) => item.label === "읽기 전용")) findings.push("missing_korean_readonly_label");
  if (!preview.authorityLegend?.some((item) => item.label === "미리보기만")) findings.push("missing_korean_dryrun_label");
  if (!preview.authorityLegend?.some((item) => item.label === "저장 전 확인")) findings.push("missing_korean_write_label");
  if (!preview.authorityLegend?.some((item) => item.label === "외부 전송 전 확인")) findings.push("missing_korean_send_label");
  if (!preview.authorityLegend?.some((item) => item.label === "되돌리기 어려움")) findings.push("missing_korean_destructive_label");
  if (!preview.authorityLegend?.some((item) => item.label === "비용 발생 가능")) findings.push("missing_korean_paid_label");
  if ((preview.approvalPacket?.requiredFields || []).length < 12) findings.push("approval_packet_fields_incomplete");
  if (preview.approvalPacket?.writesPacketNow !== false) findings.push("approval_packet_write_opened");
  if (preview.approvalPacket?.opensInvocationNow !== false) findings.push("approval_packet_invocation_opened");
  if ((preview.validation?.rules || []).length < 6) findings.push("validation_rules_incomplete");
  if (preview.validation?.blocksInvocation !== true) findings.push("validation_does_not_block_invocation");
  if (preview.auditWriteDesign?.auditWriteNow !== false) findings.push("audit_write_opened");
  if (preview.auditWriteDesign?.storagePathNow !== "not_created") findings.push("audit_storage_created");
  if ((preview.auditWriteDesign?.requiredAuditFields || []).length !== AUDIT_TARGET_FIELD_ORDER.length) {
    findings.push("audit_required_fields_incomplete");
  }
  if (!preview.auditWriteDesign?.requiredAuditFields?.includes("requested_action")) findings.push("audit_requested_action_missing");
  if (!preview.auditWriteDesign?.requiredAuditFields?.includes("user_confirmation_state")) {
    findings.push("audit_user_confirmation_state_missing");
  }
  if ((preview.auditWriteDesign?.plannedAuditItems || []).length !== AUDIT_TARGET_FIELD_ORDER.length) {
    findings.push("planned_audit_items_incomplete");
  }
  if (preview.approvalRecordWriteUx?.writesApprovalRecordNow !== false) findings.push("approval_record_write_opened");
  if ((preview.approvalRecordWriteUx?.flowStages || []).length !== APPROVAL_RECORD_FLOW_STAGES.length) {
    findings.push("approval_record_flow_incomplete");
  }
  if ((preview.approvalRecordWriteUx?.recordItems || []).length !== APPROVAL_RECORD_FIELD_ORDER.length) {
    findings.push("approval_record_items_incomplete");
  }
  if (preview.uxContract?.defaultLocale !== "ko-KR") findings.push("ux_default_locale_not_ko_kr");
  if (!preview.uxContract?.mobileRules?.some((rule) => rule.includes("overflow"))) findings.push("mobile_overflow_rule_missing");
  if (preview.uxContract?.visualQa?.screenshotsRequiredBeforeLiveInvocation !== true) findings.push("visual_qa_before_live_missing");
  if (!preview.controlCenterView?.visibleFields?.includes("auditWriteDesign")) findings.push("control_center_audit_design_not_visible");
  if (!preview.workSurfaceView?.confirmationChoices?.some((choice) => choice.id === "hold")) findings.push("work_surface_hold_choice_missing");
  if (Object.values(preview.safetyInvariants || {}).some(Boolean)) findings.push("safety_invariant_opened_action");

  return {
    schema: "gpao_t.execution_approval_preview_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checked: [
      "proposal_required_fields",
      "approval_packet_validation_rules",
      "audit_write_design_only",
      "approval_record_write_ux_design_only",
      "korean_status_language",
      "authority_icon_label_description_color",
      "control_center_visibility",
      "work_surface_visibility",
      "desktop_mobile_visual_qa_contract",
      "no_live_execution_or_persistence",
    ],
    nextSafeAction: findings.length
      ? "Fix execution approval preview findings before UI integration."
      : preview.nextSafeAction,
  };
}

export function verifyApprovalRecordWriteUxDesign({
  design = buildApprovalRecordWriteUxDesign(),
} = {}) {
  const findings = [];

  if (design.schema !== "gpao_t.approval_record_write_ux_design.v0_1") findings.push("schema_mismatch");
  if (design.mode !== "ux_design_only_no_write") findings.push("mode_not_ux_design_only");
  if (design.language !== "ko") findings.push("korean_default_missing");
  if (design.designReference?.codexLevel?.applied !== true) findings.push("codex_design_reference_missing");
  if (design.designReference?.claudeCodeLevel?.applied !== true) findings.push("claude_operating_reference_missing");
  if (design.designReference?.koreanQualityGate?.applied !== true) findings.push("korean_quality_gate_missing");
  if ((design.flow?.stages || []).length !== APPROVAL_RECORD_FLOW_STAGES.length) findings.push("flow_stages_incomplete");
  if (design.flow?.stopLine !== "write_gate") findings.push("write_gate_stop_line_missing");
  for (const field of APPROVAL_RECORD_FIELD_ORDER) {
    if (!design.requiredRecordFields?.includes(field)) findings.push(`missing_required_record_field:${field}`);
    if (!Object.hasOwn(design.approvalRecordPreview || {}, field)) findings.push(`missing_record_preview_field:${field}`);
  }
  if ((design.recordItems || []).length !== APPROVAL_RECORD_FIELD_ORDER.length) findings.push("record_items_incomplete");
  if (!design.recordItems?.every((item) => item.label && item.value && item.userMeaning)) {
    findings.push("record_item_missing_korean_display");
  }
  if (design.writeGate?.writesApprovalRecordNow !== false) findings.push("approval_record_write_opened");
  if (design.writeGate?.createsApprovalDirectoryNow !== false) findings.push("approval_directory_create_opened");
  if (design.writeGate?.readsApprovalStoreNow !== false) findings.push("approval_store_read_opened");
  if (!design.displayContract?.stateLanguage?.includes("저장 전 확인")) findings.push("korean_write_before_approval_missing");
  if (!design.displayContract?.stateLanguage?.includes("아직 실행 없음")) findings.push("korean_no_execution_missing");
  if (!design.blockedActions?.includes("approval_record_write")) findings.push("approval_record_write_not_blocked");
  if (!design.blockedActions?.includes("dry_run_invocation")) findings.push("dry_run_invocation_not_blocked");
  if (!design.blockedActions?.includes("credential_read_or_write")) findings.push("credential_boundary_not_blocked");
  if (Object.values(design.safetyInvariants || {}).some(Boolean)) findings.push("safety_invariant_opened_action");

  return {
    schema: "gpao_t.approval_record_write_ux_design_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checked: [
      "codex_level_design_reference",
      "claude_code_level_operating_ux_reference",
      "korean_quality_gate",
      "approval_record_prewrite_flow",
      "required_record_fields",
      "control_center_and_work_surface_contract",
      "no_actual_approval_record_write_or_invocation",
    ],
    nextSafeAction: findings.length
      ? "Fix approval record write UX/design findings before UI integration."
      : design.nextSafeAction,
  };
}

export function verifyAuditWriteDesignProof({
  proof = buildAuditWriteDesignProof(),
} = {}) {
  const findings = [];

  if (proof.schema !== "gpao_t.audit_write_design_proof.v0_1") findings.push("schema_mismatch");
  if (proof.mode !== "design_proof_only_no_write") findings.push("mode_not_design_only");
  for (const field of AUDIT_TARGET_FIELD_ORDER) {
    if (!proof.requiredFields?.includes(field)) findings.push(`missing_required_field:${field}`);
    if (!Object.hasOwn(proof.auditTarget || {}, field)) findings.push(`missing_audit_target:${field}`);
  }
  if ((proof.plannedAuditItems || []).length !== AUDIT_TARGET_FIELD_ORDER.length) findings.push("planned_audit_items_incomplete");
  if (!proof.plannedAuditItems?.every((item) => item.label && item.value && item.userMeaning)) {
    findings.push("planned_audit_item_missing_korean_display");
  }
  if (proof.futureEvent?.writePathStatus !== "reference_only_not_written") findings.push("future_write_path_opened");
  if (proof.displayContract?.koreanUx?.shortStatus !== "기록 설계만 · 실제 기록 없음") {
    findings.push("korean_short_status_missing");
  }
  if ((proof.validation?.rules || []).length < 4) findings.push("validation_rules_incomplete");
  if (Object.values(proof.safetyInvariants || {}).some(Boolean)) findings.push("safety_invariant_opened_action");
  if (!proof.blockedActions?.includes("audit_write")) findings.push("audit_write_not_blocked");
  if (!proof.blockedActions?.includes("approval_record_write")) findings.push("approval_record_write_not_blocked");
  if (!proof.blockedActions?.includes("dry_run_invocation")) findings.push("dry_run_invocation_not_blocked");

  return {
    schema: "gpao_t.audit_write_design_proof_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checked: [
      "audit_target_required_fields",
      "planned_audit_items_user_visible",
      "korean_status_language",
      "control_center_and_work_surface_contract",
      "no_actual_audit_write_or_invocation",
    ],
    nextSafeAction: findings.length
      ? "Fix audit write design proof findings before UI integration."
      : proof.nextSafeAction,
  };
}
