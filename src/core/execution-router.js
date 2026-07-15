import crypto from "node:crypto";
import { RuntimeError } from "./errors.js";

function digest(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export class ExecutionRouter {
  constructor({ socketRegistry, defaultSocketId = "local-deterministic-worker" } = {}) {
    if (!socketRegistry) throw new RuntimeError("router_configuration_error", "A runtime socket registry is required", 500);
    this.socketRegistry = socketRegistry;
    this.defaultSocketId = defaultSocketId;
  }

  plan({ command, generation, permit, now = Date.now() }) {
    if (!command?.id || !command?.principalId || !command?.requestId || !permit?.signature) {
      throw new RuntimeError("invalid_route_input", "Command identity and authority permit are required", 400);
    }
    const socket = this.socketRegistry.requireReady(command.payload?.socketId || this.defaultSocketId);
    if (socket.permitRequired && permit.commandId !== command.id) throw new RuntimeError("invalid_route_permit", "Route permit does not match command", 403);
    return {
      schema: "gpao_t3.execution_route_plan.v1",
      runId: command.id,
      sessionId: command.principalId,
      requestId: command.requestId,
      generation,
      idempotencyKey: `${command.principalId}:${command.requestId}`,
      contextDigest: digest(command.requestDigest),
      authorityPermitDigest: digest(permit.signature),
      destination: {
        socketId: socket.id,
        kind: socket.kind,
        capability: socket.capabilities[0] || "unspecified",
        permitRequired: socket.permitRequired
      },
      cancellationDeadlineAt: Math.min(permit.expiresAt, now + socket.timeoutMs),
      externalEffect: false
    };
  }
}
