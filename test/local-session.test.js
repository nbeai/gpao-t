import assert from "node:assert/strict";
import test from "node:test";
import { LocalSessionAuthority } from "../src/core/local-session.js";

test("local dashboard sessions are signed, expiring, and revocable without exposing owner credentials", () => {
  const authority = new LocalSessionAuthority({ secret: "owner-secret", ttlMs: 500, idleMs: 500 });
  const token = authority.issue({ principalId: "owner:browser" });
  assert.equal(token.includes("owner-secret"), false);
  assert.equal(authority.verify(token).principalId, "owner:browser");
  assert.equal(authority.verify(`${token}tampered`), null);
  assert.equal(authority.revoke(token), true);
  assert.equal(authority.verify(token), null);
});
