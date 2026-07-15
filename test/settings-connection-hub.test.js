import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildSettingsConnectionHubState,
  buildTelegramConnectionState,
  handleGatewayRequest,
  renderSettingsConnectionHubHtml,
  verifySettingsConnectionHubState,
} from "../src/index.js";
import { saveTelegramSettingsToConfig } from "../src/core/settings-connection-hub.js";

test("settings hub exposes all ordinary settings routes with real state and actions", () => {
  const state = buildSettingsConnectionHubState({
    configRead: {
      exists: true,
      reason: "fixture",
      config: {
        channels: {
          telegram: {
            enabled: false,
          },
        },
      },
    },
    now: "2026-07-15T00:00:00.000Z",
  });
  const verification = verifySettingsConnectionHubState(state);
  const html = renderSettingsConnectionHubHtml({ ...state, activeRoute: "/settings/channels" });

  assert.equal(state.schema, "gpao_t.settings_connection_hub.v1");
  assert.equal(state.config.secretValuesExposed, false);
  for (const route of [
    "/settings/general",
    "/settings/model-connection",
    "/settings/channels",
    "/settings/profile",
    "/settings/ai-agents",
  ]) {
    assert.equal(state.pages.some((page) => page.route === route), true, route);
  }
  assert.equal(state.telegram.secretSafety.rawTokenReturned, false);
  assert.equal(state.telegram.actions.some((action) => action.path === "/settings/channels/telegram/save"), true);
  assert.equal(state.telegram.actions.some((action) => action.path === "/settings/channels/telegram/verify-connection"), true);
  assert.match(html, /Telegram 연결 설정 필요/);
  assert.match(html, /Bot Token/);
  assert.match(html, /Chat ID/);
  assert.match(html, /GPAO_T_TELEGRAM_BOT_TOKEN/);
  assert.doesNotMatch(html, /[0-9]{8,}:[A-Za-z0-9_-]{20,}/);
  assert.equal(verification.status, "ready");
});

test("telegram state becomes ready candidate when enabled token and chat id are configured", () => {
  const state = buildTelegramConnectionState({
    configRead: {
      exists: true,
      reason: "fixture",
      config: {
        channels: {
          telegram: {
            enabled: true,
            botTokenRef: "GPAO_T_TELEGRAM_BOT_TOKEN",
            chatId: "8601204821",
          },
        },
      },
    },
    env: {},
    now: "2026-07-15T00:00:00.000Z",
  });

  assert.equal(state.status, "ready_candidate");
  assert.equal(state.configured.botToken, true);
  assert.equal(state.configured.chatId, true);
  assert.equal(state.secretSafety.rawTokenReturned, false);
  assert.deepEqual(state.findings, []);
});

test("gateway settings routes return visible pages and verification state", () => {
  for (const route of [
    "/settings",
    "/settings/general",
    "/settings/channels",
    "/settings/profile",
    "/settings/ai-agents",
  ]) {
    const response = handleGatewayRequest({ method: "GET", path: route });
    assert.equal(response.status, 200, route);
    assert.equal(response.headers["content-type"], "text/html; charset=utf-8");
    assert.match(response.body, /GPAO-T 설정/);
  }

  const state = handleGatewayRequest({ method: "GET", path: "/settings/state" });
  const verify = handleGatewayRequest({ method: "GET", path: "/settings/verify" });
  const telegram = handleGatewayRequest({ method: "GET", path: "/settings/channels/telegram/state" });
  const telegramVerify = handleGatewayRequest({ method: "GET", path: "/settings/channels/telegram/verify" });
  const telegramSave = handleGatewayRequest({ method: "POST", path: "/settings/channels/telegram/save" });

  assert.equal(state.body.schema, "gpao_t.settings_connection_hub.v1");
  assert.equal(verify.body.schema, "gpao_t.settings_connection_hub.v1.verification");
  assert.equal(verify.body.status, "ready");
  assert.equal(telegram.body.schema, "gpao_t.settings_connection_hub.v1.telegram");
  assert.equal(telegram.body.secretSafety.rawTokenReturned, false);
  assert.equal(telegramVerify.body.schema, "gpao_t.telegram_settings_verification.v1");
  assert.equal(telegramSave.status, 202);
  assert.equal(telegramSave.body.secretValuesExposed, false);
});

test("telegram settings save writes local config without echoing secret values", async () => {
  const root = await mkdtemp(join(tmpdir(), "gpao-t-telegram-settings-"));
  const configPath = join(root, "gpao-t.json");
  try {
    const result = saveTelegramSettingsToConfig({
      configPath,
      form: {
        botToken: "123456789:AA_secret_fixture_token_value",
        chatId: "8601204821",
        enabled: "on",
      },
      now: "2026-07-15T00:00:00.000Z",
    });
    const raw = await readFile(configPath, "utf8");
    const config = JSON.parse(raw);

    assert.equal(result.status, "saved");
    assert.equal(result.secretValuesExposed, false);
    assert.equal(result.saved.botTokenPresent, true);
    assert.equal(result.saved.chatIdPresent, true);
    assert.equal(result.telegram.status, "ready_candidate");
    assert.equal(config.channels.telegram.enabled, true);
    assert.equal(config.channels.telegram.chatId, "8601204821");
    assert.equal(config.channels.telegram.botToken, "123456789:AA_secret_fixture_token_value");
    assert.equal(config.channels.telegram.botTokenRef, undefined);
    assert.equal(config.channels.telegram.userVisible, undefined);
    assert.doesNotMatch(JSON.stringify(result), /AA_secret_fixture_token_value/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
