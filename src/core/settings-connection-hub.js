import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  buildModelConnectionSettingsState,
  verifyModelConnectionSettingsState,
} from "./model-connection-settings.js";

const SCHEMA = "gpao_t.settings_connection_hub.v1";
const DEFAULT_CONFIG_PATH = process.env.GPAO_T_CONFIG_PATH || join(homedir(), ".gpao-t", "gpao-t.json");

export const SETTINGS_ROUTES = [
  "/settings/general",
  "/settings/model-connection",
  "/settings/channels",
  "/settings/profile",
  "/settings/ai-agents",
];

export function readRuntimeConfigSafely(configPath = DEFAULT_CONFIG_PATH) {
  try {
    if (!existsSync(configPath)) return { exists: false, config: {}, reason: "missing" };
    const parsed = JSON.parse(readFileSync(configPath, "utf8"));
    return { exists: true, config: parsed, reason: "read" };
  } catch (error) {
    return { exists: true, config: {}, reason: `invalid:${error.message}` };
  }
}

export function saveTelegramSettingsToConfig({
  configPath = DEFAULT_CONFIG_PATH,
  form = {},
  now = new Date().toISOString(),
} = {}) {
  const configRead = readRuntimeConfigSafely(configPath);
  const config = configRead.config && typeof configRead.config === "object" ? configRead.config : {};
  const token = String(form.botToken || form.telegramBotToken || "").trim();
  const chatId = String(form.chatId || form.telegramChatId || "").trim();
  const enabled = form.enabled === true || form.enabled === "true" || form.enabled === "on";

  config.channels = config.channels && typeof config.channels === "object" ? config.channels : {};
  const previous = config.channels.telegram && typeof config.channels.telegram === "object"
    ? config.channels.telegram
    : {};
  config.channels.telegram = {
    enabled,
  };
  if (token) config.channels.telegram.botToken = token;
  if (chatId) config.channels.telegram.chatId = chatId;

  mkdirSync(dirname(configPath), { recursive: true, mode: 0o700 });
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  try {
    chmodSync(configPath, 0o600);
  } catch {
    // Best-effort hardening; writeFileSync mode already sets owner-only on new files.
  }
  const state = buildTelegramConnectionState({
    configRead: { exists: true, reason: "saved", config },
    now,
  });
  return {
    schema: "gpao_t.telegram_settings_save.v1",
    status: "saved",
    configPath,
    secretValuesExposed: false,
    saved: {
      enabled,
      botTokenPresent: state.configured.botToken,
      chatIdPresent: state.configured.chatId,
    },
    telegram: state,
    nextSafeAction: "Telegram 연결 확인을 실행하고, Telegram 전용 대화 세션에서 실제 수신/응답을 확인하세요.",
  };
}

