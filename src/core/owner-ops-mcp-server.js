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

export function callOwnerOpsMcpTool({ name, arguments: args = {}, root } = {}) {
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
    if (args.confirmLocalRecord !== true) {
      return mcpTextResult({
        schema: "gpao_t.owner_ops_mcp_rejected.v0_1",
        status: "rejected",
        reason: "confirmLocalRecord true is required before local JSONL write.",
        requiredField: "confirmLocalRecord",
        externalActionsRemainBlocked: true,
      }, { isError: true });
    }
    return mcpTextResult(writeOwnerOpsLocalRecord({
      root,
      workflowType: args.workflowType,
      inputText: args.inputText,
      businessType: args.businessType,
      userDecision: args.userDecision,
    }));
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

export function handleOwnerOpsMcpMessage(message, { root } = {}) {
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
  if (blockedWrite.result?.isError !== true) findings.push("local_write_must_require_confirmation");

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
      confirmLocalRecord: {
        type: "boolean",
        description: "true일 때만 로컬 JSONL 기록을 쓴다.",
      },
    }, ["workflowType", "inputText", "confirmLocalRecord"]);
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
