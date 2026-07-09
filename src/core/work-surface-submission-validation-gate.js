import { buildWorkSurfaceSubmissionDecisionGate } from "./work-surface-submission-gate.js";

const MAX_DRAFT_TEXT_LENGTH = 8000;
const MIN_DRAFT_TEXT_LENGTH = 1;

const BLOCKED_EXECUTION_ACTIONS = [
  "live submission",
  "live model call",
  "tool/CLI/MCP execution",
  "connector activation",
  "external network/send",
  "approval write",
  "install/update/rollback",
  "durable memory promotion",
];

const RISK_SIGNAL_RULES = [
  {
    id: "external_send_or_network",
    productLanguage: "외부로 보내거나 네트워크를 여는 요청은 아직 실행할 수 없습니다.",
    outcome: "blocked",
    matchedTerms: ["send", "email", "slack", "telegram", "http", "https", "deploy", "publish", "외부", "전송", "배포"],
  },
  {
    id: "tool_cli_mcp_execution",
    productLanguage: "도구, CLI, MCP 실행은 제출 전 확인 단계에서 멈춥니다.",
    outcome: "blocked",
    matchedTerms: ["run", "execute", "cli", "mcp", "terminal", "명령", "실행", "도구"],
  },
  {
    id: "connector_or_account_activation",
    productLanguage: "계정 연결이나 커넥터 활성화는 별도 승인 전에는 열리지 않습니다.",
    outcome: "blocked",
    matchedTerms: ["oauth", "token", "github", "gmail", "calendar", "notion", "계정", "커넥터", "연결"],
  },
  {
    id: "durable_memory_or_growth_apply",
    productLanguage: "지속 기억 승격이나 자가성장 적용은 replay, audit, rollback 경계가 필요합니다.",
    outcome: "blocked",
    matchedTerms: ["promote memory", "durable memory", "self-growth", "자가성장", "기억 저장", "기억 승격"],
  },
  {
    id: "authority_sensitive_operation",
    productLanguage: "권한이 민감한 요청은 실행 전 사용자가 의도와 경계를 다시 확인해야 합니다.",
    outcome: "review",
    matchedTerms: ["delete", "remove", "결제", "삭제", "승인", "권한", "법률", "금융", "의료"],
  },
];

function normalizeDraftText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function detectRiskSignals(text) {
  const lower = text.toLowerCase();
  return RISK_SIGNAL_RULES
    .filter((rule) => rule.matchedTerms.some((term) => lower.includes(term.toLowerCase())))
    .map((rule) => ({
      id: rule.id,
      outcome: rule.outcome,
      productLanguage: rule.productLanguage,
    }));
}

function buildValidationChecks({ candidate, decisionGate, riskSignals }) {
  const draftText = normalizeDraftText(candidate?.draftText);
  const requiredFields = decisionGate.inputPacketSchema.requiredFields;
  const missingRequiredFields = requiredFields.filter((field) => {
    if (field === "draftText") return draftText.length === 0;
    return candidate?.[field] === undefined || candidate?.[field] === null || candidate?.[field] === "";
  });
  const lengthStatus = draftText.length < MIN_DRAFT_TEXT_LENGTH
    ? "blocked_empty"
    : draftText.length > MAX_DRAFT_TEXT_LENGTH
      ? "review_too_long"
      : "valid";

  return {
    requiredFields: {
      status: missingRequiredFields.length ? "blocked" : "valid",
      required: requiredFields,
      missing: missingRequiredFields,
      productLanguage: missingRequiredFields.length
        ? "필수 입력 정보가 부족해서 아직 제출할 수 없습니다."
        : "필수 입력 정보가 모두 보입니다.",
    },
    emptyInput: {
      status: draftText.length ? "valid" : "blocked",
      productLanguage: draftText.length
        ? "입력 문장이 확인되었습니다."
        : "작업 내용을 먼저 입력해야 합니다.",
    },
    length: {
      status: lengthStatus,
      value: draftText.length,
      min: MIN_DRAFT_TEXT_LENGTH,
      max: MAX_DRAFT_TEXT_LENGTH,
      productLanguage: lengthStatus === "valid"
        ? "입력 길이가 preview 검증 범위 안에 있습니다."
        : lengthStatus === "blocked_empty"
          ? "빈 입력은 제출할 수 없습니다."
          : "입력이 길어 작업 의도와 첨부 구조를 다시 확인해야 합니다.",
    },
    riskSignals: {
      status: riskSignals.some((signal) => signal.outcome === "blocked")
        ? "blocked"
        : riskSignals.some((signal) => signal.outcome === "review")
          ? "review"
          : "clear",
      detected: riskSignals,
      productLanguage: riskSignals.length
        ? "실행 전에 확인해야 할 권한 신호가 있습니다."
        : "즉시 차단해야 할 위험 신호는 보이지 않습니다.",
    },
  };
}

