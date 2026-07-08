import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runtimePaths } from "./storage.js";

const INSTALL_HARDENING_FILE = "ops/install-hardening.jsonl";
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const REQUIRED_RUNTIME_FILES = [
  "package.json",
  "bin/gpao-t.js",
  "src/index.js",
  "src/core/doctor.js",
  "src/core/gateway.js",
  "src/core/storage.js",
  "docs/README.md",
  "docs/DEVELOPMENT-PRINCIPLES.md",
];

export function installHardeningPath({ root } = {}) {
  return resolve(runtimePaths({ root }).runtimeRoot, INSTALL_HARDENING_FILE);
}

export function buildInstallHardeningReport({
  root = PACKAGE_ROOT,
  now = new Date().toISOString(),
} = {}) {
  const packageJson = readPackageJson({ root });
  const fileChecks = REQUIRED_RUNTIME_FILES.map((file) => ({
    file,
    exists: existsSync(resolve(root, file)),
  }));
  const missingFiles = fileChecks.filter((item) => !item.exists).map((item) => item.file);
  const scripts = packageJson?.scripts || {};
  const hasVerify = typeof scripts.verify === "string";
  const hasCheck = typeof scripts.check === "string";
  const hasTest = typeof scripts.test === "string";
  const hasBin = Boolean(packageJson?.bin?.["gpao-t"]);
  const hasGit = existsSync(resolve(root, ".git"));
  const gitHeadCommit = readGitHeadCommit({ root });
  const status = missingFiles.length ? "blocked" : hasVerify && hasCheck && hasTest && hasBin ? "review" : "blocked";

  return {
    schema: "gpao_t.install_hardening_report.v0_1",
    status,
    generatedAt: now,
    hardeningKind: "install_update_rollback_readiness",
    package: {
      name: packageJson?.name || null,
      version: packageJson?.version || null,
      private: packageJson?.private ?? null,
      bin: packageJson?.bin || {},
      scripts: {
        check: hasCheck,
        test: hasTest,
        verify: hasVerify,
      },
    },
    installGate: {
      status: missingFiles.length || !hasBin ? "blocked" : "review",
      cliEntry: hasBin ? packageJson.bin["gpao-t"] : null,
      requiredFiles: fileChecks,
      missingFiles,
      installerExecution: "not_implemented",
      daemonActivation: "blocked_until_explicit_approval",
      secretStorage: "not_configured",
    },
    updateGate: {
      status: hasVerify ? "review" : "blocked",
      updateMode: "local_manifest_review_only",
      version: packageJson?.version || null,
      migrationPlan: "required_before_state_schema_change",
      networkUpdate: "blocked_until_release_channel_and_user_approval",
      preUpdateCheck: hasVerify ? "npm_run_verify_required" : "missing_verify_script",
    },
    rollbackGate: {
      status: hasGit ? "review" : "blocked",
      rollbackSubstrate: hasGit ? "git_available" : "git_not_detected_use_harness_snapshots",
      sourceControlBaseline: {
        mode: hasGit ? "independent_local_git_repository" : "not_available",
        publicRemote: "not_configured",
        deployment: "out_of_scope",
        currentCommit: gitHeadCommit,
        ignoredLocalState: [
          ".gpao-t/",
          ".beai-harness/",
          "node_modules/",
          "coverage/",
          "dist/",
          "tmp/",
          "*.log",
        ],
      },
      stateBackupPath: ".gpao-t/",
      rollbackExecution: "not_implemented",
      postRollbackCheck: hasVerify ? "npm_run_verify_required" : "missing_verify_script",
    },
    authorityBoundary: {
      installExecution: "blocked_until_user_approval",
      updateExecution: "blocked_until_user_approval",
      destructiveRollback: "blocked_until_explicit_approval",
      daemonActivation: "blocked_until_explicit_approval",
      deployment: "blocked_until_explicit_approval",
      externalDownload: "blocked_until_release_channel_and_user_approval",
      secretStorage: "not_configured",
      realExecutorRequirements: [
        "explicit_approval",
        "recovery_evidence",
        "post_operation_verification",
      ],
    },
    application: {
      mode: "local_readiness_review_only",
      canInstallNow: false,
      canUpdateNow: false,
      canRollbackNow: false,
      reason: "This slice records install, update, and rollback readiness but never installs, updates, starts daemons, deploys, stores secrets, downloads externally, or rolls back destructively.",
    },
    nextSafeAction: buildNextSafeAction({ missingFiles, hasVerify, hasGit }),
  };
}

export function appendInstallHardeningReport({
  root,
  now = new Date().toISOString(),
} = {}) {
  const report = buildInstallHardeningReport({ root, now });
  const file = installHardeningPath({ root });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(report)}\n`, { flag: "a" });
  return report;
}

export function readInstallHardeningReports({ root, limit = 50 } = {}) {
  const file = installHardeningPath({ root });
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => JSON.parse(line));
}

export function buildInstallHardeningSummary({ root } = {}) {
  const reports = readInstallHardeningReports({ root });
  const latest = reports.at(-1) || null;
  const current = latest || buildInstallHardeningReport({ root });
  return {
    schema: "gpao_t.install_hardening_summary.v0_1",
    status: current.status,
    totalReports: reports.length,
    latest,
    current,
    authorityBoundary: current.authorityBoundary,
    nextSafeAction: reports.length
      ? current.nextSafeAction
      : "Review install/update/rollback readiness locally before any real installer, daemon, release channel, or rollback execution exists.",
  };
}

function readPackageJson({ root }) {
  const file = resolve(root, "package.json");
  if (!existsSync(file)) {
    return null;
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

function readGitHeadCommit({ root }) {
  const headFile = resolve(root, ".git/HEAD");
  if (!existsSync(headFile)) {
    return null;
  }
  const head = readFileSync(headFile, "utf8").trim();
  if (head.startsWith("ref: ")) {
    const refFile = resolve(root, ".git", head.slice(5));
    return existsSync(refFile) ? readFileSync(refFile, "utf8").trim() : null;
  }
  return head || null;
}

function buildNextSafeAction({ missingFiles, hasVerify, hasGit }) {
  if (missingFiles.length) {
    return `Restore missing files before hardening install/update/rollback: ${missingFiles.join(", ")}.`;
  }
  if (!hasVerify) {
    return "Add a verify script before any install, update, or rollback path can be trusted.";
  }
  if (!hasGit) {
    return "Add an explicit non-git rollback substrate or initialize source control before real rollback execution.";
  }
  return "Keep this as a local readiness report; implement a separate approved installer/update/rollback executor before real operations.";
}
