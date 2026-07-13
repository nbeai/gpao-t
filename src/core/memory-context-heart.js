import {
  getMemorySearchStatus,
  readMemorySearchIndex,
  searchMemory,
} from "./memory-search.js";
import {
  buildMemoryReviewQueueSummary,
} from "./memory-candidate-review-queue.js";
import {
  buildAutoMemoryGrowthSummary,
  verifyAutoMemoryGrowthLoop,
} from "./auto-memory-growth-loop.js";

const SCHEMA = "gpao_t.memory_context_heart.v1";

export function buildMemoryContextHeart({
  root,
  stateDir,
  query = "GPAO-T memory context",
  memoryStatus,
  memoryIndex,
  searchResult,
  reviewQueueSummary,
  autoGrowthSummary,
  autoGrowthVerification,
  now = new Date().toISOString(),
} = {}) {
  const status = memoryStatus || getMemorySearchStatus({ stateDir });
  const index = memoryIndex || readMemorySearchIndex({ stateDir });
  const result = searchResult || safeRead(() => searchMemory({ query, stateDir, limit: 5 }), null);
  const reviewQueue = reviewQueueSummary || buildMemoryReviewQueueSummary({ root });
  const growthSummary = autoGrowthSummary || buildAutoMemoryGrowthSummary({ root });
  const growthVerification = autoGrowthVerification || verifyAutoMemoryGrowthLoop({ root });
  const observations = [
    ...classifySearchStatus({ status, index, result }),
    ...classifyReviewQueue(reviewQueue),
    ...classifyAutoGrowth({ growthSummary, growthVerification }),
  ];
  const severity = highestSeverity(observations);
  return {
    schema: `${SCHEMA}.summary`,
    generatedAt: now,
    status: severity === "P0" ? "blocked" : severity === "P1" || severity === "P2" ? "review" : "ready",
    severity,
    userVisibleStatus: buildUserVisibleStatus(observations),
    search: {
      status: status.status,
      baselineSearch: status.baselineSearch,
      externalQuotaRequired: status.embeddingSearch?.externalQuotaRequired === true,
      provider: status.embeddingSearch?.provider || null,
      indexDocuments: status.index?.documents || 0,
      resultCount: result?.results?.length || 0,
      degradedSources: (status.sources || []).filter((source) => source.status === "degraded").map((source) => source.id),
    },
    reviewQueue: {
      status: reviewQueue.status,
      counts: reviewQueue.counts,
      authority: reviewQueue.authority,
    },
    autoGrowth: {
      status: growthSummary.status,
      totalRuns: growthSummary.totalRuns,
      completedLocalAutoLoops: growthSummary.completedLocalAutoLoops,
      approvalRequired: growthSummary.approvalRequired,
      verificationStatus: growthVerification.status,
    },
    observations,
    authorityBoundary: {
      durableMemoryPromotion: "blocked",
      compatibilityMemoryWrite: "blocked",
      externalSend: "blocked",
      identityMutation: "blocked",
      liveRuleMutation: "blocked",
      sourceCompanionRequired: true,
      rollbackReceiptRequired: true,
    },
    completionClaimAllowed: false,
    completionClaimReason:
      "Memory/Context Heart completion requires local search, review queue, auto-growth authority, source companion, replay, and rollback evidence.",
    nextSafeAction: severity === "P0"
      ? "Repair memory search or authority gate before relying on long-term memory."
      : "Run live memory-search and context-admission QA after source contract verification.",
  };
}

export function verifyMemoryContextHeart({
  heart = buildMemoryContextHeart(),
} = {}) {
  const findings = [];
  const ids = new Set((heart.observations || []).map((item) => item.id));
  if (heart.schema !== `${SCHEMA}.summary`) findings.push("invalid_memory_context_schema");
  if (heart.completionClaimAllowed !== false) findings.push("completion_gate_open");
  if (heart.search?.externalQuotaRequired !== false) findings.push("external_embedding_quota_required");
  if (heart.authorityBoundary?.durableMemoryPromotion !== "blocked") findings.push("durable_memory_promotion_open");
  if (heart.authorityBoundary?.compatibilityMemoryWrite !== "blocked") findings.push("compatibility_memory_write_open");
  if (heart.authorityBoundary?.externalSend !== "blocked") findings.push("external_send_open");
  if (heart.authorityBoundary?.sourceCompanionRequired !== true) findings.push("source_companion_not_required");
  if (heart.authorityBoundary?.rollbackReceiptRequired !== true) findings.push("rollback_receipt_not_required");
  if (!ids.has("local_memory_search_available")) findings.push("local_memory_search_not_available");
  if (!ids.has("memory_review_queue_authority_closed")) findings.push("memory_review_queue_authority_not_closed");
  if (!ids.has("auto_growth_authority_passed")) findings.push("auto_growth_authority_not_passed");
  if (heart.userVisibleStatus?.language !== "gpao_t_user_safe") findings.push("user_safe_language_missing");
  return {
    schema: `${SCHEMA}.verification`,
    status: findings.length ? "blocked" : "ready",
    findings,
    observedIds: [...ids].sort(),
    completionClaimAllowed: false,
    nextSafeAction: findings.length
      ? "Repair Memory/Context Heart search, queue, or authority contract."
      : "Wire Memory/Context Heart into CLI/API evidence and continue Tool/MCP/Authority Heart.",
  };
}

