import { randomUUID } from "node:crypto";
import { embeddingModelIdentityFindings, semanticModelIdentityDigest } from "./semantic-runtime-contract.js";

function adapterError(code, message, findings = []) {
  const error = new Error(message);
  error.name = "EmbeddingAdapterError";
  error.code = code;
  error.findings = findings;
  return error;
}

function normalizedText(value, inputType) {
  if (typeof value !== "string" || !value.trim()) throw adapterError("invalid_embedding_input", "Embedding input must be non-empty text");
  const text = value.normalize("NFC").replace(/\r\n?/g, "\n").trim();
  if (inputType === "query_prefixed_utf8_nfc") return `query: ${text}`;
  if (inputType === "passage_prefixed_utf8_nfc") return `passage: ${text}`;
  if (inputType === "plain_utf8_nfc") return text;
  throw adapterError("unsupported_embedding_input_type", "Embedding input contract is unsupported");
}

function validateVectors(vectors, expectedCount, identity) {
  if (!Array.isArray(vectors) || vectors.length !== expectedCount) throw adapterError("invalid_embedding_output", "Embedding output count does not match input");
  for (const vector of vectors) {
    if (!Array.isArray(vector) && !ArrayBuffer.isView(vector)) throw adapterError("invalid_embedding_output", "Embedding output must contain vectors");
    if (vector.length !== identity.dimensions) throw adapterError("embedding_dimension_mismatch", "Embedding output dimensions do not match model identity");
    if ([...vector].some(value => typeof value !== "number" || !Number.isFinite(value))) throw adapterError("embedding_non_finite_vector", "Embedding output contains a non-finite value");
    const norm = Math.sqrt([...vector].reduce((sum, value) => sum + value * value, 0));
    if (norm <= 1e-8) throw adapterError("embedding_zero_vector", "Embedding output contains a zero vector");
    if (identity.normalization === "l2" && Math.abs(norm - 1) > 0.01) throw adapterError("embedding_normalization_mismatch", "Embedding output does not match the normalization contract");
  }
}

function engineManifestFindings(manifest, identityDigest, identity) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return ["engine_manifest_not_object"];
  const allowed = ["schema", "network", "isolation", "modelIdentityDigest", "runtimeDigest", "preprocessingContractDigest", "generation"];
  const findings = Object.keys(manifest).filter(key => !allowed.includes(key)).map(key => `unsupported:${key}`);
  if (manifest.schema !== "gpao_t3.local_embedding_engine_manifest.v1") findings.push("invalid:schema");
  if (manifest.network !== "none") findings.push("invalid:network");
  if (manifest.isolation !== "worker_process") findings.push("invalid:isolation");
  if (manifest.modelIdentityDigest !== identityDigest) findings.push("invalid:modelIdentityDigest");
  if (manifest.runtimeDigest !== identity.runtimeDigest) findings.push("invalid:runtimeDigest");
  if (manifest.preprocessingContractDigest !== identity.preprocessingContractDigest) findings.push("invalid:preprocessingContractDigest");
  if (!Number.isInteger(manifest.generation) || manifest.generation < 1) findings.push("invalid:generation");
  return findings;
}

export class LocalEmbeddingAdapter {
  constructor({ identity, engine, defaultDeadlineMs = 250, recoveryDeadlineMs = 250, maxInflight = 2, clock = () => Date.now() } = {}) {
    const findings = embeddingModelIdentityFindings(identity);
    if (findings.length) throw adapterError("invalid_embedding_model_identity", "Embedding model identity is invalid", findings);
    if (identity.providerClass !== "local") throw adapterError("local_embedding_identity_required", "Local embedding adapter requires a local model identity");
    if (!engine || typeof engine.embed !== "function" || typeof engine.health !== "function" || typeof engine.manifest !== "function" || typeof engine.terminateGeneration !== "function") throw adapterError("invalid_embedding_engine", "Embedding engine must implement embed, health, manifest, and generation termination");
    if (!Number.isInteger(defaultDeadlineMs) || defaultDeadlineMs <= 0) throw new TypeError("defaultDeadlineMs must be a positive integer");
    if (!Number.isInteger(recoveryDeadlineMs) || recoveryDeadlineMs <= 0) throw new TypeError("recoveryDeadlineMs must be a positive integer");
    if (!Number.isInteger(maxInflight) || maxInflight <= 0) throw new TypeError("maxInflight must be a positive integer");
    this.identity = Object.freeze({ ...identity });
    this.identityDigest = semanticModelIdentityDigest(this.identity);
    this.engine = engine;
    this.defaultDeadlineMs = defaultDeadlineMs;
    this.recoveryDeadlineMs = recoveryDeadlineMs;
    this.maxInflight = maxInflight;
    this.clock = clock;
    this.inflight = new Map();
    const manifest = this.engine.manifest();
    const manifestFindings = engineManifestFindings(manifest, this.identityDigest, this.identity);
    if (manifestFindings.length) throw adapterError("invalid_embedding_engine_manifest", "Embedding engine manifest is invalid", manifestFindings);
    this.engineGeneration = manifest.generation;
    this.requiredGenerationMin = manifest.generation;
    this.degradedReason = null;
  }

  modelIdentity() { return this.identity; }
  dimensions() { return this.identity.dimensions; }
  queryInputType() { return this.identity.queryInputType; }
  documentInputType() { return this.identity.documentInputType; }
  deadline() { return this.defaultDeadlineMs; }

