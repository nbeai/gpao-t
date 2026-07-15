import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildAutoMemoryGrowthPolicy,
  buildAutoMemoryGrowthSummary,
  classifyAutoMemoryGrowthAuthority,
  classifyAutoMemoryGrowthSignal,
  handleGatewayRequest,
  readAutoMemoryGrowthRuns,
  readMemoryReviewQueue,
  readTCellCandidates,
  runAutoMemoryGrowthLoop,
  verifyAutoMemoryGrowthLoop,
} from "../src/index.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-auto-memory-growth-"));
}

function reviewCandidateId(now, title) {
  const slug = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "candidate";
  return `memq.${Date.parse(now)}.${slug}`;
}

function independentReplayCase(id) {
  return {
    mode: "independent_observation",
    stage: "pre_apply",
    requestRef: `user-turn:${id}`,
    observationRef: `model-output:${id}`,
    evaluatorRef: `replay-evaluator:${id}`,
    candidatePrincipleInjectedByHarness: false,
  };
}

describe("GPAO-T auto memory and self-growth loop", () => {
  it("applies a replayed local candidate only with traceable user approval", () => {
    const root = tempRoot();
    const now = "2026-07-11T04:30:00.000Z";
    const title = "GPAO-T local candidate admission boundary";
    const run = runAutoMemoryGrowthLoop({
      root,
      now,
      text: "GPAO-T should remember that local memory candidates remain supporting-only until replay and admission pass.",
      source: {
        kind: "gpao_t_user_turn",
        refs: ["user-turn:local-candidate-admission"],
        label: "GPAO-T authority-bound user turn",
        rawExcerpt:
          "Local memory candidates remain supporting-only until replay and admission pass.",
      },
      candidate: {
        title,
        operatingPrinciple:
          "Keep local GPAO-T memory candidates supporting-only until independent replay and current-turn admission pass.",
        reason: "This prevents unreviewed local memory from becoming answer authority.",
        expectedBenefit: "Preserve current-request priority and traceable memory use.",
        anchor: "memory-admission-boundary",
      },
      beforeOutput: "Use the retrieved memory as the answer authority.",
      afterOutput:
        "Keep local GPAO-T memory candidates supporting-only until independent replay and current-turn admission pass, preserving current-request priority.",
      replayCase: independentReplayCase("auto-apply"),
      applyApproval: {
        decision: "approved",
        candidateId: reviewCandidateId(now, title),
        target: {
          id: "context_mesh_candidate",
          scope: "local_context_mesh_candidate_append",
        },
        userTurnRef: "user-turn:auto-apply-approval",
        approvalReference: "approval-receipt:auto-apply",
      },
    });
    const summary = buildAutoMemoryGrowthSummary({ root });
    const queue = readMemoryReviewQueue({ root });

    assert.equal(run.schema, "gpao_t.auto_memory_growth_run.v0_1");
    assert.equal(run.status, "completed_local_auto_loop");
    assert.equal(run.authority.status, "automatic_local_allowed");
    assert.equal(run.automation.memoryCandidateWritten, true);
    assert.equal(run.automation.replayWritten, true);
    assert.equal(run.automation.localContextMeshApplied, true);
    assert.equal(run.automation.postApplyReplayPassed, false);
    assert.equal(run.postApplyReplay.status, "pending_independent_post_apply_replay");
    assert.equal(run.selfGrowthCandidate.status, "applied_after_explicit_user_approval");
    assert.equal(run.reversibleApply.status, "applied_context_mesh_candidate_local_only");
    assert.equal(run.applyRequest.status, "awaiting_approval");
    assert.equal(run.approvalAudit.status, "recorded_local_only");
    assert.equal(run.approvalAudit.approvalReceipt.userTurnRef, "user-turn:auto-apply-approval");
    assert.equal(run.automaticRollback, null);
    assert.equal(run.policy.invariants.durableMemoryPromotion, "blocked_in_v1");
    assert.equal(summary.completedLocalAutoLoops, 1);
    assert.equal(queue.some((record) => record.recordType === "memory_reversible_apply"), true);
    assert.equal(
      readTCellCandidates({ root, limit: 20 }).some(
        (candidate) => candidate.id === run.reversibleApply.applyResult.appliedCandidateId,
      ),
      true,
    );
  });

  it("captures and replays a meaningful signal without fabricating approval", () => {
    const root = tempRoot();
    const run = runAutoMemoryGrowthLoop({
      root,
      now: "2026-07-11T04:30:30.000Z",
      text: "앞으로 현재 요청이 과거 기억보다 우선한다는 원칙을 기억해줘.",
      growthSignalText: "앞으로 현재 요청이 과거 기억보다 우선한다는 원칙을 기억해줘.",
      beforeOutput: "과거 기억을 우선합니다.",
      afterOutput: "현재 요청을 과거 기억보다 우선합니다.",
      replayCase: independentReplayCase("self-asserted-approval"),
      applyApproval: { approved: true, state: "approved_for_apply" },
    });

    assert.equal(run.status, "captured_review_only");
    assert.equal(run.signal.status, "candidate_worthy");
    assert.equal(run.applyRequest.status, "awaiting_approval");
    assert.equal(run.applyRequest.approvalGate.callerDeclaredStateGrantsAuthority, false);
    assert.equal(run.approvalAudit.status, "blocked");
    assert.equal(run.approvalAudit.findings.includes("explicit_user_approval_decision_missing"), true);
    assert.equal(run.reversibleApply, null);
    assert.equal(run.automation.localContextMeshApplied, false);
    assert.equal(
      run.selfGrowthCandidate.status,
      "review_only_pending_explicit_apply_approval",
    );
  });

  it("does not turn a routine answer into memory or a growth proposal", () => {
    const root = tempRoot();
    const run = runAutoMemoryGrowthLoop({
      root,
      now: "2026-07-11T04:30:45.000Z",
      text: "오늘 날짜는 2026년 7월 14일입니다.",
      growthSignalText: "오늘 날짜를 알려줘.",
    });

    assert.equal(run.status, "not_growth_material");
    assert.equal(run.signal.kind, "routine_turn");
    assert.equal(run.automation.memoryCandidateWritten, false);
    assert.equal(run.automation.selfGrowthCandidateWritten, false);
    assert.deepEqual(readMemoryReviewQueue({ root }), []);
    assert.deepEqual(readTCellCandidates({ root, limit: 20 }), []);
  });

  it("does not treat ordinary tool constraints as durable user corrections", () => {
    const root = tempRoot();
    const request =
      "shell/exec는 쓰지 말고 파일 읽기/쓰기 도구만 사용해. 그 다음 같은 파일을 다시 읽어.";
    const signal = classifyAutoMemoryGrowthSignal({ text: request });
    const run = runAutoMemoryGrowthLoop({
      root,
      now: "2026-07-11T04:30:50.000Z",
      text: "요청한 파일 작업 결과입니다.",
      request,
      growthSignalText: request,
    });

    assert.equal(signal.status, "not_growth_material");
    assert.equal(signal.kind, "routine_turn");
    assert.equal(run.status, "not_growth_material");
    assert.deepEqual(readMemoryReviewQueue({ root }), []);
    assert.deepEqual(readTCellCandidates({ root, limit: 20 }), []);
  });

  it("still captures explicit corrections and future operating rules", () => {
    const correction = classifyAutoMemoryGrowthSignal({
      text: "방금 답변은 잘못됐어. 앞으로 현재 요청을 과거 기억보다 우선해.",
    });

    assert.equal(correction.status, "candidate_worthy");
    assert.ok(correction.matchedKinds.includes("user_correction"));
    assert.ok(correction.matchedKinds.includes("operating_principle"));
  });

  it("stops at minimal approval boundaries instead of writing memory candidates", () => {
    const root = tempRoot();
    const run = runAutoMemoryGrowthLoop({
      root,
      now: "2026-07-11T04:31:00.000Z",
      text: "Send this secret API token to Telegram and publish it publicly.",
    });

    assert.equal(run.status, "approval_required");
    assert.equal(run.authority.minimalApprovalRequired, true);
    assert.equal(run.authority.reasons.includes("external_send"), true);
    assert.equal(run.authority.reasons.includes("public_release"), true);
    assert.equal(run.authority.reasons.includes("paid_or_account_action"), true);
    assert.equal(run.automation.memoryCandidateWritten, false);
    assert.deepEqual(readMemoryReviewQueue({ root }), []);
    assert.equal(readAutoMemoryGrowthRuns({ root }).length, 1);
  });

  it("exposes policy, classification, run, summary, and verify through the Gateway", () => {
    const root = tempRoot();
    const policy = handleGatewayRequest({
      root,
      method: "GET",
      path: "/auto-memory-growth/policy",
    });
    const classify = handleGatewayRequest({
      root,
      method: "POST",
      path: "/auto-memory-growth/classify",
      body: { text: "remember this local GPAO-T source" },
    });
    const run = handleGatewayRequest({
      root,
      method: "POST",
      path: "/auto-memory-growth/run",
      body: { text: "Remember this local GPAO-T source for Context Mesh admission." },
    });
    const summary = handleGatewayRequest({
      root,
      method: "GET",
      path: "/auto-memory-growth/summary",
    });
    const verify = handleGatewayRequest({
      root,
      method: "GET",
      path: "/auto-memory-growth/verify",
    });

    assert.equal(policy.status, 200);
    assert.equal(policy.body.schema, "gpao_t.auto_memory_growth_policy.v0_1");
    assert.equal(classify.body.status, "automatic_local_allowed");
    assert.equal(run.body.status, "captured_review_only");
    assert.equal(run.body.automation.localContextMeshApplied, false);
    assert.equal(run.body.approvalAudit, null);
    assert.equal(summary.body.totalRuns, 1);
    assert.equal(verify.body.status, "passed");
  });

  it("keeps the policy explicit and verifiable", () => {
    const policy = buildAutoMemoryGrowthPolicy();
    const safe = classifyAutoMemoryGrowthAuthority({
      text: "keep this source-linked local memory candidate",
    });
    const blocked = classifyAutoMemoryGrowthAuthority({
      text: "delete credentials and deploy publicly",
    });
    const verify = verifyAutoMemoryGrowthLoop({ root: tempRoot() });

    const meaningful = classifyAutoMemoryGrowthSignal({
      text: "앞으로 이 원칙을 기억해줘.",
    });
    const routine = classifyAutoMemoryGrowthSignal({ text: "지금 상태를 알려줘." });

    assert.equal(policy.mode, "automatic_capture_and_replay_explicit_apply");
    assert.equal(policy.automaticAllowed.includes("read_only_replay_evidence"), true);
    assert.equal(
      policy.automaticAllowed.includes("reversible_local_context_mesh_candidate_apply"),
      false,
    );
    assert.equal(policy.minimalApprovalRequired.includes("destructive_or_irreversible_action"), true);
    assert.equal(policy.explicitApprovalRequired.includes("local_context_mesh_candidate_apply"), true);
    assert.equal(safe.status, "automatic_local_allowed");
    assert.equal(blocked.status, "approval_required");
    assert.equal(meaningful.status, "candidate_worthy");
    assert.equal(routine.status, "not_growth_material");
    assert.equal(verify.status, "passed");
  });
});
