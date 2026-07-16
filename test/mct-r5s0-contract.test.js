import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import { canonicalDigest } from "../src/core/canonical-json.js";
import {
  EMBEDDING_ADAPTER_CAPABILITIES,
  RERANKER_ADAPTER_CAPABILITIES,
  SEMANTIC_AUTHORITY_MATRIX,
  SEMANTIC_BENCHMARK_CONTRACT,
  SEMANTIC_COMPARISON_TARGETS,
  SEMANTIC_FAILURE_CONTRACT,
  SEMANTIC_INVARIANTS,
  SEMANTIC_QUALITY_GATES,
  SEMANTIC_RESOURCE_BUDGET,
  SEMANTIC_RUNTIME_CONTRACT,
  assertSemanticAdapter,
  classifySemanticAuthority,
  createEmbeddingModelIdentity,
  createRerankerModelIdentity,
  createSemanticIndexIdentity,
  semanticContractDigest,
  semanticIndexIdentityDigest,
  semanticModelIdentityDigest
} from "../src/core/semantic-runtime-contract.js";

const seal = JSON.parse(fs.readFileSync(new URL("./fixtures/mct-r5s0-seal.json", import.meta.url), "utf8"));
const r0Seal = JSON.parse(fs.readFileSync(new URL("./fixtures/mct-r0-seal.json", import.meta.url), "utf8"));
const candidates = JSON.parse(fs.readFileSync(new URL("./fixtures/mct-r5s0-model-candidates.json", import.meta.url), "utf8"));
const schema = JSON.parse(fs.readFileSync(new URL("../src/schemas/semantic-runtime-contract.v1.schema.json", import.meta.url), "utf8"));

const digest = value => `sha256:${String(value).padStart(64, "0")}`;

test("MCT-R5S0 seals one provider-neutral semantic runtime contract", () => {
  assert.equal(SEMANTIC_RUNTIME_CONTRACT.schema, "gpao_t3.semantic_runtime_contract.v1");
  assert.equal(semanticContractDigest(), seal.contractDigest);
  assert.deepEqual(SEMANTIC_COMPARISON_TARGETS, [
    "t3_pre_semantic_lexical_checkpoint",
    "live_gpao_t_local_hybrid",
    "openclaw_fixed_version",
    "t3_reinforced_semantic"
  ]);
  assert.equal(SEMANTIC_INVARIANTS.includes("retrieval_similarity_never_bypasses_tcell_admission"), true);
  assert.equal(SEMANTIC_INVARIANTS.includes("current_request_overrides_memory"), true);
  assert.equal(SEMANTIC_INVARIANTS.includes("known_holdout_wording_never_enters_production_rules"), true);
});

test("MCT-R5S0 inherits the 10,000-record R0 benchmark without weakening", () => {
  assert.equal(SEMANTIC_BENCHMARK_CONTRACT.records, r0Seal.dataset.records);
  assert.equal(SEMANTIC_BENCHMARK_CONTRACT.seed, r0Seal.dataset.seed);
  assert.equal(SEMANTIC_BENCHMARK_CONTRACT.generator, r0Seal.dataset.generator);
  assert.deepEqual(SEMANTIC_BENCHMARK_CONTRACT.splits, r0Seal.dataset.splits);
  assert.deepEqual(SEMANTIC_BENCHMARK_CONTRACT.composition, r0Seal.dataset.composition);
  assert.equal(SEMANTIC_BENCHMARK_CONTRACT.averageRecordTokens, r0Seal.dataset.averageRecordTokens);
  assert.equal(SEMANTIC_BENCHMARK_CONTRACT.totalRecordTokens, r0Seal.dataset.totalRecordTokens);
  assert.deepEqual(SEMANTIC_BENCHMARK_CONTRACT.concurrency, r0Seal.dataset.concurrency);
  assert.deepEqual(SEMANTIC_BENCHMARK_CONTRACT.resultK, r0Seal.dataset.resultK);
  assert.deepEqual(SEMANTIC_BENCHMARK_CONTRACT.temperatures, r0Seal.dataset.temperatures);
  assert.deepEqual(SEMANTIC_BENCHMARK_CONTRACT.temperatureContract, r0Seal.dataset.temperatureContract);
  assert.equal(seal.inheritedCorpus.canonicalDigest, r0Seal.dataset.canonicalDigest);
  for (const mode of r0Seal.dataset.modes) assert.ok(SEMANTIC_BENCHMARK_CONTRACT.modes.includes(mode));
  assert.ok(SEMANTIC_BENCHMARK_CONTRACT.modes.includes("hybrid_local_embedding_reranked"));
});

