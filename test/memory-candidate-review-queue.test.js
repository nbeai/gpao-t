import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  appendMemoryApplyApprovalAuditBridge,
  appendMemoryReversibleApply,
  appendMemoryReplayEvidence,
  appendMemoryApplyRequest,
  appendMemoryReviewCandidate,
  buildMemoryApplyApprovalAuditBridge,
  buildMemoryApplyRequest,
  buildMemoryLocalApplyInvocationContract,
  buildMemoryReversibleApply,
  buildMemoryReviewCandidate,
  buildMemoryReviewQueueSummary,
  buildMemorySelfGrowthApprovalUx,
  buildReadOnlyMemoryReplay,
  handleGatewayRequest,
  invokeMemoryLocalContextMeshApply,
  invokeMemoryLocalContextMeshRollback,
  readTCellCandidates,
  readMemoryReviewQueue,
  rollbackMemoryReversibleApply,
  verifyMemoryLocalApplyInvocationContract,
  verifyMemoryReviewQueue,
  verifyMemorySelfGrowthApprovalUx,
} from "../src/index.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-memory-review-"));
}

function source() {
  return {
    kind: "openclaw_session",
    refs: ["session:agent:main:main"],
    label: "OpenClaw main session",
    rawExcerpt: "사용자는 OpenClaw를 GPAO-T의 재료로 흡수한다고 설명했다.",
  };
}

function candidate() {
  return {
    title: "OpenClaw absorption direction",
    operatingPrinciple:
      "When changing OpenClaw, treat OpenClaw as the material body being absorbed into GPAO-T.",
    reason: "This prevents sidecar drift and preserves the user's OS-building target.",
    expectedBenefit: "Reduce wrong-frame OpenClaw-only development.",
    invalidConditions: ["The user explicitly asks for an OpenClaw-only improvement."],
    anchor: "openclaw-absorption",
  };
}

