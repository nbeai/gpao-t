import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { appendAuditEvent, runtimePaths } from "./storage.js";
import { captureMemoryEntry } from "./memory-wiki.js";
import {
  appendMemoryApplyApprovalAuditBridge,
  appendMemoryApplyRequest,
  appendMemoryReplayEvidence,
  appendMemoryReviewCandidate,
  buildMemoryApplyGateState,
  buildMemoryReviewQueueSummary,
  invokeMemoryLocalContextMeshApply,
  invokeMemoryLocalContextMeshRollback,
} from "./memory-candidate-review-queue.js";
import { buildAppliedContextMeshReplay } from "./context-mesh-replay.js";

const AUTO_LOOP_FILE = "growth/auto-memory-growth-runs.jsonl";
const MINIMAL_APPROVAL_PATTERNS = [
  ["external_send", /\b(send|email|slack|telegram|webhook|post)\b|전송|발송|텔레그램|이메일|슬랙/i],
  ["public_release", /\b(deploy|publish|release|marketplace|public)\b|배포|공개|마켓플레이스|릴리즈/i],
  ["paid_or_account_action", /결제|구매|환불|계정|로그인|토큰|api key|secret|password|credential|비밀|인증/i],
  ["destructive_or_irreversible", /\b(delete|remove|reset|wipe|destroy|rm -rf)\b|삭제|초기화|파괴|되돌릴 수 없는/i],
  ["identity_or_core_policy_mutation", /정체성|이름을 바꿔|운영 원칙 변경|헌법|core rule|identity|constitution/i],
  ["live_openclaw_or_os_mutation", /live openclaw|openclaw memory|오픈클로 메모리|라이브 오픈클로 직접|session meta/i],
];

export function autoMemoryGrowthLoopPath({ root } = {}) {
  return resolve(runtimePaths({ root }).runtimeRoot, AUTO_LOOP_FILE);
}

export function buildAutoMemoryGrowthPolicy() {
  return {
    schema: "gpao_t.auto_memory_growth_policy.v0_1",
    status: "ready",
    mode: "automatic_local_first_except_minimal_authority_boundaries",
    automaticAllowed: [
      "source_linked_memory_candidate_capture",
      "memory_review_queue_append",
      "read_only_replay_evidence",
      "reversible_local_context_mesh_candidate_apply",
      "post_apply_replay",
      "automatic_rollback_on_replay_failure",
      "self_growth_candidate_record",
      "local_audit_event",
    ],
    minimalApprovalRequired: [
      "external_send_or_connector_activation",
      "public_release_or_marketplace_upload",
      "paid_account_credential_or_secret_action",
      "destructive_or_irreversible_action",
      "identity_constitution_or_global_operating_policy_mutation",
      "live_openclaw_memory_session_meta_or_os_rule_mutation",
    ],
    invariants: {
      originalSourceCompanion: "required",
      replayTrace: "required",
      rollbackReceipt: "required_before_any_local_context_mesh_append",
      durableMemoryPromotion: "blocked_in_v1",
      compatibilityMemoryWrite: "blocked_in_v1",
      externalAction: "blocked_in_v1",
    },
    userLine:
      "GPAO-T auto memory/growth writes local candidates automatically, but stops at external, public, paid, secret, destructive, identity, and live OS mutation boundaries.",
  };
}

export function classifyAutoMemoryGrowthAuthority({
  text = "",
  requestedAction = "",
  target = "context_mesh_candidate",
} = {}) {
  const haystack = [text, requestedAction, target].filter(Boolean).join(" ");
  const reasons = MINIMAL_APPROVAL_PATTERNS
    .filter(([, pattern]) => pattern.test(haystack))
    .map(([reason]) => reason);
  const localTarget = target === "context_mesh_candidate" || target === "gpao_t_memory_wiki";
  if (!localTarget) reasons.push("non_local_target");

  return {
    schema: "gpao_t.auto_memory_growth_authority_classification.v0_1",
    status: reasons.length ? "approval_required" : "automatic_local_allowed",
    target,
    reasons: [...new Set(reasons)],
    automaticLocalAllowed: reasons.length === 0,
    minimalApprovalRequired: reasons.length > 0,
  };
}

