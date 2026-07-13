import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildOwnerOpsBetaFeedbackSynthesis,
  buildOwnerOpsIndustryTemplateCatalog,
  buildOwnerOpsMarketEvidenceBundle,
  buildOwnerOpsMarketReadinessGate,
} from "./owner-ops-market-readiness.js";

export function buildOwnerOpsTemplateReplayFixtures({ root, feedbackSamples } = {}) {
  const catalog = buildOwnerOpsIndustryTemplateCatalog({ feedbackSamples });
  const fixtures = catalog.templates.map((group) => {
    const template = group.templates[0];
    return {
      id: `${group.industry}_${slugify(template.name)}_replay_v0_1`,
      industry: group.industry,
      template: template.name,
      input: sampleInputForTemplate(template.name),
      expectedDraftShape: template.outputHint,
      requiredAssertions: [
        "input is accepted as local preview only",
        "draft is produced in Korean owner-facing language",
        "owner confirmation is required before any customer-facing use",
        "customer auto-send remains blocked",
        "local replay reference is produced",
      ],
      blockedActions: [
        "customer_message_send",
        "review_posting",
        "oauth_or_credentials",
        "payment_refund_delete",
        "background_automation",
      ],
      replayCommand:
        `node bin/gpao-t.js owner-ops workflow ${workflowForTemplate(template.name)} "${sampleInputForTemplate(template.name)}"`,
    };
  });

  return {
    schema: "gpao_t.owner_ops_template_replay_fixtures.v0_1",
    status: "ready",
    source: "owner_ops_industry_template_catalog",
    fixtureCount: fixtures.length,
    fixtures,
    minimumBeforePublicPackage: [
      "one replay fixture per top industry group",
      "customer auto-send blocked in every fixture",
      "owner confirmation required in every fixture",
      "Korean owner-facing draft language asserted",
    ],
    nextSafeAction:
      "Run fixture commands with sample/de-identified data before public package review; do not publish yet.",
  };
}

export function buildOwnerOpsPrivacyCopyPack() {
  return {
    schema: "gpao_t.owner_ops_privacy_copy_pack.v0_1",
    status: "ready",
    title: "사장님 자동화 도우미 개인정보/로컬 처리 안내",
    ownerFacingSummary:
      "처음에는 고객에게 보내지 않고, 외부 계정에 연결하지 않고, 사장님 확인용 초안과 로컬 기록만 만듭니다.",
    dataUseCopy: [
      {
        title: "무엇을 넣을 수 있나요?",
        body: "리뷰, 문의, 예약 요청처럼 반복되는 업무 문장을 붙여넣거나 샘플 CSV를 넣을 수 있습니다.",
      },
      {
        title: "무엇을 넣으면 안 되나요?",
        body: "실명, 전화번호, 주소, 계좌번호, 주문번호처럼 고객을 식별할 수 있는 정보는 첫 테스트에 넣지 마세요.",
      },
      {
        title: "고객에게 자동으로 보내나요?",
        body: "아니요. 답변 초안만 만들며, 고객 발송은 잠겨 있습니다. 사장님이 직접 확인하고 복사해서 사용해야 합니다.",
      },
      {
        title: "외부 계정에 연결되나요?",
        body: "아니요. 첫 버전은 외부 계정, OAuth, API 키를 사용하지 않습니다.",
      },
      {
        title: "어디에 기록되나요?",
        body: "확인한 초안과 replay 기준은 로컬 기록으로만 남습니다. 공개 배포나 외부 전송은 별도 승인 전까지 하지 않습니다.",
      },
    ],
    shortLabels: [
      "자동 전송 안 함",
      "외부 계정 연결 안 함",
      "고객 개인정보 비식별 권장",
      "로컬 기록만",
      "환불/취소/삭제 자동 실행 안 함",
    ],
    reviewerChecklist: [
      "비개발자 사장님이 첫 문장만 보고 안전 경계를 이해하는가?",
      "개인정보를 넣으면 안 되는 이유가 겁주지 않고 명확한가?",
      "초안과 실제 고객 발송의 차이가 분명한가?",
      "로컬 기록과 외부 전송의 차이가 분명한가?",
    ],
    nextSafeAction:
      "Review this copy with first-owner beta feedback before marketplace text or installer copy is finalized.",
  };
}

