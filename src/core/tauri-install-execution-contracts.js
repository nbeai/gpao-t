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

export function buildTauriInstallDryRunPlan({
  root = PROJECT_ROOT,
  design = buildTauriInstallDryRunImplementationDesign({ root }),
  designVerification = verifyTauriInstallDryRunImplementationDesign({ root, design }),
} = {}) {
  const findings = [];
  if (designVerification.status !== "ready") findings.push("dry_run_implementation_design_not_ready");

  const packageJson = readPackageJson({ root });
  const sourceCommit = design.dryRunContract?.status === "ready"
    ? buildTauriInstallReadinessGate({ root }).rollbackGate?.currentCommit || null
    : null;

  return {
    schema: "gpao_t.tauri_install_dry_run_plan.v0_1",
    status: findings.length ? "blocked" : "ready",
    planKind: "pure_install_update_rollback_dry_run_plan",
    purity: "pure_object_no_write_no_command_no_network_no_ipc",
    executionMode: "plan_only_not_invoked",
    findings,
    sourceCommit,
    package: {
      name: packageJson?.name || null,
      version: packageJson?.version || null,
      scriptsReadOnly: true,
    },
    design: {
      schema: design.schema,
      status: design.status,
      verificationStatus: designVerification.status,
    },
    safetyInvariants: pureDryRunSafetyInvariants(),
    operationPlans: [
      buildPureDryRunOperationPlan({ operation: "install", sourceCommit }),
      buildPureDryRunOperationPlan({ operation: "update", sourceCommit }),
      buildPureDryRunOperationPlan({ operation: "rollback", sourceCommit }),
    ],
    approvalState: {
      requested: false,
      approved: false,
      value: "not_requested",
      appliesTo: "future_dry_run_invocation_only",
    },
    authorityBoundary: blockedAuthorityBoundary(),
    nextSafeAction:
      "Render and verify this preview-only plan for user inspection; do not invoke dry-run, write files, run commands, install/update/rollback, build Tauri, open IPC, call external network, or activate connectors/models/tools.",
  };
}

export function verifyTauriInstallDryRunPlan({
  root = PROJECT_ROOT,
  plan = buildTauriInstallDryRunPlan({ root }),
} = {}) {
  const findings = [];

  if (plan.schema !== "gpao_t.tauri_install_dry_run_plan.v0_1") findings.push("invalid_schema");
  if (plan.purity !== "pure_object_no_write_no_command_no_network_no_ipc") findings.push("purity_boundary_invalid");
  if (plan.executionMode !== "plan_only_not_invoked") findings.push("execution_mode_invalid");
  if (plan.design.verificationStatus !== "ready") findings.push("design_not_ready");
  if (!plan.sourceCommit) findings.push("source_commit_missing");
  if (plan.approvalState.approved !== false) findings.push("approval_state_must_remain_false");
  if (plan.operationPlans.length !== 3) findings.push("operation_plan_count_invalid");
  if (!plan.operationPlans.every((operation) => operation.executionStatus === "planned_not_executed")) {
    findings.push("operation_execution_status_invalid");
  }
  if (!plan.operationPlans.every((operation) => operation.mutationStatus === "planned_not_written")) {
    findings.push("operation_mutation_status_invalid");
  }
  if (!plan.operationPlans.every((operation) => operation.networkStatus === "blocked")) {
    findings.push("operation_network_status_invalid");
  }
  if (!plan.operationPlans.every((operation) => operation.ipcStatus === "blocked")) {
    findings.push("operation_ipc_status_invalid");
  }
  if (!plan.operationPlans.every((operation) => operation.plannedCommands.every((command) => command.executionStatus === "not_executed"))) {
    findings.push("planned_command_executed");
  }
  if (!plan.operationPlans.every((operation) => operation.plannedWrites.every((write) => write.writeStatus === "not_written"))) {
    findings.push("planned_write_written");
  }
  if (!plan.operationPlans.every((operation) => operation.blockedActions.includes("Tauri build"))) {
    findings.push("tauri_build_block_missing");
  }
  if (!plan.operationPlans.every((operation) => operation.rollbackPlan.rollbackExecution === "blocked")) {
    findings.push("rollback_execution_not_blocked");
  }
  if (plan.authorityBoundary.installExecution !== "blocked") findings.push("install_execution_not_blocked");
  if (plan.authorityBoundary.updateExecution !== "blocked") findings.push("update_execution_not_blocked");
  if (plan.authorityBoundary.rollbackExecution !== "blocked") findings.push("rollback_execution_not_blocked");
  if (plan.authorityBoundary.externalDownload !== "blocked") findings.push("external_download_not_blocked");
  if (plan.authorityBoundary.localIpc !== "blocked") findings.push("ipc_not_blocked");

  return {
    schema: "gpao_t.tauri_install_dry_run_plan_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedOperations: plan.operationPlans.map((operation) => operation.operation),
    safetyInvariants: plan.safetyInvariants,
    authorityBoundary: plan.authorityBoundary,
    nextSafeAction: findings.length
      ? "Fix dry-run plan findings before rendering a preview."
      : "Render the preview-only dry-run plan for inspection; do not invoke dry-run or execute install/update/rollback.",
  };
}

