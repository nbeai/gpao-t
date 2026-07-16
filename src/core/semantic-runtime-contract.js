import { canonicalDigest } from "./canonical-json.js";

export const SEMANTIC_RUNTIME_CONTRACT_VERSION = 1;

export const EMBEDDING_ADAPTER_CAPABILITIES = Object.freeze([
  "embedQuery",
  "embedDocuments",
  "batch",
  "cancel",
  "deadline",
  "health",
  "modelIdentity",
  "dimensions",
  "queryInputType",
  "documentInputType"
]);

export const RERANKER_ADAPTER_CAPABILITIES = Object.freeze([
  "rerank",
  "cancel",
  "deadline",
  "health",
  "modelIdentity",
  "scoreCalibration"
]);

export const SEMANTIC_COMPARISON_TARGETS = Object.freeze([
  "t3_pre_semantic_lexical_checkpoint",
  "live_reference_local_hybrid",
  "openclaw_fixed_version",
  "t3_reinforced_semantic"
]);

export const SEMANTIC_AUTHORITY_MATRIX = Object.freeze({
  local_embedding: "A0",
  local_reranking: "A0",
  background_reindex: "A1",
  model_asset_status_notice: "A1",
  remote_embedding_raw_content: "A2",
  remote_reranking_raw_content: "A2",
  production_asset_selection: "A2",
  external_provider_data_path: "A2"
});

export const SEMANTIC_BENCHMARK_CONTRACT = Object.freeze({
  schema: "gpao_t3.semantic_benchmark_contract.v1",
  inheritedWithoutWeakeningFrom: "gpao_t3.mct_r0_seal.v1",
  seed: "gpao-t3-mct-r0-2026-07-16",
  generator: "deterministic-mixed-memory-v1",
  records: 10_000,
  splits: Object.freeze({ development: 6_000, evaluation: 2_000, holdout: 2_000 }),
  composition: Object.freeze({ korean: 0.55, english: 0.2, code: 0.15, mixed: 0.1 }),
  averageRecordTokens: 180,
  totalRecordTokens: 1_800_000,
  concurrency: Object.freeze([1, 4]),
  resultK: Object.freeze([5, 10]),
  temperatures: Object.freeze(["cold", "warm"]),
  temperatureContract: Object.freeze({
    cold: "fresh_node_process_and_sqlite_connection_no_application_cache_os_page_cache_uncontrolled",
    warm: "subsequent_queries_in_same_node_process_and_sqlite_connection"
  }),
  modes: Object.freeze([
    "lexical_only",
    "hybrid_local_vector",
    "hybrid_local_embedding",
    "hybrid_local_embedding_reranked"
  ]),
  independentHoldout: Object.freeze({
    contentInImplementationRepository: false,
    generatedAfterSourceFreeze: true,
    authorMayInspectImplementation: false,
    implementationMayInspectHoldout: false,
    rerunAfterResultTuning: false
  })
});

export const SEMANTIC_RESOURCE_BUDGET = Object.freeze({
  embeddingAssetBytesMax: 800_000_000,
  rerankerAssetBytesMax: 600_000_000,
  combinedManagedAssetsBytesMax: 1_500_000_000,
  residentMemoryBytesMax: 2_000_000_000,
  foregroundRetrievalP95MsMax: 250,
  coldModelReadinessMsMax: 3_000,
  firstProgressP95MsMax: 250,
  firstUsefulResponseAddedP95MsMax: 100,
  backgroundIdleCpuPercentMax: 1,
  backgroundSustainedCpuPercentMax: 70,
  reindexEnergyRegressionRatioMax: 0.2,
  memoryPromptRatioMax: 0.1,
  measurement: Object.freeze({
    warmLatency: "200_queries_after_20_warmup_queries_same_process_and_connection",
    coldReadiness: "20_fresh_process_runs_with_no_application_cache",
    idleCpu: "30_second_average_after_model_ready_with_empty_queue",
    sustainedCpu: "5_minute_average_during_10000_record_reindex",
    energy: "platform_native_energy_sample_during_same_10000_record_reindex_compared_with_lexical_baseline",
    memory: "peak_resident_set_during_warm_query_and_reindex",
    receiptFields: Object.freeze(["osBuild", "cpuModel", "architecture", "memoryBytes", "nodeVersion", "runtimeVersion", "powerMode"])
  })
});

