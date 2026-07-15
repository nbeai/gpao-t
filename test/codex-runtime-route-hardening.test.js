import assert from "node:assert/strict";
import { test } from "node:test";

import {
  disableInheritedExternalConnections,
  normalizeGpaoTPluginConfig,
  normalizeGpaoTRuntimeConfig,
} from "../tools/gpao-t-local-install-lib.mjs";
import { patchConfig as patchBasicToolsConfig } from "../tools/repair-live-gpao-t-basic-tools.mjs";
import { patchConfig } from "../tools/repair-live-gpao-t-doctor-warnings.mjs";
import { patchLaunchAgentPlist } from "../tools/repair-live-gpao-t-plugin-registry-runtime.mjs";

function configWithOpenAiRoute() {
  return {
    agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    plugins: {
      allow: ["openai", "telegram"],
      entries: {
        codex: { enabled: false, config: { appServer: { homeScope: "agent" } } },
      },
    },
  };
}

test("installer keeps the compatible Codex runtime route enabled", () => {
  const config = normalizeGpaoTPluginConfig(configWithOpenAiRoute());

  assert.equal(config.plugins.entries.codex.enabled, true);
  assert.equal(config.plugins.entries.codex.config.appServer.homeScope, "agent");
  assert.ok(config.plugins.allow.includes("codex"));
  assert.ok(config.plugins.allow.includes("openai"));
  assert.ok(config.plugins.allow.includes("memory-core"));
});

test("doctor repair refuses to enable an uninstalled Codex runtime plugin", () => {
  const result = patchConfig(configWithOpenAiRoute(), { codexPluginInstalled: false });

  assert.deepEqual(result.changes, []);
  assert.deepEqual(result.findings, ["codex_runtime_plugin_not_installed"]);
  assert.equal(result.config.plugins.entries.codex.enabled, false);
  assert.equal(result.inputs.appliedStrategy, "blocked_until_compatible_codex_runtime_plugin_is_installed");
});

test("doctor repair enables an installed compatible Codex runtime plugin", () => {
  const result = patchConfig(configWithOpenAiRoute(), { codexPluginInstalled: true });

  assert.deepEqual(result.findings, []);
  assert.ok(result.changes.includes("plugins.entries.codex.enabled=true"));
  assert.ok(result.changes.includes("plugins.allow includes codex"));
  assert.equal(result.config.plugins.entries.codex.enabled, true);
  assert.ok(result.config.plugins.allow.includes("codex"));
});

test("installer enables same-agent session recall without auto-enabling browser mutation", () => {
  const config = normalizeGpaoTRuntimeConfig(configWithOpenAiRoute());

  assert.equal(config.agents.defaults.memorySearch.experimental.sessionMemory, true);
  assert.deepEqual(config.agents.defaults.memorySearch.sources, ["memory", "sessions"]);
  assert.equal(config.tools.sessions.visibility, "agent");
  assert.equal(config.tools.alsoAllow.includes("browser"), false);
});

test("installer migration disables inherited external connections until separately enabled", () => {
  const config = disableInheritedExternalConnections({
    channels: { telegram: { enabled: true, botToken: "secret-ref" } },
    webhooks: { enabled: true },
    hooks: { enabled: true },
    plugins: {
      allow: ["telegram", "browser"],
      entries: { telegram: { enabled: true } },
    },
    tools: { alsoAllow: ["browser"] },
  });

  assert.equal(config.channels.telegram.enabled, false);
  assert.equal(config.webhooks.enabled, false);
  assert.equal(config.hooks.enabled, false);
  assert.equal(config.plugins.entries.telegram.enabled, false);
  assert.equal(config.plugins.allow.includes("telegram"), false);
  assert.equal(config.tools.alsoAllow.includes("browser"), false);
});

test("basic-tools repair keeps session recall local and agent-scoped", () => {
  const { config, changes } = patchBasicToolsConfig(configWithOpenAiRoute());

  assert.equal(config.agents.defaults.memorySearch.provider, "none");
  assert.equal(config.agents.defaults.memorySearch.experimental.sessionMemory, true);
  assert.deepEqual(config.agents.defaults.memorySearch.sources, ["memory", "sessions"]);
  assert.equal(config.tools.sessions.visibility, "agent");
  assert.ok(config.tools.alsoAllow.includes("browser"));
  assert.ok(changes.includes("tools.alsoAllow includes browser"));
  assert.ok(changes.includes("tools.sessions.visibility=agent"));
});

test("LaunchAgent keeps the external plugin registry available for Codex", () => {
  const source = `<dict>\n<key>OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY</key>\n<string>1</string>\n<key>OPENCLAW_DISABLE_PLUGIN_REGISTRY_MIGRATION</key>\n<string>1</string>\n</dict>`;
  const result = patchLaunchAgentPlist(source);

  assert.deepEqual(result.removed, [
    "OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY",
    "OPENCLAW_DISABLE_PLUGIN_REGISTRY_MIGRATION",
  ]);
  assert.doesNotMatch(result.source, /DISABLE_PERSISTED_PLUGIN_REGISTRY/);
  assert.doesNotMatch(result.source, /DISABLE_PLUGIN_REGISTRY_MIGRATION/);
});
