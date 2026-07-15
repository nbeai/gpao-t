import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  readApprovalRecords,
  readAuditRecords,
  writeApprovalAuditLocalRecords,
} from "./approval-audit-records.js";
import { buildAppliedContextMeshReplay } from "./context-mesh-replay.js";
import { appendTCellCandidate, memoryWikiPaths, readTCellCandidates } from "./memory-wiki.js";
import { runtimePaths } from "./storage.js";

const REVIEW_QUEUE_FILE = "memory/review-queue.jsonl";
const APPLY_TARGETS = new Set([
  "gpao_t_memory_wiki",
  "context_mesh_candidate",
  "openclaw_memory",
  "session_meta",
]);
const APPROVAL_STATES = new Set([
  "not_requested",
  "requested",
  "approved_for_preview",
  "approved_for_apply",
  "rejected",
]);
const LOCAL_CONTEXT_MESH_APPLY_TOKEN = "apply-context-mesh-local";
const LOCAL_CONTEXT_MESH_ROLLBACK_TOKEN = "rollback-context-mesh-local";
const EXPLICIT_APPROVAL_CONFIRMATION = "explicit_user_approval_recorded";
const INDEPENDENT_REPLAY_MODE = "independent_observation";

export function memoryReviewQueuePath({ root } = {}) {
  return resolve(runtimePaths({ root }).runtimeRoot, REVIEW_QUEUE_FILE);
}

export function buildMemoryReviewCandidate({
  source,
  candidate,
  request = "",
  now = new Date().toISOString(),
} = {}) {
  const sourceTruth = normalizeSourceTruth(source);
  const candidateBody = normalizeCandidate(candidate, sourceTruth);
  const blocked = [];
  if (!sourceTruth.refs.length && !sourceTruth.rawExcerpt) blocked.push("source_truth_missing");
  if (!candidateBody.operatingPrinciple) blocked.push("operating_principle_missing");
  if (!candidateBody.reason) blocked.push("candidate_reason_missing");

  return {
    schema: "gpao_t.memory_review_candidate.v0_1",
    recordType: "memory_candidate",
    id: `memq.${Date.parse(now) || 0}.${slug(candidateBody.title || sourceTruth.label || "candidate")}`,
    createdAt: now,
    status: blocked.length ? "blocked" : "review_only",
    request,
    sourceTruth,
    candidate: candidateBody,
    tcellDraft: {
      pi: candidateBody.operatingPrinciple,
      x: [candidateBody.title, candidateBody.reason, sourceTruth.rawExcerpt].filter(Boolean),
      anchor: candidateBody.anchor,
      lifecycle: "candidate",
      invalidConditions: candidateBody.invalidConditions,
      trace: {
        sourceRefs: sourceTruth.refs,
        queueRecordId: "assigned_on_build",
      },
      replay: {
        required: true,
        status: "pending",
      },
    },
    authority: {
      allowedUse: ["review", "local_replay", "explain", "discard"],
      blockedUse: [
        "durable_memory_promotion",
        "openclaw_memory_write",
        "context_mesh_admission",
        "live_rule_mutation",
        "external_send",
      ],
      applyState: "blocked_until_replay_and_explicit_approval",
    },
    applyGate: {
      status: "blocked",
      requires: [
        "source_truth",
        "review_only_candidate",
        "read_only_replay_evidence",
        "scoped_apply_request",
        "rollback_receipt",
      ],
    },
    rollback: {
      current: "delete_or_ignore_review_queue_record_only",
      futureApply: "must_record_target_and_restore_path_before_mutation",
    },
    findings: blocked,
    nextSafeAction: blocked.length
      ? "Repair source truth and candidate fields before replay."
      : "Run read-only replay before any apply request.",
  };
}

export function appendMemoryReviewCandidate({
  root,
  source,
  candidate,
  request,
  now = new Date().toISOString(),
} = {}) {
  const record = buildMemoryReviewCandidate({ source, candidate, request, now });
  if (record.status !== "review_only") {
    return record;
  }
  appendQueueRecord(record, { root });
  return record;
}

export function buildReadOnlyMemoryReplay({
  candidateRecord,
  beforeOutput = "",
  afterOutput = "",
  replayCase,
  now = new Date().toISOString(),
} = {}) {
  if (!candidateRecord || candidateRecord.recordType !== "memory_candidate") {
    return {
      schema: "gpao_t.memory_replay_evidence.v0_2",
      recordType: "memory_replay_evidence",
      status: "blocked",
      createdAt: now,
      findings: ["candidate_record_missing"],
      mutationAllowed: false,
    };
  }

  const expectedTokens = replayTokens([
    candidateRecord.candidate?.operatingPrinciple,
    candidateRecord.candidate?.expectedBenefit,
    candidateRecord.candidate?.reason,
  ].join(" "));
  const beforeScore = scoreOutput(beforeOutput, expectedTokens);
  const afterScore = scoreOutput(afterOutput, expectedTokens);
  const delta = Number((afterScore - beforeScore).toFixed(3));
  const improved = delta > 0;
  const independentReplay = normalizeIndependentReplayCase(replayCase);
  const proofPassed = improved && independentReplay.passed;
  const findings = [
    ...(improved ? [] : ["no_measurable_replay_improvement"]),
    ...independentReplay.findings,
  ];

  return {
    schema: "gpao_t.memory_replay_evidence.v0_2",
    recordType: "memory_replay_evidence",
    id: `memreplay.${Date.parse(now) || 0}.${candidateRecord.id}`,
    candidateId: candidateRecord.id,
    createdAt: now,
    status: proofPassed ? "passed" : "review",
    mode: "read_only_before_after",
    before: {
      output: beforeOutput,
      score: beforeScore,
    },
    after: {
      output: afterOutput,
      score: afterScore,
    },
    delta,
    replayCase: independentReplay.value,
    proof: {
      status: proofPassed ? "passed" : "not_proven",
      independent: independentReplay.passed,
      measurableImprovement: improved,
      candidatePrincipleInjectedByHarness: independentReplay.value.candidatePrincipleInjectedByHarness,
    },
    evidence: {
      expectedTokens,
      interpretation: proofPassed
        ? "An independently referenced replay covered more expected operating-principle signals."
        : "Replay remains review evidence until independent observation references and measurable improvement both pass.",
    },
    authority: {
      mutationAllowed: false,
      durableMemoryPromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
      contextMeshAdmission: proofPassed ? "eligible_for_apply_request_review" : "blocked",
    },
    applyGate: {
      status: proofPassed ? "independent_replay_proof_ready" : "blocked",
      nextRequired: proofPassed
        ? "Create a scoped apply request with target and rollback receipt."
        : "Run an independent replay with request, observation, and evaluator references; keep the candidate review-only.",
    },
    findings,
  };
}

export function appendMemoryReplayEvidence({
  root,
  candidateRecord,
  beforeOutput,
  afterOutput,
  replayCase,
  applyRecord,
  now = new Date().toISOString(),
} = {}) {
  const evidence = buildReadOnlyMemoryReplay({
    candidateRecord,
    beforeOutput,
    afterOutput,
    replayCase,
    now,
  });
  if (evidence.status === "blocked" && evidence.findings?.includes("candidate_record_missing")) {
    return evidence;
  }
  const lifecycleReview = applyRecord
    ? reviewAppliedCandidateLifecycle({ root, candidateRecord, applyRecord, replayEvidence: evidence, now })
    : null;
  const record = lifecycleReview ? { ...evidence, lifecycleReview } : evidence;
  appendQueueRecord(record, { root });
  return record;
}

export function buildMemoryApplyRequest({
  candidateRecord,
  replayEvidence,
  target = "gpao_t_memory_wiki",
  approvalState = "not_requested",
  now = new Date().toISOString(),
} = {}) {
  const normalizedTarget = APPLY_TARGETS.has(target) ? target : "gpao_t_memory_wiki";
  const normalizedApproval = APPROVAL_STATES.has(approvalState) ? approvalState : "not_requested";
  const findings = [];
  if (!candidateRecord || candidateRecord.recordType !== "memory_candidate") {
    findings.push("candidate_record_missing");
  }
  if (!replayEvidence || replayEvidence.recordType !== "memory_replay_evidence") {
    findings.push("replay_evidence_missing");
  }
  if (!isIndependentReplayProof(replayEvidence)) {
    findings.push("independent_replay_proof_missing");
  }
  if (replayEvidence?.candidateId && candidateRecord?.id && replayEvidence.candidateId !== candidateRecord.id) {
    findings.push("candidate_replay_mismatch");
  }

  const targetPolicy = buildTargetPolicy(normalizedTarget);
  const readyForHumanApplyReview = findings.length === 0;

  return {
    schema: "gpao_t.memory_apply_request.v0_2",
    recordType: "memory_apply_request",
    id: `memapply.${Date.parse(now) || 0}.${candidateRecord?.id || "unknown"}`,
    createdAt: now,
    status: readyForHumanApplyReview ? "awaiting_approval" : "blocked",
    candidateId: candidateRecord?.id || null,
    replayEvidenceId: replayEvidence?.id || null,
    target: targetPolicy,
    proposedChange: candidateRecord
      ? {
          title: candidateRecord.candidate.title,
          operatingPrinciple: candidateRecord.candidate.operatingPrinciple,
          anchor: candidateRecord.candidate.anchor,
          sourceRefs: candidateRecord.sourceTruth.refs,
          invalidConditions: candidateRecord.candidate.invalidConditions,
        }
      : null,
    approvalGate: {
      required: true,
      state: "awaiting_explicit_bound_receipt",
      passed: false,
      allowedStates: [...APPROVAL_STATES],
      legacyCallerState: normalizedApproval,
      bindingRequired: [
        "candidate_id",
        "target_id",
        "target_scope",
        "explicit_user_turn_ref",
        "approval_reference",
        "local_approval_record_id",
        "local_audit_record_id",
      ],
      callerDeclaredStateGrantsAuthority: false,
    },
    replayProof: compactReplayProof(replayEvidence),
    auditGate: {
      required: true,
      status: readyForHumanApplyReview ? "record_required_before_apply" : "blocked",
      eventType: "memory.apply_request.reviewed",
      localRecordOnly: true,
    },
    rollbackReceipt: {
      required: true,
      status: readyForHumanApplyReview ? "planned" : "blocked",
      plan: readyForHumanApplyReview
        ? buildRollbackReceipt({ candidateRecord, replayEvidence, targetPolicy })
        : null,
    },
    authority: {
      mutationAllowedNow: false,
      durableMemoryPromotion: "blocked_until_separate_apply_engine",
      compatibilityMemoryWrite: "blocked_until_separate_apply_engine",
      contextMeshAdmission: "blocked_until_separate_apply_engine",
      sessionMetaWrite: "blocked_until_separate_apply_engine",
      externalSend: "blocked",
    },
    applyEngine: {
      implemented: false,
      canApplyNow: false,
      reason:
        "This record scopes and audits the request only; a separate reversible apply engine must perform any mutation.",
    },
    findings,
    nextSafeAction: buildApplyNextSafeAction({ findings, target: normalizedTarget }),
  };
}

