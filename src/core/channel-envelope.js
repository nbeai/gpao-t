import crypto from "node:crypto";
import { RuntimeError } from "./errors.js";
import { schemaName } from "./product-identity.js";

const ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const PEER_KINDS = new Set(["direct", "group"]);

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new RuntimeError("channel_identity_invalid", "Channel identity is incomplete", 400, { field });
  return normalized;
}

export function normalizeChannelIdentity(input = {}) {
  const adapterId = required(input.adapterId, "adapterId");
  const channelId = required(input.channelId || adapterId, "channelId");
  const accountId = required(input.accountId, "accountId");
  const peerKind = required(input.peer?.kind, "peer.kind");
  const peerId = required(input.peer?.id, "peer.id");
  if (!ID.test(adapterId) || !ID.test(channelId)) throw new RuntimeError("channel_identity_invalid", "Channel adapter identity is invalid", 400);
  if (!PEER_KINDS.has(peerKind)) throw new RuntimeError("channel_peer_kind_invalid", "Channel peer must be direct or group", 400, { peerKind });
  const threadId = input.threadId === undefined || input.threadId === null || input.threadId === "" ? null : String(input.threadId);
  return Object.freeze({
    schema: schemaName("channel_identity.v1"), adapterId, channelId, accountId,
    peer: Object.freeze({ kind: peerKind, id: peerId }), threadId
  });
}

export function channelIdentityDigest(identity) {
  const value = normalizeChannelIdentity(identity);
  return crypto.createHash("sha256").update(JSON.stringify([
    value.channelId, value.adapterId, value.accountId, value.peer.kind, value.peer.id, value.threadId
  ])).digest("hex");
}

export function messengerSessionKind(identity) {
  const value = normalizeChannelIdentity(identity);
  return `${value.peer.kind === "direct" ? "messengerDirect" : "messengerGroup"}[${value.channelId}]`;
}

export function canonicalInboundEnvelope(input = {}) {
  const identity = normalizeChannelIdentity(input.identity);
  const messageId = required(input.message?.id, "message.id");
  const eventId = required(input.eventId || messageId, "eventId");
  const text = input.message?.text === undefined ? null : String(input.message.text);
  const media = Array.isArray(input.message?.media) ? structuredClone(input.message.media) : [];
  if (text === null && media.length === 0) throw new RuntimeError("channel_message_empty", "Inbound channel message has no content", 400);
  return Object.freeze({
    schema: schemaName("channel_inbound_envelope.v1"), direction: "inbound", eventId,
    identity, cursor: input.cursor === undefined || input.cursor === null ? null : String(input.cursor),
    receivedAt: Number.isInteger(input.receivedAt) ? input.receivedAt : Date.now(),
    message: Object.freeze({ id: messageId, text, media, replyToId: input.message?.replyToId ? String(input.message.replyToId) : null })
  });
}

export function canonicalOutboundEnvelope(input = {}) {
  const identity = normalizeChannelIdentity(input.identity);
  const idempotencyKey = required(input.idempotencyKey, "idempotencyKey");
  const text = input.content?.text === undefined ? null : String(input.content.text);
  const media = Array.isArray(input.content?.media) ? structuredClone(input.content.media) : [];
  if (text === null && media.length === 0) throw new RuntimeError("channel_message_empty", "Outbound channel message has no content", 400);
  return Object.freeze({
    schema: schemaName("channel_outbound_envelope.v1"), direction: "outbound", idempotencyKey,
    identity, createdAt: Number.isInteger(input.createdAt) ? input.createdAt : Date.now(),
    content: Object.freeze({ text, media, replyToId: input.content?.replyToId ? String(input.content.replyToId) : null })
  });
}

export const CHANNEL_PEER_KINDS = Object.freeze([...PEER_KINDS]);
