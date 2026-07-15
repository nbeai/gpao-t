import assert from "node:assert/strict";
import test from "node:test";
import { CAPABILITY_GROUPS, negotiateCapabilityProtocol, validateCapabilityManifest } from "../src/core/capability-manifest.js";
import { CapabilityPlatform } from "../src/core/capability-platform.js";
import { createFoundationCapabilityManifests } from "../src/core/foundation-capabilities.js";
import { CapabilityWorkerClient } from "../src/core/capability-worker-client.js";
import { createCapabilityPermit, verifyCapabilityPermit } from "../src/core/capability-permit.js";
import { defineChannelCapability, defineModelCapability, defineToolCapability } from "../src/core/capability-sdk.js";

test("foundation catalog covers all eleven product capability groups with compact search", () => {
  const platform = new CapabilityPlatform({ manifests: createFoundationCapabilityManifests() });
  const result = platform.search({ limit: 20 });
  assert.equal(result.capabilities.length, 11);
  assert.deepEqual(result.capabilities.flatMap(item => item.groups).sort(), [...CAPABILITY_GROUPS].sort());
  assert.equal("inputSchema" in result.capabilities[0], false);
  assert.equal(platform.describe("foundation.runtime").inputSchema.type, "object");
});

test("manifest requires isolation, full lifecycle, provenance, and authority separation", () => {
  const source = createFoundationCapabilityManifests()[0];
  assert.equal(validateCapabilityManifest(source).isolation.permitRevalidation, true);
  assert.throws(() => validateCapabilityManifest({ ...source, isolation: { mode: "worker", permitRevalidation: false } }), /isolated worker/);
  assert.throws(() => validateCapabilityManifest({ ...source, authority: "external_send", sideEffect: "none" }), /Side-effect-free/);
  assert.throws(() => validateCapabilityManifest({ ...source, lifecycle: { ...source.lifecycle, rollback: false } }), /lifecycle/);
});

test("protocol negotiation admits N-2 minor compatibility and rejects incompatible adapters", () => {
  const source = createFoundationCapabilityManifests()[0];
  assert.equal(negotiateCapabilityProtocol(validateCapabilityManifest(source), { major: 1, minor: 2 }).selected.minor, 2);
  assert.throws(() => negotiateCapabilityProtocol(validateCapabilityManifest({ ...source, protocol: { major: 1, minor: 0, minCompatibleMinor: 0 } }), { major: 1, minor: 3 }), error => error.code === "capability_protocol_incompatible");
});

test("lifecycle transitions remain generic and preserve rollback state", () => {
  const platform = new CapabilityPlatform({ manifests: [createFoundationCapabilityManifests()[1]] });
  assert.equal(platform.transition("foundation.files", "preflight").status, "checked");
  assert.equal(platform.transition("foundation.files", "activate").status, "ready");
  assert.equal(platform.transition("foundation.files", "disable").status, "disabled");
  const updated = { ...createFoundationCapabilityManifests()[1], version: "1.1.0" };
  assert.equal(platform.update("foundation.files", updated).version, "1.1.0");
  assert.equal(platform.rollback("foundation.files").version, "1.0.0");
});

test("tool model and channel SDKs share one manifest contract", () => {
  const base = createFoundationCapabilityManifests()[0];
  for (const [factory, kind] of [[defineToolCapability, "tool"], [defineModelCapability, "model"], [defineChannelCapability, "channel"]]) assert.equal(factory({ manifest: base, invoke: async () => ({}) }).manifest.kind, kind);
});

test("capability permits bind principal operation input and expiry", () => {
  const input = { value: "bound" };
  const permit = createCapabilityPermit("secret", { capabilityId: "foundation.runtime", operation: "invoke", principalId: "owner:a", input });
  assert.equal(verifyCapabilityPermit("secret", permit, input), true);
  assert.equal(verifyCapabilityPermit("secret", permit, { value: "changed" }), false);
});

for (const fixture of ["reference-capability-adapter.js", "third-capability-adapter.js"]) {
  test(`isolated adapter conformance: ${fixture}`, async () => {
    const moduleUrl = new URL(`./fixtures/${fixture}`, import.meta.url);
    const adapter = await import(moduleUrl.href);
    const manifest = validateCapabilityManifest(adapter.manifest);
    const client = await new CapabilityWorkerClient({ manifest, modulePath: moduleUrl.href, secret: "wp4-test-secret" }).start();
    try {
      assert.deepEqual(await client.invoke({ principalId: "owner:test", input: { value: "ok" } }), { adapter: fixture.startsWith("reference") ? "reference" : "third", echo: "ok" });
    } finally { await client.stop(); }
  });
}

test("worker enforces input schema, secret boundary, and bounded timeout", async () => {
  const moduleUrl = new URL("./fixtures/third-capability-adapter.js", import.meta.url);
  const adapter = await import(moduleUrl.href);
  const manifest = validateCapabilityManifest({ ...adapter.manifest, timeoutMs: 25 });
  const client = await new CapabilityWorkerClient({ manifest, modulePath: moduleUrl.href, secret: "wp4-test-secret" }).start();
  try {
    await assert.rejects(() => client.invoke({ principalId: "owner:test", input: { wrong: true } }), error => error.code === "capability_execution_failed");
    assert.throws(() => client.invoke({ principalId: "owner:test", input: { value: "sk-abcdefghijklmnopqrstuvwxyz" } }), error => error.code === "secret_in_capability_payload");
    await assert.rejects(() => client.invoke({ principalId: "owner:test", input: { value: "wait" } }), error => error.code === "capability_outcome_unknown");
  } finally { await client.stop(); }
});
