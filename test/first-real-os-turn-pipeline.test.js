import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  handleGatewayRequest,
  readGpaoTOsTurnRecords,
  runGpaoTOsTurn,
  startControlCenterPreviewServer,
  verifyGpaoTOsTurn,
} from "../src/index.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-first-real-os-turn-"));
}

describe("GPAO-T First Real OS Turn Pipeline", () => {
  it("connects input, preflight, local fallback answer, tool supervision, replay, memory, and growth into one turn", () => {
    const root = tempRoot();
    const turn = runGpaoTOsTurn({
      root,
      request: "이번 요청을 GPAO-T OS 턴으로 처리해줘.",
      sessionKey: "work-surface:main",
      now: "2026-07-13T12:00:00.000Z",
    });

    assert.equal(turn.schema, "gpao_t.first_real_os_turn.v0_1");
    assert.equal(turn.status, "completed_with_local_fallback");
    assert.match(turn.id, /^os-turn\./);
    assert.equal(turn.localLoop.status, "ready");
    assert.equal(turn.model.invokedExternally, false);
    assert.equal(turn.model.output.modelOutputBoundary, "draft_only_not_action_authority");
    assert.equal(turn.toolSupervision.executionState, "completed_dry_run_invocation");
    assert.equal(turn.toolSupervision.dryRunInvocation.status, "completed_dry_run_invocation");
    assert.ok(turn.toolSupervision.progressEvents.some((event) => event.phase === "tool_running"));
    assert.ok(turn.toolSupervision.progressEvents.some((event) => event.phase === "tool_complete"));
    assert.equal(turn.toolSupervision.approval.opensInvocationNow, false);
    assert.ok(turn.replay.preflightId);
    assert.ok(turn.replay.postAnswerId);
    assert.ok(turn.replay.evaluationId);
    assert.equal(turn.memoryCandidate.status, "review_only");
    assert.equal(turn.memoryCandidate.authority.applyState, "blocked_until_replay_and_explicit_approval");
    assert.match(turn.selfGrowthCandidate.authority, /review_only/);
    assert.deepEqual(
      turn.userVisibleOsState.items.map((item) => item.id),
      ["provider", "memory", "tool", "growth"],
    );
    assert.equal(verifyGpaoTOsTurn({ record: turn }).ok, true);

    const records = readGpaoTOsTurnRecords({ root });
    assert.equal(records.length, 1);
    assert.equal(records[0].id, turn.id);
  });

  it("exposes the same OS turn through the Gateway route", () => {
    const root = tempRoot();
    const response = handleGatewayRequest({
      method: "POST",
      path: "/turn/os",
      body: {
        request: "Gateway에서 GPAO-T 통합 턴을 검증해줘.",
        sessionKey: "gateway:main",
        now: "2026-07-13T12:05:00.000Z",
      },
      root,
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.schema, "gpao_t.first_real_os_turn.v0_1");
    assert.equal(response.body.sessionKey, "gateway:main");
    assert.equal(response.body.replay.status, "post_answer_growth_recorded");
    assert.equal(response.body.userVisibleOsState.status, "ready");

    const verifyResponse = handleGatewayRequest({
      method: "POST",
      path: "/turn/os/verify",
      body: { record: response.body },
      root,
    });
    assert.equal(verifyResponse.status, 200);
    assert.equal(verifyResponse.body.ok, true);
  });

  it("accepts chat surface input through the same OS turn task packet contract", () => {
    const root = tempRoot();
    const response = handleGatewayRequest({
      method: "POST",
      path: "/turn/os",
      body: {
        request: "채팅창 입력도 GPAO-T OS 턴으로 처리해줘.",
        sessionKey: "agent:main:main",
        sourceSurface: "/chat",
        source: "webchat",
        now: "2026-07-13T12:06:00.000Z",
      },
      root,
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.source.surface, "/chat");
    assert.equal(response.body.localLoop.packet.sourceSurface, "/work-surface");
    assert.ok(response.body.localLoop.taskPacket.activeTargetId);
    assert.equal(verifyGpaoTOsTurn({ record: response.body }).ok, true);
  });

  it("blocks empty input before creating a false completed turn", () => {
    const root = tempRoot();
    const response = handleGatewayRequest({
      method: "POST",
      path: "/turn/os",
      body: { request: "" },
      root,
    });

    assert.equal(response.status, 409);
    assert.equal(response.body.status, "blocked");
    assert.ok(response.body.findings.includes("request_missing"));
    assert.equal(verifyGpaoTOsTurn({ record: response.body }).ok, false);
  });

  it("returns an OS turn from the actual Work Surface submit HTTP path", async () => {
    const root = tempRoot();
    const preview = await startControlCenterPreviewServer({
      root,
      now: "2026-07-13T12:10:00.000Z",
    });

    try {
      const response = await fetch(`http://${preview.host}:${preview.port}/work-surface/submit`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          request: "브라우저 제출 경로도 GPAO-T OS 턴을 남기는지 확인해줘.",
        }),
      });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.schema, "gpao_t.work_surface_submit_result.v1");
      assert.equal(body.osTurn.schema, "gpao_t.first_real_os_turn.v0_1");
      assert.equal(body.osTurn.source.surface, "/work-surface/submit");
      assert.equal(body.osTurn.userVisibleOsState.status, "ready");
      assert.equal(verifyGpaoTOsTurn({ record: body.osTurn }).ok, true);
    } finally {
      await preview.close();
    }
  });
});
