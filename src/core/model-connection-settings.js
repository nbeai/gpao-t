import { inspectProviderAuthStores, buildProviderAuthRepairPlan } from "./provider-auth-heart.js";
import { buildModelProviderRegistry } from "./model-invocation.js";

const SCHEMA = "gpao_t.model_connection_settings.v1";
const MODEL_CONNECTION_ROUTE = "/settings/model-connection";
const API_KEY_MANAGEMENT_ROUTE = "/skills";
const CONFIG_ROUTE = "/settings/general";
const PROVIDER_AUTH_STATE_ROUTE = "/runtime/provider-auth-heart";
const PROVIDER_AUTH_VERIFY_ROUTE = "/runtime/provider-auth-heart/verify";

export function buildModelConnectionSettingsState({
  inventory = inspectProviderAuthStores(),
  repairPlan = buildProviderAuthRepairPlan({ inventory }),
  modelProviderRegistry = buildModelProviderRegistry(),
  now = new Date().toISOString(),
} = {}) {
  const visibleState = inventory.userVisibleState || {};
  const registryProviders = Array.isArray(modelProviderRegistry?.providers)
    ? modelProviderRegistry.providers
    : [];
  const accountSessionProvider = registryProviders.find((provider) => provider.lane === "oauth_session");
  const providers = [
    {
      id: "chatgpt_oauth_session",
      label: "ChatGPT / Codex OAuth",
      lane: accountSessionProvider?.lane || "oauth_session",
      authMode: accountSessionProvider?.authMode || "oauth_or_session_auth",
      recommended: true,
      status: accountSessionProvider?.configured ? "configured_candidate" : "needs_setup",
      note: "ChatGPT 또는 Codex 계정 세션으로 GPT 모델을 연결하는 방식입니다. API 키를 직접 붙여넣지 않아도 되는 계정 기반 연결 경로입니다.",
      setupHint: "브라우저/계정 승인으로 연결하며, 토큰 값은 화면에 다시 표시하지 않습니다.",
    },
    {
      id: "openai_api_key",
      label: "OpenAI API key",
      lane: "api_key",
      authMode: "api_key",
      envKeys: ["OPENAI_API_KEY"],
      recommended: true,
      status: visibleState.status === "connected_candidate" ? "configured_candidate" : "needs_setup",
      note: "팀원별 OpenAI API 키로 GPT 모델을 연결하는 방식입니다. 사용량/과금 정책을 별도로 관리할 때 적합합니다.",
      setupHint: "키 입력은 설정 저장소로만 들어가며, 저장 후 이 화면이나 로그에 원문 키를 표시하지 않습니다.",
    },
    {
      id: "anthropic",
      label: "Anthropic",
      lane: "api_key",
      authMode: "api_key",
      envKeys: ["ANTHROPIC_API_KEY"],
      recommended: false,
      status: "optional",
      note: "모델 선택 확장을 위한 선택 연결입니다.",
    },
    {
      id: "google",
      label: "Google Gemini",
      lane: "api_key",
      authMode: "api_key",
      envKeys: ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
      recommended: false,
      status: "optional",
      note: "모델 선택 확장을 위한 선택 연결입니다.",
    },
  ];

  return {
    schema: SCHEMA,
    generatedAt: now,
    status: visibleState.status === "connected_candidate" ? "ready_candidate" : "needs_setup",
    title: "모델 연결 설정",
    userVisibleState: {
      status: visibleState.status || "needs_setup",
      label: visibleState.label || "모델 연결 설정 필요",
      message: visibleState.message || "GPAO-T가 아직 사용할 수 있는 모델 연결 정보를 찾지 못했습니다.",
    },
    providerAuth: {
      inventoryStatus: inventory.status,
      repairPlanStatus: repairPlan.status,
      findings: inventory.findings || [],
      secretValuesExposed: false,
    },
    connectionModes: [
      {
        id: "oauth_session",
        label: "OAuth / Account Session",
        status: accountSessionProvider ? "available" : "missing",
        description: "ChatGPT/Codex 계정 승인으로 GPT 모델을 쓰는 방식입니다. 개인이나 팀원이 이미 계정 기반으로 사용하는 경우 이 경로가 자연스럽습니다.",
        secretHandling: "oauth_or_session_token_never_echoed",
      },
      {
        id: "api_key",
        label: "API Key",
        status: "available",
        description: "OpenAI, Anthropic, Google 같은 provider 키를 저장해 모델을 호출하는 방식입니다. 사용량과 비용을 API 기준으로 관리합니다.",
        secretHandling: "api_key_never_echoed",
      },
    ],
    providers,
    dashboardRoutes: {
      modelConnection: MODEL_CONNECTION_ROUTE,
      apiKeyManagement: API_KEY_MANAGEMENT_ROUTE,
      runtimeConfig: CONFIG_ROUTE,
      providerAuthState: PROVIDER_AUTH_STATE_ROUTE,
      providerAuthVerify: PROVIDER_AUTH_VERIFY_ROUTE,
    },
    setupActions: [
      {
        id: "open_model_connection_settings",
        label: "모델 연결 설정 열기",
        href: MODEL_CONNECTION_ROUTE,
      },
      {
        id: "open_api_key_management",
        label: "기능/API 키 관리 열기",
        href: API_KEY_MANAGEMENT_ROUTE,
        secretHandling: "secret_value_never_echoed",
      },
      {
        id: "open_runtime_config",
        label: "런타임 설정 확인",
        href: CONFIG_ROUTE,
        secretHandling: "secret_value_never_echoed",
      },
      {
        id: "verify_fresh_chat",
        label: "새 대화로 실제 응답 확인",
        href: "/chat?session=main",
      },
    ],
    nextSafeAction:
      visibleState.status === "connected_candidate"
        ? "새 대화에서 실제 모델 응답과 로그를 확인하세요."
        : "모델 연결 설정 화면에서 provider API 키를 연결한 뒤 새 대화 응답을 확인하세요.",
  };
}

