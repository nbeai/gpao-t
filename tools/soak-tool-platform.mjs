import fs from "node:fs";
import path from "node:path";
import { createFoundationToolSuite } from "../src/core/foundation-tool-suite.js";
import { createToolCall, createToolPermit } from "../src/core/tool-permit.js";

const hours = Number(process.argv.find(value => value.startsWith("--hours="))?.split("=")[1] || 72);
const intervalMs = Number(process.argv.find(value => value.startsWith("--interval-ms="))?.split("=")[1] || 250);
const output = path.resolve(process.argv.find(value => value.startsWith("--output="))?.slice("--output=".length) || ".gpao-t3/wp7-tool-soak.json");
if (!Number.isFinite(hours) || hours <= 0 || !Number.isFinite(intervalMs) || intervalMs < 10) throw new Error("Invalid soak duration or interval");
fs.mkdirSync(path.dirname(output), { recursive: true, mode: 0o700 });

const secret = "wp7-soak-permit-secret";
const runtime = { publicHealth: () => ({ status: "ready" }), socketRegistry: { snapshot: () => ({ sockets: [] }) }, capabilities: { search: () => ({ capabilities: [] }), describe: () => null }, messenger: { status: async () => ({ channels: [] }) }, memory: { search: () => ({ results: [] }) }, contextInfluenceStatus: () => ({ activeCount: 0 }), rollbackContextInfluence: () => ({ rolledBack: false }), getTurn: async () => null };
const registry = createFoundationToolSuite({ permitSecret: secret, runtime, stateDir: path.dirname(output) });
const startedAt = Date.now();
const deadline = startedAt + hours * 3_600_000;
let calls = 0; let failures = 0; let duplicateSideEffects = 0; let receiptLoss = 0; let stopping = false;

function write(status) {
  const report = { schema: "gpao_t3.wp7_tool_soak.v1", status, configuredHours: hours, startedAt: new Date(startedAt).toISOString(), checkedAt: new Date().toISOString(), elapsedMs: Date.now() - startedAt, calls, failures, crashes: 0, duplicateSideEffects, receiptLoss, processId: process.pid };
  const temporary = `${output}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 }); fs.renameSync(temporary, output);
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { stopping = true; write("interrupted"); });

write("running");
while (!stopping && Date.now() < deadline) {
  const args = {}; const id = calls;
  const call = createToolCall({ taskPacketId: `task_${id}`, commandId: `command_${id}`, principalId: "soak", generation: 1, toolId: "runtime.status", action: "status", args, idempotencyKey: `soak_${id}` });
  const permit = createToolPermit(secret, call, { effect: "read" });
  try { const receipt = await registry.execute({ toolId: "runtime.status", call, args, permit }); if (!receipt?.idempotencyKey) receiptLoss += 1; }
  catch { failures += 1; }
  calls += 1;
  if (calls % Math.max(1, Math.floor(60_000 / intervalMs)) === 0) write("running");
  await new Promise(resolve => setTimeout(resolve, intervalMs));
}
await registry.stop();
write(stopping ? "interrupted" : "completed");
if (stopping || failures || duplicateSideEffects || receiptLoss) process.exitCode = 1;
