import { RuntimeError } from "./errors.js";

const SOCKET_KINDS = new Set(["model", "tool", "channel", "memory", "controller", "local"]);

function publicSocket(socket) {
  return {
    id: socket.id,
    kind: socket.kind,
    capabilities: [...socket.capabilities],
    readiness: socket.readiness,
    permitRequired: socket.permitRequired,
    timeoutMs: socket.timeoutMs,
    failureClasses: [...socket.failureClasses]
  };
}

export class RuntimeSocketRegistry {
  constructor({ sockets = [] } = {}) {
    this.sockets = new Map();
    for (const socket of sockets) this.register(socket);
  }

  register(input) {
    if (!input?.id || !SOCKET_KINDS.has(input.kind)) {
      throw new RuntimeError("invalid_socket", "Socket id and supported kind are required", 400);
    }
    if (!Array.isArray(input.capabilities) || !Array.isArray(input.failureClasses)) {
      throw new RuntimeError("invalid_socket", "Socket capabilities and failure classes are required", 400);
    }
    if (typeof input.permitRequired !== "boolean" || !Number.isFinite(input.timeoutMs) || input.timeoutMs <= 0) {
      throw new RuntimeError("invalid_socket", "Socket permit and timeout policy are required", 400);
    }
    const socket = {
      id: String(input.id),
      kind: input.kind,
      capabilities: [...new Set(input.capabilities.map(String))],
      readiness: input.readiness === "ready" ? "ready" : "unavailable",
      permitRequired: input.permitRequired,
      timeoutMs: Math.floor(input.timeoutMs),
      failureClasses: [...new Set(input.failureClasses.map(String))]
    };
    this.sockets.set(socket.id, socket);
    return publicSocket(socket);
  }

  get(id) {
    const socket = this.sockets.get(id);
    return socket ? publicSocket(socket) : null;
  }

  unregister(id) {
    return this.sockets.delete(id);
  }

  requireReady(id) {
    const socket = this.sockets.get(id);
    if (!socket) throw new RuntimeError("socket_not_found", "Requested runtime socket is not installed", 404, { socketId: id });
    if (socket.readiness !== "ready") throw new RuntimeError("socket_not_ready", "Requested runtime socket is not ready", 503, { socketId: id });
    return socket;
  }

  snapshot() {
    return { schema: "gpao_t.runtime_sockets.v1", sockets: [...this.sockets.values()].map(publicSocket) };
  }
}

export function createFoundationSocketRegistry() {
  return new RuntimeSocketRegistry({
    sockets: [{
      id: "local-deterministic-worker",
      kind: "local",
      capabilities: ["deterministic_turn"],
      readiness: "ready",
      permitRequired: true,
      timeoutMs: 30_000,
      failureClasses: ["worker_dispatch_timeout", "worker_result_timeout", "worker_lost", "cancelled_in_flight"]
    }]
  });
}
