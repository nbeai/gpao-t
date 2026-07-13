import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildConnectorToolGovernance } from "./connector-governance.js";
import { appendToolProgressEvent } from "./live-turn-absorption-bridge.js";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(MODULE_DIR, "..", "..");
const CLI_PATH = join(PROJECT_ROOT, "bin", "gpao-t.js");

const EXECUTION_LANE_BLOCKS = [
  "write mutation",
  "external send",
  "destructive action",
  "paid action",
  "credential read/write",
  "connector live activation",
  "durable memory promotion",
];

const SAFE_DRY_RUN_COMMANDS = {
  "model-invocation-check": {
    command: process.execPath,
    args: [CLI_PATH, "adapters", "model-invocation-check"],
    label: "Model invocation check",
    expectedMutation: false,
  },
  "work-surface-check": {
    command: process.execPath,
    args: [CLI_PATH, "control", "work-surface-check"],
    label: "Work Surface check",
    expectedMutation: false,
    recursiveSurface: true,
  },
  "stage-4-production-hardening-check": {
    command: process.execPath,
    args: [CLI_PATH, "control", "stage-4-production-hardening-check"],
    label: "Stage 4 production hardening check",
    expectedMutation: false,
  },
};

export function buildExecutionRuntimePlan({
  root,
  request = "로컬 작업 실행 후보를 안전하게 검토한다.",
  requestedSurface = "cli",
  requestedTier = "dry_run",
} = {}) {
  const governance = buildConnectorToolGovernance({
    modelOutput: request,
    requestedSurface,
    requestedTier,
  });
  const readOnlyEvidence = buildReadOnlyEvidence({ root });
  const dryRunPreview = buildDryRunPreview({ request, requestedSurface, requestedTier });

  return {
    schema: "gpao_t.execution_runtime_plan.v1",
    status: "ready",
    mode: "read_only_and_dry_run_preview",
    request,
    governance: {
      selectedCandidateClass: governance.selectedCandidateClass,
      selectedAuthorityTier: governance.selectedAuthorityTier,
      modelOutputIsExecutionAuthority: governance.modelOutputToExecutionProposal.outputIsExecutionAuthority,
      approvalBoundary: governance.approvalBoundary,
    },
    readOnlyEvidence,
    dryRunPreview,
    authorityFlow: [
      "read_only",
      "dry_run",
      "approval_packet",
      "audit_write",
      "rollback_reference",
      "limited_execution_after_explicit_approval",
    ],
    allowedNow: [
      "local read-only evidence inspection",
      "dry-run plan preview",
      "approval packet preview",
      "audit and rollback reference preview",
    ],
    blockedActions: EXECUTION_LANE_BLOCKS,
    safetyInvariants: {
      writesFiles: false,
      runsCliCommand: false,
      invokesMcp: false,
      activatesConnector: false,
      sendsExternalNetworkRequest: false,
      readsOrWritesCredentials: false,
      spendsMoney: false,
      performsDestructiveAction: false,
      promotesDurableMemory: false,
    },
    nextSafeAction:
      "Use this plan to show read-only and dry-run consequences before any limited execution is explicitly approved.",
  };
}

export function verifyExecutionRuntimePlan({
  plan = buildExecutionRuntimePlan({ root: process.cwd() }),
} = {}) {
  const findings = [];

  if (plan.schema !== "gpao_t.execution_runtime_plan.v1") findings.push("invalid_schema");
  if (plan.mode !== "read_only_and_dry_run_preview") findings.push("invalid_mode");
  if (plan.governance?.modelOutputIsExecutionAuthority !== false) findings.push("model_output_can_execute");
  if (!plan.authorityFlow?.includes("approval_packet")) findings.push("missing_approval_packet_stage");
  if (!plan.authorityFlow?.includes("rollback_reference")) findings.push("missing_rollback_reference_stage");
  if (plan.readOnlyEvidence?.status !== "ready") findings.push("read_only_evidence_not_ready");
  if (plan.dryRunPreview?.invokesNow !== false) findings.push("dry_run_invocation_open");
  if (!plan.blockedActions?.includes("credential read/write")) findings.push("credential_boundary_missing");
  if (Object.values(plan.safetyInvariants || {}).some(Boolean)) findings.push("unsafe_invariant_open");

  return {
    schema: "gpao_t.execution_runtime_plan_verification.v1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedAuthorityFlow: plan.authorityFlow,
    nextSafeAction: findings.length
      ? "Repair execution runtime plan findings before opening any execution lane."
      : plan.nextSafeAction,
  };
}