export function renderTauriInstallDryRunPreview({
  root = PROJECT_ROOT,
  plan = buildTauriInstallDryRunPlan({ root }),
  verification = verifyTauriInstallDryRunPlan({ root, plan }),
} = {}) {
  const previewCards = plan.operationPlans.map((operation) => ({
    operation: operation.operation,
    status: verification.status,
    headline: `${capitalize(operation.operation)} dry-run plan is preview-only`,
    plannedCommandCount: operation.plannedCommands.length,
    plannedWriteCount: operation.plannedWrites.length,
    blockedActionCount: operation.blockedActions.length,
    rollback: operation.rollbackPlan.summary,
    recovery: operation.userVisibleRecovery.message,
    nextSafeAction: operation.nextSafeAction,
  }));

  return {
    schema: "gpao_t.tauri_install_dry_run_preview.v0_1",
    status: verification.status,
    previewKind: "user_visible_preview_only",
    renderingMode: "json_preview_no_html_no_script_no_execution",
    executionMode: "not_invoked",
    findings: verification.findings,
    sourceCommit: plan.sourceCommit,
    summary: {
      operations: previewCards.length,
      plannedCommands: previewCards.reduce((sum, card) => sum + card.plannedCommandCount, 0),
      plannedWrites: previewCards.reduce((sum, card) => sum + card.plannedWriteCount, 0),
      blockedActions: previewCards.reduce((sum, card) => sum + card.blockedActionCount, 0),
      approvalRequiredBeforeInvocation: true,
    },
    previewCards,
    userDecision: {
      currentDecisionNeeded: false,
      futureDecision: "Approve or reject a future dry-run invocation after reviewing this preview.",
      approvalNowWouldStillNotAllow: [
        "real install execution",
        "real update execution",
        "real rollback execution",
        "Tauri build",
        "dependency install",
        "external network",
        "IPC activation",
        "connector/model/tool activation",
      ],
    },
    safetyInvariants: plan.safetyInvariants,
    authorityBoundary: plan.authorityBoundary,
    nextSafeAction: verification.status === "ready"
      ? "Inspect this preview and then decide whether a future dry-run invocation gate should be designed; real install/update/rollback remains blocked."
      : "Fix dry-run plan verification findings before user preview.",
  };
}

export function verifyTauriInstallDryRunPreview({
  root = PROJECT_ROOT,
  preview = renderTauriInstallDryRunPreview({ root }),
} = {}) {
  const findings = [];

  if (preview.schema !== "gpao_t.tauri_install_dry_run_preview.v0_1") findings.push("invalid_schema");
  if (preview.previewKind !== "user_visible_preview_only") findings.push("preview_kind_invalid");
  if (preview.renderingMode !== "json_preview_no_html_no_script_no_execution") findings.push("rendering_mode_invalid");
  if (preview.executionMode !== "not_invoked") findings.push("execution_mode_invalid");
  if (preview.summary.approvalRequiredBeforeInvocation !== true) findings.push("approval_before_invocation_missing");
  if (preview.previewCards.length !== 3) findings.push("preview_card_count_invalid");
  if (!preview.previewCards.every((card) => /preview-only/.test(card.headline))) findings.push("preview_only_headline_missing");
  if (!preview.userDecision.approvalNowWouldStillNotAllow.includes("real install execution")) {
    findings.push("real_install_block_missing");
  }
  if (preview.authorityBoundary.installExecution !== "blocked") findings.push("install_execution_not_blocked");
  if (preview.authorityBoundary.updateExecution !== "blocked") findings.push("update_execution_not_blocked");
  if (preview.authorityBoundary.rollbackExecution !== "blocked") findings.push("rollback_execution_not_blocked");
  if (preview.authorityBoundary.localIpc !== "blocked") findings.push("ipc_not_blocked");
  if (preview.authorityBoundary.externalDownload !== "blocked") findings.push("external_download_not_blocked");

  return {
    schema: "gpao_t.tauri_install_dry_run_preview_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    summary: preview.summary,
    authorityBoundary: preview.authorityBoundary,
    nextSafeAction: findings.length
      ? "Fix dry-run preview findings before showing it as a trustworthy approval-prep object."
      : "This preview can be inspected as approval-prep evidence; do not invoke dry-run or execute install/update/rollback.",
  };
}

