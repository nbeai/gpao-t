import crypto from "node:crypto";

function normalizeString(value) {
  return value.normalize("NFC").replace(/\r\n?/g, "\n");
}

function normalizeValue(value) {
  if (typeof value === "string") return normalizeString(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("canonical_json_non_finite_number");
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    const normalized = {};
    for (const key of Object.keys(value).sort()) {
      const child = value[key];
      if (child === undefined || typeof child === "function" || typeof child === "symbol") {
        throw new TypeError("canonical_json_unsupported_value");
      }
      normalized[key] = normalizeValue(child);
    }
    return normalized;
  }
  throw new TypeError("canonical_json_unsupported_value");
}

export function canonicalJson(value) {
  return JSON.stringify(normalizeValue(value));
}

export function canonicalDigest(domain, value) {
  if (typeof domain !== "string" || !domain) throw new TypeError("canonical_digest_domain_required");
  return `sha256:${crypto.createHash("sha256").update(domain).update("\0").update(canonicalJson(value)).digest("hex")}`;
}
