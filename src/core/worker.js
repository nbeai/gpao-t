import { verifyPermit } from "./permit.js";

const secret = process.env.GPAO_T_PERMIT_SECRET || "";

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, Math.min(Number(ms) || 0, 5_000))));
}

process.on("message", async message => {
  if (!message || message.type !== "execute") return;
  const { permit, payload } = message;
  if (!verifyPermit(secret, permit)) {
    process.send?.({ type: "result", commandId: permit?.commandId, generation: permit?.generation, permitSignature: permit?.signature, status: "failed", error: { code: "invalid_permit", message: "Worker rejected the execution permit" } });
    return;
  }
  if (payload?.mode === "crash-after-dispatch") process.exit(77);
  await delay(payload?.delayMs);
  if (payload?.mode === "fail") {
    process.send?.({ type: "result", commandId: permit.commandId, principalId: permit.principalId, generation: permit.generation, permitSignature: permit.signature, status: "failed", error: { code: "simulated_failure", message: "Simulated capability failure" } });
    return;
  }
  const output = { kind: "deterministic_worker_result", echo: payload?.input ?? null };
  process.send?.({ type: "result", commandId: permit.commandId, principalId: permit.principalId, generation: permit.generation, permitSignature: permit.signature, status: "succeeded", result: output });
});