export const SEMANTIC_QUALITY_GATES = Object.freeze({
  semanticRecallAt5Min: 0.85,
  recallUpliftOverLexicalMin: 0.15,
  mrrAt5Min: 0.8,
  ndcgAt5Min: 0.85,
  exactRecallAt10Min: 0.9,
  fuzzyRecallAt10Min: 0.8,
  exactMrrMin: 0.8,
  fuzzyMrrMin: 0.8,
  ndcgAt10Min: 0.85,
  answerAnchorPrecisionMin: 0.98,
  answerAnchorAccuracyMin: 1,
  taskFitPositiveRecallMin: 0.9,
  contradictionDetectionMin: 0.95,
  rerankerExpectedCalibrationErrorMax: 0.1,
  exactRetrievalRegressionMax: 0,
  typoRetrievalRegressionMax: 0,
  qualityPer1000TokensRegressionMax: 0,
  recoverySuccessMin: 1,
  noResultRestraintMin: 1,
  scopeLeakageRateMax: 0,
  wrongAnswerAnchorRateMax: 0,
  currentRequestPreservationMin: 1,
  promptBudgetComplianceMin: 1,
  unauthorizedMutationMax: 0,
  duplicateApprovalRequestsMax: 0,
  approvalDecisionsPerTaskMax: 1
});

export const SEMANTIC_INVARIANTS = Object.freeze([
  "embedding_and_reranker_never_grant_action_authority",
  "retrieval_similarity_never_bypasses_tcell_admission",
  "current_request_overrides_memory",
  "scope_filter_precedes_prompt_composition",
  "invalid_or_revoked_sources_never_influence_future_turns",
  "known_holdout_wording_never_enters_production_rules",
  "model_setup_reindex_and_replay_never_block_normal_chat",
  "incompatible_vector_identities_never_mix",
  "remote_raw_content_requires_explicit_a2",
  "fallback_never_weakens_deterministic_safety_guards"
]);

export const SEMANTIC_FAILURE_CONTRACT = Object.freeze({
  model_unavailable: Object.freeze({ fallback: "bounded_lexical", chat: "continue", notice: "A1_immediate", noticeAfterConsecutiveFailures: 1, repair: "doctor_model_check" }),
  embedding_timeout: Object.freeze({ fallback: "bounded_lexical", chat: "continue", notice: "A1_after_threshold", noticeAfterConsecutiveFailures: 3, repair: "doctor_model_check" }),
  reranker_timeout: Object.freeze({ fallback: "reduced_safe_candidate_set_or_no_memory", chat: "continue", notice: "A1_after_threshold", noticeAfterConsecutiveFailures: 3, repair: "doctor_model_check" }),
  out_of_memory: Object.freeze({ fallback: "bounded_lexical", chat: "continue", notice: "A1_immediate", noticeAfterConsecutiveFailures: 1, repair: "unload_model_and_recommend_smaller_asset" }),
  non_finite_vector: Object.freeze({ fallback: "reject_vector_and_use_bounded_lexical", chat: "continue", notice: "A1_after_threshold", noticeAfterConsecutiveFailures: 3, repair: "quarantine_model_or_record" }),
  dimension_mismatch: Object.freeze({ fallback: "reject_new_index", chat: "continue", notice: "A1_immediate", noticeAfterConsecutiveFailures: 1, repair: "rebuild_new_identity" }),
  tokenizer_mismatch: Object.freeze({ fallback: "reject_new_index", chat: "continue", notice: "A1_immediate", noticeAfterConsecutiveFailures: 1, repair: "restore_pinned_tokenizer_or_rebuild" }),
  remote_permission_revoked: Object.freeze({ fallback: "local_or_bounded_lexical", chat: "continue", notice: "A1_immediate", noticeAfterConsecutiveFailures: 1, repair: "remove_remote_route_and_request_new_authority_only_on_user_action" }),
  score_calibration_invalid: Object.freeze({ fallback: "deterministic_guards_and_no_answer_anchor", chat: "continue", notice: "A1_immediate", noticeAfterConsecutiveFailures: 1, repair: "restore_verified_calibration" }),
  index_corrupt: Object.freeze({ fallback: "last_verified_index_or_bounded_lexical", chat: "continue", notice: "A1_immediate", noticeAfterConsecutiveFailures: 1, repair: "doctor_rebuild" }),
  partial_rebuild: Object.freeze({ fallback: "last_verified_index", chat: "continue", notice: "A1_after_threshold", noticeAfterConsecutiveFailures: 3, repair: "resume_or_rollback" }),
  incompatible_identity: Object.freeze({ fallback: "reject_new_index", chat: "continue", notice: "A1_immediate", noticeAfterConsecutiveFailures: 1, repair: "rebuild_new_identity" }),
  cancellation: Object.freeze({ fallback: "discard_partial_result", chat: "continue", notice: "none", noticeAfterConsecutiveFailures: 0, repair: "none" }),
  asset_checksum_mismatch: Object.freeze({ fallback: "quarantine_asset_and_use_bounded_lexical", chat: "continue", notice: "A1_immediate", noticeAfterConsecutiveFailures: 1, repair: "verified_redownload" })
});

