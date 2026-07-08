import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  appendInstallHardeningReport,
  buildInstallHardeningReport,
  buildInstallHardeningSummary,
  buildTauriInstallDryRunExecutorContract,
  buildTauriInstallDryRunImplementationDesign,
  buildTauriInstallPrerequisiteDoctor,
  buildTauriInstallReadinessGate,
  handleGatewayRequest,
  readInstallHardeningReports,
  verifyTauriInstallDryRunExecutorContract,
  verifyTauriInstallDryRunImplementationDesign,
  verifyTauriInstallPrerequisiteDoctor,
  verifyTauriInstallReadinessGate,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-install-hardening-"));
}

describe("GPAO-T install/update/rollback hardening", () => {
  it("blocks readiness when required package files are missing", () => {
    const root = tempRoot();
    const report = buildInstallHardeningReport({ root });

    assert.equal(report.schema, "gpao_t.install_hardening_report.v0_1");
    assert.equal(report.status, "blocked");
    assert.ok(report.installGate.missingFiles.includes("package.json"));
    assert.equal(report.application.canInstallNow, false);
    assert.equal(report.authorityBoundary.deployment, "blocked_until_explicit_approval");
  });

  it("reviews the current package without executing install, update, daemon, or rollback", () => {
    const report = buildInstallHardeningReport({ root: ROOT });

    assert.equal(report.status, "review");
    assert.equal(report.package.name, "gpao-t");
    assert.equal(report.package.scripts.verify, true);
    assert.equal(report.installGate.installerExecution, "not_implemented");
    assert.equal(report.updateGate.updateMode, "local_manifest_review_only");
    assert.equal(report.rollbackGate.rollbackExecution, "not_implemented");
    assert.equal(report.rollbackGate.sourceControlBaseline.mode, "independent_local_git_repository");
    assert.equal(report.rollbackGate.sourceControlBaseline.publicRemote, "not_configured");
    assert.equal(report.rollbackGate.sourceControlBaseline.deployment, "out_of_scope");
    assert.ok(report.rollbackGate.sourceControlBaseline.currentCommit);
    assert.ok(report.rollbackGate.sourceControlBaseline.ignoredLocalState.includes(".gpao-t/"));
    assert.ok(report.rollbackGate.sourceControlBaseline.ignoredLocalState.includes(".beai-harness/"));
    assert.deepEqual(report.authorityBoundary.realExecutorRequirements, [
      "explicit_approval",
      "recovery_evidence",
      "post_operation_verification",
    ]);
    assert.equal(report.application.canInstallNow, false);
    assert.equal(report.application.canUpdateNow, false);
    assert.equal(report.application.canRollbackNow, false);
  });

  it("records hardening reports as local review evidence", () => {
    const root = tempRoot();
    const report = appendInstallHardeningReport({ root, now: "2026-07-08T00:00:00.000Z" });
    const reports = readInstallHardeningReports({ root });
    const summary = buildInstallHardeningSummary({ root });

    assert.equal(report.status, "blocked");
    assert.equal(reports.length, 1);
    assert.equal(summary.schema, "gpao_t.install_hardening_summary.v0_1");
    assert.equal(summary.totalReports, 1);
    assert.equal(summary.latest.id, undefined);
  });

  it("exposes hardening through CLI and gateway", () => {
    const cliOutput = execFileSync(process.execPath, [CLI, "ops", "hardening"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliReport = JSON.parse(cliOutput);
    const report = handleGatewayRequest({ root: ROOT, method: "GET", path: "/ops/install-hardening" });
    const record = handleGatewayRequest({ root: tempRoot(), method: "POST", path: "/ops/install-hardening/record" });
    const history = handleGatewayRequest({ root: tempRoot(), method: "GET", path: "/ops/install-hardening/history" });
    const summary = handleGatewayRequest({ root: ROOT, method: "GET", path: "/ops/install-hardening/summary" });

    assert.equal(cliReport.schema, "gpao_t.install_hardening_report.v0_1");
    assert.equal(report.status, 200);
    assert.equal(record.status, 200);
    assert.equal(history.status, 200);
    assert.equal(summary.status, 200);
    assert.equal(report.body.application.canInstallNow, false);
    assert.equal(report.body.rollbackGate.sourceControlBaseline.mode, "independent_local_git_repository");
    assert.equal(summary.body.schema, "gpao_t.install_hardening_summary.v0_1");
  });

  it("defines packaged desktop install/update/rollback readiness without executing operations", () => {
    const gate = buildTauriInstallReadinessGate({ root: ROOT });
    const verification = verifyTauriInstallReadinessGate({ root: ROOT, gate });
    const cliGate = JSON.parse(execFileSync(process.execPath, [CLI, "control", "tauri-install-gate"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "tauri-install-gate-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayGate = handleGatewayRequest({ root: ROOT, method: "GET", path: "/app-shell/tauri-install-gate" });
    const gatewayCheck = handleGatewayRequest({ root: ROOT, method: "GET", path: "/app-shell/tauri-install-gate/verify" });

    assert.equal(gate.schema, "gpao_t.tauri_install_update_rollback_readiness_gate.v0_1");
    assert.equal(gate.status, "ready");
    assert.equal(gate.executionMode, "readiness_review_only");
    assert.equal(gate.prerequisiteStatus.visualQa, "ready");
    assert.equal(gate.prerequisiteStatus.tauriGate, "ready");
    assert.equal(gate.prerequisiteStatus.tauriShell, "ready");
    assert.equal(gate.evidenceFiles.every((file) => file.status === "present"), true);
    assert.equal(gate.sourceFiles.every((file) => file.status === "present"), true);
    assert.equal(gate.installGate.allowedNow, false);
    assert.equal(gate.updateGate.allowedNow, false);
    assert.equal(gate.rollbackGate.allowedNow, false);
    assert.equal(gate.installGate.executorImplemented, false);
    assert.equal(gate.updateGate.executorImplemented, false);
    assert.equal(gate.rollbackGate.executorImplemented, false);
    assert.equal(gate.installGate.dependencyInstallExecuted, false);
    assert.equal(gate.installGate.tauriBuildExecuted, false);
    assert.equal(gate.authorityBoundary.installExecution, "blocked");
    assert.equal(gate.authorityBoundary.updateExecution, "blocked");
    assert.equal(gate.authorityBoundary.rollbackExecution, "blocked");
    assert.equal(gate.authorityBoundary.localIpc, "blocked");
    assert.equal(gate.authorityBoundary.externalDownload, "blocked");
    assert.equal(gate.implementationOrder.includes("5_prerequisite_doctor_and_dry_run_contract"), true);
    assert.equal(gate.failureRecoveryStates.some((state) => state.id === "executor_requested_too_early"), true);
    assert.equal(verification.status, "ready");
    assert.equal(cliGate.schema, gate.schema);
    assert.equal(cliCheck.status, "ready");
    assert.equal(gatewayGate.status, 200);
    assert.equal(gatewayGate.body.schema, gate.schema);
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });

  it("defines prerequisite doctor and dry-run executor contracts without invoking operations", () => {
    const doctor = buildTauriInstallPrerequisiteDoctor({ root: ROOT });
    const doctorCheck = verifyTauriInstallPrerequisiteDoctor({ root: ROOT, doctor });
    const dryRun = buildTauriInstallDryRunExecutorContract({ root: ROOT, prerequisiteDoctor: doctor });
    const dryRunCheck = verifyTauriInstallDryRunExecutorContract({ root: ROOT, contract: dryRun });
    const cliDoctor = JSON.parse(execFileSync(process.execPath, [CLI, "control", "tauri-prerequisite-doctor"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliDryRunCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "tauri-dry-run-contract-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayDoctor = handleGatewayRequest({ root: ROOT, method: "GET", path: "/app-shell/tauri-prerequisite-doctor" });
    const gatewayDoctorCheck = handleGatewayRequest({ root: ROOT, method: "GET", path: "/app-shell/tauri-prerequisite-doctor/verify" });
    const gatewayDryRun = handleGatewayRequest({ root: ROOT, method: "GET", path: "/app-shell/tauri-dry-run-contract" });
    const gatewayDryRunCheck = handleGatewayRequest({ root: ROOT, method: "GET", path: "/app-shell/tauri-dry-run-contract/verify" });

    assert.equal(doctor.schema, "gpao_t.tauri_install_prerequisite_doctor.v0_1");
    assert.equal(doctor.status, "ready");
    assert.equal(doctor.executionMode, "inspection_only_no_install_no_build");
    assert.equal(doctor.toolchainPolicy.cargoVersionExecuted, false);
    assert.equal(doctor.toolchainPolicy.tauriCliExecuted, false);
    assert.equal(doctor.toolchainPolicy.dependencyInstallExecuted, false);
    assert.equal(doctor.toolchainPolicy.buildExecuted, false);
    assert.equal(doctor.toolchainPolicy.allowedNow, false);
    assert.equal(doctor.rollbackCheckpoint.requiredBeforeDryRun, true);
    assert.ok(doctor.rollbackCheckpoint.currentCommit);
    assert.equal(doctorCheck.status, "ready");
    assert.equal(dryRun.schema, "gpao_t.tauri_install_dry_run_executor_contract.v0_1");
    assert.equal(dryRun.status, "ready");
    assert.equal(dryRun.executionMode, "contract_only_no_dry_run_execution");
    assert.equal(dryRun.dryRunGate.allowedNow, false);
    assert.equal(dryRun.dryRunGate.executorImplemented, false);
    assert.equal(dryRun.dryRunGate.executorInvoked, false);
    assert.equal(dryRun.dryRunGate.writesFiles, false);
    assert.equal(dryRun.dryRunGate.runsInstall, false);
    assert.equal(dryRun.dryRunGate.runsUpdate, false);
    assert.equal(dryRun.dryRunGate.runsRollback, false);
    assert.equal(dryRun.dryRunGate.runsTauriBuild, false);
    assert.equal(dryRun.dryRunGate.runsDependencyInstall, false);
    assert.equal(dryRun.dryRunGate.runsExternalDownload, false);
    assert.equal(dryRun.dryRunGate.opensIpc, false);
    assert.deepEqual(dryRun.operationPlans.map((plan) => plan.operation), ["install", "update", "rollback"]);
    assert.equal(dryRun.operationPlans.every((plan) => plan.mutationAllowed === false), true);
    assert.equal(dryRun.requiredDryRunArtifacts.length >= 7, true);
    assert.equal(dryRun.failureRecoveryStates.some((state) => state.id === "dry_run_invoked_too_early"), true);
    assert.equal(dryRunCheck.status, "ready");
    assert.equal(cliDoctor.schema, doctor.schema);
    assert.equal(cliDryRunCheck.status, "ready");
    assert.equal(gatewayDoctor.status, 200);
    assert.equal(gatewayDoctor.body.schema, doctor.schema);
    assert.equal(gatewayDoctorCheck.body.status, "ready");
    assert.equal(gatewayDryRun.status, 200);
    assert.equal(gatewayDryRun.body.schema, dryRun.schema);
    assert.equal(gatewayDryRunCheck.body.status, "ready");
  });

  it("designs approval-gated dry-run implementation without implementing or invoking it", () => {
    const design = buildTauriInstallDryRunImplementationDesign({ root: ROOT });
    const designCheck = verifyTauriInstallDryRunImplementationDesign({ root: ROOT, design });
    const cliDesign = JSON.parse(execFileSync(process.execPath, [CLI, "control", "tauri-dry-run-design"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const cliDesignCheck = JSON.parse(execFileSync(process.execPath, [CLI, "control", "tauri-dry-run-design-check"], {
      cwd: ROOT,
      encoding: "utf8",
    }));
    const gatewayDesign = handleGatewayRequest({ root: ROOT, method: "GET", path: "/app-shell/tauri-dry-run-design" });
    const gatewayDesignCheck = handleGatewayRequest({ root: ROOT, method: "GET", path: "/app-shell/tauri-dry-run-design/verify" });

    assert.equal(design.schema, "gpao_t.tauri_install_dry_run_implementation_design.v0_1");
    assert.equal(design.status, "ready");
    assert.equal(design.implementationStatus, "design_only");
    assert.equal(design.executionMode, "no_executor_no_invocation_no_mutation");
    assert.equal(design.executorBoundary.executorImplemented, false);
    assert.equal(design.executorBoundary.executorInvoked, false);
    assert.equal(design.executorBoundary.implementationAllowedNow, false);
    assert.equal(design.executorBoundary.invocationAllowedNow, false);
    assert.equal(design.executorBoundary.writesFiles, false);
    assert.equal(design.executorBoundary.runsCommands, false);
    assert.equal(design.executorBoundary.readsExternalNetwork, false);
    assert.equal(design.executorBoundary.opensIpc, false);
    assert.deepEqual(design.operationDesigns.map((item) => item.operation), ["install", "update", "rollback"]);
    assert.equal(design.operationDesigns.every((item) => item.executionAllowedNow === false), true);
    assert.equal(design.proposedInterfaces.every((item) => item.mutatesState === false), true);
    assert.equal(design.approvalGate.status, "required_before_implementation");
    assert.equal(design.approvalGate.approvalDoesNotAllow.includes("real install execution"), true);
    assert.equal(design.rejectionRules.includes("reject_if_external_download_present"), true);
    assert.equal(design.rejectionRules.includes("reject_if_tauri_build_present"), true);
    assert.equal(designCheck.status, "ready");
    assert.equal(cliDesign.schema, design.schema);
    assert.equal(cliDesignCheck.status, "ready");
    assert.equal(gatewayDesign.status, 200);
    assert.equal(gatewayDesign.body.schema, design.schema);
    assert.equal(gatewayDesignCheck.body.status, "ready");
  });
});
