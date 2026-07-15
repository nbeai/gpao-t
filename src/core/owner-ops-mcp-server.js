import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildOwnerOpsAutomationCandidates,
  buildOwnerOpsEffectReplay,
  buildOwnerOpsSkillPack,
  buildOwnerOpsWorkflowPreview,
  writeOwnerOpsLocalRecord,
} from "./owner-ops.js";
import { buildOwnerOpsMcpToolManifest } from "./owner-ops-connectors.js";
import {
  previewOwnerOpsFolderIntake,
  previewOwnerOpsLocalFileIntake,
  previewOwnerOpsPasteIntake,
  previewOwnerOpsTableTextIntake,
} from "./owner-ops-intake-connectors.js";

const SERVER_INFO = {
  name: "gpao-t-owner-ops",
  version: "0.1.0",
};

const CAPABILITIES = {
  tools: {
    listChanged: false,
  },
};

const LOCAL_WRITE_ACTION = "owner_ops.local_record_write";
const APPROVAL_RECEIPT_SCHEMA = "gpao_t.owner_ops_user_approval_receipt.v1";
const MAX_APPROVAL_TTL_MS = 15 * 60 * 1000;
const consumedApprovalReceiptIds = new Set();

export function buildOwnerOpsMcpServerDescriptor() {
  return {
    schema: "gpao_t.owner_ops_mcp_server_descriptor.v0_1",
    status: "ready",
    serverInfo: SERVER_INFO,
    transport: "stdio_json_rpc",
    network: "not_used",
    exposedMethods: ["initialize", "tools/list", "tools/call"],
    blockedMethods: ["resources/write", "prompts/mutate", "sampling/createMessage", "external/send"],
    toolCount: buildOwnerOpsMcpToolManifest().tools.length,
    authorityBoundary: {
      readOnlyTools: ["owner_ops.skill_pack", "owner_ops.candidates", "owner_ops.workflow_preview", "owner_ops.replay"],
      localWriteTools: ["owner_ops.local_record_write"],
      localWriteApproval: "verifiable_user_bound_hmac_receipt_required",
      blockedExternalActions: [
        "oauth",
        "credential_store",
        "customer_send",
        "review_posting",
        "payment_refund_delete",
        "background_automation",
      ],
    },
  };
}

export function listOwnerOpsMcpTools() {
  return buildOwnerOpsMcpToolManifest().tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: toMcpInputSchema(tool),
    annotations: {
      gpaoAuthority: tool.kind,
      approvalRequired: Boolean(tool.approvalRequired),
      externalNetwork: false,
      customerSend: false,
    },
  }));
}

export function callOwnerOpsMcpTool({
  name,
  arguments: args = {},
  root,
  approvalSecret = process.env.GPAO_T_MCP_APPROVAL_SECRET,
  authenticatedUserId = process.env.GPAO_T_MCP_USER_ID,
  now = new Date().toISOString(),
} = {}) {
  if (name === "owner_ops.skill_pack") {
    return mcpTextResult(buildOwnerOpsSkillPack());
  }
  if (name === "owner_ops.candidates") {
    return mcpTextResult(buildOwnerOpsAutomationCandidates({
      request: args.request,
      businessType: args.businessType,
    }));
  }
  if (name === "owner_ops.workflow_preview") {
    return mcpTextResult(buildOwnerOpsWorkflowPreview({
      workflowType: args.workflowType,
      inputText: args.inputText,
      businessType: args.businessType,
    }));
  }
  if (name === "owner_ops.intake_preview") {
    return mcpTextResult(callOwnerOpsIntakePreview({ args, root }));
  }
  if (name === "owner_ops.local_record_write") {
    const approvalCheck = verifyOwnerOpsLocalWriteApprovalReceipt({
      receipt: args.approvalReceipt,
      root,
      userId: authenticatedUserId,
      approvalSecret,
      request: args,
      now,
    });
    if (approvalCheck.status !== "ready") {
      return mcpTextResult({
        schema: "gpao_t.owner_ops_mcp_rejected.v0_1",
        status: "rejected",
        reason: "verifiable_user_bound_approval_receipt_required",
        requiredField: "approvalReceipt",
        approvalCheck,
        externalActionsRemainBlocked: true,
      }, { isError: true });
    }
    if (consumedApprovalReceiptIds.has(approvalCheck.receiptId)) {
      return mcpTextResult({
        schema: "gpao_t.owner_ops_mcp_rejected.v0_1",
        status: "rejected",
        reason: "approval_receipt_already_consumed",
        approvalReceiptId: approvalCheck.receiptId,
        externalActionsRemainBlocked: true,
      }, { isError: true });
    }
    consumedApprovalReceiptIds.add(approvalCheck.receiptId);
    const result = writeOwnerOpsLocalRecord({
      root,
      workflowType: args.workflowType,
      inputText: args.inputText,
      businessType: args.businessType,
      userDecision: args.userDecision,
      now,
    });
    return mcpTextResult({
      ...result,
      approvalReceipt: {
        id: approvalCheck.receiptId,
        userId: approvalCheck.userId,
        verified: true,
        consumed: true,
      },
    });
  }
  if (name === "owner_ops.replay") {
    return mcpTextResult(buildOwnerOpsEffectReplay({ root }));
  }
  return mcpTextResult({
    schema: "gpao_t.owner_ops_mcp_error.v0_1",
    status: "error",
    error: "unknown_tool",
    toolName: name,
  }, { isError: true });
}

