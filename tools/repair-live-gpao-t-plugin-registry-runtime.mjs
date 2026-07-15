#!/usr/bin/env node
import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APPLY_TOKEN = "apply-gpao-t-plugin-registry-runtime";
const DEFAULT_PLIST = "/Users/jyp/Library/LaunchAgents/ai.nbeai.gpao-t.plist";
const DEFAULT_STATE_HOME = "/Users/jyp/.gpao-t";
const LEGACY_DISABLE_KEYS = [
  "OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY",
  "OPENCLAW_DISABLE_PLUGIN_REGISTRY_MIGRATION",
];

function parseArgs(argv) {
  const args = { plist: DEFAULT_PLIST, stateHome: DEFAULT_STATE_HOME, apply: false, token: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--plist") args.plist = argv[++index];
    else if (arg === "--state-home") args.stateHome = argv[++index];
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--token") args.token = argv[++index] || "";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

export function patchLaunchAgentPlist(source) {
  let next = source;
  const removed = [];
  for (const key of LEGACY_DISABLE_KEYS) {
    const pattern = new RegExp(`\\n\\s*<key>${key}<\\/key>\\s*\\n\\s*<string>1<\\/string>`, "g");
    if (pattern.test(next)) removed.push(key);
    next = next.replace(pattern, "");
  }
  return { source: next, removed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const plistPath = resolve(args.plist);
  const before = await readFile(plistPath, "utf8");
  const patched = patchLaunchAgentPlist(before);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(resolve(args.stateHome), "backups", "plugin-registry-runtime", stamp, "ai.nbeai.gpao-t.plist.before");
  const report = {
    schema: "gpao_t.plugin_registry_runtime_repair.v0_1",
    status: args.apply ? "ready_to_apply" : "dry_run",
    plistPath,
    changed: before !== patched.source,
    removed: patched.removed,
    backupPath: args.apply ? backupPath : null,
    restartRequired: before !== patched.source,
  };

  if (!args.apply) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (args.token !== APPLY_TOKEN) throw new Error(`Refusing live apply without --token ${APPLY_TOKEN}`);
  if (report.changed) {
    await mkdir(dirname(backupPath), { recursive: true });
    await copyFile(plistPath, backupPath);
    await chmod(backupPath, 0o600);
    await writeFile(plistPath, patched.source);
  }
  console.log(JSON.stringify({ ...report, status: "applied" }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
