const BASE_SKILL_PACKS = [
  {
    id: "gpao-human-response-kernel-pack",
    category: "core",
    priority: 101,
    title: "GPAO Human Response Kernel Pack",
    targetUserProblem:
      "사용자가 한 말의 형식과 의도를 보존하면서, 짧고 정확하고 사람답게 쓸 수 있는 답변을 받아야 한다.",
    tcellPrinciple:
      "A human response skill admits only the response T-cells needed for the current turn: current input, request form, certainty, agency, depth, artifact-first output, minimal questions, and usable closeout.",
    triggerSignals: ["말귀", "응답", "답변", "질문", "초안", "출력", "추측", "검색 안", "모호", "바로 써"],
    inputTypes: [
      "natural_language_request",
      "follow_up",
      "artifact_request",
      "judgment_request",
      "ambiguous_short_input",
    ],
    outputArtifacts: [
      "usable_answer",
      "artifact_draft",
      "clarifying_question",
      "decision_boundary",
      "hold_condition",
      "natural_closeout",
    ],
    researchProtocol: [
      "Use docs/00-canon/GPAO-T-HUMAN-CENTERED-RESPONSE-CANON-ko.md as the implementation-bound response contract.",
      "Do not inject the source prompt verbatim; extract only task-fit T-cells into the task packet.",
      "Preserve the current user request before applying long conversation context, memory, skill conventions, or style rules.",
    ],
    qualityGates: [
      "The current user input is preserved as the primary answer anchor.",
      "Facts, unknowns, assumptions, emotions, and judgments are separated when the distinction changes the answer.",
      "Artifact requests produce the usable draft or result before meta explanation.",
      "Questions are asked only when the answer direction would otherwise be wrong or unsafe.",
      "Long conversation context supports the current request instead of replacing it.",
      "The answer ends with a usable conclusion, action, hold condition, or natural closeout.",
    ],
    replayCases: [
      "A one-word Korean follow-up asks one short clarification instead of inventing a prior target.",
      "A place or today-information request routes to evidence/current-source behavior instead of unsupported guessing.",
      "A draft request returns a usable draft first and explains only after the artifact.",
      "A complex judgment separates strong signals, weak signals, assumptions, and user decision rights.",
      "A long-session follow-up uses admitted context without recapping or hijacking the current request.",
    ],
    authorityBoundary: {
      localDraft: "allowed",
      webResearch: "allowed_when_requested_or_needed",
      durableMemoryPromotion: "review_required",
      promptCanonMutation: "review_required",
      externalAction: "blocked_until_approval",
    },
    growthSignals: [
      "User says the system misunderstood the request or ignored the requested output form.",
      "The system repeatedly asks unnecessary questions before producing usable work.",
      "The system answers current or local information requests without source checks.",
      "The system exposes internal enum or framework language to the user-facing answer.",
    ],
  },
  {
    id: "gpao-core-thinking-pack",
    category: "core",
    priority: 100,
    title: "GPAO Core Thinking Pack",
    targetUserProblem:
      "사용자가 애매하게 말해도 목표, 맥락, 판단 기준, 다음 행동을 정리해야 한다.",
    tcellPrinciple:
      "A useful thought skill extracts the operating principle before producing a long answer.",
    triggerSignals: ["정리", "기획", "판단", "뭐부터", "방향", "우선순위", "생각"],
    inputTypes: ["natural_language_request", "notes", "conversation_context"],
    outputArtifacts: ["decision_brief", "task_plan", "priority_matrix", "next_action"],
    researchProtocol: [
      "Review decision-making, product planning, and problem-framing references before major revisions.",
      "Capture repeated user confusion as a candidate operating-principle update.",
    ],
    qualityGates: [
      "Separates facts, assumptions, risks, and next action.",
      "Preserves the user's current request as the highest-priority anchor.",
      "Avoids decorative theory unless it maps to a concrete decision or action.",
    ],
    replayCases: [
      "Vague first request becomes a concrete plan without over-questioning.",
      "Conflicting goals are narrowed into a decision brief with tradeoffs.",
    ],
    authorityBoundary: {
      localDraft: "allowed",
      durableMemoryPromotion: "review_required",
      externalAction: "blocked_until_approval",
    },
    growthSignals: [
      "User repeatedly corrects the same framing mistake.",
      "Plans frequently miss execution or verification steps.",
    ],
  },
  {
    id: "gpao-research-evidence-pack",
    category: "evidence",
    priority: 95,
    title: "GPAO Research Evidence Pack",
    targetUserProblem:
      "사용자가 최신 정보, 외부 사례, 정책, 기술 비교를 믿을 수 있는 근거와 함께 알고 싶어 한다.",
    tcellPrinciple:
      "Evidence is useful only when source, constraint, inference, and usable claim are separated.",
    triggerSignals: ["리서치", "검색", "사례", "최신", "비교", "근거", "자료"],
    inputTypes: ["research_question", "url", "source_material", "market_or_policy_context"],
    outputArtifacts: ["source_registry", "evidence_matrix", "claim_map", "recommendation"],
    researchProtocol: [
      "Prefer primary or official sources for technical, legal, financial, medical, or policy claims.",
      "Separate fact, quote, inference, uncertainty, and recommendation.",
    ],
    qualityGates: [
      "Every major claim maps to a source or is labeled as inference.",
      "Missing or conflicting evidence is visible.",
      "No latest, verified, or definitive claim without current source support.",
    ],
    replayCases: [
      "External GitHub project scan produces a source-backed comparison.",
      "Policy or standards question separates jurisdiction and applicability.",
    ],
    authorityBoundary: {
      webResearch: "allowed_when_requested_or_needed",
      externalPublication: "blocked_until_approval",
      highStakesAdvice: "requires_source_and_disclaimer",
    },
    growthSignals: [
      "Repeated unsupported claims are detected in outputs.",
      "A domain frequently needs the same source registry.",
    ],
  },
  {
    id: "gpao-document-output-pack",
    category: "artifact",
    priority: 90,
    title: "GPAO Document Output Pack",
    targetUserProblem:
      "사용자가 보고서, 제안서, 매뉴얼, 정책 문서, 발표 원고를 바로 쓸 수 있는 품질로 만들고 싶어 한다.",
    tcellPrinciple:
      "A document skill turns scattered context into reader-specific structure, not just formatted text.",
    triggerSignals: ["문서", "보고서", "제안서", "매뉴얼", "계획서", "원고", "정리본"],
    inputTypes: ["outline", "source_notes", "audience", "artifact_requirements"],
    outputArtifacts: ["markdown_doc", "report", "proposal", "manual", "brief"],
    researchProtocol: [
      "Identify target reader, decision context, and expected use before drafting.",
      "Use field-specific templates only after validating they fit the user's scenario.",
    ],
    qualityGates: [
      "Reader, purpose, and action are clear in the first screen.",
      "No generic filler sections.",
      "Source-based claims are traceable.",
    ],
    replayCases: [
      "A messy conversation becomes a publishable project plan.",
      "A technical feature becomes a non-developer explanation document.",
    ],
    authorityBoundary: {
      localDraft: "allowed",
      clientFacingPublication: "requires_approval",
      legalOrFinancialDocument: "requires_review_boundary",
    },
    growthSignals: [
      "User repeatedly rewrites tone or structure.",
      "A recurring document type emerges from user workflow.",
    ],
  },
  {
    id: "gpao-visual-design-pack",
    category: "design",
    priority: 100,
    title: "GPAO Visual Design Pack",
    targetUserProblem:
      "비개발자와 일반 사용자가 웹, 앱, 발표, 보고서 산출물에서 시각적 완성도가 낮아지는 문제를 겪는다.",
    tcellPrinciple:
      "Visual quality is an operating constraint: domain fit, hierarchy, typography, spacing, and contrast must survive generation.",
    triggerSignals: ["디자인", "예쁘게", "시각", "UI", "UX", "브랜드", "랜딩", "PPT"],
    inputTypes: ["screen_goal", "brand_context", "audience", "reference_style", "artifact_type"],
    outputArtifacts: ["design_direction", "ui_spec", "style_tokens", "visual_qa_report"],
    researchProtocol: [
      "Study strong current references for the target domain before defining style direction.",
      "Separate aesthetic preference, usability constraint, and implementation constraint.",
    ],
    qualityGates: [
      "Typography, spacing, contrast, responsive behavior, and visual hierarchy are checked.",
      "The result avoids generic AI-looking gradients, decorative clutter, and domain mismatch.",
      "Design decisions are tied to the user's audience and artifact purpose.",
    ],
    replayCases: [
      "A SaaS dashboard request produces restrained operational UI guidance.",
      "A landing page request produces brand-appropriate first-viewport direction.",
    ],
    authorityBoundary: {
      localDesignDraft: "allowed",
      brandSystemMutation: "review_required",
      paidAssetUse: "blocked_until_approval",
    },
    growthSignals: [
      "User repeatedly asks for more premium visual quality.",
      "Generated UI fails screenshot or responsive checks.",
    ],
  },
  {
    id: "gpao-webapp-builder-pack",
    category: "builder",
    priority: 92,
    title: "GPAO Web/App Builder Pack",
    targetUserProblem:
      "사용자가 아이디어를 실제 작동하는 웹앱/앱으로 만들고 싶지만 설계, 구현, 검증, 디자인 마감이 끊긴다.",
    tcellPrinciple:
      "A builder skill keeps product intent, implementation state, design quality, and verification in one task packet.",
    triggerSignals: ["앱", "웹앱", "사이트", "구현", "프론트", "백엔드"],
    inputTypes: ["product_idea", "workflow", "design_preference", "data_model", "technical_constraints"],
    outputArtifacts: ["implementation_plan", "working_app", "test_report", "run_instructions"],
    researchProtocol: [
      "Select proven frameworks and libraries for core domain logic when available.",
      "Benchmark against current app-building UX expectations before finalizing controls and flows.",
    ],
    qualityGates: [
      "The first screen is usable, not a marketing placeholder unless requested.",
      "Core workflow, empty state, error/recovery state, and responsive layout are verified.",
      "Implementation follows existing project patterns before adding new abstractions.",
    ],
    replayCases: [
      "Non-developer app idea becomes runnable local app with a verified first workflow.",
      "Existing app feature is implemented without breaking existing conventions.",
    ],
    authorityBoundary: {
      localImplementation: "allowed",
      dependencyInstall: "requires_environment_boundary_check",
      deployment: "blocked_until_approval",
    },
    growthSignals: [
      "Same app pattern recurs across user projects.",
      "Design QA repeatedly blocks final acceptance.",
    ],
  },
  {
    id: "gpao-korean-business-pack",
    category: "domain",
    priority: 88,
    title: "GPAO Korean Business Pack",
    targetUserProblem:
      "한국에서 사업하는 사용자가 법령, 공시, 통계, 문서, 세무, 마케팅 자료를 AI에게 직접 확인시키고 싶어 한다.",
    tcellPrinciple:
      "Business assistance must connect claims to current Korean source surfaces before becoming an answer anchor.",
    triggerSignals: ["사업", "한국", "세무", "법률", "공시", "통계", "정부지원", "사업계획"],
    inputTypes: ["business_question", "company_or_market_context", "document", "official_source_need"],
    outputArtifacts: ["business_brief", "source_checklist", "risk_note", "action_plan"],
    researchProtocol: [
      "Prefer official Korean public sources and source-grounded MCP connectors when available.",
      "Separate general information from legal, tax, financial, or regulated advice boundaries.",
    ],
    qualityGates: [
      "High-stakes claims include source and review boundary.",
      "Outdated statistics or laws are not treated as current without verification.",
      "The action plan is practical for a Korean small business or working user.",
    ],
    replayCases: [
      "Korean MCP list is converted into connector registry and safe usage policy.",
      "A business-plan request produces a source-aware practical outline.",
    ],
    authorityBoundary: {
      sourceLookup: "allowed_when_configured",
      legalTaxFinancialAdvice: "review_required",
      externalSubmission: "blocked_until_approval",
    },
    growthSignals: [
      "User repeatedly asks for the same Korean official data domain.",
      "Connector needs appear across multiple business workflows.",
    ],
  },
  {
    id: "gpao-owner-ops-pack",
    category: "domain",
    priority: 89,
    title: "GPAO Owner Ops Pack",
    targetUserProblem:
      "한국 자영업자와 1인/소규모 사업자가 반복 업무를 직접 자동화 도구로 설계하지 않아도, 리뷰/문의/예약 같은 사업 문제를 말하면 안전한 초안과 자동화 후보를 받아야 한다.",
    tcellPrinciple:
      "Owner Ops turns repeated business pressure into bounded automation candidates: business problem -> workflow candidate -> authority ladder -> local draft -> record -> replay/growth signal.",
    triggerSignals: [
      "자영업",
      "사장님",
      "리뷰",
      "예약",
      "문의",
      "스마트스토어",
      "쇼핑몰",
      "고객응대",
      "반복 업무",
      "자동화 후보",
    ],
    inputTypes: ["owner_problem", "pasted_reviews", "csv", "excel", "customer_inquiry_text"],
    outputArtifacts: [
      "automation_candidates",
      "workflow_preview",
      "reply_drafts",
      "local_record",
      "effect_replay_summary",
    ],
    researchProtocol: [
      "Start with no-API paste/CSV/Excel workflows before adding MCP or live connectors.",
      "Use Korean owner-operator language and hide trigger/action/OAuth/MCP raw details from the front surface.",
      "Separate review replies, shopping inquiries, and reservation inquiries before broad automation.",
    ],
    qualityGates: [
      "The user sees business problem language before automation jargon.",
      "External send, review posting, refund, deletion, payment, and bulk messaging remain blocked in v0.1.",
      "Each workflow produces local draft, review-needed items, local record, and replay signal.",
      "The pack works without external API connection for the first three workflows.",
    ],
    replayCases: [
      "Restaurant owner pastes reviews and receives classification, reply drafts, locked auto-posting, and local records.",
      "SmartStore owner pastes inquiries and receives shipping/exchange/restock/product-info categories with safe drafts.",
      "Reservation business owner pastes a booking inquiry and receives missing questions plus a non-confirming draft.",
    ],
    authorityBoundary: {
      localParsing: "allowed",
      localSummary: "allowed",
      localDraft: "allowed",
      localRecord: "allowed",
      readOnlyConnector: "review_required_later",
      externalSend: "blocked_until_approval",
      paymentRefundDeletion: "blocked",
      durableMemoryPromotion: "review_required",
    },
    growthSignals: [
      "The same inquiry category appears repeatedly across local records.",
      "The user edits the same reply phrase repeatedly.",
      "A workflow repeatedly needs a read-only connector input source.",
      "Sensitive customer data appears in pasted inputs.",
    ],
  },
  {
    id: "gpao-data-insight-pack",
    category: "data",
    priority: 84,
    title: "GPAO Data Insight Pack",
    targetUserProblem:
      "사용자가 스프레드시트, 지표, 통계, 운영 데이터를 읽고 의사결정으로 바꾸고 싶어 한다.",
    tcellPrinciple:
      "Data output must preserve calculation trace, uncertainty, and decision relevance.",
    triggerSignals: ["데이터", "엑셀", "CSV", "통계", "지표", "분석", "차트"],
    inputTypes: ["spreadsheet", "csv", "metric_question", "dashboard_context"],
    outputArtifacts: ["analysis_summary", "calculation_trace", "chart_plan", "decision_note"],
    researchProtocol: [
      "Inspect schema, missing values, and calculation assumptions before interpretation.",
      "Use domain benchmarks only when sources and dates are clear.",
    ],
    qualityGates: [
      "Calculations are reproducible.",
      "Charts answer the user's decision question instead of decorating the data.",
      "Uncertainty and data limitations are stated.",
    ],
    replayCases: [
      "Spreadsheet metrics become a business decision brief.",
      "Official statistics are compared with source and date visible.",
    ],
    authorityBoundary: {
      localAnalysis: "allowed",
      financialDecisionAdvice: "review_required",
      externalDataUpload: "blocked_until_approval",
    },
    growthSignals: [
      "Repeated metrics dashboards emerge.",
      "User consistently asks for the same derived indicators.",
    ],
  },
  {
    id: "gpao-growth-governance-pack",
    category: "governance",
    priority: 96,
    title: "GPAO Growth Governance Pack",
    targetUserProblem:
      "GPAO-T가 사용자를 도우며 스스로 좋아져야 하지만, 위험한 승격과 자동화를 통제해야 한다.",
    tcellPrinciple:
      "Growth is a bounded mutation loop: observe, propose, replay, approve, apply, audit, and rollback.",
    triggerSignals: ["업그레이드", "자가성장", "자동화", "승인", "리포트", "루프", "개선"],
    inputTypes: ["usage_history", "failure_report", "proposal", "approval_status", "replay_result"],
    outputArtifacts: ["growth_report", "upgrade_proposal", "approval_card", "audit_record"],
    researchProtocol: [
      "Study agent safety, governance, and workflow automation patterns before changing authority boundaries.",
      "Compare proposed automation with actual user benefit and rollback cost.",
    ],
    qualityGates: [
      "Broad capture is allowed, but durable promotion and live mutation are gated.",
      "Security, money, legal, external send, destructive action, and public release require approval.",
      "Every accepted upgrade has replay evidence and rollback notes.",
    ],
    replayCases: [
      "Repeated failure becomes a review-only upgrade proposal.",
      "Approved upgrade produces install/restart/user-visible guidance.",
    ],
    authorityBoundary: {
      proposalGeneration: "allowed",
      weeklyReportDraft: "allowed",
      liveRuleMutation: "blocked_until_approval_and_replay",
    },
    growthSignals: [
      "A skill pack repeatedly fails quality gates.",
      "User approves or rejects the same type of upgrade proposal.",
    ],
  },
  {
    id: "gpao-replay-evaluation-pack",
    category: "quality",
    priority: 94,
    title: "GPAO Replay Evaluation Pack",
    targetUserProblem:
      "사용자가 '좋아졌다'는 주장 대신 같은 유형의 이전/이후 시나리오에서 실제 개선 증거를 보고 싶어 한다.",
    tcellPrinciple:
      "A replay skill converts improvement claims into before/after cases, measurable deltas, and regression signals.",
    triggerSignals: ["리플레이", "replay", "이전보다", "개선됐는지", "효과", "검증", "회귀"],
    inputTypes: ["previous_case", "current_output", "quality_gate_result", "growth_signal"],
    outputArtifacts: ["replay_suite", "before_after_scorecard", "regression_report", "promotion_evidence"],
    researchProtocol: [
      "Compare current behavior against a preserved prior case before claiming improvement.",
      "Use the same scoring rubric before and after a skill or OS change.",
    ],
    qualityGates: [
      "Before and after cases use the same user intent and scoring policy.",
      "Improvement is measured as a bounded local evidence claim, not a universal product claim.",
      "Regression or no-gain results create a growth candidate instead of a completion claim.",
    ],
    replayCases: [
      "A vague request routing failure is replayed after a skill routing update.",
      "A visual design quality failure is replayed after adding a design quality gate.",
    ],
    authorityBoundary: {
      localReplay: "allowed",
      promotionEvidence: "review_required",
      liveMutation: "blocked_until_approval_audit_and_rollback",
    },
    growthSignals: [
      "Replay score repeatedly fails the same gate.",
      "A claimed upgrade produces no measurable before/after gain.",
    ],
  },
  {
    id: "gpao-quality-audit-pack",
    category: "quality",
    priority: 93,
    title: "GPAO Quality Audit Pack",
    targetUserProblem:
      "사용자가 결과물을 받았을 때 그럴듯한 답변인지, 완료라고 말할 수 있는 산출물인지 구분해야 한다.",
    tcellPrinciple:
      "A quality skill separates output existence from completion authority through evidence, drift, and acceptance gates.",
    triggerSignals: ["품질", "감사", "audit", "완료", "검수", "정합성", "게이트"],
    inputTypes: ["artifact", "completion_claim", "source_plan", "test_result", "user_acceptance_signal"],
    outputArtifacts: ["completion_audit", "drift_report", "evidence_checklist", "quality_decision"],
    researchProtocol: [
      "Check the artifact against the user's stated outcome and the implementation truth source.",
      "Review source-to-document drift and test shallowness before allowing completion language.",
    ],
    qualityGates: [
      "Completion language maps to verification evidence and user-facing acceptance criteria.",
      "Source, docs, tests, and runtime surfaces do not contradict each other.",
      "Known limitations and next recovery action are visible when the result is not complete.",
    ],
    replayCases: [
      "A command surface is changed and docs/test references are audited for drift.",
      "A feature with passing smoke tests is blocked when scenario evidence is missing.",
    ],
    authorityBoundary: {
      localAudit: "allowed",
      completionClaim: "requires_evidence",
      publicReleaseClaim: "blocked_until_release_gate",
    },
    growthSignals: [
      "Completion claims are repeatedly blocked by missing scenario evidence.",
      "Docs and implementation drift repeatedly appears in the same surface.",
    ],
  },
  {
    id: "gpao-local-app-qa-pack",
    category: "quality",
    priority: 91,
    title: "GPAO Local App QA Pack",
    targetUserProblem:
      "사용자가 만든 앱이 열리기만 하는 수준을 넘어 첫 화면, 핵심 흐름, 빈 상태, 실패 복구까지 확인되어야 한다.",
    tcellPrinciple:
      "An app QA skill treats usable workflow, visible state, recovery path, and responsive fit as one product proof packet.",
    triggerSignals: ["QA", "검수", "화면", "작동", "빈 상태", "오류", "복구", "반응형"],
    inputTypes: ["local_app", "screen_contract", "user_flow", "test_result", "screenshot_or_dom_signal"],
    outputArtifacts: ["app_qa_plan", "first_workflow_report", "state_matrix_check", "recovery_notes"],
    researchProtocol: [
      "Test the first user workflow before relying on component-level success.",
      "Check empty, loading, error, and recovery states that users can actually encounter.",
    ],
    qualityGates: [
      "First screen leads to a real workflow and not only a placeholder.",
      "Core workflow, empty state, and failure/recovery state are checked.",
      "Text fit, responsive stability, and visible status do not break the layout.",
    ],
    replayCases: [
      "A local app feature is tested through first success, empty state, and recovery state.",
      "A visual polish request is checked against screenshot or UI contract evidence.",
    ],
    authorityBoundary: {
      localQa: "allowed",
      browserPreview: "allowed_on_loopback",
      externalDeployment: "blocked_until_approval",
    },
    growthSignals: [
      "A generated app repeatedly lacks empty or recovery states.",
      "Responsive or text-fit issues repeatedly block final acceptance.",
    ],
  },
];

