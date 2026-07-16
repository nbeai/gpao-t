import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { canonicalDigest } from "../src/core/canonical-json.js";
import { LocalEmbeddingAdapter } from "../src/core/local-embedding-adapter.js";
import { assertSemanticAdapter, createEmbeddingModelIdentity, semanticModelIdentityDigest } from "../src/core/semantic-runtime-contract.js";

const digest = value => `sha256:${String(value).padStart(64, "0")}`;
const qualification = JSON.parse(fs.readFileSync(new URL("./fixtures/mct-r5s1-qualification.json", import.meta.url), "utf8"));

function identity(overrides = {}) {
  return createEmbeddingModelIdentity({
    adapterId: "local-test-embedding",
    providerClass: "local",
    modelId: "qualified/test-model",
    revision: "revision-1",
    artifactDigest: digest(1),
    license: "mit",
    runtime: "onnxruntime-node-cpu",
    dimensions: 3,
    maxInputTokens: 512,
    queryInputType: "query_prefixed_utf8_nfc",
    documentInputType: "passage_prefixed_utf8_nfc",
    quantization: null,
    tokenizerDigest: digest(2),
    preprocessingContractDigest: digest(3),
    runtimeDigest: digest(4),
    pooling: "mean",
    normalization: "l2",
    ...overrides
  });
}

function localEngine(modelIdentity, { embed, health = async () => ({ state: "ready" }), onTerminate } = {}) {
  let generation = 1;
  const manifest = () => ({
    schema: "gpao_t3.local_embedding_engine_manifest.v1",
    network: "none",
    isolation: "worker_process",
    modelIdentityDigest: semanticModelIdentityDigest(modelIdentity),
    runtimeDigest: modelIdentity.runtimeDigest,
    preprocessingContractDigest: modelIdentity.preprocessingContractDigest,
    generation
  });
  return {
    manifest,
    health,
    embed,
    terminateGeneration: async input => {
      onTerminate?.(input);
      generation += 1;
      return manifest();
    }
  };
}

test("R5S1 local embedding adapter satisfies the provider-neutral capability contract", async () => {
  const calls = [];
  const modelIdentity = identity();
  const adapter = new LocalEmbeddingAdapter({
    identity: modelIdentity,
    clock: (() => { let now = 10; return () => now += 2; })(),
    engine: localEngine(modelIdentity, {
      embed: async (texts, options) => {
        calls.push({ texts, options });
        return texts.map(() => [1, 0, 0]);
      }
    })
  });
  assert.equal(assertSemanticAdapter(adapter, "embedding"), adapter);
  const query = await adapter.embedQuery("  결정된 항목을 알려줘\r\n");
  const documents = await adapter.embedDocuments(["첫 문서", "둘째 문서"]);
  assert.deepEqual(calls[0].texts, ["query: 결정된 항목을 알려줘"]);
  assert.deepEqual(calls[1].texts, ["passage: 첫 문서", "passage: 둘째 문서"]);
  assert.equal(query.local, true);
  assert.equal(query.dimensions, 3);
  assert.equal(documents.vectors.length, 2);
  assert.equal(Object.isFrozen(documents.vectors), true);
  assert.equal(Object.isFrozen(documents.vectors[0]), true);
  assert.deepEqual(await adapter.health(), { state: "ready", local: true, modelIdentityDigest: query.modelIdentityDigest, dimensions: 3 });
});

test("R5S1 adapter rejects malformed, non-finite, and dimension-drift output", async () => {
  const make = output => {
    const modelIdentity = identity();
    return new LocalEmbeddingAdapter({ identity: modelIdentity, engine: localEngine(modelIdentity, { embed: async () => output }) });
  };
  await assert.rejects(make([[1, 2]]).embedQuery("query"), error => error.code === "embedding_dimension_mismatch");
  await assert.rejects(make([[1, Number.NaN, 3]]).embedQuery("query"), error => error.code === "embedding_non_finite_vector");
  await assert.rejects(make([[0, 0, 0]]).embedQuery("query"), error => error.code === "embedding_zero_vector");
  await assert.rejects(make([[2, 0, 0]]).embedQuery("query"), error => error.code === "embedding_normalization_mismatch");
  await assert.rejects(make([]).embedQuery("query"), error => error.code === "invalid_embedding_output");
  await assert.rejects(make([[1, 2, 3]]).embedDocuments([]), error => error.code === "invalid_embedding_input");
});

