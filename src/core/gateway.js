import { fileURLToPath } from "node:url";
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
import {
  buildGpaoTWorkspaceShell,
  buildGpaoTWorkspaceShellHtml,
  verifyGpaoTWorkspaceShell,
} from "./workspace-shell.js";
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
import {
  readGpaoTOsTurnRecords,
  runGpaoTOsTurn,
  verifyGpaoTOsTurn,
} from "./first-real-os-turn-pipeline.js";
import {
  buildGpaoTFirstCompletionAudit,
  verifyGpaoTFirstCompletionAudit,
  writeGpaoTFirstCompletionEvidence,
} from "./first-completion.js";
import {
  buildAppliedReplayInspectorState,
  buildAppliedContextMeshReplay,
  verifyAppliedReplayInspectorState,
  verifyAppliedContextMeshReplay,
} from "./context-mesh-replay.js";
import { runDoctor } from "./doctor.js";
import {
  buildDoctorRecoveryHeart,
  verifyDoctorRecoveryHeart,
} from "./doctor-recovery-heart.js";
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
  buildOwnerOpsAutomationCandidates,
  buildOwnerOpsAuthorityMatrix,
  buildOwnerOpsEffectReplay,
  buildOwnerOpsFieldCasebook,
  buildOwnerOpsFirstScenarios,
  buildOwnerOpsSkillPack,
  buildOwnerOpsWorkflowPreview,
  readOwnerOpsRecords,
  verifyOwnerOpsPack,
  writeOwnerOpsLocalRecord,
} from "./owner-ops.js";
import {
  buildOwnerOpsConnectorCatalog,
  buildOwnerOpsMcpPlan,
  buildOwnerOpsMcpToolManifest,
  verifyOwnerOpsMcpReadiness,
} from "./owner-ops-connectors.js";
import {
  buildOwnerOpsMcpServerDescriptor,
  verifyOwnerOpsMcpServer,
} from "./owner-ops-mcp-server.js";
import {
  buildOwnerOpsReadOnlyIntakePlan,
  previewOwnerOpsFolderIntake,
  previewOwnerOpsLocalFileIntake,
  previewOwnerOpsPasteIntake,
  previewOwnerOpsTableTextIntake,
  verifyOwnerOpsReadOnlyIntakeConnectors,
} from "./owner-ops-intake-connectors.js";
import {
  buildOwnerOpsFirstOwnerScenarioFixture,
  runOwnerOpsFirstOwnerScenario,
  verifyOwnerOpsFirstOwnerScenario,
} from "./owner-ops-scenarios.js";
import {
  buildOwnerOpsMarketListingDraft,
  buildOwnerOpsPluginPackageManifest,
  verifyOwnerOpsPluginPackage,
} from "./owner-ops-package.js";
import {
  buildOwnerOpsOwnerFacingUxCopy,
  buildOwnerOpsTeamAlphaGuide,
  verifyOwnerOpsTeamAlphaReadiness,
} from "./owner-ops-alpha.js";
import {
  buildOwnerOpsAlphaFeedbackForm,
  buildOwnerOpsHostIntegrationMatrix,
  buildOwnerOpsHostRegistrationGuide,
  verifyOwnerOpsHostAlphaHandoff,
  verifyOwnerOpsHostIntegrationMatrix,
} from "./owner-ops-alpha-handoff.js";
import {
  buildOwnerOpsFirstOwnerBetaHandoffBundle,
  buildOwnerOpsFirstOwnerBetaOperationalTestPackage,
  buildOwnerOpsTeamAlphaHandoffBundle,
  verifyOwnerOpsFirstOwnerBetaHandoffBundle,
  verifyOwnerOpsFirstOwnerBetaOperationalTestPackage,
  verifyOwnerOpsTeamAlphaHandoffBundle,
  writeOwnerOpsFirstOwnerBetaHandoffBundle,
  writeOwnerOpsFirstOwnerBetaOperationalTestPackage,
  writeOwnerOpsTeamAlphaHandoffBundle,
} from "./owner-ops-team-alpha-package.js";
import {
  buildOwnerOpsFirstOwnerBetaGuide,
  buildOwnerOpsSampleDataKit,
  verifyOwnerOpsFirstOwnerBetaReadiness,
} from "./owner-ops-beta.js";
import {
  buildOwnerOpsBetaFeedbackActionQueue,
  buildOwnerOpsBetaFeedbackSynthesis,
  buildOwnerOpsFieldTestActionQueue,
  buildOwnerOpsFieldTestLedger,
  buildOwnerOpsFieldTestRepairCompletionEvidence,
  buildOwnerOpsFirstOwnerBetaResultReview,
  buildOwnerOpsIndustryTemplateCatalog,
  buildOwnerOpsMarketEvidenceBundle,
  buildOwnerOpsMarketReadinessGate,
  appendOwnerOpsFieldTestRecord,
  readOwnerOpsFieldTestRecords,
  verifyOwnerOpsBetaFeedbackActionQueue,
  verifyOwnerOpsFieldTestActionQueue,
  verifyOwnerOpsFieldTestLedger,
  verifyOwnerOpsFieldTestRepairCompletionEvidence,
  verifyOwnerOpsFirstOwnerBetaResultReview,
  verifyOwnerOpsMarketEvidenceBundle,
  verifyOwnerOpsMarketReadiness,
  writeOwnerOpsBetaFeedbackActionQueue,
  writeOwnerOpsFieldTestActionQueue,
  writeOwnerOpsFieldTestRepairCompletionEvidence,
  writeOwnerOpsFirstOwnerBetaResultReview,
  writeOwnerOpsMarketEvidenceBundle,
} from "./owner-ops-market-readiness.js";
import {
  buildOwnerOpsPrePublicEvidenceBridge,
  buildOwnerOpsPrePublicPackageReview,
  buildOwnerOpsPrePublicRepairBacklog,
  buildOwnerOpsPrePublicRepairCompletionEvidence,
  buildOwnerOpsPrivacyCopyPack,
  buildOwnerOpsTemplateReplayFixtures,
  verifyOwnerOpsPrePublicEvidenceBridge,
  verifyOwnerOpsPrePublicPackage,
  verifyOwnerOpsPrePublicRepairBacklog,
  verifyOwnerOpsPrePublicRepairCompletionEvidence,
  writeOwnerOpsPrePublicRepairBacklog,
  writeOwnerOpsPrePublicRepairCompletionEvidence,
} from "./owner-ops-public-package.js";
import {
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
  buildOwnerOpsProductionReadyDecisionPacket,
  buildOwnerOpsInternalProductionOwnerDecision,
  buildOwnerOpsInternalProductionNextAction,
  buildOwnerOpsPublicReleaseAuthorityGate,
  buildOwnerOpsPublicReleaseReadbackSnapshot,
  buildOwnerOpsApprovedSigningLane,
  buildOwnerOpsMarketplaceUploadApprovalGate,
  buildOwnerOpsMarketplaceUploadDecisionLane,
  buildOwnerOpsReleaseReadinessEvidence,
  buildOwnerOpsSignedPackageEvidence,
  appendOwnerOpsDryRunApprovalRecord,
  appendOwnerOpsBroaderOwnerTestingResult,
  appendOwnerOpsInternalProductionOwnerDecisionRecord,
  appendOwnerOpsHumanReviewDecisionRecord,
  appendOwnerOpsMarketplaceUploadDecisionRecord,
  invokeOwnerOpsControlledDryRun,
  readOwnerOpsControlledDryRunInvocations,
  readOwnerOpsBroaderOwnerTestingResults,
  readOwnerOpsDryRunApprovalRecords,
  readOwnerOpsInternalProductionOwnerDecisionRecords,
  readOwnerOpsHumanReviewDecisionRecords,
  readOwnerOpsMarketplaceUploadDecisionRecords,
  readOwnerOpsInternalProductionPackage,
  writeOwnerOpsHumanReviewApprovalPacket,
  writeOwnerOpsBroaderOwnerTestingHandoff,
  writeOwnerOpsBroaderOwnerTestingRepairCompletionEvidence,
  writeOwnerOpsBroaderOwnerTestingRepairQueue,
  writeOwnerOpsInstallUpdateRollbackProof,
  writeOwnerOpsDeploymentDryRunPlan,
  writeOwnerOpsDryRunApprovalRecordDesign,
  writeOwnerOpsDryRunResultReviewHandoff,
  writeOwnerOpsDryRunExecutorProof,
  writeOwnerOpsInternalProductionPackage,
  writeOwnerOpsNextOwnerTestingLoop,
  writeOwnerOpsProductionReadyDecisionPacket,
  writeOwnerOpsReleaseReadinessEvidence,
  writeOwnerOpsSignedPackageEvidence,
  verifyOwnerOpsArchiveChecksumDryRun,
  verifyOwnerOpsBroaderOwnerTestingHandoff,
  verifyOwnerOpsBroaderOwnerTestingResultLedger,
  verifyOwnerOpsBroaderOwnerTestingRepairCompletionEvidence,
  verifyOwnerOpsBroaderOwnerTestingRepairQueue,
  verifyOwnerOpsDeploymentDryRunPlan,
  verifyOwnerOpsDryRunApprovalRecordDesign,
  verifyOwnerOpsDryRunApprovalRecordWriteLane,
  verifyOwnerOpsControlledDryRunInvocationGate,
  verifyOwnerOpsDryRunResultReviewHandoff,
  verifyOwnerOpsDryRunExecutorProof,
  verifyOwnerOpsDistributionEvidence,
  verifyOwnerOpsHumanReviewDecisionLane,
  verifyOwnerOpsHumanReviewApprovalPacket,
  verifyOwnerOpsInstallUpdateRollbackProof,
  verifyOwnerOpsPublicReleaseAuthorityGate,
  verifyOwnerOpsPublicReleaseReadbackSnapshot,
  verifyOwnerOpsApprovedSigningLane,
  verifyOwnerOpsMarketplaceUploadApprovalGate,
  verifyOwnerOpsMarketplaceUploadDecisionLane,
  verifyOwnerOpsInternalProductionPackageReadback,
  verifyOwnerOpsInternalProductionPackageWriter,
  verifyOwnerOpsNextOwnerTestingLoop,
  verifyOwnerOpsProductionReadyDecisionPacket,
  verifyOwnerOpsInternalProductionOwnerDecision,
  verifyOwnerOpsInternalProductionNextAction,
  verifyOwnerOpsReleaseReadinessEvidence,
  verifyOwnerOpsSignedPackageEvidence,
} from "./owner-ops-distribution.js";
import {
  buildOwnerOpsProductionCompletionAudit,
  buildOwnerOpsProductAxisReadinessMatrix,
  buildOwnerOpsInternalProductionReadiness,
  verifyOwnerOpsProductionCompletionAudit,
  verifyOwnerOpsProductAxisReadinessMatrix,
  verifyOwnerOpsInternalProductionReadiness,
} from "./owner-ops-product-readiness.js";
import {
  buildProductionCompletion,
  verifyProductionCompletion,
  verifyInternalProductionPackage,
  writeInternalProductionPackage,
} from "./production-completion.js";
import { captureMemoryEntry, readMemoryWiki, readTCellCandidates, resolveContextMesh } from "./memory-wiki.js";
import {
  appendMemoryApplyApprovalAuditBridge,
  appendMemoryApplyRequest,
  appendMemoryReplayEvidence,
  appendMemoryReviewCandidate,
  buildMemoryApplyApprovalAuditBridge,
  buildMemoryApplyGateState,
  buildMemoryApplyRequest,
  buildMemoryLocalApplyInvocationContract,
  buildMemoryReversibleApply,
  buildMemoryReviewQueueSummary,
  buildMemorySelfGrowthApprovalUx,
  buildReadOnlyMemoryReplay,
  invokeMemoryLocalContextMeshApply,
  invokeMemoryLocalContextMeshRollback,
  readMemoryReviewQueue,
  verifyMemoryApplyGateState,
  verifyMemoryLocalApplyInvocationContract,
  verifyMemoryReviewQueue,
  verifyMemorySelfGrowthApprovalUx,
} from "./memory-candidate-review-queue.js";
import {
  buildAutoMemoryGrowthPolicy,
  buildAutoMemoryGrowthSummary,
  classifyAutoMemoryGrowthAuthority,
  readAutoMemoryGrowthRuns,
  runAutoMemoryGrowthLoop,
  verifyAutoMemoryGrowthLoop,
} from "./auto-memory-growth-loop.js";
import {
  appendToolProgressEvent,
  buildConversationProgressLane,
  buildLiveTurnAbsorptionPolicy,
  buildLiveTurnAbsorptionSummary,
  classifyLiveTurnSource,
  readConversationProgressEvents,
  readLiveTurnAbsorptionRuns,
  runLiveTurnAbsorptionBridge,
  verifyLiveTurnAbsorptionBridge,
} from "./live-turn-absorption-bridge.js";
import {
  buildSessionEventHeart,
  verifySessionEventHeart,
} from "./session-event-heart.js";
import {
  buildOpenClawLiveTurnHookReadinessGate,
  verifyOpenClawLiveTurnHookReadinessGate,
} from "./openclaw-absorption-control.js";
import {
  buildModelRouterBoundary,
  buildModelRouterPolicy,
  verifyModelRouterBoundary,
  verifyModelRouterPolicy,
} from "./model-router.js";
import {
  buildTesterFailureGuardSummary,
  buildTimeoutBudget,
  guardExternalWriteCompletion,
  isolateHeartbeatFailures,
  sanitizeChatSendParams,
  verifyChatSendSanitizer,
  verifyExternalWriteCompletionGuard,
  verifyHeartbeatFailureIsolation,
  verifyTimeoutBudget,
} from "./tester-failure-guards.js";
import {
  buildModelInvocationPacket,
  buildModelProviderRegistry,
  invokeModelLocally,
  verifyModelInvocation,
} from "./model-invocation.js";
import {
  buildProviderAuthRepairPlan,
  inspectProviderAuthStores,
  verifyProviderAuthHeart,
} from "./provider-auth-heart.js";
import {
  buildModelConnectionSettingsState,
  renderModelConnectionSettingsHtml,
  verifyModelConnectionSettingsState,
} from "./model-connection-settings.js";
import {
  buildMemoryContextHeart,
  verifyMemoryContextHeart,
} from "./memory-context-heart.js";
import {
  buildLlmReadyPacketSurfaceState,
  buildLlmReadyTaskContextPacket,
  verifyLlmReadyTaskContextPacket,
} from "./llm-ready-task-context-packet.js";
import {
  appendAnswerReplayEvaluation,
  appendChatPreflightPacket,
  appendPostAnswerReplayRecord,
  buildAnswerReplayEvaluation,
  buildAnswerReplayMemoryCandidate,
  buildChatPreflightPacket,
  readAnswerReplayEvaluations,
  readChatPreflightPackets,
  readPostAnswerReplayRecords,
  verifyChatPreflightReplay,
} from "./chat-preflight-replay.js";
import {
  buildExecutionRuntimePlan,
  inspectReadOnlyConnector,
  invokeExecutionRuntimeDryRun,
  verifyExecutionRuntimeInvocation,
  verifyExecutionRuntimePlan,
} from "./execution-runtime.js";
import {
  buildToolAuthorityHeart,
  verifyToolAuthorityHeart,
} from "./tool-authority-heart.js";
import {
  buildRuntimeHeartHardening,
  verifyRuntimeHeartHardening,
} from "./runtime-heart-hardening.js";
import {
  applySessionWorkspaceAction,
  readSessionWorkspaceState,
  verifySessionWorkspaceBehavior,
} from "./session-workspace.js";
import {
  buildCodexStyleMultiChatWorkspace,
  verifyCodexStyleMultiChatWorkspace,
} from "./multi-chat-workspace.js";
import {
  buildMultiChatStageSixCompletion,
  buildThreadScopedMemoryReviewQueue,
  verifyMultiChatStageSixCompletion,
} from "./multi-chat-stage-six.js";
import {
  appendReplayRecoveryRecord,
  buildRecoveryHistorySummary,
  readReplayRecoveryHistory,
} from "./replay-history.js";
import { buildReplayRecoveryView } from "./replay-recovery.js";
import {
  applyRuntimeWorkspaceWelcomeSettings,
  buildRuntimeWorkspaceWelcome,
  buildRuntimeWorkspaceWelcomeDraft,
  verifyRuntimeWorkspaceWelcome,
} from "./runtime-workspace-welcome.js";
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

