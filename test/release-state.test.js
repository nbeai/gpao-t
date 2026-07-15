import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NativeRuntime } from "../src/core/runtime.js";
import { migrateState, restoreState, snapshotState } from "../src/core/release-state.js";

function tempState() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-release-state-"));
}

test("isolated state snapshot, migration, and restore preserve a verified baseline", async () => {
  const stateDir = tempState();
  const runtime = await new NativeRuntime({ stateDir }).start();
  await runtime.stop();
  fs.writeFileSync(path.join(stateDir, "marker.txt"), "before", { mode: 0o600 });
  const snapshot = snapshotState({ stateDir, label: "baseline" });
  fs.writeFileSync(path.join(stateDir, "marker.txt"), "after", { mode: 0o600 });
  const migration = migrateState({ stateDir });
  const restored = restoreState({ stateDir, snapshot: snapshot.directory });
  assert.equal(fs.readFileSync(path.join(stateDir, "marker.txt"), "utf8"), "before");
  assert.equal(migration.after.schemaVersion, 1);
  assert.equal(restored.restoredSnapshot, snapshot.id);
  assert.ok(fs.existsSync(path.join(stateDir, "snapshots", restored.safetySnapshot, "manifest.json")));
});

test("state changes refuse to run while the runtime owns its lock", async () => {
  const stateDir = tempState();
  const runtime = await new NativeRuntime({ stateDir }).start();
  try {
    assert.throws(() => snapshotState({ stateDir }), error => error.code === "state_in_use");
  } finally {
    await runtime.stop();
  }
});
