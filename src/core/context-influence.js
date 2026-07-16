import crypto from "node:crypto";

function words(text) {
  return [...new Set(String(text || "").toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) || [])];
}

function overlapScore(left, right) {
  const leftWords = words(left);
  if (!leftWords.length) return 0;
  const rightWords = words(right);
  const overlap = leftWords.filter(word => rightWords.includes(word)).length;
  return overlap / leftWords.length;
}

export class ContextInfluenceLedger {
  constructor({ maxEntries = 200, maxActivePerSession = 12 } = {}) {
    this.maxEntries = maxEntries;
    this.maxActivePerSession = maxActivePerSession;
    this.entries = new Map();
  }

  hydrate(entries = []) {
    this.entries.clear();
    for (const input of entries.slice(0, this.maxEntries)) {
      this.entries.set(input.id, {
        schema: "gpao_t3.context_influence.v1", id: input.id, state: input.state,
        useState: input.state === "applied" ? "answer_anchor" : "blocked", sourceCandidateId: input.sourceCandidateId,
        text: input.text, traceRef: input.traceRef, taskPacketId: null, scope: input.scope,
        authority: { durableMemoryPromotion: true, externalAction: false, mustNotOverrideCurrentRequest: true, rollbackRequired: true },
        replayRef: input.sourceCandidateId, replayScore: input.replayScore, growthCandidateId: null,
        authorityDecisionId: input.authorityDecisionId || null,
        sourceResolved: input.sourceResolved === true,
        sourceInvalidated: input.sourceInvalidated === true,
        rollbackToken: input.rollbackToken, createdAt: input.createdAt, appliedAt: input.appliedAt,
        rolledBackAt: input.rolledBackAt, rollbackReason: input.rollbackReason
      });
    }
    return { loaded: this.entries.size };
  }

