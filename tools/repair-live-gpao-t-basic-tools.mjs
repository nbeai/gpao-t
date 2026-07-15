#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
export const CANONICAL_LIVE_ROOT = "/Users/jyp/.gpao-t";
export const BASIC_TOOLS_APPLY_TOKEN = "apply-gpao-t-basic-tools-live";
const DEFAULT_CONFIG_PATH = join(CANONICAL_LIVE_ROOT, "gpao-t.json");
const DEFAULT_EVIDENCE_ROOT = join(
  REPO_ROOT,
  "docs/03-verification/evidence/live-basic-tools-repair",
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
      console.log(`Usage: node tools/repair-live-gpao-t-basic-tools.mjs [--apply --approval-token ${BASIC_TOOLS_APPLY_TOKEN}]`);
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
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function readStringArray(parent, key, path) {
  if (!Object.hasOwn(parent, key)) return [];
  const value = parent[key];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error(`Config anchor ${path} must be an array of strings`);
  }
  return value;
}

function redactConfig(config) {
  return JSON.parse(JSON.stringify(config, (key, value) => {
    const lower = String(key).toLowerCase();
    if (lower.includes("token") || lower.includes("apikey") || lower.includes("password") || lower.includes("secret")) {
      return typeof value === "string" && value ? "[redacted]" : value;
    }
    return value;
  }));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isPathInside(root, candidate, allowEqual = false) {
  const rel = relative(resolve(root), resolve(candidate));
  return (allowEqual && rel === "")
    || (rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function assertRootDirectory(root, label) {
  const resolvedRoot = resolve(root);
  const stat = lstatSync(resolvedRoot);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`${label} must be a real directory: ${resolvedRoot}`);
  }
  if (realpathSync.native(resolvedRoot) !== resolvedRoot) {
    throw new Error(`${label} must not resolve through a symlink: ${resolvedRoot}`);
  }
  return resolvedRoot;
}

function assertNoSymlinkSegments(root, candidate, label) {
  const resolvedRoot = assertRootDirectory(root, `${label} root`);
  const resolvedCandidate = resolve(candidate);
  if (!isPathInside(resolvedRoot, resolvedCandidate, true)) {
    throw new Error(`${label} escapes its allowed root: ${resolvedCandidate}`);
  }
  const rel = relative(resolvedRoot, resolvedCandidate);
  if (!rel) return resolvedCandidate;
  let current = resolvedRoot;
  const parts = rel.split(sep);
  for (let index = 0; index < parts.length; index += 1) {
    current = join(current, parts[index]);
    if (!existsSync(current)) break;
    const stat = lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error(`${label} contains a symlink: ${current}`);
    if (index < parts.length - 1 && !stat.isDirectory()) {
      throw new Error(`${label} contains a non-directory path segment: ${current}`);
    }
  }
  return resolvedCandidate;
}

function ensureSafeDirectoryTree(root, candidate, label) {
  const resolvedRoot = assertRootDirectory(root, `${label} root`);
  const resolvedCandidate = assertNoSymlinkSegments(resolvedRoot, candidate, label);
  const rel = relative(resolvedRoot, resolvedCandidate);
  let current = resolvedRoot;
  for (const part of rel ? rel.split(sep) : []) {
    current = join(current, part);
    if (!existsSync(current)) mkdirSync(current, { mode: 0o700 });
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`${label} directory is unsafe: ${current}`);
    }
  }
  return resolvedCandidate;
}

function readRegularFileNoFollow(path) {
  const noFollow = constants.O_NOFOLLOW || 0;
  const fd = openSync(path, constants.O_RDONLY | noFollow);
  try {
    if (!fstatSync(fd).isFile()) throw new Error(`Live config is not a regular file: ${path}`);
    return readFileSync(fd);
  } finally {
    closeSync(fd);
  }
}

