import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { canonicalDigest } from "./canonical-json.js";

const REQUIRED_FILES = Object.freeze(["config.json", "tokenizer.json", "tokenizer_config.json", "onnx/model.onnx"]);

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function walk(root, current = root, files = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute);
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new Error(`Conditional asset cannot contain symbolic links: ${relative}`);
    if (stat.isDirectory()) walk(root, absolute, files);
    else if (stat.isFile()) files.push({ path: relative.replaceAll(path.sep, "/"), bytes: stat.size, sha256: sha256(absolute) });
    else throw new Error(`Conditional asset has unsupported entry: ${relative}`);
  }
  return files;
}

export function conditionalEmbeddingAssetManifest({ modelRoot, candidate, sourceCommit = null }) {
  if (!modelRoot || !candidate) throw new TypeError("modelRoot and candidate are required");
  const root = path.resolve(modelRoot);
  const files = walk(root).sort((left, right) => left.path.localeCompare(right.path));
  const byPath = new Map(files.map(file => [file.path, file]));
  for (const relative of REQUIRED_FILES) if (!byPath.has(relative)) throw new Error(`Conditional asset is missing required file: ${relative}`);
  if (byPath.get("onnx/model.onnx").sha256 !== candidate.modelArtifactSha256) throw new Error("Conditional asset ONNX checksum does not match the qualified candidate");
  if (byPath.get("tokenizer.json").sha256 !== candidate.tokenizerSha256) throw new Error("Conditional asset tokenizer checksum does not match the qualified candidate");
  const payload = {
    schema: "gpao_t3.conditional_embedding_asset_manifest.v1",
    status: "conditional_windows_qualification_only",
    candidateId: candidate.candidateId,
    upstreamId: candidate.upstreamId,
    upstreamRevision: candidate.upstreamRevision,
    license: candidate.license,
    dimensions: candidate.dimensions,
    artifactSha256: candidate.modelArtifactSha256,
    tokenizerSha256: candidate.tokenizerSha256,
    preprocessingContractDigest: candidate.preprocessingContractDigest,
    runtimeDigest: candidate.runtimeDigest,
    pooling: candidate.pooling,
    normalization: candidate.normalization,
    sourceCommit,
    productionAssetSelected: false,
    productionDefaultEnabled: false,
    files
  };
  return Object.freeze({ ...payload, manifestDigest: canonicalDigest("gpao_t3.conditional_embedding_asset_manifest.v1", payload) });
}

export function verifyConditionalEmbeddingAssetManifest(manifest) {
  if (!manifest || manifest.schema !== "gpao_t3.conditional_embedding_asset_manifest.v1") throw new Error("Invalid conditional embedding asset manifest");
  const { manifestDigest, ...payload } = manifest;
  if (manifestDigest !== canonicalDigest("gpao_t3.conditional_embedding_asset_manifest.v1", payload)) throw new Error("Conditional asset manifest digest mismatch");
  if (manifest.status !== "conditional_windows_qualification_only" || manifest.productionAssetSelected || manifest.productionDefaultEnabled) {
    throw new Error("Conditional asset cannot be treated as a production selection");
  }
  return Object.freeze({ ...manifest });
}
