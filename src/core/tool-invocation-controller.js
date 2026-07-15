import crypto from "node:crypto";
import { RuntimeError } from "./errors.js";
import { createToolCall, createToolPermit } from "./tool-permit.js";

function publicRecord(record) {
  return {
    schema: "gpao_t3.tool_invocation.v1", invocationId: record.invocationId, principalId: record.principalId,
    requestId: record.requestId, toolId: record.toolId, action: record.action, effect: record.effect,
    status: record.status, outcome: record.outcome || null, approvalRequired: record.approvalRequired,
    preflight: record.preflight || null, receipt: record.receipt || null, failure: record.failure || null,
    reason: record.reason || null, createdAt: record.createdAt, updatedAt: Date.now()
  };
}

export class ToolInvocationController {
  constructor({ registry, writer = null, secret, generation = 1, maxRecords = 1_000, approvalTtlMs = 120_000 } = {}) {
    this.registry = registry; this.writer = writer; this.secret = secret; this.generation = generation;
    this.maxRecords = maxRecords; this.approvalTtlMs = approvalTtlMs; this.records = new Map(); this.requests = new Map();
  }

  setWriter(writer) { this.writer = writer; }
  async persist(record) { const clean = publicRecord(record); if (this.writer) await this.writer.call("recordToolInvocation", { record: clean, generation: this.generation }); return clean; }

  async begin({ principalId, sessionId = null, requestId, toolId, action, args = {} }) {
    if (![principalId, requestId, toolId, action].every(Boolean)) throw new RuntimeError("invalid_tool_input", "도구 실행 식별 정보가 필요합니다.", 400);
    const requestKey = `${principalId}:${requestId}`;
    const existingId = this.requests.get(requestKey);
    if (existingId) return publicRecord(this.records.get(existingId));
    const manifest = this.registry.describe(toolId);
    if (!manifest) throw new RuntimeError("tool_not_installed", "요청한 도구가 설치되어 있지 않습니다.", 404);
    const preflight = await this.registry.preflight({ toolId, action, args, context: { principalId } });
    const invocationId = `inv_${crypto.randomUUID()}`;
    const call = createToolCall({ taskPacketId: invocationId, commandId: invocationId, principalId, sessionId, generation: this.generation, toolId, action, args, idempotencyKey: requestId });
    const record = { invocationId, principalId, requestId, toolId, action, args, call, effect: manifest.effect, approvalRequired: manifest.approval === "explicit", preflight, status: manifest.approval === "explicit" ? "awaiting_approval" : "prepared", createdAt: Date.now(), approvalExpiresAt: Date.now() + this.approvalTtlMs, controller: null, promise: null };
    this.records.set(invocationId, record); this.requests.set(requestKey, invocationId);
    while (this.records.size > this.maxRecords) { const first = this.records.keys().next().value; const removed = this.records.get(first); this.records.delete(first); this.requests.delete(`${removed.principalId}:${removed.requestId}`); }
    await this.persist(record);
    return record.approvalRequired ? publicRecord(record) : this.perform(record, null);
  }

  async approve({ principalId, invocationId, approvalId }) {
    const record = this.require(principalId, invocationId);
    if (record.status !== "awaiting_approval") return publicRecord(record);
    if (Date.now() > record.approvalExpiresAt) { record.status = "cancelled"; record.reason = "approval_expired"; await this.persist(record); return publicRecord(record); }
    if (!approvalId) throw new RuntimeError("tool_review_required", "도구 사용 내용을 확인하고 승인해야 합니다.", 409);
    return this.perform(record, approvalId);
  }

  async perform(record, approvalId) {
    record.status = "executing"; record.controller = new AbortController();
    const permit = createToolPermit(this.secret, record.call, { effect: record.effect, approvalId });
    await this.persist(record);
    record.promise = this.registry.execute({ toolId: record.toolId, call: record.call, args: record.args, permit, signal: record.controller.signal });
    try { record.receipt = await record.promise; record.status = "succeeded"; record.outcome = "completed"; }
    catch (error) { record.failure = error.toolFailure || null; record.status = error.toolFailure?.outcome === "unknown" ? "unknown" : "failed"; record.outcome = error.toolFailure?.outcome || "not_completed"; record.reason = error.code || "tool_execution_failed"; }
    finally { record.args = null; record.controller = null; record.promise = null; }
    return this.persist(record);
  }

  async cancel({ principalId, invocationId }) {
    const record = this.require(principalId, invocationId);
    if (["succeeded", "failed", "unknown", "cancelled"].includes(record.status)) return publicRecord(record);
    if (record.status === "awaiting_approval" || record.status === "prepared") { record.status = "cancelled"; record.outcome = "not_completed"; record.reason = "cancelled_before_execution"; record.args = null; return this.persist(record); }
    record.controller?.abort(new Error("user_cancelled"));
    return record.promise ? (await record.promise.catch(() => {}), publicRecord(record)) : publicRecord(record);
  }

  async get({ principalId, invocationId }) {
    const record = this.records.get(String(invocationId));
    if (record && record.principalId === principalId) return publicRecord(record);
    return this.writer?.call("getToolInvocation", { invocationId, principalId }) || null;
  }

  require(principalId, invocationId) {
    const record = this.records.get(String(invocationId));
    if (!record || record.principalId !== principalId) throw new RuntimeError("tool_target_not_found", "도구 실행 기록을 찾을 수 없습니다.", 404);
    return record;
  }
}
