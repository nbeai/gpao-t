import assert from "node:assert/strict";
import test from "node:test";
import { EphemeralCredentialStore } from "../src/core/credential-store.js";
import { ProviderConnectionCenter } from "../src/core/provider-connection.js";
import { createRepairPlan } from "../src/core/repair-plan.js";

test("connection center exposes safe user states without leaking credentials", async () => {
  let verifiedSecret = null;
  const store = new EphemeralCredentialStore();
  const center = new ProviderConnectionCenter({ credentialStore: store, verify: async ({ secret }) => { verifiedSecret = secret; return { state: "ready" }; } });
  assert.equal(center.status("model-a").presentation.title, "사용할 AI 모델을 연결해 주세요");
  const configuring = await center.configure({ providerId: "model-a", secret: "private-test-value" });
  assert.equal(configuring.state, "verifying");
  const ready = await center.verifyConnection("model-a");
  assert.equal(ready.state, "ready");
  assert.equal(verifiedSecret, "private-test-value");
  assert.equal(JSON.stringify(ready).includes("private-test-value"), false);
});

test("repair plan turns internal codes into one safe next action", () => {
  const repair = createRepairPlan({ code: "auth_required", message: "raw implementation message" });
  assert.equal(repair.title, "연결 권한이 필요합니다");
  assert.equal(repair.action, "reconnect_provider");
  assert.equal(JSON.stringify(repair).includes("raw implementation message"), false);
});

test("connection verification is single-flight, time-bounded, and cannot revive a disconnected connection", async () => {
  const store = new EphemeralCredentialStore();
  let calls = 0;
  const center = new ProviderConnectionCenter({
    credentialStore: store,
    verifyTimeoutMs: 30,
    verify: ({ signal }) => new Promise((_resolve, reject) => {
      calls += 1;
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    })
  });
  await center.configure({ providerId: "model-b", secret: "private-test-value" });
  const first = center.verifyConnection("model-b");
  const second = center.verifyConnection("model-b");
  const timedOut = await first;
  const shared = await second;
  assert.equal(calls, 1);
  assert.equal(timedOut.state, "provider_unavailable");
  assert.equal(shared.state, "provider_unavailable");

  await center.configure({ providerId: "model-b", secret: "private-test-value-2" });
  const pending = center.verifyConnection("model-b");
  await center.disconnect("model-b");
  const disconnected = await pending;
  assert.equal(disconnected.state, "not_configured");
  assert.equal(center.status("model-b").state, "not_configured");
});

test("reconfiguring releases a cancelled verification before a new verification begins", async () => {
  const store = new EphemeralCredentialStore();
  const deferred = [];
  const center = new ProviderConnectionCenter({
    credentialStore: store,
    verifyTimeoutMs: 1_000,
    verify: ({ signal }) => new Promise((resolve, reject) => {
      deferred.push({ resolve, reject });
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    })
  });
  await center.configure({ providerId: "model-c", secret: "private-test-value" });
  const oldVerification = center.verifyConnection("model-c");
  while (deferred.length !== 1) await new Promise(resolve => setTimeout(resolve, 1));
  await center.configure({ providerId: "model-c", secret: "private-test-value-2" });
  const replacement = center.verifyConnection("model-c");
  while (deferred.length !== 2) await new Promise(resolve => setTimeout(resolve, 1));
  deferred[1].resolve({ state: "ready" });
  const newer = await replacement;
  const older = await oldVerification;
  assert.equal(newer.state, "ready");
  assert.equal(older.state, "verifying");
  assert.equal(center.status("model-c").state, "ready");
});
