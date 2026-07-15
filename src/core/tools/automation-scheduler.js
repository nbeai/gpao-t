import crypto from "node:crypto";
import { RuntimeError } from "../errors.js";

export class LocalAutomationScheduler {
  constructor({ clock = () => Date.now(), maxJobs = 500 } = {}) { this.clock = clock; this.maxJobs = maxJobs; this.jobs = new Map(); }

  schedule(args) {
    const runAt = Date.parse(args.runAt);
    if (!Number.isFinite(runAt) || runAt <= this.clock()) throw new RuntimeError("invalid_tool_input", "자동화 실행 시각은 현재보다 이후여야 합니다.", 400);
    if (this.jobs.size >= this.maxJobs) throw new RuntimeError("tool_conflict", "자동화 저장 한도에 도달했습니다.", 409);
    const id = `job_${crypto.randomUUID()}`;
    const job = { id, name: String(args.name || "자동화"), runAt, action: structuredClone(args.action || {}), state: "scheduled", createdAt: this.clock() };
    this.jobs.set(id, job);
    return this.public(job);
  }

  list() { return { jobs: [...this.jobs.values()].map(job => this.public(job)) }; }

  cancel(args) {
    const job = this.jobs.get(String(args.jobId));
    if (!job) throw new RuntimeError("tool_target_not_found", "자동화를 찾을 수 없습니다.", 404);
    if (job.state !== "scheduled") throw new RuntimeError("tool_conflict", "이미 종료된 자동화입니다.", 409);
    job.state = "cancelled"; job.cancelledAt = this.clock();
    return this.public(job);
  }

  claimDue({ limit = 20 } = {}) {
    const due = [...this.jobs.values()].filter(job => job.state === "scheduled" && job.runAt <= this.clock()).sort((a, b) => a.runAt - b.runAt).slice(0, limit);
    for (const job of due) { job.state = "claimed"; job.claimedAt = this.clock(); }
    return { jobs: due.map(job => this.public(job)) };
  }

  public(job) { return { id: job.id, name: job.name, runAt: new Date(job.runAt).toISOString(), action: structuredClone(job.action), state: job.state, createdAt: job.createdAt, claimedAt: job.claimedAt || null, cancelledAt: job.cancelledAt || null }; }
}
