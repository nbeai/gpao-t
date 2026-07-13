import { verifyOwnerOpsPack } from "./owner-ops.js";
import { verifyOwnerOpsMcpReadiness } from "./owner-ops-connectors.js";
import { verifyOwnerOpsMcpServer } from "./owner-ops-mcp-server.js";
import { verifyOwnerOpsReadOnlyIntakeConnectors } from "./owner-ops-intake-connectors.js";
import { verifyOwnerOpsPluginPackage } from "./owner-ops-package.js";
import {
  verifyOwnerOpsBetaFeedbackActionQueue,
  verifyOwnerOpsFieldTestActionQueue,
  verifyOwnerOpsFieldTestLedger,
  verifyOwnerOpsFieldTestRepairCompletionEvidence,
  verifyOwnerOpsFirstOwnerBetaResultReview,
  verifyOwnerOpsMarketEvidenceBundle,
  verifyOwnerOpsMarketReadiness,
} from "./owner-ops-market-readiness.js";
import {
  verifyOwnerOpsFirstOwnerBetaHandoffBundle,
  verifyOwnerOpsFirstOwnerBetaOperationalTestPackage,
  verifyOwnerOpsTeamAlphaHandoffBundle,
} from "./owner-ops-team-alpha-package.js";
import {
  verifyOwnerOpsPrePublicEvidenceBridge,
  verifyOwnerOpsPrePublicPackage,
  verifyOwnerOpsPrePublicRepairBacklog,
  verifyOwnerOpsPrePublicRepairCompletionEvidence,
} from "./owner-ops-public-package.js";
import {
  verifyOwnerOpsBroaderOwnerTestingHandoff,
  verifyOwnerOpsBroaderOwnerTestingResultLedger,
  verifyOwnerOpsBroaderOwnerTestingRepairCompletionEvidence,
  verifyOwnerOpsBroaderOwnerTestingRepairQueue,
  verifyOwnerOpsFinalLocalReleaseCandidateDecisionPacket,
  verifyOwnerOpsFinalCandidateOwnerDecisionLane,
  verifyOwnerOpsFinalCandidateNextActionPacket,
  verifyOwnerOpsNextOwnerTestingLoop,
  verifyOwnerOpsPublicReleaseReadbackSnapshot,
  readOwnerOpsFinalCandidateOwnerDecisionRecords,
} from "./owner-ops-distribution.js";

function statusOf(check) {
  return check?.status || "unknown";
}

function isReady(check) {
  return statusOf(check) === "ready";
}

function collectFindings(entries) {
  return entries.flatMap(([id, check]) => (check?.findings || []).map((finding) => `${id}:${finding}`));
}

function phaseStatus(checks) {
  return checks.every((check) => isReady(check)) ? "ready" : "review";
}

function phase(id, label, checks, evidence) {
  return {
    id,
    label,
    status: phaseStatus(checks),
    checks: checks.map((check) => ({
      schema: check.schema,
      status: statusOf(check),
      findings: check.findings || [],
    })),
    evidence,
  };
}