export function handleOwnerOpsMcpMessage(message, {
  root,
  approvalSecret,
  authenticatedUserId,
  now,
} = {}) {
  if (!message || typeof message !== "object") {
    return null;
  }
  if (message.method === "notifications/initialized") {
    return null;
  }
  if (message.method === "initialize") {
    return jsonRpcResult(message.id, {
      protocolVersion: message.params?.protocolVersion || "2024-11-05",
      capabilities: CAPABILITIES,
      serverInfo: SERVER_INFO,
      instructions:
        "GPAO-T Owner Ops exposes Korean owner-operator automation previews, local records, and replay. It never sends customer messages or connects external accounts.",
    });
  }
  if (message.method === "tools/list") {
    return jsonRpcResult(message.id, {
      tools: listOwnerOpsMcpTools(),
    });
  }
  if (message.method === "tools/call") {
    return jsonRpcResult(message.id, callOwnerOpsMcpTool({
      name: message.params?.name,
      arguments: message.params?.arguments || {},
      root,
      approvalSecret,
      authenticatedUserId,
      now,
    }));
  }
  return jsonRpcError(message.id, -32601, `Unsupported method: ${message.method || "unknown"}`);
}

export function verifyOwnerOpsMcpServer() {
  const descriptor = buildOwnerOpsMcpServerDescriptor();
  const initialized = handleOwnerOpsMcpMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2024-11-05" },
  });
  const tools = handleOwnerOpsMcpMessage({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
  });
  const preview = handleOwnerOpsMcpMessage({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "owner_ops.workflow_preview",
      arguments: {
        workflowType: "review_reply",
        inputText: "음식은 맛있었는데 대기 시간이 길었어요.",
      },
    },
  });
  const blockedWrite = handleOwnerOpsMcpMessage({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "owner_ops.local_record_write",
      arguments: {
        workflowType: "review_reply",
        inputText: "친절했어요.",
      },
    },
  });

  const findings = [];
  if (descriptor.status !== "ready") findings.push("descriptor_not_ready");
  if (initialized.result?.serverInfo?.name !== "gpao-t-owner-ops") findings.push("initialize_failed");
  if ((tools.result?.tools || []).length < 5) findings.push("tool_list_incomplete");
  if (!preview.result?.content?.[0]?.text?.includes("gpao_t.owner_ops_workflow_preview.v0_1")) {
    findings.push("workflow_preview_failed");
  }
  if (blockedWrite.result?.isError !== true) findings.push("local_write_must_require_user_bound_receipt");

  return {
    schema: "gpao_t.owner_ops_mcp_server_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    checkedMethods: descriptor.exposedMethods,
    checkedToolCount: tools.result?.tools?.length || 0,
    nextSafeAction: findings.length
      ? "Fix MCP server findings before registering this server with any host."
      : "Register the stdio command as a local MCP server in a test host; do not connect external accounts.",
  };
}

