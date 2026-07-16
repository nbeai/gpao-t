import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createHttpServer } from "../src/core/http.js";
import { NativeRuntime } from "../src/core/runtime.js";
import { StateStore } from "../src/core/store.js";
import { createGrowthProposal, evaluateGrowthReplay } from "../src/core/growth-engine.js";
import { proposalInput } from "./fixtures/mct-r3-cases.js";

function stateDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-mct-r4-")); }
async function eventually(predicate, timeout = 4_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await predicate();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("MCT-R4 async turn timed out");
}

test("MCT-R4 exposes quiet answer provenance without memory text or internal trace", async () => {
  const dir = stateDir(); const sessionId = "1a8118b7-0d80-4f81-a695-f151f58bbec5";
  const runtime = await new NativeRuntime({ stateDir: dir }).start();
  try {
    await runtime.runOsTurn({ principalId:"owner:r4", sessionId, requestId:"r4-seed", input:"긴 작업에서는 현재 요청을 먼저 지켜줘" });
    const memory = (await runtime.listMemoryWiki({ userId:"owner:r4", sessionId })).entries[0];
    await runtime.reviewMemory(memory.id, "reviewed", { durablePromotion:true, decisionClass:"A2", principalId:"owner:r4", scope:"session" });
    await runtime.runOsTurn({ principalId:"owner:r4", sessionId, requestId:"r4-promote", input:"긴 작업에서도 현재 요청을 먼저 지키는 원칙" });
    const accepted = await runtime.startOsTurnV2({ principalId:"owner:r4", sessionId, requestId:"r4-anchor", input:"긴 작업에서도 현재 요청을 먼저 지키는 원칙" });
    await eventually(async () => (await runtime.getOsTurnV2("owner:r4", accepted.turnId))?.terminal);
    const workspace = await runtime.getWorkspace("owner:r4", sessionId);
    const answer = workspace.messages.filter(message => message.role === "assistant").at(-1);
    assert.ok(answer.provenance.usedCount >= 1);
    assert.equal(answer.provenance.usedCount, answer.provenance.sources.length);
    assert.deepEqual(Object.keys(answer.provenance.sources[0]).sort(), ["role", "scope", "sourceKind"]);
    assert.equal(answer.provenance.sources[0].scope, "session");
    assert.equal(JSON.stringify(answer.provenance).includes(memory.text), false);
    assert.equal(JSON.stringify(answer.provenance).includes(memory.traceRef), false);
  } finally { await runtime.stop(); fs.rmSync(dir, { recursive:true, force:true }); }
});

test("MCT-R4 scope correction is owner-bound and widening requires explicit approval", () => {
  const dir = stateDir(); const store = new StateStore(dir);
  try {
    const entry = store.addMemoryCandidate({ id:"mem_r4_scope", text:"현재 요청을 우선한다", source:"owner", traceRef:"trace:r4-scope", sessionId:"session-a", userId:"owner:a", scopeLevel:"session" });
    assert.throws(() => store.updateMemoryScope(entry.id, { ownerId:"owner:a", scopeLevel:"user_global" }), error => error.code === "memory_scope_approval_required");
    assert.throws(() => store.updateMemoryScope(entry.id, { ownerId:"owner:b", scopeLevel:"session", sessionId:"session-b" }), error => error.code === "memory_not_found");
    const widened = store.updateMemoryScope(entry.id, { ownerId:"owner:a", scopeLevel:"user_global", approved:true });
    assert.equal(widened.scopeLevel, "user_global");
    assert.equal(widened.reviewState, "candidate");
    assert.equal(widened.authorityDecisionId, null);
    store.reviewMemory(entry.id, "reviewed", { durablePromotion:true, decisionClass:"A2", principalId:"owner:a", scope:"user_global" });
    store.promoteMemory(entry.id, { replayPassed:true });
    assert.throws(() => store.updateMemoryScope(entry.id, { ownerId:"owner:a", scopeLevel:"session", sessionId:"session-a" }), error => error.code === "memory_scope_change_blocked");
  } finally { store.close(); fs.rmSync(dir, { recursive:true, force:true }); }
});

