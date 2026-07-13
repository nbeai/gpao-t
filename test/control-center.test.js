import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  appendReplayRecoveryRecord,
  appendSelfGrowthProposal,
  buildBrowserLocalAppShellContract,
  buildBrowserLocalAppShellHtml,
  buildBrowserLocalAppShellState,
  buildControlCenterHtml,
  buildControlCenterServingContract,
  buildControlCenterSnapshot,
  buildControlCenterSummary,
  buildControlCenterUiContract,
  buildControlCenterUiSnapshot,
  buildCoreWorkSurface,
  buildCoreWorkSurfaceHtml,
  buildWorkSurfaceSubmissionDecisionGate,
  buildWorkSurfaceSubmissionValidationGate,
  buildPackagedDesktopPlanningReview,
  buildTauriPackagedDesktopGate,
  buildTauriReadOnlyShellHtml,
  buildTauriReadOnlyShellSlice,
  buildOperationsContractSummary,
  buildOperationsReliabilityContract,
  buildRuntimeDataContract,
  captureMemoryEntry,
  handleGatewayRequest,
  renderControlCenterHtml,
  startControlCenterPreviewServer,
  validateControlCenterUiSnapshot,
  verifyBrowserLocalAppShell,
  verifyControlCenterPreviewServing,
  verifyCoreWorkSurface,
  verifyWorkSurfaceSubmissionDecisionGate,
  verifyWorkSurfaceSubmissionValidationGate,
  verifyPackagedDesktopPlanningReview,
  verifyTauriPackagedDesktopGate,
  verifyTauriReadOnlyShellSlice,
} from "../src/index.js";
import releaseFixture from "../fixtures/replay/release-file-active-target.json" with { type: "json" };

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DATA_SCHEMA_PATH = fileURLToPath(new URL("../schema/gpao-t-runtime-data-schema.json", import.meta.url));
const UI_SCHEMA_PATH = fileURLToPath(new URL("../schema/gpao-t-control-center-ui-schema.json", import.meta.url));
const VERIFY_DOC_PATH = fileURLToPath(new URL("../docs/03-verification/VERIFY.md", import.meta.url));
const TAURI_CONFIG_PATH = fileURLToPath(new URL("../src-tauri/tauri.conf.json", import.meta.url));
const TAURI_CAPABILITY_PATH = fileURLToPath(new URL("../src-tauri/capabilities/default.json", import.meta.url));
const TAURI_SHELL_HTML_PATH = fileURLToPath(new URL("../tauri-shell/index.html", import.meta.url));
const APP_SHELL_BASELINE_JSON = fileURLToPath(new URL(
  "../docs/03-verification/evidence/app-shell-screenshot-qa-baseline-2026-07-09.json",
  import.meta.url,
));
const APP_SHELL_BASELINE_DOC = fileURLToPath(new URL(
  "../docs/03-verification/evidence/APP-SHELL-SCREENSHOT-QA-BASELINE-2026-07-09.md",
  import.meta.url,
));
const TAURI_SHELL_BASELINE_JSON = fileURLToPath(new URL(
  "../docs/03-verification/evidence/tauri-shell-visual-qa-baseline-2026-07-09.json",
  import.meta.url,
));
const TAURI_SHELL_BASELINE_DOC = fileURLToPath(new URL(
  "../docs/03-verification/evidence/TAURI-SHELL-VISUAL-QA-BASELINE-2026-07-09.md",
  import.meta.url,
));
const CONTROL_APPROVAL_PREVIEW_QA_JSON = fileURLToPath(new URL(
  "../docs/03-verification/evidence/control-center-approval-preview-ux-qa-2026-07-09.json",
  import.meta.url,
));
const CONTROL_APPROVAL_PREVIEW_QA_DOC = fileURLToPath(new URL(
  "../docs/03-verification/evidence/CONTROL-CENTER-APPROVAL-PREVIEW-UX-QA-2026-07-09.md",
  import.meta.url,
));
const EXECUTION_APPROVAL_QA_JSON = fileURLToPath(new URL(
  "../docs/03-verification/evidence/execution-approval-ux-qa-2026-07-09.json",
  import.meta.url,
));
const EXECUTION_APPROVAL_QA_DOC = fileURLToPath(new URL(
  "../docs/03-verification/evidence/EXECUTION-APPROVAL-UX-QA-2026-07-09.md",
  import.meta.url,
));
const AUDIT_WRITE_DESIGN_QA_JSON = fileURLToPath(new URL(
  "../docs/03-verification/evidence/audit-write-design-qa-2026-07-09.json",
  import.meta.url,
));
const AUDIT_WRITE_DESIGN_QA_DOC = fileURLToPath(new URL(
  "../docs/03-verification/evidence/AUDIT-WRITE-DESIGN-QA-2026-07-09.md",
  import.meta.url,
));
const APPROVAL_RECORD_WRITE_UX_QA_JSON = fileURLToPath(new URL(
  "../docs/03-verification/evidence/approval-record-write-ux-qa-2026-07-09.json",
  import.meta.url,
));
const APPROVAL_RECORD_WRITE_UX_QA_DOC = fileURLToPath(new URL(
  "../docs/03-verification/evidence/APPROVAL-RECORD-WRITE-UX-QA-2026-07-09.md",
  import.meta.url,
));
const DESIGN_REFERENCE_GATE_QA_JSON = fileURLToPath(new URL(
  "../docs/03-verification/evidence/design-reference-gate-qa-2026-07-09.json",
  import.meta.url,
));
const DESIGN_REFERENCE_GATE_QA_DOC = fileURLToPath(new URL(
  "../docs/03-verification/evidence/DESIGN-REFERENCE-GATE-QA-2026-07-09.md",
  import.meta.url,
));
const DESIGN_REALIZATION_PASS_001_QA_JSON = fileURLToPath(new URL(
  "../docs/03-verification/evidence/design-realization-pass-001-qa-2026-07-09.json",
  import.meta.url,
));
const DESIGN_REALIZATION_PASS_001_QA_DOC = fileURLToPath(new URL(
  "../docs/03-verification/evidence/DESIGN-REALIZATION-PASS-001-QA-2026-07-09.md",
  import.meta.url,
));
const DESIGN_REALIZATION_PASS_002_QA_JSON = fileURLToPath(new URL(
  "../docs/03-verification/evidence/design-realization-pass-002-qa-2026-07-09.json",
  import.meta.url,
));
const DESIGN_REALIZATION_PASS_002_QA_DOC = fileURLToPath(new URL(
  "../docs/03-verification/evidence/DESIGN-REALIZATION-PASS-002-QA-2026-07-09.md",
  import.meta.url,
));
const WORK_SURFACE_VISUAL_QA_JSON = fileURLToPath(new URL(
  "../docs/03-verification/evidence/work-surface-visual-qa-baseline-2026-07-09.json",
  import.meta.url,
));
const WORK_SURFACE_VISUAL_QA_DOC = fileURLToPath(new URL(
  "../docs/03-verification/evidence/WORK-SURFACE-VISUAL-QA-BASELINE-2026-07-09.md",
  import.meta.url,
));
const WORK_SURFACE_CONFIRMATION_QA_JSON = fileURLToPath(new URL(
  "../docs/03-verification/evidence/work-surface-confirmation-ux-qa-2026-07-09.json",
  import.meta.url,
));
const WORK_SURFACE_CONFIRMATION_QA_DOC = fileURLToPath(new URL(
  "../docs/03-verification/evidence/WORK-SURFACE-CONFIRMATION-UX-QA-2026-07-09.md",
  import.meta.url,
));
const WORK_SURFACE_LOCAL_DRAFT_QA_JSON = fileURLToPath(new URL(
  "../docs/03-verification/evidence/work-surface-local-draft-preview-qa-2026-07-09.json",
  import.meta.url,
));
const WORK_SURFACE_LOCAL_DRAFT_QA_DOC = fileURLToPath(new URL(
  "../docs/03-verification/evidence/WORK-SURFACE-LOCAL-DRAFT-PREVIEW-QA-2026-07-09.md",
  import.meta.url,
));
const PACKAGED_DESKTOP_REVIEW_DOC = fileURLToPath(new URL(
  "../docs/03-engineering/PACKAGED-DESKTOP-PLANNING-REVIEW.md",
  import.meta.url,
));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-control-center-"));
}