describe("GPAO-T memory candidate review queue", () => {
  it("builds review-only candidates without opening durable memory or OpenClaw writes", () => {
    const item = buildMemoryReviewCandidate({
      now: "2026-07-11T00:00:00.000Z",
      request: "오픈클로를 지파오티로 흡수한다.",
      source: source(),
      candidate: candidate(),
    });

    assert.equal(item.schema, "gpao_t.memory_review_candidate.v0_1");
    assert.equal(item.status, "review_only");
    assert.equal(item.sourceTruth.refs[0], "session:agent:main:main");
    assert.equal(item.tcellDraft.lifecycle, "candidate");
    assert.equal(item.tcellDraft.replay.required, true);
    assert.equal(item.authority.blockedUse.includes("durable_memory_promotion"), true);
    assert.equal(item.authority.blockedUse.includes("openclaw_memory_write"), true);
    assert.equal(item.applyGate.status, "blocked");
  });

  it("does not persist blocked candidates when source truth is missing", () => {
    const root = tempRoot();
    const item = appendMemoryReviewCandidate({
      root,
      source: { label: "no source" },
      candidate: { title: "Bad candidate", reason: "No source" },
    });

    assert.equal(item.status, "blocked");
    assert.equal(item.findings.includes("source_truth_missing"), true);
    assert.deepEqual(readMemoryReviewQueue({ root }), []);
  });

  it("records read-only replay evidence and keeps apply gated", () => {
    const root = tempRoot();
    const item = appendMemoryReviewCandidate({
      root,
      now: "2026-07-11T00:00:00.000Z",
      source: source(),
      candidate: candidate(),
    });
    const preview = buildReadOnlyMemoryReplay({
      candidateRecord: item,
      now: "2026-07-11T00:01:00.000Z",
      beforeOutput: "OpenClaw UI를 개선합니다.",
      afterOutput:
        "OpenClaw를 GPAO-T의 material body로 흡수한다는 방향을 유지하며 UI를 개선합니다.",
    });
    const replay = appendMemoryReplayEvidence({
      root,
      candidateRecord: item,
      now: "2026-07-11T00:01:00.000Z",
      beforeOutput: preview.before.output,
      afterOutput: preview.after.output,
    });
    const summary = buildMemoryReviewQueueSummary({ root });

    assert.equal(preview.schema, "gpao_t.memory_replay_evidence.v0_1");
    assert.equal(preview.status, "improved");
    assert.equal(preview.authority.mutationAllowed, false);
    assert.equal(replay.status, "improved");
    assert.equal(summary.counts.candidates, 1);
    assert.equal(summary.counts.replayEvidence, 1);
    assert.equal(summary.counts.applyReady, 1);
    assert.equal(summary.authority.durableMemoryPromotion, "blocked");
  });

  it("builds scoped apply requests without mutating memory targets", () => {
    const root = tempRoot();
    const item = appendMemoryReviewCandidate({
      root,
      now: "2026-07-11T00:00:00.000Z",
      source: source(),
      candidate: candidate(),
    });
    const replay = appendMemoryReplayEvidence({
      root,
      candidateRecord: item,
      now: "2026-07-11T00:01:00.000Z",
      beforeOutput: "OpenClaw만 개선합니다.",
      afterOutput: "OpenClaw를 GPAO-T material body로 흡수하며 개선합니다.",
    });
    const preview = buildMemoryApplyRequest({
      candidateRecord: item,
      replayEvidence: replay,
      target: "context_mesh_candidate",
      approvalState: "requested",
      now: "2026-07-11T00:02:00.000Z",
    });
    const approved = appendMemoryApplyRequest({
      root,
      candidateRecord: item,
      replayEvidence: replay,
      target: "context_mesh_candidate",
      approvalState: "approved_for_apply",
      now: "2026-07-11T00:03:00.000Z",
    });
    const summary = buildMemoryReviewQueueSummary({ root });

    assert.equal(preview.schema, "gpao_t.memory_apply_request.v0_1");
    assert.equal(preview.status, "awaiting_approval");
    assert.equal(preview.target.id, "context_mesh_candidate");
    assert.equal(preview.auditGate.status, "record_required_before_apply");
    assert.equal(preview.rollbackReceipt.status, "planned");
    assert.equal(preview.authority.mutationAllowedNow, false);
    assert.equal(approved.status, "approved_but_not_applied");
    assert.equal(approved.applyEngine.canApplyNow, false);
    assert.equal(summary.counts.applyRequests, 1);
    assert.equal(summary.counts.approvedButNotApplied, 1);
  });

  it("bridges memory apply requests into local approval and audit records only", () => {
    const root = tempRoot();
    const item = appendMemoryReviewCandidate({
      root,
      now: "2026-07-11T00:00:00.000Z",
      source: source(),
      candidate: candidate(),
    });
    const replay = appendMemoryReplayEvidence({
      root,
      candidateRecord: item,
      now: "2026-07-11T00:01:00.000Z",
      beforeOutput: "OpenClaw만 개선합니다.",
      afterOutput: "OpenClaw를 GPAO-T material body로 흡수하며 개선합니다.",
    });
    const applyRequest = appendMemoryApplyRequest({
      root,
      candidateRecord: item,
      replayEvidence: replay,
      target: "context_mesh_candidate",
      approvalState: "requested",
      now: "2026-07-11T00:02:00.000Z",
    });
    const preview = buildMemoryApplyApprovalAuditBridge({
      applyRequest,
      confirmationState: "confirmed_for_local_record_only",
      now: "2026-07-11T00:03:00.000Z",
    });
    const bridge = appendMemoryApplyApprovalAuditBridge({
      root,
      applyRequest,
      confirmationState: "confirmed_for_local_record_only",
      now: "2026-07-11T00:03:00.000Z",
    });
    const summary = buildMemoryReviewQueueSummary({ root });

    assert.equal(preview.status, "record_ready");
    assert.equal(preview.proposal.toolKind, "memory");
    assert.equal(preview.proposal.authorityLevel, "write");
    assert.equal(preview.authority.mutationAllowedNow, false);
    assert.equal(bridge.status, "recorded_local_only");
    assert.equal(bridge.approvalAudit.writeResultStatus, "written_local_only");
    assert.equal(bridge.approvalAudit.approvalRecordId.startsWith("approval."), true);
    assert.equal(bridge.approvalAudit.auditRecordId.startsWith("audit."), true);
    assert.equal(bridge.authority.contextMeshAdmission, "blocked");
    assert.equal(summary.counts.approvalAuditBridges, 1);
    assert.equal(summary.counts.approvalAuditRecorded, 1);
  });

  it("applies approved context mesh candidates locally with a rollback receipt", () => {
    const root = tempRoot();
    const item = appendMemoryReviewCandidate({
      root,
      now: "2026-07-11T00:00:00.000Z",
      source: source(),
      candidate: candidate(),
    });
    const replay = appendMemoryReplayEvidence({
      root,
      candidateRecord: item,
      now: "2026-07-11T00:01:00.000Z",
      beforeOutput: "OpenClaw만 개선합니다.",
      afterOutput: "OpenClaw를 GPAO-T material body로 흡수하며 개선합니다.",
    });
    const applyRequest = appendMemoryApplyRequest({
      root,
      candidateRecord: item,
      replayEvidence: replay,
      target: "context_mesh_candidate",
      approvalState: "approved_for_apply",
      now: "2026-07-11T00:02:00.000Z",
    });
    const bridge = appendMemoryApplyApprovalAuditBridge({
      root,
      applyRequest,
      confirmationState: "confirmed_for_local_record_only",
      now: "2026-07-11T00:03:00.000Z",
    });
    const preview = buildMemoryReversibleApply({
      applyRequest,
      approvalAuditBridge: bridge,
      now: "2026-07-11T00:04:00.000Z",
    });
    const applied = appendMemoryReversibleApply({
      root,
      applyRequest,
      approvalAuditBridge: bridge,
      now: "2026-07-11T00:04:00.000Z",
    });
    const candidates = readTCellCandidates({ root });
    const summary = buildMemoryReviewQueueSummary({ root });

    assert.equal(preview.status, "ready_to_apply_context_mesh_candidate");
    assert.equal(preview.authority.compatibilityMemoryWrite, "blocked");
    assert.equal(applied.status, "applied_context_mesh_candidate_local_only");
    assert.equal(applied.applyResult.beforeLineCount, 0);
    assert.equal(applied.applyResult.afterLineCount, 1);
    assert.equal(applied.rollbackReceipt.status, "recorded");
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].lifecycle, "reviewed");
    assert.equal(candidates[0].authority.blockedUse.includes("automatic_answer_anchor"), true);
    assert.equal(summary.counts.reversibleApplies, 1);
    assert.equal(summary.counts.contextMeshApplied, 1);
  });

  it("blocks reversible apply for live OpenClaw memory targets", () => {
    const root = tempRoot();
    const item = appendMemoryReviewCandidate({
      root,
      now: "2026-07-11T00:00:00.000Z",
      source: source(),
      candidate: candidate(),
    });
    const replay = appendMemoryReplayEvidence({
      root,
      candidateRecord: item,
      now: "2026-07-11T00:01:00.000Z",
      beforeOutput: "OpenClaw만 개선합니다.",
      afterOutput: "OpenClaw를 GPAO-T material body로 흡수하며 개선합니다.",
    });
    const applyRequest = appendMemoryApplyRequest({
      root,
      candidateRecord: item,
      replayEvidence: replay,
      target: "openclaw_memory",
      approvalState: "approved_for_apply",
      now: "2026-07-11T00:02:00.000Z",
    });
    const bridge = appendMemoryApplyApprovalAuditBridge({
      root,
      applyRequest,
      confirmationState: "confirmed_for_local_record_only",
      now: "2026-07-11T00:03:00.000Z",
    });
    const applied = appendMemoryReversibleApply({
      root,
      applyRequest,
      approvalAuditBridge: bridge,
      now: "2026-07-11T00:04:00.000Z",
    });

    assert.equal(applied.status, "blocked");
    assert.equal(applied.findings.includes("target_not_context_mesh_candidate"), true);
    assert.deepEqual(readTCellCandidates({ root }), []);
  });

  it("rolls back applied context mesh candidates without deleting review evidence", () => {
    const root = tempRoot();
    const item = appendMemoryReviewCandidate({
      root,
      now: "2026-07-11T00:00:00.000Z",
      source: source(),
      candidate: candidate(),
    });
    const replay = appendMemoryReplayEvidence({
      root,
      candidateRecord: item,
      now: "2026-07-11T00:01:00.000Z",
      beforeOutput: "OpenClaw만 개선합니다.",
      afterOutput: "OpenClaw를 GPAO-T material body로 흡수하며 개선합니다.",
    });
    const applyRequest = appendMemoryApplyRequest({
      root,
      candidateRecord: item,
      replayEvidence: replay,
      target: "context_mesh_candidate",
      approvalState: "approved_for_apply",
      now: "2026-07-11T00:02:00.000Z",
    });
    const bridge = appendMemoryApplyApprovalAuditBridge({
      root,
      applyRequest,
      confirmationState: "confirmed_for_local_record_only",
      now: "2026-07-11T00:03:00.000Z",
    });
    const applied = appendMemoryReversibleApply({
      root,
      applyRequest,
      approvalAuditBridge: bridge,
      now: "2026-07-11T00:04:00.000Z",
    });
    const rollback = rollbackMemoryReversibleApply({
      root,
      applyRecord: applied,
      now: "2026-07-11T00:05:00.000Z",
    });
    const summary = buildMemoryReviewQueueSummary({ root });

    assert.equal(rollback.status, "rolled_back_context_mesh_candidate_local_only");
    assert.equal(rollback.rollbackResult.beforeLineCount, 1);
    assert.equal(rollback.rollbackResult.afterLineCount, 0);
    assert.deepEqual(readTCellCandidates({ root }), []);
    assert.equal(readMemoryReviewQueue({ root }).length, 6);
    assert.equal(summary.counts.contextMeshRolledBack, 1);
  });

  it("exposes a token-gated local Context Mesh apply and rollback invocation contract", () => {
    const root = tempRoot();
    const item = appendMemoryReviewCandidate({
      root,
      now: "2026-07-11T00:00:00.000Z",
      source: source(),
      candidate: candidate(),
    });
    const replay = appendMemoryReplayEvidence({
      root,
      candidateRecord: item,
      now: "2026-07-11T00:01:00.000Z",
      beforeOutput: "OpenClaw만 개선합니다.",
      afterOutput: "OpenClaw를 GPAO-T material body로 흡수하며 개선합니다.",
    });
    const applyRequest = appendMemoryApplyRequest({
      root,
      candidateRecord: item,
      replayEvidence: replay,
      target: "context_mesh_candidate",
      approvalState: "approved_for_apply",
      now: "2026-07-11T00:02:00.000Z",
    });
    const bridge = appendMemoryApplyApprovalAuditBridge({
      root,
      applyRequest,
      confirmationState: "confirmed_for_local_record_only",
      now: "2026-07-11T00:03:00.000Z",
    });
    const before = buildMemoryLocalApplyInvocationContract({
      root,
      now: "2026-07-11T00:04:00.000Z",
    });
    const blockedApply = invokeMemoryLocalContextMeshApply({
      root,
      applyRequest,
      approvalAuditBridge: bridge,
      invocationToken: "wrong-token",
      now: "2026-07-11T00:05:00.000Z",
    });
    const applied = invokeMemoryLocalContextMeshApply({
      root,
      applyRequest,
      approvalAuditBridge: bridge,
      invocationToken: "apply-context-mesh-local",
      now: "2026-07-11T00:06:00.000Z",
    });
    const after = buildMemoryLocalApplyInvocationContract({
      root,
      postApplyReplayRequest: "이어서 OpenClaw 흡수 방향을 기준으로 지파오티 작업 원칙을 확인해줘.",
      priorFlow: { activeTargetId: "openclaw-absorption" },
      expectedRole: "anchor",
      now: "2026-07-11T00:07:00.000Z",
    });
    const blockedRollback = invokeMemoryLocalContextMeshRollback({
      root,
      applyRecord: applied,
      invocationToken: "wrong-token",
      now: "2026-07-11T00:08:00.000Z",
    });
    const rollback = invokeMemoryLocalContextMeshRollback({
      root,
      applyRecord: applied,
      invocationToken: "rollback-context-mesh-local",
      now: "2026-07-11T00:09:00.000Z",
    });

    assert.equal(before.schema, "gpao_t.memory_local_apply_invocation_contract.v0_1");
    assert.equal(before.status, "ready");
    assert.equal(before.actions.invokeApply.uiEnabledNow, true);
    assert.equal(before.actions.invokeApply.requiredInvocationToken, "apply-context-mesh-local");
    assert.equal(before.actions.invokeApply.blockedTargets.includes("openclaw_memory_write"), true);
    assert.equal(blockedApply.status, "blocked");
    assert.equal(blockedApply.findings.includes("apply_invocation_token_missing_or_invalid"), true);
    assert.equal(applied.status, "applied_context_mesh_candidate_local_only");
    assert.equal(applied.authority.automaticAdmission, "still_blocked_until_context_mesh_admission");
    assert.equal(after.actions.invokeApply.uiEnabledNow, false);
    assert.equal(after.actions.invokeRollback.uiEnabledNow, true);
    assert.equal(after.actions.invokeRollback.requiredInvocationToken, "rollback-context-mesh-local");
    assert.equal(after.authority.compatibilityMemoryWrite, "blocked");
    assert.equal(after.authority.sessionMetaWrite, "blocked");
    assert.equal(blockedRollback.status, "blocked");
    assert.equal(blockedRollback.findings.includes("rollback_invocation_token_missing_or_invalid"), true);
    assert.equal(rollback.status, "rolled_back_context_mesh_candidate_local_only");
    assert.deepEqual(readTCellCandidates({ root }), []);
  });

  it("exposes memory/self-growth approval as separated lanes instead of one-click mutation", () => {
    const root = tempRoot();
    const ux = buildMemorySelfGrowthApprovalUx({
      root,
      now: "2026-07-12T04:20:00.000Z",
    });
    const verification = verifyMemorySelfGrowthApprovalUx({ root });

    assert.equal(ux.schema, "gpao_t.memory_self_growth_approval_ux.v0_1");
    assert.equal(ux.displayMode, "separate_lanes_not_one_click");
    assert.equal(ux.authority.oneClickApproval, "blocked");
    assert.equal(ux.authority.hiddenDurableMemoryWrite, "blocked");
    assert.equal(ux.authority.hiddenRuntimeSourceMemoryWrite, "blocked");
    assert.equal(ux.authority.hiddenSessionMetaWrite, "blocked");
    assert.equal(ux.authority.hiddenExternalSend, "blocked");
    assert.equal(ux.authority.hiddenLiveRuleMutation, "blocked");
    assert.equal(ux.lanes.some((lane) => lane.id === "local_context_mesh_rollback"), true);
    assert.equal(
      ux.separateApprovalGroups.some((group) => group.id === "runtime_source_memory_write" && group.automation === "blocked"),
      true,
    );
    assert.equal(verification.status, "ready");
  });

  it("exposes queue, summary, replay, and verification through the gateway", () => {
    const root = tempRoot();
    const create = handleGatewayRequest({
      root,
      method: "POST",
      path: "/memory/review-candidate",
      body: {
        now: "2026-07-11T00:00:00.000Z",
        source: source(),
        candidate: candidate(),
      },
    });
    const replay = handleGatewayRequest({
      root,
      method: "POST",
      path: "/memory/replay-record",
      body: {
        now: "2026-07-11T00:01:00.000Z",
        candidateRecord: create.body,
        beforeOutput: "OpenClaw만 개선합니다.",
        afterOutput: "OpenClaw를 GPAO-T material body로 흡수하며 개선합니다.",
      },
    });
    const apply = handleGatewayRequest({
      root,
      method: "POST",
      path: "/memory/apply-request",
      body: {
        now: "2026-07-11T00:02:00.000Z",
        candidateRecord: create.body,
        replayEvidence: replay.body,
        target: "gpao_t_memory_wiki",
        approvalState: "requested",
      },
    });
    const approval = handleGatewayRequest({
      root,
      method: "POST",
      path: "/memory/apply-approval-record",
      body: {
        now: "2026-07-11T00:03:00.000Z",
        applyRequest: apply.body,
        confirmationState: "confirmed_for_local_record_only",
      },
    });
    const applyEngine = handleGatewayRequest({
      root,
      method: "POST",
      path: "/memory/apply-engine/apply",
      body: {
        now: "2026-07-11T00:04:00.000Z",
        applyRequest: {
          ...apply.body,
          status: "approved_but_not_applied",
          approvalGate: { ...apply.body.approvalGate, state: "approved_for_apply", passed: true },
        },
        approvalAuditBridge: approval.body,
      },
    });
    const localApplyVerify = handleGatewayRequest({
      root,
      method: "GET",
      path: "/memory/local-apply-invocation/verify",
    });
    const localApplyBlocked = handleGatewayRequest({
      root,
      method: "POST",
      path: "/memory/local-apply/invoke",
      body: {
        now: "2026-07-11T00:05:00.000Z",
        applyRequest: apply.body,
        approvalAuditBridge: approval.body,
        invocationToken: "wrong-token",
      },
    });
    const approvalUx = handleGatewayRequest({
      root,
      method: "GET",
      path: "/memory/self-growth-approval-ux",
    });
    const approvalUxVerify = handleGatewayRequest({
      root,
      method: "GET",
      path: "/memory/self-growth-approval-ux/verify",
    });
    const queue = handleGatewayRequest({ root, method: "GET", path: "/memory/review-queue" });
    const summary = handleGatewayRequest({ root, method: "GET", path: "/memory/review-summary" });

    assert.equal(create.status, 200);
    assert.equal(replay.status, 200);
    assert.equal(apply.status, 200);
    assert.equal(approval.status, 200);
    assert.equal(applyEngine.status, 200);
    assert.equal(localApplyVerify.status, 200);
    assert.equal(localApplyVerify.body.status, "ready");
    assert.equal(localApplyBlocked.body.status, "blocked");
    assert.equal(localApplyBlocked.body.findings.includes("apply_invocation_token_missing_or_invalid"), true);
    assert.equal(approvalUx.status, 200);
    assert.equal(approvalUx.body.authority.oneClickApproval, "blocked");
    assert.equal(approvalUxVerify.status, 200);
    assert.equal(approvalUxVerify.body.status, "ready");
    assert.equal(apply.body.status, "awaiting_approval");
    assert.equal(approval.body.status, "recorded_local_only");
    assert.equal(applyEngine.body.status, "blocked");
    assert.equal(applyEngine.body.findings.includes("target_not_context_mesh_candidate"), true);
    assert.equal(queue.body.length, 10);
    assert.equal(summary.body.counts.applyRequests, 2);
    assert.equal(summary.body.counts.awaitingApproval, 1);
    assert.equal(summary.body.counts.approvalAuditRecorded, 2);
  });

  it("verifies the queue without enabling live mutation", () => {
    const root = tempRoot();
    const result = verifyMemoryReviewQueue({ root });

    assert.equal(result.status, "ready");
    assert.equal(result.summary.authority.durableMemoryPromotion, "blocked");
    assert.equal(result.replay.authority.compatibilityMemoryWrite, "blocked");
    assert.equal(result.applyRequest.status, "awaiting_approval");
    assert.equal(result.approvalAuditBridge.status, "recorded_local_only");
  });

  it("verifies the local apply invocation contract without opening non-local authority", () => {
    const root = tempRoot();
    const result = verifyMemoryLocalApplyInvocationContract({ root });

    assert.equal(result.status, "ready");
    assert.equal(result.before.actions.invokeApply.uiEnabledNow, true);
    assert.equal(result.afterApply.actions.invokeRollback.uiEnabledNow, true);
    assert.equal(result.afterApply.authority.compatibilityMemoryWrite, "blocked");
    assert.equal(result.afterApply.authority.automaticAdmission, "blocked");
    assert.equal(result.rollback.status, "rolled_back_context_mesh_candidate_local_only");
  });
});