test("MCT-R4 context influence surface and rollback are isolated by owner", async () => {
  const dir = stateDir(); const store = new StateStore(dir); let runtime = null; let storeOpen = true;
  try {
    const promote = (ownerId, suffix) => {
      const memory = store.addMemoryCandidate({ id:`mem_r4_owner_${suffix}`, text:`${suffix} 전용 원칙`, source:"owner", traceRef:`trace:r4-owner-${suffix}`, sessionId:`session-${suffix}`, userId:ownerId, scopeLevel:"session" });
      store.reviewMemory(memory.id, "reviewed", { durablePromotion:true, decisionClass:"A2", principalId:ownerId, scope:"session" });
      return store.promoteMemory(memory.id, { replayPassed:true });
    };
    const ownerA = promote("owner:a", "a");
    const ownerB = promote("owner:b", "b");
    assert.deepEqual(store.listContextInfluences("owner:a").map(item => item.id), [ownerA.id]);
    assert.deepEqual(store.listContextInfluences("owner:b").map(item => item.id), [ownerB.id]);
    assert.equal(store.rollbackContextInfluence(ownerB.id, "cross_owner_attempt", "owner:a").rolledBack, false);
    assert.equal(store.listContextInfluences("owner:b")[0].state, "applied");
    store.close(); storeOpen = false;
    runtime = await new NativeRuntime({ stateDir:dir }).start();
    assert.deepEqual(runtime.contextInfluenceStatus("owner:a").entries.map(item => item.id), [ownerA.id]);
    assert.equal((await runtime.rollbackContextInfluenceDurable(ownerB.id, "cross_owner_runtime_attempt", "owner:a")).rolledBack, false);
    assert.equal(runtime.contextInfluenceStatus("owner:b").entries[0].state, "applied");
    assert.equal((await runtime.rollbackContextInfluenceDurable(ownerB.id, "owner_requested", "owner:b")).rolledBack, true);
  } finally { if (runtime) await runtime.stop(); else if (storeOpen) store.close(); fs.rmSync(dir, { recursive:true, force:true }); }
});

test("MCT-R4 growth projection stays user-safe through replay, apply, and verified rollback", async () => {
  const dir = stateDir(); const runtime = await new NativeRuntime({ stateDir: dir }).start();
  try {
    const input = proposalInput({ ownerId:undefined }); delete input.ownerId; delete input.now;
    const proposed = await runtime.proposeGrowth("owner:a", input);
    let surface = await runtime.growthSurfaceStatus("owner:a");
    assert.equal(surface.items[0].state, "checking");
    const forbidden = ["diagnosis", "proposedChange", "metrics", "observations", "traceRef"];
    for (const key of forbidden) assert.equal(JSON.stringify(surface).includes(key), false);
    const replayed = await runtime.replayGrowth("owner:a", proposed.proposal.id);
    surface = await runtime.growthSurfaceStatus("owner:a");
    assert.equal(surface.items[0].state, "ready_for_approval");
    await runtime.reviewGrowth("owner:a", proposed.proposal.id, true);
    const applied = await runtime.applyGrowth("owner:a", proposed.proposal.id, replayed.replayResult.id, 60_000);
    surface = await runtime.growthSurfaceStatus("owner:a");
    assert.equal(surface.items[0].state, "observing");
    const rolledBack = await runtime.rollbackGrowth("owner:a", applied.mutation.id, "user_requested_from_surface");
    assert.equal(rolledBack.rollbackReceipt.verified, true);
    surface = await runtime.growthSurfaceStatus("owner:a");
    assert.equal(surface.items[0].state, "rolled_back");
    assert.equal(surface.items[0].rollbackVerified, true);
    for (const event of [proposed.surface, replayed.surface, applied.surface, rolledBack.surface]) {
      assert.equal(typeof event.digest, "string");
      const replay = await runtime.writer.call("replaySurfaceEvents", { principalId:"owner:a", turnId:event.turnId, afterSequence:0, limit:10 });
      assert.equal(replay.events.some(item => item.eventId === event.eventId), true);
    }
  } finally { await runtime.stop(); fs.rmSync(dir, { recursive:true, force:true }); }
});

