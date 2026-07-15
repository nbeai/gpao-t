import crypto from "node:crypto";
import { canonicalDigest } from "./canonical-json.js";
import { RuntimeError } from "./errors.js";
import { MCT_SURFACE_EVENT_TYPES, mctSurfacePayloadFindings } from "./mct-contract.js";

export const SURFACE_EVENT_TYPES = Object.freeze([
  "turn.accepted", "turn.completed", "turn.failed", "turn.cancelled",
  "text.delta", "text.complete", "tool.proposed", "tool.running", "tool.completed", "tool.failed",
  "file.created", "file.updated", "approval.required", "approval.resolved", "memory.referenced",
  ...MCT_SURFACE_EVENT_TYPES,
  "recovery.started", "recovery.completed", "recovery.failed", "update.started", "update.progress",
  "update.completed", "update.failed", "stream.reconnecting"
]);

const VISIBILITIES = new Set(["user", "operator", "internal"]);
const SENSITIVITIES = new Set(["public", "private", "secret"]);
const SENSITIVE_KEY = /(?:api[-_]?key|authorization|cookie|credential|password|secret|token)/i;

function rejectSecret(value, key = "") {
  if (SENSITIVE_KEY.test(key)) throw new RuntimeError("surface_event_secret_rejected", "Secret-bearing fields cannot enter the event journal", 400, { field: key });
  if (Array.isArray(value)) return value.forEach(entry => rejectSecret(entry));
  if (value && typeof value === "object") for (const [childKey, child] of Object.entries(value)) rejectSecret(child, childKey);
}

export function createSurfaceEvent(input = {}) {
  if (!SURFACE_EVENT_TYPES.includes(input.type)) throw new RuntimeError("invalid_surface_event", "Surface event type is unsupported", 400, { type: input.type });
  if (!input.turnId || !input.sessionId || !input.correlationId || !Number.isInteger(input.sequence) || input.sequence < 1) throw new RuntimeError("invalid_surface_event", "Surface event identity is incomplete", 400);
  const visibility = input.visibility || "user";
  const sensitivity = input.sensitivity || "private";
  if (!VISIBILITIES.has(visibility) || !SENSITIVITIES.has(sensitivity)) throw new RuntimeError("invalid_surface_event", "Surface event classification is invalid", 400);
  if (visibility !== "user") throw new RuntimeError("surface_event_not_user_visible", "Surface events must be user-visible projections", 400);
  if (sensitivity === "secret") throw new RuntimeError("surface_event_secret_rejected", "Secret events cannot be created or persisted", 400);
  const payload = structuredClone(input.payload || {});
  rejectSecret(payload);
  const mctPayloadFindings = mctSurfacePayloadFindings(input.type, payload);
  if (mctPayloadFindings.length) throw new RuntimeError("invalid_surface_event_payload", "MCT surface event payload does not match its public contract", 400, { type: input.type, findings: mctPayloadFindings });
  const payloadBytes = Buffer.byteLength(JSON.stringify(payload));
  if (payloadBytes > 64 * 1024 || (input.type === "text.delta" && Buffer.byteLength(String(payload.text || "")) > 16 * 1024)) {
    throw new RuntimeError("surface_event_payload_too_large", "Surface event payload exceeds its safe boundary", 413, { type:input.type, payloadBytes });
  }
  const event = {
    schema: "gpao_t3.surface_event.v1",
    version: 1,
    eventId: input.eventId || `surface_${crypto.randomUUID()}`,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sequence: input.sequence,
    type: input.type,
    correlationId: input.correlationId,
    causationId: input.causationId || null,
    parentEventId: input.parentEventId || null,
    attempt: Number.isInteger(input.attempt) && input.attempt > 0 ? input.attempt : 1,
    visibility,
    sensitivity,
    sourceEventId: input.sourceEventId || null,
    payload,
    terminal: input.terminal === true,
    createdAt: Number.isFinite(input.createdAt) ? input.createdAt : Date.now()
  };
  return Object.freeze({ ...event, digest: canonicalDigest("gpao_t3.surface_event.v1", event) });
}

export function createTextCompleteEvent(input = {}) {
  const reference = input.responseDocument;
  if (!reference?.id || !reference?.digest || !Array.isArray(reference.blocks)) throw new RuntimeError("invalid_surface_event", "text.complete requires a response document reference", 400);
  return createSurfaceEvent({
    ...input,
    type: "text.complete",
    payload: { responseDocumentId: reference.id, digest: reference.digest, blockCount: reference.blocks.length },
    terminal: false
  });
}