export function verifyModelConnectionSettingsState(state = buildModelConnectionSettingsState()) {
  const findings = [];
  if (state.schema !== SCHEMA) findings.push("invalid_schema");
  if (state.title !== "모델 연결 설정") findings.push("missing_user_visible_title");
  if (!state.setupActions?.some((action) => action.href === "/settings/model-connection")) {
    findings.push("missing_model_connection_settings_route");
  }
  if (state.dashboardRoutes?.apiKeyManagement !== API_KEY_MANAGEMENT_ROUTE) {
    findings.push("missing_api_key_management_route");
  }
  if (!state.setupActions?.some((action) => action.href === API_KEY_MANAGEMENT_ROUTE)) {
    findings.push("missing_api_key_management_action");
  }
  if (state.providerAuth?.secretValuesExposed !== false) findings.push("secret_value_exposure_open");
  if (!state.providers?.some((provider) => provider.id === "openai_api_key" && provider.recommended)) {
    findings.push("missing_recommended_openai_provider");
  }
  if (!state.connectionModes?.some((mode) => mode.id === "oauth_session" && mode.status === "available")) {
    findings.push("missing_oauth_session_connection_mode");
  }
  if (!state.providers?.some((provider) => provider.id === "chatgpt_oauth_session" && provider.authMode === "oauth_or_session_auth")) {
    findings.push("missing_chatgpt_oauth_session_provider");
  }
  return {
    schema: `${SCHEMA}.verification`,
    status: findings.length ? "blocked" : "ready",
    findings,
    completionClaimAllowed: false,
    nextSafeAction: findings.length
      ? "Fix the user-facing model connection settings surface before installer or dashboard completion claims."
      : "Expose this state in the dashboard and verify it in the live browser path.",
  };
}