export function buildTelegramConnectionState({
  configRead = readRuntimeConfigSafely(),
  env = process.env,
  now = new Date().toISOString(),
} = {}) {
  const telegram = configRead.config?.channels?.telegram || {};
  const tokenRef = telegram.botTokenRef || telegram.tokenRef || null;
  const tokenConfigured = Boolean(
    telegram.botToken ||
    telegram.token ||
    tokenRef ||
    env.TELEGRAM_BOT_TOKEN ||
    env.GPAO_T_TELEGRAM_BOT_TOKEN,
  );
  const chatConfigured = Boolean(
    telegram.chatId ||
    telegram.defaultChatId ||
    env.TELEGRAM_CHAT_ID ||
    env.GPAO_T_TELEGRAM_CHAT_ID,
  );
  const enabled = telegram.enabled === true;
  const ready = enabled && tokenConfigured && chatConfigured;
  const findings = [];
  if (!enabled) findings.push("telegram_disabled");
  if (!tokenConfigured) findings.push("telegram_bot_token_missing");
  if (!chatConfigured) findings.push("telegram_chat_id_missing");

  return {
    schema: `${SCHEMA}.telegram`,
    generatedAt: now,
    id: "telegram",
    label: "Telegram",
    status: ready ? "ready_candidate" : "needs_setup",
    enabled,
    configured: {
      botToken: tokenConfigured,
      chatId: chatConfigured,
      tokenRef: Boolean(tokenRef),
    },
    secretSafety: {
      rawTokenReturned: false,
      rawTokenLogged: false,
      usesSecretReferenceWhenAvailable: Boolean(tokenRef),
    },
    findings,
    setupFields: [
      {
        id: "botToken",
        label: "Bot Token",
        type: "secret",
        envKeys: ["GPAO_T_TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_TOKEN"],
        description: "BotFather에서 발급받은 Telegram 봇 토큰입니다. 저장 후 화면에는 원문을 다시 표시하지 않습니다.",
      },
      {
        id: "chatId",
        label: "Chat ID",
        type: "text",
        envKeys: ["GPAO_T_TELEGRAM_CHAT_ID", "TELEGRAM_CHAT_ID"],
        description: "GPAO-T가 메시지를 읽거나 보낼 대상 대화방 ID입니다. 개인 대화나 테스트 그룹부터 연결하세요.",
      },
      {
        id: "enabled",
        label: "Enable Telegram",
        type: "toggle",
        description: "토큰과 Chat ID가 준비된 뒤 켭니다. 꺼져 있으면 외부 전송은 일어나지 않습니다.",
      },
    ],
    actions: [
      {
        id: "save_telegram_settings",
        label: "Telegram 설정 저장",
        method: "POST",
        path: "/settings/channels/telegram/save",
        authority: "local_secret_write_requires_user_submit",
      },
      {
        id: "verify_telegram_connection",
        label: "Telegram 연결 확인",
        method: "POST",
        path: "/settings/channels/telegram/verify-connection",
        authority: "external_network_check_requires_user_submit",
      },
      {
        id: "open_telegram_chat_session",
        label: "Telegram 대화 열기",
        method: "GET",
        path: "/chat?session=telegram",
        authority: "local_ui_navigation",
      },
    ],
    userVisibleState: ready
      ? {
          label: "Telegram 연결 후보 정상",
          message: "Telegram 설정이 켜져 있고 토큰과 Chat ID가 확인되었습니다. 실제 송수신 검증은 사용자 승인 후 진행합니다.",
        }
      : {
          label: "Telegram 연결 설정 필요",
          message: "Telegram을 사용하려면 Bot Token, Chat ID, Enable Telegram 설정이 필요합니다.",
        },
  };
}

export function buildSettingsConnectionHubState({
  route = "/settings/general",
  configRead = readRuntimeConfigSafely(),
  modelConnection = buildModelConnectionSettingsState(),
  telegram = buildTelegramConnectionState({ configRead }),
  now = new Date().toISOString(),
} = {}) {
  const pages = [
    {
      id: "general",
      route: "/settings/general",
      label: "General",
      title: "기본 설정",
      description: "포트, 로컬 실행, 업데이트, 런타임 상태를 확인합니다.",
      status: configRead.exists ? "ready" : "needs_setup",
      actions: [
        { label: "런타임 상태", href: "/health" },
        { label: "GPAO-T doctor", href: "/runtime/doctor-recovery-heart" },
      ],
    },
    {
      id: "model-connection",
      route: "/settings/model-connection",
      label: "Model Connection",
      title: "모델 연결 설정",
      description: "OAuth / Account Session 또는 API Key 방식으로 모델 provider를 연결합니다.",
      status: modelConnection.status,
      actions: [
        { label: "상태 보기", href: "/settings/model-connection/state" },
        { label: "검증", href: "/settings/model-connection/verify" },
      ],
    },
    {
      id: "channels",
      route: "/settings/channels",
      label: "Channels",
      title: "연결 채널",
      description: "Telegram 같은 외부 대화 채널을 연결하고 상태를 확인합니다.",
      status: telegram.status,
      actions: [
        { label: "Telegram 상태", href: "/settings/channels/telegram/state" },
        { label: "Telegram 검증", href: "/settings/channels/telegram/verify" },
      ],
    },
    {
      id: "profile",
      route: "/settings/profile",
      label: "Profile",
      title: "사용자 프로필",
      description: "사용자 이름, 작업 선호, 개인화 기준을 관리합니다.",
      status: "ready",
      actions: [{ label: "환영 설정", href: "/workspace/welcome" }],
    },
    {
      id: "ai-agents",
      route: "/settings/ai-agents",
      label: "AI Agents",
      title: "AI 에이전트",
      description: "GPAO-T가 사용할 모델, 도구, 실행 권한의 기본 정책을 확인합니다.",
      status: "ready",
      actions: [
        { label: "도구 권한", href: "/tool-authority-heart" },
        { label: "실행 런타임", href: "/connectors/execution-runtime" },
      ],
    },
  ];
  return {
    schema: SCHEMA,
    generatedAt: now,
    activeRoute: route,
    config: {
      exists: configRead.exists,
      reason: configRead.reason,
      path: DEFAULT_CONFIG_PATH,
      secretValuesExposed: false,
    },
    pages,
    telegram,
    modelConnection,
    nextSafeAction: "설정 메뉴에서 필요한 항목을 열고, 저장 후 verify route와 실제 사용자 화면으로 확인하세요.",
  };
}

