import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { evaluateSemanticCandidate, semanticProjectionTerms } from "../src/core/semantic-candidate.js";
import { StateStore } from "../src/core/store.js";
import { createTaskPacket } from "../src/core/task-packet.js";
import { admitTcellCandidates } from "../src/core/tcell.js";

function tempState() { return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-semantic-candidate-")); }

test("provider-neutral semantic features recover operating-equivalent paraphrases", () => {
  const pairs = [
    ["과거 기록보다 사용자가 지금 요청한 일을 우선한다", "예전 정보보다 방금 부탁한 일을 먼저 처리해"],
    ["복잡한 설명은 핵심 결론을 먼저 제시한 뒤 세부 근거를 덧붙인다", "상세한 이유를 설명하기 전에 요점을 앞에 배치한다"],
    ["외부 공유 전에는 문서에서 개인을 식별할 수 있는 정보를 제거한다", "자료를 밖으로 보내기 전에 누구인지 알아볼 수 있는 내용을 지운다"],
    ["회의 결과를 전달할 때 결정된 항목과 아직 논의 중인 항목을 구분한다", "합의가 끝난 내용과 결론 나지 않은 내용을 나눠서 알려준다"],
    ["파일을 덮어쓰기 전에 복사본을 만들어 원래 상태로 돌아갈 수 있게 한다", "자료를 바꾸기 앞서 되돌릴 수 있도록 사본을 남긴다"]
  ];
  for (const [memory, query] of pairs) {
    const fit = evaluateSemanticCandidate(query, memory);
    assert.equal(fit.providerNeutral, true);
    assert.equal(fit.entailment, true, `${query} should be entailed by ${memory}`);
    assert.ok(fit.relevance >= 0.7);
    assert.ok(semanticProjectionTerms(memory).some(term => term.startsWith("clause_")));
  }
});

test("semantic fit rejects topical overlap that does not answer the current task", () => {
  const externalOnly = evaluateSemanticCandidate(
    "자료를 밖으로 보내기 전에 누구인지 알아볼 수 있는 내용을 지운다",
    "회의 자료를 외부에 전달하는 일정은 금요일이다"
  );
  assert.equal(externalOnly.entailment, false);
  const commonOnly = evaluateSemanticCandidate(
    "회의 자료의 작성 상태와 전달 일정을 확인해줘",
    "회의 결과를 전달할 때 결정된 항목과 아직 논의 중인 항목을 구분한다"
  );
  assert.equal(commonOnly.entailment, false);
});

test("SQLite semantic projection retrieves true paraphrases and preserves restraint and scope", () => {
  const dir = tempState(); const store = new StateStore(dir);
  try {
    const records = [
      ["priority", "과거 기록보다 사용자가 지금 요청한 일을 우선한다", "session-a"],
      ["decision", "회의 결과를 전달할 때 결정된 항목과 아직 논의 중인 항목을 구분한다", "session-a"],
      ["backup", "파일을 덮어쓰기 전에 복사본을 만들어 원래 상태로 돌아갈 수 있게 한다", "session-a"],
      ["private", "외부 공유 전에는 문서에서 개인을 식별할 수 있는 정보를 제거한다", "session-b"]
    ];
    for (const [id, text, sessionId] of records) store.addMemoryCandidate({ id, text, sessionId, userId:"owner", scopeLevel:"session", source:"test", traceRef:`trace:${id}` });
    const search = query => store.searchMemory(query, { sessionId:"session-a", userId:"owner", limit:5 }).results;
    assert.deepEqual(search("합의가 끝난 내용과 결론 나지 않은 내용을 나눠서 알려준다").map(item => item.id), ["decision"]);
    assert.deepEqual(search("자료를 바꾸기 앞서 되돌릴 수 있도록 사본을 남긴다").map(item => item.id), ["backup"]);
    assert.deepEqual(search("회의 자료의 작성 상태와 전달 일정을 확인해줘"), []);
    assert.deepEqual(search("자료를 밖으로 보내기 전에 누구인지 알아볼 수 있는 내용을 지운다"), []);
    assert.equal(store.memorySearchStatus().semanticCandidates, records.length);
    assert.equal(store.memorySearchStatus().parity, true);
  } finally { store.close(); fs.rmSync(dir, { recursive:true, force:true }); }
});

test("admission records task-relative relevance and rejects unsupported entailment", () => {
  const packet = createTaskPacket({ sessionId:"session-a", input:"자료를 밖으로 보내기 전에 누구인지 알아볼 수 있는 내용을 지운다", userId:"owner" });
  const base = {
    sessionId:"session-a", userId:"owner", scopeLevel:"session", sourceResolved:true, sourceInvalidated:false,
    reviewed:true, approvedInfluence:true, score:0.95, traceRef:"trace:test",
    authority:{ allowedUse:"answer_anchor", durablePromotion:true, decisionClass:"A2", decisionId:"a2-test" }
  };
  const result = admitTcellCandidates(packet, [
    { ...base, id:"topical", text:"외부 공유 대상자의 이름과 신원을 확인한다" },
    { ...base, id:"entailed", text:"외부 공유 전에는 문서에서 개인을 식별할 수 있는 정보를 제거한다" }
  ]);
  const topical = result.decisions.find(item => item.sourceCandidateId === "topical");
  const entailed = result.decisions.find(item => item.sourceCandidateId === "entailed");
  assert.equal(topical.state, "rejected");
  assert.equal(topical.reason, "entailment_not_supported");
  assert.equal(topical.checks.entailment, false);
  assert.equal(entailed.state, "answer_anchor");
  assert.equal(entailed.checks.entailment, true);
  assert.ok(entailed.taskFit.relevance >= 0.7);
});

test("admission rejects unrelated high scores, opposite polarity, missing scope, and forged task fit", () => {
  const packet = createTaskPacket({ sessionId:"session-a", input:"내일 부산 날씨를 알려줘", userId:"owner" });
  const authority = { allowedUse:"answer_anchor", durablePromotion:true, decisionClass:"A2", decisionId:"a2-audit" };
  const base = { sessionId:"session-a", userId:"owner", scopeLevel:"session", sourceResolved:true, reviewed:true, approvedInfluence:true, traceRef:"trace:audit", authority, score:0.99 };
  const unrelated = admitTcellCandidates(packet, [{ ...base, id:"unrelated", text:"회계 보고서는 매월 첫째 주에 제출한다" }]).decisions[0];
  assert.equal(unrelated.state, "rejected");
  assert.equal(unrelated.reason, "relevance_below_threshold");

  const polarityPacket = createTaskPacket({ sessionId:"session-a", input:"외부로 보내기 전에 개인정보를 제거해", userId:"owner" });
  const opposite = admitTcellCandidates(polarityPacket, [{ ...base, id:"opposite", text:"외부로 보내기 전에 개인정보를 제거하지 마" }]).decisions[0];
  assert.equal(opposite.state, "conflict_boundary");
  assert.equal(opposite.taskFit.polarityCompatible, false);

  const forged = admitTcellCandidates(packet, [{ ...base, id:"forged", text:"회계 보고서는 매월 첫째 주에 제출한다", semanticFit:{ relevance:1, entailment:true } }]).decisions[0];
  assert.equal(forged.state, "rejected");
  assert.equal(forged.taskFit.schema, "gpao_t3.semantic_task_fit.v1");

  const missingScope = admitTcellCandidates(packet, [{ ...base, id:"missing-scope", sessionId:null, text:"내일 부산 날씨를 알려준다" }]).decisions[0];
  assert.equal(missingScope.state, "rejected");
  assert.equal(missingScope.reason, "scope_mismatch");
});
