import crypto from "node:crypto";

const TERMINAL_TYPES = new Set([
  "turn.succeeded",
  "turn.failed",
  "turn.cancelled",
  "turn.uncertain"
]);

const SENSITIVE_KEY = /(?:api[-_]?key|authorization|cookie|credential|password|secret|token)/i;
const SECRET_VALUE = /(?:^sk-[A-Za-z0-9_-]{8,}$|^Bearer\s+\S+$)/i;

function redact(value, key = "") {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") return SECRET_VALUE.test(value) ? "[REDACTED]" : value;
  if (Array.isArray(value)) return value.map(entry => redact(entry));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redact(entryValue, entryKey)]));
  }
  return value;
}

function parseCursor(cursor, runId) {
  if (!cursor) return 0;
  const [cursorRunId, rawSequence] = String(cursor).split(":");
  const sequence = Number(rawSequence);
  if (cursorRunId !== runId || !Number.isInteger(sequence) || sequence < 0) {
    throw new Error("event_router_invalid_cursor");
  }
  return sequence;
}

function terminalFor(type, requested) {
  return requested ?? TERMINAL_TYPES.has(type);
}

/**
 * In-memory event delivery foundation. Persistence remains the StateStore's
 * responsibility; this router provides ordered fan-out, bounded consumers,
 * reconnect replay, and terminal-state discipline for one runtime process.
 */
export class EventRouter {
  constructor({ maxReplayEvents = 512, maxSubscriberQueue = 32, now = () => Date.now() } = {}) {
    if (!Number.isInteger(maxReplayEvents) || maxReplayEvents < 1) throw new Error("event_router_invalid_replay_limit");
    if (!Number.isInteger(maxSubscriberQueue) || maxSubscriberQueue < 1) throw new Error("event_router_invalid_queue_limit");
    this.maxReplayEvents = maxReplayEvents;
    this.maxSubscriberQueue = maxSubscriberQueue;
    this.now = now;
    this.runs = new Map();
  }

  emit({ runId, type, payload = {}, terminal } = {}) {
    if (!runId || !type) throw new Error("event_router_invalid_event");
    const run = this.#run(runId);
    if (run.terminal) throw new Error("event_router_terminal_already_emitted");

    const sequence = run.nextSequence++;
    const event = Object.freeze({
      eventId: crypto.randomUUID(),
      runId,
      sequence,
      cursor: `${runId}:${sequence}`,
      type,
      payload: redact(payload),
      terminal: terminalFor(type, terminal),
      createdAt: this.now()
    });
    run.events.push(event);
    if (run.events.length > this.maxReplayEvents) run.events.shift();
    if (event.terminal) run.terminal = event;
    for (const subscriber of run.subscribers) this.#enqueue(subscriber, event);
    return { event, receipt: this.receipt(event) };
  }

  restore({ runId, events = [] } = {}) {
    if (!Array.isArray(events)) throw new Error("event_router_invalid_restore");
    const run = this.#run(runId);
    if (run.events.length) return false;
    for (const source of events) {
      const type = source.type === "turn.outcome.unknown" ? "turn.uncertain" : source.type;
      if (!source?.eventId || !type || run.terminal) throw new Error("event_router_invalid_restore");
      const sequence = run.nextSequence++;
      const event = Object.freeze({
        eventId: source.eventId,
        runId,
        sequence,
        cursor: `${runId}:${sequence}`,
        type,
        payload: redact(source.payload || {}),
        terminal: terminalFor(type, source.terminal),
        createdAt: source.createdAt
      });
      run.events.push(event);
      if (run.events.length > this.maxReplayEvents) run.events.shift();
      if (event.terminal) run.terminal = event;
    }
    return true;
  }

  cancel(runId, reason = "cancelled_by_user") {
    const run = this.#run(runId);
    if (run.terminal) return { event: run.terminal, receipt: this.receipt(run.terminal), changed: false };
    const result = this.emit({ runId, type: "turn.cancelled", payload: { cancellation: reason }, terminal: true });
    return { ...result, changed: true };
  }

  replay({ runId, cursor, limit = this.maxReplayEvents } = {}) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error("event_router_invalid_replay_limit");
    const run = this.#run(runId);
    const after = parseCursor(cursor, runId);
    const earliest = run.events[0]?.sequence ?? run.nextSequence;
    if (cursor !== undefined && cursor !== null && after < earliest - 1) {
      return { status: "cursor_expired", events: [], nextCursor: `${runId}:${earliest - 1}`, terminal: run.terminal ? this.receipt(run.terminal) : null };
    }
    const events = run.events.filter(event => event.sequence > after).slice(0, limit);
    return {
      status: "ok",
      events,
      nextCursor: events.at(-1)?.cursor || cursor || `${runId}:0`,
      hasMore: run.events.some(event => event.sequence > (events.at(-1)?.sequence ?? after)),
      terminal: run.terminal ? this.receipt(run.terminal) : null
    };
  }

  subscribe({ runId, cursor, capacity = this.maxSubscriberQueue } = {}) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new Error("event_router_invalid_queue_limit");
    const run = this.#run(runId);
    const subscriber = { id: crypto.randomUUID(), queue: [], capacity, closed: false, overflow: null };
    run.subscribers.add(subscriber);
    const replay = this.replay({ runId, cursor, limit: capacity });
    if (replay.status !== "ok") {
      this.#overflow(subscriber, "cursor_expired", replay.nextCursor);
    } else {
      for (const event of replay.events) this.#enqueue(subscriber, event);
      if (replay.hasMore) this.#overflow(subscriber, "replay_backpressure", replay.nextCursor);
    }
    return {
      id: subscriber.id,
      poll: () => subscriber.queue.shift() || null,
      status: () => ({ closed: subscriber.closed, queued: subscriber.queue.length, overflow: subscriber.overflow }),
      close: () => { subscriber.closed = true; run.subscribers.delete(subscriber); }
    };
  }

  receipt(event) {
    return Object.freeze({
      schema: "gpao_t.event_receipt.v1",
      eventId: event.eventId,
      runId: event.runId,
      cursor: event.cursor,
      sequence: event.sequence,
      type: event.type,
      terminal: event.terminal,
      createdAt: event.createdAt,
      payload: redact(event.payload)
    });
  }

  #run(runId) {
    if (!runId) throw new Error("event_router_invalid_run");
    if (!this.runs.has(runId)) this.runs.set(runId, { nextSequence: 1, events: [], terminal: null, subscribers: new Set() });
    return this.runs.get(runId);
  }

  #enqueue(subscriber, event) {
    if (subscriber.closed) return;
    if (subscriber.queue.length >= subscriber.capacity) {
      this.#overflow(subscriber, "subscriber_backpressure", event.cursor);
      return;
    }
    subscriber.queue.push(event);
  }

  #overflow(subscriber, reason, cursor) {
    if (subscriber.closed) return;
    subscriber.queue.length = 0;
    subscriber.queue.push(Object.freeze({ type: "router.backpressure", reason, cursor, terminal: false }));
    subscriber.overflow = reason;
    subscriber.closed = true;
  }
}
