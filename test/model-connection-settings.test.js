import test from "node:test";
import assert from "node:assert/strict";
import {
  buildModelConnectionSettingsState,
  handleGatewayRequest,
  renderModelConnectionSettingsHtml,
  saveOpenAiApiKeyConnection,
  verifyModelConnectionSettingsState,
} from "../src/index.js";
import {
  patchControlUiIndexHtmlPublicAssetRootPaths,
  patchControlUiIndexHtmlSkillSurfaceIsolation,
  patchControlUiPublicAssetRootPaths,
  patchIndexBundle,
  patchSkillsPageBasicSkillKoreanDescriptions,
} from "../tools/apply-live-model-connection-settings-route-patch.mjs";

test("model connection settings gives users a visible provider setup surface without exposing secrets", () => {
  const state = buildModelConnectionSettingsState({
    inventory: {
      status: "repair_required",
      findings: ["active_auth_store_missing"],
      userVisibleState: {
        status: "needs_setup",
        label: "모델 연결 설정 필요",
        message: "GPAO-T가 아직 사용할 수 있는 모델 연결 정보를 찾지 못했습니다.",
      },
    },
    repairPlan: { status: "no_repair_needed" },
    now: "2026-07-15T00:00:00.000Z",
  });
  const html = renderModelConnectionSettingsHtml(state);
  const verification = verifyModelConnectionSettingsState(state);

  assert.equal(state.schema, "gpao_t.model_connection_settings.v1");
  assert.equal(state.title, "모델 연결 설정");
  assert.equal(state.providerAuth.secretValuesExposed, false);
  assert.equal(state.dashboardRoutes.modelConnection, "/settings/model-connection");
  assert.equal(state.dashboardRoutes.apiKeyManagement, "/settings/model-connection");
  assert.equal(state.dashboardRoutes.runtimeConfig, "/settings/general");
  assert.equal(state.connectionModes.some((mode) => mode.id === "oauth_session" && mode.status === "available"), true);
  assert.equal(state.connectionModes.some((mode) => mode.id === "api_key" && mode.status === "available"), true);
  assert.equal(state.apiKeyProviders.some((provider) => provider.id === "openai"), true);
  assert.equal(state.apiKeyProviders.some((provider) => provider.id === "anthropic"), true);
  assert.equal(state.apiKeyProviders.some((provider) => provider.id === "google"), true);
  assert.equal(state.providers.some((provider) => provider.id === "chatgpt_oauth_session" && provider.authMode === "oauth_or_session_auth"), true);
  assert.equal(state.providers.some((provider) => provider.id === "openai_api_key" && provider.recommended), true);
  assert.match(html, /모델 연결 설정/);
  assert.match(html, /ChatGPT \/ Codex OAuth/);
  assert.match(html, /OAuth \/ Account Session/);
  assert.match(html, /OpenAI/);
  assert.match(html, /Anthropic/);
  assert.match(html, /Google Gemini/);
  assert.match(html, /<select id="api-key-provider" name="provider" required>/);
  assert.match(html, /선택한 Provider API Key 저장/);
  assert.match(html, /action="\/settings\/model-connection\/openai-api-key\/save"/);
  assert.match(html, /gpao-t models auth login --provider openai --device-code --set-default/);
  assert.match(html, /런타임 설정/);
  assert.doesNotMatch(html, /sk-[A-Za-z0-9]/);
  assert.equal(verification.status, "ready");
});