function buildPreviewAttachmentChecks(decisionGate) {
  return {
    contextMeshPreview: {
      status: decisionGate.contextMeshAttachment?.mode === "preview_only" ? "attached" : "blocked",
      required: true,
      productLanguage: "Context Mesh / Memory Wiki 후보가 preview로 붙어 있어야 합니다.",
    },
    skillRoutePreview: {
      status: decisionGate.skillRouteAttachment?.mode === "preview_only"
        && decisionGate.skillRouteAttachment?.liveSkillExecution === false
        ? "attached"
        : "blocked",
      required: true,
      productLanguage: "Skill route는 실행이 아니라 preview로 붙어 있어야 합니다.",
    },
    authorityPreview: {
      status: decisionGate.authorityBoundary?.userCanSubmitLiveNow === false
        && decisionGate.authorityBoundary?.blockedActions?.length
        ? "attached"
        : "blocked",
      required: true,
      productLanguage: "권한 경계와 차단 행동이 사용자에게 보여야 합니다.",
    },
  };
}

function formatSkillRoutePreview(selectedPacks = []) {
  const labels = selectedPacks.map((pack) => {
    if (typeof pack === "string") return pack;
    return pack.id || pack.name || pack.category || "unknown-skill-pack";
  });
  return labels.length ? labels.join(", ") : "core preview route";
}

function deriveGateStatus({ validationChecks, previewAttachmentChecks }) {
  const validationValues = Object.values(validationChecks);
  const previewValues = Object.values(previewAttachmentChecks);
  if (
    validationValues.some((check) => check.status === "blocked")
    || previewValues.some((check) => check.status === "blocked")
  ) {
    return "blocked";
  }
  if (validationValues.some((check) => String(check.status).startsWith("review"))) {
    return "review";
  }
  return "confirmation_required";
}

