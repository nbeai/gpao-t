#!/usr/bin/env node
import { execFile } from "node:child_process";
import { lstat, readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertMatchingTrees,
  collectTree,
  hashFile,
  verifyArchiveChecksum,
  verifyDistributionManifest,
} from "./gpao-t-production-distribution-seal.mjs";
import { GPAO_T_RELEASE_CONTRACT } from "../src/core/release-contract.js";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const MANIFEST_NAME = "GPAO-T-INSTALLER-MANIFEST.json";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

export async function verifyMacosInstaller({ root, archive = null } = {}) {
  const outputRoot = resolve(root);
  const manifest = JSON.parse(await readFile(join(outputRoot, MANIFEST_NAME), "utf8"));
  if (manifest.schema !== "gpao_t.macos_installer_manifest.v1") throw new Error("Unsupported GPAO-T macOS installer manifest");
  if (manifest.productId !== GPAO_T_RELEASE_CONTRACT.productId || manifest.version !== GPAO_T_RELEASE_CONTRACT.version) {
    throw new Error("Installer identity does not match the GPAO-T release contract");
  }
  const actualFiles = (await collectTree(outputRoot, { skipManifest: true }))
    .filter((item) => item.path !== MANIFEST_NAME);
  assertMatchingTrees(manifest.files, actualFiles, "macOS installer manifest");
  if (manifest.fileCount !== actualFiles.length) throw new Error("Installer manifest fileCount mismatch");
  if (manifest.totalBytes !== actualFiles.reduce((sum, item) => sum + (item.size ?? 0), 0)) {
    throw new Error("Installer manifest totalBytes mismatch");
  }

  const commandPath = join(outputRoot, manifest.entrypoint);
  const commandStat = await lstat(commandPath);
  if (!commandStat.isFile() || (commandStat.mode & 0o111) === 0) throw new Error("Installer entrypoint is not executable");
  const nodePath = join(outputRoot, manifest.runtimeNode.path);
  const nodeStat = await lstat(nodePath);
  if (!nodeStat.isFile() || (nodeStat.mode & 0o111) === 0) throw new Error("Bundled Node is not executable");
  if (await hashFile(nodePath) !== manifest.runtimeNode.sha256) throw new Error("Bundled Node SHA-256 mismatch");
  const lipo = await execFileAsync("lipo", ["-info", nodePath], { encoding: "utf8" });
  const lipoOutput = `${lipo.stdout || ""}\n${lipo.stderr || ""}`;
  const actualArchitectures = lipoOutput.match(/are:\s+(.+)$/m)
    ? lipoOutput.match(/are:\s+(.+)$/m)[1].trim().split(/\s+/u).map((value) => value === "x86_64" ? "x64" : value).sort()
    : [lipoOutput.match(/architecture:\s*(\S+)/u)?.[1]].filter(Boolean).map((value) => value === "x86_64" ? "x64" : value);
  const expectedArchitectures = [...(manifest.runtimeNode.architectures ?? [manifest.architecture])].sort();
  if (JSON.stringify(actualArchitectures) !== JSON.stringify(expectedArchitectures)) {
    throw new Error(`Bundled Node architecture mismatch: expected ${expectedArchitectures.join(",")}, found ${actualArchitectures.join(",")}`);
  }
  const node = await execFileAsync(nodePath, ["--version"], { encoding: "utf8" });
  const distributionRoot = join(outputRoot, manifest.distribution.path);
  const distribution = await verifyDistributionManifest(distributionRoot);
  let archiveSha256 = null;
  if (archive) archiveSha256 = await verifyArchiveChecksum(resolve(archive), `${resolve(archive)}.sha256`);
  return {
    status: "verified",
    root: outputRoot,
    version: manifest.version,
    architecture: manifest.architecture,
    nodeVersion: node.stdout.trim(),
    distributionIntegrity: distribution.schema,
    installerFileCount: manifest.fileCount,
    archiveSha256,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(arg("--root", join(PROJECT_ROOT, ".gpao-t", "releases", `gpao-t-${GPAO_T_RELEASE_CONTRACT.version}-macos-installer`)));
  const archive = process.argv.includes("--archive") ? resolve(arg("--archive", "")) : null;
  console.log(JSON.stringify(await verifyMacosInstaller({ root, archive }), null, 2));
}
