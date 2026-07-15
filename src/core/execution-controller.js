import { RuntimeError } from "./errors.js";

export class ExecutionController {
  constructor({ runtime } = {}) {
    if (!runtime) throw new RuntimeError("controller_configuration_error", "A Native Runtime is required", 500);
    this.runtime = runtime;
  }

  submit(input) { return this.runtime.submitTurn(input); }

  cancel(input) { return this.runtime.cancelTurn(input); }

  get(input) { return this.runtime.getTurn(input.principalId, input.commandId); }

  progress(input) { return this.runtime.getProgress(input.principalId, input.commandId); }

  async retry({ principalId, commandId, requestId, payload }) {
    const previous = await this.get({ principalId, commandId });
    if (!previous) return null;
    if (previous.status === "uncertain") {
      throw new RuntimeError("retry_requires_review", "An unknown outcome cannot be retried automatically", 409, { commandId });
    }
    if (!["failed", "cancelled"].includes(previous.status)) {
      throw new RuntimeError("retry_not_available", "Only failed or cancelled local work can be retried", 409, { commandId, status: previous.status });
    }
    if (!requestId) throw new RuntimeError("invalid_retry_request", "A new requestId is required for retry", 400);
    return this.submit({ principalId, requestId, payload: payload || previous.payload });
  }

  async reconcile(input) {
    const turn = await this.get(input);
    if (!turn) return null;
    return { turn, progress: await this.progress(input), terminal: ["succeeded", "failed", "uncertain", "cancelled"].includes(turn.status) };
  }
}