export function appendMemoryApplyRequest({
  root,
  candidateRecord,
  replayEvidence,
  target,
  approvalState,
  now = new Date().toISOString(),
} = {}) {
  const request = buildMemoryApplyRequest({
    candidateRecord,
    replayEvidence,
    target,
    approvalState,
    now,
  });
  if (request.status === "blocked") {
    return request;
  }
  appendQueueRecord(request, { root });
  return request;
}

export function buildMemoryApplyApprovalAuditBridge({
  applyRequest,
  approval,
  now = new Date().toISOString(),
} = {}) {
  const findings = [];
  if (!applyRequest || applyRequest.recordType !== "memory_apply_request") {
    findings.push("apply_request_missing");
  }
  if (applyRequest?.status === "blocked") {
    findings.push("apply_request_blocked");
  }
  if (!applyRequest?.rollbackReceipt?.plan) {
    findings.push("rollback_receipt_missing");
  }
  if (!isIndependentReplayProof(applyRequest?.replayProof)) {
    findings.push("independent_replay_proof_missing");
  }
  const approvalBinding = normalizeExplicitApprovalBinding({ approval, applyRequest });
  findings.push(...approvalBinding.findings);
  const proposal = applyRequest && !findings.length
    ? buildApprovalProposalFromApplyRequest(applyRequest, approvalBinding.value)
    : null;

  return {
    schema: "gpao_t.memory_apply_approval_audit_bridge.v0_2",
    recordType: "memory_apply_approval_audit",
    id: `memapproval.${Date.parse(now) || 0}.${applyRequest?.id || "unknown"}`,
    createdAt: now,
    status: findings.length ? "blocked" : "record_ready",
    applyRequestId: applyRequest?.id || null,
    candidateId: applyRequest?.candidateId || null,
    target: applyRequest?.target || null,
    confirmationState: EXPLICIT_APPROVAL_CONFIRMATION,
    approvalBinding: approvalBinding.value,
    proposal,
    approvalAudit: {
      writesLocalApprovalAuditNow: false,
      storage: {
        approvalRecords: ".gpao-t/approval/approval-records.jsonl",
        auditRecords: ".gpao-t/approval/audit-records.jsonl",
      },
      requiredBeforeApplyEngine: true,
    },
    authority: {
      mutationAllowedNow: false,
      durableMemoryPromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
      contextMeshAdmission: "blocked",
      sessionMetaWrite: "blocked",
      externalSend: "blocked",
      localApprovalAuditRecordWrite: findings.length ? "blocked" : "allowed",
    },
    findings,
    nextSafeAction: findings.length
      ? "Repair the apply request before writing approval/audit records."
      : "Write local approval/audit records, then keep apply blocked until a reversible apply engine exists.",
  };
}

export function appendMemoryApplyApprovalAuditBridge({
  root,
  applyRequest,
  approval,
  now = new Date().toISOString(),
} = {}) {
  const bridge = buildMemoryApplyApprovalAuditBridge({
    applyRequest,
    approval,
    now,
  });
  if (bridge.status === "blocked") {
    return bridge;
  }
  const writeResult = writeApprovalAuditLocalRecords({
    root,
    proposal: bridge.proposal,
    request: `Explicit memory apply approval for ${applyRequest.id} from ${bridge.approvalBinding.userTurnRef}`,
    confirmationState: EXPLICIT_APPROVAL_CONFIRMATION,
    now,
  });
  const ledgerVerified = writeResult.status === "written_local_only"
    && writeResult.replay?.status === "ready"
    && writeResult.approvalRecord?.proposalId === bridge.proposal.id
    && writeResult.approvalRecord?.confirmationState === EXPLICIT_APPROVAL_CONFIRMATION
    && writeResult.approvalRecord?.expectedEffect === bridge.proposal.expectedEffect
    && writeResult.auditRecord?.approvalRecordId === writeResult.approvalRecord?.id
    && writeResult.auditRecord?.userConfirmationState === EXPLICIT_APPROVAL_CONFIRMATION
    && writeResult.auditRecord?.expectedEffect === bridge.proposal.expectedEffect;
  const approvalReceipt = ledgerVerified
    ? {
        schema: "gpao_t.memory_apply_approval_receipt.v0_2",
        status: "recorded_and_verified",
        decision: "approved",
        candidateId: bridge.approvalBinding.candidateId,
        target: bridge.approvalBinding.target,
        userTurnRef: bridge.approvalBinding.userTurnRef,
        approvalReference: bridge.approvalBinding.approvalReference,
        applyRequestId: applyRequest.id,
        proposalId: bridge.proposal.id,
        ledger: {
          approvalRecordId: writeResult.approvalRecord.id,
          auditRecordId: writeResult.auditRecord.id,
          approvalRecordPath: ".gpao-t/approval/approval-records.jsonl",
          auditRecordPath: ".gpao-t/approval/audit-records.jsonl",
          replayStatus: writeResult.replay.status,
        },
      }
    : null;
  const record = {
    ...bridge,
    status: ledgerVerified ? "recorded_local_only" : "blocked",
    approvalReceipt,
    approvalAudit: {
      ...bridge.approvalAudit,
      writesLocalApprovalAuditNow: ledgerVerified,
      writeResultStatus: writeResult.status,
      approvalRecordId: writeResult.approvalRecord?.id || null,
      auditRecordId: writeResult.auditRecord?.id || null,
      replayStatus: writeResult.replay?.status || null,
    },
    authority: {
      ...bridge.authority,
      mutationAllowedNow: false,
    },
    findings: ledgerVerified
      ? []
      : (writeResult.findings || ["approval_receipt_or_ledger_verification_failed"]),
    nextSafeAction: ledgerVerified
      ? "Bound approval receipt is recorded locally; verify it against both ledgers before reversible apply."
      : "Repair approval/audit write findings before any apply engine work.",
  };
  if (record.status !== "blocked") {
    appendQueueRecord(record, { root });
  }
  return record;
}

export function buildMemoryReversibleApply({
  root,
  applyRequest,
  approvalAuditBridge,
  now = new Date().toISOString(),
} = {}) {
  const findings = validateReversibleApply({ root, applyRequest, approvalAuditBridge });
  const targetId = applyRequest?.target?.id || null;
  const canApply = findings.length === 0;
  const candidate = canApply
    ? buildContextMeshCandidateFromApplyRequest({ applyRequest, approvalAuditBridge, now })
    : null;

  return {
    schema: "gpao_t.memory_reversible_apply.v0_2",
    recordType: "memory_reversible_apply",
    id: `memapplyrun.${Date.parse(now) || 0}.${applyRequest?.id || "unknown"}`,
    createdAt: now,
    status: canApply ? "ready_to_apply_context_mesh_candidate" : "blocked",
    applyRequestId: applyRequest?.id || null,
    approvalAuditBridgeId: approvalAuditBridge?.id || null,
    approvalReceiptId: approvalAuditBridge?.approvalReceipt?.ledger?.approvalRecordId || null,
    candidateId: applyRequest?.candidateId || null,
    target: applyRequest?.target || null,
    proposedCandidate: candidate,
    authority: {
      mutationAllowedNow: canApply,
      allowedMutation: canApply ? ".gpao-t/memory/tcell-candidates.jsonl append only" : "blocked",
      durableMemoryPromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
      sessionMetaWrite: "blocked",
      externalSend: "blocked",
      automaticAdmission: "blocked",
    },
    rollbackReceipt: {
      required: true,
      status: canApply ? "ready" : "blocked",
      plan: canApply
        ? {
            target: targetId,
            targetFile: ".gpao-t/memory/tcell-candidates.jsonl",
            rollbackAction: "remove appliedCandidateId from Context Mesh candidate JSONL",
            appliedCandidateId: candidate.id,
            applyRequestId: applyRequest.id,
            approvalAuditBridgeId: approvalAuditBridge.id,
          }
        : null,
    },
    findings,
    nextSafeAction: canApply
      ? "Append the Context Mesh candidate as applied-pending-review and record the line-count rollback receipt."
      : "Repair approval, audit, target, and rollback findings before reversible apply.",
  };
}

