import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import {
  buildOwnerOpsApprovedSigningLane,
  buildOwnerOpsMarketplaceUploadApprovalGate,
  buildOwnerOpsMarketplaceUploadDecisionLane,
  buildOwnerOpsPublicReleaseAuthorityGate,
  buildOwnerOpsPublicReleaseReadbackSnapshot,
  appendOwnerOpsMarketplaceUploadDecisionRecord,
  verifyOwnerOpsPublicReleaseReadbackSnapshot,
} from "../src/core/owner-ops-distribution.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-owner-ops-public-release-"));
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
  }, null, 2));
  for (const file of files) {
    const target = join(root, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `fixture for ${file}\n`);
  }
}

function populateReadbackEvidence(root) {
  const packageDir = join(root, ".gpao-t", "packages");
  mkdirSync(packageDir, { recursive: true });
  const baseName = "gpao-t-owner-ops-9.9.9-local-candidate";
  const archiveName = `${baseName}.zip`;
  const packageJson = readFileSync(join(root, "package.json"));
  const packageJsonSha256 = createHash("sha256").update(packageJson).digest("hex");
  const manifest = {
    schema: "gpao_t.owner_ops_local_package_manifest.v0_1",
    packageId: "gpao-t-owner-ops",
    packageVersion: "9.9.9",
    archiveName,
    bundleFile: `${baseName}.bundle.json`,
    fileCount: 1,
    files: [{
      path: "package.json",
      sha256: packageJsonSha256,
      bytes: packageJson.length,
    }],
    authorityBoundary: {
      localBundleOnly: true,
      publicUploadExecuted: false,
      signingExecuted: false,
      installExecuted: false,
      updateExecuted: false,
      rollbackExecuted: false,
    },
  };
  const bundle = {
    schema: "gpao_t.owner_ops_local_package_bundle.v0_1",
    manifest,
    files: [{
      path: "package.json",
      sha256: packageJsonSha256,
      bytes: packageJson.length,
      contentBase64: packageJson.toString("base64"),
    }],
  };
  const bundleText = `${JSON.stringify(bundle, null, 2)}\n`;
  const bundleSha256 = createHash("sha256").update(bundleText).digest("hex");
  writeFileSync(join(packageDir, `${baseName}.bundle.json`), bundleText);
  writeFileSync(join(packageDir, `${baseName}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(packageDir, `${baseName}.sha256`), `${bundleSha256}  ${baseName}.bundle.json\n`);
  const readyEvidence = [
    ["OWNER-OPS-RELEASE-READINESS-EVIDENCE.json", {
      status: "ready",
      packageId: "gpao-t-owner-ops",
      packageVersion: "9.9.9",
    }],
    ["OWNER-OPS-HUMAN-REVIEW-APPROVAL-PACKET.json", {
      status: "ready",
      approvalState: "prepared_not_approved",
    }],
    ["OWNER-OPS-SIGNED-PACKAGE-EVIDENCE.json", {
      status: "ready",
      signedPackageState: "unsigned_local_candidate",
    }],
    ["OWNER-OPS-INSTALL-UPDATE-ROLLBACK-PROOF.json", {
      status: "ready",
      proofState: "proof_requirements_ready_not_executed",
    }],
    ["OWNER-OPS-DEPLOYMENT-DRY-RUN-PLAN.json", {
      status: "ready",
      planState: "dry_run_plan_only_not_executed",
    }],
  ];

  for (const [filename, data] of readyEvidence) {
    writeFileSync(join(packageDir, filename), `${JSON.stringify(data, null, 2)}\n`);
  }
}

describe("Owner Ops public release authority gate", () => {
  it("keeps the signing lane closed while exposing signing targets and prerequisites", () => {
    const root = tempRoot();
    populateDistributionRoot(root);

    const lane = buildOwnerOpsApprovedSigningLane({ root });

    assert.equal(lane.schema, "gpao_t.owner_ops_approved_signing_lane.v0_1");
    assert.equal(["ready", "blocked"].includes(lane.status), true);
    assert.equal(lane.laneState, "prepared_not_executed");
    assert.equal(lane.signingTargets.some((target) => target.id === "macos_tauri_app_signing"), true);
    assert.equal(lane.requiredBeforeSigningExecution.includes("explicit human review decision record approving signing lane"), true);
    assert.equal(lane.authorityBoundary.signingApproved, false);
    assert.equal(lane.authorityBoundary.signingExecuted, false);
    assert.equal(lane.authorityBoundary.certificateReadAllowed, false);
    assert.equal(lane.authorityBoundary.publicReleaseAllowed, false);
  });

  it("keeps the marketplace upload approval gate prepared but closed", () => {
    const root = tempRoot();
    populateDistributionRoot(root);

    const gate = buildOwnerOpsMarketplaceUploadApprovalGate({ root });

    assert.equal(gate.schema, "gpao_t.owner_ops_marketplace_upload_approval_gate.v0_1");
    assert.equal(["ready", "blocked"].includes(gate.status), true);
    assert.equal(gate.gateState, "prepared_not_approved");
    assert.equal(gate.marketplaceTargets.some((target) => target.id === "future_plugin_marketplace_listing"), true);
    assert.equal(gate.requiredBeforeUploadApproval.includes("separate marketplace/upload approval decision"), true);
    assert.equal(gate.authorityBoundary.marketplaceUploadAllowed, false);
    assert.equal(gate.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(gate.authorityBoundary.networkUploadAllowed, false);
    assert.equal(gate.authorityBoundary.credentialAccessAllowed, false);
    assert.equal(gate.authorityBoundary.installAllowed, false);
  });

  it("keeps marketplace upload decision records local and token gated", () => {
    const root = tempRoot();
    populateDistributionRoot(root);

    const lane = buildOwnerOpsMarketplaceUploadDecisionLane({
      root,
      decision: "approve_marketplace_upload_later",
    });
    const blockedWrite = appendOwnerOpsMarketplaceUploadDecisionRecord({
      root,
      decision: "approve_marketplace_upload_later",
    });

    assert.equal(lane.schema, "gpao_t.owner_ops_marketplace_upload_decision_lane.v0_1");
    assert.equal(["ready", "blocked"].includes(lane.status), true);
    assert.equal(lane.decisionState, "preview_not_recorded");
    assert.equal(lane.requiredApproval.token, "approve-owner-ops-marketplace-upload-local-record");
    assert.equal(lane.authorityBoundary.recordWritten, false);
    assert.equal(lane.authorityBoundary.marketplaceUploadAllowed, false);
    assert.equal(lane.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(lane.authorityBoundary.networkUploadAllowed, false);
    assert.equal(blockedWrite.status, "blocked");
    assert.equal(blockedWrite.recordWritten, false);
    assert.equal(blockedWrite.marketplaceUploadAllowed, false);
    assert.equal(blockedWrite.publicReleaseAllowed, false);
    assert.equal(blockedWrite.networkUploadAllowed, false);
  });

  it("checks public release readback snapshot without deep chain rebuild", () => {
    const root = tempRoot();
    populateDistributionRoot(root);
    populateReadbackEvidence(root);

    const snapshot = buildOwnerOpsPublicReleaseReadbackSnapshot({ root });
    const check = verifyOwnerOpsPublicReleaseReadbackSnapshot({ root });

    assert.equal(snapshot.schema, "gpao_t.owner_ops_public_release_readback_snapshot.v0_1");
    assert.deepEqual(snapshot.findings, []);
    assert.equal(snapshot.status, "ready");
    assert.equal(snapshot.gateState, "public_release_not_authorized");
    assert.equal(snapshot.releasePrerequisites.releaseReadiness, "ready");
    assert.equal(snapshot.releasePrerequisites.humanReviewPacket, "ready");
    assert.equal(snapshot.releasePrerequisites.signedPackageEvidence, "ready");
    assert.equal(snapshot.releasePrerequisites.installUpdateRollbackProof, "ready");
    assert.equal(snapshot.releasePrerequisites.deploymentDryRunPlan, "ready");
    assert.equal(snapshot.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(snapshot.authorityBoundary.packageUploadAllowed, false);
    assert.equal(snapshot.authorityBoundary.networkUploadAllowed, false);
    assert.equal(check.status, "ready");
    assert.equal(check.publicReleaseAllowed, false);
  });

  it("keeps public release blocked while making blockers explicit", () => {
    const root = tempRoot();
    populateDistributionRoot(root);

    const gate = buildOwnerOpsPublicReleaseAuthorityGate({ root });

    assert.equal(gate.schema, "gpao_t.owner_ops_public_release_authority_gate.v0_1");
    assert.equal(gate.status, "blocked");
    assert.equal(gate.gateState, "public_release_not_authorized");
    assert.equal(gate.releasePrerequisites.humanReviewDecisionRecords, 0);
    assert.equal(["ready", "blocked"].includes(gate.releasePrerequisites.approvedSigningLane), true);
    assert.equal(gate.releasePrerequisites.signingLaneState, "prepared_not_executed");
    assert.equal(["ready", "blocked"].includes(gate.releasePrerequisites.marketplaceUploadApprovalGate), true);
    assert.equal(gate.releasePrerequisites.marketplaceUploadGateState, "prepared_not_approved");
    assert.equal(gate.releasePrerequisites.marketplaceUploadDecisionRecords, 0);
    assert.equal(gate.currentBlockingReasons.includes("human_review_decision_record_missing"), true);
    assert.equal(gate.currentBlockingReasons.includes("release_readiness_evidence_not_ready"), true);
    assert.equal(gate.requiredBeforePublicRelease.includes("separate marketplace/upload approval"), true);
    assert.equal(gate.authorityBoundary.publicReleaseAllowed, false);
    assert.equal(gate.authorityBoundary.packageUploadAllowed, false);
    assert.equal(gate.authorityBoundary.signingAllowed, false);
  });

});
