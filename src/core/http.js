import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { asPublicError, RuntimeError } from "./errors.js";
import { PRODUCT_IDENTITY, schemaName } from "./product-identity.js";

function bearer(request) {
  const value = request.headers.authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7) : null;
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > 64 * 1024) throw new RuntimeError("payload_too_large", "Request exceeds 64 KiB", 413);
  }
  if (!body) return {};
  try { return JSON.parse(body); } catch { throw new RuntimeError("invalid_json", "Request body must be valid JSON", 400); }
}

function connectionRequest(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RuntimeError("protected_connection_invalid_request", "A connection method is required", 400);
  }
  const fields = Object.keys(body);
  if (fields.length !== 1 || fields[0] !== "authMethod" || typeof body.authMethod !== "string") {
    throw new RuntimeError("protected_connection_secret_forbidden", "Connection secrets must stay inside the GPAO-T3 secure connection boundary", 400);
  }
  return { authMethod: body.authMethod };
}

function send(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
}

function isLoopbackHost(host) { return host === "127.0.0.1" || host === "::1" || host === "localhost"; }

function cookies(request) {
  return Object.fromEntries(String(request.headers.cookie || "").split(";").map(part => part.trim().split("=")).filter(parts => parts.length === 2));
}

function serveFile(response, filePath, contentType) {
  const body = fs.readFileSync(filePath);
  response.writeHead(200, {
    "content-type": contentType,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    "referrer-policy": "no-referrer"
  });
  response.end(body);
}

function dashboardSessionId(value) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""))) {
    throw new RuntimeError("invalid_session", "A valid local conversation is required", 400);
  }
  return String(value);
}

function assertTrustedLocalMutation(request, session, host, port) {
  if (!session) throw new RuntimeError("unauthorized", "A local GPAO-T3 session is required", 401);
  const origin = request.headers.origin;
  const expected = `http://${request.headers.host || `${host}:${port}`}`;
  if (origin && origin !== expected) throw new RuntimeError("forbidden_origin", "This GPAO-T3 action must come from its local dashboard", 403);
}

