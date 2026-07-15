import crypto from "node:crypto";
import path from "node:path";
import { fork } from "node:child_process";
import { RuntimeError } from "./errors.js";

const MESSAGES = Object.freeze({
  credential_acquisition_cancelled: "Telegram 연결을 취소했습니다.",
  credential_acquisition_unavailable: "안전한 Telegram 연결 창을 열지 못했습니다.",
  credential_store_unavailable: "안전한 연결 저장소를 사용할 수 없습니다.",
  telegram_auth_required: "Telegram Bot 연결을 다시 확인해야 합니다.",
  telegram_rate_limited: "Telegram 요청이 잠시 제한되었습니다.",
  telegram_unavailable: "Telegram에 연결할 수 없습니다.",
  telegram_webhook_conflict: "이 Telegram Bot에는 다른 웹훅 연결이 활성화되어 있습니다.",
  telegram_poll_conflict: "이 Telegram Bot을 다른 수신 프로세스가 사용하고 있습니다.",
  telegram_outcome_unknown: "Telegram 전송 결과를 확인하지 못했습니다.",
  telegram_connection_not_found: "Telegram 연결을 찾을 수 없습니다.",
  telegram_request_invalid: "Telegram 요청 형식이 올바르지 않습니다.",
  telegram_message_empty: "보낼 Telegram 메시지가 없습니다."
});

export class TelegramChannelProcessClient {
  constructor({ processPath = path.resolve(new URL("./telegram-channel-process.js", import.meta.url).pathname), requestTimeoutMs = 35_000 } = {}) {
    this.isIsolatedProcess = true; this.processPath = processPath; this.requestTimeoutMs = requestTimeoutMs; this.child = null; this.pending = new Map();
  }
  async start() {
    if (this.child?.connected) return this;
    const env = Object.fromEntries(Object.entries({ PATH: process.env.PATH, HOME: process.env.HOME, USER: process.env.USER, TMPDIR: process.env.TMPDIR, GPAO_T3_KEYCHAIN_HELPER: process.env.GPAO_T3_KEYCHAIN_HELPER }).filter(([, value]) => typeof value === "string"));
    const child = fork(this.processPath, [], { execArgv: [], env, stdio: ["ignore", "ignore", "pipe", "ipc"] });
    this.child = child; child.stderr.on("data", () => {}); child.on("message", message => this.handle(message));
    child.once("exit", () => { this.child = null; for (const item of this.pending.values()) item.reject(new RuntimeError("telegram_process_unavailable", "Telegram 연결 서비스가 중단되었습니다.", 503)); this.pending.clear(); });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new RuntimeError("telegram_process_unavailable", "Telegram 연결 서비스를 시작하지 못했습니다.", 503)), 5_000);
      const ready = message => { if (message?.type !== "ready") return; clearTimeout(timer); child.off("message", ready); resolve(); };
      child.on("message", ready); child.once("error", error => { clearTimeout(timer); reject(error); });
    });
    return this;
  }
  handle(message) {
    const item = this.pending.get(message?.id); if (!item) return;
    this.pending.delete(message.id); clearTimeout(item.timer);
    if (message.ok) return item.resolve(message.result);
    const code = MESSAGES[message.error?.code] ? message.error.code : "telegram_process_failed";
    item.reject(new RuntimeError(code, MESSAGES[code] || "Telegram 연결 서비스가 요청을 마치지 못했습니다.", message.error?.status || 500));
  }
  call(operation, request = {}, { signal = null } = {}) {
    if (!this.child?.connected) return Promise.reject(new RuntimeError("telegram_process_unavailable", "Telegram 연결 서비스가 준비되지 않았습니다.", 503));
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const finishUnknown = () => { this.pending.delete(id); try { this.child?.send({ type: "cancel", id }); } catch {} reject(new RuntimeError("telegram_outcome_unknown", MESSAGES.telegram_outcome_unknown, 504)); };
      const timer = setTimeout(finishUnknown, this.requestTimeoutMs); timer.unref();
      const abort = () => { clearTimeout(timer); finishUnknown(); };
      signal?.addEventListener("abort", abort, { once: true });
      this.pending.set(id, { timer, resolve: value => { signal?.removeEventListener("abort", abort); resolve(value); }, reject: error => { signal?.removeEventListener("abort", abort); reject(error); } });
      this.child.send({ id, operation, request });
    });
  }
  begin() { return this.call("begin"); }
  status() { return this.call("status", { accountRef: "keychain:telegram-bot" }); }
  revoke() { return this.call("revoke", { accountRef: "keychain:telegram-bot" }); }
  poll(request = {}, options) { return this.call("poll", { accountRef: "keychain:telegram-bot", ...request }, options); }
  send(request, options) { return this.call("send", request, options); }
  diagnostic() { return { schema: "gpao_t3.telegram_process_status.v1", isolation: "separate_process", state: this.child?.connected ? "ready" : "offline" }; }
  async stop() { const child = this.child; if (!child) return; this.child = null; try { child.disconnect(); } catch {} if (child.exitCode === null) try { child.kill("SIGTERM"); } catch {} }
}
