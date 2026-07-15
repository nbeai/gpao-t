import { RuntimeError } from "./errors.js";
import { verifyToolPermit } from "./tool-permit.js";

function createDeadlineSignal({ timeoutMs, signal }) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort(signal?.reason);
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error("tool execution deadline exceeded"));
  }, timeoutMs);

  if (signal) {
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  };
}

function unknownOutcomeError(toolId, reason) {
  return new RuntimeError(
    "tool_outcome_unknown",
    "Tool execution did not confirm a safe result; review before trying again",
    504,
    { toolId, reason, retry: "manual_review_required" }
  );
}

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

  async execute({ toolId, call, args, permit, signal = null }) {
    const tool = this.tools.get(toolId);
    if (!tool) throw new RuntimeError("tool_not_installed", "Requested tool is not installed", 404);
    if (tool.readiness !== "ready") throw new RuntimeError("tool_unavailable", "Requested tool is not ready", 503);
    if (!this.permitSecret || !verifyToolPermit(this.permitSecret, permit, call, tool)) throw new RuntimeError("tool_review_required", "Tool use requires an active, matching approval", 409, { toolId });
    const deadline = createDeadlineSignal({ timeoutMs: tool.timeoutMs, signal });
    const timeout = new Promise((_, reject) => {
      deadline.signal.addEventListener("abort", () => reject(unknownOutcomeError(toolId, deadline.didTimeout() ? "deadline_exceeded" : "cancelled")), { once: true });
    });

    let result;
    try {
      // Executors may opt into cancellation by reading context.signal. The registry never retries because an interrupted external action can be indeterminate.
      result = await Promise.race([tool.execute(args, { signal: deadline.signal, toolId, call }), timeout]);
    } catch (error) {
      if (error?.code === "tool_outcome_unknown") throw error;
      if (deadline.signal.aborted) throw unknownOutcomeError(toolId, deadline.didTimeout() ? "deadline_exceeded" : "cancelled");
      throw new RuntimeError("tool_execution_failed", "Tool execution failed", 502, { toolId, retry: "manual_review_required" });
    } finally {
      deadline.dispose();
    }
    return { schema: "gpao_t.tool_receipt.v1", toolId, effect: tool.effect, status: "succeeded", result, idempotencyKey: permit.idempotencyKey, permitDigest: permit.signature.slice(0, 16) };
  }
}

export function createFoundationToolRegistry({ permitSecret = null } = {}) {
  return new ToolRegistry({ permitSecret, tools: [{ id: "local.runtime_status", capabilities: ["read_status"], effect: "read", approval: "none", execute: async () => ({ status: "available" }) }] });
}
