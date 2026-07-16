import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { spawnSync } from "node:child_process";
import { canonicalDigest } from "../src/core/canonical-json.js";
import { estimateContextTokens, percentile, summarizeRetrieval } from "../src/core/mct-comparison.js";
import { StateStore } from "../src/core/store.js";
import { createTaskPacket } from "../src/core/task-packet.js";
import { admitTcellCandidates, composeAdmittedProviderInput } from "../src/core/tcell.js";
import { createMctR5Corpus, markerFor, MCT_R5_BASELINE_COMMIT, MCT_R5_DEVELOPMENT_CASES, MCT_R5_TOP_K } from "../test/fixtures/mct-r5-cases.js";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const gpaoRoot = "/Users/jyp/Developer/gpao-t";
const liveGpao = "/Users/jyp/.gpao-t/current";
const openClawRoot = "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw";
const openClawBin = "/Users/jyp/.local/bin/openclaw";
const evidenceDir = path.resolve(process.argv[2] || "../engineering/evidence/mct-r5-comparison-2026-07-16");
const sealedHoldoutPath = path.resolve(process.argv[3] || process.env.MCT_R5_SEALED_HOLDOUT || "");
if (!process.argv[3] && !process.env.MCT_R5_SEALED_HOLDOUT) throw new Error("A separately generated sealed holdout JSON path is required");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-mct-r5-"));
const implementationFreeze = Object.freeze({
  commit:"abd29e6771d52a06603164790d42ae9651ba6cb9",
  storeDigest:"sha256:a1a6a2b9ef764ce0048c6ad41291c399c1a75e6790efd6026d3dd4f87bf07500"
});
const sealedHoldout = JSON.parse(fs.readFileSync(sealedHoldoutPath, "utf8"));
if (sealedHoldout.schema !== "gpao_t3.mct_r5_sealed_holdout.v1") throw new Error("Unsupported sealed holdout schema");
if (sealedHoldout.implementationFreeze !== implementationFreeze.commit) throw new Error("Sealed holdout does not target the frozen implementation");
if (!Array.isArray(sealedHoldout.records) || !Array.isArray(sealedHoldout.cases) || sealedHoldout.cases.length < 8) throw new Error("Sealed holdout requires records and at least eight cases");
const replacementRecords = new Map(sealedHoldout.records.map(item => {
  if (!Number.isInteger(item.index) || item.index < 1 || item.index > 500 || !item.text || !item.sessionId) throw new Error("Invalid sealed holdout record");
  return [item.index, item];
}));
if (replacementRecords.size !== sealedHoldout.records.length) throw new Error("Duplicate sealed holdout record index");
const corpus = createMctR5Corpus().map((item, offset) => {
  const replacement = replacementRecords.get(offset + 1);
  return replacement ? { ...item, sessionId:replacement.sessionId, text:`${markerFor(offset + 1)} 기억열쇠${String(offset + 1).padStart(4, "0")} ${replacement.text}` } : item;
});
const holdoutCases = Object.freeze(sealedHoldout.cases.map(item => Object.freeze({ ...item })));
if (holdoutCases.some(item => "target" in item || "product" in item)) throw new Error("Sealed holdout must remain target-neutral");
const thresholds = Object.freeze({ recallGainMinimum:0.15, semanticRecallBaselineRatioMinimum:1, noResultRestraintMinimum:1, crossSessionLeakageMaximum:0, crossSessionFalseRecallMaximum:0, retrievalP95MaximumMs:250, retrievalEfficiencyBaselineRatioMinimum:0.9, answerAnchorAccuracyMinimum:1, promptBudgetComplianceMinimum:1, currentRequestPreservationMinimum:1, taskFlowP95MaximumMs:250, recoveryCompletenessMinimum:1 });
const metricDefinitions = Object.freeze({
  recallAt5:"gate-positive cases with expected marker in first five results / gate-positive cases",
  noResultRestraint:"no-result cases returning zero marked records / no-result cases",
  crossSessionLeakageRate:"cross-session cases returning the forbidden expected marker / cross-session cases",
  correctRetrievalsPer1000ContextTokens:"correct gate-positive retrievals / estimated UTF-8 retrieval-context tokens x 1000; includes context returned on negative cases",
  deterministicAnswerAnchorAccuracy:"sealed deterministic provider extracts the expected marker from the composed admitted Task Packet input; this measures prompt influence, not general LLM quality",
  measuredPromptTokens:"ceil UTF-8 bytes / 4 for the exact composed provider input",
  recoveryCompleteness:"projection corruption repaired, parity restored, correct retrieval survives restart"
});
const sealedHoldoutDigest = sha256File(sealedHoldoutPath);
const contract = { schema:"gpao_t3.mct_r5_comparison_contract.v4", corpusSize:corpus.length, topK:MCT_R5_TOP_K, developmentCases:MCT_R5_DEVELOPMENT_CASES, holdoutCases, sealedHoldoutDigest, holdoutGeneratedAfterFreeze:sealedHoldout.generatedAfterFreeze, implementationFreeze, thresholds, metricDefinitions, lane:"offline_local_no_provider_no_network", baselineCommit:MCT_R5_BASELINE_COMMIT };
const contractDigest = canonicalDigest("gpao_t3.mct_r5_comparison_contract.v4", { corpus, ...contract });

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding:"utf8", maxBuffer:32 * 1024 * 1024, ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}
function sha256File(file) { return `sha256:${crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex")}`; }
function sha256Files(files) {
  const entries = [...files].sort().map(file => ({ file:path.relative(openClawRoot, file), digest:sha256File(file) }));
  return canonicalDigest("gpao_t3.external_file_set.v1", entries);
}
const openClawMemoryBundles = fs.readdirSync(path.join(openClawRoot, "dist"))
  .filter(name => /^memory-search-.*\.js$/u.test(name))
  .map(name => path.join(openClawRoot, "dist", name));