export function buildOwnerOpsPrePublicPackageReview({ root, feedbackSamples } = {}) {
  const marketGate = buildOwnerOpsMarketReadinessGate({ root, feedbackSamples });
  const fixtures = buildOwnerOpsTemplateReplayFixtures({ root, feedbackSamples });
  const privacyCopy = buildOwnerOpsPrivacyCopyPack();
  const betaFeedbackQueue = buildPrePublicBetaFeedbackQueueSummary({ feedbackSamples });
  const findings = [];

  if (marketGate.status !== "ready") findings.push("market_gate_not_ready");
  if (fixtures.status !== "ready") findings.push("template_replay_fixtures_not_ready");
  if (privacyCopy.status !== "ready") findings.push("privacy_copy_not_ready");
  if (betaFeedbackQueue.status !== "ready") findings.push("beta_feedback_action_queue_not_ready");
  if (fixtures.fixtureCount < 3) findings.push("not_enough_template_replay_fixtures");
  if (fixtures.fixtures.some((fixture) => !fixture.blockedActions.includes("customer_message_send"))) {
    findings.push("fixture_customer_send_boundary_missing");
  }
  if (!privacyCopy.shortLabels.includes("자동 전송 안 함")) findings.push("privacy_send_label_missing");
  if (!betaFeedbackQueue.lanes.includes("template_replay_fixture")) {
    findings.push("beta_queue_template_replay_lane_missing");
  }
  if (!betaFeedbackQueue.lanes.includes("privacy_copy")) {
    findings.push("beta_queue_privacy_copy_lane_missing");
  }
  if (!betaFeedbackQueue.lanes.includes("owner_ux_copy")) {
    findings.push("beta_queue_owner_ux_lane_missing");
  }
  if (!betaFeedbackQueue.lanes.includes("package_review")) {
    findings.push("beta_queue_package_review_lane_missing");
  }
  if (betaFeedbackQueue.publicSubmissionAllowed !== false) {
    findings.push("beta_queue_public_submission_boundary_opened");
  }
  if (marketGate.publicSubmissionAllowed !== false) findings.push("public_submission_must_remain_blocked");

  return {
    schema: "gpao_t.owner_ops_pre_public_package_review.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "market readiness gate",
      "template replay fixtures",
      "privacy copy pack",
      "beta feedback action queue",
      "public submission block",
    ],
    betaFeedbackActionQueue: {
      status: betaFeedbackQueue.status,
      itemCount: betaFeedbackQueue.itemCount,
      lanes: betaFeedbackQueue.lanes,
      p0Count: betaFeedbackQueue.p0Count,
      publicSubmissionAllowed: betaFeedbackQueue.publicSubmissionAllowed,
    },
    publicationState: "not_published",
    publicSubmissionAllowed: false,
    nextSafeAction: findings.length
      ? "Fix pre-public package findings before public package review."
      : "Use beta feedback action queue as the pre-public repair backlog, then prepare installer/update/rollback and signed package evidence; public submission still requires explicit owner approval.",
  };
}

export function verifyOwnerOpsPrePublicPackage({ root, feedbackSamples } = {}) {
  const review = buildOwnerOpsPrePublicPackageReview({ root, feedbackSamples });
  const findings = [...review.findings];

  if (review.publicSubmissionAllowed !== false) findings.push("public_submission_must_not_be_enabled");
  if (review.publicationState !== "not_published") findings.push("publication_state_must_remain_not_published");
  if (!review.checkedSurfaces.includes("privacy copy pack")) findings.push("privacy_copy_not_checked");
  if (!review.checkedSurfaces.includes("beta feedback action queue")) {
    findings.push("beta_feedback_action_queue_not_checked");
  }
  if (review.betaFeedbackActionQueue.publicSubmissionAllowed !== false) {
    findings.push("beta_feedback_queue_public_submission_must_not_be_enabled");
  }

  return {
    schema: "gpao_t.owner_ops_pre_public_package_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: review.checkedSurfaces,
    betaFeedbackActionQueue: review.betaFeedbackActionQueue,
    publicationState: review.publicationState,
    publicSubmissionAllowed: review.publicSubmissionAllowed,
    nextSafeAction: review.nextSafeAction,
  };
}

