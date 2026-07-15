import { createFixtureMessengerAdapter } from "./messenger-adapter-base.js";

export function createAdapter() {
  return createFixtureMessengerAdapter({
    id: "channel.relay.synthetic", name: "Relay Synthetic",
    normalize(event) {
      return {
        eventId: event.event, cursor: String(event.sequence), receivedAt: event.timestamp,
        identity: {
          adapterId: "relay.synthetic", channelId: "relay", accountId: event.workspace,
          peer: { kind: event.room ? "group" : "direct", id: event.room || event.sender },
          threadId: event.thread || null
        },
        message: { id: event.message, text: event.body }
      };
    }
  });
}
