import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildTauriInstallReadinessGate,
  verifyTauriInstallReadinessGate,
} from "./tauri-install-readiness-gate.js";

const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));

const PREREQUISITE_SOURCE_FILES = [
  "package.json",
  "src/core/tauri-install-readiness-gate.js",
  "src/core/tauri-readonly-shell.js",
  "src-tauri/Cargo.toml",
  "src-tauri/tauri.conf.json",
  "src-tauri/src/main.rs",
  "src-tauri/capabilities/default.json",
  "tauri-shell/index.html",
  "docs/03-engineering/TAURI-INSTALL-UPDATE-ROLLBACK-READINESS-GATE.md",
];

const DRY_RUN_ARTIFACT_REQUIREMENTS = [
  "operation plan without mutation",
  "source-control checkpoint reference",
  "planned file write set",
  "planned command list",
  "planned verification commands",
  "planned rollback trigger conditions",
  "audit event preview",
  "user-visible recovery message",
];

export function buildTauriInstallPrerequisiteDoctor({
  root = PROJECT_ROOT,
  readinessGate = buildTauriInstallReadinessGate({ root }),
  readinessVerification = verifyTauriInstallReadinessGate({ root, gate: readinessGate }),
} = {}) {
  const packageJson = readPackageJson({ root });
  const fileChecks = PREREQUISITE_SOURCE_FILES.map((path) => ({
    path,
    required: true,
    status: existsSync(resolve(root, path)) ? "present" : "missing",
  }));
  const missingFiles = fileChecks.filter((file) => file.status !== "present").map((file) => file.path);
  const scripts = packageJson?.scripts || {};
  const findings = [
    ...missingFiles.map((path) => `missing_source:${path}`),
  ];

  if (readinessVerification.status !== "ready") findings.push("readiness_gate_not_ready");
  if (scripts.verify !== "npm run check && npm test") findings.push("verify_script_unexpected");
  if (!scripts.check) findings.push("check_script_missing");
  if (!scripts.test) findings.push("test_script_missing");
  if (readinessGate.rollbackGate?.currentCommit == null) findings.push("source_checkpoint_missing");

  return {
    schema: "gpao_t.tauri_install_prerequisite_doctor.v0_1",
    status: findings.length ? "blocked" : "ready",
    doctorKind: "packaged_desktop_install_update_rollback_prerequisite_doctor",
    executionMode: "inspection_only_no_install_no_build",
    findings,
    readinessGate: {
      status: readinessGate.status,
      verificationStatus: readinessVerification.status,
      prerequisiteStatus: readinessGate.prerequisiteStatus,
    },
    fileChecks,
    toolchainPolicy: {
      cargoVersionExecuted: false,
      tauriCliExecuted: false,
      dependencyInstallExecuted: false,
      buildExecuted: false,
      allowedNow: false,
      futureCheck: "After explicit approval, inspect local Tauri/Cargo prerequisites before any build or installer action.",
    },
    packageScriptChecks: {
      check: Boolean(scripts.check),
      test: Boolean(scripts.test),
      verify: Boolean(scripts.verify),
      start: Boolean(scripts.start),
      tauriBuildScript: Boolean(scripts["tauri:build"]),
      tauriDevScript: Boolean(scripts["tauri:dev"]),
    },
    rollbackCheckpoint: {
      mode: readinessGate.prerequisiteStatus.sourceControl,
      currentCommit: readinessGate.rollbackGate?.currentCommit || null,
      requiredBeforeDryRun: true,
    },
    authorityBoundary: blockedAuthorityBoundary(),
    passCriteria: [
      "readiness gate verification is ready",
      "required source, docs, shell, and Tauri config files are present",
      "verify/check/test scripts exist",
      "local source-control checkpoint exists",
      "toolchain/build/install checks remain inspection-only until explicit approval",
    ],
    nextSafeAction: findings.length
      ? "Fix prerequisite doctor findings before dry-run executor contract design."
      : "Design and verify the dry-run executor contract; keep dry-run execution, real install/update/rollback, Tauri build, IPC, external download, connectors, models, tools, deployment, messenger, and automation blocked.",
  };
}

