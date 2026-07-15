import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildOwnerOpsAutomationCandidates,
  buildOwnerOpsAuthorityMatrix,
  buildOwnerOpsBetaFeedbackActionQueue,
  buildOwnerOpsBetaFeedbackSynthesis,
  buildOwnerOpsConnectorCatalog,
  buildOwnerOpsEffectReplay,
  buildOwnerOpsFieldCasebook,
  buildOwnerOpsFieldTestActionQueue,
  buildOwnerOpsFieldTestLedger,
  buildOwnerOpsFieldTestRepairCompletionEvidence,
  buildOwnerOpsFirstOwnerBetaResultReview,
  buildOwnerOpsFirstScenarios,
  buildOwnerOpsMcpPlan,
  buildOwnerOpsMcpServerDescriptor,
  buildOwnerOpsMcpToolManifest,
  buildOwnerOpsIndustryTemplateCatalog,
  buildOwnerOpsMarketEvidenceBundle,
  buildOwnerOpsMarketReadinessGate,
  buildOwnerOpsProductAxisReadinessMatrix,
  buildOwnerOpsPrePublicEvidenceBridge,
  buildOwnerOpsPrePublicPackageReview,
  buildOwnerOpsPrePublicRepairBacklog,
  buildOwnerOpsPrePublicRepairCompletionEvidence,
  buildOwnerOpsPrivacyCopyPack,
  buildOwnerOpsArchiveChecksumDryRun,
  buildOwnerOpsBroaderOwnerTestingHandoff,
  buildOwnerOpsBroaderOwnerTestingResultLedger,
  buildOwnerOpsBroaderOwnerTestingRepairCompletionEvidence,
  buildOwnerOpsBroaderOwnerTestingRepairQueue,
  buildOwnerOpsDeploymentDryRunPlan,
  buildOwnerOpsDistributionEvidence,
  buildOwnerOpsDistributionReadme,
  buildOwnerOpsControlledDryRunInvocationGate,
  buildOwnerOpsDryRunResultReviewHandoff,
  buildOwnerOpsDryRunApprovalRecordDesign,
  buildOwnerOpsDryRunApprovalRecordWriteLane,
  buildOwnerOpsDryRunExecutorProof,
  buildOwnerOpsHumanReviewDecisionLane,
  buildOwnerOpsHumanReviewApprovalPacket,
  buildOwnerOpsInstallUpdateRollbackProof,
  buildOwnerOpsNextOwnerTestingLoop,
  buildOwnerOpsReleaseReadinessEvidence,
  buildOwnerOpsSignedPackageEvidence,
  readOwnerOpsLocalPackageCandidate,
  appendOwnerOpsHumanReviewDecisionRecord,
  buildOwnerOpsReadOnlyIntakePlan,
  buildOwnerOpsSkillPack,
  buildOwnerOpsTemplateReplayFixtures,
  buildOwnerOpsWorkflowPreview,
  buildOwnerOpsFirstOwnerScenarioFixture,
  buildOwnerOpsMarketListingDraft,
  buildOwnerOpsAlphaFeedbackForm,
  buildOwnerOpsFirstOwnerBetaGuide,
  buildOwnerOpsHostIntegrationMatrix,
  buildOwnerOpsHostRegistrationGuide,
  buildOwnerOpsOwnerFacingUxCopy,
  buildOwnerOpsFirstOwnerBetaHandoffBundle,
  buildOwnerOpsFirstOwnerBetaOperationalTestPackage,
  buildOwnerOpsTeamAlphaHandoffBundle,
  buildOwnerOpsPluginPackageManifest,
  buildOwnerOpsSampleDataKit,
  appendOwnerOpsDryRunApprovalRecord,
  appendOwnerOpsBroaderOwnerTestingResult,
  appendOwnerOpsFieldTestRecord,
  invokeOwnerOpsControlledDryRun,
  readOwnerOpsControlledDryRunInvocations,
  readOwnerOpsBroaderOwnerTestingResults,
  readOwnerOpsDryRunApprovalRecords,
  readOwnerOpsFieldTestRecords,
  buildOwnerOpsTeamAlphaGuide,
  handleOwnerOpsMcpMessage,
  handleGatewayRequest,
  previewOwnerOpsFolderIntake,
  previewOwnerOpsLocalFileIntake,
  previewOwnerOpsPasteIntake,
  previewOwnerOpsTableTextIntake,
  readOwnerOpsRecords,
  readOwnerOpsHumanReviewDecisionRecords,
  routeSkillPacks,
  runOwnerOpsFirstOwnerScenario,
  runOwnerOpsMcpHostSmoke,
  verifyOwnerOpsMcpReadiness,
  verifyOwnerOpsMcpServer,
  verifyOwnerOpsMarketReadiness,
  verifyOwnerOpsPack,
  verifyOwnerOpsProductAxisReadinessMatrix,
  verifyOwnerOpsPrePublicPackage,
  verifyOwnerOpsArchiveChecksumDryRun,
  verifyOwnerOpsBroaderOwnerTestingHandoff,
  verifyOwnerOpsBroaderOwnerTestingResultLedger,
  verifyOwnerOpsBroaderOwnerTestingRepairCompletionEvidence,
  verifyOwnerOpsBroaderOwnerTestingRepairQueue,
  verifyOwnerOpsPrePublicRepairBacklog,
  verifyOwnerOpsPrePublicRepairCompletionEvidence,
  verifyOwnerOpsBetaFeedbackActionQueue,
  verifyOwnerOpsFieldTestActionQueue,
  verifyOwnerOpsFieldTestLedger,
  verifyOwnerOpsFieldTestRepairCompletionEvidence,
  verifyOwnerOpsDeploymentDryRunPlan,
  verifyOwnerOpsDistributionEvidence,
  verifyOwnerOpsControlledDryRunInvocationGate,
  verifyOwnerOpsDryRunResultReviewHandoff,
  verifyOwnerOpsDryRunApprovalRecordDesign,
  verifyOwnerOpsDryRunApprovalRecordWriteLane,
  verifyOwnerOpsDryRunExecutorProof,
  verifyOwnerOpsHumanReviewDecisionLane,
  verifyOwnerOpsHumanReviewApprovalPacket,
  verifyOwnerOpsInstallUpdateRollbackProof,
  verifyOwnerOpsLocalPackageCandidateReadback,
  verifyOwnerOpsLocalPackageCandidateWriter,
  verifyOwnerOpsNextOwnerTestingLoop,
  verifyOwnerOpsReleaseReadinessEvidence,
  verifyOwnerOpsSignedPackageEvidence,
  verifyOwnerOpsTeamAlphaHandoffBundle,
  verifyOwnerOpsFirstOwnerScenario,
  verifyOwnerOpsFirstOwnerBetaReadiness,
  verifyOwnerOpsFirstOwnerBetaHandoffBundle,
  verifyOwnerOpsFirstOwnerBetaOperationalTestPackage,
  verifyOwnerOpsFirstOwnerBetaResultReview,
  verifyOwnerOpsHostAlphaHandoff,
  verifyOwnerOpsHostIntegrationMatrix,
  verifyOwnerOpsPluginPackage,
  verifyOwnerOpsMarketEvidenceBundle,
  verifyOwnerOpsPrePublicEvidenceBridge,
  verifyOwnerOpsTeamAlphaReadiness,
  verifyOwnerOpsReadOnlyIntakeConnectors,
  writeOwnerOpsLocalPackageCandidate,
  writeOwnerOpsBetaFeedbackActionQueue,
  writeOwnerOpsBroaderOwnerTestingHandoff,
  writeOwnerOpsBroaderOwnerTestingRepairCompletionEvidence,
  writeOwnerOpsBroaderOwnerTestingRepairQueue,
  writeOwnerOpsFieldTestActionQueue,
  writeOwnerOpsFieldTestRepairCompletionEvidence,
  writeOwnerOpsDeploymentDryRunPlan,
  writeOwnerOpsDryRunResultReviewHandoff,
  writeOwnerOpsDryRunApprovalRecordDesign,
  writeOwnerOpsDryRunExecutorProof,
  writeOwnerOpsHumanReviewApprovalPacket,
  writeOwnerOpsInstallUpdateRollbackProof,
  writeOwnerOpsReleaseReadinessEvidence,
  writeOwnerOpsSignedPackageEvidence,
  writeOwnerOpsFirstOwnerBetaHandoffBundle,
  writeOwnerOpsFirstOwnerBetaOperationalTestPackage,
  writeOwnerOpsFirstOwnerBetaResultReview,
  writeOwnerOpsMarketEvidenceBundle,
  writeOwnerOpsNextOwnerTestingLoop,
  writeOwnerOpsPrePublicRepairBacklog,
  writeOwnerOpsPrePublicRepairCompletionEvidence,
  writeOwnerOpsTeamAlphaHandoffBundle,
  writeOwnerOpsLocalRecord,
} from "../src/index.js";
import {
  createOwnerOpsLocalWriteApprovalReceipt,
} from "../src/core/owner-ops-mcp-server.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const MCP_CLI = fileURLToPath(new URL("../bin/gpao-t-owner-ops-mcp.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-owner-ops-"));
}

function populateDistributionRoot(root) {
  const files = [
    "bin/gpao-t.js",
    "bin/gpao-t-owner-ops-mcp.js",
    "src/index.js",
    "src/core/doctor.js",
    "src/core/gateway.js",
    "src/core/storage.js",
    "src/core/owner-ops.js",
    "src/core/owner-ops-alpha.js",
    "src/core/owner-ops-alpha-handoff.js",
    "src/core/owner-ops-beta.js",
    "src/core/owner-ops-connectors.js",
    "src/core/owner-ops-distribution.js",
    "src/core/owner-ops-intake-connectors.js",
    "src/core/owner-ops-market-readiness.js",
    "src/core/owner-ops-mcp-server.js",
    "src/core/owner-ops-package.js",
    "src/core/owner-ops-public-package.js",
    "src/core/owner-ops-scenarios.js",
    "src/core/owner-ops-team-alpha-package.js",
    "docs/04-skill-ecosystem/GPAO-T-OWNER-OPS-PACK-DEVELOPMENT-PLAN-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-AUTHORITY-MATRIX-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-FIELD-CASEBOOK-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-FIRST-SCENARIOS-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-MCP-CONNECTOR-PLAN-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-PLUGIN-PACKAGE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-FIRST-OWNER-SCENARIO-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-TEAM-ALPHA-GUIDE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-HOST-REGISTRATION-AND-FEEDBACK-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-FIRST-OWNER-BETA-GUIDE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-FIRST-OWNER-BETA-HANDOFF-BUNDLE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-FIRST-OWNER-BETA-RESULT-REVIEW-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-FIELD-TEST-LEDGER-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-FIELD-TEST-ACTION-QUEUE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-FIELD-TEST-REPAIR-COMPLETION-EVIDENCE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-BROADER-OWNER-TESTING-HANDOFF-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-BROADER-OWNER-TESTING-RESULT-LEDGER-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-QUEUE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-COMPLETION-EVIDENCE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-NEXT-OWNER-TESTING-LOOP-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-FINAL-LOCAL-RELEASE-CANDIDATE-DECISION-PACKET-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-FINAL-CANDIDATE-OWNER-DECISION-LANE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-FINAL-CANDIDATE-NEXT-ACTION-PACKET-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-MARKET-READINESS-GATE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-MARKET-EVIDENCE-BUNDLE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-PRE-PUBLIC-PACKAGE-REVIEW-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-PRE-PUBLIC-EVIDENCE-BRIDGE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-PRE-PUBLIC-REPAIR-BACKLOG-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-PRE-PUBLIC-REPAIR-COMPLETION-EVIDENCE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-DISTRIBUTION-EVIDENCE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-RELEASE-READINESS-EVIDENCE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-HUMAN-REVIEW-APPROVAL-PACKET-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-HUMAN-REVIEW-DECISION-LANE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-PUBLIC-RELEASE-AUTHORITY-GATE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-PUBLIC-RELEASE-READBACK-SNAPSHOT-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-PRODUCT-AXIS-READINESS-MATRIX-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-PRODUCTION-COMPLETION-AUDIT-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-SUPERVISED-TESTING-READINESS-PACKET-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-APPROVED-SIGNING-LANE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-MARKETPLACE-UPLOAD-APPROVAL-GATE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-MARKETPLACE-UPLOAD-DECISION-LANE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-SIGNED-PACKAGE-EVIDENCE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-INSTALL-UPDATE-ROLLBACK-PROOF-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-DEPLOYMENT-DRY-RUN-PLAN-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-DRY-RUN-EXECUTOR-PROOF-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-DRY-RUN-APPROVAL-RECORD-DESIGN-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-DRY-RUN-APPROVAL-RECORD-WRITE-LANE-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-CONTROLLED-DRY-RUN-INVOCATION-v0.1-ko.md",
    "docs/04-skill-ecosystem/OWNER-OPS-DRY-RUN-RESULT-REVIEW-HANDOFF-v0.1-ko.md",
    "docs/README.md",
    "docs/DEVELOPMENT-PRINCIPLES.md",
  ];
  writeFileSync(join(root, "package.json"), JSON.stringify({
    version: "9.9.9",
    bin: {
      "gpao-t": "./bin/gpao-t.js",
    },
    scripts: {
      check: "node --check src/index.js",
      test: "node --test",
      verify: "npm run check && npm test",
    },
  }, null, 2));
  for (const file of files) {
    if (file === "package.json") continue;
    const target = join(root, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `fixture for ${file}\n`);
  }
}

function appendOwnerOpsStandardFieldTestRecord(root) {
  appendOwnerOpsFieldTestRecord({
    root,
    approvalToken: "record-owner-ops-field-test-local-only",
    record: {
      stage: "first_owner_beta",
      host: "codex",
      testerRole: "first_owner_tester",
      industry: "smartstore_shop",
      dataMode: "sample_or_deidentified",
      understoodNoAutoSend: true,
      actualCustomerSendExecuted: false,
      liveAccountConnected: false,
      paymentRefundDeleteExecuted: false,
      requestedTemplates: ["배송 문의", "교환/환불 문의"],
    },
  });
}

function appendOwnerOpsStandardBroaderTestingResult(root) {
  appendOwnerOpsBroaderOwnerTestingResult({
    root,
    approvalToken: "record-owner-ops-broader-testing-local-only",
    result: {
      stage: "broader_owner_testing",
      host: "codex",
      testerRole: "supervised_owner_tester",
      industry: "restaurant_cafe",
      dataMode: "sample_or_deidentified",
      understoodNoAutoSend: true,
      actualCustomerSendExecuted: false,
      liveAccountConnected: false,
      paymentRefundDeleteExecuted: false,
      credentialAccessUsed: false,
      ratings: {
        understandability: 4,
        usefulness: 4,
        trust: 4,
        setupFriction: 2,
      },
      requestedTemplates: ["예약 문의", "부정 리뷰 답변"],
    },
  });
}

function prepareOwnerOpsProductAxisRoot() {
  const root = tempRoot();
  populateDistributionRoot(root);
  writeOwnerOpsLocalPackageCandidate({
    root,
    confirmationToken: "confirm-local-owner-ops-package",
  });
  writeOwnerOpsTeamAlphaHandoffBundle({ root });
  writeOwnerOpsFirstOwnerBetaHandoffBundle({ root });
  writeOwnerOpsFirstOwnerBetaOperationalTestPackage({ root });
  writeOwnerOpsFirstOwnerBetaResultReview({ root });
  writeOwnerOpsMarketEvidenceBundle({ root });
  writeOwnerOpsBetaFeedbackActionQueue({ root });
  writeOwnerOpsPrePublicRepairBacklog({ root });
  writeOwnerOpsPrePublicRepairCompletionEvidence({ root });
  writeOwnerOpsReleaseReadinessEvidence({ root });
  writeOwnerOpsHumanReviewApprovalPacket({ root });
  writeOwnerOpsSignedPackageEvidence({ root });
  writeOwnerOpsInstallUpdateRollbackProof({ root });
  writeOwnerOpsDeploymentDryRunPlan({ root });
  appendOwnerOpsStandardFieldTestRecord(root);
  writeOwnerOpsFieldTestActionQueue({ root });
  writeOwnerOpsFieldTestRepairCompletionEvidence({ root });
  writeOwnerOpsBroaderOwnerTestingHandoff({ root });
  appendOwnerOpsStandardBroaderTestingResult(root);
  writeOwnerOpsBroaderOwnerTestingRepairQueue({ root });
  writeOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root });
  writeOwnerOpsNextOwnerTestingLoop({ root });
  return root;
}

