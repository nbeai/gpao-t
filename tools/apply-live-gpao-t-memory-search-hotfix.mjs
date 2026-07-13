#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const APPLY_TOKEN = "apply-gpao-t-memory-search-live";
const evidenceRoot = join(
  REPO_ROOT,
  "docs",
  "03-verification",
  "evidence",
  "live-memory-search-hotfix",
);

function hasApplyToken() {
  const index = process.argv.indexOf("--apply");
  return index !== -1 && process.argv[index + 1] === APPLY_TOKEN;
}

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

async function findGpaoBundle(distDir) {
  const names = (await readdir(distDir))
    .filter((name) => /^gpao-t-[A-Za-z0-9_-]+\.js$/u.test(name))
    .sort();
  if (names.length !== 1) {
    throw new Error(`Expected exactly one gpao-t bundle in ${distDir}, found ${names.length}`);
  }
  return join(distDir, names[0]);
}

function helperSource() {
  return `function bridgeMemorySearchStateDir() {
\treturn process.env.GPAO_T_STATE_DIR?.trim() || process.env.OPENCLAW_STATE_DIR?.trim() || join(homedir(), ".gpao-t");
}
function bridgeMemorySearchNormalize(value) {
\treturn String(value || "").normalize("NFKC").toLowerCase().replace(/\\s+/g, " ").trim();
}
function bridgeMemorySearchTokens(value) {
\treturn bridgeMemorySearchNormalize(value).split(/[^0-9a-z가-힣_.$:-]+/u).map((item) => item.trim()).filter((item) => item.length >= 2).slice(0, 32);
}
function bridgeMemorySearchCharacterGrams(value, size) {
\tconst compact = bridgeMemorySearchNormalize(value).replace(/\\s+/g, "");
\tconst grams = [];
\tfor (let index = 0; index <= compact.length - size; index += 1) grams.push(compact.slice(index, index + size));
\treturn grams.slice(0, 1200);
}
function bridgeMemorySearchHashToIndex(value, size) {
\tlet hash = 2166136261;
\tfor (let index = 0; index < value.length; index += 1) {
\t\thash ^= value.charCodeAt(index);
\t\thash = Math.imul(hash, 16777619);
\t}
\treturn Math.abs(hash >>> 0) % size;
}
function bridgeMemorySearchEmbed(value) {
\tconst dimensions = 192;
\tconst vector = new Array(dimensions).fill(0);
\tconst grams = [
\t\t...bridgeMemorySearchTokens(value),
\t\t...bridgeMemorySearchCharacterGrams(value, 2),
\t\t...bridgeMemorySearchCharacterGrams(value, 3)
\t];
\tfor (const gram of grams) vector[bridgeMemorySearchHashToIndex(gram, dimensions)] += gram.length >= 3 ? 1.5 : 1;
\tconst norm = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0)) || 1;
\treturn vector.map((item) => item / norm);
}
function bridgeMemorySearchCosine(left, right) {
\tif (!Array.isArray(left) || !Array.isArray(right) || !left.length || !right.length) return 0;
\tconst length = Math.min(left.length, right.length);
\tlet dot = 0;
\tlet leftNorm = 0;
\tlet rightNorm = 0;
\tfor (let index = 0; index < length; index += 1) {
\t\tconst a = Number(left[index]) || 0;
\t\tconst b = Number(right[index]) || 0;
\t\tdot += a * b;
\t\tleftNorm += a * a;
\t\trightNorm += b * b;
\t}
\treturn leftNorm && rightNorm ? dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm)) : 0;
}
function bridgeMemorySearchSnippet(text, tokens) {
\tconst normalized = String(text || "").replace(/\\s+/g, " ").trim();
\tif (!normalized) return "";
\tconst lower = normalized.toLowerCase();
\tconst hit = tokens.map((token) => lower.indexOf(token)).filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? 0;
\treturn normalized.slice(Math.max(0, hit - 80), hit + 260);
}
function buildBridgeMemorySearchAttachment(query) {
\tconst stateDir = bridgeMemorySearchStateDir();
\tconst indexPath = join(stateDir, "memory", "search-index.json");
\tconst tokens = bridgeMemorySearchTokens(query);
\tconst empty = {
\t\tschema: "gpao_t.llm_ready.memory_search_attachment.v0_1",
\t\tstatus: tokens.length ? "needs_index" : "blocked",
\t\tengine: {
\t\t\tmode: "local_hybrid_memory_search",
\t\t\tlexical: "local_token_overlap",
\t\t\tsemantic: "gpao_t.local_hash_embedding.v0_1",
\t\t\texternalQuotaRequired: false
\t\t},
\t\tindexPath,
\t\tresults: [],
\t\tauthority: {
\t\t\tadmissionRequired: true,
\t\t\tanswerAnchorEligibleByDefault: false,
\t\t\tdurableMemoryPromotion: "blocked"
\t\t}
\t};
\ttry {
\t\tif (!tokens.length || !existsSync(indexPath)) return empty;
\t\tconst index = JSON.parse(readFileSync(indexPath, "utf8"));
\t\tconst documents = Array.isArray(index.documents) ? index.documents : [];
\t\tconst queryEmbedding = bridgeMemorySearchEmbed(query);
\t\tconst results = documents.map((doc) => {
\t\t\tconst haystack = [doc.title, doc.text, doc.source, doc.path].join("\\n").toLowerCase();
\t\t\tconst lexical = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 3 : 0), 0);
\t\t\tconst semantic = bridgeMemorySearchCosine(queryEmbedding, Array.isArray(doc.embedding) ? doc.embedding : bridgeMemorySearchEmbed([doc.title, doc.text].join("\\n")));
\t\t\tconst score = lexical + Math.round(semantic * 12);
\t\t\treturn { doc, score, lexical, semantic };
\t\t}).filter((item) => item.score > 0).sort((left, right) => right.score - left.score).slice(0, 5).map(({ doc, score, lexical, semantic }) => ({
\t\t\tid: doc.id || null,
\t\t\tsource: doc.source || "unknown",
\t\t\ttitle: doc.title || doc.id || "GPAO-T memory result",
\t\t\tpath: doc.path || null,
\t\t\tscore,
\t\t\tsnippet: bridgeMemorySearchSnippet(doc.text, tokens),
\t\t\tscoreBreakdown: {
\t\t\t\tengine: "hybrid_local_lexical_semantic",
\t\t\t\tlexical,
\t\t\t\tsemantic: Number(semantic.toFixed(4))
\t\t\t},
\t\t\tadmissionRole: "search_support_candidate",
\t\t\tanswerAnchorEligible: false
\t\t}));
\t\treturn {
\t\t\t...empty,
\t\t\tstatus: "ready",
\t\t\tindexGeneratedAt: index.generatedAt || null,
\t\t\tdocumentCount: documents.length,
\t\t\tresults
\t\t};
\t} catch (error) {
\t\treturn {
\t\t\t...empty,
\t\t\tstatus: "degraded",
\t\t\terror: error instanceof Error ? error.message : String(error)
\t\t};
\t}
}
`;
}

