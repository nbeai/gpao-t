import assert from "node:assert/strict";
import test from "node:test";
import { EphemeralCredentialStore } from "../src/core/credential-store.js";
import { ProviderConnectionCenter } from "../src/core/provider-connection.js";
import { createRepairPlan } from "../src/core/repair-plan.js";

const now = () => 1_700_000_000_000;

function protectedConnection(overrides = {}) {
  return {
    providerId: "model-a",
    credentialRef: "ref-model-a",
    authMethod: "api_key",
    state: "connected",
    models: ["model-a-chat"],
    ...overrides
  };
}

test("connection center adopts only opaque protected-connection metadata", () => {
  const center = new ProviderConnectionCenter({ clock: now });
  const status = center.adopt(protectedConnection());

  assert.equal(status.state, "ready");
  assert.equal(status.presentation.title, "연결되어 있습니다");
  assert.deepEqual(center.exportMetadata(), [protectedConnection()]);
  assert.equal(JSON.stringify({ status, metadata: center.exportMetadata() }).includes("secret"), false);
});

test("connection center rejects raw-secret fields and legacy configure input", () => {
  const center = new ProviderConnectionCenter({ clock: now });

  assert.throws(
    () => center.adopt(protectedConnection({ secret: "test-only-value" })),
    error => error.code === "protected_connection_secret_forbidden" && error.details.field === "secret"
  );
  assert.throws(
    () => center.refresh(protectedConnection({ apiKey: "test-only-value" })),
    error => error.code === "protected_connection_secret_forbidden" && error.details.field === "apiKey"
  );
  assert.equal(typeof center.configure, "undefined");
  assert.equal(typeof center.verifyConnection, "undefined");
});

test("API-key and OAuth connections expose identical public status", () => {
  const apiKeyCenter = new ProviderConnectionCenter({ clock: now });
  const oauthCenter = new ProviderConnectionCenter({ clock: now });
  const apiKeyStatus = apiKeyCenter.adopt(protectedConnection());
  const oauthStatus = oauthCenter.refresh(protectedConnection({ authMethod: "oauth", credentialRef: "ref-oauth" }));

  assert.deepEqual(apiKeyStatus, oauthStatus);
  assert.equal("authMethod" in apiKeyStatus, false);
  assert.equal("credentialRef" in apiKeyStatus, false);
});

test("connection center cannot use the credential store as a raw-secret escape hatch", async () => {
  const center = new ProviderConnectionCenter({ credentialStore: new EphemeralCredentialStore() });
  await assert.rejects(() => center.credential("model-a"), error => error.code === "credential_boundary_enforced");
});

test("repair plan turns internal codes into one safe next action", () => {
  const repair = createRepairPlan({ code: "auth_required", message: "raw implementation message" });
  assert.equal(repair.title, "연결 권한이 필요합니다");
  assert.equal(repair.action, "reconnect_provider");
  assert.equal(JSON.stringify(repair).includes("raw implementation message"), false);
});