if (openClawMemoryBundles.length === 0) throw new Error("OpenClaw memory search bundle was not found");
const originalFingerprints = {
  gpaoTSource:sha256File(path.join(gpaoRoot, "src/core/memory-search.js")),
  openClawPackage:sha256File(path.join(openClawRoot, "package.json")),
  openClawEntrypoint:sha256File(path.join(openClawRoot, "openclaw.mjs")),
  openClawMemoryBundles:sha256Files(openClawMemoryBundles),
  liveTarget:fs.realpathSync(liveGpao)
};
function markers(text) { return [...new Set(String(text || "").match(/r5rec\d{4}/g) || [])]; }
function parseJsonTail(output) {
  const starts = [];
  for (let index = 0; index < output.length; index += 1) if (output[index] === "{" || output[index] === "[") starts.push(index);
  for (const start of starts) { try { return JSON.parse(output.slice(start)); } catch {} }
  throw new Error(`No JSON result in output: ${output.slice(-500)}`);
}
function observe(caseItem, result, elapsed) {
  const texts = result.map(item => item.text || item.excerpt || item.snippet || "");
  return { caseId:caseItem.id, kind:caseItem.kind, latencyMs:elapsed, markers:markers(texts.join("\n")), contextText:texts.join("\n") };
}
function summarize(target, observations, extra = {}) { return { target, summary:summarizeRetrieval(holdoutCases, observations), observations, ...extra }; }

async function qualifyReinforcedT3() {
  const stateDir = path.join(tempRoot, "t3-current"); const store = new StateStore(stateDir);
  try {
    store.transaction(() => corpus.forEach(item => store.addMemoryCandidate({ id:item.id, text:item.text, source:"mct_r5", traceRef:`trace:${item.id}`, sessionId:item.sessionId, userId:"owner:r5", scopeLevel:"session" })));
    const observations = holdoutCases.map(fixture => {
      const started = performance.now();
      const result = store.searchMemory(fixture.query, { sessionId:fixture.sessionId, userId:"owner:r5", limit:MCT_R5_TOP_K, budgetMs:250 });
      return observe(fixture, result.results, performance.now() - started);
    });
    return summarize("gpao_t3_reinforced", observations, { mode:"sqlite_fts5_lexical_fuzzy_char_trigram", semanticProvider:false });
  } finally { store.close(); }
}