const REQUIRED_FIELDS = [
  "id",
  "category",
  "title",
  "targetUserProblem",
  "tcellPrinciple",
  "triggerSignals",
  "inputTypes",
  "outputArtifacts",
  "researchProtocol",
  "qualityGates",
  "replayCases",
  "authorityBoundary",
  "growthSignals",
];

const SKILL_CANDIDATE_ATLAS = [
  {
    id: "gpao-core-thinking-pack",
    category: "foundation",
    tier: "foundation",
    phase: "phase-1",
    title: "Core Thinking",
    productionStatus: "seed_pack_exists",
    userProblem: "사용자가 애매하게 말해도 목표, 기준, 위험, 다음 행동이 선명해야 한다.",
    tcellFocus: "operating_principle_extraction",
    buildReason: "모든 스킬 라우팅과 산출물 품질의 중심축이다.",
    dependencies: [],
    shouldBuildWith: ["gpao-growth-governance-pack"],
    requiredProof: ["ambiguous_request_recovery", "facts_assumptions_risks_split"],
  },
  {
    id: "gpao-growth-governance-pack",
    category: "foundation",
    tier: "foundation",
    phase: "phase-1",
    title: "Growth Governance",
    productionStatus: "seed_pack_exists",
    userProblem: "스킬과 OS가 성장하되 위험한 자동 승격은 통제되어야 한다.",
    tcellFocus: "bounded_mutation_loop",
    buildReason: "자동화와 사용자 승인 경계가 없으면 스킬 생태계 전체가 불안정해진다.",
    dependencies: ["gpao-core-thinking-pack"],
    shouldBuildWith: ["gpao-replay-evaluation-pack"],
    requiredProof: ["upgrade_proposal_gate", "rollback_boundary_visible"],
  },
  {
    id: "gpao-research-evidence-pack",
    category: "foundation",
    tier: "foundation",
    phase: "phase-1",
    title: "Research Evidence",
    productionStatus: "seed_pack_exists",
    userProblem: "AI가 기억으로 우기는 대신 출처와 최신성을 확인해야 한다.",
    tcellFocus: "source_claim_inference_split",
    buildReason: "좋은 스킬은 좋은 근거를 먹고 성장한다.",
    dependencies: ["gpao-core-thinking-pack"],
    shouldBuildWith: ["gpao-korean-business-pack", "gpao-document-output-pack"],
    requiredProof: ["source_matrix", "inference_labeling"],
  },
  {
    id: "gpao-visual-design-pack",
    category: "high-impact",
    tier: "experience",
    phase: "phase-1",
    title: "Visual Design",
    productionStatus: "seed_pack_exists",
    userProblem: "웹, 앱, 문서, 발표가 작동해도 시각 품질이 낮으면 사용자는 가치를 낮게 느낀다.",
    tcellFocus: "visual_quality_operating_constraint",
    buildReason: "일반 사용자가 가장 빠르게 체감하는 품질 축이다.",
    dependencies: ["gpao-core-thinking-pack"],
    shouldBuildWith: ["gpao-webapp-builder-pack", "gpao-document-output-pack"],
    requiredProof: ["responsive_visual_qa", "domain_fit_check"],
  },
  {
    id: "gpao-webapp-builder-pack",
    category: "high-impact",
    tier: "execution",
    phase: "phase-1",
    title: "Web/App Builder",
    productionStatus: "seed_pack_exists",
    userProblem: "아이디어가 작동하는 앱이 되기까지 기획, 구현, 디자인, 검증이 자주 끊긴다.",
    tcellFocus: "product_intent_to_verified_workflow",
    buildReason: "GPAO-T가 실제 제작 OS로 느껴지는 핵심 실행 표면이다.",
    dependencies: ["gpao-core-thinking-pack", "gpao-visual-design-pack"],
    shouldBuildWith: ["gpao-local-app-qa-pack"],
    requiredProof: ["first_workflow_runs", "empty_and_recovery_states"],
  },
  {
    id: "gpao-document-output-pack",
    category: "high-impact",
    tier: "artifact",
    phase: "phase-1",
    title: "Document Output",
    productionStatus: "seed_pack_exists",
    userProblem: "대화와 자료가 실제 보고서, 제안서, 매뉴얼, 글로 정리되어야 한다.",
    tcellFocus: "reader_specific_artifact_structure",
    buildReason: "비개발자 사용자의 체감 생산성을 즉시 높인다.",
    dependencies: ["gpao-core-thinking-pack", "gpao-research-evidence-pack"],
    shouldBuildWith: ["gpao-writing-style-pack"],
    requiredProof: ["reader_purpose_action_visible", "source_traceable_claims"],
  },
  {
    id: "gpao-korean-business-pack",
    category: "domain",
    tier: "domain",
    phase: "phase-2",
    title: "Korean Business",
    productionStatus: "seed_pack_exists",
    userProblem: "한국 사업자가 법령, 공시, 통계, 문서, 세무 경계를 실무적으로 다뤄야 한다.",
    tcellFocus: "official_source_business_action",
    buildReason: "한국 일반 사용자에게 GPAO-T의 현실적 쓸모를 보여주는 대표 도메인이다.",
    dependencies: ["gpao-research-evidence-pack", "gpao-document-output-pack"],
    shouldBuildWith: ["gpao-mcp-source-connector-pack"],
    requiredProof: ["official_source_registry", "legal_tax_finance_boundary"],
  },
  {
    id: "gpao-owner-ops-pack",
    category: "domain",
    tier: "domain",
    phase: "phase-2",
    title: "Owner Ops",
    productionStatus: "production_pack_exists",
    userProblem: "한국 자영업자가 리뷰, 예약, 쇼핑몰 문의 같은 반복 업무를 쉽게 초안/기록/자동화 후보로 바꿔야 한다.",
    tcellFocus: "business_repetition_to_safe_automation_candidate",
    buildReason: "GPAO-T의 비개발자 시장성과 실전 자동화 가치를 보여주는 첫 도메인 proof surface다.",
    dependencies: ["gpao-korean-business-pack", "gpao-data-insight-pack", "gpao-growth-governance-pack"],
    shouldBuildWith: ["gpao-mcp-source-connector-pack", "gpao-automation-workflow-pack"],
    requiredProof: ["no_api_workflow_preview", "authority_ladder", "local_record_replay"],
  },
  {
    id: "gpao-data-insight-pack",
    category: "domain",
    tier: "domain",
    phase: "phase-2",
    title: "Data Insight",
    productionStatus: "seed_pack_exists",
    userProblem: "스프레드시트와 지표를 보고 의사결정으로 바꿔야 한다.",
    tcellFocus: "calculation_trace_to_decision",
    buildReason: "사업, 운영, 리서치 스킬의 판단 품질을 높이는 공통 도메인 축이다.",
    dependencies: ["gpao-research-evidence-pack"],
    shouldBuildWith: ["gpao-dashboard-briefing-pack"],
    requiredProof: ["calculation_trace", "decision_relevant_chart_plan"],
  },
  {
    id: "gpao-replay-evaluation-pack",
    category: "foundation",
    tier: "quality",
    phase: "phase-1",
    title: "Replay Evaluation",
    productionStatus: "production_pack_exists",
    userProblem: "좋아졌다는 주장이 아니라 이전보다 나아졌다는 증거가 필요하다.",
    tcellFocus: "before_after_replay_proof",
    buildReason: "스킬 성장의 객관적 증거를 담당한다.",
    dependencies: ["gpao-growth-governance-pack"],
    shouldBuildWith: ["gpao-quality-audit-pack"],
    requiredProof: ["before_after_case", "regression_signal"],
  },
  {
    id: "gpao-quality-audit-pack",
    category: "foundation",
    tier: "quality",
    phase: "phase-1",
    title: "Quality Audit",
    productionStatus: "production_pack_exists",
    userProblem: "작업 결과가 그럴듯해도 완료라고 말할 수 있는지 따로 봐야 한다.",
    tcellFocus: "claim_evidence_completion_gate",
    buildReason: "완료 언어, 품질 게이트, 산출물 정합성을 통제한다.",
    dependencies: ["gpao-core-thinking-pack"],
    shouldBuildWith: ["gpao-replay-evaluation-pack"],
    requiredProof: ["completion_claim_guard", "artifact_drift_check"],
  },
  {
    id: "gpao-local-app-qa-pack",
    category: "high-impact",
    tier: "quality",
    phase: "phase-1",
    title: "Local App QA",
    productionStatus: "production_pack_exists",
    userProblem: "앱이 열리기만 하는 것과 실제 사용자 흐름이 되는 것은 다르다.",
    tcellFocus: "workflow_state_visual_runtime_check",
    buildReason: "웹앱 제작 스킬의 결과물을 제품 수준으로 끌어올린다.",
    dependencies: ["gpao-webapp-builder-pack", "gpao-visual-design-pack"],
    shouldBuildWith: ["gpao-accessibility-usability-pack"],
    requiredProof: ["first_screen_check", "failure_recovery_check"],
  },
  {
    id: "gpao-writing-style-pack",
    category: "high-impact",
    tier: "artifact",
    phase: "phase-2",
    title: "Writing Style",
    productionStatus: "planned_candidate",
    userProblem: "사용자의 말투, 독자, 목적에 맞는 글쓰기 품질이 필요하다.",
    tcellFocus: "voice_purpose_reader_alignment",
    buildReason: "문서와 콘텐츠 산출물의 체감 품질을 크게 높인다.",
    dependencies: ["gpao-document-output-pack"],
    shouldBuildWith: ["gpao-content-distribution-pack"],
    requiredProof: ["voice_consistency", "reader_action_clarity"],
  },
  {
    id: "gpao-mcp-source-connector-pack",
    category: "connector",
    tier: "connector",
    phase: "phase-2",
    title: "MCP Source Connector",
    productionStatus: "planned_candidate",
    userProblem: "AI가 필요한 공식 자료와 파일에 직접 닿아 확인해야 한다.",
    tcellFocus: "connector_read_evidence_boundary",
    buildReason: "리서치, 한국 사업, 문서 스킬의 근거 접근성을 높인다.",
    dependencies: ["gpao-research-evidence-pack", "gpao-growth-governance-pack"],
    shouldBuildWith: ["gpao-korean-business-pack"],
    requiredProof: ["read_only_connector_policy", "source_tool_attribution"],
  },
  {
    id: "gpao-personal-productivity-pack",
    category: "domain",
    tier: "daily",
    phase: "phase-2",
    title: "Personal Productivity",
    productionStatus: "planned_candidate",
    userProblem: "사용자의 할 일, 지연, 반복 루틴, 회고가 자연스럽게 정리되어야 한다.",
    tcellFocus: "daily_flow_to_next_action_loop",
    buildReason: "GPAO-T가 매일 쓰이는 개인 운영체제처럼 느껴지게 한다.",
    dependencies: ["gpao-core-thinking-pack", "gpao-growth-governance-pack"],
    shouldBuildWith: ["gpao-weekly-growth-report-pack"],
    requiredProof: ["daily_review_card", "non_intrusive_next_action"],
  },
  {
    id: "gpao-weekly-growth-report-pack",
    category: "growth",
    tier: "growth",
    phase: "phase-2",
    title: "Weekly Growth Report",
    productionStatus: "planned_candidate",
    userProblem: "사용자가 놓친 성장 제안과 진행 이력을 정기적으로 확인해야 한다.",
    tcellFocus: "growth_history_to_user_visible_report",
    buildReason: "자가 성장 기능을 사용자가 자연스럽게 인지하게 한다.",
    dependencies: ["gpao-growth-governance-pack", "gpao-personal-productivity-pack"],
    shouldBuildWith: ["gpao-notification-timing-pack"],
    requiredProof: ["pending_upgrade_summary", "non_external_draft_boundary"],
  },
  {
    id: "gpao-notification-timing-pack",
    category: "experience",
    tier: "ux",
    phase: "phase-2",
    title: "Notification Timing",
    productionStatus: "planned_candidate",
    userProblem: "좋은 제안도 작업을 방해하는 순간 나오면 피로가 된다.",
    tcellFocus: "interruption_cost_aware_timing",
    buildReason: "세션 내 알림과 정기 리포트의 사용자 체감을 조절한다.",
    dependencies: ["gpao-growth-governance-pack"],
    shouldBuildWith: ["gpao-weekly-growth-report-pack"],
    requiredProof: ["quiet_timing_rule", "missed_report_fallback"],
  },
  {
    id: "gpao-learning-coach-pack",
    category: "domain",
    tier: "learning",
    phase: "phase-3",
    title: "Learning Coach",
    productionStatus: "planned_candidate",
    userProblem: "사용자가 외우는 것보다 원리를 깨우치며 학습해야 한다.",
    tcellFocus: "principle_understanding_to_transfer",
    buildReason: "T-cell 이론의 교육/학습 확장성을 검증한다.",
    dependencies: ["gpao-core-thinking-pack", "gpao-document-output-pack"],
    shouldBuildWith: ["gpao-tcell-research-pack"],
    requiredProof: ["explain_without_same_words", "transfer_task_success"],
  },
  {
    id: "gpao-tcell-research-pack",
    category: "research",
    tier: "theory",
    phase: "phase-3",
    title: "T-cell Research",
    productionStatus: "planned_candidate",
    userProblem: "T-cell Engineering을 추상 이론이 아니라 연구/개발 가능한 도구로 발전시켜야 한다.",
    tcellFocus: "theory_to_function_schema_replay",
    buildReason: "GPAO-T의 고유 지능 구조를 계속 고도화한다.",
    dependencies: ["gpao-research-evidence-pack", "gpao-replay-evaluation-pack"],
    shouldBuildWith: ["gpao-learning-coach-pack"],
    requiredProof: ["formal_claim_boundary", "implementation_mapping"],
  },
  {
    id: "gpao-accessibility-usability-pack",
    category: "experience",
    tier: "ux",
    phase: "phase-3",
    title: "Accessibility Usability",
    productionStatus: "planned_candidate",
    userProblem: "아름다운 결과물이 실제 사용성과 접근성을 놓치면 제품 품질이 떨어진다.",
    tcellFocus: "human_usable_interface_constraint",
    buildReason: "디자인 품질을 취향이 아니라 사용 가능한 제품 기준으로 고정한다.",
    dependencies: ["gpao-visual-design-pack", "gpao-local-app-qa-pack"],
    shouldBuildWith: ["gpao-webapp-builder-pack"],
    requiredProof: ["keyboard_text_fit_contrast", "mobile_desktop_check"],
  },
  {
    id: "gpao-content-distribution-pack",
    category: "domain",
    tier: "content",
    phase: "phase-3",
    title: "Content Distribution",
    productionStatus: "planned_candidate",
    userProblem: "글과 문서를 플랫폼별 독자와 형식에 맞게 배포 가능한 상태로 바꿔야 한다.",
    tcellFocus: "message_core_to_channel_variant",
    buildReason: "사용자의 지식과 사업 콘텐츠를 실제 전달력으로 확장한다.",
    dependencies: ["gpao-writing-style-pack", "gpao-document-output-pack"],
    shouldBuildWith: ["gpao-visual-design-pack"],
    requiredProof: ["channel_variant", "core_message_preserved"],
  },
  {
    id: "gpao-automation-workflow-pack",
    category: "connector",
    tier: "automation",
    phase: "phase-3",
    title: "Automation Workflow",
    productionStatus: "planned_candidate",
    userProblem: "반복 업무를 자동화하고 싶지만 실행권한, 실패, 되돌리기 경계가 필요하다.",
    tcellFocus: "repeatable_action_with_rollback",
    buildReason: "GPAO-T가 단순 조언자가 아니라 운영체계로 작동하는 핵심이다.",
    dependencies: ["gpao-growth-governance-pack", "gpao-mcp-source-connector-pack"],
    shouldBuildWith: ["gpao-notification-timing-pack"],
    requiredProof: ["dry_run_first", "rollback_plan"],
  },
  {
    id: "gpao-dashboard-briefing-pack",
    category: "experience",
    tier: "ops",
    phase: "phase-3",
    title: "Dashboard Briefing",
    productionStatus: "planned_candidate",
    userProblem: "상태판과 리포트가 많아질수록 핵심만 빠르게 봐야 한다.",
    tcellFocus: "state_compression_to_actionable_brief",
    buildReason: "Control Center와 데이터 스킬의 사용자 체감을 높인다.",
    dependencies: ["gpao-data-insight-pack", "gpao-core-thinking-pack"],
    shouldBuildWith: ["gpao-weekly-growth-report-pack"],
    requiredProof: ["one_screen_summary", "next_action_visible"],
  },
];