test("embedding and reranker adapters expose cancellation, deadline, health, and identity boundaries", () => {
  const embedding = Object.fromEntries(EMBEDDING_ADAPTER_CAPABILITIES.map(name => [name, () => null]));
  const reranker = Object.fromEntries(RERANKER_ADAPTER_CAPABILITIES.map(name => [name, () => null]));
  assert.equal(assertSemanticAdapter(embedding, "embedding"), embedding);
  assert.equal(assertSemanticAdapter(reranker, "reranker"), reranker);
  const incomplete = { ...embedding };
  delete incomplete.cancel;
  assert.throws(
    () => assertSemanticAdapter(incomplete, "embedding"),
    error => error.code === "invalid_semantic_adapter" && error.findings.includes("missing:cancel")
  );
  assert.throws(() => assertSemanticAdapter({}, "unknown"), /unsupported_semantic_adapter_kind/);
});

test("embedding, reranker, and index identities are canonical and role-separated", () => {
  const modelInput = {
    adapterId: "local-embedding-v1",
    providerClass: "local",
    modelId: "candidate/model",
    revision: "revision-1",
    artifactDigest: digest(1),
    license: "mit",
    runtime: "onnx-cpu",
    dimensions: 384,
    maxInputTokens: 512,
    queryInputType: "query_prefixed_utf8_nfc",
    documentInputType: "passage_prefixed_utf8_nfc",
    quantization: "int8",
    tokenizerDigest: digest(30),
    preprocessingContractDigest: digest(31),
    runtimeDigest: digest(32),
    pooling: "mean",
    normalization: "l2"
  };
  const model = createEmbeddingModelIdentity(modelInput);
  const rerankerInput = {
    adapterId: "local-reranker-v1",
    providerClass: "local",
    modelId: "candidate/reranker",
    revision: "revision-1",
    artifactDigest: digest(6),
    license: "apache-2.0",
    runtime: "onnx-cpu",
    maxInputTokens: 512,
    queryInputType: "query_utf8_nfc",
    documentInputType: "passage_utf8_nfc",
    quantization: "int8",
    scoreCalibration: "sigmoid_then_ece_v1",
    outputContractDigest: digest(7),
    preprocessingContractDigest: digest(8)
  };
  const reranker = createRerankerModelIdentity(rerankerInput);
  const modelDigest = semanticModelIdentityDigest(model);
  const indexInput = {
    embeddingModelIdentityDigest: modelDigest,
    dimensions: model.dimensions,
    sourceContractDigest: digest(2),
    tokenizerContractDigest: digest(3),
    scopeContractDigest: digest(4),
    vectorMetric: "cosine",
    normalization: "l2"
  };
  const index = createSemanticIndexIdentity(indexInput);
  assert.match(modelDigest, /^sha256:[a-f0-9]{64}$/u);
  assert.match(semanticModelIdentityDigest(reranker), /^sha256:[a-f0-9]{64}$/u);
  assert.match(semanticIndexIdentityDigest(index), /^sha256:[a-f0-9]{64}$/u);
  const changed = createSemanticIndexIdentity({ ...indexInput, tokenizerContractDigest: digest(5) });
  assert.notEqual(semanticIndexIdentityDigest(index), semanticIndexIdentityDigest(changed));
  assert.throws(() => createEmbeddingModelIdentity({ ...modelInput, dimensions: 0 }), error => error.code === "invalid_embedding_model_identity");
  assert.throws(() => createEmbeddingModelIdentity({ ...modelInput, undeclared: true }), error => error.code === "invalid_embedding_model_identity_input" && error.findings.includes("unsupported:undeclared"));
  assert.throws(() => semanticModelIdentityDigest({ ...model, undeclared: true }), /invalid_semantic_model_identity/);
  assert.throws(() => createRerankerModelIdentity({ ...rerankerInput, outputContractDigest: "not-a-digest" }), error => error.code === "invalid_reranker_model_identity");
  assert.throws(() => createRerankerModelIdentity({ ...rerankerInput, undeclared: true }), error => error.code === "invalid_reranker_model_identity_input");
  assert.throws(() => createSemanticIndexIdentity({ ...indexInput, sourceContractDigest: "not-a-digest" }), error => error.code === "invalid_semantic_index_identity");
  assert.throws(() => createSemanticIndexIdentity({ ...indexInput, undeclared: true }), error => error.code === "invalid_semantic_index_identity_input");

  const ajv = new Ajv2020({ strict: false });
  const validate = ajv.compile(schema);
  assert.equal(validate(model), true, JSON.stringify(validate.errors));
  assert.equal(validate(reranker), true, JSON.stringify(validate.errors));
  assert.equal(validate(index), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...index, undeclared: true }), false);
  assert.equal(validate(SEMANTIC_RUNTIME_CONTRACT), true, JSON.stringify(validate.errors));
  assert.equal(validate(seal), true, JSON.stringify(validate.errors));
  assert.equal(validate(candidates), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...SEMANTIC_RUNTIME_CONTRACT, undeclared: true }), false);
  assert.equal(validate({ ...SEMANTIC_RUNTIME_CONTRACT, qualityGates: { ...SEMANTIC_RUNTIME_CONTRACT.qualityGates, contradictionDetectionMin: undefined } }), false);
  assert.equal(validate({ ...seal, status: "sealed_for_r5s1_entry" }), false);
  assert.equal(validate({ ...candidates, selection: "embedding-intfloat-multilingual-e5-small" }), false);
  const checkpointReceipt = {
    schema: "gpao_t3.mct_r5s0_checkpoint_receipt.v1",
    sourceSha: "a".repeat(40),
    sourceStable: true,
    worktree: "clean",
    contractDigest: seal.contractDigest,
    candidateMatrixDigest: seal.candidateMatrixDigest,
    checks: ["npm run precheck", "npm test", "npm run benchmark:mct-r1"].map((command, index) => ({ command, status: "pass", exitCode: 0, signal: null, durationMs: index + 1, outputDigest: digest(index + 10) })),
    modelSelected: false,
    modelDownloaded: false,
    nextStage: "MCT-R5S1",
    gate: "pass",
    findings: [],
    receiptDigest: digest(20)
  };
  assert.equal(validate(checkpointReceipt), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...checkpointReceipt, worktree: "dirty" }), false);
});

