import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  buildCoreWorkSurface,
  buildCoreWorkSurfaceHtml,
  buildWorkSurfaceExecutionFlow,
  handleGatewayRequest,
  readApprovalRecords,
  readAuditRecords,
  recordWorkSurfaceExecutionFlow,
  verifyCoreWorkSurface,
  verifyWorkSurfaceExecutionFlow,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-execution-flow-"));
}

describe("Work Surface Execution Governance Flow v1", () => {
  it("shows proposal, confirmation, local record, replay, and rollback as one user flow", () => {
    const root = tempRoot();
    const flow = buildWorkSurfaceExecutionFlow({
      root,
      request: "이 작업을 로컬 기록 기준으로 확인해줘",
      now: "2026-07-09T12:00:00.000Z",
    });

    assert.equal(flow.schema, "gpao_t.work_surface_execution_governance_flow.v1");
    assert.equal(flow.status, "ready_for_local_record_review");
    assert.equal(flow.flowStages.length, 5);
    assert.equal(flow.flowStages.map((stage) => stage.id).join(","), "proposal,confirmation,local_record,replay,rollback");
    assert.equal(flow.localRecord.writesDuringRender, false);
    assert.equal(flow.boundaries.localJsonlRecordWrite, "allowed_after_explicit_confirmation");
    assert.equal(flow.boundaries.liveModelCall, "blocked");
    assert.equal(flow.boundaries.toolCliMcpExecution, "blocked");
    assert.equal(flow.boundaries.connectorActivation, "blocked");
    assert.equal(flow.boundaries.externalSend, "blocked");
    assert.equal(flow.blockedLiveActions.includes("tool/CLI/MCP execution"), true);
    assert.equal(verifyWorkSurfaceExecutionFlow({ root, flow }).status, "ready");
  });

  it("writes only local approval/audit records after explicit confirmation and exposes replay", () => {
    const root = tempRoot();
    const result = recordWorkSurfaceExecutionFlow({
      root,
      request: "실행 후보를 로컬 기록으로 남겨줘",
      confirmationState: "confirmed_for_local_record_only",
      now: "2026-07-09T12:01:00.000Z",
    });

    assert.equal(result.status, "written_local_only");
    assert.equal(result.writeResult.approvalRecord.scope, "local_record_only");
    assert.equal(result.writeResult.auditRecord.status, "written_local_only");
    assert.equal(result.writeResult.replay.status, "ready");
    assert.equal(result.writeResult.boundaryState.externalSend, false);
    assert.equal(result.writeResult.boundaryState.toolCliMcpExecution, false);
    assert.equal(readApprovalRecords({ root }).length, 1);
    assert.equal(readAuditRecords({ root }).length, 1);

    const reread = buildWorkSurfaceExecutionFlow({ root });
    assert.equal(reread.localRecord.counts.approvalRecords, 1);
    assert.equal(reread.replay.status, "ready");
  });

  it("integrates the flow into Work Surface, Gateway, and CLI without opening live execution", () => {
    const root = tempRoot();
    const surface = buildCoreWorkSurface({ root });
    const html = buildCoreWorkSurfaceHtml({ surface });
    const check = verifyCoreWorkSurface({ surface, html });

    assert.equal(surface.executionGovernanceFlow.schema, "gpao_t.work_surface_execution_governance_flow.v1");
    assert.equal(surface.executionGovernanceFlow.flowStages.length, 5);
    assert.equal(surface.executionGovernanceFlow.localRecord.writesDuringRender, false);
    assert.equal(surface.executionGovernanceFlow.boundaries.externalSend, "blocked");
    assert.match(html, /data-execution-governance-flow="local-record-review"/);
    assert.match(html, /로컬 기록 후 리플레이/);
    assert.equal(check.status, "ready");

    const gatewayFlow = handleGatewayRequest({ root, method: "GET", path: "/work-surface/execution-flow" });
    assert.equal(gatewayFlow.status, 200);
    assert.equal(gatewayFlow.body.schema, "gpao_t.work_surface_execution_governance_flow.v1");

    const gatewayCheck = handleGatewayRequest({ root, method: "GET", path: "/work-surface/execution-flow/verify" });
    assert.equal(gatewayCheck.body.status, "ready");

    const gatewayRecord = handleGatewayRequest({
      root,
      method: "POST",
      path: "/work-surface/execution-flow/record",
      body: {
        request: "로컬 기록만 남겨줘",
        confirmationState: "confirmed_for_local_record_only",
      },
    });
    assert.equal(gatewayRecord.body.status, "written_local_only");
    assert.equal(gatewayRecord.body.writeResult.boundaryState.externalSend, false);

    const cliFlow = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "control",
      "work-surface-execution-flow",
      "실행 확인 흐름",
    ], { encoding: "utf8" }));
    assert.equal(cliFlow.schema, "gpao_t.work_surface_execution_governance_flow.v1");

    const cliCheck = JSON.parse(execFileSync(process.execPath, [
      CLI,
      "control",
      "work-surface-execution-flow-check",
      "실행 확인 흐름",
    ], { encoding: "utf8" }));
    assert.equal(cliCheck.status, "ready");
  });
});