export function buildTauriInstallDryRunInvocationApprovalContract({
  root = PROJECT_ROOT,
  preview = renderTauriInstallDryRunPreview({ root }),
  previewVerification = verifyTauriInstallDryRunPreview({ root, preview }),
} = {}) {
  const findings = [];
  if (previewVerification.status !== "ready") findings.push("dry_run_preview_not_ready");

  return {
    schema: "gpao_t.tauri_install_dry_run_invocation_approval_contract.v0_1",
    status: findings.length ? "blocked" : "ready",
    contractKind: "future_dry_run_invocation_approval_contract",
    contractMode: "approval_contract_only_no_invocation",
    invocationStatus: "not_invoked",
    findings,
    preview: {
      schema: preview.schema,
      status: preview.status,
      verificationStatus: previewVerification.status,
      sourceCommit: preview.sourceCommit,
    },
    approvalScope: {
      approvalRequiredBeforeInvocation: true,
      approvalCanOnlyAllow: [
        "future dry-run executor invocation",
        "future local dry-run audit preview write",
        "future local dry-run preview artifact write",
      ],
      approvalCannotAllow: [
        "real install execution",
        "real update execution",
        "real rollback execution",
        "Tauri build",
        "dependency install",
        "external network",
        "IPC activation",
        "connector/model/tool activation",
        "deployment",
        "messenger",
        "automation",
      ],
      approvalStateValues: [
        "not_requested",
        "requested",
        "approved_for_dry_run_invocation_only",
        "rejected",
        "expired",
      ],
    },
    requiredApprovalPacket: {
      requiredFields: [
        "requestId",
        "requestedOperation",
        "sourceCommit",
        "previewSchema",
        "previewVerificationStatus",
        "allowedWriteRoots",
        "allowedCommands",
        "blockedActions",
        "rollbackPlan",
        "auditPreview",
        "approvalState",
        "expiresAt",
      ],
      allowedOperations: ["install", "update", "rollback"],
      allowedWriteRoots: [
        ".gpao-t/tauri-dry-run/",
        ".gpao-t/audit/",
      ],
      allowedCommandKinds: [
        "read_only_source_status_check",
        "project_verification_check",
      ],
      approvalState: "not_requested",
    },
    invocationPreconditions: [
      {
        id: "source_commit_matches_preview",
        status: "required_before_future_invocation",
      },
      {
        id: "preview_verification_ready",
        status: previewVerification.status === "ready" ? "satisfied_for_contract" : "blocked",
      },
      {
        id: "explicit_user_approval_recorded",
        status: "missing_by_design",
      },
      {
        id: "executor_exists_and_is_no_real_operation",
        status: "missing_by_design",
      },
      {
        id: "audit_and_rollback_preview_present",
        status: "required_before_future_invocation",
      },
    ],
    rejectionRules: [
      "reject_if_user_approval_missing",
      "reject_if_approval_expired",
      "reject_if_source_commit_changed",
      "reject_if_operation_not_install_update_or_rollback",
      "reject_if_command_not_read_only_or_verification",
      "reject_if_write_root_outside_gpao_t_runtime_state",
      "reject_if_real_install_update_or_rollback_present",
      "reject_if_tauri_build_present",
      "reject_if_dependency_install_present",
      "reject_if_external_network_present",
      "reject_if_ipc_activation_present",
      "reject_if_connector_model_tool_activation_present",
      "reject_if_rollback_plan_missing",
      "reject_if_audit_preview_missing",
    ],
    auditContract: {
      writesAuditNow: false,
      futureAuditEventType: "tauri_dry_run_invocation_approval",
      requiredAuditFields: [
        "requestId",
        "operation",
        "approvalState",
        "sourceCommit",
        "plannedCommands",
        "plannedWrites",
        "blockedActions",
        "rollbackPlan",
      ],
    },
    failureRecoveryStates: [
      {
        id: "approval_missing",
        recovery: "Return this approval contract and keep dry-run invocation blocked.",
      },
      {
        id: "source_commit_changed",
        recovery: "Rebuild the pure dry-run plan and preview against the current source checkpoint.",
      },
      {
        id: "approval_scope_exceeded",
        recovery: "Reject invocation and remove any action outside dry-run-only approval scope.",
      },
      {
        id: "executor_attempts_real_operation",
        recovery: "Reject invocation because real install/update/rollback remains a separate future gate.",
      },
    ],
    safetyInvariants: {
      ...pureDryRunSafetyInvariants(),
      invokesDryRunExecutor: false,
      approvalContractWritesAuditNow: false,
      approvalContractWritesPreviewNow: false,
    },
    authorityBoundary: blockedAuthorityBoundary(),
    nextSafeAction: findings.length
      ? "Fix dry-run preview findings before trusting the invocation approval contract."
      : "Use this contract to design a future approval-record flow; do not invoke dry-run, write files, run commands, install/update/rollback, build Tauri, open IPC, call external network, or activate connectors/models/tools.",
  };
}

export function verifyTauriInstallDryRunInvocationApprovalContract({
  root = PROJECT_ROOT,
  contract = buildTauriInstallDryRunInvocationApprovalContract({ root }),
} = {}) {
  const findings = [];

  if (contract.schema !== "gpao_t.tauri_install_dry_run_invocation_approval_contract.v0_1") findings.push("invalid_schema");
  if (contract.contractMode !== "approval_contract_only_no_invocation") findings.push("contract_mode_invalid");
  if (contract.invocationStatus !== "not_invoked") findings.push("invocation_status_invalid");
  if (contract.preview.verificationStatus !== "ready") findings.push("preview_verification_not_ready");
  if (contract.approvalScope.approvalRequiredBeforeInvocation !== true) findings.push("approval_required_missing");
  if (!contract.approvalScope.approvalCanOnlyAllow.includes("future dry-run executor invocation")) {
    findings.push("dry_run_only_scope_missing");
  }
  if (!contract.approvalScope.approvalCannotAllow.includes("real install execution")) {
    findings.push("real_install_block_missing");
  }
  if (contract.requiredApprovalPacket.approvalState !== "not_requested") findings.push("approval_state_not_initial");
  if (!contract.requiredApprovalPacket.allowedWriteRoots.every((rootPath) => rootPath.startsWith(".gpao-t/"))) {
    findings.push("write_root_outside_runtime_state");
  }
  if (!contract.invocationPreconditions.some((item) => item.id === "explicit_user_approval_recorded" && item.status === "missing_by_design")) {
    findings.push("approval_missing_precondition_invalid");
  }
  if (!contract.invocationPreconditions.some((item) => item.id === "executor_exists_and_is_no_real_operation" && item.status === "missing_by_design")) {
    findings.push("executor_missing_precondition_invalid");
  }
  if (!contract.rejectionRules.includes("reject_if_real_install_update_or_rollback_present")) {
    findings.push("real_operation_rejection_missing");
  }
  if (!contract.rejectionRules.includes("reject_if_external_network_present")) findings.push("external_network_rejection_missing");
  if (!contract.rejectionRules.includes("reject_if_ipc_activation_present")) findings.push("ipc_rejection_missing");
  if (contract.auditContract.writesAuditNow !== false) findings.push("audit_write_enabled");
  if (contract.safetyInvariants.invokesDryRunExecutor !== false) findings.push("dry_run_invocation_enabled");
  if (contract.authorityBoundary.dryRunExecution !== "blocked_until_future_approval_and_executor_exists") {
    findings.push("dry_run_execution_boundary_invalid");
  }
  if (contract.authorityBoundary.installExecution !== "blocked") findings.push("install_execution_not_blocked");
  if (contract.authorityBoundary.updateExecution !== "blocked") findings.push("update_execution_not_blocked");
  if (contract.authorityBoundary.rollbackExecution !== "blocked") findings.push("rollback_execution_not_blocked");

  return {
    schema: "gpao_t.tauri_install_dry_run_invocation_approval_contract_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    approvalScope: contract.approvalScope,
    authorityBoundary: contract.authorityBoundary,
    nextSafeAction: findings.length
      ? "Fix invocation approval contract findings before any future approval-record design."
      : "Next gate may design approval-record storage for future dry-run invocation; do not invoke dry-run or execute install/update/rollback.",
  };
}

