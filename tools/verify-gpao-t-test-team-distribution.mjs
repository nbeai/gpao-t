#!/usr/bin/env node
import { access, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  extractZipArchive,
  runHealthSmoke,
  runHelpSmoke,
  validateContainedSymlinks,
  verifyArchiveChecksum,
  verifyCurrentSourceBuild,
  verifyDistributionManifest,
} from "./gpao-t-test-team-distribution-seal.mjs";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_SOURCE_BUILD = resolve(
  PROJECT_ROOT,
  "..",
  "openclaw-clean-lab",
  "gpao-t-openclaw-dashboard-lab",
);

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const archiveValue = arg("--archive", process.argv[2]?.startsWith("-") ? undefined : process.argv[2]);
  if (!archiveValue) {
    throw new Error(
      "usage: node tools/verify-gpao-t-test-team-distribution.mjs --archive <archive.zip> [--checksum <archive.zip.sha256>] [--source-build <path>] [--skip-source-build-check]",
    );
  }
  const archive = resolve(archiveValue);
  const checksum = resolve(arg("--checksum", `${archive}.sha256`));
  const sourceBuild = resolve(arg("--source-build", DEFAULT_SOURCE_BUILD));
  const skipSourceBuildCheck = hasFlag("--skip-source-build-check");
  if (!(await pathExists(checksum))) throw new Error(`SHA-256 sidecar not found: ${checksum}`);
  if (!skipSourceBuildCheck && !(await pathExists(sourceBuild))) {
    throw new Error(`source build not found: ${sourceBuild}; use --skip-source-build-check only for source-less readback`);
  }

  const workRoot = await mkdtemp(join(tmpdir(), "gpao-t-distribution-verify-"));
  const extractionRoot = join(workRoot, "extract");
  const isolationRoot = join(workRoot, "isolation");
  try {
    const archiveSha256 = await verifyArchiveChecksum(archive, checksum);
    const distributionRoot = await extractZipArchive(archive, extractionRoot);
    await validateContainedSymlinks(distributionRoot);
    const { manifest, runtimeRecords } = await verifyDistributionManifest(distributionRoot);
    const currentSourceBuildSha256 = skipSourceBuildCheck
      ? null
      : await verifyCurrentSourceBuild({
          sourceBuild,
          runtimeRecords,
          provenance: manifest.runtimeProvenance,
        });
    const helpSmoke = await runHelpSmoke(distributionRoot, isolationRoot);
    const healthSmoke = await runHealthSmoke(distributionRoot, isolationRoot);
    console.log(
      JSON.stringify(
        {
          status: "verified",
          archive,
          archiveSha256,
          checksum,
          manifest: {
            schema: manifest.schema,
            version: manifest.version,
            fileCount: manifest.fileCount,
            totalBytes: manifest.totalBytes,
          },
          runtimeProvenance: {
            sourceBuildTreeSha256: manifest.runtimeProvenance.sourceBuildTreeSha256,
            runtimeStageTreeSha256: manifest.runtimeProvenance.runtimeStageTreeSha256,
            currentSourceBuildSha256,
            sourceBuildChecked: !skipSourceBuildCheck,
          },
          smoke: { help: helpSmoke, health: healthSmoke },
          isolation: {
            temporaryRootCleanup: "on_exit",
            liveStateMutation: false,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await rm(workRoot, { recursive: true, force: true });
  }
}

await main();