export function appendMemoryReversibleApply({
  root,
  applyRequest,
  approvalAuditBridge,
  now = new Date().toISOString(),
} = {}) {
  const preview = buildMemoryReversibleApply({ root, applyRequest, approvalAuditBridge, now });
  if (preview.status === "blocked") {
    return preview;
  }
  const paths = memoryWikiPaths({ root });
  const beforeCandidates = readTCellCandidates({ root, limit: 100000 });
  appendTCellCandidate(preview.proposedCandidate, { root });
  const afterCandidates = readTCellCandidates({ root, limit: 100000 });
  const record = {
    ...preview,
    status: "applied_context_mesh_candidate_local_only",
    applyResult: {
      status: "written_local_only",
      targetFile: paths.tcellCandidateFile,
      beforeLineCount: beforeCandidates.length,
      afterLineCount: afterCandidates.length,
      appliedCandidateId: preview.proposedCandidate.id,
    },
    authority: {
      ...preview.authority,
      mutationAllowedNow: false,
      automaticAdmission: "still_blocked_until_context_mesh_admission",
      answerAnchor: "blocked_until_independent_post_apply_replay",
    },
    rollbackReceipt: {
      ...preview.rollbackReceipt,
      status: "recorded",
      receipt: {
        ...preview.rollbackReceipt.plan,
        beforeLineCount: beforeCandidates.length,
        afterLineCount: afterCandidates.length,
        targetFile: paths.tcellCandidateFile,
      },
    },
    nextSafeAction:
      "Run and record an independent post-apply replay before changing lifecycle to reviewed.",
  };
  appendQueueRecord(record, { root });
  return record;
}

export function rollbackMemoryReversibleApply({
  root,
  applyRecord,
  now = new Date().toISOString(),
} = {}) {
  const findings = [];
  if (!applyRecord || applyRecord.recordType !== "memory_reversible_apply") {
    findings.push("apply_record_missing");
  }
  if (applyRecord?.status !== "applied_context_mesh_candidate_local_only") {
    findings.push("apply_record_not_applied");
  }
  const appliedCandidateId =
    applyRecord?.applyResult?.appliedCandidateId ||
    applyRecord?.rollbackReceipt?.receipt?.appliedCandidateId ||
    null;
  if (!appliedCandidateId) findings.push("applied_candidate_id_missing");

  const paths = memoryWikiPaths({ root });
  const before = readTCellCandidates({ root, limit: 100000 });
  const after = before.filter((candidate) => candidate.id !== appliedCandidateId);
  if (before.length === after.length) findings.push("applied_candidate_not_found");

  const base = {
    schema: "gpao_t.memory_reversible_apply_rollback.v0_1",
    recordType: "memory_reversible_apply_rollback",
    id: `memrollback.${Date.parse(now) || 0}.${applyRecord?.id || "unknown"}`,
    createdAt: now,
    applyRecordId: applyRecord?.id || null,
    appliedCandidateId,
    targetFile: paths.tcellCandidateFile,
    authority: {
      mutationAllowedNow: false,
      durableMemoryPromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
      sessionMetaWrite: "blocked",
      externalSend: "blocked",
    },
    findings,
  };

  if (findings.length) {
    return {
      ...base,
      status: "blocked",
      nextSafeAction: "Inspect the apply record and candidate file before rollback.",
    };
  }

  mkdirSync(dirname(paths.tcellCandidateFile), { recursive: true });
  writeFileSync(
    paths.tcellCandidateFile,
    after.map((candidate) => JSON.stringify(candidate)).join("\n") + (after.length ? "\n" : ""),
  );
  const record = {
    ...base,
    status: "rolled_back_context_mesh_candidate_local_only",
    rollbackResult: {
      beforeLineCount: before.length,
      afterLineCount: after.length,
      removedCandidateId: appliedCandidateId,
    },
    nextSafeAction: "Rerun memory review queue tests and keep the original review evidence for trace.",
  };
  appendQueueRecord(record, { root });
  return record;
}

export function buildMemoryLocalApplyInvocationContract({
  root,
  postApplyReplayRequest = "",
  priorFlow,
  expectedRole = "anchor",
  now = new Date().toISOString(),
} = {}) {
  const records = readMemoryReviewQueue({ root, limit: 500 });
  const latestApplyRequest = latestRecord(records, "memory_apply_request");
  const latestApprovalAudit = latestRecord(records, "memory_apply_approval_audit");
  const latestApplyRecord = latestRecord(records, "memory_reversible_apply");
  const latestRollback = latestRecord(records, "memory_reversible_apply_rollback");
  const preview = buildMemoryReversibleApply({
    root,
    applyRequest: latestApplyRequest,
    approvalAuditBridge: latestApprovalAudit,
    now,
  });
  const activeApplyRecord = latestApplyRecord?.status === "applied_context_mesh_candidate_local_only"
    && latestRollback?.applyRecordId !== latestApplyRecord.id
    ? latestApplyRecord
    : null;
  const expectedAnchor = activeApplyRecord?.proposedCandidate?.anchor || null;
  const postApplyReplay = activeApplyRecord && postApplyReplayRequest
    ? buildAppliedContextMeshReplay({
        root,
        request: postApplyReplayRequest,
        priorFlow: priorFlow || { activeTargetId: expectedAnchor },
        expectedAnchor,
        expectedRole,
        now,
      })
    : {
        schema: "gpao_t.applied_context_mesh_replay.v0_1",
        status: activeApplyRecord ? "not_run" : "blocked",
        createdAt: now,
        expectedAnchor,
        authority: blockedLocalApplyAuthority(),
        findings: activeApplyRecord ? ["post_apply_replay_request_missing"] : ["local_apply_record_missing"],
        nextSafeAction: activeApplyRecord
          ? "Run post-apply Context Mesh replay before relying on the applied candidate."
          : "Apply a local Context Mesh candidate before post-apply replay.",
      };

  const canInvokeApply = preview.status === "ready_to_apply_context_mesh_candidate"
    && !activeApplyRecord;
  const canInvokeRollback = Boolean(activeApplyRecord);

  return {
    schema: "gpao_t.memory_local_apply_invocation_contract.v0_1",
    status: canInvokeApply || canInvokeRollback ? "ready" : "blocked",
    createdAt: now,
    target: {
      id: "context_mesh_candidate",
      writePath: ".gpao-t/memory/tcell-candidates.jsonl",
      scope: "local_only",
    },
    latest: {
      applyRequest: compactGateRecord(latestApplyRequest),
      approvalAudit: compactGateRecord(latestApprovalAudit),
      applyRecord: compactGateRecord(latestApplyRecord),
      rollback: compactGateRecord(latestRollback),
    },
    applyPreview: preview,
    actions: {
      invokeApply: {
        status: canInvokeApply ? "enabled_with_token" : "blocked",
        uiMayRenderButton: true,
        uiEnabledNow: canInvokeApply,
        requiredInvocationToken: LOCAL_CONTEXT_MESH_APPLY_TOKEN,
        writes: canInvokeApply ? [".gpao-t/memory/tcell-candidates.jsonl append"] : [],
        blockedTargets: blockedApplyTargets(),
      },
      invokeRollback: {
        status: canInvokeRollback ? "enabled_with_token" : "blocked",
        uiMayRenderButton: true,
        uiEnabledNow: canInvokeRollback,
        requiredInvocationToken: LOCAL_CONTEXT_MESH_ROLLBACK_TOKEN,
        applyRecordId: activeApplyRecord?.id || null,
        writes: canInvokeRollback ? [".gpao-t/memory/tcell-candidates.jsonl rewrite without applied candidate"] : [],
        blockedTargets: blockedApplyTargets(),
      },
    },
    receipts: {
      sourceTruth: Boolean(latestApplyRequest?.proposedChange?.sourceRefs?.length),
      readOnlyReplayEvidence: Boolean(latestApplyRequest?.replayEvidenceId),
      scopedApplyRequest: latestApplyRequest?.target?.id === "context_mesh_candidate",
      localApprovalAuditRecord: latestApprovalAudit?.status === "recorded_local_only",
      rollbackReceipt: preview.rollbackReceipt?.status === "ready" || latestApplyRecord?.rollbackReceipt?.status === "recorded",
      postApplyReplayResult: postApplyReplay.status === "passed",
      lifecycleReviewed: activeApplyRecord
        ? readTCellCandidates({ root, limit: 100000 }).some((candidate) =>
            candidate.id === activeApplyRecord.applyResult?.appliedCandidateId
              && candidate.lifecycle === "reviewed"
          )
        : false,
    },
    postApplyReplay,
    authority: blockedLocalApplyAuthority(),
    userLine:
      "이 레인은 local Context Mesh 후보만 적용/되돌림할 수 있고, 기존 런타임 기억 저장소·durable memory·session meta·외부 전송은 계속 닫습니다.",
    nextSafeAction: canInvokeApply
      ? "Invoke only the local Context Mesh apply action with an explicit token, then run post-apply replay."
      : canInvokeRollback
        ? "Rollback remains available; a review-status replay is not proof and cannot promote lifecycle."
      : "Prepare improved replay, approved scoped apply request, and local approval/audit record before invocation.",
  };
}

export function invokeMemoryLocalContextMeshApply({
  root,
  applyRequest,
  approvalAuditBridge,
  invocationToken,
  now = new Date().toISOString(),
} = {}) {
  if (invocationToken !== LOCAL_CONTEXT_MESH_APPLY_TOKEN) {
    return blockedInvocationResult({
      now,
      action: "context_mesh_apply",
      finding: "apply_invocation_token_missing_or_invalid",
      nextSafeAction: "Provide the exact local apply token only after reviewing the preview and rollback receipt.",
    });
  }
  return appendMemoryReversibleApply({
    root,
    applyRequest,
    approvalAuditBridge,
    now,
  });
}