export function verifyTauriInstallPrerequisiteDoctor({
  root = PROJECT_ROOT,
  doctor = buildTauriInstallPrerequisiteDoctor({ root }),
} = {}) {
  const findings = [];

  if (doctor.schema !== "gpao_t.tauri_install_prerequisite_doctor.v0_1") findings.push("invalid_schema");
  if (doctor.executionMode !== "inspection_only_no_install_no_build") findings.push("execution_mode_not_inspection_only");
  if (doctor.readinessGate.verificationStatus !== "ready") findings.push("readiness_gate_not_ready");
  if (doctor.fileChecks.some((file) => file.status !== "present")) findings.push("source_file_missing");
  if (doctor.toolchainPolicy.cargoVersionExecuted !== false) findings.push("cargo_check_executed");
  if (doctor.toolchainPolicy.tauriCliExecuted !== false) findings.push("tauri_cli_executed");
  if (doctor.toolchainPolicy.dependencyInstallExecuted !== false) findings.push("dependency_install_executed");
  if (doctor.toolchainPolicy.buildExecuted !== false) findings.push("build_executed");
  if (doctor.toolchainPolicy.allowedNow !== false) findings.push("toolchain_allowed_now");
  if (doctor.authorityBoundary.installExecution !== "blocked") findings.push("install_execution_not_blocked");
  if (doctor.authorityBoundary.updateExecution !== "blocked") findings.push("update_execution_not_blocked");
  if (doctor.authorityBoundary.rollbackExecution !== "blocked") findings.push("rollback_execution_not_blocked");
  if (!doctor.rollbackCheckpoint.currentCommit) findings.push("rollback_checkpoint_missing");

  return {
    schema: "gpao_t.tauri_install_prerequisite_doctor_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    authorityBoundary: doctor.authorityBoundary,
    nextSafeAction: findings.length
      ? "Fix prerequisite doctor findings before dry-run executor contract design."
      : "Proceed only to dry-run executor contract verification; do not execute dry-run, install, update, rollback, Tauri build, IPC, external download, deployment, messenger, or automation.",
  };
}

export function buildTauriInstallDryRunExecutorContract({
  root = PROJECT_ROOT,
  prerequisiteDoctor = buildTauriInstallPrerequisiteDoctor({ root }),
  prerequisiteVerification = verifyTauriInstallPrerequisiteDoctor({ root, doctor: prerequisiteDoctor }),
} = {}) {
  const findings = [];
  if (prerequisiteVerification.status !== "ready") findings.push("prerequisite_doctor_not_ready");

  return {
    schema: "gpao_t.tauri_install_dry_run_executor_contract.v0_1",
    status: findings.length ? "blocked" : "ready",
    contractKind: "packaged_desktop_install_update_rollback_dry_run_executor",
    executionMode: "contract_only_no_dry_run_execution",
    findings,
    prerequisiteDoctor: {
      status: prerequisiteDoctor.status,
      verificationStatus: prerequisiteVerification.status,
    },
    dryRunGate: {
      allowedNow: false,
      executorImplemented: false,
      executorInvoked: false,
      writesFiles: false,
      runsInstall: false,
      runsUpdate: false,
      runsRollback: false,
      runsTauriBuild: false,
      runsDependencyInstall: false,
      runsExternalDownload: false,
      opensIpc: false,
      requiresFutureApproval: true,
    },
    operationPlans: [
      buildOperationPlan({ operation: "install" }),
      buildOperationPlan({ operation: "update" }),
      buildOperationPlan({ operation: "rollback" }),
    ],
    requiredDryRunArtifacts: DRY_RUN_ARTIFACT_REQUIREMENTS.map((name) => ({
      name,
      status: "required_before_executor_invocation",
    })),
    auditPreview: {
      eventType: "tauri_install_dry_run_preview",
      writesAuditNow: false,
      requiredFields: [
        "operation",
        "sourceCommit",
        "plannedCommands",
        "plannedWrites",
        "blockedActions",
        "verificationCommands",
        "rollbackPlan",
      ],
    },
    failureRecoveryStates: [
      {
        id: "dry_run_invoked_too_early",
        recovery: "Return this contract and require explicit approval plus prerequisite doctor readiness before dry-run execution exists.",
      },
      {
        id: "planned_write_outside_allowed_root",
        recovery: "Block executor invocation and require a revised file write set.",
      },
      {
        id: "verification_command_missing",
        recovery: "Block executor invocation until post-operation verification commands are defined.",
      },
      {
        id: "rollback_plan_missing",
        recovery: "Block executor invocation until rollback trigger conditions and recovery messages are defined.",
      },
    ],
    authorityBoundary: blockedAuthorityBoundary(),
    nextSafeAction: findings.length
      ? "Fix prerequisite doctor findings before dry-run executor contract verification."
      : "Add dry-run executor implementation only after explicit future approval; keep this slice contract-only and no-execution.",
  };
}

