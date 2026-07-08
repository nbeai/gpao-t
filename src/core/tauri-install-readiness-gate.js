import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildInstallHardeningReport } from "./install-hardening.js";
import { buildTauriPackagedDesktopGate, verifyTauriPackagedDesktopGate } from "./tauri-packaged-desktop-gate.js";
import { buildTauriReadOnlyShellSlice, verifyTauriReadOnlyShellSlice } from "./tauri-readonly-shell.js";

const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));

const REQUIRED_EVIDENCE_FILES = [
  "docs/03-verification/evidence/tauri-shell-visual-qa-baseline-2026-07-09.json",
  "docs/03-verification/evidence/TAURI-SHELL-VISUAL-QA-BASELINE-2026-07-09.md",
  "docs/03-verification/evidence/tauri-shell-visual-qa-2026-07-09-desktop-viewport-1440x960.jpg",
  "docs/03-verification/evidence/tauri-shell-visual-qa-2026-07-09-mobile-viewport-390x844.jpg",
];

const REQUIRED_SOURCE_FILES = [
  "src-tauri/Cargo.toml",
  "src-tauri/build.rs",
  "src-tauri/tauri.conf.json",
  "src-tauri/src/main.rs",
  "src-tauri/capabilities/default.json",
  "tauri-shell/index.html",
];

export function buildTauriInstallReadinessGate({
  root = PROJECT_ROOT,
  packageHardening = buildInstallHardeningReport({ root }),
  tauriGate = buildTauriPackagedDesktopGate(),
  tauriGateVerification = verifyTauriPackagedDesktopGate({ gate: tauriGate }),
  shellSlice = buildTauriReadOnlyShellSlice({ root, sourceRoot: root }),
  shellVerification = verifyTauriReadOnlyShellSlice({ root, sourceRoot: root, slice: shellSlice }),
} = {}) {
  const evidenceFiles = REQUIRED_EVIDENCE_FILES.map((path) => ({
    path,
    required: true,
    status: fileExists({ root, path }) ? "present" : "missing",
  }));
  const sourceFiles = REQUIRED_SOURCE_FILES.map((path) => ({
    path,
    required: true,
    status: fileExists({ root, path }) ? "present" : "missing",
  }));
  const visualReport = readVisualQaReport({ root });
  const missingEvidence = evidenceFiles.filter((file) => file.status !== "present").map((file) => file.path);
  const missingSource = sourceFiles.filter((file) => file.status !== "present").map((file) => file.path);
  const readinessFindings = [
    ...missingEvidence.map((path) => `missing_evidence:${path}`),
    ...missingSource.map((path) => `missing_source:${path}`),
  ];

  if (tauriGateVerification.status !== "ready") readinessFindings.push("tauri_gate_not_ready");
  if (shellVerification.status !== "ready") readinessFindings.push("tauri_shell_not_ready");
  if (packageHardening.status === "blocked") readinessFindings.push("package_hardening_blocked");
  if (visualReport.status !== "ready") readinessFindings.push("visual_qa_not_ready");

  return {
    schema: "gpao_t.tauri_install_update_rollback_readiness_gate.v0_1",
    status: readinessFindings.length ? "blocked" : "ready",
    gateKind: "packaged_desktop_install_update_rollback_readiness",
    executionMode: "readiness_review_only",
    readinessFindings,
    prerequisiteStatus: {
      packageHardening: packageHardening.status,
      tauriGate: tauriGateVerification.status,
      tauriShell: shellVerification.status,
      visualQa: visualReport.status,
      sourceControl: packageHardening.rollbackGate?.sourceControlBaseline?.mode || "unknown",
    },
    evidenceFiles,
    sourceFiles,
    installGate: {
      status: readinessFindings.length ? "blocked" : "review",
      allowedNow: false,
      executorImplemented: false,
      installerCreated: false,
      dependencyInstallExecuted: false,
      tauriBuildExecuted: false,
      signingExecuted: false,
      packageFormat: "not_selected",
      requiredBeforeExecutor: [
        "explicit_user_approval",
        "Tauri toolchain prerequisite check",
        "signed package policy",
        "install location policy",
        "pre-install source-control checkpoint",
        "post-install health check",
        "failure/recovery UI state",
        "audit event contract",
      ],
    },
    updateGate: {
      status: readinessFindings.length ? "blocked" : "review",
      allowedNow: false,
      executorImplemented: false,
      releaseChannel: "not_configured",
      externalDownload: "blocked",
      migrationPolicy: "required_before_state_schema_change",
      requiredBeforeExecutor: [
        "version manifest contract",
        "download integrity verification",
        "pre-update backup",
        "post-update verify command",
        "rollback trigger conditions",
        "user-visible recovery message",
      ],
    },
    rollbackGate: {
      status: readinessFindings.length ? "blocked" : "review",
      allowedNow: false,
      executorImplemented: false,
      destructiveRollback: "blocked",
      rollbackSubstrate: packageHardening.rollbackGate?.rollbackSubstrate || "unknown",
      currentCommit: packageHardening.rollbackGate?.sourceControlBaseline?.currentCommit || null,
      requiredBeforeExecutor: [
        "rollback snapshot export",
        "state backup/restore contract",
        "source rollback command contract",
        "post-rollback verify command",
        "audit trail",
        "manual approval for destructive actions",
      ],
    },
    authorityBoundary: {
      installExecution: "blocked",
      updateExecution: "blocked",
      rollbackExecution: "blocked",
      dependencyInstall: "blocked",
      tauriBuild: "blocked",
      localIpc: "blocked",
      connectorActivation: "blocked",
      modelActivation: "blocked",
      toolActivation: "blocked",
      externalDownload: "blocked",
      secretStorage: "blocked",
      deployment: "blocked",
      messenger: "blocked",
      automation: "blocked",
    },
    failureRecoveryStates: [
      {
        id: "toolchain_missing",
        label: "Tauri toolchain missing",
        recovery: "Keep build and install executors blocked; show prerequisite guidance and stay on browser-local/package-shell read-only checks.",
      },
      {
        id: "visual_baseline_missing",
        label: "Visual baseline missing",
        recovery: "Re-run packaged-shell visual QA before any install/update/rollback readiness claim.",
      },
      {
        id: "package_hardening_blocked",
        label: "Package hardening blocked",
        recovery: "Fix package, verify script, CLI, or source-control readiness before executor design.",
      },
      {
        id: "rollback_checkpoint_missing",
        label: "Rollback checkpoint missing",
        recovery: "Create or confirm a source-control checkpoint before any destructive rollback path is designed.",
      },
      {
        id: "executor_requested_too_early",
        label: "Executor requested too early",
        recovery: "Return this readiness gate and require explicit later approval before any real install, update, rollback, build, or IPC implementation.",
      },
    ],
    implementationOrder: [
      "1_readiness_gate_contract",
      "2_prerequisite_doctor_without_install",
      "3_package_manifest_and_integrity_policy",
      "4_backup_and_rollback_snapshot_contract",
      "5_dry_run_executor_gate_after_approval",
      "6_signed_package_gate_after_approval",
      "7_real_install_update_rollback_executor_after_approval",
    ],
    nextSafeAction: readinessFindings.length
      ? "Fix readiness findings before designing any packaged desktop install/update/rollback executor."
      : "Design prerequisite doctor and dry-run executor contracts next; keep real install, update, rollback, Tauri build, IPC, external download, connectors, models, tools, deployment, messenger, and automation blocked.",
  };
}

