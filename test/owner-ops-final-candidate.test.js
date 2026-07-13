import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  appendOwnerOpsBroaderOwnerTestingResult,
  appendOwnerOpsFieldTestRecord,
  buildOwnerOpsFinalLocalReleaseCandidateDecisionPacket,
  buildOwnerOpsFinalCandidateOwnerDecisionLane,
  buildOwnerOpsFinalCandidateNextActionPacket,
  buildOwnerOpsProductionCompletionAudit,
  buildOwnerOpsSupervisedTestingReadinessPacket,
  handleGatewayRequest,
  verifyOwnerOpsFinalCandidateNextActionPacket,
  verifyOwnerOpsFinalCandidateOwnerDecisionLane,
  verifyOwnerOpsFinalLocalReleaseCandidateDecisionPacket,
  verifyOwnerOpsProductionCompletionAudit,
  verifyOwnerOpsSupervisedTestingReadinessPacket,
  writeOwnerOpsBetaFeedbackActionQueue,
  writeOwnerOpsBroaderOwnerTestingHandoff,
  writeOwnerOpsBroaderOwnerTestingRepairCompletionEvidence,
  writeOwnerOpsBroaderOwnerTestingRepairQueue,
  writeOwnerOpsDeploymentDryRunPlan,
  writeOwnerOpsFieldTestActionQueue,
  writeOwnerOpsFieldTestRepairCompletionEvidence,
  writeOwnerOpsFirstOwnerBetaHandoffBundle,
  writeOwnerOpsFirstOwnerBetaOperationalTestPackage,
  writeOwnerOpsFirstOwnerBetaResultReview,
  writeOwnerOpsHumanReviewApprovalPacket,
  writeOwnerOpsInstallUpdateRollbackProof,
  writeOwnerOpsLocalPackageCandidate,
  writeOwnerOpsMarketEvidenceBundle,
  writeOwnerOpsNextOwnerTestingLoop,
  writeOwnerOpsPrePublicRepairBacklog,
  writeOwnerOpsPrePublicRepairCompletionEvidence,
  writeOwnerOpsReleaseReadinessEvidence,
  writeOwnerOpsSignedPackageEvidence,
  writeOwnerOpsTeamAlphaHandoffBundle,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-owner-ops-final-"));
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
    bin: { "gpao-t": "./bin/gpao-t.js" },
    scripts: {
      check: "node --check src/index.js",
      test: "node --test",
      verify: "npm run check && npm test",
    },
  }, null, 2));
  for (const file of files) {
    const target = join(root, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `fixture for ${file}\n`);
  }
}

function prepareFinalCandidateRoot() {
  const root = tempRoot();
  populateDistributionRoot(root);
  writeOwnerOpsLocalPackageCandidate({ root, confirmationToken: "confirm-local-owner-ops-package" });
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
  writeOwnerOpsNextOwnerTestingLoop({ root });
  return root;
}