export function buildOwnerOpsProductAxisReadinessMatrix({ root = process.cwd() } = {}) {
  const skillPack = verifyOwnerOpsPack({ root });
  const mcpReadiness = verifyOwnerOpsMcpReadiness({ root });
  const mcpServer = verifyOwnerOpsMcpServer({ root });
  const intake = verifyOwnerOpsReadOnlyIntakeConnectors({ root });
  const pluginPackage = verifyOwnerOpsPluginPackage({ root });
  const teamAlphaHandoff = verifyOwnerOpsTeamAlphaHandoffBundle({ root });
  const firstOwnerBetaHandoff = verifyOwnerOpsFirstOwnerBetaHandoffBundle({ root });
  const firstOwnerBetaOperational = verifyOwnerOpsFirstOwnerBetaOperationalTestPackage({ root });
  const firstOwnerBetaResult = verifyOwnerOpsFirstOwnerBetaResultReview({ root });
  const fieldTestLedger = verifyOwnerOpsFieldTestLedger({ root });
  const fieldTestActionQueue = verifyOwnerOpsFieldTestActionQueue({ root });
  const fieldTestRepairCompletion = verifyOwnerOpsFieldTestRepairCompletionEvidence({ root });
  const broaderOwnerTestingHandoff = verifyOwnerOpsBroaderOwnerTestingHandoff({ root });
  const broaderOwnerTestingResultLedger = verifyOwnerOpsBroaderOwnerTestingResultLedger({ root });
  const broaderOwnerTestingRepairQueue = verifyOwnerOpsBroaderOwnerTestingRepairQueue({ root });
  const broaderOwnerTestingRepairCompletion = verifyOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root });
  const nextOwnerTestingLoop = verifyOwnerOpsNextOwnerTestingLoop({ root });
  const betaFeedbackActionQueue = verifyOwnerOpsBetaFeedbackActionQueue({ root });
  const marketReadiness = verifyOwnerOpsMarketReadiness({ root });
  const marketEvidence = verifyOwnerOpsMarketEvidenceBundle({ root });
  const prePublicPackage = verifyOwnerOpsPrePublicPackage({ root });
  const prePublicBridge = verifyOwnerOpsPrePublicEvidenceBridge({ root });
  const prePublicRepairBacklog = verifyOwnerOpsPrePublicRepairBacklog({ root });
  const prePublicRepairCompletion = verifyOwnerOpsPrePublicRepairCompletionEvidence({ root });
  const releaseReadback = verifyOwnerOpsPublicReleaseReadbackSnapshot({ root });
  const finalLocalReleaseCandidate = verifyOwnerOpsFinalLocalReleaseCandidateDecisionPacket({ root });
  const finalCandidateOwnerDecisionLane = verifyOwnerOpsFinalCandidateOwnerDecisionLane({ root });
  const finalCandidateNextAction = verifyOwnerOpsFinalCandidateNextActionPacket({ root });

  const phases = [
    phase(
      "skill_pack",
      "Skill Pack",
      [skillPack],
      ["workflows", "authority matrix", "first owner scenario", "local record/replay"],
    ),
    phase(
      "mcp_connectors",
      "MCP / Connectors",
      [mcpReadiness, mcpServer, intake],
      ["stdio MCP contract", "read-only connector catalog", "paste/table/file/folder intake"],
    ),
    phase(
      "plugin_market_package",
      "Plugin / Market Package",
      [pluginPackage, marketReadiness, marketEvidence],
      ["plugin manifest", "market listing draft", "first owner beta/market evidence"],
    ),
    phase(
      "field_validation",
      "Team Alpha / First Owner Beta",
      [
        teamAlphaHandoff,
        firstOwnerBetaHandoff,
        firstOwnerBetaOperational,
        firstOwnerBetaResult,
        fieldTestLedger,
        fieldTestActionQueue,
        fieldTestRepairCompletion,
        broaderOwnerTestingHandoff,
        broaderOwnerTestingResultLedger,
        broaderOwnerTestingRepairQueue,
        broaderOwnerTestingRepairCompletion,
        nextOwnerTestingLoop,
        betaFeedbackActionQueue,
      ],
      ["team alpha handoff", "first-owner beta handoff", "operational package", "result review", "field-test ledger", "field-test action queue", "field-test repair completion", "broader owner testing handoff", "broader owner testing result ledger", "broader owner testing repair queue", "broader owner testing repair completion", "next owner testing loop", "feedback action queue"],
    ),
    phase(
      "pre_public_distribution",
      "Pre-Public Distribution",
      [prePublicPackage, prePublicBridge, prePublicRepairBacklog, prePublicRepairCompletion],
      ["pre-public package review", "evidence bridge", "repair backlog", "repair completion evidence"],
    ),
    phase(
      "release_authority_readback",
      "Release Authority Readback",
      [releaseReadback, finalLocalReleaseCandidate, finalCandidateOwnerDecisionLane, finalCandidateNextAction],
      ["fast release prerequisite snapshot", "final local release candidate decision packet", "final candidate owner decision lane", "final candidate next action packet", "human decision lane", "marketplace/upload decision lane"],
    ),
  ];

  const blockingFindings = collectFindings([
    ["skill_pack", skillPack],
    ["mcp_readiness", mcpReadiness],
    ["mcp_server", mcpServer],
    ["read_only_intake", intake],
    ["plugin_package", pluginPackage],
    ["team_alpha_handoff", teamAlphaHandoff],
    ["first_owner_beta_handoff", firstOwnerBetaHandoff],
    ["first_owner_beta_operational", firstOwnerBetaOperational],
    ["first_owner_beta_result", firstOwnerBetaResult],
    ["field_test_ledger", fieldTestLedger],
    ["field_test_action_queue", fieldTestActionQueue],
    ["field_test_repair_completion", fieldTestRepairCompletion],
    ["broader_owner_testing_handoff", broaderOwnerTestingHandoff],
    ["broader_owner_testing_result_ledger", broaderOwnerTestingResultLedger],
    ["broader_owner_testing_repair_queue", broaderOwnerTestingRepairQueue],
    ["broader_owner_testing_repair_completion", broaderOwnerTestingRepairCompletion],
    ["next_owner_testing_loop", nextOwnerTestingLoop],
    ["beta_feedback_action_queue", betaFeedbackActionQueue],
    ["market_readiness", marketReadiness],
    ["market_evidence", marketEvidence],
    ["pre_public_package", prePublicPackage],
    ["pre_public_bridge", prePublicBridge],
    ["pre_public_repair_backlog", prePublicRepairBacklog],
    ["pre_public_repair_completion", prePublicRepairCompletion],
    ["release_readback", releaseReadback],
    ["final_local_release_candidate", finalLocalReleaseCandidate],
    ["final_candidate_owner_decision_lane", finalCandidateOwnerDecisionLane],
    ["final_candidate_next_action", finalCandidateNextAction],
  ]);
  const readyPhases = phases.filter((item) => item.status === "ready").length;
  const releaseBoundary = {
    publicReleaseAllowed: false,
    packageUploadAllowed: false,
    networkUploadAllowed: false,
    signingAllowed: false,
    credentialAccessAllowed: false,
    installAllowed: false,
    updateAllowed: false,
    rollbackAllowed: false,
    externalDistributionAllowed: false,
  };

  return {
    schema: "gpao_t.owner_ops_product_axis_readiness_matrix.v0_1",
    status: blockingFindings.length ? "review" : "ready",
    productAxisState: blockingFindings.length
      ? "product_axis_needs_review"
      : "local_product_axis_ready_public_release_closed",
    goalSequence: ["skill_pack", "mcp_connectors", "plugin_market_package"],
    phaseCount: phases.length,
    readyPhaseCount: readyPhases,
    phases,
    releasePrerequisiteReadback: releaseReadback.releasePrerequisites || {},
    decisionRecords: {
      humanReview: releaseReadback.releasePrerequisites?.humanReviewDecisionRecords ?? null,
      marketplaceUpload: releaseReadback.releasePrerequisites?.marketplaceUploadDecisionRecords ?? null,
    },
    authorityBoundary: releaseBoundary,
    blockingFindings,
    completionBoundary: {
      localProductAxisCanBeReviewed: readyPhases === phases.length,
      publicReleaseCompleted: false,
      marketplacePublished: false,
      teamOrOwnerFieldTestCompleted: false,
    },
    nextSafeAction: blockingFindings.length
      ? "Review the listed Owner Ops product-axis findings before claiming local product-axis readiness."
      : "Use this matrix as local product-axis readiness evidence; public release, upload, signing, install/update/rollback, and marketplace publication remain closed.",
  };
}