export function runAutoMemoryGrowthLoop({
  root,
  text = "",
  request = "",
  source,
  candidate,
  target = "context_mesh_candidate",
  requestedAction = "capture_and_apply_local_context_mesh_candidate",
  beforeOutput,
  afterOutput,
  now = new Date().toISOString(),
} = {}) {
  const normalizedText = String(text || request || "").trim();
  const authority = classifyAutoMemoryGrowthAuthority({
    text: normalizedText,
    requestedAction,
    target,
  });
  const base = {
    schema: "gpao_t.auto_memory_growth_run.v0_1",
    id: `auto_growth.${Date.parse(now) || 0}.${slug(normalizedText || requestedAction || "run")}`,
    createdAt: now,
    request: request || normalizedText,
    target,
    authority,
    policy: buildAutoMemoryGrowthPolicy(),
  };

  if (!normalizedText) {
    return appendAutoMemoryGrowthRun({
      root,
      record: {
        ...base,
        status: "blocked",
        findings: ["text_missing"],
        nextSafeAction: "Provide source text before automatic memory/growth capture.",
      },
    });
  }

  if (!authority.automaticLocalAllowed) {
    return appendAutoMemoryGrowthRun({
      root,
      record: {
        ...base,
        status: "approval_required",
        findings: authority.reasons,
        automation: {
          memoryCandidateWritten: false,
          replayWritten: false,
          localContextMeshApplied: false,
          selfGrowthCandidateWritten: false,
        },
        nextSafeAction:
          "Show the approval boundary to the user; do not write memory, OpenClaw state, external connectors, or OS rules automatically.",
      },
    });
  }

  const safeSource = normalizeSource({ source, text: normalizedText, request, now });
  const safeCandidate = normalizeCandidate({ candidate, text: normalizedText, request, now });
  const memoryCapture = captureMemoryEntry({
    root,
    now,
    title: safeCandidate.title,
    body: [
      safeCandidate.operatingPrinciple,
      safeCandidate.reason,
      safeSource.rawExcerpt,
    ].filter(Boolean).join("\n"),
    tags: ["auto-memory-growth", safeCandidate.anchor],
    source: safeSource.kind,
  });
  const reviewCandidate = appendMemoryReviewCandidate({
    root,
    now,
    request: request || normalizedText,
    source: safeSource,
    candidate: safeCandidate,
  });
  const replay = appendMemoryReplayEvidence({
    root,
    candidateRecord: reviewCandidate,
    now,
    beforeOutput: beforeOutput ?? buildDefaultBeforeOutput({ text: normalizedText }),
    afterOutput: afterOutput ?? buildDefaultAfterOutput({ candidate: safeCandidate, text: normalizedText }),
  });
  const applyRequest = appendMemoryApplyRequest({
    root,
    candidateRecord: reviewCandidate,
    replayEvidence: replay,
    target,
    approvalState: "approved_for_apply",
    now,
  });
  const approvalAudit = appendMemoryApplyApprovalAuditBridge({
    root,
    applyRequest,
    confirmationState: "automatic_local_policy_confirmed",
    now,
  });
  const reversibleApply = invokeMemoryLocalContextMeshApply({
    root,
    applyRequest,
    approvalAuditBridge: approvalAudit,
    invocationToken: "apply-context-mesh-local",
    now,
  });
  const postApplyReplay = reversibleApply.status === "applied_context_mesh_candidate_local_only"
    ? buildAppliedContextMeshReplay({
        root,
        request: request || normalizedText,
        priorFlow: {
          flowKey: `auto-memory-growth.${base.id}`,
          activeTargetId: safeCandidate.anchor,
        },
        expectedAnchor: safeCandidate.anchor,
        expectedRole: "anchor",
        now,
      })
    : {
        schema: "gpao_t.applied_context_mesh_replay.v0_1",
        status: "blocked",
        createdAt: now,
        findings: ["local_apply_not_recorded"],
      };
  const automaticRollback = postApplyReplay.status === "passed"
    ? null
    : reversibleApply.status === "applied_context_mesh_candidate_local_only"
      ? invokeMemoryLocalContextMeshRollback({
          root,
          applyRecord: reversibleApply,
          invocationToken: "rollback-context-mesh-local",
          now,
        })
      : null;
  const localApplyKept = reversibleApply.status === "applied_context_mesh_candidate_local_only"
    && postApplyReplay.status === "passed";
  const selfGrowthCandidate = buildSelfGrowthCandidate({
    now,
    text: normalizedText,
    reviewCandidate,
    replay,
    applyRequest,
    reversibleApply,
    postApplyReplay,
    automaticRollback,
  });
  const auditEvent = appendAuditEvent({
    type: localApplyKept
      ? "auto_memory_growth.local_candidate_applied"
      : "auto_memory_growth.local_candidate_rolled_back",
    summary: localApplyKept
      ? "Auto Memory + Self-Growth local Context Mesh loop completed."
      : "Auto Memory + Self-Growth local apply was rolled back after replay did not pass.",
    authority: "local_only",
    payload: {
      runId: base.id,
      candidateId: reviewCandidate.id,
      replayId: replay.id,
      applyRequestId: applyRequest.id,
      approvalAuditId: approvalAudit.id,
      reversibleApplyId: reversibleApply.id,
      postApplyReplayStatus: postApplyReplay.status,
      automaticRollbackId: automaticRollback?.id || null,
      growthCandidateId: selfGrowthCandidate.id,
    },
  }, { root, now });

  return appendAutoMemoryGrowthRun({
    root,
    record: {
      ...base,
      status: localApplyKept
        ? "completed_local_auto_loop"
        : automaticRollback?.status === "rolled_back_context_mesh_candidate_local_only"
          ? "completed_local_auto_loop_rolled_back"
          : "blocked",
      memoryCapture,
      reviewCandidate,
      replay,
      applyRequest,
      approvalAudit,
      reversibleApply,
      postApplyReplay,
      automaticRollback,
      selfGrowthCandidate,
      auditEvent,
      automation: {
        memoryCandidateWritten: reviewCandidate.status === "review_only",
        replayWritten: replay.status === "improved",
        localContextMeshApplied: localApplyKept,
        localContextMeshRolledBack:
          automaticRollback?.status === "rolled_back_context_mesh_candidate_local_only",
        postApplyReplayPassed: postApplyReplay.status === "passed",
        selfGrowthCandidateWritten: true,
      },
      currentGates: {
        memoryReviewQueue: buildMemoryReviewQueueSummary({ root }),
        memoryApplyGate: buildMemoryApplyGateState({ root, now }),
      },
      findings: collectFindings({
        reviewCandidate,
        replay,
        applyRequest,
        approvalAudit,
        reversibleApply,
        postApplyReplay,
        automaticRollback,
      }),
      nextSafeAction: localApplyKept
        ? "Use the applied local candidate only through normal Context Mesh admission; higher-risk memory and OS mutations remain gated."
        : "Keep the source-linked review candidate, inspect replay findings, and do not rely on the rolled-back Context Mesh candidate.",
    },
  });
}