test("MCT-R4 growth surface reconciles an expired canary without a separate maintenance action", async () => {
  const dir = stateDir(); const runtime = await new NativeRuntime({ stateDir: dir }).start();
  try {
    const input = proposalInput({ ownerId:undefined }); delete input.ownerId; delete input.now;
    const proposed = await runtime.proposeGrowth("owner:ttl", input);
    const replayed = await runtime.replayGrowth("owner:ttl", proposed.proposal.id);
    await runtime.reviewGrowth("owner:ttl", proposed.proposal.id, true);
    const applied = await runtime.applyGrowth("owner:ttl", proposed.proposal.id, replayed.replayResult.id, 1);
    await new Promise(resolve => setTimeout(resolve, Math.max(10, applied.mutation.expiresAt - Date.now() + 5)));
    const surface = await runtime.growthSurfaceStatus("owner:ttl");
    assert.equal(surface.items[0].state, "rolled_back");
    assert.equal(surface.items[0].rollbackVerified, true);
    assert.equal(runtime.activeGrowthMutations.some(item => item.id === applied.mutation.id), false);
  } finally { await runtime.stop(); fs.rmSync(dir, { recursive:true, force:true }); }
});

test("MCT-R4 surface copy keeps internals out of the default user document", () => {
  const html = fs.readFileSync(new URL("../src/ui/index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../src/ui/app.js", import.meta.url), "utf8");
  for (const id of ["answer-provenance", "growth-panel-list", "memory-scope-dialog", "growth-approval-dialog"]) assert.match(html, new RegExp(`id=\\"${id}\\"`));
  assert.match(app, /기억 \$\{escape\(item\.provenance\.usedCount\)\}개 참고/);
  assert.match(app, /현재 요청보다 우선하지 않습니다/);
  assert.match(app, /proposal\.status === "not_supported"\) return null/);
  assert.doesNotMatch(html, />[^<]*(?:raw receipt|stack trace|responseDocumentId|replayResultId)[^<]*</i);
});

test("MCT-R4 HTTP surface enforces local approval and returns only public growth fields", async () => {
  const dir = stateDir(); const runtime = await new NativeRuntime({ stateDir:dir }).start();
  const { server } = createHttpServer(runtime, { port:0 });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const dashboard = await fetch(`${base}/`); const cookie = dashboard.headers.get("set-cookie");
    const headers = { cookie, origin:base, "content-type":"application/json" };
    const sessionId = "40408874-b79c-45fb-82e4-3f5c81451e1e";
    await fetch(`${base}/v1/os-turns`, { method:"POST", headers, body:JSON.stringify({ requestId:"r4-http-seed", sessionId, input:"이 대화에서만 기억해줘" }) });
    const candidate = (await fetch(`${base}/v1/memory-wiki`, { headers:{ cookie } }).then(response => response.json())).entries[0];
    const blocked = await fetch(`${base}/v1/memory-wiki/${candidate.id}/scope`, { method:"PATCH", headers, body:JSON.stringify({ scopeLevel:"user_global" }) });
    assert.equal(blocked.status, 409);
    assert.equal((await blocked.json()).code, "memory_scope_approval_required");
    const widened = await fetch(`${base}/v1/memory-wiki/${candidate.id}/scope`, { method:"PATCH", headers, body:JSON.stringify({ scopeLevel:"user_global", approved:true }) });
    assert.equal(widened.status, 200);
    assert.equal((await widened.json()).scopeLevel, "user_global");
    const input = proposalInput({ ownerId:undefined }); delete input.ownerId; delete input.now;
    const growth = await fetch(`${base}/v1/growth/proposals`, { method:"POST", headers, body:JSON.stringify(input) });
    assert.equal(growth.status, 201);
    const surface = await fetch(`${base}/v1/growth/surface`, { headers:{ cookie } }).then(response => response.json());
    assert.deepEqual(Object.keys(surface.items[0]).sort(), ["expiresAt", "mutationId", "proposalId", "proposalStatus", "reason", "replayPassed", "replayResultId", "rollbackVerified", "scope", "state", "title"]);
  } finally { await new Promise(resolve => server.close(resolve)); await runtime.stop(); fs.rmSync(dir, { recursive:true, force:true }); }
});