describe("GPAO-T Owner Ops Pack", () => {
  it("defines the skill pack, field casebook, scenarios, and authority ladder", () => {
    const skillPack = buildOwnerOpsSkillPack();
    const casebook = buildOwnerOpsFieldCasebook();
    const scenarios = buildOwnerOpsFirstScenarios();
    const authority = buildOwnerOpsAuthorityMatrix();

    assert.equal(skillPack.schema, "gpao_t.owner_ops_skill_pack.v0_1");
    assert.equal(skillPack.id, "gpao-owner-ops-pack");
    assert.equal(casebook.industries.length, 6);
    assert.equal(scenarios.scenarios.length, 3);
    assert.equal(authority.allowedNow.includes("local draft"), true);
    assert.equal(authority.blockedInV01.includes("external send"), true);
    assert.equal(authority.blockedInV01.includes("payment"), true);
  });

  it("routes Korean owner-operator automation requests to the Owner Ops pack", () => {
    const route = routeSkillPacks({
      request: "한국 자영업 사장님이 리뷰 답변과 예약 문의를 쉽게 자동화 후보로 만들고 싶어",
    });
    const selectedIds = route.selectedPacks.map((pack) => pack.id);

    assert.equal(route.status, "ready");
    assert.equal(route.intentProfile.primaryIntents.includes("owner_ops"), true);
    assert.equal(selectedIds.includes("gpao-owner-ops-pack"), true);
  });

  it("creates no-API automation candidates from owner pain language", () => {
    const candidates = buildOwnerOpsAutomationCandidates({
      request: "스마트스토어 배송 문의와 교환 문의가 너무 많아서 분류하고 답장 초안을 만들고 싶어요.",
    });

    assert.equal(candidates.status, "ready");
    assert.equal(candidates.detectedBusinessType, "smartstore_shop");
    assert.equal(candidates.candidates[0].id, "shopping_inquiry");
    assert.equal(candidates.candidates[0].blockedActions.includes("external_send"), true);
  });

  it("previews review replies with local drafts while keeping auto posting locked", () => {
    const preview = buildOwnerOpsWorkflowPreview({
      workflowType: "review_reply",
      inputText: "음식은 맛있었는데 대기 시간이 너무 길었어요.\n위생이 조금 걱정됐어요.",
    });

    assert.equal(preview.status, "ready");
    assert.equal(preview.workflow.id, "review_reply");
    assert.equal(preview.output.drafts.length, 2);
    assert.equal(preview.userConfirmation.stillLocked.includes("auto_post"), true);
    assert.equal(preview.userConfirmation.stillLocked.includes("external_send"), true);
    assert.equal(preview.output.improvementPoints.includes("대기 시간 안내 문구 개선"), true);
  });

  it("previews shopping inquiries and reservation drafts without external execution", () => {
    const shopping = buildOwnerOpsWorkflowPreview({
      workflowType: "shopping_inquiry",
      inputText: "배송 언제 출발하나요?\n사이즈가 안 맞으면 교환 가능한가요?",
    });
    const reservation = buildOwnerOpsWorkflowPreview({
      workflowType: "reservation_inquiry",
      inputText: "이번 주 토요일 오후 3시에 네일 예약 가능한가요? 가격도 궁금해요.",
    });

    assert.equal(shopping.output.categories.map((item) => item.category).includes("urgent_shipping"), true);
    assert.equal(shopping.userConfirmation.stillLocked.includes("refund"), true);
    assert.equal(reservation.output.reviewNeeded.includes("실제 예약 가능 여부는 사장님 일정 확인이 필요합니다."), true);
    assert.equal(reservation.userConfirmation.stillLocked.includes("calendar_write"), true);
  });

  it("writes local Owner Ops records and replays effect summary", () => {
    const root = tempRoot();
    const write = writeOwnerOpsLocalRecord({
      root,
      workflowType: "review_reply",
      inputText: "친절했지만 대기 시간이 길었어요.",
      now: "2026-07-11T00:00:00.000Z",
    });
    const records = readOwnerOpsRecords({ root });
    const replay = buildOwnerOpsEffectReplay({ root });

    assert.equal(write.status, "written_local_only");
    assert.equal(records.length, 1);
    assert.equal(records[0].workflowType, "review_reply");
    assert.equal(replay.status, "ready");
    assert.equal(replay.totalRecords, 1);
    assert.equal(write.boundaryState.externalSend, false);
  });

  it("exposes CLI and Gateway surfaces for Owner Ops", () => {
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliWorkflow = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "workflow",
      "reservation_inquiry",
      "내일 오후 2시에 상담 예약 가능한가요?",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gateway = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/verify",
      root: tempRoot(),
    });

    assert.equal(cliCheck.status, "ready");
    assert.equal(cliWorkflow.workflow.id, "reservation_inquiry");
    assert.equal(gateway.status, 200);
    assert.equal(gateway.body.status, "ready");
  });

  it("keeps the whole Owner Ops pack verification ready", () => {
    const check = verifyOwnerOpsPack({ root: tempRoot() });

    assert.equal(check.schema, "gpao_t.owner_ops_pack_check.v0_1");
    assert.equal(check.status, "ready");
    assert.deepEqual(check.checkedWorkflows, ["review_reply", "shopping_inquiry", "reservation_inquiry"]);
    assert.equal(check.checkedBoundaries.includes("external send"), true);
  });

  it("summarizes the Owner Ops product axis without opening release authority", () => {
    const root = prepareOwnerOpsProductAxisRoot();
    const matrix = buildOwnerOpsProductAxisReadinessMatrix({ root });
    const check = verifyOwnerOpsProductAxisReadinessMatrix({ root });
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "product-axis-readiness-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gateway = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/product-axis-readiness/verify",
      root,
    });

    assert.equal(matrix.schema, "gpao_t.owner_ops_product_axis_readiness_matrix.v0_1");
    assert.deepEqual(matrix.goalSequence, ["skill_pack", "mcp_connectors", "plugin_market_package"]);
    assert.equal(matrix.readyPhaseCount, matrix.phaseCount);
    assert.equal(matrix.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(matrix.authorityBoundary.packageUploadAllowed, false);
    assert.equal(matrix.completionBoundary.publicReleaseCompleted, false);
    assert.equal(check.status, "ready");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gateway.status, 200);
    assert.equal(gateway.body.publicReleaseAllowed, false);
  });

  it("defines MCP and read-only connector readiness for Codex, OpenClaw, and Claude Code", () => {
    const plan = buildOwnerOpsMcpPlan();
    const catalog = buildOwnerOpsConnectorCatalog();
    const manifest = buildOwnerOpsMcpToolManifest();
    const check = verifyOwnerOpsMcpReadiness();
    const gateway = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/mcp-check",
      root: tempRoot(),
    });

    assert.equal(plan.status, "ready");
    assert.deepEqual(plan.compatibilityTargets.map((target) => target.id), ["codex", "openclaw", "claude_code"]);
    assert.equal(catalog.policy, "manual_or_read_only_first");
    assert.equal(catalog.connectors.some((connector) => connector.id === "local_csv_excel"), true);
    assert.equal(manifest.tools.some((tool) => tool.name === "owner_ops.workflow_preview"), true);
    assert.equal(manifest.tools.find((tool) => tool.name === "owner_ops.local_record_write").approvalRequired, true);
    assert.equal(check.status, "ready");
    assert.equal(gateway.status, 200);
    assert.equal(gateway.body.checkedToolCount >= 5, true);
  });

  it("exposes CLI MCP/connector readiness commands", () => {
    const cliPlan = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "mcp-plan"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCatalog = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "connector-catalog"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "mcp-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));

    assert.equal(cliPlan.schema, "gpao_t.owner_ops_mcp_plan.v0_1");
    assert.equal(cliCatalog.connectors.length >= 4, true);
    assert.equal(cliCheck.status, "ready");
    assert.equal(cliCheck.checkedTargets.includes("openclaw"), true);
  });

  it("builds a no-network stdio MCP server descriptor and rejects unconfirmed local writes", () => {
    const descriptor = buildOwnerOpsMcpServerDescriptor();
    const list = handleOwnerOpsMcpMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });
    const blocked = handleOwnerOpsMcpMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "owner_ops.local_record_write",
        arguments: {
          workflowType: "review_reply",
          inputText: "친절했어요.",
        },
      },
    });
    const check = verifyOwnerOpsMcpServer();
    const gateway = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/mcp-server/verify",
      root: tempRoot(),
    });

    assert.equal(descriptor.transport, "stdio_json_rpc");
    assert.equal(descriptor.network, "not_used");
    assert.equal(list.result.tools.some((tool) => tool.name === "owner_ops.workflow_preview"), true);
    assert.equal(blocked.result.isError, true);
    assert.equal(check.status, "ready");
    assert.equal(gateway.status, 200);
    assert.equal(gateway.body.status, "ready");
  });

  it("requires a verifiable user-bound receipt and consumes it once for MCP local writes", () => {
    const root = tempRoot();
    const approvalSecret = "owner-ops-test-approval-secret-32-bytes-minimum";
    const authenticatedUserId = "owner:test-user";
    const now = "2026-07-14T00:00:00.000Z";
    const writeArguments = {
      workflowType: "review_reply",
      inputText: "친절했어요.",
      userDecision: "preview_accepted_for_local_record",
    };
    const booleanOnly = handleOwnerOpsMcpMessage({
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: {
        name: "owner_ops.local_record_write",
        arguments: { ...writeArguments, confirmLocalRecord: true },
      },
    }, { root, approvalSecret, authenticatedUserId, now });
    const wrongUserReceipt = createOwnerOpsLocalWriteApprovalReceipt({
      root,
      userId: "owner:someone-else",
      approvalSecret,
      request: writeArguments,
      issuedAt: now,
      expiresAt: "2026-07-14T00:05:00.000Z",
    });
    const wrongUser = handleOwnerOpsMcpMessage({
      jsonrpc: "2.0",
      id: 11,
      method: "tools/call",
      params: {
        name: "owner_ops.local_record_write",
        arguments: { ...writeArguments, approvalReceipt: wrongUserReceipt },
      },
    }, { root, approvalSecret, authenticatedUserId, now });
    const receipt = createOwnerOpsLocalWriteApprovalReceipt({
      root,
      userId: authenticatedUserId,
      approvalSecret,
      request: writeArguments,
      issuedAt: now,
      expiresAt: "2026-07-14T00:05:00.000Z",
    });
    const written = handleOwnerOpsMcpMessage({
      jsonrpc: "2.0",
      id: 12,
      method: "tools/call",
      params: {
        name: "owner_ops.local_record_write",
        arguments: { ...writeArguments, approvalReceipt: receipt },
      },
    }, { root, approvalSecret, authenticatedUserId, now });
    const replayed = handleOwnerOpsMcpMessage({
      jsonrpc: "2.0",
      id: 13,
      method: "tools/call",
      params: {
        name: "owner_ops.local_record_write",
        arguments: { ...writeArguments, approvalReceipt: receipt },
      },
    }, { root, approvalSecret, authenticatedUserId, now });
    const writtenPayload = JSON.parse(written.result.content[0].text);
    const replayedPayload = JSON.parse(replayed.result.content[0].text);

    assert.equal(booleanOnly.result.isError, true);
    assert.match(booleanOnly.result.content[0].text, /approval_receipt_missing/);
    assert.equal(wrongUser.result.isError, true);
    assert.match(wrongUser.result.content[0].text, /approval_user_mismatch/);
    assert.equal(written.result.isError, false);
    assert.equal(writtenPayload.status, "written_local_only");
    assert.equal(writtenPayload.approvalReceipt.userId, authenticatedUserId);
    assert.equal(writtenPayload.approvalReceipt.verified, true);
    assert.equal(replayed.result.isError, true);
    assert.equal(replayedPayload.reason, "approval_receipt_already_consumed");
    assert.equal(readOwnerOpsRecords({ root }).length, 1);
  });

  it("exposes MCP server descriptor through the main CLI", () => {
    const cliServer = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "mcp-server"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "mcp-server-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));

    assert.equal(cliServer.serverInfo.name, "gpao-t-owner-ops");
    assert.equal(cliServer.exposedMethods.includes("tools/call"), true);
    assert.equal(cliCheck.status, "ready");
  });

  it("responds over the stdio MCP wrapper without network or external send", () => {
    const input = [
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
      JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "owner_ops.workflow_preview",
          arguments: {
            workflowType: "reservation_inquiry",
            inputText: "내일 오후 2시에 예약 가능한가요?",
          },
        },
      }),
    ].join("\n") + "\n";
    const output = execFileSync(process.execPath, [MCP_CLI], {
      cwd: ROOT,
      env: { ...process.env, GPAO_T_ROOT: tempRoot() },
      input,
      encoding: "utf8",
    });
    const responses = output
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    assert.equal(responses[0].result.serverInfo.name, "gpao-t-owner-ops");
    assert.equal(responses[1].result.tools.some((tool) => tool.name === "owner_ops.replay"), true);
    assert.equal(responses[2].result.content[0].text.includes("gpao_t.owner_ops_workflow_preview.v0_1"), true);
    assert.equal(responses[2].result.content[0].text.includes("external_send"), true);
  });

  it("previews paste, CSV/TSV, local file, and folder intake without external connectors", () => {
    const root = tempRoot();
    const dataDir = join(root, "owner-data");
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, "smartstore.csv"), "문의,상태\n배송 언제 되나요?,신규\n교환 가능한가요?,신규\n", "utf8");
    writeFileSync(join(dataDir, "reviews.txt"), "음식은 맛있었는데 대기 시간이 길었어요.\n", "utf8");

    const plan = buildOwnerOpsReadOnlyIntakePlan();
    const paste = previewOwnerOpsPasteIntake({
      inputText: "음식은 맛있었는데 대기 시간이 길었어요.",
      workflowType: "review_reply",
    });
    const table = previewOwnerOpsTableTextIntake({
      filename: "smartstore.csv",
      content: "문의,상태\n배송 언제 되나요?,신규\n교환 가능한가요?,신규\n",
    });
    const file = previewOwnerOpsLocalFileIntake({
      root,
      filePath: "owner-data/smartstore.csv",
      workflowType: "shopping_inquiry",
    });
    const folder = previewOwnerOpsFolderIntake({
      root,
      folderPath: "owner-data",
    });
    const check = verifyOwnerOpsReadOnlyIntakeConnectors({ root });

    assert.equal(plan.status, "ready");
    assert.equal(paste.status, "ready");
    assert.equal(table.rowCountPreviewed, 3);
    assert.equal(file.status, "ready");
    assert.equal(file.blockedActions.includes("external_upload"), true);
    assert.equal(folder.status, "ready");
    assert.equal(folder.candidateFiles.some((item) => item.name === "smartstore.csv"), true);
    assert.equal(check.status, "ready");
  });

  it("keeps Excel binary intake as metadata-only until a reviewed parser lane exists", () => {
    const root = tempRoot();
    writeFileSync(join(root, "예약.xlsx"), "not-real-xlsx", "utf8");

    const preview = previewOwnerOpsLocalFileIntake({
      root,
      filePath: "예약.xlsx",
    });

    assert.equal(preview.status, "metadata_only");
    assert.equal(preview.reason, "xlsx_xls_binary_parser_not_enabled_in_v0_1");
    assert.equal(preview.blockedActions.includes("binary_parse_without_parser"), true);
  });

  it("rejects Owner Ops intake root escapes and symlink escapes", () => {
    const root = tempRoot();
    const outsideRoot = tempRoot();
    const outsideFile = join(outsideRoot, "outside.txt");
    writeFileSync(outsideFile, "outside data\n", "utf8");
    symlinkSync(outsideFile, join(root, "linked-file.txt"));
    symlinkSync(outsideRoot, join(root, "linked-folder"));

    const outside = previewOwnerOpsLocalFileIntake({ root, filePath: outsideFile });
    const linkedFile = previewOwnerOpsLocalFileIntake({ root, filePath: "linked-file.txt" });
    const linkedFolder = previewOwnerOpsFolderIntake({ root, folderPath: "linked-folder" });

    assert.equal(outside.status, "blocked");
    assert.equal(outside.reason, "path_outside_root");
    assert.equal(linkedFile.status, "blocked");
    assert.equal(linkedFile.reason, "symlink_escape");
    assert.equal(linkedFolder.status, "blocked");
    assert.equal(linkedFolder.reason, "symlink_escape");
  });

  it("exposes read-only intake surfaces through CLI, Gateway, and MCP", () => {
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "intake-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gateway = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/intake-table",
      body: {
        filename: "smartstore.csv",
        content: "문의,상태\n배송 언제 되나요?,신규",
      },
      root: tempRoot(),
    });
    const mcp = handleOwnerOpsMcpMessage({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "owner_ops.intake_preview",
        arguments: {
          intakeType: "table_text",
          filename: "smartstore.csv",
          content: "문의,상태\n배송 언제 되나요?,신규",
        },
      },
    });

    assert.equal(cliCheck.status, "ready");
    assert.equal(gateway.status, 200);
    assert.equal(gateway.body.schema, "gpao_t.owner_ops_table_text_intake_preview.v0_1");
    assert.equal(mcp.result.content[0].text.includes("gpao_t.owner_ops_table_text_intake_preview.v0_1"), true);
  });

  it("runs the first owner-facing scenario through local record, replay, and MCP host smoke", () => {
    const root = tempRoot();
    const fixture = buildOwnerOpsFirstOwnerScenarioFixture();
    const run = runOwnerOpsFirstOwnerScenario({ root });
    const smoke = runOwnerOpsMcpHostSmoke({ root });
    const check = verifyOwnerOpsFirstOwnerScenario({ root: tempRoot() });

    assert.equal(fixture.status, "ready");
    assert.equal(fixture.scenario.id, "smartstore_inquiry_csv_to_local_draft");
    assert.equal(run.status, "ready");
    assert.equal(run.steps.intake.schema, "gpao_t.owner_ops_table_text_intake_preview.v0_1");
    assert.equal(run.steps.candidates.candidates[0].id, "shopping_inquiry");
    assert.equal(run.steps.workflow.userConfirmation.stillLocked.includes("external_send"), true);
    assert.equal(run.steps.localRecord.status, "written_local_only");
    assert.equal(run.steps.localRecord.boundaryState.externalSend, false);
    assert.equal(run.steps.replay.totalRecords, 1);
    assert.equal(run.steps.mcpSmoke.status, "ready");
    assert.equal(smoke.blockedWriteStatus, "blocked_without_confirmation");
    assert.equal(check.status, "ready");
  });

  it("exposes the first owner-facing scenario through CLI and Gateway", () => {
    const cliFixture = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-scenario"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-scenario-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayFixture = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/first-owner-scenario",
      root: tempRoot(),
    });
    const gatewayRun = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/first-owner-scenario/run",
      root: tempRoot(),
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/first-owner-scenario/verify",
      root: tempRoot(),
    });

    assert.equal(cliFixture.schema, "gpao_t.owner_ops_first_owner_scenario_fixture.v0_1");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayFixture.status, 200);
    assert.equal(gatewayRun.status, 200);
    assert.equal(gatewayRun.body.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.checkedSurfaces.includes("MCP host smoke"), true);
  });

  it("builds an Owner Ops plugin package and market listing draft without public publication", () => {
    const root = tempRoot();
    const manifest = buildOwnerOpsPluginPackageManifest();
    const listing = buildOwnerOpsMarketListingDraft();
    const check = verifyOwnerOpsPluginPackage({ root });

    assert.equal(manifest.status, "ready");
    assert.equal(manifest.packageId, "gpao-t-owner-ops");
    assert.equal(manifest.installSurfaces.some((surface) => surface.id === "stdio_mcp"), true);
    assert.equal(manifest.toolManifest.some((tool) => tool.name === "owner_ops.intake_preview"), true);
    assert.equal(manifest.marketReadiness.publicListing, "not_published");
    assert.equal(manifest.authorityBoundary.blockedNow.includes("customer_message_send"), true);
    assert.equal(listing.status, "ready");
    assert.match(listing.safetyCopy, /고객에게 자동 전송하지 않습니다/);
    assert.equal(check.status, "ready");
    assert.equal(check.publicRelease, "not_published");
  });

  it("exposes Owner Ops plugin package surfaces through CLI and Gateway", () => {
    const cliManifest = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "plugin-package"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliListing = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "market-listing"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "plugin-package-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayManifest = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/plugin-package",
      root: tempRoot(),
    });
    const gatewayListing = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/market-listing",
      root: tempRoot(),
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/plugin-package/verify",
      root: tempRoot(),
    });

    assert.equal(cliManifest.schema, "gpao_t.owner_ops_plugin_package_manifest.v0_1");
    assert.equal(cliListing.schema, "gpao_t.owner_ops_market_listing_draft.v0_1");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayManifest.status, 200);
    assert.equal(gatewayListing.status, 200);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.checkedSurfaces.includes("market listing draft"), true);
  });

  it("builds team alpha guidance and owner-facing UX copy without opening publication", () => {
    const root = tempRoot();
    const guide = buildOwnerOpsTeamAlphaGuide();
    const copy = buildOwnerOpsOwnerFacingUxCopy();
    const check = verifyOwnerOpsTeamAlphaReadiness({ root });

    assert.equal(guide.status, "ready");
    assert.equal(guide.packageId, "gpao-t-owner-ops");
    assert.equal(guide.happyPath.length >= 5, true);
    assert.equal(guide.beforeStart.some((item) => item.includes("실제 고객에게 전송하지 않는다")), true);
    assert.equal(guide.blockedActions.includes("customer_message_send"), true);
    assert.equal(copy.status, "ready");
    assert.equal(copy.firstScreen.primaryAction, "샘플 문의로 시작");
    assert.equal(copy.safetyLabels.includes("자동 전송 안 함"), true);
    assert.match(copy.lockedActionCopy.customer_message_send, /잠겨 있습니다/);
    assert.equal(check.status, "ready");
    assert.equal(check.publicRelease, "not_published");
  });

  it("exposes team alpha and owner UX copy surfaces through CLI and Gateway", () => {
    const cliGuide = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "team-alpha-guide"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCopy = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "owner-ux-copy"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "team-alpha-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayGuide = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/team-alpha-guide",
      root: tempRoot(),
    });
    const gatewayCopy = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/owner-ux-copy",
      root: tempRoot(),
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/team-alpha/verify",
      root: tempRoot(),
    });

    assert.equal(cliGuide.schema, "gpao_t.owner_ops_internal_acceptance_guide.v0_1");
    assert.equal(cliCopy.schema, "gpao_t.owner_ops_owner_facing_ux_copy.v0_1");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayGuide.status, 200);
    assert.equal(gatewayCopy.status, 200);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.checkedSurfaces.includes("owner-facing UX copy"), true);
  });

  it("builds host registration and alpha feedback handoff without public release", () => {
    const root = tempRoot();
    const guide = buildOwnerOpsHostRegistrationGuide();
    const matrix = buildOwnerOpsHostIntegrationMatrix();
    const matrixCheck = verifyOwnerOpsHostIntegrationMatrix();
    const form = buildOwnerOpsAlphaFeedbackForm();
    const check = verifyOwnerOpsHostAlphaHandoff({ root });

    assert.equal(guide.status, "ready");
    assert.equal(guide.mcpServer.name, "gpao-t-owner-ops");
    assert.equal(guide.mcpServer.network, "not_used");
    assert.deepEqual(guide.supportedHosts.map((host) => host.id), ["codex", "openclaw", "claude_code"]);
    assert.equal(guide.blockedActions.includes("public_market_publish"), true);
    assert.equal(matrix.status, "ready");
    assert.deepEqual(matrix.hosts.map((host) => host.id), ["codex", "openclaw", "claude_code"]);
    assert.equal(matrix.hosts.every((host) => host.externalNetwork === false), true);
    assert.equal(matrix.hosts.every((host) => host.customerSendAllowed === false), true);
    assert.equal(matrix.crossHostInvariants.some((rule) => rule.includes("same local stdio MCP command")), true);
    assert.equal(matrixCheck.status, "ready");
    assert.equal(matrixCheck.checkedHosts.includes("openclaw"), true);
    assert.equal(form.status, "ready");
    assert.equal(form.ratings.some((rating) => rating.id === "trust"), true);
    assert.equal(form.blockerTags.includes("host_registration_failed"), true);
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("host integration matrix"), true);
    assert.equal(check.publicRelease, "not_published");
    assert.equal(check.externalActionsRemainBlocked, true);
  });

  it("exposes host registration and alpha feedback through CLI and Gateway", () => {
    const cliGuide = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "host-registration-guide"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliMatrix = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "host-integration-matrix"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliMatrixCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "host-integration-matrix-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliForm = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "alpha-feedback-form"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "host-alpha-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayGuide = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/host-registration-guide",
      root: tempRoot(),
    });
    const gatewayMatrix = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/host-integration-matrix",
      root: tempRoot(),
    });
    const gatewayMatrixCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/host-integration-matrix/verify",
      root: tempRoot(),
    });
    const gatewayForm = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/alpha-feedback-form",
      root: tempRoot(),
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/host-alpha/verify",
      root: tempRoot(),
    });

    assert.equal(cliGuide.schema, "gpao_t.owner_ops_host_registration_guide.v0_1");
    assert.equal(cliMatrix.schema, "gpao_t.owner_ops_host_integration_matrix.v0_1");
    assert.equal(cliMatrix.hosts.length, 3);
    assert.equal(cliMatrixCheck.status, "ready");
    assert.equal(cliForm.schema, "gpao_t.owner_ops_internal_acceptance_feedback_form.v0_1");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayGuide.status, 200);
    assert.equal(gatewayMatrix.status, 200);
    assert.equal(gatewayMatrix.body.hosts.every((host) => host.credentialRequired === false), true);
    assert.equal(gatewayMatrixCheck.status, 200);
    assert.equal(gatewayMatrixCheck.body.status, "ready");
    assert.equal(gatewayForm.status, 200);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.checkedSurfaces.includes("public publish block"), true);
  });

  it("builds first owner beta guide and sample data kit without opening live accounts", () => {
    const root = tempRoot();
    const kit = buildOwnerOpsSampleDataKit();
    const guide = buildOwnerOpsFirstOwnerBetaGuide();
    const check = verifyOwnerOpsFirstOwnerBetaReadiness({ root });

    assert.equal(kit.status, "ready");
    assert.equal(kit.samples.length, 3);
    assert.equal(kit.redactionRules.some((rule) => rule.includes("전화번호")), true);
    assert.equal(guide.status, "ready");
    assert.equal(guide.ownerScript.some((line) => line.includes("고객에게 바로 보내지 않습니다")), true);
    assert.equal(guide.stopConditions.some((condition) => condition.includes("개인정보")), true);
    assert.equal(guide.stillBlocked.includes("고객 자동 발송"), true);
    assert.equal(check.status, "ready");
    assert.equal(check.publicRelease, "not_published");
    assert.equal(check.liveAccountConnection, "blocked");
  });

  it("exposes first owner beta surfaces through CLI and Gateway", () => {
    const cliKit = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "sample-data-kit"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliGuide = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-guide"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayKit = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/sample-data-kit",
      root: tempRoot(),
    });
    const gatewayGuide = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/first-owner-beta-guide",
      root: tempRoot(),
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/first-owner-beta/verify",
      root: tempRoot(),
    });

    assert.equal(cliKit.schema, "gpao_t.owner_ops_sample_data_kit.v0_1");
    assert.equal(cliGuide.schema, "gpao_t.owner_ops_owner_acceptance_guide.v0_1");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayKit.status, 200);
    assert.equal(gatewayGuide.status, 200);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.checkedSurfaces.includes("owner stop conditions"), true);
  });

  it("synthesizes beta feedback into industry templates while keeping public submission blocked", () => {
    const root = tempRoot();
    const synthesis = buildOwnerOpsBetaFeedbackSynthesis();
    const catalog = buildOwnerOpsIndustryTemplateCatalog();
    const gate = buildOwnerOpsMarketReadinessGate({ root });
    const check = verifyOwnerOpsMarketReadiness({ root });

    assert.equal(synthesis.status, "ready");
    assert.equal(synthesis.acceptance.noCriticalBlockers, true);
    assert.equal(synthesis.hostCoverage.length >= 3, true);
    assert.equal(catalog.status, "ready");
    assert.equal(catalog.templates.length >= 3, true);
    assert.equal(catalog.templates.every((group) =>
      group.templates.every((template) => template.authorityBoundary.includes("no customer auto-send"))
    ), true);
    assert.equal(gate.status, "ready");
    assert.equal(gate.publicSubmissionAllowed, false);
    assert.equal(gate.publicationState, "not_published");
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("industry template catalog"), true);
  });

  it("exposes market readiness surfaces through CLI and Gateway", () => {
    const cliSynthesis = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "beta-feedback-synthesis"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCatalog = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "industry-template-catalog"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliGate = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "market-readiness-gate"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "market-readiness-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewaySynthesis = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/beta-feedback-synthesis",
      root: tempRoot(),
    });
    const gatewayCatalog = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/industry-template-catalog",
      root: tempRoot(),
    });
    const gatewayGate = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/market-readiness-gate",
      root: tempRoot(),
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/market-readiness/verify",
      root: tempRoot(),
    });

    assert.equal(cliSynthesis.schema, "gpao_t.owner_ops_beta_feedback_synthesis.v0_1");
    assert.equal(cliCatalog.schema, "gpao_t.owner_ops_industry_template_catalog.v0_1");
    assert.equal(cliGate.schema, "gpao_t.owner_ops_market_readiness_gate.v0_1");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewaySynthesis.status, 200);
    assert.equal(gatewayCatalog.status, 200);
    assert.equal(gatewayGate.status, 200);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.publicSubmissionAllowed, false);
  });

  it("builds template replay fixtures and privacy copy before public package review", () => {
    const root = tempRoot();
    const fixtures = buildOwnerOpsTemplateReplayFixtures({ root });
    const privacy = buildOwnerOpsPrivacyCopyPack();
    const review = buildOwnerOpsPrePublicPackageReview({ root });
    const check = verifyOwnerOpsPrePublicPackage({ root });

    assert.equal(fixtures.status, "ready");
    assert.equal(fixtures.fixtureCount >= 3, true);
    assert.equal(fixtures.fixtures.every((fixture) =>
      fixture.blockedActions.includes("customer_message_send")
    ), true);
    assert.equal(privacy.status, "ready");
    assert.equal(privacy.shortLabels.includes("자동 전송 안 함"), true);
    assert.equal(privacy.dataUseCopy.some((item) => item.body.includes("전화번호")), true);
    assert.equal(review.status, "ready");
    assert.equal(review.publicSubmissionAllowed, false);
    assert.equal(review.checkedSurfaces.includes("beta feedback action queue"), true);
    assert.equal(review.betaFeedbackActionQueue.status, "ready");
    assert.equal(review.betaFeedbackActionQueue.itemCount >= 4, true);
    assert.equal(review.betaFeedbackActionQueue.lanes.includes("package_review"), true);
    assert.equal(review.betaFeedbackActionQueue.publicSubmissionAllowed, false);
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("privacy copy pack"), true);
    assert.equal(check.checkedSurfaces.includes("beta feedback action queue"), true);
    assert.equal(check.betaFeedbackActionQueue.status, "ready");
  });

  it("exposes pre-public package surfaces through CLI and Gateway", () => {
    const cliFixtures = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "template-replay-fixtures"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliPrivacy = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "privacy-copy-pack"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliReview = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "pre-public-package-review"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "pre-public-package-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayFixtures = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/template-replay-fixtures",
      root: tempRoot(),
    });
    const gatewayPrivacy = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/privacy-copy-pack",
      root: tempRoot(),
    });
    const gatewayReview = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/pre-public-package-review",
      root: tempRoot(),
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/pre-public-package/verify",
      root: tempRoot(),
    });

    assert.equal(cliFixtures.schema, "gpao_t.owner_ops_template_replay_fixtures.v0_1");
    assert.equal(cliPrivacy.schema, "gpao_t.owner_ops_privacy_copy_pack.v0_1");
    assert.equal(cliReview.schema, "gpao_t.owner_ops_pre_public_package_review.v0_1");
    assert.equal(cliReview.checkedSurfaces.includes("beta feedback action queue"), true);
    assert.equal(cliReview.betaFeedbackActionQueue.publicSubmissionAllowed, false);
    assert.equal(cliCheck.status, "ready");
    assert.equal(cliCheck.checkedSurfaces.includes("beta feedback action queue"), true);
    assert.equal(gatewayFixtures.status, 200);
    assert.equal(gatewayPrivacy.status, 200);
    assert.equal(gatewayReview.status, 200);
    assert.equal(gatewayReview.body.betaFeedbackActionQueue.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.publicSubmissionAllowed, false);
    assert.equal(gatewayCheck.body.betaFeedbackActionQueue.publicSubmissionAllowed, false);
  });

  it("bridges market evidence into pre-public package review without enabling release", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsTeamAlphaHandoffBundle({ root });
    writeOwnerOpsFirstOwnerBetaHandoffBundle({ root });
    writeOwnerOpsFirstOwnerBetaOperationalTestPackage({ root });
    writeOwnerOpsFirstOwnerBetaResultReview({ root });
    writeOwnerOpsMarketEvidenceBundle({ root });

    const bridge = buildOwnerOpsPrePublicEvidenceBridge({ root });
    const check = verifyOwnerOpsPrePublicEvidenceBridge({ root });

    assert.equal(bridge.schema, "gpao_t.owner_ops_pre_public_evidence_bridge.v0_1");
    assert.equal(bridge.status, "ready");
    assert.equal(bridge.marketEvidenceBundle.status, "ready");
    assert.equal(bridge.prePublicPackageReview.status, "ready");
    assert.equal(bridge.prePublicPackageReview.checkedSurfaces.includes("beta feedback action queue"), true);
    assert.equal(bridge.prePublicPackageReview.betaFeedbackActionQueue.status, "ready");
    assert.equal(bridge.authorityBoundary.publicSubmissionAllowed, false);
    assert.equal(bridge.authorityBoundary.packageUploadAllowed, false);
    assert.equal(bridge.blockedActions.includes("customer_data_packaging"), true);
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("beta feedback action queue"), true);
  });

  it("turns pre-public beta feedback queue into a local repair backlog", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsTeamAlphaHandoffBundle({ root });
    writeOwnerOpsFirstOwnerBetaHandoffBundle({ root });
    writeOwnerOpsFirstOwnerBetaOperationalTestPackage({ root });
    writeOwnerOpsFirstOwnerBetaResultReview({ root });
    writeOwnerOpsMarketEvidenceBundle({ root });

    const backlog = buildOwnerOpsPrePublicRepairBacklog({ root });
    const writeResult = writeOwnerOpsPrePublicRepairBacklog({ root });
    const check = verifyOwnerOpsPrePublicRepairBacklog({ root });

    assert.equal(backlog.schema, "gpao_t.owner_ops_pre_public_repair_backlog.v0_1");
    assert.equal(backlog.status, "ready");
    assert.equal(backlog.repairSummary.itemCount >= 4, true);
    assert.equal(backlog.repairSummary.lanes.includes("template_replay_fixture"), true);
    assert.equal(backlog.repairSummary.lanes.includes("privacy_copy"), true);
    assert.equal(backlog.repairSummary.lanes.includes("owner_ux_copy"), true);
    assert.equal(backlog.repairSummary.lanes.includes("package_review"), true);
    assert.equal(backlog.authorityBoundary.publicSubmissionAllowed, false);
    assert.equal(backlog.authorityBoundary.customerSendExecuted, false);
    assert.equal(writeResult.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t", "packages", "OWNER-OPS-PRE-PUBLIC-REPAIR-BACKLOG.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("package review repair lane"), true);
  });

  it("exposes pre-public repair backlog through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "team-alpha-handoff-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-handoff-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-operational-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-result-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "market-evidence-write"], {
      cwd: root,
      encoding: "utf8",
    });

    const cliBacklog = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "pre-public-repair-backlog",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "pre-public-repair-write",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "pre-public-repair-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayBacklog = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/pre-public-repair-backlog",
      root,
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/pre-public-repair-backlog",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/pre-public-repair-backlog/verify",
      root,
    });

    assert.equal(cliBacklog.status, "ready");
    assert.equal(cliBacklog.authorityBoundary.publicSubmissionAllowed, false);
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayBacklog.status, 200);
    assert.equal(gatewayBacklog.body.repairSummary.lanes.includes("owner_ux_copy"), true);
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.status, "written_local_only");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.publicSubmissionAllowed, false);
  });

  it("turns pre-public repair backlog into local completion evidence", () => {
    const root = tempRoot();
    populateDistributionRoot(root);

    const evidence = buildOwnerOpsPrePublicRepairCompletionEvidence({ root });
    const writeResult = writeOwnerOpsPrePublicRepairCompletionEvidence({ root });
    const check = verifyOwnerOpsPrePublicRepairCompletionEvidence({ root });

    assert.equal(evidence.schema, "gpao_t.owner_ops_pre_public_repair_completion_evidence.v0_1");
    assert.equal(evidence.status, "ready");
    assert.equal(evidence.completionSummary.allItemsLocallyVerified, true);
    assert.equal(evidence.completionSummary.completedCount, evidence.sourceBacklog.itemCount);
    assert.equal(evidence.completionSummary.lanes.includes("template_replay_fixture"), true);
    assert.equal(evidence.completionSummary.lanes.includes("privacy_copy"), true);
    assert.equal(evidence.completionSummary.lanes.includes("owner_ux_copy"), true);
    assert.equal(evidence.completionSummary.lanes.includes("package_review"), true);
    assert.equal(evidence.authorityBoundary.publicSubmissionAllowed, false);
    assert.equal(evidence.authorityBoundary.customerSendExecuted, false);
    assert.equal(writeResult.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t", "packages", "OWNER-OPS-PRE-PUBLIC-REPAIR-COMPLETION-EVIDENCE.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("repair item local completion state"), true);
  });

  it("exposes pre-public repair completion evidence through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    const cliEvidence = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "pre-public-repair-completion",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "pre-public-repair-completion-write",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "pre-public-repair-completion-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayEvidence = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/pre-public-repair-completion",
      root,
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/pre-public-repair-completion",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/pre-public-repair-completion/verify",
      root,
    });

    assert.equal(cliEvidence.status, "ready");
    assert.equal(cliEvidence.completionSummary.allItemsLocallyVerified, true);
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayEvidence.status, 200);
    assert.equal(gatewayEvidence.body.status, "ready");
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.status, "written_local_only");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("exposes pre-public evidence bridge through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "team-alpha-handoff-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-handoff-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-operational-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-result-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "market-evidence-write"], {
      cwd: root,
      encoding: "utf8",
    });

    const cliBridge = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "pre-public-evidence-bridge",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "pre-public-evidence-bridge-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayBridge = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/pre-public-evidence-bridge",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/pre-public-evidence-bridge/verify",
      root,
    });

    assert.equal(cliBridge.status, "ready");
    assert.equal(cliBridge.authorityBoundary.packageUploadAllowed, false);
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayBridge.status, 200);
    assert.equal(gatewayBridge.body.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("builds local distribution evidence without archive, signing, upload, or install execution", () => {
    const evidence = buildOwnerOpsDistributionEvidence({ root: ROOT });
    const readme = buildOwnerOpsDistributionReadme({ root: ROOT });
    const check = verifyOwnerOpsDistributionEvidence({ root: ROOT });

    assert.equal(evidence.status, "ready");
    assert.equal(evidence.packageId, "gpao-t-owner-ops");
    assert.equal(evidence.files.some((file) =>
      file.path === "bin/gpao-t-owner-ops-mcp.js" && file.status === "present"
    ), true);
    assert.equal(evidence.authorityBoundary.publicSubmissionAllowed, false);
    assert.equal(evidence.authorityBoundary.externalDistributionExecuted, false);
    assert.equal(evidence.archivePlan.archiveCreation, "not_executed");
    assert.equal(evidence.archivePlan.signing, "not_executed");
    assert.equal(evidence.prePublicRepairBacklog.status, "ready");
    assert.equal(evidence.prePublicRepairBacklog.lanes.includes("template_replay_fixture"), true);
    assert.equal(evidence.prePublicRepairBacklog.lanes.includes("privacy_copy"), true);
    assert.equal(evidence.prePublicRepairBacklog.lanes.includes("owner_ux_copy"), true);
    assert.equal(evidence.prePublicRepairBacklog.lanes.includes("package_review"), true);
    assert.equal(evidence.prePublicRepairBacklog.publicSubmissionAllowed, false);
    assert.equal(evidence.prePublicRepairCompletionEvidence.status, "ready");
    assert.equal(evidence.prePublicRepairCompletionEvidence.allItemsLocallyVerified, true);
    assert.equal(evidence.prePublicRepairCompletionEvidence.completedCount, evidence.prePublicRepairCompletionEvidence.itemCount);
    assert.equal(evidence.installUpdateRollbackEvidence.canInstallNow, false);
    assert.equal(readme.status, "ready");
    assert.equal(readme.sections.some((section) =>
      section.bullets.includes("`node bin/gpao-t.js owner-ops pre-public-repair-check`를 확인합니다.")
    ), true);
    assert.equal(readme.sections.some((section) =>
      section.bullets.includes("`node bin/gpao-t.js owner-ops pre-public-repair-completion-check`를 확인합니다.")
    ), true);
    assert.equal(readme.sections.some((section) =>
      section.bullets.includes("고객 자동 발송")
    ), true);
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("pre-public repair backlog"), true);
    assert.equal(check.checkedSurfaces.includes("pre-public repair completion evidence"), true);
    assert.equal(check.externalDistributionExecuted, false);
  });

  it("exposes local distribution evidence surfaces through CLI and Gateway", () => {
    const cliEvidence = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "distribution-evidence"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliReadme = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "distribution-readme"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "distribution-evidence-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayEvidence = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/distribution-evidence",
      root: ROOT,
    });
    const gatewayReadme = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/distribution-readme",
      root: ROOT,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/distribution-evidence/verify",
      root: ROOT,
    });

    assert.equal(cliEvidence.schema, "gpao_t.owner_ops_distribution_evidence.v0_1");
    assert.equal(cliEvidence.prePublicRepairBacklog.status, "ready");
    assert.equal(cliEvidence.prePublicRepairCompletionEvidence.status, "ready");
    assert.equal(cliReadme.schema, "gpao_t.owner_ops_distribution_readme.v0_1");
    assert.equal(cliCheck.status, "ready");
    assert.equal(cliCheck.checkedSurfaces.includes("pre-public repair backlog"), true);
    assert.equal(cliCheck.checkedSurfaces.includes("pre-public repair completion evidence"), true);
    assert.equal(gatewayEvidence.status, 200);
    assert.equal(gatewayEvidence.body.prePublicRepairBacklog.status, "ready");
    assert.equal(gatewayEvidence.body.prePublicRepairCompletionEvidence.status, "ready");
    assert.equal(gatewayReadme.status, 200);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.publicSubmissionAllowed, false);
  });

  it("builds archive/checksum dry-run without writing package files", () => {
    const dryRun = buildOwnerOpsArchiveChecksumDryRun({ root: ROOT });
    const check = verifyOwnerOpsArchiveChecksumDryRun({ root: ROOT });

    assert.equal(dryRun.status, "ready");
    assert.equal(dryRun.archiveCandidate.archiveCreation, "not_executed");
    assert.equal(dryRun.archiveCandidate.checksumFileWrite, "not_executed");
    assert.equal(dryRun.authorityBoundary.fileWriteExecuted, false);
    assert.equal(dryRun.authorityBoundary.publicUploadExecuted, false);
    assert.equal(dryRun.includedFiles.some((file) =>
      file.path === "docs/04-skill-ecosystem/OWNER-OPS-DISTRIBUTION-EVIDENCE-v0.1-ko.md"
    ), true);
    assert.equal(dryRun.packageChecklist.includes("public upload remains blocked"), true);
    assert.equal(check.status, "ready");
    assert.equal(check.fileWriteExecuted, false);
    assert.equal(check.publicUploadExecuted, false);
  });

  it("exposes archive/checksum dry-run surfaces through CLI and Gateway", () => {
    const cliDryRun = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "archive-checksum-dry-run"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "archive-checksum-dry-run-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayDryRun = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/archive-checksum-dry-run",
      root: ROOT,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/archive-checksum-dry-run/verify",
      root: ROOT,
    });

    assert.equal(cliDryRun.schema, "gpao_t.owner_ops_archive_checksum_dry_run.v0_1");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayDryRun.status, 200);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.fileWriteExecuted, false);
  });

  it("blocks local package candidate writes without confirmation and writes only local files with confirmation", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    const blocked = writeOwnerOpsLocalPackageCandidate({ root });
    const written = writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    const check = verifyOwnerOpsLocalPackageCandidateWriter({ root });

    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.writesExecuted, false);
    assert.equal(written.status, "written_local_only");
    assert.equal(written.filesWritten.length, 3);
    assert.equal(written.authorityBoundary.publicUploadExecuted, false);
    assert.equal(written.authorityBoundary.signingExecuted, false);
    assert.equal(existsSync(join(root, written.filesWritten[0])), true);
    assert.equal(readFileSync(join(root, written.filesWritten[2]), "utf8").includes(written.bundleSha256), true);
    assert.equal(check.status, "ready");
    assert.equal(check.writeWithoutConfirmationBlocked, true);
  });

  it("exposes local package candidate writer through CLI and Gateway while keeping confirmation explicit", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    const cliBlocked = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "local-package-candidate"], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWritten = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "owner-ops", "local-package-candidate-check"], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayBlocked = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/local-package-candidate",
      root,
      body: {},
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/local-package-candidate/verify",
      root,
    });

    assert.equal(cliBlocked.status, "blocked");
    assert.equal(cliWritten.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayBlocked.status, 200);
    assert.equal(gatewayBlocked.body.status, "blocked");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.writeWithoutConfirmationBlocked, true);
  });

  it("reads back local package candidate integrity without opening public distribution", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    const missing = readOwnerOpsLocalPackageCandidate({ root });
    const written = writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    const readback = readOwnerOpsLocalPackageCandidate({ root });
    const check = verifyOwnerOpsLocalPackageCandidateReadback({ root });

    assert.equal(missing.status, "missing");
    assert.equal(missing.findings.includes("internal_production_package_files_missing"), true);
    assert.equal(written.status, "written_local_only");
    assert.equal(readback.status, "ready");
    assert.equal(readback.bundleSha256, written.bundleSha256);
    assert.equal(readback.fileCount > 0, true);
    assert.equal(readback.fileResults.every((file) => file.ok), true);
    assert.equal(readback.authorityBoundary.publicUploadExecuted, false);
    assert.equal(readback.authorityBoundary.installExecuted, false);
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("embedded file content matches manifest sha256 and bytes"), true);
  });

  it("exposes local package candidate readback through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    const cliWritten = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliReadback = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate-readback",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate-readback-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayReadback = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/local-package-candidate/readback",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/local-package-candidate/readback/verify",
      root,
    });

    assert.equal(cliWritten.status, "written_local_only");
    assert.equal(cliReadback.schema, "gpao_t.owner_ops_internal_production_package_readback.v0_1");
    assert.equal(cliReadback.status, "ready");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayReadback.status, 200);
    assert.equal(gatewayReadback.body.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("builds release readiness evidence without opening publish, signing, install, update, or rollback", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });

    const evidence = buildOwnerOpsReleaseReadinessEvidence({ root });
    const write = writeOwnerOpsReleaseReadinessEvidence({ root });
    const check = verifyOwnerOpsReleaseReadinessEvidence({ root });

    assert.equal(evidence.schema, "gpao_t.owner_ops_release_readiness_evidence.v0_1");
    assert.equal(evidence.status, "ready");
    assert.equal(evidence.prePublicEvidenceBridge.status, "ready");
    assert.equal(evidence.prePublicRepairBacklog.status, "ready");
    assert.equal(evidence.prePublicRepairBacklog.lanes.includes("package_review"), true);
    assert.equal(evidence.prePublicRepairCompletionEvidence.status, "ready");
    assert.equal(evidence.prePublicRepairCompletionEvidence.allItemsLocallyVerified, true);
    assert.equal(evidence.internalProductionPackage.status, "ready");
    assert.equal(evidence.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(evidence.authorityBoundary.signingExecuted, false);
    assert.equal(evidence.installUpdateRollbackReadiness.canInstallNow, false);
    assert.equal(evidence.humanReviewApprovalEvidence.state, "not_requested");
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-RELEASE-READINESS-EVIDENCE.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("pre-public repair backlog"), true);
    assert.equal(check.checkedSurfaces.includes("pre-public repair completion evidence"), true);
  });

  it("exposes release readiness evidence through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });

    const cliEvidence = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "release-readiness-evidence",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "release-readiness-write",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "release-readiness-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayEvidence = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/release-readiness-evidence",
      root,
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/release-readiness-evidence",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/release-readiness-evidence/verify",
      root,
    });

    assert.equal(cliEvidence.status, "ready");
    assert.equal(cliEvidence.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayEvidence.status, 200);
    assert.equal(gatewayEvidence.body.status, "ready");
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.status, "written_local_only");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("builds a human review approval packet without implying approval", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });

    const packet = buildOwnerOpsHumanReviewApprovalPacket({ root });
    const write = writeOwnerOpsHumanReviewApprovalPacket({ root });
    const check = verifyOwnerOpsHumanReviewApprovalPacket({ root });

    assert.equal(packet.schema, "gpao_t.owner_ops_human_review_approval_packet.v0_1");
    assert.equal(packet.status, "ready");
    assert.equal(packet.approvalState, "prepared_not_approved");
    assert.equal(packet.requiredOwnerDecision.publicReleaseApprovedNow, false);
    assert.equal(packet.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(packet.evidenceRefs.prePublicRepairCompletion, ".gpao-t/packages/OWNER-OPS-PRE-PUBLIC-REPAIR-COMPLETION-EVIDENCE.json");
    assert.equal(packet.evidenceSummary.prePublicRepairCompletion, "ready");
    assert.equal(packet.evidenceSummary.allRepairItemsLocallyVerified, true);
    assert.equal(packet.reviewChecklist.some((item) => item.id === "explicit_public_distribution"), true);
    assert.equal(packet.reviewChecklist.some((item) => item.id === "pre_public_repairs_completed"), true);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-HUMAN-REVIEW-APPROVAL-PACKET.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("pre-public repair completion evidence"), true);
    assert.equal(check.repairCompletionStatus, "ready");
    assert.equal(check.completedRepairItems, check.totalRepairItems);
  });

  it("exposes human review approval packet through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "release-readiness-write"], {
      cwd: root,
      encoding: "utf8",
    });

    const cliPacket = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "human-review-approval-packet",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "human-review-approval-write",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "human-review-approval-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayPacket = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/human-review-approval-packet",
      root,
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/human-review-approval-packet",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/human-review-approval-packet/verify",
      root,
    });

    assert.equal(cliPacket.status, "ready");
    assert.equal(cliPacket.approvalState, "prepared_not_approved");
    assert.equal(cliPacket.evidenceSummary.allRepairItemsLocallyVerified, true);
    assert.equal(cliPacket.reviewChecklist.some((item) => item.id === "pre_public_repairs_completed"), true);
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(cliCheck.repairCompletionStatus, "ready");
    assert.equal(gatewayPacket.status, 200);
    assert.equal(gatewayPacket.body.status, "ready");
    assert.equal(gatewayPacket.body.evidenceSummary.prePublicRepairCompletion, "ready");
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.status, "written_local_only");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("keeps human review decision lane local-only and token-gated", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });

    const lane = buildOwnerOpsHumanReviewDecisionLane({
      root,
      decision: "approve_local_review_only",
    });
    const blockedWrite = appendOwnerOpsHumanReviewDecisionRecord({
      root,
      decision: "approve_local_review_only",
    });
    const written = appendOwnerOpsHumanReviewDecisionRecord({
      root,
      decision: "approve_local_review_only",
      approvalToken: "approve-owner-ops-human-review-local-only",
    });
    const records = readOwnerOpsHumanReviewDecisionRecords({ root });
    const check = verifyOwnerOpsHumanReviewDecisionLane({ root });

    assert.equal(lane.schema, "gpao_t.owner_ops_human_review_decision_lane.v0_1");
    assert.equal(lane.status, "ready");
    assert.equal(lane.requiredApproval.token, "approve-owner-ops-human-review-local-only");
    assert.equal(lane.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(blockedWrite.status, "blocked");
    assert.equal(blockedWrite.recordWritten, false);
    assert.equal(written.status, "written_local_only");
    assert.equal(written.publicReleaseAllowed, false);
    assert.equal(written.packageUploadAllowed, false);
    assert.equal(records.recordCount, 1);
    assert.equal(records.latestRecord.decision, "approve_local_review_only");
    assert.equal(records.latestRecord.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(existsSync(join(root, ".gpao-t/owner-ops/human-review/decision-records.jsonl")), true);
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("write blocked without exact token"), true);
  });

  it("exposes human review decision lane through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "release-readiness-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "human-review-approval-write"], {
      cwd: root,
      encoding: "utf8",
    });

    const cliLane = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "human-review-decision-lane",
      "revise",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliBlocked = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "human-review-decision-append",
      "revise",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWritten = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "human-review-decision-append",
      "revise",
      "approve-owner-ops-human-review-local-only",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliRecords = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "human-review-decision-records",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "human-review-decision-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayLane = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/human-review-decision-lane",
      root,
      body: { decision: "approve_local_review_only" },
    });
    const gatewayBlocked = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/human-review-decision-append",
      root,
      body: { decision: "approve_local_review_only" },
    });
    const gatewayRecords = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/human-review-decision-records",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/human-review-decision-lane/verify",
      root,
    });

    assert.equal(cliLane.status, "ready");
    assert.equal(cliLane.decision, "revise");
    assert.equal(cliBlocked.status, "blocked");
    assert.equal(cliWritten.status, "written_local_only");
    assert.equal(cliRecords.recordCount, 1);
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayLane.status, 200);
    assert.equal(gatewayLane.body.status, "ready");
    assert.equal(gatewayBlocked.status, 200);
    assert.equal(gatewayBlocked.body.status, "blocked");
    assert.equal(gatewayRecords.status, 200);
    assert.equal(gatewayRecords.body.recordCount, 1);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("builds signed package evidence without executing signing or release", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });

    const evidence = buildOwnerOpsSignedPackageEvidence({ root });
    const write = writeOwnerOpsSignedPackageEvidence({ root });
    const check = verifyOwnerOpsSignedPackageEvidence({ root });

    assert.equal(evidence.schema, "gpao_t.owner_ops_signed_package_evidence.v0_1");
    assert.equal(evidence.status, "ready");
    assert.equal(evidence.signedPackageState, "unsigned_internal_production_package");
    assert.equal(evidence.authorityBoundary.signingExecuted, false);
    assert.equal(evidence.authorityBoundary.signedArtifactWritten, false);
    assert.equal(evidence.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(evidence.requiredBeforePublicRelease.includes("signature verification output"), true);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-SIGNED-PACKAGE-EVIDENCE.md")), true);
    assert.equal(check.status, "ready");
  });

  it("exposes signed package evidence through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "release-readiness-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "human-review-approval-write"], {
      cwd: root,
      encoding: "utf8",
    });

    const cliEvidence = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "signed-package-evidence",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "signed-package-evidence-write",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "signed-package-evidence-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayEvidence = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/signed-package-evidence",
      root,
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/signed-package-evidence",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/signed-package-evidence/verify",
      root,
    });

    assert.equal(cliEvidence.status, "ready");
    assert.equal(cliEvidence.signedPackageState, "unsigned_internal_production_package");
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayEvidence.status, 200);
    assert.equal(gatewayEvidence.body.status, "ready");
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.signingExecuted, false);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("builds install/update/rollback proof without executing operations", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });

    const proof = buildOwnerOpsInstallUpdateRollbackProof({ root });
    const write = writeOwnerOpsInstallUpdateRollbackProof({ root });
    const check = verifyOwnerOpsInstallUpdateRollbackProof({ root });

    assert.equal(proof.schema, "gpao_t.owner_ops_install_update_rollback_proof.v0_1");
    assert.equal(proof.status, "ready");
    assert.equal(proof.proofState, "proof_requirements_ready_not_executed");
    assert.equal(proof.authorityBoundary.installExecuted, false);
    assert.equal(proof.authorityBoundary.updateExecuted, false);
    assert.equal(proof.authorityBoundary.rollbackExecuted, false);
    assert.equal(proof.requiredProofBeforeRelease.includes("post-rollback verification command list"), true);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-INSTALL-UPDATE-ROLLBACK-PROOF.md")), true);
    assert.equal(check.status, "ready");
  });

  it("exposes install/update/rollback proof through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "release-readiness-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "human-review-approval-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "signed-package-evidence-write"], {
      cwd: root,
      encoding: "utf8",
    });

    const cliProof = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "install-update-rollback-proof",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "install-update-rollback-proof-write",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "install-update-rollback-proof-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayProof = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/install-update-rollback-proof",
      root,
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/install-update-rollback-proof",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/install-update-rollback-proof/verify",
      root,
    });

    assert.equal(cliProof.status, "ready");
    assert.equal(cliProof.proofState, "proof_requirements_ready_not_executed");
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayProof.status, 200);
    assert.equal(gatewayProof.body.status, "ready");
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.installExecuted, false);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("builds deployment dry-run plan without executing install update or rollback", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });
    writeOwnerOpsInstallUpdateRollbackProof({ root });

    const plan = buildOwnerOpsDeploymentDryRunPlan({ root });
    const write = writeOwnerOpsDeploymentDryRunPlan({ root });
    const check = verifyOwnerOpsDeploymentDryRunPlan({ root });

    assert.equal(plan.schema, "gpao_t.owner_ops_deployment_dry_run_plan.v0_1");
    assert.equal(plan.status, "ready");
    assert.equal(plan.planState, "dry_run_plan_only_not_executed");
    assert.deepEqual(plan.laneIds, undefined);
    assert.deepEqual(plan.lanes.map((lane) => lane.id), ["install", "update", "rollback"]);
    assert.equal(plan.lanes.every((lane) => lane.executionState === "not_executed"), true);
    assert.equal(plan.authorityBoundary.installExecuted, false);
    assert.equal(plan.authorityBoundary.updateExecuted, false);
    assert.equal(plan.authorityBoundary.rollbackExecuted, false);
    assert.equal(plan.authorityBoundary.fileMutationExecuted, false);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-DEPLOYMENT-DRY-RUN-PLAN.md")), true);
    assert.equal(check.status, "ready");
    assert.deepEqual(check.laneIds, ["install", "update", "rollback"]);
  });

  it("exposes deployment dry-run plan through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "release-readiness-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "human-review-approval-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "signed-package-evidence-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "install-update-rollback-proof-write"], {
      cwd: root,
      encoding: "utf8",
    });

    const cliPlan = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "deployment-dry-run-plan",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "deployment-dry-run-write",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "deployment-dry-run-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayPlan = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/deployment-dry-run-plan",
      root,
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/deployment-dry-run-plan",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/deployment-dry-run-plan/verify",
      root,
    });

    assert.equal(cliPlan.status, "ready");
    assert.equal(cliPlan.planState, "dry_run_plan_only_not_executed");
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayPlan.status, 200);
    assert.equal(gatewayPlan.body.status, "ready");
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.installExecuted, false);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("builds dry-run executor proof without approval write or invocation", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });
    writeOwnerOpsInstallUpdateRollbackProof({ root });
    writeOwnerOpsDeploymentDryRunPlan({ root });

    const proof = buildOwnerOpsDryRunExecutorProof({ root, requestedLane: "install" });
    const write = writeOwnerOpsDryRunExecutorProof({ root, requestedLane: "install" });
    const check = verifyOwnerOpsDryRunExecutorProof({ root, requestedLane: "install" });
    const updateProof = buildOwnerOpsDryRunExecutorProof({ root, requestedLane: "update" });

    assert.equal(proof.schema, "gpao_t.owner_ops_dry_run_executor_proof.v0_1");
    assert.equal(proof.status, "ready");
    assert.equal(proof.executorState, "approval_packet_prepared_not_invoked");
    assert.equal(proof.approvalPacket.state, "prepared_not_approved");
    assert.equal(proof.approvalPacket.approvalTokenRequired, "approve-owner-ops-install-dry-run");
    assert.equal(proof.invocationPreview.executionState, "not_invoked");
    assert.equal(proof.simulatedResult.state, "simulated_not_invoked");
    assert.deepEqual(proof.simulatedResult.wouldWrite, []);
    assert.deepEqual(proof.simulatedResult.wouldExecuteCommands, []);
    assert.equal(proof.authorityBoundary.approvalWritten, false);
    assert.equal(proof.authorityBoundary.dryRunInvoked, false);
    assert.equal(proof.authorityBoundary.fileMutationExecuted, false);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-DRY-RUN-EXECUTOR-PROOF-INSTALL.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(updateProof.requestedLane, "update");
    assert.equal(updateProof.approvalPacket.approvalTokenRequired, "approve-owner-ops-update-dry-run");
  });

  it("exposes dry-run executor proof through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "release-readiness-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "human-review-approval-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "signed-package-evidence-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "install-update-rollback-proof-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "deployment-dry-run-write"], {
      cwd: root,
      encoding: "utf8",
    });

    const cliProof = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-executor-proof",
      "rollback",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-executor-write",
      "rollback",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-executor-check",
      "rollback",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayProof = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/dry-run-executor-proof",
      root,
      body: { requestedLane: "rollback" },
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/dry-run-executor-proof",
      root,
      body: { requestedLane: "rollback" },
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/dry-run-executor-proof/verify",
      root,
      body: { requestedLane: "rollback" },
    });

    assert.equal(cliProof.status, "ready");
    assert.equal(cliProof.requestedLane, "rollback");
    assert.equal(cliProof.authorityBoundary.dryRunInvoked, false);
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayProof.status, 200);
    assert.equal(gatewayProof.body.status, "ready");
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.dryRunInvoked, false);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("designs dry-run approval record writes without appending approvals or invoking dry-run", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });
    writeOwnerOpsInstallUpdateRollbackProof({ root });
    writeOwnerOpsDeploymentDryRunPlan({ root });
    writeOwnerOpsDryRunExecutorProof({ root, requestedLane: "install" });

    const design = buildOwnerOpsDryRunApprovalRecordDesign({ root, requestedLane: "install" });
    const write = writeOwnerOpsDryRunApprovalRecordDesign({ root, requestedLane: "install" });
    const check = verifyOwnerOpsDryRunApprovalRecordDesign({ root, requestedLane: "install" });

    assert.equal(design.schema, "gpao_t.owner_ops_dry_run_approval_record_design.v0_1");
    assert.equal(design.status, "ready");
    assert.equal(design.designState, "approval_record_write_design_only");
    assert.equal(design.storageDesign.currentWrite, "not_executed");
    assert.equal(design.approvalRecordSchema.validApprovalToken, "approve-owner-ops-install-dry-run");
    assert.equal(design.futureRecordPreview.writeState, "preview_only_not_written");
    assert.equal(design.futureRecordPreview.decision, "hold");
    assert.equal(design.authorityBoundary.approvalRecordWritten, false);
    assert.equal(design.authorityBoundary.dryRunInvoked, false);
    assert.equal(design.authorityBoundary.installExecuted, false);
    assert.equal(write.status, "written_local_only");
    assert.equal(
      existsSync(join(root, ".gpao-t/packages/OWNER-OPS-DRY-RUN-APPROVAL-RECORD-DESIGN-INSTALL.md")),
      true,
    );
    assert.equal(check.status, "ready");
  });

  it("exposes dry-run approval record design through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "release-readiness-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "human-review-approval-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "signed-package-evidence-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "install-update-rollback-proof-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "deployment-dry-run-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "dry-run-executor-write", "update"], {
      cwd: root,
      encoding: "utf8",
    });

    const cliDesign = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-approval-record-design",
      "update",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-approval-record-write",
      "update",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-approval-record-check",
      "update",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayDesign = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/dry-run-approval-record-design",
      root,
      body: { requestedLane: "update" },
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/dry-run-approval-record-design",
      root,
      body: { requestedLane: "update" },
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/dry-run-approval-record-design/verify",
      root,
      body: { requestedLane: "update" },
    });

    assert.equal(cliDesign.status, "ready");
    assert.equal(cliDesign.requestedLane, "update");
    assert.equal(cliDesign.authorityBoundary.approvalRecordWritten, false);
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayDesign.status, 200);
    assert.equal(gatewayDesign.body.status, "ready");
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.approvalRecordWritten, false);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("blocks dry-run approval record append without exact owner approval token", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });
    writeOwnerOpsInstallUpdateRollbackProof({ root });
    writeOwnerOpsDeploymentDryRunPlan({ root });
    writeOwnerOpsDryRunExecutorProof({ root, requestedLane: "install" });
    writeOwnerOpsDryRunApprovalRecordDesign({ root, requestedLane: "install" });

    const lane = buildOwnerOpsDryRunApprovalRecordWriteLane({ root, requestedLane: "install" });
    const blocked = appendOwnerOpsDryRunApprovalRecord({ root, requestedLane: "install" });
    const records = readOwnerOpsDryRunApprovalRecords({ root });
    const check = verifyOwnerOpsDryRunApprovalRecordWriteLane({ root, requestedLane: "install" });

    assert.equal(lane.status, "ready");
    assert.equal(lane.laneState, "owner_approval_required_before_append");
    assert.equal(lane.requiredApproval.approvalToken, "approve-owner-ops-install-dry-run");
    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.approvalRecordWritten, false);
    assert.equal(blocked.dryRunInvoked, false);
    assert.equal(records.recordCount, 0);
    assert.equal(check.status, "ready");
  });

  it("appends dry-run approval records locally only with the exact token", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });
    writeOwnerOpsInstallUpdateRollbackProof({ root });
    writeOwnerOpsDeploymentDryRunPlan({ root });
    writeOwnerOpsDryRunExecutorProof({ root, requestedLane: "rollback" });
    writeOwnerOpsDryRunApprovalRecordDesign({ root, requestedLane: "rollback" });

    const append = appendOwnerOpsDryRunApprovalRecord({
      root,
      requestedLane: "rollback",
      approvalToken: "approve-owner-ops-rollback-dry-run",
      decision: "approve_dry_run_invocation",
      now: "2026-07-11T00:00:00.000Z",
      expiresAt: "2026-07-11T00:15:00.000Z",
    });
    const records = readOwnerOpsDryRunApprovalRecords({ root });

    assert.equal(append.status, "written_local_only");
    assert.equal(append.approvalRecordWritten, true);
    assert.equal(append.dryRunInvoked, false);
    assert.equal(append.record.requestedLane, "rollback");
    assert.equal(append.record.invocationState, "not_invoked");
    assert.equal(append.authorityBoundary.rollbackExecuted, false);
    assert.equal(records.recordCount, 1);
    assert.equal(records.records[0].decision, "approve_dry_run_invocation");
    assert.equal(existsSync(join(root, ".gpao-t/owner-ops/approvals/dry-run-approvals.jsonl")), true);
    assert.equal(existsSync(join(root, ".gpao-t/owner-ops/approvals/index.json")), true);
  });

  it("exposes dry-run approval record write lane through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "release-readiness-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "human-review-approval-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "signed-package-evidence-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "install-update-rollback-proof-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "deployment-dry-run-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "dry-run-executor-write", "update"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "dry-run-approval-record-write", "update"], { cwd: root });

    const cliLane = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-approval-record-lane",
      "update",
    ], { cwd: root, encoding: "utf8" }));
    const cliBlocked = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-approval-record-append",
      "update",
    ], { cwd: root, encoding: "utf8" }));
    const cliAppend = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-approval-record-append",
      "update",
      "approve-owner-ops-update-dry-run",
    ], { cwd: root, encoding: "utf8" }));
    const cliRecords = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-approval-records",
    ], { cwd: root, encoding: "utf8" }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-approval-record-lane-check",
      "update",
    ], { cwd: root, encoding: "utf8" }));
    const gatewayLane = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/dry-run-approval-record-lane",
      root,
      body: { requestedLane: "update" },
    });
    const gatewayAppend = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/dry-run-approval-record-append",
      root,
      body: {
        requestedLane: "update",
        approvalToken: "approve-owner-ops-update-dry-run",
      },
    });
    const gatewayRecords = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/dry-run-approval-records",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/dry-run-approval-record-lane/verify",
      root,
      body: { requestedLane: "update" },
    });

    assert.equal(cliLane.status, "ready");
    assert.equal(cliBlocked.status, "blocked");
    assert.equal(cliAppend.status, "written_local_only");
    assert.equal(cliAppend.dryRunInvoked, false);
    assert.equal(cliRecords.recordCount, 1);
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayLane.status, 200);
    assert.equal(gatewayLane.body.status, "ready");
    assert.equal(gatewayAppend.status, 200);
    assert.equal(gatewayAppend.body.status, "written_local_only");
    assert.equal(gatewayAppend.body.dryRunInvoked, false);
    assert.equal(gatewayRecords.status, 200);
    assert.equal(gatewayRecords.body.recordCount, 2);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("blocks controlled dry-run invocation until a valid approval record exists", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });
    writeOwnerOpsInstallUpdateRollbackProof({ root });
    writeOwnerOpsDeploymentDryRunPlan({ root });
    writeOwnerOpsDryRunExecutorProof({ root, requestedLane: "install" });
    writeOwnerOpsDryRunApprovalRecordDesign({ root, requestedLane: "install" });

    const gate = buildOwnerOpsControlledDryRunInvocationGate({ root, requestedLane: "install" });
    const invoke = invokeOwnerOpsControlledDryRun({ root, requestedLane: "install" });
    const records = readOwnerOpsControlledDryRunInvocations({ root });
    const check = verifyOwnerOpsControlledDryRunInvocationGate({ root, requestedLane: "install" });

    assert.equal(gate.status, "blocked");
    assert.equal(gate.findings.includes("valid_unexpired_approval_record_missing"), true);
    assert.equal(invoke.status, "blocked");
    assert.equal(invoke.dryRunInvoked, false);
    assert.equal(records.recordCount, 0);
    assert.equal(check.status, "blocked");
    assert.equal(check.dryRunSimulationRecordAllowed, false);
  });

  it("invokes only a local dry-run simulation when a valid approval record exists", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });
    writeOwnerOpsInstallUpdateRollbackProof({ root });
    writeOwnerOpsDeploymentDryRunPlan({ root });
    writeOwnerOpsDryRunExecutorProof({ root, requestedLane: "install" });
    writeOwnerOpsDryRunApprovalRecordDesign({ root, requestedLane: "install" });
    appendOwnerOpsDryRunApprovalRecord({
      root,
      requestedLane: "install",
      approvalToken: "approve-owner-ops-install-dry-run",
      decision: "approve_dry_run_invocation",
      now: "2026-07-11T00:00:00.000Z",
      expiresAt: "2099-07-11T00:15:00.000Z",
    });

    const gate = buildOwnerOpsControlledDryRunInvocationGate({
      root,
      requestedLane: "install",
      now: "2026-07-11T00:01:00.000Z",
    });
    const invoke = invokeOwnerOpsControlledDryRun({
      root,
      requestedLane: "install",
      now: "2026-07-11T00:01:00.000Z",
    });
    const records = readOwnerOpsControlledDryRunInvocations({ root });
    const check = verifyOwnerOpsControlledDryRunInvocationGate({
      root,
      requestedLane: "install",
    });

    assert.equal(gate.status, "ready");
    assert.equal(gate.gateState, "approved_for_local_dry_run_simulation");
    assert.equal(invoke.status, "simulated_local_only");
    assert.equal(invoke.dryRunInvoked, true);
    assert.equal(invoke.installExecuted, false);
    assert.equal(invoke.updateExecuted, false);
    assert.equal(invoke.rollbackExecuted, false);
    assert.equal(invoke.invocation.simulatedResult.wouldExecuteCommands.length, 0);
    assert.equal(records.recordCount, 1);
    assert.equal(records.records[0].authorityBoundary.installExecuted, false);
    assert.equal(check.status, "ready");
    assert.equal(check.dryRunSimulationRecordAllowed, true);
    assert.equal(existsSync(join(root, ".gpao-t/owner-ops/dry-runs/dry-run-invocations.jsonl")), true);
    assert.equal(existsSync(join(root, ".gpao-t/owner-ops/dry-runs/index.json")), true);
  });

  it("exposes controlled dry-run invocation through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "release-readiness-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "human-review-approval-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "signed-package-evidence-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "install-update-rollback-proof-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "deployment-dry-run-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "dry-run-executor-write", "rollback"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "dry-run-approval-record-write", "rollback"], { cwd: root });

    const cliBlocked = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "controlled-dry-run-invoke",
      "rollback",
    ], { cwd: root, encoding: "utf8" }));
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-approval-record-append",
      "rollback",
      "approve-owner-ops-rollback-dry-run",
    ], { cwd: root });
    const cliGate = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "controlled-dry-run-gate",
      "rollback",
    ], { cwd: root, encoding: "utf8" }));
    const cliInvoke = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "controlled-dry-run-invoke",
      "rollback",
    ], { cwd: root, encoding: "utf8" }));
    const cliRecords = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "controlled-dry-run-records",
    ], { cwd: root, encoding: "utf8" }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "controlled-dry-run-check",
      "rollback",
    ], { cwd: root, encoding: "utf8" }));
    const gatewayGate = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/controlled-dry-run-gate",
      root,
      body: { requestedLane: "rollback" },
    });
    const gatewayInvoke = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/controlled-dry-run-invoke",
      root,
      body: { requestedLane: "rollback" },
    });
    const gatewayRecords = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/controlled-dry-run-records",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/controlled-dry-run/verify",
      root,
      body: { requestedLane: "rollback" },
    });

    assert.equal(cliBlocked.status, "blocked");
    assert.equal(cliGate.status, "ready");
    assert.equal(cliInvoke.status, "simulated_local_only");
    assert.equal(cliInvoke.rollbackExecuted, false);
    assert.equal(cliRecords.recordCount, 1);
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayGate.status, 200);
    assert.equal(gatewayGate.body.status, "ready");
    assert.equal(gatewayInvoke.status, 200);
    assert.equal(gatewayInvoke.body.status, "simulated_local_only");
    assert.equal(gatewayInvoke.body.rollbackExecuted, false);
    assert.equal(gatewayRecords.status, 200);
    assert.equal(gatewayRecords.body.recordCount, 2);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("keeps dry-run result handoff in review state until an invocation record exists", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });
    writeOwnerOpsInstallUpdateRollbackProof({ root });
    writeOwnerOpsDeploymentDryRunPlan({ root });
    writeOwnerOpsDryRunExecutorProof({ root, requestedLane: "install" });
    writeOwnerOpsDryRunApprovalRecordDesign({ root, requestedLane: "install" });

    const handoff = buildOwnerOpsDryRunResultReviewHandoff({ root, requestedLane: "install" });
    const write = writeOwnerOpsDryRunResultReviewHandoff({ root, requestedLane: "install" });
    const check = verifyOwnerOpsDryRunResultReviewHandoff({ root, requestedLane: "install" });

    assert.equal(handoff.status, "review");
    assert.equal(handoff.reviewState, "dry_run_result_missing");
    assert.equal(handoff.findings.includes("dry_run_invocation_record_missing"), true);
    assert.equal(handoff.authorityBoundary.installExecuted, false);
    assert.equal(handoff.authorityBoundary.updateExecuted, false);
    assert.equal(handoff.authorityBoundary.rollbackExecuted, false);
    assert.equal(write.status, "review");
    assert.equal(write.handoffStatus, "review");
    assert.equal(check.status, "blocked");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-DRY-RUN-RESULT-REVIEW-HANDOFF-INSTALL.json")), true);
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-DRY-RUN-RESULT-REVIEW-HANDOFF-INSTALL.md")), true);
  });

  it("writes a ready dry-run result handoff after controlled local simulation", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });
    writeOwnerOpsInstallUpdateRollbackProof({ root });
    writeOwnerOpsDeploymentDryRunPlan({ root });
    writeOwnerOpsDryRunExecutorProof({ root, requestedLane: "install" });
    writeOwnerOpsDryRunApprovalRecordDesign({ root, requestedLane: "install" });
    appendOwnerOpsDryRunApprovalRecord({
      root,
      requestedLane: "install",
      approvalToken: "approve-owner-ops-install-dry-run",
      decision: "approve_dry_run_invocation",
      now: "2026-07-11T00:00:00.000Z",
      expiresAt: "2099-07-11T00:15:00.000Z",
    });
    invokeOwnerOpsControlledDryRun({
      root,
      requestedLane: "install",
      now: "2026-07-11T00:01:00.000Z",
    });

    const handoff = buildOwnerOpsDryRunResultReviewHandoff({ root, requestedLane: "install" });
    const write = writeOwnerOpsDryRunResultReviewHandoff({ root, requestedLane: "install" });
    const check = verifyOwnerOpsDryRunResultReviewHandoff({ root, requestedLane: "install" });

    assert.equal(handoff.status, "ready");
    assert.equal(handoff.reviewState, "dry_run_result_available_for_human_review");
    assert.equal(handoff.handoffPacket.stillBlockedActions.includes("install execution"), true);
    assert.equal(handoff.replayChecklist.includes("wouldExecuteCommands is empty"), true);
    assert.equal(handoff.authorityBoundary.commandExecutionExecuted, false);
    assert.equal(write.status, "written_local_only");
    assert.equal(write.installExecuted, false);
    assert.equal(write.updateExecuted, false);
    assert.equal(write.rollbackExecuted, false);
    assert.equal(check.status, "ready");
  });

  it("exposes dry-run result handoff through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "release-readiness-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "human-review-approval-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "signed-package-evidence-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "install-update-rollback-proof-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "deployment-dry-run-write"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "dry-run-executor-write", "install"], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "dry-run-approval-record-write", "install"], { cwd: root });
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-approval-record-append",
      "install",
      "approve-owner-ops-install-dry-run",
    ], { cwd: root });
    execFileSync(process.execPath, [CLI, "owner-ops", "controlled-dry-run-invoke", "install"], { cwd: root });

    const cliHandoff = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-result-handoff",
      "install",
    ], { cwd: root, encoding: "utf8" }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-result-handoff-write",
      "install",
    ], { cwd: root, encoding: "utf8" }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "dry-run-result-handoff-check",
      "install",
    ], { cwd: root, encoding: "utf8" }));
    const gatewayHandoff = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/dry-run-result-handoff",
      root,
      body: { requestedLane: "install" },
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/dry-run-result-handoff",
      root,
      body: { requestedLane: "install" },
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/dry-run-result-handoff/verify",
      root,
      body: { requestedLane: "install" },
    });

    assert.equal(cliHandoff.status, "ready");
    assert.equal(cliHandoff.authorityBoundary.installExecuted, false);
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliWrite.installExecuted, false);
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayHandoff.status, 200);
    assert.equal(gatewayHandoff.body.status, "ready");
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.status, "written_local_only");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("builds an internal acceptance handoff from the verified internal production package", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });

    const bundle = buildOwnerOpsTeamAlphaHandoffBundle({ root });
    const write = writeOwnerOpsTeamAlphaHandoffBundle({ root });
    const check = verifyOwnerOpsTeamAlphaHandoffBundle({ root });

    assert.equal(bundle.schema, "gpao_t.owner_ops_internal_acceptance_handoff_bundle.v0_1");
    assert.equal(bundle.status, "ready");
    assert.equal(bundle.internalProductionPackage.status, "ready");
    assert.equal(bundle.handoffOrder.length >= 6, true);
    assert.equal(bundle.handoffOrder.some((item) => item.id === "host_integration_matrix"), true);
    assert.equal(bundle.hostIntegration.checkedStatus, "ready");
    assert.deepEqual(bundle.hostIntegration.hosts.map((host) => host.id), ["codex", "openclaw", "claude_code"]);
    assert.equal(bundle.hostIntegration.hosts.every((host) => host.externalNetwork === false), true);
    assert.equal(bundle.blockedActions.includes("customer_message_send"), true);
    assert.equal(bundle.authorityBoundary.publicUploadExecuted, false);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-INTERNAL-ACCEPTANCE-HANDOFF-BUNDLE.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("host integration matrix"), true);
    assert.equal(check.localBundleFilesPresent.markdown, true);
  });

  it("exposes team alpha handoff bundle through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliBundle = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "team-alpha-handoff-bundle",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "team-alpha-handoff-write",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "team-alpha-handoff-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayBundle = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/team-alpha-handoff-bundle",
      root,
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/team-alpha-handoff-bundle",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/team-alpha-handoff-bundle/verify",
      root,
    });

    assert.equal(cliBundle.status, "ready");
    assert.equal(cliBundle.hostIntegration.checkedStatus, "ready");
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayBundle.status, 200);
    assert.equal(gatewayBundle.body.status, "ready");
    assert.equal(gatewayBundle.body.hostIntegration.hosts.length, 3);
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.status, "written_local_only");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("builds a first-owner beta handoff bundle after team alpha readiness", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsTeamAlphaHandoffBundle({ root });

    const bundle = buildOwnerOpsFirstOwnerBetaHandoffBundle({ root });
    const write = writeOwnerOpsFirstOwnerBetaHandoffBundle({ root });
    const check = verifyOwnerOpsFirstOwnerBetaHandoffBundle({ root });

    assert.equal(bundle.schema, "gpao_t.owner_ops_owner_acceptance_handoff_bundle.v0_1");
    assert.equal(bundle.status, "ready");
    assert.equal(bundle.internalAcceptancePrerequisite.status, "ready");
    assert.equal(bundle.hostPrerequisite.status, "ready");
    assert.deepEqual(bundle.hostPrerequisite.hosts.map((host) => host.id), ["codex", "openclaw", "claude_code"]);
    assert.equal(bundle.hostPrerequisite.hosts.every((host) => host.externalNetwork === false), true);
    assert.equal(bundle.hostPrerequisite.hosts.every((host) => host.credentialRequired === false), true);
    assert.equal(bundle.hostPrerequisite.hosts.every((host) => host.customerSendAllowed === false), true);
    assert.equal(bundle.acceptanceFlow.some((step) => step.id === "choose_test_host"), true);
    assert.equal(bundle.authorityBoundary.sampleOrDeidentifiedDataOnly, true);
    assert.equal(bundle.authorityBoundary.liveHostRegistrationExecuted, false);
    assert.equal(bundle.authorityBoundary.customerSendExecuted, false);
    assert.equal(bundle.stopConditions.some((condition) => condition.includes("개인정보")), true);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-OWNER-ACCEPTANCE-HANDOFF-BUNDLE.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("host setup prerequisite"), true);
    assert.equal(check.hostCount, 3);
  });

  it("exposes first-owner beta handoff bundle through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "team-alpha-handoff-write"], {
      cwd: root,
      encoding: "utf8",
    });
    const cliBundle = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "first-owner-beta-handoff-bundle",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "first-owner-beta-handoff-write",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "first-owner-beta-handoff-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayBundle = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/first-owner-beta-handoff-bundle",
      root,
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/first-owner-beta-handoff-bundle",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/first-owner-beta-handoff-bundle/verify",
      root,
    });

    assert.equal(cliBundle.status, "ready");
    assert.equal(cliBundle.hostPrerequisite.status, "ready");
    assert.equal(cliBundle.hostPrerequisite.hosts.length, 3);
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(cliCheck.hostPrerequisiteStatus, "ready");
    assert.equal(gatewayBundle.status, 200);
    assert.equal(gatewayBundle.body.status, "ready");
    assert.equal(gatewayBundle.body.hostPrerequisite.hosts.length, 3);
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.status, "written_local_only");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
    assert.equal(gatewayCheck.body.checkedSurfaces.includes("host setup prerequisite"), true);
  });

  it("builds a first-owner beta operational test package before result review", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsTeamAlphaHandoffBundle({ root });
    writeOwnerOpsFirstOwnerBetaHandoffBundle({ root });

    const bundle = buildOwnerOpsFirstOwnerBetaOperationalTestPackage({ root });
    const write = writeOwnerOpsFirstOwnerBetaOperationalTestPackage({ root });
    const check = verifyOwnerOpsFirstOwnerBetaOperationalTestPackage({ root });

    assert.equal(bundle.schema, "gpao_t.owner_ops_owner_acceptance_operational_package.v0_1");
    assert.equal(bundle.status, "ready");
    assert.equal(bundle.hostSetup.status, "ready");
    assert.equal(bundle.hostSetup.allowedHosts.length, 3);
    assert.equal(bundle.operatorRunbook.some((step) => step.id === "result_review"), true);
    assert.equal(bundle.acceptanceChecklist.includes("critical blocker count is 0"), true);
    assert.equal(bundle.resultCaptureFields.includes("ratings.trust"), true);
    assert.equal(bundle.authorityBoundary.operationalPacketOnly, true);
    assert.equal(bundle.authorityBoundary.customerSendExecuted, false);
    assert.equal(bundle.authorityBoundary.externalNetworkExecuted, false);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-OWNER-ACCEPTANCE-OPERATIONAL-PACKAGE.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("acceptance session packet"), true);
  });

  it("exposes first-owner beta operational test package through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "team-alpha-handoff-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-handoff-write"], {
      cwd: root,
      encoding: "utf8",
    });

    const cliBundle = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "first-owner-beta-operational-package",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "first-owner-beta-operational-write",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "first-owner-beta-operational-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayBundle = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/first-owner-beta-operational-package",
      root,
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/first-owner-beta-operational-package",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/first-owner-beta-operational-package/verify",
      root,
    });

    assert.equal(cliBundle.status, "ready");
    assert.equal(cliBundle.hostSetup.allowedHosts.length, 3);
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayBundle.status, 200);
    assert.equal(gatewayBundle.body.status, "ready");
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.status, "written_local_only");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("reviews first-owner beta result before market readiness contribution", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsTeamAlphaHandoffBundle({ root });
    writeOwnerOpsFirstOwnerBetaHandoffBundle({ root });
    writeOwnerOpsFirstOwnerBetaOperationalTestPackage({ root });

    const review = buildOwnerOpsFirstOwnerBetaResultReview({ root });
    const write = writeOwnerOpsFirstOwnerBetaResultReview({ root });
    const check = verifyOwnerOpsFirstOwnerBetaResultReview({ root });

    assert.equal(review.schema, "gpao_t.owner_ops_first_owner_beta_result_review.v0_1");
    assert.equal(review.status, "ready");
    assert.equal(review.marketReadinessContributionAllowed, true);
    assert.equal(review.authorityBoundary.publicSubmissionAllowed, false);
    assert.equal(review.safetyResult.actualCustomerSendExecuted, false);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-FIRST-OWNER-BETA-RESULT-REVIEW.md")), true);
    assert.equal(check.status, "ready");
  });

  it("exposes first-owner beta result review through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "team-alpha-handoff-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-handoff-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-operational-write"], {
      cwd: root,
      encoding: "utf8",
    });
    const cliReview = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "first-owner-beta-result-review",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "first-owner-beta-result-write",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "first-owner-beta-result-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayReview = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/first-owner-beta-result-review",
      root,
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/first-owner-beta-result-review",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/first-owner-beta-result-review/verify",
      root,
    });

    assert.equal(cliReview.status, "ready");
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayReview.status, 200);
    assert.equal(gatewayReview.body.status, "ready");
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.status, "written_local_only");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("records supervised field-test feedback locally without opening external authority", () => {
    const root = tempRoot();
    populateDistributionRoot(root);

    const blocked = appendOwnerOpsFieldTestRecord({ root });
    const write = appendOwnerOpsFieldTestRecord({
      root,
      approvalToken: "record-owner-ops-field-test-local-only",
      record: {
        stage: "first_owner_beta",
        host: "openclaw",
        testerRole: "first_owner_tester",
        industry: "restaurant_cafe",
        dataMode: "sample_or_deidentified",
        understoodNoAutoSend: true,
        actualCustomerSendExecuted: false,
        liveAccountConnected: false,
        paymentRefundDeleteExecuted: false,
        ratings: {
          understandability: 4,
          usefulness: 4,
          trust: 5,
          setupFriction: 2,
        },
        requestedTemplates: ["부정 리뷰 답변", "예약 문의"],
        notes: ["샘플 리뷰 기준으로 초안 흐름을 이해했다."],
      },
    });
    const records = readOwnerOpsFieldTestRecords({ root });
    const ledger = buildOwnerOpsFieldTestLedger({ root });
    const check = verifyOwnerOpsFieldTestLedger({ root });
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "field-test-ledger-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/field-test-ledger/verify",
      root,
    });

    assert.equal(blocked.status, "blocked");
    assert.equal(blocked.recordWritten, false);
    assert.equal(write.status, "written_local_only");
    assert.equal(write.authorityBoundary.customerSendAllowed, false);
    assert.equal(records.recordCount, 1);
    assert.equal(ledger.status, "ready");
    assert.equal(ledger.recordCount, 1);
    assert.equal(ledger.stageCoverage.includes("first_owner_beta"), true);
    assert.equal(ledger.authorityBoundary.publicSubmissionAllowed, false);
    assert.equal(check.status, "ready");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("turns field-test records into local product repair actions", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    appendOwnerOpsFieldTestRecord({
      root,
      approvalToken: "record-owner-ops-field-test-local-only",
      record: {
        stage: "first_owner_beta",
        host: "openclaw",
        testerRole: "first_owner_tester",
        industry: "restaurant_cafe",
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
        requestedTemplates: ["부정 리뷰 답변", "예약 문의"],
      },
    });

    const queue = buildOwnerOpsFieldTestActionQueue({ root });
    const write = writeOwnerOpsFieldTestActionQueue({ root });
    const check = verifyOwnerOpsFieldTestActionQueue({ root });
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "field-test-action-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/field-test-action-queue/verify",
      root,
    });

    assert.equal(queue.schema, "gpao_t.owner_ops_field_test_action_queue.v0_1");
    assert.equal(queue.status, "ready");
    assert.equal(queue.sourceEvidence.recordCount, 1);
    assert.equal(queue.queueSummary.lanes.includes("template_replay_fixture"), true);
    assert.equal(queue.queueSummary.lanes.includes("owner_ux_copy"), true);
    assert.equal(queue.queueSummary.lanes.includes("trust_safety_copy"), true);
    assert.equal(queue.authorityBoundary.publicSubmissionAllowed, false);
    assert.equal(queue.authorityBoundary.customerSendAllowed, false);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-FIELD-TEST-ACTION-QUEUE.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("closes field-test repair actions as local completion evidence", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    appendOwnerOpsFieldTestRecord({
      root,
      approvalToken: "record-owner-ops-field-test-local-only",
      record: {
        stage: "first_owner_beta",
        host: "codex",
        testerRole: "first_owner_tester",
        industry: "smartstore_shop",
        dataMode: "sample_or_deidentified",
        understoodNoAutoSend: true,
        actualCustomerSendExecuted: false,
        liveAccountConnected: false,
        paymentRefundDeleteExecuted: false,
        requestedTemplates: ["배송 문의", "교환/환불 문의"],
      },
    });
    writeOwnerOpsFieldTestActionQueue({ root });

    const evidence = buildOwnerOpsFieldTestRepairCompletionEvidence({ root });
    const write = writeOwnerOpsFieldTestRepairCompletionEvidence({ root });
    const check = verifyOwnerOpsFieldTestRepairCompletionEvidence({ root });
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "field-test-repair-completion-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/field-test-repair-completion/verify",
      root,
    });

    assert.equal(evidence.schema, "gpao_t.owner_ops_field_test_repair_completion_evidence.v0_1");
    assert.equal(evidence.status, "ready");
    assert.equal(evidence.completionSummary.allItemsLocallyVerified, true);
    assert.equal(evidence.completionSummary.completedCount, evidence.sourceQueue.itemCount);
    assert.equal(evidence.completionSummary.lanes.includes("template_replay_fixture"), true);
    assert.equal(evidence.completionSummary.lanes.includes("owner_ux_copy"), true);
    assert.equal(evidence.completionSummary.lanes.includes("trust_safety_copy"), true);
    assert.equal(evidence.authorityBoundary.publicSubmissionAllowed, false);
    assert.equal(evidence.authorityBoundary.customerSendAllowed, false);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-FIELD-TEST-REPAIR-COMPLETION-EVIDENCE.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("prepares broader owner testing handoff without opening public release", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });
    writeOwnerOpsInstallUpdateRollbackProof({ root });
    writeOwnerOpsDeploymentDryRunPlan({ root });
    appendOwnerOpsFieldTestRecord({
      root,
      approvalToken: "record-owner-ops-field-test-local-only",
      record: {
        stage: "first_owner_beta",
        host: "codex",
        testerRole: "first_owner_tester",
        industry: "smartstore_shop",
        dataMode: "sample_or_deidentified",
        understoodNoAutoSend: true,
        actualCustomerSendExecuted: false,
        liveAccountConnected: false,
        paymentRefundDeleteExecuted: false,
        requestedTemplates: ["배송 문의", "교환/환불 문의"],
      },
    });
    writeOwnerOpsFieldTestActionQueue({ root });
    writeOwnerOpsFieldTestRepairCompletionEvidence({ root });

    const handoff = buildOwnerOpsBroaderOwnerTestingHandoff({ root });
    const write = writeOwnerOpsBroaderOwnerTestingHandoff({ root });
    const check = verifyOwnerOpsBroaderOwnerTestingHandoff({ root });
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "broader-owner-testing-handoff-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/broader-owner-testing-handoff/verify",
      root,
    });

    assert.equal(handoff.schema, "gpao_t.owner_ops_broader_owner_testing_handoff.v0_1");
    assert.equal(handoff.status, "ready");
    assert.equal(handoff.authorityBoundary.broaderOwnerTestingAllowed, true);
    assert.equal(handoff.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(handoff.authorityBoundary.marketplaceUploadAllowed, false);
    assert.equal(handoff.authorityBoundary.customerSendAllowed, false);
    assert.equal(handoff.authorityBoundary.liveAccountConnectionAllowed, false);
    assert.equal(handoff.packageEvidence.fileCount > 0, true);
    assert.equal(handoff.fieldRepairCompletion.status, "ready");
    assert.equal(handoff.testerInstructions.some((item) => item.includes("sample or de-identified")), true);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-BROADER-OWNER-TESTING-HANDOFF.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("records broader owner testing results as local-only repair signals", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });
    writeOwnerOpsInstallUpdateRollbackProof({ root });
    writeOwnerOpsDeploymentDryRunPlan({ root });
    appendOwnerOpsFieldTestRecord({
      root,
      approvalToken: "record-owner-ops-field-test-local-only",
      record: {
        stage: "first_owner_beta",
        host: "codex",
        testerRole: "first_owner_tester",
        industry: "smartstore_shop",
        dataMode: "sample_or_deidentified",
        understoodNoAutoSend: true,
        actualCustomerSendExecuted: false,
        liveAccountConnected: false,
        paymentRefundDeleteExecuted: false,
        requestedTemplates: ["배송 문의", "교환/환불 문의"],
      },
    });
    writeOwnerOpsFieldTestActionQueue({ root });
    writeOwnerOpsFieldTestRepairCompletionEvidence({ root });
    writeOwnerOpsBroaderOwnerTestingHandoff({ root });

    const blocked = appendOwnerOpsBroaderOwnerTestingResult({ root });
    const append = appendOwnerOpsBroaderOwnerTestingResult({
      root,
      approvalToken: "record-owner-ops-broader-testing-local-only",
      result: {
        stage: "broader_owner_testing",
        host: "codex",
        testerRole: "supervised_owner_tester",
        industry: "restaurant_cafe",
        dataMode: "sample_or_deidentified",
        understoodNoAutoSend: true,
        actualCustomerSendExecuted: false,
        liveAccountConnected: false,
        paymentRefundDeleteExecuted: false,
        credentialAccessUsed: false,
        ratings: {
          understandability: 4,
          usefulness: 4,
          trust: 4,
          setupFriction: 2,
        },
        blockerTags: [],
        requestedTemplates: ["예약 문의", "부정 리뷰 답변"],
      },
    });
    const records = readOwnerOpsBroaderOwnerTestingResults({ root });
    const ledger = buildOwnerOpsBroaderOwnerTestingResultLedger({ root });
    const check = verifyOwnerOpsBroaderOwnerTestingResultLedger({ root });
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "broader-owner-testing-result-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/broader-owner-testing-result-ledger/verify",
      root,
    });

    assert.equal(blocked.status, "blocked");
    assert.equal(append.status, "written_local_only");
    assert.equal(records.recordCount, 1);
    assert.equal(ledger.schema, "gpao_t.owner_ops_broader_owner_testing_result_ledger.v0_1");
    assert.equal(ledger.status, "ready");
    assert.equal(ledger.recordCount, 1);
    assert.equal(ledger.repairSignals.some((signal) => signal.lane === "template_replay_fixture"), true);
    assert.equal(ledger.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(ledger.authorityBoundary.customerSendAllowed, false);
    assert.equal(ledger.authorityBoundary.liveAccountConnectionAllowed, false);
    assert.equal(check.status, "ready");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("turns broader owner testing repair signals into a local repair queue", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });
    writeOwnerOpsInstallUpdateRollbackProof({ root });
    writeOwnerOpsDeploymentDryRunPlan({ root });
    appendOwnerOpsFieldTestRecord({
      root,
      approvalToken: "record-owner-ops-field-test-local-only",
      record: {
        stage: "first_owner_beta",
        host: "codex",
        testerRole: "first_owner_tester",
        industry: "smartstore_shop",
        dataMode: "sample_or_deidentified",
        understoodNoAutoSend: true,
        actualCustomerSendExecuted: false,
        liveAccountConnected: false,
        paymentRefundDeleteExecuted: false,
        requestedTemplates: ["배송 문의", "교환/환불 문의"],
      },
    });
    writeOwnerOpsFieldTestActionQueue({ root });
    writeOwnerOpsFieldTestRepairCompletionEvidence({ root });
    writeOwnerOpsBroaderOwnerTestingHandoff({ root });
    appendOwnerOpsBroaderOwnerTestingResult({
      root,
      approvalToken: "record-owner-ops-broader-testing-local-only",
      result: {
        stage: "broader_owner_testing",
        host: "codex",
        testerRole: "supervised_owner_tester",
        industry: "restaurant_cafe",
        dataMode: "sample_or_deidentified",
        understoodNoAutoSend: true,
        actualCustomerSendExecuted: false,
        liveAccountConnected: false,
        paymentRefundDeleteExecuted: false,
        credentialAccessUsed: false,
        ratings: {
          understandability: 4,
          usefulness: 4,
          trust: 4,
          setupFriction: 2,
        },
        requestedTemplates: ["예약 문의", "부정 리뷰 답변"],
      },
    });

    const queue = buildOwnerOpsBroaderOwnerTestingRepairQueue({ root });
    const write = writeOwnerOpsBroaderOwnerTestingRepairQueue({ root });
    const check = verifyOwnerOpsBroaderOwnerTestingRepairQueue({ root });
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "broader-owner-testing-repair-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/broader-owner-testing-repair-queue/verify",
      root,
    });

    assert.equal(queue.schema, "gpao_t.owner_ops_broader_owner_testing_repair_queue.v0_1");
    assert.equal(queue.status, "ready");
    assert.equal(queue.queueSummary.itemCount >= 1, true);
    assert.equal(queue.queueSummary.lanes.includes("template_replay_fixture"), true);
    assert.equal(queue.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(queue.authorityBoundary.customerSendAllowed, false);
    assert.equal(queue.authorityBoundary.liveAccountConnectionAllowed, false);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-QUEUE.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("turns broader owner testing repair queue into local completion evidence", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });
    writeOwnerOpsInstallUpdateRollbackProof({ root });
    writeOwnerOpsDeploymentDryRunPlan({ root });
    appendOwnerOpsFieldTestRecord({
      root,
      approvalToken: "record-owner-ops-field-test-local-only",
      record: {
        stage: "first_owner_beta",
        host: "codex",
        testerRole: "first_owner_tester",
        industry: "smartstore_shop",
        dataMode: "sample_or_deidentified",
        understoodNoAutoSend: true,
        actualCustomerSendExecuted: false,
        liveAccountConnected: false,
        paymentRefundDeleteExecuted: false,
        requestedTemplates: ["배송 문의", "교환/환불 문의"],
      },
    });
    writeOwnerOpsFieldTestActionQueue({ root });
    writeOwnerOpsFieldTestRepairCompletionEvidence({ root });
    writeOwnerOpsBroaderOwnerTestingHandoff({ root });
    appendOwnerOpsBroaderOwnerTestingResult({
      root,
      approvalToken: "record-owner-ops-broader-testing-local-only",
      result: {
        stage: "broader_owner_testing",
        host: "codex",
        testerRole: "supervised_owner_tester",
        industry: "restaurant_cafe",
        dataMode: "sample_or_deidentified",
        understoodNoAutoSend: true,
        actualCustomerSendExecuted: false,
        liveAccountConnected: false,
        paymentRefundDeleteExecuted: false,
        credentialAccessUsed: false,
        ratings: {
          understandability: 4,
          usefulness: 4,
          trust: 4,
          setupFriction: 2,
        },
        requestedTemplates: ["예약 문의", "부정 리뷰 답변"],
      },
    });
    writeOwnerOpsBroaderOwnerTestingRepairQueue({ root });

    const evidence = buildOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root });
    const write = writeOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root });
    const check = verifyOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root });
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "broader-owner-testing-repair-completion-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/broader-owner-testing-repair-completion/verify",
      root,
    });

    assert.equal(evidence.schema, "gpao_t.owner_ops_broader_owner_testing_repair_completion_evidence.v0_1");
    assert.equal(evidence.status, "ready");
    assert.equal(evidence.completionSummary.allItemsLocallyVerified, true);
    assert.equal(evidence.completionSummary.completedCount, evidence.sourceQueue.itemCount);
    assert.equal(evidence.completionSummary.lanes.includes("template_replay_fixture"), true);
    assert.equal(evidence.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(evidence.authorityBoundary.customerSendAllowed, false);
    assert.equal(evidence.authorityBoundary.liveAccountConnectionAllowed, false);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-BROADER-OWNER-TESTING-REPAIR-COMPLETION-EVIDENCE.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("prepares the next owner testing loop after broader repair completion", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsReleaseReadinessEvidence({ root });
    writeOwnerOpsHumanReviewApprovalPacket({ root });
    writeOwnerOpsSignedPackageEvidence({ root });
    writeOwnerOpsInstallUpdateRollbackProof({ root });
    writeOwnerOpsDeploymentDryRunPlan({ root });
    appendOwnerOpsFieldTestRecord({
      root,
      approvalToken: "record-owner-ops-field-test-local-only",
      record: {
        stage: "first_owner_beta",
        host: "codex",
        testerRole: "first_owner_tester",
        industry: "smartstore_shop",
        dataMode: "sample_or_deidentified",
        understoodNoAutoSend: true,
        actualCustomerSendExecuted: false,
        liveAccountConnected: false,
        paymentRefundDeleteExecuted: false,
        requestedTemplates: ["배송 문의", "교환/환불 문의"],
      },
    });
    writeOwnerOpsFieldTestActionQueue({ root });
    writeOwnerOpsFieldTestRepairCompletionEvidence({ root });
    writeOwnerOpsBroaderOwnerTestingHandoff({ root });
    appendOwnerOpsBroaderOwnerTestingResult({
      root,
      approvalToken: "record-owner-ops-broader-testing-local-only",
      result: {
        stage: "broader_owner_testing",
        host: "codex",
        testerRole: "supervised_owner_tester",
        industry: "restaurant_cafe",
        dataMode: "sample_or_deidentified",
        understoodNoAutoSend: true,
        actualCustomerSendExecuted: false,
        liveAccountConnected: false,
        paymentRefundDeleteExecuted: false,
        credentialAccessUsed: false,
        ratings: {
          understandability: 4,
          usefulness: 4,
          trust: 4,
          setupFriction: 2,
        },
        requestedTemplates: ["예약 문의", "부정 리뷰 답변"],
      },
    });
    writeOwnerOpsBroaderOwnerTestingRepairQueue({ root });
    writeOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root });

    const loop = buildOwnerOpsNextOwnerTestingLoop({ root });
    const write = writeOwnerOpsNextOwnerTestingLoop({ root });
    const check = verifyOwnerOpsNextOwnerTestingLoop({ root });
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "next-owner-testing-loop-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/next-owner-testing-loop/verify",
      root,
    });

    assert.equal(loop.schema, "gpao_t.owner_ops_next_owner_testing_loop.v0_1");
    assert.equal(loop.status, "ready");
    assert.equal(loop.authorityBoundary.nextOwnerTestingAllowed, true);
    assert.equal(loop.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(loop.authorityBoundary.customerSendAllowed, false);
    assert.equal(loop.authorityBoundary.liveAccountConnectionAllowed, false);
    assert.equal(loop.loopPlan.some((item) => item.id === "repair-replay-check"), true);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-NEXT-OWNER-TESTING-LOOP.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("turns first-owner beta feedback into a product improvement action queue", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsTeamAlphaHandoffBundle({ root });
    writeOwnerOpsFirstOwnerBetaHandoffBundle({ root });
    writeOwnerOpsFirstOwnerBetaOperationalTestPackage({ root });
    writeOwnerOpsFirstOwnerBetaResultReview({ root });
    writeOwnerOpsMarketEvidenceBundle({ root });

    const queue = buildOwnerOpsBetaFeedbackActionQueue({ root });
    const write = writeOwnerOpsBetaFeedbackActionQueue({ root });
    const check = verifyOwnerOpsBetaFeedbackActionQueue({ root });

    assert.equal(queue.schema, "gpao_t.owner_ops_beta_feedback_action_queue.v0_1");
    assert.equal(queue.status, "ready");
    assert.equal(queue.queueSummary.itemCount >= 4, true);
    assert.equal(queue.queueSummary.lanes.includes("template_replay_fixture"), true);
    assert.equal(queue.queueSummary.lanes.includes("privacy_copy"), true);
    assert.equal(queue.queueSummary.lanes.includes("owner_ux_copy"), true);
    assert.equal(queue.authorityBoundary.publicSubmissionAllowed, false);
    assert.equal(queue.authorityBoundary.customerSendExecuted, false);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-BETA-FEEDBACK-ACTION-QUEUE.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(check.checkedSurfaces.includes("package review lane"), true);
  });

  it("exposes beta feedback action queue through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "team-alpha-handoff-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-handoff-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-operational-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-result-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "market-evidence-write"], {
      cwd: root,
      encoding: "utf8",
    });

    const cliQueue = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "beta-feedback-action-queue",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "beta-feedback-action-write",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "beta-feedback-action-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayQueue = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/beta-feedback-action-queue",
      root,
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/beta-feedback-action-queue",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/beta-feedback-action-queue/verify",
      root,
    });

    assert.equal(cliQueue.status, "ready");
    assert.equal(cliQueue.queueSummary.itemCount >= 4, true);
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayQueue.status, 200);
    assert.equal(gatewayQueue.body.status, "ready");
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.status, "written_local_only");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("bundles first-owner beta result into market evidence without opening public submission", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    writeOwnerOpsLocalPackageCandidate({
      root,
      confirmationToken: "confirm-local-owner-ops-package",
    });
    writeOwnerOpsTeamAlphaHandoffBundle({ root });
    writeOwnerOpsFirstOwnerBetaHandoffBundle({ root });
    writeOwnerOpsFirstOwnerBetaOperationalTestPackage({ root });
    writeOwnerOpsFirstOwnerBetaResultReview({ root });

    const bundle = buildOwnerOpsMarketEvidenceBundle({ root });
    const write = writeOwnerOpsMarketEvidenceBundle({ root });
    const check = verifyOwnerOpsMarketEvidenceBundle({ root });

    assert.equal(bundle.schema, "gpao_t.owner_ops_market_evidence_bundle.v0_1");
    assert.equal(bundle.status, "ready");
    assert.equal(bundle.betaResultReview.marketReadinessContributionAllowed, true);
    assert.equal(bundle.industryTemplateCatalog.industryGroupCount >= 3, true);
    assert.equal(bundle.authorityBoundary.publicSubmissionAllowed, false);
    assert.equal(bundle.blockedActions.includes("public_market_publish"), true);
    assert.equal(write.status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-MARKET-EVIDENCE-BUNDLE.md")), true);
    assert.equal(check.status, "ready");
  });

  it("exposes market evidence bundle through CLI and Gateway", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "local-package-candidate",
      "confirm-local-owner-ops-package",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "team-alpha-handoff-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-handoff-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-operational-write"], {
      cwd: root,
      encoding: "utf8",
    });
    execFileSync(process.execPath, [CLI, "owner-ops", "first-owner-beta-result-write"], {
      cwd: root,
      encoding: "utf8",
    });

    const cliBundle = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "market-evidence-bundle",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliWrite = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "market-evidence-write",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "market-evidence-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const gatewayBundle = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/market-evidence-bundle",
      root,
    });
    const gatewayWrite = handleGatewayRequest({
      method: "POST",
      path: "/owner-ops/market-evidence-bundle",
      root,
    });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/market-evidence-bundle/verify",
      root,
    });

    assert.equal(cliBundle.status, "ready");
    assert.equal(cliWrite.status, "written_local_only");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayBundle.status, 200);
    assert.equal(gatewayBundle.body.status, "ready");
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.status, "written_local_only");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });
});
