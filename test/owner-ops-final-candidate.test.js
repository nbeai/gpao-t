import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
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
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

describe("Owner Ops final local release candidate", () => {
  it("exposes a ready local candidate packet while keeping external release authority closed", () => {
    const root = ROOT;

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
