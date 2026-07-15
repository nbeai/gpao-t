#!/usr/bin/env node
import { existsSync, lstatSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_LIVE_ROOT,
  runLiveConfigRepair,
} from "./repair-live-gpao-t-basic-tools.mjs";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
export const DOCTOR_WARNINGS_APPLY_TOKEN = "apply-gpao-t-doctor-warnings-live";
const DEFAULT_CONFIG_PATH = join(CANONICAL_LIVE_ROOT, "gpao-t.json");
const DEFAULT_EVIDENCE_ROOT = join(
  REPO_ROOT,
  "docs/03-verification/evidence/live-doctor-warning-repair",
);

function parseArgs(argv) {
  const args = {
    config: DEFAULT_CONFIG_PATH,
    stateHome: CANONICAL_LIVE_ROOT,
    evidenceRoot: DEFAULT_EVIDENCE_ROOT,
    apply: false,
    approvalToken: "",
  };
  const seen = new Set();
  const readValue = (name, index) => {
    if (seen.has(name)) throw new Error(`Duplicate argument: ${name}`);
    seen.add(name);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
    return value;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--config") args.config = readValue(arg, index++);
    else if (arg === "--state-home") args.stateHome = readValue(arg, index++);
    else if (arg === "--evidence-root") args.evidenceRoot = readValue(arg, index++);
    else if (arg === "--apply") {
      if (seen.has(arg)) throw new Error(`Duplicate argument: ${arg}`);
      seen.add(arg);
      args.apply = true;
    } else if (arg === "--approval-token" || arg === "--token") {
      if (seen.has("approval-token")) throw new Error("Duplicate approval token argument");
      seen.add("approval-token");
      args.approvalToken = readValue(arg, index++);
    }
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: node tools/repair-live-gpao-t-doctor-warnings.mjs [--apply --approval-token ${DOCTOR_WARNINGS_APPLY_TOKEN}]`);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function cloneConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Config root anchor must be an object");
  }
  return JSON.parse(JSON.stringify(config));
}

function ensureObject(parent, key, path = key) {
  const current = parent[key];
  if (current && typeof current === "object" && !Array.isArray(current)) return current;
  if (Object.hasOwn(parent, key)) {
    throw new Error(`Config anchor ${path} must be an object`);
  }
  const next = {};
  parent[key] = next;
  return next;
}

function sortedUnique(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))].sort();
}

function readStringArray(parent, key, path) {
  if (!Object.hasOwn(parent, key)) return null;
  const value = parent[key];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`Config anchor ${path} must be an array of strings`);
  }
  return value;
}

function readOptionalObject(parent, key, path) {
  if (!Object.hasOwn(parent, key)) return null;
  return ensureObject(parent, key, path);
}

function hasInstalledCodexPlugin(stateHome) {
  const projectsRoot = join(stateHome, "npm", "projects");
  if (!existsSync(projectsRoot)) return false;
  const projectsStat = lstatSync(projectsRoot);
  if (projectsStat.isSymbolicLink() || !projectsStat.isDirectory()) {
    throw new Error(`Codex plugin projects root is unsafe: ${projectsRoot}`);
  }
  for (const project of readdirSync(projectsRoot)) {
    const projectRoot = join(projectsRoot, project);
    let current = projectRoot;
    const projectStat = lstatSync(current);
    if (projectStat.isSymbolicLink()) {
      throw new Error(`Codex plugin project path contains a symlink: ${current}`);
    }
    if (!projectStat.isDirectory()) continue;
    const packagePaths = [
      ["node_modules", "@gpao-t", "codex", "package.json"],
      ["node_modules", "@openclaw", "codex", "package.json"],
    ];
    for (const segments of packagePaths) {
      current = projectRoot;
      for (let index = 0; index < segments.length; index += 1) {
        current = join(current, segments[index]);
        if (!existsSync(current)) break;
        const stat = lstatSync(current);
        if (stat.isSymbolicLink()) {
          throw new Error(`Codex plugin path contains a symlink: ${current}`);
        }
        if (index < segments.length - 1 && !stat.isDirectory()) break;
        if (index === segments.length - 1) {
          if (!stat.isFile()) throw new Error(`Codex plugin manifest is not a file: ${current}`);
          return true;
        }
      }
    }
  }
  return false;
}

export function patchConfig(config, { codexPluginInstalled = false } = {}) {
  config = cloneConfig(config);
  const changes = [];
  const findings = [];
  const agents = readOptionalObject(config, "agents", "agents");
  const defaults = agents ? readOptionalObject(agents, "defaults", "agents.defaults") : null;
  const model = defaults ? readOptionalObject(defaults, "model", "agents.defaults.model") : null;
  const primaryModel = model?.primary;
  const usesCodexRuntimeRoute = typeof primaryModel === "string" && primaryModel.startsWith("openai/");

  if (usesCodexRuntimeRoute) {
    const plugins = ensureObject(config, "plugins", "plugins");
    if (!codexPluginInstalled) {
      findings.push("codex_runtime_plugin_not_installed");
      return {
        config,
        changes,
        findings,
        inputs: {
          primaryModel,
          usesCodexRuntimeRoute,
          codexPluginInstalled,
          appliedStrategy: "blocked_until_compatible_codex_runtime_plugin_is_installed",
        },
      };
    }
    const entries = ensureObject(plugins, "entries", "plugins.entries");
    const codex = ensureObject(entries, "codex", "plugins.entries.codex");
    if (codex.enabled !== true) {
      codex.enabled = true;
      changes.push("plugins.entries.codex.enabled=true");
    }
    const pluginAllow = readStringArray(plugins, "allow", "plugins.allow");
    if (pluginAllow?.length > 0 && !pluginAllow.includes("codex")) {
      plugins.allow = sortedUnique([...pluginAllow, "codex"]);
      changes.push("plugins.allow includes codex");
    }
  }

  return {
    config,
    changes,
    findings,
    inputs: {
      primaryModel,
      usesCodexRuntimeRoute,
      codexPluginInstalled,
      appliedStrategy: usesCodexRuntimeRoute ? "enable_codex_entry" : "no_codex_runtime_route_detected",
    },
  };
}

export function runDoctorWarningsRepair(options = {}, safety = {}) {
  const stateHome = options.stateHome ?? CANONICAL_LIVE_ROOT;
  return runLiveConfigRepair({
    configPath: options.config ?? DEFAULT_CONFIG_PATH,
    stateHome,
    evidenceRoot: options.evidenceRoot ?? DEFAULT_EVIDENCE_ROOT,
    apply: options.apply ?? false,
    approvalToken: options.approvalToken ?? "",
    requiredApprovalToken: DOCTOR_WARNINGS_APPLY_TOKEN,
    canonicalLiveRoot: safety.canonicalLiveRoot ?? CANONICAL_LIVE_ROOT,
    canonicalEvidenceRoot: safety.canonicalEvidenceRoot ?? DEFAULT_EVIDENCE_ROOT,
    evidenceBoundary: safety.evidenceBoundary
      ?? dirname(safety.canonicalEvidenceRoot ?? DEFAULT_EVIDENCE_ROOT),
    backupFamily: "doctor-warning-repair",
    schema: "gpao_t.live_doctor_warning_repair.v1",
    patch: (config) => patchConfig(config, {
      codexPluginInstalled: hasInstalledCodexPlugin(stateHome),
    }),
    userVisibleGoal: "Codex runtime route doctor warning is repaired without broad doctor --fix side effects.",
    reportExtra: ({ inputs }) => ({
      inputs,
      remainingKnownDoctorLane: "SecretRefs plaintext warning requires a separate secret migration.",
    }),
    now: safety.now ?? new Date(),
    beforeMutation: safety.beforeMutation,
  });
}

function main() {
  const report = runDoctorWarningsRepair(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