export function buildWorkSurfaceSubmissionValidationGate({
  root,
  draftRequest,
  now = new Date().toISOString(),
  decisionGate,
} = {}) {
  const draftTextForValidation = draftRequest === undefined ? undefined : String(draftRequest);
  const safeDraftRequest = normalizeDraftText(draftTextForValidation).length
    ? draftTextForValidation
    : undefined;
  const baseDecisionGate = decisionGate || buildWorkSurfaceSubmissionDecisionGate({
    root,
    draftRequest: safeDraftRequest,
    now,
  });
  const candidate = {
    ...baseDecisionGate.exampleInputPacket,
    draftText: draftTextForValidation === undefined
      ? baseDecisionGate.exampleInputPacket.draftText
      : draftTextForValidation,
    createdAt: now,
  };
  const draftText = normalizeDraftText(candidate?.draftText);
  const riskSignals = detectRiskSignals(draftText);
  const validationChecks = buildValidationChecks({ candidate, decisionGate: baseDecisionGate, riskSignals });
  const previewAttachmentChecks = buildPreviewAttachmentChecks(baseDecisionGate);
  const status = deriveGateStatus({ validationChecks, previewAttachmentChecks });

  return {
    schema: "gpao_t.work_surface_submission_validation_confirmation_gate.v0_1",
    status,
    gateMode: "final_pre_submit_preview_only",
    generatedAt: now,
    sourceSurface: "/work-surface",
    previousGate: {
      name: "submission_decision_gate",
      schema: baseDecisionGate.schema,
      status: baseDecisionGate.status,
      stopLine: baseDecisionGate.stopLine?.name,
    },
    candidatePacket: {
      schema: candidate.schema,
      draftTextLength: draftText.length,
      sourceSurface: candidate.sourceSurface,
      locale: candidate.locale,
      submissionMode: candidate.submissionMode,
      hasActiveTarget: Boolean(candidate.activeTargetId),
      hasUserVisibleIntent: Boolean(candidate.userVisibleIntent),
      attachmentReferenceCount: candidate.attachmentReferences?.length || 0,
      requestedOutputShape: candidate.requestedOutputShape,
    },
    validationChecks,
    previewAttachmentChecks,
    confirmationCard: {
      schema: "gpao_t.work_surface_confirmation_card.v0_1",
      status: "visible_before_any_future_submission",
      title: "제출 전 확인",
      userMessage:
        "아직 실행된 것은 없습니다. GPAO-T가 이해한 작업, 사용할 맥락, 제안된 스킬 경로, 닫힌 권한을 확인하는 단계입니다.",
      sections: [
        {
          id: "understood_task",
          label: "이해한 작업",
          value: candidate.userVisibleIntent,
          requiredBeforeConfirm: true,
        },
        {
          id: "context_preview",
          label: "사용할 맥락",
          value: baseDecisionGate.contextMeshAttachment?.topCandidate?.title || "preview candidate unavailable",
          requiredBeforeConfirm: true,
        },
        {
          id: "skill_route_preview",
          label: "제안된 스킬 경로",
          value: formatSkillRoutePreview(baseDecisionGate.skillRouteAttachment?.selectedPacks),
          requiredBeforeConfirm: true,
        },
        {
          id: "authority_boundary",
          label: "닫힌 권한",
          value: baseDecisionGate.authorityBoundary.blockedActions.join(", "),
          requiredBeforeConfirm: true,
        },
      ],
      confirmAction: {
        label: "미리보기 확인",
        meaning: "사용자가 preview 내용을 읽었다는 확인만 의미합니다.",
        enabledNow: status === "confirmation_required" || status === "review",
        opensLiveSubmission: false,
        writesApprovalRecord: false,
      },
      blockedActionCopy: BLOCKED_EXECUTION_ACTIONS.map((action) => ({
        action,
        label: action,
        state: "잠김",
      })),
    },
    productLanguageState: {
      headline: status === "confirmation_required"
        ? "제출 전 확인이 필요합니다."
        : status === "review"
          ? "작업 의도나 권한을 한 번 더 확인해야 합니다."
          : "아직 제출할 수 없습니다.",
      userCanUnderstand: [
        "아직 실행된 것은 없음",
        "입력은 preview packet으로만 해석됨",
        "Context Mesh, Skill route, Authority preview가 붙었는지 확인됨",
        "사용자 확인 전 live submission 없음",
      ],
      blockedConditions: Object.values(validationChecks)
        .filter((check) => check.status === "blocked")
        .map((check) => check.productLanguage),
      reviewConditions: Object.values(validationChecks)
        .filter((check) => check.status === "review")
        .map((check) => check.productLanguage),
    },
    executionBoundary: {
      liveSubmission: "blocked",
      liveModelCall: "blocked",
      toolCliMcpExecution: "blocked",
      connectorActivation: "blocked",
      externalNetworkSend: "blocked",
      approvalWrite: "blocked",
      installUpdateRollback: "blocked",
      durableMemoryPromotion: "blocked",
      blockedActions: BLOCKED_EXECUTION_ACTIONS,
    },
    documentationAlignment: {
      readmeFreshnessWarning: "tracked_as_document_alignment_item",
      productMeaning:
        "README freshness warnings are treated as documentation alignment evidence, not permission to open execution.",
    },
    stopLine: {
      name: "pre_submit_confirmation_stop_before_live_submission",
      stopsBefore: BLOCKED_EXECUTION_ACTIONS,
      userConfirmationRequired: true,
      liveSubmissionImplemented: false,
    },
    stopRuleAfterThisGate: {
      rule: "do_not_split_submission_meta_gates_further",
      nextProductDirection: [
        "work_surface_confirmation_ux",
        "first_local_draft_preview",
      ],
    },
    nextSafeAction:
      "Move to work-surface confirmation UX or first local draft preview. Do not add more submission meta-gates before improving the user-facing flow.",
  };
}