async function qualifyBaselineT3() {
  const source = run("git", ["show", `${MCT_R5_BASELINE_COMMIT}:src/core/local-memory.js`], { cwd:root });
  const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const memory = new module.LocalHybridMemory({ maxEntries:corpus.length, maxResultCount:MCT_R5_TOP_K });
  corpus.forEach(item => memory.ingest({ text:item.text, source:"mct_r5", traceRef:`trace:${item.id}`, sessionId:item.sessionId }));
  const observations = holdoutCases.map(fixture => {
    const started = performance.now(); const result = memory.search(fixture.query, { sessionId:fixture.sessionId, limit:MCT_R5_TOP_K, budgetMs:250 });
    return observe(fixture, result.results, performance.now() - started);
  });
  return summarize("gpao_t3_pre_mct", observations, { mode:"in_memory_token_overlap", semanticProvider:false });
}

async function qualifyGpaoT() {
  const stateDir = path.join(tempRoot, "gpao-t-source");
  fs.mkdirSync(path.join(stateDir, "memory"), { recursive:true });
  fs.writeFileSync(path.join(stateDir, "memory", "wiki.json"), JSON.stringify({ entries:[] }));
  fs.writeFileSync(path.join(stateDir, "memory", "tcell-candidates.jsonl"), `${corpus.map(item => JSON.stringify({ id:item.id, pi:item.text, anchor:item.marker, x:[item.sessionId], trace:{ source:"mct_r5" }, createdAt:"2026-07-16T00:00:00.000Z" })).join("\n")}\n`);
  const api = await import(pathToFileURL(path.join(gpaoRoot, "src/core/memory-search.js")).href);
  api.buildMemorySearchIndex({ stateDir, now:"2026-07-16T00:00:00.000Z" });
  const observations = holdoutCases.map(fixture => {
    const started = performance.now(); const result = api.searchMemory({ query:fixture.query, stateDir, limit:MCT_R5_TOP_K, allowBuild:false });
    return observe(fixture, result.results, performance.now() - started);
  });
  return summarize("gpao_t_canonical_source", observations, { mode:"local_token_overlap_hash_embedding", scopeFilterExposed:false });
}

function qualifyOpenClaw() {
  const isolated = path.join(tempRoot, "openclaw"); const workspace = path.join(isolated, "workspace"); const memoryDir = path.join(workspace, "memory");
  fs.mkdirSync(memoryDir, { recursive:true }); fs.mkdirSync(path.join(isolated, "home"), { recursive:true });
  corpus.forEach(item => fs.writeFileSync(path.join(memoryDir, `${item.id}.md`), `# ${item.marker}\n\n${item.text}\n\nsession: ${item.sessionId}\n`));
  const configPath = path.join(isolated, "config.json"); const stateDir = path.join(isolated, "state");
  fs.writeFileSync(configPath, JSON.stringify({ agents:{ defaults:{ workspace, memorySearch:{ enabled:true, provider:"none" } } } }));
  const env = { ...process.env, HOME:path.join(isolated, "home"), OPENCLAW_STATE_DIR:stateDir, OPENCLAW_CONFIG_PATH:configPath, NO_COLOR:"1" };
  run(openClawBin, ["memory", "index", "--force"], { env, cwd:isolated });
  const observations = holdoutCases.map(fixture => {
    const started = performance.now(); const output = run(openClawBin, ["memory", "search", "--json", "--max-results", String(MCT_R5_TOP_K), fixture.query], { env, cwd:isolated });
    const result = parseJsonTail(output);
    return observe(fixture, result.results || [], performance.now() - started);
  });
  return summarize("openclaw_installed", observations, { mode:"builtin_fts_provider_none_cli_cold_per_query", semanticProvider:false, isolatedHome:true });
}

