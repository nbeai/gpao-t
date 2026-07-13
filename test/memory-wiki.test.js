import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  appendMemoryApplyApprovalAuditBridge,
  appendMemoryApplyRequest,
  appendMemoryReplayEvidence,
  appendMemoryReviewCandidate,
  appendMemoryReversibleApply,
  buildAppliedReplayInspectorState,
  buildAppliedContextMeshReplay,
  buildMemoryApplyGateState,
  captureMemoryEntry,
  handleGatewayRequest,
  readMemoryWiki,
  readTCellCandidates,
  resolveContextMesh,
  runRuntimeTurn,
  verifyAppliedContextMeshReplay,
  verifyAppliedReplayInspectorState,
  verifyMemoryApplyGateState,
} from "../src/index.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-memory-"));
}

function seedAppliedContextMeshCandidate(root) {
  const candidate = appendMemoryReviewCandidate({
    root,
    now: "2026-07-11T00:00:00.000Z",
    request: "GPAO-T applied context mesh replay seed",
    source: {
      kind: "openclaw_live_dashboard",
      refs: ["session:agent:main:main", "docs:GPAO-T-OPENCLAW-ABSORPTION-ONE-STOP-2026-07-11.md"],
      label: "Live OpenClaw memory review state",
      rawExcerpt: "GPAO-T memory candidates must stay review-only until replay, apply request, and rollback receipt exist.",
    },
    candidate: {
      title: "Live OpenClaw memory candidates stay review-only before replay",
      operatingPrinciple:
        "When GPAO-T extracts memory candidates from live OpenClaw state, keep them review-only until source truth, replay evidence, apply request, and rollback receipt exist.",
      reason: "This prevents raw session state or UI signals from becoming durable memory or runtime authority too early.",
      expectedBenefit: "Preserve source trace and reduce unsafe memory promotion while developing GPAO-T inside OpenClaw.",
      invalidConditions: ["The user explicitly opens a broader durable memory promotion task."],
      anchor: "memory-review-queue",
    },
  });
  const replay = appendMemoryReplayEvidence({
    root,
    candidateRecord: candidate,
    now: "2026-07-11T00:01:00.000Z",
    beforeOutput: "메모리를 저장합니다.",
    afterOutput:
      "OpenClaw live state에서 추출한 memory candidate는 source truth, replay evidence, apply request, rollback receipt 전까지 review-only로 유지합니다.",
  });
  const applyRequest = appendMemoryApplyRequest({
    root,
    candidateRecord: candidate,
    replayEvidence: replay,
    target: "context_mesh_candidate",
    approvalState: "approved_for_apply",
    now: "2026-07-11T00:02:00.000Z",
  });
  const bridge = appendMemoryApplyApprovalAuditBridge({
    root,
    applyRequest,
    confirmationState: "confirmed_for_local_context_mesh_apply",
    now: "2026-07-11T00:03:00.000Z",
  });
  return appendMemoryReversibleApply({
    root,
    applyRequest,
    approvalAuditBridge: bridge,
    now: "2026-07-11T00:04:00.000Z",
  });
}

