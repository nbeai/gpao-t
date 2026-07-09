import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildExecutionApprovalPreview } from "./execution-approval.js";
import { runtimePaths } from "./storage.js";

const APPROVAL_RECORD_FILE = "approval/approval-records.jsonl";
const AUDIT_RECORD_FILE = "approval/audit-records.jsonl";

const BLOCKED_BOUNDARIES = [
  "external send",
  "paid action",
  "destructive action",
  "credential access",
  "connector live activation",
  "public release",
  "durable memory promotion",
];

const BLOCKED_AUTHORITY_LEVELS = new Set(["external_send", "destructive", "paid_action"]);

const LOCAL_BOUNDARY_STATE = {
  externalSend: false,
  paidAction: false,
  destructiveAction: false,
  credentialAccess: false,
  connectorLiveActivation: false,
  publicRelease: false,
  durableMemoryPromotion: false,
  toolCliMcpExecution: false,
  modelCall: false,
  localJsonlRecordWrite: true,
};

export function approvalAuditRecordPaths({ root } = {}) {
  const paths = runtimePaths({ root });
  return {
    ...paths,
    approvalRecordFile: resolve(paths.runtimeRoot, APPROVAL_RECORD_FILE),
    auditRecordFile: resolve(paths.runtimeRoot, AUDIT_RECORD_FILE),
  };
}

export function buildApprovalAuditLocalRecordSubstrate({ root } = {}) {
  const approvalRecords = readApprovalRecords({ root, limit: 25 });
  const auditRecords = readAuditRecords({ root, limit: 25 });
  const latestApproval = approvalRecords[0] || null;
  const latestAudit = auditRecords[0] || null;

  return {
    schema: "gpao_t.approval_audit_local_record_substrate.v1",
    status: "ready",
    mode: "local_jsonl_record_write_read_replay",
    storage: {
      format: "jsonl",
      approvalRecords: ".gpao-t/approval/approval-records.jsonl",
      auditRecords: ".gpao-t/approval/audit-records.jsonl",
    },
    counts: {
      approvalRecords: approvalRecords.length,
      auditRecords: auditRecords.length,
    },
    latest: {
      approvalRecord: latestApproval,
      auditRecord: latestAudit,
    },
    allowedLocalWrites: [
      "approval record write",
      "audit record write",
      "replay read",
      "rollback reference read",
    ],
    blockedBoundaries: BLOCKED_BOUNDARIES,
    boundaryState: LOCAL_BOUNDARY_STATE,
    visualConfirmation: {
      headline: "승인/감사 기록을 로컬에 남기고 다시 읽을 수 있습니다.",
      userMessage: "기록은 .gpao-t 내부 JSONL에만 저장됩니다. 외부 전송, 비용, 파괴, credential 접근, 커넥터 live 실행은 계속 잠겨 있습니다.",
      latestRecordLabel: latestApproval ? "최근 로컬 기록 있음" : "아직 로컬 기록 없음",
      nextSafeAction: "실행 제안을 확인한 뒤 승인/감사 기록만 로컬에 저장합니다.",
    },
  };
}

