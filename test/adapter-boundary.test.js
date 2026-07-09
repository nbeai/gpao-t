import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  handleGatewayRequest,
  buildModelRouterBoundary,
  buildModelRouterPolicy,
  buildModelProviderRegistry,
  invokeModelLocally,
  listModelAdapters,
  listToolAdapters,
  runTurn,
  selectModelAdapter,
  verifyModelInvocation,
  verifyModelRouterBoundary,
  verifyModelRouterPolicy,
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

  it("builds read-only router replay policy with route profiles and task-packet gates", () => {
    const policy = buildModelRouterPolicy({
      request: "짧은 후속 질문이면 빠르게 회수하고, 위험하면 실행하지 마.",
      inputSignal: { kind: "follow_up" },
    });
    const verification = verifyModelRouterPolicy({ policy });

    assert.equal(policy.schema, "gpao_t.model_router_policy.v0_1");
    assert.equal(policy.surface, "read_only_replay_policy_contract");
    assert.ok(policy.routeProfiles.some((profile) =>
      profile.id === "fast_context_recovery"
      && profile.requestTypes.includes("active_target_recovery")
      && profile.speed === "high"
      && profile.risk === "wrong_anchor_or_stale_context"
    ));
    assert.ok(policy.routeProfiles.some((profile) => profile.id === "deep_design_review"));
    assert.ok(policy.decisionMatrix.speed.includes("fast path"));
    assert.ok(policy.decisionMatrix.quality.includes("context"));
    assert.ok(policy.decisionMatrix.cost.includes("local"));
    assert.ok(policy.decisionMatrix.risk.includes("tool execution"));
    assert.equal(policy.contextMeshTaskPacket.candidateOnly, true);
    assert.equal(policy.contextMeshTaskPacket.rawMemoryDumpAllowed, false);
    assert.equal(policy.contextMeshTaskPacket.becomesModelInputWhen.length, 4);
    assert.ok(policy.fallbackAndFailure.failureStates.some((state) => state.id === "tool_execution_requested"));
    assert.equal(policy.modelOutputBoundary.outputIsActionAuthority, false);
    assert.equal(policy.modelOutputBoundary.toolCliMcpExecution, "blocked_until_preview_approval_replay_and_audit");
    assert.equal(policy.replayAudit.invokesReplayNow, false);
    assert.equal(policy.replayAudit.writesAuditNow, false);
    assert.equal(policy.safetyInvariants.callsProvider, false);
    assert.equal(policy.safetyInvariants.executesToolFromOutput, false);
    assert.equal(policy.safetyInvariants.promotesDurableMemory, false);
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
    const routerPolicy = handleGatewayRequest({ method: "GET", path: "/adapters/model-router-policy" });
    const routerPolicyCheck = handleGatewayRequest({ method: "GET", path: "/adapters/model-router-policy/verify" });
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
    assert.equal(routerPolicy.status, 200);
    assert.equal(routerPolicy.body.modelOutputBoundary.outputIsActionAuthority, false);
    assert.equal(routerPolicyCheck.status, 200);
    assert.equal(routerPolicyCheck.body.status, "ready");
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

  it("exposes the model router policy through CLI without opening replay or tools", () => {
    const cliOutput = execFileSync(process.execPath, [
      CLI,
      "adapters",
      "model-router-policy",
      "후속 질문의 route policy를 보여줘",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const cliCheckOutput = execFileSync(process.execPath, [
      CLI,
      "adapters",
      "model-router-policy-check",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const policy = JSON.parse(cliOutput);
    const check = JSON.parse(cliCheckOutput);

    assert.equal(policy.schema, "gpao_t.model_router_policy.v0_1");
    assert.equal(policy.replayAudit.invokesReplayNow, false);
    assert.equal(policy.replayAudit.storesModelOutputNow, false);
    assert.equal(policy.modelOutputBoundary.outputIsActionAuthority, false);
    assert.equal(policy.safetyInvariants.executesToolFromOutput, false);
    assert.equal(check.status, "ready");
  });

  it("supports OAuth/session and API key lanes while proving local invocation without provider calls", () => {
    const registry = buildModelProviderRegistry({ env: {} });
    const localResult = invokeModelLocally({
      request: "지금 맡긴 일을 정리하고 다음 초안을 보여줘.",
    });
    const verification = verifyModelInvocation({ registry, localResult });

    assert.equal(registry.schema, "gpao_t.model_provider_registry.v1");
    assert.ok(registry.providers.some((provider) => provider.id === "openclaw.oauth" && provider.lane === "oauth_session"));
    assert.ok(registry.providers.some((provider) => provider.id === "openai.api_key" && provider.lane === "api_key"));
    assert.ok(registry.providers.some((provider) => provider.id === "local.deterministic" && provider.defaultExecutableNow));
    assert.equal(registry.invariants.chatgptPlanIsNotApiCredit, true);
    assert.equal(localResult.status, "completed_local_invocation");
    assert.equal(localResult.packet.provider.id, "local.deterministic");
    assert.equal(localResult.packet.safetyInvariants.sendsNetworkRequest, false);
    assert.equal(localResult.packet.safetyInvariants.spendsTokens, false);
    assert.equal(localResult.output.modelOutputBoundary, "draft_only_not_action_authority");
    assert.equal(verification.status, "ready");
    assert.deepEqual(verification.findings, []);
  });

  it("exposes model invocation lanes through CLI and Gateway", () => {
    const providersOutput = execFileSync(process.execPath, [CLI, "adapters", "model-providers"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const localOutput = execFileSync(process.execPath, [
      CLI,
      "adapters",
      "model-invocation-local",
      "로컬 초안으로 정리해줘",
    ], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const checkOutput = execFileSync(process.execPath, [CLI, "adapters", "model-invocation-check"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const providers = JSON.parse(providersOutput);
    const local = JSON.parse(localOutput);
    const check = JSON.parse(checkOutput);
    const gatewayProviders = handleGatewayRequest({ method: "GET", path: "/adapters/model-providers" });
    const gatewayLocal = handleGatewayRequest({ method: "GET", path: "/adapters/model-invocation/local" });
    const gatewayCheck = handleGatewayRequest({ method: "GET", path: "/adapters/model-invocation/verify" });

    assert.equal(providers.schema, "gpao_t.model_provider_registry.v1");
    assert.equal(local.status, "completed_local_invocation");
    assert.equal(check.status, "ready");
    assert.equal(gatewayProviders.status, 200);
    assert.equal(gatewayProviders.body.providers.some((provider) => provider.lane === "oauth_session"), true);
    assert.equal(gatewayProviders.body.providers.some((provider) => provider.lane === "api_key"), true);
    assert.equal(gatewayLocal.status, 200);
    assert.equal(gatewayLocal.body.output.modelOutputBoundary, "draft_only_not_action_authority");
    assert.equal(gatewayCheck.status, 200);
    assert.equal(gatewayCheck.body.status, "ready");
  });
});
