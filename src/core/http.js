import http from "node:http";
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

export function createHttpServer(runtime, { host = "127.0.0.1", port = 18899 } = {}) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${host}:${port}`);
      if (request.method === "GET" && (url.pathname === "/health" || url.pathname === "/ready")) {
        return send(response, 200, runtime.health());
      }
      if (bearer(request) !== runtime.ownerToken) throw new RuntimeError("unauthorized", "Owner authentication required", 401);
      const principalId = "owner:local";
      if (request.method === "GET" && url.pathname === "/v1/doctor") return send(response, 200, runtime.doctor());
      if (request.method === "POST" && url.pathname === "/v1/turns") {
        const body = await readJson(request);
        return send(response, 202, runtime.submitTurn({ principalId, requestId: body.requestId, payload: body.payload || {} }));
      }
      const turnMatch = url.pathname.match(/^\/v1\/turns\/([^/]+)$/);
      if (request.method === "GET" && turnMatch) {
        const turn = runtime.getTurn(principalId, turnMatch[1]);
        return turn ? send(response, 200, turn) : send(response, 404, { code: "not_found" });
      }
      const progressMatch = url.pathname.match(/^\/v1\/progress\/([^/]+)$/);
      if (request.method === "GET" && progressMatch) {
        if (!runtime.getProgress(principalId, progressMatch[1])) return send(response, 404, { code: "not_found" });
        response.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache", connection: "keep-alive" });
        runtime.subscribeProgress(principalId, progressMatch[1], response);
        return;
      }
      return send(response, 404, { code: "not_found" });
    } catch (error) {
      const publicError = asPublicError(error);
      send(response, publicError.status, publicError);
    }
  });
  return { server, host, port };
}
