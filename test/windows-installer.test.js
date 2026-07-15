import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { buildWindowsInstaller } from "../tools/build-gpao-t-windows-installer.mjs";
import { verifyWindowsInstaller } from "../tools/verify-gpao-t-windows-installer.mjs";
import { makeFixtureManifest } from "../tools/gpao-t-local-install-lib.mjs";
import { collectTree, treeDigest } from "../tools/gpao-t-production-distribution-seal.mjs";
import { GPAO_T_RELEASE_CONTRACT } from "../src/core/release-contract.js";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const RELEASE_VERSION = GPAO_T_RELEASE_CONTRACT.version;

test("Windows installer tools are syntax-valid Node entrypoints", () => {
  execFileSync(process.execPath, ["--check", join(ROOT, "tools", "build-gpao-t-windows-installer.mjs")]);
  execFileSync(process.execPath, ["--check", join(ROOT, "tools", "verify-gpao-t-windows-installer.mjs")]);
});

test("Windows installer bootstrap absorbs PowerShell policy and never asks for a connection key", async () => {
  const installCmd = await fs.readFile(join(ROOT, "installer", "windows", "GPAO-T-Install.cmd"), "utf8");
  const script = await fs.readFile(join(ROOT, "installer", "windows", "GPAO-T-Windows.ps1"), "utf8");
  assert.match(installCmd, /ExecutionPolicy Bypass/);
  assert.match(script, /schtasks\.exe/);
  assert.match(script, /devices approve/);
  assert.match(script, /dashboard/);
  assert.match(script, /GPAO_T_UPDATE_FEED_URL/);
  assert.match(script, /OPENCLAW_NO_AUTO_UPDATE/);
  assert.match(script, /Set-JsonProperty/);
  assert.match(script, /Test-GpaoOwnedPid/);
  assert.doesNotMatch(script, /Read-Host.*token/i);
  assert.doesNotMatch(script, /Read-Host.*연결키/i);
});

test("Windows installer package can be built and verified from a sealed distribution", async () => {
  const root = await mkdtemp(join(tmpdir(), "gpao-t-windows-installer-test-"));
  const release = join(root, "release");
  const output = join(root, "windows-installer");
  const archive = `${output}.zip`;
  const fakeNode = join(root, "node.exe");
  await fs.mkdir(join(release, "compatibility", "gpao-t"), { recursive: true });
  await fs.writeFile(join(release, "gpao-t.mjs"), "#!/usr/bin/env node\n");
  await fs.writeFile(join(release, "package.json"), `${JSON.stringify({ name: "gpao-t", version: RELEASE_VERSION, bin: { "gpao-t": "gpao-t.mjs" } })}\n`);
  await fs.writeFile(join(release, "compatibility", "gpao-t", "runtime.js"), "export {};\n");
  await fs.writeFile(
    join(release, "compatibility", "gpao-t", "GPAO-T-RUNTIME.json"),
    `${JSON.stringify({ product: "nBeAI. GPAO-T", productVersion: RELEASE_VERSION })}\n`,
  );
  await makeFixtureManifest(release);
  const runtimeRecords = await collectTree(join(release, "compatibility", "gpao-t"), {
    ignoreTopLevel: ["node_modules"],
  });
  const runtimeTreeSha256 = treeDigest(runtimeRecords);
  const manifestPath = join(release, "GPAO-T-DISTRIBUTION-MANIFEST.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  manifest.runtimeProvenance = {
    schema: "gpao_t.runtime_stage_provenance.v1",
    hashAlgorithm: "sha256-path-kind-size-content-v1",
    sourceBuildTreeSha256: runtimeTreeSha256,
    runtimeStageTreeSha256: runtimeTreeSha256,
    runtimeFileCount: runtimeRecords.length,
    runtimeBytes: runtimeRecords.reduce((sum, item) => sum + (item.size || 0), 0),
    ignoredStageTopLevel: ["node_modules"],
    distributionRuntimeTreeSha256: runtimeTreeSha256,
    distributionRuntimeFileCount: runtimeRecords.length,
    distributionRuntimeBytes: runtimeRecords.reduce((sum, item) => sum + (item.size || 0), 0),
  };
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(fakeNode, Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]));
  try {
    const built = await buildWindowsInstaller({
      distribution: release,
      output,
      archive,
      nodeWinX64: fakeNode,
    });
    assert.equal(built.architecture, "x64");
    const verified = await verifyWindowsInstaller({ root: output, archive, runNode: false });
    assert.equal(verified.status, "verified");
    assert.equal(verified.version, RELEASE_VERSION);
    assert.equal(verified.runNode, false);
    const manifest = JSON.parse(await fs.readFile(join(output, "GPAO-T-WINDOWS-INSTALLER-MANIFEST.json"), "utf8"));
    assert.equal(manifest.distribution.mode, "payload_zip");
    assert.equal(manifest.distribution.path, `payload/gpao-t-${RELEASE_VERSION}.zip`);
    assert.equal(manifest.installContract.noManualConnectionKey, true);
    assert.equal(manifest.installContract.devicePairingAutoApprove, true);
    assert.equal(manifest.installContract.service, "Windows Task Scheduler ONLOGON");
    assert.equal(manifest.files.some((record) => record.path.includes("node_modules/")), false);
    assert.equal(manifest.files.some((record) => record.path.startsWith(`gpao-t-${RELEASE_VERSION}/`)), false);
    const packagedInstallCmd = await fs.readFile(join(output, "GPAO-T-Install.cmd"), "utf8");
    assert.match(packagedInstallCmd, /\r\n/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