export function renderModelConnectionSettingsHtml(state = buildModelConnectionSettingsState()) {
  const safe = escapeHtml;
  const providerRows = (state.providers || []).map((provider) => `
          <article class="provider-card">
            <div>
              <h2>${safe(provider.label)}</h2>
              <p>${safe(provider.note)}</p>
            </div>
            <span class="pill ${provider.status === "configured_candidate" ? "ready" : ""}">${safe(statusLabel(provider.status))}</span>
          </article>`).join("");
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>GPAO-T 모델 연결 설정</title>
    <style>
      :root { color-scheme: light; --bg:#f7f4ef; --panel:#fffaf3; --text:#312b25; --muted:#746b60; --line:#ded4c8; --accent:#d84d3f; --ok:#177245; }
      body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:var(--bg); color:var(--text); }
      main { max-width:860px; margin:0 auto; padding:40px 24px 56px; }
      header { display:flex; justify-content:space-between; gap:18px; align-items:flex-start; margin-bottom:24px; }
      h1 { margin:0 0 10px; font-size:32px; line-height:1.18; letter-spacing:0; }
      p { margin:0; color:var(--muted); line-height:1.65; }
      .status { border:1px solid var(--line); background:var(--panel); border-radius:8px; padding:18px 20px; margin-bottom:18px; }
      .status strong { display:block; font-size:18px; margin-bottom:6px; }
      .grid { display:grid; gap:12px; margin:20px 0; }
      .provider-card { display:flex; justify-content:space-between; gap:18px; align-items:center; border:1px solid var(--line); background:#fff; border-radius:8px; padding:16px 18px; }
      .provider-card h2 { margin:0 0 6px; font-size:18px; letter-spacing:0; }
      .pill { flex:0 0 auto; border:1px solid var(--line); border-radius:999px; padding:6px 10px; color:var(--muted); font-size:13px; }
      .pill.ready { color:var(--ok); border-color:rgba(23,114,69,.35); background:rgba(23,114,69,.07); }
      .actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:22px; }
      a.button { display:inline-flex; align-items:center; min-height:40px; padding:0 14px; border-radius:7px; text-decoration:none; font-weight:650; border:1px solid var(--line); color:var(--text); background:#fff; }
      a.primary { color:#fff; border-color:var(--accent); background:var(--accent); }
      code { background:#fff; border:1px solid var(--line); border-radius:6px; padding:2px 6px; }
      section { margin-top:28px; }
      .mode-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:12px; margin-top:12px; }
      .mode-card { border:1px solid var(--line); background:#fff; border-radius:8px; padding:14px 16px; }
      .mode-card h3 { margin:0 0 8px; font-size:16px; letter-spacing:0; }
      li { margin:8px 0; color:var(--muted); line-height:1.55; }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>모델 연결 설정</h1>
          <p>GPAO-T가 실제 모델 응답에 사용할 provider 연결 상태를 확인하고 설정하는 화면입니다.</p>
        </div>
        <a class="button" href="/chat?session=main">채팅으로 돌아가기</a>
      </header>
      <div class="status">
        <strong>${safe(state.userVisibleState?.label || "모델 연결 설정 필요")}</strong>
        <p>${safe(state.userVisibleState?.message || "")}</p>
      </div>
      <div class="grid">
${providerRows}
      </div>
      <section>
        <h2>연결 방식</h2>
        <div class="mode-list">
${(state.connectionModes || []).map((mode) => `
          <article class="mode-card">
            <h3>${safe(mode.label)}</h3>
            <p>${safe(mode.description)}</p>
          </article>`).join("")}
        </div>
      </section>
      <section>
        <h2>설정 방법</h2>
        <ul>
          <li><strong>OAuth / Account Session</strong>은 ChatGPT 또는 Codex 계정 승인으로 GPT 모델을 연결하는 방식입니다.</li>
          <li><strong>API Key</strong>는 <strong>기능/API 키 관리</strong>에서 사용할 provider 또는 skill의 API 키 칸을 열어 저장합니다.</li>
          <li>필요하면 <strong>런타임 설정</strong>에서 provider 관련 설정을 확인합니다.</li>
          <li>API 키와 토큰 값은 이 화면이나 로그에 다시 표시하지 않습니다.</li>
          <li>현재 버전은 로컬 실행 환경의 안전 설정 저장소와 <code>GPAO-T doctor</code> 진단을 기준으로 연결 상태를 확인합니다.</li>
          <li>연결 후에는 반드시 새 대화에서 실제 모델 응답이 나오는지 확인합니다.</li>
        </ul>
      </section>
      <div class="actions">
        <a class="button primary" href="${MODEL_CONNECTION_ROUTE}">모델 연결 설정</a>
        <a class="button" href="${API_KEY_MANAGEMENT_ROUTE}">기능/API 키 관리</a>
        <a class="button" href="${CONFIG_ROUTE}">런타임 설정</a>
      </div>
    </main>
  </body>
</html>`;
}

function statusLabel(status) {
  if (status === "configured_candidate") return "연결 후보 확인";
  if (status === "optional") return "선택 연결";
  return "설정 필요";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