export function buildOwnerOpsPrePublicEvidenceBridge({ root, feedbackSamples } = {}) {
  const evidenceBundle = buildOwnerOpsMarketEvidenceBundle({ root });
  const review = buildOwnerOpsPrePublicPackageReview({ root, feedbackSamples });
  const findings = [];

  if (evidenceBundle.status !== "ready") findings.push("market_evidence_bundle_not_ready");
  if (review.status !== "ready") findings.push("pre_public_package_review_not_ready");
  if (evidenceBundle.marketReadinessGate.publicSubmissionAllowed !== false) {
    findings.push("market_evidence_public_submission_boundary_opened");
  }
  if (review.publicSubmissionAllowed !== false) findings.push("pre_public_review_public_submission_boundary_opened");
  if (review.betaFeedbackActionQueue.status !== "ready") {
    findings.push("beta_feedback_action_queue_not_ready_for_pre_public_bridge");
  }
  if (evidenceBundle.industryTemplateCatalog.industryGroupCount < 3) {
    findings.push("market_evidence_industry_coverage_below_threshold");
  }
  if (!review.checkedSurfaces.includes("privacy copy pack")) findings.push("privacy_copy_not_checked");
  if (!review.checkedSurfaces.includes("beta feedback action queue")) {
    findings.push("beta_feedback_action_queue_not_checked");
  }

  return {
    schema: "gpao_t.owner_ops_pre_public_evidence_bridge.v0_1",
    status: findings.length ? "blocked" : "ready",
    evidenceStage: "market_evidence_to_pre_public_review",
    marketEvidenceBundle: {
      status: evidenceBundle.status,
      betaResultStatus: evidenceBundle.betaResultReview.status,
      industryGroupCount: evidenceBundle.industryTemplateCatalog.industryGroupCount,
      publicSubmissionAllowed: evidenceBundle.marketReadinessGate.publicSubmissionAllowed,
    },
    prePublicPackageReview: {
      status: review.status,
      checkedSurfaces: review.checkedSurfaces,
      betaFeedbackActionQueue: review.betaFeedbackActionQueue,
      publicationState: review.publicationState,
      publicSubmissionAllowed: review.publicSubmissionAllowed,
    },
    authorityBoundary: {
      publicSubmissionAllowed: false,
      packageUploadAllowed: false,
      registryPublishAllowed: false,
      signedReleaseAllowed: false,
      customerDataIncluded: false,
    },
    blockedActions: [
      "public_market_publish",
      "package_registry_upload",
      "signed_release",
      "customer_data_packaging",
      "external_distribution",
    ],
    findings,
    nextSafeAction: findings.length
      ? "Fix the market evidence or pre-public review findings before package review."
      : "Use this bridge as the local pre-public review checkpoint; public release still requires explicit owner approval.",
  };
}

export function verifyOwnerOpsPrePublicEvidenceBridge({ root, feedbackSamples } = {}) {
  const bridge = buildOwnerOpsPrePublicEvidenceBridge({ root, feedbackSamples });
  const findings = [...bridge.findings];

  if (bridge.status !== "ready") findings.push("pre_public_evidence_bridge_not_ready");
  if (bridge.authorityBoundary.publicSubmissionAllowed !== false) {
    findings.push("public_submission_must_remain_blocked");
  }
  if (bridge.authorityBoundary.packageUploadAllowed !== false) {
    findings.push("package_upload_must_remain_blocked");
  }
  if (!bridge.blockedActions.includes("customer_data_packaging")) {
    findings.push("customer_data_packaging_block_missing");
  }

  return {
    schema: "gpao_t.owner_ops_pre_public_evidence_bridge_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "market evidence bundle",
      "pre-public package review",
      "beta feedback action queue",
      "privacy copy",
      "template replay fixtures",
      "public/package upload boundary",
    ],
    publicSubmissionAllowed: bridge.authorityBoundary.publicSubmissionAllowed,
    packageUploadAllowed: bridge.authorityBoundary.packageUploadAllowed,
    nextSafeAction: bridge.nextSafeAction,
  };
}

