# GPAO-T3 MCT-R0 Contract Freeze

Status: sealed_for_implementation
Date: 2026-07-16

## Purpose

This gate freezes the vocabulary, authority, event, prompt-budget, retention, benchmark, and rejection contracts required before MCT-R1/R2 implementation.

## Canonical Types

The canonical names remain `MemoryRecord`, `TCellCandidate`, `AdmissionDecision`, `TaskPacket`, `ResponseInfluence`, `GrowthProposal`, `ReplayResult`, `MutationLedger`, and `RollbackReceipt`. New aliases are forbidden without a versioned migration contract.

All 13 canonical objects use a closed schema with explicit scope identity, non-empty trace, authority class and decision reference, lifecycle, expiry, and invalidation fields. Durable promotion requires A2 authority. Rejected or expired records require an expiry timestamp.

## Existing Contract Reuse

MCT extends `gpao_t3.surface_event.v1` and the existing SQLite `surface_event_journal`. It does not create a second event router or journal. The eight MCT event types are user-safe projections; source records remain in their owning stores. The execution hash chain and the user-visible projection journal remain separate.

## Prompt Budget

The current request and minimum output reserve cannot be evicted by memory. Budget pressure removes supporting memory first, then oldest conversation detail, then tool detail. Every answer anchor must point to an `AdmissionDecision`.

The `TaskPacket` schema validates field shape and `assertTaskPacket` validates the cross-field budget sum and answer-anchor linkage.

## Authority And Flow

- A0: local retrieval, admission, analysis, draft, safe retry, index repair, replay preparation.
- A1: non-blocking notice of memory influence, recovery, or a growth candidate.
- A2: external action, destructive action, credentials, cost expansion, broad promotion, identity or operating-policy mutation.
- An ambiguous `remember` request defaults to session scope.
- Foreground chat must not wait for index rebuild, longitudinal replay, or growth stabilization.

## Retention And Deletion

Canonical source deletion must remove FTS, vector, and UI projections and future influence. Rollback must remove active projections while retaining the minimum digest and audit reference needed to prove the rollback.

Promoted records and every `MutationLedger` require durable A2 authority with a decision reference. Runtime assertions enforce monotonic timestamps and `rejected.expiresAt = createdAt + 30 days`.

## Measurement Boundary

Zero/100% claims apply only to sealed fixtures, property tests, attack scenarios, and comparison datasets. Production uses continuous observation and incident gates.

The 10,000-record corpus is reproducible from the sealed seed and generator version. Its canonical JSON digest is checked before any R1/R2 benchmark result is admitted.

`cold` means a fresh Node process and fresh SQLite connection with no application cache. OS page cache is deliberately uncontrolled because clearing it is privileged, platform-specific, and unsuitable for a reproducible user/CI gate. `warm` means subsequent queries in the same process and connection. Both process-cold and warm p95 values must satisfy the sealed 250 ms threshold.

The corpus generator was corrected before R1 qualification so each record actually matches the sealed 180-token target. The admitted corpus digest is `sha256:2e305840347926f6217d1cf76d0f8d8372b91bfaf979b7a6d1ecd07e7c0b014b`; earlier draft digests are not valid R1 evidence.

## Exit Gate

R1/R2 may begin only when `npm run test:mct-r0` and the unchanged WP8-R contract suite pass. Any rejection condition in `test/fixtures/mct-r0-seal.json` reopens R0.
