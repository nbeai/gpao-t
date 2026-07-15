import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} failed`);
  return result.stdout;
}

function pointer(root, name) {
  const file = path.join(root, name);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : null;
}

function atomicText(root, name, value) {
  const target = path.join(root, name);
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${value}\n`, { mode: 0o600 });
  fs.renameSync(temporary, target);
}

function launcher(root) {
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin, { recursive: true, mode: 0o700 });
  const script = `#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
RELEASE_ID=$(cat "$ROOT/CURRENT")
NODE="$ROOT/releases/$RELEASE_ID/runtime/bin/node"
if [ "\${1:-}" = "rollback" ]; then
  shift
  exec "$NODE" "$ROOT/releases/$RELEASE_ID/tools/rollback-native.mjs" --install-root "$ROOT" "$@"
fi
if [ "\${1:-}" = "service" ]; then
  shift
  exec "$NODE" "$ROOT/releases/$RELEASE_ID/tools/service-native.mjs" "$@" --install-root "$ROOT"
fi
if [ "\${1:-}" = "update" ]; then
  shift
  exec "$NODE" "$ROOT/releases/$RELEASE_ID/tools/update-native.mjs" "$@" --install-root "$ROOT"
fi
exec "$NODE" "$ROOT/releases/$RELEASE_ID/src/index.js" "$@"
`;
  const file = path.join(bin, "gpao-t3");
  fs.writeFileSync(file, script, { mode: 0o755 });
  fs.chmodSync(file, 0o755);
  return file;
}

function serviceManifest(root, launcherPath, stateDir) {
  const directory = path.join(root, "service");
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const file = path.join(directory, "ai.nbeai.gpao-t3.runtime.plist");
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>ai.nbeai.gpao-t3.runtime</string>
<key>ProgramArguments</key><array><string>${escape(launcherPath)}</string><string>start</string><string>--state-dir</string><string>${escape(stateDir)}</string><string>--port</string><string>18899</string></array>
<key>RunAtLoad</key><true/><key>KeepAlive</key><false/>
<key>StandardOutPath</key><string>${escape(path.join(stateDir, "runtime.stdout.log"))}</string>
<key>StandardErrorPath</key><string>${escape(path.join(stateDir, "runtime.stderr.log"))}</string>
</dict></plist>
`;
  fs.writeFileSync(file, plist, { mode: 0o600 });
  return file;
}

const archive = path.resolve(arg("--archive", ""));
const installRoot = path.resolve(arg("--install-root", arg("--install-dir", path.join(os.homedir(), ".local", "share", "gpao-t3"))));
const stateDir = path.resolve(arg("--state-dir", path.join(os.homedir(), ".gpao-t3")));
const manifestPath = path.resolve(arg("--manifest", archive.replace(/\.tar\.gz$/, ".manifest.json")));
if (!archive || !fs.existsSync(archive)) throw new Error("A readable --archive is required");
if (!fs.existsSync(manifestPath)) throw new Error("A matching --manifest is required");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.schema !== "gpao_t3.release_manifest.v2" || manifest.product !== "gpao-t3" || manifest.sha256 !== sha256(archive)) throw new Error("Release archive checksum or identity verification failed");
if (!/^[a-zA-Z0-9._-]{1,128}$/.test(manifest.releaseId || "")) throw new Error("Release id is invalid");

const entries = run("tar", ["-tzf", archive]).trim().split("\n").filter(Boolean).map(entry => entry.replace(/^\.\//, ""));
if (!entries.length || entries.some(entry => path.isAbsolute(entry) || entry.split("/").includes(".."))) throw new Error("Release archive contains an unsafe path");
const requiredEntries = ["src/index.js", "package.json", "runtime/bin/node", "runtime/manifest.json", "SBOM.json"];
if (process.platform === "darwin") requiredEntries.push("runtime/bin/gpao-t3-keychain-helper");
for (const required of requiredEntries) {
  if (!entries.includes(required)) throw new Error(`Release archive is missing ${required}`);
}

fs.mkdirSync(path.join(installRoot, "releases"), { recursive: true, mode: 0o700 });
const staging = fs.mkdtempSync(path.join(installRoot, ".staging-"));
const releaseDir = path.join(installRoot, "releases", manifest.releaseId);
const previousCurrent = pointer(installRoot, "CURRENT");
let preUpdateSnapshot = null;
try {
  run("tar", ["-xzf", archive, "-C", staging]);
  const runtimeManifest = JSON.parse(fs.readFileSync(path.join(staging, "runtime", "manifest.json"), "utf8"));
  const bundledNode = path.join(staging, runtimeManifest.executable);
  if (runtimeManifest.schema !== "gpao_t3.bundled_runtime.v1" || runtimeManifest.sha256 !== sha256(bundledNode)) throw new Error("Bundled runtime verification failed");
  const packaged = JSON.parse(fs.readFileSync(path.join(staging, "package.json"), "utf8"));
  if (packaged.name !== manifest.name.replace(`-${manifest.version}`, "") || packaged.version !== manifest.version) throw new Error("Packaged product metadata does not match the release manifest");
  if (previousCurrent && previousCurrent !== manifest.releaseId && fs.existsSync(stateDir)) {
    const previousNode = path.join(installRoot, "releases", previousCurrent, "runtime", "bin", "node");
    const previousEntry = path.join(installRoot, "releases", previousCurrent, "src", "index.js");
    if (fs.existsSync(previousNode) && fs.existsSync(previousEntry)) {
      const snapshot = run(previousNode, [previousEntry, "snapshot", "--state-dir", stateDir, "--label", `pre-update-${manifest.releaseId}`]);
      preUpdateSnapshot = JSON.parse(snapshot).id;
    }
  }
  const doctor = JSON.parse(run(bundledNode, [path.join(staging, "src", "index.js"), "doctor", "--state-dir", stateDir]));
  if (doctor.status !== "ready" || doctor.product !== "gpao-t3"
    || !Number.isInteger(doctor.stateIdentity?.schemaVersion)
    || doctor.stateIdentity.schemaVersion !== doctor.stateIdentity.currentSchemaVersion) {
    throw new Error("Release health check did not reach the GPAO-T3 ready state");
  }
  if (!fs.existsSync(releaseDir)) fs.renameSync(staging, releaseDir);
  else fs.rmSync(staging, { recursive: true, force: true });
  if (previousCurrent && previousCurrent !== manifest.releaseId) atomicText(installRoot, "LAST-GOOD", previousCurrent);
  atomicText(installRoot, "CURRENT", manifest.releaseId);
  const launcherPath = launcher(installRoot);
  const serviceFile = process.platform === "darwin" ? serviceManifest(installRoot, launcherPath, stateDir) : null;
  const receipt = {
    schema: "gpao_t3.install_receipt.v2",
    installedAt: new Date().toISOString(),
    installRoot,
    releaseId: manifest.releaseId,
    previousReleaseId: previousCurrent,
    lastGoodReleaseId: pointer(installRoot, "LAST-GOOD"),
    stateDir,
    statePreserved: true,
    preUpdateSnapshot,
    archive: path.basename(archive),
    sha256: manifest.sha256,
    bundledRuntime: runtimeManifest,
    launcher: launcherPath,
    serviceManifest: serviceFile,
    serviceActivated: false,
    dashboardUrl: "http://127.0.0.1:18899",
    doctor
  };
  fs.writeFileSync(path.join(installRoot, "INSTALL-RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
  if (previousCurrent) atomicText(installRoot, "CURRENT", previousCurrent);
  throw error;
}
