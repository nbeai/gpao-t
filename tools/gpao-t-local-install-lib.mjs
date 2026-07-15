import { createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import {
  constants,
  createReadStream,
  promises as fs,
} from "node:fs";
import { homedir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { promisify } from "node:util";
import net from "node:net";
import {
  buildProviderAuthRepairPlan,
  inspectProviderAuthStores,
  verifyProviderAuthHeart,
} from "../src/core/provider-auth-heart.js";
import {
  buildDoctorRecoveryHeart,
  verifyDoctorRecoveryHeart,
} from "../src/core/doctor-recovery-heart.js";

const execFileAsync = promisify(execFile);

export const INSTALL_SCHEMA = "gpao_t.macos_local_install.v1";
export const SNAPSHOT_SCHEMA = "gpao_t.macos_local_snapshot.v1";
export const BACKUP_SCHEMA = "gpao_t.openclaw_backup.v1";
export const RECEIPT_SCHEMA = "gpao_t.macos_local_install_receipt.v1";
export const ROLLBACK_RECEIPT_SCHEMA = "gpao_t.macos_local_rollback_receipt.v1";
export const LAUNCH_AGENT_LABEL = "ai.nbeai.gpao-t";
export const DEFAULT_PORT = 18799;
const LAUNCH_AGENT_UNLOAD_TIMEOUT_MS = 45_000;
const LAUNCH_AGENT_LOAD_TIMEOUT_MS = 30_000;
const INSTALL_INFRASTRUCTURE_CHECK_IDS = [
  "current-link",
  "distribution",
  "launch-agent-plist",
  "launch-agent-loaded",
  "health",
];

const MANIFEST_NAME = "GPAO-T-DISTRIBUTION-MANIFEST.json";
const SECRET_SEGMENTS = new Set([
  "credentials",
  "identity",
  "devices",
  "state",
  "service-env",
  "auth-profiles.json",
  "device-auth.json",
  "exec-approvals.json",
  "gpao-t.json",
  "openclaw.json",
  ".env",
]);

const MIGRATION_PROFILES = {
  none: [],
  standard: [
    "credentials",
    "devices",
    "exec-approvals.json",
    "identity",
    "state",
    "workspace",
    "workspace-attestations",
  ],
};

function nowId(prefix = "snapshot") {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `${prefix}-${stamp}-${randomBytes(4).toString("hex")}`;
}

function modeString(mode) {
  return (mode & 0o7777).toString(8).padStart(4, "0");
}

function pathInside(root, candidate, allowEqual = false) {
  const rootPath = resolve(root);
  const candidatePath = resolve(candidate);
  const rel = relative(rootPath, candidatePath);
  return (allowEqual && rel === "") || (rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

export function assertPathInside(root, candidate, label, allowEqual = false) {
  if (!pathInside(root, candidate, allowEqual)) {
    throw new Error(`${label} escapes its allowed root: ${candidate}`);
  }
}

function isSecretPath(pathname) {
  const parts = resolve(pathname).split(sep);
  return parts.some((part) => SECRET_SEGMENTS.has(part));
}

async function pathExists(pathname) {
  try {
    await fs.lstat(pathname);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function hashFile(pathname) {
  return await new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(pathname);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolveHash(hash.digest("hex")));
  });
}

function hashText(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fsyncDirectory(pathname) {
  let handle;
  try {
    handle = await fs.open(pathname, constants.O_RDONLY);
    await handle.sync();
  } finally {
    await handle?.close();
  }
}

export async function writeJsonAtomic(pathname, value, mode = 0o600) {
  const parent = dirname(pathname);
  await fs.mkdir(parent, { recursive: true, mode: 0o700 });
  const temporary = join(parent, `.${basename(pathname)}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`);
  const handle = await fs.open(temporary, "wx", mode);
  try {
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.chmod(temporary, mode);
  await fs.rename(temporary, pathname);
  await fsyncDirectory(parent);
}

async function writeTextAtomic(pathname, value, mode = 0o600) {
  const parent = dirname(pathname);
  await fs.mkdir(parent, { recursive: true, mode: 0o700 });
  const temporary = join(parent, `.${basename(pathname)}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`);
  const handle = await fs.open(temporary, "wx", mode);
  try {
    await handle.writeFile(value, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.chmod(temporary, mode);
  await fs.rename(temporary, pathname);
  await fsyncDirectory(parent);
}

async function copyEntryPreservingMode(source, destination, { rejectExternalSymlinks = false, sourceRoot = source } = {}) {
  const stat = await fs.lstat(source);
  if (stat.isSymbolicLink()) {
    const target = await fs.readlink(source);
    if (rejectExternalSymlinks) {
      const resolvedTarget = resolve(dirname(source), target);
      assertPathInside(sourceRoot, resolvedTarget, "migration symlink target", true);
    }
    await fs.mkdir(dirname(destination), { recursive: true, mode: 0o700 });
    await fs.symlink(target, destination);
    return;
  }
  if (stat.isDirectory()) {
    await fs.mkdir(destination, { recursive: true, mode: 0o700 });
    const entries = await fs.readdir(source);
    for (const entry of entries.sort()) {
      await copyEntryPreservingMode(join(source, entry), join(destination, entry), {
        rejectExternalSymlinks,
        sourceRoot,
      });
    }
    await fs.chmod(destination, stat.mode & 0o7777);
    return;
  }
  if (!stat.isFile()) {
    throw new Error(`Unsupported filesystem entry: ${source}`);
  }
  await fs.mkdir(dirname(destination), { recursive: true, mode: 0o700 });
  await fs.copyFile(source, destination, constants.COPYFILE_EXCL);
  await fs.chmod(destination, stat.mode & 0o7777);
  await fs.utimes(destination, stat.atime, stat.mtime);
}

async function removeEntry(pathname) {
  if (!(await pathExists(pathname))) return;
  await fs.rm(pathname, { recursive: true, force: true });
}

async function inventoryTree(root, { hashFiles = false } = {}) {
  if (!(await pathExists(root))) return [];
  const records = [];
  async function visit(pathname) {
    const stat = await fs.lstat(pathname);
    const relPath = relative(root, pathname) || ".";
    if (stat.isSymbolicLink()) {
      const target = await fs.readlink(pathname);
      records.push({ path: relPath, kind: "symlink", mode: modeString(stat.mode), target, sha256: hashText(target) });
      return;
    }
    if (stat.isDirectory()) {
      records.push({ path: relPath, kind: "directory", mode: modeString(stat.mode) });
      const entries = await fs.readdir(pathname);
      for (const entry of entries.sort()) await visit(join(pathname, entry));
      return;
    }
    if (!stat.isFile()) throw new Error(`Unsupported filesystem entry: ${pathname}`);
    const record = { path: relPath, kind: "file", mode: modeString(stat.mode), size: stat.size };
    if (hashFiles) record.sha256 = await hashFile(pathname);
    records.push(record);
  }
  await visit(root);
  return records;
}

async function treeStats(root) {
  if (!(await pathExists(root))) return { bytes: 0, files: 0, directories: 0, symlinks: 0, unsafeSymlinks: [] };
  const result = { bytes: 0, files: 0, directories: 0, symlinks: 0, unsafeSymlinks: [] };
  async function visit(pathname) {
    const stat = await fs.lstat(pathname);
    if (stat.isSymbolicLink()) {
      result.symlinks += 1;
      const target = await fs.readlink(pathname);
      const targetPath = resolve(dirname(pathname), target);
      if (!pathInside(root, targetPath, true)) result.unsafeSymlinks.push(relative(root, pathname));
      return;
    }
    if (stat.isDirectory()) {
      result.directories += 1;
      const entries = await fs.readdir(pathname);
      for (const entry of entries) await visit(join(pathname, entry));
      return;
    }
    if (!stat.isFile()) throw new Error(`Unsupported filesystem entry: ${pathname}`);
    result.files += 1;
    result.bytes += stat.size;
  }
  await visit(root);
  return result;
}

function validateManifestPath(pathname) {
  if (!pathname || isAbsolute(pathname) || pathname.includes("\\") || pathname.split("/").includes("..")) {
    throw new Error(`Unsafe distribution manifest path: ${pathname}`);
  }
}

export async function verifyDistribution(releaseRoot, { full = true } = {}) {
  const releaseStat = await fs.lstat(releaseRoot);
  if (!releaseStat.isDirectory() || releaseStat.isSymbolicLink()) throw new Error(`Distribution root must be a real directory: ${releaseRoot}`);
  const manifestPath = join(releaseRoot, MANIFEST_NAME);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (manifest.schema !== "gpao_t.distribution_manifest.v2") throw new Error(`Unsupported distribution manifest schema: ${manifest.schema}`);
  if (!Array.isArray(manifest.files) || manifest.fileCount !== manifest.files.length) throw new Error("Distribution manifest fileCount does not match files[]");
  if (
    manifest.productId !== "gpao-t" ||
    manifest.version !== "0.1.0" ||
    manifest.distributionChannel !== "internal-production" ||
    manifest.intendedAudience !== "internal" ||
    manifest.publicRelease !== false ||
    manifest.externalDistributionExecuted !== false ||
    manifest.entrypoint !== "gpao-t.mjs"
  ) {
    throw new Error("Distribution manifest has an unsafe version or is missing the GPAO-T entrypoint");
  }

  let totalBytes = 0;
  const expected = new Set([MANIFEST_NAME]);
  const failures = [];
  for (const entry of manifest.files) {
    validateManifestPath(entry.path);
    if (expected.has(entry.path)) throw new Error(`Duplicate distribution manifest path: ${entry.path}`);
    expected.add(entry.path);
    const pathname = join(releaseRoot, entry.path);
    assertPathInside(releaseRoot, pathname, "distribution entry");
    let stat;
    try {
      stat = await fs.lstat(pathname);
    } catch (error) {
      failures.push(`${entry.path}: missing`);
      continue;
    }
    if (entry.kind === "file") {
      if (!stat.isFile() || stat.size !== entry.size) failures.push(`${entry.path}: file metadata mismatch`);
      totalBytes += stat.size;
      if (full && stat.isFile() && (await hashFile(pathname)) !== entry.sha256) failures.push(`${entry.path}: sha256 mismatch`);
    } else if (entry.kind === "symlink") {
      if (!stat.isSymbolicLink()) {
        failures.push(`${entry.path}: expected symlink`);
      } else {
        const target = await fs.readlink(pathname);
        const resolvedTarget = resolve(dirname(pathname), target);
        if (!pathInside(releaseRoot, resolvedTarget, true)) failures.push(`${entry.path}: symlink escapes release root`);
        if (target !== entry.target || hashText(target) !== entry.sha256) failures.push(`${entry.path}: symlink target mismatch`);
      }
    } else {
      failures.push(`${entry.path}: unsupported kind ${entry.kind}`);
    }
    if (failures.length >= 20) break;
  }
  if (failures.length === 0 && totalBytes !== manifest.totalBytes) failures.push(`totalBytes mismatch: expected ${manifest.totalBytes}, found ${totalBytes}`);
  if (failures.length === 0) {
    const actualEntries = await inventoryTree(releaseRoot);
    const extras = actualEntries
      .filter((entry) => entry.kind !== "directory" && !expected.has(entry.path))
      .map((entry) => entry.path);
    if (extras.length > 0) failures.push(`unmanifested entries: ${extras.slice(0, 20).join(", ")}`);
  }
  if (failures.length > 0) throw new Error(`Distribution verification failed:\n- ${failures.join("\n- ")}`);
  return {
    schema: manifest.schema,
    version: manifest.version,
    fileCount: manifest.fileCount,
    totalBytes: manifest.totalBytes,
    integrity: full ? "full-sha256" : "metadata-only",
    manifest,
  };
}

function nodeVersionSupported(version) {
  const [major, minor] = version.replace(/^v/, "").split(".").map(Number);
  if (major === 22) return minor >= 19;
  if (major === 23) return minor >= 11;
  return major >= 24;
}

async function commandStatus(command, args, options = {}) {
  try {
    const { stdout = "", stderr = "" } = await execFileAsync(command, args, { encoding: "utf8", ...options });
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    return {
      ok: false,
      code: error.code ?? error.exitCode ?? 1,
      stdout: String(error.stdout ?? "").trim(),
      stderr: String(error.stderr ?? "").trim(),
    };
  }
}

function redactDiagnosticText(text) {
  return String(text ?? "")
    .replace(/(authorization\s*:\s*bearer\s+)[^\s]+/giu, "$1[redacted]")
    .replace(/((?:token|password|secret|api[_-]?key)\s*[:=]\s*["']?)[^\s,"'}\]]+/giu, "$1[redacted]")
    .trim();
}

async function readDiagnosticTail(pathname, maxLines = 16) {
  try {
    const raw = await fs.readFile(pathname, "utf8");
    return redactDiagnosticText(raw.split(/\r?\n/u).filter(Boolean).slice(-maxLines).join("\n")).slice(-4000);
  } catch {
    return "";
  }
}

export function sanitizePostMigrationRepairOutput(text) {
  if (!text) return "";
  return text
    .replace(
      /(?:[▄█▀░ ].*\n){1,8}\s*OPENCLAW\s*\n(?:[▄█▀░ ].*\n){0,4}\s*/g,
      "",
    )
    .replace(/\bOPENCLAW_HIDE_BANNER\b/g, "GPAO_T_HIDE_BANNER")
    .replace(/\bOPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY\b/g, "GPAO_T_DISABLE_PERSISTED_PLUGIN_REGISTRY")
    .replace(/\bOPENCLAW_DISABLE_PLUGIN_REGISTRY_MIGRATION\b/g, "GPAO_T_DISABLE_PLUGIN_REGISTRY_MIGRATION")
    .replace(/\bai\.gpao-t\.gateway\b/g, "ai.nbeai.gpao-t")
    .replace(/\bai\.openclaw\.gateway\b/g, "previous gateway service")
    .replace(/\bopenclaw gateway restart\b/g, "gpao-t gateway restart")
    .replace(/\bopenclaw gateway status\b/g, "gpao-t gateway status")
    .replace(/\bopenclaw gateway install\b/g, "gpao-t gateway install")
    .replace(/\bopenclaw doctor\b/g, "gpao-t doctor")
    .replace(/\bOpenClaw\b/g, "GPAO-T")
    .replace(/\bopenclaw\b/g, "gpao-t")
    .trim();
}

async function runPostMigrationRepair(plan, options) {
  const entrypoint = join(plan.paths.currentLink, "gpao-t.mjs");
  if (!(await pathExists(entrypoint))) throw new Error(`Post-migration repair entrypoint is missing: ${entrypoint}`);
  const result = await commandStatus(process.execPath, [
    entrypoint,
    "update",
    "repair",
    "--yes",
    "--json",
    "--timeout",
    "300",
  ], {
    env: {
      ...process.env,
      GPAO_T_STATE_DIR: plan.paths.stateHome,
      GPAO_T_CONFIG_PATH: plan.paths.configPath,
      OPENCLAW_HIDE_BANNER: "1",
      OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY: "1",
      OPENCLAW_DISABLE_PLUGIN_REGISTRY_MIGRATION: "1",
    },
    cwd: plan.paths.currentLink,
    timeout: 310_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    ...result,
    stdout: sanitizePostMigrationRepairOutput(result.stdout),
    stderr: sanitizePostMigrationRepairOutput(result.stderr),
  };
}

async function runInstalledPluginDoctor(plan) {
  const entrypoint = join(plan.paths.currentLink, "gpao-t.mjs");
  const result = await commandStatus(process.execPath, [entrypoint, "plugins", "doctor"], {
    env: {
      ...process.env,
      GPAO_T_STATE_DIR: plan.paths.stateHome,
      GPAO_T_CONFIG_PATH: plan.paths.configPath,
      OPENCLAW_HIDE_BANNER: "1",
      OPENCLAW_DISABLE_PERSISTED_PLUGIN_REGISTRY: "1",
      OPENCLAW_DISABLE_PLUGIN_REGISTRY_MIGRATION: "1",
    },
    cwd: plan.paths.currentLink,
    timeout: 60_000,
    maxBuffer: 5 * 1024 * 1024,
  });
  return {
    ...result,
    stdout: sanitizePostMigrationRepairOutput(result.stdout),
    stderr: sanitizePostMigrationRepairOutput(result.stderr),
  };
}

async function repairGpaoPeerLinks(plan) {
  const projectsRoot = join(plan.paths.stateHome, "npm", "projects");
  const target = join(plan.paths.releaseDest, "compatibility", "gpao-t");
  if (!(await pathExists(projectsRoot)) || !(await pathExists(target))) return [];
  const repaired = [];
  const projects = await fs.readdir(projectsRoot).catch(() => []);
  for (const project of projects) {
    const root = join(projectsRoot, project, "node_modules");
    if (!(await pathExists(root))) continue;
    const packageDirs = [];
    const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.name === ".bin" || entry.name.startsWith(".")) continue;
      const entryPath = join(root, entry.name);
      if (entry.name.startsWith("@")) {
        const scoped = await fs.readdir(entryPath, { withFileTypes: true }).catch(() => []);
        for (const scopedEntry of scoped) {
          if (scopedEntry.isDirectory()) packageDirs.push(join(entryPath, scopedEntry.name));
        }
      } else if (entry.isDirectory()) {
        packageDirs.push(entryPath);
      }
    }
    for (const packageDir of packageDirs) {
      let peerDependencies = {};
      try {
        const parsed = JSON.parse(await fs.readFile(join(packageDir, "package.json"), "utf8"));
        peerDependencies = parsed?.peerDependencies && typeof parsed.peerDependencies === "object"
          ? parsed.peerDependencies
          : {};
      } catch {
        continue;
      }
      for (const peerName of ["openclaw", "gpao-t"]) {
        if (!Object.hasOwn(peerDependencies, peerName)) continue;
        const linkPath = join(packageDir, "node_modules", peerName);
        if (!(await pathExists(dirname(linkPath)))) continue;
        await removeEntry(linkPath);
        await fs.symlink(target, linkPath);
        repaired.push(linkPath);
      }
    }
  }
  return repaired;
}

async function waitForGpaoPeerLinkRepairs(plan, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  const repaired = new Set();
  while (Date.now() < deadline) {
    for (const linkPath of await repairGpaoPeerLinks(plan)) repaired.add(linkPath);
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  return [...repaired];
}

async function launchAgentLoaded(label, uid = process.getuid?.()) {
  if (uid === undefined) return false;
  const result = await commandStatus("launchctl", ["print", `gui/${uid}/${label}`]);
  return result.ok;
}

async function portListening(port) {
  return await new Promise((resolvePort) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const finish = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolvePort(value);
    };
    socket.setTimeout(350);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function migrationItems(profile) {
  const items = MIGRATION_PROFILES[profile];
  if (!items) throw new Error(`Unsupported migration profile: ${profile}`);
  return items;
}

function pathsFor(options, version) {
  const stateHome = resolve(options.stateHome);
  const releaseName = `gpao-t-${version}`;
  return {
    stateHome,
    runtimeNodePath: join(stateHome, "runtime", "node"),
    releasesRoot: join(stateHome, "releases"),
    releaseDest: join(stateHome, "releases", releaseName),
    currentLink: join(stateHome, "current"),
    configPath: join(stateHome, "gpao-t.json"),
    logsDir: join(stateHome, "logs"),
    snapshotsRoot: join(stateHome, "snapshots"),
    openclawBackupsRoot: join(stateHome, "backups", "openclaw"),
    receiptsRoot: join(stateHome, "receipts"),
    stagingRoot: join(stateHome, ".staging"),
    lockPath: join(stateHome, ".install-lock"),
    launchAgentPath: join(resolve(options.launchAgentsDir), `${LAUNCH_AGENT_LABEL}.plist`),
  };
}

export function applyTokenFor(version) {
  return `APPLY:GPAO-T:${version}:LOCAL-MACOS`;
}

export function rollbackTokenFor(snapshotId) {
  return `ROLLBACK:GPAO-T:${snapshotId}`;
}

function checkApplyToken(actual, expected) {
  if (actual !== expected) throw new Error(`Apply refused: exact token required: ${expected}`);
}

async function readConfigSafely(configPath) {
  if (!(await pathExists(configPath))) return { exists: false, valid: true, mode: null };
  const stat = await fs.lstat(configPath);
  if (!stat.isFile() || stat.isSymbolicLink()) return { exists: true, valid: false, mode: modeString(stat.mode), reason: "config is not a regular file" };
  try {
    JSON.parse(await fs.readFile(configPath, "utf8"));
  } catch {
    return { exists: true, valid: false, mode: modeString(stat.mode), reason: "config is not valid JSON" };
  }
  const secure = (stat.mode & 0o077) === 0;
  return { exists: true, valid: true, secure, mode: modeString(stat.mode) };
}

export async function createInstallPlan(options) {
  const release = await verifyDistribution(resolve(options.release), { full: options.fullVerify !== false });
  const nodePath = resolve(options.nodePath ?? process.execPath);
  const nodeProbe = await commandStatus(nodePath, ["--version"]);
  const nodeVersion = nodeProbe.ok ? nodeProbe.stdout : null;
  const profile = options.migrationProfile ?? "standard";
  const selected = migrationItems(profile);
  const paths = pathsFor(options, release.version);
  const openclawExists = await pathExists(options.openclawHome);
  const openclawStats = openclawExists ? await treeStats(options.openclawHome) : await treeStats("/__gpao_t_missing__");
  const sourceConfig = await readConfigSafely(join(options.openclawHome, "openclaw.json"));
  const selectedExisting = [];
  const selectedUnsafeSymlinks = [];
  for (const item of selected) {
    const source = join(options.openclawHome, item);
    if (await pathExists(source)) {
      selectedExisting.push(item);
      const itemStats = await treeStats(source);
      selectedUnsafeSymlinks.push(...itemStats.unsafeSymlinks.map((path) => `${item}/${path}`));
    }
  }
  const insecureSecretModes = openclawExists ? await verifySecretModes(options.openclawHome) : [];
  const oldServiceLoaded = process.platform === "darwin" ? await launchAgentLoaded("ai.openclaw.gateway") : false;
  const gpaoServiceLoaded = process.platform === "darwin" ? await launchAgentLoaded(LAUNCH_AGENT_LABEL) : false;
  const portBusy = await portListening(options.port);
  let freeBytes = null;
  try {
    const statfs = await fs.statfs(dirname(paths.stateHome));
    freeBytes = Number(statfs.bavail) * Number(statfs.bsize);
  } catch {
    // Parent may not exist in isolated fixtures; disk capacity then remains advisory.
  }
  const estimatedBytes = release.totalBytes * 2 + openclawStats.bytes * 2 + 256 * 1024 * 1024;
  const blockers = [];
  const warnings = [];
  if (process.platform !== "darwin") blockers.push("macOS is required");
  if (!nodeProbe.ok || !nodeVersion) blockers.push(`Node executable is not runnable: ${nodePath}`);
  else if (!nodeVersionSupported(nodeVersion)) blockers.push(`Node ${nodeVersion} does not satisfy the distribution engine requirement`);
  try {
    await fs.access(nodePath, constants.X_OK);
  } catch {
    blockers.push(`Node executable is not runnable: ${nodePath}`);
  }
  const stateOpenclawOverlap = pathInside(options.openclawHome, paths.stateHome, true) || pathInside(paths.stateHome, options.openclawHome, true);
  const stateReleaseOverlap = pathInside(paths.stateHome, options.release, true) || pathInside(options.release, paths.stateHome, true);
  if (paths.stateHome === resolve("/") || paths.stateHome === resolve(homedir())) blockers.push("State home must be a dedicated child directory, not / or the user home");
  if (stateOpenclawOverlap) blockers.push("GPAO-T state home and OpenClaw source must not overlap");
  if (stateReleaseOverlap) blockers.push("GPAO-T state home and distribution source must not overlap");
  try {
    await renderLaunchAgent(options.plistTemplate, {
      nodePath: paths.runtimeNodePath,
      currentPath: paths.currentLink,
      stateHome: paths.stateHome,
      configPath: paths.configPath,
      logsDir: paths.logsDir,
      port: options.port,
    });
  } catch (error) {
    blockers.push(`LaunchAgent template is not usable: ${error.message}`);
  }
  if (profile !== "none" && sourceConfig.exists && !sourceConfig.valid) blockers.push(`Compatibility source config cannot be migrated: ${sourceConfig.reason}`);
  if (profile !== "none" && sourceConfig.exists && sourceConfig.valid && !sourceConfig.secure) blockers.push(`Compatibility source config mode ${sourceConfig.mode} is too permissive; secret permissions would not be safe`);
  if (profile !== "none" && selectedUnsafeSymlinks.length > 0) blockers.push(`Selected compatibility state has symlinks escaping its root: ${selectedUnsafeSymlinks.slice(0, 5).join(", ")}`);
  if (profile !== "none" && insecureSecretModes.length > 0) blockers.push(`Secret-bearing compatibility paths are not owner-only: ${insecureSecretModes.slice(0, 5).map((item) => `${item.path} (${item.mode})`).join(", ")}`);
  if (portBusy && !gpaoServiceLoaded) blockers.push(`Port ${options.port} is already listening`);
  if (freeBytes !== null && freeBytes < estimatedBytes) blockers.push(`Insufficient free space: need approximately ${estimatedBytes} bytes, have ${freeBytes}`);
  if (profile !== "none" && oldServiceLoaded && openclawExists) warnings.push("The compatibility source service is loaded; apply will refuse until it is stopped for a consistent backup");
  if (!openclawExists) warnings.push("No ~/.openclaw source exists; backup and migration will be skipped");
  if (gpaoServiceLoaded) warnings.push(`${LAUNCH_AGENT_LABEL} is already loaded; apply will refuse until it is stopped for a consistent destination snapshot`);

  const managedTargets = [
    paths.runtimeNodePath,
    paths.releaseDest,
    paths.currentLink,
    paths.configPath,
    ...selectedExisting.map((item) => join(paths.stateHome, item)),
    paths.launchAgentPath,
  ];
  return {
    schema: INSTALL_SCHEMA,
    mode: options.apply ? "apply-requested" : "dry-run",
    generatedAt: new Date().toISOString(),
    product: "nBeAI. GPAO-T",
    version: release.version,
    applyTokenRequired: applyTokenFor(release.version),
    release: {
      source: resolve(options.release),
      destination: paths.releaseDest,
      fileCount: release.fileCount,
      totalBytes: release.totalBytes,
      integrity: release.integrity,
    },
    stateHome: paths.stateHome,
    launchAgent: { label: LAUNCH_AGENT_LABEL, path: paths.launchAgentPath, node: paths.runtimeNodePath, sourceNode: nodePath, port: options.port },
    runtime: { nodeSource: nodePath, nodeVersion, nodeDestination: paths.runtimeNodePath },
    openclaw: {
      source: resolve(options.openclawHome),
      exists: openclawExists,
      backup: openclawExists && profile !== "none" ? "full-tree-before-migration" : "skipped",
      profile,
      selected: selectedExisting,
      excludedTopLevel: openclawExists
        ? (await fs.readdir(options.openclawHome)).sort().filter((name) => name !== "openclaw.json" && !selected.includes(name))
        : [],
      bytes: openclawStats.bytes,
      files: openclawStats.files,
      secretValuesExposed: false,
      sourceConfig,
      insecureSecretModes,
      sourceServiceLoaded: oldServiceLoaded,
    },
    atomicity: {
      release: "staged-copy-verify-rename",
      currentPointer: "temporary-symlink-rename",
      snapshotManifest: "fsync-temporary-file-rename-then-directory-rename",
      receipts: "fsync-temporary-file-rename",
    },
    rollback: { snapshotsRoot: paths.snapshotsRoot, exactTokenPattern: "ROLLBACK:GPAO-T:<snapshot-id>" },
    health: ["distribution manifest full SHA-256", "current pointer", "LaunchAgent plist", "launchctl job", `http://127.0.0.1:${options.port}/health`],
    managedTargets,
    capacity: { estimatedBytes, freeBytes },
    blockers,
    applyOnlyBlockers: [
      ...(profile !== "none" && oldServiceLoaded && openclawExists ? ["Stop the compatibility source service before apply so SQLite/WAL and secret backup are consistent"] : []),
      ...(gpaoServiceLoaded ? [`Stop ${LAUNCH_AGENT_LABEL} before apply so the destination snapshot is consistent`] : []),
    ],
    warnings,
    paths,
  };
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function renderLaunchAgent(templatePath, { nodePath, currentPath, stateHome, configPath, logsDir, port }) {
  let template = await fs.readFile(templatePath, "utf8");
  const values = {
    "@@LABEL@@": LAUNCH_AGENT_LABEL,
    "@@NODE_PATH@@": nodePath,
    "@@ENTRYPOINT@@": join(currentPath, "gpao-t.mjs"),
    "@@WORKING_DIRECTORY@@": currentPath,
    "@@STATE_HOME@@": stateHome,
    "@@CONFIG_PATH@@": configPath,
    "@@STDOUT_PATH@@": join(logsDir, "gateway.log"),
    "@@STDERR_PATH@@": join(logsDir, "gateway.error.log"),
    "@@PORT@@": String(port),
  };
  for (const [token, value] of Object.entries(values)) template = template.replaceAll(token, xmlEscape(value));
  if (template.includes("@@")) throw new Error("LaunchAgent template contains unresolved placeholders");
  return template;
}

export function migrateConfigObject(value, oldRoot, newRoot, oldPort, newPort) {
  if (typeof value === "string") {
    if (value === oldRoot) return newRoot;
    if (value.startsWith(`${oldRoot}${sep}`)) return join(newRoot, relative(oldRoot, value));
    if (value === "~/.openclaw") return newRoot;
    if (value.startsWith("~/.openclaw/")) return join(newRoot, value.slice("~/.openclaw/".length));
    const loopback = `(127\\.0\\.0\\.1|localhost|\\[::1\\])`;
    return value.replace(new RegExp(`((?:https?|wss?)://)${loopback}:${oldPort}(?=\\b|/)`, "g"), `$1$2:${newPort}`);
  }
  if (Array.isArray(value)) return value.map((item) => migrateConfigObject(item, oldRoot, newRoot, oldPort, newPort));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, migrateConfigObject(item, oldRoot, newRoot, oldPort, newPort)]));
  }
  return value;
}

export function normalizeGpaoTPluginConfig(config) {
  const next = config && typeof config === "object" ? config : {};
  next.plugins = next.plugins && typeof next.plugins === "object" ? next.plugins : {};
  next.plugins.entries = next.plugins.entries && typeof next.plugins.entries === "object"
    ? next.plugins.entries
    : {};
  next.plugins.entries.codex = {
    ...(next.plugins.entries.codex && typeof next.plugins.entries.codex === "object"
      ? next.plugins.entries.codex
      : {}),
    enabled: true,
  };
  const allow = Array.isArray(next.plugins.allow) ? next.plugins.allow : [];
  next.plugins.allow = [...new Set([...allow.filter((id) => id !== "telegram"), "codex", "openai", "memory-core"])];
  if (next.plugins.entries.telegram && typeof next.plugins.entries.telegram === "object") {
    next.plugins.entries.telegram = { ...next.plugins.entries.telegram, enabled: false };
  }
  return next;
}

export function normalizeGpaoTRuntimeConfig(config) {
  const next = normalizeGpaoTPluginConfig(config);
  next.agents = next.agents && typeof next.agents === "object" ? next.agents : {};
  next.agents.defaults = next.agents.defaults && typeof next.agents.defaults === "object"
    ? next.agents.defaults
    : {};
  const memorySearch = next.agents.defaults.memorySearch && typeof next.agents.defaults.memorySearch === "object"
    ? next.agents.defaults.memorySearch
    : {};
  next.agents.defaults.memorySearch = memorySearch;
  memorySearch.experimental = memorySearch.experimental && typeof memorySearch.experimental === "object"
    ? memorySearch.experimental
    : {};
  memorySearch.experimental.sessionMemory = true;
  const sources = Array.isArray(memorySearch.sources) ? memorySearch.sources : [];
  memorySearch.sources = [...new Set([...sources, "memory", "sessions"])];

  next.tools = next.tools && typeof next.tools === "object" ? next.tools : {};
  const alsoAllow = Array.isArray(next.tools.alsoAllow) ? next.tools.alsoAllow : [];
  next.tools.alsoAllow = [...new Set(alsoAllow.filter((id) => id !== "browser"))];
  next.tools.sessions = next.tools.sessions && typeof next.tools.sessions === "object"
    ? next.tools.sessions
    : {};
  next.tools.sessions.visibility = "agent";
  return next;
}

export function disableInheritedExternalConnections(config) {
  const next = config && typeof config === "object" ? config : {};
  if (next.channels && typeof next.channels === "object") {
    next.channels = Object.fromEntries(
      Object.entries(next.channels).map(([id, value]) => [
        id,
        value && typeof value === "object" ? { ...value, enabled: false } : { enabled: false },
      ]),
    );
  }
  if (next.webhooks && typeof next.webhooks === "object") {
    next.webhooks = { ...next.webhooks, enabled: false };
  }
  if (next.hooks && typeof next.hooks === "object") {
    next.hooks = { ...next.hooks, enabled: false };
  }
  return normalizeGpaoTRuntimeConfig(next);
}

export function buildFreshRuntimeConfig({ stateHome, port }) {
  const config = normalizeGpaoTRuntimeConfig({
    agents: {
      defaults: {
        workspace: join(stateHome, "workspace"),
      },
    },
    gateway: {
      mode: "local",
      bind: "loopback",
      port,
      auth: { mode: "token", token: randomBytes(32).toString("hex") },
      controlUi: {
        enabled: true,
        allowedOrigins: [
          `http://127.0.0.1:${port}`,
          `http://localhost:${port}`,
        ],
      },
      tailscale: { mode: "off", resetOnExit: false },
    },
    tools: {
      profile: "coding",
    },
    plugins: {
      entries: {
        codex: { enabled: true },
        openai: { enabled: true },
        "memory-core": { enabled: true },
      },
      allow: ["codex", "openai", "memory-core"],
    },
  });
  // The portable package does not bundle the optional Codex plugin. Keep the
  // first boot self-contained; a detected plugin can be enabled later.
  config.plugins.entries.codex = { enabled: false };
  config.plugins.allow = config.plugins.allow.filter((id) => id !== "codex");
  return config;
}

async function stageMigratedState(plan, stagingState, options) {
  await fs.mkdir(stagingState, { recursive: true, mode: 0o700 });
  const sourceConfig = join(options.openclawHome, "openclaw.json");
  if (plan.openclaw.profile !== "none" && await pathExists(sourceConfig)) {
    const sourceStat = await fs.stat(sourceConfig);
    const config = JSON.parse(await fs.readFile(sourceConfig, "utf8"));
    const oldPort = Number(config?.gateway?.port) || 18789;
    const migrated = migrateConfigObject(config, resolve(options.openclawHome), plan.paths.stateHome, oldPort, options.port);
    migrated.gateway = migrated.gateway && typeof migrated.gateway === "object" ? migrated.gateway : {};
    migrated.gateway.port = options.port;
    disableInheritedExternalConnections(migrated);
    const configDestination = join(stagingState, "gpao-t.json");
    await writeJsonAtomic(configDestination, migrated, sourceStat.mode & 0o7777);
  } else if (!(await pathExists(plan.paths.configPath))) {
    await writeJsonAtomic(
      join(stagingState, "gpao-t.json"),
      buildFreshRuntimeConfig({ stateHome: plan.paths.stateHome, port: options.port }),
      0o600,
    );
  }
  for (const item of plan.openclaw.selected) {
    const source = join(options.openclawHome, item);
    const destination = join(stagingState, item);
    assertPathInside(options.openclawHome, source, "migration source");
    assertPathInside(stagingState, destination, "migration destination");
    await copyEntryPreservingMode(source, destination, { rejectExternalSymlinks: true, sourceRoot: options.openclawHome });
  }
}

async function createOpenclawBackup(plan, options, operationId) {
  if (!plan.openclaw.exists || plan.openclaw.profile === "none") return null;
  const finalDir = join(plan.paths.openclawBackupsRoot, operationId);
  const stagingDir = `${finalDir}.staging`;
  if (await pathExists(finalDir)) throw new Error(`OpenClaw backup already exists: ${finalDir}`);
  await removeEntry(stagingDir);
  await fs.mkdir(stagingDir, { recursive: true, mode: 0o700 });
  const treePath = join(stagingDir, "tree");
  await copyEntryPreservingMode(options.openclawHome, treePath, { sourceRoot: options.openclawHome });
  const inventory = await inventoryTree(treePath, { hashFiles: true });
  const manifest = {
    schema: BACKUP_SCHEMA,
    id: operationId,
    createdAt: new Date().toISOString(),
    source: resolve(options.openclawHome),
    tree: "tree",
    entries: inventory,
    permissionsPreserved: true,
    secretValuesExposed: false,
  };
  await writeJsonAtomic(join(stagingDir, "manifest.json"), manifest, 0o600);
  await fs.rename(stagingDir, finalDir);
  await fsyncDirectory(dirname(finalDir));
  return { path: finalDir, entries: inventory.length };
}

async function snapshotTargets(plan, operationId, { serviceWasLoaded } = {}) {
  const finalDir = join(plan.paths.snapshotsRoot, operationId);
  const stagingDir = `${finalDir}.staging`;
  if (await pathExists(finalDir)) throw new Error(`Snapshot already exists: ${finalDir}`);
  await removeEntry(stagingDir);
  await fs.mkdir(join(stagingDir, "previous"), { recursive: true, mode: 0o700 });
  const targets = [];
  for (let index = 0; index < plan.managedTargets.length; index += 1) {
    const target = plan.managedTargets[index];
    const existed = await pathExists(target);
    const record = { target, existed, backup: null, entries: [] };
    if (existed) {
      const backup = join("previous", String(index).padStart(3, "0"));
      const backupPath = join(stagingDir, backup);
      await copyEntryPreservingMode(target, backupPath, { sourceRoot: target });
      record.backup = backup;
      record.entries = await inventoryTree(backupPath, { hashFiles: true });
    }
    targets.push(record);
  }
  const manifest = {
    schema: SNAPSHOT_SCHEMA,
    id: operationId,
    createdAt: new Date().toISOString(),
    stateHome: plan.paths.stateHome,
    launchAgentPath: plan.paths.launchAgentPath,
    serviceWasLoaded: serviceWasLoaded ?? await launchAgentLoaded(LAUNCH_AGENT_LABEL),
    targets,
    complete: true,
  };
  await writeJsonAtomic(join(stagingDir, "manifest.json"), manifest, 0o600);
  await fs.rename(stagingDir, finalDir);
  await fsyncDirectory(dirname(finalDir));
  return { path: finalDir, manifest };
}

async function acquireLock(lockPath, operationId) {
  try {
    await fs.mkdir(lockPath, { mode: 0o700 });
    await writeJsonAtomic(join(lockPath, "owner.json"), { pid: process.pid, operationId, createdAt: new Date().toISOString() }, 0o600);
  } catch (error) {
    if (error.code === "EEXIST") throw new Error(`Another GPAO-T install/rollback holds ${lockPath}`);
    throw error;
  }
}

async function releaseLock(lockPath) {
  await removeEntry(lockPath);
}

async function replaceWithStaged(staged, destination) {
  await removeEntry(destination);
  await fs.mkdir(dirname(destination), { recursive: true, mode: 0o700 });
  await fs.rename(staged, destination);
  await fsyncDirectory(dirname(destination));
}

async function pointCurrentAtomically(currentLink, releaseDest) {
  const temporary = `${currentLink}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await removeEntry(temporary);
  await fs.symlink(releaseDest, temporary);
  if (await pathExists(currentLink)) {
    const stat = await fs.lstat(currentLink);
    if (stat.isDirectory() && !stat.isSymbolicLink()) await removeEntry(currentLink);
  }
  await fs.rename(temporary, currentLink);
  await fsyncDirectory(dirname(currentLink));
}

async function restoreSnapshot(snapshotPath, manifest) {
  for (const record of [...manifest.targets].reverse()) {
    await removeEntry(record.target);
    if (record.existed) {
      const source = join(snapshotPath, record.backup);
      assertPathInside(snapshotPath, source, "snapshot backup");
      await copyEntryPreservingMode(source, record.target, { sourceRoot: source });
    }
  }
}

async function bootoutService() {
  if (!(await launchAgentLoaded(LAUNCH_AGENT_LABEL))) return;
  const uid = process.getuid();
  const result = await commandStatus("launchctl", ["bootout", `gui/${uid}/${LAUNCH_AGENT_LABEL}`]);
  if (!result.ok) throw new Error(`launchctl bootout failed: ${result.stderr || result.stdout}`);
  await waitForLaunchAgentState(false, LAUNCH_AGENT_UNLOAD_TIMEOUT_MS);
}

async function bootstrapService(plistPath) {
  const uid = process.getuid();
  let result = null;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    result = await commandStatus("launchctl", ["bootstrap", `gui/${uid}`, plistPath]);
    if (result.ok) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, attempt * 500));
  }
  if (!result?.ok) throw new Error(`launchctl bootstrap failed: ${result?.stderr || result?.stdout}`);
  await waitForLaunchAgentState(true, LAUNCH_AGENT_LOAD_TIMEOUT_MS);
  const kickstart = await commandStatus("launchctl", ["kickstart", `gui/${uid}/${LAUNCH_AGENT_LABEL}`]);
  if (!kickstart.ok) throw new Error(`launchctl kickstart failed: ${kickstart.stderr || kickstart.stdout}`);
}

async function waitForLaunchAgentState(expectedLoaded, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await launchAgentLoaded(LAUNCH_AGENT_LABEL) === expectedLoaded) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  const state = expectedLoaded ? "load" : "unload";
  throw new Error(`launchctl did not ${state} ${LAUNCH_AGENT_LABEL} within ${timeoutMs}ms`);
}

async function waitForHealth(port, timeoutMs = 30000, { logsDir = null, label = LAUNCH_AGENT_LABEL } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "not attempted";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return { ok: true, status: response.status };
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  const diagnostics = [];
  if (logsDir) {
    for (const filename of ["gateway.error.log", "gateway.log"]) {
      const tail = await readDiagnosticTail(join(logsDir, filename));
      if (tail) diagnostics.push(`${filename}:\n${tail}`);
    }
  }
  const uid = process.getuid?.();
  if (uid !== undefined) {
    const service = await commandStatus("launchctl", ["print", `gui/${uid}/${label}`]);
    if (service.ok) diagnostics.push("LaunchAgent 상태: 로드됨");
    else diagnostics.push(`LaunchAgent 상태: ${redactDiagnosticText(service.stderr || service.stdout || "확인할 수 없음")}`);
  }
  throw new Error(`GPAO-T health check timed out: ${lastError}${diagnostics.length > 0 ? `\n${diagnostics.join("\n")}` : ""}`);
}

export async function applyInstall(plan, options) {
  if (plan.blockers.length > 0) throw new Error(`Apply refused by preflight:\n- ${plan.blockers.join("\n- ")}`);
  checkApplyToken(options.applyToken, plan.applyTokenRequired);
  if (plan.openclaw.exists && await launchAgentLoaded("ai.openclaw.gateway")) throw new Error("Apply refused: stop ai.openclaw.gateway before backup/migration");
  if (await launchAgentLoaded(LAUNCH_AGENT_LABEL)) throw new Error(`Apply refused: stop ${LAUNCH_AGENT_LABEL} before snapshot/install`);
  if (await portListening(options.port)) throw new Error(`Apply refused: port ${options.port} is already listening`);
  const insecureSecretModes = plan.openclaw.exists ? await verifySecretModes(options.openclawHome) : [];
  if (insecureSecretModes.length > 0) throw new Error("Apply refused: secret-bearing OpenClaw path permissions changed after preflight");
  const operationId = nowId("install");
  const stagingDir = join(plan.paths.stagingRoot, operationId);
  await fs.mkdir(plan.paths.stateHome, { recursive: true, mode: 0o700 });
  await fs.chmod(plan.paths.stateHome, 0o700);
  await fs.mkdir(plan.paths.stagingRoot, { recursive: true, mode: 0o700 });
  await acquireLock(plan.paths.lockPath, operationId);
  let snapshot = null;
  let serviceStarted = false;
  try {
    await fs.mkdir(stagingDir, { recursive: true, mode: 0o700 });
    const openclawBackup = await createOpenclawBackup(plan, options, operationId);
    snapshot = await snapshotTargets(plan, operationId);
    const stagedRelease = join(stagingDir, "release");
    await copyEntryPreservingMode(plan.release.source, stagedRelease, { rejectExternalSymlinks: true, sourceRoot: plan.release.source });
    await verifyDistribution(stagedRelease, { full: true });
    const stagedState = join(stagingDir, "state");
    await stageMigratedState(plan, stagedState, options);
    const stagedRuntimeNode = join(stagingDir, "runtime", "node");
    await fs.mkdir(dirname(stagedRuntimeNode), { recursive: true, mode: 0o700 });
    const nodeSource = resolve(options.nodePath ?? process.execPath);
    await fs.copyFile(nodeSource, stagedRuntimeNode);
    await fs.chmod(stagedRuntimeNode, 0o700);
    await fs.mkdir(plan.paths.releasesRoot, { recursive: true, mode: 0o700 });
    await fs.mkdir(plan.paths.logsDir, { recursive: true, mode: 0o700 });
    await fs.mkdir(plan.paths.receiptsRoot, { recursive: true, mode: 0o700 });
    await fs.mkdir(dirname(plan.paths.launchAgentPath), { recursive: true, mode: 0o755 });
    await replaceWithStaged(stagedRelease, plan.paths.releaseDest);
    await replaceWithStaged(stagedRuntimeNode, plan.paths.runtimeNodePath);
    if (await pathExists(join(stagedState, "gpao-t.json"))) await replaceWithStaged(join(stagedState, "gpao-t.json"), plan.paths.configPath);
    for (const item of plan.openclaw.selected) {
      const staged = join(stagedState, item);
      if (await pathExists(staged)) await replaceWithStaged(staged, join(plan.paths.stateHome, item));
    }
    await pointCurrentAtomically(plan.paths.currentLink, plan.paths.releaseDest);
    const postMigrationRepair = await runPostMigrationRepair(plan, options);
    if (!postMigrationRepair.ok) {
      throw new Error(`Post-migration runtime repair failed: ${postMigrationRepair.stderr || postMigrationRepair.stdout}`);
    }
    const pluginDoctor = await runInstalledPluginDoctor(plan);
    if (!pluginDoctor.ok) {
      throw new Error(`Post-migration plugin verification failed: ${pluginDoctor.stderr || pluginDoctor.stdout}`);
    }
    let repairedPeerLinks = await repairGpaoPeerLinks(plan);
    const plist = await renderLaunchAgent(options.plistTemplate, {
      nodePath: plan.paths.runtimeNodePath,
      currentPath: plan.paths.currentLink,
      stateHome: plan.paths.stateHome,
      configPath: plan.paths.configPath,
      logsDir: plan.paths.logsDir,
      port: options.port,
    });
    await writeTextAtomic(plan.paths.launchAgentPath, plist, 0o600);
    const lint = await commandStatus("plutil", ["-lint", plan.paths.launchAgentPath]);
    if (!lint.ok) throw new Error(`LaunchAgent plist validation failed: ${lint.stderr || lint.stdout}`);
    await bootoutService();
    await bootstrapService(plan.paths.launchAgentPath);
    serviceStarted = true;
    const postBootstrapPeerLinks = await waitForGpaoPeerLinkRepairs(plan);
    if (postBootstrapPeerLinks.length > 0) {
      repairedPeerLinks = [...new Set([...repairedPeerLinks, ...postBootstrapPeerLinks])];
      await bootoutService();
      serviceStarted = false;
      await bootstrapService(plan.paths.launchAgentPath);
      serviceStarted = true;
      const postRestartPeerLinks = await waitForGpaoPeerLinkRepairs(plan, 5_000);
      repairedPeerLinks = [...new Set([...repairedPeerLinks, ...postRestartPeerLinks])];
    }
    await waitForHealth(options.port, 30_000, { logsDir: plan.paths.logsDir, label: LAUNCH_AGENT_LABEL });
    const health = await healthCheck({ ...options, fullVerify: true });
    const installationReadiness = assessInstallReadiness(health);
    if (!installationReadiness.ok) {
      throw new Error(`Post-install infrastructure verification failed: ${JSON.stringify(installationReadiness)}`);
    }
    const receipt = {
      schema: RECEIPT_SCHEMA,
      id: operationId,
      installedAt: new Date().toISOString(),
      version: plan.version,
      snapshotId: snapshot.manifest.id,
      snapshotPath: snapshot.path,
      openclawBackup,
      postMigrationRepair: {
        stdout: postMigrationRepair.stdout,
        stderr: postMigrationRepair.stderr,
        repairedPeerLinks,
      },
      pluginDoctor: {
        stdout: pluginDoctor.stdout,
        stderr: pluginDoctor.stderr,
      },
      release: plan.paths.releaseDest,
      launchAgent: LAUNCH_AGENT_LABEL,
      health,
      installationReadiness,
    };
    const receiptPath = join(plan.paths.receiptsRoot, `${operationId}.json`);
    await writeJsonAtomic(receiptPath, receipt, 0o600);
    return {
      status: "installed",
      setupRequired: installationReadiness.status === "needs_provider_setup",
      installationReadiness,
      receiptPath,
      receipt,
    };
  } catch (error) {
    if (serviceStarted) await bootoutService().catch(() => {});
    if (snapshot) await restoreSnapshot(snapshot.path, snapshot.manifest).catch(() => {});
    throw error;
  } finally {
    await removeEntry(stagingDir).catch(() => {});
    await releaseLock(plan.paths.lockPath).catch(() => {});
  }
}

function validateSnapshotManifest(manifest, snapshotPath, options) {
  if (manifest.schema !== SNAPSHOT_SCHEMA || !manifest.complete || !Array.isArray(manifest.targets)) throw new Error("Snapshot manifest is incomplete or unsupported");
  const stateHome = resolve(options.stateHome);
  const launchAgentPath = join(resolve(options.launchAgentsDir), `${LAUNCH_AGENT_LABEL}.plist`);
  const exactStateTargets = new Set([
    "runtime/node",
    "current",
    "gpao-t.json",
    ...MIGRATION_PROFILES.standard,
  ].map((name) => join(stateHome, name)));
  const seenTargets = new Set();
  for (const record of manifest.targets) {
    const target = resolve(record.target);
    const releasesRoot = join(stateHome, "releases");
    const releaseTarget = dirname(target) === releasesRoot && basename(target).startsWith("gpao-t-");
    const allowed = exactStateTargets.has(target) || releaseTarget || target === launchAgentPath;
    if (!allowed) throw new Error(`Snapshot target is outside GPAO-T roots: ${target}`);
    if (seenTargets.has(target)) throw new Error(`Snapshot target is duplicated: ${target}`);
    seenTargets.add(target);
    if (record.existed) {
      const backupPath = join(snapshotPath, record.backup ?? "");
      assertPathInside(snapshotPath, backupPath, "snapshot backup");
    }
  }
}

async function verifySnapshotBackups(manifest, snapshotPath) {
  for (const record of manifest.targets) {
    if (!record.existed) continue;
    if (!Array.isArray(record.entries)) throw new Error(`Snapshot inventory missing for ${record.target}`);
    const backupPath = join(snapshotPath, record.backup);
    const actual = await inventoryTree(backupPath, { hashFiles: true });
    if (JSON.stringify(actual) !== JSON.stringify(record.entries)) {
      throw new Error(`Snapshot backup integrity failed for ${record.target}`);
    }
  }
}

export async function createRollbackPlan(options) {
  if (!options.snapshotId || options.snapshotId.includes("/") || options.snapshotId.includes("..")) throw new Error("A safe --snapshot <id> is required");
  const snapshotsRoot = join(resolve(options.stateHome), "snapshots");
  const snapshotPath = join(snapshotsRoot, options.snapshotId);
  assertPathInside(snapshotsRoot, snapshotPath, "snapshot");
  const manifest = JSON.parse(await fs.readFile(join(snapshotPath, "manifest.json"), "utf8"));
  validateSnapshotManifest(manifest, snapshotPath, options);
  await verifySnapshotBackups(manifest, snapshotPath);
  return {
    schema: `${INSTALL_SCHEMA}.rollback_plan`,
    mode: options.apply ? "apply-requested" : "dry-run",
    snapshotId: options.snapshotId,
    snapshotPath,
    exactTokenRequired: rollbackTokenFor(options.snapshotId),
    targets: manifest.targets.map(({ target, existed }) => ({ target, restorePrevious: existed })),
    serviceWasLoaded: manifest.serviceWasLoaded,
    manifest,
  };
}

export async function applyRollback(plan, options) {
  checkApplyToken(options.applyToken, plan.exactTokenRequired);
  const stateHome = resolve(options.stateHome);
  const lockPath = join(stateHome, ".install-lock");
  const operationId = nowId("rollback");
  await acquireLock(lockPath, operationId);
  let guard = null;
  try {
    const currentServiceWasLoaded = await launchAgentLoaded(LAUNCH_AGENT_LABEL);
    await bootoutService();
    guard = await snapshotTargets({
      managedTargets: plan.manifest.targets.map((record) => record.target),
      paths: { snapshotsRoot: join(stateHome, "snapshots") },
    }, `${operationId}-guard`, { serviceWasLoaded: currentServiceWasLoaded });
    await restoreSnapshot(plan.snapshotPath, plan.manifest);
    if (plan.serviceWasLoaded && await pathExists(join(resolve(options.launchAgentsDir), `${LAUNCH_AGENT_LABEL}.plist`))) {
      await bootstrapService(join(resolve(options.launchAgentsDir), `${LAUNCH_AGENT_LABEL}.plist`));
    }
    const receipt = {
      schema: ROLLBACK_RECEIPT_SCHEMA,
      id: operationId,
      rolledBackAt: new Date().toISOString(),
      snapshotId: plan.snapshotId,
      rollbackGuardSnapshotId: guard.manifest.id,
      restoredTargets: plan.targets,
      serviceRestored: plan.serviceWasLoaded,
    };
    const receiptPath = join(resolve(options.stateHome), "receipts", `${operationId}.json`);
    await writeJsonAtomic(receiptPath, receipt, 0o600);
    return { status: "rolled-back", receiptPath, receipt };
  } catch (error) {
    if (guard) {
      await restoreSnapshot(guard.path, guard.manifest).catch(() => {});
      const plistPath = join(resolve(options.launchAgentsDir), `${LAUNCH_AGENT_LABEL}.plist`);
      if (guard.manifest.serviceWasLoaded && await pathExists(plistPath)) await bootstrapService(plistPath).catch(() => {});
    }
    throw error;
  } finally {
    await releaseLock(lockPath).catch(() => {});
  }
}

export async function healthCheck(options) {
  const stateHome = resolve(options.stateHome);
  const currentLink = join(stateHome, "current");
  const plistPath = join(resolve(options.launchAgentsDir), `${LAUNCH_AGENT_LABEL}.plist`);
  const checks = [];
  let currentTarget = null;
  try {
    const rawTarget = await fs.readlink(currentLink);
    currentTarget = resolve(dirname(currentLink), rawTarget);
    const releasesRoot = join(stateHome, "releases");
    checks.push({ id: "current-link", ok: dirname(currentTarget) === releasesRoot && basename(currentTarget).startsWith("gpao-t-"), value: currentTarget });
  } catch (error) {
    checks.push({ id: "current-link", ok: false, reason: error.code === "ENOENT" ? "missing" : error.message });
  }
  if (currentTarget) {
    try {
      const release = await verifyDistribution(currentTarget, { full: options.fullVerify !== false });
      checks.push({ id: "distribution", ok: true, version: release.version, integrity: release.integrity });
    } catch (error) {
      checks.push({ id: "distribution", ok: false, reason: error.message });
    }
  }
  if (await pathExists(plistPath)) {
    const stat = await fs.stat(plistPath);
    const lint = await commandStatus("plutil", ["-lint", plistPath]);
    checks.push({ id: "launch-agent-plist", ok: lint.ok && (stat.mode & 0o077) === 0, mode: modeString(stat.mode), reason: lint.ok ? undefined : lint.stderr || lint.stdout });
  } else {
    checks.push({ id: "launch-agent-plist", ok: false, reason: "missing" });
  }
  const loaded = process.platform === "darwin" ? await launchAgentLoaded(LAUNCH_AGENT_LABEL) : false;
  checks.push({ id: "launch-agent-loaded", ok: loaded });
  let endpoint = { id: "health", ok: false, reason: "service not loaded" };
  if (loaded) {
    try {
      const response = await fetch(`http://127.0.0.1:${options.port}/health`, { signal: AbortSignal.timeout(1500) });
      endpoint = { id: "health", ok: response.ok, status: response.status };
    } catch (error) {
      endpoint = { id: "health", ok: false, reason: error.message };
    }
  }
  checks.push(endpoint);
  const providerAuthInventory = inspectProviderAuthStores({
    stateDir: stateHome,
    legacyStateDir: resolve(options.openclawHome),
  });
  const providerAuthRepairPlan = buildProviderAuthRepairPlan({ inventory: providerAuthInventory });
  const providerAuthVerification = verifyProviderAuthHeart({
    inventory: providerAuthInventory,
    repairPlan: providerAuthRepairPlan,
  });
  checks.push({
    id: "provider-auth-heart",
    ok: providerAuthVerification.status === "ready",
    inventoryStatus: providerAuthInventory.status,
    repairPlanStatus: providerAuthRepairPlan.status,
    userVisibleState: providerAuthInventory.userVisibleState,
    completionClaimAllowed: providerAuthVerification.completionClaimAllowed,
    reason: providerAuthVerification.findings.join(",") || undefined,
  });
  const doctorRecoveryHeart = buildDoctorRecoveryHeart({
    installHealth: { checks: [...checks] },
    providerAuthInventory,
    providerAuthRepairPlan,
  });
  const doctorRecoveryVerification = verifyDoctorRecoveryHeart({ heart: doctorRecoveryHeart });
  checks.push({
    id: "doctor-recovery-heart",
    ok: doctorRecoveryVerification.status === "ready" && doctorRecoveryHeart.status !== "blocked",
    status: doctorRecoveryHeart.status,
    severity: doctorRecoveryHeart.severity,
    userVisibleStatus: doctorRecoveryHeart.userVisibleStatus,
    recoveryActionCount: doctorRecoveryHeart.recoveryPlan.actions.length,
    completionClaimAllowed: doctorRecoveryHeart.completionClaimAllowed,
    reason: doctorRecoveryVerification.findings.join(",") || undefined,
  });
  return { schema: `${INSTALL_SCHEMA}.health`, checkedAt: new Date().toISOString(), status: checks.every((check) => check.ok) ? "healthy" : "unhealthy", checks };
}

export function assessInstallReadiness(health) {
  const checks = Array.isArray(health?.checks) ? health.checks : [];
  const byId = new Map(checks.map((check) => [check.id, check]));
  const missingInfrastructure = INSTALL_INFRASTRUCTURE_CHECK_IDS.filter((id) => !byId.has(id));
  const failedInfrastructure = INSTALL_INFRASTRUCTURE_CHECK_IDS
    .map((id) => byId.get(id))
    .filter((check) => check && !check.ok);
  const providerAuth = byId.get("provider-auth-heart") ?? null;
  const doctorRecovery = byId.get("doctor-recovery-heart") ?? null;

  if (missingInfrastructure.length > 0 || failedInfrastructure.length > 0) {
    return {
      status: "blocked",
      ok: false,
      providerSetupRequired: Boolean(providerAuth && !providerAuth.ok),
      missingInfrastructure,
      failedInfrastructure,
      providerAuth,
      doctorRecovery,
      userVisibleState: providerAuth?.userVisibleState ?? doctorRecovery?.userVisibleStatus ?? null,
    };
  }

  if (providerAuth && !providerAuth.ok) {
    return {
      status: "needs_provider_setup",
      ok: true,
      providerSetupRequired: true,
      missingInfrastructure: [],
      failedInfrastructure: [],
      providerAuth,
      doctorRecovery,
      userVisibleState: providerAuth.userVisibleState ?? doctorRecovery?.userVisibleStatus ?? null,
    };
  }

  return {
    status: "ready",
    ok: true,
    providerSetupRequired: false,
    missingInfrastructure: [],
    failedInfrastructure: [],
    providerAuth,
    doctorRecovery,
    userVisibleState: null,
  };
}

export function defaultOptions({ scriptDir, workspaceRoot } = {}) {
  const root = workspaceRoot ?? resolve(scriptDir ?? process.cwd(), "..");
  return {
    release: join(root, ".gpao-t", "releases", "gpao-t-0.1.0"),
    stateHome: join(homedir(), ".gpao-t"),
    openclawHome: join(homedir(), ".openclaw"),
    launchAgentsDir: join(homedir(), "Library", "LaunchAgents"),
    plistTemplate: join(root, "installer", `${LAUNCH_AGENT_LABEL}.plist.template`),
    migrationProfile: "none",
    port: DEFAULT_PORT,
    fullVerify: true,
    apply: false,
    applyToken: null,
  };
}

export function formatHuman(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function verifySecretModes(root) {
  const findings = [];
  if (!(await pathExists(root))) return findings;
  async function visit(pathname) {
    const stat = await fs.lstat(pathname);
    if (stat.isSymbolicLink()) return;
    if (isSecretPath(pathname)) {
      const bad = stat.isDirectory() ? (stat.mode & 0o077) !== 0 : (stat.mode & 0o077) !== 0;
      if (bad) findings.push({ path: pathname, mode: modeString(stat.mode) });
    }
    if (stat.isDirectory()) {
      for (const entry of await fs.readdir(pathname)) await visit(join(pathname, entry));
    }
  }
  await visit(root);
  return findings;
}

export async function makeFixtureManifest(releaseRoot, version = "0.1.0") {
  const entries = await inventoryTree(releaseRoot, { hashFiles: true });
  const files = entries
    .filter((entry) => entry.path !== "." && entry.path !== MANIFEST_NAME && entry.kind !== "directory")
    .map((entry) => entry.kind === "file"
      ? { path: entry.path, kind: "file", size: entry.size, sha256: entry.sha256 }
      : { path: entry.path, kind: "symlink", target: entry.target, sha256: entry.sha256 });
  const totalBytes = files.filter((entry) => entry.kind === "file").reduce((sum, entry) => sum + entry.size, 0);
  const manifest = {
    schema: "gpao_t.distribution_manifest.v2",
    productId: "gpao-t",
    product: "nBeAI. GPAO-T",
    version,
    distributionChannel: "internal-production",
    intendedAudience: "internal",
    publicRelease: false,
    externalDistributionExecuted: false,
    generatedAt: new Date().toISOString(),
    stateHome: "~/.gpao-t",
    entrypoint: "gpao-t.mjs",
    fileCount: files.length,
    totalBytes,
    files,
  };
  await writeJsonAtomic(join(releaseRoot, MANIFEST_NAME), manifest, 0o644);
  return manifest;
}
