# GPAO-T Memory / Context Mesh Differentiation Work Order 2026-07-14

Status: active work order  
Owner: GPAO-T  
Goal: make memory, Context Mesh, and self-growth a visible GPAO-T product advantage without slowing normal conversation.

## 1. Product Target

GPAO-T memory must not stop at "search works." It must become a fast operating layer that helps the system understand the user's current intent, recover project context, propose safe memory candidates, and improve future behavior through replay.

Plain-language target:

> GPAO-T should remember enough to be useful, prove why a memory is relevant, avoid old-context pollution, and stay fast.

## 2. Non-Negotiables

- Current user request outranks old memory.
- Raw memory is not authority.
- Retrieved memory is not admitted memory.
- Search support is not an answer anchor.
- Durable memory promotion remains blocked until review.
- External send, secret handling, identity mutation, destructive action, and live OS rule mutation require explicit authority.
- Normal chat must not block on deep vault scans, slow files, vector providers, or long replay.

## 3. Fixed Work Stages

### Stage 1. Fast-Lane Memory Baseline

Purpose: keep memory search available without external embedding quota.

Completion criteria:
- Local hybrid search works without OpenAI embedding quota.
- Large JSONL files are read through bounded tail reads, not full synchronous reads.
- Offloaded or sparse files are skipped with degraded evidence.
- Search result includes source, score breakdown, excerpt, and path.

### Stage 2. Context Mesh Admission Contract

Purpose: separate retrieved candidates from admitted answer anchors.

Completion criteria:
- Every candidate has role: answer anchor, support, stale support, review, blocked, or rejected.
- Current target and request type are part of admission.
- Old project context cannot override a new user request.
- The LLM-ready packet records admitted and excluded memory separately.

### Stage 3. Live Turn Integration

Purpose: one user turn should connect input, memory, model, tool, replay, and growth candidate.

Completion criteria:
- `/work-surface/submit` and chat-like input can produce one `gpao_t.first_real_os_turn` record.
- User-visible state includes memory/context status without exposing noisy internal logs.
- Memory search degradation does not stop the answer path unless the user explicitly asks for memory-critical work.

### Stage 4. Self-Growth Candidate Loop

Purpose: learn from turns without silently mutating durable behavior.

Completion criteria:
- Safe local candidates can be created automatically.
- Candidates include source companion, reason, expected benefit, invalid conditions, replay record, and rollback path.
- Apply remains review-gated unless a narrow reversible local policy is explicitly passed.

### Stage 5. UI / Evidence Visibility

Purpose: make GPAO-T feel like an OS, not a hidden memory trick.

Completion criteria:
- User can see whether memory was used, skipped, blocked, or only suggested.
- Developer-only detail is hidden by default.
- A review/audit surface can expose trace, source, replay, and rollback.

### Stage 6. Performance Guard

Purpose: prevent memory intelligence from becoming a speed tax.

Completion criteria:
- Normal turn path uses bounded read, cache, and small top-k search.
- Deep compile, replay, and provider embedding are async or post-answer by default.
- Performance metadata records scanned documents, skipped sources, generatedAt, and local engine.
- Tests cover large JSONL tail behavior and degraded sparse/offloaded source behavior.

### Stage 7. Live Verification

Purpose: do not claim completion from code alone.

Completion criteria:
- Targeted tests pass.
- `npm run check` passes.
- Live `gpao-t memory status/index/search/heart-check` is verified after packaging or live sync.
- Safari/user surface is checked before product-completion language.

## 4. P0 Scope For This Pass

This pass closes the foundation, not the whole memory vision.

P0 items:
- Make local memory search performance-safe for growing logs.
- Record the product work order.
- Add tests for bounded JSONL tail indexing.
- Confirm first OS turn still carries memory search state without blocking.

P1 items:
- Restore `memory-wiki` plugin dependency and enable it safely.
- Add active-memory as a bounded pre-answer option with strict time budget.
- Add better provider/vector status language so users do not see "memory unavailable" when local search is working.
- Add UI review surface for memory/context/growth traces.

P2 items:
- Local embedding provider experiments: Ollama / LM Studio.
- External embedding provider experiments: Voyage / Mistral / OpenAI, only after credential and cost boundaries are clear.

## 5. Completion Language Rule

Allowed after this pass:

- "GPAO-T memory foundation is stronger and more performance-safe."
- "Local hybrid memory search is bounded and suitable for growing logs."

Not allowed after this pass:

- "GPAO-T memory/self-growth is complete."
- "All Context Mesh functions are production-complete."
- "Semantic/vector provider memory is fully enabled."

## 6. 2026-07-14 P0 Implementation Record

Applied changes:

- `memory-search.js`: added a fast-lane `allowBuild: false` contract. Live turn and LLM packet paths no longer rebuild a missing memory index during a user request.
- `memory-search.js`: kept local hybrid/hash search as the P0 baseline, with bounded text/JSONL reads and index performance metadata.
- `storage.js`: changed generic JSONL tail reads from full-file reads to bounded byte-tail reads.
- `chat-preflight-replay.js`: reused the already-built LLM-ready packet when building the surface state, removing duplicate packet/search work.
- `first-real-os-turn-pipeline.js`: treats a missing memory index as `needs_index` instead of blocking or doing a surprise rebuild.
- `test:fast`: now includes memory search, memory/context heart, LLM-ready memory attachment, and JSONL tail performance tests.

Verification:

- `node --test test/memory-search.test.js test/storage-jsonl-tail.test.js test/llm-ready-task-context-packet.test.js test/llm-ready-memory-search.test.js test/memory-context-heart.test.js test/first-real-os-turn-pipeline.test.js --test-concurrency=1 --test-timeout=120000 --test-reporter=spec`: 20 pass / 0 fail.
- `npm run check`: pass.
- `npm run test:fast`: 44 pass / 0 fail.

Plain explanation:

- Normal conversation now uses prepared memory/search evidence quickly.
- If the memory index is missing, GPAO-T should keep the conversation moving and ask/schedule a rebuild path instead of freezing.
- Deep memory rebuild, replay, and growth compilation remain separate work, not a hidden tax on every user message.

Remaining work after this P0 pass:

- Live runtime sync and live user-surface verification.
- Better user-facing wording for local search vs semantic/vector provider status.
- Bounded active-memory option with time budget.
- Review surface for memory/context/growth traces that stays hidden from the main input area by default.
