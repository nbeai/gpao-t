import { fileURLToPath } from "node:url";
import { listModelAdapters, listToolAdapters } from "./adapter-boundary.js";
import { buildApprovalAuditLocalRecordSubstrate } from "./approval-audit-records.js";
import { buildAutoMemoryGrowthSummary } from "./auto-memory-growth-loop.js";
import { buildLiveTurnAbsorptionSummary } from "./live-turn-absorption-bridge.js";
import { buildOpenClawLiveTurnHookReadinessGate } from "./openclaw-absorption-control.js";
import { buildConnectorGovernanceSummary } from "./connector-governance.js";
import { buildCoreWorkSurface } from "./core-work-surface.js";
import {
  buildApprovalRecordWriteUxDesign,
  buildAuditWriteDesignProof,
  buildExecutionApprovalPreview,
} from "./execution-approval.js";
import { buildGpaoTFirstCompletionAudit } from "./first-completion.js";
import { buildGpaoTDesignReferenceGate } from "./design-contract.js";
import { runDoctor } from "./doctor.js";
import { buildGrowthApplicationGateSummary } from "./growth-application-gates.js";
import { readSelfGrowthProposals } from "./growth-proposals.js";
import { buildInstallHardeningSummary } from "./install-hardening.js";
import { buildModelRouterBoundary, buildModelRouterPolicy } from "./model-router.js";
import {
  buildMemoryApplyGateState,
  buildMemoryReviewQueueSummary,
} from "./memory-candidate-review-queue.js";
import { readMemoryWiki, readTCellCandidates } from "./memory-wiki.js";
import { buildOperationsContractSummary } from "./operations-contract.js";
import { buildRecoveryHistorySummary, readReplayRecoveryHistory } from "./replay-history.js";
import {
  buildRuntimeWorkspaceWelcome,
  buildRuntimeWorkspaceWelcomeDraft,
  verifyRuntimeWorkspaceWelcome,
} from "./runtime-workspace-welcome.js";
import { buildSkillExecutionSummary } from "./skill-execution-adapter.js";
import {
  buildSkillCandidateAtlas,
  buildSkillProductionRoadmap,
  buildSkillProductionStatus,
  buildSkillReadinessReport,
  listSkillPacks,
} from "./skill-ecosystem.js";
import { readAuditEvents, readRuntimeState } from "./storage.js";

const DEFAULT_RUNTIME_WORKSPACE_SOURCE_PACK = fileURLToPath(new URL("../../runtime-workspace/gpao-t", import.meta.url));

