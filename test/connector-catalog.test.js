import assert from "node:assert/strict";
import test from "node:test";
import { ConnectorCatalog, createFoundationConnectorCatalog, validateConnectorManifest } from "../src/core/connector-catalog.js";
import { RuntimeError } from "../src/core/errors.js";

test("foundation catalog exposes safe defaults without credential or endpoint fields", () => {
  const catalog = createFoundationConnectorCatalog();
  const snapshot = catalog.snapshot();
  assert.equal(snapshot.schema, "gpao_t.connector_catalog.v1");
  assert.equal(snapshot.connectors.find(item => item.id === "local.runtime-status").enabled, true);
  assert.equal(snapshot.connectors.find(item => item.id === "web.search").enabled, false);
  assert.equal(snapshot.connectors.find(item => item.id === "mcp.external").setup.userActionRequired, true);
  assert.doesNotMatch(JSON.stringify(snapshot), /token|secret|credential|endpoint|command/i);
});

test("catalog validates the complete public connector contract", () => {
  const catalog = new ConnectorCatalog();
  const entry = catalog.register({
    id: "sample.read-only",
    name: "Sample",
    description: "A safe sample connector.",
    version: "1.2.3",
    transport: "http",
    capabilities: ["read_example", "read_example"],
    authority: "read",
    enabled: false,
    health: { state: "unknown", checkedAt: null },
    setup: { authentication: "oauth", userActionRequired: true }
  });
  assert.deepEqual(entry.capabilities, ["read_example"]);
  assert.equal(catalog.setEnabled("sample.read-only", true).enabled, true);
  assert.equal(catalog.setHealth("sample.read-only", { state: "ready", checkedAt: "2026-07-15T00:00:00.000Z" }).health.state, "ready");
});

test("catalog rejects incomplete, unsafe, and duplicate manifests", () => {
  assert.throws(() => validateConnectorManifest({ id: "bad id" }), error => error instanceof RuntimeError && error.code === "invalid_connector_manifest");
  const catalog = new ConnectorCatalog();
  const manifest = {
    id: "safe.connector",
    name: "Safe connector",
    description: "Read-only connector.",
    version: "1.0.0",
    transport: "builtin",
    capabilities: ["read"],
    authority: "read",
    enabled: true,
    health: { state: "ready", checkedAt: null }
  };
  catalog.register(manifest);
  assert.throws(() => catalog.register(manifest), error => error.code === "connector_already_registered");
  assert.throws(() => catalog.setEnabled("missing", true), error => error.code === "connector_not_found");
  assert.throws(() => catalog.setHealth("safe.connector", { state: "invalid" }), error => error.code === "invalid_connector_manifest");
  assert.throws(() => validateConnectorManifest({ ...manifest, apiToken: "never-accept" }), error => error.code === "unsafe_connector_manifest");
  assert.throws(() => validateConnectorManifest({ ...manifest, endpoint: "https://example.invalid" }), error => error.code === "unsafe_connector_manifest");
});