export function buildSkillManifestStandard() {
  return {
    schema: "gpao_t.skill_manifest_standard.v0_1",
    status: "ready",
    primeRule:
      "Every GPAO-T skill must solve a real user problem through research-grounded practical procedures, not decorative prompts.",
    requiredFields: REQUIRED_FIELDS,
    lifecycle: [
      "research",
      "tcell_extract",
      "specify",
      "route",
      "execute",
      "quality_gate",
      "replay",
      "growth_signal",
      "upgrade_proposal",
    ],
    automationPolicy: {
      broadCapture: "encouraged",
      draftGeneration: "allowed",
      qualityInspection: "allowed",
      proposalGeneration: "allowed",
      durableMemoryPromotion: "review_required",
      liveSkillMutation: "approval_and_replay_required",
      externalSendOrDeploy: "blocked_until_approval",
    },
    rejectionConditions: [
      "No target user problem.",
      "No research protocol.",
      "No replay case.",
      "No quality gate.",
      "No authority boundary.",
      "Only a persona prompt with no executable procedure.",
    ],
  };
}

export function buildSkillCandidateAtlas({ phase, category, tier } = {}) {
  const filters = { phase, category, tier };
  const candidates = SKILL_CANDIDATE_ATLAS
    .filter((candidate) => !phase || candidate.phase === phase)
    .filter((candidate) => !category || candidate.category === category)
    .filter((candidate) => !tier || candidate.tier === tier)
    .toSorted(compareSkillCandidate);

  return {
    schema: "gpao_t.skill_candidate_atlas.v0_1",
    status: "ready",
    atlasBaseline: "candidate_atlas_before_pack_production_v0_1_4",
    purpose:
      "List the whole GPAO-T skill production field before building individual packs, then phase the work by foundation, user impact, domain depth, growth, and connector risk.",
    filters,
    totalCandidates: candidates.length,
    allCandidates: SKILL_CANDIDATE_ATLAS.length,
    phaseSummary: buildCandidatePhaseSummary(SKILL_CANDIDATE_ATLAS),
    categorySummary: buildCandidateCategorySummary(SKILL_CANDIDATE_ATLAS),
    candidates: candidates.map(summarizeSkillCandidate),
    productionPolicy: {
      buildBundlesBeforeSinglePacks: true,
      seedPacksAreImplementationBaseline: true,
      plannedCandidatesNeedResearchProtocolAndReplayBeforePromotion: true,
      liveSkillMutation: "blocked_until_replay_approval_audit_and_rollback",
      externalConnectors: "read_or_draft_only_until_explicit_setup_and_approval",
    },
    nextSafeAction:
      "Use skill roadmap and skill build-queue before turning any candidate into a production skill pack.",
  };
}