  async health() {
    try {
      const manifest = this.engine.manifest();
      const findings = engineManifestFindings(manifest, this.identityDigest, this.identity);
      if (findings.length || manifest.generation < this.requiredGenerationMin) throw new Error("engine binding unavailable");
      const state = await this.engine.health();
      if (state?.state === "ready") this.degradedReason = null;
      return Object.freeze({
        state: state?.state === "ready" && !this.degradedReason ? "ready" : "degraded",
        local: this.identity.providerClass === "local",
        modelIdentityDigest: this.identityDigest,
        dimensions: this.identity.dimensions
      });
    } catch {
      return Object.freeze({ state: "unavailable", local: true, modelIdentityDigest: this.identityDigest, dimensions: this.identity.dimensions });
    }
  }

  cancel(requestId) {
    const request = this.inflight.get(requestId);
    if (!request) return false;
    request.controller.abort("cancelled");
    return true;
  }

  async embedQuery(text, options = {}) {
    return this.batch([text], { ...options, inputType: "query" });
  }

  async embedDocuments(texts, options = {}) {
    return this.batch(texts, { ...options, inputType: "document" });
  }

  async batch(texts, { inputType = "document", signal, deadlineMs = this.defaultDeadlineMs, requestId = randomUUID() } = {}) {
    if (!Array.isArray(texts) || texts.length === 0) throw adapterError("invalid_embedding_input", "Embedding batch must contain text");
    if (!Number.isInteger(deadlineMs) || deadlineMs <= 0) throw new TypeError("deadlineMs must be a positive integer");
    if (this.inflight.has(requestId)) throw adapterError("duplicate_embedding_request", "Embedding request is already active");
    if (this.inflight.size >= this.maxInflight) throw adapterError("embedding_backpressure", "Embedding adapter is at its bounded concurrency limit");
    const manifest = this.engine.manifest();
    const manifestFindings = engineManifestFindings(manifest, this.identityDigest, this.identity);
    if (manifestFindings.length || manifest.generation < this.requiredGenerationMin) throw adapterError("embedding_engine_binding_unavailable", "Embedding engine binding is unavailable", manifestFindings);
    const contract = inputType === "query" ? this.identity.queryInputType : inputType === "document" ? this.identity.documentInputType : null;
    if (!contract) throw adapterError("unsupported_embedding_input_type", "Embedding input type is unsupported");
    const prepared = texts.map(text => normalizedText(text, contract));
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason || "cancelled");
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
    if (controller.signal.aborted) {
      signal?.removeEventListener("abort", abort);
      throw adapterError("embedding_cancelled", "Embedding request did not start");
    }
    const startedAt = this.clock();
    const timer = setTimeout(() => controller.abort("deadline_exceeded"), deadlineMs);
    let enginePromise;
    try {
      const cancellation = new Promise((_, reject) => {
        const fail = () => reject(adapterError(
          controller.signal.reason === "deadline_exceeded" ? "embedding_timeout" : "embedding_cancelled",
          "Embedding request did not complete"
        ));
        if (controller.signal.aborted) fail();
        else controller.signal.addEventListener("abort", fail, { once: true });
      });
      enginePromise = Promise.resolve().then(() => this.engine.embed(prepared, { signal: controller.signal, requestId }));
      const entry = { controller, enginePromise, generation: manifest.generation };
      this.inflight.set(requestId, entry);
      enginePromise.finally(() => {
        if (this.inflight.get(requestId) === entry) this.inflight.delete(requestId);
      }).catch(() => {});
      const vectors = await Promise.race([
        enginePromise,
        cancellation
      ]);
      validateVectors(vectors, prepared.length, this.identity);
      const sealedVectors = Object.freeze(vectors.map(vector => Object.freeze([...vector])));
      return Object.freeze({
        schema: "gpao_t3.embedding_result.v1",
        requestId,
        modelIdentityDigest: this.identityDigest,
        inputType,
        dimensions: this.identity.dimensions,
        vectors: sealedVectors,
        latencyMs: Math.max(0, this.clock() - startedAt),
        local: this.identity.providerClass === "local"
      });
    } catch (error) {
      if (["embedding_timeout", "embedding_cancelled"].includes(error?.code)) await this.#replaceGeneration(manifest.generation, error.code);
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }

  async #replaceGeneration(generation, reason) {
    this.degradedReason = reason;
    this.requiredGenerationMin = Math.max(this.requiredGenerationMin, generation + 1);
    try {
      let timer;
      const next = await Promise.race([
        this.engine.terminateGeneration({ generation, reason }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(adapterError("embedding_generation_recovery_timeout", "Embedding engine replacement exceeded its deadline")), this.recoveryDeadlineMs);
        })
      ]).finally(() => clearTimeout(timer));
      const findings = engineManifestFindings(next, this.identityDigest, this.identity);
      if (findings.length || next.generation < this.requiredGenerationMin) throw adapterError("embedding_generation_recovery_failed", "Embedding engine generation did not advance", findings);
      for (const [requestId, request] of this.inflight) {
        if (request.generation === generation) {
          request.controller.abort("generation_replaced");
          this.inflight.delete(requestId);
        }
      }
      this.engineGeneration = next.generation;
      this.degradedReason = null;
    } catch {
      throw adapterError("embedding_generation_recovery_failed", "Embedding engine could not be safely replaced");
    }
  }
}
