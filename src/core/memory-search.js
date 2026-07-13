import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

const INDEX_FILE = "memory/search-index.json";
const MAX_TEXT_BYTES = 96 * 1024;
const MAX_JSONL_BYTES = 512 * 1024;
const MAX_DOCUMENT_TEXT = 4000;
const EMBEDDING_DIMENSIONS = 192;
const EMBEDDING_VERSION = "gpao_t.local_hash_embedding.v0_1";

export function memorySearchPaths({ stateDir } = {}) {
  const runtimeRoot = resolve(stateDir || process.env.GPAO_T_STATE_DIR || join(homedir(), ".gpao-t"));
  return {
    runtimeRoot,
    indexFile: join(runtimeRoot, INDEX_FILE),
  };
}

export function buildMemorySearchIndex({ stateDir, now = new Date().toISOString() } = {}) {
  const paths = memorySearchPaths({ stateDir });
  const documents = [
    ...collectMemoryDocuments(paths.runtimeRoot),
    ...collectChatDocuments(paths.runtimeRoot),
    ...collectWorkspaceDocuments(paths.runtimeRoot),
    ...collectAuditDocuments(paths.runtimeRoot),
  ];
  const index = {
    schema: "gpao_t.memory_search_index.v0_1",
    status: "ready",
    generatedAt: now,
    runtimeRoot: paths.runtimeRoot,
    engine: {
      mode: "local_hybrid_memory_search",
      lexical: "local_token_overlap",
      semantic: EMBEDDING_VERSION,
      meaning: "Works without external embedding quota; provider embeddings may be layered above this local baseline.",
    },
    counts: {
      documents: documents.length,
      sources: summarizeSources(documents),
    },
    documents: documents.map((document) => ({
      ...document,
      tokens: tokens(document.text).slice(0, 300),
      embedding: embedText(`${document.title}\n${document.text}`),
    })),
  };
  mkdirSync(dirname(paths.indexFile), { recursive: true });
  writeFileSync(paths.indexFile, `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

export function readMemorySearchIndex({ stateDir } = {}) {
  const paths = memorySearchPaths({ stateDir });
  if (!existsSync(paths.indexFile)) {
    return {
      schema: "gpao_t.memory_search_index.v0_1",
      status: "missing",
      runtimeRoot: paths.runtimeRoot,
      indexFile: paths.indexFile,
      counts: { documents: 0, sources: {} },
    };
  }
  return JSON.parse(readFileSync(paths.indexFile, "utf8"));
}

export function getMemorySearchStatus({ stateDir } = {}) {
  const paths = memorySearchPaths({ stateDir });
  const index = readMemorySearchIndex({ stateDir });
  const sources = inspectSearchSources(paths.runtimeRoot);
  const readySourceCount = sources.filter((source) => source.status === "ready").length;
  return {
    schema: "gpao_t.memory_search_status.v0_1",
    status: index.status === "ready" ? "ready" : "needs_index",
    runtimeRoot: paths.runtimeRoot,
    indexFile: paths.indexFile,
    index: {
      status: index.status,
      generatedAt: index.generatedAt || null,
      documents: index.counts?.documents || 0,
      sources: index.counts?.sources || {},
    },
    sources,
    baselineSearch: readySourceCount > 0 ? "available_after_index" : "no_sources",
    embeddingSearch: {
      status: index.status === "ready" ? "ready" : "ready_after_index",
      provider: "local_hash",
      version: EMBEDDING_VERSION,
      externalQuotaRequired: false,
      meaning: "Local meaning-style search is available without OpenAI embedding quota; stronger local model providers can replace it later.",
    },
    nextAction: index.status === "ready"
      ? "memory search is available"
      : "run gpao-t memory index --force",
  };
}

export function searchMemory({ query = "", stateDir, limit = 8 } = {}) {
  const normalizedQuery = String(query).trim();
  if (!normalizedQuery) {
    throw new Error("memory search requires query");
  }
  let index = readMemorySearchIndex({ stateDir });
  if (index.status !== "ready") {
    index = buildMemorySearchIndex({ stateDir });
  }
  const queryTokens = tokens(normalizedQuery);
  const queryEmbedding = embedText(normalizedQuery);
  const results = (index.documents || [])
    .map((document) => ({
      document,
      score: scoreDocument(document, queryTokens, normalizedQuery, queryEmbedding),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ document, score }) => ({
      id: document.id,
      source: document.source,
      title: document.title,
      score,
      createdAt: document.createdAt || null,
      excerpt: excerpt(document.text, queryTokens),
      path: document.path || null,
      scoreBreakdown: document.scoreBreakdown || null,
    }));
  return {
    schema: "gpao_t.memory_search_result.v0_1",
    status: "ready",
    query: normalizedQuery,
    engine: index.engine,
    index: {
      generatedAt: index.generatedAt,
      documents: index.counts?.documents || 0,
    },
    results,
  };
}

function collectMemoryDocuments(root) {
  const docs = [];
  const wikiPath = join(root, "memory", "wiki.json");
  const wiki = readJsonFileSafe(wikiPath);
  for (const entry of wiki?.entries || []) {
    docs.push(makeDocument({
      source: "memory_wiki",
      path: wikiPath,
      title: entry.title || entry.id || "Memory Wiki entry",
      text: [entry.title, entry.body, ...(entry.tags || [])].join("\n"),
      createdAt: entry.createdAt,
    }));
  }
  docs.push(...readJsonlDocuments(join(root, "memory", "tcell-candidates.jsonl"), {
    source: "tcell_candidates",
    titleOf: (record) => record.id || record.anchor || "T-cell candidate",
    textOf: (record) => [record.pi, record.anchor, ...(record.x || []), JSON.stringify(record.trace || {})].join("\n"),
  }));
  docs.push(...readJsonlDocuments(join(root, "memory", "review-queue.jsonl"), {
    source: "memory_review_queue",
    titleOf: (record) => record.candidate?.title || record.id || "Memory review candidate",
    textOf: (record) => [
      record.request,
      record.source?.rawExcerpt,
      record.candidate?.title,
      record.candidate?.operatingPrinciple,
      record.candidate?.reason,
      record.candidate?.expectedBenefit,
    ].filter(Boolean).join("\n"),
  }));
  return docs;
}

function collectChatDocuments(root) {
  const chatRoot = join(root, "chat");
  return [
    ...readJsonlDocuments(join(chatRoot, "preflight-records.jsonl"), {
      source: "chat_preflight",
      titleOf: (record) => record.messagePreview || record.id || "Chat preflight",
      textOf: (record) => [
        record.messagePreview,
        record.packet?.rawUserUtterance,
        record.labels?.endpoint,
      ].filter(Boolean).join("\n"),
      createdAtOf: (record) => record.createdAt,
    }),
    ...readJsonlDocuments(join(chatRoot, "post-answer-replay-records.jsonl"), {
      source: "chat_answer",
      titleOf: (record) => record.answerPreview || record.id || "Chat answer",
      textOf: (record) => [record.answerPreview, record.ackStatus, record.nextSafeAction].filter(Boolean).join("\n"),
      createdAtOf: (record) => record.createdAt,
    }),
    ...readJsonlDocuments(join(chatRoot, "answer-memory-candidate-drafts.jsonl"), {
      source: "answer_memory_candidates",
      titleOf: (record) => record.id || "Answer memory candidate",
      textOf: (record) => JSON.stringify(record),
      createdAtOf: (record) => record.createdAt,
    }),
  ];
}

function collectWorkspaceDocuments(root) {
  const workspaceRoot = join(root, "workspace");
  const docs = [];
  for (const path of listFiles(workspaceRoot, { extensions: [".md"], maxDepth: 3 })) {
    const read = readTextSafe(path);
    if (!read.ok) continue;
    docs.push(makeDocument({
      source: "workspace",
      path,
      title: path.replace(`${workspaceRoot}/`, ""),
      text: read.text,
      createdAt: null,
    }));
  }
  return docs;
}

function collectAuditDocuments(root) {
  return readJsonlDocuments(join(root, "events", "audit.jsonl"), {
    source: "audit_events",
    titleOf: (record) => record.summary || record.type || record.id || "Audit event",
    textOf: (record) => [record.summary, record.type, JSON.stringify(record.payload || {})].join("\n"),
    createdAtOf: (record) => record.createdAt,
  });
}

function inspectSearchSources(root) {
  return [
    ["memory/wiki.json", "memory_wiki"],
    ["memory/tcell-candidates.jsonl", "tcell_candidates"],
    ["memory/review-queue.jsonl", "memory_review_queue"],
    ["chat/preflight-records.jsonl", "chat_preflight"],
    ["chat/post-answer-replay-records.jsonl", "chat_answer"],
    ["workspace/MEMORY.md", "workspace_memory"],
    ["events/audit.jsonl", "audit_events"],
  ].map(([relativePath, id]) => {
    const path = join(root, relativePath);
    if (!existsSync(path)) return { id, path, status: "missing" };
    const stat = statSync(path);
    return {
      id,
      path,
      status: stat.size > 0 && Number.isFinite(stat.blocks) && stat.blocks === 0 ? "degraded" : "ready",
      size: stat.size,
      blocks: stat.blocks,
    };
  });
}

function readJsonlDocuments(path, { source, titleOf, textOf, createdAtOf = () => null }) {
  const read = readTextTailSafe(path, MAX_JSONL_BYTES);
  if (!read.ok) return [];
  return read.text
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const record = JSON.parse(line);
        return [makeDocument({
          source,
          path,
          title: titleOf(record),
          text: textOf(record),
          createdAt: createdAtOf(record),
        })];
      } catch {
        return [];
      }
    });
}

function readJsonFileSafe(path) {
  const read = readTextSafe(path);
  if (!read.ok) return null;
  try {
    return JSON.parse(read.text);
  } catch {
    return null;
  }
}

function readTextSafe(path) {
  if (!existsSync(path)) return { ok: false, reason: "missing" };
  const stat = statSync(path);
  if (stat.size > 0 && Number.isFinite(stat.blocks) && stat.blocks === 0) {
    return { ok: false, reason: "offloaded-or-sparse-file" };
  }
  if (stat.size > MAX_TEXT_BYTES) {
    return { ok: false, reason: "too-large-for-full-read" };
  }
  return { ok: true, text: readFileSync(path, "utf8") };
}

function readTextTailSafe(path, maxBytes) {
  if (!existsSync(path)) return { ok: false, reason: "missing" };
  const stat = statSync(path);
  if (stat.size > 0 && Number.isFinite(stat.blocks) && stat.blocks === 0) {
    return { ok: false, reason: "offloaded-or-sparse-file" };
  }
  const text = readFileSync(path, "utf8");
  return { ok: true, text: text.slice(-maxBytes) };
}

function listFiles(root, { extensions, maxDepth, depth = 0 } = {}) {
  if (!existsSync(root) || depth > maxDepth) return [];
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git") continue;
      files.push(...listFiles(path, { extensions, maxDepth, depth: depth + 1 }));
    } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      files.push(path);
    }
  }
  return files;
}

function makeDocument({ source, path, title, text, createdAt }) {
  const normalizedText = String(text || "").slice(0, MAX_DOCUMENT_TEXT);
  const id = createHash("sha256")
    .update([source, path, title, normalizedText].join("\n"))
    .digest("hex")
    .slice(0, 16);
  return {
    id: `memdoc.${id}`,
    source,
    path,
    title: String(title || "Untitled").slice(0, 180),
    text: normalizedText,
    createdAt: createdAt || null,
  };
}

function summarizeSources(documents) {
  const summary = {};
  for (const document of documents) {
    summary[document.source] = (summary[document.source] || 0) + 1;
  }
  return summary;
}

function scoreDocument(document, queryTokens, query, queryEmbedding) {
  const haystack = `${document.title}\n${document.text}`.toLowerCase();
  let lexicalScore = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token.toLowerCase())) lexicalScore += token.length > 1 ? 3 : 1;
  }
  if (haystack.includes(query.toLowerCase())) lexicalScore += 10;
  const semanticScore = cosineSimilarity(queryEmbedding, document.embedding || []);
  const sourceBoost = document.source === "chat_preflight" || document.source === "chat_answer" ? 1 : 0;
  const score = lexicalScore + Math.round(semanticScore * 12) + sourceBoost;
  document.scoreBreakdown = {
    lexical: lexicalScore,
    semantic: Number(semanticScore.toFixed(4)),
    sourceBoost,
    engine: "hybrid_local_lexical_semantic",
  };
  return score;
}

function excerpt(text, queryTokens) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  const lower = value.toLowerCase();
  const firstHit = queryTokens
    .map((token) => lower.indexOf(token.toLowerCase()))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, firstHit - 80);
  return value.slice(start, start + 280);
}

function tokens(text) {
  return String(text)
    .split(/[\s,.;:!?()[\]{}"'`~<>/\\|+=*_#:\-]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function embedText(text) {
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const value = normalizeForEmbedding(text);
  const grams = [
    ...tokens(value),
    ...characterGrams(value, 2),
    ...characterGrams(value, 3),
  ];
  for (const gram of grams) {
    const index = hashToIndex(gram, EMBEDDING_DIMENSIONS);
    vector[index] += gram.length >= 3 ? 1.5 : 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0)) || 1;
  return vector.map((item) => Number((item / norm).toFixed(6)));
}

function normalizeForEmbedding(text) {
  return String(text || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function characterGrams(text, size) {
  const compact = normalizeForEmbedding(text).replace(/\s+/g, "");
  const grams = [];
  for (let index = 0; index <= compact.length - size; index += 1) {
    grams.push(compact.slice(index, index + size));
  }
  return grams.slice(0, 1200);
}

function hashToIndex(value, size) {
  const hash = createHash("sha256").update(value).digest();
  return hash.readUInt32BE(0) % size;
}

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || !left.length || !right.length) return 0;
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < length; index += 1) {
    const a = Number(left[index]) || 0;
    const b = Number(right[index]) || 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (!leftNorm || !rightNorm) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}
