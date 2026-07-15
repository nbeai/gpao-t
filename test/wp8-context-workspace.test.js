import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createHttpServer } from "../src/core/http.js";
import { ProviderInvocationError } from "../src/core/provider.js";
import { NativeRuntime } from "../src/core/runtime.js";

async function tempState() { return fs.mkdtemp(path.join(os.tmpdir(), "gpao-t3-wp8-")); }

test("server workspaces preserve messages and user organization across restart", async () => {
  const root = await tempState(); const sessionId = "1a7f7f54-0f49-4e89-91c5-12eebde1745c";
  let runtime = await new NativeRuntime({ stateDir: root }).start();
  await runtime.runOsTurn({ principalId: "owner:test", sessionId, requestId: "workspace-turn-1", input: "서버 작업공간을 확인한다" });
  let workspace = await runtime.getWorkspace("owner:test", sessionId);
  assert.equal(workspace.messages.length, 2);
  assert.equal(workspace.messages[0].role, "user");
  await runtime.updateWorkspace("owner:test", sessionId, { title: "핵심 작업", pinned: true });
  await runtime.stop();
  runtime = await new NativeRuntime({ stateDir: root }).start();
  try {
    workspace = await runtime.getWorkspace("owner:test", sessionId);
    assert.equal(workspace.title, "핵심 작업"); assert.equal(workspace.pinned, true); assert.equal(workspace.messages.length, 2);
    assert.equal((await runtime.listWorkspaces("owner:test")).workspaces[0].sessionId, sessionId);
    assert.equal((await runtime.updateWorkspace("owner:test", sessionId, { archived: true })).archived, true);
    assert.equal((await runtime.listWorkspaces("owner:test")).workspaces.length, 0);
    assert.equal((await runtime.deleteWorkspace("owner:test", sessionId)).deleted, true);
  } finally { await runtime.stop(); }
});

test("memory stays candidate until review and replay, then survives restart and can roll back", async () => {
  const root = await tempState(); const sessionId = "34ad775f-11ed-4a79-8937-7dfdb468e50d";
  let runtime = await new NativeRuntime({ stateDir: root }).start();
  const first = await runtime.runOsTurn({ principalId: "owner:test", sessionId, requestId: "memory-observe-1", input: "장기 프로젝트는 검토된 기억만 사용한다" });
  assert.equal(first.observation.accepted, true);
  const memory = (await runtime.listMemoryWiki({ sessionId, userId: "owner:test" })).entries[0];
  assert.equal(memory.reviewState, "candidate"); assert.equal(runtime.contextInfluenceStatus().activeCount, 0);
  const beforeReview = await runtime.runOsTurn({ principalId: "owner:test", sessionId, requestId: "memory-before-review", input: "검토된 기억만 사용하는 장기 프로젝트 원칙" });
  assert.equal(beforeReview.admission.admitted.length, 0);
  await runtime.reviewMemory(memory.id, "reviewed", { durablePromotion: true, decisionClass: "A2", principalId: "owner:test", scope: "session" });
  const replayed = await runtime.runOsTurn({ principalId: "owner:test", sessionId, requestId: "memory-after-review", input: "검토된 기억만 사용하는 장기 프로젝트 원칙" });
  assert.equal(replayed.admission.admitted[0].admission, "supporting_context");
  assert.equal(replayed.contextInfluence.state, "applied");
  const influenceId = replayed.contextInfluence.applied[0].id;
  await runtime.stop();
  runtime = await new NativeRuntime({ stateDir: root }).start();
  try {
    const anchored = await runtime.runOsTurn({ principalId: "owner:test", sessionId, requestId: "memory-anchor", input: "검토된 기억만 사용하는 장기 프로젝트 원칙" });
    assert.equal(anchored.approvedInfluences[0].influenceId, influenceId);
    assert.equal(anchored.admission.admitted[0].admission, "answer_anchor");
    assert.equal((await runtime.rollbackContextInfluenceDurable(influenceId, "user_review")).rolledBack, true);
    const afterRollback = await runtime.runOsTurn({ principalId: "owner:test", sessionId, requestId: "memory-rollback", input: "검토된 기억만 사용하는 장기 프로젝트 원칙" });
    assert.equal(afterRollback.approvedInfluences.length, 0);
  } finally { await runtime.stop(); }
});

test("provider recovery is persisted in the server workspace", async () => {
  const root = await tempState(); const sessionId = "dfca5192-5980-4cd8-8238-1f017e5c97fe";
  const providerAdapter = { invoke: async () => { throw new ProviderInvocationError("auth_required", "internal provider detail"); } };
  const runtime = await new NativeRuntime({ stateDir: root, providerAdapter }).start();
  try {
    const result = await runtime.runOsTurn({ principalId: "owner:test", sessionId, requestId: "workspace-failed-turn", input: "연결이 끊긴 상태에서도 복구 안내를 남긴다" });
    assert.equal(result.replyMode, "provider_blocked");
    const workspace = await runtime.getWorkspace("owner:test", sessionId);
    assert.equal(workspace.messages.length, 2);
    assert.deepEqual(workspace.messages.map(message => message.role), ["user", "assistant"]);
    assert.match(workspace.messages[1].text, /지금은 요청을 끝내지 못했습니다/);
    assert.match(workspace.messages[1].text, /연결/);
    assert.doesNotMatch(workspace.messages[1].text, /internal provider detail/);
  } finally { await runtime.stop(); }
});

test("the dashboard cannot forge a replay pass to promote memory", async () => {
  const runtime = await new NativeRuntime({ stateDir: await tempState() }).start();
  const { server } = createHttpServer(runtime, { port: 0 });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const dashboard = await fetch(`${base}/`);
    const cookie = dashboard.headers.get("set-cookie");
    const sessionId = "1e39b882-c9b4-48ee-b139-bbb93d11f079";
    await fetch(`${base}/v1/os-turns`, { method:"POST", headers:{ cookie, "content-type":"application/json" }, body:JSON.stringify({ requestId:"memory-api-seed", sessionId, input:"승격은 실제 replay 결과만 사용한다" }) });
    const candidate = (await fetch(`${base}/v1/memory-wiki`, { headers:{ cookie } }).then(response => response.json())).entries[0];
    await fetch(`${base}/v1/memory-wiki/${candidate.id}/review`, { method:"POST", headers:{ cookie, origin:base, "content-type":"application/json" }, body:JSON.stringify({ decision:"reviewed" }) });
    const forged = await fetch(`${base}/v1/memory-wiki/${candidate.id}/promote`, { method:"POST", headers:{ cookie, origin:base, "content-type":"application/json" }, body:JSON.stringify({ replayPassed:true, replayScore:1 }) });
    assert.equal(forged.status, 404);
    assert.equal(runtime.contextInfluenceStatus().activeCount, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await runtime.stop();
  }
});
