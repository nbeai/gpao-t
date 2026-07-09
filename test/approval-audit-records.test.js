import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildApprovalAuditLocalRecordSubstrate,
  buildApprovalAuditReplay,
  buildControlCenterHtml,
  buildControlCenterSnapshot,
  buildCoreWorkSurface,
  buildCoreWorkSurfaceHtml,
  handleGatewayRequest,
  readApprovalRecords,
  readAuditRecords,
  verifyApprovalAuditLocalRecordSubstrate,
  writeApprovalAuditLocalRecords,
} from "../src/index.js";

function tempRoot() {
  return mkdtempSync(join(tmpdir(), "gpao-t-approval-audit-"));
}

describe("Approval/Audit Local Record Substrate v1", () => {
  it("writes approval and audit records to local JSONL and keeps external boundaries closed", () => {
    const root = tempRoot();
    const writeResult = writeApprovalAuditLocalRecords({
      root,
      request: "로컬 승인 기록을 남기고 replay 기준을 확인해줘.",
      now: "2026-07-09T12:00:00.000Z",
    });

    assert.equal(writeResult.status, "written_local_only");
    assert.equal(writeResult.boundaryState.externalSend, false);
    assert.equal(writeResult.boundaryState.paidAction, false);
    assert.equal(writeResult.boundaryState.destructiveAction, false);
    assert.equal(writeResult.boundaryState.credentialAccess, false);
    assert.equal(writeResult.boundaryState.connectorLiveActivation, false);
    assert.equal(writeResult.boundaryState.publicRelease, false);
    assert.equal(writeResult.boundaryState.durableMemoryPromotion, false);
    assert.equal(writeResult.boundaryState.localJsonlRecordWrite, true);

    const approvalRecords = readApprovalRecords({ root });
    const auditRecords = readAuditRecords({ root });
    assert.equal(approvalRecords.length, 1);
    assert.equal(auditRecords.length, 1);
    assert.equal(approvalRecords[0].schema, "gpao_t.approval_record.v1");
    assert.equal(auditRecords[0].schema, "gpao_t.audit_record.v1");
    assert.equal(auditRecords[0].approvalRecordId, approvalRecords[0].id);

    const replay = buildApprovalAuditReplay({ root, recordId: approvalRecords[0].id });
    assert.equal(replay.status, "ready");
    assert.equal(replay.executionState, "no_tool_no_connector_no_external_action");
    assert.equal(replay.rollbackReference, approvalRecords[0].rollbackReference);

    const approvalJsonl = join(root, ".gpao-t", "approval", "approval-records.jsonl");
    const auditJsonl = join(root, ".gpao-t", "approval", "audit-records.jsonl");
    assert.equal(existsSync(approvalJsonl), true);
    assert.equal(existsSync(auditJsonl), true);
    assert.match(readFileSync(approvalJsonl, "utf8"), /gpao_t\.approval_record\.v1/);
    assert.match(readFileSync(auditJsonl, "utf8"), /gpao_t\.audit_record\.v1/);
  });

  it("blocks external, paid, and destructive proposals before local record write", () => {
    const root = tempRoot();
    const result = writeApprovalAuditLocalRecords({
      root,
      proposal: {
        id: "proposal.external_send",
        source: "model_skill_user_request_preview",
        toolKind: "connector",
        actionType: "external_send",
        authorityLevel: "external_send",
        expectedEffect: "외부로 메시지를 보냅니다.",
        risk: "외부 전송은 되돌리기 어렵습니다.",
        rollbackReference: "전송 전 명시 승인 필요",
      },
      confirmationState: "confirmed_for_local_record_only",
    });

    assert.equal(result.status, "blocked");
    assert.deepEqual(readApprovalRecords({ root }), []);
    assert.deepEqual(readAuditRecords({ root }), []);
    assert.ok(result.findings.includes("blocked_authority_level:external_send"));
    assert.ok(result.findings.includes("blocked_action_type:external_send"));
  });

  it("exposes write, read, replay, and verify through the local Gateway", () => {
    const root = tempRoot();
    const writeResponse = handleGatewayRequest({
      method: "POST",
      path: "/approval/local-records/write",
      body: { request: "Gateway로 로컬 기록을 남겨줘." },
      root,
    });

    assert.equal(writeResponse.status, 200);
    assert.equal(writeResponse.body.status, "written_local_only");
    assert.equal(handleGatewayRequest({ method: "GET", path: "/approval/local-records", root }).body.length, 1);
    assert.equal(handleGatewayRequest({ method: "GET", path: "/approval/local-audit-records", root }).body.length, 1);
    assert.equal(handleGatewayRequest({ method: "GET", path: "/approval/local-records/replay", root }).body.status, "ready");
    assert.equal(handleGatewayRequest({ method: "GET", path: "/approval/local-record-substrate/verify", root }).body.ok, true);
  });

  it("shows visual confirmation in Control Center and Work Surface data/html", () => {
    const root = tempRoot();
    writeApprovalAuditLocalRecords({ root, request: "화면에서 로컬 기록 상태를 보여줘." });

    const substrate = buildApprovalAuditLocalRecordSubstrate({ root });
    assert.equal(substrate.counts.approvalRecords, 1);
    assert.equal(verifyApprovalAuditLocalRecordSubstrate({ root }).ok, true);

    const controlSnapshot = buildControlCenterSnapshot({ root });
    assert.equal(controlSnapshot.counts.approvalLocalRecords, 1);
    assert.equal(controlSnapshot.counts.auditLocalRecords, 1);
    const controlHtml = buildControlCenterHtml({ snapshot: controlSnapshot });
    assert.match(controlHtml, /data-local-record-substrate="v1"/);
    assert.match(controlHtml, /로컬 승인\/감사 기록/);

    const workSurface = buildCoreWorkSurface({ root });
    assert.equal(workSurface.executionProposalConfirmation.localRecordSubstrate.counts.approvalRecords, 1);
    const workSurfaceHtml = buildCoreWorkSurfaceHtml({ workSurface });
    assert.match(workSurfaceHtml, /data-local-record-substrate="v1"/);
    assert.match(workSurfaceHtml, /로컬 기록/);
  });
});
