import assert from "node:assert/strict";
import test from "node:test";
import { ConnectorCatalog, createFoundationConnectorCatalog } from "../src/core/connector-catalog.js";
import { ConnectorController } from "../src/core/connector-controller.js";
import { RuntimeError } from "../src/core/errors.js";

const fixedClock = () => "2026-07-15T12:00:00.000Z";

test("controller lists safe connector metadata and records authority-bound receipts", () => {
  const controller = new ConnectorController({ catalog: createFoundationConnectorCatalog(), clock: fixedClock });
  const connectors = controller.list();
  assert.equal(connectors.length, 4);
  assert.equal(connectors.find(item => item.id === "web.search").enabled, false);

  const receipt = controller.recordHealth("local.workspace-read", { state: "ready", checkedAt: fixedClock() });
  assert.equal(receipt.action, "health_recorded");
  assert.equal(receipt.authority, "read");
  assert.equal(receipt.executionAuthorityGranted, false);
  assert.equal(receipt.connector.health.state, "ready");
  assert.doesNotMatch(JSON.stringify(receipt), /secret-value|api-key|token-value/i);
});

test("enabling a connector never grants execution authority", () => {
  const catalog = new ConnectorCatalog({ connectors: [{
    id: "local.writer",
    name: "Local writer",
    description: "Writes only after a separate permit.",
    version: "1.0.0",
    transport: "builtin",
    capabilities: ["write_local"],
    authority: "local_write",
    enabled: false,
    health: { state: "ready", checkedAt: null },
    setup: { authentication: "none", userActionRequired: false }
  }] });
  const controller = new ConnectorController({ catalog, clock: fixedClock });
  const receipt = controller.enable("local.writer");
  assert.equal(receipt.connector.enabled, true);
  assert.equal(receipt.status, "ready_for_permit_review");
  assert.equal(receipt.executionAuthorityGranted, false);
  assert.equal(receipt.authority, "local_write");
});

test("external and MCP connectors require reviewed setup before enabling", () => {
  const controller = new ConnectorController({ catalog: createFoundationConnectorCatalog(), clock: fixedClock });
  assert.throws(
    () => controller.enable("web.search"),
    error => error instanceof RuntimeError && error.code === "connector_setup_review_required" && error.details.required === "reviewed"
  );
  controller.setSetupState("web.search", "reviewed");
  const webReceipt = controller.enable("web.search");
  assert.equal(webReceipt.connector.enabled, true);
  assert.equal(webReceipt.executionAuthorityGranted, false);

  assert.throws(() => controller.enable("mcp.external"), error => error.code === "connector_setup_review_required");
  controller.setSetupState("mcp.external", "connected");
  const mcpReceipt = controller.enable("mcp.external");
  assert.equal(mcpReceipt.authority, "external_mutation");
  assert.equal(mcpReceipt.executionAuthorityGranted, false);
});

test("disabling preserves the catalog's secret-free contract and redacts receipt data", () => {
  const controller = new ConnectorController({ catalog: createFoundationConnectorCatalog(), clock: fixedClock });
  const receipt = controller.disable("local.runtime-status");
  assert.equal(receipt.connector.enabled, false);
  assert.equal(receipt.executionAuthorityGranted, false);
  assert.doesNotMatch(JSON.stringify(receipt), /token|secret|credential|password|endpoint|command|environment|header/i);
});
