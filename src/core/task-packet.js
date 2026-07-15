import crypto from "node:crypto";
import { RuntimeError } from "./errors.js";

export function createTaskPacket({ sessionId, input, activeGoal = null, memoryCandidates = [], authority = {} } = {}) {
  if (!sessionId || typeof input !== "string" || !input.trim()) throw new RuntimeError("invalid_task_packet", "A session and user message are required", 400);
  return {
    schema: "gpao_t.task_packet.v1",
    id: `task_${crypto.randomUUID()}`,
    sessionId,
    input: input.trim(),
    activeGoal: activeGoal ? String(activeGoal) : null,
    memoryCandidates: memoryCandidates.map(candidate => ({ id: candidate.id, source: candidate.source, score: candidate.score, traceRef: candidate.traceRef || null })),
    authority: { allowReadTools: Boolean(authority.allowReadTools), allowWriteTools: Boolean(authority.allowWriteTools), durableMemoryPromotion: false },
    createdAt: Date.now()
  };
}