function classifySearchStatus({ status, index, result }) {
  const observations = [];
  const degradedSources = (status.sources || []).filter((source) => source.status === "degraded");
  const ready = status.embeddingSearch?.externalQuotaRequired === false
    && (status.status === "ready" || result?.status === "ready");
  observations.push({
    id: ready ? "local_memory_search_available" : "local_memory_search_needs_index",
    severity: ready ? "info" : "P1",
    ok: ready,
    userLabel: ready ? "로컬 메모리 검색 가능" : "메모리 인덱스 필요",
    userMessage: ready
      ? "외부 embedding 쿼터 없이도 GPAO-T 로컬 메모리 검색이 작동합니다."
      : "메모리 검색을 쓰려면 로컬 인덱스를 먼저 만들어야 합니다.",
    details: {
      status: status.status,
      documents: index.counts?.documents || 0,
      resultCount: result?.results?.length || 0,
    },
  });
  if (degradedSources.length) {
    observations.push({
      id: "degraded_memory_sources_skipped",
      severity: "P2",
      ok: false,
      userLabel: "읽기 어려운 메모리 원본 제외",
      userMessage: "일부 원본 파일이 로컬에 완전히 내려와 있지 않아 검색에서 제외되었습니다.",
      details: { sources: degradedSources.map((source) => source.id) },
    });
  }
  return observations;
}

function classifyReviewQueue(summary) {
  const authorityClosed = summary.authority?.durableMemoryPromotion === "blocked"
    && summary.authority?.compatibilityMemoryWrite === "blocked"
    && summary.authority?.externalSend === "blocked"
    && summary.authority?.applyRequiresExplicitApproval === true;
  return [{
    id: authorityClosed ? "memory_review_queue_authority_closed" : "memory_review_queue_authority_open",
    severity: authorityClosed ? "info" : "P0",
    ok: authorityClosed,
    userLabel: authorityClosed ? "기억 후보 승인 경계 정상" : "기억 후보 승인 경계 문제",
    userMessage: authorityClosed
      ? "기억 후보는 검토/승인 경계를 거치며, 자동 장기 승격은 차단되어 있습니다."
      : "기억 후보가 승인 없이 장기 기억이나 외부 행동으로 넘어갈 위험이 있습니다.",
    details: { counts: summary.counts },
  }];
}

function classifyAutoGrowth({ growthSummary, growthVerification }) {
  return [{
    id: growthVerification.status === "passed" ? "auto_growth_authority_passed" : "auto_growth_authority_failed",
    severity: growthVerification.status === "passed" ? "info" : "P0",
    ok: growthVerification.status === "passed",
    userLabel: growthVerification.status === "passed" ? "자가성장 권한 경계 정상" : "자가성장 권한 경계 문제",
    userMessage: growthVerification.status === "passed"
      ? "로컬 안전 후보는 자동 기록 가능하지만 외부/비밀/정체성/파괴적 변경은 승인 필요로 막힙니다."
      : "자가성장 루프의 승인 경계가 기대와 다릅니다.",
    details: {
      totalRuns: growthSummary.totalRuns,
      completedLocalAutoLoops: growthSummary.completedLocalAutoLoops,
      findings: growthVerification.findings || [],
    },
  }];
}

function highestSeverity(observations) {
  const order = ["P0", "P1", "P2", "info"];
  return order.find((severity) => observations.some((item) => item.severity === severity)) || "info";
}

function buildUserVisibleStatus(observations) {
  const firstProblem = observations.find((item) => item.severity === "P0")
    || observations.find((item) => item.severity === "P1")
    || observations.find((item) => item.severity === "P2");
  if (firstProblem) {
    return {
      language: "gpao_t_user_safe",
      label: firstProblem.severity === "P0" ? "복구 필요" : "검토 필요",
      message: firstProblem.userMessage,
    };
  }
  return {
    language: "gpao_t_user_safe",
    label: "메모리/맥락 기본 상태 정상",
    message: "GPAO-T 로컬 검색, 기억 후보 검토, 자가성장 권한 경계가 확인되었습니다.",
  };
}

function safeRead(read, fallback) {
  try {
    return read();
  } catch {
    return fallback;
  }
}
