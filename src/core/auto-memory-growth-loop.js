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
} from "./memory-candidate-review-queue.js";

const AUTO_LOOP_FILE = "growth/auto-memory-growth-runs.jsonl";
const MINIMAL_APPROVAL_PATTERNS = [
  ["external_send", /\b(send|email|slack|telegram|webhook|post)\b|전송|발송|텔레그램|이메일|슬랙/i],
  ["public_release", /\b(deploy|publish|release|marketplace|public)\b|배포|공개|마켓플레이스|릴리즈/i],
  ["paid_or_account_action", /결제|구매|환불|계정|로그인|토큰|api key|secret|password|credential|비밀|인증/i],
  ["destructive_or_irreversible", /\b(delete|remove|reset|wipe|destroy|rm -rf)\b|삭제|초기화|파괴|되돌릴 수 없는/i],
  ["identity_or_core_policy_mutation", /정체성|이름을 바꿔|운영 원칙 변경|헌법|core rule|identity|constitution/i],
  ["live_openclaw_or_os_mutation", /live openclaw|openclaw memory|오픈클로 메모리|라이브 오픈클로 직접|session meta/i],
];
const GROWTH_SIGNAL_PATTERNS = [
  ["explicit_memory_request", /\bremember\b|기억(?:해|해줘|해두|하자)|메모리 후보|기억 후보/i],
  ["operating_principle", /\b(from now on|always|never|principle|rule)\b|앞으로|다음부터|항상|절대|운영 원칙|원칙으로|기준으로 고정/i],
  [
    "user_correction",
    /\b(wrong|incorrect|correction)\b|틀렸|잘못(?:했|됐|된|이야|입니다)|그건 아니|그게 아니|정정(?:할게|해|합니다)|(?:방금|이전|네|너의|답변|작업).{0,24}수정해/i,
  ],
  ["repeated_failure", /\b(repeated|again|keeps? failing)\b|또 같은|계속 실패|반복(?:되는|해서|하지)/i],
];

export function autoMemoryGrowthLoopPath({ root } = {}) {
  return resolve(runtimePaths({ root }).runtimeRoot, AUTO_LOOP_FILE);
}

