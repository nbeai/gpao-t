#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  handleGatewayRequest,
  buildBrowserLocalAppShellContract,
  buildBrowserLocalAppShellHtml,
  buildBrowserLocalAppShellState,
  initializeRuntimeState,
  appendSelfGrowthProposal,
  appendGrowthApplicationGate,
  appendInstallHardeningReport,
  buildAutoMemoryGrowthPolicy,
  buildAutoMemoryGrowthSummary,
  classifyAutoMemoryGrowthAuthority,
  appendToolProgressEvent,
  buildConversationProgressLane,
  buildLiveTurnAbsorptionPolicy,
  buildLiveTurnAbsorptionSummary,
  classifyLiveTurnSource,
  readConversationProgressEvents,
  readLiveTurnAbsorptionRuns,
  runLiveTurnAbsorptionBridge,
  verifyLiveTurnAbsorptionBridge,
  buildControlCenterSnapshot,
  buildControlCenterSummary,
  buildControlCenterHtml,
  buildControlCenterServingContract,
  buildControlCenterUiContract,
  buildControlCenterUiSnapshot,
  buildDoctorRecoveryHeart,
  buildApprovalAuditLocalRecordSubstrate,
  buildApprovalAuditReplay,
  buildConnectorGovernanceSummary,
  buildConnectorToolGovernance,
  buildCoreWorkSurface,
  buildCoreWorkSurfaceHtml,
  applySessionWorkspaceAction,
  readSessionWorkspaceState,
  verifySessionWorkspaceBehavior,
  buildSessionEventHeart,
  verifySessionEventHeart,
  buildCodexStyleMultiChatWorkspace,
  verifyCodexStyleMultiChatWorkspace,
  buildMultiChatStageSixCompletion,
  buildThreadScopedMemoryReviewQueue,
  verifyMultiChatStageSixCompletion,
  buildApprovalRecordWriteUxDesign,
  buildAuditWriteDesignProof,
  buildExecutionApprovalPreview,
  buildFirstLocalWorkLoop,
  buildGpaoTFirstCompletionAudit,
  buildWorkSurfaceSubmissionDecisionGate,
  buildWorkSurfaceSubmissionValidationGate,
  buildWorkSurfaceExecutionConfirmationControl,
  buildWorkSurfaceExecutionFlow,
  buildGpaoTWorkspaceShell,
  buildGpaoTWorkspaceShellHtml,
  buildGrowthApplicationGate,
  buildGrowthApplicationGateSummary,
  buildInstallHardeningReport,
  buildInstallHardeningSummary,
  applyRuntimeWorkspaceWelcomeSettings,
  buildRuntimeWorkspaceWelcome,
  buildRuntimeWorkspaceWelcomeDraft,
  verifyRuntimeWorkspaceWelcome,
  buildGpaoTDesignReferenceGate,
  buildLocalControlCenterDesignContract,
  buildModelRouterBoundary,
  buildModelRouterPolicy,
  buildModelInvocationPacket,
  buildModelProviderRegistry,
  buildProviderAuthRepairPlan,
  inspectProviderAuthStores,
  buildOpenClawLiveTurnHookReadinessGate,
  verifyOpenClawLiveTurnHookReadinessGate,
  buildOperationsContractSummary,
  buildOperationsReliabilityContract,
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
  buildOwnerOpsMarketEvidenceBundle,
  buildOwnerOpsMcpPlan,
  buildOwnerOpsMcpServerDescriptor,
  buildOwnerOpsMcpToolManifest,
  buildOwnerOpsReadOnlyIntakePlan,
  buildOwnerOpsIndustryTemplateCatalog,
  buildOwnerOpsMarketReadinessGate,
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
  buildOwnerOpsFinalLocalReleaseCandidateDecisionPacket,
  buildOwnerOpsFinalCandidateOwnerDecisionLane,
  buildOwnerOpsFinalCandidateNextActionPacket,
  buildOwnerOpsPublicReleaseAuthorityGate,
  buildOwnerOpsPublicReleaseReadbackSnapshot,
  buildOwnerOpsApprovedSigningLane,
  buildOwnerOpsMarketplaceUploadApprovalGate,
  buildOwnerOpsMarketplaceUploadDecisionLane,
  buildOwnerOpsProductionCompletionAudit,
  buildOwnerOpsProductAxisReadinessMatrix,
  buildOwnerOpsSupervisedTestingReadinessPacket,
  buildOwnerOpsReleaseReadinessEvidence,
  buildOwnerOpsSignedPackageEvidence,
  appendOwnerOpsDryRunApprovalRecord,
  appendOwnerOpsBroaderOwnerTestingResult,
  appendOwnerOpsFinalCandidateOwnerDecisionRecord,
  appendOwnerOpsFieldTestRecord,
  appendOwnerOpsHumanReviewDecisionRecord,
  appendOwnerOpsMarketplaceUploadDecisionRecord,
  invokeOwnerOpsControlledDryRun,
  readOwnerOpsControlledDryRunInvocations,
  readOwnerOpsBroaderOwnerTestingResults,
  readOwnerOpsDryRunApprovalRecords,
  readOwnerOpsFieldTestRecords,
  readOwnerOpsFinalCandidateOwnerDecisionRecords,
  readOwnerOpsHumanReviewDecisionRecords,
  readOwnerOpsMarketplaceUploadDecisionRecords,
  readOwnerOpsLocalPackageCandidate,
  writeOwnerOpsBetaFeedbackActionQueue,
  writeOwnerOpsBroaderOwnerTestingHandoff,
  writeOwnerOpsBroaderOwnerTestingRepairCompletionEvidence,
  writeOwnerOpsBroaderOwnerTestingRepairQueue,
  writeOwnerOpsFieldTestActionQueue,
  writeOwnerOpsFieldTestRepairCompletionEvidence,
  writeOwnerOpsPrePublicRepairBacklog,
  writeOwnerOpsPrePublicRepairCompletionEvidence,
  writeOwnerOpsHumanReviewApprovalPacket,
  writeOwnerOpsInstallUpdateRollbackProof,
  writeOwnerOpsDeploymentDryRunPlan,
  writeOwnerOpsDryRunApprovalRecordDesign,
  writeOwnerOpsDryRunResultReviewHandoff,
  writeOwnerOpsDryRunExecutorProof,
  writeOwnerOpsLocalPackageCandidate,
  writeOwnerOpsNextOwnerTestingLoop,
  writeOwnerOpsFinalLocalReleaseCandidateDecisionPacket,
  writeOwnerOpsReleaseReadinessEvidence,
  writeOwnerOpsSignedPackageEvidence,
  verifyOwnerOpsBroaderOwnerTestingHandoff,
  verifyOwnerOpsBroaderOwnerTestingResultLedger,
  verifyOwnerOpsBroaderOwnerTestingRepairCompletionEvidence,
  verifyOwnerOpsBroaderOwnerTestingRepairQueue,
  verifyOwnerOpsFinalLocalReleaseCandidateDecisionPacket,
  verifyOwnerOpsFinalCandidateOwnerDecisionLane,
  verifyOwnerOpsFinalCandidateNextActionPacket,
  buildOwnerOpsSkillPack,
  buildOwnerOpsTemplateReplayFixtures,
  buildOwnerOpsWorkflowPreview,
  buildOwnerOpsFirstOwnerScenarioFixture,
  buildOwnerOpsMarketListingDraft,
  buildOwnerOpsPluginPackageManifest,
  buildOwnerOpsAlphaFeedbackForm,
  buildOwnerOpsFirstOwnerBetaGuide,
  buildOwnerOpsHostIntegrationMatrix,
  buildOwnerOpsHostRegistrationGuide,
  buildOwnerOpsOwnerFacingUxCopy,
  buildOwnerOpsTeamAlphaGuide,
  buildOwnerOpsFirstOwnerBetaHandoffBundle,
  buildOwnerOpsFirstOwnerBetaOperationalTestPackage,
  buildOwnerOpsTeamAlphaHandoffBundle,
  buildOwnerOpsSampleDataKit,
  buildStages5To8Completion,
  buildPackagedDesktopPlanningReview,
  buildRuntimeDataContract,
  buildSelfGrowthProposal,
  buildStage4ProductionHardening,
  buildStage4ProductionHardeningHtml,
  buildSkillBuildQueue,
  buildSkillCandidateAtlas,
  buildSkillEcosystemPlan,
  buildSkillExecutionPlan,
  buildSkillExecutionRun,
  buildSkillExecutionSummary,
  buildSkillIntentProfile,
  buildSkillManifestStandard,
  buildSkillManualFirstPlan,
  buildSkillProductionRoadmap,
  buildSkillProductionStatus,
  buildSkillReadinessReport,
  buildTauriInstallDryRunPlan,
  buildTauriInstallDryRunApprovalRecordStorageDesign,
  buildTauriInstallDryRunApprovalRecordWriteGateDesign,
  buildTauriInstallReadinessGate,
  buildTauriInstallDryRunExecutorContract,
  buildTauriInstallDryRunImplementationDesign,
  buildTauriInstallDryRunInvocationApprovalContract,
  buildTauriInstallPrerequisiteDoctor,
  buildTauriPackagedDesktopGate,
  buildTauriReadOnlyShellHtml,
  buildTauriReadOnlyShellSlice,
  buildExecutionRuntimePlan,
  buildRuntimeHeartHardening,
  buildToolAuthorityHeart,
  inspectReadOnlyConnector,
  buildMemoryContextHeart,
  buildMemorySearchIndex,
  captureMemoryEntry,
  buildReplayRecoveryView,
  appendReplayRecoveryRecord,
  buildRecoveryHistorySummary,
  getSkillPack,
  readAuditEvents,
  readAutoMemoryGrowthRuns,
  readApprovalRecords,
  readAuditRecords,
  readGrowthApplicationGates,
  readInstallHardeningReports,
  listConnectors,
  listModelAdapters,
  listSkillPacks,
  listToolAdapters,
  readMemoryWiki,
  getMemorySearchStatus,
  readMemorySearchIndex,
  readOwnerOpsRecords,
  readReplayRecoveryHistory,
  readRuntimeState,
  readSelfGrowthProposals,
  readSkillExecutionHistory,
  renderTauriInstallDryRunPreview,
  resolveContextMesh,
  searchMemory,
  reviewConnectorPermission,
  renderControlCenterHtml,
  runAutoMemoryGrowthLoop,
  routeSkillPacks,
  runDoctor,
  runRuntimeTurn,
  startControlCenterPreviewServer,
  validateControlCenterUiSnapshot,
  verifyBrowserLocalAppShell,
  verifyApprovalAuditLocalRecordSubstrate,
  verifyControlCenterPreviewServing,
  verifyConnectorToolGovernance,
  verifyCoreWorkSurface,
  verifyGpaoTDesignReferenceGate,
  verifyApprovalRecordWriteUxDesign,
  verifyAuditWriteDesignProof,
  verifyAutoMemoryGrowthLoop,
  verifyExecutionApprovalPreview,
  verifyFirstLocalWorkLoop,
  verifyGpaoTFirstCompletionAudit,
  verifyStage4ProductionHardening,
  verifyModelRouterBoundary,
  verifyModelRouterPolicy,
  verifyModelInvocation,
  verifyProviderAuthHeart,
  verifyMemoryContextHeart,
  verifyDoctorRecoveryHeart,
  verifyOwnerOpsMcpReadiness,
  verifyOwnerOpsMcpServer,
  verifyOwnerOpsPack,
  verifyOwnerOpsReadOnlyIntakeConnectors,
  runOwnerOpsFirstOwnerScenario,
  verifyOwnerOpsFirstOwnerScenario,
  verifyOwnerOpsPluginPackage,
  verifyOwnerOpsHostAlphaHandoff,
  verifyOwnerOpsHostIntegrationMatrix,
  verifyOwnerOpsFirstOwnerBetaReadiness,
  verifyOwnerOpsFirstOwnerBetaHandoffBundle,
  verifyOwnerOpsFirstOwnerBetaOperationalTestPackage,
  verifyOwnerOpsFirstOwnerBetaResultReview,
  verifyOwnerOpsMarketReadiness,
  verifyOwnerOpsMarketEvidenceBundle,
  verifyOwnerOpsPrePublicPackage,
  verifyOwnerOpsPrePublicEvidenceBridge,
  verifyOwnerOpsPrePublicRepairBacklog,
  verifyOwnerOpsPrePublicRepairCompletionEvidence,
  verifyOwnerOpsArchiveChecksumDryRun,
  verifyOwnerOpsBetaFeedbackActionQueue,
  verifyOwnerOpsFieldTestActionQueue,
  verifyOwnerOpsFieldTestLedger,
  verifyOwnerOpsFieldTestRepairCompletionEvidence,
  verifyOwnerOpsDeploymentDryRunPlan,
  verifyOwnerOpsControlledDryRunInvocationGate,
  verifyOwnerOpsDryRunResultReviewHandoff,
  verifyOwnerOpsDryRunApprovalRecordDesign,
  verifyOwnerOpsDryRunApprovalRecordWriteLane,
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
  verifyOwnerOpsProductionCompletionAudit,
  verifyOwnerOpsProductAxisReadinessMatrix,
  verifyOwnerOpsSupervisedTestingReadinessPacket,
  verifyOwnerOpsLocalPackageCandidateReadback,
  verifyOwnerOpsLocalPackageCandidateWriter,
  verifyOwnerOpsNextOwnerTestingLoop,
  verifyOwnerOpsReleaseReadinessEvidence,
  verifyOwnerOpsSignedPackageEvidence,
  verifyOwnerOpsTeamAlphaHandoffBundle,
  verifyOwnerOpsTeamAlphaReadiness,
  verifyProviderInvocationRuntime,
  verifyExecutionRuntimePlan,
  verifyExecutionRuntimeInvocation,
  verifyRuntimeHeartHardening,
  verifyToolAuthorityHeart,
  verifyStages5To8Completion,
  verifyTeamAlphaPackage,
  writeOwnerOpsTeamAlphaHandoffBundle,
  writeOwnerOpsFirstOwnerBetaHandoffBundle,
  writeOwnerOpsFirstOwnerBetaOperationalTestPackage,
  writeOwnerOpsFirstOwnerBetaResultReview,
  writeOwnerOpsMarketEvidenceBundle,
  verifyWorkSurfaceSubmissionDecisionGate,
  verifyWorkSurfaceSubmissionValidationGate,
  verifyWorkSurfaceExecutionFlow,
  verifyGpaoTWorkspaceShell,
  verifyPackagedDesktopPlanningReview,
  verifyTauriInstallDryRunPlan,
  verifyTauriInstallDryRunApprovalRecordStorageDesign,
  verifyTauriInstallDryRunApprovalRecordWriteGateDesign,
  verifyTauriInstallReadinessGate,
  verifyTauriInstallDryRunExecutorContract,
  verifyTauriInstallDryRunImplementationDesign,
  verifyTauriInstallDryRunInvocationApprovalContract,
  verifyTauriInstallDryRunPreview,
  verifyTauriInstallPrerequisiteDoctor,
  verifyTauriPackagedDesktopGate,
  verifyTauriReadOnlyShellSlice,
  appendSkillExecutionRun,
  writeApprovalAuditLocalRecords,
  writeOwnerOpsLocalRecord,
  writeTeamAlphaPackage,
  writeGpaoTFirstCompletionEvidence,
  recordWorkSurfaceExecutionFlow,
  invokeModelLocally,
  invokeModelProvider,
  invokeExecutionRuntimeDryRun,
  previewOwnerOpsFolderIntake,
  previewOwnerOpsLocalFileIntake,
  previewOwnerOpsPasteIntake,
  previewOwnerOpsTableTextIntake,
} from "../src/index.js";

