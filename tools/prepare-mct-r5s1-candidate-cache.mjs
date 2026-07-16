import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalDigest } from "../src/core/canonical-json.js";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || null;
}

const cacheDir = option("--cache-dir");
const transformersRoot = option("--transformers-root");
const receiptFile = option("--receipt");
if (!cacheDir || !transformersRoot || !receiptFile) throw new Error("Usage: node tools/prepare-mct-r5s1-candidate-cache.mjs --cache-dir <directory> --transformers-root <node_modules root> --receipt <json>");
const qualification = JSON.parse(fs.readFileSync(new URL("../test/fixtures/mct-r5s1-qualification.json", import.meta.url), "utf8"));
const candidate = qualification.candidates.find(item => item.candidateId === qualification.recommendation.candidateId);
if (!candidate || qualification.recommendation.selected) throw new Error("R5S1 fixture does not permit conditional candidate preparation");
const transformers = await import(pathToFileURL(path.join(path.resolve(transformersRoot), "@huggingface", "transformers", "dist", "transformers.node.mjs")).href);
transformers.env.cacheDir = path.resolve(cacheDir);
transformers.env.allowRemoteModels = true;
const startedAt = performance.now();
const extractor = await transformers.pipeline("feature-extraction", candidate.upstreamId, {
  revision: candidate.upstreamRevision,
  dtype: "fp32",
  device: "cpu"
});
const result = await extractor(["query: GPAO-T3 Windows offline embedding smoke"], { pooling: candidate.pooling, normalize: true });
const vector = result.tolist()[0];
const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
if (vector.length !== candidate.dimensions || !Number.isFinite(norm) || Math.abs(norm - 1) > 0.01) throw new Error("Prepared candidate output violates the frozen identity contract");
const payload = {
  schema: "gpao_t3.mct_r5s1_candidate_prepare.v1",
  platform: `${process.platform}-${process.arch}`,
  candidateId: candidate.candidateId,
  upstreamId: candidate.upstreamId,
  upstreamRevision: candidate.upstreamRevision,
  dimensions: vector.length,
  normalized: true,
  cacheDir: transformers.env.cacheDir,
  durationMs: Math.round((performance.now() - startedAt) * 1000) / 1000,
  productionAssetSelected: false
};
const receipt = { ...payload, receiptDigest: canonicalDigest("gpao_t3.mct_r5s1_candidate_prepare.v1", payload) };
fs.mkdirSync(path.dirname(path.resolve(receiptFile)), { recursive: true, mode: 0o700 });
fs.writeFileSync(path.resolve(receiptFile), `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify(receipt, null, 2));