export function writeApprovalAuditLocalRecords({
  root,
  proposal,
  request = "GPAO-T 로컬 승인/감사 기록 substrate v1 확인",
  confirmationState = "confirmed_for_local_record_only",
  now = new Date().toISOString(),
} = {}) {
  const preview = buildExecutionApprovalPreview(proposal ? { proposal, request } : { request });
  const validation = validateLocalRecordWriteProposal({ proposal: preview.proposal, confirmationState });

  if (!validation.ok) {
    return {
      schema: "gpao_t.approval_audit_local_record_write.v1",
      status: "blocked",
      reason: "local_record_write_validation_failed",
      findings: validation.findings,
      proposal: preview.proposal,
      blockedBoundaries: BLOCKED_BOUNDARIES,
      boundaryState: { ...LOCAL_BOUNDARY_STATE, localJsonlRecordWrite: false },
    };
  }

  const approvalRecord = buildApprovalRecord({ preview, confirmationState, now });
  const auditRecord = buildAuditRecord({ preview, approvalRecord, confirmationState, now });
  appendJsonlRecord(approvalRecord, approvalAuditRecordPaths({ root }).approvalRecordFile);
  appendJsonlRecord(auditRecord, approvalAuditRecordPaths({ root }).auditRecordFile);

  return {
    schema: "gpao_t.approval_audit_local_record_write.v1",
    status: "written_local_only",
    storage: buildApprovalAuditLocalRecordSubstrate({ root }).storage,
    approvalRecord,
    auditRecord,
    replay: buildApprovalAuditReplay({ root, recordId: approvalRecord.id }),
    blockedBoundaries: BLOCKED_BOUNDARIES,
    boundaryState: LOCAL_BOUNDARY_STATE,
    nextSafeAction: "방금 저장된 로컬 기록을 replay로 읽고 rollback reference를 확인합니다.",
  };
}

export function readApprovalRecords({ root, limit = 50 } = {}) {
  return readJsonlRecords(approvalAuditRecordPaths({ root }).approvalRecordFile, limit);
}

export function readAuditRecords({ root, limit = 50 } = {}) {
  return readJsonlRecords(approvalAuditRecordPaths({ root }).auditRecordFile, limit);
}

export function buildApprovalAuditReplay({ root, recordId } = {}) {
  const approvalRecords = readApprovalRecords({ root, limit: 100 });
  const auditRecords = readAuditRecords({ root, limit: 100 });
  const approvalRecord = recordId ? approvalRecords.find((record) => record.id === recordId) : approvalRecords[0];
  const auditRecord = approvalRecord
    ? auditRecords.find((record) => record.approvalRecordId === approvalRecord.id || record.proposalId === approvalRecord.proposalId)
    : auditRecords[0];

  return {
    schema: "gpao_t.approval_audit_replay.v1",
    status: approvalRecord ? "ready" : "empty",
    recordId: approvalRecord?.id || null,
    proposalId: approvalRecord?.proposalId || auditRecord?.proposalId || null,
    approvalRecord: approvalRecord || null,
    auditRecord: auditRecord || null,
    rollbackReference: approvalRecord?.rollbackReference || auditRecord?.rollbackReference || "로컬 기록이 없어 되돌리기 기준을 읽을 수 없습니다.",
    replayReference: approvalRecord?.replayReference || null,
    executionState: "no_tool_no_connector_no_external_action",
    userMessage: approvalRecord
      ? "로컬 승인/감사 기록을 읽었습니다. 이 replay는 실행이 아니라 기록 확인입니다."
      : "아직 읽을 로컬 승인/감사 기록이 없습니다.",
    blockedBoundaries: BLOCKED_BOUNDARIES,
  };
}

export function verifyApprovalAuditLocalRecordSubstrate({ root } = {}) {
  const substrate = buildApprovalAuditLocalRecordSubstrate({ root });
  const findings = [];
  if (substrate.mode !== "local_jsonl_record_write_read_replay") findings.push("unexpected_substrate_mode");
  if (substrate.boundaryState.externalSend !== false) findings.push("external_send_open");
  if (substrate.boundaryState.paidAction !== false) findings.push("paid_action_open");
  if (substrate.boundaryState.destructiveAction !== false) findings.push("destructive_action_open");
  if (substrate.boundaryState.credentialAccess !== false) findings.push("credential_access_open");
  if (substrate.boundaryState.connectorLiveActivation !== false) findings.push("connector_live_activation_open");
  if (substrate.boundaryState.publicRelease !== false) findings.push("public_release_open");
  if (substrate.boundaryState.durableMemoryPromotion !== false) findings.push("durable_memory_promotion_open");
  if (substrate.boundaryState.localJsonlRecordWrite !== true) findings.push("local_jsonl_record_write_not_open");
  if (!substrate.storage.approvalRecords.endsWith("approval-records.jsonl")) findings.push("approval_record_path_missing");
  if (!substrate.storage.auditRecords.endsWith("audit-records.jsonl")) findings.push("audit_record_path_missing");
  return {
    schema: "gpao_t.approval_audit_local_record_substrate_check.v1",
    ok: findings.length === 0,
    findings,
    checkedBoundaries: BLOCKED_BOUNDARIES,
    substrate,
  };
}

