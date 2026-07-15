#!/usr/bin/env node
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectTree,
  createZipArchive,
  verifyDistributionManifest,
} from "./gpao-t-production-distribution-seal.mjs";
import { GPAO_T_RELEASE_CONTRACT } from "../src/core/release-contract.js";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const VERSION = GPAO_T_RELEASE_CONTRACT.version;
const INSTALLER_MANIFEST = "GPAO-T-WINDOWS-INSTALLER-MANIFEST.json";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

async function hashFile(pathname) {
  const hash = createHash("sha256");
  hash.update(await readFile(pathname));
  return hash.digest("hex");
}

async function copyFile(source, destination) {
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
}

function toWindowsLineEndings(text) {
  return text.replace(/\r?\n/g, "\r\n");
}

async function copyTemplate(source, destination, replacements, options = {}) {
  let text = await readFile(source, "utf8");
  for (const [needle, replacement] of Object.entries(replacements)) text = text.replaceAll(needle, replacement);
  if (options.crlf) text = toWindowsLineEndings(text);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, text);
}

export async function buildWindowsInstaller({
  distribution,
  output,
  archive,
  nodeWinX64,
  architecture = "x64",
}) {
  if (!nodeWinX64) throw new Error("Windows installer build requires --node-win-x64 <path-to-node.exe>");
  const sourceDistribution = resolve(distribution);
  const outputRoot = resolve(output);
  const archivePath = resolve(archive);
  const nodeSource = resolve(nodeWinX64);
  await verifyDistributionManifest(sourceDistribution);

  await rm(outputRoot, { recursive: true, force: true });
  await rm(archivePath, { force: true });
  await mkdir(outputRoot, { recursive: true });

  const payloadStageRoot = join(outputRoot, ".payload-stage");
  const payloadStageDistribution = join(payloadStageRoot, `gpao-t-${VERSION}`);
  await cp(sourceDistribution, payloadStageDistribution, { recursive: true, verbatimSymlinks: true });
  const payloadArchive = join(outputRoot, "payload", `gpao-t-${VERSION}.zip`);
  const payloadRecord = await createZipArchive(payloadStageDistribution, payloadArchive);
  await rm(payloadStageRoot, { recursive: true, force: true });
  const nodeRuntimePath = join(outputRoot, "runtime", "node.exe");
  await copyFile(nodeSource, nodeRuntimePath);

  const replacements = {
    "@@PACKAGE_VERSION@@": VERSION,
    "@@PACKAGE_ARCH@@": architecture,
  };
  for (const name of [
    "GPAO-T-Install.cmd",
    "GPAO-T-Start.cmd",
    "GPAO-T-Stop.cmd",
    "GPAO-T-Repair.cmd",
    "GPAO-T-Uninstall.cmd",
  ]) {
    await copyTemplate(join(PROJECT_ROOT, "installer", "windows", name), join(outputRoot, name), replacements, { crlf: true });
  }
  await copyTemplate(
    join(PROJECT_ROOT, "installer", "windows", "GPAO-T-Windows.ps1"),
    join(outputRoot, "installer", "windows", "GPAO-T-Windows.ps1"),
    replacements,
  );
  await copyFile(join(PROJECT_ROOT, "installer", "WINDOWS-README.md"), join(outputRoot, "README.txt"));
  await copyFile(join(PROJECT_ROOT, "LICENSE"), join(outputRoot, "LICENSE"));
  await copyFile(join(PROJECT_ROOT, "THIRD_PARTY_NOTICES.md"), join(outputRoot, "THIRD_PARTY_NOTICES.md"));

  const files = await collectTree(outputRoot, { skipManifest: true });
  const manifest = {
    schema: "gpao_t.windows_installer_manifest.v1",
    productId: GPAO_T_RELEASE_CONTRACT.productId,
    product: "nBeAI. GPAO-T",
    version: VERSION,
    platform: "windows",
    architecture,
    generatedAt: new Date().toISOString(),
    entrypoint: "GPAO-T-Install.cmd",
    helperEntrypoints: [
      "GPAO-T-Start.cmd",
      "GPAO-T-Stop.cmd",
      "GPAO-T-Repair.cmd",
      "GPAO-T-Uninstall.cmd",
    ],
    runtimeNode: {
      path: "runtime/node.exe",
      source: nodeSource,
      architecture,
      sha256: await hashFile(nodeRuntimePath),
    },
    distribution: {
      mode: "payload_zip",
      path: `payload/gpao-t-${VERSION}.zip`,
      rootName: `gpao-t-${VERSION}`,
      sha256: payloadRecord.sha256,
      manifest: JSON.parse(await readFile(join(sourceDistribution, "GPAO-T-DISTRIBUTION-MANIFEST.json"), "utf8")),
    },
    installContract: {
      stateHome: "%USERPROFILE%\\.gpao-t",
      service: "Windows Task Scheduler ONLOGON",
      noManualConnectionKey: true,
      dashboardAutoOpen: true,
      devicePairingAutoApprove: true,
      updateFeed: "https://github.com/nbeai/gpao-t/releases/latest/download/gpao-t-update.json",
      preservesUserDataOnUninstall: true,
    },
    fileCount: files.length,
    totalBytes: files.reduce((sum, item) => sum + (item.size ?? 0), 0),
    files,
  };
  await writeFile(join(outputRoot, INSTALLER_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  const archiveRecord = await createZipArchive(outputRoot, archivePath);
  const checksumPath = `${archivePath}.sha256`;
  await writeFile(checksumPath, `${archiveRecord.sha256}  ${archivePath.slice(archivePath.lastIndexOf("/") + 1)}\n`);
  return {
    output: outputRoot,
    archive: archiveRecord.path,
    archiveSha256: archiveRecord.sha256,
    checksum: checksumPath,
    manifestPath: join(outputRoot, INSTALLER_MANIFEST),
    architecture,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const distribution = resolve(arg("--distribution", join(PROJECT_ROOT, ".gpao-t", "releases", `gpao-t-${VERSION}`)));
  const output = resolve(arg("--output", join(PROJECT_ROOT, ".gpao-t", "releases", `gpao-t-${VERSION}-windows-installer`)));
  const archive = resolve(arg("--archive", `${output}.zip`));
  const report = await buildWindowsInstaller({
    distribution,
    output,
    archive,
    nodeWinX64: arg("--node-win-x64", process.env.GPAO_T_WINDOWS_NODE_EXE || ""),
    architecture: arg("--architecture", "x64"),
  });
  console.log(JSON.stringify({ status: "sealed", ...report }, null, 2));
}