export function invokeMemoryLocalContextMeshRollback({
  root,
  applyRecord,
  invocationToken,
  now = new Date().toISOString(),
} = {}) {
  if (invocationToken !== LOCAL_CONTEXT_MESH_ROLLBACK_TOKEN) {
    return blockedInvocationResult({
      now,
      action: "context_mesh_rollback",
      finding: "rollback_invocation_token_missing_or_invalid",
      nextSafeAction: "Provide the exact local rollback token only after reviewing the recorded rollback receipt.",
    });
  }
  return rollbackMemoryReversibleApply({
    root,
    applyRecord,
    now,
  });
}

export function readMemoryReviewQueue({ root, limit = 100 } = {}) {
  const file = memoryReviewQueuePath({ root });
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => JSON.parse(line));
}

export function buildMemoryReviewQueueSummary({ root } = {}) {
  const records = readMemoryReviewQueue({ root, limit: 500 });
  const candidates = records.filter((record) => record.recordType === "memory_candidate");
  const replays = records.filter((record) => record.recordType === "memory_replay_evidence");
  const applyRequests = records.filter((record) => record.recordType === "memory_apply_request");
  const approvalAuditBridges = records.filter((record) => record.recordType === "memory_apply_approval_audit");
  const reversibleApplies = records.filter((record) => record.recordType === "memory_reversible_apply");
  const rollbacks = records.filter((record) => record.recordType === "memory_reversible_apply_rollback");
  const replayByCandidate = new Map(replays.map((record) => [record.candidateId, record]));
  const applyByCandidate = new Map(applyRequests.map((record) => [record.candidateId, record]));
  const bridgeByApplyRequest = new Map(approvalAuditBridges.map((record) => [record.applyRequestId, record]));
  const applyRunByApplyRequest = new Map(reversibleApplies.map((record) => [record.applyRequestId, record]));
  const candidateStates = candidates.map((candidate) => {
    const replay = replayByCandidate.get(candidate.id);
    const applyRequest = applyByCandidate.get(candidate.id);
    const bridge = applyRequest ? bridgeByApplyRequest.get(applyRequest.id) : null;
    const applyRun = applyRequest ? applyRunByApplyRequest.get(applyRequest.id) : null;
    return {
      id: candidate.id,
      title: candidate.candidate.title,
      status: applyRequest
        ? applyRequest.status
        : replay
        ? isIndependentReplayProof(replay)
          ? "replay_ready_for_apply_request"
          : "replay_review"
        : "replay_pending",
      source: candidate.sourceTruth.label,
      replayStatus: replay?.status || "pending",
      applyState: applyRun?.status || bridge?.status || applyRequest?.status || replay?.applyGate?.status || candidate.applyGate.status,
      applyTarget: applyRequest?.target?.id || null,
      approvalAuditStatus: bridge?.approvalAudit?.writeResultStatus || null,
      reversibleApplyStatus: applyRun?.status || null,
    };
  });

  return {
    schema: "gpao_t.memory_review_queue_summary.v0_1",
    status: "ready",
    counts: {
      records: records.length,
      candidates: candidates.length,
      replayEvidence: replays.length,
      applyRequests: applyRequests.length,
      approvalAuditBridges: approvalAuditBridges.length,
      reversibleApplies: reversibleApplies.length,
      rollbacks: rollbacks.length,
      applyReady: candidateStates.filter((item) => item.status === "replay_ready_for_apply_request").length,
      awaitingApproval: candidateStates.filter((item) => item.status === "awaiting_approval").length,
      approvedButNotApplied: candidateStates.filter((item) => item.status === "approved_but_not_applied").length,
      approvalAuditRecorded: approvalAuditBridges.filter((item) => item.status === "recorded_local_only").length,
      contextMeshApplied: reversibleApplies.filter((item) => item.status === "applied_context_mesh_candidate_local_only").length,
      contextMeshRolledBack: rollbacks.filter((item) => item.status === "rolled_back_context_mesh_candidate_local_only").length,
    },
    candidateStates,
    authority: {
      durableMemoryPromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
      externalSend: "blocked",
      applyRequiresExplicitApproval: true,
    },
    nextSafeAction:
      "Use improved replay evidence to prepare a scoped apply request; keep all other candidates review-only.",
  };
}

export function buildMemoryApplyGateState({ root, now = new Date().toISOString() } = {}) {
  const summary = buildMemoryReviewQueueSummary({ root });
  const records = readMemoryReviewQueue({ root, limit: 500 });
  const latestCandidate = latestRecord(records, "memory_candidate");
  const latestReplay = latestRecord(records, "memory_replay_evidence");
  const latestApplyRequest = latestRecord(records, "memory_apply_request");
  const latestApprovalAudit = latestRecord(records, "memory_apply_approval_audit");
  const latestReversibleApply = latestRecord(records, "memory_reversible_apply");
  const latestRollback = latestRecord(records, "memory_reversible_apply_rollback");
  const replayReady = summary.counts.applyReady > 0 || isIndependentReplayProof(latestReplay);
  const applyRequestReady = Boolean(latestApplyRequest && latestApplyRequest.status !== "blocked");
  const approvalAuditReady = Boolean(latestApprovalAudit && latestApprovalAudit.status === "recorded_local_only");
  const contextMeshLocalApplyRecorded = summary.counts.contextMeshApplied > 0;

  return {
    schema: "gpao_t.memory_apply_gate_state.v0_1",
    status: "ready_read_only",
    createdAt: now,
    summary,
    activeGate: {
      id: "memory_apply_gate",
      currentStage: resolveApplyGateStage({
        latestCandidate,
        latestReplay,
        latestApplyRequest,
        latestApprovalAudit,
        latestReversibleApply,
        latestRollback,
      }),
      sequence: [
        "source_truth",
        "memory_candidate",
        "replay_evidence",
        "apply_request",
        "approval_audit",
        "reversible_apply",
        "rollback_receipt",
        "post_apply_replay",
      ],
    },
    latest: {
      candidate: compactGateRecord(latestCandidate),
      replay: compactGateRecord(latestReplay),
      applyRequest: compactGateRecord(latestApplyRequest),
      approvalAudit: compactGateRecord(latestApprovalAudit),
      reversibleApply: compactGateRecord(latestReversibleApply),
      rollback: compactGateRecord(latestRollback),
    },
    controls: {
      sourceInspect: {
        status: "allowed",
        mutation: false,
      },
      candidateReview: {
        status: latestCandidate ? "available" : "waiting_for_candidate",
        mutation: false,
      },
      replayPreview: {
        status: latestCandidate ? "allowed" : "blocked_until_candidate",
        mutation: false,
      },
      applyRequest: {
        status: replayReady ? "allowed_after_replay" : "blocked_until_improved_replay",
        mutation: false,
      },
      approvalAuditRecord: {
        status: applyRequestReady ? "allowed_local_record_only" : "blocked_until_apply_request",
        mutation: false,
        actualApply: false,
      },
      reversibleApplyInvocation: {
        status: approvalAuditReady ? "requires_separate_user_action_and_rollback_receipt" : "blocked_until_approval_audit",
        mutation: false,
        uiEnabledNow: false,
      },
      rollbackInvocation: {
        status: contextMeshLocalApplyRecorded ? "available_for_existing_local_context_mesh_apply" : "blocked_until_apply_record",
        mutation: false,
        uiEnabledNow: false,
      },
    },
    targetPolicies: buildApplyGateTargetPolicies(),
    receiptsRequired: [
      "source_truth",
      "read_only_replay_evidence",
      "scoped_apply_request",
      "local_approval_audit_record",
      "rollback_receipt",
      "post_apply_replay_result",
    ],
    authority: {
      mutationAllowedNow: false,
      uiApplyButtonEnabled: false,
      durableMemoryPromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
      sessionMetaWrite: "blocked",
      externalSend: "blocked",
      automaticAdmission: "blocked",
      contextMeshCandidateAppend:
        approvalAuditReady ? "implemented_local_only_but_ui_invocation_blocked" : "blocked_until_approval_audit",
    },
    userLine: "Apply Gate는 기억을 바로 쓰지 않고 replay, 승인, rollback 증거가 모일 때까지 적용 실행을 막습니다.",
    nextSafeAction: approvalAuditReady
      ? "Design the explicit reversible apply invocation UX; keep the button disabled until rollback and post-apply replay proof are visible."
      : "Continue collecting replay, scoped apply request, and local approval/audit evidence before any apply invocation.",
  };
}