export function buildControlCenterSnapshot({ root } = {}) {
  const doctor = runDoctor({ root });
  const runtimeState = readRuntimeState({ root });
  const auditEvents = readAuditEvents({ root });
  const memoryWiki = readMemoryWiki({ root });
  const tcellCandidates = readTCellCandidates({ root });
  const memoryReviewQueue = buildMemoryReviewQueueSummary({ root });
  const memoryApplyGate = buildMemoryApplyGateState({ root });
  const autoMemoryGrowth = buildAutoMemoryGrowthSummary({ root });
  const liveTurnAbsorption = buildLiveTurnAbsorptionSummary({ root });
  const openClawLiveHook = buildOpenClawLiveTurnHookReadinessGate({ root });
  const recoveryHistory = readReplayRecoveryHistory({ root });
  const recoverySummary = buildRecoveryHistorySummary({ root });
  const growthProposals = readSelfGrowthProposals({ root });
  const growthApplicationGates = buildGrowthApplicationGateSummary({ root });
  const modelAdapters = listModelAdapters();
  const modelRouterBoundary = buildModelRouterBoundary();
  const modelRouterPolicy = buildModelRouterPolicy();
  const toolAdapters = listToolAdapters();
  const connectorGovernance = buildConnectorGovernanceSummary();
  const executionApprovalPreview = buildExecutionApprovalPreview();
  const auditWriteDesignProof = buildAuditWriteDesignProof();
  const approvalRecordWriteUx = buildApprovalRecordWriteUxDesign();
  const approvalAuditLocalRecordSubstrate = buildApprovalAuditLocalRecordSubstrate({ root });
  const designReferenceGate = buildGpaoTDesignReferenceGate({ slice: "all-ui-ux-slices" });
  const installHardening = buildInstallHardeningSummary({ root });
  const operationsContract = buildOperationsContractSummary();
  const skillPacks = listSkillPacks();
  const skillReadiness = buildSkillReadinessReport();
  const skillExecution = buildSkillExecutionSummary({ root });
  const skillAtlas = buildSkillCandidateAtlas();
  const skillRoadmap = buildSkillProductionRoadmap();
  const skillProductionStatus = buildSkillProductionStatus({ phase: "phase-1" });
  const approvalPreviewFlow = buildApprovalPreviewFlow({ root });
  const coreWorkSurface = buildCoreWorkSurface({ root });
  const firstCompletion = buildGpaoTFirstCompletionAudit({ root });
  const runtimeWorkspaceSourcePack = DEFAULT_RUNTIME_WORKSPACE_SOURCE_PACK;
  const runtimeWorkspaceWelcome = buildRuntimeWorkspaceWelcome({ workspaceRoot: runtimeWorkspaceSourcePack });
  const runtimeWorkspaceWelcomeCheck = verifyRuntimeWorkspaceWelcome({ workspaceRoot: runtimeWorkspaceSourcePack });
  const runtimeWorkspaceWelcomeDraft = buildRuntimeWorkspaceWelcomeDraft({
    answers: {
      userName: "새 사용자",
      userAddress: "사용자님",
      companionName: "Aigis",
      tone: "차분하고 정확한 존댓말",
      rememberAutomatically: ["GPAO-T를 처음 설정 중이다"],
      durableMemoryApproved: false,
      heartbeatEnabled: false,
    },
  });

  const panels = [
    buildFirstCompletionPanel({ firstCompletion }),
    buildRuntimeWorkspaceWelcomePanel({
      welcome: runtimeWorkspaceWelcome,
      welcomeCheck: runtimeWorkspaceWelcomeCheck,
      welcomeDraft: runtimeWorkspaceWelcomeDraft,
    }),
    buildCoreWorkSurfacePanel({ coreWorkSurface }),
    buildLiveTurnAbsorptionPanel({ liveTurnAbsorption }),
    buildOpenClawLiveHookPanel({ openClawLiveHook }),
    buildRuntimePanel({ doctor, runtimeState, auditEvents }),
    buildOpsPanel({ installHardening, operationsContract }),
    buildApprovalPreviewPanel({ approvalPreviewFlow }),
    buildDesignReferencePanel({ designReferenceGate }),
    buildExecutionApprovalPanel({ executionApprovalPreview, approvalAuditLocalRecordSubstrate }),
    buildSkillPanel({
      skillPacks,
      skillReadiness,
      skillExecution,
      skillAtlas,
      skillRoadmap,
      skillProductionStatus,
    }),
    buildMemoryPanel({ memoryWiki, tcellCandidates, memoryReviewQueue, memoryApplyGate, autoMemoryGrowth }),
    buildRecoveryPanel({ recoveryHistory, recoverySummary }),
    buildGrowthPanel({ growthProposals, growthApplicationGates }),
    buildAdapterPanel({ modelAdapters, modelRouterBoundary, modelRouterPolicy, toolAdapters }),
    buildConnectorPanel({ connectorGovernance }),
    buildAuthorityPanel({ runtimeState }),
  ];
  const blockedPanels = panels.filter((panel) => panel.status === "blocked");
  const reviewPanels = panels.filter((panel) => panel.status === "review");

  return {
    schema: "gpao_t.control_center_snapshot.v0_1",
    controlCenterReadiness: "data_contract_before_ui",
    status: blockedPanels.length ? "blocked" : reviewPanels.length ? "review" : "ready",
    surface: "local_control_center_data_contract",
    generatedAt: new Date().toISOString(),
    panels,
    counts: {
      panels: panels.length,
      blocked: blockedPanels.length,
      review: reviewPanels.length,
      auditEvents: auditEvents.length,
      memoryEntries: memoryWiki.entries.length,
      tcellCandidates: tcellCandidates.length,
      memoryReviewQueueRecords: memoryReviewQueue.counts.records,
      memoryReviewQueueCandidates: memoryReviewQueue.counts.candidates,
      memoryReviewQueueReplayEvidence: memoryReviewQueue.counts.replayEvidence,
      memoryContextMeshApplied: memoryReviewQueue.counts.contextMeshApplied,
      autoMemoryGrowthRuns: autoMemoryGrowth.totalRuns,
      autoMemoryGrowthCompleted: autoMemoryGrowth.completedLocalAutoLoops,
      liveTurnAbsorptionRuns: liveTurnAbsorption.totalRuns,
      liveTurnAbsorptionPostAnswerGrowth: liveTurnAbsorption.postAnswerGrowthRecorded,
      liveTurnAbsorptionWaitingForAnswer: liveTurnAbsorption.waitingForAnswer,
      liveTurnAbsorptionBlocked: liveTurnAbsorption.blockedRuns,
      openClawLiveHookFindings: openClawLiveHook.findings.length,
      recoveryRecords: recoveryHistory.length,
      installHardeningReports: installHardening.totalReports,
      dataSurfaces: operationsContract.dataSurfaces,
      skillPacks: skillPacks.total,
      skillCandidates: skillAtlas.allCandidates,
      phaseOneProducedSkillPacks: skillProductionStatus.producedPacks,
      phaseOneSkillProductionBlockers: skillProductionStatus.blockers.length,
      skillPackReadinessFindings: skillReadiness.totalFindings,
      skillExecutionRuns: skillExecution.totalRuns,
      skillExecutionGrowthSignals: skillExecution.growthSignalCandidates.length,
      approvalPreviewStages: approvalPreviewFlow.stages.length,
      designReferenceAxes: designReferenceGate.referenceAxes.length,
      designReferenceEvidenceRequirements: designReferenceGate.evidenceRequirements.length,
      designReferenceRequiredReportFields: designReferenceGate.requiredReportFields.length,
      approvalPreviewBlockedActions: approvalPreviewFlow.blockedActions.length,
      approvalPreviewReadyStages: approvalPreviewFlow.stages.filter((stage) => stage.status === "ready").length,
      executionApprovalAuthorityLevels: executionApprovalPreview.authorityLegend.length,
      executionApprovalRequiredFields: executionApprovalPreview.approvalPacket.requiredFields.length,
      executionApprovalValidationRules: executionApprovalPreview.validation.rules.length,
      executionApprovalBlockedActions: executionApprovalPreview.blockedActions.length,
      auditWritePlannedItems: auditWriteDesignProof.plannedAuditItems.length,
      auditWriteRequiredFields: auditWriteDesignProof.requiredFields.length,
      auditWriteBlockedActions: auditWriteDesignProof.blockedActions.length,
      approvalRecordFlowStages: approvalRecordWriteUx.flow.stages.length,
      approvalRecordPreviewItems: approvalRecordWriteUx.recordItems.length,
      approvalRecordBlockedActions: approvalRecordWriteUx.blockedActions.length,
      approvalLocalRecords: approvalAuditLocalRecordSubstrate.counts.approvalRecords,
      auditLocalRecords: approvalAuditLocalRecordSubstrate.counts.auditRecords,
      coreWorkSurfaceThreadMessages: coreWorkSurface.workspaceThread.threadPreview.length,
      coreWorkSurfaceSelectedSkillPacks: coreWorkSurface.skillRoutePreview.selectedPacks.length,
      coreWorkSurfaceContextCandidates: coreWorkSurface.contextPreview.retrievedCandidates.length,
      firstCompletionStages: firstCompletion.progress.totalStages,
      firstCompletionReadyStages: firstCompletion.progress.readyStages,
      firstCompletionFindings: firstCompletion.findings.length,
      welcomeQuestions: runtimeWorkspaceWelcome.requiredQuestions.length,
      welcomeMissingFiles: runtimeWorkspaceWelcome.missingFiles.length,
      welcomeDraftWrites: runtimeWorkspaceWelcomeDraft.writes.length,
      welcomeFindings: runtimeWorkspaceWelcomeCheck.findings.length,
      growthProposals: growthProposals.length,
      growthApplicationGates: growthApplicationGates.totalGates,
      blockedGrowthApplications: growthApplicationGates.blockedLiveMutations,
      modelAdapters: modelAdapters.adapters.length,
      modelRouterProfiles: modelRouterBoundary.profiles.length,
      modelRouterBlockedActions: modelRouterBoundary.blockedActions.length,
      modelRouterFailureStates: modelRouterPolicy.fallbackAndFailure.failureStates.length,
      modelRouterReplayCriteria: modelRouterPolicy.replayAudit.requiredCriteria.length,
      toolAdapters: toolAdapters.adapters.length,
      connectors: connectorGovernance.totalConnectors,
      blockedConnectors: connectorGovernance.blockedConnectors.length,
      connectorToolCandidateClasses: connectorGovernance.toolGovernance.candidateClasses.length,
      connectorToolAuthorityTiers: connectorGovernance.toolGovernance.authorityTiers.length,
      connectorToolBlockedActions: connectorGovernance.toolGovernance.blockedActions.length,
    },
    authorityBoundary: {
      externalModelCall: "blocked_until_configured_and_approved",
      modelRouterBoundary: modelRouterBoundary.providerBoundary.externalProviderCall,
      externalToolAction: "blocked_until_explicit_approval",
      installExecution: installHardening.authorityBoundary.installExecution,
      updateExecution: installHardening.authorityBoundary.updateExecution,
      destructiveRollback: installHardening.authorityBoundary.destructiveRollback,
      approvalPreviewFlow: "local_preview_only_no_write_no_invocation",
      designReferenceGate: "required_for_every_ui_ux_slice",
      executionApprovalPacket: "preview_validation_only_no_write_no_invocation",
      auditWriteDesign: "local_jsonl_write_available",
      approvalRecordWriteUx: "local_jsonl_write_available",
      approvalRecordWrite: "local_jsonl_only",
      dryRunInvocation: "blocked",
      tauriBuild: "blocked",
      dependencyInstall: "blocked",
      connectorActivation: connectorGovernance.authorityBoundary.oauthSetup,
      connectorWriteAccess: connectorGovernance.authorityBoundary.writeAccess,
      connectorExternalSend: connectorGovernance.authorityBoundary.externalSend,
      toolCliMcpExecution: connectorGovernance.authorityBoundary.toolCliMcpExecution,
      growthApplication: growthApplicationGates.authorityBoundary.liveRuntimeMutation,
      liveTurnAbsorption: liveTurnAbsorption.authorityBoundary.liveOpenClawMutation,
      openClawLiveHook: openClawLiveHook.authorityBoundary.liveMutationAllowedByThisGate,
      durableMemoryPromotion: runtimeState.boundaries?.durableMemoryPromotion || "blocked",
      publicRelease: runtimeState.boundaries?.publicRelease || "blocked",
      localPreview: runtimeState.boundaries?.localPreview || "allowed",
      firstCompletionLine: firstCompletion.status,
      runtimeWorkspaceWelcomeApply: runtimeWorkspaceWelcome.authorityBoundary.applyRequiresToken,
      runtimeWorkspaceWelcomeExternalActions: runtimeWorkspaceWelcome.authorityBoundary.externalActions,
      runtimeWorkspaceWelcomeDurableMemory: runtimeWorkspaceWelcome.authorityBoundary.durableMemoryPromotion,
      runtimeWorkspaceWelcomeHeartbeat: runtimeWorkspaceWelcome.authorityBoundary.heartbeatActivation,
      secrets: "not_stored",
    },
    nextSafeAction: buildNextSafeAction({ blockedPanels, reviewPanels }),
  };
}