async function qualifyTaskPacketFlow() {
  const stateDir = path.join(tempRoot, "t3-task-flow");
  const store = new StateStore(stateDir);
  const cases = holdoutCases.filter(item => item.shouldFind && item.gate !== false);
  try {
    store.transaction(() => corpus.forEach(item => store.addMemoryCandidate({ id:item.id, text:item.text, source:"mct_r5", traceRef:`trace:${item.id}`, sessionId:item.sessionId, userId:"owner:r5", scopeLevel:"session" })));
    const observations = cases.map(fixture => {
      const started = performance.now();
      const retrieval = store.searchMemory(fixture.query, { sessionId:fixture.sessionId, userId:"owner:r5", limit:MCT_R5_TOP_K, budgetMs:250 });
      const source = retrieval.results.find(item => item.text.includes(fixture.expectedMarker));
      const approved = source ? {
        ...source, reviewed:true, approvedInfluence:true, replayPassed:true, sourceResolved:true, sourceInvalidated:false,
        authority:{ allowedUse:"answer_anchor", durablePromotion:true, decisionClass:"A2", decisionId:`sealed-${fixture.id}` }
      } : null;
      const packet = createTaskPacket({ sessionId:fixture.sessionId, input:fixture.query, contextWindow:4096, userId:"owner:r5" });
      const admission = admitTcellCandidates(packet, approved ? [approved] : []);
      const providerInput = composeAdmittedProviderInput({ currentRequest:fixture.query, providerInput:fixture.query, admission });
      const answer = markers(providerInput)[0] || "";
      const promptTokens = Math.ceil(Buffer.byteLength(providerInput, "utf8") / 4);
      const outputTokens = Math.ceil(Buffer.byteLength(answer, "utf8") / 4);
      return {
        caseId:fixture.id, expectedMarker:fixture.expectedMarker, answer, correct:answer === fixture.expectedMarker,
        currentRequestPreserved:providerInput.includes(fixture.query),
        promptBudgetCompliant:promptTokens + packet.budget.output + packet.budget.reserve <= packet.budget.contextWindow,
        promptTokens, outputTokens, latencyMs:performance.now() - started
      };
    });
    const count = observations.length || 1;
    return {
      schema:"gpao_t3.mct_r5_task_packet_flow.v1", observations,
      metrics:{
        deterministicAnswerAnchorAccuracy:observations.filter(item => item.correct).length / count,
        currentRequestPreservation:observations.filter(item => item.currentRequestPreserved).length / count,
        promptBudgetCompliance:observations.filter(item => item.promptBudgetCompliant).length / count,
        measuredPromptTokens:observations.reduce((sum, item) => sum + item.promptTokens, 0),
        deterministicOutputTokens:observations.reduce((sum, item) => sum + item.outputTokens, 0),
        latency:{ p50Ms:percentile(observations.map(item => item.latencyMs), 0.5), p95Ms:percentile(observations.map(item => item.latencyMs), 0.95) }
      }
    };
  } finally { store.close(); }
}

function qualifyRecovery() {
  const stateDir = path.join(tempRoot, "t3-recovery");
  let store = new StateStore(stateDir);
  try {
    store.transaction(() => corpus.forEach(item => store.addMemoryCandidate({ id:item.id, text:item.text, source:"mct_r5", traceRef:`trace:${item.id}`, sessionId:item.sessionId, userId:"owner:r5", scopeLevel:"session" })));
    store.db.exec("DELETE FROM memory_lexical_fts; DELETE FROM memory_vector_fts; DELETE FROM memory_vector_projection;");
    const corrupted = store.memorySearchStatus();
    const started = performance.now();
    const repair = store.repairMemorySearchIndexBatch({ limit:500 });
    const repairMs = performance.now() - started;
    const beforeRestart = store.searchMemory("라일락회의실 배포창구", { sessionId:"session-a", userId:"owner:r5", limit:5 });
    store.close();
    store = new StateStore(stateDir);
    const afterRestart = store.searchMemory("라일락회의실 배포창구", { sessionId:"session-a", userId:"owner:r5", limit:5 });
    const complete = corrupted.parity === false && repair.status.parity === true
      && beforeRestart.results.some(item => item.text.includes("r5rec0101"))
      && afterRestart.results.some(item => item.text.includes("r5rec0101"));
    return { schema:"gpao_t3.mct_r5_recovery.v1", corrupted, repair, repairMs, restartParity:store.memorySearchStatus().parity, complete };
  } finally { store.close(); }
}

