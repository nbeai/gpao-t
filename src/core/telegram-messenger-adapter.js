import { defineMessengerAdapter } from "./channel-adapter-sdk.js";

function manifest() {
  const lifecycle = Object.fromEntries(["install", "preflight", "activate", "health", "invoke", "reconcile", "disable", "remove", "update", "rollback"].map(operation => [operation, true]));
  return {
    schema: "gpao_t3.capability_manifest.v1", manifestVersion: 1, id: "channel.telegram", name: "Telegram",
    description: "GPAO-T3 protected Telegram Bot API adapter", version: "1.0.0",
    groups: ["messaging_channels"], capabilities: ["inbound", "outbound", "reconcile"],
    protocol: { major: 1, minor: 2, minCompatibleMinor: 0 },
    inputSchema: { type: "object", additionalProperties: true }, outputSchema: { type: "object", additionalProperties: true },
    streaming: false, cancellation: true, timeoutMs: 30_000, cost: { model: "free" }, secretBoundary: "protected_adapter",
    authority: "external_send", sideEffect: "external", isolation: { mode: "worker", permitRevalidation: true },
    lifecycle, provenance: { source: "GPAO-T3 Foundation Runtime", license: "UNLICENSED" }, status: "ready"
  };
}

export function createTelegramMessengerAdapter({ client }) {
  if (!client || typeof client.send !== "function") throw new TypeError("A protected Telegram client is required");
  return defineMessengerAdapter({
    manifest: manifest(), invoke: async input => input,
    start: () => client.start(),
    stop: () => client.stop(),
    connect: () => client.begin(),
    connectionStatus: () => client.status(),
    disconnect: () => client.revoke(),
    poll: options => client.poll(options),
    normalizeInbound(update) {
      const message = update.message;
      return {
        eventId: String(update.update_id), cursor: String(update.update_id), receivedAt: message.date,
        identity: {
          adapterId: "telegram.bot-api", channelId: "telegram", accountId: update.account_id || "default",
          peer: { kind: message.chat.type === "private" ? "direct" : "group", id: String(message.chat.id) },
          threadId: message.message_thread_id || null
        },
        message: { id: String(message.message_id), text: message.text }
      };
    },
    send(envelope, options) {
      return client.send({
        accountRef: "keychain:telegram-bot", chatId: envelope.identity.peer.id, threadId: envelope.identity.threadId,
        text: envelope.content.text, replyToId: envelope.content.replyToId
      }, options);
    },
    async reconcile() { return { outcome: "unknown" }; }
  });
}