export function buildTauriInstallDryRunApprovalRecordStorageDesign({
  root = PROJECT_ROOT,
  approvalContract = buildTauriInstallDryRunInvocationApprovalContract({ root }),
  approvalContractVerification = verifyTauriInstallDryRunInvocationApprovalContract({ root, contract: approvalContract }),
} = {}) {
  const findings = [];
  if (approvalContractVerification.status !== "ready") findings.push("invocation_approval_contract_not_ready");

  return {
    schema: "gpao_t.tauri_install_dry_run_approval_record_storage_design.v0_1",
    status: findings.length ? "blocked" : "ready",
    designKind: "future_dry_run_invocation_approval_record_storage",
    designMode: "storage_design_only_no_record_write_no_invocation",
    findings,
    approvalContract: {
      schema: approvalContract.schema,
      status: approvalContract.status,
      verificationStatus: approvalContractVerification.status,
      sourceCommit: approvalContract.preview.sourceCommit,
    },
    storageLocation: {
      runtimeRoot: ".gpao-t/",
      approvalsRoot: ".gpao-t/approvals/",
      primaryRecordFile: ".gpao-t/approvals/tauri-dry-run-invocation-approvals.jsonl",
      indexFile: ".gpao-t/approvals/index.json",
      auditReferenceRoot: ".gpao-t/audit/",
      dryRunPreviewRoot: ".gpao-t/tauri-dry-run/",
      storageMode: "future_local_append_only_jsonl",
      localOnly: true,
      createsDirectoriesNow: false,
      writesApprovalRecordNow: false,
      readsApprovalRecordsNow: false,
    },
    recordSchema: {
      recordSchema: "gpao_t.tauri_dry_run_invocation_approval_record.v0_1",
      requiredFields: [
        "recordId",
        "requestId",
        "requestedOperation",
        "approvalState",
        "approvedScope",
        "sourceCommit",
        "previewRef",
        "planRef",
        "invocationApprovalContractRef",
        "replayRefs",
        "auditRefs",
        "rollbackRef",
        "authorityBoundary",
        "blockedActions",
        "createdAt",
        "expiresAt",
        "decidedAt",
        "decidedBy",
        "integrity",
      ],
      approvalStateValues: [
        "not_requested",
        "requested",
        "approved_for_dry_run_invocation_only",
        "rejected",
        "expired",
        "revoked",
      ],
      approvedScopeRequiredValues: [
        "future dry-run executor invocation",
        "future local dry-run audit preview write",
        "future local dry-run preview artifact write",
      ],
      blockedActionRequiredValues: [
        "real install execution",
        "real update execution",
        "real rollback execution",
        "Tauri build",
        "dependency install",
        "external network",
        "IPC activation",
        "connector/model/tool activation",
      ],
      integrityFields: [
        "schema",
        "recordId",
        "requestId",
        "sourceCommit",
        "previewRef",
        "approvalState",
        "expiresAt",
      ],
    },
    lifecycle: {
      mode: "future_expiring_append_only_record",
      states: [
        "draft_previewed",
        "approval_requested",
        "approved_for_dry_run_invocation_only",
        "rejected",
        "expired",
        "revoked",
        "archived",
      ],
      transitions: [
        {
          from: "draft_previewed",
          to: "approval_requested",
          requires: "user-visible preview and storage design verification",
        },
        {
          from: "approval_requested",
          to: "approved_for_dry_run_invocation_only",
          requires: "explicit user approval record after a future write gate",
        },
        {
          from: "approval_requested",
          to: "rejected",
          requires: "user rejection or verification failure",
        },
        {
          from: "approved_for_dry_run_invocation_only",
          to: "expired",
          requires: "expiresAt reached before future invocation",
        },
        {
          from: "approved_for_dry_run_invocation_only",
          to: "revoked",
          requires: "source commit drift, scope violation, or user revocation",
        },
        {
          from: "rejected",
          to: "archived",
          requires: "audit/replay reference retained without enabling invocation",
        },
      ],
      retention: {
        minimum: "retain until associated replay/audit/rollback references are superseded",
        deletionMode: "future_explicit_user_approved_cleanup_only",
        mutableInPlace: false,
      },
    },
    referenceContract: {
      replayRefs: [
        {
          name: "dryRunPreviewVerification",
          required: true,
          writeNow: false,
        },
        {
          name: "futureInvocationDecisionReplay",
          required: true,
          writeNow: false,
        },
      ],
      auditRefs: [
        {
          eventType: "tauri_dry_run_invocation_approval_requested",
          required: true,
          writeNow: false,
        },
        {
          eventType: "tauri_dry_run_invocation_approval_decided",
          required: true,
          writeNow: false,
        },
      ],
      rollbackRef: {
        mode: "source_commit_anchor",
        sourceCommit: approvalContract.preview.sourceCommit,
        requiredBeforeFutureRecordWrite: true,
        rollbackExecutionNow: "blocked",
      },
    },
    writeGateBoundary: {
      approvalRecordWriteAllowedNow: false,
      dryRunInvocationAllowedNow: false,
      commandExecutionAllowedNow: false,
      fileMutationAllowedNow: false,
      dependencyInstallAllowedNow: false,
      tauriBuildAllowedNow: false,
      ipcAllowedNow: false,
      externalNetworkAllowedNow: false,
      connectorModelToolActivationAllowedNow: false,
      installUpdateRollbackExecutionAllowedNow: false,
      allowedFutureWriteRootsAfterSeparateApproval: [
        ".gpao-t/approvals/",
        ".gpao-t/audit/",
        ".gpao-t/tauri-dry-run/",
      ],
    },
    failureRecoveryStates: [
      {
        id: "approval_record_write_requested_too_early",
        recovery: "Return this storage design and require a separate approval-record write gate before any record append exists.",
      },
      {
        id: "approval_record_missing_replay_ref",
        recovery: "Reject future approval record writes until replay references are included.",
      },
      {
        id: "approval_record_missing_audit_ref",
        recovery: "Reject future approval record writes until audit references are included.",
      },
      {
        id: "approval_record_scope_exceeds_dry_run",
        recovery: "Reject and keep dry-run invocation blocked because the record exceeds dry-run-only scope.",
      },
      {
        id: "source_commit_drift",
        recovery: "Expire or revoke the future approval record and rebuild preview/plan evidence from the new source checkpoint.",
      },
    ],
    safetyInvariants: {
      ...pureDryRunSafetyInvariants(),
      writesApprovalRecord: false,
      invokesDryRunExecutor: false,
      createsApprovalDirectory: false,
      readsApprovalRecordStore: false,
    },
    authorityBoundary: blockedAuthorityBoundary(),
    nextSafeAction: findings.length
      ? "Fix invocation approval contract findings before trusting approval-record storage design."
      : "Next gate may design the approval-record write path, but actual approval record write, dry-run invocation, command execution, file mutation, Tauri build, dependency install, IPC, external network, connector/model/tool activation, and install/update/rollback execution remain blocked.",
  };
}

