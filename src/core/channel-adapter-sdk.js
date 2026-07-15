import { RuntimeError } from "./errors.js";
import { defineChannelCapability } from "./capability-sdk.js";
import { canonicalInboundEnvelope } from "./channel-envelope.js";

export function defineMessengerAdapter(definition = {}) {
  const capability = defineChannelCapability(definition);
  if (typeof definition.normalizeInbound !== "function" || typeof definition.send !== "function" || typeof definition.reconcile !== "function") {
    throw new RuntimeError("invalid_messenger_adapter", "Messenger adapter must normalize inbound, send, and reconcile", 400);
  }
  return Object.freeze({
    capability,
    normalizeInbound(payload) { return canonicalInboundEnvelope(definition.normalizeInbound(payload)); },
    send(envelope, options) { return definition.send(envelope, options); },
    reconcile(delivery, options) { return definition.reconcile(delivery, options); },
    start: typeof definition.start === "function" ? () => definition.start() : null,
    stop: typeof definition.stop === "function" ? () => definition.stop() : null,
    connect: typeof definition.connect === "function" ? () => definition.connect() : null,
    connectionStatus: typeof definition.connectionStatus === "function" ? () => definition.connectionStatus() : null,
    disconnect: typeof definition.disconnect === "function" ? () => definition.disconnect() : null,
    poll: typeof definition.poll === "function" ? options => definition.poll(options) : null
  });
}