export function invokeExecutionRuntimeDryRun({
  root = process.cwd(),
  commandId = "model-invocation-check",
  approval = {},
  now = new Date().toISOString(),
} = {}) {
  const commandSpec = SAFE_DRY_RUN_COMMANDS[commandId];
  const approvalCheck = verifyExecutionRuntimeApproval({ commandId, approval });
  const sessionKey = approval.sessionKey || "agent:main:main";
  const runId = approval.runId || `execution-runtime.${Date.parse(now) || 0}.${commandId}`;

  if (!commandSpec) {
    const progressEvent = appendExecutionProgress({
      root,
      now,
      runId,
      sessionKey,
      commandId,
      status: "blocked",
      summary: "알 수 없는 dry-run 명령이라 실행하지 않았습니다.",
    });
    return {
      schema: "gpao_t.execution_runtime_invocation.v1",
      status: "blocked",
      invokedAt: now,
      commandId,
      approvalCheck,
      progressEvents: [progressEvent],
      output: null,
      nextSafeAction: "Choose a known safe dry-run command.",
    };
  }

  if (approvalCheck.status !== "ready") {
    const progressEvent = appendExecutionProgress({
      root,
      now,
      runId,
      sessionKey,
      commandId,
      commandSpec,
      status: "blocked",
      summary: "승인 조건이 맞지 않아 dry-run 실행을 차단했습니다.",
    });
    return {
      schema: "gpao_t.execution_runtime_invocation.v1",
      status: "blocked",
      invokedAt: now,
      commandId,
      command: renderCommand(commandSpec),
      approvalCheck,
      progressEvents: [progressEvent],
      output: null,
      nextSafeAction: approvalCheck.nextSafeAction,
    };
  }

  if (commandSpec.recursiveSurface && approval.allowRecursiveSurface !== true) {
    const progressEvent = appendExecutionProgress({
      root,
      now,
      runId,
      sessionKey,
      commandId,
      commandSpec,
      status: "blocked",
      summary: "재귀 표면 dry-run은 별도 승인이 없어 실행하지 않았습니다.",
    });
    return {
      schema: "gpao_t.execution_runtime_invocation.v1",
      status: "blocked",
      invokedAt: now,
      commandId,
      command: renderCommand(commandSpec),
      approvalCheck: {
        ...approvalCheck,
        status: "blocked",
        findings: [...approvalCheck.findings, "recursive_surface_command_requires_explicit_approval"],
      },
      progressEvents: [progressEvent],
      output: null,
      nextSafeAction: "Use a non-recursive dry-run command for automatic runtime proof.",
    };
  }

  const startedProgress = appendExecutionProgress({
    root,
    now,
    runId,
    sessionKey,
    commandId,
    commandSpec,
    status: "running",
    summary: `${commandSpec.label} dry-run을 실행 중입니다.`,
  });
  let stdout = "";
  let parsed;
  let completedProgress;
  try {
    stdout = execFileSync(commandSpec.command, commandSpec.args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30000,
    });
    parsed = parseJsonOrText(stdout);
    completedProgress = appendExecutionProgress({
      root,
      now,
      runId,
      sessionKey,
      commandId,
      commandSpec,
      status: "complete",
      summary: `${commandSpec.label} dry-run이 통과했습니다.`,
    });
  } catch (error) {
    const failedProgress = appendExecutionProgress({
      root,
      now,
      runId,
      sessionKey,
      commandId,
      commandSpec,
      status: "error",
      summary: `${commandSpec.label} dry-run이 실패했습니다.`,
    });
    return {
      schema: "gpao_t.execution_runtime_invocation.v1",
      status: "failed_dry_run_invocation",
      invokedAt: now,
      commandId,
      label: commandSpec.label,
      command: renderCommand(commandSpec),
      approvalCheck,
      progressEvents: [startedProgress, failedProgress],
      output: {
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      },
      safetyInvariants: {
        writeMutationExpected: commandSpec.expectedMutation,
        externalSend: false,
        credentialAccess: false,
        destructiveAction: false,
        connectorActivation: false,
      },
      nextSafeAction: "Inspect the dry-run error before expanding this execution lane.",
    };
  }

  return {
    schema: "gpao_t.execution_runtime_invocation.v1",
    status: "completed_dry_run_invocation",
    invokedAt: now,
    commandId,
    label: commandSpec.label,
    command: renderCommand(commandSpec),
    approvalCheck,
    progressEvents: [startedProgress, completedProgress],
    output: parsed,
    safetyInvariants: {
      writeMutationExpected: commandSpec.expectedMutation,
      externalSend: false,
      credentialAccess: false,
      destructiveAction: false,
      connectorActivation: false,
    },
    nextSafeAction:
      "Show the dry-run result in Work Surface. Mutating execution still requires a separate approval packet.",
  };
}

export function inspectReadOnlyConnector({
  root = process.cwd(),
  connectorId = "local.filesystem",
  now = new Date().toISOString(),
} = {}) {
  if (connectorId !== "local.filesystem") {
    return {
      schema: "gpao_t.read_only_connector_inspection.v1",
      status: "blocked",
      inspectedAt: now,
      connectorId,
      reason: "Only local.filesystem read-only inspection is open in this pass.",
      safetyInvariants: {
        writesFiles: false,
        readsCredentials: false,
        sendsExternalNetworkRequest: false,
        activatesOAuth: false,
      },
    };
  }

  const packagePath = join(root, "package.json");
  const packageJson = existsSync(packagePath)
    ? JSON.parse(readFileSync(packagePath, "utf8"))
    : {};

  return {
    schema: "gpao_t.read_only_connector_inspection.v1",
    status: "ready",
    inspectedAt: now,
    connectorId,
    source: "local.filesystem",
    evidence: {
      packageExists: existsSync(packagePath),
      packageName: packageJson.name || null,
      packageVersion: packageJson.version || null,
      scripts: Object.keys(packageJson.scripts || {}),
    },
    safetyInvariants: {
      writesFiles: false,
      readsCredentials: false,
      sendsExternalNetworkRequest: false,
      activatesOAuth: false,
    },
    nextSafeAction: "Use this as read-only connector evidence before opening broader connector lanes.",
  };
}

