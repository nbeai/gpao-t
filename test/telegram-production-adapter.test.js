import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { TelegramBotApiBackend } from "../src/core/telegram-bot-api-backend.js";
import { createTelegramMessengerAdapter } from "../src/core/telegram-messenger-adapter.js";
import { NativeRuntime } from "../src/core/runtime.js";

const SECRET = "123456789:telegram-test-token-value";
function stateDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-telegram-production-")); }
function keychainStore() {
  let value = null;
  return {
    async save({ secret }) { value = secret; return { handle: "keychain:telegram-bot" }; },
    async has(handle) { return handle === "keychain:telegram-bot" && value !== null; },
    async withCredential(handle, providerId, fn) {
      if (handle !== "keychain:telegram-bot" || providerId !== "telegram-bot" || value === null) throw new Error("missing credential");
      return fn(value);
    },
    async remove() { value = null; return true; }
  };
}

function apiFetch(calls) {
  return async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    if (url.endsWith("/getMe")) return new Response(JSON.stringify({ ok: true, result: { id: 42, username: "gpao_t3_test_bot" } }), { status: 200 });
    if (url.endsWith("/getUpdates")) return new Response(JSON.stringify({ ok: true, result: [{ update_id: 10, message: { message_id: 7, date: 1_784_130_000, text: "안녕하세요", chat: { id: 99, type: "private" } } }] }), { status: 200 });
    if (url.endsWith("/sendMessage")) return new Response(JSON.stringify({ ok: true, result: { message_id: 8 } }), { status: 200 });
    return new Response(JSON.stringify({ ok: false }), { status: 404 });
  };
}

test("protected Telegram backend keeps the bot token out of every public result", async () => {
  const calls = [];
  const backend = new TelegramBotApiBackend({
    credentialStore: keychainStore(),
    acquirer: { acquire: async () => SECRET },
    fetchImpl: apiFetch(calls), apiBase: "http://127.0.0.1:19001"
  });
  const connected = await backend.begin();
  const polled = await backend.poll();
  const delivered = await backend.send({ chatId: "99", text: "답변" });
  const status = await backend.status();
  const revoked = await backend.revoke();
  const publicValues = JSON.stringify({ connected, polled, delivered, status, revoked });
  assert.equal(publicValues.includes(SECRET), false);
  assert.equal(connected.state, "connected");
  assert.equal(connected.bot.username, "gpao_t3_test_bot");
  assert.equal(polled.updates[0].message.text, "안녕하세요");
  assert.equal(delivered.status, "delivered");
  assert.equal(revoked.state, "revoked");
  assert.ok(calls.every(call => call.url.startsWith(`http://127.0.0.1:19001/bot${SECRET}/`)));
});

test("production Telegram adapter uses channel-neutral sessions and explicit send authority", async () => {
  const client = {
    start: async () => {}, stop: async () => {}, begin: async () => ({ state: "connected" }),
    status: async () => ({ state: "connected", bot: { id: "42", username: "gpao_t3_test_bot" } }),
    revoke: async () => ({ state: "revoked" }),
    poll: async () => ({ updates: [{ update_id: 11, account_id: "default", message: { message_id: 9, date: Date.now(), text: "작업 요청", message_thread_id: null, chat: { id: "99", type: "private" } } }] }),
    send: async () => ({ status: "delivered", externalMessageId: "10" })
  };
  const telegram = createTelegramMessengerAdapter({ client });
  const runtime = await new NativeRuntime({ stateDir: stateDir(), channelAdapters: { telegram } }).start();
  try {
    assert.equal((await runtime.channelConnectionStatus()).channels[0].connection.state, "connected");
    const polled = await runtime.pollChannel("telegram");
    assert.ok(polled.received === 0 || polled.received === 1);
    assert.ok(polled.handled === 0 || polled.handled === 1);
    const sessions = await runtime.messenger.sessions();
    assert.equal(sessions.sessions[0].sessionKind, "messengerDirect[telegram]");
    assert.equal(sessions.sessions[0].messages[0].text, "작업 요청");
    assert.equal(sessions.sessions[0].messages[0].status, "handled");
    const toolSent = await runtime.sendMessengerSession({ principalId: "owner:test", sessionId: sessions.sessions[0].sessionId, text: "승인된 답변" });
    assert.equal(toolSent.status, "succeeded");
    const identity = telegram.normalizeInbound({ update_id: 11, account_id: "default", message: { message_id: 9, date: Date.now(), text: "작업 요청", chat: { id: "99", type: "private" } } }).identity;
    await assert.rejects(() => runtime.messenger.send(telegram, { identity, idempotencyKey: "blocked", content: { text: "답변" } }), error => error.code === "channel_send_approval_required");
    const sent = await runtime.messenger.send(telegram, { identity, idempotencyKey: "approved", content: { text: "답변" } }, { authority: { externalSendApproved: true } });
    assert.equal(sent.status, "delivered");
    assert.equal((await runtime.disconnectChannel("telegram")).state, "revoked");
  } finally { await runtime.stop(); }
});

