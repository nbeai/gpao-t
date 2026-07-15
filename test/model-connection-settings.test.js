import test from "node:test";
import assert from "node:assert/strict";
import {
  buildModelConnectionSettingsState,
  handleGatewayRequest,
  renderModelConnectionSettingsHtml,
  verifyModelConnectionSettingsState,
} from "../src/index.js";
import {
  patchControlUiIndexHtmlPublicAssetRootPaths,
  patchControlUiIndexHtmlSkillSurfaceIsolation,
  patchControlUiPublicAssetRootPaths,
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
  assert.equal(state.dashboardRoutes.apiKeyManagement, "/skills");
  assert.equal(state.dashboardRoutes.runtimeConfig, "/settings/general");
  assert.equal(state.providers.some((provider) => provider.id === "openai" && provider.recommended), true);
  assert.match(html, /모델 연결 설정/);
  assert.match(html, /OpenAI/);
  assert.match(html, /기능\/API 키 관리/);
  assert.match(html, /런타임 설정/);
  assert.doesNotMatch(html, /sk-[A-Za-z0-9]/);
  assert.equal(verification.status, "ready");
});

test("gateway exposes model connection settings page, state, and verification routes", () => {
  const page = handleGatewayRequest({ method: "GET", path: "/settings/model-connection" });
  const alias = handleGatewayRequest({ method: "GET", path: "/model-connection" });
  const state = handleGatewayRequest({ method: "GET", path: "/settings/model-connection/state" });
  const check = handleGatewayRequest({ method: "GET", path: "/settings/model-connection/verify" });

  assert.equal(page.status, 200);
  assert.equal(page.headers["content-type"], "text/html; charset=utf-8");
  assert.match(page.body, /GPAO-T 모델 연결 설정/);
  assert.equal(alias.status, 200);
  assert.equal(state.body.schema, "gpao_t.model_connection_settings.v1");
  assert.equal(check.body.schema, "gpao_t.model_connection_settings.v1.verification");
  assert.equal(check.body.status, "ready");
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

  assert.match(patched, /2026071502-model-connection-skills-ko/);
  assert.match(patched, /element\.closest\?\.\("\.skills-grid"\)/);
  assert.match(patched, /parent\.closest\?\.\("\.skills-grid"\)/);
});
