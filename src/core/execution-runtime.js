import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildConnectorToolGovernance } from "./connector-governance.js";

const EXECUTION_LANE_BLOCKS = [
  "write mutation",
  "external send",
  "destructive action",
  "paid action",
  "credential read/write",
  "connector live activation",
  "durable memory promotion",
];

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
      ? "gpao-t control work-surface-check"
      : "read-only inspection candidate",
    expectedEffect: "현재 작업 표면과 권한 경계를 검증하는 미리보기 계획을 보여줍니다.",
    invokesNow: false,
    writesNow: false,
    rollbackReference: "No mutation occurs during preview; discard preview to roll back.",
  };
}