export function readAutoMemoryGrowthRuns({ root, limit = 50 } = {}) {
  const file = autoMemoryGrowthLoopPath({ root });
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => JSON.parse(line));
}

export function buildAutoMemoryGrowthSummary({ root } = {}) {
  const runs = readAutoMemoryGrowthRuns({ root, limit: 500 });
  const latest = runs.at(-1) || null;
  return {
    schema: "gpao_t.auto_memory_growth_summary.v0_1",
    status: runs.length ? "ready" : "empty",
    totalRuns: runs.length,
    completedLocalAutoLoops: runs.filter((run) => run.status === "completed_local_auto_loop").length,
    rolledBackLocalAutoLoops: runs.filter(
      (run) => run.status === "completed_local_auto_loop_rolled_back",
    ).length,
    capturedReviewOnly: runs.filter((run) => run.status === "captured_review_only").length,
    approvalRequired: runs.filter((run) => run.status === "approval_required").length,
    latest,
    policy: buildAutoMemoryGrowthPolicy(),
  };
}

export function verifyAutoMemoryGrowthLoop({ root } = {}) {
  const policy = buildAutoMemoryGrowthPolicy();
  const summary = buildAutoMemoryGrowthSummary({ root });
  const safe = classifyAutoMemoryGrowthAuthority({ text: "remember this local GPAO-T context" });
  const blocked = classifyAutoMemoryGrowthAuthority({ text: "send this secret token to telegram" });
  const findings = [];
  if (policy.invariants.originalSourceCompanion !== "required") findings.push("source_companion_not_required");
  if (policy.invariants.rollbackReceipt !== "required_before_any_local_context_mesh_append") {
    findings.push("rollback_not_required");
  }
  if (safe.status !== "automatic_local_allowed") findings.push("safe_local_not_allowed");
  if (blocked.status !== "approval_required") findings.push("minimal_boundary_not_blocked");
  return {
    schema: "gpao_t.auto_memory_growth_verify.v0_1",
    status: findings.length ? "failed" : "passed",
    policy,
    summary,
    probes: { safe, blocked },
    findings,
  };
}