export function verifyWorkSurfaceSubmissionValidationGate({
  gate = buildWorkSurfaceSubmissionValidationGate(),
} = {}) {
  const findings = [];

  if (gate.schema !== "gpao_t.work_surface_submission_validation_confirmation_gate.v0_1") findings.push("invalid_validation_gate_schema");
  if (gate.gateMode !== "final_pre_submit_preview_only") findings.push("validation_gate_not_final_preview_only");
  if (gate.previousGate?.schema !== "gpao_t.work_surface_submission_decision_gate.v0_1") findings.push("missing_previous_decision_gate");
  if (gate.candidatePacket?.submissionMode !== "preview_only_not_submitted") findings.push("candidate_packet_not_preview_only");
  if (!gate.validationChecks?.requiredFields) findings.push("missing_required_field_validation");
  if (!gate.validationChecks?.emptyInput) findings.push("missing_empty_input_validation");
  if (!gate.validationChecks?.length) findings.push("missing_length_validation");
  if (!gate.validationChecks?.riskSignals) findings.push("missing_risk_signal_validation");
  if (gate.previewAttachmentChecks?.contextMeshPreview?.status !== "attached") findings.push("context_mesh_preview_missing");
  if (gate.previewAttachmentChecks?.skillRoutePreview?.status !== "attached") findings.push("skill_route_preview_missing");
  if (gate.previewAttachmentChecks?.authorityPreview?.status !== "attached") findings.push("authority_preview_missing");
  if (gate.confirmationCard?.confirmAction?.opensLiveSubmission !== false) findings.push("confirmation_opens_live_submission");
  if (gate.confirmationCard?.confirmAction?.writesApprovalRecord !== false) findings.push("confirmation_writes_approval");
  if (gate.executionBoundary?.liveModelCall !== "blocked") findings.push("live_model_not_blocked");
  if (gate.executionBoundary?.toolCliMcpExecution !== "blocked") findings.push("tool_execution_not_blocked");
  if (gate.executionBoundary?.connectorActivation !== "blocked") findings.push("connector_activation_not_blocked");
  if (gate.executionBoundary?.externalNetworkSend !== "blocked") findings.push("external_send_not_blocked");
  if (gate.executionBoundary?.approvalWrite !== "blocked") findings.push("approval_write_not_blocked");
  if (gate.executionBoundary?.installUpdateRollback !== "blocked") findings.push("install_update_rollback_not_blocked");
  if (gate.executionBoundary?.durableMemoryPromotion !== "blocked") findings.push("durable_memory_not_blocked");
  if (gate.stopLine?.liveSubmissionImplemented !== false) findings.push("live_submission_implemented");
  if (gate.stopRuleAfterThisGate?.rule !== "do_not_split_submission_meta_gates_further") findings.push("missing_meta_gate_stop_rule");
  if (gate.documentationAlignment?.readmeFreshnessWarning !== "tracked_as_document_alignment_item") findings.push("readme_freshness_not_tracked");

  return {
    schema: "gpao_t.work_surface_submission_validation_confirmation_gate_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedBoundaries: gate.executionBoundary?.blockedActions || [],
    nextSafeAction: findings.length
      ? "Fix validation/confirmation gate findings before user-facing confirmation UX."
      : gate.nextSafeAction,
  };
}
