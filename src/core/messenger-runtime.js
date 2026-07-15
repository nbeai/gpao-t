import { RuntimeError } from "./errors.js";
import { canonicalInboundEnvelope, canonicalOutboundEnvelope } from "./channel-envelope.js";
import { schemaName } from "./product-identity.js";
import { createChannelContextPacket } from "./channel-context.js";

export class MessengerRuntime {
  constructor({ writer } = {}) { this.writer = writer; }

  setWriter(writer) { this.writer = writer; }
  requireWriter() {
    if (!this.writer) throw new RuntimeError("messenger_state_unavailable", "Messenger state service is unavailable", 503);
    return this.writer;
  }

  async ingest(adapter, payload) {
    const envelope = canonicalInboundEnvelope(adapter.normalizeInbound(payload));
    const result = await this.requireWriter().call("ingestChannelInbound", { envelope });
    return { ...result, contextPacket: result.status === "claimed" ? createChannelContextPacket({ sessionId: result.sessionId, envelope }) : null };
  }

  async completeInbound({ inboundId, outcome = "handled", checkpoint = true } = {}) {
    if (!inboundId) throw new RuntimeError("channel_inbound_invalid", "Inbound record is required", 400);
    const result = await this.requireWriter().call("completeChannelInbound", { inboundId, outcome, checkpoint });
    if (!result.nextInbound) return result;
    const next = result.nextInbound;
    return { ...result, nextInbound: { ...next, contextPacket: createChannelContextPacket({ sessionId: next.sessionId, envelope: next.envelope }) } };
  }

  async claimNextInbound() {
    const next = await this.requireWriter().call("claimNextChannelInbound");
    return next ? { ...next, contextPacket: createChannelContextPacket({ sessionId: next.sessionId, envelope: next.envelope }) } : null;
  }

  async send(adapter, input, { authority = {}, signal } = {}) {
    if (authority.externalSendApproved !== true) throw new RuntimeError("channel_send_approval_required", "External channel delivery requires explicit approval", 403);
    const envelope = canonicalOutboundEnvelope(input);
    const prepared = await this.requireWriter().call("prepareChannelDelivery", { envelope });
    if (prepared.status !== "prepared") return prepared;
    await this.requireWriter().call("markChannelDeliverySending", { deliveryId: prepared.deliveryId });
    try {
      const result = await adapter.send(envelope, { signal, deliveryId: prepared.deliveryId });
      const outcome = result?.status;
      if (outcome === "delivered") {
        return this.requireWriter().call("finishChannelDelivery", { deliveryId: prepared.deliveryId, outcome, externalMessageId: result.externalMessageId });
      }
      if (outcome === "failed" && result.safeToRetry === true) {
        return this.requireWriter().call("finishChannelDelivery", { deliveryId: prepared.deliveryId, outcome, errorCode: result.errorCode || "delivery_failed" });
      }
      return this.requireWriter().call("finishChannelDelivery", { deliveryId: prepared.deliveryId, outcome: "unknown", errorCode: result?.errorCode || "delivery_outcome_unknown" });
    } catch (error) {
      const outcome = error?.preSend === true ? "failed" : "unknown";
      return this.requireWriter().call("finishChannelDelivery", { deliveryId: prepared.deliveryId, outcome, errorCode: error?.code || "delivery_transport_failed" });
    }
  }

  async reconcile(adapter, deliveryId, { signal } = {}) {
    const delivery = await this.requireWriter().call("getChannelDelivery", { deliveryId });
    if (!delivery) throw new RuntimeError("channel_delivery_not_found", "Channel delivery does not exist", 404);
    if (delivery.status !== "unknown") return delivery;
    const result = await adapter.reconcile(delivery, { signal });
    if (!result || !["delivered", "not_sent", "unknown"].includes(result.outcome)) throw new RuntimeError("channel_reconcile_invalid", "Channel adapter returned an invalid reconciliation result", 502);
    return this.requireWriter().call("reconcileChannelDelivery", { deliveryId, outcome: result.outcome, externalMessageId: result.externalMessageId || null });
  }

  async retryReconciled(deliveryId) {
    return this.requireWriter().call("retryChannelDelivery", { deliveryId });
  }

  async status() {
    return { schema: schemaName("messenger_runtime_status.v1"), ...(await this.requireWriter().call("channelRuntimeStatus")) };
  }

  async sessions() {
    return { schema: schemaName("messenger_sessions.v1"), sessions: await this.requireWriter().call("listMessengerSessions") };
  }

  async session(sessionId) {
    return this.requireWriter().call("getMessengerSession", { sessionId });
  }
}