export function buildMemorySelfGrowthApprovalUx({
  root,
  now = new Date().toISOString(),
} = {}) {
  const summary = buildMemoryReviewQueueSummary({ root });
  const applyGate = buildMemoryApplyGateState({ root, now });
  const localApply = buildMemoryLocalApplyInvocationContract({ root, now });
  return {
    schema: "gpao_t.memory_self_growth_approval_ux.v0_1",
    status: "ready",
    createdAt: now,
    title: "Memory / Self-Growth Approval",
    displayMode: "separate_lanes_not_one_click",
    summary,
    lanes: [
      {
        id: "source_candidate_capture",
        label: "후보",
        status: "automatic_local_allowed",
        userMeaning: "원본과 함께 기억/자가성장 후보를 로컬 review queue에 자동 기록합니다.",
        writes: [".gpao-t/memory/review-queue.jsonl"],
        requiresUserApprovalNow: false,
        mutationScope: "local_review_only",
      },
      {
        id: "read_only_replay",
        label: "근거",
        status: "automatic_local_allowed",
        userMeaning: "후보가 답변 품질을 실제로 개선하는지 before/after replay로 확인합니다.",
        writes: [".gpao-t/memory/review-queue.jsonl"],
        requiresUserApprovalNow: false,
        mutationScope: "local_evidence_only",
      },
      {
        id: "scoped_apply_request",
        label: "승인",
        status: applyGate.controls.applyRequest.status,
        userMeaning: "어느 대상에 반영할지 범위를 정하지만, 아직 실제 기억 대상은 바꾸지 않습니다.",
        writes: [".gpao-t/memory/review-queue.jsonl"],
        requiresUserApprovalNow: true,
        mutationScope: "request_record_only",
      },
      {
        id: "local_context_mesh_apply",
        label: "적용",
        status: localApply.actions.invokeApply.status,
        userMeaning: "승인된 후보를 local Context Mesh 후보 파일에만 적용합니다.",
        writes: localApply.actions.invokeApply.writes,
        requiresUserApprovalNow: localApply.actions.invokeApply.uiEnabledNow,
        requiredInvocationToken: localApply.actions.invokeApply.requiredInvocationToken,
        mutationScope: "local_context_mesh_candidate_only",
      },
      {
        id: "local_context_mesh_rollback",
        label: "되돌림",
        status: localApply.actions.invokeRollback.status,
        userMeaning: "적용된 local Context Mesh 후보를 롤백 영수증 기준으로 제거합니다.",
        writes: localApply.actions.invokeRollback.writes,
        requiresUserApprovalNow: localApply.actions.invokeRollback.uiEnabledNow,
        requiredInvocationToken: localApply.actions.invokeRollback.requiredInvocationToken,
        mutationScope: "local_context_mesh_candidate_rollback_only",
      },
    ],
    separateApprovalGroups: [
      {
        id: "local_candidate_review",
        label: "로컬 후보/근거 기록",
        automation: "allowed",
        approval: "not_required",
      },
      {
        id: "local_context_mesh_apply",
        label: "로컬 Context Mesh 후보 적용",
        automation: "blocked",
        approval: "explicit_token_required",
      },
      {
        id: "local_context_mesh_rollback",
        label: "로컬 Context Mesh 후보 되돌림",
        automation: "blocked",
        approval: "explicit_token_required",
      },
      {
        id: "durable_memory_promotion",
        label: "Durable Memory 승격",
        automation: "blocked",
        approval: "future_separate_gate_required",
      },
      {
        id: "runtime_source_memory_write",
        label: "기존 런타임 기억 저장소 쓰기",
        automation: "blocked",
        approval: "future_separate_gate_required",
      },
      {
        id: "session_meta_write",
        label: "세션 메타 쓰기",
        automation: "blocked",
        approval: "future_separate_gate_required",
      },
      {
        id: "external_send_or_connector_write",
        label: "외부 전송/커넥터 쓰기",
        automation: "blocked",
        approval: "future_separate_gate_required",
      },
      {
        id: "live_os_rule_mutation",
        label: "라이브 OS 규칙 변경",
        automation: "blocked",
        approval: "future_separate_gate_required",
      },
    ],
    authority: {
      oneClickApproval: "blocked",
      hiddenDurableMemoryWrite: "blocked",
      hiddenRuntimeSourceMemoryWrite: "blocked",
      hiddenSessionMetaWrite: "blocked",
      hiddenExternalSend: "blocked",
      hiddenLiveRuleMutation: "blocked",
      automaticLocalReviewCapture: "allowed",
      automaticLocalEvidenceCapture: "allowed",
    },
    visibleWarnings: [
      "승인은 한 번에 묶이지 않습니다.",
      "원본, 후보, 이유, replay, 적용 대상, rollback이 함께 보일 때만 적용 레인을 엽니다.",
      "기존 런타임 기억 저장소, 세션 메타, durable memory, 외부 전송은 현재 UX에서 실제 적용되지 않습니다.",
    ],
    nextSafeAction:
      localApply.actions.invokeApply.uiEnabledNow
        ? "Show the local Context Mesh apply action with rollback receipt and exact token; keep every non-local lane blocked."
        : "Keep collecting source-linked candidates and replay evidence; expose lanes as review-only until the local apply contract is ready.",
  };
}

export function verifyMemorySelfGrowthApprovalUx({ root } = {}) {
  const ux = buildMemorySelfGrowthApprovalUx({
    root,
    now: "2026-07-12T04:20:00.000Z",
  });
  const findings = [];
  if (ux.schema !== "gpao_t.memory_self_growth_approval_ux.v0_1") findings.push("invalid_schema");
  if (ux.displayMode !== "separate_lanes_not_one_click") findings.push("approval_lanes_not_separated");
  if (ux.authority.oneClickApproval !== "blocked") findings.push("one_click_approval_open");
  if (ux.authority.hiddenDurableMemoryWrite !== "blocked") findings.push("hidden_durable_memory_write_open");
  if (ux.authority.hiddenRuntimeSourceMemoryWrite !== "blocked") findings.push("hidden_runtime_source_memory_write_open");
  if (ux.authority.hiddenSessionMetaWrite !== "blocked") findings.push("hidden_session_meta_write_open");
  if (ux.authority.hiddenExternalSend !== "blocked") findings.push("hidden_external_send_open");
  if (ux.authority.hiddenLiveRuleMutation !== "blocked") findings.push("hidden_live_rule_mutation_open");
  if (!ux.lanes.find((lane) => lane.id === "local_context_mesh_rollback")) findings.push("rollback_lane_missing");
  if (!ux.separateApprovalGroups.find((group) => group.id === "runtime_source_memory_write" && group.automation === "blocked")) {
    findings.push("runtime_source_memory_group_not_blocked");
  }
  if (ux.lanes.some((lane) => lane.id.includes("runtime_source") && lane.writes?.length)) {
    findings.push("runtime_source_write_lane_exposed");
  }

  return {
    schema: "gpao_t.memory_self_growth_approval_ux_verification.v0_1",
    status: findings.length ? "review" : "ready",
    findings,
    ux,
    nextSafeAction: findings.length
      ? "Fix the memory/self-growth approval UX before exposing it in GPAO-T."
      : "Expose this UX state in GPAO-T as the user-facing memory/self-growth control contract.",
  };
}

export function verifyMemoryApplyGateState({ root } = {}) {
  const state = buildMemoryApplyGateState({ root, now: "2026-07-11T03:40:00.000Z" });
  const findings = [];
  if (state.schema !== "gpao_t.memory_apply_gate_state.v0_1") findings.push("invalid_schema");
  if (state.authority.mutationAllowedNow !== false) findings.push("mutation_allowed");
  if (state.authority.uiApplyButtonEnabled !== false) findings.push("ui_apply_button_enabled");
  if (state.authority.durableMemoryPromotion !== "blocked") findings.push("durable_memory_promotion_open");
  if (state.authority.compatibilityMemoryWrite !== "blocked") findings.push("openclaw_memory_write_open");
  if (state.authority.sessionMetaWrite !== "blocked") findings.push("session_meta_write_open");
  if (state.authority.externalSend !== "blocked") findings.push("external_send_open");
  if (state.authority.automaticAdmission !== "blocked") findings.push("automatic_admission_open");
  if (state.controls.approvalAuditRecord.actualApply !== false) findings.push("approval_audit_confused_with_apply");
  if (state.controls.reversibleApplyInvocation.uiEnabledNow !== false) findings.push("reversible_apply_ui_enabled");
  if (!state.receiptsRequired.includes("rollback_receipt")) findings.push("rollback_receipt_not_required");
  if (!state.receiptsRequired.includes("post_apply_replay_result")) findings.push("post_apply_replay_not_required");
  if (!state.targetPolicies.openclaw_memory.blockedUses.includes("write_from_ui_now")) {
    findings.push("runtime_memory_ui_write_not_blocked");
  }

  return {
    schema: "gpao_t.memory_apply_gate_state_verification.v0_1",
    status: findings.length ? "review" : "ready",
    findings,
    state,
    nextSafeAction: findings.length
      ? "Fix Apply Gate state before exposing controls in GPAO-T."
      : "Expose this read-only Apply Gate state in GPAO-T; do not enable apply or rollback controls yet.",
  };
}