function buildRuntimeWorkspaceWelcomePanel({ welcome, welcomeCheck, welcomeDraft }) {
  const status = welcomeCheck.status === "ready" && welcome.status === "ready" ? "ready" : "blocked";
  return {
    id: "runtime-workspace-welcome",
    label: "처음 설정",
    status,
    headline: status === "ready"
      ? "새 사용자가 이름, 말투, 기억 경계, 자동화 경계를 설정할 준비가 되어 있다."
      : "처음 설정에 필요한 런타임 워크스페이스 파일이 아직 부족하다.",
    data: {
      welcome,
      welcomeCheck,
      sampleDraft: welcomeDraft,
      userFacingRoutes: [
        "/workspace/welcome",
        "/workspace/welcome/check",
        "/workspace/welcome/draft",
        "/workspace/welcome/apply",
      ],
      productInvariant:
        "Welcome can draft persona and runtime preferences, but durable memory and heartbeat stay blocked without explicit approval.",
    },
    nextSafeAction: status === "ready"
      ? "대시보드에서 웰컴 질문을 보여주고, 적용 전 draft를 먼저 보여준다."
      : "워크스페이스 팩을 다시 적용한 뒤 welcome-check를 통과시킨다.",
  };
}

export function buildControlCenterSummary({ root } = {}) {
  const snapshot = buildControlCenterSnapshot({ root });
  return {
    schema: "gpao_t.control_center_summary.v0_1",
    controlCenterReadiness: "data_contract_before_ui",
    status: snapshot.status,
    surface: snapshot.surface,
    panels: snapshot.panels.map((panel) => ({
      id: panel.id,
      label: panel.label,
      status: panel.status,
      headline: panel.headline,
      nextSafeAction: panel.nextSafeAction,
    })),
    counts: snapshot.counts,
    authorityBoundary: snapshot.authorityBoundary,
    nextSafeAction: snapshot.nextSafeAction,
  };
}