describe("GPAO-T Memory Wiki and Context Mesh", () => {
  it("captures wiki entries as T-cell candidates without durable promotion", () => {
    const root = tempRoot();
    const result = captureMemoryEntry({
      root,
      title: "배포파일 meaning",
      body: "In a GPAO-T packaging flow, 배포파일 means GPAO-T Operating Package before older BEAI Harness archives.",
      now: "2026-07-08T00:00:00.000Z",
    });
    const wiki = readMemoryWiki({ root });
    const candidates = readTCellCandidates({ root });

    assert.equal(result.status, "captured_as_candidate");
    assert.equal(wiki.entries.length, 1);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].anchor, "release-file");
    assert.equal(candidates[0].lifecycle, "candidate");
    assert.ok(candidates[0].authority.blockedUse.includes("durable_promotion"));
  });

  it("resolves 배포파일 candidate before turn admission", () => {
    const root = tempRoot();
    captureMemoryEntry({
      root,
      title: "GPAO package noun binding",
      body: "배포파일 should resolve to GPAO-T Operating Package in this product flow.",
    });
    const mesh = resolveContextMesh({
      root,
      request: "그럼 배포파일은?",
      inputSignal: { kind: "follow_up" },
      activeTargetId: "release-file",
    });

    assert.equal(mesh.status, "ready");
    assert.equal(mesh.retrievedCandidates[0].anchor, "release-file");
    assert.match(mesh.retrievedCandidates[0].pi, /GPAO-T Operating Package/);
    assert.match(mesh.boundary, /not admitted context/);
  });

  it("keeps release-file candidates supporting-only for general Work Surface requests", () => {
    const root = tempRoot();
    captureMemoryEntry({
      root,
      title: "GPAO package noun binding",
      body: "배포파일 should resolve to GPAO-T Operating Package in this product flow.",
    });
    const mesh = resolveContextMesh({
      root,
      request: "GPAO-T 첫 로컬 작업 루프를 검증하고 다음 안전 행동을 정리해줘.",
      inputSignal: { kind: "general_request" },
      activeTargetId: "release-file",
    });

    assert.equal(mesh.activeTargetId, "general-runtime");
    assert.equal(mesh.requestPolicy.requestType, "work_surface_general_request");
    assert.equal(mesh.retrievedCandidates[0].anchor, "release-file");
    assert.equal(mesh.retrievedCandidates[0].admissionRole, "stale_supporting");
    assert.equal(mesh.retrievedCandidates[0].answerAnchorEligible, false);
    assert.match(mesh.retrievedCandidates[0].downgradeReason, /general Work Surface/);
  });

  it("feeds retrieved Memory Wiki T-cell candidates into the turn admission packet", () => {
    const root = tempRoot();
    captureMemoryEntry({
      root,
      title: "GPAO package noun binding",
      body: "배포파일 should resolve to GPAO-T Operating Package in this product flow.",
    });
    const result = runRuntimeTurn({
      root,
      input: { text: "그럼 배포파일은?" },
      priorFlow: { flowKey: "gpao-t-dev-flow", activeTargetId: "release-file" },
    });
    const admittedIds = result.admissionPacket.admittedCells.map((cell) => cell.id);

    assert.equal(result.contextRuntime.memoryWiki.retrievedCandidateCount, 1);
    assert.equal(result.contextRuntime.mesh.status, "ready");
    assert.equal(admittedIds.some((id) => id.includes("tcell.candidate")), true);
    assert.equal(result.taskPacket.activeTargetId, "release-file");
  });

  it("does not admit release-file Memory Wiki candidates as anchors for general work requests", () => {
    const root = tempRoot();
    captureMemoryEntry({
      root,
      title: "GPAO package noun binding",
      body: "배포파일 should resolve to GPAO-T Operating Package in this product flow.",
    });
    const result = runRuntimeTurn({
      root,
      input: { text: "GPAO-T 첫 로컬 작업 루프를 검증하고 다음 안전 행동을 정리해줘." },
      priorFlow: { flowKey: "gpao-t-dev-flow", activeTargetId: "release-file" },
    });
    const releaseCandidate = result.admissionPacket.admittedCells.find((cell) => (
      cell.id.includes("tcell.candidate") && cell.cell.anchor === "release-file"
    ));

    assert.equal(result.taskPacket.activeTargetId, "general-runtime");
    assert.equal(result.taskPacket.requestType, "work_surface_general_request");
    assert.equal(result.taskPacket.stalePriorTarget, true);
    assert.equal(releaseCandidate?.role, "support");
    assert.equal(releaseCandidate?.cell.admissionRole, "stale_supporting");
  });

  it("exposes memory and mesh through the local gateway contract", () => {
    const root = tempRoot();
    const capture = handleGatewayRequest({
      root,
      method: "POST",
      path: "/memory/capture",
      body: {
        title: "GPAO package noun binding",
        body: "배포파일 means GPAO-T Operating Package.",
      },
    });
    const resolve = handleGatewayRequest({
      root,
      method: "POST",
      path: "/mesh/resolve",
      body: {
        request: "그럼 배포파일은?",
        inputSignal: { kind: "follow_up" },
        activeTargetId: "release-file",
      },
    });

    assert.equal(capture.status, 200);
    assert.equal(resolve.status, 200);
    assert.equal(resolve.body.retrievedCandidates[0].anchor, "release-file");
  });

  it("replays applied Context Mesh candidates as anchors only for the active target", () => {
    const root = tempRoot();
    const applied = seedAppliedContextMeshCandidate(root);
    const replay = buildAppliedContextMeshReplay({
      root,
      request: "이어서 그 기준으로 지파오티 메모리 적용 원칙을 확인해줘.",
      priorFlow: { flowKey: "gpao-t-memory-flow", activeTargetId: "memory-review-queue" },
      expectedAnchor: "memory-review-queue",
      expectedRole: "anchor",
      now: "2026-07-11T00:05:00.000Z",
    });

    assert.equal(applied.status, "applied_context_mesh_candidate_local_only");
    assert.equal(replay.status, "passed");
    assert.equal(replay.appliedCandidate.anchor, "memory-review-queue");
    assert.equal(replay.admission.role, "anchor");
    assert.equal(replay.authority.mutationAllowedNow, false);
    assert.equal(replay.authority.compatibilityMemoryWrite, "blocked");
    assert.ok(replay.trace.includes("prove_retrieved_is_not_automatic_anchor"));
  });

  it("downgrades applied Context Mesh candidates to support for general work requests", () => {
    const root = tempRoot();
    seedAppliedContextMeshCandidate(root);
    const replay = buildAppliedContextMeshReplay({
      root,
      request: "GPAO-T 첫 로컬 작업 루프를 검증하고 다음 안전 행동을 정리해줘.",
      priorFlow: { flowKey: "gpao-t-memory-flow", activeTargetId: "memory-review-queue" },
      expectedAnchor: "memory-review-queue",
      expectedRole: "support",
      now: "2026-07-11T00:06:00.000Z",
    });

    assert.equal(replay.status, "passed");
    assert.equal(replay.activeTargetId, "general-runtime");
    assert.equal(replay.admission.role, "support");
    assert.equal(replay.appliedCandidate.answerAnchorEligible, false);
    assert.equal(replay.authority.automaticAdmission, "blocked");
  });

  it("exposes applied Context Mesh replay through the gateway", () => {
    const root = tempRoot();
    seedAppliedContextMeshCandidate(root);
    const replay = handleGatewayRequest({
      root,
      method: "POST",
      path: "/mesh/applied-candidate-replay",
      body: {
        request: "이어서 그 기준으로 지파오티 메모리 적용 원칙을 확인해줘.",
        priorFlow: { flowKey: "gpao-t-memory-flow", activeTargetId: "memory-review-queue" },
        expectedAnchor: "memory-review-queue",
        expectedRole: "anchor",
        now: "2026-07-11T00:05:00.000Z",
      },
    });
    const verify = verifyAppliedContextMeshReplay({ root });

    assert.equal(replay.status, 200);
    assert.equal(replay.body.status, "passed");
    assert.equal(verify.status, "ready");
    assert.equal(verify.anchorReplay.status, "passed");
    assert.equal(verify.supportReplay.status, "passed");
  });

  it("maps applied replay proof to the dashboard inspector contract", () => {
    const root = tempRoot();
    seedAppliedContextMeshCandidate(root);
    const inspector = buildAppliedReplayInspectorState({
      root,
      request: "이어서 그 기준으로 지파오티 메모리 적용 원칙을 확인해줘.",
      priorFlow: { flowKey: "gpao-t-memory-flow", activeTargetId: "memory-review-queue" },
      expectedAnchor: "memory-review-queue",
      expectedRole: "anchor",
      now: "2026-07-11T00:07:00.000Z",
    });
    const gateway = handleGatewayRequest({
      root,
      method: "POST",
      path: "/surface/applied-replay-inspector",
      body: {
        request: "GPAO-T 첫 로컬 작업 루프를 검증하고 다음 안전 행동을 정리해줘.",
        priorFlow: { flowKey: "gpao-t-memory-flow", activeTargetId: "memory-review-queue" },
        expectedAnchor: "memory-review-queue",
        expectedRole: "support",
        now: "2026-07-11T00:08:00.000Z",
      },
    });
    const verify = verifyAppliedReplayInspectorState({ root });
    const gatewayVerify = handleGatewayRequest({
      root,
      method: "GET",
      path: "/surface/applied-replay-inspector/verify",
    });

    assert.equal(inspector.schema, "gpao_t.surface.applied_replay_inspector_state.v0_1");
    assert.equal(inspector.labels.replay, "통과");
    assert.equal(inspector.labels.role, "anchor");
    assert.equal(inspector.labels.inheritedRuntimeMemory, "미기록");
    assert.equal(inspector.tones.role, "active");
    assert.equal(inspector.uiContract.targetSurface, "gpao_work_pane_inspector");
    assert.equal(inspector.uiContract.sidecarSurface, false);
    assert.equal(inspector.uiContract.liveMutation, false);
    assert.ok(inspector.blockedAuthorities.includes("durable_memory"));
    assert.ok(inspector.blockedAuthorities.includes("openclaw_memory"));
    assert.equal(gateway.status, 200);
    assert.equal(gateway.body.labels.role, "support");
    assert.equal(gateway.body.userLine, "이 후보는 관련 맥락이지만 현재 목표의 기준점은 아닙니다.");
    assert.equal(verify.status, "ready");
    assert.equal(gatewayVerify.body.status, "ready");
  });

  it("keeps the dashboard inspector safe when replay input is blocked", () => {
    const root = tempRoot();
    const inspector = buildAppliedReplayInspectorState({
      root,
      expectedAnchor: "memory-review-queue",
      now: "2026-07-11T00:09:00.000Z",
    });

    assert.equal(inspector.status, "blocked");
    assert.equal(inspector.labels.candidate, "대기");
    assert.equal(inspector.labels.replay, "차단");
    assert.equal(inspector.authority.compatibilityMemoryWrite, "blocked");
    assert.ok(inspector.findings.includes("request_missing"));
    assert.ok(inspector.trace.includes("map_replay_to_compact_dashboard_inspector_state"));
  });

  it("exposes a read-only Apply Gate state without enabling memory writes", () => {
    const root = tempRoot();
    const state = buildMemoryApplyGateState({ root, now: "2026-07-11T03:45:00.000Z" });
    const verify = verifyMemoryApplyGateState({ root });

    assert.equal(state.schema, "gpao_t.memory_apply_gate_state.v0_1");
    assert.equal(state.status, "ready_read_only");
    assert.equal(state.activeGate.currentStage, "source_truth");
    assert.equal(state.controls.applyRequest.status, "blocked_until_improved_replay");
    assert.equal(state.controls.reversibleApplyInvocation.uiEnabledNow, false);
    assert.equal(state.authority.mutationAllowedNow, false);
    assert.equal(state.authority.uiApplyButtonEnabled, false);
    assert.equal(state.authority.durableMemoryPromotion, "blocked");
    assert.equal(state.authority.compatibilityMemoryWrite, "blocked");
    assert.equal(state.authority.sessionMetaWrite, "blocked");
    assert.ok(state.targetPolicies.openclaw_memory.blockedUses.includes("openclaw_memory_write"));
    assert.ok(state.targetPolicies.openclaw_memory.blockedUses.includes("write_from_ui_now"));
    assert.equal(verify.status, "ready");
  });

  it("summarizes an approval-audited local Context Mesh apply without opening UI mutation", () => {
    const root = tempRoot();
    const applied = seedAppliedContextMeshCandidate(root);
    const state = buildMemoryApplyGateState({ root, now: "2026-07-11T03:46:00.000Z" });
    const gateway = handleGatewayRequest({
      root,
      method: "GET",
      path: "/memory/apply-gate",
    });
    const gatewayVerify = handleGatewayRequest({
      root,
      method: "GET",
      path: "/memory/apply-gate/verify",
    });

    assert.equal(applied.status, "applied_context_mesh_candidate_local_only");
    assert.equal(state.activeGate.currentStage, "post_apply_replay");
    assert.equal(state.summary.counts.contextMeshApplied, 1);
    assert.equal(state.controls.approvalAuditRecord.actualApply, false);
    assert.equal(state.controls.reversibleApplyInvocation.uiEnabledNow, false);
    assert.equal(state.controls.rollbackInvocation.uiEnabledNow, false);
    assert.equal(state.authority.contextMeshCandidateAppend, "implemented_local_only_but_ui_invocation_blocked");
    assert.equal(state.authority.automaticAdmission, "blocked");
    assert.equal(gateway.status, 200);
    assert.equal(gateway.body.schema, "gpao_t.memory_apply_gate_state.v0_1");
    assert.equal(gatewayVerify.status, 200);
    assert.equal(gatewayVerify.body.status, "ready");
  });
});
