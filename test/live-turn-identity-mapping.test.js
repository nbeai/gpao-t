import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLiveTurnIdentityMap,
  verifyLiveTurnIdentityMap,
} from "../src/core/live-turn-identity-mapping.js";

test("Telegram direct turns map to one dedicated GPAO-T session without external send or memory promotion", () => {
  const identityMap = buildLiveTurnIdentityMap({
    sourceKind: "telegram_direct",
    agentId: "main",
    sessionKey: "agent:main:telegram:8601204821",
    sourceIdentity: {
      chatId: "8601204821",
      senderId: "8601204821",
      conversationLabel: "Telegram",
      messageId: "telegram-update-readback",
    },
  });

  assert.equal(identityMap.sourceKind, "telegram_direct");
  assert.equal(identityMap.channel, "telegram");
  assert.equal(identityMap.gpao.directSessionPolicy, "single_dedicated_direct_session");
  assert.equal(identityMap.gpao.sessionKey, "agent:main:telegram:direct:gpao-t-direct");
  assert.equal(identityMap.gpao.threadId, "thread.telegram.direct");
  assert.equal(identityMap.gpao.sessionId, "session.telegram.direct");
  assert.equal(identityMap.gpao.contextPacketId, "context.session.telegram.direct");
  assert.equal(identityMap.gpao.memoryScope.durablePromotion, "blocked");
  assert.equal(identityMap.gpao.memoryScope.compatibilityMemoryWrite, "blocked");
  assert.equal(identityMap.authority.externalSend, "blocked");
  assert.equal(identityMap.authority.openClawSessionMetaWrite, "blocked");

  assert.deepEqual(verifyLiveTurnIdentityMap(identityMap), {
    schema: "gpao_t.live_turn_identity_map_verification.v0_1",
    status: "passed",
    findings: [],
  });
});

test("webchat turns keep their own session identity instead of colliding with Telegram direct", () => {
  const identityMap = buildLiveTurnIdentityMap({
    sourceKind: "openclaw_web",
    agentId: "main",
    sessionKey: "agent:main:main",
    sourceIdentity: {
      channel: "webchat",
      sessionId: "session.agent.main.main",
      threadId: "thread.agent.main.main",
    },
  });

  assert.equal(identityMap.channel, "webchat");
  assert.equal(identityMap.gpao.directSessionPolicy, "source_session_identity_preserved");
  assert.notEqual(identityMap.gpao.sessionId, "session.telegram.direct");
  assert.notEqual(identityMap.gpao.threadId, "thread.telegram.direct");
  assert.equal(identityMap.authority.externalSend, "blocked");
  assert.equal(verifyLiveTurnIdentityMap(identityMap).status, "passed");
});