test("R5S1 adapter bounds timeout, cancellation, duplicate IDs, and unavailable health", async () => {
  const modelIdentity = identity();
  const terminations = [];
  const engine = localEngine(modelIdentity, {
    health: async () => { throw new Error("private engine error"); },
    embed: async (_texts, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("engine aborted")), { once: true });
    }),
    onTerminate: input => terminations.push(input)
  });
  const adapter = new LocalEmbeddingAdapter({ identity: modelIdentity, engine, defaultDeadlineMs: 20, maxInflight: 1 });
  await assert.rejects(adapter.embedQuery("timeout", { requestId: "timeout-1" }), error => error.code === "embedding_timeout");
  const pending = adapter.embedQuery("cancel", { requestId: "cancel-1", deadlineMs: 1_000 });
  await assert.rejects(adapter.embedQuery("duplicate", { requestId: "cancel-1", deadlineMs: 1_000 }), error => error.code === "duplicate_embedding_request");
  await assert.rejects(adapter.embedQuery("overload", { requestId: "other-1", deadlineMs: 1_000 }), error => error.code === "embedding_backpressure");
  assert.equal(adapter.cancel("cancel-1"), true);
  await assert.rejects(pending, error => error.code === "embedding_cancelled");
  assert.equal(adapter.cancel("missing"), false);
  assert.equal(terminations.length, 2);
  assert.deepEqual(await adapter.health(), { state: "unavailable", local: true, modelIdentityDigest: adapter.identityDigest, dimensions: 3 });
});

test("R5S1 adapter fails closed on unsupported identity and input contracts", async () => {
  assert.throws(() => new LocalEmbeddingAdapter({ identity: { schema: "unknown" }, engine: {} }), error => error.code === "invalid_embedding_model_identity");
  const remoteIdentity = identity({ providerClass: "remote" });
  assert.throws(() => new LocalEmbeddingAdapter({ identity: remoteIdentity, engine: localEngine(remoteIdentity, { embed: async () => [[1, 0, 0]] }) }), error => error.code === "local_embedding_identity_required");
  const modelIdentity = identity({ queryInputType: "plain_utf8_nfc", documentInputType: "plain_utf8_nfc" });
  const adapter = new LocalEmbeddingAdapter({
    identity: modelIdentity,
    engine: localEngine(modelIdentity, { embed: async texts => texts.map(() => [1, 0, 0]) })
  });
  await assert.rejects(adapter.batch(["x"], { inputType: "unsupported" }), error => error.code === "unsupported_embedding_input_type");
  const controller = new AbortController();
  controller.abort("owner_cancelled");
  await assert.rejects(adapter.embedQuery("x", { signal: controller.signal }), error => error.code === "embedding_cancelled");
});

test("R5S1 binds immutable identity to an isolated network-free engine manifest", async () => {
  const mutableIdentity = { ...identity() };
  const engine = localEngine(mutableIdentity, { embed: async () => [[1, 0, 0]] });
  const adapter = new LocalEmbeddingAdapter({ identity: mutableIdentity, engine });
  const boundDigest = adapter.identityDigest;
  mutableIdentity.dimensions = 99;
  assert.equal(adapter.dimensions(), 3);
  assert.equal(adapter.identityDigest, boundDigest);
  assert.equal(Object.isFrozen(adapter.modelIdentity()), true);
  const badEngine = localEngine(identity(), { embed: async () => [[1, 0, 0]] });
  const originalManifest = badEngine.manifest;
  badEngine.manifest = () => ({ ...originalManifest(), network: "external" });
  assert.throws(() => new LocalEmbeddingAdapter({ identity: identity(), engine: badEngine }), error => error.code === "invalid_embedding_engine_manifest");
});