export function buildAutoMemoryGrowthPolicy() {
  return {
    schema: "gpao_t.auto_memory_growth_policy.v0_1",
    status: "ready",
    mode: "automatic_capture_and_replay_explicit_apply",
    automaticAllowed: [
      "growth_signal_classification",
      "source_linked_memory_candidate_capture",
      "memory_review_queue_append",
      "read_only_replay_evidence",
      "self_growth_candidate_record",
      "local_audit_event",
    ],
    explicitApprovalRequired: [
      "local_context_mesh_candidate_apply",
      "live_behavior_change",
      "durable_memory_promotion",
      "external_send_or_connector_activation",
      "public_release_or_marketplace_upload",
      "paid_account_credential_or_secret_action",
      "destructive_or_irreversible_action",
      "identity_constitution_or_global_operating_policy_mutation",
      "live_openclaw_memory_session_meta_or_os_rule_mutation",
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
      "GPAO-T may classify and replay meaningful local growth candidates automatically, but an actual Context Mesh apply always requires traceable user approval.",
  };
}

export function classifyAutoMemoryGrowthSignal({
  text = "",
  signalKind = "auto",
} = {}) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  const allowedKinds = new Set(GROWTH_SIGNAL_PATTERNS.map(([kind]) => kind));
  const explicitKind = allowedKinds.has(signalKind) ? signalKind : null;
  const matchedKinds = explicitKind
    ? [explicitKind]
    : GROWTH_SIGNAL_PATTERNS
        .filter(([, pattern]) => pattern.test(normalized))
        .map(([kind]) => kind);

  return {
    schema: "gpao_t.auto_memory_growth_signal.v0_1",
    status: normalized && matchedKinds.length ? "candidate_worthy" : "not_growth_material",
    kind: matchedKinds[0] || "routine_turn",
    matchedKinds: [...new Set(matchedKinds)],
    candidateWorthy: Boolean(normalized && matchedKinds.length),
    reason: normalized && matchedKinds.length
      ? "The user turn contains an explicit memory, principle, correction, or repeated-failure signal."
      : "A routine answer is not automatically an operating principle or self-growth candidate.",
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
  requestedAction = "capture_and_replay_local_context_mesh_candidate",
  growthSignalText,
  signalKind = "auto",
  applyApproval,
  beforeOutput,
  afterOutput,
  replayCase,
  now = new Date().toISOString(),
} = {}) {
  const normalizedText = String(text || request || "").trim();
  const authority = classifyAutoMemoryGrowthAuthority({
    text: normalizedText,
    requestedAction,
    target,
  });
  const signal = classifyAutoMemoryGrowthSignal({
    text: growthSignalText || request || normalizedText,
    signalKind,
  });
  const approval = summarizeApplyApprovalEvidence(applyApproval);
  const base = {
    schema: "gpao_t.auto_memory_growth_run.v0_1",
    id: `auto_growth.${Date.parse(now) || 0}.${slug(normalizedText || requestedAction || "run")}`,
    createdAt: now,
    request: request || normalizedText,
    target,
    authority,
    signal,
    approval,
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

  if (!signal.candidateWorthy) {
    return appendAutoMemoryGrowthRun({
      root,
      record: {
        ...base,
        status: "not_growth_material",
        findings: ["routine_turn_without_growth_signal"],
        automation: {
          memoryCandidateWritten: false,
          replayWritten: false,
          localContextMeshApplied: false,
          selfGrowthCandidateWritten: false,
        },
        nextSafeAction:
          "Keep the normal chat trace only. Do not turn a routine answer into memory or a self-growth proposal.",
      },
    });
  }

  const safeSource = normalizeSource({ source, text: normalizedText, request, now });
  const safeCandidate = normalizeCandidate({
    candidate,
    text: normalizedText,
    request,
    signal,
    signalText: growthSignalText,
  });
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
    afterOutput: afterOutput ?? "",
    replayCase: replayCase || {
      mode: "harness_generated_default",
      stage: "pre_apply",
      requestRef: null,
      observationRef: null,
      evaluatorRef: null,
      candidatePrincipleInjectedByHarness: false,
    },
  });
  const applyRequest = appendMemoryApplyRequest({
    root,
    candidateRecord: reviewCandidate,
    replayEvidence: replay,
    target,
    approvalState: applyApproval?.state || "not_requested",
    now,
  });
  const approvalAudit = applyApproval && applyRequest.status === "awaiting_approval"
    ? appendMemoryApplyApprovalAuditBridge({
        root,
        applyRequest,
        approval: applyApproval,
        now,
      })
    : null;
  const applyAuthorized = approvalAudit?.status === "recorded_local_only";
  if (!applyAuthorized) {
    const selfGrowthCandidate = buildSelfGrowthCandidate({
      now,
      text: normalizedText,
      reviewCandidate,
      replay,
      applyRequest,
      approval,
      approvalAudit,
      signal,
    });
    const auditEvent = appendAuditEvent({
      type: "auto_memory_growth.review_candidate_captured",
      summary: "Meaningful local growth signal was captured for review without automatic apply.",
      authority: "local_review_only",
      payload: {
        runId: base.id,
        candidateId: reviewCandidate.id,
        replayId: replay.id,
        applyRequestId: applyRequest.id,
        growthCandidateId: selfGrowthCandidate.id,
      },
    }, { root, now });

    return appendAutoMemoryGrowthRun({
      root,
      record: {
        ...base,
        status: "captured_review_only",
        memoryCapture,
        reviewCandidate,
        replay,
        applyRequest,
        approvalAudit,
        reversibleApply: null,
        postApplyReplay: null,
        automaticRollback: null,
        selfGrowthCandidate,
        auditEvent,
        automation: {
          memoryCandidateWritten: reviewCandidate.status === "review_only",
          replayWritten: Boolean(replay.id),
          localContextMeshApplied: false,
          localContextMeshRolledBack: false,
          postApplyReplayPassed: false,
          selfGrowthCandidateWritten: true,
        },
        currentGates: {
          memoryReviewQueue: buildMemoryReviewQueueSummary({ root }),
          memoryApplyGate: buildMemoryApplyGateState({ root, now }),
        },
        findings: collectFindings({ reviewCandidate, replay, applyRequest, approvalAudit }),
        nextSafeAction:
          applyRequest.status === "blocked"
            ? "Keep the candidate review-only until independent replay evidence passes."
            : "Review the source-linked candidate and record approval bound to its candidate, target, scope, and user turn before apply.",
      },
    });
  }
  const reversibleApply = invokeMemoryLocalContextMeshApply({
    root,
    applyRequest,
    approvalAuditBridge: approvalAudit,
    invocationToken: "apply-context-mesh-local",
    now,
  });
  const postApplyReplay = reversibleApply.status === "applied_context_mesh_candidate_local_only"
    ? {
        schema: "gpao_t.auto_memory_growth_post_apply_replay.v0_1",
        status: "pending_independent_post_apply_replay",
        createdAt: now,
        appliedCandidateId: reversibleApply.applyResult.appliedCandidateId,
        requiredStage: "post_apply",
        authority: {
          answerAnchor: "blocked",
          lifecyclePromotion: "blocked_until_independent_replay",
        },
        findings: [],
      }
    : {
        schema: "gpao_t.applied_context_mesh_replay.v0_1",
        status: "blocked",
        createdAt: now,
        findings: ["local_apply_not_recorded"],
      };
  const automaticRollback = null;
  const localApplyKept = reversibleApply.status === "applied_context_mesh_candidate_local_only";
  const selfGrowthCandidate = buildSelfGrowthCandidate({
    now,
    text: normalizedText,
    reviewCandidate,
    replay,
    applyRequest,
    reversibleApply,
    postApplyReplay,
    automaticRollback,
    approval,
    approvalAudit,
    signal,
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
        replayWritten: Boolean(replay.id),
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
        ? "Keep the applied candidate supporting-only until independent post-apply replay promotes its lifecycle; higher-risk memory and OS mutations remain gated."
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
    notGrowthMaterial: runs.filter((run) => run.status === "not_growth_material").length,
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
  const meaningful = classifyAutoMemoryGrowthSignal({ text: "앞으로 이 원칙을 기억해줘." });
  const routine = classifyAutoMemoryGrowthSignal({ text: "오늘 날짜를 알려줘." });
  const findings = [];
  if (policy.invariants.originalSourceCompanion !== "required") findings.push("source_companion_not_required");
  if (policy.invariants.rollbackReceipt !== "required_before_any_local_context_mesh_append") {
    findings.push("rollback_not_required");
  }
  if (safe.status !== "automatic_local_allowed") findings.push("safe_local_not_allowed");
  if (blocked.status !== "approval_required") findings.push("minimal_boundary_not_blocked");
  if (meaningful.status !== "candidate_worthy") findings.push("meaningful_growth_signal_not_detected");
  if (routine.status !== "not_growth_material") findings.push("routine_turn_marked_as_growth");
  if (policy.automaticAllowed.includes("reversible_local_context_mesh_candidate_apply")) {
    findings.push("automatic_context_mesh_apply_still_allowed");
  }
  if (!policy.explicitApprovalRequired.includes("local_context_mesh_candidate_apply")) {
    findings.push("explicit_local_apply_approval_not_required");
  }
  return {
    schema: "gpao_t.auto_memory_growth_verify.v0_1",
    status: findings.length ? "failed" : "passed",
    policy,
    summary,
    probes: { safe, blocked, meaningful, routine },
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

function normalizeCandidate({ candidate, text, request, signal, signalText }) {
  const sourceSignal = String(signalText || request || text || "").replace(/\s+/g, " ").trim();
  const title = candidate?.title || summarizeTitle(sourceSignal || text || request);
  return {
    title,
    operatingPrinciple:
      candidate?.operatingPrinciple ||
      buildCandidateOperatingPrinciple({ signal, sourceSignal, title }),
    reason:
      candidate?.reason ||
      "The user turn contains a specific memory, operating-principle, correction, or repeated-failure signal worth source-linked review.",
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

function buildSelfGrowthCandidate({
  now,
  text,
  reviewCandidate,
  replay,
  applyRequest,
  reversibleApply,
  postApplyReplay,
  automaticRollback,
  approval,
  approvalAudit,
  signal,
}) {
  const applied = reversibleApply?.status === "applied_context_mesh_candidate_local_only";
  return {
    schema: "gpao_t.auto_self_growth_candidate.v0_1",
    id: `autoself.${Date.parse(now) || 0}.${reviewCandidate.id}`,
    createdAt: now,
    status: applied
      ? "applied_after_explicit_user_approval"
      : "review_only_pending_explicit_apply_approval",
    trigger: {
      source: "auto_memory_growth_loop",
      text,
      memoryCandidateId: reviewCandidate.id,
      replayEvidenceId: replay.id,
      applyRequestId: applyRequest.id,
      localApplyRecordId: reversibleApply?.id || null,
      postApplyReplayStatus: postApplyReplay?.status || null,
      automaticRollbackId: automaticRollback?.id || null,
      growthSignalKind: signal?.kind || "unknown",
      approvalEvidenceSupplied: approval?.supplied === true,
      approvalUserTurnRef: approval?.userTurnRef || null,
      approvalReference: approval?.approvalReference || null,
      approvalRecordId: approvalAudit?.approvalReceipt?.ledger?.approvalRecordId || null,
      auditRecordId: approvalAudit?.approvalReceipt?.ledger?.auditRecordId || null,
    },
    proposal: {
      title: "Review a source-linked GPAO-T growth signal",
      operatingPrinciple:
        "A meaningful local signal may be captured and replayed automatically, but Context Mesh apply requires traceable user approval.",
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

function summarizeApplyApprovalEvidence(value) {
  return {
    supplied: Boolean(value),
    decision: value?.decision || null,
    candidateId: value?.candidateId || null,
    target: value?.target
      ? {
          id: value.target.id || null,
          scope: value.target.scope || null,
        }
      : null,
    userTurnRef: String(value?.userTurnRef || "").trim() || null,
    approvalReference: String(value?.approvalReference || "").trim() || null,
    callerBooleanIgnored: typeof value?.approved === "boolean" || typeof value?.state === "string",
    authorityGrantedBySummary: false,
  };
}

function buildCandidateOperatingPrinciple({ signal, sourceSignal, title }) {
  const boundedSignal = sourceSignal.slice(0, 1200);
  if (signal?.kind === "operating_principle") {
    return boundedSignal;
  }
  if (signal?.kind === "user_correction") {
    return `Treat this explicit user correction as a review-only operating constraint: ${boundedSignal}`;
  }
  if (signal?.kind === "repeated_failure") {
    return `Prevent recurrence of this source-linked failure pattern after replay confirms the correction: ${boundedSignal}`;
  }
  if (signal?.kind === "explicit_memory_request") {
    return `Recall this user-specified candidate only when relevant and never above the current explicit request: ${boundedSignal}`;
  }
  return `Keep ${title} as review-only evidence until an operating principle is extracted and replayed.`;
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
