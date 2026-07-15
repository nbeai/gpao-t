import { createFixtureMessengerAdapter } from "./messenger-adapter-base.js";

export function createAdapter() {
  return createFixtureMessengerAdapter({
    id: "channel.telegram.reference", name: "Telegram Reference",
    normalize(update) {
      const message = update.message;
      return {
        eventId: String(update.update_id), cursor: String(update.update_id), receivedAt: message.date,
        identity: {
          adapterId: "telegram.reference", channelId: "telegram", accountId: update.account_id,
          peer: { kind: message.chat.type === "private" ? "direct" : "group", id: String(message.chat.id) },
          threadId: message.message_thread_id || null
        },
        message: { id: String(message.message_id), text: message.text }
      };
    }
  });
}