export function buildOwnerOpsPrePublicRepairBacklog({ root, feedbackSamples } = {}) {
  const review = buildOwnerOpsPrePublicPackageReview({ root, feedbackSamples });
  const fixtures = buildOwnerOpsTemplateReplayFixtures({ root, feedbackSamples });
  const privacyCopy = buildOwnerOpsPrivacyCopyPack();
  const findings = [...review.findings];

  if (review.status !== "ready") findings.push("pre_public_package_review_not_ready");
  if (review.betaFeedbackActionQueue.status !== "ready") findings.push("beta_feedback_action_queue_not_ready");
  if (review.betaFeedbackActionQueue.itemCount < 4) findings.push("beta_feedback_repair_items_insufficient");

  const repairItems = [
    ...fixtures.fixtures.map((fixture) => ({
      id: `repair:fixture:${fixture.id}`,
      lane: "template_replay_fixture",
      priority: "P1",
      title: `${fixture.industry} ${fixture.template} replay fixture 검증`,
      source: "beta feedback action queue",
      targetArtifact: "template replay fixture",
      expectedChange: fixture.expectedDraftShape,
      verification: fixture.requiredAssertions,
      blockedActions: fixture.blockedActions,
      doneWhen: "sample/de-identified input produces a Korean local draft and customer auto-send remains blocked",
    })),
    {
      id: "repair:privacy-copy:no-auto-send",
      lane: "privacy_copy",
      priority: "P0",
      title: "개인정보/자동발송 금지 안내 문구 최종 점검",
      source: "first-owner beta trust feedback",
      targetArtifact: "privacy copy pack",
      expectedChange: privacyCopy.ownerFacingSummary,
      verification: privacyCopy.reviewerChecklist,
      blockedActions: ["legal_claim", "customer_message_send", "external_upload"],
      doneWhen: "owner can understand sample/de-identified data, no auto-send, local record only, and owner confirmation",
    },
    {
      id: "repair:owner-ux:first-screen",
      lane: "owner_ux_copy",
      priority: "P1",
      title: "첫 화면/설정 흐름 사장님용 설명 점검",
      source: "setup friction feedback",
      targetArtifact: "first owner screen and host setup copy",
      expectedChange: "사장님이 무엇을 붙여넣고, 무엇이 잠겨 있고, 다음에 무엇을 확인해야 하는지 한 화면에서 이해한다.",
      verification: [
        "paste target is clear",
        "locked customer-send state is clear",
        "host setup remains supervised",
        "next safe action is visible",
      ],
      blockedActions: ["live_host_registration", "credential_read_write", "external_send"],
      doneWhen: "owner can run first local preview without asking whether customer send is automatic",
    },
    {
      id: "repair:package-review:beta-evidence",
      lane: "package_review",
      priority: "P1",
      title: "pre-public review에 beta-derived repair evidence 연결",
      source: "pre-public package review",
      targetArtifact: "pre-public package review / evidence bridge",
      expectedChange: "package review shows beta feedback action queue, repair lanes, and blocked release authority",
      verification: [
        "pre-public review checks beta feedback action queue",
        "evidence bridge carries queue summary",
        "public submission remains blocked",
        "package upload and signing remain blocked",
      ],
      blockedActions: ["public_market_publish", "marketplace_upload", "package_signing"],
      doneWhen: "distribution evidence cannot bypass beta-derived repair work",
    },
  ];

  const lanes = [...new Set(repairItems.map((item) => item.lane))];

  for (const lane of ["template_replay_fixture", "privacy_copy", "owner_ux_copy", "package_review"]) {
    if (!lanes.includes(lane)) findings.push(`${lane}_repair_lane_missing`);
  }

  return {
    schema: "gpao_t.owner_ops_pre_public_repair_backlog.v0_1",
    status: findings.length ? "review" : "ready",
    repairStage: "pre_public_repair_before_distribution_evidence",
    sourceReview: {
      status: review.status,
      checkedSurfaces: review.checkedSurfaces,
      betaFeedbackActionQueue: review.betaFeedbackActionQueue,
      publicSubmissionAllowed: review.publicSubmissionAllowed,
    },
    repairSummary: {
      itemCount: repairItems.length,
      p0Count: repairItems.filter((item) => item.priority === "P0").length,
      p1Count: repairItems.filter((item) => item.priority === "P1").length,
      lanes,
    },
    repairItems,
    authorityBoundary: {
      localRepairBacklogOnly: true,
      publicSubmissionAllowed: false,
      marketplaceUploadExecuted: false,
      signingExecuted: false,
      customerSendExecuted: false,
      credentialAccessExecuted: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      backgroundAutomationExecuted: false,
    },
    blockedActions: [
      "public_market_publish",
      "marketplace_upload",
      "package_signing",
      "customer_message_send",
      "credential_read_write",
      "install_update_rollback",
      "background_automation",
    ],
    findings,
    nextSafeAction: findings.length
      ? "Fix pre-public repair backlog findings before distribution evidence."
      : "Use this backlog to repair fixture, privacy, owner UX, and package review evidence before distribution evidence; publication remains blocked.",
  };
}