export const SEMANTIC_RUNTIME_CONTRACT = Object.freeze({
  schema: "gpao_t3.semantic_runtime_contract.v1",
  version: SEMANTIC_RUNTIME_CONTRACT_VERSION,
  embeddingAdapterCapabilities: EMBEDDING_ADAPTER_CAPABILITIES,
  rerankerAdapterCapabilities: RERANKER_ADAPTER_CAPABILITIES,
  comparisonTargets: SEMANTIC_COMPARISON_TARGETS,
  authority: SEMANTIC_AUTHORITY_MATRIX,
  benchmark: SEMANTIC_BENCHMARK_CONTRACT,
  resources: SEMANTIC_RESOURCE_BUDGET,
  qualityGates: SEMANTIC_QUALITY_GATES,
  invariants: SEMANTIC_INVARIANTS,
  failure: SEMANTIC_FAILURE_CONTRACT
});

const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const NON_EMPTY = value => typeof value === "string" && value.length > 0;
const EMBEDDING_IDENTITY_KEYS = Object.freeze([
  "schema", "version", "adapterId", "providerClass", "modelId", "revision",
  "artifactDigest", "license", "runtime", "dimensions", "maxInputTokens",
  "queryInputType", "documentInputType", "quantization", "tokenizerDigest",
  "preprocessingContractDigest", "runtimeDigest", "pooling", "normalization"
]);
const RERANKER_IDENTITY_KEYS = Object.freeze([
  "schema", "version", "adapterId", "providerClass", "modelId", "revision",
  "artifactDigest", "license", "runtime", "maxInputTokens", "queryInputType",
  "documentInputType", "quantization", "scoreCalibration",
  "outputContractDigest", "preprocessingContractDigest"
]);
const INDEX_IDENTITY_KEYS = Object.freeze([
  "schema", "version", "embeddingModelIdentityDigest", "dimensions",
  "sourceContractDigest", "tokenizerContractDigest", "scopeContractDigest",
  "vectorMetric", "normalization"
]);

function unsupportedKeys(value, allowed) {
  return Object.keys(value).filter(key => !allowed.includes(key)).map(key => `unsupported:${key}`);
}

export function semanticContractDigest(contract = SEMANTIC_RUNTIME_CONTRACT) {
  return canonicalDigest("gpao_t3.semantic_runtime_contract.v1", contract);
}

export function assertSemanticAdapter(adapter, kind) {
  const capabilities = kind === "embedding"
    ? EMBEDDING_ADAPTER_CAPABILITIES
    : kind === "reranker"
      ? RERANKER_ADAPTER_CAPABILITIES
      : null;
  if (!capabilities) throw new TypeError("unsupported_semantic_adapter_kind");
  const missing = capabilities.filter(capability => typeof adapter?.[capability] !== "function");
  if (missing.length) {
    const error = new TypeError("invalid_semantic_adapter");
    error.code = "invalid_semantic_adapter";
    error.findings = missing.map(capability => `missing:${capability}`);
    throw error;
  }
  return adapter;
}

export function classifySemanticAuthority(action) {
  return SEMANTIC_AUTHORITY_MATRIX[action] || "A2";
}

