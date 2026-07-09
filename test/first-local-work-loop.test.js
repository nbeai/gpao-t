import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  buildControlCenterHtml,
  buildControlCenterSnapshot,
  buildCoreWorkSurface,
  buildCoreWorkSurfaceHtml,
  buildFirstLocalWorkLoop,
  handleGatewayRequest,
  readApprovalRecords,
  readAuditRecords,
  verifyCoreWorkSurface,
  verifyFirstLocalWorkLoop,
  writeRuntimeState,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-first-local-work-loop-"));
}

describe("First Local Work Loop v1", () => {
  it("turns a work-surface request into a local task packet, local records, and replay boundaries", () => {
    const root = tempRoot();
    const loop = buildFirstLocalWorkLoop({
      root,
      request: "GPAO-T 작업 표면에서 첫 로컬 루프를 만들어줘.",
      now: "2026-07-09T15:00:00.000Z",
    });

    assert.equal(loop.schema, "gpao_t.first_local_work_loop.v1");
    assert.equal(loop.status, "ready");
    assert.equal(loop.packet.sourceSurface, "/work-surface");
    assert.equal(loop.packet.userInput.language, undefined);
    assert.equal(loop.taskPacket.inputSignal, "general_request");
    assert.equal(loop.taskPacket.activeTargetId, "general-runtime");
    assert.equal(loop.taskPacket.requestType, "work_surface_general_request");
    assert.equal(loop.modelRoute.liveModelCall, false);
    assert.equal(loop.modelRoute.invocationStatus, "completed_local_invocation");
    assert.equal(loop.modelInvocation.status, "completed_local_invocation");
    assert.equal(loop.modelInvocation.output.modelOutputBoundary, "draft_only_not_action_authority");
    assert.equal(loop.executionRuntime.schema, "gpao_t.execution_runtime_plan.v1");
    assert.equal(loop.executionRuntime.dryRunPreview.invokesNow, false);
    assert.equal(loop.executionRuntime.safetyInvariants.runsCliCommand, false);
    assert.equal(loop.executionDryRunInvocation.status, "completed_dry_run_invocation");
    assert.equal(loop.executionDryRunInvocation.safetyInvariants.writeMutationExpected, false);
    assert.equal(loop.readOnlyConnectorInspection.status, "ready");
    assert.equal(loop.readOnlyConnectorInspection.safetyInvariants.writesFiles, false);
    assert.equal(loop.boundaryState.localJsonlRecordWrite, true);
    assert.equal(loop.boundaryState.modelCall, false);
    assert.equal(loop.boundaryState.toolCliMcpExecution, false);
    assert.equal(loop.boundaryState.connectorActivation, false);
    assert.equal(loop.boundaryState.externalSend, false);
    assert.equal(loop.boundaryState.credentialAccess, false);
    assert.equal(loop.boundaryState.paidAction, false);
    assert.equal(loop.boundaryState.destructiveAction, false);
    assert.equal(loop.boundaryState.durableMemoryPromotion, false);
    assert.equal(loop.approvalAudit.recordWrite.status, "written_local_only");
    assert.equal(loop.approvalAudit.replay.status, "ready");
    assert.match(loop.approvalAudit.rollbackReference, /local_record_replay:/);
    assert.equal(readApprovalRecords({ root }).length, 1);
    assert.equal(readAuditRecords({ root }).length, 1);
    assert.equal(verifyFirstLocalWorkLoop({ loop }).ok, true);
  });

  it("does not inherit a stale release-file active target for general Work Surface loops", () => {
    const root = tempRoot();
    writeRuntimeState({
      schema: "gpao_t.runtime_state.v0_1",
      runtimeId: "gpao-t-local",
      version: "0.1.0",
      installRoot: root,
      startedAt: "2026-07-09T15:00:00.000Z",
      updatedAt: "2026-07-09T15:00:00.000Z",
      activeFlow: {
        flowKey: "gpao-t-dev-flow",
        activeTargetId: "release-file",
        activeTargetLabel: "배포 파일",
      },
      counters: { turns: 0, approvalsNeeded: 0, events: 0 },
      boundaries: {
        externalActivation: "blocked",
        durableMemoryPromotion: "blocked",
        publicRelease: "blocked",
        localPreview: "allowed",
      },
    }, { root });
    const loop = buildFirstLocalWorkLoop({
      root,
      request: "GPAO-T 첫 로컬 작업 루프를 검증하고 다음 안전 행동을 정리해줘.",
      now: "2026-07-09T15:05:00.000Z",
    });

    assert.equal(loop.status, "ready");
    assert.equal(loop.taskPacket.activeTargetId, "general-runtime");
    assert.equal(loop.taskPacket.requestType, "work_surface_general_request");
    assert.equal(loop.taskPacket.stalePriorTarget, true);
    assert.notEqual(loop.localDraftPreview.contextAnchor, "release-file");
  });

  it("blocks risky live-action language before creating local records", () => {
    const root = tempRoot();
    const loop = buildFirstLocalWorkLoop({
      root,
      request: "이 내용을 외부로 전송하고 배포해줘.",
    });

    assert.equal(loop.status, "blocked");
    assert.equal(loop.validation.status, "review_needed");
    assert.ok(loop.validation.findings.includes("risk_signal_requires_review_before_live_action"));
    assert.equal(readApprovalRecords({ root }).length, 0);
    assert.equal(readAuditRecords({ root }).length, 0);
  });

  it("exposes the loop through Gateway and CLI without opening model/tool/connector execution", () => {
    const root = tempRoot();
    const gateway = handleGatewayRequest({
      method: "POST",
      path: "/work-surface/local-loop",
      body: { request: "Gateway에서 첫 로컬 작업 루프를 확인해줘." },
      root,
    });
    const verifyGateway = handleGatewayRequest({
      method: "POST",
      path: "/work-surface/local-loop/verify",
      body: { request: "Gateway에서 첫 로컬 작업 루프를 확인해줘." },
      root,
    });

    assert.equal(gateway.status, 200);
    assert.equal(gateway.body.status, "ready");
    assert.equal(verifyGateway.body.ok, true);
    assert.equal(gateway.body.boundaryState.modelCall, false);
    assert.equal(gateway.body.boundaryState.toolCliMcpExecution, false);

    const cliLoop = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "control",
      "work-surface-local-loop-check",
      "CLI에서 첫 로컬 작업 루프를 확인해줘.",
    ], { encoding: "utf8" }));
    assert.equal(cliLoop.ok, true);
  });

  it("renders the local loop as preview in Work Surface and Control Center without mutating records", () => {
    const root = tempRoot();
    const surface = buildCoreWorkSurface({
      root,
      draftRequest: "화면에서 로컬 작업 루프가 어떻게 보이는지 보여줘.",
      now: "2026-07-09T15:30:00.000Z",
    });
    const html = buildCoreWorkSurfaceHtml({ surface });

    assert.equal(surface.firstLocalWorkLoop.status, "visible_preview_ready");
    assert.equal(surface.firstLocalWorkLoop.boundaryState.localJsonlRecordWrite, false);
    assert.equal(readApprovalRecords({ root }).length, 0);
    assert.equal(readAuditRecords({ root }).length, 0);
    assert.equal(verifyCoreWorkSurface({ surface, html }).status, "ready");
    assert.match(html, /data-first-local-work-loop="preview"/);
    assert.match(html, /첫 로컬 작업 루프/);
    assert.doesNotMatch(html, /<script/i);
    assert.match(html, /data-local-confirmation-form="approval-audit-record"/);
    assert.match(html, /method="post" action="\/work-surface\/execution-flow\/record"/);
    assert.equal(readApprovalRecords({ root }).length, 0);
    assert.equal(readAuditRecords({ root }).length, 0);

    const snapshot = buildControlCenterSnapshot({ root });
    const controlHtml = buildControlCenterHtml({ snapshot });
    assert.match(controlHtml, /data-first-local-work-loop="preview"/);
    assert.match(controlHtml, /첫 로컬 루프/);
  });
});
