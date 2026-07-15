import { RuntimeError } from "./errors.js";

const SENSITIVE_KEY = /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret|credential)/i;
const SECRET_VALUE = /(?:^|\s)(?:sk-[A-Za-z0-9_-]{12,}|gpaon_[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{12,}|AKIA[0-9A-Z]{16})(?:$|\s)/;

function inspect(value, path = "payload") {
  if (typeof value === "string" && SECRET_VALUE.test(value)) return path;
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    const next = `${path}.${key}`;
    if (SENSITIVE_KEY.test(key) && child !== undefined && child !== null && child !== "") return next;
    const found = inspect(child, next);
    if (found) return found;
  }
  return null;
}

export function assertPayloadHasNoSecrets(payload) {
  const location = inspect(payload);
  if (location) {
    throw new RuntimeError("secret_in_turn_payload", "Sensitive credentials must be configured through the protected provider setup flow, not sent in a turn", 400, { field: location });
  }
}
