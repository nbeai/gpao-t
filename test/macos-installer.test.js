import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  assessInstallReadiness,
  buildFreshRuntimeConfig,
  createInstallPlan,
  defaultOptions,
  makeFixtureManifest,
} from "../tools/gpao-t-local-install-lib.mjs";

const ROOT = resolve(new URL("..", import.meta.url).pathname);

test("macOS installer entrypoint is syntax-valid and carries the no-dependency path", () => {
  execFileSync("zsh", ["-n", join(ROOT, "installer", "GPAO-T-Install.command")]);
  execFileSync(process.execPath, ["--check", join(ROOT, "installer", "gpao-t-macos-local.mjs")]);
  execFileSync(process.execPath, ["--check", join(ROOT, "tools", "build-gpao-t-macos-installer.mjs")]);
});

test("fresh installs create a loopback-only token-authenticated runtime config", () => {
  const config = buildFreshRuntimeConfig({ stateHome: "/Users/test/.gpao-t", port: 18799 });
  assert.equal(config.gateway.mode, "local");
  assert.equal(config.gateway.bind, "loopback");
  assert.equal(config.gateway.port, 18799);
  assert.equal(config.gateway.auth.mode, "token");
  assert.equal(typeof config.gateway.auth.token, "string");
  assert.equal(config.gateway.auth.token.length, 64);
  assert.deepEqual(config.gateway.controlUi.allowedOrigins, [
    "http://127.0.0.1:18799",
    "http://localhost:18799",
  ]);
  assert.equal(config.agents.defaults.workspace, "/Users/test/.gpao-t/workspace");
  assert.equal(config.plugins.entries.codex.enabled, false);
  assert.equal(config.plugins.allow.includes("codex"), false);
  assert.equal(config.plugins.entries.telegram, undefined);
});

test("macOS installer auto-approves the first local browser pairing after opening dashboard", async () => {
  const source = await fs.readFile(join(ROOT, "installer", "GPAO-T-Install.command"), "utf8");
  assert.match(source, /approve_first_browser_pairing\(\)/);
  assert.match(source, /devices list --json/);
  assert.match(source, /devices approve "\$\{request_id\}" --json/);
  assert.match(source, /DASHBOARD_REOPEN_OUTPUT/);
});

test("fresh installs succeed when only provider setup is missing after runtime health is live", () => {
  const readiness = assessInstallReadiness({
    status: "unhealthy",
    checks: [
      { id: "current-link", ok: true, value: "/Users/test/.gpao-t/releases/gpao-t-0.1.0" },
      { id: "distribution", ok: true, version: "0.1.0", integrity: "full-sha256" },
      { id: "launch-agent-plist", ok: true, mode: "0600" },
      { id: "launch-agent-loaded", ok: true },
      { id: "health", ok: true, status: 200 },
      {
        id: "provider-auth-heart",
        ok: false,
        inventoryStatus: "repair_required",
        repairPlanStatus: "no_repair_needed",
        userVisibleState: {
          status: "needs_setup",
          label: "모델 연결 설정 필요",
          message: "GPAO-T가 아직 사용할 수 있는 모델 연결 정보를 찾지 못했습니다.",
        },
        completionClaimAllowed: false,
        reason: "repair_required_but_no_plan",
      },
      {
        id: "doctor-recovery-heart",
        ok: false,
        status: "blocked",
        severity: "P0",
        recoveryActionCount: 2,
        completionClaimAllowed: false,
      },
    ],
  });
  assert.equal(readiness.ok, true);
  assert.equal(readiness.status, "needs_provider_setup");
  assert.equal(readiness.providerSetupRequired, true);
  assert.equal(readiness.failedInfrastructure.length, 0);
});

test("fresh installs remain blocked when runtime infrastructure is not live", () => {
  const readiness = assessInstallReadiness({
    status: "unhealthy",
    checks: [
      { id: "current-link", ok: true, value: "/Users/test/.gpao-t/releases/gpao-t-0.1.0" },
      { id: "distribution", ok: true, version: "0.1.0", integrity: "full-sha256" },
      { id: "launch-agent-plist", ok: true, mode: "0600" },
      { id: "launch-agent-loaded", ok: true },
      { id: "health", ok: false, reason: "fetch failed" },
      { id: "provider-auth-heart", ok: false },
    ],
  });
  assert.equal(readiness.ok, false);
  assert.equal(readiness.status, "blocked");
  assert.deepEqual(readiness.failedInfrastructure.map((check) => check.id), ["health"]);
});

test("macOS install plan uses a copied runtime Node path for LaunchAgent stability", async () => {
  const root = await mkdtemp(join(tmpdir(), "gpao-t-macos-installer-test-"));
  const release = join(root, "release");
  const stateHome = join(root, "state");
  const launchAgentsDir = join(root, "LaunchAgents");
  await fs.mkdir(join(release, "compatibility", "gpao-t"), { recursive: true });
  await fs.writeFile(join(release, "gpao-t.mjs"), "#!/usr/bin/env node\n");
  await fs.writeFile(join(release, "package.json"), '{"name":"gpao-t","version":"0.1.0"}\n');
  await fs.writeFile(join(release, "compatibility", "gpao-t", "runtime.js"), "export {};\n");
  await makeFixtureManifest(release);
  try {
    const options = {
      ...defaultOptions({ workspaceRoot: ROOT }),
      release,
      stateHome,
      openclawHome: join(root, "compatibility-source"),
      launchAgentsDir,
      port: 29779,
      migrationProfile: "none",
      nodePath: process.execPath,
    };
    const plan = await createInstallPlan(options);
    assert.deepEqual(plan.blockers, []);
    assert.equal(plan.runtime.nodeDestination, join(stateHome, "runtime", "node"));
    assert.equal(plan.launchAgent.node, join(stateHome, "runtime", "node"));
    assert.equal(plan.runtime.nodeSource, process.execPath);
    assert.ok(plan.managedTargets.includes(join(stateHome, "runtime", "node")));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
