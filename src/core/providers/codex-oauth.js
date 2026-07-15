import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { ProviderInvocationError } from "../provider.js";

function classifyFailure(stderr) {
  if (/not logged in|login/i.test(stderr)) return new ProviderInvocationError("auth_required", "Codex OAuth connection is required");
  return new ProviderInvocationError("provider_unavailable", "Codex OAuth provider did not complete");
}

/** Uses the existing Codex ChatGPT OAuth session without reading its token. */
export class CodexOAuthAdapter {
  constructor({ command = "codex", workspaceRoot = os.tmpdir() } = {}) {
    this.command = command;
    this.workspaceRoot = workspaceRoot;
  }

  async checkConnection({ signal } = {}) {
    let stderr = "";
    await new Promise((resolve, reject) => {
      const child = spawn(this.command, ["login", "status"], { stdio: ["ignore", "ignore", "pipe"], env: { PATH: process.env.PATH, HOME: process.env.HOME, USER: process.env.USER, TMPDIR: process.env.TMPDIR, CODEX_HOME: process.env.CODEX_HOME } });
      child.stderr.on("data", chunk => { stderr += String(chunk).slice(0, 8_192); });
      const abort = () => { try { child.kill("SIGTERM"); } catch {} reject(signal?.reason instanceof ProviderInvocationError ? signal.reason : new ProviderInvocationError("external_outcome_unknown", "Codex OAuth check was interrupted")); };
      if (signal?.aborted) return abort();
      signal?.addEventListener("abort", abort, { once: true });
      child.once("error", error => { signal?.removeEventListener("abort", abort); reject(new ProviderInvocationError("provider_unavailable", "Codex OAuth check could not start", { cause: error.code || "spawn_failed" })); });
      child.once("exit", code => { signal?.removeEventListener("abort", abort); code === 0 ? resolve() : reject(classifyFailure(stderr)); });
    });
    return { state: "ready" };
  }

  async invoke(plan, { input, signal } = {}) {
    const workDir = fs.mkdtempSync(path.join(this.workspaceRoot, "gpao-t-codex-oauth-"));
    const outputPath = path.join(workDir, "answer.txt");
    // `-` tells Codex to read the prompt from stdin so user content never
    // appears in the child-process argument list.
    const args = ["exec", "--ephemeral", "--skip-git-repo-check", "--sandbox", "read-only", "--color", "never", "--output-last-message", outputPath, "-C", workDir, "--model", plan.modelId, "-"];
    try {
      await new Promise((resolve, reject) => {
        const env = {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          USER: process.env.USER,
          TMPDIR: process.env.TMPDIR,
          CODEX_HOME: process.env.CODEX_HOME
        };
        const child = spawn(this.command, args, { stdio: ["pipe", "ignore", "pipe"], env });
        child.stdin.end(input);
        let stderr = "";
        child.stderr.on("data", chunk => { stderr += String(chunk).slice(0, 8_192); });
        const abort = () => {
          try { child.kill("SIGTERM"); } catch {}
          reject(signal?.reason instanceof ProviderInvocationError ? signal.reason : new ProviderInvocationError("external_outcome_unknown", "Codex OAuth request was interrupted"));
        };
        if (signal?.aborted) return abort();
        signal?.addEventListener("abort", abort, { once: true });
        child.once("error", error => { signal?.removeEventListener("abort", abort); reject(new ProviderInvocationError("provider_unavailable", "Codex OAuth provider could not start", { cause: error.code || "spawn_failed" })); });
        child.once("exit", code => {
          signal?.removeEventListener("abort", abort);
          if (code === 0) resolve();
          else reject(classifyFailure(stderr));
        });
      });
      const text = fs.readFileSync(outputPath, "utf8").trim();
      if (!text) throw new ProviderInvocationError("failed", "Codex OAuth provider returned no text output");
      return { status: "succeeded", runId: plan.runId, providerId: plan.providerId, modelId: plan.modelId, result: { text }, receipt: { schema: "gpao_t3.provider_receipt.v1", runId: plan.runId, generation: plan.generation, terminal: true, providerSession: "oauth-managed" } };
    } finally {
      fs.rmSync(workDir, { recursive: true, force: true });
    }
  }
}
