import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const releases = path.join(root, ".gpao-t", "releases");
const archive = process.argv.includes("--archive") ? path.resolve(process.argv[process.argv.indexOf("--archive") + 1]) : fs.readdirSync(releases).filter(file => file.endsWith(".tar.gz")).map(file => path.join(releases, file)).sort().at(-1);
if (!archive || !fs.existsSync(archive)) throw new Error("Build a native release archive before running release smoke");
const manifest = archive.replace(/\.tar\.gz$/, ".manifest.json");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-release-smoke-"));
const installDir = path.join(temporary, "install");
const stateDir = path.join(temporary, "state");
const install = spawnSync(process.execPath, [path.join(root, "tools", "install-native.mjs"), "--archive", archive, "--manifest", manifest, "--install-dir", installDir, "--state-dir", stateDir], { encoding: "utf8" });
if (install.status !== 0) throw new Error(install.stderr || "Native install smoke failed");
const { NativeRuntime } = await import(pathToFileURL(path.join(installDir, "src", "core", "runtime.js")).href);
const { snapshotState, migrateState, restoreState } = await import(pathToFileURL(path.join(installDir, "src", "core", "release-state.js")).href);
const runtime = await new NativeRuntime({ stateDir }).start();
try {
  const accepted = await runtime.submitTurn({ principalId: "owner:release-smoke", requestId: "fresh-turn", payload: { input: "release smoke" } });
  const started = Date.now();
  while ((await runtime.getTurn("owner:release-smoke", accepted.commandId))?.status !== "succeeded") {
    if (Date.now() - started > 4000) throw new Error("Native fresh turn did not reach a receipt");
    await new Promise(resolve => setTimeout(resolve, 20));
  }
} finally {
  await runtime.stop();
}
const snapshot = snapshotState({ stateDir, label: "release-smoke" });
const migration = migrateState({ stateDir });
const restored = restoreState({ stateDir, snapshot: snapshot.directory });
const unpacked = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-identity-"));
const extracted = spawnSync("tar", ["-xzf", archive, "-C", unpacked], { encoding: "utf8" });
if (extracted.status !== 0) throw new Error(extracted.stderr || "Archive readback failed");
const forbidden = ["open" + "claw", "dock" + "er"];
const source = fs.readdirSync(unpacked, { recursive: true }).filter(entry => /\.(js|json|md)$/i.test(entry)).map(entry => fs.readFileSync(path.join(unpacked, entry), "utf8")).join("\n").toLowerCase();
if (forbidden.some(term => source.includes(term))) throw new Error("Default archive contains a forbidden reference identity");
console.log(JSON.stringify({ schema: "gpao_t.native_release_smoke.v1", archive: path.basename(archive), install: JSON.parse(install.stdout), snapshot: snapshot.id, migration: migration.after.schemaVersion, restore: restored.restoredSnapshot, identityScan: "clean" }, null, 2));
