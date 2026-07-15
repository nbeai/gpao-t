import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { RuntimeError } from "../errors.js";

function cleanServer(input) {
  if (!input?.id || !input?.command) throw new RuntimeError("invalid_tool_input", "MCP 서버 식별자와 실행 명령이 필요합니다.", 400);
  return Object.freeze({
    id: String(input.id), command: String(input.command), args: (input.args || []).map(String),
    cwd: input.cwd ? String(input.cwd) : undefined,
    env: Object.fromEntries(Object.entries(input.env || {}).map(([key, value]) => [String(key), String(value)]))
  });
}

export class McpManager {
  constructor({ servers = [] } = {}) {
    this.servers = new Map(servers.map(server => { const clean = cleanServer(server); return [clean.id, clean]; }));
    this.connections = new Map();
  }

  register(input) {
    const server = cleanServer(input);
    if (this.servers.has(server.id)) throw new RuntimeError("tool_conflict", "같은 MCP 서버가 이미 등록되어 있습니다.", 409);
    this.servers.set(server.id, server);
    return { serverId: server.id, state: "registered" };
  }

  async connect(serverId) {
    const id = String(serverId);
    if (this.connections.has(id)) return this.connections.get(id);
    const server = this.servers.get(id);
    if (!server) throw new RuntimeError("tool_target_not_found", "MCP 서버를 찾을 수 없습니다.", 404);
    const client = new Client({ name: "gpao-t3", version: "0.2.2" }, { capabilities: {} });
    const transport = new StdioClientTransport({ command: server.command, args: server.args, cwd: server.cwd, env: server.env, stderr: "pipe" });
    try { await client.connect(transport); }
    catch { await transport.close().catch(() => {}); throw new RuntimeError("tool_external_unavailable", "MCP 서버를 시작하지 못했습니다.", 503); }
    const connection = { client, transport, serverId: id };
    this.connections.set(id, connection);
    return connection;
  }

  async list(args = {}) {
    const connection = await this.connect(args.serverId);
    const result = await connection.client.listTools();
    return { serverId: connection.serverId, tools: result.tools.map(tool => ({ name: tool.name, description: tool.description || "", inputSchema: tool.inputSchema, annotations: tool.annotations || null })) };
  }

  async call(args, { signal } = {}) {
    const name = String(args.name || "");
    if (!name) throw new RuntimeError("invalid_tool_input", "MCP 도구 이름이 필요합니다.", 400);
    const connection = await this.connect(args.serverId);
    try {
      const result = await connection.client.callTool({ name, arguments: args.arguments || {} }, undefined, { signal });
      if (result.isError) throw new RuntimeError("tool_execution_failed", "MCP 도구가 오류를 반환했습니다.", 502);
      return { serverId: connection.serverId, name, content: result.content || [], structuredContent: result.structuredContent || null };
    } catch (error) {
      if (error instanceof RuntimeError) throw error;
      throw new RuntimeError("tool_external_unavailable", "MCP 도구 호출을 완료하지 못했습니다.", 503);
    }
  }

  status() { return { servers: [...this.servers.keys()].map(id => ({ id, connected: this.connections.has(id) })) }; }

  async stop() {
    const connections = [...this.connections.values()];
    this.connections.clear();
    await Promise.allSettled(connections.map(connection => connection.transport.close()));
  }
}
