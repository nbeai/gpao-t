import crypto from "node:crypto";

function canonical(permit) {
  return JSON.stringify({
    commandId: permit.commandId,
    principalId: permit.principalId,
    requestDigest: permit.requestDigest,
    generation: permit.generation,
    expiresAt: permit.expiresAt
  });
}

export function createPermit(secret, input, ttlMs = 30_000) {
  const permit = { ...input, expiresAt: Date.now() + ttlMs };
  permit.signature = crypto.createHmac("sha256", secret).update(canonical(permit)).digest("hex");
  return permit;
}

export function verifyPermit(secret, permit) {
  if (!permit || !permit.signature || permit.expiresAt < Date.now()) return false;
  const expected = crypto.createHmac("sha256", secret).update(canonical(permit)).digest("hex");
  const actual = Buffer.from(permit.signature, "hex");
  const wanted = Buffer.from(expected, "hex");
  return actual.length === wanted.length && crypto.timingSafeEqual(actual, wanted);
}
