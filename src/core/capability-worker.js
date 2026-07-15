import { verifyCapabilityPermit } from "./capability-permit.js";
import { validateCapabilityManifest, validateCapabilityValue } from "./capability-manifest.js";
import { assertCapabilityPayloadHasNoSecrets } from "./secret-hygiene.js";

const secret = process.env.GPAO_T3_CAPABILITY_PERMIT_SECRET || "";
const modulePath = process.env.GPAO_T3_CAPABILITY_MODULE || "";
const adapter = await import(modulePath);
const manifest = validateCapabilityManifest(adapter.manifest);
const active = new Map();
process.send?.({ type: "ready", capabilityId: manifest.id });

process.on("message", async message => {
  if (message?.type === "cancel") { active.get(message.requestId)?.abort(); return; }
  if (message?.type !== "invoke") return;
  const reject = code => process.send?.({ type: "result", requestId: message.requestId, ok: false, error: { code, message: "Capability worker rejected the request" } });
  if (message.permit?.capabilityId !== manifest.id || message.permit?.operation !== "invoke" || !verifyCapabilityPermit(secret, message.permit, message.input)) return reject("invalid_capability_permit");
  const controller = new AbortController();
  active.set(message.requestId, controller);
  try {
    assertCapabilityPayloadHasNoSecrets(message.input);
    validateCapabilityValue(message.input, manifest.inputSchema, "input");
    const output = await adapter.invoke(message.input, { signal: controller.signal, capabilityId: manifest.id });
    assertCapabilityPayloadHasNoSecrets(output);
    validateCapabilityValue(output, manifest.outputSchema, "output");
    process.send?.({ type: "result", requestId: message.requestId, ok: true, output });
  } catch {
    reject("capability_execution_failed");
  } finally { active.delete(message.requestId); }
});
