import { performance } from "node:perf_hooks";
import { createTaskPacket } from "../src/core/task-packet.js";
import { admitTcellCandidates } from "../src/core/tcell.js";
import { MCT_R2_CASES, MCT_R2_NOW } from "../test/fixtures/mct-r2-cases.js";

function percentile(samples, ratio) {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

const samples = [];
let correct = 0;
let anchors = 0;
let correctAnchors = 0;
let wrongAnchors = 0;
let conflicts = 0;
let detectedConflicts = 0;
let scopeLeakage = 0;
let currentRequestProtection = 0;
const iterations = 1000;

for (let iteration = 0; iteration < iterations; iteration += 1) {
  const fixture = MCT_R2_CASES[iteration % MCT_R2_CASES.length];
  const packet = createTaskPacket({ sessionId: "session-a", input: fixture.request, contextWindow: 4096, userId: "owner:a" });
  const started = performance.now();
  const admission = admitTcellCandidates(packet, [fixture.candidate], { now: MCT_R2_NOW });
  samples.push(performance.now() - started);
  const decision = admission.decisions[0];
  if (decision.state === fixture.expected) correct += 1;
  if (decision.state === "answer_anchor") {
    anchors += 1;
    if (fixture.expected === "answer_anchor") correctAnchors += 1;
    else wrongAnchors += 1;
  }
  if (fixture.expected === "conflict_boundary") {
    conflicts += 1;
    if (decision.state === "conflict_boundary") detectedConflicts += 1;
  }
  if (fixture.id === "scope-mismatch" && decision.state !== "rejected") scopeLeakage += 1;
  if (fixture.id === "explicit-prior-override" && decision.state === "conflict_boundary") currentRequestProtection += 1;
}

const metrics = {
  admissionAccuracy: correct / iterations,
  answerAnchorPrecision: anchors ? correctAnchors / anchors : 1,
  wrongAnchorRate: wrongAnchors / iterations,
  contradictionDetectionRate: conflicts ? detectedConflicts / conflicts : 1,
  scopeLeakageRate: scopeLeakage / iterations,
  currentRequestProtectionRate: currentRequestProtection / Math.floor(iterations / MCT_R2_CASES.length)
};
const receipt = {
  schema: "gpao_t3.mct_r2_benchmark.v1",
  fixtures: MCT_R2_CASES.length,
  iterations,
  latency: { p50Ms: percentile(samples, 0.5), p95Ms: percentile(samples, 0.95) },
  metrics
};
receipt.gate = receipt.latency.p95Ms <= 250 && metrics.answerAnchorPrecision >= 0.98 && metrics.wrongAnchorRate <= 0.01 && metrics.contradictionDetectionRate >= 0.95 && metrics.scopeLeakageRate === 0 && metrics.currentRequestProtectionRate >= 1 ? "pass" : "fail";
console.log(JSON.stringify(receipt, null, 2));
if (receipt.gate !== "pass") process.exitCode = 1;