export function buildSkillProductionRoadmap() {
  const phases = [
    {
      id: "phase-1",
      title: "Foundation And First Felt Quality",
      goal:
        "Lock the minimum skill bundle that makes GPAO-T feel useful: thinking, evidence, design, app building, documents, quality, replay, and growth governance.",
      completionRule:
        "The phase is ready when each candidate has a manifest, route fixture, execution artifact contract, quality gate replay, and growth signal path.",
    },
    {
      id: "phase-2",
      title: "Practical Domain And Growth Reports",
      goal:
        "Add Korean business, data insight, personal productivity, source connectors, and weekly growth report surfaces.",
      completionRule:
        "The phase is ready when domain source boundaries, user-visible report timing, and connector read-only policy are proven.",
    },
    {
      id: "phase-3",
      title: "Expansion And Advanced Operations",
      goal:
        "Extend into learning, T-cell research, accessibility, content distribution, automation workflows, and dashboard briefing.",
      completionRule:
        "The phase is ready when each expansion pack has a rejection condition, replay metric, and authority boundary before live automation.",
    },
  ];

  return {
    schema: "gpao_t.skill_production_roadmap.v0_1",
    status: "ready",
    roadmapBaseline: "phased_skill_ecosystem_build_v0_1_4",
    strategy:
      "Do not start with isolated skill craftsmanship. Build phase bundles so routing, execution, quality gates, replay, and growth signals mature together.",
    phases: phases.map((phase) => ({
      ...phase,
      candidates: SKILL_CANDIDATE_ATLAS
        .filter((candidate) => candidate.phase === phase.id)
        .toSorted(compareSkillCandidate)
        .map(summarizeSkillCandidate),
    })),
    buildBundles: [
      {
        id: "bundle.foundation-six",
        phase: "phase-1",
        title: "Foundation Six",
        candidateIds: [
          "gpao-core-thinking-pack",
          "gpao-growth-governance-pack",
          "gpao-research-evidence-pack",
          "gpao-visual-design-pack",
          "gpao-webapp-builder-pack",
          "gpao-document-output-pack",
        ],
        reason:
          "This is the smallest bundle that can understand vague intent, gather evidence, produce artifacts, build apps, improve visual quality, and govern growth.",
      },
      {
        id: "bundle.quality-loop",
        phase: "phase-1",
        title: "Quality And Replay Loop",
        candidateIds: [
          "gpao-replay-evaluation-pack",
          "gpao-quality-audit-pack",
          "gpao-local-app-qa-pack",
        ],
        reason:
          "This bundle prevents skill packs from becoming decorative prompts by forcing replay, completion, and first workflow proof.",
      },
      {
        id: "bundle.korea-practicality",
        phase: "phase-2",
        title: "Korean Practicality",
        candidateIds: [
          "gpao-korean-business-pack",
          "gpao-data-insight-pack",
          "gpao-mcp-source-connector-pack",
          "gpao-document-output-pack",
        ],
        reason:
          "This bundle makes GPAO-T useful for Korean users who need official sources, data, and practical business documents.",
      },
      {
        id: "bundle.self-growth-experience",
        phase: "phase-2",
        title: "Self-Growth Experience",
        candidateIds: [
          "gpao-personal-productivity-pack",
          "gpao-weekly-growth-report-pack",
          "gpao-notification-timing-pack",
          "gpao-growth-governance-pack",
        ],
        reason:
          "This bundle makes self-growth visible without interrupting the user's work.",
      },
    ],
    nextSafeAction:
      "Start with bundle.foundation-six and bundle.quality-loop, then only promote a candidate after manifest, route, execute, replay, and growth evidence exist.",
  };
}

