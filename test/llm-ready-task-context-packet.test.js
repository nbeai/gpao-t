import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildLlmReadyPacketSurfaceState,
  buildLlmReadyTaskContextPacket,
  captureMemoryEntry,
  handleGatewayRequest,
  verifyLlmReadyTaskContextPacket,
} from "../src/index.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-llm-packet-"));
}

function seedOpenClawAbsorptionCandidate(root) {
  return captureMemoryEntry({
    root,
    now: "2026-07-11T05:00:00.000Z",
    title: "OpenClaw absorption",
    body: "OpenClaw is the material body being absorbed into GPAO-T, not the final product goal.",
    tags: ["gpao-t", "openclaw"],
    source: "user",
  });
}

describe("GPAO-T LLM-ready task context packet", () => {
  it("turns admitted Context Mesh and T-cell state into an LLM input contract", () => {
    const root = tempRoot();
    seedOpenClawAbsorptionCandidate(root);

    const packet = buildLlmReadyTaskContextPacket({
      root,
      now: "2026-07-11T05:01:00.000Z",
      input: { text: "이어서 OpenClaw 흡수 방향을 기준으로 지파오티 작업 원칙을 확인해줘." },
      priorFlow: { flowKey: "gpao-t-openclaw", activeTargetId: "openclaw-absorption" },
    });

    assert.equal(packet.schema, "gpao_t.llm_ready_task_context_packet.v0_1");
    assert.equal(packet.status, "ready");
    assert.equal(packet.rawUserUtterance.includes("OpenClaw"), true);
    assert.equal(packet.activeTarget.id, "openclaw-absorption");
    assert.equal(packet.endpointCenter.id, "openclaw-absorption");
    assert.ok(packet.admittedTCellAnchors.some((cell) => cell.anchor === "openclaw-absorption"));
    assert.equal(packet.responseContract.forbiddenModes.includes("answer_from_unadmitted_memory"), true);
    assert.equal(packet.authorityBoundary.compatibilityMemoryWrite, "blocked");
    assert.equal(packet.authorityBoundary.durableMemoryPromotion, "blocked");
    assert.equal(packet.authorityBoundary.automaticAdmission, "blocked");
    assert.equal(packet.llmInputDiscipline.finalAnswerGeneratedBy, "external_llm_or_host_model");
    assert.equal(packet.replayExpectation.required, true);
  });

  it("shows supporting candidates without letting them become answer anchors", () => {
    const root = tempRoot();
    seedOpenClawAbsorptionCandidate(root);

    const packet = buildLlmReadyTaskContextPacket({
      root,
      now: "2026-07-11T05:02:00.000Z",
      input: { text: "GPAO-T 첫 로컬 작업 루프를 검증해줘." },
    });

    assert.equal(packet.activeTarget.id, "general-runtime");
    assert.equal(packet.admittedTCellAnchors.some((cell) => cell.anchor === "openclaw-absorption"), false);
    assert.ok(packet.blockedCandidates.some((cell) => cell.anchor === "openclaw-absorption"));
    assert.equal(packet.responseContract.forbiddenModes.includes("automatic_admission_without_replay"), true);
  });

  it("exposes a compact dashboard state and gateway route", () => {
    const root = tempRoot();
    seedOpenClawAbsorptionCandidate(root);

    const surface = buildLlmReadyPacketSurfaceState({
      root,
      now: "2026-07-11T05:03:00.000Z",
      input: { text: "이어서 OpenClaw 흡수 방향을 기준으로 지파오티 작업 원칙을 확인해줘." },
      priorFlow: { flowKey: "gpao-t-openclaw", activeTargetId: "openclaw-absorption" },
    });
    const gateway = handleGatewayRequest({
      root,
      method: "POST",
      path: "/surface/llm-ready-packet",
      body: {
        now: "2026-07-11T05:04:00.000Z",
        input: { text: "이어서 OpenClaw 흡수 방향을 기준으로 지파오티 작업 원칙을 확인해줘." },
        priorFlow: { flowKey: "gpao-t-openclaw", activeTargetId: "openclaw-absorption" },
      },
    });

    assert.equal(surface.schema, "gpao_t.surface.llm_ready_packet_state.v0_1");
    assert.equal(surface.uiContract.sidecarSurface, false);
    assert.equal(surface.uiContract.liveMutation, false);
    assert.equal(surface.labels.activeTarget, "openclaw-absorption");
    assert.equal(surface.labels.memoryWrite, "차단");
    assert.equal(gateway.status, 200);
    assert.equal(gateway.body.packet.activeTarget.id, "openclaw-absorption");
  });

  it("verifies packet invariants without opening memory or external authority", () => {
    const root = tempRoot();
    seedOpenClawAbsorptionCandidate(root);

    const result = verifyLlmReadyTaskContextPacket({ root });

    assert.equal(result.status, "ready");
    assert.equal(result.packet.authorityBoundary.compatibilityMemoryWrite, "blocked");
    assert.equal(result.packet.authorityBoundary.durableMemoryPromotion, "blocked");
    assert.equal(result.packet.authorityBoundary.automaticAdmission, "blocked");
    assert.equal(result.surface.uiContract.sidecarSurface, false);
  });
});
