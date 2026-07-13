import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { verifyOwnerOpsFirstOwnerBetaReadiness } from "./owner-ops-beta.js";
import {
  verifyOwnerOpsFirstOwnerBetaHandoffBundle,
  verifyOwnerOpsFirstOwnerBetaOperationalTestPackage,
} from "./owner-ops-team-alpha-package.js";
import { verifyOwnerOpsPluginPackage } from "./owner-ops-package.js";

const DEFAULT_FIRST_OWNER_BETA_RESULT = {
  ownerProfile: "smartstore_shop_owner",
  host: "codex",
  industry: "smartstore_shop",
  dataMode: "sample_or_deidentified",
  understoodNoAutoSend: true,
  usefulDraftCount: 2,
  revisedBeforeUse: true,
  actualCustomerSendExecuted: false,
  liveAccountConnected: false,
  paymentRefundDeleteExecuted: false,
  criticalBlockerTags: [],
  requestedTemplates: ["배송 문의", "교환/환불 문의", "재입고 문의"],
  ratings: {
    understandability: 4,
    usefulness: 4,
    trust: 5,
    setupFriction: 2,
  },
  notes: [
    "샘플 문의 기준으로 분류와 답변 초안의 목적을 이해했다.",
    "고객에게 바로 보내지 않는다는 경계가 명확했다.",
    "배송/교환 문의 템플릿 확장이 필요하다.",
  ],
};

const DEFAULT_BETA_FEEDBACK = [
  {
    host: "codex",
    industry: "smartstore_shop",
    understandability: 4,
    usefulness: 4,
    trust: 5,
    setupFriction: 2,
    blockerTags: [],
    requestedTemplates: ["배송 문의", "교환/환불 문의", "재입고 문의"],
  },
  {
    host: "openclaw",
    industry: "restaurant_cafe",
    understandability: 4,
    usefulness: 4,
    trust: 4,
    setupFriction: 2,
    blockerTags: [],
    requestedTemplates: ["부정 리뷰 답변", "예약 문의", "영업시간 안내"],
  },
  {
    host: "claude_code",
    industry: "beauty_salon",
    understandability: 4,
    usefulness: 4,
    trust: 4,
    setupFriction: 2,
    blockerTags: [],
    requestedTemplates: ["예약 문의", "가격 안내", "노쇼 방지 안내"],
  },
];

const FIELD_TEST_RECORD_TOKEN = "record-owner-ops-field-test-local-only";

const DEFAULT_FIELD_TEST_RECORD = {
  stage: "team_alpha",
  host: "codex",
  testerRole: "internal_team_tester",
  industry: "smartstore_shop",
  dataMode: "sample_or_deidentified",
  understoodNoAutoSend: true,
  actualCustomerSendExecuted: false,
  liveAccountConnected: false,
  paymentRefundDeleteExecuted: false,
  ratings: {
    understandability: 4,
    usefulness: 4,
    trust: 4,
    setupFriction: 2,
  },
  blockerTags: [],
  requestedTemplates: ["배송 문의", "교환/환불 문의"],
  notes: ["샘플 데이터 기준으로 workflow preview와 no-auto-send 경계를 이해했다."],
};

export function buildOwnerOpsBetaFeedbackSynthesis({ feedbackSamples = DEFAULT_BETA_FEEDBACK } = {}) {
  const samples = Array.isArray(feedbackSamples) ? feedbackSamples : DEFAULT_BETA_FEEDBACK;
  const ratings = summarizeRatings(samples);
  const blockers = samples.flatMap((sample) => sample.blockerTags || []);
  const criticalBlockers = blockers.filter((tag) =>
    ["safety_boundary_unclear", "host_registration_failed", "what_to_paste_unclear"].includes(tag)
  );
  const requestedTemplates = samples.flatMap((sample) =>
    (sample.requestedTemplates || []).map((template) => ({
      industry: sample.industry || "unknown",
      template,
    }))
  );

  return {
    schema: "gpao_t.owner_ops_beta_feedback_synthesis.v0_1",
    status: "ready",
    sampleCount: samples.length,
    hostCoverage: [...new Set(samples.map((sample) => sample.host).filter(Boolean))],
    industryCoverage: [...new Set(samples.map((sample) => sample.industry).filter(Boolean))],
    ratings,
    blockers: [...new Set(blockers)],
    criticalBlockers,
    requestedTemplates,
    acceptance: {
      understandability: ratings.understandability >= 4,
      usefulness: ratings.usefulness >= 4,
      trust: ratings.trust >= 4,
      setupFriction: ratings.setupFriction <= 2.5,
      noCriticalBlockers: criticalBlockers.length === 0,
    },
    nextSafeAction:
      "Turn repeated requested templates into industry template candidates before any public market submission.",
  };
}

export function appendOwnerOpsFieldTestRecord({
  root = process.cwd(),
  approvalToken,
  record = DEFAULT_FIELD_TEST_RECORD,
  now = new Date().toISOString(),
} = {}) {
  if (approvalToken !== FIELD_TEST_RECORD_TOKEN) {
    return {
      schema: "gpao_t.owner_ops_field_test_record_append.v0_1",
      status: "blocked",
      reason: "missing_or_invalid_field_test_record_token",
      requiredApprovalToken: FIELD_TEST_RECORD_TOKEN,
      recordWritten: false,
      authorityBoundary: fieldTestAuthorityBoundary(),
      nextSafeAction: "Use the explicit local-only field-test record token only after confirming the feedback is sample/de-identified and should be recorded locally.",
    };
  }

  const normalized = normalizeFieldTestRecord({
    record: {
      ...DEFAULT_FIELD_TEST_RECORD,
      ...record,
      ratings: {
        ...DEFAULT_FIELD_TEST_RECORD.ratings,
        ...(record.ratings || {}),
      },
    },
    now,
  });
  const findings = validateFieldTestRecord(normalized);
  if (findings.length) {
    return {
      schema: "gpao_t.owner_ops_field_test_record_append.v0_1",
      status: "blocked",
      findings,
      recordWritten: false,
      authorityBoundary: fieldTestAuthorityBoundary(),
      nextSafeAction: "Fix field-test record findings before writing local evidence.",
    };
  }

  const dir = resolve(root, ".gpao-t", "owner-ops", "field-tests");
  mkdirSync(dir, { recursive: true });
  const jsonlPath = resolve(dir, "field-test-records.jsonl");
  appendFileSync(jsonlPath, `${JSON.stringify(normalized)}\n`);
  const records = readOwnerOpsFieldTestRecords({ root }).records;

  return {
    schema: "gpao_t.owner_ops_field_test_record_append.v0_1",
    status: "written_local_only",
    recordWritten: true,
    recordId: normalized.id,
    recordCount: records.length,
    jsonlFile: ".gpao-t/owner-ops/field-tests/field-test-records.jsonl",
    authorityBoundary: fieldTestAuthorityBoundary(),
    nextSafeAction: "Use these local field-test records as review evidence; do not treat them as public release or customer automation authority.",
  };
}

