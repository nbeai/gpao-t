#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_RUNTIME_SOURCE = resolve(
  REPO_ROOT,
  "..",
  "openclaw-clean-lab",
  "gpao-t-openclaw-dashboard-lab",
);

function arg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

async function collectCoreFiles(sourceDir) {
  return (await readdir(sourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => entry.name)
    .sort();
}

export async function syncGpaoTCoreIntoRuntimeSource({
  repoRoot = REPO_ROOT,
  runtimeSource = DEFAULT_RUNTIME_SOURCE,
} = {}) {
  const sourceDir = join(repoRoot, "src", "core");
  const targetDir = join(runtimeSource, "src", "gpao-t", "core");
  const manifestPath = join(runtimeSource, "src", "gpao-t", "core-manifest.json");
  const files = await collectCoreFiles(sourceDir);

  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });

  const entries = [];
  for (const name of files) {
    const source = join(sourceDir, name);
    const targetName = name;
    const target = join(targetDir, targetName);
    const body = await readFile(source);
    await copyFile(source, target);
    entries.push({
      source: `src/core/${name}`,
      target: `src/gpao-t/core/${targetName}`,
      sha256: sha256(body),
    });
  }

  const manifest = {
    schema: "gpao_t.embedded_core_manifest.v1",
    generatedAt: new Date().toISOString(),
    product: "nBeAI. GPAO-T",
    sourcePackage: "gpao-t/src/core",
    runtimeTarget: "src/gpao-t/core",
    fileCount: entries.length,
    entries,
    rule:
      "The runtime source owns this embedded GPAO-T core snapshot. Re-run the sync and full runtime build after core changes.",
  };
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await syncGpaoTCoreIntoRuntimeSource({
    runtimeSource: resolve(arg("--runtime-source", DEFAULT_RUNTIME_SOURCE)),
  });
  console.log(JSON.stringify(report, null, 2));
}
