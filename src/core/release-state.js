import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { StateStore } from "./store.js";
import { RuntimeError } from "./errors.js";
import { assertSafeStateDir } from "./paths.js";

const SNAPSHOT_SCHEMA = "gpao_t.state_snapshot.v1";
const SNAPSHOT_ROOT = "snapshots";
const MAX_SNAPSHOT_BYTES = 256 * 1024 * 1024;

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function safeName(value) {
  return String(value || "manual").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "manual";
}

function assertStopped(stateDir) {
  if (fs.existsSync(path.join(stateDir, "runtime.lock"))) {
    throw new RuntimeError("state_in_use", "Stop the Native Runtime before changing its saved state", 409);
  }
}

function walkState(stateDir, current = stateDir, entries = []) {
  for (const child of fs.readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, child.name);
    const relative = path.relative(stateDir, absolute);
    if (!relative || relative === "runtime.lock" || relative === SNAPSHOT_ROOT || relative.startsWith(`${SNAPSHOT_ROOT}${path.sep}`)) continue;
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new RuntimeError("unsafe_state_entry", "State snapshots cannot include symbolic links", 409, { relative });
    if (stat.isDirectory()) walkState(stateDir, absolute, entries);
    else if (stat.isFile()) entries.push({ absolute, relative, bytes: stat.size });
    else throw new RuntimeError("unsafe_state_entry", "State snapshots can only include regular files", 409, { relative });
  }
  return entries;
}

function copyEntries(entries, sourceRoot, destinationRoot) {
  for (const entry of entries) {
    const source = path.join(sourceRoot, entry.relative);
    const destination = path.join(destinationRoot, entry.relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
    fs.copyFileSync(source, destination);
    fs.chmodSync(destination, 0o600);
  }
}

function snapshotDirectory(stateDir) {
  const root = path.join(stateDir, SNAPSHOT_ROOT);
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.chmodSync(root, 0o700);
  return root;
}

export function inspectState(stateDir) {
  const safeStateDir = assertSafeStateDir(stateDir);
  if (!fs.existsSync(path.join(safeStateDir, "runtime.sqlite"))) {
    return { schema: "gpao_t.state_inspection.v1", state: "empty", schemaVersion: null };
  }
  const store = new StateStore(safeStateDir);
  try {
    return { schema: "gpao_t.state_inspection.v1", state: "present", schemaVersion: Number(store.getMeta("schema_version") || 0), checkpoint: store.getCheckpoint() };
  } finally {
    store.close();
  }
}

export function snapshotState({ stateDir, label = "manual" }) {
  const safeStateDir = assertSafeStateDir(stateDir);
  assertStopped(safeStateDir);
  const entries = walkState(safeStateDir);
  const bytes = entries.reduce((total, entry) => total + entry.bytes, 0);
  if (bytes > MAX_SNAPSHOT_BYTES) throw new RuntimeError("snapshot_too_large", "Saved state exceeds the local snapshot safety limit", 413, { bytes, maxBytes: MAX_SNAPSHOT_BYTES });
  const root = snapshotDirectory(safeStateDir);
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${safeName(label)}-${crypto.randomUUID().slice(0, 8)}`;
  const staging = path.join(root, `.${id}.staging`);
  const destination = path.join(root, id);
  fs.mkdirSync(staging, { recursive: true, mode: 0o700 });
  try {
    copyEntries(entries, safeStateDir, staging);
    const files = entries.map(entry => ({ path: entry.relative, bytes: entry.bytes, sha256: sha256(path.join(staging, entry.relative)) }));
    const manifest = { schema: SNAPSHOT_SCHEMA, id, createdAt: new Date().toISOString(), source: "isolated_native_state", stateSchema: inspectState(safeStateDir).schemaVersion, files };
    fs.writeFileSync(path.join(staging, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(staging, destination);
    return { ...manifest, directory: destination };
  } catch (error) {
    fs.rmSync(staging, { recursive: true, force: true });
    throw error;
  }
}

function resolveSnapshot(stateDir, snapshot) {
  const root = path.resolve(snapshotDirectory(stateDir));
  const directory = path.resolve(snapshot);
  if (!directory.startsWith(`${root}${path.sep}`)) throw new RuntimeError("unsafe_snapshot_path", "Snapshot must belong to this isolated state directory", 409);
  const manifestPath = path.join(directory, "manifest.json");
  if (!fs.existsSync(manifestPath)) throw new RuntimeError("snapshot_not_found", "The selected snapshot is unavailable", 404);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.schema !== SNAPSHOT_SCHEMA || !Array.isArray(manifest.files)) throw new RuntimeError("invalid_snapshot", "Snapshot manifest is not valid", 409);
  for (const file of manifest.files) {
    const source = path.resolve(directory, file.path);
    if (!source.startsWith(`${directory}${path.sep}`) || !fs.existsSync(source) || sha256(source) !== file.sha256) {
      throw new RuntimeError("snapshot_integrity_failed", "Snapshot verification failed", 409, { file: file.path });
    }
  }
  return { directory, manifest };
}

export function restoreState({ stateDir, snapshot }) {
  const safeStateDir = assertSafeStateDir(stateDir);
  assertStopped(safeStateDir);
  const selected = resolveSnapshot(safeStateDir, snapshot);
  const safetySnapshot = snapshotState({ stateDir: safeStateDir, label: "pre-restore" });
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-restore-"));
  try {
    copyEntries(selected.manifest.files.map(file => ({ relative: file.path })), selected.directory, staging);
    for (const entry of walkState(safeStateDir)) fs.rmSync(entry.absolute, { force: true });
    copyEntries(selected.manifest.files.map(file => ({ relative: file.path })), staging, safeStateDir);
    return { schema: "gpao_t.state_restore.v1", restoredSnapshot: selected.manifest.id, safetySnapshot: safetySnapshot.id, inspection: inspectState(safeStateDir) };
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

export function migrateState({ stateDir }) {
  const safeStateDir = assertSafeStateDir(stateDir);
  assertStopped(safeStateDir);
  const before = inspectState(safeStateDir);
  const safetySnapshot = before.state === "present" ? snapshotState({ stateDir: safeStateDir, label: "pre-migration" }) : null;
  const store = new StateStore(safeStateDir);
  try {
    return { schema: "gpao_t.state_migration.v1", before, after: { schemaVersion: Number(store.getMeta("schema_version") || 0), checkpoint: store.getCheckpoint() }, safetySnapshot: safetySnapshot?.id || null };
  } finally {
    store.close();
  }
}