export function verifyExecutionRuntimeInvocation({
  root = process.cwd(),
} = {}) {
  const approval = {
    confirmed: true,
    commandId: "model-invocation-check",
    authorityTier: "dry_run",
    allowMutation: false,
  };
  const invocation = invokeExecutionRuntimeDryRun({ root, approval });
  const inspection = inspectReadOnlyConnector({ root });
  const findings = [];

  if (invocation.status !== "completed_dry_run_invocation") findings.push("dry_run_invocation_not_completed");
  if (inspection.status !== "ready") findings.push("read_only_connector_not_ready");
  if (invocation.safetyInvariants?.writeMutationExpected !== false) findings.push("dry_run_write_expected");
  if (inspection.safetyInvariants?.writesFiles !== false) findings.push("connector_write_open");
  if (inspection.safetyInvariants?.sendsExternalNetworkRequest !== false) findings.push("connector_network_open");

  return {
    schema: "gpao_t.execution_runtime_invocation_verification.v1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedCommand: invocation.commandId,
    checkedConnector: inspection.connectorId,
    nextSafeAction: findings.length
      ? "Repair runtime invocation before expanding execution lanes."
      : "Keep write/external/destructive lanes behind approval while expanding safe read-only and dry-run coverage.",
  };
}

export function verifyExecutionRuntimeApproval({
  commandId = "model-invocation-check",
  approval = {},
} = {}) {
  const findings = [];

  if (!SAFE_DRY_RUN_COMMANDS[commandId]) findings.push("unknown_command");
  if (approval.confirmed !== true) findings.push("confirmation_missing");
  if (approval.commandId !== commandId) findings.push("command_scope_mismatch");
  if (approval.authorityTier !== "dry_run") findings.push("authority_tier_not_dry_run");
  if (approval.allowMutation !== false) findings.push("mutation_not_blocked");

  return {
    schema: "gpao_t.execution_runtime_approval_check.v1",
    status: findings.length ? "blocked" : "ready",
    findings,
    commandId,
    requiredFields: ["confirmed", "commandId", "authorityTier", "allowMutation"],
    nextSafeAction: findings.length
      ? "Confirm the exact dry-run command and keep mutation disabled."
      : "Invoke the whitelisted dry-run command.",
  };
}

function buildReadOnlyEvidence({ root }) {
  const packagePath = join(root || process.cwd(), "package.json");
  const hasPackage = existsSync(packagePath);
  let packageName = "unknown";
  let packageVersion = "unknown";

  if (hasPackage) {
    const parsed = JSON.parse(readFileSync(packagePath, "utf8"));
    packageName = parsed.name || packageName;
    packageVersion = parsed.version || packageVersion;
  }

  return {
    schema: "gpao_t.execution_read_only_evidence.v1",
    status: "ready",
    source: "local_package_metadata",
    packagePath: "package.json",
    exists: hasPackage,
    packageName,
    packageVersion,
    writesNow: false,
    invokesExternalNow: false,
  };
}

function buildDryRunPreview({ request, requestedSurface, requestedTier }) {
  return {
    schema: "gpao_t.execution_dry_run_preview.v1",
    status: "ready",
    request,
    requestedSurface,
    requestedTier,
    commandPreview: requestedSurface === "cli"
      ? "gpao-t adapters model-invocation-check"
      : "read-only inspection candidate",
    expectedEffect: "현재 작업 표면과 권한 경계를 검증하는 미리보기 계획을 보여줍니다.",
    invokesNow: false,
    writesNow: false,
    rollbackReference: "No mutation occurs during preview; discard preview to roll back.",
  };
}

function renderCommand(commandSpec) {
  return [commandSpec.command, ...commandSpec.args].join(" ");
}

function appendExecutionProgress({
  root,
  now,
  runId,
  sessionKey,
  commandId,
  commandSpec,
  status,
  summary,
}) {
  return appendToolProgressEvent({
    root,
    now,
    runId,
    sessionKey,
    toolName: commandSpec?.label || commandId,
    status,
    summary,
    command: commandSpec ? renderCommand(commandSpec) : null,
  });
}

function parseJsonOrText(stdout) {
  const text = String(stdout || "").trim();
  if (!text) return { type: "empty", text: "" };
  try {
    return {
      type: "json",
      body: JSON.parse(text),
    };
  } catch {
    return {
      type: "text",
      text,
    };
  }
}
