import { randomBytes, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  realpath,
  rm,
} from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";

export const MANIFEST_NAME = "GPAO-T-DISTRIBUTION-MANIFEST.json";
export const TREE_HASH_ALGORITHM = "sha256-path-kind-size-content-v1";
const RUNTIME_SOURCE_TOP_LEVEL = [
  "CHANGELOG.md",
  "GPAO-T-RUNTIME.json",
  "LICENSE",
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "dist",
  "docs",
  "gpao-t.mjs",
  "npm-shrinkwrap.json",
  "openclaw.mjs",
  "package.json",
  "patches",
  "pnpm-workspace.yaml",
  "scripts",
  "skills",
  "src",
];

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toPortablePath(path) {
  return path.split(sep).join("/");
}

export function assertSafeRelativePath(path, label = "path") {
  if (typeof path !== "string" || path.length === 0 || path.includes("\0") || path.includes("\\")) {
    throw new Error(`${label} is not a safe relative path: ${JSON.stringify(path)}`);
  }
  if (isAbsolute(path) || path.split("/").some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`${label} escapes its root: ${path}`);
  }
  return path;
}

export async function hashFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function fileRecord(root, path) {
  assertSafeRelativePath(path);
  const absolute = join(root, ...path.split("/"));
  const stat = await lstat(absolute);
  if (stat.isSymbolicLink()) {
    const target = await readlink(absolute);
    return {
      path,
      kind: "symlink",
      target,
      sha256: createHash("sha256").update(target).digest("hex"),
    };
  }
  if (!stat.isFile()) throw new Error(`runtime package entry is not a file or symlink: ${path}`);
  return { path, kind: "file", size: stat.size, sha256: await hashFile(absolute) };
}

export async function collectTree(root, { ignoreTopLevel = [], skipManifest = false } = {}) {
  const records = [];
  const ignored = new Set(ignoreTopLevel);

  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => compareText(left.name, right.name));
    for (const entry of entries) {
      const absolute = join(current, entry.name);
      const path = toPortablePath(relative(root, absolute));
      const topLevel = path.split("/", 1)[0];
      if (ignored.has(topLevel) || (skipManifest && path === MANIFEST_NAME)) continue;
      const stat = await lstat(absolute);
      if (stat.isDirectory()) {
        await visit(absolute);
      } else if (stat.isSymbolicLink()) {
        const target = await readlink(absolute);
        records.push({
          path,
          kind: "symlink",
          target,
          sha256: createHash("sha256").update(target).digest("hex"),
        });
      } else if (stat.isFile()) {
        records.push({ path, kind: "file", size: stat.size, sha256: await hashFile(absolute) });
      } else {
        throw new Error(`unsupported filesystem entry in distribution: ${path}`);
      }
    }
  }

  await visit(root);
  return records.sort((left, right) => compareText(left.path, right.path));
}

export function treeDigest(records) {
  const hash = createHash("sha256");
  for (const record of [...records].sort((left, right) => compareText(left.path, right.path))) {
    hash.update(record.path);
    hash.update("\0");
    hash.update(record.kind);
    hash.update("\0");
    hash.update(String(record.size ?? ""));
    hash.update("\0");
    hash.update(record.sha256);
    hash.update("\0");
    hash.update(record.target ?? "");
    hash.update("\n");
  }
  return hash.digest("hex");
}

function recordFingerprint(record) {
  return JSON.stringify({
    path: record.path,
    kind: record.kind,
    size: record.size ?? null,
    sha256: record.sha256,
    target: record.target ?? null,
  });
}

export function assertMatchingTrees(expected, actual, label = "runtime stage") {
  const expectedMap = new Map(expected.map((record) => [record.path, record]));
  const actualMap = new Map(actual.map((record) => [record.path, record]));
  const differences = [];
  for (const path of [...new Set([...expectedMap.keys(), ...actualMap.keys()])].sort(compareText)) {
    const left = expectedMap.get(path);
    const right = actualMap.get(path);
    if (!left) differences.push(`unexpected: ${path}`);
    else if (!right) differences.push(`missing: ${path}`);
    else if (recordFingerprint(left) !== recordFingerprint(right)) differences.push(`changed: ${path}`);
    if (differences.length === 20) break;
  }
  if (differences.length > 0) {
    throw new Error(`${label} does not match the current source build:\n- ${differences.join("\n- ")}`);
  }
}

