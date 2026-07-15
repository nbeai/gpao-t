import assert from "node:assert/strict";
import test from "node:test";
import { ConnectionCellRegistry } from "../src/core/connection-cell.js";
import { createFoundationConnectorCatalog } from "../src/core/connector-catalog.js";
import { ConnectorController } from "../src/core/connector-controller.js";
import { createFoundationToolRegistry } from "../src/core/tool-registry.js";
import { RuntimeError } from "../src/core/errors.js";

function registry() {
  const connectorController = new ConnectorController({ catalog: createFoundationConnectorCatalog(), clock: () => "2026-07-15T12:00:00.000Z" });
  const toolRegistry = createFoundationToolRegistry({ permitSecret: "cell-test-secret" });
  return { connectorController, toolRegistry, cells: new ConnectionCellRegistry({ connectorController, toolRegistry }) };
}

test("connection cells present tool connector MCP and channel surfaces with one compatible contract", () => {
  const { cells } = registry();
  const snapshot = cells.snapshot();
  assert.equal(snapshot.schema, "gpao_t3.connection_cell_registry.v1");
  assert.ok(snapshot.cells.some(cell => cell.kind === "tool" && cell.id === "tool.local.runtime_status"));
  assert.ok(snapshot.cells.some(cell => cell.kind === "connector" && cell.id === "web.search"));
  assert.ok(snapshot.cells.some(cell => cell.kind === "mcp" && cell.id === "mcp.external"));
  assert.ok(snapshot.cells.some(cell => cell.kind === "channel" && cell.id === "channel.telegram"));
  assert.ok(snapshot.cells.every(cell => cell.compatibility.adapterContract.includes("reconcile")));
  assert.doesNotMatch(JSON.stringify(snapshot), /token|secret|credential|endpoint|command|environment|header/i);
});

test("connection cell plans keep read automatic and external actions approval gated", () => {
  const { connectorController, cells } = registry();
  const readPlan = cells.plan({ cellId: "tool.local.runtime_status", args: { query: "health" } });
  assert.equal(readPlan.status, "admitted");
  assert.equal(readPlan.automatic, true);
  assert.equal(readPlan.approvalRequired, false);

  assert.equal(cells.plan({ cellId: "web.search", args: { query: "news" } }).blockedReason, "disabled");
  connectorController.setSetupState("web.search", "reviewed");
  connectorController.enable("web.search");
  connectorController.recordHealth("web.search", { state: "ready", checkedAt: "2026-07-15T12:00:00.000Z" });
  const webPlan = cells.plan({ cellId: "web.search", args: { query: "news" } });
  assert.equal(webPlan.status, "admitted");
  assert.equal(webPlan.automatic, true);

  connectorController.setSetupState("channel.telegram", "reviewed");
  connectorController.enable("channel.telegram");
  connectorController.recordHealth("channel.telegram", { state: "ready", checkedAt: "2026-07-15T12:00:00.000Z" });
  const blockedSend = cells.plan({ cellId: "channel.telegram", args: { effect: "external_send", message: "hello" } });
  assert.equal(blockedSend.status, "blocked");
  assert.equal(blockedSend.blockedReason, "approval_required");
  assert.equal(blockedSend.nextSafeAction, "request_explicit_approval");
  const admittedSend = cells.plan({ cellId: "channel.telegram", idempotencyKey: "send-1", args: { effect: "external_send", message: "hello" } });
  assert.equal(admittedSend.status, "admitted");
  assert.equal(admittedSend.approvalRequired, true);
});

test("connection cell planning rejects secret-shaped arguments and unknown cells", () => {
  const { cells } = registry();
  assert.throws(() => cells.plan({ cellId: "missing.cell" }), error => error instanceof RuntimeError && error.code === "connection_cell_not_found");
  assert.throws(
    () => cells.plan({ cellId: "tool.local.runtime_status", args: { apiKey: "sk-never-enter-cell" } }),
    error => error.code === "connection_cell_secret_forbidden"
  );
});
