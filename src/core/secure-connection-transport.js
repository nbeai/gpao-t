import { RuntimeError } from "./errors.js";
import { PROTECTED_CONNECTION_SCHEMA } from "./protected-connection.js";

/** Adapts the OS-owned secure agent to the Node-safe protected protocol. */
export class SecureConnectionTransport {
  constructor({ agent } = {}) {
    if (!agent || typeof agent.begin !== "function" || typeof agent.status !== "function" || typeof agent.revoke !== "function" || typeof agent.invoke !== "function") {
      throw new TypeError("A complete secure connection agent is required");
    }
    this.agent = agent;
  }

  async send(request, { signal } = {}) {
    if (signal?.aborted) throw signal.reason || new RuntimeError("secure_connection_transport_cancelled", "Secure connection request was cancelled", 499);
    if (request.operation === "connection.begin") {
      const connection = await this.agent.begin({ requestId: request.requestId, providerId: request.providerId, authMethod: request.authMethod, deadline: request.deadline });
      return { schema: PROTECTED_CONNECTION_SCHEMA, operation: request.operation, requestId: request.requestId, credentialRef: connection.credentialRef, authMethod: connection.authMethod, state: connection.state, models: connection.models };
    }
    if (request.operation === "connection.status") {
      const connection = await this.agent.status({ requestId: request.requestId, credentialRef: request.credentialRef, deadline: request.deadline });
      return { schema: PROTECTED_CONNECTION_SCHEMA, operation: request.operation, requestId: request.requestId, credentialRef: connection.credentialRef, authMethod: connection.authMethod, state: connection.state, models: connection.models };
    }
    if (request.operation === "connection.revoke") {
      const connection = await this.agent.revoke({ requestId: request.requestId, credentialRef: request.credentialRef, deadline: request.deadline });
      return { schema: PROTECTED_CONNECTION_SCHEMA, operation: request.operation, requestId: request.requestId, credentialRef: connection.credentialRef, authMethod: connection.authMethod, state: connection.state, models: connection.models };
    }
    if (request.operation === "provider.invoke") {
      const invocation = await this.agent.invoke({ requestId: request.requestId, credentialRef: request.credentialRef, providerId: request.providerId, modelId: request.modelId, input: request.input, deadline: request.deadline });
      return { schema: PROTECTED_CONNECTION_SCHEMA, operation: request.operation, requestId: request.requestId, operationId: request.requestId, state: "completed", result: invocation.result, receipt: invocation.receipt };
    }
    throw new RuntimeError("secure_connection_transport_invalid_operation", "Unsupported secure connection operation", 400);
  }
}