describe("Owner Ops final local release candidate", () => {
  it("exposes a ready local candidate packet while keeping external release authority closed", () => {
    const root = prepareFinalCandidateRoot();

    const packet = buildOwnerOpsFinalLocalReleaseCandidateDecisionPacket({ root });
    const lane = buildOwnerOpsFinalCandidateOwnerDecisionLane({ root });
    const laneCheck = verifyOwnerOpsFinalCandidateOwnerDecisionLane({ root });
    const nextAction = buildOwnerOpsFinalCandidateNextActionPacket({
      root,
      decision: "continue_supervised_testing",
    });
    const nextActionCheck = verifyOwnerOpsFinalCandidateNextActionPacket({ root });
    const completionAudit = buildOwnerOpsProductionCompletionAudit({ root });
    const completionAuditCheck = verifyOwnerOpsProductionCompletionAudit({ root });
    const supervisedTesting = buildOwnerOpsSupervisedTestingReadinessPacket({ root });
    const supervisedTestingCheck = verifyOwnerOpsSupervisedTestingReadinessPacket({ root });
    const write = execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "final-local-release-candidate-write",
    ], {
      cwd: root,
      encoding: "utf8",
    });
    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "final-local-release-candidate-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliLaneCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "final-candidate-owner-decision-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliNextActionCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "final-candidate-next-action-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCompletionAuditCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "production-completion-audit-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliSupervisedTestingCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "supervised-testing-readiness-check",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliBlockedAppend = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "owner-ops",
      "final-candidate-owner-decision-append",
      "continue_supervised_testing",
    ], {
      cwd: root,
      encoding: "utf8",
    }));
    const check = verifyOwnerOpsFinalLocalReleaseCandidateDecisionPacket({ root });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/final-local-release-candidate/verify",
      root,
    });
    const gatewayLaneCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/final-candidate-owner-decision-lane/verify",
      root,
    });
    const gatewayNextActionCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/final-candidate-next-action/verify",
      root,
    });
    const gatewayCompletionAuditCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/production-completion-audit/verify",
      root,
    });
    const gatewaySupervisedTestingCheck = handleGatewayRequest({
      method: "GET",
      path: "/owner-ops/supervised-testing-readiness/verify",
      root,
    });

    assert.equal(packet.schema, "gpao_t.owner_ops_final_local_release_candidate_decision_packet.v0_1");
    assert.equal(packet.status, "ready", JSON.stringify(packet.findings));
    assert.equal(packet.candidateState, "local_release_candidate_ready_public_execution_blocked");
    assert.equal(packet.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(packet.authorityBoundary.marketplaceUploadAllowed, false);
    assert.equal(packet.authorityBoundary.packageUploadAllowed, false);
    assert.equal(packet.authorityBoundary.signingAllowed, false);
    assert.equal(packet.ownerDecisionOptions.some((item) => item.id === "continue_supervised_testing"), true);
    assert.equal(lane.status, "ready", JSON.stringify(lane.findings));
    assert.equal(lane.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(lane.authorityBoundary.packageUploadAllowed, false);
    assert.equal(laneCheck.status, "ready");
    assert.equal(nextAction.status, "ready", JSON.stringify(nextAction.findings));
    assert.equal(nextAction.selectedAction.primarySurface, "owner-ops next-owner-testing-loop");
    assert.equal(nextAction.authorityBoundary.ownerDecisionRecordedNow, false);
    assert.equal(nextAction.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(nextActionCheck.status, "ready", JSON.stringify(nextActionCheck.findings));
    assert.equal(completionAudit.status, "ready", JSON.stringify(completionAudit.findings));
    assert.equal(completionAudit.localProductAxisReady, true);
    assert.equal(completionAudit.finalObjectiveComplete, false);
    assert.equal(completionAudit.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(completionAuditCheck.status, "ready", JSON.stringify(completionAuditCheck.findings));
    assert.equal(supervisedTesting.status, "ready", JSON.stringify(supervisedTesting.findings));
    assert.equal(supervisedTesting.testingState, "supervised_testing_ready_public_release_closed");
    assert.equal(supervisedTesting.ownerDecisionRecordedNow, false);
    assert.equal(supervisedTesting.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(supervisedTesting.authorityBoundary.customerSendAllowed, false);
    assert.equal(supervisedTesting.authorityBoundary.credentialAccessAllowed, false);
    assert.equal(supervisedTestingCheck.status, "ready", JSON.stringify(supervisedTestingCheck.findings));
    assert.equal(cliLaneCheck.status, "ready");
    assert.equal(cliNextActionCheck.status, "ready");
    assert.equal(cliCompletionAuditCheck.status, "ready");
    assert.equal(cliCompletionAuditCheck.finalObjectiveComplete, false);
    assert.equal(cliSupervisedTestingCheck.status, "ready");
    assert.equal(cliSupervisedTestingCheck.ownerDecisionRecordedNow, false);
    assert.equal(cliSupervisedTestingCheck.customerSendAllowed, false);
    assert.equal(cliBlockedAppend.status, "blocked");
    assert.equal(cliBlockedAppend.recordWritten, false);
    assert.equal(JSON.parse(write).status, "written_local_only");
    assert.equal(existsSync(join(root, ".gpao-t/packages/OWNER-OPS-FINAL-LOCAL-RELEASE-CANDIDATE-DECISION-PACKET.md")), true);
    assert.equal(check.status, "ready");
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
    assert.equal(gatewayCheck.body.publicReleaseAllowed, false);
    assert.equal(gatewayCheck.body.packageUploadAllowed, false);
    assert.equal(gatewayLaneCheck.status, 200);
    assert.equal(gatewayLaneCheck.body.status, "ready");
    assert.equal(gatewayLaneCheck.body.publicReleaseAllowed, false);
    assert.equal(gatewayNextActionCheck.status, 200);
    assert.equal(gatewayNextActionCheck.body.status, "ready");
    assert.equal(gatewayNextActionCheck.body.ownerDecisionRecordedNow, false);
    assert.equal(gatewayCompletionAuditCheck.status, 200);
    assert.equal(gatewayCompletionAuditCheck.body.status, "ready");
    assert.equal(gatewayCompletionAuditCheck.body.finalObjectiveComplete, false);
    assert.equal(gatewaySupervisedTestingCheck.status, 200);
    assert.equal(gatewaySupervisedTestingCheck.body.status, "ready");
    assert.equal(gatewaySupervisedTestingCheck.body.publicReleaseAllowed, false);
    assert.equal(gatewaySupervisedTestingCheck.body.credentialAccessAllowed, false);
  });
});
