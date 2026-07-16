import path from "node:path";
import { ToolRegistry } from "./tool-registry.js";
import { WorkspaceFiles } from "./tools/workspace-files.js";
import { WebAccess } from "./tools/web-access.js";
import { BrowserWorkspace } from "./tools/browser-workspace.js";
import { MediaInspector } from "./tools/media-inspector.js";
import { McpManager } from "./tools/mcp-manager.js";
import { LocalAutomationScheduler } from "./tools/automation-scheduler.js";
import { SafeProcessExecutor } from "./tools/process-executor.js";
import { RuntimeError } from "./errors.js";

function dispatch(target, table) {
  return async (args, context) => {
    const method = table[context.call.action];
    if (!method) throw new RuntimeError("invalid_tool_input", "지원하지 않는 도구 작업입니다.", 400);
    return method(args, context);
  };
}

function tool(id, capabilities, operations, effect, execute, options = {}) {
  return { id, capabilities, operations, effect, approval: effect === "read" ? "none" : "explicit", timeoutMs: options.timeoutMs || 15_000, execute, preflight: options.preflight || null };
}

export function createFoundationToolSuite({
  permitSecret = null, runtime = null, stateDir = process.cwd(), workspaceRoots = null,
  web = null, browser = null, files = null, media = null, mcp = null, automation = null, processes = null,
  channelAdapters = {}
} = {}) {
  const roots = workspaceRoots || { runtime: stateDir };
  const fileService = files || new WorkspaceFiles({ roots, backupDir: path.join(stateDir, "tool-rollbacks") });
  const webService = web || new WebAccess();
  const browserService = browser || new BrowserWorkspace({ evidenceDir: path.join(stateDir, "browser-evidence") });
  const mediaService = media || new MediaInspector({ files: fileService });
  const mcpService = mcp || new McpManager();
  const automationService = automation || new LocalAutomationScheduler();
  const processService = processes || new SafeProcessExecutor();

  const tools = [
    tool("local.runtime_status", ["runtime", "read_runtime_status", "compatibility_alias"], ["read", "status"], "read", async () => runtime?.publicHealth?.() || { status: "available" }),
    tool("runtime.status", ["runtime", "read_runtime_status"], ["status"], "read", async () => runtime?.publicHealth?.() || { status: "available" }),
    tool("runtime.process", ["runtime", "execute_allowlisted_process"], ["run"], "local_write", (args, context) => processService.run(args, context), { timeoutMs: 30_000 }),
    tool("files.inspect", ["files", "stat", "list", "read", "search"], ["stat", "list", "read", "search"], "read", dispatch(fileService, { stat: args => fileService.stat(args), list: args => fileService.list(args), read: args => fileService.read(args), search: args => fileService.search(args) })),
    tool("files.mutate", ["files", "write", "edit", "rollback"], ["write", "edit", "rollback"], "local_write", dispatch(fileService, { write: args => fileService.write(args), edit: args => fileService.edit(args), rollback: args => fileService.rollback(args) })),
    tool("web.access", ["web", "fetch", "search"], ["fetch", "search"], "read", dispatch(webService, { fetch: (args, context) => webService.fetch(args, context), search: (args, context) => webService.search(args, context) }), { timeoutMs: 20_000 }),
    tool("browser.read", ["browser_ui", "open", "navigate", "snapshot", "screenshot", "close"], ["open", "navigate", "snapshot", "screenshot", "close"], "read", dispatch(browserService, { open: args => browserService.open(args), navigate: args => browserService.navigate(args), snapshot: args => browserService.snapshot(args), screenshot: args => browserService.screenshot(args), close: args => browserService.close(args) }), { timeoutMs: 30_000 }),
    tool("browser.action", ["browser_ui", "click", "fill"], ["click", "fill"], "external_mutation", dispatch(browserService, { click: (args, context) => browserService.act("click", args, context), fill: (args, context) => browserService.act("fill", args, context) }), { timeoutMs: 20_000 }),
    tool("messaging.status", ["messaging_channels", "read_channel_status"], ["status"], "read", async () => runtime?.messenger?.status?.() || { state: "not_configured" }),
    tool("messaging.send", ["messaging_channels", "external_send"], ["send"], "external_send", async (args, context) => {
      const adapter = channelAdapters[String(args.channelId)];
      if (!adapter) throw new RuntimeError("tool_dependency_missing", "연결된 메신저 채널이 없습니다.", 503);
      return runtime.messenger.send(adapter, args.envelope, { authority: { externalSendApproved: true }, signal: context.signal });
    }, { timeoutMs: 30_000 }),
    tool("sessions.inspect", ["sessions_agents", "read_session_status"], ["health", "turn"], "read", dispatch(runtime, { health: async () => runtime?.publicHealth?.() || { status: "available" }, turn: args => runtime.getTurn(args.principalId, args.commandId) })),
    tool("automation.inspect", ["automation", "list_automation"], ["list", "claim_due"], "read", dispatch(automationService, { list: () => automationService.list(), claim_due: args => automationService.claimDue(args) })),
    tool("automation.manage", ["automation", "schedule", "cancel"], ["schedule", "cancel"], "local_write", dispatch(automationService, { schedule: args => automationService.schedule(args), cancel: args => automationService.cancel(args) })),
    tool("gateway.status", ["gateway_devices", "read_socket_status"], ["status"], "read", async () => runtime?.socketRegistry?.snapshot?.() || { sockets: [] }),
    tool("memory.search", ["memory_context", "search_memory", "context_status"], ["search", "context_status"], "read", dispatch(runtime, { search: (args, context) => runtime.searchMemory(args.query, { limit: args.limit, sessionId: context.call.sessionId, userId: String(context.call.principalId || "local-owner").split(":conversation:")[0] }), context_status: async (args, context) => runtime.contextInfluenceStatus(context.call.principalId) })),
    tool("memory.rollback", ["memory_context", "rollback_context"], ["rollback"], "local_write", (args, context) => runtime.rollbackContextInfluenceDurable ? runtime.rollbackContextInfluenceDurable(args.influenceId, args.reason, context.call.principalId) : runtime.rollbackContextInfluence(args.influenceId, args.reason)),
    tool("media.inspect", ["media", "image_metadata", "pdf_text", "audio_metadata"], ["image", "pdf", "audio"], "read", dispatch(mediaService, { image: args => mediaService.image(args), pdf: args => mediaService.pdf(args), audio: args => mediaService.audio(args) }), { timeoutMs: 30_000 }),
    tool("capabilities.search", ["tool_search_plugins_mcp", "search", "describe", "mcp_list", "mcp_status"], ["search", "describe", "mcp_list", "mcp_status"], "read", dispatch(runtime, { search: args => runtime.capabilities.search(args), describe: args => runtime.capabilities.describe(args.capabilityId), mcp_list: args => mcpService.list(args), mcp_status: async () => mcpService.status() }), { timeoutMs: 20_000 }),
    tool("mcp.manage", ["tool_search_plugins_mcp", "mcp_register", "mcp_call"], ["register", "call"], "external_mutation", dispatch(mcpService, { register: args => mcpService.register(args), call: (args, context) => mcpService.call(args, context) }), { timeoutMs: 30_000 })
  ];
  const registry = new ToolRegistry({ permitSecret, tools });
  registry.services = Object.freeze({ files: fileService, web: webService, browser: browserService, media: mediaService, mcp: mcpService, automation: automationService, processes: processService });
  registry.stop = async () => { await Promise.allSettled([browserService.stop(), mcpService.stop()]); };
  return registry;
}
