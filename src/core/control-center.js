import { listModelAdapters, listToolAdapters } from "./adapter-boundary.js";
import { buildConnectorGovernanceSummary } from "./connector-governance.js";
import { runDoctor } from "./doctor.js";
import { buildGrowthApplicationGateSummary } from "./growth-application-gates.js";
import { readSelfGrowthProposals } from "./growth-proposals.js";
import { buildInstallHardeningSummary } from "./install-hardening.js";
import { readMemoryWiki, readTCellCandidates } from "./memory-wiki.js";
import { buildOperationsContractSummary } from "./operations-contract.js";
import { buildRecoveryHistorySummary, readReplayRecoveryHistory } from "./replay-history.js";
import { buildSkillExecutionSummary } from "./skill-execution-adapter.js";
import { buildSkillReadinessReport, listSkillPacks } from "./skill-ecosystem.js";
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
  const toolAdapters = listToolAdapters();
  const connectorGovernance = buildConnectorGovernanceSummary();
  const installHardening = buildInstallHardeningSummary({ root });
  const operationsContract = buildOperationsContractSummary();
  const skillPacks = listSkillPacks();
  const skillReadiness = buildSkillReadinessReport();
  const skillExecution = buildSkillExecutionSummary({ root });

  const panels = [
    buildRuntimePanel({ doctor, runtimeState, auditEvents }),
    buildOpsPanel({ installHardening, operationsContract }),
    buildSkillPanel({ skillPacks, skillReadiness, skillExecution }),
    buildMemoryPanel({ memoryWiki, tcellCandidates }),
    buildRecoveryPanel({ recoveryHistory, recoverySummary }),
    buildGrowthPanel({ growthProposals, growthApplicationGates }),
    buildAdapterPanel({ modelAdapters, toolAdapters }),
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
      skillPackReadinessFindings: skillReadiness.totalFindings,
      skillExecutionRuns: skillExecution.totalRuns,
      skillExecutionGrowthSignals: skillExecution.growthSignalCandidates.length,
      growthProposals: growthProposals.length,
      growthApplicationGates: growthApplicationGates.totalGates,
      blockedGrowthApplications: growthApplicationGates.blockedLiveMutations,
      modelAdapters: modelAdapters.adapters.length,
      toolAdapters: toolAdapters.adapters.length,
      connectors: connectorGovernance.totalConnectors,
      blockedConnectors: connectorGovernance.blockedConnectors.length,
    },
    authorityBoundary: {
      externalModelCall: "blocked_until_configured_and_approved",
      externalToolAction: "blocked_until_explicit_approval",
      installExecution: installHardening.authorityBoundary.installExecution,
      updateExecution: installHardening.authorityBoundary.updateExecution,
      destructiveRollback: installHardening.authorityBoundary.destructiveRollback,
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

function buildSkillPanel({ skillPacks, skillReadiness, skillExecution }) {
  const status = skillReadiness.status === "blocked"
    ? "blocked"
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
      categories: skillPacks.categories,
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

function buildAdapterPanel({ modelAdapters, toolAdapters }) {
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
      toolAdapters: toolAdapters.adapters.length,
      blockedExternalModels: blockedExternalModels.map((adapter) => adapter.id),
      blockedTools: blockedTools.map((adapter) => adapter.id),
    },
    nextSafeAction: "Keep external providers and external tools blocked until setup, approval, replay, audit, and rollback gates exist.",
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
  if (reviewPanels.length) {
    return `Review panel before applying changes: ${reviewPanels[0].label}.`;
  }
  return "Use this snapshot as the Local Control Center data source before building the visual UI.";
}
