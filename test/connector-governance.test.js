import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  buildConnectorGovernanceSummary,
  handleGatewayRequest,
  listConnectors,
  reviewConnectorPermission,
} from "../src/index.js";

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

describe("GPAO-T connector governance", () => {
  it("lists connectors without configuring OAuth, tokens, or external execution", () => {
    const registry = listConnectors();
    const summary = buildConnectorGovernanceSummary();

    assert.equal(registry.schema, "gpao_t.connector_registry.v0_1");
    assert.equal(registry.governanceRule, "connected_does_not_mean_executable");
    assert.equal(registry.connectorDoctrine, "connected_readable_writable_sendable_automatable_are_separate_permissions");
    assert.ok(registry.connectors.some((connector) => connector.id === "local.filesystem"));
    assert.ok(registry.connectors.some((connector) => connector.id === "github.oauth"));
    assert.equal(summary.authorityBoundary.tokenStorage, "not_configured");
    assert.ok(summary.blockedConnectors.includes("github.oauth"));
  });

  it("allows only local read preview and keeps execution boundaries blocked", () => {
    const review = reviewConnectorPermission({
      connectorId: "local.filesystem",
      action: "read",
      task: "inspect local project evidence",
    });

    assert.equal(review.schema, "gpao_t.connector_permission_review.v0_1");
    assert.equal(review.status, "preview");
    assert.equal(review.connectorDoctrine, "readable_does_not_mean_writable_or_executable");
    assert.equal(review.access.readable, true);
    assert.equal(review.access.writable, false);
    assert.equal(review.access.executable, false);
    assert.equal(review.audit.tokenStorage, "not_configured");
    assert.ok(review.blockedActions.includes("secret_write"));
  });

  it("blocks OAuth reads until setup and task approval exist", () => {
    const review = reviewConnectorPermission({
      connectorId: "github.oauth",
      action: "read",
    });

    assert.equal(review.status, "blocked");
    assert.equal(review.access.connected, false);
    assert.equal(review.access.readable, false);
    assert.ok(review.requiredApprovals.includes("connector_read_approval"));
    assert.ok(review.blockedActions.includes("connector_activation"));
  });

  it("blocks external send actions regardless of connector selection", () => {
    const review = reviewConnectorPermission({
      connectorId: "slack.oauth",
      action: "send",
    });

    assert.equal(review.status, "blocked");
    assert.equal(review.access.executable, false);
    assert.ok(review.requiredApprovals.includes("external_send"));
    assert.ok(review.blockedActions.includes("external_send"));
  });

  it("exposes connector governance through CLI and gateway", () => {
    const cliOutput = execFileSync(process.execPath, [CLI, "connectors", "review", "github.oauth", "read"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliReview = JSON.parse(cliOutput);
    const registry = handleGatewayRequest({ method: "GET", path: "/connectors" });
    const summary = handleGatewayRequest({ method: "GET", path: "/connectors/governance" });
    const review = handleGatewayRequest({
      method: "POST",
      path: "/connectors/review",
      body: { connectorId: "slack.oauth", action: "send" },
    });

    assert.equal(cliReview.status, "blocked");
    assert.equal(registry.status, 200);
    assert.equal(summary.status, 200);
    assert.equal(review.status, 200);
    assert.equal(review.body.status, "blocked");
  });
});