export function embeddingModelIdentityFindings(identity) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) return ["identity_not_object"];
  const findings = unsupportedKeys(identity, EMBEDDING_IDENTITY_KEYS);
  if (identity.schema !== "gpao_t3.semantic_embedding_model_identity.v1" || identity.version !== 1) findings.push("unsupported_embedding_identity_schema");
  for (const key of ["adapterId", "modelId", "revision", "license", "runtime", "queryInputType", "documentInputType"]) {
    if (!NON_EMPTY(identity[key])) findings.push(`invalid:${key}`);
  }
  if (!SHA256_PATTERN.test(identity.artifactDigest || "")) findings.push("invalid:artifactDigest");
  for (const key of ["tokenizerDigest", "preprocessingContractDigest", "runtimeDigest"]) {
    if (!SHA256_PATTERN.test(identity[key] || "")) findings.push(`invalid:${key}`);
  }
  if (!["local", "remote"].includes(identity.providerClass)) findings.push("invalid:providerClass");
  if (!Number.isInteger(identity.dimensions) || identity.dimensions <= 0) findings.push("invalid:dimensions");
  if (!Number.isInteger(identity.maxInputTokens) || identity.maxInputTokens <= 0) findings.push("invalid:maxInputTokens");
  if (!(identity.quantization === null || NON_EMPTY(identity.quantization))) findings.push("invalid:quantization");
  if (!["mean", "cls"].includes(identity.pooling)) findings.push("invalid:pooling");
  if (identity.normalization !== "l2") findings.push("invalid:normalization");
  return findings;
}

export function createEmbeddingModelIdentity(input) {
  const inputFindings = input && typeof input === "object" && !Array.isArray(input)
    ? unsupportedKeys(input, EMBEDDING_IDENTITY_KEYS.filter(key => !["schema", "version"].includes(key)))
    : ["identity_input_not_object"];
  if (inputFindings.length) {
    const error = new TypeError("invalid_embedding_model_identity_input");
    error.code = "invalid_embedding_model_identity_input";
    error.findings = inputFindings;
    throw error;
  }
  const identity = Object.freeze({
    schema: "gpao_t3.semantic_embedding_model_identity.v1",
    version: 1,
    adapterId: input?.adapterId,
    providerClass: input?.providerClass,
    modelId: input?.modelId,
    revision: input?.revision,
    artifactDigest: input?.artifactDigest,
    license: input?.license,
    runtime: input?.runtime,
    dimensions: input?.dimensions,
    maxInputTokens: input?.maxInputTokens,
    queryInputType: input?.queryInputType,
    documentInputType: input?.documentInputType,
    quantization: input?.quantization ?? null,
    tokenizerDigest: input?.tokenizerDigest,
    preprocessingContractDigest: input?.preprocessingContractDigest,
    runtimeDigest: input?.runtimeDigest,
    pooling: input?.pooling,
    normalization: input?.normalization
  });
  const findings = embeddingModelIdentityFindings(identity);
  if (findings.length) {
    const error = new TypeError("invalid_embedding_model_identity");
    error.code = "invalid_embedding_model_identity";
    error.findings = findings;
    throw error;
  }
  return identity;
}

export function rerankerModelIdentityFindings(identity) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) return ["identity_not_object"];
  const findings = unsupportedKeys(identity, RERANKER_IDENTITY_KEYS);
  if (identity.schema !== "gpao_t3.semantic_reranker_model_identity.v1" || identity.version !== 1) findings.push("unsupported_reranker_identity_schema");
  for (const key of ["adapterId", "modelId", "revision", "license", "runtime", "queryInputType", "documentInputType", "scoreCalibration"]) {
    if (!NON_EMPTY(identity[key])) findings.push(`invalid:${key}`);
  }
  for (const key of ["artifactDigest", "outputContractDigest", "preprocessingContractDigest"]) {
    if (!SHA256_PATTERN.test(identity[key] || "")) findings.push(`invalid:${key}`);
  }
  if (!["local", "remote"].includes(identity.providerClass)) findings.push("invalid:providerClass");
  if (!Number.isInteger(identity.maxInputTokens) || identity.maxInputTokens <= 0) findings.push("invalid:maxInputTokens");
  if (!(identity.quantization === null || NON_EMPTY(identity.quantization))) findings.push("invalid:quantization");
  return findings;
}