function toMcpInputSchema(tool) {
  if (tool.name === "owner_ops.candidates") {
    return objectSchema({
      request: { type: "string", description: "사업자가 말한 반복 업무나 자동화 요구" },
      businessType: { type: "string", description: "선택 업종 힌트" },
    });
  }
  if (tool.name === "owner_ops.workflow_preview") {
    return objectSchema({
      workflowType: {
        type: "string",
        enum: ["review_reply", "shopping_inquiry", "reservation_inquiry"],
      },
      inputText: { type: "string" },
      businessType: { type: "string" },
    }, ["workflowType", "inputText"]);
  }
  if (tool.name === "owner_ops.local_record_write") {
    return objectSchema({
      workflowType: {
        type: "string",
        enum: ["review_reply", "shopping_inquiry", "reservation_inquiry"],
      },
      inputText: { type: "string" },
      businessType: { type: "string" },
      userDecision: { type: "string", enum: ["preview_accepted_for_local_record", "rejected"] },
      approvalReceipt: {
        type: "object",
        description: "호스트가 인증된 사용자에게 발급한 짧은 수명의 서명 승인 영수증",
        properties: {
          schema: { type: "string", enum: [APPROVAL_RECEIPT_SCHEMA] },
          receiptId: { type: "string" },
          userId: { type: "string" },
          action: { type: "string", enum: [LOCAL_WRITE_ACTION] },
          rootDigest: { type: "string" },
          requestDigest: { type: "string" },
          issuedAt: { type: "string" },
          expiresAt: { type: "string" },
          nonce: { type: "string" },
          signature: { type: "string" },
        },
        required: [
          "schema",
          "receiptId",
          "userId",
          "action",
          "rootDigest",
          "requestDigest",
          "issuedAt",
          "expiresAt",
          "nonce",
          "signature",
        ],
        additionalProperties: false,
      },
    }, ["workflowType", "inputText", "approvalReceipt"]);
  }
  if (tool.name === "owner_ops.intake_preview") {
    return objectSchema({
      intakeType: {
        type: "string",
        enum: ["paste", "table_text", "local_file", "local_folder"],
      },
      inputText: { type: "string" },
      content: { type: "string" },
      filename: { type: "string" },
      filePath: { type: "string" },
      folderPath: { type: "string" },
      workflowType: {
        type: "string",
        enum: ["review_reply", "shopping_inquiry", "reservation_inquiry"],
      },
      businessType: { type: "string" },
    }, ["intakeType"]);
  }
  return objectSchema({});
}

function callOwnerOpsIntakePreview({ args, root }) {
  if (args.intakeType === "paste") {
    return previewOwnerOpsPasteIntake({
      inputText: args.inputText,
      workflowType: args.workflowType,
      businessType: args.businessType,
    });
  }
  if (args.intakeType === "table_text") {
    return previewOwnerOpsTableTextIntake({
      content: args.content || args.inputText,
      filename: args.filename,
      workflowType: args.workflowType,
      businessType: args.businessType,
    });
  }
  if (args.intakeType === "local_file") {
    return previewOwnerOpsLocalFileIntake({
      root,
      filePath: args.filePath,
      workflowType: args.workflowType,
      businessType: args.businessType,
    });
  }
  if (args.intakeType === "local_folder") {
    return previewOwnerOpsFolderIntake({
      root,
      folderPath: args.folderPath,
    });
  }
  return {
    schema: "gpao_t.owner_ops_intake_preview_error.v0_1",
    status: "blocked",
    reason: "unknown_intake_type",
    intakeType: args.intakeType,
  };
}

export function createOwnerOpsLocalWriteApprovalReceipt({
  root,
  userId,
  approvalSecret,
  request = {},
  issuedAt = new Date().toISOString(),
  expiresAt = new Date(Date.parse(issuedAt) + 5 * 60 * 1000).toISOString(),
  nonce = randomUUID(),
} = {}) {
  assertApprovalIssuerInputs({ root, userId, approvalSecret, issuedAt, expiresAt });
  const unsigned = {
    schema: APPROVAL_RECEIPT_SCHEMA,
    receiptId: `owner-ops-approval-${sha256(`${userId}:${nonce}:${issuedAt}`).slice(0, 24)}`,
    userId,
    action: LOCAL_WRITE_ACTION,
    rootDigest: approvalRootDigest(root),
    requestDigest: ownerOpsLocalWriteRequestDigest(request),
    issuedAt,
    expiresAt,
    nonce,
  };
  return {
    ...unsigned,
    signature: signApprovalReceipt(unsigned, approvalSecret),
  };
}

