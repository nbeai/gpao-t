#!/usr/bin/env node
import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MANIFEST_NAME,
  collectTree,
  treeDigest,
  verifyDistributionManifest,
} from "./gpao-t-production-distribution-seal.mjs";

const DEFAULT_RELEASE_ROOT = process.env.GPAO_T_LIVE_RELEASE || "/Users/jyp/.gpao-t/current";
const DEFAULT_EVIDENCE_ROOT =
  process.env.GPAO_T_RESEAL_EVIDENCE_ROOT ||
  "/Users/jyp/Developer/gpao-t/docs/03-verification/evidence/live-distribution-reseal";
const APPLY_TOKEN = "apply-gpao-t-live-distribution-reseal";

function hasArg(name) {
  return process.argv.includes(name);
}

function readArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || "";
}

function isoStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function fingerprint(record) {
  return JSON.stringify({
    kind: record.kind,
    size: record.size ?? null,
    sha256: record.sha256,
    target: record.target ?? null,
  });
}

export function diffManifestRecords(expected = [], actual = []) {
  const expectedMap = new Map(expected.map((record) => [record.path, record]));
  const actualMap = new Map(actual.map((record) => [record.path, record]));
  const changed = [];
  const missing = [];
  const unexpected = [];
  for (const path of [...new Set([...expectedMap.keys(), ...actualMap.keys()])].sort()) {
    const before = expectedMap.get(path);
    const after = actualMap.get(path);
    if (!before) unexpected.push(path);
    else if (!after) missing.push(path);
    else if (fingerprint(before) !== fingerprint(after)) changed.push(path);
  }
  return { changed, missing, unexpected };
}

export async function prepareLiveReseal({
  releaseRoot = DEFAULT_RELEASE_ROOT,
  evidenceManifest = null,
} = {}) {
  const manifestPath = join(releaseRoot, MANIFEST_NAME);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = await collectTree(releaseRoot, { skipManifest: true });
  const runtimeRoot = join(releaseRoot, "compatibility", "gpao-t");
  const ignoredStageTopLevel = manifest.runtimeProvenance?.ignoredStageTopLevel ?? ["node_modules"];
  const runtimeRecords = await collectTree(runtimeRoot, { ignoreTopLevel: ignoredStageTopLevel });
  const differences = diffManifestRecords(manifest.files, files);
  const totalBytes = files.reduce((sum, record) => sum + (record.size ?? 0), 0);
  const generatedAt = new Date().toISOString();
  const nextManifest = {
    ...manifest,
    generatedAt,
    fileCount: files.length,
    totalBytes,
    files,
    runtimeProvenance: {
      ...manifest.runtimeProvenance,
      distributionRuntimeTreeSha256: treeDigest(runtimeRecords),
      distributionRuntimeFileCount: runtimeRecords.length,
      distributionRuntimeBytes: runtimeRecords.reduce((sum, record) => sum + (record.size ?? 0), 0),
    },
    liveReseals: [
      ...(Array.isArray(manifest.liveReseals) ? manifest.liveReseals : []),
      {
        generatedAt,
        reason: "approved_live_surface_hardening",
        evidenceManifest,
        changedFileCount: differences.changed.length,
        missingFileCount: differences.missing.length,
        unexpectedFileCount: differences.unexpected.length,
      },
    ],
  };
  return { manifestPath, manifest, nextManifest, files, runtimeRecords, differences };
}

async function main() {
  const releaseRoot = resolve(readArg("--release-root", DEFAULT_RELEASE_ROOT));
  const evidenceManifest = readArg("--evidence-manifest", "") || null;
  const apply = hasArg("--apply");
  const approvalToken = readArg("--approval-token", "");
  const prepared = await prepareLiveReseal({ releaseRoot, evidenceManifest });
  const summary = {
    schema: "gpao_t.live_distribution_reseal.v0_1",
    generatedAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    releaseRoot,
    manifestPath: prepared.manifestPath,
    differences: prepared.differences,
    nextFileCount: prepared.nextManifest.fileCount,
    nextTotalBytes: prepared.nextManifest.totalBytes,
    nextRuntimeTreeSha256: prepared.nextManifest.runtimeProvenance.distributionRuntimeTreeSha256,
    evidenceManifest,
  };

  if (!apply) {
    console.log(JSON.stringify({ ...summary, status: "reseal_required" }, null, 2));
    return;
  }
  if (approvalToken !== APPLY_TOKEN) {
    console.error(JSON.stringify({
      ...summary,
      status: "refused",
      reason: "missing_or_invalid_approval_token",
      required: `--apply --approval-token ${APPLY_TOKEN}`,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  const evidenceDir = join(DEFAULT_EVIDENCE_ROOT, isoStamp());
  await mkdir(evidenceDir, { recursive: true });
  const backupPath = join(evidenceDir, `${MANIFEST_NAME}.before-reseal`);
  await copyFile(prepared.manifestPath, backupPath);
  const tempPath = join(dirname(prepared.manifestPath), `.${MANIFEST_NAME}.tmp-${process.pid}`);
  await writeFile(tempPath, `${JSON.stringify(prepared.nextManifest, null, 2)}\n`);
  await rename(tempPath, prepared.manifestPath);
  await verifyDistributionManifest(releaseRoot, { allowLegacy: true });
  const reportPath = join(evidenceDir, "report.json");
  const report = { ...summary, status: "sealed", backupPath, reportPath };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