export function createRerankerModelIdentity(input) {
  const inputFindings = input && typeof input === "object" && !Array.isArray(input)
    ? unsupportedKeys(input, RERANKER_IDENTITY_KEYS.filter(key => !["schema", "version"].includes(key)))
    : ["identity_input_not_object"];
  if (inputFindings.length) {
    const error = new TypeError("invalid_reranker_model_identity_input");
    error.code = "invalid_reranker_model_identity_input";
    error.findings = inputFindings;
    throw error;
  }
  const identity = Object.freeze({
    schema: "gpao_t3.semantic_reranker_model_identity.v1",
    version: 1,
    adapterId: input?.adapterId,
    providerClass: input?.providerClass,
    modelId: input?.modelId,
    revision: input?.revision,
    artifactDigest: input?.artifactDigest,
    license: input?.license,
    runtime: input?.runtime,
    maxInputTokens: input?.maxInputTokens,
    queryInputType: input?.queryInputType,
    documentInputType: input?.documentInputType,
    quantization: input?.quantization ?? null,
    scoreCalibration: input?.scoreCalibration,
    outputContractDigest: input?.outputContractDigest,
    preprocessingContractDigest: input?.preprocessingContractDigest
  });
  const findings = rerankerModelIdentityFindings(identity);
  if (findings.length) {
    const error = new TypeError("invalid_reranker_model_identity");
    error.code = "invalid_reranker_model_identity";
    error.findings = findings;
    throw error;
  }
  return identity;
}

export function semanticModelIdentityFindings(identity) {
  if (identity?.schema === "gpao_t3.semantic_embedding_model_identity.v1") return embeddingModelIdentityFindings(identity);
  if (identity?.schema === "gpao_t3.semantic_reranker_model_identity.v1") return rerankerModelIdentityFindings(identity);
  return ["unsupported_semantic_model_identity_schema"];
}

export function semanticModelIdentityDigest(identity) {
  const findings = semanticModelIdentityFindings(identity);
  if (findings.length) throw new TypeError("invalid_semantic_model_identity");
  return canonicalDigest(identity.schema, identity);
}

export function semanticIndexIdentityFindings(identity) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) return ["identity_not_object"];
  const findings = unsupportedKeys(identity, INDEX_IDENTITY_KEYS);
  if (identity.schema !== "gpao_t3.semantic_index_identity.v1" || identity.version !== 1) findings.push("unsupported_index_identity_schema");
  for (const key of ["embeddingModelIdentityDigest", "sourceContractDigest", "tokenizerContractDigest", "scopeContractDigest"]) {
    if (!SHA256_PATTERN.test(identity[key] || "")) findings.push(`invalid:${key}`);
  }
  if (!Number.isInteger(identity.dimensions) || identity.dimensions <= 0) findings.push("invalid:dimensions");
  if (!NON_EMPTY(identity.vectorMetric)) findings.push("invalid:vectorMetric");
  if (!NON_EMPTY(identity.normalization)) findings.push("invalid:normalization");
  return findings;
}

export function createSemanticIndexIdentity(input) {
  const inputFindings = input && typeof input === "object" && !Array.isArray(input)
    ? unsupportedKeys(input, INDEX_IDENTITY_KEYS.filter(key => !["schema", "version"].includes(key)))
    : ["identity_input_not_object"];
  if (inputFindings.length) {
    const error = new TypeError("invalid_semantic_index_identity_input");
    error.code = "invalid_semantic_index_identity_input";
    error.findings = inputFindings;
    throw error;
  }
  const identity = Object.freeze({
    schema: "gpao_t3.semantic_index_identity.v1",
    version: 1,
    embeddingModelIdentityDigest: input?.embeddingModelIdentityDigest,
    dimensions: input?.dimensions,
    sourceContractDigest: input?.sourceContractDigest,
    tokenizerContractDigest: input?.tokenizerContractDigest,
    scopeContractDigest: input?.scopeContractDigest,
    vectorMetric: input?.vectorMetric,
    normalization: input?.normalization
  });
  const findings = semanticIndexIdentityFindings(identity);
  if (findings.length) {
    const error = new TypeError("invalid_semantic_index_identity");
    error.code = "invalid_semantic_index_identity";
    error.findings = findings;
    throw error;
  }
  return identity;
}

export function semanticIndexIdentityDigest(identity) {
  const findings = semanticIndexIdentityFindings(identity);
  if (findings.length) throw new TypeError("invalid_semantic_index_identity");
  return canonicalDigest("gpao_t3.semantic_index_identity.v1", identity);
}