export function verifyOwnerOpsProductAxisReadinessMatrix({ root = process.cwd() } = {}) {
  const matrix = buildOwnerOpsProductAxisReadinessMatrix({ root });
  const findings = [...matrix.blockingFindings];

  if (!matrix.goalSequence.includes("skill_pack")) findings.push("skill_pack_sequence_missing");
  if (!matrix.goalSequence.includes("mcp_connectors")) findings.push("mcp_connector_sequence_missing");
  if (!matrix.goalSequence.includes("plugin_market_package")) findings.push("plugin_market_sequence_missing");
  if (matrix.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (matrix.authorityBoundary.packageUploadAllowed !== false) findings.push("package_upload_boundary_opened");
  if (matrix.authorityBoundary.credentialAccessAllowed !== false) findings.push("credential_boundary_opened");
  if (matrix.completionBoundary.publicReleaseCompleted !== false) findings.push("public_release_completion_overclaimed");
  if (matrix.completionBoundary.marketplacePublished !== false) findings.push("marketplace_publication_overclaimed");

  return {
    schema: "gpao_t.owner_ops_product_axis_readiness_matrix_check.v0_1",
    status: findings.length ? "review" : "ready",
    findings,
    productAxisState: matrix.productAxisState,
    readyPhaseCount: matrix.readyPhaseCount,
    phaseCount: matrix.phaseCount,
    phaseStatuses: matrix.phases.map((item) => ({
      id: item.id,
      status: item.status,
    })),
    publicReleaseAllowed: matrix.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: matrix.authorityBoundary.packageUploadAllowed,
    networkUploadAllowed: matrix.authorityBoundary.networkUploadAllowed,
    nextSafeAction: matrix.nextSafeAction,
  };
}

export function buildOwnerOpsProductionCompletionAudit({ root = process.cwd() } = {}) {
  const matrix = buildOwnerOpsProductAxisReadinessMatrix({ root });
  const finalDecisionRecords = readOwnerOpsFinalCandidateOwnerDecisionRecords({ root });
  const phaseById = Object.fromEntries(matrix.phases.map((item) => [item.id, item]));
  const requirementRows = [
    {
      id: "skill_pack_axis",
      label: "Skill pack axis",
      status: phaseById.skill_pack?.status === "ready" ? "satisfied" : "review",
      evidence: ["owner-ops product-axis-readiness phase: skill_pack"],
    },
    {
      id: "mcp_connector_axis",
      label: "MCP / connector axis",
      status: phaseById.mcp_connectors?.status === "ready" ? "satisfied" : "review",
      evidence: ["owner-ops product-axis-readiness phase: mcp_connectors"],
    },
    {
      id: "plugin_market_axis",
      label: "Plugin / market package axis",
      status: phaseById.plugin_market_package?.status === "ready" ? "satisfied" : "review",
      evidence: ["owner-ops product-axis-readiness phase: plugin_market_package"],
    },
    {
      id: "local_field_validation_axis",
      label: "Local field-validation evidence axis",
      status: phaseById.field_validation?.status === "ready" ? "satisfied" : "review",
      evidence: ["owner-ops product-axis-readiness phase: field_validation"],
    },
    {
      id: "pre_public_distribution_axis",
      label: "Pre-public distribution evidence axis",
      status: phaseById.pre_public_distribution?.status === "ready" ? "satisfied" : "review",
      evidence: ["owner-ops product-axis-readiness phase: pre_public_distribution"],
    },
    {
      id: "release_authority_readback_axis",
      label: "Release authority readback axis",
      status: phaseById.release_authority_readback?.status === "ready" ? "satisfied" : "review",
      evidence: ["owner-ops product-axis-readiness phase: release_authority_readback"],
    },
    {
      id: "owner_final_candidate_decision",
      label: "Owner final-candidate decision record",
      status: finalDecisionRecords.recordCount > 0 ? "satisfied" : "pending_owner_decision",
      evidence: [".gpao-t/owner-ops/final-candidate/owner-decision-records.jsonl"],
    },
    {
      id: "external_public_release",
      label: "External public release / marketplace publication",
      status: "blocked_by_authority",
      evidence: ["public release/upload/signing/install boundaries remain false"],
    },
  ];
  const reviewRows = requirementRows.filter((item) => item.status === "review");
  const localProductAxisReady = matrix.status === "ready";

  return {
    schema: "gpao_t.owner_ops_production_completion_audit.v0_1",
    status: reviewRows.length ? "review" : "ready",
    completionState: localProductAxisReady
      ? "local_product_axis_ready_external_completion_pending"
      : "local_product_axis_needs_review",
    localProductAxisReady,
    finalObjectiveComplete: false,
    requirementRows,
    pendingOwnerActions: [
      {
        id: "record_final_candidate_owner_decision",
        required: finalDecisionRecords.recordCount === 0,
        surface: "owner-ops final-candidate-owner-decision-append [decision] [approval-token]",
      },
      {
        id: "run_supervised_team_or_owner_testing",
        required: true,
        surface: "owner-ops next-owner-testing-loop",
      },
      {
        id: "separate_public_release_approval",
        required: true,
        surface: "owner-ops public-release-readback / human-review-decision-lane / marketplace-upload-decision-lane",
      },
    ],
    authorityBoundary: {
      publicReleaseAllowed: false,
      marketplaceUploadAllowed: false,
      packageUploadAllowed: false,
      networkUploadAllowed: false,
      signingAllowed: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      customerSendAllowed: false,
      liveAccountConnectionAllowed: false,
      credentialAccessAllowed: false,
      externalDistributionAllowed: false,
    },
    evidenceRefs: [
      "owner-ops product-axis-readiness-check",
      "owner-ops final-candidate-next-action-check",
      "owner-ops local-package-candidate-readback-check",
      "owner-ops public-release-readback-check",
    ],
    findings: reviewRows.map((row) => `${row.id}_needs_review`),
    nextSafeAction: localProductAxisReady
      ? "Use this audit to decide the next owner action; do not claim public production completion until owner/test/release gates are actually closed."
      : "Fix product-axis findings before using this completion audit.",
  };
}

export function verifyOwnerOpsProductionCompletionAudit({ root = process.cwd() } = {}) {
  const audit = buildOwnerOpsProductionCompletionAudit({ root });
  const findings = [...audit.findings];

  if (audit.localProductAxisReady !== true) findings.push("local_product_axis_not_ready");
  if (audit.finalObjectiveComplete !== false) findings.push("final_objective_completion_overclaimed");
  if (audit.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (audit.authorityBoundary.marketplaceUploadAllowed !== false) findings.push("marketplace_upload_boundary_opened");
  if (audit.authorityBoundary.credentialAccessAllowed !== false) findings.push("credential_boundary_opened");
  if (!audit.requirementRows.some((row) => row.id === "skill_pack_axis" && row.status === "satisfied")) {
    findings.push("skill_pack_axis_not_satisfied");
  }
  if (!audit.requirementRows.some((row) => row.id === "mcp_connector_axis" && row.status === "satisfied")) {
    findings.push("mcp_connector_axis_not_satisfied");
  }
  if (!audit.requirementRows.some((row) => row.id === "plugin_market_axis" && row.status === "satisfied")) {
    findings.push("plugin_market_axis_not_satisfied");
  }

  return {
    schema: "gpao_t.owner_ops_production_completion_audit_check.v0_1",
    status: findings.length ? "review" : "ready",
    findings,
    completionState: audit.completionState,
    localProductAxisReady: audit.localProductAxisReady,
    finalObjectiveComplete: audit.finalObjectiveComplete,
    checkedRows: audit.requirementRows.map((row) => ({
      id: row.id,
      status: row.status,
    })),
    publicReleaseAllowed: audit.authorityBoundary.publicReleaseAllowed,
    packageUploadAllowed: audit.authorityBoundary.packageUploadAllowed,
    nextSafeAction: audit.nextSafeAction,
  };
}

export function buildOwnerOpsSupervisedTestingReadinessPacket({ root = process.cwd() } = {}) {
  const audit = buildOwnerOpsProductionCompletionAudit({ root });
  const finalCandidate = verifyOwnerOpsFinalLocalReleaseCandidateDecisionPacket({ root });
  const nextTestingLoop = verifyOwnerOpsNextOwnerTestingLoop({ root });
  const nextAction = verifyOwnerOpsFinalCandidateNextActionPacket({ root });
  const releaseReadback = verifyOwnerOpsPublicReleaseReadbackSnapshot({ root });
  const finalDecisionRecords = readOwnerOpsFinalCandidateOwnerDecisionRecords({ root });
  const readinessRows = [
    {
      id: "local_product_axis",
      label: "Local product axis",
      status: audit.localProductAxisReady ? "ready" : "review",
      evidence: ["owner-ops production-completion-audit-check"],
    },
    {
      id: "final_local_candidate",
      label: "Final local candidate packet",
      status: finalCandidate.status,
      evidence: ["owner-ops final-local-release-candidate-check"],
    },
    {
      id: "next_owner_testing_loop",
      label: "Next owner testing loop",
      status: nextTestingLoop.status,
      evidence: ["owner-ops next-owner-testing-loop-check"],
    },
    {
      id: "final_candidate_next_action",
      label: "Final candidate next action",
      status: nextAction.status,
      evidence: ["owner-ops final-candidate-next-action-check"],
    },
    {
      id: "release_authority_closed",
      label: "Release authority remains closed",
      status: releaseReadback.publicReleaseAllowed === false ? "ready" : "blocked",
      evidence: ["owner-ops public-release-readback-check"],
    },
  ];
  const findings = readinessRows
    .filter((row) => row.status !== "ready")
    .map((row) => `${row.id}_not_ready`);

  return {
    schema: "gpao_t.owner_ops_supervised_testing_readiness_packet.v0_1",
    status: findings.length ? "review" : "ready",
    testingState: findings.length
      ? "supervised_testing_needs_review"
      : "supervised_testing_ready_public_release_closed",
    ownerDecisionRecordCount: finalDecisionRecords.recordCount,
    ownerDecisionRecordedNow: false,
    readinessRows,
    testerScope: {
      audience: ["internal_team_alpha", "supervised_first_owner_beta"],
      dataPolicy: "sample_or_deidentified_only",
      allowedUse: [
        "read package guide",
        "run local-only task flow",
        "inspect generated task/result packets",
        "record supervised testing feedback",
      ],
      prohibitedUse: [
        "live customer send",
        "credential entry",
        "real store account connection",
        "payment/refund/delete action",
        "public marketplace upload",
        "install/update/rollback execution",
      ],
    },
    runbook: [
      {
        step: "prepare_test",
        action: "Open the team alpha or first-owner beta handoff and confirm sample/de-identified data only.",
        evidence: "OWNER-OPS-TEAM-ALPHA-HANDOFF-BUNDLE or OWNER-OPS-FIRST-OWNER-BETA-HANDOFF-BUNDLE",
      },
      {
        step: "exercise_core_flow",
        action: "Run one realistic owner scenario through intake, local preview, authority readback, and result review.",
        evidence: "owner-ops next-owner-testing-loop",
      },
      {
        step: "record_feedback",
        action: "Record blockers, confusing copy, missing templates, and trust/safety concerns before any public release decision.",
        evidence: "owner-ops field-test-action-queue or beta-feedback-action-queue",
      },
      {
        step: "choose_next_action",
        action: "Use final-candidate next-action mapping to continue testing, request revision, approve local review, or prepare later public-release review.",
        evidence: "owner-ops final-candidate-next-action",
      },
    ],
    passCriteria: [
      "A non-developer owner can understand what the tool will and will not do.",
      "No live account, customer send, payment/refund/delete, or credential action is needed.",
      "At least one practical Korean small-business scenario produces useful local output.",
      "Feedback can be converted into a repair queue or next owner testing loop.",
    ],
    stopRules: [
      "Stop if a tester needs to enter a real credential.",
      "Stop if the flow asks to send anything to a customer.",
      "Stop if payment, refund, delete, or live store mutation appears.",
      "Stop if the tester cannot understand the authority boundary.",
      "Stop if the package hash or readback does not match the current local candidate.",
    ],
    authorityBoundary: {
      supervisedTestingOnly: true,
      ownerDecisionRecordedNow: false,
      publicReleaseAllowed: false,
      marketplaceUploadAllowed: false,
      packageUploadAllowed: false,
      signingAllowed: false,
      installAllowed: false,
      updateAllowed: false,
      rollbackAllowed: false,
      customerSendAllowed: false,
      liveAccountConnectionAllowed: false,
      credentialAccessAllowed: false,
      paymentRefundDeleteAllowed: false,
      durableMemoryPromotionAllowed: false,
    },
    findings,
    nextSafeAction: findings.length
      ? "Fix supervised testing readiness findings before asking a tester to use the package."
      : "Use this packet to run supervised team/owner testing with sample or de-identified data only; do not record an owner release decision or open public release from this packet.",
  };
}

export function verifyOwnerOpsSupervisedTestingReadinessPacket({ root = process.cwd() } = {}) {
  const packet = buildOwnerOpsSupervisedTestingReadinessPacket({ root });
  const findings = [...packet.findings];

  if (packet.authorityBoundary.supervisedTestingOnly !== true) findings.push("supervised_testing_scope_missing");
  if (packet.authorityBoundary.publicReleaseAllowed !== false) findings.push("public_release_boundary_opened");
  if (packet.authorityBoundary.customerSendAllowed !== false) findings.push("customer_send_boundary_opened");
  if (packet.authorityBoundary.credentialAccessAllowed !== false) findings.push("credential_boundary_opened");
  if (packet.ownerDecisionRecordedNow !== false) findings.push("owner_decision_was_recorded");
  if (!packet.testerScope.prohibitedUse.includes("credential entry")) findings.push("credential_stop_rule_missing");
  if (!packet.stopRules.some((rule) => rule.includes("real credential"))) findings.push("real_credential_stop_rule_missing");
  if (!packet.passCriteria.some((rule) => rule.includes("Korean small-business"))) {
    findings.push("korean_small_business_pass_criteria_missing");
  }

  return {
    schema: "gpao_t.owner_ops_supervised_testing_readiness_packet_check.v0_1",
    status: findings.length ? "review" : "ready",
    findings,
    testingState: packet.testingState,
    ownerDecisionRecordedNow: packet.ownerDecisionRecordedNow,
    checkedRows: packet.readinessRows.map((row) => ({
      id: row.id,
      status: row.status,
    })),
    publicReleaseAllowed: packet.authorityBoundary.publicReleaseAllowed,
    customerSendAllowed: packet.authorityBoundary.customerSendAllowed,
    credentialAccessAllowed: packet.authorityBoundary.credentialAccessAllowed,
    nextSafeAction: packet.nextSafeAction,
  };
}