function buildFirstCompletionPanel({ firstCompletion }) {
  const residueStage = firstCompletion.stages.find((stage) => stage.id === "residue_closeout");
  return {
    id: "first-completion",
    label: "1차 완료선",
    status: firstCompletion.status,
    headline:
      firstCompletion.status === "ready"
        ? `6단계 1차 완료선 ${firstCompletion.progress.readyStages}/${firstCompletion.progress.totalStages} ready. 다음은 수정/보강이다.`
        : "6단계 1차 완료선에 보강할 항목이 남아 있다.",
    data: {
      firstCompletionLine: firstCompletion.firstCompletionLine,
      progress: firstCompletion.progress,
      stages: firstCompletion.stages.map((stage) => ({
        id: stage.id,
        status: stage.status,
        findings: stage.findings,
        evidence: stage.evidence,
      })),
      residue: residueStage?.controls?.nextRepairQueue || [],
      authorityBoundaries: firstCompletion.authorityBoundaries,
      afterFirstCompletion: firstCompletion.afterFirstCompletion,
      userLine: firstCompletion.userLine,
    },
    nextSafeAction: firstCompletion.nextSafeAction,
  };
}

function buildCoreWorkSurfacePanel({ coreWorkSurface }) {
  return {
    id: "core-work-surface",
    label: "작업 표면",
    status: coreWorkSurface.status,
    headline: "GPAO-T에게 일을 맡기는 첫 작업 표면이다. 입력은 초안이고 실행은 아직 열리지 않는다.",
    data: coreWorkSurface,
    nextSafeAction: coreWorkSurface.nextSafeAction,
  };
}

