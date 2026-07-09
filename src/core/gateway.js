import { listModelAdapters, listToolAdapters } from "./adapter-boundary.js";
import {
  buildConnectorGovernanceSummary,
  buildConnectorToolGovernance,
  listConnectors,
  reviewConnectorPermission,
  verifyConnectorToolGovernance,
} from "./connector-governance.js";
import {
  buildCoreWorkSurface,
  verifyCoreWorkSurface,
} from "./core-work-surface.js";
import {
  buildWorkSurfaceSubmissionDecisionGate,
  verifyWorkSurfaceSubmissionDecisionGate,
} from "./work-surface-submission-gate.js";
import {
  buildWorkSurfaceSubmissionValidationGate,
  verifyWorkSurfaceSubmissionValidationGate,
} from "./work-surface-submission-validation-gate.js";
import {
  buildWorkSurfaceExecutionConfirmationControl,
  buildWorkSurfaceExecutionFlow,
  recordWorkSurfaceExecutionFlow,
  verifyWorkSurfaceExecutionFlow,
} from "./work-surface-execution-flow.js";
import { buildControlCenterSnapshot, buildControlCenterSummary } from "./control-center.js";
import {
  buildControlCenterUiContract,
  buildControlCenterUiSnapshot,
  validateControlCenterUiSnapshot,
} from "./control-center-ui-contract.js";
import {
  buildPackagedDesktopPlanningReview,
  buildTauriPackagedDesktopGate,
  verifyPackagedDesktopPlanningReview,
  verifyTauriPackagedDesktopGate,
} from "./tauri-packaged-desktop-gate.js";
import {
  buildTauriInstallReadinessGate,
  verifyTauriInstallReadinessGate,
} from "./tauri-install-readiness-gate.js";
import {
  buildTauriInstallDryRunPlan,
  buildTauriInstallDryRunApprovalRecordStorageDesign,
  buildTauriInstallDryRunApprovalRecordWriteGateDesign,
  buildTauriInstallDryRunExecutorContract,
  buildTauriInstallDryRunImplementationDesign,
  buildTauriInstallDryRunInvocationApprovalContract,
  buildTauriInstallPrerequisiteDoctor,
  renderTauriInstallDryRunPreview,
  verifyTauriInstallDryRunPlan,
  verifyTauriInstallDryRunApprovalRecordStorageDesign,
  verifyTauriInstallDryRunApprovalRecordWriteGateDesign,
  verifyTauriInstallDryRunExecutorContract,
  verifyTauriInstallDryRunImplementationDesign,
  verifyTauriInstallDryRunInvocationApprovalContract,
  verifyTauriInstallDryRunPreview,
  verifyTauriInstallPrerequisiteDoctor,
} from "./tauri-install-execution-contracts.js";
import {
  buildTauriReadOnlyShellHtml,
  buildTauriReadOnlyShellSlice,
  verifyTauriReadOnlyShellSlice,
} from "./tauri-readonly-shell.js";
import {
  buildGpaoTDesignReferenceGate,
  buildLocalControlCenterDesignContract,
  verifyGpaoTDesignReferenceGate,
} from "./design-contract.js";
import {
  buildApprovalAuditLocalRecordSubstrate,
  buildApprovalAuditReplay,
  readApprovalRecords,
  readAuditRecords,
  verifyApprovalAuditLocalRecordSubstrate,
  writeApprovalAuditLocalRecords,
} from "./approval-audit-records.js";
import {
  buildApprovalRecordWriteUxDesign,
  buildAuditWriteDesignProof,
  buildExecutionApprovalPreview,
  verifyApprovalRecordWriteUxDesign,
  verifyAuditWriteDesignProof,
  verifyExecutionApprovalPreview,
} from "./execution-approval.js";
import {
  buildFirstLocalWorkLoop,
  verifyFirstLocalWorkLoop,
} from "./first-local-work-loop.js";
import { runDoctor } from "./doctor.js";
import {
  appendSelfGrowthProposal,
  buildSelfGrowthProposal,
  readSelfGrowthProposals,
} from "./growth-proposals.js";
import {
  appendGrowthApplicationGate,
  buildGrowthApplicationGate,
  buildGrowthApplicationGateSummary,
  readGrowthApplicationGates,
} from "./growth-application-gates.js";
import {
  appendInstallHardeningReport,
  buildInstallHardeningReport,
  buildInstallHardeningSummary,
  readInstallHardeningReports,
} from "./install-hardening.js";
import {
  buildStages5To8Completion,
  verifyStages5To8Completion,
  verifyTeamAlphaPackage,
  writeTeamAlphaPackage,
} from "./production-completion.js";
import { captureMemoryEntry, readMemoryWiki, readTCellCandidates, resolveContextMesh } from "./memory-wiki.js";
import {
  buildModelRouterBoundary,
  buildModelRouterPolicy,
  verifyModelRouterBoundary,
  verifyModelRouterPolicy,
} from "./model-router.js";
import {
  buildModelInvocationPacket,
  buildModelProviderRegistry,
  invokeModelLocally,
  verifyModelInvocation,
} from "./model-invocation.js";
import {
  buildExecutionRuntimePlan,
  inspectReadOnlyConnector,
  invokeExecutionRuntimeDryRun,
  verifyExecutionRuntimeInvocation,
  verifyExecutionRuntimePlan,
} from "./execution-runtime.js";
import {
  applySessionWorkspaceAction,
  readSessionWorkspaceState,
  verifySessionWorkspaceBehavior,
} from "./session-workspace.js";
import {
  appendReplayRecoveryRecord,
  buildRecoveryHistorySummary,
  readReplayRecoveryHistory,
} from "./replay-history.js";
import { buildReplayRecoveryView } from "./replay-recovery.js";
import {
  buildStage4ProductionHardening,
  verifyStage4ProductionHardening,
} from "./stage-4-production-hardening.js";
import { runRuntimeTurn } from "./runtime.js";
import {
  appendSkillExecutionRun,
  buildSkillExecutionRun,
  buildSkillExecutionSummary,
  readSkillExecutionHistory,
} from "./skill-execution-adapter.js";
import {
  buildSkillBuildQueue,
  buildSkillCandidateAtlas,
  buildSkillProductionRoadmap,
  buildSkillProductionStatus,
} from "./skill-ecosystem.js";
import { initializeRuntimeState, readAuditEvents, readRuntimeState } from "./storage.js";

