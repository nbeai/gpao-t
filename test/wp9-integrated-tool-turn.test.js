import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { RuntimeError } from "../src/core/errors.js";
import { DeterministicProviderEmulator } from "../src/core/provider.js";
import { NativeRuntime } from "../src/core/runtime.js";
import { ToolRegistry } from "../src/core/tool-registry.js";

async function tempState() { return fs.mkdtemp(path.join(os.tmpdir(), "gpao-t3-wp9-tool-turn-")); }

class CapturingProvider extends DeterministicProviderEmulator {
  constructor() { super(); this.inputs = []; }
  async invoke(plan, options = {}) { this.inputs.push(options.input); return super.invoke(plan, options); }
}

function webRegistry(execute) {
  return new ToolRegistry({ tools: [{ id:"web.access", capabilities:["web", "search"], operations:["search"], effect:"read", approval:"none", timeoutMs:1_000, execute }] });
}

test("an explicit web request executes a durable read tool before the model turn", async () => {
  const provider = new CapturingProvider();
  const tools = webRegistry(async args => ({ query:args.query, results:[{ title:"GPAO-T3", url:"https://example.com/t3", snippet:"Foundation Runtime evidence" }] }));
  const runtime = await new NativeRuntime({ stateDir:await tempState(), providerAdapter:provider, toolRegistry:tools }).start();
  const sessionId = "de20d97d-51d8-4093-8940-22a48a5dc0dc";
  try {
    const result = await runtime.runOsTurn({ principalId:"owner:test", sessionId, requestId:"wp9-web-success", input:"웹 검색으로 GPAO-T3 Foundation Runtime을 찾아줘" });
    assert.equal(result.turn.status, "succeeded");
    assert.equal(result.toolFlow.state, "succeeded");
    assert.equal(result.toolFlow.invocation.status, "succeeded");
    assert.equal(result.toolFlow.resultCount, 1);
    assert.match(provider.inputs[0], /비신뢰 외부 자료/);
    assert.match(provider.inputs[0], /Foundation Runtime evidence/);
    const workspace = await runtime.getWorkspace("owner:test", sessionId);
    assert.equal(workspace.messages[0].text, "웹 검색으로 GPAO-T3 Foundation Runtime을 찾아줘");
    assert.equal(workspace.messages[1].role, "assistant");
  } finally { await runtime.stop(); }
});

test("a web tool failure skips the model and persists a user repair path", async () => {
  const provider = new CapturingProvider();
  const tools = webRegistry(async () => { throw new RuntimeError("tool_external_unavailable", "웹 페이지에 연결하지 못했습니다.", 503); });
  const runtime = await new NativeRuntime({ stateDir:await tempState(), providerAdapter:provider, toolRegistry:tools }).start();
  const sessionId = "21cf556a-6d87-40cc-a1e6-e3ca17964042";
  try {
    const result = await runtime.runOsTurn({ principalId:"owner:test", sessionId, requestId:"wp9-web-failure", input:"웹 검색으로 연결 실패 복구를 찾아줘" });
    assert.equal(result.replyMode, "tool_blocked");
    assert.equal(result.toolFlow.state, "blocked");
    assert.equal(provider.inputs.length, 0);
    const workspace = await runtime.getWorkspace("owner:test", sessionId);
    assert.deepEqual(workspace.messages.map(message => message.role), ["user", "assistant"]);
    assert.match(workspace.messages[1].text, /웹 검색을 마치지 못했습니다/);
    assert.match(workspace.messages[1].text, /연결 상태를 확인하세요/);
  } finally { await runtime.stop(); }
});
