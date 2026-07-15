import { defineMessengerAdapter } from "../../src/core/channel-adapter-sdk.js";

function manifest(id, name) {
  const lifecycle = Object.fromEntries(["install", "preflight", "activate", "health", "invoke", "reconcile", "disable", "remove", "update", "rollback"].map(operation => [operation, true]));
  return {
    schema: "gpao_t3.capability_manifest.v1", manifestVersion: 1, id, name,
    description: `${name} messenger conformance fixture`, version: "1.0.0",
    groups: ["messaging_channels"], capabilities: ["inbound", "outbound", "reconcile"],
    protocol: { major: 1, minor: 2, minCompatibleMinor: 0 },
    inputSchema: { type: "object", additionalProperties: true }, outputSchema: { type: "object", additionalProperties: true },
    streaming: false, cancellation: true, timeoutMs: 5_000, cost: { model: "free" }, secretBoundary: "protected_adapter",
    authority: "external_send", sideEffect: "external", isolation: { mode: "worker", permitRevalidation: true },
    lifecycle, provenance: { source: "GPAO-T3 WP5 conformance fixture", license: "UNLICENSED" }, status: "ready"
  };
}

export function createFixtureMessengerAdapter({ id, name, normalize }) {
  const sendAttempts = new Map();
  return defineMessengerAdapter({
    manifest: manifest(id, name),
    invoke: async input => input,
    normalizeInbound: normalize,
    async send(envelope) {
      const attempts = (sendAttempts.get(envelope.idempotencyKey) || 0) + 1;
      sendAttempts.set(envelope.idempotencyKey, attempts);
      if (envelope.content.text === "pre-send-failure") return { status: "failed", safeToRetry: true, errorCode: "offline_before_send" };
      if (envelope.content.text === "ambiguous" && attempts === 1) return { status: "unknown", errorCode: "connection_lost_after_write" };
      return { status: "delivered", externalMessageId: `${id}-message-${attempts}` };
    },
    async reconcile(delivery) {
      if (delivery.envelope.content.text === "ambiguous") return { outcome: "not_sent" };
      return { outcome: "delivered", externalMessageId: `${id}-reconciled` };
    }
  });
}