export function buildSkillBuildQueue({ phase = "phase-1", limit = 99 } = {}) {
  const candidates = SKILL_CANDIDATE_ATLAS
    .filter((candidate) => candidate.phase === phase)
    .toSorted(compareSkillCandidate)
    .slice(0, limit);

  return {
    schema: "gpao_t.skill_build_queue.v0_1",
    status: candidates.length ? "ready" : "review",
    phase,
    queuePolicy: {
      buildAsBundles: true,
      productionChecklist: [
        "manifest",
        "intent route fixture",
        "execution artifact contract",
        "quality gate replay",
        "growth signal",
        "authority boundary",
        "docs",
        "tests",
      ],
      stopRule:
        "Do not mark a candidate as produced if it has no replay case, no quality gate, or no authority boundary.",
    },
    items: candidates.map((candidate, index) => ({
      order: index + 1,
      ...summarizeSkillCandidate(candidate),
      productionChecklist: buildCandidateProductionChecklist(candidate),
    })),
    nextSafeAction: candidates.length
      ? `Build ${candidates[0].id} only as part of its phase bundle, not as an isolated prompt pack.`
      : "No candidates found for this phase; inspect skill atlas without filters.",
  };
}

export function buildSkillProductionStatus({ phase = "phase-1" } = {}) {
  const candidates = SKILL_CANDIDATE_ATLAS
    .filter((candidate) => candidate.phase === phase)
    .toSorted(compareSkillCandidate);
  const produced = candidates.map((candidate) => buildProducedSkillStatus(candidate));
  const blockers = produced.flatMap((item) =>
    item.productionChecks
      .filter((check) => check.status !== "pass")
      .map((check) => ({
        candidateId: item.id,
        check: check.id,
        status: check.status,
        message: check.message,
      })));

  return {
    schema: "gpao_t.skill_production_status.v0_1",
    status: blockers.length ? "review" : "ready",
    phase,
    totalCandidates: candidates.length,
    producedPacks: produced.filter((item) => item.registryStatus === "registered").length,
    blockers,
    packs: produced,
    productionRule:
      "A phase skill is production-ready only when it is registered, routeable, executable, replay-covered, quality-gated, growth-aware, and authority-bounded.",
    nextSafeAction: blockers.length
      ? "Add the missing manifest, route, execution, replay, growth, or authority proof before treating this phase as produced."
      : "Use phase-1 production packs as the first bundle for real skill-pack work, then add per-pack replay fixtures.",
  };
}

