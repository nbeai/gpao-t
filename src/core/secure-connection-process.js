import { SecureConnectionAgent } from "./secure-connection-agent.js";
import { MacOSProviderConnectionBackend } from "./macos-provider-connection-backend.js";

const agent = new SecureConnectionAgent({ backend: new MacOSProviderConnectionBackend() });
const controllers = new Map();

function safeError(error) {
  const allowed = new Set([
    "auth_required", "rate_limited", "provider_timeout", "provider_unavailable", "content_blocked",
    "invalid_request", "failed", "external_outcome_unknown", "credential_acquisition_cancelled",
    "credential_acquisition_unavailable", "credential_store_unavailable", "credential_not_found",
    "secure_connection_method_unavailable", "invalid_model_selection", "invalid_provider_input",
    "credential_provider_mismatch", "secure_connection_agent_invalid_request"
  ]);
  const code = allowed.has(error?.code) ? error.code : "secure_connection_process_failed";
  return { code, status: Number.isInteger(error?.status) ? error.status : 500 };
}

async function execute(message) {
  if (message.operation === "begin") return agent.begin(message.request);
  if (message.operation === "status") return agent.status(message.request);
  if (message.operation === "revoke") return agent.revoke(message.request);
  if (message.operation === "invoke") {
    const controller = new AbortController();
    controllers.set(message.id, controller);
    try { return await agent.invoke(message.request, { signal: controller.signal }); }
    finally { controllers.delete(message.id); }
  }
  throw new Error("unsupported operation");
}

process.on("message", message => {
  if (message?.type === "cancel") {
    controllers.get(message.id)?.abort(new Error("cancelled"));
    return;
  }
  if (!message?.id || !message?.operation) return;
  void execute(message).then(
    result => process.send?.({ id: message.id, ok: true, result }),
    error => process.send?.({ id: message.id, ok: false, error: safeError(error) })
  );
});

process.send?.({ type: "ready" });
process.once("disconnect", () => process.exit(0));
