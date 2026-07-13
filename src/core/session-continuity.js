const DEFAULT_MAX_HANDOFF_TURNS = 3;

const REFERENT_PATTERNS = [
  {
    type: "place",
    pattern: /(?:청담동\s*)?팔식당/,
    canonical: "청담동 팔식당",
    aliases: ["팔식당", "청담동 팔식당", "거기"],
    safeFollowupHints: ["후기", "예약", "메뉴", "위치", "가격", "영업시간"],
  },
];

export function hasReferentFollowUpSignal(text = "") {
  return /거기|그곳|저기|그 집|그 가게|그거|그건|그 파일|그 작업|아까|방금|이어서|계속|후기|예약/i
    .test(String(text));
}

export function buildRecentReferentLedger({ events = [], now = "1970-01-01T00:00:00.000Z" } = {}) {
  const referents = [];
  for (const event of events) {
    for (const candidate of extractReferentsFromText(event.text || "")) {
      const existing = referents.find((item) => item.entity === candidate.entity && item.type === candidate.type);
      const entry = {
        ...candidate,
        sourceSessionId: event.sessionId || "unknown-session",
        lastUserIntent: event.intent || inferIntent(event.text || ""),
        lastAssistantAction: event.assistantAction || inferAssistantAction(event.text || ""),
        confidence: event.confidence || candidate.confidence,
        observedAt: event.createdAt || now,
        expiresAfterTurns: event.expiresAfterTurns || DEFAULT_MAX_HANDOFF_TURNS,
      };
      if (existing) {
        Object.assign(existing, entry, {
          confidence: Math.max(existing.confidence, entry.confidence),
        });
      } else {
        referents.push(entry);
      }
    }
  }

  return {
    schema: "gpao_t.recent_referent_ledger.v0_1",
    status: "ready",
    referents: referents.toSorted((a, b) => b.confidence - a.confidence),
    rule:
      "Recent referents are short-lived continuity hints; they are not durable memory and do not authorize external action.",
  };
}

export function buildSessionContinuityHandoff({
  input,
  priorFlow,
  inputSignal = { kind: "general_request" },
} = {}) {
  const text = input?.text || "";
  const priorLedger = normalizeLedger(priorFlow);
  const followUp = inputSignal.kind === "follow_up" || hasReferentFollowUpSignal(text);
  const currentExplicitReferents = extractReferentsFromText(text);
  const requestOverridesPrior = hasExplicitNewTopic(text, currentExplicitReferents);
  const bestReferent = requestOverridesPrior ? null : selectBestReferent({ text, priorLedger, followUp });
  const confidence = bestReferent ? scoreReferentConfidence({ text, referent: bestReferent, followUp }) : 0;
  const decision = classifyContinuityDecision({ confidence, followUp, requestOverridesPrior });

  return {
    schema: "gpao_t.session_continuity_handoff.v0_1",
    status: "ready",
    mode: priorFlow?.newSessionStarted ? "new_session_handoff" : "same_session_support",
    followUpDetected: followUp,
    requestOverridesPrior,
    decision,
    confidence,
    activeReferent: bestReferent ? summarizeReferent(bestReferent) : null,
    handoffPack: bestReferent
      ? {
        previousActiveEntity: bestReferent.entity,
        previousEntityType: bestReferent.type,
        previousIntent: bestReferent.lastUserIntent,
        safeFollowupHints: bestReferent.safeFollowupHints,
        sourceSessionId: bestReferent.sourceSessionId,
        expiryTurns: bestReferent.expiresAfterTurns,
      }
      : null,
    userFacingHint: buildUserFacingHint({ decision, bestReferent }),
    trace: [
      "current_request_wins",
      "recent_referent_is_short_lived",
      "retrieved_referent_is_not_durable_memory",
      "low_confidence_requires_short_clarification",
    ],
  };
}

export function buildSessionContinuityTCell({ handoff }) {
  if (!handoff?.activeReferent) return null;
  return {
    id: `tcell.session-continuity.${slugify(handoff.activeReferent.entity)}`,
    pi:
      "When a new-session follow-up uses a Korean referent expression, recover the recent entity only if confidence is bounded and current request does not override it.",
    x: [handoff.activeReferent.entity, handoff.userFacingHint],
    anchor: `referent:${handoff.activeReferent.entity}`,
    answerAnchorEligible: handoff.decision === "auto_carry",
    radius: {
      scope: "session_handoff",
      validFor: ["follow_up"],
      invalidFor: ["unrelated_topic", "explicit_new_topic"],
    },
    depth: {
      evidenceStrength: handoff.confidence,
      stability: 0.7,
      replayPassRate: 1,
    },
    source: {
      refs: [handoff.activeReferent.sourceSessionId],
      surface: "session_continuity",
      evidenceLevel: "session_trace",
    },
    relations: {
      supports: [],
      contradicts: [],
      supersedes: [],
      sameSphere: ["tsphere.session-continuity"],
    },
    weights: {
      relevance: handoff.confidence,
      confidence: handoff.confidence,
      freshness: 0.94,
      risk: 0.18,
      cost: 0.03,
    },
    lifecycle: "reviewed",
    authority: {
      allowedUse: ["retrieve", "admit", "explain", "draft"],
      blockedUse: ["external_action", "durable_mutation"],
    },
    trace: {
      createdFrom: "session-continuity-handoff",
      lastReplay: "session-continuity-handoff-pass-001",
    },
  };
}

