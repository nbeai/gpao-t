import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  handleGatewayRequest,
  listModelAdapters,
  listToolAdapters,
  runTurn,
  selectModelAdapter,
} from "../src/index.js";
import releaseFixture from "../fixtures/replay/release-file-active-target.json" with { type: "json" };

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

describe("GPAO-T model and tool adapter boundary", () => {
  it("lists local preview adapters without enabling external providers", () => {
    const models = listModelAdapters();
    const tools = listToolAdapters();

    assert.equal(models.schema, "gpao_t.model_adapter_registry.v0_1");
    assert.ok(models.adapters.some((adapter) => adapter.id === "local.fast.stub"));
    assert.ok(models.adapters.some((adapter) => adapter.status === "blocked_until_configured"));
    assert.equal(tools.schema, "gpao_t.tool_adapter_registry.v0_1");
    assert.ok(tools.adapters.some((adapter) => adapter.id === "external_send" && adapter.status === "blocked"));
  });

  it("keeps private routing on local adapters", () => {
    const selection = selectModelAdapter({
      preferredClass: "strong_reasoning",
      privacy: "local_or_private",
    });

    assert.equal(selection.status, "selected");
    assert.equal(selection.selected.provider, "local");
    assert.equal(selection.selected.executionMode, "local_preview");
  });

  it("adds adapter plan evidence to a turn without external activation", () => {
    const result = runTurn(releaseFixture);

    assert.equal(result.adapterPlan.schema, "gpao_t.adapter_plan.v0_1");
    assert.equal(result.adapterPlan.adapterBoundary, "visible_selection_and_execution_boundary");
    assert.equal(result.adapterPlan.executionBoundary.externalModelCall, "blocked_until_configured_and_approved");
    assert.equal(result.adapterPlan.executionBoundary.externalToolAction, "blocked_until_explicit_approval");
    assert.equal(result.modelRoute.adapterSelection.selected.id, "local.fast.stub");
    assert.deepEqual(result.toolPlan.adapterSelection.admitted.map((adapter) => adapter.id), [
      "local_replay",
      "local_draft",
    ]);
  });

  it("exposes adapter registries and request plans through CLI and gateway", () => {
    const cliOutput = execFileSync(process.execPath, [
      CLI,
      "adapters",
      "plan",
      "그럼 배포파일은?",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliPlan = JSON.parse(cliOutput);
    const models = handleGatewayRequest({ method: "GET", path: "/adapters/models" });
    const plan = handleGatewayRequest({
      method: "POST",
      path: "/adapters/plan",
      body: { input: { text: "그럼 배포파일은?" } },
    });

    assert.equal(cliPlan.schema, "gpao_t.adapter_plan.v0_1");
    assert.equal(cliPlan.adapterBoundary, "visible_selection_and_execution_boundary");
    assert.equal(models.status, 200);
    assert.equal(plan.status, 200);
    assert.equal(plan.body.model.selected.id, "local.fast.stub");
  });
});
