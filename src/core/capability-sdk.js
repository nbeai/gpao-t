import { RuntimeError } from "./errors.js";
import { validateCapabilityManifest } from "./capability-manifest.js";

function define(kind, definition) {
  const manifest = validateCapabilityManifest({ ...definition.manifest, kind });
  if (typeof definition.invoke !== "function") throw new RuntimeError("invalid_capability_adapter", "Capability adapter must provide invoke", 400);
  return Object.freeze({ manifest, invoke: definition.invoke });
}

export const defineToolCapability = definition => define("tool", definition);
export const defineModelCapability = definition => define("model", definition);
export const defineChannelCapability = definition => define("channel", definition);