  activeForTask({ sessionId, userId = "local-owner", projectId = null, channelId = null, input, limit = 4 } = {}) {
    const active = [...this.entries.values()]
      .filter(entry => entry.state === "applied" && entry.sourceResolved === true && entry.sourceInvalidated !== true && entry.scope.userId === userId && (!entry.scope.channelId || entry.scope.channelId === channelId) && ((entry.scope.level === "user_global") || (entry.scope.level === "project" && entry.scope.projectId === projectId) || (entry.scope.level === "session" && entry.scope.sessionId === sessionId)))
      .map(entry => ({ entry, score: Math.max(entry.replayScore, overlapScore(input, entry.text)) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return active.map(({ entry, score }) => ({
      id: `influence_${entry.id}`,
      source: "approved_context_influence",
      text: entry.text,
      score,
      confidence: score,
      reason: "approved_replay_safe_context_influence",
      traceRef: entry.traceRef,
      sessionId: entry.scope.sessionId,
      scopeLevel: entry.scope.level,
      projectId: entry.scope.projectId,
      userId: entry.scope.userId,
      channelId: entry.scope.channelId,
      reviewed: true,
      allowedUse: "answer_anchor",
      approvedInfluence: true,
      sourceResolved: entry.sourceResolved,
      sourceInvalidated: entry.sourceInvalidated,
      authority: { allowedUse: "answer_anchor", durablePromotion: true, decisionClass: "A2", decisionId: entry.authorityDecisionId },
      influenceId: entry.id,
      replayPassed: true,
      createdAt: entry.createdAt,
      updatedAt: entry.appliedAt,
      admission: "approved_influence_candidate"
    }));
  }

  recordTurnOutcome({ taskPacket, admission, replay, growthCandidate } = {}) {
    const admitted = admission?.admitted || [];
    if (!taskPacket || !replay || !admitted.length) {
      return { schema: "gpao_t3.context_influence_update.v1", state: "held", reason: "no_admitted_context", applied: [] };
    }
    if (replay.passed !== true) {
      return { schema: "gpao_t3.context_influence_update.v1", state: "held", reason: "replay_failed", applied: [] };
    }
    if (!admitted.some(candidate => candidate.approvedInfluence === true && candidate.authority?.durablePromotion === true && candidate.authority?.decisionClass === "A2" && candidate.authority?.decisionId)) {
      return { schema: "gpao_t3.context_influence_update.v1", state: "held", reason: "a2_authority_required", applied: [], durableMemoryPromotion: false };
    }
    const applied = [];
    for (const candidate of admitted) {
      if (!candidate.approvedInfluence || candidate.authority?.decisionClass !== "A2" || !candidate.authority?.decisionId) continue;
      const duplicateActive = [...this.entries.values()].some(entry =>
        entry.state === "applied" &&
        entry.scope.sessionId === taskPacket.sessionId &&
        entry.sourceCandidateId === candidate.id
      );
      if (duplicateActive) continue;
      if (this.entries.size >= this.maxEntries) break;
      const sessionActive = [...this.entries.values()].filter(entry => entry.state === "applied" && entry.scope.sessionId === taskPacket.sessionId);
      if (sessionActive.length >= this.maxActivePerSession) break;
      const id = `ctx_${crypto.randomUUID()}`;
      const entry = {
        schema: "gpao_t3.context_influence.v1",
        id,
        state: "applied",
        useState: candidate.approvedInfluence ? "answer_anchor" : "supporting_context",
        sourceCandidateId: candidate.id,
        text: candidate.text || candidate.summary || candidate.source || candidate.id,
        traceRef: candidate.traceRef || taskPacket.id,
        taskPacketId: taskPacket.id,
        scope: { level: "session", sessionId: taskPacket.sessionId, projectId: taskPacket.contextIdentity?.projectId || null, userId: taskPacket.contextIdentity?.userId || "local-owner", channelId: taskPacket.contextIdentity?.channelId || null },
        authorityDecisionId: candidate.authority.decisionId,
        sourceResolved: candidate.sourceResolved === true,
        sourceInvalidated: candidate.sourceInvalidated === true,
        authority: {
          durableMemoryPromotion: false,
          externalAction: false,
          mustNotOverrideCurrentRequest: true,
          rollbackRequired: true
        },
        replayRef: replay.taskPacketId,
        replayScore: candidate.score || 0.5,
        growthCandidateId: growthCandidate?.id || null,
        rollbackToken: `rollback_${crypto.randomUUID()}`,
        createdAt: Date.now(),
        appliedAt: Date.now(),
        rolledBackAt: null,
        rollbackReason: null
      };
      this.entries.set(id, entry);
      applied.push(this.publicEntry(entry));
    }
    return {
      schema: "gpao_t3.context_influence_update.v1",
      state: applied.length ? "applied" : "held",
      reason: applied.length ? "replay_passed_reviewed_context" : "capacity_limit",
      applied,
      durableMemoryPromotion: false
    };
  }

  rollback(id, { reason = "user_or_replay_requested" } = {}) {
    const entry = this.entries.get(id);
    if (!entry) return { schema: "gpao_t3.context_influence_rollback.v1", rolledBack: false, reason: "not_found" };
    if (entry.state === "rolled_back") return { schema: "gpao_t3.context_influence_rollback.v1", rolledBack: false, reason: "already_rolled_back", entry: this.publicEntry(entry) };
    entry.state = "rolled_back";
    entry.useState = "blocked";
    entry.rolledBackAt = Date.now();
    entry.rollbackReason = reason;
    return { schema: "gpao_t3.context_influence_rollback.v1", rolledBack: true, entry: this.publicEntry(entry) };
  }

  snapshot({ userId = null } = {}) {
    const entries = [...this.entries.values()].filter(entry => !userId || entry.scope.userId === userId).map(entry => this.publicEntry(entry));
    return {
      schema: "gpao_t3.context_influence_ledger.v1",
      activeCount: entries.filter(entry => entry.state === "applied").length,
      rolledBackCount: entries.filter(entry => entry.state === "rolled_back").length,
      durableMemoryPromotion: false,
      externalAction: false,
      entries
    };
  }

  publicEntry(entry) {
    return {
      schema: entry.schema,
      id: entry.id,
      state: entry.state,
      useState: entry.useState,
      sourceCandidateId: entry.sourceCandidateId,
      traceRef: entry.traceRef,
      taskPacketId: entry.taskPacketId,
      scope: entry.scope,
      authority: entry.authority,
      replayRef: entry.replayRef,
      growthCandidateId: entry.growthCandidateId,
      rollbackToken: entry.rollbackToken,
      createdAt: entry.createdAt,
      appliedAt: entry.appliedAt,
      rolledBackAt: entry.rolledBackAt,
      rollbackReason: entry.rollbackReason
    };
  }
}