export function listSkillPacks({ category } = {}) {
  const packs = category
    ? BASE_SKILL_PACKS.filter((pack) => pack.category === category)
    : BASE_SKILL_PACKS;
  return {
    schema: "gpao_t.skill_pack_registry.v0_1",
    status: "ready",
    total: packs.length,
    categories: [...new Set(BASE_SKILL_PACKS.map((pack) => pack.category))].sort(),
    packs: packs
      .toSorted((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
      .map((pack) => summarizeSkillPack(pack)),
  };
}

export function getSkillPack({ id }) {
  const pack = BASE_SKILL_PACKS.find((item) => item.id === id);
  if (!pack) {
    return {
      schema: "gpao_t.skill_pack_detail.v0_1",
      status: "not_found",
      id,
      availableIds: BASE_SKILL_PACKS.map((item) => item.id),
    };
  }

  return {
    schema: "gpao_t.skill_pack_detail.v0_1",
    status: "ready",
    pack,
  };
}

export function buildSkillEcosystemPlan() {
  return {
    schema: "gpao_t.skill_ecosystem_plan.v0_1",
    status: "ready",
    routingBaseline: "intent_profile_task_packet_v0_1_1",
    productName: "GPAO-T Skill Ecosystem",
    purpose:
      "Prepare a research-grounded, T-cell-based skill ecosystem that can be attached to GPAO-T when the core OS is complete.",
    positioning: {
      notThis: [
        "a pile of prompt templates",
        "a copied marketplace catalog",
        "a static list of personas",
      ],
      thisIs: [
        "a T-cell operating-principle skill system",
        "a practical user-problem skill registry",
        "a growth loop that improves skills from replay and usage signals",
      ],
    },
    layers: [
      "core_thinking",
      "domain_packs",
      "design_and_output_quality",
      "connector_mcp",
      "tcell_runtime",
      "growth_loop",
      "skill_governance",
    ],
    basePacks: listSkillPacks().packs,
    candidateAtlas: {
      surface: "gpao-t skill atlas [phase|category|tier]",
      totalCandidates: SKILL_CANDIDATE_ATLAS.length,
      phaseSummary: buildCandidatePhaseSummary(SKILL_CANDIDATE_ATLAS),
      rule:
        "List the whole candidate field before building individual skill packs so GPAO-T grows as an ecosystem rather than a pile of isolated prompts.",
    },
    phaseProductionBaseline: buildSkillProductionStatus({ phase: "phase-1" }),
    documentationContract: {
      userReadableBaseline: "docs/04-skill-ecosystem/GPAO-T-BASE-SKILL-PACKS-ko.md",
      candidateAtlasBaseline: "docs/04-skill-ecosystem/GPAO-T-SKILL-CANDIDATE-ATLAS-ko.md",
      implementationTruthSource: "src/core/skill-ecosystem.js",
      rule: "Readable docs explain the product baseline; this module remains the executable registry contract.",
    },
    integrationContract: {
      registrySurface: "gpao-t skill packs",
      atlasSurface: "gpao-t skill atlas [phase|category|tier]",
      roadmapSurface: "gpao-t skill roadmap",
      buildQueueSurface: "gpao-t skill build-queue [phase]",
      productionStatusSurface: "gpao-t skill production-status [phase]",
      routerSurface: "gpao-t skill route <text>",
      executionPlanSurface: "gpao-t skill execute-plan <text>",
      executionAdapterSurface: "gpao-t skill execute <text>",
      executionEvidenceSurface: "gpao-t skill execute-record <text>",
      executionHistorySurface: "gpao-t skill execution-history",
      readinessSurface: "gpao-t skill readiness",
      runtimeHook:
        "GPAO-T turn kernel calls the registry to select skill packs before model/tool routing.",
      executionHook:
        "GPAO-T skill execution adapter converts selected skill plans into local artifact drafts, quality gate results, replay evidence, and growth signal candidates.",
      futureRuntimeHook:
        "GPAO-T turn kernel calls the registry to select skill packs before model/tool routing.",
    },
    nextBuildOrder: [
      "Use skill atlas to inspect the full production field.",
      "Use skill roadmap to select a phase bundle instead of an isolated pack.",
      "Use skill build-queue phase-1 to produce foundation and quality-loop packs first.",
      "Use skill production-status phase-1 to verify the phase baseline before deeper runtime integration.",
      "Add per-pack scenario fixtures and execution artifact contracts.",
      "Promote skill execution adapter evidence into per-pack replay fixtures.",
      "Let growth governance propose skill updates from replay evidence only after replay coverage.",
    ],
  };
}

export function buildSkillManualFirstPlan() {
  return {
    schema: "gpao_t.skill_manual_first_plan.v0_1",
    status: "ready",
    principle:
      "Risky skill automation starts as manual, inspectable, dry-run, or review-first flow before becoming live behavior.",
    purpose:
      "Keep GPAO-T aggressive about useful automation while preventing hidden skill mutation, external sending, or durable promotion.",
    appliesTo: [
      "new_skill_pack",
      "skill_route_change",
      "quality_gate_change",
      "replay_case_change",
      "growth_signal_change",
      "connector_or_external_action_skill",
      "live_runtime_hook",
    ],
    stages: [
      {
        id: "manual_preview",
        commandSurface: "gpao-t skill route <text>",
        allowedActions: ["select candidate packs", "show quality gates", "show authority boundary"],
        blockedActions: ["execute external action", "mutate live skill", "promote memory"],
      },
      {
        id: "dry_run_replay",
        commandSurface: "gpao-t skill readiness",
        allowedActions: ["validate manifest completeness", "run replay fixtures", "produce upgrade proposal"],
        blockedActions: ["claim live runtime effect without replay evidence"],
      },
      {
        id: "review_gate",
        commandSurface: "gpao-t growth gate <proposal-id|target>",
        allowedActions: ["inspect replay evidence", "inspect rollback plan", "record approval state"],
        blockedActions: ["apply OS rule mutation from proposal alone"],
      },
      {
        id: "live_apply_candidate",
        commandSurface: "future GPAO-T apply engine",
        allowedActions: ["apply approved reversible change", "write audit record", "observe after-effect"],
        blockedActions: ["irreversible or external change without explicit authority"],
      },
    ],
    automationBias: {
      broadCapture: "allowed",
      draftGeneration: "allowed",
      routeAndQualityInspection: "allowed",
      proposalGeneration: "allowed",
      liveSkillMutation: "approval_replay_rollback_required",
      durableMemoryPromotion: "approval_trace_required",
      externalSendDeployOrPaidAction: "blocked_until_explicit_approval",
    },
    completionRule:
      "A skill automation is not production-ready until it has a manual preview, dry-run or replay evidence, authority boundary, rollback path, and user-visible audit trace.",
  };
}

export function buildSkillReadinessReport() {
  const findings = [];
  for (const pack of BASE_SKILL_PACKS) {
    for (const field of REQUIRED_FIELDS) {
      if (!hasMeaningfulValue(pack[field])) {
        findings.push({
          severity: "P0",
          packId: pack.id,
          field,
          message: `Missing or empty required field: ${field}`,
        });
      }
    }
    if (!pack.qualityGates.some((gate) => gate.toLowerCase().includes("source"))
      && pack.category === "evidence") {
      findings.push({
        severity: "P1",
        packId: pack.id,
        field: "qualityGates",
        message: "Evidence pack must include source traceability in quality gates.",
      });
    }
    if (pack.category === "design"
      && !pack.qualityGates.some((gate) => gate.toLowerCase().includes("typography"))) {
      findings.push({
        severity: "P1",
        packId: pack.id,
        field: "qualityGates",
        message: "Design pack must include typography quality gate.",
      });
    }
  }

  return {
    schema: "gpao_t.skill_ecosystem_readiness.v0_1",
    status: findings.some((finding) => finding.severity === "P0")
      ? "blocked"
      : findings.length
      ? "review"
      : "ready",
    totalPacks: BASE_SKILL_PACKS.length,
    totalFindings: findings.length,
    findings,
    authorityBoundary: buildSkillManifestStandard().automationPolicy,
    manualFirstPlan: buildSkillManualFirstPlan().completionRule,
    nextSafeAction: findings.length
      ? "Fix manifest findings before connecting skill packs to runtime routing."
      : "Use skill route and replay fixtures to connect the registry to GPAO-T runtime packets.",
  };
}

export function routeSkillPacks({ request }) {
  const text = String(request || "").trim();
  if (!text) {
    return {
      schema: "gpao_t.skill_route.v0_1",
      status: "blocked",
      reason: "request_required",
      selectedPacks: [],
    };
  }

  const intentProfile = buildSkillIntentProfile({ request: text });
  const scored = BASE_SKILL_PACKS
    .map((pack) => ({
      pack,
      score: scorePack({ pack, text, intentProfile }),
      matchedSignals: pack.triggerSignals.filter((signal) => text.includes(signal)),
      intentReasons: explainPackFit({ pack, text, intentProfile }),
    }))
    .filter((item) => item.score > 0 || shouldForceCore({ pack: item.pack, intentProfile }))
    .toSorted((a, b) => b.score - a.score || b.pack.priority - a.pack.priority);
  const selected = scored.length ? scored.slice(0, 3) : [fallbackCoreSelection({ intentProfile })];

  return {
    schema: "gpao_t.skill_route.v0_1",
    routingBaseline: "intent_profile_task_packet_v0_1_1",
    status: "ready",
    request: text,
    intentProfile,
    selectedPacks: selected.map((item) => ({
      ...summarizeSkillPack(item.pack),
      score: item.score,
      matchedSignals: item.matchedSignals,
      intentReasons: item.intentReasons,
      routeRole: routeRoleFor({ pack: item.pack, intentProfile }),
      firstQualityGate: item.pack.qualityGates[0],
    })),
    routingPolicy: {
      currentRequestWins: true,
      skillSelectionFeedsTurnTaskPacket: true,
      useTcellPrincipleBeforeExecution: true,
      inferIntentBeforeKeywordMatch: true,
      runQualityGatesBeforeCompletion: true,
    },
    routeQuality: buildRouteQuality({ selected, intentProfile }),
    nextSafeAction: selected.length
      ? "Use the selected packs as a planning and quality-gate anchor before execution."
      : "No strong skill signal found; use core-thinking intake before selecting a domain pack.",
  };
}

export function buildSkillExecutionPlan({ request, skillRoute } = {}) {
  const route = skillRoute || routeSkillPacks({ request });
  if (!route || route.status !== "ready") {
    return {
      schema: "gpao_t.skill_execution_plan.v0_1",
      status: "blocked",
      reason: "ready_skill_route_required",
      route,
    };
  }

  const selected = route.selectedPacks
    .map((selectedPack) => BASE_SKILL_PACKS.find((pack) => pack.id === selectedPack.id))
    .filter(Boolean);

  return {
    schema: "gpao_t.skill_execution_plan.v0_1",
    executionBaseline: "skill_execution_contract_v0_1_2",
    status: "ready",
    request: route.request,
    routingBaseline: route.routingBaseline,
    intentProfile: route.intentProfile,
    executionMode: route.intentProfile.authoritySignals.length
      ? "local_preview_with_authority_gate"
      : "local_execution_plan",
    selectedSkills: selected.map((pack) => buildSkillExecutionUnit({ pack, route })),
    artifactContract: buildArtifactContract({ packs: selected, route }),
    qualityGateContract: buildQualityGateContract({ packs: selected }),
    authorityContract: buildSkillAuthorityContract({ packs: selected, route }),
    replayContract: buildSkillReplayContract({ packs: selected }),
    userFacingSummary: buildSkillExecutionSummary({ packs: selected, route }),
  };
}

export function buildSkillIntentProfile({ request }) {
  const text = String(request || "").trim();
  const primaryIntents = [];
  const qualityNeeds = [];
  const outputNeeds = [];
  const authoritySignals = [];

  addIf(primaryIntents, "build_or_modify_app", /웹앱|앱|사이트|화면|프론트|백엔드|구현|개발/.test(text));
  addIf(primaryIntents, "improve_visual_quality", /디자인|예쁘|시각|UI|UX|브랜드|랜딩|고급|프리미엄/.test(text));
  addIf(primaryIntents, "research_evidence", /리서치|검색|사례|최신|비교|근거|자료|공부|분석해봐/.test(text));
  addIf(primaryIntents, "document_artifact", /문서|보고서|제안서|매뉴얼|계획서|원고|글|정리/.test(text));
  addIf(primaryIntents, "data_insight", /데이터|엑셀|CSV|통계|지표|차트|수치/.test(text));
  addIf(primaryIntents, "korean_business", /한국|사업|세무|법률|공시|정부지원|사업계획|특허|건축/.test(text));
  addIf(primaryIntents, "owner_ops", /자영업|사장님|리뷰|예약|문의|스마트스토어|쇼핑몰|고객응대|반복 업무|자동화 후보/.test(text));
  addIf(primaryIntents, "self_growth_or_governance", /자가성장|업그레이드|자동화|승인|리포트|루프|개선|가버넌스/.test(text));
  addIf(primaryIntents, "decision_or_plan", /뭐부터|어떻게|방향|판단|계획|우선순위|진행|정리/.test(text));
  addIf(primaryIntents, "human_response_quality", /말귀|응답|답변|질문|초안|출력|추측|검색 안|모호|바로 써/.test(text));

  addIf(qualityNeeds, "visual_finish", /디자인|예쁘|시각|UI|UX|브랜드|고급|프리미엄/.test(text));
  addIf(qualityNeeds, "source_grounding", /리서치|근거|자료|최신|공식|확인|비교/.test(text));
  addIf(qualityNeeds, "practical_execution", /실전|현실|쓸모|사용자|작동|구현|진행|완성/.test(text));
  addIf(qualityNeeds, "owner_operator_fit", /자영업|사장님|리뷰|예약|문의|스마트스토어|쇼핑몰|고객응대/.test(text));
  addIf(qualityNeeds, "verification", /검증|테스트|확인|품질|정확|성능/.test(text));
  addIf(qualityNeeds, "continuity", /이전|아까|이어|맥락|흐름|계속/.test(text));
  addIf(qualityNeeds, "safety_governance", /승인|보안|법률|금융|삭제|배포|외부|권한/.test(text));
  addIf(qualityNeeds, "response_fit", /말귀|응답|답변|질문|초안|출력|추측|검색 안|모호|바로 써/.test(text));

  addIf(outputNeeds, "working_app", /웹앱|앱|사이트|구현|개발/.test(text));
  addIf(outputNeeds, "design_spec", /디자인|UI|UX|브랜드|화면|랜딩/.test(text));
  addIf(outputNeeds, "research_brief", /리서치|사례|최신|비교|근거|자료/.test(text));
  addIf(outputNeeds, "document", /문서|보고서|제안서|매뉴얼|계획서|원고|글/.test(text));
  addIf(outputNeeds, "decision_plan", /뭐부터|방향|판단|계획|정리|진행/.test(text));
  addIf(outputNeeds, "growth_proposal", /업그레이드|자가성장|개선|리포트|루프/.test(text));
  addIf(outputNeeds, "automation_candidate", /자영업|사장님|반복 업무|리뷰|예약 문의|고객 문의|스마트스토어|쇼핑몰|고객응대/.test(text));
  addIf(outputNeeds, "usable_answer", /말귀|응답|답변|질문|초안|출력|추측|검색 안|모호|바로 써/.test(text));

  addIf(authoritySignals, "external_or_public_action", /배포|공개|전송|메일|텔레그램|외부|publish|deploy/.test(text));
  addIf(authoritySignals, "sensitive_domain", /보안|법률|금융|세무|삭제|토큰|secret|oauth/.test(text));
  addIf(authoritySignals, "approval_boundary", /승인|권한|경계|가버넌스|통제/.test(text));

  const ambiguity = /이거|그거|그럼|어때|좋아|진행|계속|해줘/.test(text) && text.length <= 80
    ? "high"
    : primaryIntents.length ? "low" : "medium";

  return {
    schema: "gpao_t.skill_intent_profile.v0_1",
    routingBaseline: "intent_profile_before_keyword_match_v0_1_1",
    status: "ready",
    primaryIntents: primaryIntents.length ? primaryIntents : ["general_help"],
    qualityNeeds,
    outputNeeds: outputNeeds.length ? outputNeeds : ["next_action"],
    authoritySignals,
    ambiguity,
    userFacingQualityRule:
      "Route skills by intended user outcome, output artifact, quality need, and authority boundary before keyword count.",
  };
}

function summarizeSkillPack(pack) {
  return {
    id: pack.id,
    category: pack.category,
    priority: pack.priority,
    title: pack.title,
    targetUserProblem: pack.targetUserProblem,
    tcellPrinciple: pack.tcellPrinciple,
    outputArtifacts: pack.outputArtifacts,
    authorityBoundary: pack.authorityBoundary,
  };
}

function buildSkillExecutionUnit({ pack, route }) {
  const selected = route.selectedPacks.find((item) => item.id === pack.id);
  return {
    id: pack.id,
    title: pack.title,
    routeRole: selected?.routeRole || "supporting_skill",
    tcellPrinciple: pack.tcellPrinciple,
    executionSteps: [
      {
        id: "understand_user_outcome",
        action: `Use this skill for: ${pack.targetUserProblem}`,
      },
      {
        id: "apply_research_protocol",
        action: pack.researchProtocol[0],
      },
      {
        id: "produce_artifact",
        action: `Produce one or more artifacts: ${pack.outputArtifacts.join(", ")}`,
      },
      {
        id: "run_first_quality_gate",
        action: pack.qualityGates[0],
      },
    ],
    requiredQualityGates: pack.qualityGates,
    outputArtifacts: pack.outputArtifacts,
    authorityBoundary: pack.authorityBoundary,
    growthSignals: pack.growthSignals,
  };
}

function buildArtifactContract({ packs, route }) {
  const artifacts = [...new Set(packs.flatMap((pack) => pack.outputArtifacts))];
  return {
    status: artifacts.length ? "ready" : "review",
    intendedOutputs: route.intentProfile.outputNeeds,
    candidateArtifacts: artifacts,
    rule: "The final answer or local work plan should name the concrete artifact it is producing instead of only saying which skill was selected.",
  };
}

function buildQualityGateContract({ packs }) {
  const gates = [...new Set(packs.flatMap((pack) => pack.qualityGates))];
  return {
    status: gates.length ? "ready" : "blocked",
    gates,
    completionRule:
      "A skill-assisted output cannot be treated as finished until the relevant quality gates have been checked or explicitly marked not applicable.",
  };
}

function buildSkillAuthorityContract({ packs, route }) {
  const boundaries = packs.map((pack) => ({
    skillPackId: pack.id,
    authorityBoundary: pack.authorityBoundary,
  }));
  return {
    status: route.intentProfile.authoritySignals.length ? "review_required" : "ready",
    authoritySignals: route.intentProfile.authoritySignals,
    boundaries,
    liveActionRule:
      "Selected skills may draft, inspect, and plan locally; durable memory promotion, live skill mutation, external send, deployment, public release, secrets, money, legal/financial/security action, and destructive work remain approval-gated.",
  };
}

function buildSkillReplayContract({ packs }) {
  return {
    status: "ready",
    replayCases: [...new Set(packs.flatMap((pack) => pack.replayCases))],
    growthSignals: [...new Set(packs.flatMap((pack) => pack.growthSignals))],
    rule: "If a selected skill repeatedly fails a replay case or quality gate, create a growth proposal instead of silently weakening the standard.",
  };
}

function buildSkillExecutionSummary({ packs, route }) {
  const roles = route.selectedPacks.map((pack) => `${pack.id}:${pack.routeRole}`);
  return {
    language: "ko",
    summary:
      "사용자 의도에 맞춰 선택된 스킬팩을 실행 절차, 산출물, 품질 게이트, 권한 경계로 풀어낸 로컬 실행 계획입니다.",
    selectedSkillRoles: roles,
    nextSafeAction: route.intentProfile.authoritySignals.length
      ? "권한 경계가 있으므로 로컬 초안/검증 계획까지만 실행하고 실제 적용은 승인 뒤로 둡니다."
      : "선택된 스킬팩의 실행 단계와 품질 게이트를 적용해 로컬 작업을 진행합니다.",
  };
}

function scorePack({ pack, text, intentProfile }) {
  const signalScore = pack.triggerSignals.reduce((score, signal) =>
    text.includes(signal) ? score + 10 : score, 0);
  const categoryScore = text.includes(pack.category) ? 2 : 0;
  const designQualityScore = pack.category === "design" && hasDesignQualityIntent(text) ? 25 : 0;
  const intentScore = scoreIntentFit({ pack, intentProfile });
  const outputScore = scoreOutputFit({ pack, intentProfile });
  const qualityScore = scoreQualityFit({ pack, intentProfile });
  const authorityScore = scoreAuthorityFit({ pack, intentProfile });
  const titleScore = pack.title
    .toLowerCase()
    .split(/\s+/)
    .reduce((score, token) => token && text.toLowerCase().includes(token) ? score + 1 : score, 0);
  return signalScore + categoryScore + designQualityScore + intentScore + outputScore + qualityScore + authorityScore + titleScore;
}

function scoreIntentFit({ pack, intentProfile }) {
  const map = {
    "gpao-human-response-kernel-pack": ["human_response_quality"],
    "gpao-core-thinking-pack": ["decision_or_plan", "general_help"],
    "gpao-research-evidence-pack": ["research_evidence"],
    "gpao-document-output-pack": ["document_artifact"],
    "gpao-visual-design-pack": ["improve_visual_quality"],
    "gpao-webapp-builder-pack": ["build_or_modify_app"],
    "gpao-korean-business-pack": ["korean_business"],
    "gpao-owner-ops-pack": ["owner_ops"],
    "gpao-data-insight-pack": ["data_insight"],
    "gpao-growth-governance-pack": ["self_growth_or_governance"],
  };
  return (map[pack.id] || []).reduce((score, intent) =>
    intentProfile.primaryIntents.includes(intent) ? score + 28 : score, 0);
}

function scoreOutputFit({ pack, intentProfile }) {
  const outputs = new Set(intentProfile.outputNeeds);
  const outputText = pack.outputArtifacts.join(" ");
  let score = 0;
  if (outputs.has("working_app") && /working_app|implementation_plan|test_report/.test(outputText)) score += 18;
  if (outputs.has("design_spec") && /design_direction|ui_spec|style_tokens|visual/.test(outputText)) score += 18;
  if (outputs.has("research_brief") && /source_registry|evidence_matrix|claim_map|recommendation/.test(outputText)) score += 18;
  if (outputs.has("document") && /markdown_doc|report|proposal|manual|brief/.test(outputText)) score += 18;
  if (outputs.has("decision_plan") && /decision_brief|task_plan|next_action/.test(outputText)) score += 18;
  if (outputs.has("growth_proposal") && /growth_report|upgrade_proposal|approval_card|audit_record/.test(outputText)) score += 18;
  if (outputs.has("automation_candidate") && /automation_candidates|workflow_preview|reply_drafts|local_record|effect_replay_summary/.test(outputText)) score += 22;
  if (outputs.has("usable_answer") && /usable_answer|artifact_draft|clarifying_question|natural_closeout/.test(outputText)) score += 18;
  return score;
}

function scoreQualityFit({ pack, intentProfile }) {
  const needs = new Set(intentProfile.qualityNeeds);
  let score = 0;
  if (needs.has("visual_finish") && pack.category === "design") score += 22;
  if (needs.has("source_grounding") && pack.category === "evidence") score += 22;
  if (needs.has("practical_execution")
    && ["builder", "core", "domain"].includes(pack.category)
    && pack.id !== "gpao-human-response-kernel-pack") score += 12;
  if (needs.has("verification") && ["builder", "governance", "evidence"].includes(pack.category)) score += 12;
  if (needs.has("continuity") && pack.category === "core" && pack.id !== "gpao-human-response-kernel-pack") score += 12;
  if (needs.has("safety_governance") && pack.category === "governance") score += 18;
  if (needs.has("response_fit") && pack.id === "gpao-human-response-kernel-pack") score += 24;
  if (needs.has("owner_operator_fit") && pack.id === "gpao-owner-ops-pack") score += 28;
  return score;
}

function scoreAuthorityFit({ pack, intentProfile }) {
  const hasGovernanceIntent = intentProfile.primaryIntents.includes("self_growth_or_governance");
  if (!intentProfile.authoritySignals.length && !hasGovernanceIntent) return 0;
  if (pack.category === "governance") return 20;
  if (pack.category === "domain" && intentProfile.authoritySignals.includes("sensitive_domain")) return 10;
  return 0;
}

function explainPackFit({ pack, text, intentProfile }) {
  const reasons = [];
  if (pack.triggerSignals.some((signal) => text.includes(signal))) reasons.push("matched_trigger_signal");
  if (scoreIntentFit({ pack, intentProfile }) > 0) reasons.push("matched_primary_intent");
  if (scoreOutputFit({ pack, intentProfile }) > 0) reasons.push("matched_output_artifact");
  if (scoreQualityFit({ pack, intentProfile }) > 0) reasons.push("matched_quality_need");
  if (scoreAuthorityFit({ pack, intentProfile }) > 0) reasons.push("matched_authority_boundary");
  if (shouldForceCore({ pack, intentProfile })) reasons.push("forced_core_for_ambiguity_or_continuity");
  return reasons;
}

function routeRoleFor({ pack, intentProfile }) {
  if (pack.id === "gpao-human-response-kernel-pack") return "response_kernel";
  if (pack.category === "core" && intentProfile.ambiguity !== "low") return "intent_recovery";
  if (pack.category === "governance"
    && (intentProfile.authoritySignals.length
      || intentProfile.qualityNeeds.includes("safety_governance")
      || intentProfile.primaryIntents.includes("self_growth_or_governance"))) {
    return "authority_guard";
  }
  if (pack.category === "design") return "quality_anchor";
  if (pack.category === "evidence") return "evidence_anchor";
  if (pack.category === "builder") return "execution_anchor";
  return "supporting_skill";
}

function buildRouteQuality({ selected, intentProfile }) {
  const reasons = new Set(selected.flatMap((item) => item.intentReasons));
  const hasPrimaryIntentMatch = selected.some((item) => scoreIntentFit({ pack: item.pack, intentProfile }) > 0);
  return {
    status: hasPrimaryIntentMatch || selected.length ? "ready" : "review",
    intentCoverage: hasPrimaryIntentMatch ? "covered" : "fallback",
    ambiguity: intentProfile.ambiguity,
    qualityNeedsCovered: [...new Set(selected.flatMap((item) => item.pack.category))],
    routeSignals: [...reasons],
    userBenefit:
      "The route explains why each skill was selected, so GPAO-T can improve user-facing quality instead of silently matching keywords.",
  };
}

function shouldForceCore({ pack, intentProfile }) {
  return pack.id === "gpao-core-thinking-pack" && intentProfile.ambiguity !== "low";
}

function fallbackCoreSelection({ intentProfile }) {
  const pack = BASE_SKILL_PACKS.find((item) => item.id === "gpao-core-thinking-pack");
  return {
    pack,
    score: 1,
    matchedSignals: [],
    intentReasons: ["fallback_core_intake", intentProfile.ambiguity === "high" ? "high_ambiguity" : "no_strong_skill_signal"],
  };
}

function buildCandidatePhaseSummary(candidates) {
  return ["phase-1", "phase-2", "phase-3"].map((phase) => ({
    phase,
    total: candidates.filter((candidate) => candidate.phase === phase).length,
    seedPacks: candidates.filter(
      (candidate) => candidate.phase === phase && candidate.productionStatus === "seed_pack_exists",
    ).length,
    productionPacks: candidates.filter(
      (candidate) => candidate.phase === phase && candidate.productionStatus === "production_pack_exists",
    ).length,
    plannedCandidates: candidates.filter(
      (candidate) => candidate.phase === phase && candidate.productionStatus === "planned_candidate",
    ).length,
  }));
}

function buildCandidateCategorySummary(candidates) {
  return [...new Set(candidates.map((candidate) => candidate.category))]
    .sort()
    .map((category) => ({
      category,
      total: candidates.filter((candidate) => candidate.category === category).length,
    }));
}

function summarizeSkillCandidate(candidate) {
  return {
    id: candidate.id,
    category: candidate.category,
    tier: candidate.tier,
    phase: candidate.phase,
    title: candidate.title,
    productionStatus: candidate.productionStatus,
    userProblem: candidate.userProblem,
    tcellFocus: candidate.tcellFocus,
    buildReason: candidate.buildReason,
    dependencies: candidate.dependencies,
    shouldBuildWith: candidate.shouldBuildWith,
    requiredProof: candidate.requiredProof,
  };
}

function buildCandidateProductionChecklist(candidate) {
  const manifestStatus = candidate.productionStatus === "production_pack_exists"
    ? "present_production"
    : candidate.productionStatus === "seed_pack_exists"
    ? "present_seed"
    : "needed";

  return [
    {
      item: "manifest",
      status: manifestStatus,
    },
    {
      item: "route_fixture",
      status: "needed_for_production_pack",
    },
    {
      item: "execution_artifact_contract",
      status: "needed_for_production_pack",
    },
    {
      item: "quality_gate_replay",
      status: "needed_for_production_pack",
    },
    {
      item: "growth_signal",
      status: candidate.requiredProof.length ? "defined_candidate" : "needed",
    },
    {
      item: "authority_boundary",
      status: "required_before_live_use",
    },
  ];
}

function buildProducedSkillStatus(candidate) {
  const pack = BASE_SKILL_PACKS.find((item) => item.id === candidate.id);
  const routeProbe = pack
    ? routeSkillPacks({
      request: `${candidate.title} ${candidate.userProblem} ${candidate.buildReason}`,
    })
    : null;
  const executionPlan = routeProbe?.status === "ready"
    ? buildSkillExecutionPlan({ skillRoute: routeProbe })
    : null;
  const selectedIds = routeProbe?.selectedPacks?.map((item) => item.id) || [];
  const productionChecks = [
    {
      id: "registered_manifest",
      status: pack ? "pass" : "missing",
      message: pack
        ? "Skill pack is present in the executable registry."
        : "Candidate is not yet present in the executable registry.",
    },
    {
      id: "routeable",
      status: selectedIds.includes(candidate.id) ? "pass" : "review",
      message: selectedIds.includes(candidate.id)
        ? "Skill pack can be selected by the router from its own production probe."
        : "Skill pack is registered but not selected by its own production probe.",
    },
    {
      id: "execution_contract",
      status: executionPlan?.selectedSkills?.some((skill) => skill.id === candidate.id) ? "pass" : "review",
      message: "Selected skill must expand into execution steps and artifacts.",
    },
    {
      id: "quality_gates",
      status: pack?.qualityGates?.length ? "pass" : "missing",
      message: "Skill pack must include quality gates before completion claims.",
    },
    {
      id: "replay_cases",
      status: pack?.replayCases?.length ? "pass" : "missing",
      message: "Skill pack must include replay cases before promotion.",
    },
    {
      id: "growth_signals",
      status: pack?.growthSignals?.length ? "pass" : "missing",
      message: "Skill pack must emit growth signals from repeated failure or use.",
    },
    {
      id: "authority_boundary",
      status: pack?.authorityBoundary && Object.keys(pack.authorityBoundary).length ? "pass" : "missing",
      message: "Skill pack must state local automation and approval boundaries.",
    },
  ];

  return {
    id: candidate.id,
    title: candidate.title,
    phase: candidate.phase,
    category: candidate.category,
    tier: candidate.tier,
    productionStatus: candidate.productionStatus,
    registryStatus: pack ? "registered" : "not_registered",
    selectedByOwnProbe: selectedIds.includes(candidate.id),
    tcellFocus: candidate.tcellFocus,
    outputArtifacts: pack?.outputArtifacts || [],
    routeProbe: routeProbe
      ? {
        status: routeProbe.status,
        selectedIds,
        routeQuality: routeProbe.routeQuality,
      }
      : null,
    productionChecks,
  };
}

function compareSkillCandidate(a, b) {
  const phaseOrder = { "phase-1": 1, "phase-2": 2, "phase-3": 3 };
  const tierOrder = {
    foundation: 1,
    quality: 2,
    experience: 3,
    execution: 4,
    artifact: 5,
    domain: 6,
    connector: 7,
    growth: 8,
    daily: 9,
    ux: 10,
    learning: 11,
    theory: 12,
    content: 13,
    automation: 14,
    ops: 15,
  };
  return (phaseOrder[a.phase] || 99) - (phaseOrder[b.phase] || 99)
    || (tierOrder[a.tier] || 99) - (tierOrder[b.tier] || 99)
    || a.id.localeCompare(b.id);
}

function addIf(list, value, condition) {
  if (condition) list.push(value);
}

function hasDesignQualityIntent(text) {
  const designSignals = ["디자인", "UI", "UX", "시각", "브랜드", "랜딩", "예쁘게"];
  const buildSurfaceSignals = ["웹앱", "앱", "사이트", "화면", "대시보드", "인터페이스"];
  return designSignals.some((signal) => text.includes(signal))
    && buildSurfaceSignals.some((signal) => text.includes(signal));
}

function hasMeaningfulValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (value && typeof value === "object") {
    return Object.keys(value).length > 0;
  }
  return Boolean(value);
}
