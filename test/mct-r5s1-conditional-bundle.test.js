import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { conditionalEmbeddingAssetManifest, verifyConditionalEmbeddingAssetManifest } from "../src/core/conditional-embedding-bundle.js";

function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }

function candidate(root) {
  return {
    candidateId: "embedding-test", upstreamId: "example/test", upstreamRevision: "revision", license: "mit", dimensions: 3,
    modelArtifactSha256: sha256(fs.readFileSync(path.join(root, "onnx", "model.onnx"))),
    tokenizerSha256: sha256(fs.readFileSync(path.join(root, "tokenizer.json"))),
    preprocessingContractDigest: `sha256:${"1".repeat(64)}`, runtimeDigest: `sha256:${"2".repeat(64)}`, pooling: "mean", normalization: "l2"
  };
}

function modelRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gpao-t3-conditional-asset-"));
  fs.mkdirSync(path.join(root, "onnx"));
  fs.writeFileSync(path.join(root, "config.json"), "{}\n");
  fs.writeFileSync(path.join(root, "tokenizer.json"), "{}\n");
  fs.writeFileSync(path.join(root, "tokenizer_config.json"), "{}\n");
  fs.writeFileSync(path.join(root, "onnx", "model.onnx"), "model\n");
  return root;
}

test("R5S1 conditional asset manifest binds the selected shortlist without activating it", () => {
  const root = modelRoot();
  try {
    const manifest = conditionalEmbeddingAssetManifest({ modelRoot: root, candidate: candidate(root), sourceCommit: "abc123" });
    assert.equal(manifest.status, "conditional_windows_qualification_only");
    assert.equal(manifest.productionAssetSelected, false);
    assert.equal(manifest.productionDefaultEnabled, false);
    assert.equal(verifyConditionalEmbeddingAssetManifest(manifest).manifestDigest, manifest.manifestDigest);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("R5S1 conditional asset manifest rejects checksum drift and production activation", () => {
  const root = modelRoot();
  try {
    const selected = candidate(root);
    fs.writeFileSync(path.join(root, "onnx", "model.onnx"), "changed\n");
    assert.throws(() => conditionalEmbeddingAssetManifest({ modelRoot: root, candidate: selected }), /ONNX checksum/);
    const manifest = conditionalEmbeddingAssetManifest({ modelRoot: root, candidate: candidate(root) });
    assert.throws(() => verifyConditionalEmbeddingAssetManifest({ ...manifest, productionAssetSelected: true }), /digest mismatch/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
