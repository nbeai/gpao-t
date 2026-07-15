import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const releases = path.join(root, ".gpao-t3", "releases");
const feed = JSON.parse(fs.readFileSync(path.join(releases, "update-feed.json"), "utf8"));
const latest = feed.releases.find(entry => entry.platform === `${process.platform}-${process.arch}`);
const archive = process.argv.includes("--archive") ? path.resolve(process.argv[process.argv.indexOf("--archive") + 1]) : latest ? path.join(releases, latest.archive) : null;
if (!archive || !fs.existsSync(archive)) throw new Error("Build a GPAO-T3 release archive before running release smoke");
const manifestPath = archive.replace(/\.tar\.gz$/, ".manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-release-smoke-"));
const installRoot = path.join(temporary, "install");
const stateDir = path.join(temporary, "state");

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} failed`);
  return result.stdout;
}

const install = JSON.parse(run(process.execPath, [path.join(root, "tools", "install-native.mjs"), "--archive", archive, "--manifest", manifestPath, "--install-root", installRoot, "--state-dir", stateDir]));
const current = fs.readFileSync(path.join(installRoot, "CURRENT"), "utf8").trim();
if (current !== manifest.releaseId || install.releaseId !== manifest.releaseId) throw new Error("Install did not activate the expected release slot");
const releaseDir = path.join(installRoot, "releases", current);
const bundledNode = path.join(releaseDir, "runtime", "bin", "node");
if (!fs.existsSync(bundledNode) || bundledNode === process.execPath) throw new Error("Installed bundled runtime is unavailable");
const keychainHelper = path.join(releaseDir, "runtime", "bin", "gpao-t3-keychain-helper");
if (process.platform === "darwin") {
  if (!fs.existsSync(keychainHelper)) throw new Error("Installed macOS Keychain helper is unavailable");
  run("codesign", ["--verify", "--strict", keychainHelper]);
}
const bundledVersion = run(bundledNode, ["--version"]).trim();
if (bundledVersion !== manifest.bundledRuntime.node) throw new Error("Installed bundled runtime version drifted");
const turn = JSON.parse(run(path.join(installRoot, "bin", "gpao-t3"), ["verify-turn", "--state-dir", stateDir]));
if (turn.status !== "succeeded") throw new Error("Bundled release verification turn failed");
const snapshot = JSON.parse(run(path.join(installRoot, "bin", "gpao-t3"), ["snapshot", "--state-dir", stateDir, "--label", "release-smoke"]));
const migration = JSON.parse(run(path.join(installRoot, "bin", "gpao-t3"), ["migrate", "--state-dir", stateDir]));
const restore = JSON.parse(run(path.join(installRoot, "bin", "gpao-t3"), ["restore", "--state-dir", stateDir, "--snapshot", snapshot.directory]));
const idempotentUpdate = JSON.parse(run(process.execPath, [path.join(root, "tools", "install-native.mjs"), "--archive", archive, "--manifest", manifestPath, "--install-root", installRoot, "--state-dir", stateDir]));
if (idempotentUpdate.releaseId !== current || fs.readFileSync(path.join(installRoot, "CURRENT"), "utf8").trim() !== current) throw new Error("Idempotent update changed the active release");
const entries = run("tar", ["-tzf", archive]).split("\n");
if (entries.some(entry => entry.includes(".DS_Store"))) throw new Error("Archive contains macOS metadata");
const uninstall = JSON.parse(run(path.join(releaseDir, "runtime", "bin", "node"), [path.join(releaseDir, "tools", "uninstall-native.mjs"), "--install-root", installRoot, "--confirm"]));
if (fs.existsSync(installRoot) || !fs.existsSync(stateDir)) throw new Error("Uninstall did not preserve state or remove the install root");
console.log(JSON.stringify({
  schema: "gpao_t3.release_smoke.v2",
  archive: path.basename(archive),
  releaseId: current,
  checksum: manifest.sha256,
  bundledRuntime: bundledVersion,
  keychainHelper: process.platform === "darwin" ? "bundled_signed" : "not_applicable",
  install: "pass",
  serviceManifest: install.serviceManifest ? "generated_not_activated" : "not_applicable",
  verificationTurn: turn.status,
  snapshot: snapshot.id,
  migration: migration.after.schemaVersion,
  restore: restore.restoredSnapshot,
  idempotentUpdate: "pass",
  identityScan: "clean",
  uninstall: uninstall.schema,
  statePreserved: true
}, null, 2));
