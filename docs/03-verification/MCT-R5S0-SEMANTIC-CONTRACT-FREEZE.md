# MCT-R5S0 Semantic Contract Freeze

- Status: contract_frozen_pending_clean_checkpoint
- Plan: `GPAO-T3-SEMANTIC-POM-COGROWTH-MASTER-DEVELOPMENT-PLAN-v0.1-ko.md`
- Baseline source: `66bec59d8d895d534f56c048e37d56739fcaccc3`
- Contract schema: `gpao_t3.semantic_runtime_contract.v1`
- Seal: `test/fixtures/mct-r5s0-seal.json`

## Decision

R5S0 freezes the semantic runtime boundary before any model download or product
selection. Embedding and reranker output may retrieve and rank candidates, but it
never grants action authority and never bypasses T-cell admission.

## Frozen Contracts

- provider-neutral embedding and reranker adapter capabilities;
- role-separated embedding, reranker, and index identity with SHA-256 canonical
  JSON digests;
- local A0, nonblocking A1, and external/raw-content A2 authority boundaries;
- R0's 10,000-record mixed benchmark inherited without weakening;
- four comparison targets: lexical T3, live GPAO-T, fixed OpenClaw, reinforced T3;
- exact foreground, resource, prompt, approval, safety, and quality budgets;
- lexical fallback, last-verified-index retention, quarantine, repair, migration,
  cancellation, and rollback behavior;
- explicit OOM, non-finite vector, dimension, tokenizer, remote permission,
  score-calibration, checksum, and repeated-timeout behavior;
- independent holdout isolation and one-run qualification discipline.

## Candidate Asset Status

The matrix in `test/fixtures/mct-r5s0-model-candidates.json` records upstream
metadata only. No candidate is selected, downloaded, bundled, or approved by
R5S0. Reported licenses and sizes must be verified again against pinned revisions
during R5S1 or R5S4A.

Candidate source cards observed on 2026-07-16:

- https://huggingface.co/intfloat/multilingual-e5-small
- https://huggingface.co/BAAI/bge-m3
- https://huggingface.co/cross-encoder/mmarco-mMiniLMv2-L12-H384-v1
- https://huggingface.co/BAAI/bge-reranker-v2-m3

## Entry Gate

R5S1 may begin only when:

1. R5S0 contract tests pass;
2. R0 through R5 regression passes at one source SHA;
3. contract and candidate matrix digests match the seal;
4. `npm run qualify:mct-r5s0` records a clean checkpoint SHA;
5. independent audit has no unresolved blocking finding.

The qualifier rejects a dirty tree before running checks. On a clean commit it
runs `npm run precheck`, `npm test` (including the automatic MCT pretest), and
the inherited 10,000-record `benchmark:mct-r1`. It verifies that HEAD and the
worktree remain unchanged, then stores digested logs and a receipt under:

`engineering/evidence/mct-r5s0-contract-freeze-2026-07-16/`

R5S0 does not claim semantic retrieval quality. That claim belongs to R5S7 after
model qualification, index lifecycle, hybrid fusion, reranking, admission, flow,
and a new independent holdout all pass.