function buildLiveTurnAbsorptionPanel({ liveTurnAbsorption }) {
  return {
    id: "live-turn-absorption",
    label: "라이브 턴 흡수",
    status: liveTurnAbsorption.status,
    headline: liveTurnAbsorption.latest
      ? `라이브 턴 ${liveTurnAbsorption.totalRuns}개 중 ${liveTurnAbsorption.postAnswerGrowthRecorded}개가 답변 후 replay/growth 기록까지 연결됐다.`
      : "아직 라이브 턴 흡수 기록이 없다. 첫 연결 전 로컬 smoke가 필요하다.",
    data: {
      totalRuns: liveTurnAbsorption.totalRuns,
      postAnswerGrowthRecorded: liveTurnAbsorption.postAnswerGrowthRecorded,
      waitingForAnswer: liveTurnAbsorption.waitingForAnswer,
      blockedRuns: liveTurnAbsorption.blockedRuns,
      latestTrace: liveTurnAbsorption.latest?.traceLink || null,
      latestStatus: liveTurnAbsorption.latest?.status || null,
      source: liveTurnAbsorption.latest?.source || null,
      authorityBoundary: liveTurnAbsorption.authorityBoundary,
    },
    nextSafeAction: liveTurnAbsorption.nextSafeAction,
  };
}

function buildOpenClawLiveHookPanel({ openClawLiveHook }) {
  return {
    id: "gpao-t-live-hook-readiness",
    label: "GPAO-T 라이브 연결 준비",
    status: openClawLiveHook.status === "ready_for_authorized_live_hook_stage" ? "review" : "blocked",
    headline:
      openClawLiveHook.status === "ready_for_authorized_live_hook_stage"
        ? "라이브 훅 적용 전 diff, backup, rollback, restart, visual QA 조건이 준비됐다. 실제 적용은 아직 승인 대기다."
        : "라이브 훅 적용 전 보강할 준비 조건이 남아 있다.",
    data: {
      gateStatus: openClawLiveHook.status,
      findings: openClawLiveHook.findings,
      hookSequence: openClawLiveHook.hookSequence.map((step) => ({
        id: step.id,
        hostBoundary: step.hostBoundary,
        invariant: step.invariant,
      })),
      targetPaths: openClawLiveHook.targetPaths,
      requiredBeforeApply: openClawLiveHook.diffPlan.requiredBeforeApply,
      rollbackMustRestore: openClawLiveHook.rollbackPlan.rollbackMustRestore,
      visualQaRequiredEvidence: openClawLiveHook.visualQaPlan.requiredEvidence,
      authorityBoundary: openClawLiveHook.authorityBoundary,
    },
    nextSafeAction: openClawLiveHook.nextSafeAction,
  };
}

function buildSkillPanel({
  skillPacks,
  skillReadiness,
  skillExecution,
  skillAtlas,
  skillRoadmap,
  skillProductionStatus,
}) {
  const status = skillReadiness.status === "blocked"
    ? "blocked"
    : skillProductionStatus.status === "review"
    ? "review"
    : skillExecution.status === "review" && skillExecution.totalRuns > 0
    ? "review"
    : skillReadiness.status;
  return {
    id: "skill-ecosystem",
    label: "스킬 생태계",
    status,
    headline: skillExecution.totalRuns
      ? "스킬 팩이 로컬 실행 근거와 성장 신호를 남기고 있다."
      : skillReadiness.status === "ready"
      ? "리서치 기반 기본 스킬 팩은 등록되어 있고, 첫 실행 근거를 기다리는 상태다."
      : "런타임에 붙이기 전에 스킬 생태계 manifest 검토가 필요하다.",
    data: {
      totalPacks: skillPacks.total,
      totalCandidates: skillAtlas.allCandidates,
      categories: skillPacks.categories,
      phaseSummary: skillAtlas.phaseSummary,
      roadmapNextAction: skillRoadmap.nextSafeAction,
      phaseOneProductionStatus: skillProductionStatus,
      readinessFindings: skillReadiness.findings,
      executionSummary: skillExecution,
      primeRule: "Every GPAO-T skill must solve a real user problem through research-grounded practical procedures.",
    },
    nextSafeAction: skillExecution.totalRuns
      ? skillExecution.nextSafeAction
      : "로컬 스킬 실행 기록을 남겨 산출물, 품질, 리플레이, 성장 근거를 확인한다.",
  };
}

function buildRuntimePanel({ doctor, runtimeState, auditEvents }) {
  return {
    id: "runtime",
    label: "로컬 런타임",
    status: doctor.status === "ready" ? "ready" : "blocked",
    headline: doctor.status === "ready"
      ? "로컬 런타임 골격 파일이 준비되어 있다."
      : "필수 런타임 골격 파일이 빠져 있다.",
    data: {
      runtimeId: runtimeState.runtimeId,
      version: runtimeState.version,
      activeFlow: runtimeState.activeFlow,
      counters: runtimeState.counters,
      latestAuditEvent: auditEvents.at(-1) || null,
      missing: doctor.missing,
    },
    nextSafeAction: doctor.status === "ready"
      ? "UI나 커넥터를 더하기 전에 Control Center 패널에서 상태를 확인한다."
      : "UI나 커넥터 표면을 만들기 전에 빠진 런타임 파일을 복구한다.",
  };
}

