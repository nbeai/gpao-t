import crypto from "node:crypto";
import { RuntimeError } from "./errors.js";
import { allocatePromptBudget, assertTaskPacket } from "./mct-contract.js";

export function createTaskPacket({ sessionId, input, activeGoal = null, contextWindow = 32_768, userId = null, projectId = null, channelId = null } = {}) {
  if (!sessionId || typeof input !== "string" || !input.trim()) throw new RuntimeError("invalid_task_packet", "A session and user message are required", 400);
  const now = Date.now();
  const id = `task_${crypto.randomUUID()}`;
  const packet = {
    schema: "gpao_t3.task_packet.v1",
    version: 1,
    id,
    scope: { level: "session", turnId: null, sessionId, projectId: null, userId },
    trace: { refs: [`request_${id}`], evidenceLevel: "user_confirmed" },
    authority: { allowedUse: "supporting_context", durablePromotion: false, decisionClass: "A0", decisionId: null },
    lifecycle: "raw",
    createdAt: now,
    updatedAt: now,
    expiresAt: null,
    invalidConditions: ["current_request_changed", "session_scope_changed"],
    sessionId,
    contextIdentity: { userId, projectId, channelId },
    currentRequest: input.trim(),
    activeTarget: activeGoal ? String(activeGoal) : null,
    answerAnchors: [],
    supportingContext: [],
    conflictBoundaries: [],
    blockedCells: [],
    rejectedCells: [],
    traceRefs: [`request_${id}`],
    replayRefs: [],
    uncertaintyReport: [],
    budget: allocatePromptBudget(contextWindow)
  };
  return assertTaskPacket(packet);
}
