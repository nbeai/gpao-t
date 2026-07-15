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
  const configuring = center.configure({ providerId: "model-a", secret: "private-test-value" });
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
