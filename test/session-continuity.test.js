import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRecentReferentLedger,
  buildSessionContinuityHandoff,
  runTurn,
  verifySessionContinuityHandoff,
} from "../src/index.js";
import replayFixture from "../fixtures/replay/session-continuity-handoff-v1.json" with { type: "json" };

function priorFlowFromCase(replayCase) {
  return {
    flowKey: replayCase.newSession ? "telegram.new-session" : "telegram.same-session",
    activeTargetId: "general-runtime",
    newSessionStarted: replayCase.newSession,
    recentReferentLedger: buildRecentReferentLedger({
      events: replayCase.priorEvents,
      now: "2026-07-10T16:24:00.000Z",
    }),
  };
}

describe("Session Continuity Handoff Pass 001", () => {
  it("builds a short-lived recent referent ledger from the previous session", () => {
    const ledger = buildRecentReferentLedger({
      events: replayFixture.cases[0].priorEvents,
      now: "2026-07-10T16:24:00.000Z",
    });

    assert.equal(ledger.schema, "gpao_t.recent_referent_ledger.v0_1");
    assert.equal(ledger.status, "ready");
    assert.equal(ledger.referents[0].entity, "청담동 팔식당");
    assert.equal(ledger.referents[0].type, "place");
    assert.equal(ledger.referents[0].expiresAfterTurns, 3);
    assert.match(ledger.rule, /not durable memory/);
  });

  it("recovers a restaurant referent after /new for a Korean place follow-up", () => {
    const replayCase = replayFixture.cases[0];
    const handoff = buildSessionContinuityHandoff({
      input: { text: replayCase.input },
      inputSignal: { kind: "follow_up", confidence: 0.8 },
      priorFlow: priorFlowFromCase(replayCase),
    });

    assert.equal(handoff.decision, "auto_carry");
    assert.equal(handoff.activeReferent.entity, "청담동 팔식당");
    assert.equal(handoff.handoffPack.previousIntent, "장소 정보 확인");
    assert.ok(handoff.handoffPack.safeFollowupHints.includes("후기"));
    assert.match(handoff.userFacingHint, /청담동 팔식당/);
  });

  it("keeps current explicit new topics from being hijacked by prior referents", () => {
    const replayCase = replayFixture.cases.find((item) => item.id === "unrelated_new_topic_overrides_prior");
    const handoff = buildSessionContinuityHandoff({
      input: { text: replayCase.input },
      inputSignal: { kind: "general_request", confidence: 0.55 },
      priorFlow: priorFlowFromCase(replayCase),
    });

    assert.equal(handoff.decision, "current_request_override");
    assert.equal(handoff.activeReferent, null);
    assert.equal(handoff.requestOverridesPrior, true);
  });

  it("asks for the target when a referent follow-up has no prior ledger", () => {
    const replayCase = replayFixture.cases.find((item) => item.id === "unknown_referent_requires_target");
    const handoff = buildSessionContinuityHandoff({
      input: { text: replayCase.input },
      inputSignal: { kind: "follow_up", confidence: 0.78 },
      priorFlow: priorFlowFromCase(replayCase),
    });

    assert.equal(handoff.decision, "ask_target");
    assert.equal(handoff.activeReferent, null);
  });

  it("feeds the handoff into runTurn as an admitted answer anchor", () => {
    const replayCase = replayFixture.cases[0];
    const result = runTurn({
      input: { text: replayCase.input },
      priorFlow: priorFlowFromCase(replayCase),
    });

    assert.equal(result.inputSignal.kind, "follow_up");
    assert.equal(result.sessionOverlay.continuityState, "handoff_recovered");
    assert.equal(result.sessionOverlay.activeReferent.entity, "청담동 팔식당");
    assert.equal(result.taskPacket.continuityHandoff.decision, "auto_carry");
    assert.equal(result.taskPacket.activeReferent.entity, "청담동 팔식당");
    assert.equal(
      result.admissionPacket.admittedCells.some((cell) =>
        cell.role === "anchor" && cell.cell.anchor === "referent:청담동 팔식당"),
      true,
    );
    assert.match(result.userVisibleState.summary, /청담동 팔식당/);
  });

  it("keeps the built-in verification proof ready", () => {
    const proof = verifySessionContinuityHandoff();

    assert.equal(proof.schema, "gpao_t.session_continuity_handoff_check.v0_1");
    assert.equal(proof.status, "ready");
    assert.equal(proof.boundaries.durableMemoryPromotion, "blocked");
    assert.equal(proof.boundaries.externalAction, "blocked");
  });
});