export function verifyMemoryLocalApplyInvocationContract({ root } = {}) {
  const candidate = appendMemoryReviewCandidate({
    root,
    now: "2026-07-11T04:00:00.000Z",
    request: "지파오티 로컬 Context Mesh 적용 레인을 검증한다.",
    source: {
      kind: "inherited_runtime_session",
      refs: ["session:agent:main:main"],
      label: "GPAO-T main session",
      rawExcerpt: "사용자는 기존 런타임을 GPAO-T의 재료로 흡수한다고 설명했다.",
    },
    candidate: {
      title: "GPAO-T runtime absorption direction",
      operatingPrinciple:
        "When changing the inherited runtime, treat it as the material body being absorbed into GPAO-T.",
      reason: "This prevents sidecar drift and preserves the user's OS-building target.",
      expectedBenefit: "Reduce wrong-frame upstream-runtime-only development.",
      invalidConditions: ["The user explicitly asks for an upstream-runtime-only improvement."],
      anchor: "openclaw-absorption",
    },
  });
  const replay = appendMemoryReplayEvidence({
    root,
    candidateRecord: candidate,
    now: "2026-07-11T04:01:00.000Z",
    beforeOutput: "기존 런타임만 개선합니다.",
    afterOutput: "기존 런타임을 GPAO-T material body로 흡수하며 개선합니다.",
    replayCase: buildVerificationReplayCase("local-apply", "pre_apply"),
  });
  const applyRequest = appendMemoryApplyRequest({
    root,
    candidateRecord: candidate,
    replayEvidence: replay,
    target: "context_mesh_candidate",
    now: "2026-07-11T04:02:00.000Z",
  });
  const approvalAuditBridge = appendMemoryApplyApprovalAuditBridge({
    root,
    applyRequest,
    approval: buildVerificationApproval(applyRequest, "local-apply"),
    now: "2026-07-11T04:03:00.000Z",
  });
  const before = buildMemoryLocalApplyInvocationContract({
    root,
    now: "2026-07-11T04:04:00.000Z",
  });
  const blockedApply = invokeMemoryLocalContextMeshApply({
    root,
    applyRequest,
    approvalAuditBridge,
    invocationToken: "wrong-token",
    now: "2026-07-11T04:05:00.000Z",
  });
  const applied = invokeMemoryLocalContextMeshApply({
    root,
    applyRequest,
    approvalAuditBridge,
    invocationToken: LOCAL_CONTEXT_MESH_APPLY_TOKEN,
    now: "2026-07-11T04:06:00.000Z",
  });
  const afterApply = buildMemoryLocalApplyInvocationContract({
    root,
    postApplyReplayRequest: "이어서 런타임 흡수 방향을 기준으로 지파오티 작업 원칙을 확인해줘.",
    priorFlow: { activeTargetId: "openclaw-absorption" },
    expectedRole: "anchor",
    now: "2026-07-11T04:07:00.000Z",
  });
  const blockedRollback = invokeMemoryLocalContextMeshRollback({
    root,
    applyRecord: applied,
    invocationToken: "wrong-token",
    now: "2026-07-11T04:08:00.000Z",
  });
  const rollback = invokeMemoryLocalContextMeshRollback({
    root,
    applyRecord: applied,
    invocationToken: LOCAL_CONTEXT_MESH_ROLLBACK_TOKEN,
    now: "2026-07-11T04:09:00.000Z",
  });
  const findings = [];
  if (before.actions.invokeApply.uiEnabledNow !== true) findings.push("apply_not_enabled_after_receipts");
  if (blockedApply.status !== "blocked") findings.push("invalid_apply_token_not_blocked");
  if (applied.status !== "applied_context_mesh_candidate_local_only") findings.push("local_apply_not_recorded");
  if (afterApply.actions.invokeRollback.uiEnabledNow !== true) findings.push("rollback_not_enabled_after_apply");
  if (afterApply.authority.compatibilityMemoryWrite !== "blocked") findings.push("openclaw_memory_write_open");
  if (afterApply.authority.automaticAdmission !== "blocked") findings.push("automatic_admission_open");
  if (blockedRollback.status !== "blocked") findings.push("invalid_rollback_token_not_blocked");
  if (rollback.status !== "rolled_back_context_mesh_candidate_local_only") findings.push("rollback_not_recorded");

  return {
    schema: "gpao_t.memory_local_apply_invocation_contract_verification.v0_1",
    status: findings.length ? "review" : "ready",
    findings,
    before,
    blockedApply,
    applied,
    afterApply,
    blockedRollback,
    rollback,
    nextSafeAction: findings.length
      ? "Fix the local Context Mesh apply invocation contract before live UI wiring."
      : "Expose this contract in the live UI; keep all non-local memory targets blocked.",
  };
}

function normalizeIndependentReplayCase(replayCase) {
  const value = {
    mode: replayCase?.mode || "unverified",
    stage: replayCase?.stage || "pre_apply",
    requestRef: String(replayCase?.requestRef || "").trim() || null,
    observationRef: String(replayCase?.observationRef || "").trim() || null,
    evaluatorRef: String(replayCase?.evaluatorRef || "").trim() || null,
    candidatePrincipleInjectedByHarness:
      replayCase?.candidatePrincipleInjectedByHarness === true,
  };
  const findings = [];
  if (value.mode !== INDEPENDENT_REPLAY_MODE) findings.push("independent_replay_mode_required");
  if (!["pre_apply", "post_apply"].includes(value.stage)) findings.push("replay_stage_invalid");
  if (!value.requestRef) findings.push("replay_request_ref_missing");
  if (!value.observationRef) findings.push("replay_observation_ref_missing");
  if (!value.evaluatorRef) findings.push("replay_evaluator_ref_missing");
  if (value.candidatePrincipleInjectedByHarness) {
    findings.push("candidate_principle_injected_by_harness");
  }
  return { value, findings, passed: findings.length === 0 };
}

function buildVerificationReplayCase(id, stage) {
  return {
    mode: INDEPENDENT_REPLAY_MODE,
    stage,
    requestRef: `fixture-request:${id}`,
    observationRef: `fixture-observation:${id}`,
    evaluatorRef: `fixture-evaluator:${id}`,
    candidatePrincipleInjectedByHarness: false,
  };
}

function buildVerificationApproval(applyRequest, id) {
  return {
    decision: "approved",
    candidateId: applyRequest.candidateId,
    target: {
      id: applyRequest.target.id,
      scope: applyRequest.target.scope,
    },
    userTurnRef: `fixture-user-turn:${id}`,
    approvalReference: `fixture-approval:${id}`,
  };
}

function isIndependentReplayProof(value) {
  return value?.status === "passed"
    && value?.proof?.independent === true
    && value?.proof?.measurableImprovement === true
    && value?.proof?.candidatePrincipleInjectedByHarness !== true;
}

function compactReplayProof(replayEvidence) {
  return {
    status: isIndependentReplayProof(replayEvidence) ? "passed" : "not_proven",
    evidenceId: replayEvidence?.id || null,
    candidateId: replayEvidence?.candidateId || null,
    proof: {
      independent: replayEvidence?.proof?.independent === true,
      measurableImprovement: replayEvidence?.proof?.measurableImprovement === true,
      candidatePrincipleInjectedByHarness:
        replayEvidence?.proof?.candidatePrincipleInjectedByHarness === true,
    },
    replayCase: replayEvidence?.replayCase || null,
  };
}

function normalizeExplicitApprovalBinding({ approval, applyRequest }) {
  const value = {
    decision: approval?.decision || null,
    candidateId: approval?.candidateId || null,
    target: {
      id: approval?.target?.id || null,
      scope: approval?.target?.scope || null,
    },
    userTurnRef: String(approval?.userTurnRef || "").trim() || null,
    approvalReference: String(approval?.approvalReference || "").trim() || null,
  };
  const findings = [];
  if (!approval) findings.push("explicit_user_approval_missing");
  if (approval?.source && !approval?.userTurnRef) {
    findings.push("caller_declared_source_is_not_approval");
  }
  if (value.decision !== "approved") findings.push("explicit_user_approval_decision_missing");
  if (!value.candidateId) findings.push("approval_candidate_id_missing");
  if (value.candidateId && value.candidateId !== applyRequest?.candidateId) {
    findings.push("approval_candidate_mismatch");
  }
  if (value.target.id !== applyRequest?.target?.id) findings.push("approval_target_mismatch");
  if (value.target.scope !== applyRequest?.target?.scope) findings.push("approval_scope_mismatch");
  if (!value.userTurnRef) findings.push("explicit_user_turn_ref_missing");
  if (!value.approvalReference) findings.push("approval_reference_missing");
  return { value, findings };
}

function validateApprovalLedgerReceipt({ root, approvalAuditBridge }) {
  const receipt = approvalAuditBridge?.approvalReceipt;
  if (!root) return ["approval_ledger_readback_required"];
  if (!receipt?.ledger?.approvalRecordId || !receipt?.ledger?.auditRecordId) {
    return ["approval_ledger_receipt_ids_missing"];
  }
  const approvalRecord = readApprovalRecords({ root, limit: 500 })
    .find((record) => record.id === receipt.ledger.approvalRecordId);
  const auditRecord = readAuditRecords({ root, limit: 500 })
    .find((record) => record.id === receipt.ledger.auditRecordId);
  const findings = [];
  if (!approvalRecord) findings.push("approval_record_not_found_in_ledger");
  if (!auditRecord) findings.push("audit_record_not_found_in_ledger");
  if (approvalRecord && approvalRecord.proposalId !== receipt.proposalId) {
    findings.push("approval_ledger_proposal_mismatch");
  }
  if (approvalRecord && approvalRecord.confirmationState !== EXPLICIT_APPROVAL_CONFIRMATION) {
    findings.push("approval_ledger_confirmation_not_explicit");
  }
  if (approvalRecord && approvalRecord.expectedEffect !== approvalAuditBridge?.proposal?.expectedEffect) {
    findings.push("approval_ledger_binding_trace_mismatch");
  }
  if (auditRecord && auditRecord.approvalRecordId !== receipt.ledger.approvalRecordId) {
    findings.push("audit_ledger_approval_record_mismatch");
  }
  if (auditRecord && auditRecord.proposalId !== receipt.proposalId) {
    findings.push("audit_ledger_proposal_mismatch");
  }
  if (auditRecord && auditRecord.userConfirmationState !== EXPLICIT_APPROVAL_CONFIRMATION) {
    findings.push("audit_ledger_confirmation_not_explicit");
  }
  if (auditRecord && auditRecord.expectedEffect !== approvalAuditBridge?.proposal?.expectedEffect) {
    findings.push("audit_ledger_binding_trace_mismatch");
  }
  const binding = approvalAuditBridge?.approvalBinding;
  if (receipt?.candidateId !== binding?.candidateId) findings.push("approval_receipt_binding_candidate_mismatch");
  if (receipt?.target?.id !== binding?.target?.id) findings.push("approval_receipt_binding_target_mismatch");
  if (receipt?.target?.scope !== binding?.target?.scope) findings.push("approval_receipt_binding_scope_mismatch");
  if (receipt?.userTurnRef !== binding?.userTurnRef) findings.push("approval_receipt_binding_user_turn_mismatch");
  if (receipt?.approvalReference !== binding?.approvalReference) {
    findings.push("approval_receipt_binding_reference_mismatch");
  }
  return findings;
}

