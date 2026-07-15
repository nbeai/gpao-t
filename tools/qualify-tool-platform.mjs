import { performance } from "node:perf_hooks";
import { createFoundationToolSuite } from "../src/core/foundation-tool-suite.js";
import { createToolCall, createToolPermit } from "../src/core/tool-permit.js";
import { TOOL_FAILURE_CLASSES, ToolRepairRegistry } from "../src/core/tool-repair-registry.js";

const secret = "wp7-qualification-permit-secret";
const runtime = {
  publicHealth: () => ({ status: "ready" }), socketRegistry: { snapshot: () => ({ sockets: [] }) },
  capabilities: { search: () => ({ capabilities: [] }), describe: () => null }, messenger: { status: async () => ({ channels: [] }) },
  memory: { search: () => ({ results: [] }) }, contextInfluenceStatus: () => ({ activeCount: 0 }),
  rollbackContextInfluence: () => ({ rolledBack: false }), getTurn: async () => null
};
const registry = createFoundationToolSuite({ permitSecret: secret, runtime, stateDir: process.cwd() });
const durations = [];
let succeeded = 0;
for (let index = 0; index < 10_000; index += 1) {
  const args = {};
  const call = createToolCall({ taskPacketId: `task_${index}`, commandId: `command_${index}`, principalId: "qualifier", generation: 1, toolId: "runtime.status", action: "status", args, idempotencyKey: `qualification_${index}` });
  const permit = createToolPermit(secret, call, { effect: "read" });
  const started = performance.now();
  const receipt = await registry.execute({ toolId: "runtime.status", call, args, permit });
  durations.push(performance.now() - started);
  if (receipt.status === "succeeded") succeeded += 1;
}
await registry.stop();
durations.sort((a, b) => a - b);
const percentile = value => durations[Math.min(durations.length - 1, Math.floor(durations.length * value))];
const repairCoverage = new ToolRepairRegistry().coverage(TOOL_FAILURE_CLASSES);
const groups = new Set(registry.snapshot().tools.flatMap(tool => tool.capabilities).filter(value => ["runtime", "files", "web", "browser_ui", "messaging_channels", "sessions_agents", "automation", "gateway_devices", "memory_context", "media", "tool_search_plugins_mcp"].includes(value)));
const report = {
  schema: "gpao_t3.wp7_tool_qualification.v1", generatedAt: new Date().toISOString(), calls: 10_000,
  succeeded, successRate: succeeded / 10_000, p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99),
  toolCount: registry.snapshot().tools.length, compatibilityAliases: ["local.runtime_status"], capabilityGroupCount: groups.size, repairCoverage,
  gates: { successRate: succeeded / 10_000 >= 0.999, p95: percentile(0.95) <= 10, capabilityGroups: groups.size === 11, knownFailureMapping: repairCoverage.mappingRate === 1, recoverable: repairCoverage.recoverableRate >= 0.95 }
};
report.verdict = Object.values(report.gates).every(Boolean) ? "pass" : "fail";
console.log(JSON.stringify(report, null, 2));
if (report.verdict !== "pass") process.exitCode = 1;
