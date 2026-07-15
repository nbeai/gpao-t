import crypto from "node:crypto";

function tokens(text) { return [...new Set(String(text).toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) || [])]; }

export class LocalHybridMemory {
  constructor({ maxEntries = 500, maxResultCount = 12 } = {}) { this.entries = new Map(); this.maxEntries = maxEntries; this.maxResultCount = maxResultCount; }

  ingest({ text, source = "local_note", traceRef = null, sessionId = null, reviewed = false }) {
    const normalized = String(text || "").trim();
    if (!normalized || Buffer.byteLength(normalized) > 64 * 1024 || this.entries.size >= this.maxEntries) return { accepted: false, reason: !normalized ? "empty" : "capacity_or_size" };
    const id = `mem_${crypto.randomUUID()}`;
    this.entries.set(id, { id, text: normalized, tokens: tokens(normalized), source, traceRef, sessionId, reviewed, createdAt: Date.now() });
    return { accepted: true, id };
  }

  search(query, { limit = this.maxResultCount, budgetMs = 120, sessionId = null } = {}) {
    const started = performance.now();
    const queryTokens = tokens(query);
    const candidates = [];
    for (const entry of this.entries.values()) {
      if (performance.now() - started > budgetMs) return { results: candidates.slice(0, limit), degraded: "latency_budget_exceeded", elapsedMs: performance.now() - started };
      if (sessionId && entry.sessionId && entry.sessionId !== sessionId) continue;
      const overlap = queryTokens.filter(token => entry.tokens.includes(token)).length;
      if (!overlap) continue;
      candidates.push({ id: entry.id, source: entry.source, text: entry.text.slice(0, 600), score: overlap / Math.max(queryTokens.length, 1), traceRef: entry.traceRef, sessionId: entry.sessionId, reviewed: entry.reviewed, admission: "search_support_candidate" });
    }
    candidates.sort((a, b) => b.score - a.score);
    return { results: candidates.slice(0, limit), degraded: null, elapsedMs: performance.now() - started };
  }
}
