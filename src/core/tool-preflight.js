import { RuntimeError } from "./errors.js";
import { validateCapabilityValue } from "./capability-manifest.js";

export async function runToolPreflight({ tool, action, args, context = {} }) {
  if (tool.readiness !== "ready") throw new RuntimeError("tool_unavailable", "도구가 아직 준비되지 않았습니다.", 503);
  if (!tool.operations.includes(action)) throw new RuntimeError("invalid_tool_input", "This tool does not support the requested operation", 400);
  if (tool.inputSchema) validateCapabilityValue(args, tool.inputSchema, "input");
  if (typeof tool.preflight === "function") {
    const result = await tool.preflight(args, { ...context, action, toolId: tool.id });
    if (result?.ready !== true) throw new RuntimeError(result?.code || "tool_unavailable", "도구 사전 점검을 통과하지 못했습니다.", 503);
  }
  return Object.freeze({ schema: "gpao_t3.tool_preflight_receipt.v1", toolId: tool.id, action, status: "ready", checkedAt: Date.now() });
}
