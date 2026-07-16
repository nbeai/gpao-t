const CONCEPTS = Object.freeze({
  current_request:["지금", "현재", "방금", "이번", "새 요청", "부탁한", "요청한", "current", "latest", "just asked"],
  prior_context:["이전", "과거", "예전", "기존", "오래된", "앞선", "prior", "previous", "old"],
  priority:["우선", "먼저", "앞에", "앞세", "중심", "prioritize", "before", "first"],
  core_summary:["핵심", "요점", "결론", "중요한 내용", "한마디", "summary", "conclusion", "main point"],
  detail_reason:["세부", "상세", "근거", "이유", "배경", "detail", "reason", "rationale"],
  external_transfer:["외부", "밖으로", "공유", "보내", "전송", "배포", "내보내", "external", "share", "send", "publish"],
  personal_identity:["개인", "식별", "이름", "연락처", "누구인지", "신원", "personal", "identity", "identifiable"],
  redact_remove:["제거", "지우", "지운", "없애", "가리", "비식별", "익명", "redact", "remove", "anonymize"],
  decided:["결정", "합의", "확정", "결론 난", "끝난", "decided", "agreed", "finalized"],
  pending:["논의 중", "미정", "보류", "결론 나지", "아직", "남은", "pending", "unresolved", "open item"],
  separate:["구분", "나눠", "분리", "따로", "distinguish", "separate", "split"],
  modify_overwrite:["덮어쓰", "바꾸", "수정", "변경", "교체", "overwrite", "modify", "replace"],
  backup_copy:["복사본", "사본", "백업", "원본", "copy", "backup", "snapshot"],
  restore_rollback:["되돌", "원래 상태", "복구", "회복", "롤백", "restore", "recover", "rollback"],
  approval:["승인", "허가", "동의", "확인받", "approval", "permission", "consent"],
  preserve:["보존", "보관", "저장", "남겨", "기록", "preserve", "retain", "store"],
  evidence:["증거", "영수증", "근거", "추적", "evidence", "receipt", "trace"]
});

const CLAUSES = Object.freeze({
  current_over_prior:[["current_request", "prior_context", "priority"]],
  core_before_detail:[["core_summary", "detail_reason", "priority"]],
  redact_before_external:[["external_transfer", "personal_identity", "redact_remove"]],
  separate_decided_pending:[["decided", "pending", "separate"]],
  backup_before_modify:[["modify_overwrite", "backup_copy", "restore_rollback"]],
  approval_before_external:[["external_transfer", "approval"]],
  preserve_trace:[["preserve", "evidence"]]
});

