import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  captureMemoryEntry,
  handleGatewayRequest,
  readMemoryWiki,
  readTCellCandidates,
  resolveContextMesh,
  runRuntimeTurn,
} from "../src/index.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-memory-"));
}

describe("GPAO-T Memory Wiki and Context Mesh", () => {
  it("captures wiki entries as T-cell candidates without durable promotion", () => {
    const root = tempRoot();
    const result = captureMemoryEntry({
      root,
      title: "배포파일 meaning",
      body: "In a GPAO packaging flow, 배포파일 means GPAO Operating Package / GPAO for OpenClaw before older BEAI Harness archives.",
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
      body: "배포파일 should resolve to GPAO Operating Package / GPAO for OpenClaw in this product flow.",
    });
    const mesh = resolveContextMesh({
      root,
      request: "그럼 배포파일은?",
      inputSignal: { kind: "follow_up" },
      activeTargetId: "release-file",
    });

    assert.equal(mesh.status, "ready");
    assert.equal(mesh.retrievedCandidates[0].anchor, "release-file");
    assert.match(mesh.retrievedCandidates[0].pi, /GPAO Operating Package/);
    assert.match(mesh.boundary, /not admitted context/);
  });

  it("keeps release-file candidates supporting-only for general Work Surface requests", () => {
    const root = tempRoot();
    captureMemoryEntry({
      root,
      title: "GPAO package noun binding",
      body: "배포파일 should resolve to GPAO Operating Package / GPAO for OpenClaw in this product flow.",
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
      body: "배포파일 should resolve to GPAO Operating Package / GPAO for OpenClaw in this product flow.",
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
      body: "배포파일 should resolve to GPAO Operating Package / GPAO for OpenClaw in this product flow.",
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
        body: "배포파일 means GPAO Operating Package / GPAO for OpenClaw.",
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
});
