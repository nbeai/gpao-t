const DESIGN_RECIPE_PATH = "docs/GPAO-T-DASHBOARD-DESIGN-RECIPE.md";
const README_PATH = "docs/README.md";
const SOURCE_DOCTRINE_PATH = "/Users/jyp/Documents/Playground 2/beai-harness-for-codex/design.md";
const CODEX_REFERENCE_PATH = "docs/02-design/CODEX-LEVEL-DESIGN-REFERENCE.md";
const CLAUDE_CODE_REFERENCE_PATH = "docs/02-design/CLAUDE-CODE-LEVEL-OPERATING-UX-REFERENCE.md";

const OBJECT_TYPES = ["Work", "Context", "Evidence", "Growth", "Authority"];
const STATUS_LANGUAGE = ["ready", "review", "blocked", "approval_required", "not_applicable", "unknown"];
const REQUIRED_PANELS = [
  "Current Work",
  "Context Mesh",
  "Evidence / Replay",
  "Growth",
  "Authority",
  "Model / Tool Adapters",
  "Connectors",
  "Ops",
];

const DESIGN_REFERENCE_SURFACES = [
  "Work Surface",
  "Control Center",
  "Approval UX",
  "Model Router",
  "Connector Governance",
  "Audit / Replay",
  "Install / Update / Rollback",
];

const DESIGN_EVIDENCE_REQUIREMENTS = [
  {
    id: "desktop_screenshot",
    label: "desktop screenshot",
    required: true,
    userMeaning: "데스크톱에서 실제 제품 화면이 답답하거나 헐겁지 않은지 확인합니다.",
  },
  {
    id: "mobile_screenshot",
    label: "mobile screenshot",
    required: true,
    userMeaning: "모바일에서 긴 한글 문장과 카드 밀도가 깨지지 않는지 확인합니다.",
  },
  {
    id: "full_page_screenshot_when_needed",
    label: "full-page screenshot when needed",
    required: true,
    userMeaning: "첫 화면 아래에 핵심 상태가 있을 때 전체 흐름도 확인합니다.",
  },
  {
    id: "human_visual_polish_review",
    label: "visual polish review",
    required: true,
    userMeaning: "사람 눈으로 봤을 때 제품감, 위계, 리듬, 여백을 평가합니다.",
  },
  {
    id: "color_quality_review",
    label: "color quality review",
    required: true,
    userMeaning: "배경, 카드, 상태칩, 경고 톤이 한 제품처럼 보이는지 확인합니다.",
  },
  {
    id: "layout_rhythm_review",
    label: "layout rhythm review",
    required: true,
    userMeaning: "여백, 줄간격, 정보 밀도가 사용 흐름을 방해하지 않는지 봅니다.",
  },
  {
    id: "icon_alignment_review",
    label: "icon alignment review",
    required: true,
    userMeaning: "아이콘이 상태와 권한을 돕고, 장식처럼 따로 놀지 않는지 확인합니다.",
  },
  {
    id: "korean_typography_line_break_review",
    label: "Korean typography / line break review",
    required: true,
    userMeaning: "한국어 문장, 조사, 어미, 줄바꿈이 자연스러운지 확인합니다.",
  },
  {
    id: "tone_consistency_review",
    label: "tone-and-manner consistency review",
    required: true,
    userMeaning: "화면마다 같은 제품의 목소리로 읽히는지 확인합니다.",
  },
  {
    id: "user_perceived_quality_risk",
    label: "user-perceived product quality risk",
    required: true,
    userMeaning: "계속 쓰고 싶은 제품감에 아직 부족한 부분을 숨기지 않고 남깁니다.",
  },
];

const DESIGN_REFERENCE_CRITERIA = [
  {
    id: "codex_work_chat_rhythm",
    label: "Codex급 work/chat 리듬",
    fits: "work/chat 중심성, 작은 상태 표시, 인라인 진행/결과, inspectable detail, reviewable result, safe next action",
  },
  {
    id: "claude_code_permission_governance",
    label: "Claude Code급 운영/권한 UX",
    fits: "preview -> confirmation -> approval -> audit -> replay -> rollback, 실행 경계, 숨은 실행 방지",
  },
  {
    id: "visual_system_quality",
    label: "제품형 시각 시스템",
    fits: "컬러, 배경 톤, 카드 질감, 버튼, 상태칩, 배지, 아이콘, 타이포그래피, 여백, 정보 밀도",
  },
  {
    id: "korean_first_ui",
    label: "한국어 기본 UI",
    fits: "번역투와 enum 느낌을 피하고, 비개발자도 현재 상태와 다음 행동을 이해하게 하는 문장",
  },
  {
    id: "tone_unification",
    label: "톤앤매너 통일성",
    fits: "같은 상태에는 같은 표현, 같은 권한 단계에는 같은 라벨/색상/아이콘/설명 톤",
  },
];

