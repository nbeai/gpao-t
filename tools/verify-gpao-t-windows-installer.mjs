#!/usr/bin/env node
import { execFile } from "node:child_process";
import { lstat, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertMatchingTrees,
  collectTree,
  extractZipArchive,
  hashFile,
  verifyArchiveChecksum,
  verifyDistributionManifest,
} from "./gpao-t-production-distribution-seal.mjs";
import { GPAO_T_RELEASE_CONTRACT } from "../src/core/release-contract.js";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const MANIFEST_NAME = "GPAO-T-WINDOWS-INSTALLER-MANIFEST.json";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

async function assertWindowsExecutable(pathname) {
  const data = await readFile(pathname);
  if (data.length < 2 || data[0] !== 0x4d || data[1] !== 0x5a) {
    throw new Error("Bundled node.exe does not look like a Windows PE executable");
  }
}

export async function verifyWindowsInstaller({ root, archive = null, runNode = process.platform === "win32" } = {}) {
  const outputRoot = resolve(root);
  const manifest = JSON.parse(await readFile(join(outputRoot, MANIFEST_NAME), "utf8"));
  if (manifest.schema !== "gpao_t.windows_installer_manifest.v1") throw new Error("Unsupported GPAO-T Windows installer manifest");
  if (manifest.productId !== GPAO_T_RELEASE_CONTRACT.productId || manifest.version !== GPAO_T_RELEASE_CONTRACT.version) {
    throw new Error("Installer identity does not match the GPAO-T release contract");
  }
  const actualFiles = (await collectTree(outputRoot, { skipManifest: true }))
    .filter((item) => item.path !== MANIFEST_NAME);
  assertMatchingTrees(manifest.files, actualFiles, "Windows installer manifest");
  if (manifest.fileCount !== actualFiles.length) throw new Error("Installer manifest fileCount mismatch");
  if (manifest.totalBytes !== actualFiles.reduce((sum, item) => sum + (item.size ?? 0), 0)) {
    throw new Error("Installer manifest totalBytes mismatch");
  }

  for (const entrypoint of [manifest.entrypoint, ...(manifest.helperEntrypoints || [])]) {
    const stat = await lstat(join(outputRoot, entrypoint));
    if (!stat.isFile()) throw new Error(`Missing Windows installer entrypoint: ${entrypoint}`);
  }
  const cmdSource = await readFile(join(outputRoot, manifest.entrypoint), "utf8");
  if (!cmdSource.includes("ExecutionPolicy Bypass")) throw new Error("Windows installer bootstrap must use process-scoped ExecutionPolicy Bypass");
  const scriptSource = await readFile(join(outputRoot, "installer", "windows", "GPAO-T-Windows.ps1"), "utf8");
  for (const required of ["schtasks.exe", "devices approve", "dashboard", "GPAO_T_UPDATE_FEED_URL"]) {
    if (!scriptSource.includes(required)) throw new Error(`Windows installer script missing contract marker: ${required}`);
  }
  for (const required of ["Expand-Archive", "Distribution payload SHA-256 mismatch"]) {
    if (!scriptSource.includes(required)) throw new Error(`Windows installer payload script missing contract marker: ${required}`);
  }

  const nodePath = join(outputRoot, manifest.runtimeNode.path);
  const nodeStat = await lstat(nodePath);
  if (!nodeStat.isFile()) throw new Error("Bundled node.exe is missing");
  await assertWindowsExecutable(nodePath);
  if (await hashFile(nodePath) !== manifest.runtimeNode.sha256) throw new Error("Bundled node.exe SHA-256 mismatch");

  let nodeVersion = null;
  if (runNode) {
    const node = await execFileAsync(nodePath, ["--version"], { encoding: "utf8" });
    nodeVersion = node.stdout.trim();
  }
  if (manifest.distribution.mode !== "payload_zip") throw new Error("Windows installer must use payload_zip distribution mode");
  const payloadPath = join(outputRoot, manifest.distribution.path);
  const payloadStat = await lstat(payloadPath);
  if (!payloadStat.isFile()) throw new Error("Windows installer payload archive is missing");
  if (await hashFile(payloadPath) !== manifest.distribution.sha256) throw new Error("Windows distribution payload SHA-256 mismatch");
  const payloadExtractRoot = await mkdtemp(join(tmpdir(), "gpao-t-windows-payload-"));
  let distribution;
  try {
    const distributionRoot = await extractZipArchive(payloadPath, payloadExtractRoot);
    if (basename(distributionRoot) !== manifest.distribution.rootName) {
      throw new Error("Windows distribution payload root name mismatch");
    }
    distribution = await verifyDistributionManifest(distributionRoot);
  } finally {
    await rm(payloadExtractRoot, { recursive: true, force: true });
  }
  let archiveSha256 = null;
  if (archive) archiveSha256 = await verifyArchiveChecksum(resolve(archive), `${resolve(archive)}.sha256`);
  return {
    status: "verified",
    root: outputRoot,
    version: manifest.version,
    architecture: manifest.architecture,
    nodeVersion,
    distributionIntegrity: distribution.schema,
    installerFileCount: manifest.fileCount,
    archiveSha256,
    runNode,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(arg("--root", join(PROJECT_ROOT, ".gpao-t", "releases", `gpao-t-${GPAO_T_RELEASE_CONTRACT.version}-windows-installer`)));
  const archive = process.argv.includes("--archive") ? resolve(arg("--archive", "")) : null;
  const runNode = process.argv.includes("--run-node") || process.platform === "win32";
  console.log(JSON.stringify(await verifyWindowsInstaller({ root, archive, runNode }), null, 2));
}
