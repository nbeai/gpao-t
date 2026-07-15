import crypto from "node:crypto";
import { RuntimeError } from "./errors.js";

function digest(value) { return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex"); }
function canonical(permit) {
  return JSON.stringify({ invocationId: permit.invocationId, commandId: permit.commandId, taskPacketId: permit.taskPacketId, principalId: permit.principalId, sessionId: permit.sessionId || null, generation: permit.generation, toolId: permit.toolId, action: permit.action, argsDigest: permit.argsDigest, effect: permit.effect, approvalId: permit.approvalId || null, idempotencyKey: permit.idempotencyKey, expiresAt: permit.expiresAt });
}
export function createToolCall({ taskPacketId, commandId, principalId, sessionId = null, generation, toolId, action, args, idempotencyKey }) {
  if (![taskPacketId, commandId, principalId, toolId, action, idempotencyKey].every(Boolean)) throw new RuntimeError("invalid_tool_call", "Tool call identity is incomplete", 400);
  return { schema: "gpao_t3.tool_call.v1", invocationId: `tool_${crypto.randomUUID()}`, taskPacketId, commandId, principalId, sessionId, generation, toolId, action, argsDigest: digest(args), idempotencyKey };
}
export function createToolPermit(secret, call, { effect, approvalId = null, ttlMs = 30_000 } = {}) {
  const permit = { ...call, effect, approvalId, expiresAt: Date.now() + ttlMs };
  permit.signature = crypto.createHmac("sha256", secret).update(canonical(permit)).digest("hex");
  return permit;
}
export function verifyToolPermit(secret, permit, call, manifest) {
  if (!permit || permit.expiresAt < Date.now() || permit.toolId !== call.toolId || permit.action !== call.action || permit.argsDigest !== call.argsDigest || permit.principalId !== call.principalId || permit.sessionId !== call.sessionId || permit.commandId !== call.commandId || permit.taskPacketId !== call.taskPacketId || permit.generation !== call.generation || permit.effect !== manifest.effect) return false;
  if (manifest.approval === "explicit" && !permit.approvalId) return false;
  const expected = crypto.createHmac("sha256", secret).update(canonical(permit)).digest("hex");
  return permit.signature?.length === expected.length && crypto.timingSafeEqual(Buffer.from(permit.signature), Buffer.from(expected));
}