function reviewAppliedCandidateLifecycle({ root, candidateRecord, applyRecord, replayEvidence, now }) {
  const findings = [];
  if (applyRecord?.recordType !== "memory_reversible_apply"
    || applyRecord?.status !== "applied_context_mesh_candidate_local_only") {
    findings.push("applied_candidate_record_missing");
  }
  if (applyRecord?.candidateId !== candidateRecord?.id) findings.push("applied_candidate_review_mismatch");
  if (!isIndependentReplayProof(replayEvidence)) findings.push("independent_replay_proof_missing");
  if (replayEvidence?.replayCase?.stage !== "post_apply") findings.push("post_apply_replay_stage_required");
  const appliedCandidateId = applyRecord?.applyResult?.appliedCandidateId || null;
  if (!appliedCandidateId) findings.push("applied_candidate_id_missing");

  const paths = memoryWikiPaths({ root });
  const candidates = readTCellCandidates({ root, limit: 100000 });
  const candidateIndex = candidates.findIndex((candidate) => candidate.id === appliedCandidateId);
  if (candidateIndex < 0) findings.push("applied_candidate_not_found");
  if (findings.length) {
    return {
      schema: "gpao_t.memory_candidate_lifecycle_review.v0_2",
      status: "blocked",
      appliedCandidateId,
      findings,
    };
  }

  const current = candidates[candidateIndex];
  candidates[candidateIndex] = {
    ...current,
    lifecycle: "reviewed",
    authority: {
      ...current.authority,
      allowedUse: ["retrieve", "review", "supporting_context", "admit_for_current_turn", "answer_anchor", "explain"],
      blockedUse: (current.authority?.blockedUse || []).filter((use) => use !== "answer_anchor"),
    },
    replay: {
      required: true,
      status: "passed",
      independent: true,
      evidenceId: replayEvidence.id,
      reviewedLifecycleAllowed: true,
      reviewedAt: now,
    },
    trace: {
      ...current.trace,
      lifecycleReviewReplayEvidenceId: replayEvidence.id,
      lifecycleReviewedAt: now,
    },
  };
  mkdirSync(dirname(paths.tcellCandidateFile), { recursive: true });
  writeFileSync(
    paths.tcellCandidateFile,
    `${candidates.map((candidate) => JSON.stringify(candidate)).join("\n")}\n`,
  );
  return {
    schema: "gpao_t.memory_candidate_lifecycle_review.v0_2",
    status: "reviewed_after_independent_replay",
    appliedCandidateId,
    replayEvidenceId: replayEvidence.id,
    previousLifecycle: current.lifecycle,
    lifecycle: "reviewed",
    findings: [],
  };
}

function validateReversibleApply({ root, applyRequest, approvalAuditBridge }) {
  const findings = [];
  if (!applyRequest || applyRequest.recordType !== "memory_apply_request") {
    findings.push("apply_request_missing");
  }
  if (!approvalAuditBridge || approvalAuditBridge.recordType !== "memory_apply_approval_audit") {
    findings.push("approval_audit_bridge_missing");
  }
  if (applyRequest?.status !== "awaiting_approval") {
    findings.push("apply_request_not_ready_for_bound_approval");
  }
  if (approvalAuditBridge?.status !== "recorded_local_only") {
    findings.push("approval_audit_not_recorded");
  }
  if (!isIndependentReplayProof(applyRequest?.replayProof)) {
    findings.push("independent_replay_proof_missing");
  }
  if (applyRequest?.target?.id !== "context_mesh_candidate") {
    findings.push("target_not_context_mesh_candidate");
  }
  if (approvalAuditBridge?.applyRequestId && applyRequest?.id && approvalAuditBridge.applyRequestId !== applyRequest.id) {
    findings.push("approval_apply_request_mismatch");
  }
  if (approvalAuditBridge?.candidateId && applyRequest?.candidateId && approvalAuditBridge.candidateId !== applyRequest.candidateId) {
    findings.push("approval_candidate_mismatch");
  }
  const receipt = approvalAuditBridge?.approvalReceipt;
  if (receipt?.status !== "recorded_and_verified") {
    findings.push("bound_approval_receipt_missing");
  }
  if (receipt?.candidateId !== applyRequest?.candidateId) {
    findings.push("approval_receipt_candidate_mismatch");
  }
  if (receipt?.target?.id !== applyRequest?.target?.id) {
    findings.push("approval_receipt_target_mismatch");
  }
  if (receipt?.target?.scope !== applyRequest?.target?.scope) {
    findings.push("approval_receipt_scope_mismatch");
  }
  if (!receipt?.userTurnRef || !receipt?.approvalReference) {
    findings.push("approval_receipt_user_reference_missing");
  }
  findings.push(...validateApprovalLedgerReceipt({ root, approvalAuditBridge }));
  if (!applyRequest?.rollbackReceipt?.plan) {
    findings.push("rollback_receipt_missing");
  }
  if (!applyRequest?.proposedChange?.operatingPrinciple) {
    findings.push("operating_principle_missing");
  }
  return findings;
}

function latestRecord(records, recordType) {
  return [...records].reverse().find((record) => record.recordType === recordType) || null;
}

function compactGateRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    recordType: record.recordType,
    status: record.status,
    target: record.target?.id || record.target || null,
    candidateId: record.candidateId || null,
    replayEvidenceId: record.replayEvidenceId || null,
  };
}

function resolveApplyGateStage({
  latestCandidate,
  latestReplay,
  latestApplyRequest,
  latestApprovalAudit,
  latestReversibleApply,
  latestRollback,
}) {
  if (latestRollback?.status === "rolled_back_context_mesh_candidate_local_only") return "rollback_receipt";
  if (latestReversibleApply?.status === "applied_context_mesh_candidate_local_only") return "post_apply_replay";
  if (latestApprovalAudit?.status === "recorded_local_only") return "reversible_apply";
  if (latestApplyRequest?.status && latestApplyRequest.status !== "blocked") return "approval_audit";
  if (isIndependentReplayProof(latestReplay)) return "apply_request";
  if (latestCandidate) return "replay_evidence";
  return "source_truth";
}

function buildApplyGateTargetPolicies() {
  return {
    context_mesh_candidate: {
      status: "implemented_local_only_after_approval_audit",
      writePath: ".gpao-t/memory/tcell-candidates.jsonl",
      allowedUses: ["preview", "explicit_reversible_apply_after_gate"],
      blockedUses: ["automatic_admission", "durable_promotion", "external_send", "write_from_ui_now"],
      rollbackRequired: true,
      postApplyReplayRequired: true,
    },
    gpao_t_memory_wiki: {
      status: "design_only_no_apply_engine",
      writePath: ".gpao-t/memory/wiki.json",
      allowedUses: ["preview", "future_design"],
      blockedUses: ["durable_promotion", "write_from_ui_now", "automatic_admission"],
      rollbackRequired: true,
      postApplyReplayRequired: true,
    },
    openclaw_memory: {
      status: "blocked_no_apply_engine",
      writePath: "기존 런타임 기억 저장소",
      allowedUses: ["preview"],
      blockedUses: ["openclaw_memory_write", "write_from_ui_now", "external_send", "automatic_admission"],
      rollbackRequired: true,
      postApplyReplayRequired: true,
    },
    session_meta: {
      status: "blocked_no_apply_engine",
      writePath: "GPAO-T session metadata",
      allowedUses: ["preview"],
      blockedUses: ["session_meta_write", "write_from_ui_now", "automatic_admission"],
      rollbackRequired: true,
      postApplyReplayRequired: true,
    },
  };
}

function blockedApplyTargets() {
  return [
    "durable_memory_promotion",
    "openclaw_memory_write",
    "session_meta_write",
    "connector_write",
    "external_send",
    "automatic_admission",
  ];
}

function blockedLocalApplyAuthority() {
  return {
    mutationAllowedNow: false,
    allowedLocalMutation: "context_mesh_candidate_only_after_token",
    durableMemoryPromotion: "blocked",
    compatibilityMemoryWrite: "blocked",
    sessionMetaWrite: "blocked",
    connectorWrite: "blocked",
    externalSend: "blocked",
    automaticAdmission: "blocked",
  };
}

function blockedInvocationResult({ now, action, finding, nextSafeAction }) {
  return {
    schema: "gpao_t.memory_local_apply_invocation_result.v0_1",
    recordType: "memory_local_apply_invocation",
    id: `memlocalapply.blocked.${Date.parse(now) || 0}.${action}`,
    createdAt: now,
    action,
    status: "blocked",
    authority: blockedLocalApplyAuthority(),
    findings: [finding],
    nextSafeAction,
  };
}

function buildContextMeshCandidateFromApplyRequest({ applyRequest, approvalAuditBridge, now }) {
  const proposed = applyRequest.proposedChange;
  const anchor = proposed.anchor || slug(proposed.title || "memory-apply");
  return {
    id: `tcell.applied.${slug(anchor)}.${Date.parse(now) || 0}`,
    pi: proposed.operatingPrinciple,
    x: [
      proposed.title,
      `Applied from memory review candidate ${applyRequest.candidateId}`,
      `Replay evidence ${applyRequest.replayEvidenceId}`,
    ].filter(Boolean),
    anchor,
    radius: {
      scope: "project",
      validFor: ["follow_up", "artifact_request", "general_request"],
      invalidFor: proposed.invalidConditions?.length
        ? proposed.invalidConditions
        : ["current user request conflicts with this candidate"],
    },
    depth: {
      evidenceStrength: 0.72,
      stability: 0.58,
      replayPassRate: 1,
    },
    source: {
      refs: [
        ...(Array.isArray(proposed.sourceRefs) ? proposed.sourceRefs : []),
        applyRequest.id,
        approvalAuditBridge.id,
      ],
      surface: "memory_review_queue",
      evidenceLevel: "source_replay_and_local_approval_audit",
    },
    relations: {
      supports: [],
      contradicts: [],
      supersedes: [],
      sameSphere: ["tsphere.memory-review-queue", "tsphere.context-mesh-candidates"],
    },
    weights: {
      relevance: 0.7,
      confidence: 0.72,
      freshness: 0.95,
      risk: 0.22,
      cost: 0.08,
    },
    lifecycle: "applied_pending_independent_replay",
    authority: {
      allowedUse: ["retrieve", "review", "candidate_evidence", "supporting_context", "explain"],
      blockedUse: [
        "answer_anchor",
        "durable_promotion",
        "external_action",
        "live_rule_mutation",
        "openclaw_memory_write",
        "automatic_answer_anchor",
      ],
    },
    trace: {
      createdFrom: applyRequest.candidateId,
      applyRequestId: applyRequest.id,
      replayEvidenceId: applyRequest.replayEvidenceId,
      approvalAuditBridgeId: approvalAuditBridge.id,
      approvalRecordId: approvalAuditBridge.approvalAudit?.approvalRecordId || null,
      auditRecordId: approvalAuditBridge.approvalAudit?.auditRecordId || null,
      appliedAt: now,
      approvalReceipt: {
        candidateId: approvalAuditBridge.approvalReceipt.candidateId,
        target: approvalAuditBridge.approvalReceipt.target,
        userTurnRef: approvalAuditBridge.approvalReceipt.userTurnRef,
        approvalReference: approvalAuditBridge.approvalReceipt.approvalReference,
        approvalRecordId: approvalAuditBridge.approvalReceipt.ledger.approvalRecordId,
        auditRecordId: approvalAuditBridge.approvalReceipt.ledger.auditRecordId,
      },
    },
    replay: {
      required: true,
      status: "pending_independent_post_apply_replay",
      reviewedLifecycleAllowed: false,
    },
  };
}