test("authority, failure, and flow budgets preserve local automation with minimum interruption", () => {
  assert.equal(classifySemanticAuthority("local_embedding"), "A0");
  assert.equal(classifySemanticAuthority("background_reindex"), "A1");
  assert.equal(classifySemanticAuthority("remote_embedding_raw_content"), "A2");
  assert.equal(classifySemanticAuthority("unknown_external_action"), "A2");
  assert.equal(SEMANTIC_AUTHORITY_MATRIX.production_asset_selection, "A2");
  assert.equal(SEMANTIC_QUALITY_GATES.approvalDecisionsPerTaskMax, 1);
  assert.equal(SEMANTIC_QUALITY_GATES.duplicateApprovalRequestsMax, 0);
  assert.equal(SEMANTIC_RESOURCE_BUDGET.firstProgressP95MsMax, 250);
  assert.equal(SEMANTIC_RESOURCE_BUDGET.firstUsefulResponseAddedP95MsMax, 100);
  assert.equal(SEMANTIC_RESOURCE_BUDGET.memoryPromptRatioMax, 0.1);
  assert.equal(SEMANTIC_RESOURCE_BUDGET.measurement.receiptFields.includes("osBuild"), true);
  assert.equal(SEMANTIC_RESOURCE_BUDGET.measurement.receiptFields.includes("runtimeVersion"), true);
  for (const failure of Object.values(SEMANTIC_FAILURE_CONTRACT)) {
    assert.equal(failure.chat, "continue");
    assert.equal(Number.isInteger(failure.noticeAfterConsecutiveFailures), true);
  }
  assert.equal(SEMANTIC_FAILURE_CONTRACT.embedding_timeout.noticeAfterConsecutiveFailures, 3);
  assert.equal(SEMANTIC_FAILURE_CONTRACT.dimension_mismatch.fallback, "reject_new_index");
  assert.equal(SEMANTIC_FAILURE_CONTRACT.score_calibration_invalid.fallback, "deterministic_guards_and_no_answer_anchor");
});

