import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSessionEventHeart,
  verifySessionEventHeart,
} from "../src/core/session-event-heart.js";

test("Session/Event Heart separates Telegram direct from webchat session identity", () => {
  const heart = buildSessionEventHeart({
    liveTurnRuns: [{ createdAt: "2026-07-13T00:00:00.000Z" }],
    progressEvents: [{ createdAt: "2026-07-13T00:00:01.000Z" }],
  });

  assert.notEqual(heart.identities.telegramDirect.sessionId, heart.identities.webchat.sessionId);
  assert.equal(heart.identities.telegramDirect.directSessionPolicy, "single_dedicated_direct_session");
  assert.equal(heart.identities.webchat.directSessionPolicy, "source_session_identity_preserved");
  assert.equal(heart.authorityBoundary.telegramExternalSend, "blocked");
  assert.equal(heart.authorityBoundary.durableMemoryPromotion, "blocked");
  assert.equal(verifySessionEventHeart({ heart }).status, "ready");
});

test("Session/Event Heart treats empty event ledger as review evidence, not identity failure", () => {
  const heart = buildSessionEventHeart({
    liveTurnRuns: [],
    progressEvents: [],
  });

  assert.equal(heart.status, "review");
  assert.equal(heart.severity, "P2");
  assert.ok(heart.observations.some((item) => item.id === "event_ledger_empty"));
  assert.equal(verifySessionEventHeart({ heart }).status, "ready");
});

test("Session/Event Heart blocks if Telegram and webchat identities collide", () => {
  const collisionIdentity = {
    schema: "gpao_t.live_turn_identity_map.v0_1",
    sourceKind: "openclaw_web",
    host: "openclaw",
    agentId: "main",
    channel: "webchat",
    gpao: {
      directSessionPolicy: "source_session_identity_preserved",
      sessionKey: "agent:main:web",
      threadId: "thread.telegram.direct",
      sessionId: "session.telegram.direct",
      contextPacketId: "context.session.telegram.direct",
      memoryScope: {
        thread: "thread.telegram.direct",
        durablePromotion: "blocked",
        compatibilityMemoryWrite: "blocked",
        automaticAdmission: "blocked",
      },
    },
    authority: {
      localTraceWrite: "allowed",
      openClawSessionMetaWrite: "blocked",
      compatibilityMemoryWrite: "blocked",
      durableMemoryPromotion: "blocked",
      externalSend: "blocked",
    },
  };
  const heart = buildSessionEventHeart({
    webchatIdentity: collisionIdentity,
    liveTurnRuns: [{ createdAt: "2026-07-13T00:00:00.000Z" }],
  });

  const verification = verifySessionEventHeart({ heart });
  assert.equal(verification.status, "blocked");
  assert.ok(verification.findings.includes("telegram_webchat_session_collision"));
});
