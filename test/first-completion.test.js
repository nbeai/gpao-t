import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  buildGpaoTFirstCompletionAudit,
  handleGatewayRequest,
  verifyGpaoTFirstCompletionAudit,
  writeGpaoTFirstCompletionEvidence,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-first-completion-"));
}

describe("GPAO-T first completion six-stage line", () => {
  it("connects the six first-completion stages without opening authority boundaries", () => {
    const root = tempRoot();
    const audit = buildGpaoTFirstCompletionAudit({
      root,
      now: "2026-07-11T06:00:00.000Z",
    });

    assert.equal(audit.schema, "gpao_t.first_completion_six_stage_audit.v0_1");
    assert.equal(audit.status, "ready");
    assert.equal(audit.stages.length, 6);
    assert.deepEqual(audit.stages.map((stage) => stage.id), [
      "apply_gate",
      "memory_context_mesh",
      "multi_session_workspace",
      "tcell_kernel",
      "self_growth_loop",
      "residue_closeout",
    ]);
    assert.equal(audit.progress.percent, 100);
    assert.equal(audit.authorityBoundaries.publicRelease, "blocked");
    assert.equal(audit.authorityBoundaries.externalSend, "blocked");
    assert.equal(audit.authorityBoundaries.durableMemoryPromotion, "blocked");
    assert.equal(audit.authorityBoundaries.automaticGrowthMutation, "blocked");
    assert.equal(audit.stages.every((stage) => stage.firstCompletionScope === "local_os_absorption_line"), true);
    const memoryStage = audit.stages.find((stage) => stage.id === "memory_context_mesh");
    assert.equal(memoryStage.evidence.reviewQueueRecords, 0);
    assert.equal(memoryStage.evidence.retrievedCandidateCount, 0);
    assert.match(memoryStage.evidence.admissionBoundary, /not admitted context/);
  });

  it("verifies and writes local-only evidence for the first completion line", () => {
    const root = tempRoot();
    const verification = verifyGpaoTFirstCompletionAudit({ root });
    const written = writeGpaoTFirstCompletionEvidence({
      root,
      now: "2026-07-11T06:01:00.000Z",
    });

    assert.equal(verification.schema, "gpao_t.first_completion_six_stage_verification.v0_1");
    assert.equal(verification.status, "ready");
    assert.equal(written.status, "written_local_only");
    assert.equal(existsSync(written.file), true);
    assert.equal(written.progress.percent, 100);
  });

  it("exposes the six-stage audit through Gateway and CLI", () => {
    const root = tempRoot();
    const gatewayAudit = handleGatewayRequest({ root, method: "GET", path: "/first-completion" });
    const gatewayCheck = handleGatewayRequest({ root, method: "GET", path: "/first-completion/verify" });
    const gatewayWrite = handleGatewayRequest({ root, method: "POST", path: "/first-completion/evidence" });

    assert.equal(gatewayAudit.status, 200);
    assert.equal(gatewayAudit.body.status, "ready");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
    assert.equal(gatewayWrite.status, 200);
    assert.equal(gatewayWrite.body.status, "written_local_only");

    const cliAudit = JSON.parse(execFileSync(process.execPath, [CLI, "first-completion"], {
      cwd: root,
      encoding: "utf8",
    }));
    const cliCheck = JSON.parse(execFileSync(process.execPath, [CLI, "first-completion-check"], {
      cwd: root,
      encoding: "utf8",
    }));

    assert.equal(cliAudit.schema, "gpao_t.first_completion_six_stage_audit.v0_1");
    assert.equal(cliAudit.status, "ready");
    assert.equal(cliCheck.status, "ready");
  });
});