function usage() {
  return [
    "GPAO-T local runtime skeleton",
    "",
    "Usage:",
    "  gpao-t init",
    "  gpao-t turn <text>",
    "  gpao-t replay <fixture.json>",
    "  gpao-t replay-view <fixture.json>",
    "  gpao-t replay-record <fixture.json>",
    "  gpao-t recovery history",
    "  gpao-t recovery summary",
    "  gpao-t doctor-heart",
    "  gpao-t doctor-heart-check",
    "  gpao-t auto-memory-growth policy",
    "  gpao-t auto-memory-growth classify <text>",
    "  gpao-t auto-memory-growth run <text>",
    "  gpao-t auto-memory-growth runs",
    "  gpao-t auto-memory-growth summary",
    "  gpao-t auto-memory-growth verify",
    "  gpao-t live-turn policy",
    "  gpao-t live-turn source <gpao_t_dashboard|telegram_direct|gateway_chat>",
    "  gpao-t live-turn run <message>",
    "  gpao-t live-turn run-answer <message> ::: <answer>",
    "  gpao-t live-turn runs",
    "  gpao-t live-turn summary",
    "  gpao-t live-turn verify",
    "  gpao-t runtime heart",
    "  gpao-t runtime heart-check",
    "  gpao-t runtime live-turn-hook-readiness",
    "  gpao-t runtime live-turn-hook-readiness-check",
    "  gpao-t growth preview [target]",
    "  gpao-t growth propose [target]",
    "  gpao-t growth proposals",
    "  gpao-t growth gate [proposal-id|target]",
    "  gpao-t growth gate-record [proposal-id|target] [approval-status]",
    "  gpao-t growth gates",
    "  gpao-t growth gate-summary",
    "  gpao-t skill ecosystem",
    "  gpao-t skill atlas [phase|category|tier]",
    "  gpao-t skill roadmap",
    "  gpao-t skill build-queue [phase]",
    "  gpao-t skill production-status [phase]",
    "  gpao-t skill execute-plan <text>",
    "  gpao-t skill execute <text>",
    "  gpao-t skill execute-record <text>",
    "  gpao-t skill execution-history",
    "  gpao-t skill execution-summary",
    "  gpao-t skill intent <text>",
    "  gpao-t skill manifest",
    "  gpao-t skill manual-first",
    "  gpao-t skill packs [category]",
    "  gpao-t skill inspect <skill-pack-id>",
    "  gpao-t skill route <text>",
    "  gpao-t skill readiness",
    "  gpao-t owner-ops skill-pack",
    "  gpao-t owner-ops field-casebook",
    "  gpao-t owner-ops authority-matrix",
    "  gpao-t owner-ops scenarios",
    "  gpao-t owner-ops candidates [text]",
    "  gpao-t owner-ops workflow <review_reply|shopping_inquiry|reservation_inquiry> [text]",
    "  gpao-t owner-ops record <review_reply|shopping_inquiry|reservation_inquiry> [text]",
    "  gpao-t owner-ops records",
    "  gpao-t owner-ops replay",
    "  gpao-t owner-ops check",
    "  gpao-t owner-ops product-axis-readiness",
    "  gpao-t owner-ops product-axis-readiness-check",
    "  gpao-t owner-ops production-completion-audit",
    "  gpao-t owner-ops production-completion-audit-check",
    "  gpao-t owner-ops supervised-testing-readiness",
    "  gpao-t owner-ops supervised-testing-readiness-check",
    "  gpao-t owner-ops mcp-plan",
    "  gpao-t owner-ops connector-catalog",
    "  gpao-t owner-ops mcp-tools",
    "  gpao-t owner-ops mcp-check",
    "  gpao-t owner-ops mcp-server",
    "  gpao-t owner-ops mcp-server-check",
    "  gpao-t owner-ops intake-plan",
    "  gpao-t owner-ops intake-paste <workflow> <text>",
    "  gpao-t owner-ops intake-table <workflow> <filename> <csv-or-tsv-text>",
    "  gpao-t owner-ops intake-file <path> [workflow]",
    "  gpao-t owner-ops intake-folder <path>",
    "  gpao-t owner-ops intake-check",
    "  gpao-t owner-ops first-owner-scenario",
    "  gpao-t owner-ops run-first-owner-scenario",
    "  gpao-t owner-ops first-owner-scenario-check",
    "  gpao-t owner-ops plugin-package",
    "  gpao-t owner-ops market-listing",
    "  gpao-t owner-ops plugin-package-check",
    "  gpao-t owner-ops team-alpha-guide",
    "  gpao-t owner-ops owner-ux-copy",
    "  gpao-t owner-ops team-alpha-check",
    "  gpao-t owner-ops host-registration-guide",
    "  gpao-t owner-ops host-integration-matrix",
    "  gpao-t owner-ops host-integration-matrix-check",
    "  gpao-t owner-ops alpha-feedback-form",
    "  gpao-t owner-ops host-alpha-check",
    "  gpao-t owner-ops sample-data-kit",
    "  gpao-t owner-ops first-owner-beta-guide",
    "  gpao-t owner-ops first-owner-beta-check",
    "  gpao-t owner-ops beta-feedback-synthesis",
    "  gpao-t owner-ops industry-template-catalog",
    "  gpao-t owner-ops market-readiness-gate",
    "  gpao-t owner-ops market-readiness-check",
    "  gpao-t owner-ops template-replay-fixtures",
    "  gpao-t owner-ops privacy-copy-pack",
    "  gpao-t owner-ops pre-public-package-review",
    "  gpao-t owner-ops pre-public-package-check",
    "  gpao-t owner-ops pre-public-evidence-bridge",
    "  gpao-t owner-ops pre-public-evidence-bridge-check",
    "  gpao-t owner-ops pre-public-repair-backlog",
    "  gpao-t owner-ops pre-public-repair-write",
    "  gpao-t owner-ops pre-public-repair-check",
    "  gpao-t owner-ops pre-public-repair-completion",
    "  gpao-t owner-ops pre-public-repair-completion-write",
    "  gpao-t owner-ops pre-public-repair-completion-check",
    "  gpao-t owner-ops distribution-evidence",
    "  gpao-t owner-ops distribution-readme",
    "  gpao-t owner-ops distribution-evidence-check",
    "  gpao-t owner-ops archive-checksum-dry-run",
    "  gpao-t owner-ops archive-checksum-dry-run-check",
    "  gpao-t owner-ops release-readiness-evidence",
    "  gpao-t owner-ops release-readiness-write",
    "  gpao-t owner-ops release-readiness-check",
    "  gpao-t owner-ops human-review-approval-packet",
    "  gpao-t owner-ops human-review-approval-write",
    "  gpao-t owner-ops human-review-approval-check",
    "  gpao-t owner-ops human-review-decision-lane [hold|revise|approve_local_review_only|approve_public_release_later]",
    "  gpao-t owner-ops human-review-decision-append [decision] [approval-token]",
    "  gpao-t owner-ops human-review-decision-records",
    "  gpao-t owner-ops human-review-decision-check",
    "  gpao-t owner-ops public-release-gate",
    "  gpao-t owner-ops public-release-gate-check",
    "  gpao-t owner-ops public-release-readback",
    "  gpao-t owner-ops public-release-readback-check",
    "  gpao-t owner-ops approved-signing-lane",
    "  gpao-t owner-ops approved-signing-lane-check",
    "  gpao-t owner-ops marketplace-upload-approval-gate",
    "  gpao-t owner-ops marketplace-upload-approval-gate-check",
    "  gpao-t owner-ops marketplace-upload-decision-lane [hold|revise|approve_local_distribution_only|approve_marketplace_upload_later]",
    "  gpao-t owner-ops marketplace-upload-decision-append [decision] [approval-token]",
    "  gpao-t owner-ops marketplace-upload-decision-records",
    "  gpao-t owner-ops marketplace-upload-decision-check",
    "  gpao-t owner-ops signed-package-evidence",
    "  gpao-t owner-ops signed-package-evidence-write",
    "  gpao-t owner-ops signed-package-evidence-check",
    "  gpao-t owner-ops install-update-rollback-proof",
    "  gpao-t owner-ops install-update-rollback-proof-write",
    "  gpao-t owner-ops install-update-rollback-proof-check",
    "  gpao-t owner-ops deployment-dry-run-plan",
    "  gpao-t owner-ops deployment-dry-run-write",
    "  gpao-t owner-ops deployment-dry-run-check",
    "  gpao-t owner-ops dry-run-executor-proof [install|update|rollback]",
    "  gpao-t owner-ops dry-run-executor-write [install|update|rollback]",
    "  gpao-t owner-ops dry-run-executor-check [install|update|rollback]",
    "  gpao-t owner-ops dry-run-approval-record-design [install|update|rollback]",
    "  gpao-t owner-ops dry-run-approval-record-write [install|update|rollback]",
    "  gpao-t owner-ops dry-run-approval-record-check [install|update|rollback]",
    "  gpao-t owner-ops dry-run-approval-record-lane [install|update|rollback]",
    "  gpao-t owner-ops dry-run-approval-record-append [install|update|rollback] [approval-token]",
    "  gpao-t owner-ops dry-run-approval-records",
    "  gpao-t owner-ops dry-run-approval-record-lane-check [install|update|rollback]",
    "  gpao-t owner-ops controlled-dry-run-gate [install|update|rollback]",
    "  gpao-t owner-ops controlled-dry-run-invoke [install|update|rollback]",
    "  gpao-t owner-ops controlled-dry-run-records",
    "  gpao-t owner-ops controlled-dry-run-check [install|update|rollback]",
    "  gpao-t owner-ops dry-run-result-handoff [install|update|rollback]",
    "  gpao-t owner-ops dry-run-result-handoff-write [install|update|rollback]",
    "  gpao-t owner-ops dry-run-result-handoff-check [install|update|rollback]",
    "  gpao-t owner-ops local-package-candidate [confirmation-token]",
    "  gpao-t owner-ops local-package-candidate-check",
    "  gpao-t owner-ops local-package-candidate-readback [archive-name]",
    "  gpao-t owner-ops local-package-candidate-readback-check [archive-name]",
    "  gpao-t owner-ops team-alpha-handoff-bundle [archive-name]",
    "  gpao-t owner-ops team-alpha-handoff-write [archive-name]",
    "  gpao-t owner-ops team-alpha-handoff-check [archive-name]",
    "  gpao-t owner-ops first-owner-beta-handoff-bundle [archive-name]",
    "  gpao-t owner-ops first-owner-beta-handoff-write [archive-name]",
    "  gpao-t owner-ops first-owner-beta-handoff-check [archive-name]",
    "  gpao-t owner-ops first-owner-beta-operational-package [archive-name]",
    "  gpao-t owner-ops first-owner-beta-operational-write [archive-name]",
    "  gpao-t owner-ops first-owner-beta-operational-check [archive-name]",
    "  gpao-t owner-ops first-owner-beta-result-review",
    "  gpao-t owner-ops first-owner-beta-result-write",
    "  gpao-t owner-ops first-owner-beta-result-check",
    "  gpao-t owner-ops field-test-ledger",
    "  gpao-t owner-ops field-test-record-append [team_alpha|first_owner_beta] [approval-token]",
    "  gpao-t owner-ops field-test-records",
    "  gpao-t owner-ops field-test-ledger-check",
    "  gpao-t owner-ops field-test-action-queue",
    "  gpao-t owner-ops field-test-action-write",
    "  gpao-t owner-ops field-test-action-check",
    "  gpao-t owner-ops field-test-repair-completion",
    "  gpao-t owner-ops field-test-repair-completion-write",
    "  gpao-t owner-ops field-test-repair-completion-check",
    "  gpao-t owner-ops broader-owner-testing-handoff",
    "  gpao-t owner-ops broader-owner-testing-handoff-write",
    "  gpao-t owner-ops broader-owner-testing-handoff-check",
    "  gpao-t owner-ops broader-owner-testing-result-append [approval-token]",
    "  gpao-t owner-ops broader-owner-testing-results",
    "  gpao-t owner-ops broader-owner-testing-result-ledger",
    "  gpao-t owner-ops broader-owner-testing-result-check",
    "  gpao-t owner-ops broader-owner-testing-repair-queue",
    "  gpao-t owner-ops broader-owner-testing-repair-write",
    "  gpao-t owner-ops broader-owner-testing-repair-check",
    "  gpao-t owner-ops broader-owner-testing-repair-completion",
    "  gpao-t owner-ops broader-owner-testing-repair-completion-write",
    "  gpao-t owner-ops broader-owner-testing-repair-completion-check",
    "  gpao-t owner-ops next-owner-testing-loop",
    "  gpao-t owner-ops next-owner-testing-loop-write",
    "  gpao-t owner-ops next-owner-testing-loop-check",
    "  gpao-t owner-ops final-local-release-candidate",
    "  gpao-t owner-ops final-local-release-candidate-write",
    "  gpao-t owner-ops final-local-release-candidate-check",
    "  gpao-t owner-ops final-candidate-owner-decision-lane [continue_supervised_testing|request_revision|approve_local_candidate_review|consider_public_release_later]",
    "  gpao-t owner-ops final-candidate-owner-decision-append [decision] [approval-token]",
    "  gpao-t owner-ops final-candidate-owner-decision-records",
    "  gpao-t owner-ops final-candidate-owner-decision-check",
    "  gpao-t owner-ops final-candidate-next-action [continue_supervised_testing|request_revision|approve_local_candidate_review|consider_public_release_later]",
    "  gpao-t owner-ops final-candidate-next-action-check",
    "  gpao-t owner-ops beta-feedback-action-queue",
    "  gpao-t owner-ops beta-feedback-action-write",
    "  gpao-t owner-ops beta-feedback-action-check",
    "  gpao-t owner-ops market-evidence-bundle",
    "  gpao-t owner-ops market-evidence-write",
    "  gpao-t owner-ops market-evidence-check",
    "  gpao-t connectors list",
    "  gpao-t connectors governance",
    "  gpao-t connectors tool-governance",
    "  gpao-t connectors tool-governance-check",
    "  gpao-t connectors execution-runtime",
    "  gpao-t connectors execution-runtime-check",
    "  gpao-t connectors authority-heart",
    "  gpao-t connectors authority-heart-check",
    "  gpao-t connectors execution-dry-run [command-id]",
    "  gpao-t connectors execution-invocation-check",
    "  gpao-t connectors read-only-inspect [connector-id]",
    "  gpao-t connectors review <connector-id> [action]",
    "  gpao-t approval execution-proposal [text]",
    "  gpao-t approval execution-proposal-check",
    "  gpao-t approval audit-write-design [text]",
    "  gpao-t approval audit-write-design-check",
    "  gpao-t approval approval-record-write-ux [text]",
    "  gpao-t approval approval-record-write-ux-check",
    "  gpao-t approval local-record-substrate",
    "  gpao-t approval local-record-substrate-check",
    "  gpao-t approval record-write [text]",
    "  gpao-t approval audit-write [text]",
    "  gpao-t approval records",
    "  gpao-t approval audit-records",
    "  gpao-t approval replay [record-id]",
    "  gpao-t ops hardening",
    "  gpao-t ops contract",
    "  gpao-t ops data",
    "  gpao-t ops reliability",
    "  gpao-t ops hardening-record",
    "  gpao-t ops hardening-history",
    "  gpao-t ops hardening-summary",
    "  gpao-t workspace welcome [workspace-root]",
    "  gpao-t workspace welcome-check [workspace-root]",
    "  gpao-t workspace welcome-draft <answers-json> [workspace-root]",
    "  gpao-t workspace welcome-apply <answers-json> <approval-token> [workspace-root]",
    "  gpao-t production stages-5-8",
    "  gpao-t production stages-5-8-check",
    "  gpao-t production alpha-package",
    "  gpao-t production alpha-package-check",
    "  gpao-t first-completion",
    "  gpao-t first-completion-check",
    "  gpao-t first-completion-write",
    "  gpao-t adapters models",
    "  gpao-t adapters tools",
    "  gpao-t adapters model-router-boundary [text]",
    "  gpao-t adapters model-router-boundary-check",
    "  gpao-t adapters model-router-policy [text]",
    "  gpao-t adapters model-router-policy-check",
    "  gpao-t adapters model-providers",
    "  gpao-t adapters model-invocation [provider-id] [text]",
    "  gpao-t adapters model-invocation-local [text]",
    "  gpao-t adapters model-invocation-check",
    "  gpao-t adapters model-provider-runtime-check",
    "  gpao-t adapters provider-auth-heart",
    "  gpao-t adapters provider-auth-heart-check",
    "  gpao-t adapters plan <text>",
    "  gpao-t control snapshot",
    "  gpao-t control summary",
    "  gpao-t control design",
    "  gpao-t control design-reference-gate [slice]",
    "  gpao-t control design-reference-gate-check",
    "  gpao-t control ui-contract",
    "  gpao-t control ui-snapshot",
    "  gpao-t control ui-validate",
    "  gpao-t control html",
    "  gpao-t control render [output.html]",
    "  gpao-t control serve-contract",
    "  gpao-t control serve-check",
    "  gpao-t control serve [port]",
    "  gpao-t control work-surface",
    "  gpao-t control work-surface-html",
    "  gpao-t control work-surface-check",
    "  gpao-t control sessions",
    "  gpao-t control sessions-action <action> [session-id] [title/request]",
    "  gpao-t control sessions-check",
    "  gpao-t control session-heart",
    "  gpao-t control session-heart-check",
    "  gpao-t control multi-chat-workspace",
    "  gpao-t control multi-chat-workspace-check",
    "  gpao-t control multi-chat-stages-1-6",
    "  gpao-t control multi-chat-stages-1-6-check",
    "  gpao-t control multi-chat-memory-review-queue",
    "  gpao-t control work-surface-local-loop [text]",
    "  gpao-t control work-surface-local-loop-check [text]",
    "  gpao-t control work-surface-submission-gate",
    "  gpao-t control work-surface-submission-gate-check",
    "  gpao-t control work-surface-submission-validation-gate",
    "  gpao-t control work-surface-submission-validation-gate-check",
    "  gpao-t control work-surface-execution-flow [text]",
    "  gpao-t control work-surface-execution-confirmation [matches_intent|needs_changes|hold]",
    "  gpao-t control work-surface-execution-flow-check [text]",
    "  gpao-t control work-surface-execution-record [text] [matches_intent|needs_changes|hold]",
    "  gpao-t control workspace-shell [text]",
    "  gpao-t control workspace-shell-html [text]",
    "  gpao-t control workspace-shell-check [text]",
    "  gpao-t control app-shell-contract",
    "  gpao-t control app-shell-state",
    "  gpao-t control app-shell-html",
    "  gpao-t control app-shell-check",
    "  gpao-t control tauri-gate",
    "  gpao-t control tauri-gate-check",
    "  gpao-t control packaged-desktop-review",
    "  gpao-t control packaged-desktop-review-check",
    "  gpao-t control tauri-install-gate",
    "  gpao-t control tauri-install-gate-check",
    "  gpao-t control tauri-prerequisite-doctor",
    "  gpao-t control tauri-prerequisite-doctor-check",
    "  gpao-t control tauri-dry-run-contract",
    "  gpao-t control tauri-dry-run-contract-check",
    "  gpao-t control tauri-dry-run-design",
    "  gpao-t control tauri-dry-run-design-check",
    "  gpao-t control tauri-dry-run-plan",
    "  gpao-t control tauri-dry-run-plan-check",
    "  gpao-t control tauri-dry-run-preview",
    "  gpao-t control tauri-dry-run-preview-check",
    "  gpao-t control tauri-dry-run-invocation-approval",
    "  gpao-t control tauri-dry-run-invocation-approval-check",
    "  gpao-t control tauri-dry-run-approval-storage",
    "  gpao-t control tauri-dry-run-approval-storage-check",
    "  gpao-t control tauri-dry-run-approval-write-gate",
    "  gpao-t control tauri-dry-run-approval-write-gate-check",
    "  gpao-t control tauri-shell-slice",
    "  gpao-t control tauri-shell-html",
    "  gpao-t control tauri-shell-check",
    "  gpao-t control stage-4-production-hardening",
    "  gpao-t control stage-4-production-hardening-html",
    "  gpao-t control stage-4-production-hardening-check",
    "  gpao-t state",
    "  gpao-t events",
    "  gpao-t memory capture <title> <body>",
    "  gpao-t memory list",
    "  gpao-t memory status --index",
    "  gpao-t memory index --force",
    "  gpao-t memory search <text>",
    "  gpao-t memory heart",
    "  gpao-t memory heart-check",
    "  gpao-t mesh resolve <text>",
    "  gpao-t gateway <GET|POST> <path> [json-body]",
    "  gpao-t doctor",
    "",
    "Examples:",
    "  gpao-t turn \"그럼 배포파일은?\"",
    "  gpao-t replay fixtures/replay/release-file-active-target.json",
  ].join("\n");
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

const [, , command, ...args] = process.argv;

try {
  if (!command || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(`${usage()}\n`);
  } else if (command === "init") {
    printJson(initializeRuntimeState());
  } else if (command === "doctor") {
    printJson(runDoctor());
  } else if (command === "doctor-heart") {
    const providerAuthInventory = inspectProviderAuthStores();
    const providerAuthRepairPlan = buildProviderAuthRepairPlan({ inventory: providerAuthInventory });
    printJson(buildDoctorRecoveryHeart({
      sourceDoctor: runDoctor(),
      providerAuthInventory,
      providerAuthRepairPlan,
    }));
  } else if (command === "doctor-heart-check") {
    const providerAuthInventory = inspectProviderAuthStores();
    const providerAuthRepairPlan = buildProviderAuthRepairPlan({ inventory: providerAuthInventory });
    const heart = buildDoctorRecoveryHeart({
      sourceDoctor: runDoctor(),
      providerAuthInventory,
      providerAuthRepairPlan,
    });
    printJson(verifyDoctorRecoveryHeart({ heart }));
  } else if (command === "state") {
    printJson(readRuntimeState());
  } else if (command === "events") {
    printJson(readAuditEvents());
  } else if (command === "memory") {
    const [subcommand, title, ...bodyParts] = args;
    if (subcommand === "capture") {
      if (!title || !bodyParts.length) {
        throw new Error("memory capture requires title and body");
      }
      printJson(captureMemoryEntry({ title, body: bodyParts.join(" ") }));
    } else if (subcommand === "list") {
      printJson(readMemoryWiki());
    } else if (subcommand === "status") {
      printJson(getMemorySearchStatus());
    } else if (subcommand === "index") {
      printJson(buildMemorySearchIndex());
    } else if (subcommand === "search") {
      const query = [title, ...bodyParts].filter(Boolean).join(" ").trim();
      if (!query) {
        throw new Error("memory search requires query text");
      }
      printJson(searchMemory({ query }));
    } else if (subcommand === "heart") {
      printJson(buildMemoryContextHeart());
    } else if (subcommand === "heart-check") {
      const heart = buildMemoryContextHeart();
      printJson(verifyMemoryContextHeart({ heart }));
    } else if (subcommand === "index-info") {
      printJson(readMemorySearchIndex());
    } else {
      throw new Error("memory command requires capture, list, status, index, index-info, search, heart, or heart-check");
    }
  } else if (command === "mesh") {
    const [subcommand, ...textParts] = args;
    if (subcommand !== "resolve") {
      throw new Error("mesh command requires resolve");
    }
    const text = textParts.join(" ").trim();
    if (!text) {
      throw new Error("mesh resolve requires input text");
    }
    printJson(resolveContextMesh({ request: text }));
  } else if (command === "turn") {
    const text = args.join(" ").trim();
    if (!text) {
      throw new Error("turn command requires input text");
    }
    printJson(runRuntimeTurn({ input: { text } }));
  } else if (command === "replay") {
    const fixturePath = args[0];
    if (!fixturePath) {
      throw new Error("replay command requires a fixture path");
    }
    const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8"));
    printJson(runRuntimeTurn(fixture));
  } else if (command === "replay-view") {
    const fixturePath = args[0];
    if (!fixturePath) {
      throw new Error("replay-view command requires a fixture path");
    }
    printJson(buildReplayRecoveryView({ fixturePath }));
  } else if (command === "replay-record") {
    const fixturePath = args[0];
    if (!fixturePath) {
      throw new Error("replay-record command requires a fixture path");
    }
    printJson(appendReplayRecoveryRecord({ fixturePath }));
  } else if (command === "recovery") {
    const [subcommand] = args;
    if (subcommand === "history") {
      printJson(readReplayRecoveryHistory());
    } else if (subcommand === "summary") {
      printJson(buildRecoveryHistorySummary());
    } else {
      throw new Error("recovery command requires history or summary");
    }
  } else if (command === "auto-memory-growth") {
    const [subcommand, ...textParts] = args;
    const text = textParts.join(" ").trim();
    if (subcommand === "policy") {
      printJson(buildAutoMemoryGrowthPolicy());
    } else if (subcommand === "classify") {
      if (!text) {
        throw new Error("auto-memory-growth classify requires text");
      }
      printJson(classifyAutoMemoryGrowthAuthority({ text }));
    } else if (subcommand === "run") {
      if (!text) {
        throw new Error("auto-memory-growth run requires text");
      }
      printJson(runAutoMemoryGrowthLoop({ text, request: text }));
    } else if (subcommand === "runs") {
      printJson(readAutoMemoryGrowthRuns());
    } else if (subcommand === "summary") {
      printJson(buildAutoMemoryGrowthSummary());
    } else if (subcommand === "verify") {
      printJson(verifyAutoMemoryGrowthLoop());
    } else {
      throw new Error("auto-memory-growth command requires policy, classify, run, runs, summary, or verify");
    }
  } else if (command === "live-turn") {
    const [subcommand, ...parts] = args;
    if (subcommand === "policy") {
      printJson(buildLiveTurnAbsorptionPolicy());
    } else if (subcommand === "source") {
      printJson(classifyLiveTurnSource({ source: parts[0] }));
    } else if (subcommand === "run") {
      const message = parts.join(" ").trim();
      if (!message) {
        throw new Error("live-turn run requires message text");
      }
      printJson(runLiveTurnAbsorptionBridge({ message, source: "controlled_smoke" }));
    } else if (subcommand === "run-answer") {
      const separatorIndex = parts.indexOf(":::");
      if (separatorIndex < 1 || separatorIndex === parts.length - 1) {
        throw new Error("live-turn run-answer requires <message> ::: <answer>");
      }
      const message = parts.slice(0, separatorIndex).join(" ").trim();
      const answerText = parts.slice(separatorIndex + 1).join(" ").trim();
      printJson(runLiveTurnAbsorptionBridge({ message, answerText, source: "controlled_smoke" }));
    } else if (subcommand === "runs") {
      printJson(readLiveTurnAbsorptionRuns());
    } else if (subcommand === "summary") {
      printJson(buildLiveTurnAbsorptionSummary());
    } else if (subcommand === "progress") {
      printJson(readConversationProgressEvents());
    } else if (subcommand === "progress-lane") {
      printJson(buildConversationProgressLane());
    } else if (subcommand === "tool-progress") {
      const [toolName, status = "running", ...summaryParts] = parts;
      if (!toolName) {
        throw new Error("live-turn tool-progress requires <toolName> [running|complete|error|blocked] [summary]");
      }
      printJson(appendToolProgressEvent({
        toolName,
        status,
        summary: summaryParts.join(" ").trim(),
      }));
    } else if (subcommand === "verify") {
      printJson(verifyLiveTurnAbsorptionBridge());
    } else {
      throw new Error("live-turn command requires policy, source, run, run-answer, runs, summary, progress, progress-lane, tool-progress, or verify");
    }
  } else if (command === "runtime") {
    const [subcommand] = args;
    if (subcommand === "heart") {
      printJson(buildRuntimeHeartHardening({ root: process.cwd() }));
    } else if (subcommand === "heart-check") {
      const hardening = buildRuntimeHeartHardening({ root: process.cwd() });
      printJson(verifyRuntimeHeartHardening({ hardening }));
    } else if (subcommand === "live-turn-hook-readiness") {
      printJson(buildOpenClawLiveTurnHookReadinessGate({ root: process.cwd() }));
    } else if (subcommand === "live-turn-hook-readiness-check") {
      printJson(verifyOpenClawLiveTurnHookReadinessGate({ root: process.cwd() }));
    } else {
      throw new Error("runtime command requires heart, heart-check, live-turn-hook-readiness, or live-turn-hook-readiness-check");
    }
  } else if (command === "growth") {
    const [subcommand, target, approvalStatus] = args;
    if (subcommand === "preview") {
      printJson(buildSelfGrowthProposal({ target }));
    } else if (subcommand === "propose") {
      printJson(appendSelfGrowthProposal({ target }));
    } else if (subcommand === "proposals") {
      printJson(readSelfGrowthProposals());
    } else if (subcommand === "gate") {
      printJson(buildGrowthApplicationGate(parseGrowthGateArgs({ target, approvalStatus })));
    } else if (subcommand === "gate-record") {
      printJson(appendGrowthApplicationGate(parseGrowthGateArgs({ target, approvalStatus })));
    } else if (subcommand === "gates") {
      printJson(readGrowthApplicationGates());
    } else if (subcommand === "gate-summary") {
      printJson(buildGrowthApplicationGateSummary());
    } else {
      throw new Error("growth command requires preview, propose, proposals, gate, gate-record, gates, or gate-summary");
    }
  } else if (command === "skill") {
    const [subcommand, firstArg, ...restArgs] = args;
    if (subcommand === "ecosystem") {
      printJson(buildSkillEcosystemPlan());
    } else if (subcommand === "atlas") {
      printJson(buildSkillCandidateAtlas(parseSkillAtlasFilter({ value: firstArg })));
    } else if (subcommand === "roadmap") {
      printJson(buildSkillProductionRoadmap());
    } else if (subcommand === "build-queue") {
      printJson(buildSkillBuildQueue({ phase: firstArg || "phase-1" }));
    } else if (subcommand === "production-status") {
      printJson(buildSkillProductionStatus({ phase: firstArg || "phase-1" }));
    } else if (subcommand === "execute-plan") {
      const request = [firstArg, ...restArgs].filter(Boolean).join(" ").trim();
      if (!request) {
        throw new Error("skill execute-plan requires input text");
      }
      printJson(buildSkillExecutionPlan({ request }));
    } else if (subcommand === "execute") {
      const request = [firstArg, ...restArgs].filter(Boolean).join(" ").trim();
      if (!request) {
        throw new Error("skill execute requires input text");
      }
      printJson(buildSkillExecutionRun({ request }));
    } else if (subcommand === "execute-record") {
      const request = [firstArg, ...restArgs].filter(Boolean).join(" ").trim();
      if (!request) {
        throw new Error("skill execute-record requires input text");
      }
      printJson(appendSkillExecutionRun({ request }));
    } else if (subcommand === "execution-history") {
      printJson(readSkillExecutionHistory());
    } else if (subcommand === "execution-summary") {
      printJson(buildSkillExecutionSummary());
    } else if (subcommand === "intent") {
      const request = [firstArg, ...restArgs].filter(Boolean).join(" ").trim();
      if (!request) {
        throw new Error("skill intent requires input text");
      }
      printJson(buildSkillIntentProfile({ request }));
    } else if (subcommand === "manifest") {
      printJson(buildSkillManifestStandard());
    } else if (subcommand === "manual-first") {
      printJson(buildSkillManualFirstPlan());
    } else if (subcommand === "packs") {
      printJson(listSkillPacks({ category: firstArg }));
    } else if (subcommand === "inspect") {
      if (!firstArg) {
        throw new Error("skill inspect requires skill pack id");
      }
      printJson(getSkillPack({ id: firstArg }));
    } else if (subcommand === "route") {
      const request = [firstArg, ...restArgs].filter(Boolean).join(" ").trim();
      if (!request) {
        throw new Error("skill route requires input text");
      }
      printJson(routeSkillPacks({ request }));
    } else if (subcommand === "readiness") {
      printJson(buildSkillReadinessReport());
    } else {
      throw new Error("skill command requires ecosystem, atlas, roadmap, build-queue, production-status, execute-plan, execute, execute-record, execution-history, execution-summary, intent, manifest, manual-first, packs, inspect, route, or readiness");
    }
  } else if (command === "owner-ops") {
    const [subcommand, firstArg, ...restArgs] = args;
    if (subcommand === "skill-pack") {
      printJson(buildOwnerOpsSkillPack());
    } else if (subcommand === "field-casebook") {
      printJson(buildOwnerOpsFieldCasebook());
    } else if (subcommand === "authority-matrix") {
      printJson(buildOwnerOpsAuthorityMatrix());
    } else if (subcommand === "scenarios") {
      printJson(buildOwnerOpsFirstScenarios());
    } else if (subcommand === "candidates") {
      printJson(buildOwnerOpsAutomationCandidates({
        request: [firstArg, ...restArgs].filter(Boolean).join(" "),
      }));
    } else if (subcommand === "workflow") {
      printJson(buildOwnerOpsWorkflowPreview({
        workflowType: firstArg || "review_reply",
        inputText: restArgs.join(" ") || undefined,
      }));
    } else if (subcommand === "record") {
      printJson(writeOwnerOpsLocalRecord({
        workflowType: firstArg || "review_reply",
        inputText: restArgs.join(" ") || undefined,
      }));
    } else if (subcommand === "records") {
      printJson(readOwnerOpsRecords());
    } else if (subcommand === "replay") {
      printJson(buildOwnerOpsEffectReplay());
    } else if (subcommand === "check") {
      printJson(verifyOwnerOpsPack());
    } else if (subcommand === "product-axis-readiness") {
      printJson(buildOwnerOpsProductAxisReadinessMatrix({ root: process.cwd() }));
    } else if (subcommand === "product-axis-readiness-check") {
      printJson(verifyOwnerOpsProductAxisReadinessMatrix({ root: process.cwd() }));
    } else if (subcommand === "production-completion-audit") {
      printJson(buildOwnerOpsProductionCompletionAudit({ root: process.cwd() }));
    } else if (subcommand === "production-completion-audit-check") {
      printJson(verifyOwnerOpsProductionCompletionAudit({ root: process.cwd() }));
    } else if (subcommand === "supervised-testing-readiness") {
      printJson(buildOwnerOpsSupervisedTestingReadinessPacket({ root: process.cwd() }));
    } else if (subcommand === "supervised-testing-readiness-check") {
      printJson(verifyOwnerOpsSupervisedTestingReadinessPacket({ root: process.cwd() }));
    } else if (subcommand === "mcp-plan") {
      printJson(buildOwnerOpsMcpPlan());
    } else if (subcommand === "connector-catalog") {
      printJson(buildOwnerOpsConnectorCatalog());
    } else if (subcommand === "mcp-tools") {
      printJson(buildOwnerOpsMcpToolManifest());
    } else if (subcommand === "mcp-check") {
      printJson(verifyOwnerOpsMcpReadiness());
    } else if (subcommand === "mcp-server") {
      printJson(buildOwnerOpsMcpServerDescriptor());
    } else if (subcommand === "mcp-server-check") {
      printJson(verifyOwnerOpsMcpServer());
    } else if (subcommand === "intake-plan") {
      printJson(buildOwnerOpsReadOnlyIntakePlan());
    } else if (subcommand === "intake-paste") {
      printJson(previewOwnerOpsPasteIntake({
        workflowType: firstArg || "review_reply",
        inputText: restArgs.join(" "),
      }));
    } else if (subcommand === "intake-table") {
      const [workflowType, filename, ...contentParts] = [firstArg, ...restArgs];
      printJson(previewOwnerOpsTableTextIntake({
        workflowType: workflowType || "shopping_inquiry",
        filename: filename || "owner-ops.csv",
        content: contentParts.join(" "),
      }));
    } else if (subcommand === "intake-file") {
      printJson(previewOwnerOpsLocalFileIntake({
        filePath: firstArg,
        workflowType: restArgs[0],
      }));
    } else if (subcommand === "intake-folder") {
      printJson(previewOwnerOpsFolderIntake({
        folderPath: firstArg,
      }));
    } else if (subcommand === "intake-check") {
      printJson(verifyOwnerOpsReadOnlyIntakeConnectors());
    } else if (subcommand === "first-owner-scenario") {
      printJson(buildOwnerOpsFirstOwnerScenarioFixture());
    } else if (subcommand === "run-first-owner-scenario") {
      printJson(runOwnerOpsFirstOwnerScenario());
    } else if (subcommand === "first-owner-scenario-check") {
      printJson(verifyOwnerOpsFirstOwnerScenario());
    } else if (subcommand === "plugin-package") {
      printJson(buildOwnerOpsPluginPackageManifest());
    } else if (subcommand === "market-listing") {
      printJson(buildOwnerOpsMarketListingDraft());
    } else if (subcommand === "plugin-package-check") {
      printJson(verifyOwnerOpsPluginPackage());
    } else if (subcommand === "team-alpha-guide") {
      printJson(buildOwnerOpsTeamAlphaGuide());
    } else if (subcommand === "owner-ux-copy") {
      printJson(buildOwnerOpsOwnerFacingUxCopy());
    } else if (subcommand === "team-alpha-check") {
      printJson(verifyOwnerOpsTeamAlphaReadiness());
    } else if (subcommand === "host-registration-guide") {
      printJson(buildOwnerOpsHostRegistrationGuide());
    } else if (subcommand === "host-integration-matrix") {
      printJson(buildOwnerOpsHostIntegrationMatrix());
    } else if (subcommand === "host-integration-matrix-check") {
      printJson(verifyOwnerOpsHostIntegrationMatrix());
    } else if (subcommand === "alpha-feedback-form") {
      printJson(buildOwnerOpsAlphaFeedbackForm());
    } else if (subcommand === "host-alpha-check") {
      printJson(verifyOwnerOpsHostAlphaHandoff());
    } else if (subcommand === "sample-data-kit") {
      printJson(buildOwnerOpsSampleDataKit());
    } else if (subcommand === "first-owner-beta-guide") {
      printJson(buildOwnerOpsFirstOwnerBetaGuide());
    } else if (subcommand === "first-owner-beta-check") {
      printJson(verifyOwnerOpsFirstOwnerBetaReadiness());
    } else if (subcommand === "beta-feedback-synthesis") {
      printJson(buildOwnerOpsBetaFeedbackSynthesis());
    } else if (subcommand === "industry-template-catalog") {
      printJson(buildOwnerOpsIndustryTemplateCatalog());
    } else if (subcommand === "market-readiness-gate") {
      printJson(buildOwnerOpsMarketReadinessGate());
    } else if (subcommand === "market-readiness-check") {
      printJson(verifyOwnerOpsMarketReadiness());
    } else if (subcommand === "template-replay-fixtures") {
      printJson(buildOwnerOpsTemplateReplayFixtures());
    } else if (subcommand === "privacy-copy-pack") {
      printJson(buildOwnerOpsPrivacyCopyPack());
    } else if (subcommand === "pre-public-package-review") {
      printJson(buildOwnerOpsPrePublicPackageReview());
    } else if (subcommand === "pre-public-package-check") {
      printJson(verifyOwnerOpsPrePublicPackage());
    } else if (subcommand === "pre-public-evidence-bridge") {
      printJson(buildOwnerOpsPrePublicEvidenceBridge({
        root: process.cwd(),
      }));
    } else if (subcommand === "pre-public-evidence-bridge-check") {
      printJson(verifyOwnerOpsPrePublicEvidenceBridge({
        root: process.cwd(),
      }));
    } else if (subcommand === "pre-public-repair-backlog") {
      printJson(buildOwnerOpsPrePublicRepairBacklog({
        root: process.cwd(),
      }));
    } else if (subcommand === "pre-public-repair-write") {
      printJson(writeOwnerOpsPrePublicRepairBacklog({
        root: process.cwd(),
      }));
    } else if (subcommand === "pre-public-repair-check") {
      printJson(verifyOwnerOpsPrePublicRepairBacklog({
        root: process.cwd(),
      }));
    } else if (subcommand === "pre-public-repair-completion") {
      printJson(buildOwnerOpsPrePublicRepairCompletionEvidence({
        root: process.cwd(),
      }));
    } else if (subcommand === "pre-public-repair-completion-write") {
      printJson(writeOwnerOpsPrePublicRepairCompletionEvidence({
        root: process.cwd(),
      }));
    } else if (subcommand === "pre-public-repair-completion-check") {
      printJson(verifyOwnerOpsPrePublicRepairCompletionEvidence({
        root: process.cwd(),
      }));
    } else if (subcommand === "distribution-evidence") {
      printJson(buildOwnerOpsDistributionEvidence({ root: process.cwd() }));
    } else if (subcommand === "distribution-readme") {
      printJson(buildOwnerOpsDistributionReadme({ root: process.cwd() }));
    } else if (subcommand === "distribution-evidence-check") {
      printJson(verifyOwnerOpsDistributionEvidence({ root: process.cwd() }));
    } else if (subcommand === "archive-checksum-dry-run") {
      printJson(buildOwnerOpsArchiveChecksumDryRun({ root: process.cwd() }));
    } else if (subcommand === "archive-checksum-dry-run-check") {
      printJson(verifyOwnerOpsArchiveChecksumDryRun({ root: process.cwd() }));
    } else if (subcommand === "release-readiness-evidence") {
      printJson(buildOwnerOpsReleaseReadinessEvidence({ root: process.cwd() }));
    } else if (subcommand === "release-readiness-write") {
      printJson(writeOwnerOpsReleaseReadinessEvidence({ root: process.cwd() }));
    } else if (subcommand === "release-readiness-check") {
      printJson(verifyOwnerOpsReleaseReadinessEvidence({ root: process.cwd() }));
    } else if (subcommand === "human-review-approval-packet") {
      printJson(buildOwnerOpsHumanReviewApprovalPacket({ root: process.cwd() }));
    } else if (subcommand === "human-review-approval-write") {
      printJson(writeOwnerOpsHumanReviewApprovalPacket({ root: process.cwd() }));
    } else if (subcommand === "human-review-approval-check") {
      printJson(verifyOwnerOpsHumanReviewApprovalPacket({ root: process.cwd() }));
    } else if (subcommand === "human-review-decision-lane") {
      printJson(buildOwnerOpsHumanReviewDecisionLane({
        root: process.cwd(),
        decision: firstArg || "hold",
      }));
    } else if (subcommand === "human-review-decision-append") {
      printJson(appendOwnerOpsHumanReviewDecisionRecord({
        root: process.cwd(),
        decision: firstArg || "hold",
        approvalToken: restArgs[0],
      }));
    } else if (subcommand === "human-review-decision-records") {
      printJson(readOwnerOpsHumanReviewDecisionRecords({ root: process.cwd() }));
    } else if (subcommand === "human-review-decision-check") {
      printJson(verifyOwnerOpsHumanReviewDecisionLane({ root: process.cwd() }));
    } else if (subcommand === "public-release-gate") {
      printJson(buildOwnerOpsPublicReleaseAuthorityGate({ root: process.cwd() }));
    } else if (subcommand === "public-release-gate-check") {
      printJson(verifyOwnerOpsPublicReleaseAuthorityGate({ root: process.cwd() }));
    } else if (subcommand === "public-release-readback") {
      printJson(buildOwnerOpsPublicReleaseReadbackSnapshot({ root: process.cwd() }));
    } else if (subcommand === "public-release-readback-check") {
      printJson(verifyOwnerOpsPublicReleaseReadbackSnapshot({ root: process.cwd() }));
    } else if (subcommand === "approved-signing-lane") {
      printJson(buildOwnerOpsApprovedSigningLane({ root: process.cwd() }));
    } else if (subcommand === "approved-signing-lane-check") {
      printJson(verifyOwnerOpsApprovedSigningLane({ root: process.cwd() }));
    } else if (subcommand === "marketplace-upload-approval-gate") {
      printJson(buildOwnerOpsMarketplaceUploadApprovalGate({ root: process.cwd() }));
    } else if (subcommand === "marketplace-upload-approval-gate-check") {
      printJson(verifyOwnerOpsMarketplaceUploadApprovalGate({ root: process.cwd() }));
    } else if (subcommand === "marketplace-upload-decision-lane") {
      printJson(buildOwnerOpsMarketplaceUploadDecisionLane({
        root: process.cwd(),
        decision: firstArg || "hold",
      }));
    } else if (subcommand === "marketplace-upload-decision-append") {
      printJson(appendOwnerOpsMarketplaceUploadDecisionRecord({
        root: process.cwd(),
        decision: firstArg || "hold",
        approvalToken: restArgs[0],
      }));
    } else if (subcommand === "marketplace-upload-decision-records") {
      printJson(readOwnerOpsMarketplaceUploadDecisionRecords({ root: process.cwd() }));
    } else if (subcommand === "marketplace-upload-decision-check") {
      printJson(verifyOwnerOpsMarketplaceUploadDecisionLane({ root: process.cwd() }));
    } else if (subcommand === "signed-package-evidence") {
      printJson(buildOwnerOpsSignedPackageEvidence({ root: process.cwd() }));
    } else if (subcommand === "signed-package-evidence-write") {
      printJson(writeOwnerOpsSignedPackageEvidence({ root: process.cwd() }));
    } else if (subcommand === "signed-package-evidence-check") {
      printJson(verifyOwnerOpsSignedPackageEvidence({ root: process.cwd() }));
    } else if (subcommand === "install-update-rollback-proof") {
      printJson(buildOwnerOpsInstallUpdateRollbackProof({ root: process.cwd() }));
    } else if (subcommand === "install-update-rollback-proof-write") {
      printJson(writeOwnerOpsInstallUpdateRollbackProof({ root: process.cwd() }));
    } else if (subcommand === "install-update-rollback-proof-check") {
      printJson(verifyOwnerOpsInstallUpdateRollbackProof({ root: process.cwd() }));
    } else if (subcommand === "deployment-dry-run-plan") {
      printJson(buildOwnerOpsDeploymentDryRunPlan({ root: process.cwd() }));
    } else if (subcommand === "deployment-dry-run-write") {
      printJson(writeOwnerOpsDeploymentDryRunPlan({ root: process.cwd() }));
    } else if (subcommand === "deployment-dry-run-check") {
      printJson(verifyOwnerOpsDeploymentDryRunPlan({ root: process.cwd() }));
    } else if (subcommand === "dry-run-executor-proof") {
      printJson(buildOwnerOpsDryRunExecutorProof({
        root: process.cwd(),
        requestedLane: firstArg || "install",
      }));
    } else if (subcommand === "dry-run-executor-write") {
      printJson(writeOwnerOpsDryRunExecutorProof({
        root: process.cwd(),
        requestedLane: firstArg || "install",
      }));
    } else if (subcommand === "dry-run-executor-check") {
      printJson(verifyOwnerOpsDryRunExecutorProof({
        root: process.cwd(),
        requestedLane: firstArg || "install",
      }));
    } else if (subcommand === "dry-run-approval-record-design") {
      printJson(buildOwnerOpsDryRunApprovalRecordDesign({
        root: process.cwd(),
        requestedLane: firstArg || "install",
      }));
    } else if (subcommand === "dry-run-approval-record-write") {
      printJson(writeOwnerOpsDryRunApprovalRecordDesign({
        root: process.cwd(),
        requestedLane: firstArg || "install",
      }));
    } else if (subcommand === "dry-run-approval-record-check") {
      printJson(verifyOwnerOpsDryRunApprovalRecordDesign({
        root: process.cwd(),
        requestedLane: firstArg || "install",
      }));
    } else if (subcommand === "dry-run-approval-record-lane") {
      printJson(buildOwnerOpsDryRunApprovalRecordWriteLane({
        root: process.cwd(),
        requestedLane: firstArg || "install",
      }));
    } else if (subcommand === "dry-run-approval-record-append") {
      const approvalToken = restArgs[0];
      printJson(appendOwnerOpsDryRunApprovalRecord({
        root: process.cwd(),
        requestedLane: firstArg || "install",
        approvalToken,
        decision: approvalToken ? "approve_dry_run_invocation" : "hold",
      }));
    } else if (subcommand === "dry-run-approval-records") {
      printJson(readOwnerOpsDryRunApprovalRecords({ root: process.cwd() }));
    } else if (subcommand === "dry-run-approval-record-lane-check") {
      printJson(verifyOwnerOpsDryRunApprovalRecordWriteLane({
        root: process.cwd(),
        requestedLane: firstArg || "install",
      }));
    } else if (subcommand === "controlled-dry-run-gate") {
      printJson(buildOwnerOpsControlledDryRunInvocationGate({
        root: process.cwd(),
        requestedLane: firstArg || "install",
      }));
    } else if (subcommand === "controlled-dry-run-invoke") {
      printJson(invokeOwnerOpsControlledDryRun({
        root: process.cwd(),
        requestedLane: firstArg || "install",
      }));
    } else if (subcommand === "controlled-dry-run-records") {
      printJson(readOwnerOpsControlledDryRunInvocations({ root: process.cwd() }));
    } else if (subcommand === "controlled-dry-run-check") {
      printJson(verifyOwnerOpsControlledDryRunInvocationGate({
        root: process.cwd(),
        requestedLane: firstArg || "install",
      }));
    } else if (subcommand === "dry-run-result-handoff") {
      printJson(buildOwnerOpsDryRunResultReviewHandoff({
        root: process.cwd(),
        requestedLane: firstArg || "install",
      }));
    } else if (subcommand === "dry-run-result-handoff-write") {
      printJson(writeOwnerOpsDryRunResultReviewHandoff({
        root: process.cwd(),
        requestedLane: firstArg || "install",
      }));
    } else if (subcommand === "dry-run-result-handoff-check") {
      printJson(verifyOwnerOpsDryRunResultReviewHandoff({
        root: process.cwd(),
        requestedLane: firstArg || "install",
      }));
    } else if (subcommand === "local-package-candidate") {
      printJson(writeOwnerOpsLocalPackageCandidate({
        root: process.cwd(),
        confirmationToken: firstArg,
      }));
    } else if (subcommand === "local-package-candidate-check") {
      printJson(verifyOwnerOpsLocalPackageCandidateWriter({ root: process.cwd() }));
    } else if (subcommand === "local-package-candidate-readback") {
      printJson(readOwnerOpsLocalPackageCandidate({
        root: process.cwd(),
        archiveName: firstArg,
      }));
    } else if (subcommand === "local-package-candidate-readback-check") {
      printJson(verifyOwnerOpsLocalPackageCandidateReadback({
        root: process.cwd(),
        archiveName: firstArg,
      }));
    } else if (subcommand === "team-alpha-handoff-bundle") {
      printJson(buildOwnerOpsTeamAlphaHandoffBundle({
        root: process.cwd(),
        archiveName: firstArg,
      }));
    } else if (subcommand === "team-alpha-handoff-write") {
      printJson(writeOwnerOpsTeamAlphaHandoffBundle({
        root: process.cwd(),
        archiveName: firstArg,
      }));
    } else if (subcommand === "team-alpha-handoff-check") {
      printJson(verifyOwnerOpsTeamAlphaHandoffBundle({
        root: process.cwd(),
        archiveName: firstArg,
      }));
    } else if (subcommand === "first-owner-beta-handoff-bundle") {
      printJson(buildOwnerOpsFirstOwnerBetaHandoffBundle({
        root: process.cwd(),
        archiveName: firstArg,
      }));
    } else if (subcommand === "first-owner-beta-handoff-write") {
      printJson(writeOwnerOpsFirstOwnerBetaHandoffBundle({
        root: process.cwd(),
        archiveName: firstArg,
      }));
    } else if (subcommand === "first-owner-beta-handoff-check") {
      printJson(verifyOwnerOpsFirstOwnerBetaHandoffBundle({
        root: process.cwd(),
        archiveName: firstArg,
      }));
    } else if (subcommand === "first-owner-beta-operational-package") {
      printJson(buildOwnerOpsFirstOwnerBetaOperationalTestPackage({
        root: process.cwd(),
        archiveName: firstArg,
      }));
    } else if (subcommand === "first-owner-beta-operational-write") {
      printJson(writeOwnerOpsFirstOwnerBetaOperationalTestPackage({
        root: process.cwd(),
        archiveName: firstArg,
      }));
    } else if (subcommand === "first-owner-beta-operational-check") {
      printJson(verifyOwnerOpsFirstOwnerBetaOperationalTestPackage({
        root: process.cwd(),
        archiveName: firstArg,
      }));
    } else if (subcommand === "first-owner-beta-result-review") {
      printJson(buildOwnerOpsFirstOwnerBetaResultReview({
        root: process.cwd(),
      }));
    } else if (subcommand === "first-owner-beta-result-write") {
      printJson(writeOwnerOpsFirstOwnerBetaResultReview({
        root: process.cwd(),
      }));
    } else if (subcommand === "first-owner-beta-result-check") {
      printJson(verifyOwnerOpsFirstOwnerBetaResultReview({
        root: process.cwd(),
      }));
    } else if (subcommand === "field-test-ledger") {
      printJson(buildOwnerOpsFieldTestLedger({
        root: process.cwd(),
      }));
    } else if (subcommand === "field-test-record-append") {
      printJson(appendOwnerOpsFieldTestRecord({
        root: process.cwd(),
        approvalToken: restArgs[0],
        record: {
          stage: firstArg || "team_alpha",
        },
      }));
    } else if (subcommand === "field-test-records") {
      printJson(readOwnerOpsFieldTestRecords({
        root: process.cwd(),
      }));
    } else if (subcommand === "field-test-ledger-check") {
      printJson(verifyOwnerOpsFieldTestLedger({
        root: process.cwd(),
      }));
    } else if (subcommand === "field-test-action-queue") {
      printJson(buildOwnerOpsFieldTestActionQueue({
        root: process.cwd(),
      }));
    } else if (subcommand === "field-test-action-write") {
      printJson(writeOwnerOpsFieldTestActionQueue({
        root: process.cwd(),
      }));
    } else if (subcommand === "field-test-action-check") {
      printJson(verifyOwnerOpsFieldTestActionQueue({
        root: process.cwd(),
      }));
    } else if (subcommand === "field-test-repair-completion") {
      printJson(buildOwnerOpsFieldTestRepairCompletionEvidence({
        root: process.cwd(),
      }));
    } else if (subcommand === "field-test-repair-completion-write") {
      printJson(writeOwnerOpsFieldTestRepairCompletionEvidence({
        root: process.cwd(),
      }));
    } else if (subcommand === "field-test-repair-completion-check") {
      printJson(verifyOwnerOpsFieldTestRepairCompletionEvidence({
        root: process.cwd(),
      }));
    } else if (subcommand === "broader-owner-testing-handoff") {
      printJson(buildOwnerOpsBroaderOwnerTestingHandoff({
        root: process.cwd(),
      }));
    } else if (subcommand === "broader-owner-testing-handoff-write") {
      printJson(writeOwnerOpsBroaderOwnerTestingHandoff({
        root: process.cwd(),
      }));
    } else if (subcommand === "broader-owner-testing-handoff-check") {
      printJson(verifyOwnerOpsBroaderOwnerTestingHandoff({
        root: process.cwd(),
      }));
    } else if (subcommand === "broader-owner-testing-result-append") {
      printJson(appendOwnerOpsBroaderOwnerTestingResult({
        root: process.cwd(),
        approvalToken: firstArg,
      }));
    } else if (subcommand === "broader-owner-testing-results") {
      printJson(readOwnerOpsBroaderOwnerTestingResults({
        root: process.cwd(),
      }));
    } else if (subcommand === "broader-owner-testing-result-ledger") {
      printJson(buildOwnerOpsBroaderOwnerTestingResultLedger({
        root: process.cwd(),
      }));
    } else if (subcommand === "broader-owner-testing-result-check") {
      printJson(verifyOwnerOpsBroaderOwnerTestingResultLedger({
        root: process.cwd(),
      }));
    } else if (subcommand === "broader-owner-testing-repair-queue") {
      printJson(buildOwnerOpsBroaderOwnerTestingRepairQueue({
        root: process.cwd(),
      }));
    } else if (subcommand === "broader-owner-testing-repair-write") {
      printJson(writeOwnerOpsBroaderOwnerTestingRepairQueue({
        root: process.cwd(),
      }));
    } else if (subcommand === "broader-owner-testing-repair-check") {
      printJson(verifyOwnerOpsBroaderOwnerTestingRepairQueue({
        root: process.cwd(),
      }));
    } else if (subcommand === "broader-owner-testing-repair-completion") {
      printJson(buildOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({
        root: process.cwd(),
      }));
    } else if (subcommand === "broader-owner-testing-repair-completion-write") {
      printJson(writeOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({
        root: process.cwd(),
      }));
    } else if (subcommand === "broader-owner-testing-repair-completion-check") {
      printJson(verifyOwnerOpsBroaderOwnerTestingRepairCompletionEvidence({
        root: process.cwd(),
      }));
    } else if (subcommand === "next-owner-testing-loop") {
      printJson(buildOwnerOpsNextOwnerTestingLoop({
        root: process.cwd(),
      }));
    } else if (subcommand === "next-owner-testing-loop-write") {
      printJson(writeOwnerOpsNextOwnerTestingLoop({
        root: process.cwd(),
      }));
    } else if (subcommand === "next-owner-testing-loop-check") {
      printJson(verifyOwnerOpsNextOwnerTestingLoop({
        root: process.cwd(),
      }));
    } else if (subcommand === "final-local-release-candidate") {
      printJson(buildOwnerOpsFinalLocalReleaseCandidateDecisionPacket({
        root: process.cwd(),
      }));
    } else if (subcommand === "final-local-release-candidate-write") {
      printJson(writeOwnerOpsFinalLocalReleaseCandidateDecisionPacket({
        root: process.cwd(),
      }));
    } else if (subcommand === "final-local-release-candidate-check") {
      printJson(verifyOwnerOpsFinalLocalReleaseCandidateDecisionPacket({
        root: process.cwd(),
      }));
    } else if (subcommand === "final-candidate-owner-decision-lane") {
      printJson(buildOwnerOpsFinalCandidateOwnerDecisionLane({
        root: process.cwd(),
        decision: firstArg || "continue_supervised_testing",
      }));
    } else if (subcommand === "final-candidate-owner-decision-append") {
      printJson(appendOwnerOpsFinalCandidateOwnerDecisionRecord({
        root: process.cwd(),
        decision: firstArg || "continue_supervised_testing",
        approvalToken: restArgs[0],
      }));
    } else if (subcommand === "final-candidate-owner-decision-records") {
      printJson(readOwnerOpsFinalCandidateOwnerDecisionRecords({
        root: process.cwd(),
      }));
    } else if (subcommand === "final-candidate-owner-decision-check") {
      printJson(verifyOwnerOpsFinalCandidateOwnerDecisionLane({
        root: process.cwd(),
      }));
    } else if (subcommand === "final-candidate-next-action") {
      printJson(buildOwnerOpsFinalCandidateNextActionPacket({
        root: process.cwd(),
        decision: firstArg || "continue_supervised_testing",
      }));
    } else if (subcommand === "final-candidate-next-action-check") {
      printJson(verifyOwnerOpsFinalCandidateNextActionPacket({
        root: process.cwd(),
      }));
    } else if (subcommand === "beta-feedback-action-queue") {
      printJson(buildOwnerOpsBetaFeedbackActionQueue({
        root: process.cwd(),
      }));
    } else if (subcommand === "beta-feedback-action-write") {
      printJson(writeOwnerOpsBetaFeedbackActionQueue({
        root: process.cwd(),
      }));
    } else if (subcommand === "beta-feedback-action-check") {
      printJson(verifyOwnerOpsBetaFeedbackActionQueue({
        root: process.cwd(),
      }));
    } else if (subcommand === "market-evidence-bundle") {
      printJson(buildOwnerOpsMarketEvidenceBundle({
        root: process.cwd(),
      }));
    } else if (subcommand === "market-evidence-write") {
      printJson(writeOwnerOpsMarketEvidenceBundle({
        root: process.cwd(),
      }));
    } else if (subcommand === "market-evidence-check") {
      printJson(verifyOwnerOpsMarketEvidenceBundle({
        root: process.cwd(),
      }));
    } else {
      throw new Error("owner-ops command requires skill-pack, field-casebook, authority-matrix, scenarios, candidates, workflow, record, records, replay, check, product-axis-readiness, product-axis-readiness-check, production-completion-audit, production-completion-audit-check, supervised-testing-readiness, supervised-testing-readiness-check, mcp-plan, connector-catalog, mcp-tools, mcp-check, mcp-server, mcp-server-check, intake-plan, intake-paste, intake-table, intake-file, intake-folder, intake-check, first-owner-scenario, run-first-owner-scenario, first-owner-scenario-check, plugin-package, market-listing, plugin-package-check, team-alpha-guide, owner-ux-copy, team-alpha-check, host-registration-guide, alpha-feedback-form, host-alpha-check, sample-data-kit, first-owner-beta-guide, first-owner-beta-check, beta-feedback-synthesis, industry-template-catalog, market-readiness-gate, market-readiness-check, template-replay-fixtures, privacy-copy-pack, pre-public-package-review, pre-public-package-check, pre-public-evidence-bridge, pre-public-evidence-bridge-check, pre-public-repair-backlog, pre-public-repair-write, pre-public-repair-check, pre-public-repair-completion, pre-public-repair-completion-write, pre-public-repair-completion-check, distribution-evidence, distribution-readme, distribution-evidence-check, archive-checksum-dry-run, archive-checksum-dry-run-check, release-readiness-evidence, release-readiness-write, release-readiness-check, human-review-approval-packet, human-review-approval-write, human-review-approval-check, human-review-decision-lane, human-review-decision-append, human-review-decision-records, human-review-decision-check, public-release-gate, public-release-gate-check, public-release-readback, public-release-readback-check, approved-signing-lane, approved-signing-lane-check, marketplace-upload-approval-gate, marketplace-upload-approval-gate-check, marketplace-upload-decision-lane, marketplace-upload-decision-append, marketplace-upload-decision-records, marketplace-upload-decision-check, signed-package-evidence, signed-package-evidence-write, signed-package-evidence-check, install-update-rollback-proof, install-update-rollback-proof-write, install-update-rollback-proof-check, deployment-dry-run-plan, deployment-dry-run-write, deployment-dry-run-check, local-package-candidate, local-package-candidate-check, local-package-candidate-readback, local-package-candidate-readback-check, team-alpha-handoff-bundle, team-alpha-handoff-write, team-alpha-handoff-check, first-owner-beta-handoff-bundle, first-owner-beta-handoff-write, first-owner-beta-handoff-check, first-owner-beta-operational-package, first-owner-beta-operational-write, first-owner-beta-operational-check, first-owner-beta-result-review, first-owner-beta-result-write, first-owner-beta-result-check, field-test-ledger, field-test-record-append, field-test-records, field-test-ledger-check, field-test-action-queue, field-test-action-write, field-test-action-check, field-test-repair-completion, field-test-repair-completion-write, field-test-repair-completion-check, beta-feedback-action-queue, beta-feedback-action-write, beta-feedback-action-check, market-evidence-bundle, market-evidence-write, or market-evidence-check");
    }
  } else if (command === "connectors") {
    const [subcommand, connectorId, action] = args;
    if (subcommand === "list") {
      printJson(listConnectors());
    } else if (subcommand === "governance") {
      printJson(buildConnectorGovernanceSummary());
    } else if (subcommand === "tool-governance") {
      printJson(buildConnectorToolGovernance());
    } else if (subcommand === "tool-governance-check") {
      printJson(verifyConnectorToolGovernance());
    } else if (subcommand === "execution-runtime") {
      printJson(buildExecutionRuntimePlan({ root: process.cwd() }));
    } else if (subcommand === "execution-runtime-check") {
      printJson(verifyExecutionRuntimePlan({
        plan: buildExecutionRuntimePlan({ root: process.cwd() }),
      }));
    } else if (subcommand === "authority-heart") {
      printJson(buildToolAuthorityHeart({ root: process.cwd() }));
    } else if (subcommand === "authority-heart-check") {
      const heart = buildToolAuthorityHeart({ root: process.cwd() });
      printJson(verifyToolAuthorityHeart({ heart }));
    } else if (subcommand === "execution-dry-run") {
      const commandId = connectorId || "model-invocation-check";
      printJson(invokeExecutionRuntimeDryRun({
        root: process.cwd(),
        commandId,
        approval: {
          confirmed: true,
          commandId,
          authorityTier: "dry_run",
          allowMutation: false,
        },
      }));
    } else if (subcommand === "execution-invocation-check") {
      printJson(verifyExecutionRuntimeInvocation({ root: process.cwd() }));
    } else if (subcommand === "read-only-inspect") {
      printJson(inspectReadOnlyConnector({
        root: process.cwd(),
        connectorId: connectorId || "local.filesystem",
      }));
    } else if (subcommand === "review") {
      if (!connectorId) {
        throw new Error("connectors review requires connector id");
      }
      printJson(reviewConnectorPermission({ connectorId, action }));
    } else {
      throw new Error("connectors command requires list, governance, tool-governance, tool-governance-check, execution-runtime, execution-runtime-check, authority-heart, authority-heart-check, execution-dry-run, execution-invocation-check, read-only-inspect, or review");
    }
  } else if (command === "approval") {
    const [subcommand, ...textParts] = args;
    if (subcommand === "execution-proposal") {
      const request = textParts.join(" ").trim();
      printJson(buildExecutionApprovalPreview(request ? { request } : undefined));
    } else if (subcommand === "execution-proposal-check") {
      printJson(verifyExecutionApprovalPreview());
    } else if (subcommand === "audit-write-design") {
      const request = textParts.join(" ").trim();
      printJson(buildAuditWriteDesignProof(request ? { request } : undefined));
    } else if (subcommand === "audit-write-design-check") {
      printJson(verifyAuditWriteDesignProof());
    } else if (subcommand === "approval-record-write-ux") {
      const request = args.slice(1).join(" ");
      printJson(buildApprovalRecordWriteUxDesign(request ? { request } : undefined));
    } else if (subcommand === "approval-record-write-ux-check") {
      printJson(verifyApprovalRecordWriteUxDesign());
    } else if (subcommand === "local-record-substrate") {
      printJson(buildApprovalAuditLocalRecordSubstrate());
    } else if (subcommand === "local-record-substrate-check") {
      printJson(verifyApprovalAuditLocalRecordSubstrate());
    } else if (subcommand === "record-write" || subcommand === "audit-write") {
      const request = textParts.join(" ").trim();
      printJson(writeApprovalAuditLocalRecords(request ? { request } : undefined));
    } else if (subcommand === "records") {
      printJson(readApprovalRecords());
    } else if (subcommand === "audit-records") {
      printJson(readAuditRecords());
    } else if (subcommand === "replay") {
      printJson(buildApprovalAuditReplay({ recordId: textParts[0] }));
    } else {
      throw new Error("approval command requires execution-proposal, execution-proposal-check, audit-write-design, audit-write-design-check, approval-record-write-ux, approval-record-write-ux-check, local-record-substrate, local-record-substrate-check, record-write, audit-write, records, audit-records, or replay");
    }
  } else if (command === "ops") {
    const [subcommand] = args;
    if (subcommand === "hardening") {
      printJson(buildInstallHardeningReport());
    } else if (subcommand === "contract") {
      printJson(buildOperationsContractSummary());
    } else if (subcommand === "data") {
      printJson(buildRuntimeDataContract());
    } else if (subcommand === "reliability") {
      printJson(buildOperationsReliabilityContract());
    } else if (subcommand === "hardening-record") {
      printJson(appendInstallHardeningReport());
    } else if (subcommand === "hardening-history") {
      printJson(readInstallHardeningReports());
    } else if (subcommand === "hardening-summary") {
      printJson(buildInstallHardeningSummary());
    } else {
      throw new Error("ops command requires hardening, contract, data, reliability, hardening-record, hardening-history, or hardening-summary");
    }
  } else if (command === "workspace") {
    const [subcommand, firstArg, secondArg, thirdArg] = args;
    if (subcommand === "welcome") {
      printJson(buildRuntimeWorkspaceWelcome({ workspaceRoot: firstArg || undefined }));
    } else if (subcommand === "welcome-check") {
      printJson(verifyRuntimeWorkspaceWelcome({ workspaceRoot: firstArg || undefined }));
    } else if (subcommand === "welcome-draft") {
      const answers = firstArg ? JSON.parse(firstArg) : {};
      printJson(buildRuntimeWorkspaceWelcomeDraft({
        answers,
        workspaceRoot: secondArg || undefined,
      }));
    } else if (subcommand === "welcome-apply") {
      const answers = firstArg ? JSON.parse(firstArg) : {};
      printJson(applyRuntimeWorkspaceWelcomeSettings({
        answers,
        approvalToken: secondArg || "",
        workspaceRoot: thirdArg || undefined,
      }));
    } else {
      throw new Error("workspace command requires welcome, welcome-check, welcome-draft, or welcome-apply");
    }
  } else if (command === "production") {
    const [subcommand] = args;
    if (subcommand === "stages-5-8") {
      printJson(await buildStages5To8Completion({ root: process.cwd() }));
    } else if (subcommand === "stages-5-8-check") {
      printJson(await verifyStages5To8Completion({ root: process.cwd() }));
    } else if (subcommand === "alpha-package") {
      printJson(writeTeamAlphaPackage({ root: process.cwd() }));
    } else if (subcommand === "alpha-package-check") {
      printJson(verifyTeamAlphaPackage({ root: process.cwd() }));
    } else {
      throw new Error("production command requires stages-5-8, stages-5-8-check, alpha-package, or alpha-package-check");
    }
  } else if (command === "first-completion") {
    printJson(buildGpaoTFirstCompletionAudit({ root: process.cwd() }));
  } else if (command === "first-completion-check") {
    printJson(verifyGpaoTFirstCompletionAudit({ root: process.cwd() }));
  } else if (command === "first-completion-write") {
    printJson(writeGpaoTFirstCompletionEvidence({ root: process.cwd() }));
  } else if (command === "adapters") {
    const [subcommand, ...textParts] = args;
    if (subcommand === "models") {
      printJson(listModelAdapters());
    } else if (subcommand === "tools") {
      printJson(listToolAdapters());
    } else if (subcommand === "model-router-boundary") {
      const request = textParts.join(" ").trim();
      printJson(buildModelRouterBoundary(request ? { request } : undefined));
    } else if (subcommand === "model-router-boundary-check") {
      printJson(verifyModelRouterBoundary());
    } else if (subcommand === "model-router-policy") {
      const request = textParts.join(" ").trim();
      printJson(buildModelRouterPolicy(request ? { request } : undefined));
    } else if (subcommand === "model-router-policy-check") {
      printJson(verifyModelRouterPolicy());
    } else if (subcommand === "model-providers") {
      printJson(buildModelProviderRegistry());
    } else if (subcommand === "model-invocation") {
      const [providerId, ...requestParts] = textParts;
      const request = requestParts.join(" ").trim();
      printJson(buildModelInvocationPacket({
        providerId: providerId || "local.deterministic",
        request: request || undefined,
      }));
    } else if (subcommand === "model-invocation-local") {
      const request = textParts.join(" ").trim();
      printJson(invokeModelLocally({
        request: request || undefined,
      }));
    } else if (subcommand === "model-invocation-check") {
      printJson(verifyModelInvocation());
    } else if (subcommand === "model-provider-runtime-check") {
      printJson(await verifyProviderInvocationRuntime());
    } else if (subcommand === "provider-auth-heart") {
      const inventory = inspectProviderAuthStores();
      printJson({
        inventory,
        repairPlan: buildProviderAuthRepairPlan({ inventory }),
      });
    } else if (subcommand === "provider-auth-heart-check") {
      const inventory = inspectProviderAuthStores();
      const repairPlan = buildProviderAuthRepairPlan({ inventory });
      printJson(verifyProviderAuthHeart({ inventory, repairPlan }));
    } else if (subcommand === "plan") {
      const text = textParts.join(" ").trim();
      if (!text) {
        throw new Error("adapters plan requires input text");
      }
      printJson(runRuntimeTurn({ input: { text } }).adapterPlan);
    } else {
      throw new Error("adapters command requires models, tools, model-router-boundary, model-router-boundary-check, model-router-policy, model-router-policy-check, model-providers, model-invocation, model-invocation-local, model-invocation-check, model-provider-runtime-check, provider-auth-heart, provider-auth-heart-check, or plan");
    }
  } else if (command === "control") {
    const [subcommand] = args;
    if (subcommand === "snapshot") {
      printJson(buildControlCenterSnapshot());
    } else if (subcommand === "summary") {
      printJson(buildControlCenterSummary());
    } else if (subcommand === "design") {
      printJson(buildLocalControlCenterDesignContract());
    } else if (subcommand === "design-reference-gate") {
      printJson(buildGpaoTDesignReferenceGate({ slice: args[1] || "future-ui-ux-slice" }));
    } else if (subcommand === "design-reference-gate-check") {
      printJson(verifyGpaoTDesignReferenceGate());
    } else if (subcommand === "ui-contract") {
      printJson(buildControlCenterUiContract());
    } else if (subcommand === "ui-snapshot") {
      printJson(buildControlCenterUiSnapshot({
        snapshot: buildControlCenterSnapshot(),
        designContract: buildLocalControlCenterDesignContract(),
      }));
    } else if (subcommand === "ui-validate") {
      const uiSnapshot = buildControlCenterUiSnapshot({
        snapshot: buildControlCenterSnapshot(),
        designContract: buildLocalControlCenterDesignContract(),
      });
      printJson(validateControlCenterUiSnapshot({ uiSnapshot }));
    } else if (subcommand === "html") {
      process.stdout.write(buildControlCenterHtml());
    } else if (subcommand === "render") {
      printJson(renderControlCenterHtml({ outputPath: args[1] }));
    } else if (subcommand === "serve-contract") {
      printJson(buildControlCenterServingContract());
    } else if (subcommand === "serve-check") {
      printJson(await verifyControlCenterPreviewServing());
    } else if (subcommand === "serve") {
      const requestedPort = args[1] ? Number(args[1]) : 0;
      const preview = await startControlCenterPreviewServer({ port: requestedPort });
      printJson({
        schema: preview.schema,
        status: preview.status,
        url: preview.url,
        host: preview.host,
        port: preview.port,
        render: preview.render,
        contract: preview.contract,
        stop: "Press Ctrl+C to stop this local preview server.",
      });
      await waitForStop(preview);
    } else if (subcommand === "work-surface") {
      printJson(buildCoreWorkSurface());
    } else if (subcommand === "work-surface-html") {
      process.stdout.write(buildCoreWorkSurfaceHtml());
    } else if (subcommand === "work-surface-check") {
      const surface = buildCoreWorkSurface();
      printJson(verifyCoreWorkSurface({
        surface,
        html: buildCoreWorkSurfaceHtml({ surface }),
      }));
    } else if (subcommand === "sessions") {
      printJson(readSessionWorkspaceState());
    } else if (subcommand === "sessions-action") {
      const action = args[1];
      const sessionId = action === "new_session" ? undefined : args[2];
      const actionText = action === "new_session" ? args.slice(2).join(" ") : args.slice(3).join(" ");
      printJson(applySessionWorkspaceAction({
        action,
        sessionId,
        title: actionText || undefined,
        request: actionText || undefined,
      }));
    } else if (subcommand === "sessions-check") {
      printJson(verifySessionWorkspaceBehavior());
    } else if (subcommand === "session-heart") {
      printJson(buildSessionEventHeart());
    } else if (subcommand === "session-heart-check") {
      const heart = buildSessionEventHeart();
      printJson(verifySessionEventHeart({ heart }));
    } else if (subcommand === "multi-chat-workspace") {
      printJson(buildCodexStyleMultiChatWorkspace());
    } else if (subcommand === "multi-chat-workspace-check") {
      printJson(verifyCodexStyleMultiChatWorkspace({
        workspace: buildCodexStyleMultiChatWorkspace(),
      }));
    } else if (subcommand === "multi-chat-stages-1-6") {
      printJson(buildMultiChatStageSixCompletion());
    } else if (subcommand === "multi-chat-stages-1-6-check") {
      const completion = buildMultiChatStageSixCompletion();
      printJson(verifyMultiChatStageSixCompletion({ completion }));
    } else if (subcommand === "multi-chat-memory-review-queue") {
      printJson(buildThreadScopedMemoryReviewQueue());
    } else if (subcommand === "work-surface-local-loop") {
      printJson(buildFirstLocalWorkLoop({
        request: args.slice(1).join(" ") || undefined,
      }));
    } else if (subcommand === "work-surface-local-loop-check") {
      const loop = buildFirstLocalWorkLoop({
        request: args.slice(1).join(" ") || undefined,
      });
      printJson(verifyFirstLocalWorkLoop({ loop }));
    } else if (subcommand === "work-surface-submission-gate") {
      printJson(buildWorkSurfaceSubmissionDecisionGate());
    } else if (subcommand === "work-surface-submission-gate-check") {
      printJson(verifyWorkSurfaceSubmissionDecisionGate());
    } else if (subcommand === "work-surface-submission-validation-gate") {
      printJson(buildWorkSurfaceSubmissionValidationGate());
    } else if (subcommand === "work-surface-submission-validation-gate-check") {
      printJson(verifyWorkSurfaceSubmissionValidationGate());
    } else if (subcommand === "work-surface-execution-flow") {
      printJson(buildWorkSurfaceExecutionFlow({
        request: args.slice(1).join(" ") || undefined,
      }));
    } else if (subcommand === "work-surface-execution-confirmation") {
      printJson(buildWorkSurfaceExecutionConfirmationControl({
        confirmationChoice: args[1] || undefined,
      }));
    } else if (subcommand === "work-surface-execution-flow-check") {
      const flow = buildWorkSurfaceExecutionFlow({
        request: args.slice(1).join(" ") || undefined,
      });
      printJson(verifyWorkSurfaceExecutionFlow({ flow }));
    } else if (subcommand === "work-surface-execution-record") {
      const maybeChoice = args.at(-1);
      const choices = new Set(["matches_intent", "needs_changes", "hold"]);
      const confirmationChoice = choices.has(maybeChoice) ? maybeChoice : "matches_intent";
      const requestArgs = choices.has(maybeChoice) ? args.slice(1, -1) : args.slice(1);
      printJson(recordWorkSurfaceExecutionFlow({
        request: requestArgs.join(" ") || undefined,
        confirmationChoice,
      }));
    } else if (subcommand === "workspace-shell") {
      printJson(buildGpaoTWorkspaceShell({
        request: args.slice(1).join(" ") || undefined,
      }));
    } else if (subcommand === "workspace-shell-html") {
      process.stdout.write(buildGpaoTWorkspaceShellHtml({
        request: args.slice(1).join(" ") || undefined,
      }));
    } else if (subcommand === "workspace-shell-check") {
      const shell = buildGpaoTWorkspaceShell({
        request: args.slice(1).join(" ") || undefined,
      });
      printJson(verifyGpaoTWorkspaceShell({
        shell,
        html: buildGpaoTWorkspaceShellHtml({
          shell,
          request: args.slice(1).join(" ") || undefined,
        }),
      }));
    } else if (subcommand === "app-shell-contract") {
      printJson(buildBrowserLocalAppShellContract());
    } else if (subcommand === "app-shell-state") {
      printJson(buildBrowserLocalAppShellState());
    } else if (subcommand === "app-shell-html") {
      process.stdout.write(buildBrowserLocalAppShellHtml());
    } else if (subcommand === "app-shell-check") {
      printJson(verifyBrowserLocalAppShell());
    } else if (subcommand === "tauri-gate") {
      printJson(buildTauriPackagedDesktopGate());
    } else if (subcommand === "tauri-gate-check") {
      printJson(verifyTauriPackagedDesktopGate());
    } else if (subcommand === "packaged-desktop-review") {
      printJson(buildPackagedDesktopPlanningReview());
    } else if (subcommand === "packaged-desktop-review-check") {
      printJson(verifyPackagedDesktopPlanningReview());
    } else if (subcommand === "tauri-install-gate") {
      printJson(buildTauriInstallReadinessGate());
    } else if (subcommand === "tauri-install-gate-check") {
      printJson(verifyTauriInstallReadinessGate());
    } else if (subcommand === "tauri-prerequisite-doctor") {
      printJson(buildTauriInstallPrerequisiteDoctor());
    } else if (subcommand === "tauri-prerequisite-doctor-check") {
      printJson(verifyTauriInstallPrerequisiteDoctor());
    } else if (subcommand === "tauri-dry-run-contract") {
      printJson(buildTauriInstallDryRunExecutorContract());
    } else if (subcommand === "tauri-dry-run-contract-check") {
      printJson(verifyTauriInstallDryRunExecutorContract());
    } else if (subcommand === "tauri-dry-run-design") {
      printJson(buildTauriInstallDryRunImplementationDesign());
    } else if (subcommand === "tauri-dry-run-design-check") {
      printJson(verifyTauriInstallDryRunImplementationDesign());
    } else if (subcommand === "tauri-dry-run-plan") {
      printJson(buildTauriInstallDryRunPlan());
    } else if (subcommand === "tauri-dry-run-plan-check") {
      printJson(verifyTauriInstallDryRunPlan());
    } else if (subcommand === "tauri-dry-run-preview") {
      printJson(renderTauriInstallDryRunPreview());
    } else if (subcommand === "tauri-dry-run-preview-check") {
      printJson(verifyTauriInstallDryRunPreview());
    } else if (subcommand === "tauri-dry-run-invocation-approval") {
      printJson(buildTauriInstallDryRunInvocationApprovalContract());
    } else if (subcommand === "tauri-dry-run-invocation-approval-check") {
      printJson(verifyTauriInstallDryRunInvocationApprovalContract());
    } else if (subcommand === "tauri-dry-run-approval-storage") {
      printJson(buildTauriInstallDryRunApprovalRecordStorageDesign());
    } else if (subcommand === "tauri-dry-run-approval-storage-check") {
      printJson(verifyTauriInstallDryRunApprovalRecordStorageDesign());
    } else if (subcommand === "tauri-dry-run-approval-write-gate") {
      printJson(buildTauriInstallDryRunApprovalRecordWriteGateDesign());
    } else if (subcommand === "tauri-dry-run-approval-write-gate-check") {
      printJson(verifyTauriInstallDryRunApprovalRecordWriteGateDesign());
    } else if (subcommand === "tauri-shell-slice") {
      printJson(buildTauriReadOnlyShellSlice());
    } else if (subcommand === "tauri-shell-html") {
      process.stdout.write(buildTauriReadOnlyShellHtml());
    } else if (subcommand === "tauri-shell-check") {
      printJson(verifyTauriReadOnlyShellSlice());
    } else if (subcommand === "stage-4-production-hardening") {
      printJson(buildStage4ProductionHardening());
    } else if (subcommand === "stage-4-production-hardening-html") {
      process.stdout.write(buildStage4ProductionHardeningHtml());
    } else if (subcommand === "stage-4-production-hardening-check") {
      const state = buildStage4ProductionHardening();
      printJson(verifyStage4ProductionHardening({
        state,
        html: buildStage4ProductionHardeningHtml({ state }),
      }));
    } else {
      throw new Error("control command requires snapshot, summary, design, design-reference-gate, design-reference-gate-check, ui-contract, ui-snapshot, ui-validate, html, render, serve-contract, serve-check, serve, work-surface, work-surface-html, work-surface-check, sessions, sessions-action, sessions-check, multi-chat-workspace, multi-chat-workspace-check, multi-chat-stages-1-6, multi-chat-stages-1-6-check, multi-chat-memory-review-queue, work-surface-local-loop, work-surface-local-loop-check, work-surface-submission-gate, work-surface-submission-gate-check, work-surface-submission-validation-gate, work-surface-submission-validation-gate-check, work-surface-execution-flow, work-surface-execution-confirmation, work-surface-execution-flow-check, work-surface-execution-record, workspace-shell, workspace-shell-html, workspace-shell-check, app-shell-contract, app-shell-state, app-shell-html, app-shell-check, tauri-gate, tauri-gate-check, packaged-desktop-review, packaged-desktop-review-check, tauri-install-gate, tauri-install-gate-check, tauri-prerequisite-doctor, tauri-prerequisite-doctor-check, tauri-dry-run-contract, tauri-dry-run-contract-check, tauri-dry-run-design, tauri-dry-run-design-check, tauri-dry-run-plan, tauri-dry-run-plan-check, tauri-dry-run-preview, tauri-dry-run-preview-check, tauri-dry-run-invocation-approval, tauri-dry-run-invocation-approval-check, tauri-dry-run-approval-storage, tauri-dry-run-approval-storage-check, tauri-dry-run-approval-write-gate, tauri-shell-slice, tauri-shell-html, tauri-shell-check, stage-4-production-hardening, stage-4-production-hardening-html, or stage-4-production-hardening-check");
    }
  } else if (command === "gateway") {
    const [method, requestPath, rawBody] = args;
    if (!method || !requestPath) {
      throw new Error("gateway command requires method and path");
    }
    printJson(handleGatewayRequest({
      method,
      path: requestPath,
      body: rawBody ? JSON.parse(rawBody) : undefined,
    }));
  } else {
    throw new Error(`unknown command: ${command}`);
  }
} catch (error) {
  process.stderr.write(`gpao-t: ${error.message}\n\n${usage()}\n`);
  process.exitCode = 1;
}

function parseGrowthGateArgs({ target, approvalStatus }) {
  const selection = target
    ? target.startsWith("growth.")
      ? { proposalId: target }
      : { target }
    : {};
  return {
    ...selection,
    approvalStatus,
  };
}

function parseSkillAtlasFilter({ value }) {
  if (!value) return {};
  if (/^phase-\d+$/.test(value)) return { phase: value };
  const categories = new Set([
    "connector",
    "domain",
    "experience",
    "foundation",
    "growth",
    "high-impact",
    "research",
  ]);
  if (categories.has(value)) return { category: value };
  return { tier: value };
}

function waitForStop(preview) {
  return new Promise((resolve) => {
    const stop = async () => {
      try {
        await preview.close();
      } finally {
        resolve();
      }
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
}