export function buildLocalControlCenterDesignContract() {
  return {
    schema: "gpao_t.local_control_center_design_contract.v0_1",
    status: "ready_for_static_ui_reader",
    sourceDoctrine: SOURCE_DOCTRINE_PATH,
    recipePath: DESIGN_RECIPE_PATH,
    surface: {
      type: "web-ui",
      job: "Show GPAO-T operating state, evidence, growth, authority, and next safe action.",
      currentUserState: "The user wants a Codex-like local AI OS surface that is fast, calm, transparent, and safe.",
      primaryDecision: "What should GPAO-T do next, and what remains gated?",
      visualDensity: "compact",
      tone: "operational",
    },
    documentationContract: {
      userReadableOverview: README_PATH,
      implementationTruthSource: "src/core/design-contract.js",
      executableSurfaces: ["gpao-t control design", "GET /control-center/design"],
    },
    informationArchitecture: {
      objectTypes: OBJECT_TYPES,
      requiredPanels: REQUIRED_PANELS,
      firstViewport: [
        "GPAO-T current state",
        "current work decision",
        "active context/evidence",
        "authority boundaries",
        "next safe action",
      ],
    },
    statusLanguage: STATUS_LANGUAGE,
    authorityBoundary: {
      externalModelCall: "must_be_visible_before_action",
      externalToolAction: "must_be_visible_before_action",
      connectorActivation: "must_be_visible_before_action",
      durableMemoryPromotion: "must_be_visible_before_action",
      liveGrowthMutation: "must_be_visible_before_action",
      installUpdateRollbackExecution: "must_be_visible_before_action",
      deployment: "must_be_visible_before_action",
      secretStorage: "must_be_visible_before_action",
    },
    implementationBoundary: {
      readsControlSnapshot: true,
      firstUiRole: "static_visual_reader_for_existing_control_snapshot",
      startsDaemon: false,
      connectsAccounts: false,
      callsExternalModels: false,
      executesExternalTools: false,
      storesSecrets: false,
      appliesGrowthMutation: false,
      installsUpdatesRollsBackOrDeploys: false,
    },
    qualityGate: [
      "first_viewport_shows_actual_gpao_t_state",
      "current_target_and_next_safe_action_visible",
      "work_context_evidence_growth_authority_represented",
      "status_layers_are_distinct",
      "direct_evidence_outranks_generated_support",
      "authority_boundaries_visible_before_dangerous_actions",
      "text_fits_desktop_and_mobile",
      "no_cards_inside_cards",
      "no_marketing_hero",
      "no_hidden_external_action_or_live_mutation",
      "screenshot_or_render_evidence_required_for_visual_claims",
    ],
    nextSafeAction:
      "Build the official GPAO-T dashboard from buildControlCenterSnapshot() before adding interactivity, daemon behavior, or external activation.",
  };
}

