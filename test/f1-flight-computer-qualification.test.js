import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NativeRuntime } from "../src/core/runtime.js";

function tempState() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-f1-qualification-"));
}

async function eventually(predicate, timeoutMs = 3_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await predicate();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("timed out waiting for the F1 qualification condition");
}

test("F1 flight computer qualification: fresh OS turn survives normal restart and a worker crash does not duplicate work", async t => {
  await t.test("fresh OS turn records ordered progress, receipts, and a restart-safe event replay", async () => {
    const stateDir = tempState();
    let firstRuntime;
    let restartedRuntime;
    try {
      firstRuntime = await new NativeRuntime({ stateDir }).start();
      const firstGeneration = firstRuntime.generation;
      const osTurn = await firstRuntime.runOsTurn({
        principalId: "owner:f1",
        sessionId: "f1-fresh-session",
        requestId: "f1-fresh-turn",
        input: "F1 flight computer qualification fresh turn"
      });

      assert.equal(osTurn.replyMode, "provider_emulator");
      assert.equal(osTurn.providerReceipt.schema, "gpao_t.provider_receipt.v1");
      assert.equal(osTurn.turn.status, "succeeded");
      assert.equal(osTurn.turn.receipt.status, "succeeded");
      assert.deepEqual(osTurn.turn.receipt.result, {
        kind: "deterministic_worker_result",
        echo: "GPAO-T deterministic provider response"
      });

      const progress = await firstRuntime.getProgress("owner:f1", osTurn.submitted.commandId);
      assert.deepEqual(progress.map(entry => entry.phase), ["accepted", "running", "succeeded"]);
      assert.ok(progress.every((entry, index) => index === 0 || entry.seq > progress[index - 1].seq));

      const replayBeforeRestart = await firstRuntime.replayTurnEvents({
        principalId: "owner:f1",
        commandId: osTurn.submitted.commandId
      });
      assert.deepEqual(replayBeforeRestart.events.map(event => event.type), [
        "turn.accepted",
        "turn.dispatched",
        "turn.succeeded"
      ]);
      assert.equal(replayBeforeRestart.terminal.type, "turn.succeeded");

      await firstRuntime.stop();
      firstRuntime = null;

      restartedRuntime = await new NativeRuntime({ stateDir }).start();
      assert.equal(restartedRuntime.generation, firstGeneration + 1);
      const recoveredTurn = await restartedRuntime.getTurn("owner:f1", osTurn.submitted.commandId);
      assert.equal(recoveredTurn.status, "succeeded");
      assert.deepEqual(recoveredTurn.receipt.result, osTurn.turn.receipt.result);

      const replayAfterRestart = await restartedRuntime.replayTurnEvents({
        principalId: "owner:f1",
        commandId: osTurn.submitted.commandId
      });
      assert.deepEqual(replayAfterRestart.events.map(event => event.type), [
        "turn.accepted",
        "turn.dispatched",
        "turn.succeeded"
      ]);
      assert.equal(replayAfterRestart.terminal.type, "turn.succeeded");
    } finally {
      await restartedRuntime?.stop();
      await firstRuntime?.stop();
      fs.rmSync(stateDir, { recursive: true, force: true });
    }
  });

  await t.test("in-flight worker crash becomes reconcilable uncertainty, never duplicates, then accepts a fresh turn", async () => {
    const stateDir = tempState();
    let runtime;
    try {
      runtime = await new NativeRuntime({ stateDir, workerRestartBaseDelayMs: 10 }).start();
      const crashedWorker = runtime.worker;
      const crashed = await runtime.submitTurn({
        principalId: "owner:f1",
        requestId: "f1-crashed-turn",
        payload: { mode: "crash-after-dispatch" }
      });

      const uncertain = await eventually(async () => {
        const current = await runtime.getTurn("owner:f1", crashed.commandId);
        return current?.status === "uncertain" && current;
      });
      assert.equal(uncertain.receipt, null);
      assert.equal((await runtime.getProgress("owner:f1", crashed.commandId)).at(-1).phase, "outcome_unknown");

      await eventually(() => runtime.worker && runtime.worker !== crashedWorker && runtime.worker.connected);
      const duplicate = await runtime.submitTurn({
        principalId: "owner:f1",
        requestId: "f1-crashed-turn",
        payload: { mode: "crash-after-dispatch" }
      });
      assert.equal(duplicate.commandId, crashed.commandId);
      assert.equal(duplicate.deduplicated, true);

      const reconciliation = await runtime.reconcileTurn({
        principalId: "owner:f1",
        commandId: crashed.commandId
      });
      assert.equal(reconciliation.terminal, true);
      assert.equal(reconciliation.turn.status, "uncertain");
      assert.equal(reconciliation.turn.receipt, null);

      const fresh = await runtime.submitTurn({
        principalId: "owner:f1",
        requestId: "f1-next-fresh-turn",
        payload: { input: "flight computer recovered" }
      });
      const completed = await eventually(async () => {
        const current = await runtime.getTurn("owner:f1", fresh.commandId);
        return current?.status === "succeeded" && current;
      });
      assert.deepEqual(completed.receipt.result, {
        kind: "deterministic_worker_result",
        echo: "flight computer recovered"
      });
    } finally {
      await runtime?.stop();
      fs.rmSync(stateDir, { recursive: true, force: true });
    }
  });
});