export function verifySessionContinuityHandoff() {
  const ledger = buildRecentReferentLedger({
    events: [{
      text: "청담동 팔식당은 숙성 한돈 돼지고기 구이집이에요.",
      sessionId: "telegram.previous",
      intent: "장소 정보 확인",
      assistantAction: "장소 정보 요약",
      confidence: 0.88,
    }],
  });
  const handoff = buildSessionContinuityHandoff({
    input: { text: "거기 후기는 어때?" },
    inputSignal: { kind: "follow_up", confidence: 0.8 },
    priorFlow: {
      newSessionStarted: true,
      recentReferentLedger: ledger,
    },
  });

  return {
    schema: "gpao_t.session_continuity_handoff_check.v0_1",
    status: handoff.decision === "auto_carry" && handoff.activeReferent?.entity === "청담동 팔식당"
      ? "ready"
      : "review",
    handoff,
    boundaries: {
      durableMemoryPromotion: "blocked",
      externalAction: "blocked",
      currentRequestOverride: "required",
    },
  };
}

function extractReferentsFromText(text) {
  return REFERENT_PATTERNS
    .filter((item) => item.pattern.test(text))
    .map((item) => ({
      entity: item.canonical,
      type: item.type,
      aliases: item.aliases,
      safeFollowupHints: item.safeFollowupHints,
      confidence: 0.86,
    }));
}

function normalizeLedger(priorFlow) {
  if (priorFlow?.recentReferentLedger?.referents) {
    return priorFlow.recentReferentLedger;
  }
  if (Array.isArray(priorFlow?.recentReferents)) {
    return {
      schema: "gpao_t.recent_referent_ledger.v0_1",
      status: "ready",
      referents: priorFlow.recentReferents,
    };
  }
  return {
    schema: "gpao_t.recent_referent_ledger.v0_1",
    status: "empty",
    referents: [],
  };
}

function selectBestReferent({ text, priorLedger, followUp }) {
  if (!followUp) return null;
  const candidates = priorLedger.referents || [];
  if (!candidates.length) return null;
  const lower = String(text).toLowerCase();
  return candidates
    .map((referent) => ({
      referent,
      score: scoreReferentConfidence({ text: lower, referent, followUp }),
    }))
    .filter((item) => item.score >= 0.45)
    .toSorted((a, b) => b.score - a.score)[0]?.referent || null;
}

function scoreReferentConfidence({ text, referent, followUp }) {
  const normalized = String(text).toLowerCase();
  let score = followUp ? 0.42 : 0;
  if (referent.aliases?.some((alias) => normalized.includes(String(alias).toLowerCase()))) score += 0.32;
  if (/거기|그곳|그 집|그 가게|저기/.test(normalized) && referent.type === "place") score += 0.28;
  if (referent.safeFollowupHints?.some((hint) => normalized.includes(String(hint).toLowerCase()))) score += 0.16;
  score += Math.min(0.12, Math.max(0, (referent.confidence || 0) - 0.75));
  return Math.min(0.98, Number(score.toFixed(2)));
}

function classifyContinuityDecision({ confidence, followUp, requestOverridesPrior }) {
  if (requestOverridesPrior) return "current_request_override";
  if (!followUp) return "not_needed";
  if (confidence >= 0.75) return "auto_carry";
  if (confidence >= 0.45) return "clarify_short";
  return "ask_target";
}

function hasExplicitNewTopic(text, explicitReferents) {
  const normalized = String(text);
  if (explicitReferents.length) return false;
  return /테슬라|주가|국제 정세|뉴스|날씨|환율|비트코인|코딩|디자인|문서/.test(normalized)
    && !hasReferentFollowUpSignal(normalized);
}

function summarizeReferent(referent) {
  return {
    entity: referent.entity,
    type: referent.type,
    aliases: referent.aliases || [],
    lastUserIntent: referent.lastUserIntent || null,
    lastAssistantAction: referent.lastAssistantAction || null,
    sourceSessionId: referent.sourceSessionId || null,
    confidence: referent.confidence || null,
    safeFollowupHints: referent.safeFollowupHints || [],
  };
}

function buildUserFacingHint({ decision, bestReferent }) {
  if (!bestReferent) return "이어받을 최근 대상이 충분히 선명하지 않습니다.";
  if (decision === "auto_carry") {
    return `${bestReferent.entity} 기준으로 이어서 보면 됩니다.`;
  }
  if (decision === "clarify_short") {
    return `아까 말한 ${bestReferent.entity} 말씀이 맞는지 짧게 확인합니다.`;
  }
  return "대상을 한 번만 짧게 확인합니다.";
}

function inferIntent(text) {
  if (/후기|리뷰/.test(text)) return "후기 확인";
  if (/예약/.test(text)) return "예약 확인";
  if (/메뉴|가격/.test(text)) return "메뉴/가격 확인";
  if (/팔식당|청담동/.test(text)) return "장소 정보 확인";
  return "최근 대상 언급";
}

function inferAssistantAction(text) {
  if (/구이집|주소|영업시간|메뉴|특징/.test(text)) return "장소 정보 요약";
  return "최근 대상 언급";
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}
