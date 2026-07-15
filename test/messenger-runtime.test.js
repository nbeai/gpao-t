import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NativeRuntime } from "../src/core/runtime.js";
import { canonicalOutboundEnvelope, messengerSessionKind, normalizeChannelIdentity } from "../src/core/channel-envelope.js";
import { createAdapter as createTelegram } from "./fixtures/telegram-messenger-adapter.js";
import { createAdapter as createRelay } from "./fixtures/relay-messenger-adapter.js";

function tempState() { return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-messenger-")); }
function telegramInput({ update = 1, chat = "owner-a", type = "private", thread = null, text = "hello" } = {}) {
  return { update_id: update, account_id: "default", message: { message_id: update, date: Date.now(), text, message_thread_id: thread, chat: { id: chat, type } } };
}
function relayInput({ sequence = 1, sender = "owner-a", room = null, thread = null, body = "hello" } = {}) {
  return { event: `event-${sequence}`, sequence, timestamp: Date.now(), workspace: "default", message: `message-${sequence}`, sender, room, thread, body };
}
function outbound(identity, key, text = "reply") { return { identity, idempotencyKey: key, content: { text } }; }

test("channel identities create neutral direct, group, and thread-isolated sessions", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const telegram = createTelegram();
  try {
    const direct = await runtime.messenger.ingest(telegram, telegramInput({ update: 1 }));
    const group = await runtime.messenger.ingest(telegram, telegramInput({ update: 2, chat: "group-a", type: "group" }));
    const thread = await runtime.messenger.ingest(telegram, telegramInput({ update: 3, chat: "group-a", type: "group", thread: 42 }));
    assert.equal(direct.sessionKind, "messengerDirect[telegram]");
    assert.equal(direct.contextPacket.contextScope, "dedicated_session_only");
    assert.equal(direct.contextPacket.crossSessionInfluence, "blocked_until_admission");
    assert.equal(group.sessionKind, "messengerGroup[telegram]");
    assert.notEqual(group.sessionId, thread.sessionId);
    assert.equal((await runtime.messenger.status()).contextBoundary, "isolated_until_admitted");
  } finally { await runtime.stop(); }
});

test("per-session ingress is ordered and promotes exactly one queued event", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const adapter = createTelegram();
  try {
    const first = await runtime.messenger.ingest(adapter, telegramInput({ update: 10 }));
    const second = await runtime.messenger.ingest(adapter, telegramInput({ update: 11 }));
    assert.equal(first.status, "claimed");
    assert.equal(second.status, "queued");
    assert.equal(second.contextPacket, null);
    const completed = await runtime.messenger.completeInbound({ inboundId: first.inboundId });
    assert.equal(completed.nextInbound.inboundId, second.inboundId);
    assert.equal(completed.nextInbound.contextPacket.sessionId, first.sessionId);
  } finally { await runtime.stop(); }
});

test("account, peer, and adapter identities cannot collapse into another principal session", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const telegram = createTelegram();
  const relay = createRelay();
  try {
    const owner = await runtime.messenger.ingest(telegram, telegramInput({ update: 70, chat: "same-peer" }));
    const otherAccountPayload = { ...telegramInput({ update: 71, chat: "same-peer" }), account_id: "second" };
    const otherAccount = await runtime.messenger.ingest(telegram, otherAccountPayload);
    const otherAdapter = await runtime.messenger.ingest(relay, relayInput({ sequence: 72, sender: "same-peer" }));
    assert.notEqual(owner.sessionId, otherAccount.sessionId);
    assert.notEqual(owner.sessionId, otherAdapter.sessionId);
    assert.notEqual(owner.contextPacket.principalId, otherAccount.contextPacket.principalId);
    const firstDelivery = await runtime.messenger.send(telegram, outbound(telegram.normalizeInbound(telegramInput()).identity, "same-local-key"), { authority: { externalSendApproved: true } });
    const secondDelivery = await runtime.messenger.send(relay, outbound(relay.normalizeInbound(relayInput()).identity, "same-local-key"), { authority: { externalSendApproved: true } });
    assert.notEqual(firstDelivery.deliveryId, secondDelivery.deliveryId);
  } finally { await runtime.stop(); }
});

for (const [name, createAdapter, input] of [
  ["Telegram reference", createTelegram, telegramInput()],
  ["synthetic relay", createRelay, relayInput()]
]) {
  test(`${name} adapter passes the same inbound and delivery contract`, async () => {
    const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
    const adapter = createAdapter();
    try {
      const inbound = await runtime.messenger.ingest(adapter, input);
      assert.equal(inbound.status, "claimed");
      assert.equal((await runtime.messenger.completeInbound({ inboundId: inbound.inboundId })).status, "handled");
      const identity = adapter.normalizeInbound(input).identity;
      await assert.rejects(() => runtime.messenger.send(adapter, outbound(identity, `${name}-blocked`)), error => error.code === "channel_send_approval_required");
      const delivered = await runtime.messenger.send(adapter, outbound(identity, `${name}-sent`), { authority: { externalSendApproved: true } });
      assert.equal(delivered.status, "delivered");
      assert.match(delivered.externalMessageId, /message-1$/);
    } finally { await runtime.stop(); }
  });
}