function writeExclusiveSynced(path, value, mode = 0o600) {
  const noFollow = constants.O_NOFOLLOW || 0;
  const fd = openSync(
    path,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | noFollow,
    mode,
  );
  try {
    writeFileSync(fd, value);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function writeJsonExclusive(path, value) {
  writeExclusiveSynced(path, `${JSON.stringify(value, null, 2)}\n`);
}

function fsyncDirectory(path) {
  const fd = openSync(path, constants.O_RDONLY);
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function replaceFileAtomically(path, expectedCurrent, replacement) {
  const current = readRegularFileNoFollow(path);
  if (!current.equals(expectedCurrent)) {
    throw new Error("Live config anchor changed before mutation; refusing to overwrite concurrent edits");
  }
  const temporary = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
  );
  let renamed = false;
  try {
    writeExclusiveSynced(temporary, replacement);
    renameSync(temporary, path);
    renamed = true;
    fsyncDirectory(dirname(path));
  } finally {
    if (!renamed && existsSync(temporary) && !lstatSync(temporary).isSymbolicLink()) {
      unlinkSync(temporary);
    }
  }
}

function validateTransactionPaths({
  configPath,
  stateHome,
  evidenceRoot,
  canonicalLiveRoot,
  canonicalEvidenceRoot,
  evidenceBoundary,
}) {
  const liveRoot = assertRootDirectory(canonicalLiveRoot, "Canonical GPAO-T live root");
  const resolvedStateHome = resolve(stateHome);
  const resolvedConfigPath = resolve(configPath);
  if (resolvedStateHome !== liveRoot) {
    throw new Error(`State home must equal canonical GPAO-T live root: ${liveRoot}`);
  }
  const expectedConfigPath = join(liveRoot, "gpao-t.json");
  if (resolvedConfigPath !== expectedConfigPath) {
    throw new Error(`Config path must equal canonical live config: ${expectedConfigPath}`);
  }
  assertNoSymlinkSegments(liveRoot, resolvedConfigPath, "Live config path");
  const configStat = lstatSync(resolvedConfigPath);
  if (configStat.isSymbolicLink() || !configStat.isFile()) {
    throw new Error(`Live config must be a regular non-symlink file: ${resolvedConfigPath}`);
  }
  if (realpathSync.native(resolvedConfigPath) !== resolvedConfigPath) {
    throw new Error(`Live config must not resolve through a symlink: ${resolvedConfigPath}`);
  }

  const resolvedEvidenceRoot = resolve(evidenceRoot);
  const expectedEvidenceRoot = resolve(canonicalEvidenceRoot);
  if (resolvedEvidenceRoot !== expectedEvidenceRoot) {
    throw new Error(`Evidence root must equal canonical repair evidence root: ${expectedEvidenceRoot}`);
  }
  assertNoSymlinkSegments(evidenceBoundary, resolvedEvidenceRoot, "Evidence path");
  return { liveRoot, configPath: resolvedConfigPath, evidenceRoot: resolvedEvidenceRoot };
}

export function runLiveConfigRepair({
  configPath,
  stateHome,
  evidenceRoot,
  apply = false,
  approvalToken = "",
  requiredApprovalToken,
  canonicalLiveRoot,
  canonicalEvidenceRoot,
  evidenceBoundary = dirname(canonicalEvidenceRoot),
  backupFamily,
  schema,
  patch,
  userVisibleGoal,
  reportExtra = () => ({}),
  now = new Date(),
  beforeMutation = () => {},
}) {
  const paths = validateTransactionPaths({
    configPath,
    stateHome,
    evidenceRoot,
    canonicalLiveRoot,
    canonicalEvidenceRoot,
    evidenceBoundary,
  });
  if (apply && approvalToken !== requiredApprovalToken) {
    throw new Error(`Refusing live apply without --approval-token ${requiredApprovalToken}`);
  }

  const originalBuffer = readRegularFileNoFollow(paths.configPath);
  const originalText = originalBuffer.toString("utf8");
  const parsed = JSON.parse(originalText);
  const patchResult = patch(parsed, paths);
  const { config, changes = [], findings = [] } = patchResult;
  const replacement = Buffer.from(`${JSON.stringify(config, null, 2)}\n`);
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const backupFamilyRoot = join(paths.liveRoot, "backups", backupFamily);
  if (apply) assertNoSymlinkSegments(paths.liveRoot, backupFamilyRoot, "Backup path");

  ensureSafeDirectoryTree(evidenceBoundary, paths.evidenceRoot, "Evidence path");
  const evidenceDir = join(paths.evidenceRoot, stamp);
  mkdirSync(evidenceDir, { mode: 0o700 });
  writeJsonExclusive(
    join(evidenceDir, "before.redacted.json"),
    redactConfig(JSON.parse(originalText)),
  );
  writeJsonExclusive(join(evidenceDir, "after.redacted.json"), redactConfig(config));

  const baseReport = {
    schema,
    generatedAt: now.toISOString(),
    configPath: paths.configPath,
    stateHome: paths.liveRoot,
    mode: apply ? "apply" : "dry_run",
    applied: false,
    writesPerformed: false,
    changes,
    findings,
    beforeSha256: sha256(originalBuffer),
    afterSha256: sha256(replacement),
    userVisibleGoal,
    authority: {
      applyFlagRequired: true,
      approvalTokenRequired: true,
      approvalTokenVerified: apply,
    },
    safety: {
      canonicalLiveRoot: paths.liveRoot,
      configPathCanonical: true,
      symlinkRejected: true,
      concurrentAnchorCheck: true,
      atomicReplacement: true,
      backupReceiptRequiredBeforeMutation: true,
    },
    ...reportExtra(patchResult),
  };

  if (!apply) {
    const report = {
      ...baseReport,
      status: findings.length ? "blocked" : "dry_run",
      evidenceDir,
    };
    writeJsonExclusive(join(evidenceDir, "report.json"), report);
    return report;
  }
  if (findings.length) {
    const report = { ...baseReport, status: "blocked", evidenceDir };
    writeJsonExclusive(join(evidenceDir, "report.json"), report);
    throw new Error(`Refusing live apply: ${findings.join(", ")}`);
  }
  if (!changes.length || originalBuffer.equals(replacement)) {
    const report = { ...baseReport, status: "already_compliant", evidenceDir };
    writeJsonExclusive(join(evidenceDir, "report.json"), report);
    return report;
  }

  ensureSafeDirectoryTree(paths.liveRoot, backupFamilyRoot, "Backup path");
  const backupDir = join(backupFamilyRoot, stamp);
  mkdirSync(backupDir, { mode: 0o700 });
  const backupPath = join(backupDir, "gpao-t.json");
  writeExclusiveSynced(backupPath, originalBuffer);
  const backupBuffer = readRegularFileNoFollow(backupPath);
  if (!backupBuffer.equals(originalBuffer)) throw new Error("Backup readback hash mismatch");
  const backupReceipt = {
    schema: `${schema}.backup_receipt`,
    createdAt: now.toISOString(),
    phase: "backup_complete_before_mutation",
    targetMutationStarted: false,
    configPath: paths.configPath,
    backupPath,
    configSha256: sha256(originalBuffer),
    backupSha256: sha256(backupBuffer),
    rollback: `restore ${backupPath} to ${paths.configPath}`,
  };
  writeJsonExclusive(join(backupDir, "backup-receipt.json"), backupReceipt);
  writeJsonExclusive(join(evidenceDir, "backup-receipt.json"), backupReceipt);
  fsyncDirectory(backupDir);
  fsyncDirectory(evidenceDir);

  beforeMutation({ configPath: paths.configPath, backupPath, evidenceDir });
  let mutated = false;
  try {
    replaceFileAtomically(paths.configPath, originalBuffer, replacement);
    mutated = true;
    const readback = readRegularFileNoFollow(paths.configPath);
    if (!readback.equals(replacement)) throw new Error("Live config readback hash mismatch");
    const applyReceipt = {
      schema: `${schema}.apply_receipt`,
      appliedAt: new Date().toISOString(),
      status: "applied",
      configPath: paths.configPath,
      backupPath,
      backupReceiptPath: join(backupDir, "backup-receipt.json"),
      beforeSha256: sha256(originalBuffer),
      afterSha256: sha256(readback),
      changes,
    };
    writeJsonExclusive(join(backupDir, "apply-receipt.json"), applyReceipt);
    writeJsonExclusive(join(evidenceDir, "apply-receipt.json"), applyReceipt);
    const report = {
      ...baseReport,
      status: "applied",
      applied: true,
      writesPerformed: true,
      evidenceDir,
      backupPath,
      backupReceiptPath: join(backupDir, "backup-receipt.json"),
      applyReceiptPath: join(backupDir, "apply-receipt.json"),
    };
    writeJsonExclusive(join(evidenceDir, "report.json"), report);
    return report;
  } catch (error) {
    if (mutated) replaceFileAtomically(paths.configPath, replacement, originalBuffer);
    throw error;
  }
}

export function patchConfig(config) {
  config = cloneConfig(config);
  const changes = [];

  const tools = ensureObject(config, "tools", "tools");
  const alsoAllow = sortedUnique([
    ...readStringArray(tools, "alsoAllow", "tools.alsoAllow"),
    "browser",
  ]);
  if (JSON.stringify(tools.alsoAllow) !== JSON.stringify(alsoAllow)) {
    tools.alsoAllow = alsoAllow;
    changes.push("tools.alsoAllow includes browser");
  }
  const web = ensureObject(tools, "web", "tools.web");
  const search = ensureObject(web, "search", "tools.web.search");
  if (search.enabled !== true) {
    search.enabled = true;
    changes.push("tools.web.search.enabled=true");
  }
  if (search.provider !== "duckduckgo") {
    search.provider = "duckduckgo";
    changes.push("tools.web.search.provider=duckduckgo");
  }
  if (search.maxResults !== 5) {
    search.maxResults = 5;
    changes.push("tools.web.search.maxResults=5");
  }
  if (search.cacheTtlMinutes !== 15) {
    search.cacheTtlMinutes = 15;
    changes.push("tools.web.search.cacheTtlMinutes=15");
  }

  const plugins = ensureObject(config, "plugins", "plugins");
  const entries = ensureObject(plugins, "entries", "plugins.entries");
  const duckduckgo = ensureObject(entries, "duckduckgo", "plugins.entries.duckduckgo");
  if (duckduckgo.enabled !== true) {
    duckduckgo.enabled = true;
    changes.push("plugins.entries.duckduckgo.enabled=true");
  }
  const duckConfig = ensureObject(duckduckgo, "config", "plugins.entries.duckduckgo.config");
  const duckWebSearch = ensureObject(
    duckConfig,
    "webSearch",
    "plugins.entries.duckduckgo.config.webSearch",
  );
  if (duckWebSearch.region !== "kr-kr") {
    duckWebSearch.region = "kr-kr";
    changes.push("plugins.entries.duckduckgo.config.webSearch.region=kr-kr");
  }
  if (duckWebSearch.safeSearch !== "moderate") {
    duckWebSearch.safeSearch = "moderate";
    changes.push("plugins.entries.duckduckgo.config.webSearch.safeSearch=moderate");
  }
  const webReadability = ensureObject(
    entries,
    "web-readability",
    "plugins.entries.web-readability",
  );
  if (webReadability.enabled !== true) {
    webReadability.enabled = true;
    changes.push("plugins.entries.web-readability.enabled=true");
  }
  const pluginAllow = sortedUnique([
    ...readStringArray(plugins, "allow", "plugins.allow"),
    "codex",
    "duckduckgo",
    "openai",
    "telegram",
    "memory-core",
    "web-readability",
  ]);
  if (JSON.stringify(plugins.allow) !== JSON.stringify(pluginAllow)) {
    plugins.allow = pluginAllow;
    changes.push("plugins.allow includes codex/duckduckgo/web-readability");
  }

  const agents = ensureObject(config, "agents", "agents");
  const defaults = ensureObject(agents, "defaults", "agents.defaults");
  const memorySearch = ensureObject(defaults, "memorySearch", "agents.defaults.memorySearch");
  if (memorySearch.enabled !== true) {
    memorySearch.enabled = true;
    changes.push("agents.defaults.memorySearch.enabled=true");
  }
  if (memorySearch.provider !== "none") {
    memorySearch.provider = "none";
    changes.push("agents.defaults.memorySearch.provider=none");
  }
  if (memorySearch.fallback !== "none") {
    memorySearch.fallback = "none";
    changes.push("agents.defaults.memorySearch.fallback=none");
  }
  const experimental = ensureObject(
    memorySearch,
    "experimental",
    "agents.defaults.memorySearch.experimental",
  );
  if (experimental.sessionMemory !== true) {
    experimental.sessionMemory = true;
    changes.push("agents.defaults.memorySearch.experimental.sessionMemory=true");
  }
  const memorySources = sortedUnique([
    ...readStringArray(memorySearch, "sources", "agents.defaults.memorySearch.sources"),
    "memory",
    "sessions",
  ]);
  if (JSON.stringify(memorySearch.sources) !== JSON.stringify(memorySources)) {
    memorySearch.sources = memorySources;
    changes.push("agents.defaults.memorySearch.sources includes memory/sessions");
  }
  const store = ensureObject(memorySearch, "store", "agents.defaults.memorySearch.store");
  const fts = ensureObject(store, "fts", "agents.defaults.memorySearch.store.fts");
  if (fts.tokenizer !== "trigram") {
    fts.tokenizer = "trigram";
    changes.push("agents.defaults.memorySearch.store.fts.tokenizer=trigram");
  }
  const query = ensureObject(memorySearch, "query", "agents.defaults.memorySearch.query");
  if (query.maxResults !== 6) {
    query.maxResults = 6;
    changes.push("agents.defaults.memorySearch.query.maxResults=6");
  }
  const sync = ensureObject(memorySearch, "sync", "agents.defaults.memorySearch.sync");
  if (sync.onSearch !== true) {
    sync.onSearch = true;
    changes.push("agents.defaults.memorySearch.sync.onSearch=true");
  }
  if (sync.watch !== true) {
    sync.watch = true;
    changes.push("agents.defaults.memorySearch.sync.watch=true");
  }

  const sessions = ensureObject(tools, "sessions", "tools.sessions");
  if (sessions.visibility !== "agent") {
    sessions.visibility = "agent";
    changes.push("tools.sessions.visibility=agent");
  }

  return { config, changes };
}

export function runBasicToolsRepair(options = {}, safety = {}) {
  return runLiveConfigRepair({
    configPath: options.config ?? DEFAULT_CONFIG_PATH,
    stateHome: options.stateHome ?? CANONICAL_LIVE_ROOT,
    evidenceRoot: options.evidenceRoot ?? DEFAULT_EVIDENCE_ROOT,
    apply: options.apply ?? false,
    approvalToken: options.approvalToken ?? "",
    requiredApprovalToken: BASIC_TOOLS_APPLY_TOKEN,
    canonicalLiveRoot: safety.canonicalLiveRoot ?? CANONICAL_LIVE_ROOT,
    canonicalEvidenceRoot: safety.canonicalEvidenceRoot ?? DEFAULT_EVIDENCE_ROOT,
    evidenceBoundary: safety.evidenceBoundary
      ?? dirname(safety.canonicalEvidenceRoot ?? DEFAULT_EVIDENCE_ROOT),
    backupFamily: "basic-tools-repair",
    schema: "gpao_t.live_basic_tools_repair.v1",
    patch: (config) => patchConfig(config),
    userVisibleGoal: "web_search and web_readability work by default and memory_search no longer depends on remote embedding quota",
    now: safety.now ?? new Date(),
    beforeMutation: safety.beforeMutation,
  });
}

function main() {
  const report = runBasicToolsRepair(parseArgs(process.argv.slice(2)));
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