export function buildGpaoTDesignReferenceGate({
  slice = "future-ui-ux-slice",
  surface = "GPAO-T UI/UX surface",
} = {}) {
  return {
    schema: "gpao_t.design_reference_gate.v0_1",
    status: "required_for_every_ui_ux_slice",
    mode: "evidence_contract_only_no_execution",
    language: "ko",
    slice,
    surface,
    sourceDocuments: [
      DESIGN_RECIPE_PATH,
      CODEX_REFERENCE_PATH,
      CLAUDE_CODE_REFERENCE_PATH,
    ],
    referenceAxes: [
      {
        id: "codex_level_visual_conversation_ux",
        label: "Codex급 시각/대화 UX",
        requiredSignals: [
          "work/chat 중심성",
          "자연스러운 작업 흐름",
          "작은 상태 표시",
          "인라인 진행/결과",
          "inspectable detail",
          "reviewable result",
          "safe next action",
          "사용자가 말하면 일이 진행된다고 느끼는 제품 리듬",
        ],
      },
      {
        id: "claude_code_level_operating_authority_ux",
        label: "Claude Code급 운영/권한 UX",
        requiredSignals: [
          "permission / execution governance",
          "preview -> confirmation -> approval -> audit -> replay -> rollback",
          "model/tool/CLI/MCP/connector 실행 경계",
          "memory/instruction discipline",
          "hooks/skills/MCP/automation 숨은 실행 방지",
          "권한과 실행 가능성의 명확한 시각화",
        ],
      },
      {
        id: "visual_design_system",
        label: "시각 디자인 전체",
        requiredSignals: [
          "컬러 팔레트",
          "배경 톤",
          "카드 질감",
          "버튼 형태",
          "상태칩 색상",
          "배지 스타일",
          "아이콘 스타일과 배치",
          "타이포그래피",
          "줄간격과 여백",
          "정보 밀도",
          "시각적 위계",
          "모바일/데스크톱 균형",
          "프리뷰/승인/차단/완료/실패/복구 상태 표현",
          "MVP 내부툴처럼 보이지 않는 제품감",
        ],
      },
      {
        id: "korean_ui_ux",
        label: "한국어 UI/UX",
        requiredSignals: [
          "한국어가 기본 UI 재료",
          "긴 한글 문장 desktop/mobile 줄바꿈",
          "자연스러운 문장 길이, 조사, 어미, 상태 라벨",
          "비개발자도 이해 가능한 현재 상태와 다음 행동",
          "번역투, 백엔드 enum 느낌, 과도하게 딱딱한 문구 회피",
        ],
      },
      {
        id: "tone_and_manner_unity",
        label: "톤앤매너 통일성",
        requiredSignals: [
          "모든 화면이 같은 제품의 목소리",
          "같은 상태에는 같은 표현",
          "같은 권한 단계에는 같은 라벨/색상/아이콘/설명 톤",
          "위험은 숨기지 않되 과장하지 않기",
          "차분하고 신뢰감 있지만 무겁지 않은 톤",
        ],
      },
    ],
    evidenceRequirements: DESIGN_EVIDENCE_REQUIREMENTS,
    visualAssessmentCriteria: DESIGN_REFERENCE_CRITERIA,
    requiredReportFields: [
      "appliedSurfaces",
      "visualAdjustments",
      "desktopMobileFindings",
      "codexLevelFit",
      "claudeCodeLevelFit",
      "remainingAestheticRisks",
      "userPerceivedQualityRisk",
    ],
    blockedActions: [
      "actual approval record write",
      "audit write",
      "dry-run invocation",
      "tool/CLI/MCP execution",
      "connector activation",
      "credential access",
      "external send",
      "paid/destructive action",
      "durable memory promotion",
    ],
    safetyInvariants: {
      writesApprovalRecord: false,
      writesAuditEvent: false,
      invokesDryRun: false,
      executesToolCliMcp: false,
      activatesConnector: false,
      readsOrWritesCredentials: false,
      sendsExternally: false,
      spendsMoney: false,
      performsDestructiveAction: false,
      promotesDurableMemory: false,
    },
    supportedSurfaces: DESIGN_REFERENCE_SURFACES,
    deferredProductPolishRisks: [
      {
        id: "control_center_density",
        status: "watch",
        productMeaning: "The Control Center is trustworthy and inspectable, but it still needs a later Design Readiness Pass to feel less dense for daily use.",
      },
      {
        id: "product_wide_icon_system",
        status: "watch",
        productMeaning: "Number markers and text chips are aligned, but a mature icon grammar should be introduced before final product polish.",
      },
      {
        id: "mixed_english_technical_labels",
        status: "watch",
        productMeaning: "Developer-facing route terms remain readable, but some labels should be softened or localized for ordinary Korean users.",
      },
    ],
    nextSafeAction:
      "다음 UI/UX slice는 이 gate의 화면 증거와 사람 눈 기준 평가를 남긴 뒤에만 닫는다. 실제 실행/쓰기/외부 연결은 별도 권한 gate 전까지 열지 않는다.",
  };
}

export function verifyGpaoTDesignReferenceGate({
  gate = buildGpaoTDesignReferenceGate(),
} = {}) {
  const findings = [];

  if (gate.schema !== "gpao_t.design_reference_gate.v0_1") findings.push("schema_mismatch");
  if (gate.mode !== "evidence_contract_only_no_execution") findings.push("mode_not_evidence_only");
  if (gate.language !== "ko") findings.push("korean_language_missing");
  if ((gate.sourceDocuments || []).length < 3) findings.push("source_documents_incomplete");
  if ((gate.referenceAxes || []).length !== 5) findings.push("reference_axes_incomplete");
  for (const requirement of DESIGN_EVIDENCE_REQUIREMENTS) {
    if (!(gate.evidenceRequirements || []).some((item) => item.id === requirement.id && item.required === true)) {
      findings.push(`missing_evidence_requirement:${requirement.id}`);
    }
  }
  for (const field of [
    "appliedSurfaces",
    "visualAdjustments",
    "desktopMobileFindings",
    "codexLevelFit",
    "claudeCodeLevelFit",
    "remainingAestheticRisks",
    "userPerceivedQualityRisk",
  ]) {
    if (!(gate.requiredReportFields || []).includes(field)) findings.push(`missing_report_field:${field}`);
  }
  for (const blocked of [
    "actual approval record write",
    "audit write",
    "dry-run invocation",
    "tool/CLI/MCP execution",
    "connector activation",
    "credential access",
    "external send",
    "paid/destructive action",
    "durable memory promotion",
  ]) {
    if (!(gate.blockedActions || []).includes(blocked)) findings.push(`blocked_action_missing:${blocked}`);
  }
  for (const [key, value] of Object.entries(gate.safetyInvariants || {})) {
    if (value !== false) findings.push(`safety_invariant_open:${key}`);
  }

  return {
    schema: "gpao_t.design_reference_gate_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checked: [
      "codex_level_visual_conversation_ux",
      "claude_code_level_operating_authority_ux",
      "visual_design_system",
      "korean_ui_ux",
      "tone_and_manner_unity",
      "screenshot_and_human_visual_review_evidence",
      "no_write_no_invocation_no_external_activation",
    ],
    nextSafeAction: findings.length
      ? "Fix design reference gate findings before closing the next UI/UX slice."
      : "Apply this gate to the next UI/UX slice and record desktop/mobile visual evidence before claiming the design reference was applied.",
  };
}
