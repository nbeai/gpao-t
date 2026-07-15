import assert from "node:assert/strict";
import test from "node:test";
import { ContextInfluenceLedger } from "../src/core/context-influence.js";

test("context influence applies only after admitted context passes replay", () => {
  const ledger = new ContextInfluenceLedger();
  const taskPacket = { id: "task-1", sessionId: "session-a", contextIdentity: { userId: "owner:a", projectId: null, channelId: null } };
  const admission = { admitted: [{ id: "mem-1", text: "GPAO-T admits only reviewed context", traceRef: "note-1", reviewed: true, approvedInfluence: true, sourceResolved: true, sourceInvalidated: false, authority: { allowedUse: "answer_anchor", durablePromotion: true, decisionClass: "A2", decisionId: "decision-1" }, score: 0.9 }] };
  const held = ledger.recordTurnOutcome({ taskPacket, admission, replay: { passed: false, taskPacketId: "task-1" } });
  assert.equal(held.state, "held");
  assert.equal(ledger.snapshot().activeCount, 0);

  const applied = ledger.recordTurnOutcome({ taskPacket, admission, replay: { passed: true, taskPacketId: "task-1" }, growthCandidate: { id: "growth-1" } });
  assert.equal(applied.state, "applied");
  assert.equal(applied.durableMemoryPromotion, false);
  assert.equal(ledger.snapshot().activeCount, 1);
  const active = ledger.activeForTask({ sessionId: "session-a", userId: "owner:a", input: "reviewed context 원칙" });
  assert.equal(active.length, 1);
  assert.equal(active[0].approvedInfluence, true);
  assert.equal(active[0].reviewed, true);
});

test("context influence is session-scoped and rollback removes future influence", () => {
  const ledger = new ContextInfluenceLedger();
  const applied = ledger.recordTurnOutcome({
    taskPacket: { id: "task-1", sessionId: "session-a", contextIdentity: { userId: "owner:a", projectId: null, channelId: null } },
    admission: { admitted: [{ id: "mem-1", text: "session local influence", traceRef: "note-1", approvedInfluence: true, sourceResolved: true, sourceInvalidated: false, authority: { allowedUse: "answer_anchor", durablePromotion: true, decisionClass: "A2", decisionId: "decision-1" }, score: 0.8 }] },
    replay: { passed: true, taskPacketId: "task-1" }
  });
  const id = applied.applied[0].id;
  assert.equal(ledger.activeForTask({ sessionId: "session-b", userId: "owner:a", input: "session local influence" }).length, 0);
  const rollback = ledger.rollback(id, { reason: "test_boundary_case" });
  assert.equal(rollback.rolledBack, true);
  assert.equal(rollback.entry.state, "rolled_back");
  assert.equal(ledger.activeForTask({ sessionId: "session-a", userId: "owner:a", input: "session local influence" }).length, 0);
  assert.equal(ledger.snapshot().rolledBackCount, 1);
});
