import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

describe("Guided First Workflow", () => {
  it("first real user can route a vague request, see the plan, run checks, and understand the result", () => {
    const output = execFileSync(process.execPath, [
      CLI,
      "turn",
      "그럼 배포파일은?",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const result = JSON.parse(output);

    assert.equal(result.schema, "gpao_t.turn_result.v0_1");
    assert.equal(result.sessionOverlay.activeTargetId, "release-file");
    assert.equal(result.admissionPacket.admittedCells[0].role, "anchor");
    assert.equal(result.taskPacket.trace.includes("build_task_packet"), true);
    assert.equal(result.userVisibleState.language, "ko");
    assert.match(result.userVisibleState.nextSafeAction, /검증 계획/);
  });

  it("Guided First Workflow first success path recovers the release-file active target", () => {
    const output = execFileSync(process.execPath, [
      CLI,
      "replay",
      "fixtures/replay/release-file-active-target.json",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const result = JSON.parse(output);

    assert.equal(result.sessionOverlay.activeTargetId, "release-file");
    assert.equal(result.sessionOverlay.continuityState, "recovered");
    assert.equal(result.taskPacket.modelRoute, "fast_context_recovery");
    assert.deepEqual(result.taskPacket.trace, [
      "receive_input",
      "classify_input_signal",
      "recover_session_overlay",
      "retrieve_context_runtime",
      "admit_t_cells",
      "check_authority",
      "route_skill_packs",
      "build_skill_execution_plan",
      "route_model",
      "plan_tools",
      "plan_adapters",
      "build_task_packet",
    ]);
    assert.match(result.userVisibleState.summary, /요청의 맥락은 복구/);
    assert.match(result.userVisibleState.nextSafeAction, /로컬 초안과 검증 계획/);
  });

  it("Guided First Workflow empty state shows CLI usage before saved user data exists", () => {
    const output = execFileSync(process.execPath, [CLI], {
      cwd: ROOT,
      encoding: "utf8",
    });

    assert.match(output, /GPAO-T local runtime skeleton/);
    assert.match(output, /gpao-t turn <text>/);
    assert.match(output, /gpao-t doctor/);
    assert.match(output, /그럼 배포파일은\?/);
  });

  it("Guided First Workflow failure recovery explains the next safe action for missing input", () => {
    const result = spawnSync(process.execPath, [CLI, "turn"], {
      cwd: ROOT,
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /turn command requires input text/);
    assert.match(result.stderr, /Usage:/);
  });
});