const GENERIC = new Set(["priority", "preserve", "external_transfer"]);
const STOPWORDS = new Set(["그리고", "하지만", "위해서", "대해서", "해줘", "알려줘", "한다", "하도록", "the", "and", "for", "with", "please"]);
const NEGATION = /(?:하지\s*마|하지\s*않|말아|금지|무시|사용하지|따르지|아니|없|제거하지|지우지|never|\bnot\b|don't|do not|without|ignore|stop)/iu;

function normalize(value) {
  return String(value || "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, " ").replace(/\s+/g, " ").trim();
}

function compact(value) { return normalize(value).replaceAll(" ", ""); }

function lexicalTokens(value) {
  return [...new Set(normalize(value).split(" ").filter(token => token.length >= 2 && !STOPWORDS.has(token)))];
}

function trigrams(value) {
  const source = compact(value);
  if (source.length < 3) return source ? [source] : [];
  return [...new Set(Array.from({ length:source.length - 2 }, (_, index) => source.slice(index, index + 3)))];
}

function genericTaskFit(query, candidateText) {
  const queryTokens = lexicalTokens(query);
  const candidate = normalize(candidateText);
  const tokenCoverage = queryTokens.length ? queryTokens.filter(token => candidate.includes(token)).length / queryTokens.length : 0;
  const queryTrigrams = trigrams(query);
  const candidateTrigrams = new Set(trigrams(candidateText));
  const trigramCoverage = queryTrigrams.length ? queryTrigrams.filter(token => candidateTrigrams.has(token)).length / queryTrigrams.length : 0;
  return { tokenCoverage, trigramCoverage, relevance:Math.min(1, tokenCoverage * 0.82 + trigramCoverage * 0.18) };
}

export function semanticConcepts(value) {
  const normalized = normalize(value);
  const joined = normalized.replaceAll(" ", "");
  return Object.entries(CONCEPTS).filter(([, variants]) => variants.some(variant => {
    const candidate = normalize(variant);
    return normalized.includes(candidate) || joined.includes(candidate.replaceAll(" ", ""));
  })).map(([concept]) => concept);
}

export function semanticClauses(value) {
  const concepts = new Set(semanticConcepts(value));
  return Object.entries(CLAUSES).filter(([, alternatives]) => alternatives.some(required => required.every(concept => concepts.has(concept)))).map(([clause]) => clause);
}

export function semanticProjectionTerms(value) {
  return [...semanticConcepts(value).map(item => `concept_${item}`), ...semanticClauses(value).map(item => `clause_${item}`)];
}

export function semanticFtsQuery(value) {
  if (!evaluateSemanticCandidate(value, value).hasSignal) return "";
  return semanticProjectionTerms(value).map(term => `"${term}"`).join(" OR ");
}

export function evaluateSemanticCandidate(query, candidateText) {
  const queryConcepts = semanticConcepts(query);
  const candidateConcepts = new Set(semanticConcepts(candidateText));
  const queryClauses = semanticClauses(query);
  const candidateClauses = new Set(semanticClauses(candidateText));
  const sharedClauses = queryClauses.filter(clause => candidateClauses.has(clause));
  const distinctive = queryConcepts.filter(concept => !GENERIC.has(concept));
  const matched = queryConcepts.filter(concept => candidateConcepts.has(concept));
  const matchedDistinctive = distinctive.filter(concept => candidateConcepts.has(concept));
  const conceptCoverage = queryConcepts.length ? matched.length / queryConcepts.length : 0;
  const distinctiveCoverage = distinctive.length ? matchedDistinctive.length / distinctive.length : 0;
  const clauseCoverage = queryClauses.length ? sharedClauses.length / queryClauses.length : 0;
  const hasSignal = queryClauses.length > 0 || distinctive.length >= 2;
  const lexical = genericTaskFit(query, candidateText);
  const queryNegated = NEGATION.test(String(query || ""));
  const candidateNegated = NEGATION.test(String(candidateText || ""));
  const polarityComparable = sharedClauses.length > 0 || lexical.tokenCoverage >= 0.5;
  const polarityCompatible = !polarityComparable || queryNegated === candidateNegated;
  const semanticRelevance = Math.min(1, clauseCoverage * 0.68 + distinctiveCoverage * 0.22 + conceptCoverage * 0.1);
  const relevance = hasSignal ? Math.max(semanticRelevance, lexical.relevance * 0.8) : lexical.relevance;
  const structuralEntailment = queryClauses.length > 0
    ? sharedClauses.length > 0
    : distinctive.length >= 2
      ? matchedDistinctive.length >= Math.max(2, Math.ceil(distinctive.length * 0.7))
      : lexical.tokenCoverage >= 0.5 && lexical.relevance >= 0.35;
  const entailment = polarityCompatible && structuralEntailment;
  return {
    schema:"gpao_t3.semantic_task_fit.v1",
    providerNeutral:true,
    algorithm:"bounded_semantic_features_v2",
    hasSignal,
    relevance,
    entailment,
    tokenCoverage:lexical.tokenCoverage,
    trigramCoverage:lexical.trigramCoverage,
    queryNegated,
    candidateNegated,
    polarityComparable,
    polarityCompatible,
    queryConcepts,
    candidateConcepts:[...candidateConcepts],
    queryClauses,
    candidateClauses:[...candidateClauses],
    sharedClauses
  };
}
