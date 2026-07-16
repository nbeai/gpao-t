import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { conditionalEmbeddingAssetManifest } from "../src/core/conditional-embedding-bundle.js";
import { canonicalDigest } from "../src/core/canonical-json.js";

function args(argv) {
  const value = new Map();
  for (let index = 2; index < argv.length; index += 2) value.set(argv[index], argv[index + 1]);
  return value;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const values = args(process.argv);
const modelRoot = values.get("--model-root");
const outputDir = values.get("--output-dir");
if (!modelRoot || !outputDir) throw new Error("Usage: node tools/package-conditional-embedding-bundle.mjs --model-root <revision-directory> --output-dir <directory> [--source-commit <sha>]");
const qualification = JSON.parse(fs.readFileSync(new URL("../test/fixtures/mct-r5s1-qualification.json", import.meta.url), "utf8"));
const candidate = qualification.candidates.find(item => item.candidateId === qualification.recommendation.candidateId);
if (!candidate || qualification.recommendation.selected) throw new Error("The R5S1 fixture does not permit conditional bundle creation");
const root = path.resolve(new URL("..", import.meta.url).pathname);
const sourceCommit = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
const sourceStatus = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
if (sourceCommit.status !== 0 || sourceStatus.status !== 0 || sourceStatus.stdout.trim()) throw new Error("Conditional embedding bundles require a clean source checkpoint");
const resolvedCommit = sourceCommit.stdout.trim();
if (values.get("--source-commit") && values.get("--source-commit") !== resolvedCommit) throw new Error("Conditional embedding bundle source commit does not match HEAD");
const manifest = conditionalEmbeddingAssetManifest({ modelRoot, candidate, sourceCommit: resolvedCommit });
const destination = path.resolve(outputDir);
fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
const staging = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-conditional-embedding-"));
const temporaryArchive = path.join(destination, `.${candidate.candidateId}.${process.pid}.tmp.tar.gz`);
const archive = path.join(destination, `${candidate.candidateId}.tar.gz`);
const receiptPath = path.join(destination, `${candidate.candidateId}.bundle-receipt.json`);
try {
  fs.cpSync(path.resolve(modelRoot), path.join(staging, "model"), { recursive: true, dereference: false });
  fs.writeFileSync(path.join(staging, "ASSET-MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  const packed = spawnSync("tar", ["-czf", temporaryArchive, "model", "ASSET-MANIFEST.json"], { cwd: staging, encoding: "utf8" });
  if (packed.status !== 0) throw new Error(packed.stderr || "Could not create conditional embedding bundle");
  const checksum = sha256(temporaryArchive);
  const payload = {
    schema: "gpao_t3.conditional_embedding_bundle_receipt.v1",
    status: "conditional_windows_qualification_only",
    candidateId: candidate.candidateId,
    archive: path.basename(archive),
    archiveSha256: checksum,
    assetManifestDigest: manifest.manifestDigest,
    productionAssetSelected: false,
    productionDefaultEnabled: false,
    nextGate: "windows_native_smoke_then_second_a2"
  };
  const receipt = { ...payload, receiptDigest: canonicalDigest("gpao_t3.conditional_embedding_bundle_receipt.v1", payload) };
  fs.renameSync(temporaryArchive, archive);
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ receipt, archive }, null, 2));
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
  fs.rmSync(temporaryArchive, { force: true });
}
