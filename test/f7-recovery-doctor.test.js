import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createHttpServer } from "../src/core/http.js";
import { NativeRuntime } from "../src/core/runtime.js";
import { buildRecoveryReport } from "../src/core/recovery-doctor.js";

function tempState() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-f7-recovery-"));
}

test("F7 recovery report covers core failure organs with one safe action each", () => {
  const report = buildRecoveryReport({
    health: { status: "failed", state: "degraded", workerStatus: "crash-loop", workerCrashAttempts: 6, stateWriterStatus: "unavailable" },
    provider: { providers: [{ id: "openai", auth: { state: "auth_required" }, health: { state: "unknown" }, display: { name: "OpenAI" } }] },
    connectionCells: { cells: [{ id: "channel.telegram", seamlessState: "needs_setup_review" }] },
    integrity: { ok: false },
    worker: false,
    localSessions: { active: [] },
    contextInfluence: { activeCount: 1, rolledBackCount: 0, durableMemoryPromotion: false },
    releaseState: {}
  });
  assert.equal(report.schema, "gpao_t3.recovery_report.v1");
  assert.equal(report.status, "blocked");
  assert.equal(report.noAutomaticRetryForUnknownOutcome, true);
  assert.equal(report.unknownOutcomePolicy, "reconcile_before_retry");
  const categories = report.items.map(entry => entry.category);
  assert.deepEqual(new Set(categories), new Set([
    "runtime",
    "worker",
    "state_integrity",
    "model_auth",
    "tool_channel",
    "memory_growth",
    "browser_dashboard",
    "update_rollback",
    "port_local",
    "heartbeat"
  ]));
  for (const entry of report.items) {
    assert.ok(entry.title);
    assert.ok(entry.detail);
    assert.ok(entry.nextAction);
    assert.equal(entry.autoRetry, false);
    assert.doesNotMatch(JSON.stringify(entry), /secret|token|credentialRef|authorization/i);
  }
  assert.ok(report.nextActions.some(entry => entry.category === "state_integrity" && entry.action === "restore_last_verified_snapshot"));
  assert.ok(report.nextActions.some(entry => entry.category === "tool_channel" && entry.action === "open_connection_center"));
});

test("F7 Doctor and recovery endpoints expose user-safe recovery without internal paths or credentials", async () => {
  const runtime = await new NativeRuntime({ stateDir: tempState() }).start();
  const { server } = createHttpServer(runtime, { port: 0 });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const dashboard = await fetch(`${base}/`);
    const cookie = dashboard.headers.get("set-cookie");
    const recovery = await fetch(`${base}/v1/recovery`, { headers: { cookie } }).then(response => response.json());
    assert.equal(recovery.schema, "gpao_t3.recovery_report.v1");
    assert.ok(["ready", "review"].includes(recovery.status));
    assert.equal(recovery.noAutomaticRetryForUnknownOutcome, true);
    assert.ok(recovery.items.find(entry => entry.category === "browser_dashboard" && entry.status === "ok"));
    assert.ok(recovery.items.find(entry => entry.category === "update_rollback" && entry.nextAction === "continue_to_distribution_gate"));
    assert.doesNotMatch(JSON.stringify(recovery), /ownerToken|credentialRef|stateDir|GPAO_T3_OPENAI_API_KEY|authorization/i);

    const doctor = await fetch(`${base}/v1/doctor`, { headers: { cookie } }).then(response => response.json());
    assert.equal(doctor.recovery.schema, "gpao_t3.recovery_report.v1");
    assert.equal(doctor.recovery.unknownOutcomePolicy, "reconcile_before_retry");
    assert.equal(doctor.readOnly, true);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await runtime.stop();
  }
});
