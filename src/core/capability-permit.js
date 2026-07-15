import crypto from "node:crypto";

const digest = value => crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
const canonical = permit => JSON.stringify({ id: permit.id, capabilityId: permit.capabilityId, operation: permit.operation, principalId: permit.principalId, inputDigest: permit.inputDigest, expiresAt: permit.expiresAt });

export function createCapabilityPermit(secret, { capabilityId, operation, principalId, input, ttlMs = 30_000 }) {
  const permit = { schema: "gpao_t3.capability_permit.v1", id: crypto.randomUUID(), capabilityId, operation, principalId, inputDigest: digest(input), expiresAt: Date.now() + ttlMs };
  permit.signature = crypto.createHmac("sha256", secret).update(canonical(permit)).digest("hex");
  return permit;
}

export function verifyCapabilityPermit(secret, permit, input) {
  if (!permit?.signature || permit.expiresAt < Date.now() || permit.inputDigest !== digest(input)) return false;
  const expected = crypto.createHmac("sha256", secret).update(canonical(permit)).digest("hex");
  const actual = Buffer.from(permit.signature, "hex");
  const wanted = Buffer.from(expected, "hex");
  return actual.length === wanted.length && crypto.timingSafeEqual(actual, wanted);
}
