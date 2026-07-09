import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  handleGatewayRequest,
  buildModelRouterBoundary,
  listModelAdapters,
  listToolAdapters,
  runTurn,
  selectModelAdapter,
  verifyModelRouterBoundary,
} from "../src/index.js";
import releaseFixture from "../fixtures/replay/release-file-active-target.json" with { type: "json" };

const CLI = fileURLToPath(new URL("../bin/gpao-t.js", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

describe("GPAO-T model and tool adapter boundary", () => {
  it("lists local preview adapters without enabling external providers", () => {
    const models = listModelAdapters();
    const tools = listToolAdapters();

    assert.equal(models.schema, "gpao_t.model_adapter_registry.v0_1");
    assert.equal(models.providerBoundary.liveExecution, false);
    assert.equal(models.providerBoundary.externalProviders, "blocked_until_provider_setup_and_task_approval");
    assert.ok(models.routingDimensions.includes("latency"));
    assert.ok(models.routingDimensions.includes("cost"));
    assert.ok(models.routingDimensions.includes("fallback"));
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
    assert.equal(selection.liveExecution, false);
    assert.equal(selection.selectedCostTier, "zero_or_local");
    assert.ok(selection.fallbackChain.some((adapter) => adapter.id === "local.fast.stub"));
  });

  it("builds a read-only model router boundary without opening provider calls", () => {
    const boundary = buildModelRouterBoundary({
      request: "GPAO-T 작업 preview를 어떤 모델 경로로 보낼지 판단해줘.",
    });
    const verification = verifyModelRouterBoundary({ boundary });

    assert.equal(boundary.schema, "gpao_t.model_router_boundary.v0_1");
    assert.equal(boundary.surface, "read_only_router_contract");
    assert.equal(boundary.route.liveExecution, false);
    assert.equal(boundary.providerBoundary.externalProviderCall, "blocked_until_provider_setup_task_approval_and_audit");
    assert.equal(boundary.providerBoundary.credentialAccess, "blocked");
    assert.equal(boundary.providerBoundary.networkAccess, "blocked");
    assert.equal(boundary.providerBoundary.paidUsage, "blocked");
    assert.equal(boundary.safetyInvariants.callsProvider, false);
    assert.equal(boundary.safetyInvariants.readsSecrets, false);
    assert.equal(boundary.safetyInvariants.spendsTokens, false);
    assert.equal(boundary.safetyInvariants.activatesTools, false);
    assert.ok(boundary.latencyCostFallback.fallbackChain.some((adapter) => adapter.provider === "local"));
    assert.equal(verification.status, "ready");
    assert.deepEqual(verification.findings, []);
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
    const routerBoundary = handleGatewayRequest({ method: "GET", path: "/adapters/model-router-boundary" });
    const routerBoundaryCheck = handleGatewayRequest({ method: "GET", path: "/adapters/model-router-boundary/verify" });
    const plan = handleGatewayRequest({
      method: "POST",
      path: "/adapters/plan",
      body: { input: { text: "그럼 배포파일은?" } },
    });

    assert.equal(cliPlan.schema, "gpao_t.adapter_plan.v0_1");
    assert.equal(cliPlan.adapterBoundary, "visible_selection_and_execution_boundary");
    assert.equal(models.status, 200);
    assert.equal(routerBoundary.status, 200);
    assert.equal(routerBoundary.body.safetyInvariants.callsProvider, false);
    assert.equal(routerBoundaryCheck.status, 200);
    assert.equal(routerBoundaryCheck.body.status, "ready");
    assert.equal(plan.status, 200);
    assert.equal(plan.body.model.selected.id, "local.fast.stub");
  });

  it("exposes the model router boundary through CLI without invoking models", () => {
    const cliOutput = execFileSync(process.execPath, [
      CLI,
      "adapters",
      "model-router-boundary",
      "GPAO-T 작업 표면 preview를 라우팅해줘",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliCheckOutput = execFileSync(process.execPath, [
      CLI,
      "adapters",
      "model-router-boundary-check",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const boundary = JSON.parse(cliOutput);
    const check = JSON.parse(cliCheckOutput);

    assert.equal(boundary.schema, "gpao_t.model_router_boundary.v0_1");
    assert.equal(boundary.safetyInvariants.callsProvider, false);
    assert.equal(boundary.safetyInvariants.sendsNetworkRequest, false);
    assert.equal(boundary.providerBoundary.credentialAccess, "blocked");
    assert.equal(check.status, "ready");
  });
});
