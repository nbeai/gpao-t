import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { NativeRuntime } from "../src/core/runtime.js";
import { PRODUCT_IDENTITY } from "../src/core/product-identity.js";

function stateDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-integrity-")); }

test("a modified durable event chain blocks the next native runtime boot", async () => {
  const dir = stateDir();
  const runtime = await new NativeRuntime({ stateDir: dir }).start();
  await runtime.submitTurn({ principalId: "owner:a", requestId: "integrity-seed", payload: { input: "seed" } });
  await new Promise(resolve => setTimeout(resolve, 80));
  await runtime.stop();
  const db = new DatabaseSync(path.join(dir, PRODUCT_IDENTITY.databaseFile));
  db.prepare("UPDATE events SET payload_json = ? WHERE seq = 1").run('{"tampered":true}');
  db.close();
  await assert.rejects(() => new NativeRuntime({ stateDir: dir }).start(), error => error.code === "event_integrity_failed");
});
