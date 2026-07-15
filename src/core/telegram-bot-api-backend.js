import { RuntimeError } from "./errors.js";
import { MacKeychainCredentialStore } from "./credential-store.js";
import { MacOSSecretAcquirer } from "./macos-secret-acquirer.js";

const PROVIDER_ID = "telegram-bot";
const CREDENTIAL_REF = "keychain:telegram-bot";
const OFFICIAL_API_BASE = "https://api.telegram.org";
const TRANSPORT_ERRORS = new Set([
  "telegram_auth_required", "telegram_rate_limited", "telegram_unavailable", "telegram_outcome_unknown",
  "telegram_webhook_conflict", "telegram_poll_conflict"
]);

function fail(code, message, status = 400) { return new RuntimeError(code, message, status); }
function safeId(value, field) {
  const result = String(value ?? "").trim();
  if (!result || result.length > 128) throw fail("telegram_request_invalid", `${field} is required`);
  return result;
}
function connection(state, bot = null) {
  return Object.freeze({
    schema: "gpao_t3.telegram_connection.v1",
    channelId: "telegram",
    accountRef: CREDENTIAL_REF,
    state,
    bot: bot ? Object.freeze({ id: String(bot.id), username: String(bot.username || "") }) : null
  });
}
function sanitizeUpdate(update) {
  const message = update?.message;
  if (!Number.isSafeInteger(update?.update_id) || !message || !Number.isSafeInteger(message.message_id) || !message.chat) return null;
  const text = typeof message.text === "string" ? message.text.slice(0, 32_768) : null;
  if (!text) return null;
  return Object.freeze({
    update_id: update.update_id,
    account_id: "default",
    message: Object.freeze({
      message_id: message.message_id,
      date: Number.isSafeInteger(message.date) ? message.date * 1000 : Date.now(),
      text,
      message_thread_id: Number.isSafeInteger(message.message_thread_id) ? message.message_thread_id : null,
      chat: Object.freeze({ id: String(message.chat.id), type: String(message.chat.type || "private") })
    })
  });
}

export class TelegramBotApiBackend {
  constructor({ credentialStore = new MacKeychainCredentialStore(), acquirer = new MacOSSecretAcquirer(), fetchImpl = fetch, apiBase = OFFICIAL_API_BASE } = {}) {
    if (typeof fetchImpl !== "function") throw fail("telegram_backend_invalid", "A fetch implementation is required", 500);
    if (apiBase !== OFFICIAL_API_BASE && !/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(apiBase)) throw fail("telegram_endpoint_untrusted", "Telegram endpoint is not trusted", 400);
    this.credentialStore = credentialStore;
    this.acquirer = acquirer;
    this.fetchImpl = fetchImpl;
    this.apiBase = apiBase.replace(/\/$/, "");
    this.nextOffset = 0;
  }

  assertReference(accountRef) {
    if (accountRef !== CREDENTIAL_REF) throw fail("telegram_connection_not_found", "Telegram connection is not available", 404);
  }