function buildOpsPanel({ installHardening, operationsContract }) {
  return {
    id: "ops",
    label: "설치 / 업데이트 / 롤백",
    status: installHardening.status === "blocked" ? "blocked" : operationsContract.status,
    headline: installHardening.status === "blocked"
      ? "설치/업데이트/롤백 준비 상태에 막힌 지점이 있다."
      : "실제 실행기가 생기기 전에 로컬 데이터와 운영 계약을 먼저 확인할 수 있다.",
    data: {
      installHardening,
      operationsContract,
    },
    nextSafeAction: installHardening.nextSafeAction,
  };
}

function buildApprovalPreviewFlow() {
  const stages = [
    {
      id: "plan",
      step: 1,
      label: "계획",
      status: "ready",
      mode: "plan_only_not_invoked",
      visibleState: "install/update/rollback 계획만 만들어짐",
      executionState: "실행 안 됨",
      blockedState: "명령과 파일 쓰기는 미리보기로만 표시됨",
      nextSafeAction: "계획 내용을 읽기 쉽게 보여준다.",
    },
    {
      id: "preview",
      step: 2,
      label: "프리뷰",
      status: "ready",
      mode: "json_preview_no_html_no_script_no_execution",
      visibleState: "예정 명령, 쓰기, 복구, 잠금 항목을 요약함",
      executionState: "실행 안 됨",
      blockedState: "승인 준비용 화면일 뿐 실행 권한 없음",
      nextSafeAction: "프리뷰 카드의 말귀와 시각 구분을 다듬는다.",
    },
    {
      id: "approval",
      step: 3,
      label: "승인 범위",
      status: "ready",
      mode: "approval_contract_only_no_invocation",
      visibleState: "아직 승인 요청도 기록도 없음",
      executionState: "승인 전",
      blockedState: "승인 기록 없이 dry-run 호출 불가",
      nextSafeAction: "무엇을 승인할 수 있고 없는지 사용자가 이해하게 만든다.",
    },
    {
      id: "storage",
      step: 4,
      label: "기록 위치",
      status: "ready",
      mode: "storage_design_only_no_record_write_no_invocation",
      visibleState: "나중에 기록될 위치만 설계됨",
      executionState: "쓰기 안 됨",
      blockedState: ".gpao-t/approvals 기록 생성/읽기/쓰기 없음",
      nextSafeAction: "기록 위치를 보여주되 지금은 저장하지 않는다는 점을 분명히 한다.",
    },
    {
      id: "write-gate",
      step: 5,
      label: "쓰기 게이트",
      status: "ready",
      mode: "write_gate_design_only_no_record_write_no_invocation",
      visibleState: "게이트는 설계 상태, 구현/호출 없음",
      executionState: "멈춤선",
      blockedState: "approval record write는 계속 false",
      nextSafeAction: "사용자 프리뷰 흐름을 먼저 다듬고 쓰기 구현은 열지 않는다.",
    },
  ];

  const blockedActions = [
    "approval record write",
    "dry-run invocation",
    "command execution",
    "file mutation",
    "Tauri build",
    "dependency install",
    "install/update/rollback execution",
    "IPC",
    "external network",
    "connector/model/tool activation",
  ];
  const blockedActionViews = [
    { label: "승인 기록 쓰기", detail: "아직 저장하지 않음" },
    { label: "dry-run 호출", detail: "아직 실행하지 않음" },
    { label: "명령 실행", detail: "터미널 명령 없음" },
    { label: "파일 변경", detail: "소스/상태 파일 변경 없음" },
    { label: "Tauri 빌드", detail: "앱 빌드 안 함" },
    { label: "의존성 설치", detail: "패키지 설치 안 함" },
    { label: "설치/업데이트/롤백", detail: "실제 작업 안 함" },
    { label: "IPC", detail: "로컬 앱 명령 연결 안 함" },
    { label: "외부 네트워크", detail: "외부 호출 없음" },
    { label: "커넥터/모델/도구 활성화", detail: "외부 기능 연결 안 함" },
  ];

  return {
    schema: "gpao_t.approval_preview_control_center_flow.v0_1",
    status: stages.some((stage) => stage.status === "blocked") ? "blocked" : "review",
    flowMode: "control_center_preview_only_no_write_no_invocation",
    userUnderstanding: "아직 실행된 것은 없음. 현재 상태는 승인 전 미리보기이며, 사용자가 흐름을 이해하도록 보여주는 단계다.",
    stages,
    blockedActions,
    blockedActionViews,
    blockedActionTone: "calm_locked_not_danger_alarm",
    visualQaEvidence: {
      json: "docs/03-verification/evidence/control-center-approval-preview-ux-qa-2026-07-09.json",
      report: "docs/03-verification/evidence/CONTROL-CENTER-APPROVAL-PREVIEW-UX-QA-2026-07-09.md",
      screenshots: [
        "docs/03-verification/evidence/control-center-approval-preview-ux-2026-07-09-desktop-viewport-1440x960.png",
        "docs/03-verification/evidence/control-center-approval-preview-ux-2026-07-09-mobile-viewport-390x844.png",
        "docs/03-verification/evidence/control-center-approval-preview-ux-2026-07-09-desktop-focused-1440x960.png",
        "docs/03-verification/evidence/control-center-approval-preview-ux-2026-07-09-mobile-focused-390x844.png",
      ],
    },
    userVisibleFlow: [
      "Inspect dry-run plan status.",
      "Inspect preview cards and blocked actions.",
      "Inspect approval scope without requesting approval now.",
      "Inspect storage and write-gate boundaries.",
      "Refine the user-visible approval/preview flow before enabling any write path.",
    ],
    safetyInvariants: {
      writesApprovalRecord: false,
      invokesDryRunExecutor: false,
      runsCommands: false,
      mutatesFiles: false,
      runsTauriBuild: false,
      installsDependencies: false,
      opensIpc: false,
      usesExternalNetwork: false,
      activatesConnectorsModelsTools: false,
    },
    nextSafeAction:
      "다음은 승인 전 프리뷰 흐름을 더 읽기 쉽게 다듬는 것이다. 실행, 쓰기, 빌드, 설치/업데이트/롤백, 외부 연결은 아직 열지 않는다.",
  };
}

