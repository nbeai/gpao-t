import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  applyInstall,
  applyTokenFor,
  createInstallPlan,
  createRollbackPlan,
  defaultOptions,
  makeFixtureManifest,
  migrateConfigObject,
  renderLaunchAgent,
  sanitizePostMigrationRepairOutput,
  rollbackTokenFor,
  verifyDistribution,
  writeJsonAtomic,
} from "./gpao-t-local-install-lib.mjs";

const execFileAsync = promisify(execFile);
const toolsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(toolsDir, "..");
const installerPath = join(projectRoot, "installer", "gpao-t-macos-local.mjs");
const plistTemplate = join(projectRoot, "installer", "ai.nbeai.gpao-t.plist.template");

async function fixture({ insecureConfig = false, externalSymlink = false } = {}) {
  const root = await fs.mkdtemp(join(tmpdir(), "gpao-t-installer-test-"));
  const release = join(root, "release");
  const openclawHome = join(root, "openclaw");
  const stateHome = join(root, "gpao-t-state");
  const launchAgentsDir = join(root, "LaunchAgents");
  await fs.mkdir(join(release, "compatibility", "gpao-t"), { recursive: true });
  await fs.writeFile(join(release, "gpao-t.mjs"), "#!/usr/bin/env node\n", { mode: 0o755 });
  await fs.writeFile(join(release, "package.json"), '{"name":"gpao-t","version":"0.1.0"}\n');
  await fs.writeFile(join(release, "compatibility", "gpao-t", "runtime.js"), "export {};\n");
  if (externalSymlink) await fs.symlink("/tmp", join(release, "compatibility", "gpao-t", "escape"));
  await makeFixtureManifest(release);
  await fs.mkdir(join(openclawHome, "credentials"), { recursive: true, mode: 0o700 });
  await fs.mkdir(join(openclawHome, "workspace"), { recursive: true, mode: 0o700 });
  await fs.mkdir(join(openclawHome, "logs"), { recursive: true, mode: 0o700 });
  await fs.writeFile(join(openclawHome, "openclaw.json"), JSON.stringify({ gateway: { port: 18789 }, agents: { defaults: { workspace: join(openclawHome, "workspace") } } }), { mode: insecureConfig ? 0o644 : 0o600 });
  await fs.writeFile(join(openclawHome, "credentials", "provider.json"), '{"token":"not-a-real-secret"}\n', { mode: 0o600 });
  await fs.writeFile(join(openclawHome, "workspace", "AGENTS.md"), "fixture\n", { mode: 0o644 });
  await fs.writeFile(join(openclawHome, "logs", "ignored.log"), "ignored\n", { mode: 0o600 });
  return {
    root,
    release,
    openclawHome,
    stateHome,
    launchAgentsDir,
    cleanup: () => fs.rm(root, { recursive: true, force: true }),
  };
}

function optionsFor(data, overrides = {}) {
  return {
    ...defaultOptions({ workspaceRoot: projectRoot }),
    release: data.release,
    openclawHome: data.openclawHome,
    stateHome: data.stateHome,
    launchAgentsDir: data.launchAgentsDir,
    plistTemplate,
    port: 29777,
    ...overrides,
  };
}

test("distribution verification checks files and rejects escaping symlinks", async () => {
  const good = await fixture();
  const bad = await fixture({ externalSymlink: true });
  try {
    const verified = await verifyDistribution(good.release);
    assert.equal(verified.integrity, "full-sha256");
    await assert.rejects(() => verifyDistribution(bad.release), /symlink escapes release root/);
  } finally {
    await good.cleanup();
    await bad.cleanup();
  }
});

test("dry-run plan selects state, excludes logs, and does not create destinations", async () => {
  const data = await fixture();
  try {
    const options = optionsFor(data);
    const before = await fs.readdir(data.root);
    const plan = await createInstallPlan(options);
    const after = await fs.readdir(data.root);
    assert.equal(plan.mode, "dry-run");
    assert.equal(plan.openclaw.backup, "skipped");
    assert.deepEqual(plan.openclaw.selected, []);
    assert.ok(plan.openclaw.excludedTopLevel.includes("logs"));
    assert.equal(plan.openclaw.secretValuesExposed, false);
    assert.equal(plan.applyTokenRequired, applyTokenFor(plan.version));
    assert.equal(await fs.access(data.stateHome).then(() => true, () => false), false);
    assert.deepEqual(after, before);
  } finally {
    await data.cleanup();
  }
});

test("insecure secret-bearing source mode blocks preflight", async () => {
  const data = await fixture({ insecureConfig: true });
  try {
    const plan = await createInstallPlan(optionsFor(data, { migrationProfile: "standard" }));
    assert.ok(plan.blockers.some((item) => item.includes("too permissive") || item.includes("not owner-only")));
  } finally {
    await data.cleanup();
  }
});

