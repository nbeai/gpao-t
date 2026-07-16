import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { canonicalDigest } from "../src/core/canonical-json.js";
import { estimateContextTokens, summarizeRetrieval } from "../src/core/mct-comparison.js";
import { StateStore } from "../src/core/store.js";
import { createMctR5Corpus, MCT_R5_DEVELOPMENT_CASES, MCT_R5_HOLDOUT_CASES, MCT_R5_CORPUS_SIZE, MCT_R5_TOP_K } from "./fixtures/mct-r5-cases.js";

test("MCT-R5 freezes one target-neutral offline comparison contract", () => {
  const corpus = createMctR5Corpus();
  assert.equal(corpus.length, MCT_R5_CORPUS_SIZE);
  assert.equal(new Set(corpus.map(item => item.id)).size, corpus.length);
  assert.equal(MCT_R5_TOP_K, 5);
  assert.deepEqual([...new Set(MCT_R5_DEVELOPMENT_CASES.map(item => item.kind))].sort(), ["cross_session", "exact", "korean", "no_result", "semantic", "typo"]);
  assert.deepEqual([...new Set(MCT_R5_HOLDOUT_CASES.map(item => item.kind))].sort(), ["cross_session", "natural_exact", "natural_typo", "no_result", "semantic"]);
  assert.equal([...MCT_R5_DEVELOPMENT_CASES, ...MCT_R5_HOLDOUT_CASES].some(item => "target" in item || "product" in item), false);
  assert.equal(MCT_R5_HOLDOUT_CASES.some(item => /^r5rec\d+$/u.test(item.query)), false);
  assert.match(canonicalDigest("gpao_t3.mct_r5_contract.v2", { corpus, developmentCases:MCT_R5_DEVELOPMENT_CASES, holdoutCases:MCT_R5_HOLDOUT_CASES, topK:MCT_R5_TOP_K }), /^sha256:[a-f0-9]{64}$/);
});

test("MCT-R5 scorer separates recall, restraint, leakage, latency, and token efficiency", () => {
  const fixtures = [
    { id:"hit", kind:"exact", expectedMarker:"a", shouldFind:true },
    { id:"none", kind:"no_result", expectedMarker:null, shouldFind:false },
    { id:"scope", kind:"cross_session", expectedMarker:"b", shouldFind:false }
  ];
  const summary = summarizeRetrieval(fixtures, [
    { caseId:"hit", markers:["a"], contextText:"short context", latencyMs:2 },
    { caseId:"none", markers:[], contextText:"", latencyMs:1 },
    { caseId:"scope", markers:["b"], contextText:"leaked", latencyMs:3 }
  ]);
  assert.equal(summary.recallAt5, 1);
  assert.equal(summary.noResultRestraint, 1);
  assert.equal(summary.crossSessionLeakageRate, 1);
  assert.equal(summary.crossSessionFalseRecallRate, 1);
  assert.equal(summary.latency.p95Ms, 3);
  assert.equal(estimateContextTokens("가나다"), 3);
});

test("MCT-R5 reinforced retrieval returns useful context without low-confidence flooding", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-mct-r5-restraint-")); const store = new StateStore(dir);
  try {
    store.transaction(() => createMctR5Corpus().forEach(item => store.addMemoryCandidate({ id:item.id, text:item.text, source:"mct_r5", traceRef:`trace:${item.id}`, sessionId:item.sessionId, userId:"owner:r5", scopeLevel:"session" })));
    const search = query => store.searchMemory(query, { sessionId:"session-a", userId:"owner:r5", limit:5, budgetMs:250 }).results;
    assert.deepEqual(search("r5rec0001").map(item => item.id), ["mct-r5-0001"]);
    assert.deepEqual(search("r5rc0011").map(item => item.id), ["mct-r5-0011"]);
    assert.deepEqual(search("해오름결재규칙").map(item => item.id), ["mct-r5-0104"]);
    assert.deepEqual(search("작업 원칙 검증 영수증과 무지개해협규약을 찾아줘").map(item => item.id), []);
    assert.deepEqual(search("기억열쇠 9876 회계 규칙").map(item => item.id), []);
    assert.deepEqual(search("r5rec0005").map(item => item.id), []);
    assert.deepEqual(search("존재하지않는봉인키9999").map(item => item.id), []);
  } finally { store.close(); fs.rmSync(dir, { recursive:true, force:true }); }
});