function buildApprovalPreviewPanel({ approvalPreviewFlow }) {
  return {
    id: "approval-preview",
    label: "승인 / 미리보기",
    status: approvalPreviewFlow.status,
    headline: "승인 전 프리뷰 단계다. 아직 실행된 것은 없고, dry-run/approval 흐름만 읽을 수 있다.",
    data: approvalPreviewFlow,
    nextSafeAction: approvalPreviewFlow.nextSafeAction,
  };
}

function buildDesignReferencePanel({ designReferenceGate }) {
  return {
    id: "design-reference",
    label: "디자인 기준",
    status: "review",
    headline: "모든 UI/UX slice는 Codex급 작업 리듬, Claude Code급 권한 UX, 한국어 제품감을 실제 화면 증거로 확인해야 한다.",
    data: designReferenceGate,
    nextSafeAction: designReferenceGate.nextSafeAction,
  };
}

function buildExecutionApprovalPanel({ executionApprovalPreview, approvalAuditLocalRecordSubstrate }) {
  return {
    id: "execution-approval",
    label: "실행 전 확인",
    status: "review",
    headline: "실행 후보를 확인하고 승인/감사 기록만 로컬 JSONL에 남길 수 있다.",
    data: {
      ...executionApprovalPreview,
      localRecordSubstrate: approvalAuditLocalRecordSubstrate,
    },
    nextSafeAction: approvalAuditLocalRecordSubstrate.visualConfirmation.nextSafeAction,
  };
}

function buildMemoryPanel({ memoryWiki, tcellCandidates, memoryReviewQueue, memoryApplyGate, autoMemoryGrowth }) {
  const hasCandidates = tcellCandidates.length > 0;
  const hasReviewQueue = memoryReviewQueue.counts.records > 0;
  const hasAppliedContextMesh = memoryReviewQueue.counts.contextMeshApplied > 0;
  const hasAutoLoop = autoMemoryGrowth.totalRuns > 0;
  return {
    id: "memory",
    label: "기억 / Context Mesh",
    status: hasCandidates || hasReviewQueue || hasAutoLoop ? "ready" : "review",
    headline: hasAppliedContextMesh
      ? "자동/승인/감사/rollback receipt를 거친 Context Mesh 후보가 로컬 적용되어 있다."
      : hasCandidates
      ? "Context Mesh 선별에 쓸 기억 후보가 있다."
      : hasReviewQueue
      ? "기억 후보 review/apply queue가 준비되어 있고 적용은 잠겨 있다."
      : hasAutoLoop
      ? "자동 기억/자가성장 루프 기록이 있다."
      : "아직 사용할 T-cell 후보가 없다.",
    data: {
      entries: memoryWiki.entries.length,
      candidates: tcellCandidates.length,
      latestEntry: memoryWiki.entries.at(-1) || null,
      autoMemoryGrowth,
      reviewQueue: memoryReviewQueue,
      applyGate: {
        status: memoryApplyGate.status,
        currentStage: memoryApplyGate.activeGate.currentStage,
        sequence: memoryApplyGate.activeGate.sequence,
        controls: memoryApplyGate.controls,
        latest: memoryApplyGate.latest,
      },
      sourceCandidateReplayApplyLine: [
        "source_truth",
        "memory_candidate",
        "read_only_replay",
        "apply_request",
        "approval_audit",
        "reversible_context_mesh_apply",
        "rollback_receipt",
      ],
      blockedMutations: [
        "durable memory promotion",
        "GPAO-T 원천 메모리 쓰기",
        "automatic admission",
        "external send",
      ],
    },
    nextSafeAction: hasAppliedContextMesh
      ? "적용 후보도 현재 요청마다 Context Mesh resolve와 admission을 다시 거친다."
      : hasCandidates || hasReviewQueue
      ? "원본, 후보, replay, apply request, approval/audit, rollback receipt를 분리해 검토한다."
      : "기억 연속성에 기대기 전에 출처가 연결된 Memory Wiki 항목을 남긴다.",
  };
}

