import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { EphemeralCredentialStore, MacKeychainCredentialStore, UnsupportedSecureCredentialBackend } from "../src/core/credential-store.js";

function generatedInput() { return "x".repeat(8); }

test("macOS Keychain API-key operations fail closed without invoking security", async () => {
  const store = new MacKeychainCredentialStore();
  const input = generatedInput();
  const handle = "keychain:model-a";

  await assert.rejects(() => store.save({ providerId: "model-a", secret: input }), error => {
    assert.equal(error.code, "credential_store_unsupported");
    assert.doesNotMatch(JSON.stringify(error), new RegExp(input));
    return true;
  });
  assert.equal(await store.has(handle, "model-a"), false);
  assert.equal(await store.remove(handle, "model-a"), false);
  const source = fs.readFileSync(new URL("../src/core/credential-store.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /execFile|\bsecurity\b|stdout/);
});

test("macOS Keychain credential callbacks fail closed before callback invocation", async () => {
  const store = new MacKeychainCredentialStore();
  let callbackCalled = false;

  await assert.rejects(() => store.withCredential("keychain:model-a", "model-a", () => {
    callbackCalled = true;
    return {};
  }), error => error.code === "credential_store_unsupported");
  assert.equal(callbackCalled, false);
});

test("the runtime default credential backend is platform-neutral and fail-closed", async () => {
  const store = new UnsupportedSecureCredentialBackend();
  await assert.rejects(
    () => store.save({ providerId: "model-a", secret: generatedInput() }),
    error => error.code === "credential_store_unsupported"
  );
  assert.equal(await store.has("any-handle", "model-a"), false);
});

test("connection center cannot use the credential store as a raw-secret escape hatch", async () => {
  const { ProviderConnectionCenter } = await import("../src/core/provider-connection.js");
  const store = new EphemeralCredentialStore();
  const center = new ProviderConnectionCenter({ credentialStore: store });
  await assert.rejects(() => center.credential("model-a"), error => error.code === "credential_boundary_enforced");
});

test("ephemeral credential callbacks reject nested raw credential return values", async () => {
  const store = new EphemeralCredentialStore();
  const input = generatedInput();
  const { handle } = store.save({ providerId: "model-a", secret: input });

  await assert.rejects(
    () => store.withCredential(handle, "model-a", secret => ({ result: { credential: secret } })),
    error => error.code === "credential_leak_prevented"
  );
});
