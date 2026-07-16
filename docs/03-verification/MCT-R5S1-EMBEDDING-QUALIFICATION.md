# MCT-R5S1 Embedding Qualification

- Status: shortlist_candidate_pending_a2_windows_qualification
- R5S0 checkpoint: `6dbab404413c9ea9513a69f6dfcf320f3971ad3f`
- Runtime contract: `gpao_t3.semantic_runtime_contract.v1`
- Candidate evidence: `test/fixtures/mct-r5s1-qualification.json`

## Implemented Boundary

`LocalEmbeddingAdapter` now gives every local embedding engine the same bounded
contract:

- query and document embedding;
- batching, cancellation, deadline, and health;
- generation-isolated execution with bounded worker replacement after timeout or cancellation;
- canonical model identity and dimensions;
- model, tokenizer, preprocessing, runtime, pooling, and normalization identity binding;
- NFC and line-ending normalization;
- role-specific query/passage input contracts;
- non-finite vector, dimension drift, malformed output, timeout, and cancellation
  rejection;
- no action authority and no direct answer-anchor authority.

An engine is accepted only when its capability manifest declares `network:none`,
`worker_process` isolation, the bound model/runtime/preprocessing digests, and a
monotonic generation. A stalled inference or stalled generation replacement
fails closed and cannot leave the adapter reporting a false ready state.

The adapter is model-neutral. No Transformers.js or model asset has been added to
the product dependencies.

## Candidate Results

### Qualified For Conditional Shortlist

`intfloat/multilingual-e5-small`, revision
`614241f622f53c4eeff9890bdc4f31cfecc418b3`, MIT:

- fp32 upstream ONNX SHA-256:
  `ca456c06b3a9505ddfd9131408916dd79290368331e7d76bb621f1cba6bc8665`;
- dimensions: 384;
- raw Recall@5: 1.0;
- raw MRR: 0.8542;
- cached local load: 1.37 seconds;
- warm query p95: 6.24 ms;
- managed cache: 487,352,338 bytes;
- observed RSS: 1,311,129,600 bytes.

### Rejected

`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` qint8 arm64
was smaller and faster but failed the frozen quality floor:

- raw Recall@5: 0.75;
- raw MRR: 0.7054.

`BAAI/bge-m3` was rejected before download because its reported primary weights
exceed the frozen embedding asset budget.

## Important Interpretation

The E5 candidate retrieves every positive evaluation item within Top-5, but a
single global embedding-score threshold cannot simultaneously preserve every
English and Korean positive while rejecting every unrelated query. Therefore:

```text
embedding = candidate recall
hybrid fusion + reranker = task-relative usefulness
T-cell admission = answer influence authority
```

R5S1 does not claim no-result restraint or answer-anchor correctness. Those gates
remain owned by R5S3, R5S4, and R5S5.

## Platform And Distribution Boundary

- macOS arm64 native candidate execution: pass;
- ONNX Runtime Node CPU official platform support includes Windows x64/arm64 and
  macOS x64/arm64;
- Windows native smoke: pending after production asset selection;
- product dependency and asset bundle: not added;
- production model selection: not performed.

The conditional bundle is a reproducible verification artifact, not a product
dependency or default. It contains the checksum-bound model files plus a manifest
that rejects production selection or default activation. The offline smoke uses
`allowRemoteModels=false`, checks the unpacked ONNX/tokenizer hashes, and requires
a normalized 384-dimension result. Windows repeats this exact bundle with
`tools/qualify-mct-r5s1-windows-smoke.ps1`; a macOS pass never substitutes for
the Windows native result.

Official references observed on 2026-07-16:

- https://huggingface.co/intfloat/multilingual-e5-small
- https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
- https://huggingface.co/BAAI/bge-m3
- https://huggingface.co/docs/transformers.js/en/tutorials/node
- https://onnxruntime.ai/docs/get-started/with-javascript/node.html

Raw receipts and the exact temporary qualifier are preserved under:

`engineering/evidence/mct-r5s1-embedding-qualification-2026-07-16/`

The temporary package, model, and cache root was deleted and its absence verified.

## Next Gate

The next A2 decision does not select a production asset. It only authorizes
`intfloat/multilingual-e5-small` as the conditional shortlist for building the
offline bundle and running Windows native smoke. Final production selection needs
a second A2 owner decision after macOS and Windows native smoke, checksum,
update, and rollback evidence all pass.
