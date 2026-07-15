import assert from "node:assert/strict";
import test from "node:test";
import { EphemeralCredentialStore, MacKeychainCredentialStore, UnsupportedSecureCredentialBackend } from "../src/core/credential-store.js";

function generatedInput() { return "x".repeat(8); }

function fakeKeychainRunner({ failures = new Map() } = {}) {
  const entries = new Map();
  const calls = [];
  const runner = async request => {
    calls.push(request);
    const command = request.args[0];
    const account = request.args[request.args.indexOf("-a") + 1];
    const service = request.args[request.args.indexOf("-s") + 1];
    const key = `${service}:${account}`;
    if (failures.has(command)) return { ok: false, stderr: failures.get(command) };
    if (command === "add-generic-password") {
      entries.set(key, request.input);
      return { ok: true };
    }
    if (command === "find-generic-password") {
      if (!entries.has(key)) return { ok: false };
      return request.captureStdout ? { ok: true, stdout: entries.get(key) } : { ok: true };
    }
    if (command === "delete-generic-password") return { ok: entries.delete(key) };
    throw new Error(`Unexpected security command: ${command}`);
  };
  return { runner, calls, entries };
}

test("macOS Keychain stores credentials through stdin and returns only an opaque handle", async () => {
  const fake = fakeKeychainRunner();
  const store = new MacKeychainCredentialStore({ runner: fake.runner });
  const input = generatedInput();
  const saved = await store.save({ providerId: "model-a", secret: input });

  assert.deepEqual(saved, { handle: "keychain:model-a", providerId: "model-a", storage: "macos-keychain" });
  assert.doesNotMatch(JSON.stringify(saved), new RegExp(input));
  assert.equal(fake.calls[0].args.at(-1), "-w");
  assert.equal(fake.calls[0].input, input);
  assert.equal(fake.calls[0].args.includes(input), false);
  assert.equal(await store.has(saved.handle, "model-a"), true);
});

test("macOS Keychain exposes a secret only inside a callback and blocks return or error leaks", async () => {
  const fake = fakeKeychainRunner();
  const store = new MacKeychainCredentialStore({ runner: fake.runner });
  const input = generatedInput();
  const { handle } = await store.save({ providerId: "model-a", secret: input });

  const value = await store.withCredential(handle, "model-a", secret => {
    assert.equal(secret, input);
    return { result: { text: "connected" } };
  });
  assert.deepEqual(value, { result: { text: "connected" } });

  await assert.rejects(
    () => store.withCredential(handle, "model-a", secret => ({ result: { secret } })),
    error => error.code === "credential_leak_prevented" && !String(error.message).includes(input)
  );
  await assert.rejects(
    () => store.withCredential(handle, "model-a", secret => { throw new Error(`upstream ${secret}`); }),
    error => error.code === "credential_callback_failed" && !String(error.message).includes(input)
  );
});

test("macOS Keychain failure details do not escape to runtime errors", async () => {
  const input = generatedInput();
  const fake = fakeKeychainRunner({ failures: new Map([["add-generic-password", `bad credential ${input}`]]) });
  const store = new MacKeychainCredentialStore({ runner: fake.runner });

  await assert.rejects(
    () => store.save({ providerId: "model-a", secret: input }),
    error => error.code === "credential_store_unavailable" && !String(error.message).includes(input)
  );
});

test("macOS Keychain rejects newline-bearing secrets before process invocation", async () => {
  const fake = fakeKeychainRunner();
  const store = new MacKeychainCredentialStore({ runner: fake.runner });

  await assert.rejects(
    () => store.save({ providerId: "model-a", secret: "x".repeat(8) + "\nunsafe" }),
    error => error.code === "invalid_credential"
  );
  assert.equal(fake.calls.length, 0);
});

test("macOS Keychain remove is scoped to its opaque provider handle", async () => {
  const fake = fakeKeychainRunner();
  const store = new MacKeychainCredentialStore({ runner: fake.runner });
  const { handle } = await store.save({ providerId: "model-a", secret: generatedInput() });

  assert.equal(await store.remove("keychain:other", "model-a"), false);
  assert.equal(await store.remove(handle, "model-a"), true);
  assert.equal(await store.has(handle, "model-a"), false);
});

test("macOS Keychain rejects missing or mismatched opaque handles", async () => {
  const fake = fakeKeychainRunner();
  const store = new MacKeychainCredentialStore({ runner: fake.runner });
  await store.save({ providerId: "model-a", secret: generatedInput() });

  assert.equal(await store.has(null, "model-a"), false);
  await assert.rejects(
    () => store.withCredential(null, "model-a", () => ({ result: "unsafe" })),
    error => error.code === "credential_not_found"
  );
  await assert.rejects(
    () => store.withCredential("keychain:model-b", "model-a", () => ({ result: "unsafe" })),
    error => error.code === "credential_not_found"
  );
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
