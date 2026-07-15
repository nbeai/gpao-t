import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { asPublicError, RuntimeError } from "./errors.js";

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
  response.writeHead(200, { "content-type": contentType, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(body);
}

function dashboardSessionId(value) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""))) {
    throw new RuntimeError("invalid_session", "A valid local conversation is required", 400);
  }
  return String(value);
}

export function createHttpServer(runtime, { host = "127.0.0.1", port = 18899 } = {}) {
  const uiDir = path.resolve(new URL("../ui/", import.meta.url).pathname);
  const localSessionAllowed = isLoopbackHost(host);
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${host}:${port}`);
      if (request.method === "GET" && url.pathname === "/") {
        const session = localSessionAllowed ? runtime.localSessions.issue() : null;
        if (session) response.setHeader("set-cookie", `gpao_t_local_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);
        return serveFile(response, path.join(uiDir, "index.html"), "text/html; charset=utf-8");
      }
      if (request.method === "GET" && url.pathname === "/app.js") return serveFile(response, path.join(uiDir, "app.js"), "text/javascript; charset=utf-8");
      if (request.method === "GET" && url.pathname === "/app.css") return serveFile(response, path.join(uiDir, "app.css"), "text/css; charset=utf-8");
      if (request.method === "GET" && url.pathname === "/health") return send(response, 200, runtime.publicHealth());
      if (request.method === "GET" && url.pathname === "/ready") {
        const health = runtime.publicHealth();
        return send(response, health.status === "ready" ? 200 : 503, health);
      }
      const session = localSessionAllowed && ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.socket.remoteAddress)
        ? runtime.localSessions.verify(cookies(request).gpao_t_local_session)
        : null;
      if (bearer(request) !== runtime.ownerToken && !session) throw new RuntimeError("unauthorized", "Owner authentication required", 401);
      const principalId = session?.principalId || "owner:local";
      if (request.method === "GET" && url.pathname === "/v1/doctor") return send(response, 200, await runtime.doctor());
      if (request.method === "GET" && url.pathname === "/v1/providers") return send(response, 200, runtime.providerStatus());
      if (request.method === "GET" && url.pathname === "/v1/sockets") return send(response, 200, runtime.socketRegistry.snapshot());
      if (request.method === "GET" && url.pathname === "/v1/tools") return send(response, 200, runtime.tools.snapshot());
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
        const turn = await runtime.runOsTurn({
          principalId: `${principalId}:conversation:${sessionId}`,
          sessionId,
          requestId: body.requestId,
          input: body.input,
          activeGoal: body.activeGoal || null,
          authority: body.authority || {}
        });
        return send(response, turn.turn?.status === "succeeded" ? 200 : 409, turn);
      }
      const turnMatch = url.pathname.match(/^\/v1\/turns\/([^/]+)$/);
      if (request.method === "GET" && turnMatch) {
        const turn = await runtime.getTurn(principalId, turnMatch[1]);
        return turn ? send(response, 200, turn) : send(response, 404, { code: "not_found" });
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
