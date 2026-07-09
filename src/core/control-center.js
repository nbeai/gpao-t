import { listModelAdapters, listToolAdapters } from "./adapter-boundary.js";
import { buildConnectorGovernanceSummary } from "./connector-governance.js";
import { buildCoreWorkSurface } from "./core-work-surface.js";
import { runDoctor } from "./doctor.js";
import { buildGrowthApplicationGateSummary } from "./growth-application-gates.js";
import { readSelfGrowthProposals } from "./growth-proposals.js";
import { buildInstallHardeningSummary } from "./install-hardening.js";
import { buildModelRouterBoundary, buildModelRouterPolicy } from "./model-router.js";
import { readMemoryWiki, readTCellCandidates } from "./memory-wiki.js";
import { buildOperationsContractSummary } from "./operations-contract.js";
import { buildRecoveryHistorySummary, readReplayRecoveryHistory } from "./replay-history.js";
import { buildSkillExecutionSummary } from "./skill-execution-adapter.js";
import {
  buildSkillCandidateAtlas,
  buildSkillProductionRoadmap,
  buildSkillProductionStatus,
  buildSkillReadinessReport,
  listSkillPacks,
} from "./skill-ecosystem.js";
import { readAuditEvents, readRuntimeState } from "./storage.js";

export function buildControlCenterSnapshot({ root } = {}) {
  const doctor = runDoctor({ root });
  const runtimeState = readRuntimeState({ root });
  const auditEvents = readAuditEvents({ root });
  const memoryWiki = readMemoryWiki({ root });
  const tcellCandidates = readTCellCandidates({ root });
  const recoveryHistory = readReplayRecoveryHistory({ root });
  const recoverySummary = buildRecoveryHistorySummary({ root });
  const growthProposals = readSelfGrowthProposals({ root });
  const growthApplicationGates = buildGrowthApplicationGateSummary({ root });
  const modelAdapters = listModelAdapters();
  const modelRouterBoundary = buildModelRouterBoundary();
  const modelRouterPolicy = buildModelRouterPolicy();
  const toolAdapters = listToolAdapters();
  const connectorGovernance = buildConnectorGovernanceSummary();
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

  const panels = [
    buildCoreWorkSurfacePanel({ coreWorkSurface }),
    buildRuntimePanel({ doctor, runtimeState, auditEvents }),
    buildOpsPanel({ installHardening, operationsContract }),
    buildApprovalPreviewPanel({ approvalPreviewFlow }),
    buildSkillPanel({
      skillPacks,
      skillReadiness,
      skillExecution,
      skillAtlas,
      skillRoadmap,
      skillProductionStatus,
    }),
    buildMemoryPanel({ memoryWiki, tcellCandidates }),
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
      approvalPreviewBlockedActions: approvalPreviewFlow.blockedActions.length,
      approvalPreviewReadyStages: approvalPreviewFlow.stages.filter((stage) => stage.status === "ready").length,
      coreWorkSurfaceThreadMessages: coreWorkSurface.workspaceThread.threadPreview.length,
      coreWorkSurfaceSelectedSkillPacks: coreWorkSurface.skillRoutePreview.selectedPacks.length,
      coreWorkSurfaceContextCandidates: coreWorkSurface.contextPreview.retrievedCandidates.length,
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
    },
    authorityBoundary: {
      externalModelCall: "blocked_until_configured_and_approved",
      modelRouterBoundary: modelRouterBoundary.providerBoundary.externalProviderCall,
      externalToolAction: "blocked_until_explicit_approval",
      installExecution: installHardening.authorityBoundary.installExecution,
      updateExecution: installHardening.authorityBoundary.updateExecution,
      destructiveRollback: installHardening.authorityBoundary.destructiveRollback,
      approvalPreviewFlow: "local_preview_only_no_write_no_invocation",
      approvalRecordWrite: "blocked",
      dryRunInvocation: "blocked",
      tauriBuild: "blocked",
      dependencyInstall: "blocked",
      connectorActivation: connectorGovernance.authorityBoundary.oauthSetup,
      connectorWriteAccess: connectorGovernance.authorityBoundary.writeAccess,
      connectorExternalSend: connectorGovernance.authorityBoundary.externalSend,
      growthApplication: growthApplicationGates.authorityBoundary.liveRuntimeMutation,
      durableMemoryPromotion: runtimeState.boundaries?.durableMemoryPromotion || "blocked",
      publicRelease: runtimeState.boundaries?.publicRelease || "blocked",
      localPreview: runtimeState.boundaries?.localPreview || "allowed",
      secrets: "not_stored",
    },
    nextSafeAction: buildNextSafeAction({ blockedPanels, reviewPanels }),
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

function buildCoreWorkSurfacePanel({ coreWorkSurface }) {
  return {
    id: "core-work-surface",
    label: "Work Surface",
    status: coreWorkSurface.status,
    headline: "GPAO-T에게 일을 맡기는 첫 작업 표면이다. 입력은 초안이고 실행은 아직 열리지 않는다.",
    data: coreWorkSurface,
    nextSafeAction: coreWorkSurface.nextSafeAction,
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
    label: "Skill Ecosystem",
    status,
    headline: skillExecution.totalRuns
      ? "Skill packs now produce local execution evidence and growth signals."
      : skillReadiness.status === "ready"
      ? "Research-grounded base skill packs are registered; execution evidence is waiting for first run."
      : "Skill ecosystem manifest needs review before runtime attachment.",
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
      : "Run a local skill execution record to create inspectable artifact, quality, replay, and growth evidence.",
  };
}

function buildRuntimePanel({ doctor, runtimeState, auditEvents }) {
  return {
    id: "runtime",
    label: "Runtime",
    status: doctor.status === "ready" ? "ready" : "blocked",
    headline: doctor.status === "ready"
      ? "Local runtime skeleton files are present."
      : "Required runtime skeleton files are missing.",
    data: {
      runtimeId: runtimeState.runtimeId,
      version: runtimeState.version,
      activeFlow: runtimeState.activeFlow,
      counters: runtimeState.counters,
      latestAuditEvent: auditEvents.at(-1) || null,
      missing: doctor.missing,
    },
    nextSafeAction: doctor.status === "ready"
      ? "Use control center panels to inspect state before adding UI or connectors."
      : "Restore missing runtime files before building UI or connector surfaces.",
  };
}

function buildOpsPanel({ installHardening, operationsContract }) {
  return {
    id: "ops",
    label: "Install / Update / Rollback",
    status: installHardening.status === "blocked" ? "blocked" : operationsContract.status,
    headline: installHardening.status === "blocked"
      ? "Install/update/rollback readiness has blockers."
      : "Local data and operations contracts are inspectable before real executors exist.",
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
    label: "Approval / Preview",
    status: approvalPreviewFlow.status,
    headline: "승인 전 프리뷰 단계다. 아직 실행된 것은 없고, dry-run/approval 흐름만 읽을 수 있다.",
    data: approvalPreviewFlow,
    nextSafeAction: approvalPreviewFlow.nextSafeAction,
  };
}

function buildMemoryPanel({ memoryWiki, tcellCandidates }) {
  const hasCandidates = tcellCandidates.length > 0;
  return {
    id: "memory",
    label: "Memory Wiki / Context Mesh",
    status: hasCandidates ? "ready" : "review",
    headline: hasCandidates
      ? "Memory candidates are available for Context Mesh admission."
      : "No T-cell candidates are available yet.",
    data: {
      entries: memoryWiki.entries.length,
      candidates: tcellCandidates.length,
      latestEntry: memoryWiki.entries.at(-1) || null,
    },
    nextSafeAction: hasCandidates
      ? "Resolve current requests through Context Mesh before admission."
      : "Capture a source-linked Memory Wiki entry before relying on memory continuity.",
  };
}

function buildRecoveryPanel({ recoveryHistory, recoverySummary }) {
  return {
    id: "recovery",
    label: "Replay Recovery",
    status: recoveryHistory.length ? "ready" : "review",
    headline: recoveryHistory.length
      ? "Replay recovery evidence is available."
      : "No replay recovery evidence has been recorded yet.",
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
    label: "Self-Growth Proposals",
    status: growthProposals.length || hasGateReviews ? "review" : "ready",
    headline: hasGateReviews
      ? "Growth application gates are waiting for review; live mutation is blocked."
      : growthProposals.length
      ? "Review-only growth proposals are waiting for replay and approval gates."
      : "No growth proposals are pending.",
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
      ? "Review proposals, add replay coverage, and keep application blocked until approval gates exist."
      : "Generate proposals only from repeated replay recovery evidence.",
  };
}

function buildAdapterPanel({ modelAdapters, modelRouterBoundary, modelRouterPolicy, toolAdapters }) {
  const blockedExternalModels = modelAdapters.adapters.filter((adapter) =>
    adapter.provider === "external_api" && adapter.status !== "available"
  );
  const blockedTools = toolAdapters.adapters.filter((adapter) => adapter.status === "blocked");

  return {
    id: "adapters",
    label: "Model / Tool Adapters",
    status: "ready",
    headline: "Local preview adapters are visible and external adapters are blocked.",
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
    label: "Connectors",
    status: "review",
    headline: "Connector registry is visible, but account setup and execution stay blocked.",
    data: connectorGovernance,
    nextSafeAction: connectorGovernance.nextSafeAction,
  };
}

function buildAuthorityPanel({ runtimeState }) {
  return {
    id: "authority",
    label: "Authority",
    status: "ready",
    headline: "Authority boundaries default to local preview only.",
    data: runtimeState.boundaries || {},
    nextSafeAction: "Ask for explicit approval only at external, destructive, secret, deployment, or durable mutation boundaries.",
  };
}

function buildNextSafeAction({ blockedPanels, reviewPanels }) {
  if (blockedPanels.length) {
    return `Resolve blocked panel first: ${blockedPanels[0].label}.`;
  }
  const coreWorkSurfacePanel = reviewPanels.find((panel) => panel.id === "core-work-surface");
  if (coreWorkSurfacePanel) return coreWorkSurfacePanel.nextSafeAction;
  if (reviewPanels.length) {
    const approvalPreviewPanel = reviewPanels.find((panel) => panel.id === "approval-preview");
    if (approvalPreviewPanel) return approvalPreviewPanel.nextSafeAction;
    return `Review panel before applying changes: ${reviewPanels[0].label}.`;
  }
  return "Use this snapshot as the Local Control Center data source before building the visual UI.";
}
