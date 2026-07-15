import { RuntimeError } from "./errors.js";
import { verifyToolPermit } from "./tool-permit.js";
import { runToolPreflight } from "./tool-preflight.js";
import { ToolRepairRegistry } from "./tool-repair-registry.js";
import { classifyToolFailure, toolFailureError } from "./tool-failure.js";
import { assertNoRawSecretMaterial } from "./provider.js";
import { assertCapabilityPayloadHasNoSecrets } from "./secret-hygiene.js";

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
  constructor({ tools = [], permitSecret = null, repairRegistry = new ToolRepairRegistry(), maxOutcomes = 10_000 } = {}) { this.tools = new Map(); this.permitSecret = permitSecret; this.repairRegistry = repairRegistry; this.outcomes = new Map(); this.maxOutcomes = maxOutcomes; for (const tool of tools) this.register(tool); }

  register(tool) {
    if (!tool?.id || !Array.isArray(tool.capabilities) || typeof tool.execute !== "function") throw new RuntimeError("invalid_tool", "Tool id, capabilities, and executor are required", 400);
    if (this.tools.has(String(tool.id))) throw new RuntimeError("tool_conflict", "같은 도구가 이미 등록되어 있습니다.", 409);
    const effect = tool.effect || (tool.externalEffect ? "external_mutation" : "read");
    if (!["read", "local_write", "external_send", "external_mutation"].includes(effect)) throw new RuntimeError("invalid_tool", "Tool effect is not supported", 400);
    const manifest = { id: String(tool.id), capabilities: [...tool.capabilities], operations: [...new Set(tool.operations || ["run", "read"])], effect, approval: tool.approval || (effect === "read" ? "none" : "explicit"), timeoutMs: Math.max(1, Number(tool.timeoutMs || 1000)), readiness: tool.readiness || "ready", inputSchema: tool.inputSchema ? structuredClone(tool.inputSchema) : null, preflight: tool.preflight || null, reconcile: tool.reconcile || null, execute: tool.execute };
    this.tools.set(manifest.id, manifest);
    return this.describe(manifest.id);
  }

  setPermitSecret(secret) { this.permitSecret = secret; }

  setReadiness(id, readiness) {
    const tool = this.tools.get(String(id));
    if (!tool) throw new RuntimeError("tool_not_installed", "요청한 도구가 설치되어 있지 않습니다.", 404);
    if (!["ready", "disabled"].includes(readiness)) throw new RuntimeError("invalid_tool_input", "지원하지 않는 도구 상태입니다.", 400);
    tool.readiness = readiness;
    return this.describe(id);
  }

  unregister(id) {
    const key = String(id);
    if (key.startsWith("foundation.") || key === "local.runtime_status" || key === "runtime.status") throw new RuntimeError("tool_permission_denied", "기본 시스템 도구는 제거하지 않고 비활성화해야 합니다.", 403);
    return this.tools.delete(key);
  }

  describe(id) { const tool = this.tools.get(id); return tool && { id: tool.id, capabilities: [...tool.capabilities], operations: [...tool.operations], effect: tool.effect, approval: tool.approval, timeoutMs: tool.timeoutMs, readiness: tool.readiness }; }
  snapshot() { return { schema: "gpao_t3.tool_registry.v1", tools: [...this.tools.keys()].map(id => this.describe(id)) }; }

  async preflight({ toolId, action, args = {}, context = {} }) {
    const tool = this.tools.get(toolId);
    if (!tool) throw new RuntimeError("tool_not_installed", "요청한 도구가 설치되어 있지 않습니다.", 404);
    try { return await runToolPreflight({ tool, action, args, context }); }
    catch (error) {
      const repair = this.repairRegistry.resolve(classifyToolFailure(error));
      throw toolFailureError(error, { toolId, action, stage: "preflight", effect: tool.effect, error, repair });
    }
  }

  async execute({ toolId, call, args, permit, signal = null }) {
    const tool = this.tools.get(toolId);
    if (!tool) throw new RuntimeError("tool_not_installed", "요청한 도구가 설치되어 있지 않습니다.", 404);
    assertCapabilityPayloadHasNoSecrets(args);
    const preflight = await this.preflight({ toolId, action: call.action, args, context: { call } });
    if (!this.permitSecret || !verifyToolPermit(this.permitSecret, permit, call, tool)) {
      const error = new RuntimeError("tool_review_required", "도구 사용 내용을 확인하고 승인해야 합니다.", 409, { toolId });
      throw toolFailureError(error, { toolId, action: call.action, stage: "authorize", effect: tool.effect, error, repair: this.repairRegistry.resolve("authority_required") });
    }
    const outcomeKey = [call.principalId, toolId, call.action, call.argsDigest, permit.idempotencyKey].join(":");
    const existing = this.outcomes.get(outcomeKey);
    if (existing) return existing;
    const deadline = createDeadlineSignal({ timeoutMs: tool.timeoutMs, signal });
    const timeout = new Promise((_, reject) => {
      deadline.signal.addEventListener("abort", () => reject(unknownOutcomeError(toolId, deadline.didTimeout() ? "deadline_exceeded" : "cancelled")), { once: true });
    });

    const operation = (async () => {
      const startedAt = Date.now();
      let result;
      try {
      // Executors may opt into cancellation by reading context.signal. The registry never retries because an interrupted external action can be indeterminate.
        result = await Promise.race([tool.execute(args, { signal: deadline.signal, toolId, call }), timeout]);
        assertNoRawSecretMaterial(result);
        assertCapabilityPayloadHasNoSecrets(result);
      } catch (caught) {
        const error = caught?.code === "tool_outcome_unknown" ? caught
          : deadline.signal.aborted ? unknownOutcomeError(toolId, deadline.didTimeout() ? "deadline_exceeded" : "cancelled")
            : caught instanceof RuntimeError ? caught : new RuntimeError("tool_execution_failed", "Tool execution failed", 502, { toolId, retry: "manual_review_required" });
        const repair = this.repairRegistry.resolve(classifyToolFailure(error));
        throw toolFailureError(error, { toolId, action: call.action, stage: "execute", effect: tool.effect, error, repair });
      } finally { deadline.dispose(); }
      return Object.freeze({ schema: "gpao_t3.tool_receipt.v2", toolId, action: call.action, effect: tool.effect, status: "succeeded", result, preflight, startedAt, finishedAt: Date.now(), idempotencyKey: permit.idempotencyKey, permitDigest: permit.signature.slice(0, 16), repair: null });
    })();
    this.outcomes.set(outcomeKey, operation);
    while (this.outcomes.size > this.maxOutcomes) this.outcomes.delete(this.outcomes.keys().next().value);
    try { return await operation; }
    catch (error) { if (error.toolFailure?.outcome !== "unknown") this.outcomes.delete(outcomeKey); throw error; }
  }
}

export function createFoundationToolRegistry({ permitSecret = null } = {}) {
  return new ToolRegistry({ permitSecret, tools: [{ id: "local.runtime_status", capabilities: ["read_status"], effect: "read", approval: "none", execute: async () => ({ status: "available" }) }] });
}
