import { channelIdentityDigest } from "./channel-envelope.js";
import { schemaName } from "./product-identity.js";

export function createChannelContextPacket({ sessionId, envelope }) {
  return Object.freeze({
    schema: schemaName("channel_context_packet.v1"),
    sessionId,
    principalId: `messenger:${channelIdentityDigest(envelope.identity)}`,
    source: Object.freeze({ identity: envelope.identity, eventId: envelope.eventId, messageId: envelope.message.id }),
    contextScope: "dedicated_session_only",
    admittedInfluenceIds: Object.freeze([]),
    crossSessionInfluence: "blocked_until_admission"
  });
}