export function verifyTauriInstallDryRunExecutorContract({
  root = PROJECT_ROOT,
  contract = buildTauriInstallDryRunExecutorContract({ root }),
} = {}) {
  const findings = [];

  if (contract.schema !== "gpao_t.tauri_install_dry_run_executor_contract.v0_1") findings.push("invalid_schema");
  if (contract.executionMode !== "contract_only_no_dry_run_execution") findings.push("execution_mode_not_contract_only");
  if (contract.prerequisiteDoctor.verificationStatus !== "ready") findings.push("prerequisite_doctor_not_ready");
  if (contract.dryRunGate.allowedNow !== false) findings.push("dry_run_allowed_now");
  if (contract.dryRunGate.executorImplemented !== false) findings.push("executor_implemented");
  if (contract.dryRunGate.executorInvoked !== false) findings.push("executor_invoked");
  if (contract.dryRunGate.writesFiles !== false) findings.push("dry_run_writes_files");
  if (contract.dryRunGate.runsInstall !== false) findings.push("dry_run_runs_install");
  if (contract.dryRunGate.runsUpdate !== false) findings.push("dry_run_runs_update");
  if (contract.dryRunGate.runsRollback !== false) findings.push("dry_run_runs_rollback");
  if (contract.dryRunGate.runsTauriBuild !== false) findings.push("dry_run_runs_tauri_build");
  if (contract.dryRunGate.runsDependencyInstall !== false) findings.push("dry_run_runs_dependency_install");
  if (contract.dryRunGate.runsExternalDownload !== false) findings.push("dry_run_runs_external_download");
  if (contract.dryRunGate.opensIpc !== false) findings.push("dry_run_opens_ipc");
  if (contract.operationPlans.length !== 3) findings.push("operation_plan_count_invalid");
  if (!contract.operationPlans.every((plan) => plan.mutationAllowed === false)) findings.push("operation_plan_allows_mutation");
  if (!contract.requiredDryRunArtifacts.every((artifact) => artifact.status === "required_before_executor_invocation")) {
    findings.push("artifact_requirement_not_blocked");
  }
  if (!contract.failureRecoveryStates.some((state) => state.id === "dry_run_invoked_too_early")) {
    findings.push("dry_run_too_early_recovery_missing");
  }
  if (contract.authorityBoundary.installExecution !== "blocked") findings.push("install_execution_not_blocked");
  if (contract.authorityBoundary.updateExecution !== "blocked") findings.push("update_execution_not_blocked");
  if (contract.authorityBoundary.rollbackExecution !== "blocked") findings.push("rollback_execution_not_blocked");

  return {
    schema: "gpao_t.tauri_install_dry_run_executor_contract_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    dryRunGate: contract.dryRunGate,
    authorityBoundary: contract.authorityBoundary,
    nextSafeAction: findings.length
      ? "Fix dry-run executor contract findings before any dry-run implementation."
      : "Next gate may design an approval-gated dry-run executor implementation; real install/update/rollback, Tauri build, IPC, external download, deployment, messenger, and automation remain blocked.",
  };
}

