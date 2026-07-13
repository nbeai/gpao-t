# GPAO-T Local Semantic Memory Plan - 2026-07-13

## Goal

GPAO-T must not lose memory and context search quality when an external embedding provider is unavailable, over quota, slow, or misconfigured.

Plain-language meaning: GPAO-T should keep remembering and finding relevant context even when OpenAI embedding search cannot be used.

## Product Decision

Default memory search for GPAO-T is local-first hybrid search.

- Lexical layer: local token and phrase overlap search.
- Local semantic layer: deterministic local hash embedding search.
- External provider layer: optional upgrade path, not a required baseline.
- T-cell boundary: search results are support candidates only. They do not become durable truth or admitted answer anchors without admission/replay/apply gates.

## Why This Direction

Other AI operating environments commonly separate the model from memory retrieval infrastructure. LangChain, LlamaIndex, Open WebUI, and OS-style memory systems treat embeddings/vector search as a replaceable memory component. GPAO-T should follow the stronger local-first version of that pattern:

1. Keep a local baseline that works without quota.
2. Add stronger local embedding providers later.
3. Allow cloud embeddings only as an optional accelerator.
4. Keep all memory use under GPAO-T admission and replay rules.

## Implementation Pass 001

Completed in source:

- Added local hybrid memory search mode in `src/core/memory-search.js`.
- Added local deterministic embedding version `gpao_t.local_hash_embedding.v0_1`.
- Index now stores both lexical tokens and local vectors.
- Search ranking now combines lexical score, semantic similarity, and source boost.
- Memory status now reports:
  - `embeddingSearch.status`
  - `embeddingSearch.provider`
  - `embeddingSearch.externalQuotaRequired`
- LLM-ready packets continue to attach memory results as `search_support_candidate`, not admitted anchors.

## Safety Contract

The local semantic layer is not allowed to:

- write durable memory,
- promote a candidate,
- bypass T-cell admission,
- become answer authority by itself,
- call external APIs,
- depend on OpenAI embedding quota.

## Verification

Passed:

```text
node --check src/core/memory-search.js bin/gpao-t.js src/core/llm-ready-task-context-packet.js
node --test test/memory-search.test.js test/llm-ready-memory-search.test.js test/llm-ready-task-context-packet.test.js
```

Observed and repaired during this pass:

- Several core/test files had `blocks=0`, meaning macOS showed the file metadata but the file body was not local.
- Those files caused reads and tests to hang.
- The files were materialized locally before verification.

## Remaining Product Work

Next implementation pass should add provider slots for stronger local embedding engines:

- Ollama local embedding endpoint
- HuggingFace/SentenceTransformers local model path
- provider health and latency status
- UI wording that separates:
  - basic search,
  - local meaning search,
  - external embedding provider status

## Completion Rule For This Lane

This lane is complete only when live GPAO-T shows memory search as usable without OpenAI embedding quota and semantic retrieval can be verified against real user conversation/workspace memory.
