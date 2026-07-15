import { spawn } from "node:child_process";
import { RuntimeError } from "../errors.js";

const MAX_OUTPUT = 1_000_000;

export class SafeProcessExecutor {
  constructor({ commands = {}, cwd = process.cwd() } = {}) { this.commands = new Map(Object.entries(commands)); this.cwd = cwd; }
  status() { return { commands: [...this.commands.keys()] }; }

  async run(args, { signal } = {}) {
    const spec = this.commands.get(String(args.commandId));
    if (!spec) throw new RuntimeError("tool_permission_denied", "허용된 실행 명령이 아닙니다.", 403);
    const extraArgs = (args.args || []).map(String);
    if (extraArgs.length > 64 || extraArgs.some(value => value.length > 4096 || value.includes("\0"))) throw new RuntimeError("invalid_tool_input", "실행 인수가 허용 범위를 벗어났습니다.", 400);
    return new Promise((resolve, reject) => {
      const child = spawn(spec.command, [...(spec.args || []), ...extraArgs], { cwd: spec.cwd || this.cwd, env: spec.env || {}, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = ""; let stderr = ""; let overflow = false;
      const append = (target, chunk) => { const value = target + chunk; if (Buffer.byteLength(value) > MAX_OUTPUT) { overflow = true; return value.slice(0, MAX_OUTPUT); } return value; };
      child.stdout.on("data", chunk => { stdout = append(stdout, chunk); });
      child.stderr.on("data", chunk => { stderr = append(stderr, chunk); });
      const abort = () => child.kill("SIGTERM");
      signal?.addEventListener("abort", abort, { once: true });
      child.once("error", () => reject(new RuntimeError("tool_dependency_missing", "실행 프로그램을 시작하지 못했습니다.", 503)));
      child.once("close", code => {
        signal?.removeEventListener("abort", abort);
        if (signal?.aborted) return reject(new RuntimeError("tool_outcome_unknown", "실행이 중단되어 결과를 확인해야 합니다.", 504));
        if (code !== 0) return reject(new RuntimeError("tool_execution_failed", "실행 프로그램이 오류로 종료되었습니다.", 502, { exitCode: code }));
        resolve({ commandId: args.commandId, exitCode: code, stdout, stderr, truncated: overflow });
      });
    });
  }
}
