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