export function verifyTauriInstallDryRunApprovalRecordStorageDesign({
  root = PROJECT_ROOT,
  design = buildTauriInstallDryRunApprovalRecordStorageDesign({ root }),
} = {}) {
  const findings = [];

  if (design.schema !== "gpao_t.tauri_install_dry_run_approval_record_storage_design.v0_1") findings.push("invalid_schema");
  if (design.designMode !== "storage_design_only_no_record_write_no_invocation") findings.push("design_mode_invalid");
  if (design.approvalContract.verificationStatus !== "ready") findings.push("invocation_approval_contract_not_ready");
  if (design.storageLocation.runtimeRoot !== ".gpao-t/") findings.push("runtime_root_invalid");
  if (!design.storageLocation.primaryRecordFile.startsWith(".gpao-t/approvals/")) findings.push("primary_record_file_outside_approvals");
  if (design.storageLocation.writesApprovalRecordNow !== false) findings.push("approval_record_write_enabled");
  if (design.storageLocation.createsDirectoriesNow !== false) findings.push("directory_creation_enabled");
  if (design.storageLocation.readsApprovalRecordsNow !== false) findings.push("approval_record_read_enabled");
  if (!design.recordSchema.requiredFields.includes("replayRefs")) findings.push("replay_refs_missing");
  if (!design.recordSchema.requiredFields.includes("auditRefs")) findings.push("audit_refs_missing");
  if (!design.recordSchema.requiredFields.includes("rollbackRef")) findings.push("rollback_ref_missing");
  if (!design.recordSchema.approvalStateValues.includes("revoked")) findings.push("revoked_state_missing");
  if (!design.recordSchema.blockedActionRequiredValues.includes("real install execution")) findings.push("real_install_block_missing");
  if (!design.lifecycle.states.includes("approved_for_dry_run_invocation_only")) findings.push("dry_run_only_lifecycle_state_missing");
  if (design.lifecycle.retention.mutableInPlace !== false) findings.push("lifecycle_allows_in_place_mutation");
  if (!design.referenceContract.replayRefs.every((ref) => ref.writeNow === false)) findings.push("replay_ref_write_enabled");
  if (!design.referenceContract.auditRefs.every((ref) => ref.writeNow === false)) findings.push("audit_ref_write_enabled");
  if (design.referenceContract.rollbackRef.rollbackExecutionNow !== "blocked") findings.push("rollback_execution_enabled");
  if (design.writeGateBoundary.approvalRecordWriteAllowedNow !== false) findings.push("approval_record_write_allowed_now");
  if (design.writeGateBoundary.dryRunInvocationAllowedNow !== false) findings.push("dry_run_invocation_allowed_now");
  if (design.writeGateBoundary.commandExecutionAllowedNow !== false) findings.push("command_execution_allowed_now");
  if (design.writeGateBoundary.fileMutationAllowedNow !== false) findings.push("file_mutation_allowed_now");
  if (design.writeGateBoundary.tauriBuildAllowedNow !== false) findings.push("tauri_build_allowed_now");
  if (design.writeGateBoundary.externalNetworkAllowedNow !== false) findings.push("external_network_allowed_now");
  if (design.writeGateBoundary.connectorModelToolActivationAllowedNow !== false) findings.push("connector_model_tool_activation_allowed_now");
  if (!design.failureRecoveryStates.some((state) => state.id === "approval_record_write_requested_too_early")) {
    findings.push("approval_record_write_too_early_recovery_missing");
  }
  if (design.safetyInvariants.writesApprovalRecord !== false) findings.push("safety_invariant_writes_approval_record");
  if (design.safetyInvariants.invokesDryRunExecutor !== false) findings.push("safety_invariant_invokes_dry_run");
  if (design.authorityBoundary.installExecution !== "blocked") findings.push("install_execution_not_blocked");
  if (design.authorityBoundary.updateExecution !== "blocked") findings.push("update_execution_not_blocked");
  if (design.authorityBoundary.rollbackExecution !== "blocked") findings.push("rollback_execution_not_blocked");

  return {
    schema: "gpao_t.tauri_install_dry_run_approval_record_storage_design_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    storageLocation: design.storageLocation,
    writeGateBoundary: design.writeGateBoundary,
    authorityBoundary: design.authorityBoundary,
    nextSafeAction: findings.length
      ? "Fix approval-record storage design findings before a future write gate design."
      : "Proceed only to approval-record write gate design; do not write approval records, invoke dry-run, run commands, mutate files, build Tauri, install dependencies, open IPC, call external network, activate connectors/models/tools, or execute install/update/rollback.",
  };
}