function buildRecoveryPanel({ recoveryHistory, recoverySummary }) {
  return {
    id: "recovery",
    label: "리플레이 복구",
    status: recoveryHistory.length ? "ready" : "review",
    headline: recoveryHistory.length
      ? "리플레이 복구 근거가 있다."
      : "아직 기록된 리플레이 복구 근거가 없다.",
    data: {
      totalRecords: recoveryHistory.length,
      repeatedTargets: recoverySummary.repeatedTargets,
      latest: recoverySummary.latest,
    },
    nextSafeAction: recoverySummary.nextSafeAction,
  };
}

function buildGrowthPanel({ growthProposals, growthApplicationGates }) {
  const hasGateReviews = growthApplicationGates.totalGates > 0;
  return {
    id: "growth",
    label: "자가성장 제안",
    status: growthProposals.length || hasGateReviews ? "review" : "ready",
    headline: hasGateReviews
      ? "성장 적용 게이트가 검토를 기다리고 있으며 live mutation은 잠겨 있다."
      : growthProposals.length
      ? "검토 전용 성장 제안이 리플레이와 승인 게이트를 기다리고 있다."
      : "대기 중인 성장 제안은 없다.",
    data: {
      proposals: growthProposals.length,
      applicationGates: growthApplicationGates.totalGates,
      blockedLiveMutations: growthApplicationGates.blockedLiveMutations,
      latest: growthProposals.at(-1) || null,
      latestApplicationGate: growthApplicationGates.latest,
    },
    nextSafeAction: hasGateReviews
      ? growthApplicationGates.nextSafeAction
      : growthProposals.length
      ? "제안을 검토하고 리플레이 근거를 더하되, 승인 게이트 전까지 적용은 잠근다."
      : "반복된 리플레이 복구 근거에서만 제안을 만든다.",
  };
}

function buildAdapterPanel({ modelAdapters, modelRouterBoundary, modelRouterPolicy, toolAdapters }) {
  const blockedExternalModels = modelAdapters.adapters.filter((adapter) =>
    adapter.provider === "external_api" && adapter.status !== "available"
  );
  const blockedTools = toolAdapters.adapters.filter((adapter) => adapter.status === "blocked");

  return {
    id: "adapters",
    label: "모델 / 도구 어댑터",
    status: "ready",
    headline: "로컬 미리보기 어댑터는 보이고, 외부 어댑터는 잠겨 있다.",
    data: {
      modelAdapters: modelAdapters.adapters.length,
      modelRouterBoundary,
      modelRouterPolicy,
      toolAdapters: toolAdapters.adapters.length,
      blockedExternalModels: blockedExternalModels.map((adapter) => adapter.id),
      blockedTools: blockedTools.map((adapter) => adapter.id),
    },
    nextSafeAction: modelRouterPolicy.nextSafeAction,
  };
}

function buildConnectorPanel({ connectorGovernance }) {
  return {
    id: "connectors",
    label: "커넥터",
    status: "review",
    headline: "도구, 명령, MCP, 커넥터 후보는 보이지만 실행은 잠겨 있다.",
    data: connectorGovernance,
    nextSafeAction: connectorGovernance.nextSafeAction,
  };
}

function buildAuthorityPanel({ runtimeState }) {
  return {
    id: "authority",
    label: "권한",
    status: "ready",
    headline: "권한 경계는 기본적으로 로컬 미리보기만 허용한다.",
    data: runtimeState.boundaries || {},
    nextSafeAction: "외부 행동, 파괴적 변경, 인증 정보, 배포, 지속 변경 경계에서만 명시적 승인을 요청한다.",
  };
}

function buildNextSafeAction({ blockedPanels, reviewPanels }) {
  if (blockedPanels.length) {
    return `먼저 막힌 패널을 해결한다: ${blockedPanels[0].label}.`;
  }
  const coreWorkSurfacePanel = reviewPanels.find((panel) => panel.id === "core-work-surface");
  if (coreWorkSurfacePanel) return coreWorkSurfacePanel.nextSafeAction;
  if (reviewPanels.length) {
    const approvalPreviewPanel = reviewPanels.find((panel) => panel.id === "approval-preview");
    if (approvalPreviewPanel) return approvalPreviewPanel.nextSafeAction;
    return `Review panel before applying changes: ${reviewPanels[0].label}.`;
  }
  return "Use this snapshot as the GPAO-T dashboard data source before building the visual UI.";
}