test("apply refuses a wrong token before creating state", async () => {
  const data = await fixture();
  try {
    const options = optionsFor(data, { apply: true, applyToken: "wrong" });
    const plan = await createInstallPlan(options);
    await assert.rejects(() => applyInstall(plan, options), /exact token required/);
    assert.equal(await fs.access(data.stateHome).then(() => true, () => false), false);
  } finally {
    await data.cleanup();
  }
});

test("LaunchAgent rendering uses the dedicated label and no secret environment", async () => {
  const rendered = await renderLaunchAgent(plistTemplate, {
    nodePath: "/opt/node/bin/node",
    currentPath: "/Users/test/.gpao-t/current",
    stateHome: "/Users/test/.gpao-t",
    configPath: "/Users/test/.gpao-t/gpao-t.json",
    logsDir: "/Users/test/.gpao-t/logs",
    port: 18799,
  });
  assert.match(rendered, /ai\.nbeai\.gpao-t/);
  assert.match(rendered, /<string>18799<\/string>/);
  assert.doesNotMatch(rendered, /TOKEN|PASSWORD|ai\.openclaw\.gateway/);
  assert.doesNotMatch(rendered, /@@/);
});

test("post-migration repair output is sealed to GPAO-T product language", () => {
  const raw = [
    "▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄",
    "██░▄▄▄░██░▄▄░██░▄▄▄",
    "▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀",
    "                       OPENCLAW                       ",
    "",
    "Could not find service \"ai.gpao-t.gateway\" in domain for user gui: 501",
    "Run: openclaw gateway restart",
    "OpenClaw hit an unexpected runtime error.",
    "OPENCLAW_HIDE_BANNER is set.",
  ].join("\n");
  const sealed = sanitizePostMigrationRepairOutput(raw);
  assert.doesNotMatch(sealed, /\bOPENCLAW\b|\bOpenClaw\b|\bopenclaw\b/);
  assert.doesNotMatch(sealed, /ai\.gpao-t\.gateway/);
  assert.match(sealed, /ai\.nbeai\.gpao-t/);
  assert.match(sealed, /gpao-t gateway restart/);
  assert.match(sealed, /GPAO_T_HIDE_BANNER/);
});

test("config migration rewrites state roots and only loopback gateway ports", () => {
  const migrated = migrateConfigObject({
    workspace: "/Users/test/.openclaw/workspace",
    shorthand: "~/.openclaw/credentials",
    origins: ["http://127.0.0.1:18789", "ws://localhost:18789/socket", "https://example.com:18789"],
  }, "/Users/test/.openclaw", "/Users/test/.gpao-t", 18789, 18799);
  assert.equal(migrated.workspace, "/Users/test/.gpao-t/workspace");
  assert.equal(migrated.shorthand, "/Users/test/.gpao-t/credentials");
  assert.deepEqual(migrated.origins, ["http://127.0.0.1:18799", "ws://localhost:18799/socket", "https://example.com:18789"]);
});

test("rollback plan is dry-run and snapshot-bound", async () => {
  const data = await fixture();
  try {
    const snapshotId = "install-20260713T000000Z-deadbeef";
    const snapshotPath = join(data.stateHome, "snapshots", snapshotId);
    await fs.mkdir(snapshotPath, { recursive: true, mode: 0o700 });
    await writeJsonAtomic(join(snapshotPath, "manifest.json"), {
      schema: "gpao_t.macos_local_snapshot.v1",
      id: snapshotId,
      complete: true,
      serviceWasLoaded: false,
      targets: [{ target: join(data.stateHome, "current"), existed: false, backup: null }],
    });
    const plan = await createRollbackPlan(optionsFor(data, { snapshotId }));
    assert.equal(plan.mode, "dry-run");
    assert.equal(plan.exactTokenRequired, rollbackTokenFor(snapshotId));
    assert.deepEqual(plan.targets, [{ target: join(data.stateHome, "current"), restorePrevious: false }]);
  } finally {
    await data.cleanup();
  }
});

test("CLI fixture dry-run reports no writes", async () => {
  const data = await fixture();
  try {
    const { stdout } = await execFileAsync(process.execPath, [
      installerPath,
      "install",
      "--release", data.release,
      "--compat-home", data.openclawHome,
      "--state-home", data.stateHome,
      "--launch-agents-dir", data.launchAgentsDir,
      "--port", "29778",
      "--json",
    ], { encoding: "utf8" });
    const output = JSON.parse(stdout);
    assert.equal(output.status, "dry-run-ready");
    assert.equal(output.writesPerformed, false);
    assert.equal(output.serviceActionsPerformed, false);
    assert.equal(await fs.access(data.stateHome).then(() => true, () => false), false);
  } finally {
    await data.cleanup();
  }
});
