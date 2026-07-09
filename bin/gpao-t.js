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
  buildControlCenterSnapshot,
  buildControlCenterSummary,
  buildControlCenterHtml,
  buildControlCenterServingContract,
  buildControlCenterUiContract,
  buildControlCenterUiSnapshot,
  buildConnectorGovernanceSummary,
  buildCoreWorkSurface,
  buildCoreWorkSurfaceHtml,
  buildWorkSurfaceSubmissionDecisionGate,
  buildWorkSurfaceSubmissionValidationGate,
  buildGrowthApplicationGate,
  buildGrowthApplicationGateSummary,
  buildInstallHardeningReport,
  buildInstallHardeningSummary,
  buildLocalControlCenterDesignContract,
  buildModelRouterBoundary,
  buildOperationsContractSummary,
  buildOperationsReliabilityContract,
  buildPackagedDesktopPlanningReview,
  buildRuntimeDataContract,
  buildSelfGrowthProposal,
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
  captureMemoryEntry,
  buildReplayRecoveryView,
  appendReplayRecoveryRecord,
  buildRecoveryHistorySummary,
  getSkillPack,
  readAuditEvents,
  readGrowthApplicationGates,
  readInstallHardeningReports,
  listConnectors,
  listModelAdapters,
  listSkillPacks,
  listToolAdapters,
  readMemoryWiki,
  readReplayRecoveryHistory,
  readRuntimeState,
  readSelfGrowthProposals,
  readSkillExecutionHistory,
  renderTauriInstallDryRunPreview,
  resolveContextMesh,
  reviewConnectorPermission,
  renderControlCenterHtml,
  routeSkillPacks,
  runDoctor,
  runRuntimeTurn,
  startControlCenterPreviewServer,
  validateControlCenterUiSnapshot,
  verifyBrowserLocalAppShell,
  verifyControlCenterPreviewServing,
  verifyCoreWorkSurface,
  verifyModelRouterBoundary,
  verifyWorkSurfaceSubmissionDecisionGate,
  verifyWorkSurfaceSubmissionValidationGate,
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
    "  gpao-t connectors list",
    "  gpao-t connectors governance",
    "  gpao-t connectors review <connector-id> [action]",
    "  gpao-t ops hardening",
    "  gpao-t ops contract",
    "  gpao-t ops data",
    "  gpao-t ops reliability",
    "  gpao-t ops hardening-record",
    "  gpao-t ops hardening-history",
    "  gpao-t ops hardening-summary",
    "  gpao-t adapters models",
    "  gpao-t adapters tools",
    "  gpao-t adapters model-router-boundary [text]",
    "  gpao-t adapters model-router-boundary-check",
    "  gpao-t adapters plan <text>",
    "  gpao-t control snapshot",
    "  gpao-t control summary",
    "  gpao-t control design",
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
    "  gpao-t control work-surface-submission-gate",
    "  gpao-t control work-surface-submission-gate-check",
    "  gpao-t control work-surface-submission-validation-gate",
    "  gpao-t control work-surface-submission-validation-gate-check",
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
    "  gpao-t state",
    "  gpao-t events",
    "  gpao-t memory capture <title> <body>",
    "  gpao-t memory list",
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
    } else {
      throw new Error("memory command requires capture or list");
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
  } else if (command === "connectors") {
    const [subcommand, connectorId, action] = args;
    if (subcommand === "list") {
      printJson(listConnectors());
    } else if (subcommand === "governance") {
      printJson(buildConnectorGovernanceSummary());
    } else if (subcommand === "review") {
      if (!connectorId) {
        throw new Error("connectors review requires connector id");
      }
      printJson(reviewConnectorPermission({ connectorId, action }));
    } else {
      throw new Error("connectors command requires list, governance, or review");
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
    } else if (subcommand === "plan") {
      const text = textParts.join(" ").trim();
      if (!text) {
        throw new Error("adapters plan requires input text");
      }
      printJson(runRuntimeTurn({ input: { text } }).adapterPlan);
    } else {
      throw new Error("adapters command requires models, tools, model-router-boundary, model-router-boundary-check, or plan");
    }
  } else if (command === "control") {
    const [subcommand] = args;
    if (subcommand === "snapshot") {
      printJson(buildControlCenterSnapshot());
    } else if (subcommand === "summary") {
      printJson(buildControlCenterSummary());
    } else if (subcommand === "design") {
      printJson(buildLocalControlCenterDesignContract());
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
    } else if (subcommand === "work-surface-submission-gate") {
      printJson(buildWorkSurfaceSubmissionDecisionGate());
    } else if (subcommand === "work-surface-submission-gate-check") {
      printJson(verifyWorkSurfaceSubmissionDecisionGate());
    } else if (subcommand === "work-surface-submission-validation-gate") {
      printJson(buildWorkSurfaceSubmissionValidationGate());
    } else if (subcommand === "work-surface-submission-validation-gate-check") {
      printJson(verifyWorkSurfaceSubmissionValidationGate());
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
    } else {
      throw new Error("control command requires snapshot, summary, design, ui-contract, ui-snapshot, ui-validate, html, render, serve-contract, serve-check, serve, work-surface, work-surface-html, work-surface-check, work-surface-submission-gate, work-surface-submission-gate-check, work-surface-submission-validation-gate, work-surface-submission-validation-gate-check, app-shell-contract, app-shell-state, app-shell-html, app-shell-check, tauri-gate, tauri-gate-check, packaged-desktop-review, packaged-desktop-review-check, tauri-install-gate, tauri-install-gate-check, tauri-prerequisite-doctor, tauri-prerequisite-doctor-check, tauri-dry-run-contract, tauri-dry-run-contract-check, tauri-dry-run-design, tauri-dry-run-design-check, tauri-dry-run-plan, tauri-dry-run-plan-check, tauri-dry-run-preview, tauri-dry-run-preview-check, tauri-dry-run-invocation-approval, tauri-dry-run-invocation-approval-check, tauri-dry-run-approval-storage, tauri-dry-run-approval-storage-check, tauri-dry-run-approval-write-gate, tauri-dry-run-approval-write-gate-check, tauri-shell-slice, tauri-shell-html, or tauri-shell-check");
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