const DEFAULT_RUNTIME_WORKSPACE_SOURCE_PACK = fileURLToPath(new URL("../../runtime-workspace/gpao-t", import.meta.url));

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

  if (normalizedMethod === "GET" && path === "/owner-ops/skill-pack") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsSkillPack(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/field-casebook") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsFieldCasebook(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/authority-matrix") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsAuthorityMatrix(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/scenarios") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsFirstScenarios(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/candidates") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsAutomationCandidates({ request: body.request }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/workflow") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsWorkflowPreview({
        workflowType: body.workflowType,
        inputText: body.inputText,
        businessType: body.businessType,
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/record") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsLocalRecord({
        root,
        workflowType: body.workflowType,
        inputText: body.inputText,
        businessType: body.businessType,
        userDecision: body.userDecision,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/records") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readOwnerOpsRecords({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/replay") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsEffectReplay({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsPack({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/product-axis-readiness") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsProductAxisReadinessMatrix({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/product-axis-readiness/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsProductAxisReadinessMatrix({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/production-completion-audit") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsProductionCompletionAudit({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/production-completion-audit/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsProductionCompletionAudit({ root }),
    };
  }

  if (normalizedMethod === "GET" && ["/owner-ops/internal-production-readiness", "/owner-ops/supervised-testing-readiness"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsInternalProductionReadiness({ root }),
    };
  }

  if (normalizedMethod === "GET" && ["/owner-ops/internal-production-readiness/verify", "/owner-ops/supervised-testing-readiness/verify"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsInternalProductionReadiness({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/mcp-plan") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsMcpPlan(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/connector-catalog") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsConnectorCatalog(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/mcp-tools") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsMcpToolManifest(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/mcp-check") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsMcpReadiness(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/mcp-server") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsMcpServerDescriptor(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/mcp-server/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsMcpServer(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/intake-plan") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsReadOnlyIntakePlan(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/intake-paste") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: previewOwnerOpsPasteIntake({
        inputText: body.inputText,
        workflowType: body.workflowType,
        businessType: body.businessType,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/intake-table") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: previewOwnerOpsTableTextIntake({
        content: body.content,
        filename: body.filename,
        workflowType: body.workflowType,
        businessType: body.businessType,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/intake-file") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: previewOwnerOpsLocalFileIntake({
        root,
        filePath: body.filePath,
        workflowType: body.workflowType,
        businessType: body.businessType,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/intake-folder") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: previewOwnerOpsFolderIntake({
        root,
        folderPath: body.folderPath,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/intake-check") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsReadOnlyIntakeConnectors({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/first-owner-scenario") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsFirstOwnerScenarioFixture(),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/first-owner-scenario/run") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: runOwnerOpsFirstOwnerScenario({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/first-owner-scenario/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsFirstOwnerScenario({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/plugin-package") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsPluginPackageManifest(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/market-listing") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsMarketListingDraft(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/plugin-package/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsPluginPackage({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/team-alpha-guide") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsTeamAlphaGuide(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/owner-ux-copy") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsOwnerFacingUxCopy(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/team-alpha/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsTeamAlphaReadiness({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/host-registration-guide") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsHostRegistrationGuide(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/host-integration-matrix") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsHostIntegrationMatrix(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/host-integration-matrix/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsHostIntegrationMatrix(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/alpha-feedback-form") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsAlphaFeedbackForm(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/host-alpha/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsHostAlphaHandoff({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/sample-data-kit") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsSampleDataKit(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/first-owner-beta-guide") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsFirstOwnerBetaGuide(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/first-owner-beta/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsFirstOwnerBetaReadiness({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/beta-feedback-synthesis") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsBetaFeedbackSynthesis(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/industry-template-catalog") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsIndustryTemplateCatalog(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/market-readiness-gate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsMarketReadinessGate({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/market-readiness/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsMarketReadiness({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/template-replay-fixtures") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsTemplateReplayFixtures({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/privacy-copy-pack") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsPrivacyCopyPack(),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/pre-public-package-review") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsPrePublicPackageReview({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/pre-public-package/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsPrePublicPackage({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/pre-public-evidence-bridge") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsPrePublicEvidenceBridge({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/pre-public-evidence-bridge/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsPrePublicEvidenceBridge({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/pre-public-repair-backlog") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsPrePublicRepairBacklog({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/pre-public-repair-backlog") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsPrePublicRepairBacklog({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/pre-public-repair-backlog/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsPrePublicRepairBacklog({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/pre-public-repair-completion") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsPrePublicRepairCompletionEvidence({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/pre-public-repair-completion") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsPrePublicRepairCompletionEvidence({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/pre-public-repair-completion/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsPrePublicRepairCompletionEvidence({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/distribution-evidence") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsDistributionEvidence({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/distribution-readme") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsDistributionReadme({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/distribution-evidence/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsDistributionEvidence({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/archive-checksum-dry-run") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsArchiveChecksumDryRun({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/archive-checksum-dry-run/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsArchiveChecksumDryRun({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/release-readiness-evidence") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsReleaseReadinessEvidence({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/release-readiness-evidence/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsReleaseReadinessEvidence({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/release-readiness-evidence") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsReleaseReadinessEvidence({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/human-review-approval-packet") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsHumanReviewApprovalPacket({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/human-review-approval-packet") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsHumanReviewApprovalPacket({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/human-review-approval-packet/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsHumanReviewApprovalPacket({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/human-review-decision-lane") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsHumanReviewDecisionLane({
        root,
        decision: body.decision || "hold",
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/human-review-decision-append") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendOwnerOpsHumanReviewDecisionRecord({
        root,
        decision: body.decision || "hold",
        approvalToken: body.approvalToken,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/human-review-decision-records") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readOwnerOpsHumanReviewDecisionRecords({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/human-review-decision-lane/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsHumanReviewDecisionLane({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/public-release-gate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsPublicReleaseAuthorityGate({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/public-release-gate/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsPublicReleaseAuthorityGate({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/public-release-readback") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsPublicReleaseReadbackSnapshot({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/public-release-readback/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsPublicReleaseReadbackSnapshot({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/approved-signing-lane") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsApprovedSigningLane({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/approved-signing-lane/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsApprovedSigningLane({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/marketplace-upload-approval-gate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsMarketplaceUploadApprovalGate({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/marketplace-upload-approval-gate/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsMarketplaceUploadApprovalGate({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/marketplace-upload-decision-lane") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsMarketplaceUploadDecisionLane({
        root,
        decision: query.decision || "hold",
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/marketplace-upload-decision-append") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendOwnerOpsMarketplaceUploadDecisionRecord({
        root,
        decision: body.decision || "hold",
        approvalToken: body.approvalToken,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/marketplace-upload-decision-records") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readOwnerOpsMarketplaceUploadDecisionRecords({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/marketplace-upload-decision-lane/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsMarketplaceUploadDecisionLane({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/signed-package-evidence") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsSignedPackageEvidence({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/signed-package-evidence") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsSignedPackageEvidence({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/signed-package-evidence/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsSignedPackageEvidence({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/install-update-rollback-proof") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsInstallUpdateRollbackProof({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/install-update-rollback-proof") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsInstallUpdateRollbackProof({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/install-update-rollback-proof/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsInstallUpdateRollbackProof({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/deployment-dry-run-plan") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsDeploymentDryRunPlan({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/deployment-dry-run-plan") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsDeploymentDryRunPlan({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/deployment-dry-run-plan/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsDeploymentDryRunPlan({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/dry-run-executor-proof") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsDryRunExecutorProof({
        root,
        requestedLane: body.requestedLane || "install",
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/dry-run-executor-proof") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsDryRunExecutorProof({
        root,
        requestedLane: body.requestedLane || "install",
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/dry-run-executor-proof/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsDryRunExecutorProof({
        root,
        requestedLane: body.requestedLane || "install",
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/dry-run-approval-record-design") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsDryRunApprovalRecordDesign({
        root,
        requestedLane: body.requestedLane || "install",
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/dry-run-approval-record-design") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsDryRunApprovalRecordDesign({
        root,
        requestedLane: body.requestedLane || "install",
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/dry-run-approval-record-design/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsDryRunApprovalRecordDesign({
        root,
        requestedLane: body.requestedLane || "install",
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/dry-run-approval-record-lane") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsDryRunApprovalRecordWriteLane({
        root,
        requestedLane: body.requestedLane || "install",
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/dry-run-approval-record-append") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendOwnerOpsDryRunApprovalRecord({
        root,
        requestedLane: body.requestedLane || "install",
        approvalToken: body.approvalToken,
        decision: body.approvalToken ? "approve_dry_run_invocation" : "hold",
        reviewer: body.reviewer || "owner",
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/dry-run-approval-records") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readOwnerOpsDryRunApprovalRecords({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/dry-run-approval-record-lane/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsDryRunApprovalRecordWriteLane({
        root,
        requestedLane: body.requestedLane || "install",
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/controlled-dry-run-gate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsControlledDryRunInvocationGate({
        root,
        requestedLane: body.requestedLane || "install",
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/controlled-dry-run-invoke") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: invokeOwnerOpsControlledDryRun({
        root,
        requestedLane: body.requestedLane || "install",
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/controlled-dry-run-records") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readOwnerOpsControlledDryRunInvocations({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/controlled-dry-run/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsControlledDryRunInvocationGate({
        root,
        requestedLane: body.requestedLane || "install",
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/dry-run-result-handoff") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsDryRunResultReviewHandoff({
        root,
        requestedLane: body.requestedLane || "install",
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/dry-run-result-handoff") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsDryRunResultReviewHandoff({
        root,
        requestedLane: body.requestedLane || "install",
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/dry-run-result-handoff/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsDryRunResultReviewHandoff({
        root,
        requestedLane: body.requestedLane || "install",
      }),
    };
  }

  if (normalizedMethod === "POST" && ["/owner-ops/internal-production-package", "/owner-ops/local-package-candidate"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsInternalProductionPackage({
        root,
        confirmationToken: body.confirmationToken,
      }),
    };
  }

  if (normalizedMethod === "GET" && ["/owner-ops/internal-production-package/verify", "/owner-ops/local-package-candidate/verify"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsInternalProductionPackageWriter({ root }),
    };
  }

  if (normalizedMethod === "GET" && ["/owner-ops/internal-production-package/readback", "/owner-ops/local-package-candidate/readback"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readOwnerOpsInternalProductionPackage({
        root,
        archiveName: body.archiveName,
      }),
    };
  }

  if (normalizedMethod === "GET" && ["/owner-ops/internal-production-package/readback/verify", "/owner-ops/local-package-candidate/readback/verify"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsInternalProductionPackageReadback({
        root,
        archiveName: body.archiveName,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/team-alpha-handoff-bundle") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsTeamAlphaHandoffBundle({
        root,
        archiveName: body.archiveName,
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/team-alpha-handoff-bundle") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsTeamAlphaHandoffBundle({
        root,
        archiveName: body.archiveName,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/team-alpha-handoff-bundle/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsTeamAlphaHandoffBundle({
        root,
        archiveName: body.archiveName,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/first-owner-beta-handoff-bundle") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsFirstOwnerBetaHandoffBundle({
        root,
        archiveName: body.archiveName,
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/first-owner-beta-handoff-bundle") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsFirstOwnerBetaHandoffBundle({
        root,
        archiveName: body.archiveName,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/first-owner-beta-handoff-bundle/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsFirstOwnerBetaHandoffBundle({
        root,
        archiveName: body.archiveName,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/first-owner-beta-operational-package") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsFirstOwnerBetaOperationalTestPackage({
        root,
        archiveName: body.archiveName,
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/first-owner-beta-operational-package") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsFirstOwnerBetaOperationalTestPackage({
        root,
        archiveName: body.archiveName,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/first-owner-beta-operational-package/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsFirstOwnerBetaOperationalTestPackage({
        root,
        archiveName: body.archiveName,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/first-owner-beta-result-review") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsFirstOwnerBetaResultReview({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/first-owner-beta-result-review") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsFirstOwnerBetaResultReview({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/first-owner-beta-result-review/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsFirstOwnerBetaResultReview({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/field-test-ledger") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsFieldTestLedger({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/field-test-records") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendOwnerOpsFieldTestRecord({
        root,
        approvalToken: body.approvalToken,
        record: body.record,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/field-test-records") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readOwnerOpsFieldTestRecords({ root, limit: body.limit }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/field-test-ledger/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsFieldTestLedger({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/field-test-action-queue") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsFieldTestActionQueue({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/field-test-action-queue") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsFieldTestActionQueue({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/field-test-action-queue/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsFieldTestActionQueue({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/field-test-repair-completion") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsFieldTestRepairCompletionEvidence({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/field-test-repair-completion") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsFieldTestRepairCompletionEvidence({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/field-test-repair-completion/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsFieldTestRepairCompletionEvidence({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/broader-owner-testing-handoff") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsBroaderOwnerTestingHandoff({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/broader-owner-testing-handoff") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsBroaderOwnerTestingHandoff({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/broader-owner-testing-handoff/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsBroaderOwnerTestingHandoff({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/broader-owner-testing-results") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendOwnerOpsBroaderOwnerTestingResult({
        root,
        approvalToken: body.approvalToken,
        result: body.result,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/broader-owner-testing-results") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readOwnerOpsBroaderOwnerTestingResults({ root, limit: body.limit }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/broader-owner-testing-result-ledger") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsBroaderOwnerTestingResultLedger({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/broader-owner-testing-result-ledger/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsBroaderOwnerTestingResultLedger({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/broader-owner-testing-repair-queue") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsBroaderOwnerTestingRepairQueue({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/broader-owner-testing-repair-queue") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsBroaderOwnerTestingRepairQueue({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/broader-owner-testing-repair-queue/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsBroaderOwnerTestingRepairQueue({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/broader-owner-testing-repair-completion") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/broader-owner-testing-repair-completion") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/broader-owner-testing-repair-completion/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/next-owner-testing-loop") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsNextOwnerTestingLoop({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/next-owner-testing-loop") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsNextOwnerTestingLoop({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/next-owner-testing-loop/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsNextOwnerTestingLoop({ root }),
    };
  }

  if (normalizedMethod === "GET" && ["/owner-ops/production-ready", "/owner-ops/final-local-release-candidate"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsProductionReadyDecisionPacket({ root }),
    };
  }

  if (normalizedMethod === "POST" && ["/owner-ops/production-ready", "/owner-ops/final-local-release-candidate"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsProductionReadyDecisionPacket({ root }),
    };
  }

  if (normalizedMethod === "GET" && ["/owner-ops/production-ready/verify", "/owner-ops/final-local-release-candidate/verify"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsProductionReadyDecisionPacket({ root }),
    };
  }

  if (normalizedMethod === "GET" && ["/owner-ops/internal-production-owner-decision", "/owner-ops/final-candidate-owner-decision-lane"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsInternalProductionOwnerDecision({
        root,
        decision: body.decision || "continue_supervised_testing",
      }),
    };
  }

  if (normalizedMethod === "POST" && ["/owner-ops/internal-production-owner-decision/records", "/owner-ops/final-candidate-owner-decision-records"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendOwnerOpsInternalProductionOwnerDecisionRecord({
        root,
        decision: body.decision || "continue_supervised_testing",
        approvalToken: body.approvalToken,
      }),
    };
  }

  if (normalizedMethod === "GET" && ["/owner-ops/internal-production-owner-decision/records", "/owner-ops/final-candidate-owner-decision-records"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readOwnerOpsInternalProductionOwnerDecisionRecords({ root }),
    };
  }

  if (normalizedMethod === "GET" && ["/owner-ops/internal-production-owner-decision/verify", "/owner-ops/final-candidate-owner-decision-lane/verify"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsInternalProductionOwnerDecision({ root }),
    };
  }

  if (normalizedMethod === "GET" && ["/owner-ops/internal-production-next-action", "/owner-ops/final-candidate-next-action"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsInternalProductionNextAction({
        root,
        decision: body.decision || "continue_supervised_testing",
      }),
    };
  }

  if (normalizedMethod === "GET" && ["/owner-ops/internal-production-next-action/verify", "/owner-ops/final-candidate-next-action/verify"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsInternalProductionNextAction({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/beta-feedback-action-queue") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsBetaFeedbackActionQueue({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/beta-feedback-action-queue") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsBetaFeedbackActionQueue({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/beta-feedback-action-queue/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsBetaFeedbackActionQueue({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/market-evidence-bundle") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOwnerOpsMarketEvidenceBundle({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/owner-ops/market-evidence-bundle") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeOwnerOpsMarketEvidenceBundle({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/owner-ops/market-evidence-bundle/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOwnerOpsMarketEvidenceBundle({ root }),
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

  if (normalizedMethod === "GET" && path === "/workspace/welcome") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildRuntimeWorkspaceWelcome({
        workspaceRoot: body.workspaceRoot || DEFAULT_RUNTIME_WORKSPACE_SOURCE_PACK,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/workspace/welcome/check") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyRuntimeWorkspaceWelcome({
        workspaceRoot: body.workspaceRoot || DEFAULT_RUNTIME_WORKSPACE_SOURCE_PACK,
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/workspace/welcome/draft") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildRuntimeWorkspaceWelcomeDraft({
        workspaceRoot: body.workspaceRoot,
        answers: body.answers || body,
      }),
    };
  }

  if (normalizedMethod === "POST" && path === "/workspace/welcome/apply") {
    let result;
    try {
      result = applyRuntimeWorkspaceWelcomeSettings({
        workspaceRoot: body.workspaceRoot,
        answers: body.answers || body,
        approvalToken: body.approvalToken || "",
      });
    } catch (error) {
      result = {
        schema: "gpao_t.runtime_workspace_welcome_apply_error.v0_1",
        status: "blocked",
        applied: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: result.status === "applied" ? 200 : 409,
      body: result,
    };
  }

  if (normalizedMethod === "GET" && path === "/work-surface/state") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildCoreWorkSurface({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/gpao-t-workspace/state") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildGpaoTWorkspaceShell({ root, request: body.request }),
    };
  }

  if (normalizedMethod === "GET" && (path === "/gpao-t-workspace" || path === "/gpao-t-workspace.html")) {
    const shell = buildGpaoTWorkspaceShell({ root, request: body.request });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildGpaoTWorkspaceShellHtml({ root, shell, request: body.request }),
    };
  }

  if (normalizedMethod === "GET" && path === "/gpao-t-workspace/verify") {
    const shell = buildGpaoTWorkspaceShell({ root, request: body.request });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyGpaoTWorkspaceShell({
        shell,
        html: buildGpaoTWorkspaceShellHtml({ root, shell, request: body.request }),
      }),
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

  if (normalizedMethod === "GET" && path === "/multi-chat-workspace") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildCodexStyleMultiChatWorkspace({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/multi-chat-workspace/verify") {
    const workspace = buildCodexStyleMultiChatWorkspace({ root });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyCodexStyleMultiChatWorkspace({ workspace }),
    };
  }

  if (normalizedMethod === "GET" && path === "/multi-chat-workspace/stages-1-6") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildMultiChatStageSixCompletion({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/multi-chat-workspace/stages-1-6/verify") {
    const completion = buildMultiChatStageSixCompletion({ root });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyMultiChatStageSixCompletion({ root, completion }),
    };
  }

  if (normalizedMethod === "GET" && path === "/multi-chat-workspace/memory-review-queue") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildThreadScopedMemoryReviewQueue({ root }),
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

  if (normalizedMethod === "GET" && ["/production/completion", "/production/stages-5-8"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildProductionCompletion({ root }),
    };
  }

  if (normalizedMethod === "GET" && ["/production/completion/verify", "/production/stages-5-8/verify"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyProductionCompletion({ root }),
    };
  }

  if (normalizedMethod === "POST" && ["/production/internal-production-package", "/production/team-alpha-package"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeInternalProductionPackage({ root }),
    };
  }

  if (normalizedMethod === "GET" && ["/production/internal-production-package/verify", "/production/team-alpha-package/verify"].includes(path)) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyInternalProductionPackage({ root }),
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

  if (normalizedMethod === "GET" && path === "/stage-1/tester-failure-guards") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildTesterFailureGuardSummary(),
    };
  }

  if (normalizedMethod === "POST" && path === "/stage-1/chat-send/sanitize") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: sanitizeChatSendParams(body),
    };
  }

  if (normalizedMethod === "GET" && path === "/stage-1/chat-send/sanitize/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyChatSendSanitizer(),
    };
  }

  if (normalizedMethod === "POST" && path === "/stage-1/timeout-budget") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildTimeoutBudget(body),
    };
  }

  if (normalizedMethod === "GET" && path === "/stage-1/timeout-budget/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyTimeoutBudget(),
    };
  }

  if (normalizedMethod === "POST" && path === "/stage-1/external-write/guard") {
    const guard = guardExternalWriteCompletion(body);
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: guard.status === "blocked" ? 409 : 200,
      body: guard,
    };
  }

  if (normalizedMethod === "GET" && path === "/stage-1/external-write/guard/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyExternalWriteCompletionGuard(),
    };
  }

  if (normalizedMethod === "POST" && path === "/stage-1/heartbeat/isolate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: isolateHeartbeatFailures(body),
    };
  }

  if (normalizedMethod === "GET" && path === "/stage-1/heartbeat/isolate/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyHeartbeatFailureIsolation(),
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

  if (normalizedMethod === "GET" && path === "/runtime/provider-auth-heart") {
    const inventory = inspectProviderAuthStores();
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: {
        inventory,
        repairPlan: buildProviderAuthRepairPlan({ inventory }),
      },
    };
  }

  if (normalizedMethod === "GET" && path === "/runtime/provider-auth-heart/verify") {
    const inventory = inspectProviderAuthStores();
    const repairPlan = buildProviderAuthRepairPlan({ inventory });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyProviderAuthHeart({ inventory, repairPlan }),
    };
  }

  if (normalizedMethod === "GET" && (path === "/settings/model-connection" || path === "/model-connection")) {
    const state = buildModelConnectionSettingsState();
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: renderModelConnectionSettingsHtml(state),
    };
  }

  if (normalizedMethod === "GET" && path === "/settings/model-connection/state") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildModelConnectionSettingsState(),
    };
  }

  if (normalizedMethod === "GET" && path === "/settings/model-connection/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyModelConnectionSettingsState(),
    };
  }

  if (normalizedMethod === "GET" && path === "/runtime/doctor-recovery-heart") {
    const providerAuthInventory = inspectProviderAuthStores();
    const providerAuthRepairPlan = buildProviderAuthRepairPlan({ inventory: providerAuthInventory });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildDoctorRecoveryHeart({
        sourceDoctor: runDoctor({ root }),
        providerAuthInventory,
        providerAuthRepairPlan,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/runtime/doctor-recovery-heart/verify") {
    const providerAuthInventory = inspectProviderAuthStores();
    const providerAuthRepairPlan = buildProviderAuthRepairPlan({ inventory: providerAuthInventory });
    const heart = buildDoctorRecoveryHeart({
      sourceDoctor: runDoctor({ root }),
      providerAuthInventory,
      providerAuthRepairPlan,
    });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyDoctorRecoveryHeart({ heart }),
    };
  }

  if (normalizedMethod === "GET" && path === "/runtime/session-event-heart") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildSessionEventHeart({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/runtime/session-event-heart/verify") {
    const heart = buildSessionEventHeart({ root });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifySessionEventHeart({ heart }),
    };
  }

  if (normalizedMethod === "GET" && path === "/runtime/memory-context-heart") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildMemoryContextHeart({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/runtime/memory-context-heart/verify") {
    const heart = buildMemoryContextHeart({ root });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyMemoryContextHeart({ heart }),
    };
  }

  if (normalizedMethod === "GET" && path === "/runtime/tool-authority-heart") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildToolAuthorityHeart({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/runtime/tool-authority-heart/verify") {
    const heart = buildToolAuthorityHeart({ root });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyToolAuthorityHeart({ heart }),
    };
  }

  if (normalizedMethod === "GET" && path === "/runtime/heart") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildRuntimeHeartHardening({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/runtime/heart/verify") {
    const hardening = buildRuntimeHeartHardening({ root });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyRuntimeHeartHardening({ hardening }),
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

  if (normalizedMethod === "GET" && path === "/memory/review-queue") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readMemoryReviewQueue({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/memory/review-summary") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildMemoryReviewQueueSummary({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/memory/review-queue/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyMemoryReviewQueue({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/memory/apply-gate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildMemoryApplyGateState({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/memory/apply-gate/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyMemoryApplyGateState({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/memory/local-apply-invocation") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildMemoryLocalApplyInvocationContract({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/memory/local-apply-invocation/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyMemoryLocalApplyInvocationContract({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/memory/self-growth-approval-ux") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildMemorySelfGrowthApprovalUx({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/memory/self-growth-approval-ux/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyMemorySelfGrowthApprovalUx({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/memory/review-candidate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendMemoryReviewCandidate({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/memory/replay-preview") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildReadOnlyMemoryReplay({ ...body }),
    };
  }

  if (normalizedMethod === "POST" && path === "/memory/replay-record") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendMemoryReplayEvidence({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/memory/apply-preview") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildMemoryApplyRequest({ ...body }),
    };
  }

  if (normalizedMethod === "POST" && path === "/memory/apply-request") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendMemoryApplyRequest({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/memory/apply-approval-preview") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildMemoryApplyApprovalAuditBridge({ ...body }),
    };
  }

  if (normalizedMethod === "POST" && path === "/memory/apply-approval-record") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendMemoryApplyApprovalAuditBridge({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/memory/apply-engine/preview") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildMemoryReversibleApply({ ...body }),
    };
  }

  if (normalizedMethod === "POST" && path === "/memory/apply-engine/apply") {
    const preview = buildMemoryReversibleApply({ ...body });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: {
        ...preview,
        status: "blocked",
        findings: [
          ...(preview.findings || []),
          "raw_apply_engine_write_disabled_use_tokened_local_apply",
        ],
        authority: {
          ...(preview.authority || {}),
          mutationAllowedNow: false,
          allowedMutation: "blocked",
          durableMemoryPromotion: "blocked",
          compatibilityMemoryWrite: "blocked",
          sessionMetaWrite: "blocked",
          externalSend: "blocked",
          automaticAdmission: "blocked",
        },
        preview,
        nextSafeAction:
          "Use /memory/local-apply/invoke with the exact local Context Mesh apply token after reviewing the preview and rollback receipt.",
      },
    };
  }

  if (normalizedMethod === "POST" && path === "/memory/apply-engine/rollback") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: {
        schema: "gpao_t.memory_raw_apply_engine_rollback_refusal.v0_1",
        status: "blocked",
        findings: ["raw_apply_engine_rollback_disabled_use_tokened_local_rollback"],
        authority: {
          mutationAllowedNow: false,
          durableMemoryPromotion: "blocked",
          compatibilityMemoryWrite: "blocked",
          sessionMetaWrite: "blocked",
          externalSend: "blocked",
          automaticAdmission: "blocked",
        },
        nextSafeAction:
          "Use /memory/local-apply/rollback with the exact local Context Mesh rollback token after reviewing the recorded rollback receipt.",
      },
    };
  }

  if (normalizedMethod === "POST" && path === "/memory/local-apply/invoke") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: invokeMemoryLocalContextMeshApply({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/memory/local-apply/rollback") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: invokeMemoryLocalContextMeshRollback({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/auto-memory-growth/policy") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildAutoMemoryGrowthPolicy(),
    };
  }

  if (normalizedMethod === "GET" && path === "/auto-memory-growth/summary") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildAutoMemoryGrowthSummary({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/auto-memory-growth/runs") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readAutoMemoryGrowthRuns({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/auto-memory-growth/classify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: classifyAutoMemoryGrowthAuthority(body),
    };
  }

  if (normalizedMethod === "POST" && path === "/auto-memory-growth/run") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: runAutoMemoryGrowthLoop({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/auto-memory-growth/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyAutoMemoryGrowthLoop({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/live-turn/absorption/policy") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildLiveTurnAbsorptionPolicy(),
    };
  }

  if (normalizedMethod === "POST" && path === "/live-turn/absorption/source") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: classifyLiveTurnSource(body),
    };
  }

  if (normalizedMethod === "POST" && path === "/live-turn/absorption/run") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: runLiveTurnAbsorptionBridge({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/live-turn/absorption/runs") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readLiveTurnAbsorptionRuns({ root, limit: body.limit }),
    };
  }

  if (normalizedMethod === "GET" && path === "/live-turn/absorption/summary") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildLiveTurnAbsorptionSummary({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/live-turn/progress/events") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readConversationProgressEvents({
        root,
        limit: body.limit,
        sessionKey: body.sessionKey,
        runId: body.runId,
      }),
    };
  }

  if (normalizedMethod === "GET" && path === "/live-turn/progress/lane") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildConversationProgressLane({ root, limit: body.limit }),
    };
  }

  if (normalizedMethod === "POST" && path === "/live-turn/progress/tool") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendToolProgressEvent({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/live-turn/absorption/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyLiveTurnAbsorptionBridge({ root }),
    };
  }

  if (
    normalizedMethod === "GET"
    && (path === "/gpao-t/live-turn-hook/readiness" || path === "/openclaw/live-turn-hook/readiness")
  ) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildOpenClawLiveTurnHookReadinessGate({ root }),
    };
  }

  if (
    normalizedMethod === "GET"
    && (path === "/gpao-t/live-turn-hook/readiness/verify" || path === "/openclaw/live-turn-hook/readiness/verify")
  ) {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyOpenClawLiveTurnHookReadinessGate({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/mesh/resolve") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: resolveContextMesh({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/mesh/applied-candidate-replay") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildAppliedContextMeshReplay({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/mesh/applied-candidate-replay/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyAppliedContextMeshReplay({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/surface/applied-replay-inspector") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildAppliedReplayInspectorState({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/surface/applied-replay-inspector/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyAppliedReplayInspectorState({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/turn") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: runRuntimeTurn({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/turn/os") {
    const record = runGpaoTOsTurn({
      ...body,
      root,
      request: body.request || body.message || body.input,
      sourceSurface: body.sourceSurface || "/work-surface",
    });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: record.status === "blocked" ? 409 : 200,
      body: record,
    };
  }

  if (normalizedMethod === "GET" && path === "/turn/os/records") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readGpaoTOsTurnRecords({ root, limit: body.limit }),
    };
  }

  if (normalizedMethod === "POST" && path === "/turn/os/verify") {
    const record = body.record || runGpaoTOsTurn({
      root,
      request: body.request || "GPAO-T OS turn verification smoke",
      sourceSurface: body.sourceSurface || "/work-surface",
      writeLocalRecords: body.writeLocalRecords !== false,
    });
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyGpaoTOsTurn({ record }),
    };
  }

  if (normalizedMethod === "POST" && path === "/turn/llm-ready-packet") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildLlmReadyTaskContextPacket({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/surface/llm-ready-packet") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildLlmReadyPacketSurfaceState({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/turn/llm-ready-packet/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyLlmReadyTaskContextPacket({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/chat/preflight-packet") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildChatPreflightPacket({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/chat/preflight-record") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendChatPreflightPacket({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/chat/preflight-records") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readChatPreflightPackets({ root, limit: body.limit }),
    };
  }

  if (normalizedMethod === "POST" && path === "/chat/post-answer-replay-record") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendPostAnswerReplayRecord({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/chat/post-answer-replay-records") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readPostAnswerReplayRecords({ root, limit: body.limit }),
    };
  }

  if (normalizedMethod === "POST" && path === "/chat/answer-replay-evaluation") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildAnswerReplayEvaluation({ ...body, root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/chat/answer-replay-evaluation-record") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: appendAnswerReplayEvaluation({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/chat/answer-replay-evaluations") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: readAnswerReplayEvaluations({ root, limit: body.limit }),
    };
  }

  if (normalizedMethod === "POST" && path === "/chat/answer-replay-memory-candidate") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildAnswerReplayMemoryCandidate({ ...body, root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/chat/preflight-replay/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyChatPreflightReplay({ root }),
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

  if (normalizedMethod === "GET" && path === "/first-completion") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: buildGpaoTFirstCompletionAudit({ root }),
    };
  }

  if (normalizedMethod === "GET" && path === "/first-completion/verify") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: verifyGpaoTFirstCompletionAudit({ root }),
    };
  }

  if (normalizedMethod === "POST" && path === "/first-completion/evidence") {
    return {
      schema: "gpao_t.gateway_response.v0_1",
      status: 200,
      body: writeGpaoTFirstCompletionEvidence({ root }),
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