export function buildTauriInstallDryRunApprovalRecordWriteGateDesign({
  root = PROJECT_ROOT,
  storageDesign = buildTauriInstallDryRunApprovalRecordStorageDesign({ root }),
  storageVerification = verifyTauriInstallDryRunApprovalRecordStorageDesign({ root, design: storageDesign }),
} = {}) {
  const findings = [];
  if (storageVerification.status !== "ready") findings.push("approval_record_storage_design_not_ready");

  return {
    schema: "gpao_t.tauri_install_dry_run_approval_record_write_gate_design.v0_1",
    status: findings.length ? "blocked" : "ready",
    designKind: "future_approval_record_write_gate",
    designMode: "write_gate_design_only_no_record_write_no_invocation",
    findings,
    storageDesign: {
      schema: storageDesign.schema,
      status: storageDesign.status,
      verificationStatus: storageVerification.status,
      primaryRecordFile: storageDesign.storageLocation.primaryRecordFile,
    },
    allowedApprovalPacket: {
      packetSchema: "gpao_t.tauri_dry_run_invocation_approval_packet.v0_1",
      allowedOperations: ["install", "update", "rollback"],
      allowedApprovalStates: [
        "approved_for_dry_run_invocation_only",
        "rejected",
      ],
      requiredFields: [
        "requestId",
        "recordId",
        "requestedOperation",
        "approvalState",
        "approvedScope",
        "sourceCommit",
        "previewRef",
        "previewVerificationStatus",
        "planRef",
        "planVerificationStatus",
        "storageDesignRef",
        "writeGateRef",
        "replayRefs",
        "auditRefs",
        "rollbackRef",
        "authorityBoundary",
        "blockedActions",
        "createdAt",
        "expiresAt",
        "decidedAt",
        "decidedBy",
        "integrity",
      ],
      requiredApprovedScope: storageDesign.recordSchema.approvedScopeRequiredValues,
      requiredBlockedActions: storageDesign.recordSchema.blockedActionRequiredValues,
      packetMustBeRejectedIfMissing: [
        "requestId",
        "recordId",
        "requestedOperation",
        "approvalState",
        "approvedScope",
        "sourceCommit",
        "previewVerificationStatus",
        "planVerificationStatus",
        "replayRefs",
        "auditRefs",
        "rollbackRef",
        "expiresAt",
        "integrity",
      ],
    },
    preWritePreviewVerifyGate: {
      requiredBeforeFutureWrite: true,
      requiredStatuses: {
        invocationApprovalContractVerification: "ready",
        approvalRecordStorageVerification: "ready",
        dryRunPlanVerification: "ready",
        dryRunPreviewVerification: "ready",
      },
      sourceCommitMustMatchPreview: true,
      previewMustBeUserVisible: true,
      noDryRunInvocationDuringPreview: true,
      noCommandExecutionDuringPreview: true,
    },
    duplicateExpiryScopeControls: {
      duplicateKey: [
        "requestId",
        "recordId",
        "requestedOperation",
        "sourceCommit",
      ],
      duplicatePolicy: "future_write_gate_must_reject_duplicate_active_record",
      expiryPolicy: "future_write_gate_must_reject_packets_with_expiresAt_at_or_before_write_time",
      scopePolicy: "future_write_gate_must_reject_scope_beyond_dry_run_invocation_only",
      sourceDriftPolicy: "future_write_gate_must_reject_when_source_commit_differs_from_preview",
      revocationPolicy: "future_write_gate_must_reject_revoked_or_superseded_record_ids",
    },
    postWriteReferenceContract: {
      writeNow: false,
      requiredAfterFutureWrite: [
        "append approval record to primary JSONL",
        "append audit event reference",
        "append replay decision reference",
        "link rollback source commit",
        "update approval index",
      ],
      auditEventTypes: [
        "tauri_dry_run_invocation_approval_write_attempted",
        "tauri_dry_run_invocation_approval_written",
        "tauri_dry_run_invocation_approval_write_rejected",
      ],
      replayReferences: [
        "approval_packet_validation_replay",
        "future_invocation_decision_replay",
      ],
      rollbackReference: {
        mode: "source_commit_anchor",
        sourceCommit: storageDesign.referenceContract.rollbackRef.sourceCommit,
        rollbackExecutionNow: "blocked",
      },
    },
    rejectionRules: [
      "reject_if_storage_design_not_ready",
      "reject_if_approval_packet_missing_required_field",
      "reject_if_operation_not_install_update_or_rollback",
      "reject_if_approval_state_not_allowed",
      "reject_if_approved_scope_exceeds_dry_run_invocation_only",
      "reject_if_blocked_actions_do_not_include_real_operations",
      "reject_if_duplicate_active_record",
      "reject_if_packet_expired",
      "reject_if_source_commit_changed",
      "reject_if_preview_verification_not_ready",
      "reject_if_plan_verification_not_ready",
      "reject_if_replay_refs_missing",
      "reject_if_audit_refs_missing",
      "reject_if_rollback_ref_missing",
      "reject_if_integrity_fields_missing",
      "reject_if_write_root_outside_approval_storage",
      "reject_if_dry_run_invocation_present",
      "reject_if_command_execution_present",
      "reject_if_file_mutation_present",
      "reject_if_tauri_build_present",
      "reject_if_dependency_install_present",
      "reject_if_ipc_or_external_network_present",
      "reject_if_connector_model_tool_activation_present",
    ],
    failureRecoveryStates: [
      {
        id: "approval_packet_missing_required_field",
        recovery: "Reject the future write and return the missing-field list without appending any record.",
      },
      {
        id: "duplicate_active_approval",
        recovery: "Reject the future write and show the existing active approval record reference for review.",
      },
      {
        id: "approval_packet_expired",
        recovery: "Reject the future write and require a new preview, verification, and approval packet.",
      },
      {
        id: "approval_scope_exceeded",
        recovery: "Reject the future write because approval can only cover dry-run invocation preparation.",
      },
      {
        id: "source_commit_drift_before_write",
        recovery: "Reject the future write and rebuild plan/preview evidence from the current source checkpoint.",
      },
      {
        id: "post_write_reference_missing",
        recovery: "Block future write implementation until audit, replay, and rollback references are defined together.",
      },
    ],
    writeGateBoundary: {
      approvalRecordWriteAllowedNow: false,
      writeGateImplemented: false,
      writeGateInvoked: false,
      dryRunInvocationAllowedNow: false,
      commandExecutionAllowedNow: false,
      fileMutationAllowedNow: false,
      dependencyInstallAllowedNow: false,
      tauriBuildAllowedNow: false,
      ipcAllowedNow: false,
      externalNetworkAllowedNow: false,
      connectorModelToolActivationAllowedNow: false,
      installUpdateRollbackExecutionAllowedNow: false,
    },
    safetyInvariants: {
      ...pureDryRunSafetyInvariants(),
      writesApprovalRecord: false,
      implementsWriteGate: false,
      invokesWriteGate: false,
      invokesDryRunExecutor: false,
    },
    authorityBoundary: blockedAuthorityBoundary(),
    nextSafeAction: findings.length
      ? "Fix approval-record storage design findings before trusting the write gate design."
      : "Expose this stop-line through the Control Center approval/preview UX before any deeper validation work; actual approval record write, dry-run invocation, command execution, file mutation, Tauri build, dependency install, IPC, external network, connector/model/tool activation, and install/update/rollback execution remain blocked.",
  };
}