export function verifyOwnerOpsLocalWriteApprovalReceipt({
  receipt,
  root,
  userId,
  approvalSecret,
  request = {},
  now = new Date().toISOString(),
} = {}) {
  const findings = [];
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    findings.push("approval_receipt_missing");
  }
  if (!userId) findings.push("authenticated_user_missing");
  if (!approvalSecret || String(approvalSecret).length < 32) findings.push("approval_verification_secret_missing_or_weak");
  if (findings.length) return blockedApprovalCheck(findings);

  if (receipt.schema !== APPROVAL_RECEIPT_SCHEMA) findings.push("approval_receipt_schema_invalid");
  if (receipt.action !== LOCAL_WRITE_ACTION) findings.push("approval_action_mismatch");
  if (receipt.userId !== userId) findings.push("approval_user_mismatch");
  if (receipt.rootDigest !== approvalRootDigest(root)) findings.push("approval_root_mismatch");
  if (receipt.requestDigest !== ownerOpsLocalWriteRequestDigest(request)) findings.push("approval_request_mismatch");

  const issuedAtMs = Date.parse(receipt.issuedAt);
  const expiresAtMs = Date.parse(receipt.expiresAt);
  const nowMs = Date.parse(now);
  if (![issuedAtMs, expiresAtMs, nowMs].every(Number.isFinite)) {
    findings.push("approval_time_invalid");
  } else {
    if (issuedAtMs > nowMs + 30_000) findings.push("approval_not_yet_valid");
    if (expiresAtMs <= nowMs) findings.push("approval_expired");
    if (expiresAtMs <= issuedAtMs || expiresAtMs - issuedAtMs > MAX_APPROVAL_TTL_MS) {
      findings.push("approval_ttl_invalid");
    }
  }

  const unsigned = {
    schema: receipt.schema,
    receiptId: receipt.receiptId,
    userId: receipt.userId,
    action: receipt.action,
    rootDigest: receipt.rootDigest,
    requestDigest: receipt.requestDigest,
    issuedAt: receipt.issuedAt,
    expiresAt: receipt.expiresAt,
    nonce: receipt.nonce,
  };
  const expectedSignature = signApprovalReceipt(unsigned, approvalSecret);
  if (!safeEqual(receipt.signature, expectedSignature)) findings.push("approval_signature_invalid");
  if (!receipt.receiptId || !receipt.nonce) findings.push("approval_identity_missing");

  return findings.length
    ? blockedApprovalCheck(findings)
    : {
      schema: "gpao_t.owner_ops_user_approval_receipt_check.v1",
      status: "ready",
      findings: [],
      receiptId: receipt.receiptId,
      userId: receipt.userId,
      action: receipt.action,
    };
}

function assertApprovalIssuerInputs({ root, userId, approvalSecret, issuedAt, expiresAt }) {
  if (!root) throw new Error("approval receipt requires root");
  if (!userId) throw new Error("approval receipt requires userId");
  if (!approvalSecret || String(approvalSecret).length < 32) {
    throw new Error("approval receipt requires a secret of at least 32 characters");
  }
  const issuedAtMs = Date.parse(issuedAt);
  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(issuedAtMs) || !Number.isFinite(expiresAtMs)) {
    throw new Error("approval receipt requires valid timestamps");
  }
  if (expiresAtMs <= issuedAtMs || expiresAtMs - issuedAtMs > MAX_APPROVAL_TTL_MS) {
    throw new Error("approval receipt lifetime must be positive and no longer than 15 minutes");
  }
}

function blockedApprovalCheck(findings) {
  return {
    schema: "gpao_t.owner_ops_user_approval_receipt_check.v1",
    status: "blocked",
    findings,
    receiptId: null,
    userId: null,
    action: LOCAL_WRITE_ACTION,
  };
}

function ownerOpsLocalWriteRequestDigest(request) {
  return sha256(JSON.stringify({
    workflowType: request.workflowType || "review_reply",
    inputText: String(request.inputText || ""),
    businessType: request.businessType || "",
    userDecision: request.userDecision || "preview_accepted_for_local_record",
  }));
}

function approvalRootDigest(root) {
  return sha256(realpathSync(resolve(root || process.cwd())));
}

function signApprovalReceipt(unsigned, approvalSecret) {
  return createHmac("sha256", String(approvalSecret))
    .update(JSON.stringify(unsigned))
    .digest("hex");
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function safeEqual(actual, expected) {
  const actualBuffer = Buffer.from(String(actual || ""));
  const expectedBuffer = Buffer.from(String(expected || ""));
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function objectSchema(properties, required = []) {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

function mcpTextResult(payload, { isError = false } = {}) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
    isError,
  };
}

function jsonRpcResult(id, result) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function jsonRpcError(id, code, message) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
}
