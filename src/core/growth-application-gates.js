import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { readSelfGrowthProposals } from "./growth-proposals.js";
import { readReplayRecoveryHistory } from "./replay-history.js";
import { runtimePaths } from "./storage.js";

const GROWTH_APPLICATION_GATES_FILE = "growth/application-gates.jsonl";
const ALLOWED_APPROVAL_STATES = new Set([
  "not_requested",
  "requested",
  "approved_for_preview",
  "approved_for_apply",
  "rejected",
]);

export function growthApplicationGatesPath({ root } = {}) {
  return resolve(runtimePaths({ root }).runtimeRoot, GROWTH_APPLICATION_GATES_FILE);
}

export function buildGrowthApplicationGate({
  root,
  proposalId,
  target,
  approvalStatus = "not_requested",
  now = new Date().toISOString(),
  minReplay = 2,
} = {}) {
  const normalizedApproval = ALLOWED_APPROVAL_STATES.has(approvalStatus)
    ? approvalStatus
    : "not_requested";
  const proposal = selectProposal({ root, proposalId, target });
  const targetId = proposal?.target?.id || target || null;
  const replayRecords = targetId
    ? readReplayRecoveryHistory({ root }).filter((record) => record.activeTarget?.id === targetId)
    : [];
  const replayPassed = replayRecords.length >= minReplay;
  const approvalPassed = normalizedApproval === "approved_for_apply";
  const rollbackReady = Boolean(proposal && replayPassed);
  const reviewStatus = proposal && replayPassed
    ? approvalPassed
      ? "review_passed_apply_blocked"
      : "awaiting_approval"
    : "not_ready";

  return {
    schema: "gpao_t.growth_application_gate.v0_1",
    id: `growth_gate.${Date.parse(now) || 0}.${targetId || "unknown"}`,
    createdAt: now,
    gateKind: "self_growth_application_gate",
    status: "blocked_live_mutation",
    reviewStatus,
    proposal: proposal
      ? {
          id: proposal.id,
          status: proposal.status,
          target: proposal.target,
          title: proposal.proposal?.title || null,
        }
      : null,
    replayGate: {
      required: true,
      status: replayPassed ? "passed" : "blocked",
      minReplay,
      evidenceCount: replayRecords.length,
      latestRecordId: replayRecords.at(-1)?.id || null,
    },
    approvalGate: {
      required: true,
      status: normalizedApproval,
      passed: approvalPassed,
      allowedStates: [...ALLOWED_APPROVAL_STATES],
    },
    auditGate: {
      required: true,
      status: "required_before_apply",
      eventType: "growth.application_gate_review",
      evidence: "local_gate_record_only",
    },
    rollbackGate: {
      required: true,
      status: rollbackReady ? "plan_available" : "blocked",
      rollbackPlan: rollbackReady
        ? buildRollbackPlan({ proposal, replayRecords })
        : null,
    },
    authorityBoundary: {
      durableMemoryPromotion: "blocked",
      osRuleMutation: "blocked",
      connectorActivation: "blocked",
      externalAction: "blocked",
      liveRuntimeMutation: "blocked_in_this_slice",
    },
    application: {
      mode: "local_gate_review_only",
      canApplyNow: false,
      reversibleApplyEngine: "not_implemented_required_before_live_mutation",
      reason: "This slice records replay, approval, audit, and rollback readiness but never mutates live GPAO-T behavior.",
    },
    nextSafeAction: buildNextSafeAction({ proposal, replayPassed, approvalPassed }),
  };
}

export function appendGrowthApplicationGate({
  root,
  proposalId,
  target,
  approvalStatus = "not_requested",
  now = new Date().toISOString(),
  minReplay = 2,
} = {}) {
  const gate = buildGrowthApplicationGate({
    root,
    proposalId,
    target,
    approvalStatus,
    now,
    minReplay,
  });
  const file = growthApplicationGatesPath({ root });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(gate)}\n`, { flag: "a" });
  return gate;
}

export function readGrowthApplicationGates({ root, limit = 50 } = {}) {
  const file = growthApplicationGatesPath({ root });
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => JSON.parse(line));
}

export function buildGrowthApplicationGateSummary({ root } = {}) {
  const gates = readGrowthApplicationGates({ root });
  const latest = gates.at(-1) || null;
  const blocked = gates.filter((gate) => gate.status === "blocked_live_mutation");
  return {
    schema: "gpao_t.growth_application_gate_summary.v0_1",
    status: gates.length ? "review" : "ready",
    totalGates: gates.length,
    blockedLiveMutations: blocked.length,
    latest,
    authorityBoundary: {
      durableMemoryPromotion: "blocked",
      osRuleMutation: "blocked",
      connectorActivation: "blocked",
      externalAction: "blocked",
      liveRuntimeMutation: "blocked_in_this_slice",
    },
    nextSafeAction: gates.length
      ? "Review the latest gate; keep live mutation blocked until apply, audit, and rollback execution exist."
      : "Record a growth application gate before any proposal is considered for application.",
  };
}

function selectProposal({ root, proposalId, target }) {
  const proposals = readSelfGrowthProposals({ root });
  if (proposalId) {
    return proposals.find((proposal) => proposal.id === proposalId) || null;
  }
  if (target) {
    return [...proposals].reverse().find((proposal) => proposal.target?.id === target) || null;
  }
  return proposals.at(-1) || null;
}

function buildRollbackPlan({ proposal, replayRecords }) {
  return {
    rollbackKind: "local_revert_contract",
    proposalId: proposal.id,
    target: proposal.target?.id || null,
    evidenceRecordIds: replayRecords.map((record) => record.id),
    restorePoint: "current_runtime_behavior_before_growth_application",
    verificationAfterRollback: "rerun replay recovery fixtures and npm run verify",
  };
}

function buildNextSafeAction({ proposal, replayPassed, approvalPassed }) {
  if (!proposal) {
    return "Create or select a self-growth proposal before reviewing application readiness.";
  }
  if (!replayPassed) {
    return "Add replay recovery evidence until the replay gate passes.";
  }
  if (!approvalPassed) {
    return "Request explicit approval only after replay evidence and rollback plan are visible.";
  }
  return "Keep this as a local gate record; implement a separate reversible apply engine before mutating GPAO-T behavior.";
}
