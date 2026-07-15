#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());

function commandExists(command) {
  const result = spawnSync(command, ["--version"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0;
}

function commandSucceeds(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return result.status === 0;
}

function run(command, args) {
  const startedAt = Date.now();
  try {
    const stdout = execFileSync(command, args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120000,
    });
    return {
      command: [command, ...args].join(" "),
      status: "pass",
      durationMs: Date.now() - startedAt,
      stdout: stdout.trim().slice(-4000),
    };
  } catch (error) {
    return {
      command: [command, ...args].join(" "),
      status: "fail",
      durationMs: Date.now() - startedAt,
      exitCode: error.status ?? null,
      stdout: String(error.stdout || "").trim().slice(-4000),
      stderr: String(error.stderr || error.message || "").trim().slice(-4000),
    };
  }
}

const contractChecks = [
  { id: "dockerfile_present", pass: existsSync(resolve(root, "Dockerfile")) },
  { id: "compose_present", pass: existsSync(resolve(root, "docker-compose.yml")) },
  { id: "env_example_present", pass: existsSync(resolve(root, ".env.example")) },
  { id: "dockerignore_present", pass: existsSync(resolve(root, ".dockerignore")) },
];

const dockerAvailable = commandExists("docker");
const dockerDaemonAvailable =
  dockerAvailable && commandSucceeds("docker", ["info", "--format", "{{.ServerVersion}}"]) ;
const steps = [];

if (dockerDaemonAvailable) {
  steps.push(run("docker", ["compose", "config", "--quiet"]));
  steps.push(run("docker", ["build", "-t", "nbeai/gpao-t:local", "."]));
  steps.push(run("docker", ["compose", "up", "--detach", "--build", "gpao-t"]));
  steps.push(run("docker", ["compose", "ps", "gpao-t"]));
  steps.push(run("docker", ["compose", "exec", "-T", "gpao-t", "node", "bin/gpao-t.js", "control", "serve-check"]));
  steps.push(run("docker", ["compose", "down"]));
}

const failedContract = contractChecks.filter((check) => !check.pass);
const failedSteps = steps.filter((step) => step.status !== "pass");
const status = failedContract.length
  ? "blocked_contract"
  : !dockerAvailable
    ? "blocked_environment"
    : !dockerDaemonAvailable
      ? "blocked_daemon"
    : failedSteps.length
      ? "blocked_smoke"
      : "ready";

const result = {
  schema: "gpao_t.docker_smoke.v0_1",
  status,
  environment: {
    dockerAvailable,
    dockerDaemonAvailable,
    blocker: !dockerAvailable
      ? "docker_cli_missing"
      : !dockerDaemonAvailable
        ? "docker_daemon_unreachable"
        : null,
  },
  contractChecks,
  steps,
  findings: [
    ...failedContract.map((check) => `${check.id}_missing`),
    ...failedSteps.map((step) => `${step.command}:failed`),
    ...(!dockerAvailable ? ["docker_cli_missing"] : []),
    ...(dockerAvailable && !dockerDaemonAvailable ? ["docker_daemon_unreachable"] : []),
  ],
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (status === "blocked_contract" || status === "blocked_smoke") process.exitCode = 1;
