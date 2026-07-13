#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";

const MAX_TEXT_BYTES = 96 * 1024;
const MAX_JSONL_BYTES = 512 * 1024;
const MAX_DOCUMENT_TEXT = 4000;
const EMBEDDING_DIMENSIONS = 192;
const EMBEDDING_VERSION = "gpao_t.local_hash_embedding.v0_1";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function paths() {
  const runtimeRoot = resolve(arg("--state-dir", process.env.GPAO_T_STATE_DIR || join(homedir(), ".gpao-t")));
  return {
    runtimeRoot,
    indexFile: join(runtimeRoot, "memory", "search-index.json"),
  };
}

function buildIndex({ now = new Date().toISOString() } = {}) {
  const runtime = paths();
  const documents = [
    ...collectMemoryDocuments(runtime.runtimeRoot),
    ...collectChatDocuments(runtime.runtimeRoot),
    ...collectWorkspaceDocuments(runtime.runtimeRoot),
    ...collectAuditDocuments(runtime.runtimeRoot),
  ];
  const index = {
    schema: "gpao_t.memory_search_index.v0_1",
    status: "ready",
    generatedAt: now,
    runtimeRoot: runtime.runtimeRoot,
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
  mkdirSync(dirname(runtime.indexFile), { recursive: true });
  writeFileSync(runtime.indexFile, `${JSON.stringify(index, null, 2)}\n`);
  return { runtime, index };
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

function readJsonlDocuments(path, { source, titleOf, textOf, createdAtOf = () => null }) {
  const read = readTextTailSafe(path, MAX_JSONL_BYTES);
  if (!read.ok) return [];
  return read.text.split("\n").filter(Boolean).flatMap((line) => {
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
  if (stat.size > 0 && Number.isFinite(stat.blocks) && stat.blocks === 0) return { ok: false, reason: "offloaded-or-sparse-file" };
  if (stat.size > MAX_TEXT_BYTES) return { ok: false, reason: "too-large-for-full-read" };
  return { ok: true, text: readFileSync(path, "utf8") };
}

function readTextTailSafe(path, maxBytes) {
  if (!existsSync(path)) return { ok: false, reason: "missing" };
  const stat = statSync(path);
  if (stat.size > 0 && Number.isFinite(stat.blocks) && stat.blocks === 0) return { ok: false, reason: "offloaded-or-sparse-file" };
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
    } else if (extensions.includes(extname(entry.name))) {
      files.push(path);
    }
  }
  return files;
}

function makeDocument({ source, path, title, text, createdAt }) {
  const normalizedText = String(text || "").slice(0, MAX_DOCUMENT_TEXT);
  const id = createHash("sha256").update([source, path, title, normalizedText].join("\n")).digest("hex").slice(0, 16);
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
  for (const document of documents) summary[document.source] = (summary[document.source] || 0) + 1;
  return summary;
}

function tokens(text) {
  return String(text).split(/[\s,.;:!?()[\]{}"'`~<>/\\|+=*_#:\-]+/u).map((token) => token.trim()).filter((token) => token.length >= 2);
}

function embedText(text) {
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const value = normalizeForEmbedding(text);
  const grams = [...tokens(value), ...characterGrams(value, 2), ...characterGrams(value, 3)];
  for (const gram of grams) vector[hashToIndex(gram, EMBEDDING_DIMENSIONS)] += gram.length >= 3 ? 1.5 : 1;
  const norm = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0)) || 1;
  return vector.map((item) => Number((item / norm).toFixed(6)));
}

function normalizeForEmbedding(text) {
  return String(text || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function characterGrams(text, size) {
  const compact = normalizeForEmbedding(text).replace(/\s+/g, "");
  const grams = [];
  for (let index = 0; index <= compact.length - size; index += 1) grams.push(compact.slice(index, index + size));
  return grams.slice(0, 1200);
}

function hashToIndex(value, size) {
  const hash = createHash("sha256").update(value).digest();
  return hash.readUInt32BE(0) % size;
}

const { runtime, index } = buildIndex();
console.log(JSON.stringify({
  schema: "gpao_t.live_memory_index_rebuild.v0_1",
  status: index.status,
  runtimeRoot: runtime.runtimeRoot,
  indexFile: runtime.indexFile,
  documents: index.counts.documents,
  sources: index.counts.sources,
  engine: index.engine,
}, null, 2));
