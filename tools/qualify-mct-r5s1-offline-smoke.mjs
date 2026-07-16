import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { verifyConditionalEmbeddingAssetManifest } from "../src/core/conditional-embedding-bundle.js";
import { canonicalDigest } from "../src/core/canonical-json.js";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || null;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const bundle = option("--bundle");
const transformersRoot = option("--transformers-root");
const receiptFile = option("--receipt");
if (!bundle || !transformersRoot || !receiptFile) throw new Error("Usage: node tools/qualify-mct-r5s1-offline-smoke.mjs --bundle <archive> --transformers-root <node_modules root> --receipt <json>");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-conditional-embedding-smoke-"));
try {
  const unpacked = spawnSync("tar", ["-xzf", path.resolve(bundle), "-C", temporary], { encoding: "utf8" });
  if (unpacked.status !== 0) throw new Error(unpacked.stderr || "Could not unpack conditional embedding bundle");
  const manifest = verifyConditionalEmbeddingAssetManifest(JSON.parse(fs.readFileSync(path.join(temporary, "ASSET-MANIFEST.json"), "utf8")));
  const modelPath = path.join(temporary, "model");
  if (sha256(path.join(modelPath, "onnx", "model.onnx")) !== manifest.artifactSha256) throw new Error("Unpacked ONNX checksum mismatch");
  if (sha256(path.join(modelPath, "tokenizer.json")) !== manifest.tokenizerSha256) throw new Error("Unpacked tokenizer checksum mismatch");
  const transformers = await import(pathToFileURL(path.join(path.resolve(transformersRoot), "@huggingface", "transformers", "dist", "transformers.node.mjs")).href);
  transformers.env.allowRemoteModels = false;
  transformers.env.allowLocalModels = true;
  const startedAt = performance.now();
  const extractor = await transformers.pipeline("feature-extraction", modelPath, { dtype: "fp32", device: "cpu", local_files_only: true });
  const result = await extractor(["query: GPAO-T3 offline semantic smoke"], { pooling: manifest.pooling, normalize: true });
  const vector = result.tolist()[0];
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (vector.length !== manifest.dimensions || !Number.isFinite(norm) || Math.abs(norm - 1) > 0.01) throw new Error("Offline embedding output violates the frozen identity contract");
  const payload = {
    schema: "gpao_t3.mct_r5s1_offline_smoke.v1",
    platform: `${process.platform}-${process.arch}`,
    candidateId: manifest.candidateId,
    bundleSha256: sha256(path.resolve(bundle)),
    assetManifestDigest: manifest.manifestDigest,
    dimensions: vector.length,
    normalized: true,
    remoteModelsAllowed: transformers.env.allowRemoteModels,
    durationMs: Math.round((performance.now() - startedAt) * 1000) / 1000,
    productionAssetSelected: false
  };
  const receipt = { ...payload, receiptDigest: canonicalDigest("gpao_t3.mct_r5s1_offline_smoke.v1", payload) };
  fs.mkdirSync(path.dirname(path.resolve(receiptFile)), { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.resolve(receiptFile), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
