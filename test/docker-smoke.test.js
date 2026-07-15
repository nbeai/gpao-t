import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const TOOL = fileURLToPath(new URL("../tools/run-gpao-t-docker-smoke.mjs", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

test("docker smoke distinguishes an installed CLI from an unreachable daemon", async () => {
  const bin = await mkdtemp(join(tmpdir(), "gpao-t-fake-docker-"));
  const docker = join(bin, "docker");
  await writeFile(
    docker,
    [
      "#!/bin/sh",
      "if [ \"$1\" = \"--version\" ]; then exit 0; fi",
      "if [ \"$1\" = \"info\" ]; then exit 1; fi",
      "echo unexpected docker call >&2",
      "exit 99",
      "",
    ].join("\n"),
  );
  await chmod(docker, 0o755);

  const report = JSON.parse(execFileSync(process.execPath, [TOOL], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH || ""}` },
  }));

  assert.equal(report.status, "blocked_daemon");
  assert.equal(report.environment.dockerAvailable, true);
  assert.equal(report.environment.dockerDaemonAvailable, false);
  assert.equal(report.environment.blocker, "docker_daemon_unreachable");
  assert.deepEqual(report.steps, []);
});
