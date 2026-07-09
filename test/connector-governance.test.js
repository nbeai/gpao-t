import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  buildConnectorGovernanceSummary,
  buildConnectorToolGovernance,
  buildApprovalRecordWriteUxDesign,
  buildAuditWriteDesignProof,
  buildExecutionApprovalPreview,
  handleGatewayRequest,
  listConnectors,
  reviewConnectorPermission,
  verifyApprovalRecordWriteUxDesign,
  verifyAuditWriteDesignProof,
  verifyConnectorToolGovernance,
  verifyExecutionApprovalPreview,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

describe("GPAO-T connector governance", () => {
  it("lists connectors without configuring OAuth, tokens, or external execution", () => {
    const registry = listConnectors();
    const summary = buildConnectorGovernanceSummary();

    assert.equal(registry.schema, "gpao_t.connector_registry.v0_1");
    assert.equal(registry.governanceRule, "connected_does_not_mean_executable");
    assert.equal(registry.connectorDoctrine, "connected_readable_writable_sendable_automatable_are_separate_permissions");
    assert.ok(registry.connectors.some((connector) => connector.id === "local.filesystem"));
    assert.ok(registry.connectors.some((connector) => connector.id === "github.oauth"));
    assert.equal(summary.authorityBoundary.tokenStorage, "not_configured");
    assert.equal(summary.authorityBoundary.toolCliMcpExecution, "preview_confirmation_approval_replay_audit_and_rollback_references_exist");
    assert.ok(summary.blockedConnectors.includes("github.oauth"));
    assert.equal(summary.toolGovernance.modelOutputToExecutionProposal.outputIsExecutionAuthority, false);
  });

  it("classifies tool, CLI, MCP, and connector execution candidates without executing them", () => {
    const governance = buildConnectorToolGovernance({
      modelOutput: "Run a local doctor check, then draft a GitHub issue.",
      requestedSurface: "cli",
      requestedTier: "dry_run",
    });
    const verification = verifyConnectorToolGovernance({ governance });

    assert.equal(governance.schema, "gpao_t.connector_tool_governance.v0_1");
    assert.equal(governance.surface, "read_only_governance_contract");
    assert.equal(governance.selectedCandidateClass.surface, "cli");
    assert.equal(governance.selectedAuthorityTier.id, "dry_run");
    assert.equal(governance.modelOutputToExecutionProposal.outputIsExecutionAuthority, false);
    assert.ok(governance.candidateClasses.some((candidate) => candidate.surface === "tool"));
    assert.ok(governance.candidateClasses.some((candidate) => candidate.surface === "cli"));
    assert.ok(governance.candidateClasses.some((candidate) => candidate.surface === "mcp"));
    assert.ok(governance.candidateClasses.some((candidate) => candidate.id === "connector.write"));
    assert.ok(governance.authorityTiers.some((tier) => tier.id === "read_only" && tier.status === "preview_candidate_allowed"));
    assert.ok(governance.authorityTiers.some((tier) => tier.id === "write" && tier.status === "blocked"));
    assert.ok(governance.modelOutputToExecutionProposal.requiredPreviewFields.includes("rollback_reference"));
    assert.equal(governance.auditReplayRollback.writesAuditNow, false);
    assert.equal(governance.auditReplayRollback.invokesReplayNow, false);
    assert.equal(governance.auditReplayRollback.executesRollbackNow, false);
    assert.ok(governance.openClawInspiredSubstrate.includes("GPAO_T_authority_layer_overrides_connector_convenience"));
    assert.ok(governance.blockedActions.includes("actual_tool_execution"));
    assert.ok(governance.blockedActions.includes("mcp_invocation"));
    assert.equal(governance.safetyInvariants.runsCli, false);
    assert.equal(governance.safetyInvariants.activatesConnector, false);
    assert.equal(governance.safetyInvariants.promotesDurableMemory, false);
    assert.equal(verification.status, "ready");
    assert.deepEqual(verification.findings, []);
  });

  it("builds execution proposal confirmation and approval packet validation without writes", () => {
    const preview = buildExecutionApprovalPreview({
      request: "로컬 검증 계획을 preview로 보여줘.",
    });
    const verification = verifyExecutionApprovalPreview({ preview });

    assert.equal(preview.schema, "gpao_t.execution_approval_preview.v0_1");
    assert.equal(preview.language, "ko");
    assert.equal(preview.proposal.toolKind, "cli");
    assert.equal(preview.proposal.actionType, "dry_run");
    assert.equal(preview.proposal.executionState, "not_invoked");
    assert.ok(preview.proposal.expectedEffect);
    assert.ok(preview.proposal.risk);
    assert.ok(preview.proposal.rollbackReference);
    assert.ok(preview.authorityLegend.some((level) => level.label === "읽기 전용" && level.icon));
    assert.ok(preview.authorityLegend.some((level) => level.label === "외부 전송 전 확인" && level.description));
    assert.ok(preview.authorityLegend.some((level) => level.label === "되돌리기 어려움" && level.colorRole));
    assert.ok(preview.approvalPacket.requiredFields.includes("rollback_reference"));
    assert.equal(preview.approvalPacket.writesPacketNow, false);
    assert.equal(preview.approvalPacket.opensInvocationNow, false);
    assert.equal(preview.auditWriteDesign.auditWriteNow, false);
    assert.equal(preview.auditWriteDesign.storagePathNow, "not_created");
    assert.equal(preview.uxContract.defaultLocale, "ko-KR");
    assert.ok(preview.uxContract.mobileRules.some((rule) => rule.includes("overflow")));
    assert.equal(preview.safetyInvariants.writesApprovalRecord, false);
    assert.equal(preview.safetyInvariants.writesAudit, false);
    assert.equal(verification.status, "ready");
    assert.deepEqual(verification.findings, []);
  });

  it("builds audit write design proof without writing audit records", () => {
    const proof = buildAuditWriteDesignProof({
      request: "로컬 검증 계획의 기록 예정 항목을 보여줘.",
    });
    const verification = verifyAuditWriteDesignProof({ proof });

    assert.equal(proof.schema, "gpao_t.audit_write_design_proof.v0_1");
    assert.equal(proof.mode, "design_proof_only_no_write");
    assert.equal(proof.language, "ko");
    assert.equal(proof.auditTarget.proposal_id, "proposal.local_draft_preview");
    assert.equal(proof.auditTarget.source, "model_skill_user_request_preview");
    assert.equal(proof.auditTarget.requested_action, "cli.dry_run");
    assert.equal(proof.auditTarget.authority_level, "dry_run");
    assert.equal(proof.auditTarget.user_confirmation_state, "not_confirmed");
    assert.deepEqual(proof.requiredFields, [
      "proposal_id",
      "source",
      "requested_action",
      "authority_level",
      "expected_effect",
      "risk",
      "rollback_reference",
      "user_confirmation_state",
    ]);
    assert.equal(proof.plannedAuditItems.length, 8);
    assert.equal(proof.plannedAuditItems.every((item) => item.label && item.value && item.userMeaning), true);
    assert.equal(proof.futureEvent.writePathStatus, "reference_only_not_written");
    assert.equal(proof.displayContract.koreanUx.shortStatus, "기록 설계만 · 실제 기록 없음");
    assert.equal(proof.safetyInvariants.writesAudit, false);
    assert.equal(proof.safetyInvariants.writesApprovalRecord, false);
    assert.equal(proof.safetyInvariants.invokesDryRun, false);
    assert.equal(proof.safetyInvariants.executesTool, false);
    assert.equal(proof.blockedActions.includes("audit_write"), true);
    assert.equal(proof.blockedActions.includes("approval_record_write"), true);
    assert.equal(proof.blockedActions.includes("dry_run_invocation"), true);
    assert.equal(verification.status, "ready");
    assert.deepEqual(verification.findings, []);
  });

  it("builds approval record write UX design without writing approval records", () => {
    const design = buildApprovalRecordWriteUxDesign({
      request: "승인 기록 저장 전 확인 화면을 보여줘.",
    });
    const verification = verifyApprovalRecordWriteUxDesign({ design });

    assert.equal(design.schema, "gpao_t.approval_record_write_ux_design.v0_1");
    assert.equal(design.mode, "ux_design_only_no_write");
    assert.equal(design.language, "ko");
    assert.equal(design.designReference.codexLevel.applied, true);
    assert.equal(design.designReference.claudeCodeLevel.applied, true);
    assert.equal(design.designReference.koreanQualityGate.applied, true);
    assert.equal(design.flow.stages.length, 5);
    assert.equal(design.flow.stopLine, "write_gate");
    assert.equal(design.flow.stages.some((stage) => stage.label === "기록 미리보기"), true);
    assert.equal(design.flow.stages.some((stage) => stage.label === "쓰기 잠금"), true);
    assert.deepEqual(design.requiredRecordFields, [
      "record_id",
      "packet_id",
      "proposal_id",
      "authority_level",
      "confirmation_state",
      "scope",
      "expires_at",
      "audit_reference",
      "replay_reference",
      "rollback_reference",
    ]);
    assert.equal(design.recordItems.length, 10);
    assert.equal(design.recordItems.every((item) => item.label && item.value && item.userMeaning), true);
    assert.equal(design.writeGate.label, "저장 전 확인");
    assert.equal(design.writeGate.writesApprovalRecordNow, false);
    assert.equal(design.writeGate.createsApprovalDirectoryNow, false);
    assert.equal(design.writeGate.readsApprovalStoreNow, false);
    assert.equal(design.displayContract.stateLanguage.includes("아직 실행 없음"), true);
    assert.equal(design.safetyInvariants.writesApprovalRecord, false);
    assert.equal(design.safetyInvariants.invokesDryRun, false);
    assert.equal(design.safetyInvariants.readsOrWritesCredentials, false);
    assert.equal(design.blockedActions.includes("approval_record_write"), true);
    assert.equal(design.blockedActions.includes("credential_read_or_write"), true);
    assert.equal(verification.status, "ready");
    assert.deepEqual(verification.findings, []);
  });

  it("allows only local read preview and keeps execution boundaries blocked", () => {
    const review = reviewConnectorPermission({
      connectorId: "local.filesystem",
      action: "read",
      task: "inspect local project evidence",
    });

    assert.equal(review.schema, "gpao_t.connector_permission_review.v0_1");
    assert.equal(review.status, "preview");
    assert.equal(review.connectorDoctrine, "readable_does_not_mean_writable_or_executable");
    assert.equal(review.access.readable, true);
    assert.equal(review.access.writable, false);
    assert.equal(review.access.executable, false);
    assert.equal(review.audit.tokenStorage, "not_configured");
    assert.ok(review.blockedActions.includes("secret_write"));
  });

  it("blocks OAuth reads until setup and task approval exist", () => {
    const review = reviewConnectorPermission({
      connectorId: "github.oauth",
      action: "read",
    });

    assert.equal(review.status, "blocked");
    assert.equal(review.access.connected, false);
    assert.equal(review.access.readable, false);
    assert.ok(review.requiredApprovals.includes("connector_read_approval"));
    assert.ok(review.blockedActions.includes("connector_activation"));
  });

  it("blocks external send actions regardless of connector selection", () => {
    const review = reviewConnectorPermission({
      connectorId: "slack.oauth",
      action: "send",
    });

    assert.equal(review.status, "blocked");
    assert.equal(review.access.executable, false);
    assert.ok(review.requiredApprovals.includes("external_send"));
    assert.ok(review.blockedActions.includes("external_send"));
  });

  it("exposes connector governance through CLI and gateway", () => {
    const cliOutput = execFileSync(process.execPath, [CLI, "connectors", "review", "github.oauth", "read"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliGovernanceOutput = execFileSync(process.execPath, [CLI, "connectors", "tool-governance"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliGovernanceCheckOutput = execFileSync(process.execPath, [CLI, "connectors", "tool-governance-check"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliApprovalOutput = execFileSync(process.execPath, [CLI, "approval", "execution-proposal", "로컬 검증을 미리보기로 보여줘"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliApprovalCheckOutput = execFileSync(process.execPath, [CLI, "approval", "execution-proposal-check"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliAuditDesignOutput = execFileSync(process.execPath, [CLI, "approval", "audit-write-design", "기록 예정 항목을 보여줘"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliAuditDesignCheckOutput = execFileSync(process.execPath, [CLI, "approval", "audit-write-design-check"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliApprovalRecordUxOutput = execFileSync(process.execPath, [CLI, "approval", "approval-record-write-ux", "저장 전 확인 흐름을 보여줘"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliApprovalRecordUxCheckOutput = execFileSync(process.execPath, [CLI, "approval", "approval-record-write-ux-check"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliReview = JSON.parse(cliOutput);
    const cliGovernance = JSON.parse(cliGovernanceOutput);
    const cliGovernanceCheck = JSON.parse(cliGovernanceCheckOutput);
    const cliApproval = JSON.parse(cliApprovalOutput);
    const cliApprovalCheck = JSON.parse(cliApprovalCheckOutput);
    const cliAuditDesign = JSON.parse(cliAuditDesignOutput);
    const cliAuditDesignCheck = JSON.parse(cliAuditDesignCheckOutput);
    const cliApprovalRecordUx = JSON.parse(cliApprovalRecordUxOutput);
    const cliApprovalRecordUxCheck = JSON.parse(cliApprovalRecordUxCheckOutput);
    const registry = handleGatewayRequest({ method: "GET", path: "/connectors" });
    const summary = handleGatewayRequest({ method: "GET", path: "/connectors/governance" });
    const toolGovernance = handleGatewayRequest({ method: "GET", path: "/connectors/tool-governance" });
    const toolGovernanceCheck = handleGatewayRequest({ method: "GET", path: "/connectors/tool-governance/verify" });
    const approval = handleGatewayRequest({ method: "GET", path: "/approval/execution-proposal" });
    const approvalCheck = handleGatewayRequest({ method: "GET", path: "/approval/execution-proposal/verify" });
    const auditDesign = handleGatewayRequest({ method: "GET", path: "/approval/audit-write-design" });
    const auditDesignCheck = handleGatewayRequest({ method: "GET", path: "/approval/audit-write-design/verify" });
    const approvalRecordUx = handleGatewayRequest({ method: "GET", path: "/approval/approval-record-write-ux" });
    const approvalRecordUxCheck = handleGatewayRequest({ method: "GET", path: "/approval/approval-record-write-ux/verify" });
    const review = handleGatewayRequest({
      method: "POST",
      path: "/connectors/review",
      body: { connectorId: "slack.oauth", action: "send" },
    });

    assert.equal(cliReview.status, "blocked");
    assert.equal(cliGovernance.schema, "gpao_t.connector_tool_governance.v0_1");
    assert.equal(cliGovernance.safetyInvariants.executesTool, false);
    assert.equal(cliGovernanceCheck.status, "ready");
    assert.equal(cliApproval.schema, "gpao_t.execution_approval_preview.v0_1");
    assert.equal(cliApproval.approvalPacket.writesPacketNow, false);
    assert.equal(cliApprovalCheck.status, "ready");
    assert.equal(cliAuditDesign.schema, "gpao_t.audit_write_design_proof.v0_1");
    assert.equal(cliAuditDesign.plannedAuditItems.length, 8);
    assert.equal(cliAuditDesignCheck.status, "ready");
    assert.equal(cliApprovalRecordUx.schema, "gpao_t.approval_record_write_ux_design.v0_1");
    assert.equal(cliApprovalRecordUx.writeGate.writesApprovalRecordNow, false);
    assert.equal(cliApprovalRecordUx.recordItems.length, 10);
    assert.equal(cliApprovalRecordUxCheck.status, "ready");
    assert.equal(registry.status, 200);
    assert.equal(summary.status, 200);
    assert.equal(toolGovernance.status, 200);
    assert.equal(toolGovernance.body.modelOutputToExecutionProposal.outputIsExecutionAuthority, false);
    assert.equal(toolGovernanceCheck.status, 200);
    assert.equal(toolGovernanceCheck.body.status, "ready");
    assert.equal(approval.status, 200);
    assert.equal(approval.body.auditWriteDesign.auditWriteNow, false);
    assert.equal(approvalCheck.status, 200);
    assert.equal(approvalCheck.body.status, "ready");
    assert.equal(auditDesign.status, 200);
    assert.equal(auditDesign.body.futureEvent.writePathStatus, "reference_only_not_written");
    assert.equal(auditDesignCheck.status, 200);
    assert.equal(auditDesignCheck.body.status, "ready");
    assert.equal(approvalRecordUx.status, 200);
    assert.equal(approvalRecordUx.body.writeGate.writesApprovalRecordNow, false);
    assert.equal(approvalRecordUx.body.designReference.codexLevel.applied, true);
    assert.equal(approvalRecordUxCheck.status, 200);
    assert.equal(approvalRecordUxCheck.body.status, "ready");
    assert.equal(review.status, 200);
    assert.equal(review.body.status, "blocked");
  });
});