function validateLocalRecordWriteProposal({ proposal, confirmationState }) {
  const findings = [];
  const required = ["id", "source", "toolKind", "actionType", "authorityLevel", "expectedEffect", "risk", "rollbackReference"];
  for (const field of required) {
    if (!proposal?.[field]) findings.push(`missing_${field}`);
  }
  if (!confirmationState || confirmationState === "not_confirmed") findings.push("confirmation_state_required");
  if (BLOCKED_AUTHORITY_LEVELS.has(proposal?.authorityLevel)) findings.push(`blocked_authority_level:${proposal.authorityLevel}`);
  if (["external_send", "destructive", "paid_action"].includes(proposal?.actionType)) findings.push(`blocked_action_type:${proposal.actionType}`);
  return { ok: findings.length === 0, findings };
}

function buildApprovalRecord({ preview, confirmationState, now }) {
  const proposal = preview.proposal;
  const id = buildRecordId("approval", proposal.id, now);
  return {
    schema: "gpao_t.approval_record.v1",
    id,
    createdAt: now,
    packetId: `packet.${id}`,
    proposalId: proposal.id,
    source: proposal.source,
    toolKind: proposal.toolKind,
    actionType: proposal.actionType,
    authorityLevel: proposal.authorityLevel,
    authorityLabel: preview.authorityDisplay.label,
    confirmationState,
    scope: "local_record_only",
    expectedEffect: proposal.expectedEffect,
    risk: proposal.risk,
    rollbackReference: proposal.rollbackReference,
    auditReference: `audit.for.${id}`,
    replayReference: `replay.for.${id}`,
    status: "written_local_only",
    storage: {
      format: "jsonl",
      path: ".gpao-t/approval/approval-records.jsonl",
    },
    boundaryState: LOCAL_BOUNDARY_STATE,
  };
}

function buildAuditRecord({ preview, approvalRecord, confirmationState, now }) {
  const proposal = preview.proposal;
  return {
    schema: "gpao_t.audit_record.v1",
    id: buildRecordId("audit", proposal.id, now),
    createdAt: now,
    approvalRecordId: approvalRecord.id,
    proposalId: proposal.id,
    source: proposal.source,
    requestedAction: `${proposal.toolKind}.${proposal.actionType}`,
    authorityLevel: proposal.authorityLevel,
    authorityLabel: preview.authorityDisplay.label,
    expectedEffect: proposal.expectedEffect,
    risk: proposal.risk,
    rollbackReference: proposal.rollbackReference,
    userConfirmationState: confirmationState,
    status: "written_local_only",
    replayReference: approvalRecord.replayReference,
    boundaryState: LOCAL_BOUNDARY_STATE,
    storage: {
      format: "jsonl",
      path: ".gpao-t/approval/audit-records.jsonl",
    },
  };
}

function buildRecordId(prefix, proposalId, now) {
  const stamp = now.replaceAll(/[^0-9]/g, "").slice(0, 14) || `${Date.now()}`;
  const safeProposal = String(proposalId || "proposal")
    .replaceAll(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 72);
  return `${prefix}.${stamp}.${safeProposal}`;
}

function appendJsonlRecord(record, filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(record)}\n`, { flag: "a" });
}

function readJsonlRecords(filePath, limit) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .reverse()
    .slice(0, limit);
}