export function createHttpServer(runtime, { host = "127.0.0.1", port = 18899 } = {}) {
  const uiDir = path.resolve(new URL("../ui/", import.meta.url).pathname);
  const vendorDir = path.resolve(new URL("../../node_modules/", import.meta.url).pathname);
  const localSessionAllowed = isLoopbackHost(host);
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${host}:${port}`);
      if (request.method === "GET" && url.pathname === "/") {
        const session = localSessionAllowed ? runtime.localSessions.issue() : null;
        if (session) response.setHeader("set-cookie", `${PRODUCT_IDENTITY.localSessionCookie}=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);
        return serveFile(response, path.join(uiDir, "index.html"), "text/html; charset=utf-8");
      }
      if (request.method === "GET" && url.pathname === "/app.js") return serveFile(response, path.join(uiDir, "app.js"), "text/javascript; charset=utf-8");
      if (request.method === "GET" && url.pathname === "/app.css") return serveFile(response, path.join(uiDir, "app.css"), "text/css; charset=utf-8");
      if (request.method === "GET" && url.pathname === "/vendor/marked.js") return serveFile(response, path.join(vendorDir, "marked", "lib", "marked.umd.js"), "text/javascript; charset=utf-8");
      if (request.method === "GET" && url.pathname === "/vendor/purify.js") return serveFile(response, path.join(vendorDir, "dompurify", "dist", "purify.min.js"), "text/javascript; charset=utf-8");
      if (request.method === "GET" && url.pathname === "/vendor/lucide.js") return serveFile(response, path.join(vendorDir, "lucide", "dist", "umd", "lucide.min.js"), "text/javascript; charset=utf-8");
      if (request.method === "GET" && url.pathname === "/assets/gpao-t3-logo.jpeg") return serveFile(response, path.join(uiDir, "assets", "gpao-t3-logo.jpeg"), "image/jpeg");
      if (request.method === "GET" && url.pathname === "/favicon.ico") {
        return serveFile(response, path.join(uiDir, "assets", "gpao-t3-logo.jpeg"), "image/jpeg");
      }
      if (request.method === "GET" && url.pathname === "/health") return send(response, 200, runtime.publicHealth());
      if (request.method === "GET" && url.pathname === "/ready") {
        const health = runtime.publicHealth();
        return send(response, health.status === "ready" ? 200 : 503, health);
      }
      const session = localSessionAllowed && ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.socket.remoteAddress)
        ? runtime.localSessions.verify(cookies(request)[PRODUCT_IDENTITY.localSessionCookie])
        : null;
      if (bearer(request) !== runtime.ownerToken && !session) throw new RuntimeError("unauthorized", "Owner authentication required", 401);
      const principalId = session?.principalId || "owner:local";
      if (request.method === "GET" && url.pathname === "/v1/doctor") return send(response, 200, await runtime.doctor(principalId));
      if (request.method === "GET" && url.pathname === "/v1/recovery") return send(response, 200, (await runtime.doctor(principalId)).recovery);
      if (request.method === "GET" && url.pathname === "/v1/providers") return send(response, 200, runtime.providerStatus());
      if (request.method === "GET" && url.pathname === "/v1/connection-center") return send(response, 200, await runtime.connectionCenterStatus());
      if (request.method === "GET" && url.pathname === "/v1/connectors") return send(response, 200, runtime.connectorStatus());
      if (request.method === "GET" && url.pathname === "/v1/connection-cells") return send(response, 200, runtime.connectionCellStatus());
      if (request.method === "GET" && url.pathname === "/v1/messenger") return send(response, 200, await runtime.messenger.status());
      if (request.method === "GET" && url.pathname === "/v1/messenger/sessions") return send(response, 200, await runtime.messenger.sessions());
      const messengerSendMatch = url.pathname.match(/^\/v1\/messenger\/sessions\/([0-9a-f-]+)\/send$/i);
      if (messengerSendMatch && request.method === "POST") {
        assertTrustedLocalMutation(request, session, host, port);
        const body = await readJson(request);
        if (body.approved !== true) throw new RuntimeError("channel_send_approval_required", "메시지 내용을 확인하고 전송을 승인해야 합니다.", 409);
        return send(response, 200, await runtime.sendMessengerSession({ principalId, sessionId: messengerSendMatch[1], text: body.text }));
      }
      if (request.method === "GET" && url.pathname === "/v1/channels") return send(response, 200, await runtime.channelConnectionStatus());
      const channelConnectionMatch = url.pathname.match(/^\/v1\/channels\/([a-z0-9.-]+)$/i);
      if (channelConnectionMatch && request.method === "POST") {
        assertTrustedLocalMutation(request, session, host, port);
        return send(response, 200, { schema: schemaName("channel_connection_update.v1"), connection: await runtime.connectChannel(channelConnectionMatch[1]) });
      }
      if (channelConnectionMatch && request.method === "DELETE") {
        assertTrustedLocalMutation(request, session, host, port);
        return send(response, 200, { schema: schemaName("channel_connection_update.v1"), connection: await runtime.disconnectChannel(channelConnectionMatch[1]) });
      }
      const channelPollMatch = url.pathname.match(/^\/v1\/channels\/([a-z0-9.-]+)\/poll$/i);
      if (channelPollMatch && request.method === "POST") {
        assertTrustedLocalMutation(request, session, host, port);
        return send(response, 200, await runtime.pollChannel(channelPollMatch[1], await readJson(request)));
      }
      if (request.method === "GET" && url.pathname === "/v1/context-influence") return send(response, 200, runtime.contextInfluenceStatus(principalId));
      const influenceRollbackMatch = url.pathname.match(/^\/v1\/context-influence\/([^/]+)\/rollback$/);
      if (request.method === "POST" && influenceRollbackMatch) {
        assertTrustedLocalMutation(request, session, host, port);
        const body = await readJson(request);
        return send(response, 200, await runtime.rollbackContextInfluenceDurable(influenceRollbackMatch[1], body.reason || "local_dashboard_requested", principalId));
      }
      if (request.method === "GET" && url.pathname === "/v1/growth/proposals") return send(response, 200, await runtime.listGrowth(principalId, { status: url.searchParams.get("status") || null, limit: Number(url.searchParams.get("limit") || 100) }));
      if (request.method === "GET" && url.pathname === "/v1/growth/surface") return send(response, 200, await runtime.growthSurfaceStatus(principalId, { limit: Number(url.searchParams.get("limit") || 100) }));
      if (request.method === "POST" && url.pathname === "/v1/growth/proposals") {
        assertTrustedLocalMutation(request, session, host, port);
        return send(response, 201, await runtime.proposeGrowth(principalId, await readJson(request)));
      }
      const growthReplayMatch = url.pathname.match(/^\/v1\/growth\/proposals\/([^/]+)\/replay$/);
      if (request.method === "POST" && growthReplayMatch) {
        assertTrustedLocalMutation(request, session, host, port);
        const body = await readJson(request);
        if ("scenarios" in body || "metrics" in body || "baseline" in body || "candidate" in body) throw new RuntimeError("growth_replay_client_metrics_forbidden", "Replay 사례와 점수는 T3의 봉인된 검증 세트에서만 생성됩니다.", 400);
        return send(response, 200, await runtime.replayGrowth(principalId, growthReplayMatch[1], body.datasetSplit || "evaluation"));
      }
      const growthReviewMatch = url.pathname.match(/^\/v1\/growth\/proposals\/([^/]+)\/review$/);
      if (request.method === "POST" && growthReviewMatch) {
        assertTrustedLocalMutation(request, session, host, port);
        const body = await readJson(request);
        if (typeof body.approved !== "boolean") throw new RuntimeError("growth_review_required", "성장 제안의 승인 또는 거절을 선택해야 합니다.", 400);
        return send(response, 200, await runtime.reviewGrowth(principalId, growthReviewMatch[1], body.approved));
      }
      const growthApplyMatch = url.pathname.match(/^\/v1\/growth\/proposals\/([^/]+)\/apply$/);
      if (request.method === "POST" && growthApplyMatch) {
        assertTrustedLocalMutation(request, session, host, port);
        const body = await readJson(request);
        if (body.approved !== true) throw new RuntimeError("growth_application_approval_required", "제한 적용 내용을 확인하고 승인해야 합니다.", 409);
        return send(response, 200, await runtime.applyGrowth(principalId, growthApplyMatch[1], body.replayResultId, body.ttlMs));
      }
      if (request.method === "GET" && url.pathname === "/v1/growth/mutations") return send(response, 200, await runtime.listGrowthMutations(principalId, { activeOnly: url.searchParams.get("active") === "true", limit: Number(url.searchParams.get("limit") || 100) }));
      const growthRollbackMatch = url.pathname.match(/^\/v1\/growth\/mutations\/([^/]+)\/rollback$/);
      if (request.method === "POST" && growthRollbackMatch) {
        assertTrustedLocalMutation(request, session, host, port);
        const body = await readJson(request);
        if (body.approved !== true) throw new RuntimeError("growth_rollback_approval_required", "복구 실행을 확인해야 합니다.", 409);
        return send(response, 200, await runtime.rollbackGrowth(principalId, growthRollbackMatch[1], body.reason || "local_dashboard_requested"));
      }
      if (request.method === "GET" && url.pathname === "/v1/workspaces") return send(response, 200, await runtime.listWorkspaces(principalId, { includeArchived: url.searchParams.get("archived") === "true" }));
      if (request.method === "POST" && url.pathname === "/v1/workspaces") {
        assertTrustedLocalMutation(request, session, host, port);
        const body = await readJson(request); const sessionId = dashboardSessionId(body.sessionId);
        return send(response, 201, await runtime.createWorkspace({ sessionId, principalId, title: body.title || "새 대화" }));
      }
      const workspaceMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)$/);
      if (workspaceMatch && request.method === "GET") {
        const workspace = await runtime.getWorkspace(principalId, dashboardSessionId(workspaceMatch[1]));
        return workspace ? send(response, 200, workspace) : send(response, 404, { code: "not_found" });
      }
      if (workspaceMatch && request.method === "PATCH") {
        assertTrustedLocalMutation(request, session, host, port);
        return send(response, 200, await runtime.updateWorkspace(principalId, dashboardSessionId(workspaceMatch[1]), await readJson(request)));
      }
      if (workspaceMatch && request.method === "DELETE") {
        assertTrustedLocalMutation(request, session, host, port);
        return send(response, 200, await runtime.deleteWorkspace(principalId, dashboardSessionId(workspaceMatch[1])));
      }
      if (request.method === "GET" && url.pathname === "/v1/memory-wiki") return send(response, 200, await runtime.listMemoryWiki({ sessionId: url.searchParams.get("sessionId") || null, projectId: url.searchParams.get("projectId") || null, userId: principalId, channelId: url.searchParams.get("channelId") || null, limit: Math.min(100, Number(url.searchParams.get("limit") || 100)) }));
      const memoryReviewMatch = url.pathname.match(/^\/v1\/memory-wiki\/([^/]+)\/review$/);
      if (request.method === "POST" && memoryReviewMatch) {
        assertTrustedLocalMutation(request, session, host, port);
        const body = await readJson(request);
        return send(response, 200, await runtime.reviewMemory(memoryReviewMatch[1], body.decision, { durablePromotion: body.durablePromotion === true, decisionClass: body.durablePromotion === true ? "A2" : "A0", principalId }));
      }
      const memoryScopeMatch = url.pathname.match(/^\/v1\/memory-wiki\/([^/]+)\/scope$/);
      if (request.method === "PATCH" && memoryScopeMatch) {
        assertTrustedLocalMutation(request, session, host, port);
        const body = await readJson(request);
        return send(response, 200, await runtime.updateMemoryScope(memoryScopeMatch[1], { ownerId: principalId, scopeLevel: body.scopeLevel, sessionId: body.sessionId || null, projectId: body.projectId || null, approved: body.approved === true }));
      }
      if (request.method === "POST" && url.pathname === "/v1/connection-cells/plan") {
        const body = await readJson(request);
        return send(response, 200, runtime.planConnectionCell(body));
      }
      if (request.method === "POST" && url.pathname === "/v1/connection-proposals") {
        const body = await readJson(request);
        return send(response, 200, runtime.proposeConnectionSetup(body.input));
      }
      const connectorMatch = url.pathname.match(/^\/v1\/connectors\/([a-z0-9.-]+)\/enabled$/i);
      if (request.method === "PUT" && connectorMatch) {
        assertTrustedLocalMutation(request, session, host, port);
        const body = await readJson(request);
        return send(response, 200, await runtime.setConnectorEnabled(connectorMatch[1], body.enabled));
      }
      if (request.method === "PUT" && url.pathname === "/v1/model-selection/default") {
        assertTrustedLocalMutation(request, session, host, port);
        const body = await readJson(request);
        return send(response, 200, { schema: schemaName("model_selection.v1"), selection: await runtime.setDefaultModelSelection(body.selection || body) });
      }
      const connectionMatch = url.pathname.match(/^\/v1\/connections\/([a-z0-9-]+)(?:\/(refresh))?$/i);
      if (connectionMatch) {
        const [, providerId, action] = connectionMatch;
        if (request.method === "POST" && !action) {
          assertTrustedLocalMutation(request, session, host, port);
          const body = connectionRequest(await readJson(request));
          return send(response, 200, { schema: schemaName("connection_update.v1"), connection: await runtime.beginProviderConnection({ providerId, authMethod: body.authMethod }) });
        }
        if (request.method === "POST" && action === "refresh") {
          assertTrustedLocalMutation(request, session, host, port);
          return send(response, 200, { schema: schemaName("connection_update.v1"), connection: await runtime.refreshProviderConnection(providerId) });
        }
        if (request.method === "DELETE" && !action) {
          assertTrustedLocalMutation(request, session, host, port);
          return send(response, 200, { schema: schemaName("connection_update.v1"), connection: await runtime.disconnectProvider(providerId) });
        }
      }
      if (request.method === "GET" && url.pathname === "/v1/sockets") return send(response, 200, runtime.socketRegistry.snapshot());
      if (request.method === "GET" && url.pathname === "/v1/tools") return send(response, 200, runtime.tools.snapshot());
      const toolEnabledMatch = url.pathname.match(/^\/v1\/tools\/([^/]+)\/enabled$/);
      if (request.method === "PUT" && toolEnabledMatch) {
        assertTrustedLocalMutation(request, session, host, port);
        const body = await readJson(request);
        return send(response, 200, runtime.setToolEnabled(decodeURIComponent(toolEnabledMatch[1]), body.enabled === true));
      }
      if (request.method === "POST" && url.pathname === "/v1/tool-invocations") {
        const body = await readJson(request);
        const invocation = await runtime.beginToolInvocation({ principalId, sessionId: body.sessionId || null, requestId: body.requestId, toolId: body.toolId, action: body.action, args: body.args || {} });
        return send(response, invocation.status === "awaiting_approval" ? 202 : 200, invocation);
      }
      const toolInvocationMatch = url.pathname.match(/^\/v1\/tool-invocations\/([^/]+)$/);
      if (request.method === "GET" && toolInvocationMatch) {
        const invocation = await runtime.getToolInvocation({ principalId, invocationId: toolInvocationMatch[1] });
        return invocation ? send(response, 200, invocation) : send(response, 404, { code: "not_found" });
      }
      const toolApprovalMatch = url.pathname.match(/^\/v1\/tool-invocations\/([^/]+)\/approve$/);
      if (request.method === "POST" && toolApprovalMatch) {
        assertTrustedLocalMutation(request, session, host, port);
        const body = await readJson(request);
        if (body.approved !== true) throw new RuntimeError("tool_review_required", "도구 사용 내용을 확인하고 승인해야 합니다.", 409);
        return send(response, 200, await runtime.approveToolInvocation({ principalId, invocationId: toolApprovalMatch[1], approvalId: `local_dashboard:${toolApprovalMatch[1]}` }));
      }
      const toolCancelMatch = url.pathname.match(/^\/v1\/tool-invocations\/([^/]+)\/cancel$/);
      if (request.method === "POST" && toolCancelMatch) {
        assertTrustedLocalMutation(request, session, host, port);
        return send(response, 200, await runtime.cancelToolInvocation({ principalId, invocationId: toolCancelMatch[1] }));
      }
      if (request.method === "GET" && url.pathname === "/v1/capabilities") return send(response, 200, runtime.capabilities.search({ query: url.searchParams.get("query") || "", group: url.searchParams.get("group") || null, kind: url.searchParams.get("kind") || null, limit: Number(url.searchParams.get("limit") || 20) }));
      const capabilityMatch = url.pathname.match(/^\/v1\/capabilities\/([^/]+)$/);
      if (request.method === "GET" && capabilityMatch) {
        const capability = runtime.capabilities.describe(capabilityMatch[1]);
        return capability ? send(response, 200, capability) : send(response, 404, { code: "not_found" });
      }
      const providerMatch = url.pathname.match(/^\/v1\/providers\/([^/]+)$/);
      if (request.method === "GET" && providerMatch) {
        const provider = runtime.providerStatus().providers.find(entry => entry.id === providerMatch[1]);
        return provider ? send(response, 200, provider) : send(response, 404, { code: "not_found" });
      }
      if (request.method === "POST" && url.pathname === "/v1/turns") {
        const body = await readJson(request);
        return send(response, 202, await runtime.submitTurn({ principalId, requestId: body.requestId, payload: body.payload || {} }));
      }
      if (request.method === "POST" && url.pathname === "/v1/os-turns") {
        const body = await readJson(request);
        const sessionId = dashboardSessionId(body.sessionId);
        const authority = {
          ...(body.authority || {}),
          modelSelection: body.modelSelection || body.authority?.modelSelection || {}
        };
        const turn = await runtime.runOsTurn({
          principalId: `${principalId}:conversation:${sessionId}`,
          sessionId,
          requestId: body.requestId,
          input: body.input,
          activeGoal: body.activeGoal || null,
          authority
        });
        return send(response, turn.turn?.status === "succeeded" ? 200 : 409, turn);
      }
      if (request.method === "POST" && url.pathname === "/v2/os-turns") {
        assertTrustedLocalMutation(request, session, host, port);
        const body = await readJson(request);
        const sessionId = dashboardSessionId(body.sessionId);
        const authority = { ...(body.authority || {}), modelSelection: body.modelSelection || body.authority?.modelSelection || {} };
        return send(response, 202, await runtime.startOsTurnV2({ principalId, sessionId, requestId: body.requestId, input: body.input, activeGoal: body.activeGoal || null, authority }));
      }
      const osTurnV2Match = url.pathname.match(/^\/v2\/os-turns\/(os_[0-9a-f-]+)$/i);
      if (request.method === "GET" && osTurnV2Match) {
        const status = await runtime.getOsTurnV2(principalId, osTurnV2Match[1]);
        return status ? send(response, 200, status) : send(response, 404, { code: "not_found" });
      }
      const osTurnV2EventsMatch = url.pathname.match(/^\/v2\/os-turns\/(os_[0-9a-f-]+)\/events$/i);
      if (request.method === "GET" && osTurnV2EventsMatch) {
        const status = await runtime.getOsTurnV2(principalId, osTurnV2EventsMatch[1]);
        if (!status) return send(response, 404, { code: "not_found" });
        response.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache", connection: "keep-alive" });
        const subscribed = await runtime.subscribeOsTurnV2(principalId, osTurnV2EventsMatch[1], request.headers["last-event-id"] || url.searchParams.get("cursor") || undefined, response);
        if (!subscribed && !response.writableEnded) response.end();
        return;
      }
      const osTurnV2CancelMatch = url.pathname.match(/^\/v2\/os-turns\/(os_[0-9a-f-]+)\/cancel$/i);
      if (request.method === "POST" && osTurnV2CancelMatch) {
        assertTrustedLocalMutation(request, session, host, port);
        const cancellation = await runtime.cancelOsTurnV2(principalId, osTurnV2CancelMatch[1]);
        return cancellation ? send(response, 200, cancellation) : send(response, 404, { code: "not_found" });
      }
      const turnMatch = url.pathname.match(/^\/v1\/turns\/([^/]+)$/);
      if (request.method === "GET" && turnMatch) {
        const turn = await runtime.getTurnControl(principalId, turnMatch[1]);
        return turn ? send(response, 200, turn) : send(response, 404, { code: "not_found" });
      }
      const eventMatch = url.pathname.match(/^\/v1\/turns\/([^/]+)\/events$/);
      if (request.method === "GET" && eventMatch) {
        const rawLimit = url.searchParams.get("limit");
        const limit = rawLimit === null ? undefined : Number(rawLimit);
        const replay = await runtime.replayTurnEvents({
          principalId,
          commandId: eventMatch[1],
          cursor: url.searchParams.get("cursor") || undefined,
          limit
        });
        return replay ? send(response, 200, replay) : send(response, 404, { code: "not_found" });
      }
      const telemetryMatch = url.pathname.match(/^\/v1\/turns\/([^/]+)\/telemetry$/);
      if (request.method === "GET" && telemetryMatch) {
        const telemetry = await runtime.getTelemetry(principalId, telemetryMatch[1]);
        return telemetry ? send(response, 200, telemetry) : send(response, 404, { code: "not_found" });
      }
      const cancelMatch = url.pathname.match(/^\/v1\/turns\/([^/]+)\/cancel$/);
      if (request.method === "POST" && cancelMatch) {
        const result = await runtime.cancelTurn({ principalId, commandId: cancelMatch[1] });
        return result ? send(response, 200, result) : send(response, 404, { code: "not_found" });
      }
      const progressMatch = url.pathname.match(/^\/v1\/progress\/([^/]+)$/);
      if (request.method === "GET" && progressMatch) {
        if (!await runtime.getProgress(principalId, progressMatch[1])) return send(response, 404, { code: "not_found" });
        response.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache", connection: "keep-alive" });
        await runtime.subscribeProgress(principalId, progressMatch[1], response);
        return;
      }
      return send(response, 404, { code: "not_found" });
    } catch (error) {
      const publicError = asPublicError(error);
      send(response, publicError.status, publicError);
    }
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  return { server, host, port };
}