export function buildTauriInstallDryRunImplementationDesign({
  root = PROJECT_ROOT,
  dryRunContract = buildTauriInstallDryRunExecutorContract({ root }),
  dryRunVerification = verifyTauriInstallDryRunExecutorContract({ root, contract: dryRunContract }),
} = {}) {
  const findings = [];
  if (dryRunVerification.status !== "ready") findings.push("dry_run_contract_not_ready");

  return {
    schema: "gpao_t.tauri_install_dry_run_implementation_design.v0_1",
    status: findings.length ? "blocked" : "ready",
    designKind: "approval_gated_dry_run_executor_implementation_design",
    implementationStatus: "design_only",
    executionMode: "no_executor_no_invocation_no_mutation",
    findings,
    dryRunContract: {
      status: dryRunContract.status,
      verificationStatus: dryRunVerification.status,
    },
    executorBoundary: {
      executorImplemented: false,
      executorInvoked: false,
      implementationAllowedNow: false,
      invocationAllowedNow: false,
      requiresExplicitFutureApproval: true,
      writesFiles: false,
      runsCommands: false,
      readsExternalNetwork: false,
      opensIpc: false,
    },
    proposedInterfaces: [
      {
        name: "buildDryRunPlan",
        type: "pure_function",
        purpose: "Create an install/update/rollback dry-run plan from current source, package, visual, and rollback evidence.",
        mutatesState: false,
      },
      {
        name: "verifyDryRunPlan",
        type: "pure_function",
        purpose: "Reject plans that include mutation, external download, build, install/update/rollback execution, IPC, or missing rollback/verification evidence.",
        mutatesState: false,
      },
      {
        name: "renderDryRunPreview",
        type: "pure_function",
        purpose: "Show the user planned commands, planned writes, blocked actions, rollback plan, and next safe action before any future executor invocation.",
        mutatesState: false,
      },
    ],
    planStateSchema: {
      requiredFields: [
        "operation",
        "sourceCommit",
        "plannedCommands",
        "plannedWrites",
        "blockedActions",
        "verificationCommands",
        "rollbackPlan",
        "approvalState",
        "userVisibleRecovery",
      ],
      approvalStateValues: [
        "not_requested",
        "requested",
        "approved_for_future_dry_run_only",
        "rejected",
      ],
    },
    operationDesigns: [
      buildDryRunImplementationOperation({ operation: "install" }),
      buildDryRunImplementationOperation({ operation: "update" }),
      buildDryRunImplementationOperation({ operation: "rollback" }),
    ],
    approvalGate: {
      status: "required_before_implementation",
      approvalRequiredFor: [
        "creating a real dry-run executor",
        "invoking a dry-run executor",
        "writing audit records from a dry-run",
        "reading toolchain state through Cargo or Tauri CLI",
      ],
      approvalDoesNotAllow: [
        "real install execution",
        "real update execution",
        "real rollback execution",
        "Tauri build",
        "dependency installation",
        "external download",
        "IPC activation",
      ],
    },
    rejectionRules: [
      "reject_if_operation_is_not_install_update_or_rollback",
      "reject_if_planned_command_mutates_without_future_approval",
      "reject_if_planned_write_is_outside_allowed_root",
      "reject_if_verification_commands_missing",
      "reject_if_rollback_plan_missing",
      "reject_if_external_download_present",
      "reject_if_tauri_build_present",
      "reject_if_ipc_activation_present",
    ],
    authorityBoundary: blockedAuthorityBoundary(),
    nextSafeAction: findings.length
      ? "Fix dry-run contract findings before implementation design can be trusted."
      : "Next step may implement pure dry-run plan/verify/preview functions after explicit approval; do not invoke dry-run or run install/update/rollback, Tauri build, IPC, external download, deployment, messenger, or automation.",
  };
}