test("Telegram transport ambiguity remains unknown and cannot be silently retried", async () => {
  const store = keychainStore();
  const backend = new TelegramBotApiBackend({
    credentialStore: store, acquirer: { acquire: async () => SECRET }, apiBase: "http://localhost:19002",
    fetchImpl: async url => {
      if (url.endsWith("/getMe")) return new Response(JSON.stringify({ ok: true, result: { id: 42, username: "bot" } }), { status: 200 });
      throw new Error("network stopped after write");
    }
  });
  await backend.begin();
  const result = await backend.send({ chatId: "99", text: "답변" });
  assert.equal(result.status, "unknown");
  assert.equal(result.errorCode, "telegram_outcome_unknown");
});

test("protected credential callbacks preserve only safe Telegram transport failures", async () => {
  const store = keychainStore();
  const original = store.withCredential;
  store.withCredential = async (...args) => {
    try { return await original(...args); }
    catch { throw new Error("credential callback details hidden"); }
  };
  const backend = new TelegramBotApiBackend({
    credentialStore: store, acquirer: { acquire: async () => SECRET }, apiBase: "http://localhost:19003",
    fetchImpl: async url => url.endsWith("/getMe")
      ? new Response(JSON.stringify({ ok: true, result: { id: 42, username: "bot" } }), { status: 200 })
      : new Response(JSON.stringify({ ok: false, description: "conflict details" }), { status: 409 })
  });
  await backend.begin();
  await assert.rejects(() => backend.poll(), error => error.code === "telegram_poll_conflict" && error.status === 409 && !error.message.includes("conflict details"));
});

test("Telegram poll conflicts distinguish webhook ownership without exposing provider text", async () => {
  const backend = new TelegramBotApiBackend({
    credentialStore: keychainStore(), acquirer: { acquire: async () => SECRET }, apiBase: "http://localhost:19004",
    fetchImpl: async url => url.endsWith("/getMe")
      ? new Response(JSON.stringify({ ok: true, result: { id: 42, username: "bot" } }), { status: 200 })
      : new Response(JSON.stringify({ ok: false, description: "Conflict: can't use getUpdates method while webhook is active" }), { status: 409 })
  });
  await backend.begin();
  await assert.rejects(() => backend.poll(), error => error.code === "telegram_webhook_conflict" && !error.message.includes("webhook is active"));
});

test("runtime coalesces automatic and manual Telegram polls per channel", async () => {
  let pollCalls = 0;
  const client = {
    start: async () => {}, stop: async () => {}, status: async () => ({ state: "auth_required" }),
    poll: async () => { pollCalls += 1; await new Promise(resolve => setTimeout(resolve, 25)); return { updates: [] }; },
    send: async () => ({ status: "delivered", externalMessageId: "1" })
  };
  const telegram = createTelegramMessengerAdapter({ client });
  const runtime = await new NativeRuntime({ stateDir: stateDir(), channelAdapters: { telegram } }).start();
  try {
    const [first, second] = await Promise.all([runtime.pollChannel("telegram"), runtime.pollChannel("telegram")]);
    assert.equal(pollCalls, 1);
    assert.equal(first.received, 0);
    assert.deepEqual(second, first);
  } finally { await runtime.stop(); }
});
