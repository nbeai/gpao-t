import { RuntimeError } from "./errors.js";
import { verifyToolPermit } from "./tool-permit.js";

export class ToolRegistry {
  constructor({ tools = [], permitSecret = null } = {}) { this.tools = new Map(); this.permitSecret = permitSecret; for (const tool of tools) this.register(tool); }

  register(tool) {
    if (!tool?.id || !Array.isArray(tool.capabilities) || typeof tool.execute !== "function") throw new RuntimeError("invalid_tool", "Tool id, capabilities, and executor are required", 400);
    const effect = tool.effect || (tool.externalEffect ? "external_mutation" : "read");
    if (!["read", "local_write", "external_send", "external_mutation"].includes(effect)) throw new RuntimeError("invalid_tool", "Tool effect is not supported", 400);
    const manifest = { id: String(tool.id), capabilities: [...tool.capabilities], effect, approval: tool.approval || (effect === "read" ? "none" : "explicit"), timeoutMs: Math.max(1, Number(tool.timeoutMs || 1000)), readiness: tool.readiness || "ready", execute: tool.execute };
    this.tools.set(manifest.id, manifest);
    return this.describe(manifest.id);
  }

  setPermitSecret(secret) { this.permitSecret = secret; }

  describe(id) { const tool = this.tools.get(id); return tool && { id: tool.id, capabilities: [...tool.capabilities], effect: tool.effect, approval: tool.approval, timeoutMs: tool.timeoutMs, readiness: tool.readiness }; }
  snapshot() { return { schema: "gpao_t.tool_registry.v1", tools: [...this.tools.keys()].map(id => this.describe(id)) }; }

  async execute({ toolId, call, args, permit }) {
    const tool = this.tools.get(toolId);
    if (!tool) throw new RuntimeError("tool_not_installed", "Requested tool is not installed", 404);
    if (tool.readiness !== "ready") throw new RuntimeError("tool_unavailable", "Requested tool is not ready", 503);
    if (!this.permitSecret || !verifyToolPermit(this.permitSecret, permit, call, tool)) throw new RuntimeError("tool_review_required", "Tool use requires an active, matching approval", 409, { toolId });
    const result = await tool.execute(args);
    return { schema: "gpao_t.tool_receipt.v1", toolId, effect: tool.effect, status: "succeeded", result, idempotencyKey: permit.idempotencyKey, permitDigest: permit.signature.slice(0, 16) };
  }
}

export function createFoundationToolRegistry({ permitSecret = null } = {}) {
  return new ToolRegistry({ permitSecret, tools: [{ id: "local.runtime_status", capabilities: ["read_status"], effect: "read", approval: "none", execute: async () => ({ status: "available" }) }] });
}