function sourceManifest() {
  const liveTarget = fs.realpathSync(liveGpao);
  return {
    schema:"gpao_t3.mct_r5_source_manifest.v1", contractDigest,
    environment:{ platform:process.platform, arch:process.arch, node:process.version },
    targets:{
      gpaoT3Reinforced:{ commit:run("git", ["rev-parse", "HEAD"], { cwd:root }), sourceDirty:run("git", ["status", "--porcelain"], { cwd:root }).length > 0, implementationCommit:implementationFreeze.commit, source:sha256File(path.join(root, "src/core/store.js")), scorer:sha256File(path.join(root, "src/core/mct-comparison.js")), developmentFixture:sha256File(path.join(root, "test/fixtures/mct-r5-cases.js")), sealedHoldout:sealedHoldoutDigest, qualifier:sha256File(path.join(root, "tools/qualify-mct-r5.mjs")) },
      gpaoT3PreMct:{ commit:run("git", ["rev-parse", MCT_R5_BASELINE_COMMIT], { cwd:root }), source:canonicalDigest("gpao_t3.mct_r5_baseline_source.v1", run("git", ["show", `${MCT_R5_BASELINE_COMMIT}:src/core/local-memory.js`], { cwd:root })) },
      gpaoT:{ sourceCommit:run("git", ["rev-parse", "HEAD"], { cwd:gpaoRoot }), sourceDirty:run("git", ["status", "--porcelain"], { cwd:gpaoRoot }).length > 0, liveTarget, source:sha256File(path.join(gpaoRoot, "src/core/memory-search.js")) },
      openClaw:{ version:run(openClawBin, ["--version"], { env:{ ...process.env, HOME:path.join(tempRoot, "version-home"), OPENCLAW_STATE_DIR:path.join(tempRoot, "version-state") } }), package:sha256File(path.join(openClawRoot, "package.json")), entrypoint:sha256File(path.join(openClawRoot, "openclaw.mjs")), memoryBundles:sha256Files(openClawMemoryBundles) }
    }
  };
}