export function verifySettingsConnectionHubState(state = buildSettingsConnectionHubState()) {
  const findings = [];
  if (state.schema !== SCHEMA) findings.push("invalid_schema");
  for (const route of SETTINGS_ROUTES) {
    if (!state.pages?.some((page) => page.route === route)) findings.push(`missing_route:${route}`);
  }
  if (state.config?.secretValuesExposed !== false) findings.push("secret_exposure_open");
  if (state.telegram?.secretSafety?.rawTokenReturned !== false) findings.push("telegram_secret_exposure_open");
  if (!state.telegram?.actions?.some((action) => action.path === "/settings/channels/telegram/save")) {
    findings.push("telegram_save_action_missing");
  }
  if (!state.telegram?.actions?.some((action) => action.path === "/settings/channels/telegram/verify-connection")) {
    findings.push("telegram_connection_verify_action_missing");
  }
  const modelCheck = verifyModelConnectionSettingsState(state.modelConnection);
  if (modelCheck.status !== "ready") findings.push("model_connection_settings_not_ready");
  return {
    schema: `${SCHEMA}.verification`,
    status: findings.length ? "blocked" : "ready",
    findings,
    completionClaimAllowed: false,
    nextSafeAction: findings.length
      ? "설정 메뉴 라우트, Telegram 액션, 모델 연결 설정을 먼저 보강하세요."
      : "브라우저에서 설정 메뉴를 열고 저장/검증/실제 채팅까지 확인하세요.",
  };
}