function patchBundle(source) {
  if (source.includes("gpao_t.local_hash_embedding.v0_1")) {
    return { changed: false, source };
  }
  if (source.includes("buildBridgeMemorySearchAttachment") && source.includes("gpao_t_local_lexical_fallback")) {
    const start = source.indexOf("function bridgeMemorySearchStateDir()");
    const end = source.indexOf("function buildBridgeChatPreflight", start);
    if (start === -1 || end === -1) {
      throw new Error("Could not find existing bridge memory helper region");
    }
    return {
      changed: true,
      source: `${source.slice(0, start)}${helperSource()}${source.slice(end)}`,
    };
  }
  if (source.includes("buildBridgeMemorySearchAttachment")) {
    return { changed: false, source };
  }
  const beforeFunction = "function buildBridgeChatPreflight(params, now = (/* @__PURE__ */ new Date()).toISOString()) {";
  if (!source.includes(beforeFunction)) {
    throw new Error("Could not find buildBridgeChatPreflight anchor");
  }
  let next = source.replace(beforeFunction, `${helperSource()}${beforeFunction}`);
  const preReturn = `\tconst agentId = stringParam(params.agentId);
\treturn {`;
  const postReturn = `\tconst agentId = stringParam(params.agentId);
\tconst memorySearch = buildBridgeMemorySearchAttachment(message);
\treturn {`;
  if (!next.includes(preReturn)) {
    throw new Error("Could not find chat preflight return anchor");
  }
  next = next.replace(preReturn, postReturn);
  next = next.replace(
    `\t\t\tsupportCount: "0",
\t\t\tblocked: "로컬 preflight",`,
    `\t\t\tsupportCount: String(memorySearch.results?.length || 0),
\t\t\tmemorySearch: memorySearch.status === "ready" ? \`\${memorySearch.results?.length || 0}개\` : "검색 제한",
\t\t\tblocked: "로컬 preflight",`,
  );
  next = next.replace(
    `\t\t\trawUserUtterance: message,
\t\t\tactiveTarget: {`,
    `\t\t\trawUserUtterance: message,
\t\t\tmemorySearch,
\t\t\tactiveTarget: {`,
  );
  return { changed: true, source: next };
}

async function main() {
  const distDir = resolve(arg(
    "--dist",
    join(homedir(), ".gpao-t", "current", "compatibility", "gpao-t", "dist"),
  ));
  const bundlePath = await findGpaoBundle(distDir);
  const before = await readFile(bundlePath, "utf8");
  const patch = patchBundle(before);
  const report = {
    schema: "gpao_t.live_memory_search_hotfix.v0_1",
    generatedAt: new Date().toISOString(),
    distDir,
    bundlePath,
    apply: hasApplyToken(),
    changed: patch.changed,
    beforeSha256: sha256(before),
    afterSha256: sha256(patch.source),
    applyTokenRequired: APPLY_TOKEN,
  };
  if (!hasApplyToken()) {
    console.log(JSON.stringify({ ...report, status: "preview" }, null, 2));
    return;
  }
  const evidenceDir = join(evidenceRoot, stamp());
  await mkdir(evidenceDir, { recursive: true });
  const backupPath = join(evidenceDir, bundlePath.slice(bundlePath.lastIndexOf("/") + 1));
  await copyFile(bundlePath, backupPath);
  if (patch.changed) {
    await writeFile(bundlePath, patch.source);
  }
  await writeFile(join(evidenceDir, "report.json"), `${JSON.stringify({
    ...report,
    status: "applied",
    backupPath,
  }, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, status: "applied", backupPath }, null, 2));
}

await main();