try {
  const [baseline, reinforced, gpaoT] = await Promise.all([qualifyBaselineT3(), qualifyReinforcedT3(), qualifyGpaoT()]);
  const openClaw = qualifyOpenClaw();
  const targets = { baseline, reinforced, gpaoT, openClaw };
  const admission = parseJsonTail(run(process.execPath, [path.join(root, "tools/benchmark-mct-r2.mjs")], { cwd:root }));
  const taskPacketFlow = await qualifyTaskPacketFlow();
  const recovery = qualifyRecovery();
  const manifest = sourceManifest();
  const gateChecks = {
    reinforcedImprovesRecall:reinforced.summary.recallAt5 - baseline.summary.recallAt5 >= thresholds.recallGainMinimum,
    reinforcedSemanticNonRegression:reinforced.summary.semanticRecallAt5 >= baseline.summary.semanticRecallAt5 * thresholds.semanticRecallBaselineRatioMinimum,
    reinforcedRestraint:reinforced.summary.noResultRestraint >= thresholds.noResultRestraintMinimum,
    reinforcedIsolation:reinforced.summary.crossSessionLeakageRate <= thresholds.crossSessionLeakageMaximum,
    reinforcedNoWrongScopeFallback:reinforced.summary.crossSessionFalseRecallRate <= thresholds.crossSessionFalseRecallMaximum,
    reinforcedLatency:reinforced.summary.latency.p95Ms <= thresholds.retrievalP95MaximumMs,
    reinforcedRetrievalEfficiency:reinforced.summary.correctRetrievalsPer1000ContextTokens >= baseline.summary.correctRetrievalsPer1000ContextTokens * thresholds.retrievalEfficiencyBaselineRatioMinimum,
    admission:admission.gate === "pass",
    taskPacketAnswerInfluence:taskPacketFlow.metrics.deterministicAnswerAnchorAccuracy >= thresholds.answerAnchorAccuracyMinimum,
    taskPacketBudget:taskPacketFlow.metrics.promptBudgetCompliance >= thresholds.promptBudgetComplianceMinimum,
    taskPacketCurrentRequest:taskPacketFlow.metrics.currentRequestPreservation >= thresholds.currentRequestPreservationMinimum,
    taskPacketLatency:taskPacketFlow.metrics.latency.p95Ms <= thresholds.taskFlowP95MaximumMs,
    recovery:recovery.complete === true && Number(recovery.complete) >= thresholds.recoveryCompletenessMinimum,
    implementationFrozen:manifest.targets.gpaoT3Reinforced.source === implementationFreeze.storeDigest,
    originalsUntouched:manifest.targets.gpaoT.source === originalFingerprints.gpaoTSource
      && manifest.targets.openClaw.package === originalFingerprints.openClawPackage
      && manifest.targets.openClaw.entrypoint === originalFingerprints.openClawEntrypoint
      && manifest.targets.openClaw.memoryBundles === originalFingerprints.openClawMemoryBundles
      && manifest.targets.gpaoT.liveTarget === originalFingerprints.liveTarget
  };
  const qualification = { schema:"gpao_t3.mct_r5_comparative_qualification.v3", verdict:Object.values(gateChecks).every(Boolean) ? "pass" : "hold", contractDigest, gateChecks, measured:{ retrieval:targets, admission:{ target:"gpao_t3_reinforced", ...admission }, taskPacketFlow, recovery }, tradeoffs:{ reinforcedContextTokensChange:(reinforced.summary.retrievedContextTokens / baseline.summary.retrievedContextTokens) - 1, reinforcedRecallChange:reinforced.summary.recallAt5 - baseline.summary.recallAt5, reinforcedRetrievalEfficiencyChange:(reinforced.summary.correctRetrievalsPer1000ContextTokens / baseline.summary.correctRetrievalsPer1000ContextTokens) - 1 }, limits:{ generalModelAnswerQuality:"not_measured; deterministic answer-anchor extraction measures Task Packet influence only", providerReportedTokens:"not_measured_no_provider; exact composed prompt is measured with sealed UTF-8 estimator", openClawLatency:"cold CLI process latency; not comparable to in-process T3/GPAO-T latency", openClawAdmission:"no equivalent public per-hit admission surface", gpaoTSessionIsolation:"search API has no session filter", semantic:"no external or downloaded embedding model used; no semantic superiority claim" }, manifest };
  fs.mkdirSync(evidenceDir, { recursive:true });
  fs.writeFileSync(path.join(evidenceDir, "contract.json"), `${JSON.stringify(contract, null, 2)}\n`);
  fs.writeFileSync(path.join(evidenceDir, "source-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(evidenceDir, "observations.jsonl"), `${Object.values(targets).flatMap(target => target.observations.map(item => JSON.stringify({ target:target.target, ...item }))).join("\n")}\n`);
  fs.writeFileSync(path.join(evidenceDir, "qualification.json"), `${JSON.stringify(qualification, null, 2)}\n`);
  console.log(JSON.stringify(qualification, null, 2));
  if (qualification.verdict !== "pass") process.exitCode = 1;
} finally {
  fs.rmSync(tempRoot, { recursive:true, force:true });
}