export function verifyTauriInstallDryRunImplementationDesign({
  root = PROJECT_ROOT,
  design = buildTauriInstallDryRunImplementationDesign({ root }),
} = {}) {
  const findings = [];

  if (design.schema !== "gpao_t.tauri_install_dry_run_implementation_design.v0_1") findings.push("invalid_schema");
  if (design.implementationStatus !== "design_only") findings.push("implementation_status_not_design_only");
  if (design.executionMode !== "no_executor_no_invocation_no_mutation") findings.push("execution_mode_not_noop");
  if (design.dryRunContract.verificationStatus !== "ready") findings.push("dry_run_contract_not_ready");
  if (design.executorBoundary.executorImplemented !== false) findings.push("executor_implemented");
  if (design.executorBoundary.executorInvoked !== false) findings.push("executor_invoked");
  if (design.executorBoundary.implementationAllowedNow !== false) findings.push("implementation_allowed_now");
  if (design.executorBoundary.invocationAllowedNow !== false) findings.push("invocation_allowed_now");
  if (design.executorBoundary.writesFiles !== false) findings.push("design_writes_files");
  if (design.executorBoundary.runsCommands !== false) findings.push("design_runs_commands");
  if (design.executorBoundary.readsExternalNetwork !== false) findings.push("design_reads_external_network");
  if (design.executorBoundary.opensIpc !== false) findings.push("design_opens_ipc");
  if (design.proposedInterfaces.length !== 3) findings.push("proposed_interface_count_invalid");
  if (!design.proposedInterfaces.every((item) => item.mutatesState === false)) findings.push("proposed_interface_mutates_state");
  if (design.operationDesigns.length !== 3) findings.push("operation_design_count_invalid");
  if (!design.operationDesigns.every((item) => item.executionAllowedNow === false)) findings.push("operation_execution_allowed");
  if (!design.rejectionRules.includes("reject_if_external_download_present")) findings.push("external_download_rejection_missing");
  if (!design.rejectionRules.includes("reject_if_tauri_build_present")) findings.push("tauri_build_rejection_missing");
  if (design.authorityBoundary.dryRunExecution !== "blocked_until_future_approval_and_executor_exists") {
    findings.push("dry_run_execution_boundary_invalid");
  }

  return {
    schema: "gpao_t.tauri_install_dry_run_implementation_design_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    executorBoundary: design.executorBoundary,
    authorityBoundary: design.authorityBoundary,
    nextSafeAction: findings.length
      ? "Fix dry-run implementation design findings before any implementation work."
      : "Proceed only to pure dry-run plan/verify/preview function implementation after explicit approval; keep dry-run invocation and real install/update/rollback execution blocked.",
  };
}

function buildOperationPlan({ operation }) {
  return {
    operation,
    mutationAllowed: false,
    executionAllowedNow: false,
    executorImplemented: false,
    plannedCommandsRequired: true,
    plannedWritesRequired: true,
    verificationRequired: true,
    rollbackPlanRequired: true,
    userVisibleRecoveryRequired: true,
  };
}

function buildDryRunImplementationOperation({ operation }) {
  return {
    operation,
    implementationAllowedNow: false,
    executionAllowedNow: false,
    futureFunction: `build${capitalize(operation)}DryRunPlan`,
    requiredInputs: [
      "sourceCommit",
      "packageManifest",
      "readinessGate",
      "prerequisiteDoctor",
      "visualQaEvidence",
    ],
    requiredOutputs: [
      "plannedCommands",
      "plannedWrites",
      "blockedActions",
      "verificationCommands",
      "rollbackPlan",
      "userVisibleRecovery",
    ],
    forbiddenOutputs: [
      "executedCommands",
      "writtenFiles",
      "networkDownloads",
      "ipcCalls",
      "installResult",
      "updateResult",
      "rollbackResult",
    ],
  };
}

function blockedAuthorityBoundary() {
  return {
    dryRunExecution: "blocked_until_future_approval_and_executor_exists",
    installExecution: "blocked",
    updateExecution: "blocked",
    rollbackExecution: "blocked",
    dependencyInstall: "blocked",
    tauriBuild: "blocked",
    localIpc: "blocked",
    externalDownload: "blocked",
    connectorActivation: "blocked",
    modelActivation: "blocked",
    toolActivation: "blocked",
    secretStorage: "blocked",
    deployment: "blocked",
    messenger: "blocked",
    automation: "blocked",
  };
}

function readPackageJson({ root }) {
  const file = resolve(root, "package.json");
  if (!existsSync(file)) {
    return null;
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