function appendAutoMemoryGrowthRun({ root, record }) {
  const file = autoMemoryGrowthLoopPath({ root });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(record)}\n`, { flag: "a" });
  return record;
}

function normalizeSource({ source, text, request, now }) {
  return {
    kind: source?.kind || "gpao_t_auto_loop",
    refs: source?.refs?.length ? source.refs : [`auto-loop:${Date.parse(now) || 0}`],
    label: source?.label || "GPAO-T automatic local signal",
    rawExcerpt: source?.rawExcerpt || text || request,
  };
}

function normalizeCandidate({ candidate, text, request }) {
  const title = candidate?.title || summarizeTitle(text || request);
  return {
    title,
    operatingPrinciple:
      candidate?.operatingPrinciple ||
      `Use this source-linked local signal as a Context Mesh candidate for ${title}.`,
    reason:
      candidate?.reason ||
      "The user wants GPAO-T memory and self-growth to automate local context capture while preserving trace, replay, and rollback.",
    expectedBenefit:
      candidate?.expectedBenefit ||
      "Reduce repeated context loss and make GPAO-T improve from local work without asking for every safe memory step.",
    invalidConditions:
      candidate?.invalidConditions ||
      ["The signal asks for external, public, paid, secret, destructive, identity, or live OS mutation."],
    anchor: candidate?.anchor || slug(title),
  };
}

function buildDefaultBeforeOutput({ text }) {
  return `Handle the request without reusing durable local context. Request: ${text}`;
}

function buildDefaultAfterOutput({ candidate, text }) {
  return [
    candidate.operatingPrinciple,
    candidate.reason,
    candidate.expectedBenefit,
    `Request: ${text}`,
  ].join(" ");
}

function buildSelfGrowthCandidate({
  now,
  text,
  reviewCandidate,
  replay,
  applyRequest,
  reversibleApply,
  postApplyReplay,
  automaticRollback,
}) {
  return {
    schema: "gpao_t.auto_self_growth_candidate.v0_1",
    id: `autoself.${Date.parse(now) || 0}.${reviewCandidate.id}`,
    createdAt: now,
    status: "auto_recorded_local_candidate",
    trigger: {
      source: "auto_memory_growth_loop",
      text,
      memoryCandidateId: reviewCandidate.id,
      replayEvidenceId: replay.id,
      applyRequestId: applyRequest.id,
      localApplyRecordId: reversibleApply?.id || null,
      postApplyReplayStatus: postApplyReplay?.status || null,
      automaticRollbackId: automaticRollback?.id || null,
    },
    proposal: {
      title: "Strengthen automatic local memory and self-growth routing",
      operatingPrinciple:
        "When a safe local signal has source truth and replay improvement, GPAO-T may write local Context Mesh candidates automatically and keep higher-risk mutations gated.",
      expectedBenefit:
        "Make GPAO-T feel self-growing without weakening user authority over external, destructive, identity, or live OS changes.",
    },
    authority: {
      localCandidateRecord: "allowed",
      durableMemoryPromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
      osRuleMutation: "blocked",
      externalAction: "blocked",
    },
  };
}

function collectFindings(records) {
  return Object.values(records)
    .flatMap((record) => record?.findings || [])
    .filter(Boolean);
}

function summarizeTitle(text) {
  const trimmed = String(text || "local context").replace(/\s+/g, " ").trim();
  return trimmed.length > 64 ? `${trimmed.slice(0, 61)}...` : trimmed;
}

function slug(value) {
  return String(value || "item")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}
