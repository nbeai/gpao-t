import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NativeRuntime } from "../src/core/runtime.js";

const TERMINAL = new Set(["succeeded", "failed", "cancelled", "uncertain"]);
const EXPECTED_CONTROL = Object.freeze({ succeeded: "completed", failed: "failed", cancelled: "cancelled", uncertain: "uncertain" });
const BUDGETS_MS = Object.freeze({ accepted: 50, dispatching: 300, responding: 350, terminal: 750 });
const outputIndex = process.argv.indexOf("--output");
const outputPath = outputIndex >= 0 ? path.resolve(process.argv[outputIndex + 1] || "") : null;

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

async function eventually(predicate, timeoutMs = 4_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await predicate();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error("control_flow_scenario_timeout");
}

async function collect(runtime, principalId, submitted, kind, expectedStatus) {
  const turn = await eventually(async () => {
    const current = await runtime.getTurn(principalId, submitted.commandId);
    return TERMINAL.has(current?.status) ? current : null;
  });
  if (turn.status !== expectedStatus) throw new Error(`scenario_status_mismatch:${kind}:${turn.status}`);
  const telemetry = await runtime.getTelemetry(principalId, submitted.commandId);
  const events = await runtime.replayTurnEvents({ principalId, commandId: submitted.commandId });
  const terminalFrame = events.terminal?.frame;
  if (terminalFrame?.status !== EXPECTED_CONTROL[expectedStatus] || terminalFrame.terminal !== true) {
    throw new Error(`terminal_frame_mismatch:${kind}:${terminalFrame?.status || "missing"}`);
  }
  return { kind, commandId: submitted.commandId, storedStatus: turn.status, controlStatus: terminalFrame.status, telemetry };
}

const roots = [];
const scenarios = [];
let saturationProbe;

try {
  const mainState = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-control-main-"));
  roots.push(mainState);
  const main = await new NativeRuntime({ stateDir: mainState, maxInflight: 4, maxQueue: 32 }).start();
  try {
    const work = [];
    for (let index = 0; index < 10; index += 1) {
      const submitted = await main.submitTurn({ principalId: "wp3", requestId: `success-${index}`, payload: { input: `success-${index}` } });
      work.push(collect(main, "wp3", submitted, "success", "succeeded"));
    }
    for (let index = 0; index < 5; index += 1) {
      const submitted = await main.submitTurn({ principalId: "wp3", requestId: `failure-${index}`, payload: { mode: "fail" } });
      work.push(collect(main, "wp3", submitted, "failure", "failed"));
    }
    for (let index = 0; index < 5; index += 1) {
      const submitted = await main.submitTurn({ principalId: "wp3", requestId: `reconnect-${index}`, payload: { input: `reconnect-${index}`, delayMs: 20 } });
      work.push(collect(main, "wp3", submitted, "reconnect", "succeeded"));
    }
    scenarios.push(...await Promise.all(work));
    for (const scenario of scenarios.filter(entry => entry.kind === "reconnect")) {
      const replay = await main.replayTurnEvents({ principalId: "wp3", commandId: scenario.commandId, cursor: `${scenario.commandId}:2` });
      if (replay.status !== "ok" || replay.events.at(-1)?.frame?.status !== "completed") throw new Error("reconnect_replay_contract_failed");
    }
  } finally {
    await main.stop();
  }

  const cancelState = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-control-cancel-"));
  roots.push(cancelState);
  const cancellation = await new NativeRuntime({ stateDir: cancelState }).start();
  try {
    const originalPump = cancellation.pump;
    cancellation.pump = async () => {};
    for (let index = 0; index < 5; index += 1) {
      const submitted = await cancellation.submitTurn({ principalId: "wp3", requestId: `cancel-${index}`, payload: { input: `cancel-${index}` } });
      await cancellation.cancelTurn({ principalId: "wp3", commandId: submitted.commandId });
      scenarios.push(await collect(cancellation, "wp3", submitted, "cancel", "cancelled"));
    }
    cancellation.pump = originalPump;
  } finally {
    await cancellation.stop();
  }

  const timeoutState = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-control-timeout-"));
  roots.push(timeoutState);
  const timeout = await new NativeRuntime({ stateDir: timeoutState, maxInflight: 5, workerResultTimeoutMs: 100 }).start();
  try {
    const work = [];
    for (let index = 0; index < 5; index += 1) {
      const submitted = await timeout.submitTurn({ principalId: "wp3", requestId: `uncertain-${index}`, payload: { mode: "blackhole" } });
      work.push(collect(timeout, "wp3", submitted, "uncertain", "uncertain"));
    }
    scenarios.push(...await Promise.all(work));
  } finally {
    await timeout.stop();
  }

  const saturatedState = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-control-saturation-"));
  roots.push(saturatedState);
  const saturated = await new NativeRuntime({ stateDir: saturatedState, maxInflight: 1, maxQueue: 1 }).start();
  try {
    const originalPump = saturated.pump;
    saturated.pump = async () => {};
    const held = await saturated.submitTurn({ principalId: "wp3", requestId: "saturation-held", payload: { input: "held" } });
    let code = null;
    try {
      await saturated.submitTurn({ principalId: "wp3", requestId: "saturation-rejected", payload: { input: "rejected" } });
    } catch (error) {
      code = error.code;
    }
    await saturated.cancelTurn({ principalId: "wp3", commandId: held.commandId });
    saturated.pump = originalPump;
    saturationProbe = { maxQueue: 1, rejectedCode: code, pass: code === "backpressure" };
  } finally {
    await saturated.stop();
  }

  const stageSamples = { accepted: [], dispatching: [], responding: [], terminal: [] };
  for (const scenario of scenarios) {
    for (const stage of scenario.telemetry.stages) {
      const bucket = ["completed", "failed", "cancelled", "uncertain"].includes(stage.stage) ? "terminal" : stage.stage;
      stageSamples[bucket]?.push(stage.elapsedFromAcceptMs);
    }
  }
  const p95Ms = Object.fromEntries(Object.entries(stageSamples).map(([stage, values]) => [stage, percentile(values, 0.95)]));
  const budgetPass = Object.entries(BUDGETS_MS).every(([stage, budget]) => p95Ms[stage] !== null && p95Ms[stage] <= budget);
  const counts = Object.fromEntries(["success", "failure", "reconnect", "cancel", "uncertain"].map(kind => [kind, scenarios.filter(entry => entry.kind === kind).length]));
  const receipt = {
    schema: "gpao_t3.control_flow_benchmark.v1",
    generatedAt: new Date().toISOString(),
    environment: { platform: process.platform, architecture: process.arch, node: process.version },
    scenarioCount: scenarios.length,
    counts,
    protocol: "gpao_t3.control_frame.v1",
    stateSchemaVersion: 3,
    p95Ms,
    budgetsMs: BUDGETS_MS,
    saturationProbe,
    scope: "local runtime control overhead including durable SQLite telemetry and worker IPC; excludes external model and network latency",
    gate: scenarios.length === 30 && Object.values(counts).every(count => count === 5 || count === 10) && saturationProbe.pass && budgetPass ? "pass" : "blocked"
  };
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
  }
  console.log(JSON.stringify(receipt, null, 2));
  if (receipt.gate !== "pass") process.exitCode = 1;
} finally {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
}