describe("GPAO-T Local Control Center readiness", () => {
  it("builds an inspectable empty-state snapshot without starting a daemon", () => {
    const root = tempRoot();
    const snapshot = buildControlCenterSnapshot({ root });

    assert.equal(snapshot.schema, "gpao_t.control_center_snapshot.v0_1");
    assert.equal(snapshot.controlCenterReadiness, "data_contract_before_ui");
    assert.equal(snapshot.surface, "local_control_center_data_contract");
    assert.equal(snapshot.panels.length, snapshot.counts.panels);
    assert.equal(snapshot.counts.memoryEntries, 0);
    assert.equal(snapshot.counts.memoryReviewQueueRecords, 0);
    assert.equal(snapshot.counts.memoryReviewQueueCandidates, 0);
    assert.equal(snapshot.counts.memoryReviewQueueReplayEvidence, 0);
    assert.equal(snapshot.counts.memoryContextMeshApplied, 0);
    assert.equal(snapshot.counts.installHardeningReports, 0);
    assert.equal(snapshot.counts.dataSurfaces >= 8, true);
    assert.equal(snapshot.counts.modelAdapters, 4);
    assert.equal(snapshot.counts.modelRouterProfiles, 4);
    assert.equal(snapshot.counts.modelRouterBlockedActions, 8);
    assert.equal(snapshot.counts.modelRouterFailureStates, 5);
    assert.equal(snapshot.counts.modelRouterReplayCriteria, 6);
    assert.equal(snapshot.counts.connectors, 6);
    assert.equal(snapshot.counts.connectorToolCandidateClasses, 7);
    assert.equal(snapshot.counts.connectorToolAuthorityTiers, 6);
    assert.equal(snapshot.counts.connectorToolBlockedActions, 9);
    assert.equal(snapshot.counts.growthApplicationGates, 0);
    assert.equal(snapshot.counts.approvalPreviewStages, 5);
    assert.equal(snapshot.counts.designReferenceAxes, 5);
    assert.equal(snapshot.counts.designReferenceEvidenceRequirements, 10);
    assert.equal(snapshot.counts.designReferenceRequiredReportFields, 7);
    assert.equal(snapshot.counts.approvalPreviewBlockedActions, 10);
    assert.equal(snapshot.counts.executionApprovalAuthorityLevels, 6);
    assert.equal(snapshot.counts.executionApprovalRequiredFields, 15);
    assert.equal(snapshot.counts.executionApprovalValidationRules, 6);
    assert.equal(snapshot.counts.executionApprovalBlockedActions, 11);
    assert.equal(snapshot.counts.auditWritePlannedItems, 8);
    assert.equal(snapshot.counts.auditWriteRequiredFields, 8);
    assert.equal(snapshot.counts.auditWriteBlockedActions, 12);
    assert.equal(snapshot.counts.approvalRecordFlowStages, 5);
    assert.equal(snapshot.counts.approvalRecordPreviewItems, 10);
    assert.equal(snapshot.counts.approvalRecordBlockedActions, 14);
    assert.equal(snapshot.counts.coreWorkSurfaceThreadMessages, 2);
    assert.equal(snapshot.counts.coreWorkSurfaceSelectedSkillPacks >= 1, true);
    assert.equal(snapshot.counts.welcomeQuestions, 8);
    assert.equal(snapshot.counts.welcomeMissingFiles, 0);
    assert.equal(snapshot.counts.welcomeDraftWrites, 4);
    assert.equal(snapshot.counts.welcomeFindings, 0);
    assert.equal(snapshot.authorityBoundary.connectorActivation, "blocked_until_explicit_approval");
    assert.equal(snapshot.authorityBoundary.toolCliMcpExecution, "preview_confirmation_approval_replay_audit_and_rollback_references_exist");
    assert.equal(snapshot.authorityBoundary.modelRouterBoundary, "blocked_until_provider_setup_task_approval_and_audit");
    assert.equal(snapshot.authorityBoundary.growthApplication, "blocked_in_this_slice");
    assert.equal(snapshot.authorityBoundary.installExecution, "blocked_until_user_approval");
    assert.equal(snapshot.authorityBoundary.approvalPreviewFlow, "local_preview_only_no_write_no_invocation");
    assert.equal(snapshot.authorityBoundary.designReferenceGate, "required_for_every_ui_ux_slice");
    assert.equal(snapshot.authorityBoundary.executionApprovalPacket, "preview_validation_only_no_write_no_invocation");
    assert.equal(snapshot.authorityBoundary.auditWriteDesign, "local_jsonl_write_available");
    assert.equal(snapshot.authorityBoundary.approvalRecordWriteUx, "local_jsonl_write_available");
    assert.equal(snapshot.authorityBoundary.approvalRecordWrite, "local_jsonl_only");
    assert.equal(snapshot.authorityBoundary.dryRunInvocation, "blocked");
    assert.equal(snapshot.authorityBoundary.externalModelCall, "blocked_until_configured_and_approved");
    assert.equal(snapshot.authorityBoundary.runtimeWorkspaceWelcomeApply, "apply-gpao-t-welcome-settings");
    assert.equal(snapshot.authorityBoundary.runtimeWorkspaceWelcomeExternalActions, "blocked");
    assert.ok(snapshot.panels.some((panel) =>
      panel.id === "core-work-surface"
      && panel.status === "ready"
      && panel.data.interactionMode === "interactive_local_submission"
      && panel.data.workspaceThread.composer.submission === "local_submission_enabled"
      && panel.data.safetyInvariants.submitsInput === true
      && panel.data.safetyInvariants.callsExternalModel === false
      && panel.data.safetyInvariants.executesTools === false
      && panel.data.authoritySummary.closedActions.includes("connector activation")
    ));
    assert.ok(snapshot.panels.some((panel) =>
      panel.id === "memory"
      && panel.status === "review"
      && panel.data.applyGate.currentStage === "source_truth"
      && panel.data.sourceCandidateReplayApplyLine.includes("approval_audit")
      && panel.data.blockedMutations.includes("GPAO-T 원천 메모리 쓰기")
    ));
    assert.ok(snapshot.panels.some((panel) => panel.id === "ops" && panel.status === "blocked"));
    assert.ok(snapshot.panels.some((panel) =>
      panel.id === "runtime-workspace-welcome"
      && panel.status === "ready"
      && panel.data.welcome.requiredQuestions.length === 8
      && panel.data.sampleDraft.preview.memory === "not_promoted"
      && panel.data.welcome.authorityBoundary.externalActions === "blocked"
    ));
    assert.ok(snapshot.panels.some((panel) =>
      panel.id === "approval-preview"
      && panel.data.stages.length === 5
      && panel.data.blockedActions.includes("approval record write")
      && panel.data.blockedActions.includes("dry-run invocation")
      && panel.data.blockedActionViews.some((action) => action.label === "승인 기록 쓰기")
      && panel.data.userUnderstanding.includes("아직 실행된 것은 없음")
      && panel.data.visualQaEvidence.json.endsWith("control-center-approval-preview-ux-qa-2026-07-09.json")
      && panel.data.visualQaEvidence.screenshots.length === 4
      && panel.data.stages.every((stage) => Number.isInteger(stage.step))
      && panel.data.safetyInvariants.writesApprovalRecord === false
      && panel.data.safetyInvariants.invokesDryRunExecutor === false
    ));
    assert.ok(snapshot.panels.some((panel) =>
      panel.id === "design-reference"
      && panel.status === "review"
      && panel.data.schema === "gpao_t.design_reference_gate.v0_1"
      && panel.data.referenceAxes.length === 5
      && panel.data.evidenceRequirements.length === 10
      && panel.data.requiredReportFields.includes("codexLevelFit")
      && panel.data.requiredReportFields.includes("claudeCodeLevelFit")
      && panel.data.blockedActions.includes("actual approval record write")
      && panel.data.blockedActions.includes("durable memory promotion")
      && panel.data.safetyInvariants.writesApprovalRecord === false
      && panel.data.safetyInvariants.invokesDryRun === false
    ));
    assert.ok(snapshot.panels.some((panel) =>
      panel.id === "execution-approval"
      && panel.status === "review"
      && panel.data.schema === "gpao_t.execution_approval_preview.v0_1"
      && panel.data.proposal.toolKind === "cli"
      && panel.data.proposal.actionType === "dry_run"
      && panel.data.authorityLegend.some((level) => level.label === "읽기 전용")
      && panel.data.authorityLegend.some((level) => level.label === "비용 발생 가능")
      && panel.data.approvalPacket.writesPacketNow === false
      && panel.data.auditWriteDesign.auditWriteNow === false
      && panel.data.auditWriteDesign.plannedAuditItems.length === 8
      && panel.data.auditWriteDesign.requiredAuditFields.includes("requested_action")
      && panel.data.auditWriteDesign.requiredAuditFields.includes("user_confirmation_state")
      && panel.data.approvalRecordWriteUx.flowStages.length === 5
      && panel.data.approvalRecordWriteUx.recordItems.length === 10
      && panel.data.approvalRecordWriteUx.writesApprovalRecordNow === false
      && panel.data.approvalRecordWriteUx.requiredRecordFields.includes("rollback_reference")
      && panel.data.uxContract.defaultLocale === "ko-KR"
      && panel.data.safetyInvariants.writesApprovalRecord === false
    ));
    assert.ok(snapshot.panels.some((panel) => panel.id === "connectors" && panel.status === "review"));
    assert.ok(snapshot.panels.some((panel) =>
      panel.id === "connectors"
      && panel.data.toolGovernance.schema === "gpao_t.connector_tool_governance.v0_1"
      && panel.data.toolGovernance.modelOutputToExecutionProposal.outputIsExecutionAuthority === false
      && panel.data.toolGovernance.candidateClasses.some((candidate) => candidate.surface === "mcp")
      && panel.data.toolGovernance.authorityTiers.some((tier) => tier.id === "external_send" && tier.status === "blocked")
      && panel.data.toolGovernance.auditReplayRollback.writesAuditNow === false
      && panel.data.toolGovernance.safetyInvariants.invokesMcp === false
      && panel.data.toolGovernance.blockedActions.includes("durable_memory_promotion")
    ));
    assert.ok(snapshot.panels.some((panel) =>
      panel.id === "adapters"
      && panel.data.modelRouterBoundary.schema === "gpao_t.model_router_boundary.v0_1"
      && panel.data.modelRouterBoundary.safetyInvariants.callsProvider === false
      && panel.data.modelRouterBoundary.safetyInvariants.readsSecrets === false
      && panel.data.modelRouterBoundary.safetyInvariants.sendsNetworkRequest === false
      && panel.data.modelRouterBoundary.providerBoundary.externalProviderCall === "blocked_until_provider_setup_task_approval_and_audit"
      && panel.data.modelRouterBoundary.latencyCostFallback.fallbackChain.length >= 1
      && panel.data.modelRouterPolicy.schema === "gpao_t.model_router_policy.v0_1"
      && panel.data.modelRouterPolicy.modelOutputBoundary.outputIsActionAuthority === false
      && panel.data.modelRouterPolicy.contextMeshTaskPacket.rawMemoryDumpAllowed === false
      && panel.data.modelRouterPolicy.replayAudit.invokesReplayNow === false
      && panel.data.modelRouterPolicy.fallbackAndFailure.failureStates.length === 5
    ));
    assert.ok(snapshot.panels.some((panel) => panel.id === "skill-ecosystem" && panel.status === "ready"));
  });

  it("exposes local data schema and operations reliability contracts", () => {
    const data = buildRuntimeDataContract();
    const reliability = buildOperationsReliabilityContract();
    const summary = buildOperationsContractSummary();
    const cliData = JSON.parse(execFileSync(process.execPath, [CLI, "ops", "data"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliReliability = JSON.parse(execFileSync(process.execPath, [CLI, "ops", "reliability"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliSummary = JSON.parse(execFileSync(process.execPath, [CLI, "ops", "contract"], {
      cwd: ROOT,
      encoding: "utf8",
    }));

    assert.equal(data.schema, "gpao_t.runtime_data_contract.v0_1");
    assert.equal(data.status, "ready");
    assert.equal(data.storageRoot, ".gpao-t");
    assert.equal(data.surfaces.some((surface) => surface.path === ".gpao-t/state/runtime.json"), true);
    assert.equal(data.migrationPolicy.migrationRequiredNow, false);
    assert.equal(reliability.schema, "gpao_t.operations_reliability_contract.v0_1");
    assert.equal(reliability.status, "ready");
    assert.equal(reliability.retryPolicy.previewCommands, "safe_to_retry");
    assert.equal(reliability.idempotencyPolicy.readCommands, "idempotent");
    assert.equal(summary.status, "ready");
    assert.equal(cliData.status, "ready");
    assert.equal(cliReliability.status, "ready");
    assert.equal(cliSummary.status, "ready");
    const schema = JSON.parse(readFileSync(DATA_SCHEMA_PATH, "utf8"));
    assert.equal(schema.$id, "gpao_t.runtime_data_schema.v0_1");
    assert.equal(schema.required.includes("runtimeState"), true);
  });

  it("summarizes memory, recovery, growth, and adapters for a future UI", () => {
    const root = tempRoot();
    captureMemoryEntry({
      root,
      title: "배포파일 meaning",
      body: "배포파일 means GPAO-T Operating Package in this product flow.",
    });
    appendReplayRecoveryRecord({ root, fixture: releaseFixture, now: "2026-07-08T00:00:00.000Z" });
    appendReplayRecoveryRecord({ root, fixture: releaseFixture, now: "2026-07-08T00:01:00.000Z" });
    appendSelfGrowthProposal({ root, target: "release-file", now: "2026-07-08T00:02:00.000Z" });

    const summary = buildControlCenterSummary({ root });

    assert.equal(summary.schema, "gpao_t.control_center_summary.v0_1");
    assert.equal(summary.controlCenterReadiness, "data_contract_before_ui");
    assert.equal(summary.counts.memoryEntries, 1);
    assert.equal(summary.counts.tcellCandidates, 1);
    assert.equal(summary.counts.memoryReviewQueueRecords, 0);
    assert.equal(summary.counts.memoryReviewQueueCandidates, 0);
    assert.equal(summary.counts.memoryContextMeshApplied, 0);
    assert.equal(summary.counts.firstCompletionStages, 6);
    assert.equal(summary.counts.firstCompletionReadyStages, 6);
    assert.ok(summary.panels.some((panel) => panel.id === "first-completion" && panel.status === "ready"));
    assert.equal(summary.counts.recoveryRecords, 2);
    assert.equal(summary.counts.installHardeningReports, 0);
    assert.equal(summary.counts.growthProposals, 1);
    assert.equal(summary.counts.growthApplicationGates, 0);
    assert.equal(summary.counts.blockedConnectors, 5);
    assert.ok(summary.panels.some((panel) => panel.id === "growth" && panel.status === "review"));
    assert.match(summary.nextSafeAction, /먼저 막힌 패널을 해결한다|검토 패널/);
  });

  it("builds a UI snapshot contract between runtime data and static rendering", () => {
    const root = tempRoot();
    const snapshot = buildControlCenterSnapshot({ root });
    const contract = buildControlCenterUiContract();
    const uiSnapshot = buildControlCenterUiSnapshot({ snapshot });
    const validation = validateControlCenterUiSnapshot({ uiSnapshot });
    const cliContract = JSON.parse(execFileSync(process.execPath, [CLI, "control", "ui-contract"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliSnapshot = JSON.parse(execFileSync(process.execPath, [CLI, "control", "ui-snapshot"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliValidation = JSON.parse(execFileSync(process.execPath, [CLI, "control", "ui-validate"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayContract = handleGatewayRequest({ method: "GET", path: "/control-center/ui-contract" });
    const gatewaySnapshot = handleGatewayRequest({ method: "GET", path: "/control-center/ui-snapshot" });
    const gatewayValidation = handleGatewayRequest({ method: "GET", path: "/control-center/ui-validate" });
    const schema = JSON.parse(readFileSync(UI_SCHEMA_PATH, "utf8"));

    assert.equal(contract.schema, "gpao_t.control_center_ui_contract.v0_1");
    assert.equal(contract.schemaFile, "schema/gpao-t-control-center-ui-schema.json");
    assert.equal(contract.renderedSurface.kind, "static_html_reader");
    assert.equal(contract.renderedSurface.interactionMode, "no_script_local_inspection");
    assert.equal(contract.renderedSurface.interactionSurfaces.includes("anchor_panel_navigation"), true);
    assert.equal(contract.renderedSurface.interactionSurfaces.includes("focus_navigation"), true);
    assert.equal(contract.renderedSurface.interactionSurfaces.includes("details_summary_panel_inspector"), true);
    assert.equal(contract.renderedSurface.interactionSurfaces.includes("panel_drilldown_links"), true);
    assert.equal(contract.renderedSurface.interactionSurfaces.includes("state_workflow_views"), true);
    assert.equal(contract.renderedSurface.interactionSurfaces.includes("mobile_next_safe_action_strip"), true);
    assert.equal(contract.authorityBoundary.startsDaemon, false);
    assert.equal(contract.authorityBoundary.connectsAccounts, false);
    assert.equal(uiSnapshot.schema, "gpao_t.control_center_ui_snapshot.v0_1");
    assert.equal(uiSnapshot.sourceSnapshotSchema, "gpao_t.control_center_snapshot.v0_1");
    assert.equal(uiSnapshot.sourceDesignSchema, "gpao_t.local_control_center_design_contract.v0_1");
    assert.equal(uiSnapshot.firstViewport.title, "GPAO-T Local Control Center");
    assert.equal(uiSnapshot.firstViewport.counts.panels, snapshot.counts.panels);
    assert.equal(uiSnapshot.panels.some((panel) => panel.id === "core-work-surface" && panel.group === "Work"), true);
    assert.equal(uiSnapshot.panels.some((panel) => panel.id === "memory" && panel.group === "Context"), true);
    assert.equal(uiSnapshot.panels.some((panel) =>
      panel.id === "approval-preview"
      && panel.group === "Authority"
      && panel.data.stages.length === 5
    ), true);
    assert.equal(validation.status, "ready");
    assert.equal(cliContract.schema, contract.schema);
    assert.equal(cliSnapshot.schema, uiSnapshot.schema);
    assert.equal(cliValidation.status, "ready");
    assert.equal(gatewayContract.status, 200);
    assert.equal(gatewaySnapshot.body.schema, uiSnapshot.schema);
    assert.equal(gatewayValidation.body.status, "ready");
    assert.equal(schema.$id, "gpao_t.control_center_ui_schema.v0_1");
    assert.equal(schema.required.includes("uiSnapshot"), true);
  });

  it("exposes Control Center snapshot and summary through CLI and gateway", () => {
    const cliOutput = execFileSync(process.execPath, [CLI, "control", "summary"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliSummary = JSON.parse(cliOutput);
    const snapshot = handleGatewayRequest({ method: "GET", path: "/control-center" });
    const summary = handleGatewayRequest({ method: "GET", path: "/control-center/summary" });
    const welcome = handleGatewayRequest({ method: "GET", path: "/workspace/welcome" });
    const welcomeCheck = handleGatewayRequest({ method: "GET", path: "/workspace/welcome/check" });
    const welcomeDraft = handleGatewayRequest({
      method: "POST",
      path: "/workspace/welcome/draft",
      body: {
        answers: {
          userName: "테스트",
          userAddress: "테스트님",
          companionName: "Mina",
          tone: "차분한 존댓말",
          rememberAutomatically: ["처음 사용 중"],
          durableMemoryApproved: false,
        },
      },
    });
    const welcomeApplyBlocked = handleGatewayRequest({
      method: "POST",
      path: "/workspace/welcome/apply",
      body: {
        answers: {
          userName: "테스트",
          userAddress: "테스트님",
          companionName: "Mina",
          tone: "차분한 존댓말",
        },
        approvalToken: "wrong",
      },
    });

    assert.equal(cliSummary.schema, "gpao_t.control_center_summary.v0_1");
    assert.equal(snapshot.status, 200);
    assert.equal(summary.status, 200);
    assert.equal(snapshot.body.schema, "gpao_t.control_center_snapshot.v0_1");
    assert.equal(summary.body.schema, "gpao_t.control_center_summary.v0_1");
    assert.equal(welcome.status, 200);
    assert.equal(welcome.body.schema, "gpao_t.runtime_workspace_welcome.v0_1");
    assert.equal(welcomeCheck.status, 200);
    assert.equal(welcomeCheck.body.status, "ready");
    assert.equal(welcomeDraft.status, 200);
    assert.equal(welcomeDraft.body.preview.memory, "not_promoted");
    assert.equal(welcomeApplyBlocked.status, 409);
    assert.equal(welcomeApplyBlocked.body.applied, false);
  });

  it("renders a static Local Control Center UI reader without external activation", () => {
    const root = tempRoot();
    const now = "2026-07-08T00:03:00.000Z";
    const snapshot = buildControlCenterSnapshot({ root, now });
    const html = buildControlCenterHtml({ snapshot });
    const render = renderControlCenterHtml({
      root,
      outputPath: "control-center.html",
      now,
      snapshot,
    });
    const renderedHtml = readFileSync(render.outputPath, "utf8");

    assert.match(html, /GPAO-T Local Control Center/);
    assert.match(html, /정적 UI reader/);
    assert.match(html, /data-panel="core-work-surface"/);
    assert.match(html, /data-core-work-surface="interactive-local"/);
    assert.match(html, /data-composer-state="local-submission-enabled"/);
    assert.match(html, /작업 입력/);
    assert.match(html, /닫힌 실행 경계/);
    assert.match(html, /외부 행동 없음/);
    assert.match(html, /다음 안전 행동/);
    assert.match(html, /권한 경계/);
    assert.match(html, /data-panel="memory"/);
    assert.match(html, /data-panel="approval-preview"/);
    assert.match(html, /data-panel="runtime-workspace-welcome"/);
    assert.match(html, /data-runtime-workspace-welcome="ready"/);
    assert.match(html, /첫 설정 메시지/);
    assert.match(html, /data-welcome-message="first-install"/);
    assert.match(html, /data-panel="design-reference"/);
    assert.match(html, /data-design-reference-gate="required"/);
    assert.match(html, /data-design-reference-axes="required"/);
    assert.match(html, /data-design-evidence="required"/);
    assert.match(html, /data-visual-assessment="required"/);
    assert.match(html, /data-design-reference-boundary="no-execution"/);
    assert.match(html, /Codex급 시각\/대화 UX/);
    assert.match(html, /Claude Code급 운영\/권한 UX/);
    assert.match(html, /한국어 기본 UI/);
    assert.match(html, /승인 \/ 미리보기/);
    assert.match(html, /data-approval-stage="plan"/);
    assert.match(html, /data-approval-stage="write-gate"/);
    assert.match(html, /data-approval-safe-note="preview-only"/);
    assert.match(html, /아직 실행된 것은 없음/);
    assert.match(html, /승인 전 미리보기/);
    assert.match(html, /data-approval-step="1"/);
    assert.match(html, /data-approval-step="5"/);
    assert.match(html, /아직 잠겨 있는 행동/);
    assert.match(html, /승인 기록 쓰기/);
    assert.match(html, /아직 저장하지 않음/);
    assert.match(html, /외부 호출 없음/);
    assert.match(html, /blocked-action-label/);
    assert.match(html, /blocked-action-detail/);
    assert.match(html, /data-group="맥락"/);
    assert.match(html, /href="#panel-memory"/);
    assert.match(html, /id="panel-memory"/);
    assert.match(html, /id="workflow-state-view"/);
    assert.match(html, /aria-label="Workflow, recovery, authority, and next action states"/);
    assert.match(html, /data-state-card="workflow"/);
    assert.match(html, /data-state-card="recovery"/);
    assert.match(html, /data-state-card="authority"/);
    assert.match(html, /data-state-card="next"/);
    assert.match(html, /href="#inspect-memory"/);
    assert.match(html, /<details class="inspector" id="inspect-memory" data-panel-inspector="memory">/);
    assert.match(html, /<summary>운영 드릴다운<\/summary>/);
    assert.match(html, /data-panel-action="authority" href="#authority-boundary"/);
    assert.match(html, /data-panel-action="next" href="#next-safe-action"/);
    assert.match(html, /aria-label="Control Center panel inspector"/);
    assert.match(html, /상호작용: 스크립트 없는 로컬 검사/);
    assert.match(html, /status-blocked/);
    assert.doesNotMatch(html, /<script/i);
    assert.equal(render.schema, "gpao_t.local_control_center_render.v0_1");
    assert.equal(render.status, "rendered_static_html");
    assert.equal(render.uiContractSchema, "gpao_t.control_center_ui_contract.v0_1");
    assert.equal(render.uiSnapshotSchema, "gpao_t.control_center_ui_snapshot.v0_1");
    assert.equal(render.uiValidationStatus, "ready");
    assert.equal(render.renderEvidence, "static_html_file_written");
    assert.equal(render.executableSurfaces.includes("gpao-t control render [output.html]"), true);
    assert.equal(render.authorityBoundary.startsDaemon, false);
    assert.equal(render.authorityBoundary.connectsAccounts, false);
    assert.equal(render.authorityBoundary.callsExternalModels, false);
    assert.equal(render.authorityBoundary.executesExternalTools, false);
    assert.equal(render.authorityBoundary.deploysOrPublishes, false);
    assert.equal(render.counts.panels, snapshot.counts.panels);
    assert.equal(existsSync(render.outputPath), true);
    assert.equal(renderedHtml, html);
  });

  it("exposes static UI reader output through CLI", () => {
    const htmlOutput = execFileSync(process.execPath, [CLI, "control", "html"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const renderOutput = execFileSync(process.execPath, [
      CLI,
      "control",
      "render",
      "test-output/control-center.html",
    ], {
      cwd: tempRoot(),
      encoding: "utf8",
    });
    const render = JSON.parse(renderOutput);

    assert.match(htmlOutput, /<html lang="ko">/);
    assert.match(htmlOutput, /data-core-work-surface="interactive-local"/);
    assert.match(htmlOutput, /운영 영역/);
    assert.match(htmlOutput, /패널/);
    assert.match(htmlOutput, /운영 드릴다운/);
    assert.match(htmlOutput, /panel-actions/);
    assert.match(htmlOutput, /workflow-state-view/);
    assert.match(htmlOutput, /state-ribbon/);
    assert.match(htmlOutput, /approval-flow/);
    assert.match(htmlOutput, /approval-safe-note/);
    assert.match(htmlOutput, /approval-stage-number/);
    assert.match(htmlOutput, /blocked-actions/);
    assert.match(htmlOutput, /data-design-reference-gate="required"/);
    assert.equal(render.schema, "gpao_t.local_control_center_render.v0_1");
    assert.equal(existsSync(render.outputPath), true);
  });

  it("keeps first Control Center interactions local, inspectable, and script-free", () => {
    const html = buildControlCenterHtml();

    assert.match(html, /href="#panel-core-work-surface"/);
    assert.match(html, /href="#panel-runtime"/);
    assert.match(html, /href="#panel-skill-ecosystem"/);
    assert.match(html, /href="#panel-authority"/);
    assert.match(html, /aria-label="Control Center focus navigation"/);
    assert.match(html, /href="#decision-strip"/);
    assert.match(html, /href="#workflow-state-view"/);
    assert.match(html, /href="#next-safe-action"/);
    assert.match(html, /href="#authority-boundary"/);
    assert.match(html, /id="decision-strip"/);
    assert.match(html, /id="workflow-state-view"/);
    assert.match(html, /id="next-safe-action"/);
    assert.match(html, /id="authority-boundary"/);
    assert.match(html, /\.panel:target/);
    assert.match(html, /\.inspector:target/);
    assert.match(html, /scroll-margin-top/);
    assert.match(html, /data-panel-inspector="core-work-surface"/);
    assert.match(html, /data-panel-inspector="skill-ecosystem"/);
    assert.match(html, /data-panel-inspector="approval-preview"/);
    assert.match(html, /data-panel-inspector="design-reference"/);
    assert.match(html, /href="#inspect-runtime"/);
    assert.match(html, /id="inspect-runtime"/);
    assert.match(html, /data-panel-action="inspect"/);
    assert.match(html, /data-panel-action="authority"/);
    assert.match(html, /data-panel-action="next"/);
    assert.match(html, /data-state-pill="workflow"/);
    assert.match(html, /data-state-pill="recovery"/);
    assert.match(html, /data-state-pill="authority"/);
    assert.match(html, /data-state-pill="next"/);
    assert.match(html, /<strong>패널 ID<\/strong>/);
    assert.match(html, /<strong>상태<\/strong>/);
    assert.match(html, /<strong>다음 행동<\/strong>/);
    assert.match(html, /<strong>작업 상태<\/strong>/);
    assert.match(html, /<strong>복구 상태<\/strong>/);
    assert.match(html, /<strong>권한 상태<\/strong>/);
    assert.match(html, /<strong>다음 상태<\/strong>/);
    assert.match(html, /<strong>권한 설명<\/strong>/);
    assert.match(html, /<strong>근거<\/strong>/);
    assert.match(html, /<strong>돌아가기<\/strong>/);
    assert.doesNotMatch(html, /onclick=/i);
    assert.doesNotMatch(html, /addEventListener/i);
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /https?:\/\/(?!127\.0\.0\.1|localhost)/i);
  });

  it("builds the first core work surface without opening live execution", () => {
    const surface = buildCoreWorkSurface({ root: tempRoot() });
    const html = buildCoreWorkSurfaceHtml({ surface });
    const verification = verifyCoreWorkSurface({ surface, html });
    const cliSurface = JSON.parse(execFileSync(process.execPath, [CLI, "control", "work-surface"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "work-surface-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliHtml = execFileSync(process.execPath, [CLI, "control", "work-surface-html"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const gatewaySurface = handleGatewayRequest({ method: "GET", path: "/work-surface/state", root: ROOT });
    const gatewayCheck = handleGatewayRequest({ method: "GET", path: "/work-surface/verify", root: ROOT });
    const submissionGate = buildWorkSurfaceSubmissionDecisionGate({ root: tempRoot() });
    const submissionGateCheck = verifyWorkSurfaceSubmissionDecisionGate({ gate: submissionGate });
    const cliSubmissionGate = JSON.parse(execFileSync(process.execPath, [CLI, "control", "work-surface-submission-gate"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliSubmissionGateCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "work-surface-submission-gate-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewaySubmissionGate = handleGatewayRequest({
      method: "GET",
      path: "/work-surface/submission-gate",
      root: ROOT,
    });
    const gatewaySubmissionGateCheck = handleGatewayRequest({
      method: "GET",
      path: "/work-surface/submission-gate/verify",
      root: ROOT,
    });
    const validationGate = buildWorkSurfaceSubmissionValidationGate({ root: tempRoot() });
    const validationGateCheck = verifyWorkSurfaceSubmissionValidationGate({ gate: validationGate });
    const cliValidationGate = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "control",
      "work-surface-submission-validation-gate",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliValidationGateCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "control",
      "work-surface-submission-validation-gate-check",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayValidationGate = handleGatewayRequest({
      method: "GET",
      path: "/work-surface/submission-validation-gate",
      root: ROOT,
    });
    const gatewayValidationGateCheck = handleGatewayRequest({
      method: "GET",
      path: "/work-surface/submission-validation-gate/verify",
      root: ROOT,
    });

    assert.equal(surface.schema, "gpao_t.core_work_surface.v0_1");
    assert.equal(surface.status, "ready");
    assert.equal(surface.interactionMode, "interactive_local_submission");
    assert.equal(surface.sessionWorkspace.schema, "gpao_t.session_workspace.v0_1");
    assert.equal(surface.sessionWorkspace.layout, "session_rail_active_work_session_inspector");
    assert.equal(surface.sessionWorkspace.productSurface, "session_based_local_ai_operating_workspace");
    assert.equal(surface.sessionWorkspace.notMessenger, true);
    assert.equal(surface.sessionWorkspace.notGenericDashboard, true);
    assert.equal(surface.sessionWorkspace.sessionRail.actions.some((action) => action.id === "new_session"), true);
    assert.equal(surface.sessionWorkspace.sessionRail.actions.some((action) => action.id === "search_sessions"), true);
    assert.equal(surface.sessionWorkspace.sessionRail.groups.some((group) => group.id === "recent-active"), true);
    assert.equal(surface.sessionWorkspace.sessionRail.groups.some((group) => group.id === "project"), true);
    assert.equal(surface.sessionWorkspace.sessionRail.groups.some((group) => group.id === "archived"), true);
    assert.equal(surface.sessionWorkspace.sessionRail.sessionActions.some((action) => action.id === "rename"), true);
    assert.equal(surface.sessionWorkspace.sessionRail.sessionActions.some((action) => action.id === "archive"), true);
    assert.equal(surface.sessionWorkspace.sessionRail.sessionActions.some((action) => action.id === "restore"), true);
    assert.equal(surface.sessionWorkspace.sessionRail.sessionActions.some((action) => action.id === "mark_delete_pending"), true);
    assert.equal(surface.sessionWorkspace.sessionRail.sessionActions.some((action) => action.id === "cancel_delete_pending"), true);
    assert.equal(surface.sessionWorkspace.sessionRail.sessionActions.some((action) => action.id === "permanent_delete"), false);
    assert.equal(surface.sessionWorkspace.sessionStates.some((state) => state.id === "active" && state.label === "진행 중"), true);
    assert.equal(surface.sessionWorkspace.sessionStates.some((state) => state.id === "draft" && state.label === "초안"), true);
    assert.equal(surface.sessionWorkspace.sessionStates.some((state) => state.id === "waiting_approval" && state.label === "확인 필요"), true);
    assert.equal(surface.sessionWorkspace.sessionStates.some((state) => state.id === "blocked" && state.label === "멈춤"), true);
    assert.equal(surface.sessionWorkspace.sessionStates.some((state) => state.id === "archived" && state.label === "보관됨"), true);
    assert.equal(surface.sessionWorkspace.sessionStates.some((state) => state.id === "delete_pending" && state.label === "삭제 대기"), true);
    assert.equal(surface.sessionWorkspace.activeWorkSession.sections.some((section) => section.id === "composer"), true);
    assert.equal(surface.sessionWorkspace.inspector.tabs.some((tab) => tab.id === "context"), true);
    assert.equal(surface.sessionWorkspace.inspector.tabs.some((tab) => tab.id === "authority"), true);
    assert.equal(surface.sessionWorkspace.inspector.tabs.some((tab) => tab.id === "model"), true);
    assert.equal(surface.sessionWorkspace.inspector.tabs.some((tab) => tab.id === "tools"), true);
    assert.equal(surface.sessionWorkspace.inspector.tabs.some((tab) => tab.id === "records"), true);
    assert.equal(surface.sessionWorkspace.inspector.tabs.some((tab) => tab.id === "rollback"), true);
    assert.equal(surface.sessionWorkspace.mobile.layout, "top_strip_active_session_sheets");
    assert.equal(surface.sessionWorkspace.mobile.forceThreeColumns, false);
    assert.equal(surface.sessionWorkspace.mobile.composerReachable, true);
    assert.equal(surface.sessionWorkspace.mobile.authorityVisibleBeforeExecution, true);
    assert.equal(surface.sessionWorkspace.visualContract.primaryWorkArea, "wide_conversation_canvas");
    assert.equal(surface.sessionWorkspace.visualContract.centralCardsMinimized, true);
    assert.equal(surface.sessionWorkspace.visualContract.composerPriority, "large_bottom_work_input");
    assert.equal(surface.workspaceThread.composer.submission, "local_submission_enabled");
    assert.equal(surface.workspaceThread.threadPreview.length, 2);
    assert.equal(surface.understandingSummary.mode, "read_only_summary_strip");
    assert.equal(surface.understandingSummary.cards.length, 4);
    assert.equal(surface.understandingSummary.cards.some((card) => card.id === "understood-task"), true);
    assert.equal(surface.understandingSummary.cards.some((card) => card.id === "context-source"), true);
    assert.equal(surface.understandingSummary.cards.some((card) => card.id === "skill-route"), true);
    assert.equal(surface.understandingSummary.cards.some((card) => card.id === "execution-boundary" && card.tone === "locked"), true);
    assert.equal(surface.readabilityView.interaction, "native_details_no_script");
    assert.equal(surface.readabilityView.sections.length, 3);
    assert.equal(surface.readabilityView.sections.some((section) => section.id === "task-brief"), true);
    assert.equal(surface.readabilityView.sections.some((section) => section.id === "route-brief"), true);
    assert.equal(surface.readabilityView.sections.some((section) => section.id === "authority-brief"), true);
    assert.equal(surface.readabilityView.checklist.length, 3);
    assert.equal(surface.confirmationUx.schema, "gpao_t.work_surface_confirmation_ux.v0_1");
    assert.equal(surface.confirmationUx.interactionMode, "no_script_confirmation_card");
    assert.equal(surface.confirmationUx.cards.length, 4);
    assert.equal(surface.confirmationUx.cards.some((card) => card.id === "understood-input"), true);
    assert.equal(surface.confirmationUx.cards.some((card) => card.id === "context-evidence"), true);
    assert.equal(surface.confirmationUx.cards.some((card) => card.id === "skill-route"), true);
    assert.equal(surface.confirmationUx.cards.some((card) => card.id === "authority-boundary" && card.state === "locked"), true);
    assert.equal(surface.confirmationUx.noExecutionNotice, "아직 실행된 것은 없음");
    assert.equal(surface.confirmationUx.nextProductDirection, "first_local_draft_preview");
    assert.equal(surface.confirmationUx.opensLiveSubmission, false);
    assert.equal(surface.confirmationUx.writesApprovalRecord, false);
    assert.equal(surface.localDraftPreview.schema, "gpao_t.local_draft_preview.v0_1");
    assert.equal(surface.localDraftPreview.status, "visible_local_preview_structure");
    assert.equal(surface.localDraftPreview.previewMode, "structure_only_no_model_no_submit");
    assert.equal(surface.localDraftPreview.headline, "이렇게 처리될 예정입니다");
    assert.equal(surface.localDraftPreview.expectedOutputShape.state, "preview_only");
    assert.equal(surface.localDraftPreview.sections.some((section) => section.id === "understood-task"), true);
    assert.equal(surface.localDraftPreview.sections.some((section) => section.id === "expected-output"), true);
    assert.equal(surface.localDraftPreview.sections.some((section) => section.id === "context-to-use"), true);
    assert.equal(surface.localDraftPreview.sections.some((section) => section.id === "skill-route"), true);
    assert.equal(surface.localDraftPreview.sections.some((section) => section.id === "locked-state" && /차단/.test(section.value)), true);
    assert.equal(surface.localDraftPreview.productStates.some((state) => state.id === "empty" && state.outcome === "empty"), true);
    assert.equal(surface.localDraftPreview.productStates.some((state) => state.id === "blocked" && state.outcome === "blocked"), true);
    assert.equal(surface.localDraftPreview.productStates.some((state) => state.id === "review-needed" && state.outcome === "review_needed"), true);
    assert.equal(surface.localDraftPreview.confirmationFlow.schema, "gpao_t.local_draft_preview_confirmation_flow.v0_1");
    assert.equal(surface.localDraftPreview.confirmationFlow.mode, "read_only_decision_strip");
    assert.equal(surface.localDraftPreview.confirmationFlow.decisions.some((decision) => decision.id === "intent-match" && decision.label === "의도와 맞음"), true);
    assert.equal(surface.localDraftPreview.confirmationFlow.decisions.some((decision) => decision.id === "needs-changes" && decision.label === "수정 필요"), true);
    assert.equal(surface.localDraftPreview.confirmationFlow.decisions.some((decision) => decision.id === "hold" && decision.label === "보류"), true);
    assert.equal(surface.localDraftPreview.confirmationFlow.checkBeforeProceeding.length, 4);
    assert.equal(surface.localDraftPreview.confirmationFlow.connectsConfirmationToPreview, true);
    assert.equal(surface.localDraftPreview.confirmationFlow.closesCoreWorkSurfaceSubstrateAfterThisPass, true);
    assert.equal(surface.localDraftPreview.confirmationFlow.opensLiveSubmission, false);
    assert.equal(surface.localDraftPreview.confirmationFlow.invokesModel, false);
    assert.equal(surface.localDraftPreview.confirmationFlow.executesTools, false);
    assert.equal(surface.localDraftPreview.confirmationFlow.activatesConnectors, false);
    assert.equal(surface.localDraftPreview.confirmationFlow.sendsExternally, false);
    assert.equal(surface.localDraftPreview.confirmationFlow.writesApprovalRecord, false);
    assert.match(surface.localDraftPreview.visualQaEvidence.contract, /work-surface-local-draft-preview-qa-2026-07-09\.json/);
    assert.match(surface.localDraftPreview.visualQaEvidence.desktop, /work-surface-local-draft-preview-2026-07-09-desktop-viewport-1440x960\.jpg/);
    assert.match(surface.localDraftPreview.visualQaEvidence.mobile, /work-surface-local-draft-preview-2026-07-09-mobile-viewport-390x844\.jpg/);
    assert.equal(surface.localDraftPreview.structureVisible, true);
    assert.equal(surface.localDraftPreview.draftContentGeneratedNow, false);
    assert.equal(surface.localDraftPreview.opensLiveSubmission, false);
    assert.equal(surface.localDraftPreview.invokesModel, false);
    assert.equal(surface.localDraftPreview.executesTools, false);
    assert.equal(surface.localDraftPreview.activatesConnectors, false);
    assert.equal(surface.localDraftPreview.sendsExternally, false);
    assert.equal(surface.localDraftPreview.writesApprovalRecord, false);
    assert.equal(surface.localDraftPreview.installsUpdatesOrRollsBack, false);
    assert.equal(surface.localDraftPreview.promotesDurableMemory, false);
    assert.equal(surface.executionProposalConfirmation.schema, "gpao_t.work_surface_execution_proposal_confirmation.v0_1");
    assert.equal(surface.executionProposalConfirmation.status, "visible_preview_only");
    assert.equal(surface.executionProposalConfirmation.proposal.toolKind, "cli");
    assert.equal(surface.executionProposalConfirmation.proposal.actionType, "dry_run");
    assert.equal(surface.executionProposalConfirmation.proposal.authorityLevel, "dry_run");
    assert.ok(surface.executionProposalConfirmation.proposal.expectedEffect);
    assert.ok(surface.executionProposalConfirmation.proposal.risk);
    assert.ok(surface.executionProposalConfirmation.proposal.rollbackReference);
    assert.equal(surface.executionProposalConfirmation.authorityLegend.length, 6);
    assert.equal(surface.executionProposalConfirmation.authorityLegend.some((level) => level.label === "읽기 전용"), true);
    assert.equal(surface.executionProposalConfirmation.authorityLegend.some((level) => level.label === "저장 전 확인"), true);
    assert.equal(surface.executionProposalConfirmation.authorityLegend.some((level) => level.label === "외부 전송 전 확인"), true);
    assert.equal(surface.executionProposalConfirmation.authorityLegend.some((level) => level.label === "되돌리기 어려움"), true);
    assert.equal(surface.executionProposalConfirmation.authorityLegend.some((level) => level.label === "비용 발생 가능"), true);
    assert.equal(surface.executionProposalConfirmation.approvalPacket.requiredFields.includes("rollback_reference"), true);
    assert.equal(surface.executionProposalConfirmation.approvalPacket.writesPacketNow, false);
    assert.equal(surface.executionProposalConfirmation.approvalPacket.opensInvocationNow, false);
    assert.equal(surface.executionProposalConfirmation.validationRules.length, 6);
    assert.equal(surface.executionProposalConfirmation.auditWriteDesign.auditWriteNow, false);
    assert.equal(surface.executionProposalConfirmation.auditWriteDesign.plannedAuditItems.length, 8);
    assert.equal(surface.executionProposalConfirmation.auditWriteDesign.auditTarget.requested_action, "cli.dry_run");
    assert.equal(surface.executionProposalConfirmation.auditPreview.status, "visible_design_only_no_write");
    assert.equal(surface.executionProposalConfirmation.auditPreview.plannedAuditItems.length, 8);
    assert.equal(surface.executionProposalConfirmation.auditPreview.writesAuditNow, false);
    assert.equal(surface.executionProposalConfirmation.approvalRecordFlow.status, "visible_design_only_no_write");
    assert.equal(surface.executionProposalConfirmation.approvalRecordFlow.flowStages.length, 5);
    assert.equal(surface.executionProposalConfirmation.approvalRecordFlow.recordItems.length, 10);
    assert.equal(surface.executionProposalConfirmation.approvalRecordFlow.writesApprovalRecordNow, false);
    assert.equal(surface.executionProposalConfirmation.uxContract.defaultLocale, "ko-KR");
    assert.equal(surface.executionGovernanceFlow.schema, "gpao_t.work_surface_execution_governance_flow.v1");
    assert.equal(surface.executionGovernanceFlow.flowStages.length, 5);
    assert.equal(surface.executionGovernanceFlow.localRecord.writesDuringRender, false);
    assert.equal(surface.executionGovernanceFlow.boundaries.localJsonlRecordWrite, "allowed_after_explicit_confirmation");
    assert.equal(surface.executionGovernanceFlow.boundaries.toolCliMcpExecution, "blocked");
    assert.equal(surface.executionGovernanceFlow.boundaries.externalSend, "blocked");
    assert.equal(surface.taskState.objective.includes("GPAO-T"), true);
    assert.equal(surface.contextPreview.boundary.includes("review only"), true);
    assert.equal(surface.skillRoutePreview.selectedPacks.length >= 1, true);
    assert.equal(surface.modelToolRoutePreview.liveModelExecution, false);
    assert.equal(surface.modelToolRoutePreview.liveToolExecution, false);
    assert.equal(surface.authoritySummary.closedActions.includes("external action"), true);
    assert.equal(surface.authoritySummary.closedActions.includes("tool activation"), true);
    assert.equal(surface.authoritySummary.closedActions.includes("model connector live execution"), true);
    assert.equal(surface.safetyInvariants.submitsInput, true);
    assert.equal(surface.safetyInvariants.callsExternalModel, false);
    assert.equal(surface.safetyInvariants.executesTools, false);
    assert.equal(surface.safetyInvariants.activatesConnectors, false);
    assert.equal(surface.safetyInvariants.usesScript, false);
    assert.equal(surface.safetyInvariants.usesForm, true);
    assert.equal(surface.safetyInvariants.usesOnlyLocalConfirmationForm, true);
    assert.match(html, /GPAO-T 작업 대시보드/);
    assert.match(html, /data-core-work-surface="interactive-local"/);
    assert.match(html, /data-session-workspace="session-based-local-ai-os"/);
    assert.match(html, /data-session-rail="left"/);
    assert.match(html, /data-active-work-session="center"/);
    assert.match(html, /data-session-inspector="right"/);
    assert.match(html, /data-workspace-layout="conversation-first"/);
    assert.match(html, /data-work-conversation-canvas="wide"/);
    assert.match(html, /data-mobile-session-sheet="visible"/);
    assert.match(html, /data-mobile-inspector-sheet="visible"/);
    assert.match(html, /보관된 세션/);
    assert.match(html, /삭제 대기/);
    assert.match(html, /삭제 대기 취소/);
    assert.match(html, /외부 전송 없음/);
    assert.match(html, /data-understanding-summary="read-only"/);
    assert.match(html, /data-understanding-card="execution-boundary"/);
    assert.match(html, /읽기 전용 · 실제 전송\/모델\/도구 실행 없음/);
    assert.match(html, /data-readability-interaction="native-details"/);
    assert.match(html, /data-readability-section="task-brief"/);
    assert.match(html, /읽기 체크리스트/);
    assert.match(html, /data-confirmation-ux="preview-only"/);
    assert.match(html, /data-confirmation-card="understood-input"/);
    assert.match(html, /data-confirmation-card="context-evidence"/);
    assert.match(html, /data-confirmation-card="skill-route"/);
    assert.match(html, /data-confirmation-card="authority-boundary"/);
    assert.match(html, /아직 실행된 것은 없습니다/);
    assert.match(html, /미리보기 확인만 의미/);
    assert.match(html, /data-local-draft-preview="visible-local-structure"/);
    assert.match(html, /이렇게 처리될 예정입니다/);
    assert.match(html, /data-local-draft-section="understood-task"/);
    assert.match(html, /data-local-draft-section="expected-output"/);
    assert.match(html, /data-local-draft-section="context-to-use"/);
    assert.match(html, /data-local-draft-section="skill-route"/);
    assert.match(html, /data-local-draft-section="locked-state"/);
    assert.match(html, /data-local-draft-state="empty"/);
    assert.match(html, /data-local-draft-state="blocked"/);
    assert.match(html, /data-local-draft-state="review-needed"/);
    assert.match(html, /data-preview-confirmation-flow="read-only"/);
    assert.match(html, /data-preview-decision="intent-match"/);
    assert.match(html, /data-preview-decision="needs-changes"/);
    assert.match(html, /data-preview-decision="hold"/);
    assert.match(html, /의도와 맞음/);
    assert.match(html, /수정 필요/);
    assert.match(html, /보류/);
    assert.match(html, /미리보기 확인 체크리스트/);
    assert.match(html, /현재 상태: 초안 생성 없음/);
    assert.match(html, /data-execution-proposal-confirmation="preview-only"/);
    assert.match(html, /실행 전 확인/);
    assert.match(html, /읽기 전용/);
    assert.match(html, /미리보기만/);
    assert.match(html, /저장 전 확인/);
    assert.match(html, /외부 전송 전 확인/);
    assert.match(html, /되돌리기 어려움/);
    assert.match(html, /비용 발생 가능/);
    assert.doesNotMatch(html, />\s*(eye|scan|edit-3|send|octagon-alert|circle-dollar-sign)\s*·/);
    assert.match(html, /data-approval-packet-validation="design-only"/);
    assert.match(html, /data-audit-write-design="local-record-only"/);
    assert.match(html, /data-local-record-substrate="v1"/);
    assert.match(html, /data-audit-preview="design-only"/);
    assert.match(html, /기록될 예정인 항목/);
    assert.match(html, /data-audit-item="requested_action"/);
    assert.match(html, /data-approval-record-write-ux="design-only"/);
    assert.match(html, /data-approval-record-preview="no-write"/);
    assert.match(html, /저장될 항목 미리보기/);
    assert.match(html, /쓰기 잠금/);
    assert.match(html, /사용자 확인/);
    assert.match(html, /data-execution-governance-flow="local-record-review"/);
    assert.match(html, /실행 확인 흐름/);
    assert.match(html, /로컬 기록 후 리플레이/);
    assert.match(html, /data-composer-state="local-submission-enabled"/);
    assert.match(html, /data-authority-boundary="closed"/);
    assert.doesNotMatch(html, /<script/i);
    assert.match(html, /data-local-confirmation-form="approval-audit-record"/);
    assert.match(html, /method="post" action="\/work-surface\/execution-flow\/record"/);
    assert.equal(verification.status, "ready");
    assert.equal(cliSurface.schema, surface.schema);
    assert.equal(cliCheck.status, "ready");
    assert.match(cliHtml, /GPAO-T 작업 대시보드/);
    assert.equal(gatewaySurface.status, 200);
    assert.equal(gatewaySurface.body.schema, surface.schema);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
    assert.equal(submissionGate.schema, "gpao_t.work_surface_submission_decision_gate.v0_1");
    assert.equal(submissionGate.gateMode, "design_only_no_live_submission");
    assert.equal(submissionGate.inputPacketSchema.requiredFields.includes("draftText"), true);
    assert.equal(submissionGate.exampleInputPacket.submissionMode, "preview_only_not_submitted");
    assert.equal(submissionGate.immediatePreviewState.writesState, false);
    assert.equal(submissionGate.immediatePreviewState.invokesModel, false);
    assert.equal(submissionGate.immediatePreviewState.executesTools, false);
    assert.equal(submissionGate.immediatePreviewState.activatesConnectors, false);
    assert.equal(submissionGate.contextMeshAttachment.mode, "preview_only");
    assert.equal(submissionGate.skillRouteAttachment.liveSkillExecution, false);
    assert.equal(submissionGate.authorityBoundary.userCanSubmitLiveNow, false);
    assert.equal(submissionGate.authorityBoundary.blockedActions.includes("live model call"), true);
    assert.equal(submissionGate.authorityBoundary.blockedActions.includes("tool/CLI/MCP execution"), true);
    assert.equal(submissionGate.authorityBoundary.blockedActions.includes("durable memory promotion"), true);
    assert.equal(submissionGate.reviewAndBlockedConditions.some((condition) => condition.outcome === "blocked"), true);
    assert.equal(submissionGate.stopLine.liveSubmissionImplemented, false);
    assert.equal(submissionGateCheck.status, "ready");
    assert.equal(cliSubmissionGate.schema, submissionGate.schema);
    assert.equal(cliSubmissionGateCheck.status, "ready");
    assert.equal(gatewaySubmissionGate.status, 200);
    assert.equal(gatewaySubmissionGate.body.schema, submissionGate.schema);
    assert.equal(gatewaySubmissionGateCheck.status, 200);
    assert.equal(gatewaySubmissionGateCheck.body.status, "ready");
    assert.equal(validationGate.schema, "gpao_t.work_surface_submission_validation_confirmation_gate.v0_1");
    assert.equal(validationGate.gateMode, "final_pre_submit_preview_only");
    assert.equal(validationGate.previousGate.schema, "gpao_t.work_surface_submission_decision_gate.v0_1");
    assert.equal(validationGate.candidatePacket.submissionMode, "preview_only_not_submitted");
    assert.equal(validationGate.validationChecks.requiredFields.status, "valid");
    assert.equal(validationGate.validationChecks.emptyInput.status, "valid");
    assert.equal(validationGate.validationChecks.length.max, 8000);
    assert.equal(validationGate.validationChecks.riskSignals.detected.length >= 0, true);
    assert.equal(validationGate.previewAttachmentChecks.contextMeshPreview.status, "attached");
    assert.equal(validationGate.previewAttachmentChecks.skillRoutePreview.status, "attached");
    assert.equal(validationGate.previewAttachmentChecks.authorityPreview.status, "attached");
    assert.equal(validationGate.confirmationCard.status, "visible_before_any_future_submission");
    assert.equal(validationGate.confirmationCard.confirmAction.opensLiveSubmission, false);
    assert.equal(validationGate.confirmationCard.confirmAction.writesApprovalRecord, false);
    assert.equal(
      validationGate.confirmationCard.sections.some((section) =>
        section.id === "skill_route_preview" && /\[object Object\]/.test(section.value)
      ),
      false,
    );
    assert.equal(validationGate.productLanguageState.userCanUnderstand.includes("아직 실행된 것은 없음"), true);
    assert.equal(validationGate.executionBoundary.liveSubmission, "blocked");
    assert.equal(validationGate.executionBoundary.liveModelCall, "blocked");
    assert.equal(validationGate.executionBoundary.toolCliMcpExecution, "blocked");
    assert.equal(validationGate.executionBoundary.connectorActivation, "blocked");
    assert.equal(validationGate.executionBoundary.externalNetworkSend, "blocked");
    assert.equal(validationGate.executionBoundary.approvalWrite, "blocked");
    assert.equal(validationGate.executionBoundary.installUpdateRollback, "blocked");
    assert.equal(validationGate.executionBoundary.durableMemoryPromotion, "blocked");
    assert.equal(validationGate.documentationAlignment.readmeFreshnessWarning, "tracked_as_document_alignment_item");
    assert.equal(validationGate.stopLine.liveSubmissionImplemented, false);
    assert.equal(validationGate.stopRuleAfterThisGate.rule, "do_not_split_submission_meta_gates_further");
    assert.equal(validationGate.stopRuleAfterThisGate.nextProductDirection.includes("work_surface_confirmation_ux"), true);
    assert.equal(validationGateCheck.status, "ready");
    assert.equal(cliValidationGate.schema, validationGate.schema);
    assert.equal(cliValidationGateCheck.status, "ready");
    assert.equal(gatewayValidationGate.status, 200);
    assert.equal(gatewayValidationGate.body.schema, validationGate.schema);
    assert.equal(gatewayValidationGateCheck.status, 200);
    assert.equal(gatewayValidationGateCheck.body.status, "ready");
  });

  it("validates submission packets before confirmation without opening execution", () => {
    const emptyGate = buildWorkSurfaceSubmissionValidationGate({ root: tempRoot(), draftRequest: "   " });
    const longGate = buildWorkSurfaceSubmissionValidationGate({
      root: tempRoot(),
      draftRequest: "a".repeat(8001),
    });
    const riskyGate = buildWorkSurfaceSubmissionValidationGate({
      root: tempRoot(),
      draftRequest: "GitHub OAuth connector로 외부 전송하고 CLI 도구를 실행해줘",
    });

    assert.equal(emptyGate.status, "blocked");
    assert.equal(emptyGate.validationChecks.requiredFields.status, "blocked");
    assert.equal(emptyGate.validationChecks.emptyInput.status, "blocked");
    assert.equal(emptyGate.validationChecks.length.status, "blocked_empty");
    assert.match(emptyGate.productLanguageState.headline, /아직 제출할 수 없습니다/);
    assert.equal(emptyGate.executionBoundary.liveSubmission, "blocked");

    assert.equal(longGate.status, "review");
    assert.equal(longGate.validationChecks.length.status, "review_too_long");
    assert.match(longGate.validationChecks.length.productLanguage, /다시 확인/);
    assert.equal(longGate.confirmationCard.confirmAction.opensLiveSubmission, false);

    assert.equal(riskyGate.status, "blocked");
    assert.equal(riskyGate.validationChecks.riskSignals.status, "blocked");
    assert.equal(
      riskyGate.validationChecks.riskSignals.detected.some((signal) => signal.id === "external_send_or_network"),
      true,
    );
    assert.equal(
      riskyGate.validationChecks.riskSignals.detected.some((signal) => signal.id === "tool_cli_mcp_execution"),
      true,
    );
    assert.equal(
      riskyGate.validationChecks.riskSignals.detected.some((signal) => signal.id === "connector_or_account_activation"),
      true,
    );
    assert.equal(riskyGate.confirmationCard.confirmAction.writesApprovalRecord, false);
    assert.equal(riskyGate.stopRuleAfterThisGate.rule, "do_not_split_submission_meta_gates_further");
  });

  it("keeps responsive visual hardening rules in the static Control Center reader", () => {
    const html = buildControlCenterHtml();

    assert.match(html, /@media \(max-width: 640px\)/);
    assert.match(html, /overflow-x: hidden/);
    assert.match(html, /max-width: 100vw/);
    assert.match(html, /mobile-next-action/);
    assert.match(html, /aria-label="Mobile next safe action"/);
    assert.match(html, /class="topbar-action">다음 행동:/);
    assert.match(html, /focus-strip/);
    assert.match(html, /\.focus-strip \{[\s\S]*flex-wrap: wrap/);
    assert.match(html, /\.workflow-state-view \{[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
    assert.match(html, /\.state-card \{[\s\S]*min-height: 82px/);
    assert.match(html, /\.state-ribbon \{[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
    assert.match(html, /\.panel\[data-panel="approval-preview"\] \{[\s\S]*grid-column: 1 \/ -1/);
    assert.match(html, /\.panel\[data-panel="execution-approval"\] \{[\s\S]*grid-column: 1 \/ -1/);
    assert.match(html, /\.approval-flow \{[\s\S]*grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
    assert.match(html, /\.blocked-actions \{[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(180px, 1fr\)\)/);
    assert.match(html, /\.work-surface-grid \{[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(170px, 1fr\)\)/);
    assert.match(html, /\.state-pill \{[\s\S]*overflow-wrap: anywhere/);
    assert.match(html, /\.topbar \{[\s\S]*position: sticky/);
    assert.match(html, /\.topbar \{[\s\S]*position: fixed/);
    assert.match(html, /\.layout \{[\s\S]*padding-top: 140px/);
    assert.match(html, /\.topbar-action \{[\s\S]*-webkit-line-clamp: 2/);
    assert.match(html, /\.workflow-state-view \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(html, /\.state-ribbon \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(html, /\.approval-flow \{[\s\S]*grid-template-columns: 1fr/);
    assert.match(html, /\.blocked-actions \{[\s\S]*grid-template-columns: 1fr/);
    assert.match(html, /\.work-surface-grid \{[\s\S]*grid-template-columns: 1fr/);
    assert.match(html, /\.panel-actions \{[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    assert.match(html, /\.panel-action \{[\s\S]*overflow-wrap: anywhere/);
    assert.match(html, /\.inspector \{[\s\S]*scroll-margin-top: 242px/);
    assert.match(html, /\.side-section \{[\s\S]*scroll-margin-top: 140px/);
    assert.match(html, /#next-safe-action-aside \{[\s\S]*display: none/);
    assert.match(html, /nav \{ order: 3; \}/);
    assert.match(html, /main \{ order: 1; \}/);
    assert.match(html, /aside \{ order: 2; \}/);
    assert.match(html, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(html, /width: calc\(50% - 5px\)/);
    assert.match(html, /white-space: normal/);
    assert.match(html, /overflow-wrap: anywhere/);
  });

  it("defines browser-safe local serving and screenshot verification boundaries", () => {
    const contract = buildControlCenterServingContract();

    assert.equal(contract.schema, "gpao_t.control_center_serving_contract.v0_1");
    assert.equal(contract.status, "ready");
    assert.equal(contract.servingMode, "browser_safe_loopback_preview");
    assert.equal(contract.host, "127.0.0.1");
    assert.equal(contract.routes.some((route) => route.path === "/control-center"), true);
    assert.equal(contract.routes.some((route) => route.path === "/work-surface"), true);
    assert.equal(contract.routes.some((route) => route.path === "/work-surface/state"), true);
    assert.equal(contract.routes.some((route) => route.path === "/work-surface/verify"), true);
    assert.equal(contract.routes.some((route) => route.path === "/work-surface/submission-gate"), true);
    assert.equal(contract.routes.some((route) => route.path === "/work-surface/submission-gate/verify"), true);
    assert.equal(contract.routes.some((route) => route.path === "/work-surface/submission-validation-gate"), true);
    assert.equal(contract.routes.some((route) => route.path === "/work-surface/submission-validation-gate/verify"), true);
    assert.equal(contract.routes.some((route) => route.path === "/work-surface/execution-flow"), true);
    assert.equal(contract.routes.some((route) => route.path === "/work-surface/execution-flow/confirmation"), true);
    assert.equal(contract.routes.some((route) => route.path === "/work-surface/execution-flow/verify"), true);
    assert.equal(contract.routes.some((route) => route.path === "/sessions"), true);
    assert.equal(contract.routes.some((route) => route.path === "/sessions/verify"), true);
    assert.equal(contract.previewLifecycle.serveCheck, "ephemeral_start_verify_stop");
    assert.equal(contract.previewLifecycle.serve, "explicit_manual_preview_until_signal");
    assert.equal(contract.previewLifecycle.persistentDaemon, false);
    assert.equal(contract.screenshotVerification.status, "required_before_richer_behavior");
    assert.equal(contract.screenshotVerification.requiredViewports.length, 2);
    assert.equal(contract.screenshotVerification.requiredVisibleText.includes("권한 경계"), true);
    assert.equal(contract.screenshotVerification.requiredSelectors.includes(".focus-strip"), true);
    assert.equal(contract.screenshotVerification.requiredSelectors.includes(".mobile-next-action"), true);
    assert.equal(
      contract.screenshotVerification.requiredInteractionSignals.includes("mobile_sticky_topbar_or_decision_strip_visible"),
      true,
    );
    assert.equal(contract.authorityBoundary.loopbackOnly, true);
    assert.equal(contract.authorityBoundary.startsPersistentDaemon, false);
    assert.equal(contract.authorityBoundary.deploysOrPublishes, false);
  });

  it("defines the browser-local app-shell first slice as read-mostly and GET-only", () => {
    const contract = buildBrowserLocalAppShellContract();
    const state = buildBrowserLocalAppShellState({ root: tempRoot(), now: "2026-07-09T00:00:00.000Z" });

    assert.equal(contract.schema, "gpao_t.browser_local_app_shell_contract.v0_1");
    assert.equal(contract.shellKind, "browser_local_app_shell");
    assert.equal(contract.runtimeBoundary.transport, "127.0.0.1_http");
    assert.equal(contract.runtimeBoundary.localIpc, "blocked_in_first_slice");
    assert.equal(contract.runtimeBoundary.packagedDesktopTarget, "tauri_after_browser_local_proof");
    assert.equal(contract.allowedGetRoutes.includes("/health"), true);
    assert.equal(contract.allowedGetRoutes.includes("/work-surface"), true);
    assert.equal(contract.allowedGetRoutes.includes("/work-surface/state"), true);
    assert.equal(contract.allowedGetRoutes.includes("/work-surface/verify"), true);
    assert.equal(contract.allowedGetRoutes.includes("/work-surface/submission-gate"), true);
    assert.equal(contract.allowedGetRoutes.includes("/work-surface/submission-gate/verify"), true);
    assert.equal(contract.allowedGetRoutes.includes("/work-surface/submission-validation-gate"), true);
    assert.equal(contract.allowedGetRoutes.includes("/work-surface/submission-validation-gate/verify"), true);
    assert.equal(contract.allowedGetRoutes.includes("/work-surface/execution-flow"), true);
    assert.equal(contract.allowedGetRoutes.includes("/work-surface/execution-flow/confirmation"), true);
    assert.equal(contract.allowedGetRoutes.includes("/work-surface/execution-flow/verify"), true);
    assert.equal(contract.allowedGetRoutes.includes("/sessions"), true);
    assert.equal(contract.allowedGetRoutes.includes("/sessions/verify"), true);
    assert.equal(contract.allowedGetRoutes.includes("/control-center/ui-validate"), true);
    assert.equal(contract.blockedPostRoutes.includes("/turn"), true);
    assert.equal(contract.blockedActions.includes("connector activation"), true);
    assert.equal(contract.blockedActions.includes("model activation"), true);
    assert.equal(contract.blockedActions.includes("tool activation"), true);
    assert.equal(contract.blockedActions.includes("install execution"), true);
    assert.equal(contract.blockedActions.includes("rollback execution"), true);
    assert.equal(contract.blockedActions.includes("durable memory promotion"), true);
    assert.equal(contract.blockedActions.includes("self-growth apply"), true);
    assert.equal(contract.blockedActions.includes("deployment"), true);
    assert.equal(contract.blockedActions.includes("messenger surfaces"), true);
    assert.equal(contract.blockedActions.includes("recurring automation"), true);
    assert.equal(contract.authorityBoundary.mutationAuthority, "none_in_first_slice");
    assert.equal(contract.auditReplayRollback.auditWritesFromShell, false);
    assert.equal(contract.screenshotQa.requiredViewports.length, 2);
    assert.equal(contract.failureRecoveryStates.some((failure) => failure.id === "runtime_unavailable"), true);
    assert.equal(contract.failureRecoveryStates.some((failure) => failure.id === "snapshot_invalid"), true);
    assert.equal(state.schema, "gpao_t.browser_local_app_shell_state.v0_1");
    assert.equal(state.sourceRoutes.every((route) => route.method === "GET"), true);
    assert.equal(state.blockedRoutes.every((route) => route.method === "POST" && route.mode === "blocked"), true);
    assert.equal(state.panels.length > 0, true);
    assert.equal(state.uiValidation.status, "ready");
    assert.equal(state.stateLanes.length, 4);
    assert.equal(state.stateLanes.some((lane) => lane.id === "workflow" && lane.source === "GPAO-T 로컬 상태 요약"), true);
    assert.equal(state.stateLanes.some((lane) => lane.id === "recovery"), true);
    assert.equal(state.stateLanes.some((lane) => lane.id === "authority" && lane.status === "ready"), true);
    assert.equal(state.stateLanes.some((lane) => lane.id === "next"), true);
    assert.equal(state.panels.every((panel) => panel.workflowState && panel.recoveryState && panel.authorityState && panel.nextActionState), true);
  });

  it("renders the browser-local app shell with panel navigation, evidence inspection, and recovery state", () => {
    const state = buildBrowserLocalAppShellState({
      root: tempRoot(),
      runtimeAvailable: false,
      staleSnapshot: true,
      now: "2026-07-09T00:01:00.000Z",
    });
    const html = buildBrowserLocalAppShellHtml({ state });
    const verification = verifyBrowserLocalAppShell({ html, state });

    assert.match(html, /GPAO-T 로컬 작업 화면/);
    assert.match(html, /내 PC에서 먼저 확인하는 안전한 읽기 화면/);
    assert.match(html, /외부 전송과 실행은 닫혀 있음/);
    assert.match(html, /data-app-shell="browser-local"/);
    assert.match(html, /data-interaction-mode="read-mostly-get"/);
    assert.match(html, /href="#shell-panel-runtime"/);
    assert.match(html, /data-shell-panel="runtime"/);
    assert.match(html, /id="shell-state-lanes"/);
    assert.match(html, /data-state-lane="workflow"/);
    assert.match(html, /data-state-lane="recovery"/);
    assert.match(html, /data-state-lane="authority"/);
    assert.match(html, /data-state-lane="next"/);
    assert.match(html, /data-workflow-state="runtime"/);
    assert.match(html, /state drilldown/);
    assert.match(html, /Workflow State/);
    assert.match(html, /Recovery State/);
    assert.match(html, /Authority State/);
    assert.match(html, /Next Action State/);
    assert.match(html, /data-evidence-inspection="runtime"/);
    assert.match(html, /id="shell-failure-recovery"/);
    assert.match(html, /data-failure-recovery-state="runtime_unavailable" data-active="true"/);
    assert.match(html, /data-failure-recovery-state="stale_snapshot" data-active="true"/);
    assert.match(html, /id="shell-screenshot-qa"/);
    assert.match(html, /nonblank_viewport/);
    assert.match(html, /connector activation/);
    assert.match(html, /durable memory promotion/);
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /<form/i);
    assert.doesNotMatch(html, /method=["']?post/i);
    assert.doesNotMatch(html, /https?:\/\/(?!127\.0\.0\.1|localhost)/i);
    assert.equal(verification.status, "ready");
  });

  it("closes the packaged desktop Tauri gate without opening mutation authority", () => {
    const gate = buildTauriPackagedDesktopGate();
    const verification = verifyTauriPackagedDesktopGate({ gate });
    const cliGate = JSON.parse(execFileSync(process.execPath, [CLI, "control", "tauri-gate"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "tauri-gate-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayGate = handleGatewayRequest({ method: "GET", path: "/app-shell/tauri-gate" });
    const gatewayCheck = handleGatewayRequest({ method: "GET", path: "/app-shell/tauri-gate/verify" });

    assert.equal(gate.schema, "gpao_t.tauri_packaged_desktop_gate.v0_1");
    assert.equal(gate.status, "ready");
    assert.equal(gate.gateClosed, true);
    assert.equal(gate.packagedDesktopImplementationStarted, false);
    assert.equal(gate.targetShell, "tauri");
    assert.equal(gate.shellBoundary.browserLocal.transport, "127.0.0.1_http");
    assert.equal(gate.shellBoundary.tauriFirstSlice.localIpc, "blocked_in_first_tauri_slice");
    assert.equal(gate.shellBoundary.tauriFirstSlice.mutation, "blocked");
    assert.equal(gate.firstSlice.implementationAllowedNow, false);
    assert.equal(gate.firstSlice.allowedRoutes.every((route) => route.startsWith("GET ")), true);
    assert.equal(gate.firstSlice.blockedRoutes.includes("/turn"), true);
    assert.equal(gate.blockedAuthorityActions.includes("OAuth setup"), true);
    assert.equal(gate.blockedAuthorityActions.includes("token or secret storage"), true);
    assert.equal(gate.blockedAuthorityActions.includes("connector activation"), true);
    assert.equal(gate.blockedAuthorityActions.includes("model activation"), true);
    assert.equal(gate.blockedAuthorityActions.includes("tool activation"), true);
    assert.equal(gate.blockedAuthorityActions.includes("external send"), true);
    assert.equal(gate.blockedAuthorityActions.includes("install execution"), true);
    assert.equal(gate.blockedAuthorityActions.includes("update execution"), true);
    assert.equal(gate.blockedAuthorityActions.includes("rollback execution"), true);
    assert.equal(gate.blockedAuthorityActions.includes("durable memory promotion"), true);
    assert.equal(gate.blockedAuthorityActions.includes("self-growth apply"), true);
    assert.equal(gate.blockedAuthorityActions.includes("deployment"), true);
    assert.equal(gate.blockedAuthorityActions.includes("messenger surfaces"), true);
    assert.equal(gate.blockedAuthorityActions.includes("recurring automation"), true);
    assert.equal(gate.authorityBoundary.mutationAuthority, "none_in_first_tauri_slice");
    assert.equal(gate.sourceControlRollback.sourceRollback, "local_git_required_before_tauri_slice");
    assert.equal(gate.screenshotQa.requiredSignals.includes("state_lanes_visible"), true);
    assert.equal(gate.screenshotQa.requiredSignals.includes("panel_drilldown_visible"), true);
    assert.equal(gate.screenshotQa.requiredSignals.includes("mobile_fixed_topbar_action_or_decision_strip_visible"), true);
    assert.equal(gate.installUpdateRollbackOrder[0], "1_browser_local_app_shell_proof");
    assert.equal(gate.installUpdateRollbackOrder.includes("8_packaged_desktop_planning_review_stop_line"), true);
    assert.equal(gate.installUpdateRollbackOrder.includes("9_return_to_user_facing_core_work_surface"), true);
    assert.equal(gate.installUpdateRollbackOrder.includes("11_install_update_rollback_executor_gate_after_approval"), true);
    assert.equal(gate.failureRecoveryStates.some((state) => state.id === "loopback_runtime_unavailable"), true);
    assert.equal(gate.failureRecoveryStates.some((state) => state.id === "ipc_not_allowed"), true);
    assert.equal(verification.status, "ready");
    assert.equal(cliGate.schema, gate.schema);
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayGate.status, 200);
    assert.equal(gatewayGate.body.schema, gate.schema);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("closes packaged desktop planning review without opening build or invocation authority", () => {
    const review = buildPackagedDesktopPlanningReview({ root: ROOT });
    const verification = verifyPackagedDesktopPlanningReview({ review });
    const cliReview = JSON.parse(execFileSync(process.execPath, [CLI, "control", "packaged-desktop-review"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "packaged-desktop-review-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayReview = handleGatewayRequest({ method: "GET", path: "/app-shell/packaged-desktop-review", root: ROOT });
    const gatewayCheck = handleGatewayRequest({
      method: "GET",
      path: "/app-shell/packaged-desktop-review/verify",
      root: ROOT,
    });
    const doc = readFileSync(PACKAGED_DESKTOP_REVIEW_DOC, "utf8");

    assert.equal(review.schema, "gpao_t.packaged_desktop_planning_review.v0_1");
    assert.equal(review.status, "ready");
    assert.equal(review.readinessDecision.packagedDesktopBuild, "not_allowed_yet");
    assert.equal(review.readinessDecision.installUpdateRollbackExecution, "not_allowed_yet");
    assert.equal(review.readinessDecision.approvalWriteOrDryRunInvocation, "not_allowed_yet");
    assert.equal(review.returnToUserFacingCoreTiming.decision, "return_after_this_review");
    assert.equal(review.stopLine.metaGateRepetition, "stop_after_this_review");
    assert.equal(review.authorityBoundary.approvalRecordWrite, "blocked");
    assert.equal(review.authorityBoundary.dryRunInvocation, "blocked");
    assert.equal(review.authorityBoundary.tauriBuild, "blocked");
    assert.equal(review.authorityBoundary.installUpdateRollbackExecution, "blocked");
    assert.equal(review.authorityBoundary.localIpc, "blocked");
    assert.equal(review.authorityBoundary.connectorModelToolActivation, "blocked");
    assert.equal(review.closedSurfaces.some((surface) => surface.id === "approval_preview_user_understanding"), true);
    assert.equal(review.closedSurfaces.some((surface) => surface.id === "read_mostly_tauri_shell_source_slice"), true);
    assert.equal(review.stillBlockedBoundaries.includes("approval record write"), true);
    assert.equal(review.stillBlockedBoundaries.includes("dry-run invocation"), true);
    assert.equal(review.stillBlockedBoundaries.includes("Tauri build"), true);
    assert.equal(review.stillBlockedBoundaries.includes("install execution"), true);
    assert.equal(review.stillBlockedBoundaries.includes("connector/model/tool activation"), true);
    assert.equal(review.minimumConditionsBeforePackagedDesktop.some((condition) => condition.id === "user_facing_core_return"), true);
    assert.equal(review.evidenceFiles.every((evidence) => evidence.status === "present"), true);
    assert.equal(verification.status, "ready");
    assert.equal(cliReview.schema, review.schema);
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayReview.status, 200);
    assert.equal(gatewayReview.body.schema, review.schema);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
    assert.match(doc, /Stop-Line/);
    assert.match(doc, /user-facing GPAO-T core work surface/);
    assert.match(doc, /node bin\/gpao-t\.js control packaged-desktop-review-check/);
  });

  it("adds the first read-mostly Tauri shell source slice without enabling IPC or packaging", () => {
    const slice = buildTauriReadOnlyShellSlice({ root: ROOT });
    const html = buildTauriReadOnlyShellHtml({ state: slice });
    const verification = verifyTauriReadOnlyShellSlice({ root: ROOT, slice, html });
    const cliSlice = JSON.parse(execFileSync(process.execPath, [CLI, "control", "tauri-shell-slice"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "tauri-shell-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliHtml = execFileSync(process.execPath, [CLI, "control", "tauri-shell-html"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const gatewaySlice = handleGatewayRequest({ method: "GET", path: "/app-shell/tauri-shell/slice", root: ROOT });
    const gatewayHtml = handleGatewayRequest({ method: "GET", path: "/app-shell/tauri-shell", root: ROOT });
    const gatewayCheck = handleGatewayRequest({ method: "GET", path: "/app-shell/tauri-shell/verify", root: ROOT });
    const tauriConfig = JSON.parse(readFileSync(TAURI_CONFIG_PATH, "utf8"));
    const tauriCapability = JSON.parse(readFileSync(TAURI_CAPABILITY_PATH, "utf8"));
    const sourceHtml = readFileSync(TAURI_SHELL_HTML_PATH, "utf8");

    assert.equal(slice.schema, "gpao_t.tauri_readonly_shell_slice.v0_1");
    assert.equal(slice.status, "ready");
    assert.equal(slice.targetShell, "tauri");
    assert.equal(slice.sourceScaffoldReady, true);
    assert.equal(slice.packagedDesktopImplementationStarted, true);
    assert.equal(slice.packagedBuildExecuted, false);
    assert.equal(slice.dependencyInstallExecuted, false);
    assert.equal(slice.bundleOrSigningExecuted, false);
    assert.equal(slice.runtimeBoundary.frontendDist, "tauri-shell");
    assert.equal(slice.runtimeBoundary.tauriConfig, "src-tauri/tauri.conf.json");
    assert.equal(slice.runtimeBoundary.localIpc, "blocked_in_this_slice");
    assert.equal(slice.runtimeBoundary.tauriCommands.length, 0);
    assert.equal(slice.runtimeBoundary.mutation, "blocked");
    assert.equal(slice.documentationAnchors.includes("docs/README.md"), true);
    assert.equal(slice.documentationAnchors.includes("docs/03-engineering/TAURI-PACKAGED-DESKTOP-GATE.md"), true);
    assert.equal(slice.documentationAnchors.includes("docs/03-verification/VERIFY.md"), true);
    assert.equal(slice.sourceFiles.every((file) => file.status === "present"), true);
    assert.equal(slice.mirroredState.lanes.includes("workflow"), true);
    assert.equal(slice.mirroredState.lanes.includes("recovery"), true);
    assert.equal(slice.mirroredState.lanes.includes("authority"), true);
    assert.equal(slice.mirroredState.lanes.includes("next"), true);
    assert.equal(slice.blockedBehavior.includes("OAuth setup"), true);
    assert.equal(slice.blockedBehavior.includes("install execution"), true);
    assert.equal(slice.blockedBehavior.includes("rollback execution"), true);
    assert.equal(verification.status, "ready");
    assert.equal(cliSlice.schema, slice.schema);
    assert.equal(cliCheck.status, "ready");
    assert.match(cliHtml, /GPAO-T Read-Mostly Tauri Shell/);
    assert.equal(gatewaySlice.status, 200);
    assert.equal(gatewaySlice.body.schema, slice.schema);
    assert.equal(gatewayHtml.status, 200);
    assert.match(gatewayHtml.body, /data-tauri-shell="read-mostly"/);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
    assert.equal(tauriConfig.productName, "GPAO-T");
    assert.equal(tauriConfig.identifier, "app.gpao.t.local");
    assert.equal(tauriConfig.build.frontendDist, "../tauri-shell");
    assert.equal(tauriConfig.bundle.active, false);
    assert.equal(tauriCapability.permissions.length, 0);
    assert.match(sourceHtml, /data-tauri-shell="read-mostly"/);
    assert.match(sourceHtml, /data-local-ipc="blocked"/);
    assert.match(sourceHtml, /data-mobile-action-line="visible"/);
    assert.match(sourceHtml, /data-panel-navigation="visible"/);
    assert.match(sourceHtml, /data-evidence-inspection="visible"/);
    assert.doesNotMatch(sourceHtml, /<script/i);
    assert.doesNotMatch(sourceHtml, /<form/i);
  });

  it("keeps app-shell-specific screenshot QA baseline evidence separate and replayable", () => {
    const baseline = JSON.parse(readFileSync(APP_SHELL_BASELINE_JSON, "utf8"));
    const baselineDoc = readFileSync(APP_SHELL_BASELINE_DOC, "utf8");
    const desktopBytes = readFileSync(baseline.evidenceFiles.desktop);
    const mobileBytes = readFileSync(baseline.evidenceFiles.mobile);

    assert.equal(baseline.schema, "gpao_t.app_shell_screenshot_qa_baseline.v0_1");
    assert.equal(baseline.status, "ready");
    assert.equal(baseline.target.endsWith("/app-shell"), true);
    assert.equal(baseline.fileFormat, "jpeg");
    assert.equal(baseline.invariants.getOnly, true);
    assert.equal(baseline.invariants.readMostly, true);
    assert.equal(baseline.invariants.noExternalActivation, true);
    assert.equal(baseline.invariants.postBlocked, true);
    assert.equal(baseline.invariants.authorityBoundaryVisible, true);
    assert.equal(baseline.invariants.failureRecoveryStateVisible, true);
    assert.equal(baseline.invariants.nextSafeActionVisible, true);
    assert.equal(baseline.checks.length, 2);
    assert.equal(baseline.checks.every((check) => check.target === "/app-shell"), true);
    assert.equal(baseline.checks.every((check) => check.nonblankViewport), true);
    assert.equal(baseline.checks.every((check) => check.panelNavigationVisible), true);
    assert.equal(baseline.checks.every((check) => check.evidenceInspectors === 9), true);
    assert.equal(baseline.checks.every((check) => check.failureRecoveryStates === 9), true);
    assert.equal(baseline.checks.every((check) => check.authorityBoundaryVisible), true);
    assert.equal(baseline.checks.every((check) => check.nextSafeActionVisible), true);
    assert.equal(baseline.checks.every((check) => check.screenshotQaVisible), true);
    assert.equal(baseline.checks.every((check) => check.noHorizontalOverflow), true);
    assert.equal(baseline.checks.every((check) => check.noTopbarOverlap), true);
    assert.equal(baseline.checks.every((check) => !check.hasScript && !check.hasForm), true);
    assert.equal(existsSync(baseline.evidenceFiles.desktop), true);
    assert.equal(existsSync(baseline.evidenceFiles.mobile), true);
    assert.equal(desktopBytes[0], 0xff);
    assert.equal(desktopBytes[1], 0xd8);
    assert.equal(mobileBytes[0], 0xff);
    assert.equal(mobileBytes[1], 0xd8);
    assert.match(baselineDoc, /App Shell Screenshot QA Baseline/);
    assert.match(baselineDoc, /app-shell-baseline-2026-07-09-desktop-viewport-1440x960\.jpg/);
    assert.match(baselineDoc, /app-shell-baseline-2026-07-09-mobile-viewport-390x844\.jpg/);
  });

  it("keeps packaged-shell visual QA baseline evidence separate and replayable", () => {
    const baseline = JSON.parse(readFileSync(TAURI_SHELL_BASELINE_JSON, "utf8"));
    const baselineDoc = readFileSync(TAURI_SHELL_BASELINE_DOC, "utf8");
    const desktopBytes = readFileSync(baseline.evidenceFiles.desktop);
    const mobileBytes = readFileSync(baseline.evidenceFiles.mobile);

    assert.equal(baseline.schema, "gpao_t.tauri_shell_visual_qa_baseline.v0_1");
    assert.equal(baseline.status, "ready");
    assert.equal(baseline.target.endsWith("/app-shell/tauri-shell"), true);
    assert.equal(baseline.fileFormat, "jpeg");
    assert.equal(baseline.invariants.readMostly, true);
    assert.equal(baseline.invariants.localIpcBlocked, true);
    assert.equal(baseline.invariants.mutationBlocked, true);
    assert.equal(baseline.invariants.noScript, true);
    assert.equal(baseline.invariants.noForm, true);
    assert.equal(baseline.invariants.noExternalActivation, true);
    assert.equal(baseline.invariants.authorityBoundaryVisible, true);
    assert.equal(baseline.invariants.failureRecoveryStateVisible, true);
    assert.equal(baseline.invariants.nextSafeActionVisible, true);
    assert.equal(baseline.invariants.mobileActionLineVisible, true);
    assert.equal(baseline.checks.length, 2);
    assert.equal(baseline.checks.every((check) => check.target === "/app-shell/tauri-shell"), true);
    assert.equal(baseline.checks.every((check) => check.shellMarker === "read-mostly"), true);
    assert.equal(baseline.checks.every((check) => check.localIpc === "blocked"), true);
    assert.equal(baseline.checks.every((check) => check.mutation === "blocked"), true);
    assert.equal(baseline.checks.every((check) => check.nonblankViewport), true);
    assert.equal(baseline.checks.every((check) => check.panelNavigationVisible), true);
    assert.equal(baseline.checks.every((check) => check.stateLanesVisible), true);
    assert.equal(baseline.checks.every((check) => check.evidenceInspectorVisible), true);
    assert.equal(baseline.checks.every((check) => check.failureRecoveryVisible), true);
    assert.equal(baseline.checks.every((check) => check.authorityBoundaryVisible), true);
    assert.equal(baseline.checks.every((check) => check.nextSafeActionVisible), true);
    assert.equal(baseline.checks.every((check) => check.mobileFixedTopbarActionLineVisible), true);
    assert.equal(baseline.checks.every((check) => check.noHorizontalOverflow), true);
    assert.equal(baseline.checks.every((check) => !check.hasScript && !check.hasForm), true);
    assert.equal(baseline.checks.every((check) => check.externalLinks.length === 0), true);
    assert.equal(existsSync(baseline.evidenceFiles.desktop), true);
    assert.equal(existsSync(baseline.evidenceFiles.mobile), true);
    assert.equal(desktopBytes[0], 0xff);
    assert.equal(desktopBytes[1], 0xd8);
    assert.equal(mobileBytes[0], 0xff);
    assert.equal(mobileBytes[1], 0xd8);
    assert.match(baselineDoc, /Tauri Shell Visual QA Baseline/);
    assert.match(baselineDoc, /tauri-shell-visual-qa-2026-07-09-desktop-viewport-1440x960\.jpg/);
    assert.match(baselineDoc, /tauri-shell-visual-qa-2026-07-09-mobile-viewport-390x844\.jpg/);
  });

  it("keeps work-surface visual QA baseline evidence replayable and read-only", () => {
    const qa = JSON.parse(readFileSync(WORK_SURFACE_VISUAL_QA_JSON, "utf8"));
    const qaDoc = readFileSync(WORK_SURFACE_VISUAL_QA_DOC, "utf8");
    const verifyDoc = readFileSync(VERIFY_DOC_PATH, "utf8");
    const screenshots = Object.values(qa.evidenceFiles).map((filePath) => readFileSync(filePath));

    assert.equal(qa.schema, "gpao_t.work_surface_visual_qa_baseline.v0_1");
    assert.equal(qa.status, "ready");
    assert.equal(qa.target, "/work-surface");
    assert.equal(qa.fileFormat, "jpg");
    assert.equal(qa.invariants.readOnly, true);
    assert.equal(qa.invariants.noExternalActivation, true);
    assert.equal(qa.invariants.noToolActivation, true);
    assert.equal(qa.invariants.noLiveModelConnectorExecution, true);
    assert.equal(qa.invariants.noApprovalRecordWrite, true);
    assert.equal(qa.invariants.noDryRunInvocation, true);
    assert.equal(qa.invariants.noDurableMemoryPromotion, true);
    assert.equal(qa.invariants.noSelfGrowthApply, true);
    assert.equal(qa.invariants.noDeploymentMessengerOrAutomation, true);
    assert.equal(qa.invariants.noScript, true);
    assert.equal(qa.invariants.noForm, true);
    assert.equal(qa.invariants.noExternalLinks, true);
    assert.equal(qa.invariants.noHorizontalOverflow, true);
    assert.equal(qa.invariants.topbarActionVisible, true);
    assert.equal(qa.invariants.authorityBoundaryVisible, true);
    assert.equal(qa.invariants.nextSafeActionVisible, true);
    assert.equal(qa.checks.length, 2);
    assert.equal(qa.checks.every((check) => check.nonblankViewport), true);
    assert.equal(qa.checks.every((check) => check.draftInputVisible), true);
    assert.equal(qa.checks.every((check) => check.composerVisible), true);
    assert.equal(qa.checks.every((check) => check.taskStateVisible), true);
    assert.equal(qa.checks.every((check) => check.contextVisible), true);
    assert.equal(qa.checks.every((check) => check.skillRouteVisible), true);
    assert.equal(qa.checks.every((check) => check.authorityBoundaryVisible), true);
    assert.equal(qa.checks.every((check) => check.closedBoundaryTextVisible), true);
    assert.equal(qa.checks.every((check) => check.nextSafeActionVisible), true);
    assert.equal(qa.checks.every((check) => check.topbarActionVisible), true);
    assert.equal(qa.checks.every((check) => check.noHorizontalOverflow), true);
    assert.equal(qa.checks.every((check) => !check.hasScript && !check.hasForm), true);
    assert.equal(qa.checks.every((check) => check.externalLinks.length === 0), true);
    assert.equal(qa.checks.some((check) => check.id === "desktop-viewport" && check.viewport.width === 1440), true);
    assert.equal(qa.checks.some((check) => check.id === "mobile-viewport" && check.viewport.width === 390), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("model connector live execution"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("recurring automation"), true);
    assert.equal(Object.values(qa.evidenceFiles).every((filePath) => existsSync(filePath)), true);
    assert.equal(screenshots.every((bytes) => bytes[0] === 0xff && bytes[1] === 0xd8), true);
    assert.match(qaDoc, /Work Surface Visual QA Baseline/);
    assert.match(qaDoc, /work-surface-visual-qa-2026-07-09-desktop-viewport-1440x960\.jpg/);
    assert.match(qaDoc, /work-surface-visual-qa-2026-07-09-mobile-viewport-390x844\.jpg/);
    assert.match(verifyDoc, /work-surface-visual-qa-baseline-2026-07-09\.json/);
    assert.match(verifyDoc, /Mobile viewport/);
  });

  it("keeps work-surface confirmation UX visual QA evidence replayable and preview-only", () => {
    const qa = JSON.parse(readFileSync(WORK_SURFACE_CONFIRMATION_QA_JSON, "utf8"));
    const qaDoc = readFileSync(WORK_SURFACE_CONFIRMATION_QA_DOC, "utf8");
    const screenshots = Object.values(qa.evidenceFiles).map((relativePath) =>
      readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)))
    );

    assert.equal(qa.schema, "gpao_t.work_surface_confirmation_ux_qa.v0_1");
    assert.equal(qa.status, "ready");
    assert.equal(qa.target, "/work-surface");
    assert.equal(qa.fileFormat, "jpg");
    assert.equal(qa.invariants.previewOnly, true);
    assert.equal(qa.invariants.confirmationCardVisible, true);
    assert.equal(qa.invariants.localDraftPreviewShapeVisible, true);
    assert.equal(qa.invariants.noExecutionNoticeVisible, true);
    assert.equal(qa.invariants.authorityBoundaryVisible, true);
    assert.equal(qa.invariants.nextSafeActionVisible, true);
    assert.equal(qa.invariants.noLiveSubmission, true);
    assert.equal(qa.invariants.noModelCall, true);
    assert.equal(qa.invariants.noToolCliMcpExecution, true);
    assert.equal(qa.invariants.noConnectorActivation, true);
    assert.equal(qa.invariants.noExternalNetworkSend, true);
    assert.equal(qa.invariants.noApprovalWrite, true);
    assert.equal(qa.invariants.noInstallUpdateRollback, true);
    assert.equal(qa.invariants.noDurableMemoryPromotion, true);
    assert.equal(qa.invariants.noScript, true);
    assert.equal(qa.invariants.noForm, true);
    assert.equal(qa.invariants.noExternalLinks, true);
    assert.equal(qa.invariants.noHorizontalOverflow, true);
    assert.equal(qa.checks.length, 2);
    assert.equal(qa.checks.every((check) => check.confirmationCardVisible), true);
    assert.equal(qa.checks.every((check) => check.confirmationCards.includes("understood-input")), true);
    assert.equal(qa.checks.every((check) => check.confirmationCards.includes("context-evidence")), true);
    assert.equal(qa.checks.every((check) => check.confirmationCards.includes("skill-route")), true);
    assert.equal(qa.checks.every((check) => check.confirmationCards.includes("authority-boundary")), true);
    assert.equal(qa.checks.every((check) => check.localDraftPreviewVisible), true);
    assert.equal(qa.checks.every((check) => check.noExecutionVisible), true);
    assert.equal(qa.checks.every((check) => check.noHorizontalOverflow), true);
    assert.equal(qa.checks.every((check) => !check.hasScript && !check.hasForm), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("live submission"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("durable memory promotion"), true);
    assert.equal(screenshots.every((bytes) => bytes[0] === 0xff && bytes[1] === 0xd8), true);
    assert.match(qaDoc, /Work Surface Confirmation UX QA/);
    assert.match(qaDoc, /work-surface-confirmation-ux-2026-07-09-desktop-viewport-1440x960\.jpg/);
    assert.match(qaDoc, /work-surface-confirmation-ux-2026-07-09-mobile-viewport-390x844\.jpg/);
  });

  it("keeps first local draft preview visual QA evidence replayable and execution-free", () => {
    const qa = JSON.parse(readFileSync(WORK_SURFACE_LOCAL_DRAFT_QA_JSON, "utf8"));
    const qaDoc = readFileSync(WORK_SURFACE_LOCAL_DRAFT_QA_DOC, "utf8");
    const screenshots = Object.values(qa.evidenceFiles).map((relativePath) =>
      readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)))
    );

    assert.equal(qa.schema, "gpao_t.work_surface_local_draft_preview_qa.v0_1");
    assert.equal(qa.status, "ready");
    assert.equal(qa.target, "/work-surface");
    assert.equal(qa.fileFormat, "jpg");
    assert.equal(qa.invariants.localDraftPreviewVisible, true);
    assert.equal(qa.invariants.expectedOutputVisible, true);
    assert.equal(qa.invariants.contextToUseVisible, true);
    assert.equal(qa.invariants.skillRouteVisible, true);
    assert.equal(qa.invariants.lockedExecutionVisible, true);
    assert.equal(qa.invariants.emptyStateVisible, true);
    assert.equal(qa.invariants.blockedStateVisible, true);
    assert.equal(qa.invariants.reviewNeededStateVisible, true);
    assert.equal(qa.invariants.previewConfirmationFlowVisible, true);
    assert.equal(qa.invariants.intentMatchVisible, true);
    assert.equal(qa.invariants.needsChangesVisible, true);
    assert.equal(qa.invariants.holdVisible, true);
    assert.equal(qa.invariants.previewChecklistVisible, true);
    assert.equal(qa.invariants.coreWorkSurfaceSubstrateClosed, true);
    assert.equal(qa.invariants.noLiveSubmission, true);
    assert.equal(qa.invariants.noModelCall, true);
    assert.equal(qa.invariants.noToolCliMcpExecution, true);
    assert.equal(qa.invariants.noConnectorActivation, true);
    assert.equal(qa.invariants.noExternalNetworkSend, true);
    assert.equal(qa.invariants.noApprovalWrite, true);
    assert.equal(qa.invariants.noInstallUpdateRollback, true);
    assert.equal(qa.invariants.noDurableMemoryPromotion, true);
    assert.equal(qa.invariants.noScript, true);
    assert.equal(qa.invariants.noForm, true);
    assert.equal(qa.invariants.noExternalLinks, true);
    assert.equal(qa.invariants.noHorizontalOverflow, true);
    assert.equal(qa.checks.length, 2);
    assert.equal(qa.checks.every((check) => check.localDraftPreviewVisible), true);
    assert.equal(qa.checks.every((check) => check.localDraftSections.includes("expected-output")), true);
    assert.equal(qa.checks.every((check) => check.localDraftSections.includes("locked-state")), true);
    assert.equal(qa.checks.every((check) => check.productStates.includes("empty")), true);
    assert.equal(qa.checks.every((check) => check.productStates.includes("blocked")), true);
    assert.equal(qa.checks.every((check) => check.productStates.includes("review-needed")), true);
    assert.equal(qa.checks.every((check) => check.previewConfirmationFlowVisible), true);
    assert.equal(qa.checks.every((check) => check.previewDecisions.includes("intent-match")), true);
    assert.equal(qa.checks.every((check) => check.previewDecisions.includes("needs-changes")), true);
    assert.equal(qa.checks.every((check) => check.previewDecisions.includes("hold")), true);
    assert.equal(qa.checks.every((check) => check.previewChecklistVisible), true);
    assert.equal(qa.checks.every((check) => check.noHorizontalOverflow), true);
    assert.equal(qa.checks.every((check) => !check.hasScript && !check.hasForm), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("live submission"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("model call"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("durable memory promotion"), true);
    assert.equal(screenshots.every((bytes) => bytes[0] === 0xff && bytes[1] === 0xd8), true);
    assert.match(qaDoc, /Work Surface Local Draft Preview QA/);
    assert.match(qaDoc, /work-surface-local-draft-preview-2026-07-09-desktop-viewport-1440x960\.jpg/);
    assert.match(qaDoc, /work-surface-local-draft-preview-2026-07-09-mobile-viewport-390x844\.jpg/);
  });

  it("keeps approval preview UX visual QA evidence replayable and preview-only", () => {
    const qa = JSON.parse(readFileSync(CONTROL_APPROVAL_PREVIEW_QA_JSON, "utf8"));
    const qaDoc = readFileSync(CONTROL_APPROVAL_PREVIEW_QA_DOC, "utf8");
    const verifyDoc = readFileSync(VERIFY_DOC_PATH, "utf8");
    const screenshotPaths = Object.values(qa.evidenceFiles);
    const screenshots = screenshotPaths.map((filePath) => readFileSync(filePath));
    const focusedChecks = qa.checks.filter((check) => check.id.endsWith("focused"));

    assert.equal(qa.schema, "gpao_t.control_center_approval_preview_ux_qa.v0_1");
    assert.equal(qa.status, "ready");
    assert.equal(qa.target, "/control-center#panel-approval-preview");
    assert.equal(qa.fileFormat, "png");
    assert.equal(qa.invariants.previewOnly, true);
    assert.equal(qa.invariants.noApprovalRecordWrite, true);
    assert.equal(qa.invariants.noDryRunInvocation, true);
    assert.equal(qa.invariants.noCommandOrFileMutation, true);
    assert.equal(qa.invariants.noTauriBuild, true);
    assert.equal(qa.invariants.noDependencyInstall, true);
    assert.equal(qa.invariants.noInstallUpdateRollback, true);
    assert.equal(qa.invariants.noIpcExternalNetwork, true);
    assert.equal(qa.invariants.noConnectorModelToolActivation, true);
    assert.equal(qa.invariants.noScript, true);
    assert.equal(qa.invariants.noForm, true);
    assert.equal(qa.invariants.noExternalActivation, true);
    assert.equal(qa.invariants.noHorizontalOverflow, true);
    assert.equal(qa.invariants.authorityBoundaryVisible, true);
    assert.equal(qa.invariants.nextSafeActionVisible, true);
    assert.equal(qa.invariants.mobileFixedTopbarActionLineVisible, true);
    assert.equal(qa.checks.length, 4);
    assert.equal(qa.checks.every((check) => check.nonblankViewport), true);
    assert.equal(qa.checks.every((check) => check.approvalPanelVisible), true);
    assert.equal(qa.checks.every((check) => check.stageCount === 5), true);
    assert.equal(qa.checks.every((check) => check.lockedCount === 10), true);
    assert.equal(qa.checks.every((check) => check.safeNoteVisible), true);
    assert.equal(qa.checks.every((check) => check.nextSafeActionVisible), true);
    assert.equal(qa.checks.every((check) => check.noHorizontalOverflow), true);
    assert.equal(qa.checks.every((check) => !check.hasScript && !check.hasForm), true);
    assert.equal(qa.checks.every((check) => check.externalLinks.length === 0), true);
    assert.equal(qa.checks.every((check) => check.understandsPreviewOnly), true);
    assert.equal(qa.checks.every((check) => check.hasKoreanBlockedLabels), true);
    assert.equal(qa.checks.every((check) => check.blockedToneCalm), true);
    assert.equal(focusedChecks.length, 2);
    assert.equal(focusedChecks.every((check) => check.approvalPanelInViewport), true);
    assert.equal(focusedChecks.every((check) => check.stageLabels.join(" / ") === "계획 / 프리뷰 / 승인 범위 / 기록 위치 / 쓰기 게이트"), true);
    assert.equal(focusedChecks.every((check) => check.stageSteps.join("") === "12345"), true);
    assert.equal(focusedChecks.every((check) => check.safeNoteText.includes("아직 실행된 것은 없음")), true);
    assert.equal(focusedChecks.every((check) => check.firstLocked.includes("승인 기록 쓰기")), true);
    assert.equal(focusedChecks.every((check) => check.lastLocked.includes("커넥터/모델/도구 활성화")), true);
    assert.equal(qa.checks.some((check) => check.id === "mobile-viewport" && check.topbarActionVisible), true);
    assert.equal(qa.checks.some((check) => check.id === "mobile-focused" && check.topbarActionVisible), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("approval record write"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("connector/model/tool activation"), true);
    assert.equal(screenshotPaths.every((filePath) => existsSync(filePath)), true);
    assert.equal(screenshots.every((bytes) => bytes[0] === 0x89 && bytes[1] === 0x50), true);
    assert.match(qaDoc, /Control Center Approval Preview UX QA/);
    assert.match(qaDoc, /아직 실행된 것은 없음/);
    assert.match(qaDoc, /control-center-approval-preview-ux-2026-07-09-desktop-focused-1440x960\.png/);
    assert.match(qaDoc, /control-center-approval-preview-ux-2026-07-09-mobile-focused-390x844\.png/);
    assert.match(verifyDoc, /control-center-approval-preview-ux-qa-2026-07-09\.json/);
    assert.match(verifyDoc, /아직 실행된 것은 없음/);
    assert.match(verifyDoc, /mobile fixed topbar action line/);
  });

  it("keeps the GPAO-T design reference gate visual QA evidence replayable", () => {
    const qa = JSON.parse(readFileSync(DESIGN_REFERENCE_GATE_QA_JSON, "utf8"));
    const qaDoc = readFileSync(DESIGN_REFERENCE_GATE_QA_DOC, "utf8");
    const verifyDoc = readFileSync(VERIFY_DOC_PATH, "utf8");
    const screenshotPaths = Object.values(qa.evidenceFiles);
    const screenshots = screenshotPaths.map((relativePath) => readFileSync(join(ROOT, relativePath)));

    assert.equal(qa.schema, "gpao_t.design_reference_gate_visual_qa.v0_1");
    assert.equal(qa.status, "ready");
    assert.equal(qa.target, "/control-center#panel-design-reference");
    assert.equal(qa.fileFormat, "png");
    assert.equal(qa.appliedSurfaces.includes("Control Center Design Reference panel"), true);
    assert.equal(qa.invariants.designReferenceGateVisible, true);
    assert.equal(qa.invariants.codexLevelUxVisible, true);
    assert.equal(qa.invariants.claudeCodeAuthorityUxVisible, true);
    assert.equal(qa.invariants.koreanDefaultUiLanguage, true);
    assert.equal(qa.invariants.noActualApprovalRecordWrite, true);
    assert.equal(qa.invariants.noActualAuditWrite, true);
    assert.equal(qa.invariants.noDryRunInvocation, true);
    assert.equal(qa.invariants.noToolCliMcpExecution, true);
    assert.equal(qa.invariants.noConnectorActivation, true);
    assert.equal(qa.invariants.noCredentialAccess, true);
    assert.equal(qa.invariants.noExternalSend, true);
    assert.equal(qa.invariants.noPaidOrDestructiveAction, true);
    assert.equal(qa.invariants.noDurableMemoryPromotion, true);
    assert.equal(qa.invariants.noScript, true);
    assert.equal(qa.invariants.noHorizontalOverflow, true);
    assert.equal(qa.invariants.mobileTopbarActionLineVisible, true);
    assert.equal(qa.evidenceRequirements.length, 10);
    assert.equal(qa.reportFields.length, 7);
    assert.equal(qa.checks.length, 4);
    assert.equal(qa.checks.every((check) => check.nonblankViewport), true);
    assert.equal(qa.checks.every((check) => check.designReferencePanelVisible), true);
    assert.equal(qa.checks.every((check) => check.referenceAxisCount === 5), true);
    assert.equal(qa.checks.every((check) => check.evidenceRequirementCount === 10), true);
    assert.equal(qa.checks.every((check) => check.nextSafeActionVisible), true);
    assert.equal(qa.checks.every((check) => check.authorityBoundaryVisible), true);
    assert.equal(qa.checks.every((check) => check.noHorizontalOverflow), true);
    assert.equal(qa.checks.every((check) => !check.hasScript), true);
    assert.equal(qa.colorQuality.status, "acceptable_baseline");
    assert.equal(qa.layoutRhythm.status, "acceptable_baseline");
    assert.equal(qa.iconAlignment.status, "limited_existing_icon_system");
    assert.equal(qa.koreanTypographyLineBreak.status, "acceptable_baseline");
    assert.equal(qa.toneAndMannerConsistency.status, "ready_for_next_slice");
    assert.equal(qa.codexLevelFit.includes("work/chat rhythm"), true);
    assert.equal(qa.claudeCodeLevelFit.includes("permission"), true);
    assert.equal(qa.userPerceivedProductQualityRisk.status, "watch");
    assert.equal(screenshotPaths.every((filePath) => existsSync(join(ROOT, filePath))), true);
    assert.equal(screenshots.every((bytes) => bytes[0] === 0x89 && bytes[1] === 0x50), true);
    assert.match(qaDoc, /GPAO-T Design Reference Gate QA/);
    assert.match(qaDoc, /Codex급 시각\/대화 UX/);
    assert.match(qaDoc, /Claude Code급 운영\/권한 UX/);
    assert.match(verifyDoc, /design-reference-gate-qa-2026-07-09\.json/);
    assert.match(verifyDoc, /GPAO-T design reference gate/);
  });

  it("keeps design realization pass 001 visual evidence and scores replayable", () => {
    const qa = JSON.parse(readFileSync(DESIGN_REALIZATION_PASS_001_QA_JSON, "utf8"));
    const qaDoc = readFileSync(DESIGN_REALIZATION_PASS_001_QA_DOC, "utf8");
    const verifyDoc = readFileSync(VERIFY_DOC_PATH, "utf8");
    const screenshotPaths = Object.values(qa.evidenceFiles);
    const screenshots = screenshotPaths.map((relativePath) => readFileSync(join(ROOT, relativePath)));

    assert.equal(qa.schema, "gpao_t.design_realization_pass_001_visual_qa.v0_1");
    assert.equal(qa.status, "ready");
    assert.equal(qa.scope, "GPAO-T Design Reference Realization Pass 001");
    assert.equal(qa.fileFormat, "png");
    assert.equal(qa.appliedScreens.includes("Control Center Work Surface panel"), true);
    assert.equal(qa.appliedScreens.includes("Work Surface"), true);
    assert.equal(qa.appliedScreens.includes("Execution Approval / Approval Record Write UX surfaces inside Work Surface"), true);
    assert.equal(qa.appliedDesignTokens.background, "#F5F7F2");
    assert.equal(qa.appliedDesignTokens.primary, "#1F7A64");
    assert.equal(qa.appliedDesignTokens.blue, "#2E6DAE");
    assert.equal(qa.appliedDesignTokens.amber, "#A86F1D");
    assert.equal(qa.appliedDesignTokens.red, "#A9473F");
    assert.equal(qa.appliedDesignTokens.violet, "#6E5AA8");
    assert.equal(qa.visualAdjustments.some((item) => item.includes("raw icon names")), true);
    assert.equal(qa.checks.length, 4);
    assert.equal(qa.checks.every((check) => check.nonblankViewport), true);
    assert.equal(qa.checks.every((check) => check.noHorizontalOverflow), true);
    assert.equal(qa.checks.every((check) => check.authorityBoundaryVisible), true);
    assert.equal(qa.checks.every((check) => check.nextSafeActionVisible), true);
    assert.ok(qa.scores.humanVisualQa >= 4);
    assert.ok(qa.scores.visualPolish >= 4);
    assert.ok(qa.scores.colorQuality >= 4);
    assert.ok(qa.scores.layoutRhythm >= 4);
    assert.ok(qa.scores.koreanTypography >= 4);
    assert.ok(qa.scores.toneAndManner >= 4);
    assert.equal(qa.blockedActionsRemainClosed.includes("actual approval record write"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("audit write"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("tool/CLI/MCP execution"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("durable memory promotion"), true);
    assert.equal(screenshotPaths.every((relativePath) => existsSync(join(ROOT, relativePath))), true);
    assert.equal(screenshots.every((bytes) => bytes[0] === 0x89 && bytes[1] === 0x50), true);
    assert.match(qaDoc, /Human visual QA: 4\.2/);
    assert.match(qaDoc, /All required categories are 4\.0 or higher/);
    assert.match(verifyDoc, /design-realization-pass-001-qa-2026-07-09\.json/);
    assert.match(verifyDoc, /human visual QA 4\.2/);
  });

  it("keeps design realization pass 002 visual evidence and product thresholds replayable", () => {
    const qa = JSON.parse(readFileSync(DESIGN_REALIZATION_PASS_002_QA_JSON, "utf8"));
    const qaDoc = readFileSync(DESIGN_REALIZATION_PASS_002_QA_DOC, "utf8");
    const verifyDoc = readFileSync(VERIFY_DOC_PATH, "utf8");
    const evidencePaths = [
      ...Object.values(qa.afterEvidence),
      qa.openDesign.desktopScreenshot,
      qa.openDesign.mobileScreenshot,
    ];
    const screenshots = evidencePaths.map((relativePath) => readFileSync(join(ROOT, relativePath)));

    assert.equal(qa.schema, "gpao_t.design_realization_pass_002_visual_qa.v0_1");
    assert.equal(qa.status, "ready");
    assert.equal(qa.scope, "GPAO-T Design Realization Pass 002");
    assert.equal(qa.openDesign.projectId, "gpao-t-design-realization-pass-002");
    assert.match(qa.openDesign.previewUrl, /gpao-t-design-realization-pass-002/);
    assert.equal(qa.appliedScreens.includes("Control Center Execution Approval panel"), true);
    assert.equal(qa.appliedScreens.includes("Work Surface main task thread"), true);
    assert.equal(qa.visualAdjustments.some((item) => item.includes("cli.dry_run")), true);
    assert.equal(qa.visualAdjustments.some((item) => item.includes("Korean product language")), true);
    assert.equal(qa.checks.length, 4);
    assert.equal(qa.checks.every((check) => check.nonblankViewport), true);
    assert.equal(qa.checks.every((check) => check.noHorizontalOverflow), true);
    assert.equal(qa.checks.every((check) => !check.hasScript && !check.hasForm), true);
    assert.equal(qa.checks.every((check) => check.externalLinks.length === 0), true);
    assert.equal(qa.checks.every((check) => check.nextSafeActionVisible), true);
    assert.equal(qa.checks.every((check) => check.authorityBoundaryVisible), true);
    assert.equal(qa.checks.every((check) => check.koreanProductLanguageVisible), true);
    assert.equal(qa.checks.every((check) => check.rawPrimaryLabelsVisible === false), true);
    assert.ok(qa.scores.visualPolish >= qa.thresholds.visualPolish);
    assert.ok(qa.scores.colorQuality >= qa.thresholds.colorQuality);
    assert.ok(qa.scores.koreanTypography >= qa.thresholds.koreanTypography);
    assert.ok(qa.scores.toneAndManner >= qa.thresholds.toneAndManner);
    assert.ok(qa.scores.authorityClarity >= qa.thresholds.authorityClarity);
    assert.ok(qa.scores.overallProductFeel >= qa.thresholds.overallProductFeel);
    assert.equal(qa.invariants.noScript, true);
    assert.equal(qa.invariants.noExternalActivation, true);
    assert.equal(qa.invariants.noModelCall, true);
    assert.equal(qa.invariants.noConnectorToolActivation, true);
    assert.equal(qa.invariants.noApprovalWriteExpansion, true);
    assert.equal(qa.blockedActionsRemainClosed.includes("dry-run invocation"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("tool/CLI/MCP execution"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("durable memory promotion"), true);
    assert.equal(evidencePaths.every((relativePath) => existsSync(join(ROOT, relativePath))), true);
    assert.equal(screenshots.every((bytes) => bytes[0] === 0x89 && bytes[1] === 0x50), true);
    assert.match(qaDoc, /Design Realization Pass 002 QA/);
    assert.match(qaDoc, /all requested thresholds passed/);
    assert.match(qaDoc, /Open Design project/);
    assert.match(verifyDoc, /design-realization-pass-002-qa-2026-07-09\.json/);
    assert.match(verifyDoc, /visual polish >= 4\.4/);
    assert.match(verifyDoc, /primary UI does not expose raw labels/);
  });

  it("keeps execution approval UX visual QA evidence replayable and execution-free", () => {
    const qa = JSON.parse(readFileSync(EXECUTION_APPROVAL_QA_JSON, "utf8"));
    const qaDoc = readFileSync(EXECUTION_APPROVAL_QA_DOC, "utf8");
    const verifyDoc = readFileSync(VERIFY_DOC_PATH, "utf8");
    const screenshotPaths = Object.values(qa.evidenceFiles);
    const screenshots = screenshotPaths.map((relativePath) => readFileSync(join(ROOT, relativePath)));

    assert.equal(qa.schema, "gpao_t.execution_approval_ux_qa.v0_1");
    assert.equal(qa.status, "ready");
    assert.equal(qa.fileFormat, "png");
    assert.equal(qa.invariants.executionProposalVisible, true);
    assert.equal(qa.invariants.approvalPacketValidationVisible, true);
    assert.equal(qa.invariants.auditWriteDesignOnly, true);
    assert.equal(qa.invariants.koreanDefaultStatusLanguage, true);
    assert.equal(qa.invariants.authorityLevelsHaveIconColorLabelDescription, true);
    assert.equal(qa.invariants.noActualToolCliMcpExecution, true);
    assert.equal(qa.invariants.noConnectorActivation, true);
    assert.equal(qa.invariants.noExternalNetworkSend, true);
    assert.equal(qa.invariants.noCredentialReadWrite, true);
    assert.equal(qa.invariants.noPaidAction, true);
    assert.equal(qa.invariants.noDestructiveAction, true);
    assert.equal(qa.invariants.noApprovalRecordWrite, true);
    assert.equal(qa.invariants.noDurableMemoryPromotion, true);
    assert.equal(qa.invariants.noScript, true);
    assert.equal(qa.invariants.noForm, true);
    assert.equal(qa.invariants.noHorizontalOverflow, true);
    assert.equal(qa.invariants.mobileTopbarActionLineVisible, true);
    assert.deepEqual(qa.authorityLabels, [
      "읽기 전용",
      "미리보기만",
      "저장 전 확인",
      "외부 전송 전 확인",
      "되돌리기 어려움",
      "비용 발생 가능",
    ]);
    assert.equal(qa.checks.length, 4);
    assert.equal(qa.checks.every((check) => check.nonblankViewport), true);
    assert.equal(qa.checks.every((check) => check.noHorizontalOverflow), true);
    assert.equal(qa.checks.every((check) => !check.hasScript && !check.hasForm), true);
    assert.equal(qa.checks.every((check) => check.externalLinks.length === 0), true);
    assert.equal(qa.checks.some((check) => check.id === "work-surface-mobile"
      && check.topbarActionUsesShortKoreanProductLanguage
      && check.composerLockUsesShortKoreanProductLanguage), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("approval record write"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("audit write"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("actual tool execution"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("credential read/write"), true);
    assert.equal(screenshotPaths.every((relativePath) => existsSync(join(ROOT, relativePath))), true);
    assert.equal(screenshots.every((bytes) => bytes[0] === 0x89 && bytes[1] === 0x50), true);
    assert.match(qaDoc, /Execution Approval UX QA/);
    assert.match(qaDoc, /의도 확인 · 수정\/보류 선택 · 실행 없음/);
    assert.match(qaDoc, /외부 행동 없음 · 도구 실행 없음 · 모델 연결 실행 없음/);
    assert.match(qaDoc, /execution-approval-ux-2026-07-09-work-surface-mobile-390x844\.png/);
    assert.match(verifyDoc, /execution-approval-ux-qa-2026-07-09\.json/);
    assert.match(verifyDoc, /읽기 전용/);
    assert.match(verifyDoc, /비용 발생 가능/);
  });

  it("keeps audit write design visual QA evidence replayable and write-free", () => {
    const qa = JSON.parse(readFileSync(AUDIT_WRITE_DESIGN_QA_JSON, "utf8"));
    const qaDoc = readFileSync(AUDIT_WRITE_DESIGN_QA_DOC, "utf8");
    const verifyDoc = readFileSync(VERIFY_DOC_PATH, "utf8");
    const screenshotPaths = Object.values(qa.evidenceFiles);
    const screenshots = screenshotPaths.map((relativePath) => readFileSync(join(ROOT, relativePath)));

    assert.equal(qa.schema, "gpao_t.audit_write_design_visual_qa.v0_1");
    assert.equal(qa.status, "ready");
    assert.equal(qa.scope, "audit_write_design_proof_only");
    assert.equal(qa.fileFormat, "png");
    assert.deepEqual(qa.requiredAuditTargets, [
      "proposal_id",
      "source",
      "requested_action",
      "authority_level",
      "expected_effect",
      "risk",
      "rollback_reference",
      "user_confirmation_state",
    ]);
    assert.deepEqual(qa.koreanLabels, [
      "제안 ID",
      "출처",
      "요청 행동",
      "권한 단계",
      "예상 효과",
      "위험",
      "되돌리기 기준",
      "사용자 확인",
    ]);
    assert.equal(qa.invariants.auditTargetFieldsVisible, true);
    assert.equal(qa.invariants.plannedAuditItemsVisible, true);
    assert.equal(qa.invariants.controlCenterShowsRecordedLaterLanguage, true);
    assert.equal(qa.invariants.workSurfaceShowsRecordedLaterLanguage, true);
    assert.equal(qa.invariants.noActualAuditWrite, true);
    assert.equal(qa.invariants.noApprovalRecordWrite, true);
    assert.equal(qa.invariants.noDryRunInvocation, true);
    assert.equal(qa.invariants.noActualToolCliMcpExecution, true);
    assert.equal(qa.invariants.noConnectorActivation, true);
    assert.equal(qa.invariants.noExternalNetworkSend, true);
    assert.equal(qa.invariants.noCredentialReadWrite, true);
    assert.equal(qa.invariants.noPaidAction, true);
    assert.equal(qa.invariants.noDestructiveAction, true);
    assert.equal(qa.invariants.noDurableMemoryPromotion, true);
    assert.equal(qa.invariants.noScript, true);
    assert.equal(qa.invariants.noForm, true);
    assert.equal(qa.invariants.noHorizontalOverflow, true);
    assert.equal(qa.checks.length, 4);
    assert.equal(qa.checks.every((check) => check.nonblankViewport), true);
    assert.equal(qa.checks.every((check) => check.auditPanelVisible), true);
    assert.equal(qa.checks.every((check) => check.plannedAuditItemsVisible), true);
    assert.equal(qa.checks.every((check) => check.noHorizontalOverflow), true);
    assert.equal(qa.checks.every((check) => !check.hasScript && !check.hasForm), true);
    assert.equal(qa.checks.every((check) => check.externalLinks.length === 0), true);
    assert.equal(qa.checks.some((check) => check.id === "control-center-mobile" && check.topbarActionVisible), true);
    assert.equal(qa.checks.some((check) => check.id === "work-surface-mobile" && check.topbarActionVisible), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("audit write"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("approval record write"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("dry-run invocation"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("credential read/write"), true);
    assert.equal(screenshotPaths.every((relativePath) => existsSync(join(ROOT, relativePath))), true);
    assert.equal(screenshots.every((bytes) => bytes[0] === 0x89 && bytes[1] === 0x50), true);
    assert.match(qaDoc, /Audit Write Design QA/);
    assert.match(qaDoc, /기록 예정 항목/);
    assert.match(qaDoc, /사용자 확인/);
    assert.match(verifyDoc, /audit-write-design-qa-2026-07-09\.json/);
    assert.match(verifyDoc, /기록 예정 항목/);
  });

  it("keeps approval record write UX visual QA evidence replayable and write-free", () => {
    const qa = JSON.parse(readFileSync(APPROVAL_RECORD_WRITE_UX_QA_JSON, "utf8"));
    const qaDoc = readFileSync(APPROVAL_RECORD_WRITE_UX_QA_DOC, "utf8");
    const verifyDoc = readFileSync(VERIFY_DOC_PATH, "utf8");
    const screenshotPaths = Object.values(qa.evidenceFiles);
    const screenshots = screenshotPaths.map((relativePath) => readFileSync(join(ROOT, relativePath)));

    assert.equal(qa.schema, "gpao_t.approval_record_write_ux_visual_qa.v0_1");
    assert.equal(qa.status, "ready");
    assert.equal(qa.scope, "approval_record_write_ux_design_only");
    assert.equal(qa.fileFormat, "png");
    assert.deepEqual(qa.requiredRecordFields, [
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
    assert.equal(qa.koreanLabels.includes("승인 기록 저장 전 확인"), true);
    assert.equal(qa.koreanLabels.includes("저장될 항목 미리보기"), true);
    assert.equal(qa.koreanLabels.includes("쓰기 잠금"), true);
    assert.equal(qa.invariants.approvalRecordFlowVisible, true);
    assert.equal(qa.invariants.approvalRecordPreviewItemsVisible, true);
    assert.equal(qa.invariants.designReferencesApplied, true);
    assert.equal(qa.invariants.codexLevelWorkUxApplied, true);
    assert.equal(qa.invariants.claudeCodeLevelAuthorityUxApplied, true);
    assert.equal(qa.invariants.noActualApprovalRecordWrite, true);
    assert.equal(qa.invariants.noApprovalDirectoryCreate, true);
    assert.equal(qa.invariants.noApprovalStoreRead, true);
    assert.equal(qa.invariants.noActualAuditWrite, true);
    assert.equal(qa.invariants.noDryRunInvocation, true);
    assert.equal(qa.invariants.noActualToolCliMcpExecution, true);
    assert.equal(qa.invariants.noConnectorActivation, true);
    assert.equal(qa.invariants.noExternalNetworkSend, true);
    assert.equal(qa.invariants.noCredentialReadWrite, true);
    assert.equal(qa.invariants.noPaidAction, true);
    assert.equal(qa.invariants.noDestructiveAction, true);
    assert.equal(qa.invariants.noDurableMemoryPromotion, true);
    assert.equal(qa.invariants.noScript, true);
    assert.equal(qa.invariants.noForm, true);
    assert.equal(qa.invariants.noHorizontalOverflow, true);
    assert.equal(qa.checks.length, 8);
    assert.equal(qa.checks.every((check) => check.nonblankViewport), true);
    assert.equal(qa.checks.every((check) => check.noHorizontalOverflow), true);
    assert.equal(qa.checks.filter((check) => check.screenshotKind === "full_page")
      .every((check) => check.approvalRecordFlowVisible && check.approvalRecordPreviewItemsVisible), true);
    assert.equal(qa.checks.some((check) => check.id === "control-center-mobile" && check.topbarActionVisible), true);
    assert.equal(qa.checks.some((check) => check.id === "work-surface-mobile" && check.topbarActionVisible), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("approval record write"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("approval directory create"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("approval store read"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("audit write"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("dry-run invocation"), true);
    assert.equal(qa.blockedActionsRemainClosed.includes("credential read/write"), true);
    assert.equal(screenshotPaths.every((relativePath) => existsSync(join(ROOT, relativePath))), true);
    assert.equal(screenshots.every((bytes) => bytes[0] === 0x89 && bytes[1] === 0x50), true);
    assert.match(qaDoc, /Approval Record Write UX QA/);
    assert.match(qaDoc, /승인 기록 저장 전 확인/);
    assert.match(qaDoc, /저장될 항목 미리보기/);
    assert.match(qaDoc, /Codex-level work\/chat UX/);
    assert.match(verifyDoc, /approval-record-write-ux-qa-2026-07-09\.json/);
    assert.match(verifyDoc, /승인 기록 저장 전 확인/);
    assert.match(verifyDoc, /쓰기 잠금/);
  });

  it("serves the static Control Center over loopback and verifies page content", async () => {
    const root = tempRoot();
    const preview = await startControlCenterPreviewServer({
      root,
      now: "2026-07-08T00:04:00.000Z",
    });

    try {
      const health = await fetchJson(`http://127.0.0.1:${preview.port}/health`);
      const page = await fetchText(preview.url);
      const workSurface = await fetchText(`http://127.0.0.1:${preview.port}/work-surface`);
      const workSurfaceState = await fetchJson(`http://127.0.0.1:${preview.port}/work-surface/state`);
      const workSurfaceVerify = await fetchJson(`http://127.0.0.1:${preview.port}/work-surface/verify`);
      const workSurfaceSubmissionGate = await fetchJson(`http://127.0.0.1:${preview.port}/work-surface/submission-gate`);
      const workSurfaceSubmissionGateVerify = await fetchJson(`http://127.0.0.1:${preview.port}/work-surface/submission-gate/verify`);
      const workSurfaceSubmissionValidationGate = await fetchJson(
        `http://127.0.0.1:${preview.port}/work-surface/submission-validation-gate`,
      );
      const workSurfaceSubmissionValidationGateVerify = await fetchJson(
        `http://127.0.0.1:${preview.port}/work-surface/submission-validation-gate/verify`,
      );
      const appShell = await fetchText(`http://127.0.0.1:${preview.port}/app-shell`);
      const appShellContract = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/contract`);
      const appShellState = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/state`);
      const appShellVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/verify`);
      const tauriGate = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-gate`);
      const tauriGateVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-gate/verify`);
      const tauriInstallGate = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-install-gate`);
      const tauriInstallGateVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-install-gate/verify`);
      const tauriPrerequisiteDoctor = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-prerequisite-doctor`);
      const tauriPrerequisiteDoctorVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-prerequisite-doctor/verify`);
      const tauriDryRunContract = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-dry-run-contract`);
      const tauriDryRunContractVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-dry-run-contract/verify`);
      const tauriDryRunDesign = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-dry-run-design`);
      const tauriDryRunDesignVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-dry-run-design/verify`);
      const tauriDryRunPlan = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-dry-run-plan`);
      const tauriDryRunPlanVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-dry-run-plan/verify`);
      const tauriDryRunPreview = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-dry-run-preview`);
      const tauriDryRunPreviewVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-dry-run-preview/verify`);
      const tauriDryRunInvocationApproval = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-dry-run-invocation-approval`);
      const tauriDryRunInvocationApprovalVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-dry-run-invocation-approval/verify`);
      const tauriDryRunApprovalStorage = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-dry-run-approval-storage`);
      const tauriDryRunApprovalStorageVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-dry-run-approval-storage/verify`);
      const tauriDryRunApprovalWriteGate = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-dry-run-approval-write-gate`);
      const tauriDryRunApprovalWriteGateVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-dry-run-approval-write-gate/verify`);
      const packagedDesktopReview = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/packaged-desktop-review`);
      const packagedDesktopReviewVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/packaged-desktop-review/verify`);
      const tauriShell = await fetchText(`http://127.0.0.1:${preview.port}/app-shell/tauri-shell`);
      const tauriShellSlice = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-shell/slice`);
      const tauriShellVerify = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell/tauri-shell/verify`);
      const controlSummary = await fetchJson(`http://127.0.0.1:${preview.port}/control-center/summary`);
      const designReferenceGate = await fetchJson(`http://127.0.0.1:${preview.port}/control-center/design-reference-gate`);
      const designReferenceGateVerify = await fetchJson(
        `http://127.0.0.1:${preview.port}/control-center/design-reference-gate/verify`,
      );
      const localRecordResult = await fetchJson(`http://127.0.0.1:${preview.port}/work-surface/execution-flow/record`, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          request: "브라우저에서 로컬 승인/감사 기록만 남겨줘",
          confirmationChoice: "matches_intent",
          confirmationState: "confirmed_for_local_record_only",
        }),
      });
      const blockedPost = await fetchJson(`http://127.0.0.1:${preview.port}/app-shell`, { method: "POST" });

      assert.equal(preview.schema, "gpao_t.control_center_preview_server.v0_1");
      assert.equal(preview.status, "serving");
      assert.match(preview.url, /^http:\/\/127\.0\.0\.1:\d+\/control-center$/);
      assert.equal(preview.contract.authorityBoundary.loopbackOnly, true);
      assert.equal(preview.contract.authorityBoundary.startsPersistentDaemon, false);
      assert.equal(health.status, 200);
      assert.equal(health.body.status, "ready");
      assert.equal(page.status, 200);
      assert.match(page.body, /GPAO-T Local Control Center/);
      assert.match(page.body, /data-core-work-surface="interactive-local"/);
      assert.match(page.body, /다음 안전 행동/);
      assert.doesNotMatch(page.body, /<script/i);
      assert.equal(workSurface.status, 200);
      assert.match(workSurface.body, /GPAO-T 작업 대시보드/);
      assert.match(workSurface.body, /data-composer-state="local-submission-enabled"/);
      assert.doesNotMatch(workSurface.body, /<script/i);
      assert.match(workSurface.body, /data-local-confirmation-form="approval-audit-record"/);
      assert.match(workSurface.body, /method="post" action="\/work-surface\/execution-flow\/record"/);
      assert.equal(workSurfaceState.body.schema, "gpao_t.core_work_surface.v0_1");
      assert.equal(workSurfaceVerify.body.status, "ready");
      assert.equal(workSurfaceSubmissionGate.body.schema, "gpao_t.work_surface_submission_decision_gate.v0_1");
      assert.equal(workSurfaceSubmissionGate.body.gateMode, "design_only_no_live_submission");
      assert.equal(workSurfaceSubmissionGate.body.authorityBoundary.userCanSubmitLiveNow, false);
      assert.equal(workSurfaceSubmissionGateVerify.body.status, "ready");
      assert.equal(
        workSurfaceSubmissionValidationGate.body.schema,
        "gpao_t.work_surface_submission_validation_confirmation_gate.v0_1",
      );
      assert.equal(workSurfaceSubmissionValidationGate.body.gateMode, "final_pre_submit_preview_only");
      assert.equal(workSurfaceSubmissionValidationGate.body.confirmationCard.confirmAction.opensLiveSubmission, false);
      assert.equal(workSurfaceSubmissionValidationGate.body.stopRuleAfterThisGate.rule, "do_not_split_submission_meta_gates_further");
      assert.equal(workSurfaceSubmissionValidationGateVerify.body.status, "ready");
      assert.equal(designReferenceGate.status, 200);
      assert.equal(designReferenceGate.body.schema, "gpao_t.design_reference_gate.v0_1");
      assert.equal(designReferenceGate.body.evidenceRequirements.length, 10);
      assert.equal(designReferenceGateVerify.body.status, "ready");
      assert.equal(localRecordResult.status, 200);
      assert.equal(localRecordResult.body.status, "written_local_only");
      assert.equal(localRecordResult.body.writeResult.boundaryState.toolCliMcpExecution, false);
      assert.equal(localRecordResult.body.writeResult.boundaryState.externalSend, false);
      assert.equal(appShell.status, 200);
      assert.match(appShell.body, /GPAO-T 로컬 작업 화면/);
      assert.doesNotMatch(appShell.body, /<script/i);
      assert.equal(appShellContract.body.schema, "gpao_t.browser_local_app_shell_contract.v0_1");
      assert.equal(appShellState.body.schema, "gpao_t.browser_local_app_shell_state.v0_1");
      assert.equal(appShellVerify.body.status, "ready");
      assert.equal(tauriGate.body.schema, "gpao_t.tauri_packaged_desktop_gate.v0_1");
      assert.equal(tauriGateVerify.body.status, "ready");
      assert.equal(tauriInstallGate.body.schema, "gpao_t.tauri_install_update_rollback_readiness_gate.v0_1");
      assert.equal(tauriInstallGate.body.executionMode, "readiness_review_only");
      assert.equal(tauriInstallGate.body.authorityBoundary.installExecution, "blocked");
      assert.equal(tauriInstallGateVerify.body.status, "ready");
      assert.equal(tauriPrerequisiteDoctor.body.schema, "gpao_t.tauri_install_prerequisite_doctor.v0_1");
      assert.equal(tauriPrerequisiteDoctor.body.executionMode, "inspection_only_no_install_no_build");
      assert.equal(tauriPrerequisiteDoctorVerify.body.status, "ready");
      assert.equal(tauriDryRunContract.body.schema, "gpao_t.tauri_install_dry_run_executor_contract.v0_1");
      assert.equal(tauriDryRunContract.body.executionMode, "contract_only_no_dry_run_execution");
      assert.equal(tauriDryRunContract.body.dryRunGate.executorInvoked, false);
      assert.equal(tauriDryRunContractVerify.body.status, "ready");
      assert.equal(tauriDryRunDesign.body.schema, "gpao_t.tauri_install_dry_run_implementation_design.v0_1");
      assert.equal(tauriDryRunDesign.body.implementationStatus, "design_only");
      assert.equal(tauriDryRunDesign.body.executorBoundary.executorImplemented, false);
      assert.equal(tauriDryRunDesignVerify.body.status, "ready");
      assert.equal(tauriDryRunPlan.body.schema, "gpao_t.tauri_install_dry_run_plan.v0_1");
      assert.equal(tauriDryRunPlan.body.executionMode, "plan_only_not_invoked");
      assert.equal(tauriDryRunPlan.body.safetyInvariants.invokesDryRunExecutor, false);
      assert.equal(tauriDryRunPlan.body.operationPlans.every((plan) => plan.executionStatus === "planned_not_executed"), true);
      assert.equal(tauriDryRunPlanVerify.body.status, "ready");
      assert.equal(tauriDryRunPreview.body.schema, "gpao_t.tauri_install_dry_run_preview.v0_1");
      assert.equal(tauriDryRunPreview.body.previewKind, "user_visible_preview_only");
      assert.equal(tauriDryRunPreview.body.executionMode, "not_invoked");
      assert.equal(tauriDryRunPreview.body.summary.approvalRequiredBeforeInvocation, true);
      assert.equal(tauriDryRunPreviewVerify.body.status, "ready");
      assert.equal(tauriDryRunInvocationApproval.body.schema, "gpao_t.tauri_install_dry_run_invocation_approval_contract.v0_1");
      assert.equal(tauriDryRunInvocationApproval.body.contractMode, "approval_contract_only_no_invocation");
      assert.equal(tauriDryRunInvocationApproval.body.invocationStatus, "not_invoked");
      assert.equal(tauriDryRunInvocationApproval.body.approvalScope.approvalRequiredBeforeInvocation, true);
      assert.equal(tauriDryRunInvocationApproval.body.safetyInvariants.invokesDryRunExecutor, false);
      assert.equal(tauriDryRunInvocationApprovalVerify.body.status, "ready");
      assert.equal(tauriDryRunApprovalStorage.body.schema, "gpao_t.tauri_install_dry_run_approval_record_storage_design.v0_1");
      assert.equal(tauriDryRunApprovalStorage.body.designMode, "storage_design_only_no_record_write_no_invocation");
      assert.equal(tauriDryRunApprovalStorage.body.storageLocation.writesApprovalRecordNow, false);
      assert.equal(tauriDryRunApprovalStorage.body.writeGateBoundary.approvalRecordWriteAllowedNow, false);
      assert.equal(tauriDryRunApprovalStorage.body.safetyInvariants.invokesDryRunExecutor, false);
      assert.equal(tauriDryRunApprovalStorageVerify.body.status, "ready");
      assert.equal(tauriDryRunApprovalWriteGate.body.schema, "gpao_t.tauri_install_dry_run_approval_record_write_gate_design.v0_1");
      assert.equal(tauriDryRunApprovalWriteGate.body.designMode, "write_gate_design_only_no_record_write_no_invocation");
      assert.equal(tauriDryRunApprovalWriteGate.body.writeGateBoundary.approvalRecordWriteAllowedNow, false);
      assert.equal(tauriDryRunApprovalWriteGate.body.writeGateBoundary.writeGateImplemented, false);
      assert.equal(tauriDryRunApprovalWriteGate.body.safetyInvariants.invokesDryRunExecutor, false);
      assert.equal(tauriDryRunApprovalWriteGateVerify.body.status, "ready");
      assert.equal(packagedDesktopReview.body.schema, "gpao_t.packaged_desktop_planning_review.v0_1");
      assert.equal(packagedDesktopReview.body.status, "ready");
      assert.equal(packagedDesktopReview.body.readinessDecision.packagedDesktopBuild, "not_allowed_yet");
      assert.equal(packagedDesktopReview.body.returnToUserFacingCoreTiming.decision, "return_after_this_review");
      assert.equal(packagedDesktopReviewVerify.body.status, "ready");
      assert.equal(tauriShell.status, 200);
      assert.match(tauriShell.body, /GPAO-T Read-Mostly Tauri Shell/);
      assert.match(tauriShell.body, /data-mobile-action-line="visible"/);
      assert.doesNotMatch(tauriShell.body, /<script/i);
      assert.equal(tauriShellSlice.body.schema, "gpao_t.tauri_readonly_shell_slice.v0_1");
      assert.equal(tauriShellVerify.body.status, "ready");
      assert.equal(controlSummary.body.schema, "gpao_t.control_center_summary.v0_1");
      assert.equal(controlSummary.body.panels.some((panel) => panel.id === "approval-preview"), true);
      assert.equal(controlSummary.body.authorityBoundary.approvalRecordWrite, "local_jsonl_only");
      assert.equal(controlSummary.body.authorityBoundary.dryRunInvocation, "blocked");
      assert.equal(blockedPost.status, 405);
      assert.equal(blockedPost.body.status, "blocked");
      assert.equal(blockedPost.body.reason, "browser_local_app_shell_first_slice_is_get_only");
    } finally {
      await preview.close();
    }
  });

  it("runs serving smoke verification through function and CLI without leaving a server running", async () => {
    const root = tempRoot();
    const verification = await verifyControlCenterPreviewServing({
      root,
      now: "2026-07-08T00:05:00.000Z",
    });
    const cliOutput = execFileSync(process.execPath, [CLI, "control", "serve-check"], {
      cwd: tempRoot(),
      encoding: "utf8",
    });
    const cliVerification = JSON.parse(cliOutput);

    assert.equal(verification.schema, "gpao_t.control_center_serving_verification.v0_1");
    assert.equal(verification.status, "ready");
    assert.equal(verification.findings.length, 0);
    assert.equal(verification.healthStatus, 200);
    assert.equal(verification.workSurfaceStatus, 200);
    assert.equal(verification.workSurfaceStateStatus, 200);
    assert.equal(verification.pageStatus, 200);
    assert.equal(verification.appShellStatus, 200);
    assert.equal(verification.tauriGateStatus, 200);
    assert.equal(verification.tauriPrerequisiteDoctorStatus, 200);
    assert.equal(verification.tauriDryRunContractStatus, 200);
    assert.equal(verification.tauriDryRunDesignStatus, 200);
    assert.equal(verification.tauriDryRunPlanStatus, 200);
    assert.equal(verification.tauriDryRunPreviewStatus, 200);
    assert.equal(verification.tauriDryRunInvocationApprovalStatus, 200);
    assert.equal(verification.tauriDryRunApprovalStorageStatus, 200);
    assert.equal(verification.tauriDryRunApprovalWriteGateStatus, 200);
    assert.equal(verification.packagedDesktopReviewStatus, 200);
    assert.equal(verification.tauriShellSliceStatus, 200);
    assert.equal(verification.blockedPostStatus, 405);
    assert.equal(verification.authorityBoundary.loopbackOnly, true);
    assert.equal(cliVerification.status, "ready");
    assert.equal(cliVerification.findings.length, 0);
  });
});

async function fetchText(url) {
  const response = await fetch(url);
  return {
    status: response.status,
    body: await response.text(),
  };
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  return {
    status: response.status,
    body: await response.json(),
  };
}
