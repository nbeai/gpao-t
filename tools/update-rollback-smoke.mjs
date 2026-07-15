import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const releasesRoot = path.join(root, ".gpao-t3", "releases");
const manifests = fs.readdirSync(releasesRoot)
  .filter(file => file.endsWith(".manifest.json"))
  .map(file => ({ file: path.join(releasesRoot, file), value: JSON.parse(fs.readFileSync(path.join(releasesRoot, file), "utf8")) }))
  .filter(entry => entry.value.schema === "gpao_t3.release_manifest.v2")
  .sort((left, right) => String(left.value.createdAt).localeCompare(String(right.value.createdAt)));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-update-rollback-"));
const installRoot = path.join(temporary, "install");
const stateDir = path.join(temporary, "state");

function compatible(entry) {
  const archive = path.join(releasesRoot, entry.value.archive);
  const listed = spawnSync("tar", ["-tzf", archive], { encoding: "utf8" });
  if (listed.status !== 0) return false;
  const entries = listed.stdout.split("\n").map(value => value.replace(/^\.\//, ""));
  return ["src/index.js", "runtime/bin/node", "runtime/manifest.json", "SBOM.json", ...(process.platform === "darwin" ? ["runtime/bin/gpao-t3-keychain-helper"] : [])].every(required => entries.includes(required));
}

const compatibleManifests = [...new Map(manifests.filter(compatible).map(entry => [entry.value.releaseId, entry])).values()]
  .sort((left, right) => String(left.value.createdAt).localeCompare(String(right.value.createdAt)));
if (!compatibleManifests.length) throw new Error("A current install-compatible GPAO-T3 release is required for update/rollback smoke");
const current = compatibleManifests.at(-1);
let previous = compatibleManifests.find(entry => entry.value.releaseId !== current.value.releaseId);
let baselineKind = "historical_compatible_release";
if (!previous) {
  const baseline = { ...current.value, releaseId: `smoke-baseline-${current.value.releaseId}`, createdAt: new Date(Date.parse(current.value.createdAt) - 1_000).toISOString() };
  const baselineManifest = path.join(temporary, "baseline.manifest.json");
  fs.writeFileSync(baselineManifest, `${JSON.stringify(baseline, null, 2)}\n`, { mode: 0o600 });
  previous = { file: baselineManifest, value: baseline };
  baselineKind = "same_payload_lifecycle_baseline";
}
if (previous.value.releaseId === current.value.releaseId) throw new Error("Update and rollback releases must be distinct");

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} failed`);
  return result.stdout;
}

function install(entry) {
  return JSON.parse(run(process.execPath, [
    path.join(root, "tools", "install-native.mjs"),
    "--archive", path.join(releasesRoot, entry.value.archive),
    "--manifest", entry.file,
    "--install-root", installRoot,
    "--state-dir", stateDir
  ]));
}

const first = install(previous);
const beforeTurn = JSON.parse(run(path.join(installRoot, "bin", "gpao-t3"), ["verify-turn", "--state-dir", stateDir]));
const updateEnvelope = JSON.parse(run(path.join(installRoot, "bin", "gpao-t3"), ["update", "--feed", path.join(releasesRoot, "update-feed.json"), "--apply"]));
if (updateEnvelope.status !== "updated") throw new Error("Update feed did not apply the next release");
const update = updateEnvelope.install;
if (update.previousReleaseId !== previous.value.releaseId || update.lastGoodReleaseId !== previous.value.releaseId || !update.preUpdateSnapshot) throw new Error("Update did not preserve its last-good release and state snapshot");
const afterUpdateTurn = JSON.parse(run(path.join(installRoot, "bin", "gpao-t3"), ["verify-turn", "--state-dir", stateDir]));
const rollback = JSON.parse(run(path.join(installRoot, "bin", "gpao-t3"), ["rollback"]));
if (rollback.fromReleaseId !== current.value.releaseId || rollback.toReleaseId !== previous.value.releaseId) throw new Error("Rollback did not switch to the last-good release");
const afterRollbackTurn = JSON.parse(run(path.join(installRoot, "bin", "gpao-t3"), ["verify-turn", "--state-dir", stateDir]));
const active = fs.readFileSync(path.join(installRoot, "CURRENT"), "utf8").trim();
const nextRollback = fs.readFileSync(path.join(installRoot, "LAST-GOOD"), "utf8").trim();
if (active !== previous.value.releaseId || nextRollback !== current.value.releaseId) throw new Error("Rollback pointers are inconsistent");
const activeNode = path.join(installRoot, "releases", active, "runtime", "bin", "node");
const uninstall = JSON.parse(run(activeNode, [path.join(installRoot, "releases", active, "tools", "uninstall-native.mjs"), "--install-root", installRoot, "--confirm"]));
if (!fs.existsSync(stateDir)) throw new Error("Update/rollback smoke lost user state");
console.log(JSON.stringify({
  schema: "gpao_t3.update_rollback_smoke.v1",
  baselineKind,
  previousReleaseId: previous.value.releaseId,
  currentReleaseId: current.value.releaseId,
  install: first.releaseId,
  beforeTurn: beforeTurn.status,
  update: update.releaseId,
  preUpdateSnapshot: update.preUpdateSnapshot,
  afterUpdateTurn: afterUpdateTurn.status,
  rollback: `${rollback.fromReleaseId}->${rollback.toReleaseId}`,
  afterRollbackTurn: afterRollbackTurn.status,
  pointers: { current: active, lastGood: nextRollback },
  uninstall: uninstall.schema,
  statePreserved: true
}, null, 2));
