import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createFoundationToolSuite } from "../src/core/foundation-tool-suite.js";
import { createToolCall, createToolPermit } from "../src/core/tool-permit.js";
import { WebAccess } from "../src/core/tools/web-access.js";
import { BrowserWorkspace } from "../src/core/tools/browser-workspace.js";

const secret = "browser-qualification-secret";
let sequence = 0;
async function invoke(registry, toolId, action, args = {}) {
  sequence += 1;
  const call = createToolCall({ taskPacketId: `task_${sequence}`, commandId: `command_${sequence}`, principalId: "browser-qualifier", generation: 1, toolId, action, args, idempotencyKey: `key_${sequence}` });
  const manifest = registry.describe(toolId);
  const permit = createToolPermit(secret, call, { effect: manifest.effect, approvalId: manifest.approval === "explicit" ? `approval_${sequence}` : null });
  return registry.execute({ toolId, call, args, permit });
}
const runtime = { publicHealth: () => ({ status: "ready" }), socketRegistry: { snapshot: () => ({ sockets: [] }) }, capabilities: { search: () => ({ capabilities: [] }), describe: () => null }, messenger: { status: async () => ({ channels: [] }) }, memory: { search: () => ({ results: [] }) }, contextInfluenceStatus: () => ({ activeCount: 0 }), rollbackContextInfluence: () => ({ rolledBack: false }), getTurn: async () => null };
const root = await fs.mkdtemp(path.join(os.tmpdir(), "gpao-t3-browser-"));
const server = http.createServer((_request, response) => response.end("<!doctype html><title>T3 Test</title><button id='go'>Before</button><script>go.onclick=()=>go.textContent='After'</script>"));
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const registry = createFoundationToolSuite({ permitSecret: secret, runtime, stateDir: root, workspaceRoots: { test: root }, web: new WebAccess({ allowLocal: true }), browser: new BrowserWorkspace({ allowLocal: true, evidenceDir: path.join(root, "evidence") }) });
try {
  assert.match((await invoke(registry, "web.access", "fetch", { url })).result.text, /Before/);
  const opened = await invoke(registry, "browser.read", "open", {}); const sessionId = opened.result.sessionId;
  await invoke(registry, "browser.read", "navigate", { sessionId, url });
  assert.match((await invoke(registry, "browser.read", "snapshot", { sessionId })).result.text, /Before/);
  await invoke(registry, "browser.action", "click", { sessionId, selector: "#go" });
  assert.match((await invoke(registry, "browser.read", "snapshot", { sessionId })).result.text, /After/);
  const evidence = await invoke(registry, "browser.read", "screenshot", { sessionId }); assert.ok(evidence.result.bytes > 0);
  await invoke(registry, "browser.read", "close", { sessionId });
  console.log(JSON.stringify({ schema: "gpao_t3.wp7_browser_qualification.v1", verdict: "pass", web: true, chrome: true, actionApproval: true, evidenceBytes: evidence.result.bytes }, null, 2));
} finally { await registry.stop(); await new Promise(resolve => server.close(resolve)); }