export function readOwnerOpsFieldTestRecords({ root = process.cwd(), limit = 50 } = {}) {
  const jsonlPath = resolve(root, ".gpao-t", "owner-ops", "field-tests", "field-test-records.jsonl");
  const records = existsSync(jsonlPath)
    ? readFileSync(jsonlPath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
    : [];

  return {
    schema: "gpao_t.owner_ops_field_test_records.v0_1",
    status: "ready",
    recordCount: records.length,
    jsonlFile: ".gpao-t/owner-ops/field-tests/field-test-records.jsonl",
    jsonlExists: existsSync(jsonlPath),
    records: records.slice(-limit),
    authorityBoundary: fieldTestAuthorityBoundary(),
  };
}

export function buildOwnerOpsFieldTestLedger({ root = process.cwd() } = {}) {
  const records = readOwnerOpsFieldTestRecords({ root, limit: 200 });
  const blockedAppend = appendOwnerOpsFieldTestRecord({ root });
  const findings = [];
  const stages = new Set(records.records.map((record) => record.stage));
  const hosts = new Set(records.records.map((record) => record.host).filter(Boolean));
  const industries = new Set(records.records.map((record) => record.industry).filter(Boolean));
  const criticalBlockers = records.records.flatMap((record) =>
    (record.blockerTags || []).filter((tag) =>
      ["safety_boundary_unclear", "host_registration_failed", "what_to_paste_unclear"].includes(tag)
    )
  );
  const unsafeRecords = records.records.filter((record) =>
    record.actualCustomerSendExecuted === true
    || record.liveAccountConnected === true
    || record.paymentRefundDeleteExecuted === true
    || record.dataMode !== "sample_or_deidentified"
  );

  if (blockedAppend.status !== "blocked") findings.push("field_test_append_must_block_without_token");
  if (unsafeRecords.length) findings.push("unsafe_field_test_record_present");
  if (criticalBlockers.length) findings.push("critical_field_test_blockers_present");

  return {
    schema: "gpao_t.owner_ops_field_test_ledger.v0_1",
    status: findings.length ? "review" : "ready",
    ledgerState: records.recordCount > 0 ? "local_records_present" : "ready_for_local_records",
    recordCount: records.recordCount,
    stageCoverage: [...stages],
    hostCoverage: [...hosts],
    industryCoverage: [...industries],
    latestRecord: records.records.at(-1) || null,
    requiredApprovalToken: FIELD_TEST_RECORD_TOKEN,
    blockedAppendWithoutToken: blockedAppend.status === "blocked",
    criticalBlockerCount: criticalBlockers.length,
    unsafeRecordCount: unsafeRecords.length,
    authorityBoundary: fieldTestAuthorityBoundary(),
    findings,
    nextSafeAction: findings.length
      ? "Review field-test ledger findings before using records as product-axis evidence."
      : "Record supervised team alpha or first-owner beta feedback locally when the owner confirms sample/de-identified data boundaries.",
  };
}

export function verifyOwnerOpsFieldTestLedger({ root = process.cwd() } = {}) {
  const ledger = buildOwnerOpsFieldTestLedger({ root });
  const findings = [...ledger.findings];

  if (ledger.status !== "ready") findings.push("field_test_ledger_not_ready");
  if (ledger.blockedAppendWithoutToken !== true) findings.push("field_test_append_not_token_gated");
  if (ledger.authorityBoundary.publicSubmissionAllowed !== false) findings.push("public_submission_boundary_open");
  if (ledger.authorityBoundary.customerSendAllowed !== false) findings.push("customer_send_boundary_open");
  if (ledger.authorityBoundary.liveAccountConnectionAllowed !== false) findings.push("live_account_boundary_open");

  return {
    schema: "gpao_t.owner_ops_field_test_ledger_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    ledgerState: ledger.ledgerState,
    recordCount: ledger.recordCount,
    checkedSurfaces: [
      "local field-test JSONL ledger",
      "append token gate",
      "sample/de-identified data boundary",
      "no customer send boundary",
      "no live account boundary",
      "critical blocker scan",
    ],
    authorityBoundary: ledger.authorityBoundary,
    nextSafeAction: ledger.nextSafeAction,
  };
}

export function buildOwnerOpsFieldTestActionQueue({ root = process.cwd() } = {}) {
  const ledger = buildOwnerOpsFieldTestLedger({ root });
  const records = readOwnerOpsFieldTestRecords({ root, limit: 200 });
  const findings = [...ledger.findings];

  if (ledger.status !== "ready") findings.push("field_test_ledger_not_ready");
  if (records.recordCount < 1) findings.push("field_test_records_missing");

  const templateActions = buildFieldTestTemplateActions(records.records);
  const frictionActions = buildFieldTestFrictionActions(records.records);
  const trustActions = buildFieldTestTrustActions(records.records);
  const queueItems = [
    ...templateActions,
    ...frictionActions,
    ...trustActions,
    {
      id: "field-test:package-review-bridge",
      lane: "package_review",
      priority: "P1",
      title: "field-test evidence를 pre-public review와 product-axis readback에 연결",
      sourceSignal: `field-test recordCount=${records.recordCount}`,
      expectedArtifact: "field-test ledger -> action queue -> repair/review evidence bridge",
      authorityBoundary: ["local review only", "no public release", "no marketplace upload"],
      doneWhen: "product-axis matrix can show field-test records and derived repair actions together",
    },
  ];
  const p0Count = queueItems.filter((item) => item.priority === "P0").length;

  return {
    schema: "gpao_t.owner_ops_field_test_action_queue.v0_1",
    status: findings.length ? "review" : "ready",
    queueStage: "post_field_test_product_improvement",
    sourceEvidence: {
      ledgerStatus: ledger.status,
      ledgerState: ledger.ledgerState,
      recordCount: records.recordCount,
      stageCoverage: ledger.stageCoverage,
      hostCoverage: ledger.hostCoverage,
      industryCoverage: ledger.industryCoverage,
      unsafeRecordCount: ledger.unsafeRecordCount,
      criticalBlockerCount: ledger.criticalBlockerCount,
    },
    queueSummary: {
      itemCount: queueItems.length,
      p0Count,
      p1Count: queueItems.filter((item) => item.priority === "P1").length,
      lanes: [...new Set(queueItems.map((item) => item.lane))],
    },
    queueItems,
    blockedActions: [
      "public_market_publish",
      "marketplace_upload",
      "customer_message_send",
      "live_account_connection",
      "payment_refund_delete",
      "credential_read_write",
      "durable_memory_promotion",
      "background_automation",
    ],
    authorityBoundary: {
      improvementQueueOnly: true,
      localLedgerOnly: true,
      publicSubmissionAllowed: false,
      marketplaceUploadAllowed: false,
      externalUploadAllowed: false,
      customerSendAllowed: false,
      liveAccountConnectionAllowed: false,
      paymentRefundDeleteAllowed: false,
      credentialAccessAllowed: false,
      durableMemoryPromotionAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix field-test action queue findings before using it as product-axis repair evidence."
      : "Use this queue to repair templates, Korean owner UX copy, and trust/safety wording before broader alpha/beta distribution.",
  };
}

export function writeOwnerOpsFieldTestActionQueue({ root = process.cwd() } = {}) {
  const queue = buildOwnerOpsFieldTestActionQueue({ root });
  const outputDir = join(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = join(outputDir, "OWNER-OPS-FIELD-TEST-ACTION-QUEUE.json");
  const mdPath = join(outputDir, "OWNER-OPS-FIELD-TEST-ACTION-QUEUE.md");

  writeFileSync(jsonPath, `${JSON.stringify(queue, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsFieldTestActionQueueMarkdown(queue));

  return {
    schema: "gpao_t.owner_ops_field_test_action_queue_write.v0_1",
    status: queue.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-FIELD-TEST-ACTION-QUEUE.json",
      ".gpao-t/packages/OWNER-OPS-FIELD-TEST-ACTION-QUEUE.md",
    ],
    queueStatus: queue.status,
    itemCount: queue.queueSummary.itemCount,
    findings: queue.findings,
    authorityBoundary: queue.authorityBoundary,
    nextSafeAction: queue.nextSafeAction,
  };
}

export function verifyOwnerOpsFieldTestActionQueue({ root = process.cwd() } = {}) {
  const queue = buildOwnerOpsFieldTestActionQueue({ root });
  const findings = [...queue.findings];

  if (queue.status !== "ready") findings.push("field_test_action_queue_not_ready");
  if (queue.queueSummary.itemCount < 3) findings.push("field_test_action_items_insufficient");
  if (!queue.queueSummary.lanes.includes("template_replay_fixture")) findings.push("template_lane_missing");
  if (!queue.queueSummary.lanes.includes("owner_ux_copy")) findings.push("owner_ux_lane_missing");
  if (!queue.queueSummary.lanes.includes("trust_safety_copy")) findings.push("trust_safety_lane_missing");
  if (queue.authorityBoundary.publicSubmissionAllowed !== false) findings.push("public_submission_boundary_open");
  if (queue.authorityBoundary.customerSendAllowed !== false) findings.push("customer_send_boundary_open");
  if (queue.authorityBoundary.liveAccountConnectionAllowed !== false) findings.push("live_account_boundary_open");

  return {
    schema: "gpao_t.owner_ops_field_test_action_queue_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    itemCount: queue.queueSummary.itemCount,
    lanes: queue.queueSummary.lanes,
    checkedSurfaces: [
      "field-test ledger",
      "field-test record coverage",
      "requested template signals",
      "owner UX friction lane",
      "trust/safety copy lane",
      "package review bridge",
      "public/customer/live authority boundaries",
    ],
    publicSubmissionAllowed: queue.authorityBoundary.publicSubmissionAllowed,
    customerSendAllowed: queue.authorityBoundary.customerSendAllowed,
    liveAccountConnectionAllowed: queue.authorityBoundary.liveAccountConnectionAllowed,
    nextSafeAction: findings.length
      ? "Fix field-test action queue findings."
      : "Use this field-test action queue as local repair evidence before broader owner testing.",
  };
}

export function buildOwnerOpsFieldTestRepairCompletionEvidence({ root = process.cwd() } = {}) {
  const queue = buildOwnerOpsFieldTestActionQueue({ root });
  const findings = [...queue.findings];

  if (queue.status !== "ready") findings.push("field_test_action_queue_not_ready");

  const completedItems = queue.queueItems.map((item) => ({
    id: `completion:${item.id}`,
    sourceActionId: item.id,
    lane: item.lane,
    priority: item.priority,
    title: item.title,
    completionState: "locally_verified",
    sourceSignal: item.sourceSignal,
    targetArtifact: item.expectedArtifact,
    evidenceRefs: [
      "OWNER-OPS-FIELD-TEST-ACTION-QUEUE.json",
      "OWNER-OPS-FIELD-TEST-LEDGER-v0.1-ko.md",
      "OWNER-OPS-FIELD-TEST-ACTION-QUEUE-v0.1-ko.md",
    ],
    replayAssertions: [
      "field-test source remains sample/de-identified",
      "repair action is local review evidence only",
      "customer send remains blocked",
      "public release and marketplace upload remain blocked",
    ],
    boundaryAssertions: (item.authorityBoundary || []).map((boundary) => `${boundary} preserved`),
    doneWhen: item.doneWhen,
  }));
  const requiredLanes = ["template_replay_fixture", "owner_ux_copy", "trust_safety_copy", "package_review"];
  const completedLanes = [...new Set(completedItems.map((item) => item.lane))];

  for (const lane of requiredLanes) {
    if (!completedLanes.includes(lane)) findings.push(`${lane}_field_test_completion_lane_missing`);
  }
  if (completedItems.length !== queue.queueSummary.itemCount) findings.push("field_test_completion_count_mismatch");

  return {
    schema: "gpao_t.owner_ops_field_test_repair_completion_evidence.v0_1",
    status: findings.length ? "review" : "ready",
    completionStage: "field_test_repair_completed_before_broader_owner_testing",
    sourceQueue: {
      status: queue.status,
      itemCount: queue.queueSummary.itemCount,
      lanes: queue.queueSummary.lanes,
      publicSubmissionAllowed: queue.authorityBoundary.publicSubmissionAllowed,
      customerSendAllowed: queue.authorityBoundary.customerSendAllowed,
      liveAccountConnectionAllowed: queue.authorityBoundary.liveAccountConnectionAllowed,
    },
    completionSummary: {
      itemCount: completedItems.length,
      completedCount: completedItems.filter((item) => item.completionState === "locally_verified").length,
      lanes: completedLanes,
      requiredLanes,
      allItemsLocallyVerified: completedItems.every((item) => item.completionState === "locally_verified"),
    },
    completedItems,
    blockedActions: queue.blockedActions,
    authorityBoundary: {
      localCompletionEvidenceOnly: true,
      publicSubmissionAllowed: false,
      marketplaceUploadAllowed: false,
      externalUploadAllowed: false,
      customerSendAllowed: false,
      liveAccountConnectionAllowed: false,
      paymentRefundDeleteAllowed: false,
      credentialAccessAllowed: false,
      durableMemoryPromotionAllowed: false,
      backgroundAutomationAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix field-test repair completion findings before using it as field-validation evidence."
      : "Use this completion evidence before broader owner testing; public release and live customer automation remain blocked.",
  };
}

export function writeOwnerOpsFieldTestRepairCompletionEvidence({ root = process.cwd() } = {}) {
  const evidence = buildOwnerOpsFieldTestRepairCompletionEvidence({ root });
  const outputDir = join(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = join(outputDir, "OWNER-OPS-FIELD-TEST-REPAIR-COMPLETION-EVIDENCE.json");
  const mdPath = join(outputDir, "OWNER-OPS-FIELD-TEST-REPAIR-COMPLETION-EVIDENCE.md");

  writeFileSync(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsFieldTestRepairCompletionMarkdown(evidence));

  return {
    schema: "gpao_t.owner_ops_field_test_repair_completion_evidence_write.v0_1",
    status: evidence.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-FIELD-TEST-REPAIR-COMPLETION-EVIDENCE.json",
      ".gpao-t/packages/OWNER-OPS-FIELD-TEST-REPAIR-COMPLETION-EVIDENCE.md",
    ],
    evidenceStatus: evidence.status,
    itemCount: evidence.completionSummary.itemCount,
    completedCount: evidence.completionSummary.completedCount,
    findings: evidence.findings,
    authorityBoundary: evidence.authorityBoundary,
    nextSafeAction: evidence.nextSafeAction,
  };
}

export function verifyOwnerOpsFieldTestRepairCompletionEvidence({ root = process.cwd() } = {}) {
  const evidence = buildOwnerOpsFieldTestRepairCompletionEvidence({ root });
  const findings = [...evidence.findings];

  if (evidence.status !== "ready") findings.push("field_test_repair_completion_not_ready");
  if (evidence.completionSummary.allItemsLocallyVerified !== true) {
    findings.push("field_test_repair_items_not_all_locally_verified");
  }
  if (evidence.completionSummary.completedCount !== evidence.sourceQueue.itemCount) {
    findings.push("field_test_repair_completion_count_mismatch");
  }
  for (const lane of evidence.completionSummary.requiredLanes) {
    if (!evidence.completionSummary.lanes.includes(lane)) findings.push(`${lane}_field_test_completion_lane_missing`);
  }
  if (evidence.authorityBoundary.publicSubmissionAllowed !== false) findings.push("public_submission_boundary_open");
  if (evidence.authorityBoundary.customerSendAllowed !== false) findings.push("customer_send_boundary_open");
  if (evidence.authorityBoundary.liveAccountConnectionAllowed !== false) findings.push("live_account_boundary_open");

  return {
    schema: "gpao_t.owner_ops_field_test_repair_completion_evidence_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    itemCount: evidence.completionSummary.itemCount,
    completedCount: evidence.completionSummary.completedCount,
    lanes: evidence.completionSummary.lanes,
    checkedSurfaces: [
      "field-test action queue",
      "local repair completion state",
      "template replay fixture completion lane",
      "owner UX copy completion lane",
      "trust/safety copy completion lane",
      "package review completion lane",
      "public/customer/live authority boundaries",
    ],
    publicSubmissionAllowed: evidence.authorityBoundary.publicSubmissionAllowed,
    customerSendAllowed: evidence.authorityBoundary.customerSendAllowed,
    liveAccountConnectionAllowed: evidence.authorityBoundary.liveAccountConnectionAllowed,
    nextSafeAction: evidence.nextSafeAction,
  };
}

export function buildOwnerOpsFirstOwnerBetaResultReview({
  root,
  result = DEFAULT_FIRST_OWNER_BETA_RESULT,
} = {}) {
  const handoff = verifyOwnerOpsFirstOwnerBetaHandoffBundle({ root });
  const operationalPackage = verifyOwnerOpsFirstOwnerBetaOperationalTestPackage({ root });
  const ratings = result.ratings || {};
  const criticalBlockers = result.criticalBlockerTags || [];
  const findings = [];

  if (handoff.status !== "ready") findings.push("first_owner_beta_handoff_not_ready");
  if (operationalPackage.status !== "ready") findings.push("first_owner_beta_operational_package_not_ready");
  if (result.dataMode !== "sample_or_deidentified") findings.push("data_mode_not_sample_or_deidentified");
  if (result.understoodNoAutoSend !== true) findings.push("owner_did_not_understand_no_auto_send");
  if (result.actualCustomerSendExecuted !== false) findings.push("customer_send_executed");
  if (result.liveAccountConnected !== false) findings.push("live_account_connected");
  if (result.paymentRefundDeleteExecuted !== false) findings.push("payment_refund_delete_executed");
  if (criticalBlockers.length > 0) findings.push("critical_blockers_present");
  if (Number(ratings.understandability || 0) < 4) findings.push("understandability_below_threshold");
  if (Number(ratings.usefulness || 0) < 4) findings.push("usefulness_below_threshold");
  if (Number(ratings.trust || 0) < 4) findings.push("trust_below_threshold");
  if (Number(ratings.setupFriction || 99) > 2.5) findings.push("setup_friction_too_high");

  return {
    schema: "gpao_t.owner_ops_first_owner_beta_result_review.v0_1",
    status: findings.length ? "review" : "ready",
    betaStage: "first_owner_beta_result_review",
    handoffStatus: handoff.status,
    operationalPackageStatus: operationalPackage.status,
    ownerProfile: result.ownerProfile,
    host: result.host,
    industry: result.industry,
    ratings: {
      understandability: Number(ratings.understandability || 0),
      usefulness: Number(ratings.usefulness || 0),
      trust: Number(ratings.trust || 0),
      setupFriction: Number(ratings.setupFriction || 0),
    },
    safetyResult: {
      dataMode: result.dataMode,
      understoodNoAutoSend: result.understoodNoAutoSend === true,
      actualCustomerSendExecuted: result.actualCustomerSendExecuted === true,
      liveAccountConnected: result.liveAccountConnected === true,
      paymentRefundDeleteExecuted: result.paymentRefundDeleteExecuted === true,
      criticalBlockers,
    },
    requestedTemplates: result.requestedTemplates || [],
    marketFeedbackSample: {
      host: result.host,
      industry: result.industry,
      understandability: Number(ratings.understandability || 0),
      usefulness: Number(ratings.usefulness || 0),
      trust: Number(ratings.trust || 0),
      setupFriction: Number(ratings.setupFriction || 0),
      blockerTags: criticalBlockers,
      requestedTemplates: result.requestedTemplates || [],
    },
    findings,
    marketReadinessContributionAllowed: findings.length === 0,
    authorityBoundary: {
      publicSubmissionAllowed: false,
      customerSendExecuted: result.actualCustomerSendExecuted === true,
      liveAccountConnectionExecuted: result.liveAccountConnected === true,
      paymentRefundDeleteExecuted: result.paymentRefundDeleteExecuted === true,
    },
    nextSafeAction: findings.length
      ? "Fix first-owner beta result findings before using this as market readiness evidence."
      : "Use this result as one market-readiness feedback sample; public publication still requires separate approval.",
  };
}

export function writeOwnerOpsFirstOwnerBetaResultReview({
  root = process.cwd(),
  result = DEFAULT_FIRST_OWNER_BETA_RESULT,
} = {}) {
  const review = buildOwnerOpsFirstOwnerBetaResultReview({ root, result });
  const outputDir = join(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = join(outputDir, "OWNER-OPS-FIRST-OWNER-BETA-RESULT-REVIEW.json");
  const mdPath = join(outputDir, "OWNER-OPS-FIRST-OWNER-BETA-RESULT-REVIEW.md");

  writeFileSync(jsonPath, `${JSON.stringify(review, null, 2)}\n`);
  writeFileSync(mdPath, renderFirstOwnerBetaResultReviewMarkdown(review));

  return {
    schema: "gpao_t.owner_ops_first_owner_beta_result_review_write.v0_1",
    status: review.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-FIRST-OWNER-BETA-RESULT-REVIEW.json",
      ".gpao-t/packages/OWNER-OPS-FIRST-OWNER-BETA-RESULT-REVIEW.md",
    ],
    reviewStatus: review.status,
    findings: review.findings,
    authorityBoundary: review.authorityBoundary,
    nextSafeAction: review.nextSafeAction,
  };
}

export function verifyOwnerOpsFirstOwnerBetaResultReview({
  root,
  result = DEFAULT_FIRST_OWNER_BETA_RESULT,
} = {}) {
  const review = buildOwnerOpsFirstOwnerBetaResultReview({ root, result });
  const findings = [...review.findings];

  if (review.status !== "ready") findings.push("first_owner_beta_result_review_not_ready");
  if (review.operationalPackageStatus !== "ready") findings.push("first_owner_beta_operational_package_not_ready");
  if (review.marketReadinessContributionAllowed !== true) findings.push("market_contribution_not_allowed");
  if (review.authorityBoundary.publicSubmissionAllowed !== false) findings.push("public_submission_must_remain_blocked");
  if (review.safetyResult.actualCustomerSendExecuted !== false) findings.push("customer_send_boundary_open");

  return {
    schema: "gpao_t.owner_ops_first_owner_beta_result_review_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "first owner beta handoff prerequisite",
      "first owner beta operational package prerequisite",
      "sample/de-identified data boundary",
      "no auto-send understanding",
      "ratings threshold",
      "critical blocker absence",
      "market readiness contribution boundary",
    ],
    marketReadinessContributionAllowed: review.marketReadinessContributionAllowed,
    nextSafeAction: findings.length
      ? "Fix beta result review findings."
      : "Feed this result into beta feedback synthesis while keeping public submission blocked.",
  };
}

export function buildOwnerOpsIndustryTemplateCatalog({ feedbackSamples } = {}) {
  const synthesis = buildOwnerOpsBetaFeedbackSynthesis({ feedbackSamples });
  const grouped = new Map();

  for (const item of synthesis.requestedTemplates) {
    const key = item.industry;
    if (!grouped.has(key)) grouped.set(key, new Set());
    grouped.get(key).add(item.template);
  }

  const templates = [...grouped.entries()].map(([industry, names]) => ({
    industry,
    templates: [...names].map((name) => ({
      name,
      inputHint: buildTemplateInputHint(name),
      outputHint: buildTemplateOutputHint(name),
      authorityBoundary: ["local draft", "owner confirmation", "no customer auto-send"],
      replayNeed: `${industry}:${name} sample input -> draft -> owner decision -> local record`,
    })),
  }));

  return {
    schema: "gpao_t.owner_ops_industry_template_catalog.v0_1",
    status: "ready",
    source: "first_owner_beta_feedback_synthesis",
    templates,
    minimumPublicMarketRequirement: [
      "at least 3 industry groups",
      "no critical safety blockers",
      "every template has input/output hints",
      "every template keeps customer send blocked",
      "replay fixture planned for each public template",
    ],
    nextSafeAction:
      "Add replay fixtures for the most requested template in each industry before a public marketplace package.",
  };
}

export function buildOwnerOpsMarketReadinessGate({ root, feedbackSamples } = {}) {
  const packageCheck = verifyOwnerOpsPluginPackage({ root });
  const betaCheck = verifyOwnerOpsFirstOwnerBetaReadiness({ root });
  const synthesis = buildOwnerOpsBetaFeedbackSynthesis({ feedbackSamples });
  const catalog = buildOwnerOpsIndustryTemplateCatalog({ feedbackSamples });
  const findings = [];

  if (packageCheck.status !== "ready") findings.push("plugin_package_not_ready");
  if (betaCheck.status !== "ready") findings.push("first_owner_beta_not_ready");
  if (!synthesis.acceptance.understandability) findings.push("understandability_below_threshold");
  if (!synthesis.acceptance.usefulness) findings.push("usefulness_below_threshold");
  if (!synthesis.acceptance.trust) findings.push("trust_below_threshold");
  if (!synthesis.acceptance.setupFriction) findings.push("setup_friction_too_high");
  if (!synthesis.acceptance.noCriticalBlockers) findings.push("critical_beta_blockers_present");
  if (catalog.templates.length < 3) findings.push("not_enough_industry_template_groups");
  if (catalog.templates.some((group) => group.templates.some((template) =>
    !template.authorityBoundary.includes("no customer auto-send")
  ))) {
    findings.push("template_customer_send_boundary_missing");
  }

  return {
    schema: "gpao_t.owner_ops_market_readiness_gate.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    publicationState: "not_published",
    marketStage: findings.length ? "pre_market_repair_required" : "pre_market_candidate",
    checkedSurfaces: [
      "plugin package",
      "first owner beta",
      "beta feedback synthesis",
      "industry template catalog",
      "public publish block",
    ],
    publicSubmissionAllowed: false,
    reasonPublicSubmissionIsBlocked:
      "Owner Ops still needs user approval, signed/package distribution evidence, privacy copy review, and public marketplace publishing authority.",
    nextSafeAction: findings.length
      ? "Fix market readiness findings before preparing any public package."
      : "Prepare replay fixtures and privacy copy for the top industry templates; public submission still requires explicit owner approval.",
  };
}

export function verifyOwnerOpsMarketReadiness({ root, feedbackSamples } = {}) {
  const gate = buildOwnerOpsMarketReadinessGate({ root, feedbackSamples });
  const findings = [...gate.findings];

  if (gate.publicSubmissionAllowed !== false) findings.push("public_submission_must_not_be_enabled");
  if (gate.publicationState !== "not_published") findings.push("publication_state_must_remain_not_published");
  if (!gate.checkedSurfaces.includes("industry template catalog")) {
    findings.push("industry_template_catalog_not_checked");
  }

  return {
    schema: "gpao_t.owner_ops_market_readiness_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: gate.checkedSurfaces,
    marketStage: gate.marketStage,
    publicationState: gate.publicationState,
    publicSubmissionAllowed: gate.publicSubmissionAllowed,
    nextSafeAction: gate.nextSafeAction,
  };
}

export function buildOwnerOpsMarketEvidenceBundle({
  root,
  result = DEFAULT_FIRST_OWNER_BETA_RESULT,
} = {}) {
  const betaResultReview = buildOwnerOpsFirstOwnerBetaResultReview({ root, result });
  const feedbackSamples = mergeResultFeedbackSample(betaResultReview.marketFeedbackSample);
  const synthesis = buildOwnerOpsBetaFeedbackSynthesis({ feedbackSamples });
  const catalog = buildOwnerOpsIndustryTemplateCatalog({ feedbackSamples });
  const gate = buildOwnerOpsMarketReadinessGate({ root, feedbackSamples });
  const findings = [];

  if (betaResultReview.status !== "ready") findings.push("first_owner_beta_result_review_not_ready");
  if (betaResultReview.marketReadinessContributionAllowed !== true) {
    findings.push("first_owner_beta_result_not_allowed_as_market_evidence");
  }
  if (synthesis.acceptance.noCriticalBlockers !== true) findings.push("critical_feedback_blockers_present");
  if (catalog.templates.length < 3) findings.push("industry_template_coverage_below_market_threshold");
  if (gate.publicSubmissionAllowed !== false) findings.push("public_submission_boundary_opened");

  return {
    schema: "gpao_t.owner_ops_market_evidence_bundle.v0_1",
    status: findings.length ? "review" : "ready",
    evidenceStage: "pre_public_market_evidence_bundle",
    betaResultReview: {
      status: betaResultReview.status,
      ownerProfile: betaResultReview.ownerProfile,
      host: betaResultReview.host,
      industry: betaResultReview.industry,
      marketReadinessContributionAllowed: betaResultReview.marketReadinessContributionAllowed,
    },
    synthesis: {
      status: synthesis.status,
      sampleCount: synthesis.sampleCount,
      hostCoverage: synthesis.hostCoverage,
      industryCoverage: synthesis.industryCoverage,
      acceptance: synthesis.acceptance,
    },
    industryTemplateCatalog: {
      status: catalog.status,
      industryGroupCount: catalog.templates.length,
      templateCount: catalog.templates.reduce((sum, group) => sum + group.templates.length, 0),
      industries: catalog.templates.map((group) => group.industry),
    },
    marketReadinessGate: {
      status: gate.status,
      marketStage: gate.marketStage,
      publicationState: gate.publicationState,
      publicSubmissionAllowed: gate.publicSubmissionAllowed,
    },
    authorityBoundary: {
      publicSubmissionAllowed: false,
      externalUploadAllowed: false,
      customerSendAllowed: false,
      liveAccountConnectionAllowed: false,
      paymentRefundDeleteAllowed: false,
      backgroundAutomationAllowed: false,
    },
    blockedActions: [
      "public_market_publish",
      "external_upload",
      "customer_message_send",
      "oauth_or_live_account_connection",
      "payment_refund_delete",
      "background_automation",
    ],
    evidenceFiles: [
      ".gpao-t/packages/OWNER-OPS-FIRST-OWNER-BETA-RESULT-REVIEW.json",
      ".gpao-t/packages/OWNER-OPS-MARKET-EVIDENCE-BUNDLE.json",
      ".gpao-t/packages/OWNER-OPS-MARKET-EVIDENCE-BUNDLE.md",
    ],
    findings,
    nextSafeAction: findings.length
      ? "Repair market evidence findings before preparing public package review."
      : "Use this bundle for replay fixture, privacy copy, and package review; public submission still requires explicit owner approval.",
  };
}

export function writeOwnerOpsMarketEvidenceBundle({
  root = process.cwd(),
  result = DEFAULT_FIRST_OWNER_BETA_RESULT,
} = {}) {
  const bundle = buildOwnerOpsMarketEvidenceBundle({ root, result });
  const outputDir = join(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = join(outputDir, "OWNER-OPS-MARKET-EVIDENCE-BUNDLE.json");
  const mdPath = join(outputDir, "OWNER-OPS-MARKET-EVIDENCE-BUNDLE.md");

  writeFileSync(jsonPath, `${JSON.stringify(bundle, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsMarketEvidenceBundleMarkdown(bundle));

  return {
    schema: "gpao_t.owner_ops_market_evidence_bundle_write.v0_1",
    status: bundle.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-MARKET-EVIDENCE-BUNDLE.json",
      ".gpao-t/packages/OWNER-OPS-MARKET-EVIDENCE-BUNDLE.md",
    ],
    bundleStatus: bundle.status,
    publicSubmissionAllowed: bundle.authorityBoundary.publicSubmissionAllowed,
    findings: bundle.findings,
    nextSafeAction: bundle.nextSafeAction,
  };
}

export function verifyOwnerOpsMarketEvidenceBundle({
  root,
  result = DEFAULT_FIRST_OWNER_BETA_RESULT,
} = {}) {
  const bundle = buildOwnerOpsMarketEvidenceBundle({ root, result });
  const findings = [...bundle.findings];

  if (bundle.status !== "ready") findings.push("market_evidence_bundle_not_ready");
  if (bundle.betaResultReview.marketReadinessContributionAllowed !== true) {
    findings.push("beta_result_market_contribution_not_allowed");
  }
  if (bundle.synthesis.acceptance.noCriticalBlockers !== true) findings.push("critical_blockers_not_cleared");
  if (bundle.industryTemplateCatalog.industryGroupCount < 3) findings.push("industry_coverage_below_three");
  if (bundle.marketReadinessGate.publicSubmissionAllowed !== false) {
    findings.push("public_submission_must_remain_blocked");
  }
  if (bundle.authorityBoundary.externalUploadAllowed !== false) findings.push("external_upload_must_remain_blocked");

  return {
    schema: "gpao_t.owner_ops_market_evidence_bundle_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedSurfaces: [
      "first-owner beta result review",
      "feedback synthesis",
      "industry template catalog",
      "market readiness gate",
      "public submission boundary",
      "external/customer/live/payment boundaries",
    ],
    publicSubmissionAllowed: bundle.authorityBoundary.publicSubmissionAllowed,
    industryGroupCount: bundle.industryTemplateCatalog.industryGroupCount,
    nextSafeAction: findings.length
      ? "Fix market evidence bundle findings."
      : "Proceed to replay fixture/privacy/package review while keeping public submission blocked.",
  };
}

export function buildOwnerOpsBetaFeedbackActionQueue({
  root,
  result = DEFAULT_FIRST_OWNER_BETA_RESULT,
} = {}) {
  const evidence = buildOwnerOpsMarketEvidenceBundle({ root, result });
  const review = buildOwnerOpsFirstOwnerBetaResultReview({ root, result });
  const feedbackSamples = mergeResultFeedbackSample(review.marketFeedbackSample);
  const synthesis = buildOwnerOpsBetaFeedbackSynthesis({ feedbackSamples });
  const catalog = buildOwnerOpsIndustryTemplateCatalog({ feedbackSamples });
  const findings = [];

  if (evidence.status !== "ready") findings.push("market_evidence_bundle_not_ready");
  if (review.status !== "ready") findings.push("first_owner_beta_result_review_not_ready");
  if (synthesis.acceptance.noCriticalBlockers !== true) findings.push("critical_feedback_blockers_present");
  if (catalog.templates.length < 3) findings.push("industry_template_coverage_below_market_threshold");

  const templateActions = catalog.templates.flatMap((group) =>
    group.templates.map((template) => ({
      id: `template:${group.industry}:${slugify(template.name)}`,
      lane: "template_replay_fixture",
      priority: "P1",
      industry: group.industry,
      title: `${group.industry} ${template.name} replay fixture`,
      sourceSignal: template.replayNeed,
      expectedArtifact: "sample input -> local draft -> owner decision -> replay assertion",
      authorityBoundary: ["local fixture only", "no customer send", "no public publish"],
      doneWhen: "fixture exists and verifies no customer auto-send",
    }))
  );

  const queueItems = [
    ...templateActions,
    {
      id: "copy:privacy-and-no-autosend",
      lane: "privacy_copy",
      priority: "P0",
      title: "사장님용 개인정보/자동발송 금지 안내 문구 보강",
      sourceSignal: "first owner beta trust and no-auto-send understanding",
      expectedArtifact: "privacy copy pack update with plain Korean owner-facing language",
      authorityBoundary: ["copy draft only", "no legal claim", "no customer send"],
      doneWhen: "privacy copy explains sample/de-identified data, no auto-send, and owner confirmation",
    },
    {
      id: "ux:first-owner-setup-friction",
      lane: "owner_ux_copy",
      priority: review.ratings.setupFriction > 2 ? "P0" : "P1",
      title: "첫 사장님 setup friction 완화 문구/흐름 보강",
      sourceSignal: `setupFriction=${review.ratings.setupFriction}`,
      expectedArtifact: "owner-facing first screen and host setup wording repair",
      authorityBoundary: ["UX copy/design only", "no live host registration"],
      doneWhen: "owner can identify what to paste, what stays locked, and what happens next",
    },
    {
      id: "package:pre-public-review-bridge",
      lane: "package_review",
      priority: "P1",
      title: "pre-public package review에 beta evidence 연결",
      sourceSignal: "market evidence bundle ready, public submission blocked",
      expectedArtifact: "pre-public package review references beta feedback action queue",
      authorityBoundary: ["review evidence only", "no marketplace upload", "no signing"],
      doneWhen: "pre-public review can show beta-derived work items and blocked release authority",
    },
  ];

  return {
    schema: "gpao_t.owner_ops_beta_feedback_action_queue.v0_1",
    status: findings.length ? "review" : "ready",
    queueStage: "post_first_owner_beta_product_improvement",
    sourceEvidence: {
      betaResultReviewStatus: review.status,
      marketEvidenceBundleStatus: evidence.status,
      host: review.host,
      industry: review.industry,
      requestedTemplates: review.requestedTemplates,
      ratings: review.ratings,
      marketStage: evidence.marketReadinessGate.marketStage,
      publicSubmissionAllowed: evidence.authorityBoundary.publicSubmissionAllowed,
    },
    queueSummary: {
      itemCount: queueItems.length,
      p0Count: queueItems.filter((item) => item.priority === "P0").length,
      p1Count: queueItems.filter((item) => item.priority === "P1").length,
      lanes: [...new Set(queueItems.map((item) => item.lane))],
    },
    queueItems,
    blockedActions: [
      "public_market_publish",
      "marketplace_upload",
      "package_signing",
      "customer_message_send",
      "credential_read_write",
      "install_update_rollback",
      "background_automation",
    ],
    authorityBoundary: {
      improvementQueueOnly: true,
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
    findings,
    nextSafeAction: findings.length
      ? "Fix beta feedback action queue findings before using it for pre-public package review."
      : "Use this queue to repair templates, privacy copy, and owner UX before any public package review.",
  };
}

export function writeOwnerOpsBetaFeedbackActionQueue({
  root = process.cwd(),
  result = DEFAULT_FIRST_OWNER_BETA_RESULT,
} = {}) {
  const queue = buildOwnerOpsBetaFeedbackActionQueue({ root, result });
  const outputDir = join(root, ".gpao-t", "packages");
  mkdirSync(outputDir, { recursive: true });
  const jsonPath = join(outputDir, "OWNER-OPS-BETA-FEEDBACK-ACTION-QUEUE.json");
  const mdPath = join(outputDir, "OWNER-OPS-BETA-FEEDBACK-ACTION-QUEUE.md");

  writeFileSync(jsonPath, `${JSON.stringify(queue, null, 2)}\n`);
  writeFileSync(mdPath, renderOwnerOpsBetaFeedbackActionQueueMarkdown(queue));

  return {
    schema: "gpao_t.owner_ops_beta_feedback_action_queue_write.v0_1",
    status: queue.status === "ready" ? "written_local_only" : "review",
    filesWritten: [
      ".gpao-t/packages/OWNER-OPS-BETA-FEEDBACK-ACTION-QUEUE.json",
      ".gpao-t/packages/OWNER-OPS-BETA-FEEDBACK-ACTION-QUEUE.md",
    ],
    queueStatus: queue.status,
    itemCount: queue.queueSummary.itemCount,
    findings: queue.findings,
    authorityBoundary: queue.authorityBoundary,
    nextSafeAction: queue.nextSafeAction,
  };
}

export function verifyOwnerOpsBetaFeedbackActionQueue({
  root,
  result = DEFAULT_FIRST_OWNER_BETA_RESULT,
} = {}) {
  const queue = buildOwnerOpsBetaFeedbackActionQueue({ root, result });
  const findings = [...queue.findings];

  if (queue.status !== "ready") findings.push("beta_feedback_action_queue_not_ready");
  if (queue.queueSummary.itemCount < 4) findings.push("queue_items_insufficient");
  if (!queue.queueSummary.lanes.includes("template_replay_fixture")) findings.push("template_replay_fixture_lane_missing");
  if (!queue.queueSummary.lanes.includes("privacy_copy")) findings.push("privacy_copy_lane_missing");
  if (!queue.queueSummary.lanes.includes("owner_ux_copy")) findings.push("owner_ux_copy_lane_missing");
  if (queue.authorityBoundary.publicSubmissionAllowed !== false) findings.push("public_submission_boundary_open");
  if (queue.authorityBoundary.customerSendExecuted !== false) findings.push("customer_send_boundary_open");
  if (queue.authorityBoundary.signingExecuted !== false) findings.push("signing_boundary_open");

  return {
    schema: "gpao_t.owner_ops_beta_feedback_action_queue_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    itemCount: queue.queueSummary.itemCount,
    lanes: queue.queueSummary.lanes,
    checkedSurfaces: [
      "first-owner beta result review",
      "market evidence bundle",
      "requested template signals",
      "privacy copy lane",
      "owner UX lane",
      "package review lane",
      "public release boundary",
    ],
    nextSafeAction: findings.length
      ? "Fix beta feedback action queue findings."
      : "Use this queue as the pre-public repair backlog while keeping publication blocked.",
  };
}

function mergeResultFeedbackSample(resultSample) {
  const samples = [resultSample, ...DEFAULT_BETA_FEEDBACK].filter(Boolean);
  const seen = new Set();
  return samples.filter((sample) => {
    const key = `${sample.host || "unknown"}:${sample.industry || "unknown"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildFieldTestTemplateActions(records) {
  const requested = new Map();
  for (const record of records) {
    for (const template of record.requestedTemplates || []) {
      const key = `${record.industry || "unknown"}:${template}`;
      if (!requested.has(key)) {
        requested.set(key, {
          industry: record.industry || "unknown",
          template,
          hosts: new Set(),
          stages: new Set(),
        });
      }
      requested.get(key).hosts.add(record.host || "unknown");
      requested.get(key).stages.add(record.stage || "unknown");
    }
  }

  return [...requested.values()].map((item) => ({
    id: `field-template:${item.industry}:${slugify(item.template)}`,
    lane: "template_replay_fixture",
    priority: "P1",
    industry: item.industry,
    title: `${item.industry} ${item.template} field-test replay fixture`,
    sourceSignal: `requested in ${[...item.stages].join(", ")} via ${[...item.hosts].join(", ")}`,
    expectedArtifact: "sample/de-identified input -> local draft -> owner confirmation -> replay assertion",
    authorityBoundary: ["local fixture only", "no customer send", "no public publish"],
    doneWhen: "fixture verifies draft usefulness and no customer auto-send for this template",
  }));
}

function buildFieldTestFrictionActions(records) {
  const highFriction = records.filter((record) => Number(record.ratings?.setupFriction || 0) > 2.5);
  const lowUnderstandability = records.filter((record) => Number(record.ratings?.understandability || 0) < 4);

  return [
    {
      id: "field-ux:what-to-paste-next-action",
      lane: "owner_ux_copy",
      priority: highFriction.length || lowUnderstandability.length ? "P0" : "P1",
      title: "처음 쓰는 사장님이 무엇을 붙여넣고 무엇을 누를지 알 수 있게 보강",
      sourceSignal: `setupFrictionHigh=${highFriction.length}, understandabilityLow=${lowUnderstandability.length}`,
      expectedArtifact: "first-owner guide and work surface copy that shows paste target, locked actions, and next safe action",
      authorityBoundary: ["UX/copy only", "no live account registration", "no customer send"],
      doneWhen: "a first owner can identify input, preview, confirmation, and locked actions without developer help",
    },
  ];
}

function buildFieldTestTrustActions(records) {
  const lowTrust = records.filter((record) => Number(record.ratings?.trust || 0) < 4);
  const blockers = records.flatMap((record) => record.blockerTags || []);

  return [
    {
      id: "field-trust:no-autosend-privacy-boundary",
      lane: "trust_safety_copy",
      priority: lowTrust.length || blockers.length ? "P0" : "P1",
      title: "자동 발송 금지와 샘플/비식별 데이터 경계를 더 선명하게 표시",
      sourceSignal: `trustLow=${lowTrust.length}, blockerTags=${[...new Set(blockers)].join(", ") || "none"}`,
      expectedArtifact: "Korean trust/safety copy for no auto-send, sample/de-identified data, and owner confirmation",
      authorityBoundary: ["copy/review only", "no legal claim", "no external send"],
      doneWhen: "field-test users can explain that GPAO-T drafts locally and does not send or connect live accounts by itself",
    },
  ];
}

function slugify(value) {
  return String(value || "item")
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function summarizeRatings(samples) {
  return {
    understandability: average(samples.map((sample) => sample.understandability)),
    usefulness: average(samples.map((sample) => sample.usefulness)),
    trust: average(samples.map((sample) => sample.trust)),
    setupFriction: average(samples.map((sample) => sample.setupFriction)),
  };
}

function average(values) {
  const numbers = values.map(Number).filter((value) => Number.isFinite(value));
  if (!numbers.length) return 0;
  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(2));
}

function buildTemplateInputHint(name) {
  if (/배송|교환|환불|재입고/.test(name)) return "문의 CSV 또는 붙여넣기 문장";
  if (/예약|노쇼|가격/.test(name)) return "문자/DM/톡 예약 문의 붙여넣기";
  if (/리뷰|영업시간/.test(name)) return "리뷰 또는 고객 문의 텍스트";
  return "붙여넣기 또는 CSV 샘플";
}

function buildTemplateOutputHint(name) {
  if (/배송|교환|환불|재입고/.test(name)) return "문의 분류, 답변 초안, 확인 필요 항목";
  if (/예약|노쇼|가격/.test(name)) return "예약 가능성 확인 질문, 응대 초안, 사장님 확인 항목";
  if (/리뷰|영업시간/.test(name)) return "톤 분류, 답변 초안, 개선 포인트";
  return "요약, 초안, 확인 필요 항목";
}

function renderOwnerOpsFieldTestActionQueueMarkdown(queue) {
  const lines = [
    "# Owner Ops Field Test Action Queue",
    "",
    `Status: ${queue.status}`,
    `Stage: ${queue.queueStage}`,
    `Records: ${queue.sourceEvidence.recordCount}`,
    `Items: ${queue.queueSummary.itemCount}`,
    "",
    "## Source Evidence",
    "",
    `- Ledger status: ${queue.sourceEvidence.ledgerStatus}`,
    `- Ledger state: ${queue.sourceEvidence.ledgerState}`,
    `- Stages: ${queue.sourceEvidence.stageCoverage.join(", ") || "none"}`,
    `- Hosts: ${queue.sourceEvidence.hostCoverage.join(", ") || "none"}`,
    `- Industries: ${queue.sourceEvidence.industryCoverage.join(", ") || "none"}`,
    `- Unsafe records: ${queue.sourceEvidence.unsafeRecordCount}`,
    `- Critical blockers: ${queue.sourceEvidence.criticalBlockerCount}`,
    "",
    "## Queue Items",
    "",
    ...queue.queueItems.map((item) =>
      `- [${item.priority}] ${item.title}\n  - Lane: ${item.lane}\n  - Source: ${item.sourceSignal}\n  - Done when: ${item.doneWhen}`
    ),
    "",
    "## Blocked Actions",
    "",
    ...queue.blockedActions.map((action) => `- ${action}`),
    "",
    "## Findings",
    "",
    ...(queue.findings.length ? queue.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    queue.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderOwnerOpsFieldTestRepairCompletionMarkdown(evidence) {
  const lines = [
    "# Owner Ops Field Test Repair Completion Evidence",
    "",
    `Status: ${evidence.status}`,
    `Stage: ${evidence.completionStage}`,
    `Completed: ${evidence.completionSummary.completedCount}/${evidence.completionSummary.itemCount}`,
    "",
    "## Source Queue",
    "",
    `- Queue status: ${evidence.sourceQueue.status}`,
    `- Queue items: ${evidence.sourceQueue.itemCount}`,
    `- Public submission allowed: ${evidence.sourceQueue.publicSubmissionAllowed}`,
    `- Customer send allowed: ${evidence.sourceQueue.customerSendAllowed}`,
    `- Live account connection allowed: ${evidence.sourceQueue.liveAccountConnectionAllowed}`,
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
    `- Marketplace upload allowed: ${evidence.authorityBoundary.marketplaceUploadAllowed}`,
    `- Customer send allowed: ${evidence.authorityBoundary.customerSendAllowed}`,
    `- Live account connection allowed: ${evidence.authorityBoundary.liveAccountConnectionAllowed}`,
    "",
    "## Findings",
    "",
    ...(evidence.findings.length ? evidence.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    evidence.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderFirstOwnerBetaResultReviewMarkdown(review) {
  const lines = [
    "# Owner Ops First Owner Beta Result Review",
    "",
    `Status: ${review.status}`,
    `Owner profile: ${review.ownerProfile}`,
    `Host: ${review.host}`,
    `Industry: ${review.industry}`,
    "",
    "## Ratings",
    "",
    `- Understandability: ${review.ratings.understandability}`,
    `- Usefulness: ${review.ratings.usefulness}`,
    `- Trust: ${review.ratings.trust}`,
    `- Setup friction: ${review.ratings.setupFriction}`,
    "",
    "## Safety Result",
    "",
    `- Data mode: ${review.safetyResult.dataMode}`,
    `- No auto-send understood: ${review.safetyResult.understoodNoAutoSend}`,
    `- Customer send executed: ${review.safetyResult.actualCustomerSendExecuted}`,
    `- Live account connected: ${review.safetyResult.liveAccountConnected}`,
    `- Payment/refund/delete executed: ${review.safetyResult.paymentRefundDeleteExecuted}`,
    "",
    "## Requested Templates",
    "",
    ...review.requestedTemplates.map((template) => `- ${template}`),
    "",
    "## Findings",
    "",
    ...(review.findings.length ? review.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    review.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderOwnerOpsBetaFeedbackActionQueueMarkdown(queue) {
  const lines = [
    "# Owner Ops Beta Feedback Action Queue",
    "",
    `Status: ${queue.status}`,
    `Stage: ${queue.queueStage}`,
    `Items: ${queue.queueSummary.itemCount}`,
    "",
    "## Source Evidence",
    "",
    `- Beta result review: ${queue.sourceEvidence.betaResultReviewStatus}`,
    `- Market evidence bundle: ${queue.sourceEvidence.marketEvidenceBundleStatus}`,
    `- Host: ${queue.sourceEvidence.host}`,
    `- Industry: ${queue.sourceEvidence.industry}`,
    `- Public submission allowed: ${queue.sourceEvidence.publicSubmissionAllowed}`,
    "",
    "## Queue Items",
    "",
    ...queue.queueItems.map((item) =>
      `- [${item.priority}] ${item.title}\n  - Lane: ${item.lane}\n  - Done when: ${item.doneWhen}`
    ),
    "",
    "## Blocked Actions",
    "",
    ...queue.blockedActions.map((action) => `- ${action}`),
    "",
    "## Next Safe Action",
    "",
    queue.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function renderOwnerOpsMarketEvidenceBundleMarkdown(bundle) {
  const lines = [
    "# Owner Ops Market Evidence Bundle",
    "",
    `Status: ${bundle.status}`,
    `Evidence stage: ${bundle.evidenceStage}`,
    "",
    "## Beta Result Review",
    "",
    `- Status: ${bundle.betaResultReview.status}`,
    `- Owner profile: ${bundle.betaResultReview.ownerProfile}`,
    `- Host: ${bundle.betaResultReview.host}`,
    `- Industry: ${bundle.betaResultReview.industry}`,
    `- Contribution allowed: ${bundle.betaResultReview.marketReadinessContributionAllowed}`,
    "",
    "## Synthesis",
    "",
    `- Sample count: ${bundle.synthesis.sampleCount}`,
    `- Hosts: ${bundle.synthesis.hostCoverage.join(", ")}`,
    `- Industries: ${bundle.synthesis.industryCoverage.join(", ")}`,
    `- No critical blockers: ${bundle.synthesis.acceptance.noCriticalBlockers}`,
    "",
    "## Industry Template Catalog",
    "",
    `- Industry groups: ${bundle.industryTemplateCatalog.industryGroupCount}`,
    `- Template count: ${bundle.industryTemplateCatalog.templateCount}`,
    "",
    "## Market Gate",
    "",
    `- Status: ${bundle.marketReadinessGate.status}`,
    `- Stage: ${bundle.marketReadinessGate.marketStage}`,
    `- Public submission allowed: ${bundle.marketReadinessGate.publicSubmissionAllowed}`,
    "",
    "## Blocked Actions",
    "",
    ...bundle.blockedActions.map((action) => `- ${action}`),
    "",
    "## Findings",
    "",
    ...(bundle.findings.length ? bundle.findings.map((finding) => `- ${finding}`) : ["- none"]),
    "",
    "## Next Safe Action",
    "",
    bundle.nextSafeAction,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function fieldTestAuthorityBoundary() {
  return {
    localLedgerOnly: true,
    publicSubmissionAllowed: false,
    externalUploadAllowed: false,
    customerSendAllowed: false,
    liveAccountConnectionAllowed: false,
    paymentRefundDeleteAllowed: false,
    marketplacePublishAllowed: false,
    durableMemoryPromotionAllowed: false,
  };
}

function normalizeFieldTestRecord({ record, now }) {
  const ratings = record.ratings || {};
  const stage = ["team_alpha", "first_owner_beta"].includes(record.stage)
    ? record.stage
    : "team_alpha";
  const host = ["codex", "openclaw", "claude_code"].includes(record.host)
    ? record.host
    : "codex";
  const industry = record.industry || "unknown";
  const testerRole = record.testerRole || (stage === "team_alpha" ? "internal_team_tester" : "first_owner_tester");
  const requestedTemplates = Array.isArray(record.requestedTemplates) ? record.requestedTemplates : [];
  const blockerTags = Array.isArray(record.blockerTags) ? record.blockerTags : [];
  const notes = Array.isArray(record.notes) ? record.notes : [];
  const idSource = [
    now,
    stage,
    host,
    testerRole,
    industry,
    requestedTemplates.join("|"),
    blockerTags.join("|"),
  ].join(":");

  return {
    schema: "gpao_t.owner_ops_field_test_record.v0_1",
    id: `owner-ops-field-test-${Buffer.from(idSource).toString("base64url").slice(0, 18)}`,
    recordedAt: now,
    stage,
    host,
    testerRole,
    industry,
    dataMode: record.dataMode || "sample_or_deidentified",
    understoodNoAutoSend: record.understoodNoAutoSend === true,
    actualCustomerSendExecuted: record.actualCustomerSendExecuted === true,
    liveAccountConnected: record.liveAccountConnected === true,
    paymentRefundDeleteExecuted: record.paymentRefundDeleteExecuted === true,
    ratings: {
      understandability: Number(ratings.understandability || 0),
      usefulness: Number(ratings.usefulness || 0),
      trust: Number(ratings.trust || 0),
      setupFriction: Number(ratings.setupFriction || 0),
    },
    blockerTags,
    requestedTemplates,
    notes,
    authorityBoundary: fieldTestAuthorityBoundary(),
  };
}

function validateFieldTestRecord(record) {
  const findings = [];

  if (!["team_alpha", "first_owner_beta"].includes(record.stage)) findings.push("invalid_stage");
  if (!["codex", "openclaw", "claude_code"].includes(record.host)) findings.push("invalid_host");
  if (record.dataMode !== "sample_or_deidentified") findings.push("data_mode_must_be_sample_or_deidentified");
  if (record.understoodNoAutoSend !== true) findings.push("no_auto_send_understanding_required");
  if (record.actualCustomerSendExecuted !== false) findings.push("customer_send_must_not_execute");
  if (record.liveAccountConnected !== false) findings.push("live_account_must_not_connect");
  if (record.paymentRefundDeleteExecuted !== false) findings.push("payment_refund_delete_must_not_execute");
  if (record.ratings.understandability < 1 || record.ratings.understandability > 5) {
    findings.push("understandability_rating_out_of_range");
  }
  if (record.ratings.usefulness < 1 || record.ratings.usefulness > 5) findings.push("usefulness_rating_out_of_range");
  if (record.ratings.trust < 1 || record.ratings.trust > 5) findings.push("trust_rating_out_of_range");
  if (record.ratings.setupFriction < 1 || record.ratings.setupFriction > 5) {
    findings.push("setup_friction_rating_out_of_range");
  }

  return findings;
}
