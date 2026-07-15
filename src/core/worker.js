import { verifyPermit } from "./permit.js";

const secret = process.env.GPAO_T_PERMIT_SECRET || "";

function reject(message, code, text) {
  process.send?.({
    type: "result",
    commandId: message?.permit?.commandId,
    generation: message?.permit?.generation,
    permitSignature: message?.permit?.signature,
    status: "failed",
    error: { code, message: text }
  });
}

function validRoutePlan(routePlan, permit) {
  return Boolean(
    routePlan
      && routePlan.runId === permit.commandId
      && routePlan.generation === permit.generation
      && routePlan.authorityPermitDigest
      && routePlan.destination?.socketId === "local-deterministic-worker"
      && routePlan.destination?.kind === "local"
      && routePlan.destination?.permitRequired === true
  );
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, Math.min(Number(ms) || 0, 5_000))));
}

process.on("message", async message => {
  if (!message || message.type !== "execute") return;
  const { permit, routePlan, payload } = message;
  if (!verifyPermit(secret, permit)) {
    reject(message, "invalid_permit", "Worker rejected the execution permit");
    return;
  }
  if (!validRoutePlan(routePlan, permit)) {
    reject(message, "invalid_route_plan", "Worker rejected the execution route");
    return;
  }
  if (payload?.mode === "crash-after-dispatch") process.exit(77);
  if (payload?.mode === "blackhole") return;
  await delay(payload?.delayMs);
  if (payload?.mode === "fail") {
    process.send?.({ type: "result", commandId: permit.commandId, principalId: permit.principalId, generation: permit.generation, permitSignature: permit.signature, status: "failed", error: { code: "simulated_failure", message: "Simulated capability failure" } });
    return;
  }
  const output = { kind: "deterministic_worker_result", echo: payload?.input ?? null };
  process.send?.({ type: "result", commandId: permit.commandId, principalId: permit.principalId, generation: permit.generation, permitSignature: permit.signature, status: "succeeded", result: output });
});
