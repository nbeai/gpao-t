import crypto from "node:crypto";

export class LocalSessionAuthority {
  constructor({ secret, ttlMs = 24 * 60 * 60 * 1000, idleMs = 2 * 60 * 60 * 1000 } = {}) {
    this.secret = secret;
    this.ttlMs = ttlMs;
    this.idleMs = idleMs;
    this.sessions = new Map();
  }

  sign(id) { return crypto.createHmac("sha256", this.secret).update(id).digest("base64url"); }

  issue({ principalId = "owner:local", deviceLabel = "local-dashboard" } = {}) {
    const id = crypto.randomUUID();
    const now = Date.now();
    this.sessions.set(id, { id, principalId, deviceLabel, createdAt: now, lastActivityAt: now, expiresAt: now + this.ttlMs, revokedAt: null });
    return `${id}.${this.sign(id)}`;
  }

  verify(token) {
    const [id, signature] = String(token || "").split(".");
    const expected = id ? this.sign(id) : "";
    if (!id || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const session = this.sessions.get(id);
    const now = Date.now();
    if (!session || session.revokedAt || session.expiresAt <= now || session.lastActivityAt + this.idleMs <= now) return null;
    session.lastActivityAt = now;
    return { id: session.id, principalId: session.principalId, expiresAt: session.expiresAt };
  }

  revoke(token) { const id = String(token || "").split(".")[0]; const session = this.sessions.get(id); if (!session) return false; session.revokedAt = Date.now(); return true; }
  snapshot() { return { schema: "gpao_t3.local_session_status.v1", active: [...this.sessions.values()].filter(session => !session.revokedAt && session.expiresAt > Date.now()).map(({ id, principalId, deviceLabel, createdAt, lastActivityAt, expiresAt }) => ({ id, principalId, deviceLabel, createdAt, lastActivityAt, expiresAt })) }; }
}