test("gateway exposes model connection settings page, state, and verification routes", () => {
  const page = handleGatewayRequest({ method: "GET", path: "/settings/model-connection" });
  const alias = handleGatewayRequest({ method: "GET", path: "/model-connection" });
  const state = handleGatewayRequest({ method: "GET", path: "/settings/model-connection/state" });
  const check = handleGatewayRequest({ method: "GET", path: "/settings/model-connection/verify" });
  const oauth = handleGatewayRequest({ method: "POST", path: "/settings/model-connection/openai-oauth" });
  const save = handleGatewayRequest({
    method: "POST",
    path: "/settings/model-connection/openai-api-key/save",
    body: {
      apiKey: "sk-test_secret_value_123456",
      cliEntry: "/tmp/gpao-t.mjs",
      runCommand: () => Buffer.from("Updated config"),
    },
  });

  assert.equal(page.status, 200);
  assert.equal(page.headers["content-type"], "text/html; charset=utf-8");
  assert.match(page.body, /GPAO-T 모델 연결 설정/);
  assert.equal(alias.status, 200);
  assert.equal(state.body.schema, "gpao_t.model_connection_settings.v1");
  assert.equal(check.body.schema, "gpao_t.model_connection_settings.v1.verification");
  assert.equal(check.body.status, "ready");
  assert.equal(oauth.body.status, "manual_user_approval_required");
  assert.equal(save.body.status, "saved");
  assert.equal(save.body.provider, "openai");
  assert.equal(save.body.profileId, "openai:manual");
  assert.doesNotMatch(JSON.stringify(save.body), /sk-test_secret/);
});

test("control UI model connection panel exposes OAuth and API key lanes", () => {
  const source = [
    "var $o=N({id:`skills`,path:`/skills`,loader:Qo,component:()=>M(()=>import(`./skills-page-DwYk0iep.js`).then(()=>({header:!0,render:e=>f`<gpao-t-skills-page .routeData=${e}></gpao-t-skills-page>`})),__vite__mapDeps([33,1,2,3,4,7,12,19,28,18,17,29]),import.meta.url)})",
    "async function es(",
    "channels:{path:`/settings/channels`,aliases:[`/channels`]},config:",
    "channels:{titleKey:`tabs.channels`,subtitleKey:`subtitles.channels`},instances:",
    "channels:`link`,instances:",
    "routes:[`channels`,`communications`]",
    "ho,ts,$o];function rs()",
  ].join("");
  const { source: patched } = patchIndexBundle(source);

  assert.match(patched, /ChatGPT \/ Codex OAuth/);
  assert.match(patched, /OpenAI API Key/);
  assert.match(patched, /id="api-key-provider"/);
  assert.match(patched, /Anthropic - Claude 계열 모델/);
  assert.match(patched, /Google Gemini - Gemini 계열 모델/);
  assert.match(patched, /선택한 Provider API Key 저장/);
  assert.match(patched, /봇 토큰과 Chat ID/);
  assert.doesNotMatch(patched, /Bot 연결키과/);
  assert.match(patched, /OAuth 토큰과 API 키 원문은 화면이나 로그에 다시 표시하지 않습니다/);
  assert.match(patched, /settings\/model-connection\/openai-api-key\/save/);
  const modelRouteOnly = patched.slice(0, patched.indexOf("$o=N({id:`skills`"));
  assert.doesNotMatch(modelRouteOnly, /<gpao-t-skills-page/);
});

test("model connection saves OpenAI API keys through official CLI without exposing the key", () => {
  const calls = [];
  const result = saveOpenAiApiKeyConnection({
    apiKey: "sk-test_secret_value_123456",
    cliEntry: "/tmp/gpao-t.mjs",
    nodePath: "node",
    env: { GPAO_T_STATE_DIR: "/private/tmp/gpao-t-missing-store" },
    runCommand: (node, args, options) => {
      calls.push({ node, args, input: options.input });
      return Buffer.from("Updated config");
    },
    now: "2026-07-15T00:00:00.000Z",
  });

  assert.equal(result.status, "saved");
  assert.equal(result.secretValuesExposed, false);
  assert.doesNotMatch(JSON.stringify(result), /sk-test_secret/);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args.slice(1), ["models", "auth", "paste-api-key", "--provider", "openai", "--profile-id", "openai:manual"]);
  assert.match(calls[0].input, /sk-test_secret_value_123456/);
});

