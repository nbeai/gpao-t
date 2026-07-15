import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import { createFoundationToolSuite } from "../src/core/foundation-tool-suite.js";
import { createToolCall, createToolPermit } from "../src/core/tool-permit.js";
import { McpManager } from "../src/core/tools/mcp-manager.js";
import { LocalAutomationScheduler } from "../src/core/tools/automation-scheduler.js";

const secret = "foundation-tool-suite-test-secret";
let sequence = 0;

async function invoke(registry, toolId, action, args = {}) {
  sequence += 1;
  const call = createToolCall({ taskPacketId: `task_${sequence}`, commandId: `command_${sequence}`, principalId: "owner:test", generation: 1, toolId, action, args, idempotencyKey: `key_${sequence}` });
  const manifest = registry.describe(toolId);
  const permit = createToolPermit(secret, call, { effect: manifest.effect, approvalId: manifest.approval === "explicit" ? `approval_${sequence}` : null });
  return registry.execute({ toolId, call, args, permit });
}

function testRuntime() {
  return {
    publicHealth: () => ({ status: "ready" }), socketRegistry: { snapshot: () => ({ sockets: [{ id: "local" }] }) },
    capabilities: { search: args => ({ capabilities: [{ id: "foundation.runtime" }], args }), describe: id => ({ id }) },
    messenger: { status: async () => ({ channels: [] }) },
    memory: { search: query => ({ results: [{ text: query }] }) },
    contextInfluenceStatus: () => ({ activeCount: 0 }), rollbackContextInfluence: id => ({ rolledBack: true, id }),
    getTurn: async (_principalId, commandId) => ({ commandId })
  };
}

test("foundation suite exposes operational coverage for all eleven capability groups", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "gpao-t3-tools-"));
  const registry = createFoundationToolSuite({ permitSecret: secret, runtime: testRuntime(), stateDir: root, workspaceRoots: { test: root } });
  try {
    const snapshot = registry.snapshot();
    const capabilityText = snapshot.tools.flatMap(tool => tool.capabilities).join(" ");
    for (const group of ["runtime", "files", "web", "browser_ui", "messaging_channels", "sessions_agents", "automation", "gateway_devices", "memory_context", "media", "tool_search_plugins_mcp"]) assert.match(capabilityText, new RegExp(group));
    assert.equal(snapshot.tools.length, 19);
  } finally { await registry.stop(); }
});

test("file tools write, inspect, edit, and restore through rollback receipts", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "gpao-t3-files-"));
  const registry = createFoundationToolSuite({ permitSecret: secret, runtime: testRuntime(), stateDir: root, workspaceRoots: { test: root } });
  try {
    const written = await invoke(registry, "files.mutate", "write", { rootId: "test", path: "note.txt", text: "alpha" });
    assert.equal((await invoke(registry, "files.inspect", "read", { rootId: "test", path: "note.txt" })).result.text, "alpha");
    const edited = await invoke(registry, "files.mutate", "edit", { rootId: "test", path: "note.txt", oldText: "alpha", newText: "beta" });
    assert.equal((await fs.readFile(path.join(root, "note.txt"), "utf8")), "beta");
    await invoke(registry, "files.mutate", "rollback", { rollbackId: edited.result.rollbackId });
    assert.equal((await fs.readFile(path.join(root, "note.txt"), "utf8")), "alpha");
    await invoke(registry, "files.mutate", "rollback", { rollbackId: written.result.rollbackId });
    await assert.rejects(fs.stat(path.join(root, "note.txt")));
  } finally { await registry.stop(); }
});

test("media, automation, and official MCP stdio execution are real and bounded", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "gpao-t3-mixed-tools-"));
  await sharp({ create: { width: 12, height: 8, channels: 3, background: "#4488cc" } }).png().toFile(path.join(root, "image.png"));
  let now = Date.parse("2026-07-15T00:00:00Z");
  const automation = new LocalAutomationScheduler({ clock: () => now });
  const mcp = new McpManager({ servers: [{ id: "echo", command: process.execPath, args: [path.resolve("test/fixtures/mcp-echo-server.mjs")], cwd: process.cwd(), env: { PATH: process.env.PATH || "" } }] });
  const registry = createFoundationToolSuite({ permitSecret: secret, runtime: testRuntime(), stateDir: root, workspaceRoots: { test: root }, automation, mcp });
  try {
    const image = await invoke(registry, "media.inspect", "image", { rootId: "test", path: "image.png" });
    assert.deepEqual({ width: image.result.width, height: image.result.height }, { width: 12, height: 8 });
    const job = await invoke(registry, "automation.manage", "schedule", { name: "test", runAt: "2026-07-15T00:01:00Z", action: { type: "local" } });
    now += 61_000;
    assert.equal((await invoke(registry, "automation.inspect", "claim_due", {})).result.jobs[0].id, job.result.id);
    assert.equal((await invoke(registry, "capabilities.search", "mcp_list", { serverId: "echo" })).result.tools[0].name, "echo");
    const echoed = await invoke(registry, "mcp.manage", "call", { serverId: "echo", name: "echo", arguments: { value: "T3" } });
    assert.equal(echoed.result.content[0].text, "T3");
  } finally { await registry.stop(); }
});
