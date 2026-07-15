const DIRECT_MESSENGER_CHANNELS = new Set(["telegram", "slack", "discord", "signal", "whatsapp", "imessage"]);

export function buildLiveTurnIdentityMap({
  sourceKind = "controlled_smoke",
  agentId = "assistant",
  sessionKey = "agent:main:main",
  sourceIdentity = {},
} = {}) {
  const normalizedSourceKind = String(sourceKind || "controlled_smoke");
  const directChannel = parseDirectMessengerChannel(normalizedSourceKind, sourceIdentity);
  if (directChannel) {
    return buildMessengerDirectIdentityMap({ channel: directChannel, sourceKind: normalizedSourceKind, agentId, sessionKey, sourceIdentity });
  }
  return buildDefaultIdentityMap({ sourceKind: normalizedSourceKind, agentId, sessionKey, sourceIdentity });
}

export function verifyLiveTurnIdentityMap(identityMap) {
  const findings = [];
  if (!identityMap || identityMap.schema !== "gpao_t.live_turn_identity_map.v0_1") {
    findings.push("invalid_identity_map");
  }
  if (identityMap?.gpao?.directSessionPolicy === "single_dedicated_direct_session") {
    const channel = identityMap.channel;
    if (!DIRECT_MESSENGER_CHANNELS.has(channel)) findings.push("messenger_direct_channel_unknown");
    if (identityMap.gpao?.threadId !== `thread.${channel}.direct`) {
      findings.push("messenger_direct_thread_not_canonical");
    }
    if (identityMap.gpao?.sessionId !== `session.${channel}.direct`) {
      findings.push("messenger_direct_session_not_canonical");
    }
    if (identityMap.gpao?.memoryScope?.durablePromotion !== "blocked") {
      findings.push("messenger_direct_durable_promotion_open");
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

function buildMessengerDirectIdentityMap({ channel, sourceKind, agentId, sessionKey, sourceIdentity }) {
  const threadId = `thread.${channel}.direct`;
  const sessionId = `session.${channel}.direct`;
  const canonicalSessionKey = `agent:${safePart(agentId)}:${channel}:direct:gpao-t-direct`;
  return {
    schema: "gpao_t.live_turn_identity_map.v0_1",
    sourceKind,
    host: "gpao-t-compatibility-runtime",
    agentId,
    channel,
    accountId: sourceIdentity.accountId || "default",
    openClawSessionKey: sessionKey,
    openClawConversationId: sourceIdentity.conversationId || sourceIdentity.chatId || sourceIdentity.channelId || null,
    openClawThreadId: sourceIdentity.threadId || null,
    messageId: sourceIdentity.messageId || null,
    gpao: {
      directSessionPolicy: "single_dedicated_direct_session",
      sessionKey: canonicalSessionKey,
      threadId,
      sessionId,
      contextPacketId: `context.${sessionId}`,
      memoryScope: blockedMemoryScope(threadId),
    },
    provenance: {
      rawChatId: sourceIdentity.chatId || sourceIdentity.channelId || null,
      rawSenderId: sourceIdentity.senderId || sourceIdentity.userId || null,
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
    host: "gpao-t-compatibility-runtime",
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

function parseDirectMessengerChannel(sourceKind, sourceIdentity = {}) {
  const explicit = String(sourceIdentity.channel || "").toLowerCase();
  if (DIRECT_MESSENGER_CHANNELS.has(explicit) && /_direct$/.test(sourceKind)) return explicit;
  const match = String(sourceKind || "").match(/^([a-z0-9_-]+)_direct$/i);
  const channel = match?.[1]?.toLowerCase();
  return DIRECT_MESSENGER_CHANNELS.has(channel) ? channel : "";
}

function inferChannel(sourceKind) {
  if (sourceKind === "openclaw_web") return "webchat";
  if (sourceKind === "gateway_chat") return "gateway";
  const direct = parseDirectMessengerChannel(sourceKind);
  if (direct) return direct;
  return "controlled_smoke";
}

function safePart(value) {
  return String(value || "unknown").replace(/[^a-zA-Z0-9._:-]+/g, "-").slice(0, 96);
}
