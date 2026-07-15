import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NativeRuntime } from "../src/core/runtime.js";
import { prepareTurnToolFlow } from "../src/core/turn-tool-orchestrator.js";
import { canonicalDigest } from "../src/core/canonical-json.js";
import { createSurfaceEvent } from "../src/core/surface-event.js";
import { StateStore } from "../src/core/store.js";

function stateDir() { return fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-wp8r-async-")); }
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(timer); reject(signal.reason); }, { once:true });
  });
}
async function eventually(predicate, timeout = 4_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await predicate();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error("wp8r async turn timed out");
}

function streamingAdapter({ delayMs = 5, chunks = ["첫째", " 둘째"] } = {}) {
  return {
    async invoke(plan) {
      return { status:"succeeded", runId:plan.runId, providerId:plan.providerId, modelId:plan.modelId, result:{ text:"첫째 둘째" }, receipt:{ schema:"gpao_t3.provider_receipt.v1", runId:plan.runId, generation:plan.generation, terminal:true } };
    },
    async *stream(plan, { signal } = {}) {
      let text = "";
      for (const [index, chunk] of chunks.entries()) {
        await wait(delayMs, signal);
        text += chunk;
        yield { runId:plan.runId, generation:plan.generation, seq:index + 1, type:"delta", text:chunk, terminal:false };
      }
      yield { runId:plan.runId, generation:plan.generation, seq:chunks.length + 1, type:"terminal", text, terminal:true, receipt:{ schema:"gpao_t3.provider_receipt.v1", runId:plan.runId, generation:plan.generation, terminal:true } };
    }
  };
}

test("v2 OS turn persists ordered deltas, canonical completion, and restart replay", async () => {
  const dir = stateDir();
  let runtime = await new NativeRuntime({ stateDir:dir, providerAdapter:streamingAdapter() }).start();
  const accepted = await runtime.startOsTurnV2({ principalId:"owner:a", sessionId:"session-a", requestId:"request-a", input:"길게 답해줘" });
  const duplicate = await runtime.startOsTurnV2({ principalId:"owner:a", sessionId:"session-a", requestId:"request-a", input:"길게 답해줘" });
  assert.equal(duplicate.turnId, accepted.turnId);
  assert.equal(duplicate.deduplicated, true);
  const completed = await eventually(async () => { const status = await runtime.getOsTurnV2("owner:a", accepted.turnId); return status?.terminal ? status : null; });
  assert.equal(completed.status, "completed");
  assert.equal(completed.responseDocument.blocks[0].text, "첫째 둘째");
  const replay = await runtime.replayOsTurnV2("owner:a", accepted.turnId);
  assert.deepEqual(replay.events.map(event => event.type), ["turn.accepted", "text.delta", "text.delta", "text.complete", "turn.completed"]);
  assert.deepEqual(replay.events.map(event => event.sequence), [1, 2, 3, 4, 5]);
  await runtime.stop();
  runtime = await new NativeRuntime({ stateDir:dir, providerAdapter:streamingAdapter() }).start();
  try {
    const restored = await runtime.getOsTurnV2("owner:a", accepted.turnId);
    assert.equal(restored.responseDocument.digest, completed.responseDocument.digest);
    assert.equal(restored.terminal, true);
    const durableDuplicate = await runtime.startOsTurnV2({ principalId:"owner:a", sessionId:"session-a", requestId:"request-a", input:"길게 답해줘" });
    assert.equal(durableDuplicate.turnId, accepted.turnId);
    assert.equal(durableDuplicate.deduplicated, true);
    await assert.rejects(
      runtime.startOsTurnV2({ principalId:"owner:a", sessionId:"session-a", requestId:"request-a", input:"다른 요청" }),
      error => error.code === "idempotency_conflict"
    );
  } finally { await runtime.stop(); }
});

