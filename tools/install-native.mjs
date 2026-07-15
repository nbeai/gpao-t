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
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout;
}

const archive = path.resolve(arg("--archive", ""));
const installDir = path.resolve(arg("--install-dir", path.join(os.homedir(), ".local", "share", "gpao-t-native-runtime")));
const stateDir = path.resolve(arg("--state-dir", path.join(os.homedir(), ".gpao-t-next")));
const manifestPath = path.resolve(arg("--manifest", archive.replace(/\.tar\.gz$/, ".manifest.json")));

if (!archive || !fs.existsSync(archive)) throw new Error("A readable --archive is required");
if (!fs.existsSync(manifestPath)) throw new Error("A matching --manifest is required");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (manifest.schema !== "gpao_t.release_manifest.v1" || manifest.sha256 !== sha256(archive)) throw new Error("Release archive checksum verification failed");

const entries = run("tar", ["-tzf", archive]).trim().split("\n").filter(Boolean);
if (!entries.length || entries.some(entry => path.isAbsolute(entry) || entry.split("/").includes(".."))) throw new Error("Release archive contains an unsafe path");
if (!entries.includes("src/index.js") || !entries.includes("package.json")) throw new Error("Release archive is missing required runtime files");

fs.mkdirSync(path.dirname(installDir), { recursive: true, mode: 0o700 });
const staging = fs.mkdtempSync(path.join(path.dirname(installDir), ".gpao-t-install-"));
const backup = fs.existsSync(installDir) ? `${installDir}.previous-${Date.now()}` : null;
try {
  run("tar", ["-xzf", archive, "-C", staging]);
  if (backup) fs.renameSync(installDir, backup);
  fs.renameSync(staging, installDir);
  const doctor = run(process.execPath, [path.join(installDir, "src", "index.js"), "doctor", "--state-dir", stateDir]);
  const receipt = { schema: "gpao_t.native_install_receipt.v1", installedAt: new Date().toISOString(), installDir, stateDir, archive: path.basename(archive), sha256: manifest.sha256, backup: backup ? path.basename(backup) : null, doctor: JSON.parse(doctor) };
  fs.writeFileSync(path.join(installDir, "INSTALL-RECEIPT.json"), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
  if (backup && !fs.existsSync(installDir) && fs.existsSync(backup)) fs.renameSync(backup, installDir);
  throw error;
}