export async function runCommand(command, args, { cwd, env, timeoutMs = 120_000 } = {}) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    let outputBytes = 0;
    const outputLimit = 64 * 1024 * 1024;
    let settled = false;
    let timer;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) rejectPromise(error);
      else resolvePromise(result);
    };
    const collect = (target) => (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > outputLimit) {
        child.kill("SIGKILL");
        finish(new Error(`${command} output exceeded ${outputLimit} bytes`));
        return;
      }
      target.push(chunk);
    };
    child.stdout.on("data", collect(stdout));
    child.stderr.on("data", collect(stderr));
    child.once("error", (error) => finish(error));
    child.once("exit", (code, signal) => {
      const result = {
        code: code ?? 1,
        signal,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      };
      if (code === 0) finish(null, result);
      else {
        const detail = result.stderr.trim() || result.stdout.trim() || `signal ${signal ?? "unknown"}`;
        finish(new Error(`${command} ${args.join(" ")} failed: ${detail}`));
      }
    });
    timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new Error(`${command} ${args.join(" ")} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

export async function sourcePackRecords(sourceBuild) {
  const npmCache = await mkdtemp(join(tmpdir(), "gpao-t-npm-cache-"));
  try {
    const result = await runCommand("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
      cwd: sourceBuild,
      env: { npm_config_cache: npmCache },
      timeoutMs: 600_000,
    });
    const payload = JSON.parse(result.stdout);
    const files = payload?.[0]?.files;
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error("npm pack dry-run returned no source package files");
    }
    const paths = files.map((entry) => assertSafeRelativePath(entry.path, "npm pack path"));
    if (new Set(paths).size !== paths.length) throw new Error("npm pack dry-run returned duplicate paths");
    const records = [];
    for (const path of paths.sort(compareText)) records.push(await fileRecord(sourceBuild, path));
    return records;
  } finally {
    await rm(npmCache, { recursive: true, force: true });
  }
}

export async function sourceRuntimeRecords(sourceBuild) {
  const records = [];
  for (const entry of RUNTIME_SOURCE_TOP_LEVEL) {
    const absolute = join(sourceBuild, entry);
    try {
      const stat = await lstat(absolute);
      if (stat.isDirectory()) {
        const subtree = await collectTree(absolute);
        records.push(...subtree.map((record) => ({ ...record, path: `${entry}/${record.path}` })));
      } else {
        records.push(await fileRecord(sourceBuild, entry));
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error(`source runtime entry is missing: ${entry}`);
      }
      throw error;
    }
  }
  return records.sort((left, right) => compareText(left.path, right.path));
}

async function readBuildStamp(sourceBuild, name) {
  const path = join(sourceBuild, "dist", name);
  const value = JSON.parse(await readFile(path, "utf8"));
  return { name, sha256: await hashFile(path), value };
}

export async function verifyFreshRuntimeStage({ sourceBuild, runtimeStage }) {
  const [sourceRoot, stageRoot] = await Promise.all([realpath(sourceBuild), realpath(runtimeStage)]);
  const stageRecords = await collectTree(stageRoot, { ignoreTopLevel: ["node_modules"] });
  const [buildStamp, runtimePostbuildStamp] = await Promise.all([
    readBuildStamp(sourceRoot, ".buildstamp"),
    readBuildStamp(sourceRoot, ".runtime-postbuildstamp"),
  ]);
  const runtimeStageTreeSha256 = treeDigest(stageRecords);
  return {
    schema: "gpao_t.runtime_stage_provenance.v1",
    hashAlgorithm: TREE_HASH_ALGORITHM,
    sourceBuildTreeSha256: runtimeStageTreeSha256,
    runtimeStageTreeSha256,
    runtimeFileCount: stageRecords.length,
    runtimeBytes: stageRecords.reduce((sum, record) => sum + (record.size ?? 0), 0),
    ignoredStageTopLevel: ["node_modules"],
    sourceTopLevel: RUNTIME_SOURCE_TOP_LEVEL,
    sourceBuildMarkers: [buildStamp, runtimePostbuildStamp],
  };
}

export async function createZipArchive(distributionRoot, archivePath) {
  const root = resolve(distributionRoot);
  const archive = resolve(archivePath);
  if (archive === root || archive.startsWith(`${root}${sep}`)) {
    throw new Error("archive must be outside the distribution directory");
  }
  await mkdir(dirname(archive), { recursive: true });
  await rm(archive, { force: true });
  await runCommand("zip", ["-q", "-X", "-y", "-r", archive, root.slice(root.lastIndexOf(sep) + 1)], {
    cwd: dirname(root),
    timeoutMs: 300_000,
  });
  return { path: archive, sha256: await hashFile(archive) };
}

export async function verifyArchiveChecksum(archivePath, checksumPath) {
  const checksumText = (await readFile(checksumPath, "utf8")).trim();
  const match = /^([a-fA-F0-9]{64})(?:\s+\*?(.+))?$/.exec(checksumText);
  if (!match) throw new Error(`invalid SHA-256 sidecar: ${checksumPath}`);
  const actual = await hashFile(archivePath);
  if (actual !== match[1].toLowerCase()) throw new Error(`archive SHA-256 mismatch: ${archivePath}`);
  if (match[2] && match[2] !== archivePath.slice(archivePath.lastIndexOf(sep) + 1)) {
    throw new Error(`SHA-256 sidecar names a different archive: ${match[2]}`);
  }
  return actual;
}

export async function inspectZipPaths(archivePath) {
  const result = await runCommand("unzip", ["-Z1", archivePath], { timeoutMs: 120_000 });
  const paths = result.stdout.split(/\r?\n/u).filter(Boolean);
  if (paths.length === 0) throw new Error("archive is empty");
  for (const raw of paths) {
    const path = raw.endsWith("/") ? raw.slice(0, -1) : raw;
    assertSafeRelativePath(path, "archive entry");
  }
  return paths;
}

export async function extractZipArchive(archivePath, destination) {
  await inspectZipPaths(archivePath);
  await mkdir(destination, { recursive: true });
  await runCommand("unzip", ["-q", archivePath, "-d", destination], { timeoutMs: 300_000 });
  const entries = (await readdir(destination, { withFileTypes: true })).filter((entry) => entry.name !== "__MACOSX");
  if (entries.length !== 1 || !entries[0].isDirectory()) {
    throw new Error("archive must contain exactly one distribution root directory");
  }
  return join(destination, entries[0].name);
}

function assertManifestRecord(record) {
  assertSafeRelativePath(record?.path, "manifest path");
  if (record.kind === "file") {
    if (!Number.isSafeInteger(record.size) || record.size < 0 || !/^[a-f0-9]{64}$/u.test(record.sha256)) {
      throw new Error(`invalid manifest file record: ${record.path}`);
    }
  } else if (record.kind === "symlink") {
    if (typeof record.target !== "string" || !/^[a-f0-9]{64}$/u.test(record.sha256)) {
      throw new Error(`invalid manifest symlink record: ${record.path}`);
    }
  } else {
    throw new Error(`unsupported manifest record kind: ${record?.kind}`);
  }
}

export async function verifyDistributionManifest(distributionRoot) {
  const manifestPath = join(distributionRoot, MANIFEST_NAME);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.schema !== "gpao_t.distribution_manifest.v1") throw new Error("unsupported distribution manifest schema");
  if (!Array.isArray(manifest.files)) throw new Error("distribution manifest files must be an array");
  for (const record of manifest.files) assertManifestRecord(record);
  if (new Set(manifest.files.map((record) => record.path)).size !== manifest.files.length) {
    throw new Error("distribution manifest contains duplicate paths");
  }
  const actual = await collectTree(distributionRoot, { skipManifest: true });
  assertMatchingTrees(manifest.files, actual, "distribution manifest");
  const totalBytes = actual.reduce((sum, record) => sum + (record.size ?? 0), 0);
  if (manifest.fileCount !== actual.length || manifest.totalBytes !== totalBytes) {
    throw new Error("distribution manifest summary does not match extracted files");
  }
  const entrypoint = assertSafeRelativePath(manifest.entrypoint, "manifest entrypoint");
  const packageJson = JSON.parse(await readFile(join(distributionRoot, "package.json"), "utf8"));
  if (packageJson.name !== "gpao-t" || packageJson.bin?.["gpao-t"] !== entrypoint) {
    throw new Error("distribution package identity or entrypoint is invalid");
  }

  const provenance = manifest.runtimeProvenance;
  if (provenance?.schema !== "gpao_t.runtime_stage_provenance.v1") {
    throw new Error("distribution manifest is missing runtime stage provenance");
  }
  if (
    provenance.hashAlgorithm !== TREE_HASH_ALGORITHM ||
    !/^[a-f0-9]{64}$/u.test(provenance.sourceBuildTreeSha256) ||
    !/^[a-f0-9]{64}$/u.test(provenance.runtimeStageTreeSha256) ||
    (provenance.distributionRuntimeTreeSha256 !== undefined &&
      !/^[a-f0-9]{64}$/u.test(provenance.distributionRuntimeTreeSha256)) ||
    !Number.isSafeInteger(provenance.runtimeFileCount) ||
    provenance.runtimeFileCount < 1 ||
    (provenance.distributionRuntimeFileCount !== undefined &&
      (!Number.isSafeInteger(provenance.distributionRuntimeFileCount) ||
        provenance.distributionRuntimeFileCount < 1)) ||
    JSON.stringify(provenance.ignoredStageTopLevel) !== JSON.stringify(["node_modules"])
  ) {
    throw new Error("distribution manifest contains invalid runtime provenance fields");
  }
  if (provenance.sourceBuildTreeSha256 !== provenance.runtimeStageTreeSha256) {
    throw new Error("manifest records a stale runtime stage hash");
  }
  const runtimeRoot = join(distributionRoot, "compatibility", "gpao-t");
  const runtimeRecords = await collectTree(runtimeRoot, {
    ignoreTopLevel: provenance.ignoredStageTopLevel,
  });
  const expectedRuntimeTreeSha256 =
    provenance.distributionRuntimeTreeSha256 ?? provenance.runtimeStageTreeSha256;
  const expectedRuntimeFileCount =
    provenance.distributionRuntimeFileCount ?? provenance.runtimeFileCount;
  if (
    treeDigest(runtimeRecords) !== expectedRuntimeTreeSha256 ||
    runtimeRecords.length !== expectedRuntimeFileCount
  ) {
    throw new Error("extracted runtime does not match its sealed distribution provenance");
  }
  return { manifest, packageJson, runtimeRoot, runtimeRecords };
}

export async function verifyCurrentSourceBuild({ sourceBuild, runtimeRecords, provenance }) {
  const sourceRoot = await realpath(sourceBuild);
  const [buildStamp, runtimePostbuildStamp] = await Promise.all([
    readBuildStamp(sourceRoot, ".buildstamp"),
    readBuildStamp(sourceRoot, ".runtime-postbuildstamp"),
  ]);
  const currentMarkers = [buildStamp, runtimePostbuildStamp];
  if (JSON.stringify(currentMarkers) !== JSON.stringify(provenance.sourceBuildMarkers)) {
    throw new Error("archive source build markers differ from the current source build");
  }
  const digest = treeDigest(runtimeRecords);
  const expectedRuntimeTreeSha256 =
    provenance.distributionRuntimeTreeSha256 ?? provenance.runtimeStageTreeSha256;
  if (digest !== expectedRuntimeTreeSha256) {
    throw new Error("archive runtime tree hash differs from sealed distribution provenance");
  }
  return provenance.sourceBuildTreeSha256;
}

export async function validateContainedSymlinks(root) {
  const records = await collectTree(root);
  const absoluteRoot = `${resolve(root)}${sep}`;
  for (const record of records.filter((entry) => entry.kind === "symlink")) {
    if (isAbsolute(record.target)) throw new Error(`absolute symlink is not allowed: ${record.path}`);
    const target = resolve(root, dirname(record.path), record.target);
    if (target !== resolve(root) && !target.startsWith(absoluteRoot)) {
      throw new Error(`symlink escapes the distribution root: ${record.path}`);
    }
  }
}

async function isolatedEnvironment(isolationRoot) {
  const home = join(isolationRoot, "home");
  const state = join(isolationRoot, "state");
  await Promise.all([mkdir(home, { recursive: true }), mkdir(state, { recursive: true })]);
  const token = randomBytes(24).toString("hex");
  return {
    HOME: home,
    GPAO_T_STATE_DIR: state,
    GPAO_T_CONFIG_PATH: join(state, "gpao-t.json"),
    GPAO_T_GATEWAY_TOKEN: token,
    OPENCLAW_STATE_DIR: state,
    OPENCLAW_CONFIG_PATH: join(state, "gpao-t.json"),
    OPENCLAW_GATEWAY_TOKEN: token,
    OPENCLAW_SKIP_UPDATE_CHECK: "1",
    NO_COLOR: "1",
    CI: "1",
  };
}

export async function runHelpSmoke(distributionRoot, isolationRoot) {
  const env = await isolatedEnvironment(isolationRoot);
  const result = await runCommand(process.execPath, [join(distributionRoot, "gpao-t.mjs"), "--help"], {
    cwd: distributionRoot,
    env,
    timeoutMs: 60_000,
  });
  if (!/GPAO-T|Usage:/u.test(result.stdout + result.stderr)) {
    throw new Error("gpao-t --help did not return recognizable help output");
  }
  return { status: "passed", outputBytes: Buffer.byteLength(result.stdout + result.stderr) };
}

async function reserveLoopbackPort() {
  return await new Promise((resolvePromise, rejectPromise) => {
    const server = createServer();
    server.unref();
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? rejectPromise(error) : resolvePromise(port)));
    });
  });
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolvePromise) => {
    if (child.exitCode !== null || child.signalCode !== null) return resolvePromise(true);
    const timer = setTimeout(() => resolvePromise(false), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolvePromise(true);
    });
  });
}

export async function runHealthSmoke(distributionRoot, isolationRoot, { timeoutMs = 60_000 } = {}) {
  const env = await isolatedEnvironment(isolationRoot);
  const port = await reserveLoopbackPort();
  const entrypoint = join(distributionRoot, "gpao-t.mjs");
  const child = spawn(
    process.execPath,
    [entrypoint, "gateway", "run", "--allow-unconfigured", "--bind", "loopback", "--port", String(port)],
    { cwd: distributionRoot, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] },
  );
  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const deadline = Date.now() + timeoutMs;
  let health;
  try {
    while (Date.now() < deadline) {
      if (child.exitCode !== null) break;
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(2_000) });
        const body = await response.text();
        if (response.status === 200) {
          health = { status: response.status, body: body.slice(0, 2_000) };
          break;
        }
      } catch {
        // Gateway startup is polled until the bounded deadline.
      }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
    }
    if (!health) {
      const output = `${Buffer.concat(stdout).toString("utf8")}\n${Buffer.concat(stderr).toString("utf8")}`.trim();
      throw new Error(`isolated gateway health smoke failed on port ${port}: ${output.slice(-4_000)}`);
    }
    return { status: "passed", port, httpStatus: health.status, responseBytes: Buffer.byteLength(health.body) };
  } finally {
    if (child.exitCode === null) child.kill("SIGTERM");
    if (!(await waitForExit(child, 5_000)) && child.exitCode === null) child.kill("SIGKILL");
    await waitForExit(child, 5_000);
  }
}
