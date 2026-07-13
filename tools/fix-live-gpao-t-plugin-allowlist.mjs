#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DEFAULT_CONFIG_PATH = "/Users/jyp/.gpao-t/gpao-t.json";
const DEFAULT_EVIDENCE_ROOT =
  "/Users/jyp/Developer/gpao-t/docs/03-verification/evidence/live-plugin-allowlist";
const DEFAULT_ALLOWED_PLUGINS = ["telegram", "openai", "memory-core"];
const REQUIRED_APPROVAL_TOKEN = "GPAO-T-LIVE-PLUGIN-ALLOWLIST-2026-07-12";

function hasArg(name) {
  return process.argv.includes(name);
}

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function readCsvArg(name, fallback) {
  const raw = readArg(name, fallback.join(","));
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function isoStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function stableUnique(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))].sort();
}

async function sha256(path) {
  const content = await readFile(path);
  return createHash("sha256").update(content).digest("hex");
}

function normalizeOpenClawConfig(config, allowedPlugins) {
  const next = JSON.parse(JSON.stringify(config));
  next.plugins = next.plugins && typeof next.plugins === "object" ? next.plugins : {};
  next.plugins.allow = stableUnique(allowedPlugins);
  next.plugins.entries = next.plugins.entries && typeof next.plugins.entries === "object"
    ? next.plugins.entries
    : {};
  if (next.plugins.entries.codex && typeof next.plugins.entries.codex === "object") {
    next.plugins.entries.codex = { enabled: false };
  }
  for (const pluginId of next.plugins.allow) {
    next.plugins.entries[pluginId] = {
      ...(next.plugins.entries[pluginId] && typeof next.plugins.entries[pluginId] === "object"
        ? next.plugins.entries[pluginId]
        : {}),
      enabled: true,
    };
  }
  return next;
}

async function buildManifest({ configPath, evidenceRoot, allowedPlugins, apply, backupPath }) {
  const before = JSON.parse(await readFile(configPath, "utf8"));
  const after = normalizeOpenClawConfig(before, allowedPlugins);
  const beforeAllow = Array.isArray(before.plugins?.allow) ? before.plugins.allow : [];
  const afterText = `${JSON.stringify(after, null, 2)}\n`;
  const beforeText = `${JSON.stringify(before, null, 2)}\n`;
  return {
    schema: "gpao_t.live_plugin_allowlist_fix.v0_1",
    status: apply ? "ready_to_apply" : "dry_run_ready_live_not_mutated",
    createdAt: new Date().toISOString(),
    authority: {
      applyFlagRequired: true,
      approvalTokenRequired: true,
      requiredApprovalToken: REQUIRED_APPROVAL_TOKEN,
      liveMutationExecuted: false,
    },
    paths: {
      configPath,
      evidenceRoot,
      backupPath,
    },
    before: {
      sha256: await sha256(configPath),
      pluginsAllow: beforeAllow,
      pluginEntries: Object.keys(before.plugins?.entries || {}).sort(),
    },
    after: {
      pluginsAllow: after.plugins.allow,
      pluginEntries: Object.keys(after.plugins?.entries || {}).sort(),
    },
    changed: beforeText !== afterText,
    plannedOperations: [
      "backup ~/.gpao-t/gpao-t.json",
      "set explicit plugins.allow for trusted live GPAO-T plugins",
      "enable matching installed plugins.entries ids",
      "disable codex plugin entry unless a first-class GPAO-T Codex plugin is installed",
      "leave bundled provider discovery and channel configuration unchanged",
    ],
    rollback: {
      restoreFrom: backupPath,
      restartGatewayAfterRestore: true,
    },
  };
}

async function main() {
  const configPath = readArg("--config", DEFAULT_CONFIG_PATH);
  const evidenceRoot = readArg("--evidence-root", DEFAULT_EVIDENCE_ROOT);
  const allowedPlugins = stableUnique(readCsvArg("--allow", DEFAULT_ALLOWED_PLUGINS));
  const apply = hasArg("--apply");
  const backupDir = join(evidenceRoot, `plugin-allowlist-${isoStamp()}`);
  const backupPath = join(backupDir, "openclaw.json.before");

  if (!existsSync(configPath)) {
    throw new Error(`openclaw_config_missing:${configPath}`);
  }

  const manifest = await buildManifest({
    configPath,
    evidenceRoot,
    allowedPlugins,
    apply,
    backupPath,
  });

  if (!apply) {
    const dryRunDir = join(evidenceRoot, `plugin-allowlist-${isoStamp()}`);
    await mkdir(dryRunDir, { recursive: true });
    await writeFile(join(dryRunDir, "dry-run-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  const findings = [];
  if (readArg("--approval-token") !== REQUIRED_APPROVAL_TOKEN) {
    findings.push("approval_token_missing_or_invalid");
  }
  if (!allowedPlugins.includes("telegram")) findings.push("telegram_plugin_not_allowlisted");
  if (findings.length) {
    console.error(JSON.stringify({
      schema: "gpao_t.live_plugin_allowlist_fix_refusal.v0_1",
      status: "blocked_before_live_mutation",
      findings,
      requiredApprovalToken: REQUIRED_APPROVAL_TOKEN,
      liveMutationExecuted: false,
    }, null, 2));
    process.exit(1);
  }

  await mkdir(dirname(backupPath), { recursive: true });
  await cp(configPath, backupPath);
  const before = JSON.parse(await readFile(configPath, "utf8"));
  const after = normalizeOpenClawConfig(before, allowedPlugins);
  await writeFile(configPath, `${JSON.stringify(after, null, 2)}\n`);

  const applied = {
    ...manifest,
    status: "applied",
    authority: {
      ...manifest.authority,
      liveMutationExecuted: true,
    },
    applied: {
      backupPath,
      afterSha256: await sha256(configPath),
    },
  };
  await writeFile(join(backupDir, "manifest.json"), `${JSON.stringify(applied, null, 2)}\n`);
  console.log(JSON.stringify(applied, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    schema: "gpao_t.live_plugin_allowlist_fix_error.v0_1",
    status: "error",
    message: error instanceof Error ? error.message : String(error),
    liveMutationMayHaveExecuted: hasArg("--apply"),
  }, null, 2));
  process.exit(1);
});
