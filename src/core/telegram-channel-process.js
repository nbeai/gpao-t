import { TelegramBotApiBackend } from "./telegram-bot-api-backend.js";

const backend = new TelegramBotApiBackend();
const controllers = new Map();
const allowedErrors = new Set([
  "credential_acquisition_cancelled", "credential_acquisition_unavailable", "credential_store_unavailable",
  "telegram_auth_required", "telegram_rate_limited", "telegram_unavailable", "telegram_outcome_unknown",
  "telegram_webhook_conflict", "telegram_poll_conflict",
  "telegram_connection_not_found", "telegram_request_invalid", "telegram_message_empty"
]);

async function execute(message) {
  if (message.operation === "begin") return backend.begin();
  if (message.operation === "status") return backend.status(message.request);
  if (message.operation === "revoke") return backend.revoke(message.request);
  const controller = new AbortController();
  controllers.set(message.id, controller);
  try {
    if (message.operation === "poll") return await backend.poll(message.request, { signal: controller.signal });
    if (message.operation === "send") return await backend.send(message.request, { signal: controller.signal });
    throw new Error("unsupported operation");
  } finally { controllers.delete(message.id); }
}

process.on("message", message => {
  if (message?.type === "cancel") { controllers.get(message.id)?.abort(); return; }
  if (!message?.id || !message?.operation) return;
  void execute(message).then(
    result => process.send?.({ id: message.id, ok: true, result }),
    error => process.send?.({ id: message.id, ok: false, error: { code: allowedErrors.has(error?.code) ? error.code : "telegram_process_failed", status: Number.isInteger(error?.status) ? error.status : 500 } })
  );
});

process.send?.({ type: "ready" });
process.once("disconnect", () => process.exit(0));
