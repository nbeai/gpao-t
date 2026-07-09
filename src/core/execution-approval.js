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
      requiredAuditFields: [
        "proposal_id",
        "packet_id",
        "actor",
        "authority_level",
        "expected_effect",
        "risk",
        "approval_state",
        "replay_reference",
        "rollback_reference",
        "timestamp",
      ],
      auditWriteNow: false,
      storagePathNow: "not_created",
      eventTypeFuture: "execution.approval_packet.reviewed",
      replayReferenceRequired: true,
      rollbackReferenceRequired: true,
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
    nextSafeAction: "Control Center와 work-surface에서 proposal을 읽고, 승인 패킷 검증 규칙을 확인한다. 실제 실행과 기록 쓰기는 계속 열지 않는다.",
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
