import crypto from "node:crypto";
import { canonicalDigest } from "./canonical-json.js";
import { RuntimeError } from "./errors.js";

export const RESPONSE_BLOCK_KINDS = Object.freeze(["markdown", "code", "table", "source", "artifact"]);
const RESPONSE_DOCUMENT_SCHEMA = "gpao_t3.response_document.v1";
const RESPONSE_BLOCK_SCHEMA = "gpao_t3.response_block.v1";

function invalid(message, details) {
  throw new RuntimeError("invalid_response_document", message, 400, details);
}

function nonEmpty(value, name, maximum = 1_000_000) {
  if (typeof value !== "string" || !value || value.length > maximum) invalid(`${name} is invalid`);
  return value.normalize("NFC").replace(/\r\n?/g, "\n");
}

export function createResponseBlock(input = {}) {
  if (!RESPONSE_BLOCK_KINDS.includes(input.kind)) invalid("Response block kind is unsupported", { kind: input.kind });
  const block = {
    schema: RESPONSE_BLOCK_SCHEMA,
    id: input.id || `block_${crypto.randomUUID()}`,
    kind: input.kind
  };
  if (input.kind === "markdown") block.text = nonEmpty(input.text, "Markdown text");
  if (input.kind === "code") {
    block.code = nonEmpty(input.code, "Code");
    block.language = typeof input.language === "string" ? input.language.slice(0, 64) : "text";
  }
  if (input.kind === "table") {
    if (!Array.isArray(input.columns) || !input.columns.length || !Array.isArray(input.rows)) invalid("Table shape is invalid");
    block.columns = input.columns.map(value => nonEmpty(String(value), "Table column", 300));
    block.rows = input.rows.map(row => {
      if (!Array.isArray(row) || row.length !== block.columns.length) invalid("Table row width is invalid");
      return row.map(value => String(value ?? "").normalize("NFC").replace(/\r\n?/g, "\n").slice(0, 10_000));
    });
  }
  if (input.kind === "source") {
    block.title = nonEmpty(input.title, "Source title", 500);
    block.url = nonEmpty(input.url, "Source URL", 2_000);
    let parsed;
    try { parsed = new URL(block.url); } catch { invalid("Source URL is invalid"); }
    if (!["http:", "https:"].includes(parsed.protocol)) invalid("Source URL protocol is unsupported");
  }
  if (input.kind === "artifact") {
    block.title = nonEmpty(input.title, "Artifact title", 500);
    block.artifactId = nonEmpty(input.artifactId, "Artifact id", 500);
    block.mediaType = nonEmpty(input.mediaType, "Artifact media type", 200);
  }
  return Object.freeze(block);
}

export function createResponseDocument({ id, turnId, sessionId, blocks, createdAt = Date.now() } = {}) {
  if (!turnId || !sessionId || !Number.isFinite(createdAt)) invalid("Response document identity is incomplete");
  if (!Array.isArray(blocks) || !blocks.length || blocks.length > 256) invalid("Response document blocks are invalid");
  const document = {
    schema: RESPONSE_DOCUMENT_SCHEMA,
    version: 1,
    id: id || `response_${crypto.randomUUID()}`,
    turnId,
    sessionId,
    blocks: blocks.map(createResponseBlock),
    createdAt
  };
  return Object.freeze({ ...document, digest: canonicalDigest(RESPONSE_DOCUMENT_SCHEMA, document) });
}

export function verifyResponseDocument(document) {
  if (!document || document.schema !== RESPONSE_DOCUMENT_SCHEMA || !document.digest) return false;
  const { digest, ...material } = document;
  return digest === canonicalDigest(RESPONSE_DOCUMENT_SCHEMA, material);
}
