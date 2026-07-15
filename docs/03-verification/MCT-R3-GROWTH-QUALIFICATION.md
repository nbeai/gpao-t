# GPAO-T3 MCT-R3 Governed Growth Qualification

Status: qualified_for_checkpoint
Date: 2026-07-16
Source checkpoint: `0f7a1ce153169b60f817e442a46d01feae8c128a`

## Purpose

MCT-R3 converts repeated, traceable correction or failure evidence into a reviewable growth proposal. It may affect future admission behavior only after server-sealed replay, explicit scope-bound A2 approval, bounded canary application, and a pre-created rollback snapshot.

## Implemented Boundary

- Distinct repeated evidence is required; one observation cannot manufacture recurrence.
- `GrowthProposal`, `ReplayResult`, `MutationLedger`, and `RollbackReceipt` use the R0 canonical schema.
- Replay executes the real `TaskPacket -> admitTcellCandidates` path over sealed evaluation and holdout fixtures.
- Replay baseline policy, candidate policy, fixture results, and canonical digests are durable and integrity-bound.
- A replay becomes stale when another canary changes its active scope baseline and cannot be applied without replaying.
- Browser clients cannot provide replay cases, scores, metrics, or pass results.
- Mutation requires an exact owner and scope-bound A2 decision and applies only allowlisted admission policy keys within fixed ranges.
- Multiple canaries receive monotonic creation times and compose from oldest to newest.
- Expiry and explicit rollback remove the active projection before snapshot and sealed holdout verification.
- The runtime foreground turn reads an in-memory policy projection; replay and mutation persistence do not enter the conversational hot path.

## Qualification Gate

The following passed from the source checkpoint and its documentation-only successor:

1. WP8-R: 25/25
2. MCT-R0: 6/6
3. MCT-R1: 2/2
4. MCT-R2: 16/16
5. MCT-R3: 9/9
6. Full runtime regression: 208/208
7. Browser/tool qualification: pass with `web`, `chrome`, and `actionApproval` true
8. `npm run check`: pass
9. Independent adversarial audit: no remaining P0 or P1

## Adversarial Closure

The audit and repair loop closed client-forged replay metrics, non-canonical records, unbound auxiliary SQLite columns, cross-owner rollback, unverified rollback receipts, extreme policy values, synthetic replay scoring, expiry/reapply drift, reverse canary ordering, and replay/apply baseline divergence.

## Remaining Boundary

MCT-R3 does not claim the MCT-R4 user review and provenance surface, MCT-R5 comparative product evaluation, or MCT-R6 migration and package requalification. Human acceptance and the owner-deferred 72-hour soak are not claimed. Public unattended background mutation remains outside this checkpoint.
