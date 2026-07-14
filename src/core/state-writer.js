import { StateStore } from "./store.js";

const stateDir = process.argv[2];
const store = new StateStore(stateDir);
const queue = [];
let running = false;
let closed = false;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isDatabaseBusy(error) {
  return error?.code === "ERR_SQLITE_ERROR" && /database is locked|database is busy/i.test(error.message || "");
}

async function withBusyRetry(fn) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return fn();
    } catch (error) {
      if (!isDatabaseBusy(error) || attempt >= 40) throw error;
      await sleep(Math.min(10 + attempt * 5, 100));
    }
  }
}

function execute(op, args) {
  switch (op) {
    case "bootstrapRuntime":
      return store.transaction(() => {
        const generation = Number(store.getMeta("runtime_generation") || 0) + 1;
        store.setMeta("runtime_generation", String(generation));
        store.setMeta("runtime_instance_id", args.instanceId);
        store.markAllLeasedUncertain(generation, "runtime_restart");
        return { generation };
      });
    case "acceptCommand":
      return store.acceptCommand(args.command, args.runtimeGeneration, args.maxQueue);
    case "countActiveOutbox":
      return store.countActiveOutbox();
    case "getCommand":
      return store.getCommand(args.commandId, args.principalId);
    case "getProgress":
      return store.getProgress(args.commandId, args.principalId);
    case "pendingOutbox":
      return store.pendingOutbox(args.limit);
    case "leaseCommand":
      return store.transaction(() => {
        if (!store.lease(args.commandId, args.generation)) return null;
        return store.getCommand(args.commandId, args.principalId);
      });
    case "recordDispatch":
      return store.transaction(() => {
        store.appendEvent({ commandId: args.commandId, principalId: args.principalId, type: "turn.dispatched", payload: { generation: args.generation }, runtimeGeneration: args.generation });
        store.addProgress(args.commandId, args.principalId, "running", { generation: args.generation });
        return true;
      });
    case "markUncertain":
      return store.transaction(() => store.markUncertain(args.commandId, args.principalId, args.generation, args.reason));
    case "markTerminal":
      return store.transaction(() => store.markTerminal(args.commandId, args.principalId, args.generation, args.status, args.result));
    case "verifyCheckpoint":
      return store.verifyCheckpoint();
    case "verifyIntegrity":
      return store.verifyIntegrity();
    case "close":
      store.close();
      closed = true;
      return { closed: true };
    default:
      throw new Error(`Unknown state writer operation: ${op}`);
  }
}

async function pump() {
  if (running) return;
  running = true;
  while (queue.length && !closed) {
    const message = queue.shift();
    try {
      const result = await withBusyRetry(() => execute(message.op, message.args));
      process.send?.({ id: message.id, ok: true, result });
    } catch (error) {
      process.send?.({ id: message.id, ok: false, error: { code: error.code || "state_writer_error", message: error.message || "State writer operation failed", status: error.status || 500, details: error.details } });
    }
  }
  running = false;
  if (closed) setImmediate(() => process.exit(0));
}

process.on("message", message => {
  if (!message?.id || closed) return;
  queue.push(message);
  void pump();
});

process.once("disconnect", () => {
  if (!closed) {
    try { store.close(); } catch {}
    process.exit(0);
  }
});