test("R5S1 replaces a non-cooperative timed-out worker generation before serving again", async () => {
  const modelIdentity = identity();
  let invocation = 0;
  const engine = localEngine(modelIdentity, {
    embed: async () => {
      invocation += 1;
      if (invocation === 1) return new Promise(() => {});
      return [[1, 0, 0]];
    }
  });
  const adapter = new LocalEmbeddingAdapter({ identity: modelIdentity, engine, defaultDeadlineMs: 10, maxInflight: 1 });
  await assert.rejects(adapter.embedQuery("stuck", { requestId: "stuck-1" }), error => error.code === "embedding_timeout");
  assert.equal((await adapter.health()).state, "ready");
  const recovered = await adapter.embedQuery("next", { requestId: "next-1" });
  assert.deepEqual(recovered.vectors, [[1, 0, 0]]);
});

test("R5S1 bounds a non-cooperative worker replacement", async () => {
  const modelIdentity = identity();
  const engine = localEngine(modelIdentity, { embed: async () => new Promise(() => {}) });
  engine.embed = async () => new Promise(() => {});
  engine.terminateGeneration = async () => new Promise(() => {});
  const adapter = new LocalEmbeddingAdapter({ identity: modelIdentity, engine, defaultDeadlineMs: 10, recoveryDeadlineMs: 10 });

  const startedAt = performance.now();
  await assert.rejects(
    adapter.embedQuery("복구도 멈추면 안 된다"),
    error => error.code === "embedding_generation_recovery_failed"
  );
  assert.ok(performance.now() - startedAt < 200);
  assert.equal((await adapter.health()).state, "unavailable");
});

test("R5S1 candidate evidence selects nothing and preserves reranker and Windows gates", () => {
  const { qualificationDigest, ...qualificationPayload } = qualification;
  assert.equal(canonicalDigest(qualification.qualificationDigestDomain, qualificationPayload), qualificationDigest);
  const contract = qualification.evaluationContract;
  const e5 = qualification.candidates.find(candidate => candidate.candidateId.includes("e5-small"));
  const minilm = qualification.candidates.find(candidate => candidate.candidateId.includes("minilm"));
  const bge = qualification.candidates.find(candidate => candidate.candidateId.includes("bge-m3"));
  assert.ok(e5.rawRecallAt5 >= contract.semanticRecallAt5Min);
  assert.ok(e5.rawMrr >= contract.mrrMin);
  assert.ok(e5.warmQueryP95Ms <= contract.warmQueryP95MsMax);
  assert.ok(e5.cacheBytes <= contract.assetBytesMax);
  assert.ok(e5.residentMemoryBytes <= contract.residentMemoryBytesMax);
  assert.equal(e5.singleGlobalNoResultThresholdSeparable, false);
  assert.match(e5.preprocessingContractDigest, /^sha256:[a-f0-9]{64}$/u);
  assert.match(e5.runtimeDigest, /^sha256:[a-f0-9]{64}$/u);
  assert.ok(minilm.rawRecallAt5 < contract.semanticRecallAt5Min);
  assert.equal(bge.downloaded, false);
  assert.ok(bge.reportedPrimaryWeightsBytes > contract.assetBytesMax);
  assert.equal(qualification.platformQualification.macosArm64NativeExecution, "pass");
  assert.equal(qualification.platformQualification.windowsCpuRuntimeOfficialSupport, true);
  assert.equal(qualification.platformQualification.windowsNativeSmoke, "pending_external_windows_host");
  assert.equal(qualification.platformQualification.productionAssetSelected, false);
  assert.equal(qualification.recommendation.decisionClass, "A2");
  assert.equal(qualification.recommendation.decisionType, "conditional_shortlist_for_windows_native_qualification");
  assert.ok(qualification.recommendation.productionSelectionRequires.includes("second_a2_owner_decision"));
  assert.equal(qualification.recommendation.selected, false);
  assert.equal(qualification.testAssetLifecycle.deletionVerified, true);
  assert.equal(fs.existsSync(qualification.testAssetLifecycle.temporaryRoot), false);
});