test("runtime restart closes an unfinished surface turn with a recoverable terminal event", async () => {
  const dir = stateDir();
  const requestDigest = canonicalDigest("gpao_t3.os_turn_request.v2", { input:"끝나지 않은 작업", activeGoal:null, authority:{} });
  const accepted = createSurfaceEvent({
    turnId:"os_11111111-1111-4111-8111-111111111111", sessionId:"session-a", sequence:1,
    type:"turn.accepted", correlationId:"os_11111111-1111-4111-8111-111111111111",
    payload:{ requestId:"interrupted-a", requestDigest }
  });
  const store = new StateStore(dir);
  store.transaction(() => store.appendSurfaceEvent("owner:a", accepted));
  store.close();
  const runtime = await new NativeRuntime({ stateDir:dir, providerAdapter:streamingAdapter() }).start();
  try {
    const status = await runtime.getOsTurnV2("owner:a", accepted.turnId);
    assert.equal(status.status, "failed");
    assert.equal(status.terminal, true);
    const replay = await runtime.replayOsTurnV2("owner:a", accepted.turnId);
    assert.equal(replay.events.at(-1).payload.code, "runtime_restart");
    assert.equal(replay.events.at(-1).payload.recoveryAvailable, true);
  } finally { await runtime.stop(); }
});

test("v2 cancellation reaches the provider and emits one terminal cancellation", async () => {
  const runtime = await new NativeRuntime({ stateDir:stateDir(), providerAdapter:streamingAdapter({ delayMs:200 }) }).start();
  try {
    const accepted = await runtime.startOsTurnV2({ principalId:"owner:a", sessionId:"session-a", requestId:"cancel-a", input:"중단할 작업" });
    await eventually(async () => (await runtime.replayOsTurnV2("owner:a", accepted.turnId)).events.some(event => event.type === "turn.accepted"));
    const cancellation = await runtime.cancelOsTurnV2("owner:a", accepted.turnId);
    assert.equal(cancellation.changed, true);
    const cancelled = await eventually(async () => { const status = await runtime.getOsTurnV2("owner:a", accepted.turnId); return status?.terminal ? status : null; });
    assert.equal(cancelled.status, "cancelled");
    const events = (await runtime.replayOsTurnV2("owner:a", accepted.turnId)).events;
    assert.equal(events.filter(event => event.terminal).length, 1);
  } finally { await runtime.stop(); }
});

test("v2 status finds the canonical terminal document beyond one replay page", async () => {
  const runtime = await new NativeRuntime({ stateDir:stateDir(), providerAdapter:streamingAdapter({ delayMs:0, chunks:Array.from({ length:300 }, () => "가") }) }).start();
  try {
    const accepted = await runtime.startOsTurnV2({ principalId:"owner:a", sessionId:"session-a", requestId:"long-stream", input:"아주 긴 스트림" });
    const completed = await eventually(async () => { const status = await runtime.getOsTurnV2("owner:a", accepted.turnId); return status?.terminal ? status : null; });
    assert.equal(completed.status, "completed");
    assert.equal(completed.responseDocument.blocks[0].text.length, 300);
    const firstPage = await runtime.replayOsTurnV2("owner:a", accepted.turnId, undefined, 256);
    assert.equal(firstPage.hasMore, true);
    assert.equal(firstPage.events.length, 256);
  } finally { await runtime.stop(); }
});

test("tool surface events follow the real proposal, execution, and completion order", async () => {
  const events = [];
  const flow = await prepareTurnToolFlow({
    beginToolInvocation: async () => ({ status:"succeeded", receipt:{ result:{ results:[{ title:"근거", url:"https://example.com", snippet:"설명" }] } } })
  }, {
    principalId:"owner:a", requestId:"tool-order", input:"웹 검색: GPAO-T3",
    onEvent: async (type, payload) => events.push({ type, payload })
  });
  assert.equal(flow.state, "succeeded");
  assert.deepEqual(events.map(event => event.type), ["tool.proposed", "tool.running", "tool.completed"]);
  assert.equal(events.at(-1).payload.resultCount, 1);
});
