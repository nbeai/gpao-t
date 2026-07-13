import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildRecoveryHistorySummary, readReplayRecoveryHistory } from "./replay-history.js";
import { runtimePaths } from "./storage.js";

const GROWTH_PROPOSALS_FILE = "growth/proposals.jsonl";

export function growthProposalsPath({ root } = {}) {
  return resolve(runtimePaths({ root }).runtimeRoot, GROWTH_PROPOSALS_FILE);
}

export function buildSelfGrowthProposal({
  root,
  target,
  now = new Date().toISOString(),
  minEvidence = 2,
} = {}) {
  const summary = buildRecoveryHistorySummary({ root });
  const selectedTarget = target || summary.repeatedTargets[0]?.target || summary.latest?.activeTarget?.id;
  const records = readReplayRecoveryHistory({ root }).filter(
    (record) => record.activeTarget?.id === selectedTarget,
  );
  const evidenceCount = records.length;
  const repeated = summary.repeatedTargets.some((item) => item.target === selectedTarget);
  const status = selectedTarget && evidenceCount >= minEvidence ? "proposed" : "insufficient_evidence";

  return {
    schema: "gpao_t.self_growth_proposal.v0_1",
    id: `growth.${Date.parse(now) || 0}.${selectedTarget || "unknown"}`,
    createdAt: now,
    proposalKind: "review_only_self_growth",
    status,
    target: selectedTarget
      ? {
          id: selectedTarget,
          count: evidenceCount,
          repeated,
        }
      : null,
    proposal: selectedTarget
      ? buildProposalBody({ target: selectedTarget, evidenceCount })
      : null,
    evidence: {
      source: "replay_recovery_history",
      minEvidence,
      count: evidenceCount,
      latestRecordId: records.at(-1)?.id || null,
      representativeAnchors: [...new Set(records
        .map((record) => record.representativeAnchor?.id)
        .filter(Boolean))],
    },
    authority: {
      durableMemoryPromotion: "blocked",
      osRuleMutation: "blocked",
      connectorActivation: "blocked",
      externalAction: "blocked",
      applyState: "requires_explicit_approval_after_replay",
    },
    replayGate: {
      required: true,
      status: status === "proposed" ? "pending" : "not_ready",
      nextCheck: selectedTarget
        ? `Replay at least ${minEvidence} evidence-backed cases for ${selectedTarget} before applying any runtime change.`
        : "Record recovery history before proposing a growth change.",
    },
    nextSafeAction: status === "proposed"
      ? "Review this proposal, add replay coverage, then request explicit approval before any OS behavior change."
      : "Collect more replay recovery records before creating a self-growth proposal.",
  };
}

export function appendSelfGrowthProposal({
  root,
  target,
  now = new Date().toISOString(),
  minEvidence = 2,
} = {}) {
  const proposal = buildSelfGrowthProposal({ root, target, now, minEvidence });
  if (proposal.status !== "proposed") {
    return proposal;
  }
  const file = growthProposalsPath({ root });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(proposal)}\n`, { flag: "a" });
  return proposal;
}

export function readSelfGrowthProposals({ root, limit = 50 } = {}) {
  const file = growthProposalsPath({ root });
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => JSON.parse(line));
}

function buildProposalBody({ target, evidenceCount }) {
  if (target === "release-file") {
    return {
      title: "Strengthen release-file active-target recovery",
      operatingPrinciple:
        "When the user says 배포파일 in the current GPAO-T packaging flow, recover the active target before answering or selecting tools.",
      expectedBenefit:
        "Reduce wrong-anchor answers and keep short Korean follow-up requests on the intended product/package thread.",
      candidateRuntimeChange:
        "Prefer admitted Context Mesh candidates that anchor release-file when input kind is follow_up and the active flow is packaging or distribution.",
      evidenceSummary: `${evidenceCount} replay recovery record(s) support this proposal.`,
    };
  }

  return {
    title: `Strengthen ${target} active-target recovery`,
    operatingPrinciple:
      "Repeated recovery evidence can justify a bounded active-target recovery improvement after replay and approval.",
    expectedBenefit:
      "Reduce repeated context loss while preserving current-turn admission and user authority boundaries.",
    candidateRuntimeChange:
      `Add a narrow recovery rule for ${target} only after replay coverage proves the change.`,
    evidenceSummary: `${evidenceCount} replay recovery record(s) support this proposal.`,
  };
}
