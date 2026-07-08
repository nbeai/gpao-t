import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_FILES = [
  "package.json",
  "bin/gpao-t.js",
  "src/index.js",
  "src/core/adapter-boundary.js",
  "src/core/connector-governance.js",
  "src/core/control-center.js",
  "src/core/gateway.js",
  "src/core/growth-application-gates.js",
  "src/core/install-hardening.js",
  "src/core/memory-wiki.js",
  "src/core/runtime.js",
  "src/core/storage.js",
  "src/core/turn-kernel.js",
  "fixtures/replay/release-file-active-target.json",
  "docs/README.md",
];

export function runDoctor({ root = PACKAGE_ROOT } = {}) {
  const files = REQUIRED_FILES.map((file) => ({
    file,
    exists: existsSync(resolve(root, file)),
  }));
  const missing = files.filter((item) => !item.exists);

  return {
    schema: "gpao_t.doctor.v0_1",
    status: missing.length ? "blocked" : "ready",
    root,
    checks: files,
    missing: missing.map((item) => item.file),
    runtimeState: {
      path: ".gpao-t/state/runtime.json",
      requiredFor: "persistent local runtime continuity",
      autoCreatedBy: "gpao-t init or any persisted turn",
    },
    auditLog: {
      path: ".gpao-t/events/audit.jsonl",
      requiredFor: "local evidence, recovery, and authority review",
      autoCreatedBy: "gpao-t init or any persisted turn",
    },
    memoryWiki: {
      path: ".gpao-t/memory/wiki.json",
      requiredFor: "source-linked candidate memory entries",
      autoCreatedBy: "gpao-t memory capture or POST /memory/capture",
    },
    recoveryHistory: {
      path: ".gpao-t/recovery/history.jsonl",
      requiredFor: "replay recovery pattern tracking",
      autoCreatedBy: "gpao-t replay-record or POST /replay/record",
    },
    developmentPrinciples: {
      path: "docs/DEVELOPMENT-PRINCIPLES.md",
      requiredFor: "OpenClaw stability absorption, Codex-grade UX reference, and GPAO-T kernel implementation judgment",
      appliesTo: "future runtime, connector, UI, replay, audit, and control-center work",
    },
    connectorGovernance: {
      path: "src/core/connector-governance.js",
      requiredFor: "local connector registry, permission review, and account/action boundary visibility",
      defaultBoundary: "connected_does_not_mean_executable",
    },
    growthProposals: {
      path: ".gpao-t/growth/proposals.jsonl",
      requiredFor: "review-only self-growth proposals before replay, approval, and rollback gates",
      autoCreatedBy: "gpao-t growth propose or POST /growth/propose",
    },
    growthApplicationGates: {
      path: ".gpao-t/growth/application-gates.jsonl",
      requiredFor: "local replay, approval, audit, and rollback review before any self-growth application",
      autoCreatedBy: "gpao-t growth gate-record or POST /growth/application-gate/record",
      liveMutation: "blocked_in_this_slice",
    },
    installHardening: {
      path: ".gpao-t/ops/install-hardening.jsonl",
      requiredFor: "local install, update, rollback, doctor, and recovery readiness review",
      autoCreatedBy: "gpao-t ops hardening-record or POST /ops/install-hardening/record",
      realExecution: "blocked_until_explicit_approval_and_executor_exists",
    },
    nextAction: missing.length
      ? "Create the missing runtime skeleton files before claiming this target is usable."
      : "Run npm run verify for syntax and replay tests.",
  };
}
