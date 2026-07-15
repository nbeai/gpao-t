import assert from "node:assert/strict";
import test from "node:test";
import { EventRouter } from "../src/core/event-router.js";

test("event router orders every run independently and emits secret-free receipts", () => {
  const router = new EventRouter({ now: () => 1234 });
  const first = router.emit({ runId: "run-a", type: "turn.accepted", payload: { apiKey: "sk-never-log", nested: { authorization: "Bearer hidden", message: "safe" } } });
  const second = router.emit({ runId: "run-a", type: "turn.dispatched" });
  const other = router.emit({ runId: "run-b", type: "turn.accepted" });

  assert.deepEqual([first.event.sequence, second.event.sequence], [1, 2]);
  assert.equal(other.event.sequence, 1);
  assert.equal(first.receipt.payload.apiKey, "[REDACTED]");
  assert.equal(first.receipt.payload.nested.authorization, "[REDACTED]");
  assert.equal(first.receipt.payload.nested.message, "safe");
  assert.equal(JSON.stringify(first.receipt).includes("sk-never-log"), false);
});

test("reconnect replay starts after cursor and explicitly detects an expired cursor", () => {
  const router = new EventRouter({ maxReplayEvents: 2 });
  router.emit({ runId: "run", type: "turn.accepted" });
  const second = router.emit({ runId: "run", type: "turn.dispatched" });
  router.emit({ runId: "run", type: "turn.succeeded" });

  const replay = router.replay({ runId: "run", cursor: second.event.cursor });
  assert.deepEqual(replay.events.map(event => event.type), ["turn.succeeded"]);
  assert.equal(replay.terminal.type, "turn.succeeded");
  assert.equal(router.replay({ runId: "run", cursor: "run:0" }).status, "cursor_expired");
});

test("a slow subscriber is bounded, marked for reconnect, and cannot block publishers", () => {
  const router = new EventRouter({ maxSubscriberQueue: 1 });
  const subscriber = router.subscribe({ runId: "run" });
  router.emit({ runId: "run", type: "turn.accepted" });
  router.emit({ runId: "run", type: "turn.dispatched" });

  const notice = subscriber.poll();
  assert.equal(notice.type, "router.backpressure");
  assert.equal(notice.reason, "subscriber_backpressure");
  assert.equal(subscriber.status().closed, true);
  assert.equal(router.replay({ runId: "run" }).events.length, 2);
});

test("cancellation always emits exactly one terminal event", () => {
  const router = new EventRouter();
  router.emit({ runId: "run", type: "turn.accepted" });
  const cancelled = router.cancel("run", "owner_cancelled");
  const repeat = router.cancel("run", "ignored");

  assert.equal(cancelled.changed, true);
  assert.equal(cancelled.event.type, "turn.cancelled");
  assert.equal(cancelled.event.terminal, true);
  assert.equal(repeat.changed, false);
  assert.equal(repeat.event.eventId, cancelled.event.eventId);
  assert.throws(() => router.emit({ runId: "run", type: "turn.succeeded" }), /terminal_already_emitted/);
});
