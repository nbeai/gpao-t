#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  handleGatewayRequest,
  initializeRuntimeState,
  appendSelfGrowthProposal,
  appendGrowthApplicationGate,
  appendInstallHardeningReport,
  buildControlCenterSnapshot,
  buildControlCenterSummary,
  buildControlCenterHtml,
  buildControlCenterUiContract,
  buildControlCenterUiSnapshot,
  buildConnectorGovernanceSummary,
  buildGrowthApplicationGate,
  buildGrowthApplicationGateSummary,
  buildInstallHardeningReport,
  buildInstallHardeningSummary,
  buildLocalControlCenterDesignContract,
  buildOperationsContractSummary,
  buildOperationsReliabilityContract,
  buildRuntimeDataContract,
  buildSelfGrowthProposal,
  buildSkillEcosystemPlan,
  buildSkillExecutionPlan,
  buildSkillExecutionRun,
  buildSkillExecutionSummary,
  buildSkillIntentProfile,
  buildSkillManifestStandard,
  buildSkillManualFirstPlan,
  buildSkillReadinessReport,
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
  resolveContextMesh,
  reviewConnectorPermission,
  renderControlCenterHtml,
  routeSkillPacks,
  runDoctor,
  runRuntimeTurn,
  validateControlCenterUiSnapshot,
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
    "  gpao-t adapters plan <text>",
    "  gpao-t control snapshot",
    "  gpao-t control summary",
    "  gpao-t control design",
    "  gpao-t control ui-contract",
    "  gpao-t control ui-snapshot",
    "  gpao-t control ui-validate",
    "  gpao-t control html",
    "  gpao-t control render [output.html]",
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
      throw new Error("skill command requires ecosystem, execute-plan, execute, execute-record, execution-history, execution-summary, intent, manifest, manual-first, packs, inspect, route, or readiness");
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
    } else if (subcommand === "plan") {
      const text = textParts.join(" ").trim();
      if (!text) {
        throw new Error("adapters plan requires input text");
      }
      printJson(runRuntimeTurn({ input: { text } }).adapterPlan);
    } else {
      throw new Error("adapters command requires models, tools, or plan");
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
    } else {
      throw new Error("control command requires snapshot, summary, design, ui-contract, ui-snapshot, ui-validate, html, or render");
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
