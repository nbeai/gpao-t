const STATUS_BY_EVENT = Object.freeze({
  "turn.accepted": "accepted",
  "turn.dispatched": "dispatching",
  "turn.responding": "responding",
  "turn.succeeded": "completed",
  "turn.failed": "failed",
  "turn.cancelled": "cancelled",
  "turn.uncertain": "uncertain",
  "turn.outcome.unknown": "uncertain",
  "router.backpressure": "reconnecting",
  reconnect: "reconnecting"
});

export const CONTROL_STATUSES = Object.freeze([
  "accepted",
  "dispatching",
  "responding",
  "reconnecting",
  "completed",
  "failed",
  "cancelled",
  "uncertain"
]);

export function controlStatusForEvent(type) {
  return STATUS_BY_EVENT[type] || null;
}

export function createControlFrame({ runId, sequence, type, createdAt, payload = {}, terminal = false } = {}) {
  const status = controlStatusForEvent(type);
  if (!runId || !Number.isInteger(sequence) || sequence < 0 || !status || !Number.isFinite(createdAt)) throw new Error("control_frame_invalid");
  return Object.freeze({
    schema: "gpao_t3.control_frame.v1",
    protocolVersion: 1,
    runId,
    sequence,
    status,
    phase: type,
    terminal: Boolean(terminal),
    createdAt,
    generation: Number.isInteger(payload.generation) ? payload.generation : null,
    reconnectRequired: type === "reconnect" || payload.reconnectRequired === true
  });
}