export function verifyMemoryReviewQueue({ root } = {}) {
  const candidate = appendMemoryReviewCandidate({
    root,
    now: "2026-07-11T00:00:00.000Z",
    request: "지파오티 메모리 후보를 안전하게 검토한다.",
    source: {
      kind: "inherited_runtime_session",
      refs: ["session:agent:main:main"],
      label: "GPAO-T main session",
      rawExcerpt: "사용자는 GPAO-T를 기존 런타임 흡수형 OS로 만들고 싶다고 명시했다.",
    },
    candidate: {
      title: "Inherited runtime is GPAO-T material body",
      operatingPrinciple:
        "When changing the inherited runtime, preserve the goal that it is the material body being absorbed into GPAO-T.",
      reason:
        "This prevents sidecar drift and keeps implementation centered on GPAO-T OS completion.",
      expectedBenefit:
        "Reduce wrong-frame development and preserve runtime absorption direction.",
      invalidConditions: ["User explicitly opens a separate upstream-runtime-only improvement task."],
      anchor: "openclaw-absorption",
    },
  });
  const replay = appendMemoryReplayEvidence({
    root,
    candidateRecord: candidate,
    now: "2026-07-11T00:01:00.000Z",
    beforeOutput: "기존 런타임 대시보드를 개선합니다.",
    afterOutput:
      "기존 런타임을 GPAO-T의 재료 몸체로 흡수하는 방향을 유지하며 대시보드를 수정합니다.",
    replayCase: buildVerificationReplayCase("review-queue", "pre_apply"),
  });
  const applyRequest = appendMemoryApplyRequest({
    root,
    candidateRecord: candidate,
    replayEvidence: replay,
    target: "context_mesh_candidate",
    now: "2026-07-11T00:02:00.000Z",
  });
  const approvalAuditBridge = appendMemoryApplyApprovalAuditBridge({
    root,
    applyRequest,
    approval: buildVerificationApproval(applyRequest, "review-queue"),
    now: "2026-07-11T00:03:00.000Z",
  });
  const summary = buildMemoryReviewQueueSummary({ root });
  const findings = [];
  if (candidate.status !== "review_only") findings.push("candidate_not_review_only");
  if (replay.status !== "passed") findings.push("independent_replay_not_passed");
  if (applyRequest.status !== "awaiting_approval") findings.push("apply_request_not_awaiting_approval");
  if (approvalAuditBridge.status !== "recorded_local_only") findings.push("approval_audit_bridge_not_recorded");
  if (summary.counts.candidates !== 1) findings.push("candidate_count_mismatch");
  if (summary.counts.applyRequests !== 1) findings.push("apply_request_count_mismatch");
  if (summary.counts.approvalAuditBridges !== 1) findings.push("approval_audit_bridge_count_mismatch");
  if (summary.authority.durableMemoryPromotion !== "blocked") findings.push("durable_memory_open");

  return {
    schema: "gpao_t.memory_review_queue_verification.v0_1",
    status: findings.length ? "review" : "ready",
    findings,
    candidate,
    replay,
    applyRequest,
    approvalAuditBridge,
    summary,
  };
}

function buildApprovalProposalFromApplyRequest(applyRequest, approvalBinding) {
  const bindingTrace = JSON.stringify({
    candidateId: applyRequest.candidateId,
    targetId: applyRequest.target.id,
    targetScope: applyRequest.target.scope,
    userTurnRef: approvalBinding.userTurnRef,
    approvalReference: approvalBinding.approvalReference,
  });
  return {
    id: `proposal.${applyRequest.id}`,
    source: "gpao_t.memory_apply_request",
    toolKind: "memory",
    actionType: "write",
    authorityLevel: "write",
    expectedEffect: `Record bound memory apply approval without target mutation. binding=${bindingTrace}`,
    risk:
      "User may confuse local approval/audit record with actual memory application, so apply engine remains blocked.",
    rollbackReference: applyRequest.rollbackReceipt.plan.rollbackAction,
    target: applyRequest.target.id,
    targetScope: applyRequest.target.scope,
    applyRequestId: applyRequest.id,
    candidateId: applyRequest.candidateId,
    userTurnRef: approvalBinding.userTurnRef,
    approvalReference: approvalBinding.approvalReference,
  };
}

function buildTargetPolicy(target) {
  const base = {
    id: target,
    scope: target === "context_mesh_candidate"
      ? "local_context_mesh_candidate_append"
      : target === "gpao_t_memory_wiki"
        ? "durable_gpao_t_memory_write"
        : target === "openclaw_memory"
          ? "live_runtime_memory_write"
          : "session_metadata_write",
    mutationNow: false,
    requiresApproval: true,
    requiresRollbackReceipt: true,
  };
  if (target === "gpao_t_memory_wiki") {
    return {
      ...base,
      label: "GPAO-T Memory Wiki",
      writePath: ".gpao-t/memory/wiki.json",
      effect: "promote candidate into source-linked GPAO-T memory wiki entry",
    };
  }
  if (target === "context_mesh_candidate") {
    return {
      ...base,
      label: "Context Mesh Candidate",
      writePath: ".gpao-t/memory/tcell-candidates.jsonl",
      effect: "make candidate available for future retrieval but not automatic admission",
    };
  }
  if (target === "openclaw_memory") {
    return {
      ...base,
      label: "기존 런타임 기억 저장소",
      writePath: "기존 런타임 기억 저장소",
      effect: "write candidate into the inherited runtime memory substrate",
      extraRisk: "live_runtime_source_surface",
    };
  }
  return {
    ...base,
    label: "Session Metadata",
      writePath: "GPAO-T session metadata",
    effect: "attach scoped candidate marker to a session",
  };
}

function buildRollbackReceipt({ candidateRecord, replayEvidence, targetPolicy }) {
  return {
    schema: "gpao_t.memory_apply_rollback_receipt.v0_1",
    target: targetPolicy.id,
    candidateId: candidateRecord.id,
    replayEvidenceId: replayEvidence.id,
    restorePoint: "before_memory_apply_request",
    rollbackAction:
      targetPolicy.id === "openclaw_memory"
        ? "restore inherited runtime memory backup created immediately before apply"
        : `remove or revert record written to ${targetPolicy.writePath}`,
    verificationAfterRollback: [
      "read memory review queue",
      "confirm candidate remains review-only or apply request is reverted",
      "rerun memory candidate review queue tests",
    ],
  };
}

function buildApplyNextSafeAction({ findings, target }) {
  if (findings.length) {
    return "Repair candidate and replay evidence before requesting apply review.";
  }
  return `Review target ${target}, then record explicit approval bound to candidate, scope, user turn, and both local ledgers.`;
}

function appendQueueRecord(record, { root } = {}) {
  const file = memoryReviewQueuePath({ root });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(record)}\n`, { flag: "a" });
  return record;
}

function normalizeSourceTruth(source = {}) {
  return {
    kind: source.kind || "unknown",
    refs: Array.isArray(source.refs) ? source.refs.filter(Boolean) : [],
    label: source.label || source.refs?.[0] || "source",
    rawExcerpt: source.rawExcerpt || "",
    capturedAt: source.capturedAt || null,
    authority: source.authority || "source_truth_only",
  };
}

function normalizeCandidate(candidate = {}, sourceTruth) {
  return {
    title: candidate.title || sourceTruth.label || "Memory candidate",
    operatingPrinciple: candidate.operatingPrinciple || candidate.pi || "",
    reason: candidate.reason || "",
    expectedBenefit: candidate.expectedBenefit || "",
    invalidConditions: Array.isArray(candidate.invalidConditions)
      ? candidate.invalidConditions
      : ["current user request conflicts with this candidate"],
    anchor: candidate.anchor || slug(candidate.title || sourceTruth.label || "candidate"),
    targetSurface: candidate.targetSurface || "gpao_t_review_queue",
  };
}

function replayTokens(text) {
  return [...new Set(String(text)
    .toLowerCase()
    .split(/[\s,.;:!?()[\]{}"'`]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3))];
}

function scoreOutput(output, expectedTokens) {
  const text = String(output).toLowerCase();
  if (!expectedTokens.length) return 0;
  const matched = expectedTokens.filter((token) => text.includes(token)).length;
  return Number((matched / expectedTokens.length).toFixed(3));
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "candidate";
}
