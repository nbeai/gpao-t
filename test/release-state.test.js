import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { NativeRuntime } from "../src/core/runtime.js";
import { migrateState, restoreState, snapshotState } from "../src/core/release-state.js";
import { PRODUCT_IDENTITY } from "../src/core/product-identity.js";
import { StateStore } from "../src/core/store.js";

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
  assert.equal(migration.after.schemaVersion, 14);
  assert.equal(migration.after.identity.productId, PRODUCT_IDENTITY.productId);
  assert.equal(restored.restoredSnapshot, snapshot.id);
  assert.ok(fs.existsSync(path.join(stateDir, "snapshots", restored.safetySnapshot, "manifest.json")));
});

test("legacy isolated state is atomically adopted into the GPAO-T3 namespace and migrated", () => {
  const stateDir = tempState();
  const legacyPath = path.join(stateDir, "runtime.sqlite");
  const legacy = new DatabaseSync(legacyPath);
  legacy.exec("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL); INSERT INTO meta(key, value) VALUES ('schema_version', '1'), ('legacy_marker', 'preserved');");
  legacy.close();

  const store = new StateStore(stateDir);
  try {
    assert.equal(fs.existsSync(legacyPath), false);
    assert.equal(fs.existsSync(path.join(stateDir, PRODUCT_IDENTITY.databaseFile)), true);
    assert.equal(store.getMeta("legacy_marker"), "preserved");
    assert.equal(store.identitySnapshot().schemaVersion, 14);
    assert.equal(store.identitySnapshot().productId, "gpao-t3");
    assert.ok(store.stateOwnership().domains.some(entry => entry.domain === "runtime_intent" && entry.owner === "sqlite"));
    for (const table of ["messenger_sessions", "channel_bindings", "channel_inbound", "channel_checkpoints", "channel_deliveries"]) {
      assert.equal(store.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)?.name, table);
    }
  } finally {
    store.close();
  }
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
