import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function read(root, name) {
  const file = path.join(root, name);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : null;
}

function write(root, name, value) {
  const target = path.join(root, name);
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${value}\n`, { mode: 0o600 });
  fs.renameSync(temporary, target);
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function snapshotPath(stateDir, snapshotId) {
  if (!/^[a-zA-Z0-9._-]{1,180}$/.test(snapshotId || "")) throw new Error("Rollback snapshot id is invalid");
  return path.join(stateDir, "snapshots", snapshotId);
}

function verifiedSnapshot(stateDir, snapshotId) {
  const directory = snapshotPath(stateDir, snapshotId);
  const manifestPath = path.join(directory, "manifest.json");
  if (!fs.existsSync(manifestPath)) throw new Error("Rollback state snapshot is unavailable");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.schema !== "gpao_t3.state_snapshot.v1" || !Array.isArray(manifest.files)) throw new Error("Rollback state snapshot identity is invalid");
  for (const file of manifest.files) {
    const source = path.resolve(directory, file.path);
    if (!source.startsWith(`${directory}${path.sep}`) || !fs.existsSync(source) || sha256(source) !== file.sha256) throw new Error("Rollback state snapshot integrity check failed");
  }
  return { directory, manifest };
}

function mutableEntries(stateDir, current = stateDir, entries = { files:[], directories:[] }) {
  if (!fs.existsSync(current)) return entries;
  for (const child of fs.readdirSync(current, { withFileTypes:true })) {
    const absolute = path.join(current, child.name);
    const relative = path.relative(stateDir, absolute);
    if (!relative || relative === "runtime.lock" || relative === "snapshots" || relative.startsWith(`snapshots${path.sep}`)) continue;
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error("Saved state contains an unsafe symbolic link");
    if (stat.isDirectory()) { entries.directories.push(absolute); mutableEntries(stateDir, absolute, entries); }
    else if (stat.isFile()) entries.files.push(absolute);
    else throw new Error("Saved state contains an unsupported entry");
  }
  return entries;
}

function restoreSnapshotFiles(stateDir, snapshotId) {
  const selected = verifiedSnapshot(stateDir, snapshotId);
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-rollback-state-"));
  try {
    for (const file of selected.manifest.files) {
      const destination = path.join(staging, file.path);
      fs.mkdirSync(path.dirname(destination), { recursive:true, mode:0o700 });
      fs.copyFileSync(path.join(selected.directory, file.path), destination);
      fs.chmodSync(destination, 0o600);
    }
    const current = mutableEntries(stateDir);
    for (const file of current.files) fs.rmSync(file, { force:true });
    for (const directory of current.directories.sort((left, right) => right.length - left.length)) fs.rmSync(directory, { recursive:false, force:true });
    for (const file of selected.manifest.files) {
      const destination = path.join(stateDir, file.path);
      fs.mkdirSync(path.dirname(destination), { recursive:true, mode:0o700 });
      fs.copyFileSync(path.join(staging, file.path), destination);
      fs.chmodSync(destination, 0o600);
    }
    return selected.manifest;
  } finally {
    fs.rmSync(staging, { recursive:true, force:true });
  }
}

const installRoot = path.resolve(arg("--install-root", ""));
const receiptPath = path.join(installRoot, "INSTALL-RECEIPT.json");
if (!installRoot || !fs.existsSync(receiptPath)) throw new Error("A valid GPAO-T3 install root is required");
const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
const current = read(installRoot, "CURRENT");
const target = read(installRoot, "LAST-GOOD");
if (!current || !target || current === target) throw new Error("No distinct last-good release is available");
const targetDir = path.join(installRoot, "releases", target);
const currentDir = path.join(installRoot, "releases", current);
const node = path.join(targetDir, "runtime", "bin", "node");
const entry = path.join(targetDir, "src", "index.js");
if (!fs.existsSync(node) || !fs.existsSync(entry)) throw new Error("Last-good release is incomplete");
if (!receipt.preUpdateSnapshot) throw new Error("No pre-update state snapshot is available for a compatible rollback");
const currentNode = path.join(currentDir, "runtime", "bin", "node");
const currentEntry = path.join(currentDir, "src", "index.js");
const safety = spawnSync(currentNode, [currentEntry, "snapshot", "--state-dir", receipt.stateDir, "--label", `pre-rollback-${target}`], { encoding:"utf8" });
if (safety.status !== 0) throw new Error(safety.stderr || safety.stdout || "Pre-rollback state snapshot failed");
const rollForwardSnapshot = JSON.parse(safety.stdout);
const restored = restoreSnapshotFiles(receipt.stateDir, receipt.preUpdateSnapshot);
const result = spawnSync(node, [entry, "doctor", "--state-dir", receipt.stateDir], { encoding: "utf8" });
if (result.status !== 0) {
  restoreSnapshotFiles(receipt.stateDir, rollForwardSnapshot.id);
  throw new Error(result.stderr || result.stdout || "Last-good health check failed");
}
const doctor = JSON.parse(result.stdout);
if (doctor.status !== "ready" || doctor.product !== "gpao-t3") {
  restoreSnapshotFiles(receipt.stateDir, rollForwardSnapshot.id);
  throw new Error("Last-good release did not reach ready state");
}
write(installRoot, "CURRENT", target);
write(installRoot, "LAST-GOOD", current);
const nextInstallReceipt = { ...receipt, installedAt:new Date().toISOString(), releaseId:target, previousReleaseId:current, lastGoodReleaseId:current, preUpdateSnapshot:rollForwardSnapshot.id, doctor };
fs.writeFileSync(receiptPath, `${JSON.stringify(nextInstallReceipt, null, 2)}\n`, { mode:0o600 });
const rollback = { schema: "gpao_t3.rollback_receipt.v2", rolledBackAt: new Date().toISOString(), fromReleaseId: current, toReleaseId: target, stateDir: receipt.stateDir, statePreserved: true, activeStateRestoredFrom: restored.id, rollForwardSnapshot: rollForwardSnapshot.id, doctor };
fs.writeFileSync(path.join(installRoot, "ROLLBACK-RECEIPT.json"), `${JSON.stringify(rollback, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify(rollback, null, 2));
