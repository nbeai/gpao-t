import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { canonicalDigest } from "../src/core/canonical-json.js";
import { semanticContractDigest } from "../src/core/semantic-runtime-contract.js";

const root = new URL("../", import.meta.url);
const evidenceDir = new URL("../../engineering/evidence/mct-r5s0-contract-freeze-2026-07-16/", import.meta.url);
const seal = JSON.parse(fs.readFileSync(new URL("../test/fixtures/mct-r5s0-seal.json", import.meta.url), "utf8"));
const candidates = JSON.parse(fs.readFileSync(new URL("../test/fixtures/mct-r5s0-model-candidates.json", import.meta.url), "utf8"));

function run(command, args, { timeout = 180_000 } = {}) {
  const started = performance.now();
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    maxBuffer: 64 * 1024 * 1024,
    timeout
  });
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  return {
    command: [command, ...args].join(" "),
    status: result.status === 0 ? "pass" : "fail",
    exitCode: result.status,
    signal: result.signal,
    durationMs: Math.round((performance.now() - started) * 1000) / 1000,
    outputDigest: canonicalDigest("gpao_t3.mct_r5s0_check_output.v1", { stdout, stderr }),
    stdout,
    stderr
  };
}

function git(args) {
  const result = run("git", args, { timeout: 30_000 });
  if (result.status !== "pass") throw new Error(result.stderr.trim() || `${result.command} failed`);
  return result.stdout.trim();
}

const findings = [];
const sourceShaBefore = git(["rev-parse", "HEAD"]);
const dirtyBefore = git(["status", "--porcelain"]);
if (dirtyBefore) findings.push("worktree_not_clean_before_qualification");
if (semanticContractDigest() !== seal.contractDigest) findings.push("contract_digest_mismatch");
if (canonicalDigest(seal.candidateMatrixDigestDomain, candidates) !== seal.candidateMatrixDigest) findings.push("candidate_matrix_digest_mismatch");
if (seal.status !== "contract_frozen_pending_clean_checkpoint") findings.push("invalid_seal_status");
if (seal.entryDecision.modelSelected || seal.entryDecision.modelDownloaded || candidates.selection !== null) findings.push("r5s0_model_boundary_violated");
const baseline = run("git", ["merge-base", "--is-ancestor", seal.sourceInputBaselineCommit, sourceShaBefore], { timeout: 30_000 });
if (baseline.status !== "pass") findings.push("source_baseline_not_ancestor");

const checks = [];
if (findings.length === 0) {
  checks.push(run("npm", ["run", "precheck"]));
  checks.push(run("npm", ["test"]));
  checks.push(run("npm", ["run", "benchmark:mct-r1"]));
  for (const check of checks) if (check.status !== "pass") findings.push(`check_failed:${check.command}`);
}

const sourceShaAfter = git(["rev-parse", "HEAD"]);
const dirtyAfter = git(["status", "--porcelain"]);
if (sourceShaAfter !== sourceShaBefore) findings.push("source_sha_changed_during_qualification");
if (dirtyAfter) findings.push("worktree_not_clean_after_qualification");

const checkReceipts = checks.map(({ stdout, stderr, ...receipt }) => receipt);
const receiptPayload = {
  schema: "gpao_t3.mct_r5s0_checkpoint_receipt.v1",
  sourceSha: sourceShaAfter,
  sourceStable: sourceShaBefore === sourceShaAfter,
  worktree: dirtyAfter ? "dirty" : "clean",
  contractDigest: semanticContractDigest(),
  candidateMatrixDigest: canonicalDigest(seal.candidateMatrixDigestDomain, candidates),
  checks: checkReceipts,
  modelSelected: false,
  modelDownloaded: false,
  nextStage: findings.length ? null : "MCT-R5S1",
  gate: findings.length ? "hold" : "pass",
  findings
};
const receipt = {
  ...receiptPayload,
  receiptDigest: canonicalDigest("gpao_t3.mct_r5s0_checkpoint_receipt.v1", receiptPayload)
};

if (!dirtyBefore) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  for (const [index, check] of checks.entries()) {
    fs.writeFileSync(new URL(`check-${index + 1}.stdout.log`, evidenceDir), check.stdout);
    fs.writeFileSync(new URL(`check-${index + 1}.stderr.log`, evidenceDir), check.stderr);
  }
  fs.writeFileSync(new URL("checkpoint-receipt.json", evidenceDir), `${JSON.stringify(receipt, null, 2)}\n`);
}

console.log(JSON.stringify(receipt, null, 2));
if (findings.length) process.exitCode = 1;