test("model connection saves selected provider API keys with provider-specific profile ids", () => {
  const calls = [];
  const result = saveOpenAiApiKeyConnection({
    apiKey: "sk-ant-test_secret_value_123456",
    provider: "anthropic",
    cliEntry: "/tmp/gpao-t.mjs",
    nodePath: "node",
    env: { GPAO_T_STATE_DIR: "/private/tmp/gpao-t-missing-store" },
    runCommand: (node, args, options) => {
      calls.push({ node, args, input: options.input });
      return Buffer.from("Updated config");
    },
    now: "2026-07-15T00:00:00.000Z",
  });

  assert.equal(result.status, "saved");
  assert.equal(result.provider, "anthropic");
  assert.equal(result.profileId, "anthropic:manual");
  assert.equal(result.secretValuesExposed, false);
  assert.doesNotMatch(JSON.stringify(result), /sk-ant-test_secret/);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args.slice(1), ["models", "auth", "paste-api-key", "--provider", "anthropic", "--profile-id", "anthropic:manual"]);
  assert.match(calls[0].input, /sk-ant-test_secret_value_123456/);
});

test("control UI public assets stay rooted on settings subroutes", () => {
  const bundle = [
    "if(W_(),`serviceWorker`in navigator){let e=new URL(et(`sw.js`),window.location.origin);",
    "function G_(e,t){let n=document.querySelector(e);n&&(n.href=et(t))}",
  ].join("");
  const patchedBundle = patchControlUiPublicAssetRootPaths(bundle);
  assert.match(patchedBundle, /new URL\(`\/sw\.js`,window\.location\.origin\)/);
  assert.match(patchedBundle, /n\.href=`\/\$\{t\}`/);
  assert.doesNotMatch(patchedBundle, /new URL\(et\(`sw\.js`\)/);
  assert.doesNotMatch(patchedBundle, /n\.href=et\(t\)/);

  const html = '<link rel="manifest" href="./manifest.webmanifest" />';
  assert.equal(
    patchControlUiIndexHtmlPublicAssetRootPaths(html),
    '<link rel="manifest" href="/manifest.webmanifest" />',
  );
});

test("basic skill names stay English while descriptions become Korean", () => {
  const source = [
    "function X(e,t){return s`",
    "<span>${e.name}</span>",
    "<div class=\"list-sub\">${m(e.description,140)}</div>",
    "`}",
    "function Z(e,t){return s`",
    "<span>${e.name}</span>",
    "<div style=\"font-size: 14px; line-height: 1.5; color: var(--text);\">",
    "${e.description}",
    "            </div>",
    "            ${M({skill:e,showBundledBadge:o})}",
    "`}",
  ].join("");
  const patched = patchSkillsPageBasicSkillKoreanDescriptions(source);

  assert.match(patched, /gpao_t_basic_skill_korean_descriptions_v0_1/);
  assert.match(patched, /"clawhub":"gpao-t-hub"/);
  assert.match(patched, /"개발-agent":"coding-agent"/);
  assert.match(patched, /"session-logs":"이전 대화와 세션 로그를 찾아보고 필요한 맥락을 분석합니다\."/);
  assert.match(patched, /"coding-agent":"Codex, Claude Code, OpenCode 같은 개발 에이전트에게 별도 개발 작업을 맡깁니다\."/);
  assert.match(patched, /gpaoTDisplaySkillName\(e\)/);
  assert.match(patched, /gpaoTDisplaySkillDescription\(e\)/);
  assert.doesNotMatch(patched, /<span>\$\{e\.name\}<\/span>/);
  assert.doesNotMatch(patched, /\$\{m\(e\.description,140\)\}/);
});

test("global dashboard copy cleanup does not rewrite skill card labels", () => {
  const html = [
    '<script data-gpao-t="gpao_t_user_screen_cache_refresh_v0_15">',
    'const build = "2026071421";',
    'for (const attr of ["aria-label", "title", "alt", "placeholder"]) {',
    'if (parent.closest?.(".chat-text")) return NodeFilter.FILTER_REJECT;',
    "</script>",
  ].join("\n");
  const patched = patchControlUiIndexHtmlSkillSurfaceIsolation(html);

  assert.match(patched, /2026071503-model-connection-provider-select/);
  assert.match(patched, /element\.closest\?\.\("\.skills-grid"\)/);
  assert.match(patched, /parent\.closest\?\.\("\.skills-grid"\)/);
});
