const BASE_SKILL_PACKS = [
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
    documentationContract: {
      userReadableBaseline: "docs/04-skill-ecosystem/GPAO-T-BASE-SKILL-PACKS-ko.md",
      implementationTruthSource: "src/core/skill-ecosystem.js",
      rule: "Readable docs explain the product baseline; this module remains the executable registry contract.",
    },
    integrationContract: {
      registrySurface: "gpao-t skill packs",
      routerSurface: "gpao-t skill route <text>",
      readinessSurface: "gpao-t skill readiness",
      runtimeHook:
        "GPAO-T turn kernel calls the registry to select skill packs before model/tool routing.",
      futureRuntimeHook:
        "GPAO-T turn kernel calls the registry to select skill packs before model/tool routing.",
    },
    nextBuildOrder: [
      "Lock manifest standard and base pack registry.",
      "Add per-pack scenario fixtures.",
      "Expand per-pack replay fixtures now that intent-profile routing is connected to turn-kernel task packets.",
      "Add skill execution adapters after GPAO-T UI/runtime authority contracts are stable.",
      "Let growth governance propose skill updates from replay evidence.",
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
  addIf(primaryIntents, "self_growth_or_governance", /자가성장|업그레이드|자동화|승인|리포트|루프|개선|가버넌스/.test(text));
  addIf(primaryIntents, "decision_or_plan", /뭐부터|어떻게|방향|판단|계획|우선순위|진행|정리/.test(text));

  addIf(qualityNeeds, "visual_finish", /디자인|예쁘|시각|UI|UX|브랜드|고급|프리미엄/.test(text));
  addIf(qualityNeeds, "source_grounding", /리서치|근거|자료|최신|공식|확인|비교/.test(text));
  addIf(qualityNeeds, "practical_execution", /실전|현실|쓸모|사용자|작동|구현|진행|완성/.test(text));
  addIf(qualityNeeds, "verification", /검증|테스트|확인|품질|정확|성능/.test(text));
  addIf(qualityNeeds, "continuity", /이전|아까|이어|맥락|흐름|계속/.test(text));
  addIf(qualityNeeds, "safety_governance", /승인|보안|법률|금융|삭제|배포|외부|권한/.test(text));

  addIf(outputNeeds, "working_app", /웹앱|앱|사이트|구현|개발/.test(text));
  addIf(outputNeeds, "design_spec", /디자인|UI|UX|브랜드|화면|랜딩/.test(text));
  addIf(outputNeeds, "research_brief", /리서치|사례|최신|비교|근거|자료/.test(text));
  addIf(outputNeeds, "document", /문서|보고서|제안서|매뉴얼|계획서|원고|글/.test(text));
  addIf(outputNeeds, "decision_plan", /뭐부터|방향|판단|계획|정리|진행/.test(text));
  addIf(outputNeeds, "growth_proposal", /업그레이드|자가성장|개선|리포트|루프/.test(text));

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
    "gpao-core-thinking-pack": ["decision_or_plan", "general_help"],
    "gpao-research-evidence-pack": ["research_evidence"],
    "gpao-document-output-pack": ["document_artifact"],
    "gpao-visual-design-pack": ["improve_visual_quality"],
    "gpao-webapp-builder-pack": ["build_or_modify_app"],
    "gpao-korean-business-pack": ["korean_business"],
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
  return score;
}

function scoreQualityFit({ pack, intentProfile }) {
  const needs = new Set(intentProfile.qualityNeeds);
  let score = 0;
  if (needs.has("visual_finish") && pack.category === "design") score += 22;
  if (needs.has("source_grounding") && pack.category === "evidence") score += 22;
  if (needs.has("practical_execution") && ["builder", "core", "domain"].includes(pack.category)) score += 12;
  if (needs.has("verification") && ["builder", "governance", "evidence"].includes(pack.category)) score += 12;
  if (needs.has("continuity") && pack.category === "core") score += 12;
  if (needs.has("safety_governance") && pack.category === "governance") score += 18;
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
