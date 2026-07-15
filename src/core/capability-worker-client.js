import crypto from "node:crypto";
import { fork } from "node:child_process";
import { RuntimeError } from "./errors.js";
import { createCapabilityPermit } from "./capability-permit.js";
import { assertCapabilityPayloadHasNoSecrets } from "./secret-hygiene.js";

export class CapabilityWorkerClient {
  constructor({ manifest, modulePath, secret, workerPath = new URL("./capability-worker.js", import.meta.url).pathname } = {}) { Object.assign(this, { manifest, modulePath, secret, workerPath }); this.pending = new Map(); }
  async start() {
    const env = { PATH: process.env.PATH || "", NODE_NO_WARNINGS: "1", GPAO_T3_CAPABILITY_PERMIT_SECRET: this.secret, GPAO_T3_CAPABILITY_MODULE: this.modulePath };
    this.child = fork(this.workerPath, [], { stdio: ["ignore", "ignore", "ignore", "ipc"], env });
    await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error("capability_worker_start_timeout")), 2_000); this.child.on("message", message => { if (message?.type === "ready" && message.capabilityId === this.manifest.id) { clearTimeout(timer); resolve(); } }); this.child.once("exit", () => reject(new Error("capability_worker_exited"))); });
    this.child.on("message", message => { const pending = this.pending.get(message?.requestId); if (!pending) return; this.pending.delete(message.requestId); clearTimeout(pending.timer); message.ok ? pending.resolve(message.output) : pending.reject(new RuntimeError(message.error.code, message.error.message, 502)); });
    return this;
  }
  invoke({ principalId, input }) {
    assertCapabilityPayloadHasNoSecrets(input);
    const requestId = crypto.randomUUID();
    const permit = createCapabilityPermit(this.secret, { capabilityId: this.manifest.id, operation: "invoke", principalId, input, ttlMs: this.manifest.timeoutMs });
    return new Promise((resolve, reject) => { const timer = setTimeout(() => { this.pending.delete(requestId); this.child.send({ type: "cancel", requestId }); reject(new RuntimeError("capability_outcome_unknown", "Capability result is unknown; review before retrying", 504)); }, this.manifest.timeoutMs); this.pending.set(requestId, { resolve, reject, timer }); this.child.send({ type: "invoke", requestId, permit, input }); });
  }
  async stop() { for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new RuntimeError("capability_worker_stopped", "Capability worker stopped", 503)); } this.pending.clear(); this.child?.kill(); }
}
