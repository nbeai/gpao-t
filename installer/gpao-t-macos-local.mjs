#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  applyInstall,
  applyRollback,
  createInstallPlan,
  createRollbackPlan,
  defaultOptions,
  formatHuman,
  healthCheck,
} from "../tools/gpao-t-local-install-lib.mjs";

function usage() {
  return `nBeAI. GPAO-T macOS local installer

Usage:
  node installer/gpao-t-macos-local.mjs [install|preflight] [options]
  node installer/gpao-t-macos-local.mjs health [options]
  node installer/gpao-t-macos-local.mjs rollback --snapshot <id> [options]

Safety:
  Dry-run is the default. Install and rollback write nothing unless both
  --apply and the exact operation-bound --apply-token are provided.

Options:
  --release <path>             Distribution root
  --state-home <path>          GPAO-T state root (default: ~/.gpao-t)
  --openclaw-home <path>       Existing OpenClaw state root
  --launch-agents-dir <path>   LaunchAgents directory
  --migration-profile <name>   standard | none
  --port <number>              Dedicated gateway port (default: 18799)
  --snapshot <id>              Snapshot to roll back
  --apply                      Enable the mutation lane
  --apply-token <token>        Exact token printed by the dry-run plan
  --json                       Machine-readable output (JSON is also default)
  --help                       Show this help
`;
}

function parseArgs(argv, defaults) {
  const args = [...argv];
  let command = "install";
  if (args[0] && !args[0].startsWith("-")) command = args.shift();
  const options = { ...defaults, command, snapshotId: null };
  const valueFlags = new Map([
    ["--release", "release"],
    ["--state-home", "stateHome"],
    ["--openclaw-home", "openclawHome"],
    ["--launch-agents-dir", "launchAgentsDir"],
    ["--migration-profile", "migrationProfile"],
    ["--port", "port"],
    ["--snapshot", "snapshotId"],
    ["--apply-token", "applyToken"],
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--apply") options.apply = true;
    else if (arg === "--json") options.json = true;
    else if (valueFlags.has(arg)) {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      options[valueFlags.get(arg)] = value;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  options.release = resolve(options.release);
  options.stateHome = resolve(options.stateHome);
  options.openclawHome = resolve(options.openclawHome);
  options.launchAgentsDir = resolve(options.launchAgentsDir);
  if (!Number.isInteger(Number(options.port)) || Number(options.port) < 1024 || Number(options.port) > 65535) {
    throw new Error(`Invalid --port: ${options.port}`);
  }
  options.port = Number(options.port);
  return options;
}

async function main() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const defaults = defaultOptions({ scriptDir, workspaceRoot: resolve(scriptDir, "..") });
  const options = parseArgs(process.argv.slice(2), defaults);
  if (options.help) {
    process.stdout.write(usage());
    return;
  }
  if (!["install", "preflight", "health", "rollback"].includes(options.command)) {
    throw new Error(`Unknown command: ${options.command}`);
  }
  if (options.command === "health") {
    process.stdout.write(formatHuman(await healthCheck(options)));
    return;
  }
  if (options.command === "rollback") {
    const plan = await createRollbackPlan(options);
    if (!options.apply) {
      process.stdout.write(formatHuman({ status: "dry-run", writesPerformed: false, plan }));
      return;
    }
    process.stdout.write(formatHuman(await applyRollback(plan, options)));
    return;
  }
  const plan = await createInstallPlan(options);
  if (options.command === "preflight" || !options.apply) {
    process.stdout.write(formatHuman({
      status: plan.blockers.length === 0 ? "dry-run-ready" : "dry-run-blocked",
      writesPerformed: false,
      serviceActionsPerformed: false,
      plan,
    }));
    if (plan.blockers.length > 0) process.exitCode = 2;
    return;
  }
  process.stdout.write(formatHuman(await applyInstall(plan, options)));
}

main().catch((error) => {
  process.stderr.write(formatHuman({ status: "refused", writesPerformed: false, error: error.message }));
  process.exitCode = 1;
});

