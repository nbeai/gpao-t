const TELEGRAM_DIRECT_THREAD_ID = "thread.telegram.direct";
const TELEGRAM_DIRECT_SESSION_ID = "session.telegram.direct";
const TELEGRAM_DIRECT_CONTEXT_PACKET_ID = "context.session.telegram.direct";

export function buildLiveTurnIdentityMap({
  sourceKind = "controlled_smoke",
  agentId = "assistant",
  sessionKey = "agent:main:main",
  sourceIdentity = {},
} = {}) {
  const normalizedSourceKind = String(sourceKind || "controlled_smoke");
  if (normalizedSourceKind === "telegram_direct") {
    return buildTelegramDirectIdentityMap({ agentId, sessionKey, sourceIdentity });
  }
  return buildDefaultIdentityMap({ sourceKind: normalizedSourceKind, agentId, sessionKey, sourceIdentity });
}

export function verifyLiveTurnIdentityMap(identityMap) {
  const findings = [];
  if (!identityMap || identityMap.schema !== "gpao_t.live_turn_identity_map.v0_1") {
    findings.push("invalid_identity_map");
  }
  if (identityMap?.sourceKind === "telegram_direct") {
    if (identityMap.gpao?.directSessionPolicy !== "single_dedicated_direct_session") {
      findings.push("telegram_direct_session_policy_missing");
    }
    if (identityMap.gpao?.threadId !== TELEGRAM_DIRECT_THREAD_ID) {
      findings.push("telegram_direct_thread_not_canonical");
    }
    if (identityMap.gpao?.sessionId !== TELEGRAM_DIRECT_SESSION_ID) {
      findings.push("telegram_direct_session_not_canonical");
    }
    if (identityMap.gpao?.memoryScope?.durablePromotion !== "blocked") {
      findings.push("telegram_direct_durable_promotion_open");
    }
  }
  if (identityMap?.authority?.openClawSessionMetaWrite !== "blocked") {
    findings.push("openclaw_session_meta_write_open");
  }
  return {
    schema: "gpao_t.live_turn_identity_map_verification.v0_1",
    status: findings.length ? "review" : "passed",
    findings,
  };
}

function buildTelegramDirectIdentityMap({ agentId, sessionKey, sourceIdentity }) {
  const canonicalSessionKey = `agent:${safePart(agentId)}:telegram:direct:gpao-t-direct`;
  return {
    schema: "gpao_t.live_turn_identity_map.v0_1",
    sourceKind: "telegram_direct",
    host: "openclaw",
    agentId,
    channel: "telegram",
    accountId: sourceIdentity.accountId || "default",
    openClawSessionKey: sessionKey,
    openClawConversationId: sourceIdentity.conversationId || sourceIdentity.chatId || null,
    openClawThreadId: sourceIdentity.threadId || null,
    messageId: sourceIdentity.messageId || null,
    gpao: {
      directSessionPolicy: "single_dedicated_direct_session",
      sessionKey: canonicalSessionKey,
      threadId: TELEGRAM_DIRECT_THREAD_ID,
      sessionId: TELEGRAM_DIRECT_SESSION_ID,
      contextPacketId: TELEGRAM_DIRECT_CONTEXT_PACKET_ID,
      memoryScope: blockedMemoryScope(TELEGRAM_DIRECT_THREAD_ID),
    },
    provenance: {
      rawChatId: sourceIdentity.chatId || null,
      rawSenderId: sourceIdentity.senderId || null,
      rawRouteSessionKey: sessionKey,
      rawConversationLabel: sourceIdentity.conversationLabel || null,
    },
    authority: blockedIdentityAuthority(),
  };
}

function buildDefaultIdentityMap({ sourceKind, agentId, sessionKey, sourceIdentity }) {
  const threadId = sourceIdentity.threadId || `thread.${safePart(sessionKey)}`;
  const sessionId = sourceIdentity.sessionId || `session.${safePart(sessionKey)}`;
  return {
    schema: "gpao_t.live_turn_identity_map.v0_1",
    sourceKind,
    host: "openclaw",
    agentId,
    channel: sourceIdentity.channel || inferChannel(sourceKind),
    accountId: sourceIdentity.accountId || null,
    openClawSessionKey: sessionKey,
    openClawConversationId: sourceIdentity.conversationId || null,
    openClawThreadId: sourceIdentity.threadId || null,
    messageId: sourceIdentity.messageId || null,
    gpao: {
      directSessionPolicy: "source_session_identity_preserved",
      sessionKey,
      threadId,
      sessionId,
      contextPacketId: sourceIdentity.contextPacketId || `context.${sessionId}`,
      memoryScope: blockedMemoryScope(threadId),
    },
    provenance: {
      rawChatId: sourceIdentity.chatId || null,
      rawSenderId: sourceIdentity.senderId || null,
      rawRouteSessionKey: sessionKey,
      rawConversationLabel: sourceIdentity.conversationLabel || null,
    },
    authority: blockedIdentityAuthority(),
  };
}

function blockedMemoryScope(threadId) {
  return {
    thread: threadId,
    durablePromotion: "blocked",
    compatibilityMemoryWrite: "blocked",
    automaticAdmission: "blocked",
  };
}

function blockedIdentityAuthority() {
  return {
    localTraceWrite: "allowed",
    openClawSessionMetaWrite: "blocked",
    compatibilityMemoryWrite: "blocked",
    durableMemoryPromotion: "blocked",
    externalSend: "blocked",
  };
}

function inferChannel(sourceKind) {
  if (sourceKind === "openclaw_web") return "webchat";
  if (sourceKind === "gateway_chat") return "gateway";
  return "controlled_smoke";
}

function safePart(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 96);
}