export function renderSettingsConnectionHubHtml(state = buildSettingsConnectionHubState()) {
  const safe = escapeHtml;
  const active = state.pages.find((page) => page.route === state.activeRoute) || state.pages[0];
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>GPAO-T 설정</title>
    <style>
      :root { color-scheme: light; --bg:#f7f4ef; --panel:#fffaf3; --text:#312b25; --muted:#71675d; --line:#ded4c8; --accent:#d84d3f; --ok:#177245; }
      * { box-sizing:border-box; }
      body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:var(--bg); color:var(--text); }
      main { max-width:980px; margin:0 auto; padding:36px 22px 54px; }
      header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:22px; }
      h1 { margin:0 0 8px; font-size:30px; line-height:1.18; letter-spacing:0; }
      h2 { margin:0 0 8px; font-size:20px; letter-spacing:0; }
      h3 { margin:0 0 8px; font-size:17px; letter-spacing:0; }
      p { margin:0; color:var(--muted); line-height:1.6; }
      .tabs { display:flex; flex-wrap:wrap; gap:8px; margin:18px 0 20px; }
      .tab, .button { display:inline-flex; align-items:center; min-height:38px; padding:0 12px; border:1px solid var(--line); border-radius:7px; color:var(--text); text-decoration:none; background:#fff; font-weight:650; }
      .tab.active, .button.primary { color:#fff; background:var(--accent); border-color:var(--accent); }
      .panel, .card { border:1px solid var(--line); border-radius:8px; background:#fff; padding:18px; }
      .panel { margin-bottom:14px; }
      .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:12px; }
      .pill { display:inline-flex; align-items:center; min-height:26px; padding:0 9px; border-radius:999px; border:1px solid var(--line); color:var(--muted); font-size:13px; }
      .pill.ready, .pill.ready_candidate { color:var(--ok); border-color:rgba(23,114,69,.35); background:rgba(23,114,69,.07); }
      .actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }
      .fields { display:grid; gap:10px; margin-top:12px; }
      .field { border:1px solid var(--line); border-radius:8px; padding:13px 14px; background:var(--panel); }
      .field strong { display:block; margin-bottom:4px; }
      code { border:1px solid var(--line); background:#fff; border-radius:6px; padding:2px 6px; }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>GPAO-T 설정</h1>
          <p>모델, 채널, 프로필, 에이전트 정책을 실제 작동 경로 기준으로 확인합니다.</p>
        </div>
        <a class="button" href="/chat?session=main">채팅으로 돌아가기</a>
      </header>
      <nav class="tabs">
        ${state.pages.map((page) => `<a class="tab ${page.route === active.route ? "active" : ""}" href="${safe(page.route)}">${safe(page.label)}</a>`).join("")}
      </nav>
      <section class="panel">
        <span class="pill ${safe(active.status)}">${safe(statusLabel(active.status))}</span>
        <h2>${safe(active.title)}</h2>
        <p>${safe(active.description)}</p>
        <div class="actions">
          ${(active.actions || []).map((action) => `<a class="button" href="${safe(action.href)}">${safe(action.label)}</a>`).join("")}
        </div>
      </section>
      ${active.id === "channels" ? renderTelegramBlock(state.telegram) : ""}
      ${active.id === "general" ? renderGeneralBlock(state) : ""}
      <section class="grid">
        ${state.pages.map((page) => `
          <article class="card">
            <span class="pill ${safe(page.status)}">${safe(statusLabel(page.status))}</span>
            <h3>${safe(page.label)}</h3>
            <p>${safe(page.description)}</p>
          </article>`).join("")}
      </section>
    </main>
  </body>
</html>`;
}

function renderTelegramBlock(telegram) {
  return `
      <section class="panel">
        <span class="pill ${escapeHtml(telegram.status)}">${escapeHtml(statusLabel(telegram.status))}</span>
        <h2>${escapeHtml(telegram.userVisibleState.label)}</h2>
        <p>${escapeHtml(telegram.userVisibleState.message)}</p>
        <div class="fields">
          ${telegram.setupFields.map((field) => `
            <div class="field">
              <strong>${escapeHtml(field.label)}</strong>
              <p>${escapeHtml(field.description)}</p>
              <p><code>${escapeHtml((field.envKeys || []).join(" / ") || field.id)}</code></p>
            </div>`).join("")}
        </div>
        <div class="actions">
          ${telegram.actions.map((action) => `<a class="button ${action.id === "save_telegram_settings" ? "primary" : ""}" href="${escapeHtml(action.path)}">${escapeHtml(action.label)}</a>`).join("")}
        </div>
        <form method="post" action="/settings/channels/telegram/save" class="fields">
          <div class="field">
            <strong>Bot Token</strong>
            <input name="botToken" type="password" autocomplete="off" placeholder="123456789:AA..." style="width:100%;min-height:38px;border:1px solid var(--line);border-radius:7px;padding:0 10px;">
          </div>
          <div class="field">
            <strong>Chat ID</strong>
            <input name="chatId" type="text" placeholder="8601204821" style="width:100%;min-height:38px;border:1px solid var(--line);border-radius:7px;padding:0 10px;">
          </div>
          <label class="field" style="display:flex;gap:10px;align-items:center;">
            <input name="enabled" type="checkbox">
            <span>Enable Telegram</span>
          </label>
          <button type="submit" class="button primary" style="justify-content:center;cursor:pointer;">Telegram 설정 저장</button>
        </form>
      </section>`;
}

function renderGeneralBlock(state) {
  return `
      <section class="panel">
        <h2>런타임 설정 상태</h2>
        <p>설정 파일: <code>${escapeHtml(state.config.path)}</code></p>
        <p>상태: ${state.config.exists ? "설정 파일 확인됨" : "첫 설정 필요"}</p>
      </section>`;
}

function statusLabel(status) {
  if (status === "ready" || status === "ready_candidate") return "준비됨";
  if (status === "needs_setup") return "설정 필요";
  return status || "확인 필요";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
