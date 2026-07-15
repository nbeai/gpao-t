import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { CapabilityPlatform } from "../src/core/capability-platform.js";
import { CAPABILITY_GROUPS, validateCapabilityManifest } from "../src/core/capability-manifest.js";
import { CapabilityWorkerClient } from "../src/core/capability-worker-client.js";
import { createFoundationCapabilityManifests } from "../src/core/foundation-capabilities.js";

const outputAt = process.argv.indexOf("--output");
const outputPath = outputAt >= 0 ? path.resolve(process.argv[outputAt + 1] || "") : null;
const baseline = Object.freeze({ runtime: "exec/process/code/cancel", files: "read/write/edit/patch/search/rollback", web: "search/fetch/citation", browser_ui: "profile/tab/snapshot/navigate/act/evidence", messaging_channels: "receive/reply/send/delivery/dedupe", sessions_agents: "list/history/send/spawn/status/cancel", automation: "cron/heartbeat/background/dedupe", gateway_devices: "socket/device/health/reconnect", memory_context: "search/admission/replay/influence/rollback", media: "image/pdf/audio/generation/tts", tool_search_plugins_mcp: "search/describe/install/activate/disable/remove" });
const percentile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1];

const manifests = createFoundationCapabilityManifests();
const platform = new CapabilityPlatform({ manifests });
const parity = CAPABILITY_GROUPS.map(group => {
  const entries = platform.search({ group, limit: 100 }).capabilities;
  return { group, openClaw2026_6_11Baseline: baseline[group], manifestCoverage: entries.length > 0 ? "pass" : "blocked", productCapabilityStatus: entries.some(entry => entry.status === "ready") ? "ready_foundation_slice" : "open_wp7_implementation", entries: entries.map(entry => entry.id) };
});

const large = [];
for (let index = 0; index < 10_000; index += 1) large.push({ ...manifests[index % manifests.length], id: `catalog.fixture-${index}`, name: `Capability Fixture ${index}` });
const largePlatform = new CapabilityPlatform({ manifests: large });
const searchSamples = [];
for (let index = 0; index < 200; index += 1) { const started = performance.now(); largePlatform.search({ query: `fixture ${index % 100}`, limit: 20 }); searchSamples.push(performance.now() - started); }

const conformance = {};
const workerSamples = [];
for (const [name, file] of [["referenceAdapter", "reference-capability-adapter.js"], ["thirdAdapter", "third-capability-adapter.js"]]) {
  const moduleUrl = new URL(`../test/fixtures/${file}`, import.meta.url);
  const adapter = await import(moduleUrl.href);
  const worker = await new CapabilityWorkerClient({ manifest: validateCapabilityManifest(adapter.manifest), modulePath: moduleUrl.href, secret: "wp4-qualification-secret" }).start();
  try {
    const count = name === "referenceAdapter" ? 100 : 1;
    for (let index = 0; index < count; index += 1) { const started = performance.now(); const result = await worker.invoke({ principalId: "wp4:qualification", input: { value: String(index) } }); if (result.echo !== String(index)) throw new Error(`${name}_conformance_failed`); if (name === "referenceAdapter") workerSamples.push(performance.now() - started); }
    conformance[name] = "pass";
  } finally { await worker.stop(); }
}

const metrics = { catalogSize: 10_000, searchP95Ms: percentile(searchSamples, 0.95), warmWorkerRoundtripP95Ms: percentile(workerSamples, 0.95), thresholdsMs: { searchP95: 20, warmWorkerRoundtripP95: 10 } };
const receipt = { schema: "gpao_t3.capability_platform_qualification.v1", generatedAt: new Date().toISOString(), referenceBaseline: "OpenClaw 2026.6.11 read-only reference", manifestGroups: CAPABILITY_GROUPS.length, parity, conformance: { ...conformance, coreBranchRequired: false }, metrics, ar1ProductParity: parity.every(row => row.productCapabilityStatus === "ready_foundation_slice") ? "pass" : "open_until_wp7", wp4PlatformGate: parity.every(row => row.manifestCoverage === "pass") && conformance.referenceAdapter === "pass" && conformance.thirdAdapter === "pass" && metrics.searchP95Ms <= 20 && metrics.warmWorkerRoundtripP95Ms <= 10 ? "pass" : "blocked" };
if (outputPath) { fs.mkdirSync(path.dirname(outputPath), { recursive: true }); fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`); }
console.log(JSON.stringify(receipt, null, 2));
if (receipt.wp4PlatformGate !== "pass") process.exitCode = 1;
