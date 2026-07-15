#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GPAO_T_RELEASE_VERSION,
  buildGpaoTUpdateFeed,
  verifyGpaoTUpdateFeed,
} from "../src/core/update-boundary.js";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

async function sha256File(pathname) {
  const hash = createHash("sha256");
  hash.update(await readFile(pathname));
  return hash.digest("hex");
}

async function sha256FromSidecar(pathname) {
  try {
    const text = await readFile(`${pathname}.sha256`, "utf8");
    const match = text.match(/\b[a-f0-9]{64}\b/u);
    if (match) return match[0];
  } catch {
    // Fall back to hashing the archive directly.
  }
  return sha256File(pathname);
}

async function assetFor({ kind, path, releaseTag, platform = null }) {
  const resolved = resolve(path);
  const info = await stat(resolved);
  const name = basename(resolved);
  return {
    kind,
    name,
    platform,
    bytes: info.size,
    sha256: await sha256FromSidecar(resolved),
    url: `https://github.com/nbeai/gpao-t/releases/download/${releaseTag}/${name}`,
  };
}

async function pathExists(pathname) {
  try {
    await stat(pathname);
    return true;
  } catch {
    return false;
  }
}

export async function buildGithubUpdateFeed({
  version = GPAO_T_RELEASE_VERSION,
  distributionArchive,
  macosInstallerArchive,
  windowsInstallerArchive = null,
  output,
  releaseTag = version,
  releasePageUrl = `https://github.com/nbeai/gpao-t/releases/tag/${releaseTag}`,
}) {
  const assets = [
    await assetFor({
      kind: "production_distribution",
      path: distributionArchive,
      releaseTag,
    }),
    await assetFor({
      kind: "macos_installer",
      path: macosInstallerArchive,
      releaseTag,
      platform: "macos",
    }),
  ];
  if (windowsInstallerArchive && await pathExists(windowsInstallerArchive)) {
    assets.push(await assetFor({
      kind: "windows_installer",
      path: windowsInstallerArchive,
      releaseTag,
      platform: "windows-x64",
    }));
  }
  const feed = buildGpaoTUpdateFeed({
    version,
    releasePageUrl,
    assets,
  });
  const verification = verifyGpaoTUpdateFeed(feed);
  if (!verification.ok) throw new Error(`Generated update feed is invalid: ${verification.findings.join(", ")}`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(feed, null, 2)}\n`);
  return { status: "ready", output, feed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const version = arg("--version", GPAO_T_RELEASE_VERSION);
  const distributionArchive = arg(
    "--distribution-archive",
    join(PROJECT_ROOT, ".gpao-t", "releases", `gpao-t-${version}.zip`),
  );
  const macosInstallerArchive = arg(
    "--macos-installer-archive",
    join(PROJECT_ROOT, ".gpao-t", "releases", `gpao-t-${version}-macos-installer.zip`),
  );
  const windowsInstallerArchiveArg = arg(
    "--windows-installer-archive",
    join(PROJECT_ROOT, ".gpao-t", "releases", `gpao-t-${version}-windows-installer.zip`),
  );
  const windowsInstallerArchive = windowsInstallerArchiveArg ? resolve(windowsInstallerArchiveArg) : null;
  const output = arg(
    "--output",
    join(PROJECT_ROOT, "docs", "05-release", "update-feed", "gpao-t-update.json"),
  );
  const report = await buildGithubUpdateFeed({
    version,
    distributionArchive,
    macosInstallerArchive,
    windowsInstallerArchive,
    output: resolve(output),
    releaseTag: arg("--release-tag", version),
    releasePageUrl: arg("--release-page-url", `https://github.com/nbeai/gpao-t/releases/tag/${version}`),
  });
  console.log(JSON.stringify({ status: report.status, output: report.output, version: report.feed.version }, null, 2));
}