  async call(token, method, body = {}, { signal = null } = {}) {
    let response;
    try {
      response = await this.fetchImpl(`${this.apiBase}/bot${token}/${method}`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal
      });
    } catch { throw fail("telegram_outcome_unknown", "Telegram did not confirm the request outcome", 504); }
    let payload = null;
    try { payload = await response.json(); } catch {}
    if (!response.ok || payload?.ok !== true) {
      const description = String(payload?.description || "").toLowerCase();
      const code = response.status === 401 ? "telegram_auth_required"
        : response.status === 429 ? "telegram_rate_limited"
          : response.status === 409 && method === "getUpdates" && description.includes("webhook") ? "telegram_webhook_conflict"
            : response.status === 409 && method === "getUpdates" ? "telegram_poll_conflict"
              : "telegram_unavailable";
      throw fail(code, "Telegram could not complete the request", response.status || 503);
    }
    return payload.result;
  }

  async credentialCall(accountRef, method, body = {}, options = {}) {
    const outcome = await this.credentialStore.withCredential(accountRef, PROVIDER_ID, async token => {
      try { return { ok: true, result: await this.call(token, method, body, options) }; }
      catch (error) {
        const code = TRANSPORT_ERRORS.has(error?.code) ? error.code : "telegram_unavailable";
        return { ok: false, error: { code, status: Number.isInteger(error?.status) ? error.status : 503 } };
      }
    });
    if (!outcome?.ok) throw fail(outcome?.error?.code || "telegram_unavailable", "Telegram could not complete the request", outcome?.error?.status || 503);
    return outcome.result;
  }

  async verify(accountRef = CREDENTIAL_REF) {
    this.assertReference(accountRef);
    const exists = await this.credentialStore.has(accountRef, PROVIDER_ID);
    if (!exists) return connection("auth_required");
    try {
      const bot = await this.credentialCall(accountRef, "getMe");
      return connection("connected", bot);
    } catch (error) {
      if (error?.code === "credential_callback_failed") return connection("unavailable");
      throw error;
    }
  }

  async begin() {
    let token = await this.acquirer.acquire({ providerId: PROVIDER_ID });
    let saved = null;
    try {
      saved = await this.credentialStore.save({ providerId: PROVIDER_ID, secret: token });
      const status = await this.verify(saved.handle);
      if (status.state !== "connected") throw fail("telegram_unavailable", "Telegram connection could not be verified", 503);
      return status;
    } catch (error) {
      if (saved) await Promise.resolve(this.credentialStore.remove(saved.handle, PROVIDER_ID)).catch(() => {});
      throw error;
    } finally { token = null; }
  }

  status({ accountRef = CREDENTIAL_REF } = {}) { return this.verify(accountRef); }

  async revoke({ accountRef = CREDENTIAL_REF } = {}) {
    this.assertReference(accountRef);
    await this.credentialStore.remove(accountRef, PROVIDER_ID);
    return connection("revoked");
  }

  async poll({ accountRef = CREDENTIAL_REF, offset = null, limit = 20 } = {}, { signal = null } = {}) {
    this.assertReference(accountRef);
    const boundedLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const selectedOffset = Number.isSafeInteger(offset) ? offset : this.nextOffset;
    const result = await this.credentialCall(accountRef, "getUpdates", {
      offset: selectedOffset, limit: boundedLimit, timeout: 0, allowed_updates: ["message"]
    }, { signal });
    const updates = (Array.isArray(result) ? result : []).map(sanitizeUpdate).filter(Boolean);
    if (updates.length) this.nextOffset = Math.max(...updates.map(update => update.update_id)) + 1;
    return Object.freeze({ schema: "gpao_t3.telegram_poll.v1", updates: Object.freeze(updates), nextOffset: this.nextOffset });
  }

  async send({ accountRef = CREDENTIAL_REF, chatId, threadId = null, text, replyToId = null } = {}, { signal = null } = {}) {
    this.assertReference(accountRef);
    const body = { chat_id: safeId(chatId, "chatId"), text: String(text || "").slice(0, 4096) };
    if (!body.text) throw fail("telegram_message_empty", "Telegram message is empty");
    if (threadId !== null) body.message_thread_id = Number(threadId);
    if (replyToId !== null) body.reply_parameters = { message_id: Number(replyToId) };
    try {
      const result = await this.credentialCall(accountRef, "sendMessage", body, { signal });
      return Object.freeze({ status: "delivered", externalMessageId: String(result.message_id) });
    } catch (error) {
      if (error?.code === "telegram_outcome_unknown" || error?.code === "credential_callback_failed") return Object.freeze({ status: "unknown", errorCode: "telegram_outcome_unknown" });
      return Object.freeze({ status: "failed", safeToRetry: true, errorCode: error?.code || "telegram_delivery_failed" });
    }
  }
}

export const TELEGRAM_BOT_CREDENTIAL_REF = CREDENTIAL_REF;
export { sanitizeUpdate as sanitizeTelegramUpdate };