export function verifyTauriInstallReadinessGate({
  root = PROJECT_ROOT,
  gate = buildTauriInstallReadinessGate({ root }),
} = {}) {
  const findings = [];

  if (gate.schema !== "gpao_t.tauri_install_update_rollback_readiness_gate.v0_1") findings.push("invalid_schema");
  if (gate.executionMode !== "readiness_review_only") findings.push("execution_mode_not_review_only");
  if (gate.installGate.allowedNow !== false) findings.push("install_allowed");
  if (gate.updateGate.allowedNow !== false) findings.push("update_allowed");
  if (gate.rollbackGate.allowedNow !== false) findings.push("rollback_allowed");
  if (gate.installGate.tauriBuildExecuted !== false) findings.push("tauri_build_executed");
  if (gate.installGate.dependencyInstallExecuted !== false) findings.push("dependency_install_executed");
  if (gate.authorityBoundary.installExecution !== "blocked") findings.push("install_execution_not_blocked");
  if (gate.authorityBoundary.updateExecution !== "blocked") findings.push("update_execution_not_blocked");
  if (gate.authorityBoundary.rollbackExecution !== "blocked") findings.push("rollback_execution_not_blocked");
  if (gate.authorityBoundary.localIpc !== "blocked") findings.push("local_ipc_not_blocked");
  if (gate.authorityBoundary.externalDownload !== "blocked") findings.push("external_download_not_blocked");
  if (!gate.implementationOrder.includes("5_dry_run_executor_gate_after_approval")) findings.push("dry_run_gate_missing");
  if (!gate.failureRecoveryStates.some((state) => state.id === "executor_requested_too_early")) {
    findings.push("executor_too_early_recovery_missing");
  }
  if (gate.evidenceFiles.some((file) => file.status !== "present")) findings.push("visual_evidence_missing");
  if (gate.sourceFiles.some((file) => file.status !== "present")) findings.push("source_file_missing");
  if (gate.prerequisiteStatus.visualQa !== "ready") findings.push("visual_qa_not_ready");
  if (gate.prerequisiteStatus.tauriShell !== "ready") findings.push("tauri_shell_not_ready");
  if (gate.prerequisiteStatus.tauriGate !== "ready") findings.push("tauri_gate_not_ready");

  return {
    schema: "gpao_t.tauri_install_update_rollback_readiness_gate_verification.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    prerequisiteStatus: gate.prerequisiteStatus,
    authorityBoundary: gate.authorityBoundary,
    nextSafeAction: findings.length
      ? "Fix packaged desktop install/update/rollback readiness findings before any executor design."
      : "Proceed only to prerequisite doctor and dry-run executor contract design; keep real install/update/rollback execution, Tauri build, IPC, external download, connectors, models, tools, deployment, messenger, and automation blocked.",
  };
}

function fileExists({ root, path }) {
  return existsSync(resolve(root, path));
}

function readVisualQaReport({ root }) {
  const path = resolve(root, REQUIRED_EVIDENCE_FILES[0]);
  if (!existsSync(path)) {
    return { status: "missing" };
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { status: "unreadable" };
  }
}