export function handleGatewayRequest({ method = "GET", path = "/", body = {}, root } = {}) {
  const normalizedMethod = method.toUpperCase();

  if (normalizedMethod === "GET" && path === "/health") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: runDoctor({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/init") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: initializeRuntimeState({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/state") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readRuntimeState({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/events") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readAuditEvents({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/memory") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readMemoryWiki({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/tcells") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readTCellCandidates({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/control-center") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildControlCenterSnapshot({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/control-center/summary") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildControlCenterSummary({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/work-surface/state") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildCoreWorkSurface({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/work-surface/verify") {
    const surface = buildCoreWorkSurface({ root });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyCoreWorkSurface({ surface }),
    };
  }

  if (normalizedMethod === "GET" && path === "/sessions") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readSessionWorkspaceState({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/sessions/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifySessionWorkspaceBehavior({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/sessions/action") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: applySessionWorkspaceAction({
        root,
        action: body.action,
        sessionId: body.sessionId,
        title: body.title,
        request: body.request,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/work-surface/submission-gate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildWorkSurfaceSubmissionDecisionGate({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/work-surface/submission-gate/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyWorkSurfaceSubmissionDecisionGate({
        gate: buildWorkSurfaceSubmissionDecisionGate({ root }),
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/work-surface/submission-validation-gate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildWorkSurfaceSubmissionValidationGate({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/work-surface/submission-validation-gate/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyWorkSurfaceSubmissionValidationGate({
        gate: buildWorkSurfaceSubmissionValidationGate({ root }),
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/work-surface/execution-flow") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildWorkSurfaceExecutionFlow({
        root,
        request: body.request,
        confirmationChoice: body.confirmationChoice,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/work-surface/execution-flow/confirmation") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildWorkSurfaceExecutionConfirmationControl({
        proposal: body.proposal,
        confirmationChoice: body.confirmationChoice,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/work-surface/execution-flow/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyWorkSurfaceExecutionFlow({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/work-surface/execution-flow/record") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: recordWorkSurfaceExecutionFlow({
        root,
        request: body.request,
        proposal: body.proposal,
        confirmationChoice: body.confirmationChoice,
        confirmationState: body.confirmationState,
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/work-surface/local-loop") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildFirstLocalWorkLoop({
        root,
        request: body.request,
        sourceSurface: body.sourceSurface || "/work-surface",
        confirmationState: body.confirmationState || "confirmed_for_local_record_only",
        writeLocalRecords: body.writeLocalRecords !== false,
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/work-surface/local-loop/verify") {
    const loop = buildFirstLocalWorkLoop({
      root,
      request: body.request,
      sourceSurface: body.sourceSurface || "/work-surface",
      confirmationState: body.confirmationState || "confirmed_for_local_record_only",
      writeLocalRecords: body.writeLocalRecords !== false,
    });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyFirstLocalWorkLoop({ loop }),
    };
  }

  if (normalizedMethod === "GET" && path === "/control-center/design") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildLocalControlCenterDesignContract(),
    };
  }

  if (normalizedMethod === "GET" && path === "/control-center/design-reference-gate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildGpaoTDesignReferenceGate(),
    };
  }

  if (normalizedMethod === "GET" && path === "/control-center/design-reference-gate/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyGpaoTDesignReferenceGate(),
    };
  }

  if (normalizedMethod === "GET" && path === "/control-center/ui-contract") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildControlCenterUiContract(),
    };
  }

  if (normalizedMethod === "GET" && path === "/control-center/ui-snapshot") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildControlCenterUiSnapshot({
        snapshot: buildControlCenterSnapshot({ root }),
        designContract: buildLocalControlCenterDesignContract(),
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/control-center/ui-validate") {
    const uiSnapshot = buildControlCenterUiSnapshot({
      snapshot: buildControlCenterSnapshot({ root }),
      designContract: buildLocalControlCenterDesignContract(),
    });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: validateControlCenterUiSnapshot({ uiSnapshot }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-gate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildTauriPackagedDesktopGate(),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/production-hardening") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildStage4ProductionHardening({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/production-hardening/verify") {
    const state = buildStage4ProductionHardening({ root });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyStage4ProductionHardening({ state }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-gate/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyTauriPackagedDesktopGate(),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/packaged-desktop-review") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildPackagedDesktopPlanningReview(),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/packaged-desktop-review/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyPackagedDesktopPlanningReview({
        review: buildPackagedDesktopPlanningReview(),
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-install-gate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildTauriInstallReadinessGate({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-install-gate/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyTauriInstallReadinessGate({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-prerequisite-doctor") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildTauriInstallPrerequisiteDoctor({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-prerequisite-doctor/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyTauriInstallPrerequisiteDoctor({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-dry-run-contract") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildTauriInstallDryRunExecutorContract({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-dry-run-contract/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyTauriInstallDryRunExecutorContract({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-dry-run-design") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildTauriInstallDryRunImplementationDesign({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-dry-run-design/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyTauriInstallDryRunImplementationDesign({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-dry-run-plan") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildTauriInstallDryRunPlan({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-dry-run-plan/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyTauriInstallDryRunPlan({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-dry-run-preview") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: renderTauriInstallDryRunPreview({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-dry-run-preview/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyTauriInstallDryRunPreview({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-dry-run-invocation-approval") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildTauriInstallDryRunInvocationApprovalContract({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-dry-run-invocation-approval/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyTauriInstallDryRunInvocationApprovalContract({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-dry-run-approval-storage") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildTauriInstallDryRunApprovalRecordStorageDesign({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-dry-run-approval-storage/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyTauriInstallDryRunApprovalRecordStorageDesign({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-dry-run-approval-write-gate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildTauriInstallDryRunApprovalRecordWriteGateDesign({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-dry-run-approval-write-gate/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyTauriInstallDryRunApprovalRecordWriteGateDesign({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-shell/slice") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildTauriReadOnlyShellSlice({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-shell") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildTauriReadOnlyShellHtml({
        state: buildTauriReadOnlyShellSlice({ root }),
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/app-shell/tauri-shell/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyTauriReadOnlyShellSlice({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/connectors") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: listConnectors(),
    };
  }

  if (normalizedMethod === "GET" && path === "/production/stages-5-8") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildStages5To8Completion({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/production/stages-5-8/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyStages5To8Completion({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/production/team-alpha-package") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeTeamAlphaPackage({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/production/team-alpha-package/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyTeamAlphaPackage({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/connectors/governance") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildConnectorGovernanceSummary(),
    };
  }

  if (normalizedMethod === "GET" && path === "/connectors/tool-governance") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildConnectorToolGovernance(),
    };
  }

  if (normalizedMethod === "GET" && path === "/connectors/tool-governance/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyConnectorToolGovernance(),
    };
  }

  if (normalizedMethod === "GET" && path === "/connectors/execution-runtime") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildExecutionRuntimePlan({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/connectors/execution-runtime/verify") {
    const plan = buildExecutionRuntimePlan({ root });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyExecutionRuntimePlan({ plan }),
    };
  }

  if (normalizedMethod === "GET" && path === "/connectors/execution-runtime/invoke-dry-run") {
    const commandId = body.commandId || "model-invocation-check";
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: invokeExecutionRuntimeDryRun({
        root,
        commandId,
        approval: {
          confirmed: true,
          commandId,
          authorityTier: "dry_run",
          allowMutation: false,
        },
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/connectors/execution-runtime/invocation/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyExecutionRuntimeInvocation({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/connectors/read-only-inspect") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: inspectReadOnlyConnector({
        root,
        connectorId: body.connectorId || "local.filesystem",
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/approval/execution-proposal") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildExecutionApprovalPreview(),
    };
  }

  if (normalizedMethod === "GET" && path === "/approval/execution-proposal/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyExecutionApprovalPreview(),
    };
  }

  if (normalizedMethod === "GET" && path === "/approval/audit-write-design") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildAuditWriteDesignProof(),
    };
  }

  if (normalizedMethod === "GET" && path === "/approval/audit-write-design/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyAuditWriteDesignProof(),
    };
  }

  if (normalizedMethod === "GET" && path === "/approval/approval-record-write-ux") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildApprovalRecordWriteUxDesign(),
    };
  }

  if (normalizedMethod === "GET" && path === "/approval/approval-record-write-ux/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyApprovalRecordWriteUxDesign(),
    };
  }

  if (normalizedMethod === "GET" && path === "/approval/local-record-substrate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildApprovalAuditLocalRecordSubstrate({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/approval/local-record-substrate/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyApprovalAuditLocalRecordSubstrate({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/approval/local-records/write") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeApprovalAuditLocalRecords({
        root,
        proposal: body.proposal,
        request: body.request,
        confirmationState: body.confirmationState,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/approval/local-records") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readApprovalRecords({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/approval/local-audit-records") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readAuditRecords({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/approval/local-records/replay") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildApprovalAuditReplay({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/connectors/review") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: reviewConnectorPermission(body),
    };
  }

  if (normalizedMethod === "GET" && path === "/adapters/models") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: listModelAdapters(),
    };
  }

  if (normalizedMethod === "GET" && path === "/adapters/tools") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: listToolAdapters(),
    };
  }

  if (normalizedMethod === "GET" && path === "/adapters/model-router-boundary") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildModelRouterBoundary(),
    };
  }

  if (normalizedMethod === "GET" && path === "/adapters/model-router-boundary/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyModelRouterBoundary(),
    };
  }

  if (normalizedMethod === "GET" && path === "/adapters/model-router-policy") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildModelRouterPolicy(),
    };
  }

  if (normalizedMethod === "GET" && path === "/adapters/model-router-policy/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyModelRouterPolicy(),
    };
  }

  if (normalizedMethod === "GET" && path === "/adapters/model-providers") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildModelProviderRegistry(),
    };
  }

  if (normalizedMethod === "GET" && path === "/adapters/model-invocation") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildModelInvocationPacket({
        request: body.request,
        providerId: body.providerId,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/adapters/model-invocation/local") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: invokeModelLocally({
        request: body.request,
        providerId: body.providerId || "local.deterministic",
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/adapters/model-invocation/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyModelInvocation(),
    };
  }

  if (normalizedMethod === "POST" && path === "/adapters/plan") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: runRuntimeTurn({ ...body, root }).adapterPlan,
    };
  }

  if (normalizedMethod === "POST" && path === "/memory/capture") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: captureMemoryEntry({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/mesh/resolve") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: resolveContextMesh({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/turn") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: runRuntimeTurn({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/skill/atlas") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildSkillCandidateAtlas(body),
    };
  }

  if (normalizedMethod === "GET" && path === "/skill/roadmap") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildSkillProductionRoadmap(),
    };
  }

  if (normalizedMethod === "GET" && path === "/skill/build-queue") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildSkillBuildQueue(body),
    };
  }

  if (normalizedMethod === "GET" && path === "/skill/production-status") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildSkillProductionStatus(body),
    };
  }

  if (normalizedMethod === "POST" && path === "/skill/execute") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildSkillExecutionRun({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/skill/execute/record") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendSkillExecutionRun({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/skill/execution-history") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readSkillExecutionHistory({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/skill/execution-summary") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildSkillExecutionSummary({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/replay/recovery") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildReplayRecoveryView({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/replay/record") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendReplayRecoveryRecord({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/recovery/history") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readReplayRecoveryHistory({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/recovery/summary") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildRecoveryHistorySummary({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/growth/propose") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendSelfGrowthProposal({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/growth/preview") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildSelfGrowthProposal({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/growth/proposals") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readSelfGrowthProposals({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/growth/application-gate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildGrowthApplicationGate({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/growth/application-gate/record") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendGrowthApplicationGate({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/growth/application-gates") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readGrowthApplicationGates({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/growth/application-gates/summary") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildGrowthApplicationGateSummary({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/ops/install-hardening") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildInstallHardeningReport({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/ops/install-hardening/record") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendInstallHardeningReport({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/ops/install-hardening/history") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readInstallHardeningReports({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/ops/install-hardening/summary") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildInstallHardeningSummary({ root }),
    };
  }

  return {
    schema: "gpao_t.gateway_response.v0_1",
    status: 404,
    body: {
      error: "not_found",
      nextSafeAction: "Use GET /health, POST /init, GET /state, GET /events, GET /memory, GET /tcells, GET /control-center, GET /control-center/summary, GET /control-center/design, GET /control-center/design-reference-gate, GET /control-center/design-reference-gate/verify, GET /control-center/ui-contract, GET /control-center/ui-snapshot, GET /control-center/ui-validate, GET /app-shell/tauri-install-gate, GET /app-shell/tauri-install-gate/verify, GET /app-shell/tauri-prerequisite-doctor, GET /app-shell/tauri-prerequisite-doctor/verify, GET /app-shell/tauri-dry-run-contract, GET /app-shell/tauri-dry-run-contract/verify, GET /app-shell/tauri-dry-run-design, GET /app-shell/tauri-dry-run-design/verify, GET /app-shell/tauri-dry-run-plan, GET /app-shell/tauri-dry-run-plan/verify, GET /app-shell/tauri-dry-run-preview, GET /app-shell/tauri-dry-run-preview/verify, GET /app-shell/tauri-dry-run-invocation-approval, GET /app-shell/tauri-dry-run-invocation-approval/verify, GET /app-shell/tauri-dry-run-approval-storage, GET /app-shell/tauri-dry-run-approval-storage/verify, GET /app-shell/tauri-dry-run-approval-write-gate, GET /app-shell/tauri-dry-run-approval-write-gate/verify, GET /connectors, GET /connectors/governance, GET /connectors/tool-governance, GET /connectors/tool-governance/verify, GET /approval/execution-proposal, GET /approval/execution-proposal/verify, GET /approval/audit-write-design, GET /approval/audit-write-design/verify, GET /approval/approval-record-write-ux, GET /approval/approval-record-write-ux/verify, POST /connectors/review, GET /adapters/models, GET /adapters/tools, POST /adapters/plan, POST /memory/capture, POST /mesh/resolve, GET /skill/atlas, GET /skill/roadmap, GET /skill/build-queue, GET /skill/production-status, POST /skill/execute, POST /skill/execute/record, GET /skill/execution-history, GET /skill/execution-summary, POST /replay/recovery, POST /replay/record, GET /recovery/history, GET /recovery/summary, POST /growth/preview, POST /growth/propose, GET /growth/proposals, POST /growth/application-gate, POST /growth/application-gate/record, GET /growth/application-gates, GET /growth/application-gates/summary, GET /ops/install-hardening, POST /ops/install-hardening/record, GET /ops/install-hardening/history, GET /ops/install-hardening/summary, or POST /turn.",
    },
  };
}
