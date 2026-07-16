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
  assert.match(canonicalDigest("gpao_t3.mct_r5_contract.v3", { corpus, developmentCases:MCT_R5_DEVELOPMENT_CASES, holdoutCases:MCT_R5_HOLDOUT_CASES, topK:MCT_R5_TOP_K }), /^sha256:[a-f0-9]{64}$/);
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

test("MCT-R5 scorer recognizes sealed semantic and negative case families", () => {
  const fixtures = [
    { id:"semantic", kind:"semantic_paraphrase", expectedMarker:"a", shouldFind:true },
    { id:"common", kind:"common_no_result", expectedMarker:null, shouldFind:false },
    { id:"number", kind:"numeric_collision_no_result", expectedMarker:null, shouldFind:false }
  ];
  const summary = summarizeRetrieval(fixtures, [
    { caseId:"semantic", markers:["a"], contextText:"a", latencyMs:1 },
    { caseId:"common", markers:["wrong"], contextText:"wrong", latencyMs:1 },
    { caseId:"number", markers:[], contextText:"", latencyMs:1 }
  ]);
  assert.equal(summary.semanticRecallAt5, 1);
  assert.equal(summary.noResultRestraint, 0.5);
});

test("MCT-R5 reinforced retrieval returns useful context without low-confidence flooding", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-mct-r5-restraint-")); const store = new StateStore(dir);
  try {
    store.transaction(() => createMctR5Corpus().forEach(item => store.addMemoryCandidate({ id:item.id, text:item.text, source:"mct_r5", traceRef:`trace:${item.id}`, sessionId:item.sessionId, userId:"owner:r5", scopeLevel:"session" })));
    store.addMemoryCandidate({ id:"mct-r5-sealed-0205", text:"r5rec0205 복잡한 설명은 핵심 결론을 먼저 제시한 뒤 세부 근거를 덧붙인다", source:"mct_r5", traceRef:"trace:0205", sessionId:"session-a", userId:"owner:r5", scopeLevel:"session" });
    store.addMemoryCandidate({ id:"mct-r5-sealed-0206", text:"r5rec0206 외부 공유 전에는 문서에서 개인을 식별할 수 있는 정보를 제거한다", source:"mct_r5", traceRef:"trace:0206", sessionId:"session-a", userId:"owner:r5", scopeLevel:"session" });
    store.addMemoryCandidate({ id:"mct-r5-sealed-0208", text:"r5rec0208 검은파도일지의 열람 책임자는 도윤이다", source:"mct_r5", traceRef:"trace:0208", sessionId:"session-b", userId:"owner:r5", scopeLevel:"session" });
    store.addMemoryCandidate({ id:"mct-r5-sealed-0209", text:"r5rec0209 구름다리요청함의 긴급문의 책임자는 하린이다", source:"mct_r5", traceRef:"trace:0209", sessionId:"session-a", userId:"owner:r5", scopeLevel:"session" });
    const search = query => store.searchMemory(query, { sessionId:"session-a", userId:"owner:r5", limit:5, budgetMs:250 }).results;
    assert.deepEqual(search("r5rec0001").map(item => item.id), ["mct-r5-0001"]);
    assert.deepEqual(search("r5rc0011").map(item => item.id), ["mct-r5-0011"]);
    assert.deepEqual(search("해오름결재규칙").map(item => item.id), ["mct-r5-0104"]);
    assert.deepEqual(search("예전 정보보다 방금 부탁한 일을 우선해").map(item => item.id), ["mct-r5-0031"]);
    assert.deepEqual(search("상세한 이유를 설명하기 전에 요점을 앞에 배치한다").map(item => item.id), ["mct-r5-sealed-0205"]);
    assert.deepEqual(search("자료를 밖으로 보내기 전에 누구인지 알아볼 수 있는 내용을 지운다").map(item => item.id), ["mct-r5-sealed-0206"]);
    assert.deepEqual(search("작업 원칙 검증 영수증과 무지개해협규약을 찾아줘").map(item => item.id), []);
    assert.deepEqual(search("문서 일정 책임자와 확인 기록을 찾아줘").map(item => item.id), []);
    assert.deepEqual(search("검은파도일지 열람 책임자").map(item => item.id), []);
    assert.deepEqual(search("기억열쇠 9876 회계 규칙").map(item => item.id), []);
    assert.deepEqual(search("r5rec0005").map(item => item.id), []);
    assert.deepEqual(search("존재하지않는봉인키9999").map(item => item.id), []);
  } finally { store.close(); fs.rmSync(dir, { recursive:true, force:true }); }
});
