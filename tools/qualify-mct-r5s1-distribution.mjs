import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { canonicalDigest } from "../src/core/canonical-json.js";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const evidenceDir = new URL("../../engineering/evidence/mct-r5s1-distribution-2026-07-16/", import.meta.url);

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || null;
}

function run(command, args, timeout = 240_000) {
  const startedAt = performance.now();
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" }, maxBuffer: 64 * 1024 * 1024, timeout });
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  return {
    command: [command, ...args].join(" "), status: result.status === 0 ? "pass" : "fail", exitCode: result.status, signal: result.signal,
    durationMs: Math.round((performance.now() - startedAt) * 1000) / 1000,
    outputDigest: canonicalDigest("gpao_t3.mct_r5s1_distribution_check_output.v1", { stdout, stderr }), stdout, stderr
  };
}

function git(args) {
  const result = run("git", args, 30_000);
  if (result.status !== "pass") throw new Error(result.stderr.trim() || `${result.command} failed`);
  return result.stdout.trim();
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const bundleReceiptPath = option("--bundle-receipt");
const macosSmokePath = option("--macos-smoke");
if (!bundleReceiptPath || !macosSmokePath) throw new Error("Usage: node tools/qualify-mct-r5s1-distribution.mjs --bundle-receipt <json> --macos-smoke <json>");
const sourceShaBefore = git(["rev-parse", "HEAD"]);
const findings = [];
if (git(["status", "--porcelain"])) findings.push("worktree_not_clean_before_qualification");
const bundle = JSON.parse(fs.readFileSync(path.resolve(bundleReceiptPath), "utf8"));
const macos = JSON.parse(fs.readFileSync(path.resolve(macosSmokePath), "utf8"));
if (bundle.status !== "conditional_windows_qualification_only" || bundle.productionAssetSelected || bundle.productionDefaultEnabled) findings.push("conditional_bundle_boundary_violated");
if (macos.platform !== "darwin-arm64" || macos.remoteModelsAllowed || macos.productionAssetSelected || !macos.normalized || macos.dimensions !== 384) findings.push("macos_offline_smoke_invalid");
if (macos.bundleSha256 !== bundle.archiveSha256 || macos.assetManifestDigest !== bundle.assetManifestDigest) findings.push("macos_bundle_binding_mismatch");

const checks = [];
if (!findings.length) {
  checks.push(run("npm", ["run", "precheck"]));
  checks.push(run("npm", ["run", "test:mct-r5s1"]));
  checks.push(run("npm", ["run", "package:release"]));
  checks.push(run("npm", ["run", "release:update-rollback-smoke"]));
  for (const check of checks) if (check.status !== "pass") findings.push(`check_failed:${check.command}`);
}

const releasesDir = path.join(root, ".gpao-t3", "releases");
const currentManifest = fs.readdirSync(releasesDir)
  .filter(file => file.endsWith(".manifest.json"))
  .map(file => JSON.parse(fs.readFileSync(path.join(releasesDir, file), "utf8")))
  .filter(manifest => manifest.sourceCommit === sourceShaBefore && manifest.sourceDirty === false)
  .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))[0];
if (!currentManifest) findings.push("clean_release_manifest_missing");
else {
  const archive = path.join(releasesDir, currentManifest.archive);
  if (!fs.existsSync(archive) || sha256(archive) !== currentManifest.sha256) findings.push("release_archive_checksum_mismatch");
  const listed = run("tar", ["-tzf", archive], 60_000);
  if (listed.status !== "pass") findings.push("release_archive_unreadable");
  else if (/(^|\/)(model\.onnx|ASSET-MANIFEST\.json|embedding-intfloat-multilingual-e5-small|model-cache)(\/|$)/m.test(listed.stdout)) findings.push("conditional_model_asset_leaked_into_release");
}
const sourceShaAfter = git(["rev-parse", "HEAD"]);
const dirtyAfter = git(["status", "--porcelain"]);
if (sourceShaAfter !== sourceShaBefore) findings.push("source_sha_changed_during_qualification");
if (dirtyAfter) findings.push("worktree_not_clean_after_qualification");
const checkReceipts = checks.map(({ stdout, stderr, ...receipt }) => receipt);
const payload = {
  schema: "gpao_t3.mct_r5s1_distribution_checkpoint.v1",
  sourceSha: sourceShaAfter,
  sourceStable: sourceShaBefore === sourceShaAfter,
  worktree: dirtyAfter ? "dirty" : "clean",
  bundleReceiptDigest: bundle.receiptDigest,
  macosSmokeReceiptDigest: macos.receiptDigest,
  release: currentManifest ? { releaseId: currentManifest.releaseId, archive: currentManifest.archive, sha256: currentManifest.sha256 } : null,
  productionAssetSelected: false,
  windowsNativeSmoke: "pending_external_windows_host",
  checks: checkReceipts,
  gate: findings.length ? "hold" : "pass",
  findings
};
const receipt = { ...payload, receiptDigest: canonicalDigest("gpao_t3.mct_r5s1_distribution_checkpoint.v1", payload) };
if (!dirtyAfter) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.copyFileSync(path.resolve(bundleReceiptPath), new URL("conditional-bundle-receipt.json", evidenceDir));
  fs.copyFileSync(path.resolve(macosSmokePath), new URL("macos-offline-smoke.json", evidenceDir));
  for (const [index, check] of checks.entries()) {
    fs.writeFileSync(new URL(`check-${index + 1}.stdout.log`, evidenceDir), check.stdout);
    fs.writeFileSync(new URL(`check-${index + 1}.stderr.log`, evidenceDir), check.stderr);
  }
  fs.writeFileSync(new URL("checkpoint-receipt.json", evidenceDir), `${JSON.stringify(receipt, null, 2)}\n`);
}
console.log(JSON.stringify(receipt, null, 2));
if (findings.length) process.exitCode = 1;
