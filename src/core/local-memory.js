import crypto from "node:crypto";

function tokens(text) { return [...new Set(String(text).toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) || [])]; }

export class LocalHybridMemory {
  constructor({ maxEntries = 10_000, maxResultCount = 12 } = {}) { this.entries = new Map(); this.maxEntries = maxEntries; this.maxResultCount = maxResultCount; }

  ingest({ text, source = "local_note", traceRef = null, sessionId = null, userId = "local-owner", reviewed = false, scopeLevel = sessionId ? "session" : "user_global" }) {
    const normalized = String(text || "").trim();
    if (!normalized || Buffer.byteLength(normalized) > 64 * 1024 || this.entries.size >= this.maxEntries) return { accepted: false, reason: !normalized ? "empty" : "capacity_or_size" };
    const id = `mem_${crypto.randomUUID()}`;
    const record = { id, text: normalized, tokens: tokens(normalized), source, traceRef, sessionId, userId, scopeLevel, reviewed, createdAt: Date.now() };
    this.entries.set(id, record);
    return { accepted: true, id, record: { ...record, tokens: undefined } };
  }

  hydrate(entries = []) {
    this.entries.clear();
    for (const entry of entries.slice(0, this.maxEntries)) this.entries.set(entry.id, { ...entry, tokens: tokens(entry.text) });
    return { loaded: this.entries.size };
  }

  review(id, reviewed) { const entry = this.entries.get(id); if (entry) entry.reviewed = reviewed === true; return Boolean(entry); }

  search(query, { limit = this.maxResultCount, budgetMs = 120, sessionId = null, userId = "local-owner" } = {}) {
    const started = performance.now();
    if (typeof sessionId !== "string" || !sessionId) return { results: [], degraded: "memory_scope_required", elapsedMs: performance.now() - started };
    const queryTokens = tokens(query);
    const candidates = [];
    for (const entry of this.entries.values()) {
      if (performance.now() - started > budgetMs) return { results: candidates.slice(0, limit), degraded: "latency_budget_exceeded", elapsedMs: performance.now() - started };
      if (sessionId && entry.sessionId && entry.sessionId !== sessionId) continue;
      if ((entry.userId || "local-owner") !== userId) continue;
      const overlap = queryTokens.filter(token => entry.tokens.includes(token)).length;
      if (!overlap) continue;
      const confidence = overlap / Math.max(queryTokens.length, 1);
      candidates.push({ id: entry.id, source: entry.source, text: entry.text.slice(0, 600), score: confidence, confidence, reason: "local_token_overlap", traceRef: entry.traceRef, sessionId: entry.sessionId, userId: entry.userId || "local-owner", scopeLevel:entry.scopeLevel || (entry.sessionId ? "session" : "user_global"), reviewed: entry.reviewed, allowedUse: entry.reviewed ? "supporting_context" : "candidate_only", sourceResolved: true, sourceInvalidated: false, authority: { allowedUse: entry.reviewed ? "supporting_context" : "candidate_only", durablePromotion: false, decisionClass: "A0", decisionId: null }, createdAt: entry.createdAt, updatedAt: entry.createdAt, admission: "search_support_candidate" });
    }
    candidates.sort((a, b) => b.score - a.score);
    return { results: candidates.slice(0, limit), degraded: null, elapsedMs: performance.now() - started };
  }
}
