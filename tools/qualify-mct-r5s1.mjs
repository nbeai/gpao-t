import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { canonicalDigest } from "../src/core/canonical-json.js";

const root = new URL("../", import.meta.url);
const evidenceDir = new URL("../../engineering/evidence/mct-r5s1-embedding-qualification-2026-07-16/", import.meta.url);
const fixture = JSON.parse(fs.readFileSync(new URL("../test/fixtures/mct-r5s1-qualification.json", import.meta.url), "utf8"));

function run(command, args, timeout = 180_000) {
  const started = performance.now();
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" }, maxBuffer: 64 * 1024 * 1024, timeout });
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  return {
    command: [command, ...args].join(" "), status: result.status === 0 ? "pass" : "fail",
    exitCode: result.status, signal: result.signal,
    durationMs: Math.round((performance.now() - started) * 1000) / 1000,
    outputDigest: canonicalDigest("gpao_t3.mct_r5s1_check_output.v1", { stdout, stderr }), stdout, stderr
  };
}

function git(args) {
  const result = run("git", args, 30_000);
  if (result.status !== "pass") throw new Error(result.stderr.trim() || `${result.command} failed`);
  return result.stdout.trim();
}

function fileSha256(name) {
  const content = fs.readFileSync(new URL(name, evidenceDir));
  return crypto.createHash("sha256").update(content).digest("hex");
}

const findings = [];
const sourceShaBefore = git(["rev-parse", "HEAD"]);
const dirtyBefore = git(["status", "--porcelain"]);
if (dirtyBefore) findings.push("worktree_not_clean_before_qualification");
const { qualificationDigest, ...qualificationPayload } = fixture;
if (canonicalDigest(fixture.qualificationDigestDomain, qualificationPayload) !== qualificationDigest) findings.push("qualification_digest_mismatch");
if (fileSha256("candidate-receipt.json") !== fixture.evidenceBinding.e5ReceiptSha256) findings.push("e5_receipt_digest_mismatch");
if (fileSha256("minilm-receipt.json") !== fixture.evidenceBinding.minilmReceiptSha256) findings.push("minilm_receipt_digest_mismatch");
if (fileSha256("qualify-e5.mjs") !== fixture.evidenceBinding.qualifierScriptSha256) findings.push("qualifier_script_digest_mismatch");
if (fs.existsSync(fixture.testAssetLifecycle.temporaryRoot)) findings.push("temporary_test_assets_remain");
if (fixture.recommendation.selected || fixture.platformQualification.productionAssetSelected) findings.push("production_selection_boundary_violated");
if (fixture.platformQualification.windowsNativeSmoke !== "pending_external_windows_host") findings.push("windows_boundary_drift");

const checks = [];
if (!findings.length) {
  checks.push(run("npm", ["run", "precheck"]));
  checks.push(run("npm", ["run", "test:mct-r5s1"]));
  checks.push(run("npm", ["test"]));
  for (const check of checks) if (check.status !== "pass") findings.push(`check_failed:${check.command}`);
}

const sourceShaAfter = git(["rev-parse", "HEAD"]);
const dirtyAfter = git(["status", "--porcelain"]);
if (sourceShaAfter !== sourceShaBefore) findings.push("source_sha_changed_during_qualification");
if (dirtyAfter) findings.push("worktree_not_clean_after_qualification");
const checkReceipts = checks.map(({ stdout, stderr, ...receipt }) => receipt);
const payload = {
  schema: "gpao_t3.mct_r5s1_checkpoint_receipt.v1",
  sourceSha: sourceShaAfter,
  sourceStable: sourceShaBefore === sourceShaAfter,
  worktree: dirtyAfter ? "dirty" : "clean",
  qualificationDigest,
  checks: checkReceipts,
  conditionalShortlist: findings.length ? null : fixture.recommendation.candidateId,
  productionAssetSelected: false,
  windowsNativeSmoke: fixture.platformQualification.windowsNativeSmoke,
  nextAuthorityBoundary: findings.length ? null : "Windows_native_host_execution",
  gate: findings.length ? "hold" : "pass",
  findings
};
const receipt = { ...payload, receiptDigest: canonicalDigest("gpao_t3.mct_r5s1_checkpoint_receipt.v1", payload) };

if (!dirtyBefore) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  for (const [index, check] of checks.entries()) {
    fs.writeFileSync(new URL(`checkpoint-check-${index + 1}.stdout.log`, evidenceDir), check.stdout);
    fs.writeFileSync(new URL(`checkpoint-check-${index + 1}.stderr.log`, evidenceDir), check.stderr);
  }
  fs.writeFileSync(new URL("checkpoint-receipt.json", evidenceDir), `${JSON.stringify(receipt, null, 2)}\n`);
}
console.log(JSON.stringify(receipt, null, 2));
if (findings.length) process.exitCode = 1;