test("quality gates keep safety absolute on sealed fixtures and utility independently measurable", () => {
  assert.equal(SEMANTIC_QUALITY_GATES.noResultRestraintMin, 1);
  assert.equal(SEMANTIC_QUALITY_GATES.scopeLeakageRateMax, 0);
  assert.equal(SEMANTIC_QUALITY_GATES.wrongAnswerAnchorRateMax, 0);
  assert.equal(SEMANTIC_QUALITY_GATES.currentRequestPreservationMin, 1);
  assert.equal(SEMANTIC_QUALITY_GATES.promptBudgetComplianceMin, 1);
  assert.equal(SEMANTIC_QUALITY_GATES.exactRecallAt10Min, r0Seal.thresholds.recallAt10Min);
  assert.equal(SEMANTIC_QUALITY_GATES.ndcgAt10Min, r0Seal.thresholds.ndcgAt10Min);
  assert.equal(SEMANTIC_QUALITY_GATES.answerAnchorPrecisionMin, r0Seal.thresholds.answerAnchorPrecisionMin);
  assert.equal(SEMANTIC_QUALITY_GATES.contradictionDetectionMin, r0Seal.thresholds.contradictionDetectionMin);
  assert.equal(SEMANTIC_QUALITY_GATES.qualityPer1000TokensRegressionMax, r0Seal.thresholds.qualityPer1000TokensRegressionMax);
  assert.equal(SEMANTIC_QUALITY_GATES.exactRetrievalRegressionMax, 0);
  assert.equal(SEMANTIC_QUALITY_GATES.typoRetrievalRegressionMax, 0);
  assert.equal(SEMANTIC_QUALITY_GATES.recoverySuccessMin, 1);
  assert.ok(SEMANTIC_QUALITY_GATES.rerankerExpectedCalibrationErrorMax > 0);
  assert.ok(SEMANTIC_QUALITY_GATES.semanticRecallAt5Min > 0);
  assert.ok(SEMANTIC_QUALITY_GATES.recallUpliftOverLexicalMin > 0);
});

test("independent holdout and candidate assets remain unavailable to implementation and unselected", () => {
  assert.equal(SEMANTIC_BENCHMARK_CONTRACT.independentHoldout.contentInImplementationRepository, false);
  assert.equal(SEMANTIC_BENCHMARK_CONTRACT.independentHoldout.generatedAfterSourceFreeze, true);
  assert.equal(SEMANTIC_BENCHMARK_CONTRACT.independentHoldout.authorMayInspectImplementation, false);
  assert.equal(SEMANTIC_BENCHMARK_CONTRACT.independentHoldout.implementationMayInspectHoldout, false);
  assert.equal(seal.datasetPolicy.singleQualificationRunWithoutPostResultTuning, true);
  assert.equal(candidates.selection, null);
  assert.equal(candidates.rules.downloadDuringR5S0, false);
  assert.equal(candidates.candidates.every(candidate => candidate.qualificationStatus.startsWith("pending_")), true);
  assert.equal(candidates.candidates.every(candidate => candidate.sourceUrl.startsWith("https://huggingface.co/")), true);
  assert.equal(
    canonicalDigest(seal.candidateMatrixDigestDomain, candidates),
    seal.candidateMatrixDigest
  );
  const oversized = candidates.candidates.find(candidate => candidate.candidateId === "reranker-baai-bge-reranker-v2-m3");
  assert.ok(oversized.reportedPrimaryWeightsBytes > SEMANTIC_RESOURCE_BUDGET.rerankerAssetBytesMax);
});