export function verifyTauriInstallDryRunApprovalRecordWriteGateDesign({
  root = PROJECT_ROOT,
  design = buildTauriInstallDryRunApprovalRecordWriteGateDesign({ root }),
} = {}) {
  const findings = [];

  if (design.schema !== "gpao_t.tauri_install_dry_run_approval_record_write_gate_design.v0_1") findings.push("invalid_schema");
  if (design.designMode !== "write_gate_design_only_no_record_write_no_invocation") findings.push("design_mode_invalid");
  if (design.storageDesign.verificationStatus !== "ready") findings.push("storage_design_not_ready");
  if (!design.allowedApprovalPacket.requiredFields.includes("previewVerificationStatus")) findings.push("preview_verification_field_missing");
  if (!design.allowedApprovalPacket.requiredFields.includes("planVerificationStatus")) findings.push("plan_verification_field_missing");
  if (!design.allowedApprovalPacket.requiredFields.includes("replayRefs")) findings.push("replay_refs_field_missing");
  if (!design.allowedApprovalPacket.requiredFields.includes("auditRefs")) findings.push("audit_refs_field_missing");
  if (!design.allowedApprovalPacket.requiredFields.includes("rollbackRef")) findings.push("rollback_ref_field_missing");
  if (!design.allowedApprovalPacket.allowedOperations.includes("install")) findings.push("install_operation_missing");
  if (!design.allowedApprovalPacket.allowedOperations.includes("update")) findings.push("update_operation_missing");
  if (!design.allowedApprovalPacket.allowedOperations.includes("rollback")) findings.push("rollback_operation_missing");
  if (!design.allowedApprovalPacket.allowedApprovalStates.includes("approved_for_dry_run_invocation_only")) {
    findings.push("dry_run_only_approval_state_missing");
  }
  if (!design.allowedApprovalPacket.packetMustBeRejectedIfMissing.includes("integrity")) findings.push("integrity_missing_rejection_absent");
  if (design.preWritePreviewVerifyGate.requiredBeforeFutureWrite !== true) findings.push("pre_write_gate_not_required");
  if (design.preWritePreviewVerifyGate.requiredStatuses.dryRunPreviewVerification !== "ready") findings.push("preview_ready_status_missing");
  if (design.preWritePreviewVerifyGate.noDryRunInvocationDuringPreview !== true) findings.push("preview_allows_dry_run_invocation");
  if (!design.duplicateExpiryScopeControls.duplicateKey.includes("requestId")) findings.push("duplicate_request_key_missing");
  if (!/reject_duplicate/.test(design.duplicateExpiryScopeControls.duplicatePolicy)) findings.push("duplicate_rejection_missing");
  if (!/reject_packets/.test(design.duplicateExpiryScopeControls.expiryPolicy)) findings.push("expiry_rejection_missing");
  if (!/reject_scope/.test(design.duplicateExpiryScopeControls.scopePolicy)) findings.push("scope_rejection_missing");
  if (design.postWriteReferenceContract.writeNow !== false) findings.push("post_write_contract_enables_write");
  if (!design.postWriteReferenceContract.requiredAfterFutureWrite.includes("append audit event reference")) {
    findings.push("post_write_audit_reference_missing");
  }
  if (!design.postWriteReferenceContract.requiredAfterFutureWrite.includes("append replay decision reference")) {
    findings.push("post_write_replay_reference_missing");
  }
  if (design.postWriteReferenceContract.rollbackReference.rollbackExecutionNow !== "blocked") findings.push("rollback_execution_enabled");
  if (!design.rejectionRules.includes("reject_if_duplicate_active_record")) findings.push("duplicate_rejection_rule_missing");
  if (!design.rejectionRules.includes("reject_if_packet_expired")) findings.push("expiry_rejection_rule_missing");
  if (!design.rejectionRules.includes("reject_if_approved_scope_exceeds_dry_run_invocation_only")) {
    findings.push("scope_rejection_rule_missing");
  }
  if (!design.rejectionRules.includes("reject_if_dry_run_invocation_present")) findings.push("dry_run_invocation_rejection_missing");
  if (!design.failureRecoveryStates.some((state) => state.id === "approval_packet_missing_required_field")) {
    findings.push("missing_field_recovery_missing");
  }
  if (!design.failureRecoveryStates.some((state) => state.id === "duplicate_active_approval")) findings.push("duplicate_recovery_missing");
  if (design.writeGateBoundary.approvalRecordWriteAllowedNow !== false) findings.push("approval_record_write_allowed_now");
  if (design.writeGateBoundary.writeGateImplemented !== false) findings.push("write_gate_implemented");
  if (design.writeGateBoundary.writeGateInvoked !== false) findings.push("write_gate_invoked");
  if (design.writeGateBoundary.dryRunInvocationAllowedNow !== false) findings.push("dry_run_invocation_allowed_now");
  if (design.writeGateBoundary.commandExecutionAllowedNow !== false) findings.push("command_execution_allowed_now");
  if (design.writeGateBoundary.fileMutationAllowedNow !== false) findings.push("file_mutation_allowed_now");
  if (design.writeGateBoundary.tauriBuildAllowedNow !== false) findings.push("tauri_build_allowed_now");
  if (design.writeGateBoundary.externalNetworkAllowedNow !== false) findings.push("external_network_allowed_now");
  if (design.writeGateBoundary.connectorModelToolActivationAllowedNow !== false) findings.push("connector_model_tool_activation_allowed_now");
  if (design.safetyInvariants.writesApprovalRecord !== false) findings.push("safety_invariant_writes_approval_record");
  if (design.safetyInvariants.implementsWriteGate !== false) findings.push("safety_invariant_implements_write_gate");
  if (design.safetyInvariants.invokesDryRunExecutor !== false) findings.push("safety_invariant_invokes_dry_run");
  if (design.authorityBoundary.installExecution !== "blocked") findings.push("install_execution_not_blocked");
  if (design.authorityBoundary.updateExecution !== "blocked") findings.push("update_execution_not_blocked");
  if (design.authorityBoundary.rollbackExecution !== "blocked") findings.push("rollback_execution_not_blocked");

  return {
    schema: "gpao_t.tauri_install_dry_run_approval_record_write_gate_design_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    allowedApprovalPacket: design.allowedApprovalPacket,
    writeGateBoundary: design.writeGateBoundary,
    authorityBoundary: design.authorityBoundary,
    nextSafeAction: findings.length
      ? "Fix approval-record write gate design findings before any validation implementation."
      : "Proceed only to Control Center approval/preview UX integration; do not write approval records, invoke dry-run, run commands, mutate files, build Tauri, install dependencies, open IPC, call external network, activate connectors/models/tools, or execute install/update/rollback.",
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

function buildPureDryRunOperationPlan({ operation, sourceCommit }) {
  return {
    operation,
    sourceCommit,
    executionStatus: "planned_not_executed",
    mutationStatus: "planned_not_written",
    networkStatus: "blocked",
    ipcStatus: "blocked",
    plannedCommands: [
      {
        label: "source checkpoint check",
        command: "git status --short",
        executionStatus: "not_executed",
        purpose: "Confirm the source-control state before any future dry-run invocation.",
      },
      {
        label: "project verification",
        command: "npm run verify",
        executionStatus: "not_executed",
        purpose: "Confirm the project still passes before considering a future dry-run invocation.",
      },
    ],
    plannedWrites: [
      {
        path: `.gpao-t/tauri-dry-run/${operation}-preview.json`,
        writeStatus: "not_written",
        purpose: "Future dry-run preview artifact path after a separate invocation gate.",
      },
      {
        path: `.gpao-t/audit/tauri-${operation}-dry-run-preview.jsonl`,
        writeStatus: "not_written",
        purpose: "Future audit preview path after a separate invocation gate.",
      },
    ],
    blockedActions: [
      `${operation} execution`,
      "Tauri build",
      "dependency install",
      "file write",
      "command execution",
      "external network",
      "IPC activation",
      "connector activation",
      "model activation",
      "tool activation",
    ],
    verificationCommands: [
      {
        command: "npm run verify",
        executionStatus: "not_executed",
      },
      {
        command: "node bin/gpao-t.js control tauri-dry-run-preview-check",
        executionStatus: "not_executed",
      },
    ],
    rollbackPlan: {
      summary: "Use the current local git commit as rollback anchor before any future dry-run invocation gate.",
      rollbackExecution: "blocked",
      sourceCommit,
      triggerConditions: [
        "verification fails",
        "planned write leaves allowed local state root",
        "planned command attempts install/update/rollback/Tauri build",
      ],
    },
    userVisibleRecovery: {
      status: "available_before_execution",
      message: `${capitalize(operation)} remains preview-only. Nothing has been executed or written; revise the plan or return to the last source-control checkpoint.`,
    },
    nextSafeAction: "Review this preview-only operation plan; a separate future approval is required before any dry-run invocation exists.",
  };
}

function pureDryRunSafetyInvariants() {
  return {
    invokesDryRunExecutor: false,
    writesFiles: false,
    runsCommands: false,
    runsTauriBuild: false,
    installsDependencies: false,
    executesInstall: false,
    executesUpdate: false,
    executesRollback: false,
    opensIpc: false,
    readsExternalNetwork: false,
    activatesConnectors: false,
    activatesModels: false,
    activatesTools: false,
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
