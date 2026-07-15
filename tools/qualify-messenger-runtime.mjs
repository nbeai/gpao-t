import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { NativeRuntime } from "../src/core/runtime.js";
import { createAdapter as createTelegram } from "../test/fixtures/telegram-messenger-adapter.js";
import { createAdapter as createRelay } from "../test/fixtures/relay-messenger-adapter.js";

function percentile(values, value) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * value) - 1)] || 0;
}

function inputFor(kind, index) {
  if (kind === "telegram") return { update_id: index, account_id: "qualification", message: { message_id: index, date: Date.now(), text: `message-${index}`, chat: { id: "owner", type: "private" } } };
  return { event: `event-${index}`, sequence: index, timestamp: Date.now(), workspace: "qualification", message: `message-${index}`, sender: "owner", body: `message-${index}` };
}

const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-wp5-qualification-"));
const runtime = await new NativeRuntime({ stateDir }).start();
const adapters = [["telegram", createTelegram()], ["relay", createRelay()]];
const conformance = [];
const latency = [];
try {
  let cursor = 1;
  for (const [name, adapter] of adapters) {
    const inbound = await runtime.messenger.ingest(adapter, inputFor(name, cursor++));
    await runtime.messenger.completeInbound({ inboundId: inbound.inboundId });
    const identity = adapter.normalizeInbound(inputFor(name, cursor++)).identity;
    const delivery = await runtime.messenger.send(adapter, { identity, idempotencyKey: `qualification-${name}`, content: { text: "qualification" } }, { authority: { externalSendApproved: true } });
    conformance.push({ adapter: name, capabilityId: adapter.capability.manifest.id, inbound: inbound.status, sessionKind: inbound.sessionKind, contextBoundary: inbound.contextPacket.crossSessionInfluence, delivery: delivery.status, pass: inbound.status === "claimed" && delivery.status === "delivered" });
  }
  const adapter = createRelay();
  for (let index = 0; index < 500; index += 1) {
    const started = performance.now();
    const inbound = await runtime.messenger.ingest(adapter, inputFor("relay", 10_000 + index));
    await runtime.messenger.completeInbound({ inboundId: inbound.inboundId });
    latency.push(performance.now() - started);
  }
  const core = fs.readFileSync(new URL("../src/core/messenger-runtime.js", import.meta.url), "utf8");
  const report = {
    schema: "gpao_t3.wp5_channel_qualification.v1", generatedAt: new Date().toISOString(),
    adapters: conformance,
    core: { providerBranches: /telegram|relay|discord|slack|whatsapp|imessage/i.test(core) ? "fail" : "pass" },
    performance: { samples: latency.length, ingressCompleteP50Ms: percentile(latency, 0.5), ingressCompleteP95Ms: percentile(latency, 0.95), budgetP95Ms: 10 },
    recovery: { durableRestartReplay: "covered_by_test", unknownAfterSendReconcile: "covered_by_test", duplicateSuppression: "covered_by_test" }
  };
  report.wp5Gate = conformance.every(item => item.pass) && report.core.providerBranches === "pass" && report.performance.ingressCompleteP95Ms <= report.performance.budgetP95Ms ? "pass" : "fail";
  const output = JSON.stringify(report, null, 2);
  const outputArg = process.argv.find(argument => argument.startsWith("--out="));
  if (outputArg) fs.writeFileSync(path.resolve(outputArg.slice(6)), `${output}\n`);
  process.stdout.write(`${output}\n`);
  if (report.wp5Gate !== "pass") process.exitCode = 1;
} finally {
  await runtime.stop();
  fs.rmSync(stateDir, { recursive: true, force: true });
}
