import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { inspectProviderAuthStores, buildProviderAuthRepairPlan } from "./provider-auth-heart.js";
import { buildModelProviderRegistry } from "./model-invocation.js";

const SCHEMA = "gpao_t.model_connection_settings.v1";
const MODEL_CONNECTION_ROUTE = "/settings/model-connection";
const API_KEY_MANAGEMENT_ROUTE = "/settings/model-connection";
const OPENAI_API_KEY_SAVE_ROUTE = "/settings/model-connection/openai-api-key/save";
const OPENAI_OAUTH_HELP_ROUTE = "/settings/model-connection/openai-oauth";
const CONFIG_ROUTE = "/settings/general";
const PROVIDER_AUTH_STATE_ROUTE = "/runtime/provider-auth-heart";
const PROVIDER_AUTH_VERIFY_ROUTE = "/runtime/provider-auth-heart/verify";
const API_KEY_PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    profileId: "openai:manual",
    placeholder: "sk-...",
    help: "GPT 계열 모델을 OpenAI API 사용량/과금 기준으로 연결합니다.",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    profileId: "anthropic:manual",
    placeholder: "sk-ant-...",
    help: "Claude 계열 모델을 Anthropic API 키로 연결합니다.",
  },
  {
    id: "google",
    label: "Google Gemini",
    profileId: "google:manual",
    placeholder: "AIza...",
    help: "Gemini 계열 모델을 Google/Gemini API 키로 연결합니다.",
  },
];

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
    apiKeyProviders: API_KEY_PROVIDERS.map(({ id, label, profileId, help }) => ({ id, label, profileId, help })),
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
        id: "save_openai_api_key",
        label: "Provider API Key 저장",
        href: OPENAI_API_KEY_SAVE_ROUTE,
        method: "POST",
        secretHandling: "secret_value_never_echoed",
      },
      {
        id: "openai_oauth_help",
        label: "ChatGPT / Codex OAuth 연결 방법",
        href: OPENAI_OAUTH_HELP_ROUTE,
        method: "POST",
        secretHandling: "oauth_token_never_echoed",
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


export function saveOpenAiApiKeyConnection({
  apiKey,
  provider = "openai",
  profileId,
  cliEntry = process.argv[1],
  nodePath = process.execPath,
  env = process.env,
  runCommand = execFileSync,
  now = new Date().toISOString(),
} = {}) {
  const normalizedProvider = normalizeProvider(provider);
  const key = String(apiKey || "").trim();
  const providerMeta = API_KEY_PROVIDERS.find((item) => item.id === normalizedProvider);
  const profile = String(profileId || providerMeta?.profileId || normalizedProvider + ":manual").trim() || normalizedProvider + ":manual";
  const findings = [];
  if (!key) findings.push("api_key_required");
  if (!isSupportedApiKeyProvider(normalizedProvider)) findings.push("unsupported_provider");
  if (!cliEntry || (!String(cliEntry).endsWith(".mjs") && !String(cliEntry).endsWith(".js"))) findings.push("cli_entry_unavailable");
  if (findings.length) return { schema: SCHEMA + ".api_key_save_result", status: "blocked", provider: normalizedProvider, profileId: profile, findings, secretValuesExposed: false, message: "API 키 저장에 필요한 입력이 부족합니다." };
  try {
    runCommand(nodePath, [cliEntry, "models", "auth", "paste-api-key", "--provider", normalizedProvider, "--profile-id", profile], {
      input: key + "\n",
      env,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30000,
    });
    const authStoreMirror = mirrorProductNamedAuthStore({ env });
    return { schema: SCHEMA + ".api_key_save_result", status: "saved", provider: normalizedProvider, profileId: profile, savedAt: now, secretValuesExposed: false, authStoreMirror, nextSafeAction: "새 대화에서 실제 모델 응답을 확인하세요.", message: providerLabel(normalizedProvider) + " API 키를 저장했습니다. 키 원문은 다시 표시하지 않습니다." };
  } catch (error) {
    return { schema: SCHEMA + ".api_key_save_result", status: "failed", provider: normalizedProvider, profileId: profile, findings: ["auth_cli_save_failed"], secretValuesExposed: false, message: "API 키 저장 중 오류가 발생했습니다. 키 값은 기록하지 않았습니다.", detail: redactAuthCommandOutput(error?.stderr?.toString?.() || error?.message || "unknown_error") };
  }
}

export function buildOpenAiOAuthConnectionHelp() {
  return { schema: SCHEMA + ".oauth_help", status: "manual_user_approval_required", provider: "openai", label: "ChatGPT / Codex OAuth", command: "gpao-t models auth login --provider openai --device-code --set-default", secretValuesExposed: false, message: "OAuth는 브라우저 또는 device-code 계정 승인이 필요합니다. GPAO-T가 사용자 계정 승인을 몰래 대신 수행하지 않습니다." };
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
  if (!state.setupActions?.some((action) => action.href === OPENAI_API_KEY_SAVE_ROUTE && action.method === "POST")) {
    findings.push("missing_openai_api_key_save_action");
  }
  for (const providerId of ["openai", "anthropic", "google"]) {
    if (!state.apiKeyProviders?.some((provider) => provider.id === providerId)) {
      findings.push(`missing_api_key_provider:${providerId}`);
    }
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
  const apiKeyProviderOptions = (state.apiKeyProviders || API_KEY_PROVIDERS).map((provider) => `
              <option value="${safe(provider.id)}">${safe(provider.label)} - ${safe(provider.help || "")}</option>`).join("");
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
      form { border:1px solid var(--line); background:#fff; border-radius:8px; padding:16px; margin-top:14px; }
      label { display:block; font-weight:700; margin-bottom:8px; }
      input { width:100%; box-sizing:border-box; min-height:42px; border:1px solid var(--line); border-radius:7px; padding:0 12px; font:inherit; background:#fff; color:var(--text); }
      select { width:100%; box-sizing:border-box; min-height:42px; border:1px solid var(--line); border-radius:7px; padding:0 12px; font:inherit; background:#fff; color:var(--text); }
      .field { margin:12px 0; }
      button { min-height:42px; border-radius:7px; border:1px solid var(--accent); background:var(--accent); color:white; font-weight:750; padding:0 14px; cursor:pointer; }
      .notice { border:1px solid rgba(216,77,63,.25); background:rgba(216,77,63,.06); border-radius:8px; padding:14px 16px; margin-top:14px; }
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
        <h2>API Key 연결</h2>
        <form method="post" action="${OPENAI_API_KEY_SAVE_ROUTE}">
          <div class="field">
            <label for="api-key-provider">Provider</label>
            <select id="api-key-provider" name="provider" required>
${apiKeyProviderOptions}
            </select>
          </div>
          <div class="field">
            <label for="provider-api-key">API Key</label>
            <input id="provider-api-key" name="apiKey" type="password" autocomplete="off" placeholder="선택한 provider의 API key" required>
          </div>
          <button type="submit">선택한 Provider API Key 저장</button>
          <p style="margin-top:10px">저장 후 키 원문은 다시 표시하지 않습니다. 저장이 끝나면 새 대화에서 실제 모델 응답을 확인합니다.</p>
        </form>
        <form method="post" action="${OPENAI_OAUTH_HELP_ROUTE}">
          <button type="submit">ChatGPT / Codex OAuth 연결 방법 보기</button>
        </form>
        <div class="notice">
          <strong>ChatGPT / Codex OAuth</strong>
          <p>OAuth는 브라우저 또는 device-code 계정 승인이 필요합니다. 터미널에서 <code>gpao-t models auth login --provider openai --device-code --set-default</code>를 실행해 계정 승인을 완료한 뒤 이 화면을 새로고침하세요.</p>
        </div>
      </section>
      <section>
        <h2>설정 방법</h2>
        <ul>
          <li><strong>OAuth / Account Session</strong>은 ChatGPT 또는 Codex 계정 승인으로 GPT 모델을 연결하는 방식입니다.</li>
          <li><strong>API Key</strong>는 provider를 선택한 뒤 해당 회사의 API key를 붙여넣고 저장합니다. 저장 후 키 원문은 다시 표시하지 않습니다.</li>
          <li>필요하면 <strong>런타임 설정</strong>에서 provider 관련 설정을 확인합니다.</li>
          <li>API 키와 토큰 값은 이 화면이나 로그에 다시 표시하지 않습니다.</li>
          <li>현재 버전은 로컬 실행 환경의 안전 설정 저장소와 <code>GPAO-T doctor</code> 진단을 기준으로 연결 상태를 확인합니다.</li>
          <li>연결 후에는 반드시 새 대화에서 실제 모델 응답이 나오는지 확인합니다.</li>
        </ul>
      </section>
      <div class="actions">
        <a class="button primary" href="${MODEL_CONNECTION_ROUTE}">모델 연결 설정</a>
        <a class="button" href="${CONFIG_ROUTE}">런타임 설정</a>
      </div>
    </main>
  </body>
</html>`;
}

function mirrorProductNamedAuthStore({ env = process.env } = {}) {
  try {
    const stateDir = resolveStateDir(env);
    const agentDir = join(stateDir, "agents", "main", "agent");
    const canonicalStore = join(agentDir, "gpao-t-agent.sqlite");
    const runtimeCompatibilityStore = join(agentDir, "openclaw-agent.sqlite");
    const sourceStore = existsSync(canonicalStore)
      ? canonicalStore
      : existsSync(runtimeCompatibilityStore)
        ? runtimeCompatibilityStore
        : null;
    if (!sourceStore) {
      return { status: "skipped", reason: "auth_store_missing", canonicalStore: "gpao-t-agent.sqlite" };
    }
    mkdirSync(agentDir, { recursive: true });
    if (sourceStore !== canonicalStore) copyFileSync(sourceStore, canonicalStore);
    if (existsSync(canonicalStore)) copyFileSync(canonicalStore, runtimeCompatibilityStore);
    const canonicalSize = statSync(canonicalStore).size;
    const compatibilitySize = statSync(runtimeCompatibilityStore).size;
    return {
      status: canonicalSize === compatibilitySize ? "synced" : "size_mismatch",
      canonicalStore: "gpao-t-agent.sqlite",
      runtimeCompatibilityStore: "gpao-t-runtime-compatibility-auth-mirror",
    };
  } catch (error) {
    return { status: "failed", reason: redactAuthCommandOutput(error?.message || "auth_store_mirror_failed") };
  }
}

function resolveStateDir(env = process.env) {
  if (env.GPAO_T_STATE_DIR) return String(env.GPAO_T_STATE_DIR);
  if (env.GPAO_T_CONFIG_PATH) return dirname(String(env.GPAO_T_CONFIG_PATH));
  return join(homedir(), ".gpao-t");
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

function normalizeProvider(provider) {
  const value = String(provider || "openai").trim().toLowerCase();
  if (value === "google" || value === "gemini") return "google";
  return value || "openai";
}
function isSupportedApiKeyProvider(provider) { return ["openai", "anthropic", "google"].includes(provider); }
function providerLabel(provider) {
  if (provider === "anthropic") return "Anthropic";
  if (provider === "google") return "Google Gemini";
  return "OpenAI";
}
function redactAuthCommandOutput(value) {
  return String(value || "").replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED_API_KEY]").replace(/OPENAI_API_KEY=\S+/g, "OPENAI_API_KEY=[REDACTED]").replace(/openclaw logs --follow/g, "gpao-t logs --follow").replace(/OpenClaw/g, "GPAO-T").replace(/openclaw/g, "gpao-t");
}