test("inbound dedupe, checkpoint ordering, and restart recovery are durable", async () => {
  const stateDir = tempState();
  const first = await new NativeRuntime({ stateDir }).start();
  const adapter = createTelegram();
  const accepted = await first.messenger.ingest(adapter, telegramInput({ update: 20 }));
  await first.messenger.completeInbound({ inboundId: accepted.inboundId });
  await first.stop();

  const second = await new NativeRuntime({ stateDir }).start();
  try {
    const duplicate = await second.messenger.ingest(adapter, telegramInput({ update: 20 }));
    const stale = await second.messenger.ingest(adapter, telegramInput({ update: 19 }));
    const next = await second.messenger.ingest(adapter, telegramInput({ update: 21 }));
    assert.equal(duplicate.deduplicated, true);
    assert.equal(stale.status, "suppressed_stale");
    assert.equal(stale.deduplicated, true);
    assert.equal(next.status, "claimed");
    assert.equal(next.sessionId, accepted.sessionId);
  } finally { await second.stop(); }
});

test("restart releases an in-flight inbound for replay and fences an in-flight send as unknown", async () => {
  const stateDir = tempState();
  const adapter = createRelay();
  const first = await new NativeRuntime({ stateDir }).start();
  const inbound = await first.messenger.ingest(adapter, relayInput({ sequence: 50 }));
  const envelope = canonicalOutboundEnvelope(outbound(adapter.normalizeInbound(relayInput()).identity, "restart-send", "reply"));
  const prepared = await first.writer.call("prepareChannelDelivery", { envelope });
  await first.writer.call("markChannelDeliverySending", { deliveryId: prepared.deliveryId });
  await first.stop();

  const second = await new NativeRuntime({ stateDir }).start();
  try {
    const replay = await second.messenger.ingest(adapter, relayInput({ sequence: 50 }));
    const delivery = await second.writer.call("getChannelDelivery", { deliveryId: prepared.deliveryId });
    assert.equal(replay.inboundId, inbound.inboundId);
    assert.equal(replay.status, "claimed");
    assert.equal(replay.reclaimed, true);
    assert.equal(delivery.status, "unknown");
    assert.equal((await second.messenger.status()).reconcileRequired, 1);
  } finally { await second.stop(); }
});

test("restart drains durable presented inbound without waiting for provider redelivery", async () => {
  const stateDir = tempState();
  const adapter = createTelegram();
  const first = await new NativeRuntime({ stateDir }).start();
  await first.messenger.ingest(adapter, telegramInput({ update: 80, text: "first" }));
  await first.messenger.ingest(adapter, telegramInput({ update: 81, text: "second" }));
  await first.stop();

  const second = await new NativeRuntime({ stateDir, channelAdapters: { telegram: adapter } }).start();
  try {
    const sessions = await second.messenger.sessions();
    assert.deepEqual(sessions.sessions[0].messages.map(message => message.status), ["handled", "handled"]);
    assert.equal((await second.messenger.status()).inbound.find(entry => entry.status === "handled").count, 2);
  } finally { await second.stop(); }
});

test("ambiguous delivery is never resent until reconciliation proves not sent", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const adapter = createRelay();
  const identity = adapter.normalizeInbound(relayInput()).identity;
  try {
    const first = await runtime.messenger.send(adapter, outbound(identity, "ambiguous-delivery", "ambiguous"), { authority: { externalSendApproved: true } });
    assert.equal(first.status, "unknown");
    const duplicate = await runtime.messenger.send(adapter, outbound(identity, "ambiguous-delivery", "ambiguous"), { authority: { externalSendApproved: true } });
    assert.equal(duplicate.status, "unknown");
    assert.equal(duplicate.attempts, 1);
    assert.equal(duplicate.blockedReason, "reconcile_required");
    const reconciled = await runtime.messenger.reconcile(adapter, first.deliveryId);
    assert.equal(reconciled.status, "reconciled_not_sent");
    await runtime.messenger.retryReconciled(first.deliveryId);
    const retried = await runtime.messenger.send(adapter, outbound(identity, "ambiguous-delivery", "ambiguous"), { authority: { externalSendApproved: true } });
    assert.equal(retried.status, "delivered");
    assert.equal(retried.attempts, 2);
  } finally { await runtime.stop(); }
});

test("channel core contains no provider branch and canonical contracts reject malformed identity", () => {
  const source = fs.readFileSync(new URL("../src/core/messenger-runtime.js", import.meta.url), "utf8");
  assert.equal(/telegram|relay|discord|slack|whatsapp|imessage/i.test(source), false);
  assert.throws(() => normalizeChannelIdentity({ adapterId: "telegram", accountId: "default", peer: { kind: "room", id: "1" } }), error => error.code === "channel_peer_kind_invalid");
  assert.equal(messengerSessionKind({ adapterId: "x", channelId: "x", accountId: "a", peer: { kind: "direct", id: "p" } }), "messengerDirect[x]");
  assert.throws(() => canonicalOutboundEnvelope({ identity: { adapterId: "x", accountId: "a", peer: { kind: "direct", id: "p" } }, idempotencyKey: "k", content: {} }), error => error.code === "channel_message_empty");
});