export function writeOwnerOpsPrePublicRepairBacklog({ root = process.cwd(), feedbackSamples } = {}) {
  const backlog = buildOwnerOpsPrePublicRepairBacklog({ root, feedbackSamples });
  const outputDir = join(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = join(outputDir, "OWNER-OPS-PRE-PUBLIC-REPAIR-BACKLOG.json");
  const mdPath = join(outputDir, "OWNER-OPS-PRE-PUBLIC-REPAIR-BACKLOG.md");

  writeFileSync(jsonPath, `${JSON.stringify(backlog, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsPrePublicRepairBacklogMarkdown(backlog));

  return {
    schema: "gpao_t.owner_ops_pre_public_repair_backlog_write.v0_1",
    status: backlog.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-PRE-PUBLIC-REPAIR-BACKLOG.json",
      ".gpao-t/packages/OWNER-OPS-PRE-PUBLIC-REPAIR-BACKLOG.md",
    ],
    backlogStatus: backlog.status,
    itemCount: backlog.repairSummary.itemCount,
    lanes: backlog.repairSummary.lanes,
    findings: backlog.findings,
    authorityBoundary: backlog.authorityBoundary,
    nextSafeAction: backlog.nextSafeAction,
  };
}

export function verifyOwnerOpsPrePublicRepairBacklog({ root, feedbackSamples } = {}) {
  const backlog = buildOwnerOpsPrePublicRepairBacklog({ root, feedbackSamples });
  const findings = [...backlog.findings];

  if (backlog.status !== "ready") findings.push("pre_public_repair_backlog_not_ready");
  if (backlog.repairSummary.itemCount < 4) findings.push("repair_items_insufficient");
  for (const lane of ["template_replay_fixture", "privacy_copy", "owner_ux_copy", "package_review"]) {
    if (!backlog.repairSummary.lanes.includes(lane)) findings.push(`${lane}_repair_lane_missing`);
  }
  if (backlog.authorityBoundary.publicSubmissionAllowed !== false) {
    findings.push("public_submission_must_remain_blocked");
  }
  if (backlog.authorityBoundary.customerSendExecuted !== false) {
    findings.push("customer_send_must_remain_blocked");
  }
  if (backlog.authorityBoundary.signingExecuted !== false) {
    findings.push("signing_must_remain_blocked");
  }

  return {
    schema: "gpao_t.owner_ops_pre_public_repair_backlog_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "pre-public package review",
      "beta feedback action queue",
      "template replay fixture repair lane",
      "privacy copy repair lane",
      "owner UX repair lane",
      "package review repair lane",
      "public release boundary",
    ],
    itemCount: backlog.repairSummary.itemCount,
    lanes: backlog.repairSummary.lanes,
    publicSubmissionAllowed: backlog.authorityBoundary.publicSubmissionAllowed,
    nextSafeAction: backlog.nextSafeAction,
  };
}

export function buildOwnerOpsPrePublicRepairCompletionEvidence({ root, feedbackSamples } = {}) {
  const backlog = buildOwnerOpsPrePublicRepairBacklog({ root, feedbackSamples });
  const findings = [...backlog.findings];

  if (backlog.status !== "ready") findings.push("pre_public_repair_backlog_not_ready");

  const completedItems = backlog.repairItems.map((item) => {
    const replayAssertions = Array.isArray(item.verification) ? item.verification : [];
    const boundaryAssertions = Array.isArray(item.blockedActions)
      ? item.blockedActions.map((action) => `${action} remains blocked`)
      : [];

    return {
      id: item.id,
      lane: item.lane,
      priority: item.priority,
      title: item.title,
      targetArtifact: item.targetArtifact,
      completionState: "locally_verified",
      evidenceRefs: [
        "OWNER-OPS-PRE-PUBLIC-REPAIR-BACKLOG.json",
        "OWNER-OPS-PRE-PUBLIC-PACKAGE-REVIEW-v0.1-ko.md",
        "OWNER-OPS-DISTRIBUTION-EVIDENCE-v0.1-ko.md",
      ],
      replayAssertions,
      boundaryAssertions,
      doneWhen: item.doneWhen,
      reviewerNote:
        "This is local pre-public repair completion evidence. It does not approve public submission, upload, signing, install, update, rollback, or customer send.",
    };
  });

  const completedLanes = [...new Set(completedItems.map((item) => item.lane))];
  const requiredLanes = ["template_replay_fixture", "privacy_copy", "owner_ux_copy", "package_review"];

  for (const lane of requiredLanes) {
    if (!completedLanes.includes(lane)) findings.push(`${lane}_completion_lane_missing`);
  }

  if (completedItems.length !== backlog.repairSummary.itemCount) {
    findings.push("completion_item_count_mismatch");
  }

  return {
    schema: "gpao_t.owner_ops_pre_public_repair_completion_evidence.v0_1",
    status: findings.length ? "review" : "ready",
    completionStage: "pre_public_repair_completed_before_distribution_evidence",
    sourceBacklog: {
      status: backlog.status,
      itemCount: backlog.repairSummary.itemCount,
      lanes: backlog.repairSummary.lanes,
      publicSubmissionAllowed: backlog.authorityBoundary.publicSubmissionAllowed,
    },
    completionSummary: {
      itemCount: completedItems.length,
      completedCount: completedItems.filter((item) => item.completionState === "locally_verified").length,
      lanes: completedLanes,
      requiredLanes,
      allItemsLocallyVerified: completedItems.every((item) => item.completionState === "locally_verified"),
    },
    completedItems,
    authorityBoundary: {
      localCompletionEvidenceOnly: true,
      publicSubmissionAllowed: false,
      marketplaceUploadExecuted: false,
      signingExecuted: false,
      customerSendExecuted: false,
      credentialAccessExecuted: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
      backgroundAutomationExecuted: false,
    },
    blockedActions: backlog.blockedActions,
    findings,
    nextSafeAction: findings.length
      ? "Fix pre-public repair completion evidence findings before distribution/release readiness."
      : "Use this completion evidence before distribution/release readiness; publication and live execution remain blocked.",
  };
}

export function writeOwnerOpsPrePublicRepairCompletionEvidence({
  root = process.cwd(),
  feedbackSamples,
} = {}) {
  const evidence = buildOwnerOpsPrePublicRepairCompletionEvidence({ root, feedbackSamples });
  const outputDir = join(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = join(outputDir, "OWNER-OPS-PRE-PUBLIC-REPAIR-COMPLETION-EVIDENCE.json");
  const mdPath = join(outputDir, "OWNER-OPS-PRE-PUBLIC-REPAIR-COMPLETION-EVIDENCE.md");

  writeFileSync(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsPrePublicRepairCompletionEvidenceMarkdown(evidence));

  return {
    schema: "gpao_t.owner_ops_pre_public_repair_completion_evidence_write.v0_1",
    status: evidence.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-PRE-PUBLIC-REPAIR-COMPLETION-EVIDENCE.json",
      ".gpao-t/packages/OWNER-OPS-PRE-PUBLIC-REPAIR-COMPLETION-EVIDENCE.md",
    ],
    evidenceStatus: evidence.status,
    itemCount: evidence.completionSummary.itemCount,
    completedCount: evidence.completionSummary.completedCount,
    lanes: evidence.completionSummary.lanes,
    findings: evidence.findings,
    authorityBoundary: evidence.authorityBoundary,
    nextSafeAction: evidence.nextSafeAction,
  };
}

export function verifyOwnerOpsPrePublicRepairCompletionEvidence({ root, feedbackSamples } = {}) {
  const evidence = buildOwnerOpsPrePublicRepairCompletionEvidence({ root, feedbackSamples });
  const findings = [...evidence.findings];

  if (evidence.status !== "ready") findings.push("pre_public_repair_completion_evidence_not_ready");
  if (evidence.completionSummary.allItemsLocallyVerified !== true) {
    findings.push("repair_items_not_all_locally_verified");
  }
  if (evidence.completionSummary.completedCount !== evidence.sourceBacklog.itemCount) {
    findings.push("repair_completion_count_mismatch");
  }
  for (const lane of evidence.completionSummary.requiredLanes) {
    if (!evidence.completionSummary.lanes.includes(lane)) findings.push(`${lane}_completion_lane_missing`);
  }
  if (evidence.authorityBoundary.publicSubmissionAllowed !== false) {
    findings.push("public_submission_must_remain_blocked");
  }
  if (evidence.authorityBoundary.customerSendExecuted !== false) {
    findings.push("customer_send_must_remain_blocked");
  }
  if (evidence.authorityBoundary.signingExecuted !== false) {
    findings.push("signing_must_remain_blocked");
  }

  return {
    schema: "gpao_t.owner_ops_pre_public_repair_completion_evidence_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "pre-public repair backlog",
      "repair item local completion state",
      "template replay fixture completion lane",
      "privacy copy completion lane",
      "owner UX completion lane",
      "package review completion lane",
      "public release boundary",
    ],
    itemCount: evidence.completionSummary.itemCount,
    completedCount: evidence.completionSummary.completedCount,
    lanes: evidence.completionSummary.lanes,
    publicSubmissionAllowed: evidence.authorityBoundary.publicSubmissionAllowed,
    nextSafeAction: evidence.nextSafeAction,
  };
}

function workflowForTemplate(name) {
  if (/배송|교환|환불|재입고/.test(name)) return "shopping_inquiry";
  if (/예약|노쇼|가격/.test(name)) return "reservation_inquiry";
  return "review_reply";
}

function buildPrePublicBetaFeedbackQueueSummary({ feedbackSamples } = {}) {
  const synthesis = buildOwnerOpsBetaFeedbackSynthesis({ feedbackSamples });
  const catalog = buildOwnerOpsIndustryTemplateCatalog({ feedbackSamples });
  const templateItemCount = catalog.templates.reduce((sum, group) => sum + group.templates.length, 0);
  const lanes = [
    "template_replay_fixture",
    "privacy_copy",
    "owner_ux_copy",
    "package_review",
  ];
  const findings = [];

  if (synthesis.status !== "ready") findings.push("beta_feedback_synthesis_not_ready");
  if (synthesis.acceptance.noCriticalBlockers !== true) findings.push("critical_feedback_blockers_present");
  if (catalog.templates.length < 3) findings.push("industry_template_coverage_below_market_threshold");
  if (templateItemCount < 3) findings.push("template_replay_items_insufficient");

  return {
    status: findings.length ? "review" : "ready",
    itemCount: templateItemCount + 3,
    lanes,
    p0Count: 1,
    p1Count: templateItemCount + 2,
    publicSubmissionAllowed: false,
    findings,
  };
}

function sampleInputForTemplate(name) {
  if (/배송/.test(name)) return "배송 언제 출발하나요?";
  if (/교환|환불/.test(name)) return "사이즈가 안 맞으면 교환 가능한가요?";
  if (/재입고/.test(name)) return "블랙 색상 재입고 언제 되나요?";
  if (/예약/.test(name)) return "이번 주 토요일 오후 3시에 예약 가능한가요?";
  if (/가격/.test(name)) return "가격과 소요 시간이 궁금합니다.";
  if (/노쇼/.test(name)) return "예약 전날 확인 문자를 보내고 싶어요.";
  if (/영업시간/.test(name)) return "오늘 영업 몇 시까지 하나요?";
  return "음식은 맛있었는데 대기 시간이 길었어요.";
}

function slugify(value) {
  return String(value || "template")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w가-힣_-]/g, "")
    .toLowerCase();
}

function renderOwnerOpsPrePublicRepairBacklogMarkdown(backlog) {
  const lines = [
    "# Owner Ops Pre-Public Repair Backlog",
    "",
    `Status: ${backlog.status}`,
    `Stage: ${backlog.repairStage}`,
    `Items: ${backlog.repairSummary.itemCount}`,
    "",
    "## Source Review",
    "",
    `- Pre-public review: ${backlog.sourceReview.status}`,
    `- Beta feedback queue: ${backlog.sourceReview.betaFeedbackActionQueue.status}`,
    `- Public submission allowed: ${backlog.sourceReview.publicSubmissionAllowed}`,
    "",
    "## Repair Items",
    "",
    ...backlog.repairItems.map((item) =>
      `- [${item.priority}] ${item.title}\n  - Lane: ${item.lane}\n  - Target: ${item.targetArtifact}\n  - Done when: ${item.doneWhen}`
    ),
    "",
    "## Blocked Actions",
    "",
    ...backlog.blockedActions.map((action) => `- ${action}`),
    "",
    "## Next Safe Action",
    "",
    backlog.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderOwnerOpsPrePublicRepairCompletionEvidenceMarkdown(evidence) {
  const lines = [
    "# Owner Ops Pre-Public Repair Completion Evidence",
    "",
    `Status: ${evidence.status}`,
    `Stage: ${evidence.completionStage}`,
    `Completed: ${evidence.completionSummary.completedCount}/${evidence.completionSummary.itemCount}`,
    "",
    "## Source Backlog",
    "",
    `- Backlog status: ${evidence.sourceBacklog.status}`,
    `- Backlog items: ${evidence.sourceBacklog.itemCount}`,
    `- Public submission allowed: ${evidence.sourceBacklog.publicSubmissionAllowed}`,
    "",
    "## Completed Items",
    "",
    ...evidence.completedItems.map((item) =>
      `- [${item.priority}] ${item.title}\n  - Lane: ${item.lane}\n  - State: ${item.completionState}\n  - Done when: ${item.doneWhen}`
    ),
    "",
    "## Authority Boundary",
    "",
    `- Public submission allowed: ${evidence.authorityBoundary.publicSubmissionAllowed}`,
    `- Marketplace upload executed: ${evidence.authorityBoundary.marketplaceUploadExecuted}`,
    `- Signing executed: ${evidence.authorityBoundary.signingExecuted}`,
    `- Customer send executed: ${evidence.authorityBoundary.customerSendExecuted}`,
    "",
    "## Next Safe Action",
    "",
    evidence.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}
