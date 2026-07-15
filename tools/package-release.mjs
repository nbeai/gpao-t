import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { auditProductIdentity } from "../src/core/identity-audit.js";
import { PRODUCT_IDENTITY } from "../src/core/product-identity.js";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = packageJson.version;
const output = path.join(root, ".gpao-t3", "releases");
const name = `${PRODUCT_IDENTITY.packageName}-${version}`;
const feedPath = path.join(output, "update-feed.json");
const payloadFiles = ["src", "tools/install-native.mjs", "tools/uninstall-native.mjs", "tools/rollback-native.mjs", "tools/service-native.mjs", "tools/update-native.mjs", "node_modules", "package.json", "package-lock.json", "README.md"];

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function atomicJson(filePath, value) {
  const temporary = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, filePath);
}

function walk(base, current = base, entries = []) {
  for (const child of fs.readdirSync(current, { withFileTypes: true })) {
    if (child.name === ".DS_Store") continue;
    const absolute = path.join(current, child.name);
    if (child.isDirectory()) walk(base, absolute, entries);
    else if (child.isFile()) entries.push(path.relative(base, absolute));
  }
  return entries;
}

const identity = auditProductIdentity(root);
if (identity.status !== "pass") throw new Error(`Product identity audit failed: ${JSON.stringify(identity.violations)}`);
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const genericArchive = path.join(output, `${name}.tar.gz`);
const genericManifest = path.join(output, `${name}.manifest.json`);
if (fs.existsSync(feedPath) && fs.existsSync(genericArchive) && fs.existsSync(genericManifest)) {
  const existingFeed = JSON.parse(fs.readFileSync(feedPath, "utf8"));
  const current = (existingFeed.releases || []).find(entry => entry.archive === path.basename(genericArchive) && entry.sha256 === sha256(genericArchive));
  if (current) {
    const preservedArchive = path.join(output, `${name}-${current.sha256.slice(0, 12)}.tar.gz`);
    const preservedManifest = path.join(output, `${name}-${current.sha256.slice(0, 12)}.manifest.json`);
    if (!fs.existsSync(preservedArchive)) fs.copyFileSync(genericArchive, preservedArchive);
    if (!fs.existsSync(preservedManifest)) fs.copyFileSync(genericManifest, preservedManifest);
    current.archive = path.basename(preservedArchive);
    atomicJson(feedPath, existingFeed);
  }
}
const temporaryArchive = path.join(output, `${name}.${process.pid}.tmp.tar.gz`);
const staging = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-package-"));
try {
  for (const relative of payloadFiles) {
    const source = path.join(root, relative);
    if (!fs.existsSync(source)) throw new Error(`Release input is missing: ${relative}`);
    const destination = path.join(staging, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
    fs.cpSync(source, destination, { recursive: true, filter: sourcePath => path.basename(sourcePath) !== ".DS_Store" });
  }
  const bundledNode = path.join(staging, "runtime", "bin", "node");
  fs.mkdirSync(path.dirname(bundledNode), { recursive: true, mode: 0o700 });
  fs.copyFileSync(process.execPath, bundledNode);
  fs.chmodSync(bundledNode, 0o755);
  if (process.platform === "darwin") {
    const helper = path.join(staging, "runtime", "bin", "gpao-t3-keychain-helper");
    const compiled = spawnSync("xcrun", ["swiftc", "-O", path.join(root, "native", "macos-keychain-helper.swift"), "-o", helper], { encoding: "utf8" });
    if (compiled.status !== 0) throw new Error("Failed to build the macOS Keychain helper");
    const signed = spawnSync("codesign", ["--force", "--sign", "-", helper], { encoding: "utf8" });
    if (signed.status !== 0) throw new Error("Failed to sign the macOS Keychain helper");
    fs.chmodSync(helper, 0o755);
  }
  const runtimeManifest = {
    schema: "gpao_t3.bundled_runtime.v1",
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    executable: "runtime/bin/node",
    sha256: sha256(bundledNode)
  };
  atomicJson(path.join(staging, "runtime", "manifest.json"), runtimeManifest);
  const files = walk(staging).sort().map(relative => ({ path: relative, bytes: fs.statSync(path.join(staging, relative)).size, sha256: sha256(path.join(staging, relative)) }));
  atomicJson(path.join(staging, "SBOM.json"), { schema: "gpao_t3.sbom.v1", product: PRODUCT_IDENTITY.productId, version, files });
  const result = spawnSync("tar", ["-czf", temporaryArchive, "src", "tools", "runtime", "node_modules", "package.json", "package-lock.json", "README.md", "SBOM.json"], { cwd: staging, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || "Archive creation failed");
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
}

const checksum = sha256(temporaryArchive);
const releaseId = `${version}-${checksum.slice(0, 12)}`;
const archive = path.join(output, `${name}-${checksum.slice(0, 12)}.tar.gz`);
const manifestPath = path.join(output, `${name}-${checksum.slice(0, 12)}.manifest.json`);
fs.renameSync(temporaryArchive, archive);
const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
const gitStatus = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
const manifest = {
  schema: "gpao_t3.release_manifest.v2",
  product: PRODUCT_IDENTITY.productId,
  name,
  version,
  releaseId,
  platform: `${process.platform}-${process.arch}`,
  bundledRuntime: { node: process.version, executable: "runtime/bin/node" },
  sourceCommit: git.status === 0 ? git.stdout.trim() : null,
  sourceDirty: gitStatus.status === 0 ? Boolean(gitStatus.stdout.trim()) : null,
  createdAt: new Date().toISOString(),
  archive: path.basename(archive),
  sha256: checksum,
  sbom: "SBOM.json",
  install: "node tools/install-native.mjs --archive <archive> --install-root <local-install-root> --state-dir <isolated-state-dir>",
  rollback: "<install-root>/bin/gpao-t3 rollback"
};
atomicJson(manifestPath, manifest);
fs.copyFileSync(manifestPath, genericManifest);

let feed = { schema: "gpao_t3.update_feed.v1", product: PRODUCT_IDENTITY.productId, channel: PRODUCT_IDENTITY.updateChannel, releases: [] };
if (fs.existsSync(feedPath)) {
  try { feed = JSON.parse(fs.readFileSync(feedPath, "utf8")); } catch {}
}
feed.releases = [manifest, ...(feed.releases || []).filter(entry => entry.releaseId !== releaseId)]
  .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
feed.updatedAt = new Date().toISOString();
atomicJson(feedPath, feed);
const distributionDir = path.join(output, `${name}-${checksum.slice(0, 12)}-${process.platform}-${process.arch}`);
fs.rmSync(distributionDir, { recursive: true, force: true });
fs.mkdirSync(distributionDir, { recursive: true, mode: 0o700 });
fs.copyFileSync(archive, path.join(distributionDir, path.basename(archive)));
fs.copyFileSync(manifestPath, path.join(distributionDir, path.basename(manifestPath)));
fs.copyFileSync(feedPath, path.join(distributionDir, path.basename(feedPath)));
const installerCommand = `#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ARCHIVE="$HERE/${path.basename(archive)}"
MANIFEST="$HERE/${path.basename(manifestPath)}"
TMP=$(mktemp -d "\${TMPDIR:-/tmp}/gpao-t3-installer.XXXXXX")
trap 'rm -rf "$TMP"' EXIT INT TERM
/usr/bin/tar -xzf "$ARCHIVE" -C "$TMP" runtime/bin/node tools/install-native.mjs
"$TMP/runtime/bin/node" "$TMP/tools/install-native.mjs" --archive "$ARCHIVE" --manifest "$MANIFEST"
if [ "\${GPAO_T3_INSTALL_NO_ACTIVATE:-0}" != "1" ]; then
  "$HOME/.local/share/gpao-t3/bin/gpao-t3" service install --activate
fi
if [ "\${GPAO_T3_INSTALL_NO_OPEN:-0}" != "1" ]; then
  /usr/bin/open "http://127.0.0.1:18899"
fi
`;
const installerPath = path.join(distributionDir, "설치.command");
fs.writeFileSync(installerPath, installerCommand, { mode: 0o755 });
fs.chmodSync(installerPath, 0o755);
atomicJson(path.join(distributionDir, "DISTRIBUTION.json"), { schema: "gpao_t3.macos_distribution.v1", product: PRODUCT_IDENTITY.productId, version, releaseId, platform: `${process.platform}-${process.arch}`, archive: path.basename(archive), manifest: path.basename(manifestPath), updateFeed: path.basename(feedPath), installer: "설치.command", serviceActivation: "user_launch_agent", dashboardAutoOpen: true, checksum });
console.log(JSON.stringify(manifest, null, 2));
