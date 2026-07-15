import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NativeRuntime } from "../src/core/runtime.js";

function tempState() { return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t-native-secret-")); }

test("turn payload credentials are rejected before they can enter durable state", async () => {
  const stateDir = tempState();
  const runtime = await new NativeRuntime({ stateDir }).start();
  try {
    await assert.rejects(
      () => runtime.submitTurn({ principalId: "owner:a", requestId: "secret", payload: { input: "configure", apiKey: "sk-test-secret-value-123456789" } }),
      error => error.code === "secret_in_turn_payload"
    );
    const database = fs.readFileSync(path.join(stateDir, "runtime.sqlite"));
    assert.equal(database.includes(Buffer.from("sk-test-secret-value-123456789")), false);
  } finally {
    await runtime.stop();
  }
});
