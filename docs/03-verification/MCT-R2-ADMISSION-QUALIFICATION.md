# GPAO-T3 MCT-R2 Admission Qualification

Status: qualified_for_checkpoint
Date: 2026-07-16

## Purpose

MCT-R2 turns retrieved memory into task-relative candidates and admits only context that is allowed to influence the current turn. It preserves the user's current request as the highest-priority instruction and degrades to a no-memory turn when retrieval or persistence misses the foreground deadline.

## Implemented Boundary

- Canonical `TaskPacket`, `TCellCandidate`, `AdmissionDecision`, and `ResponseInfluence` contracts.
- Session, project, user, and channel scope isolation.
- Trace, authority, freshness, relevance, contradiction, and replay gates.
- Separate `answer_anchor`, `supporting_context`, conflict, blocked, rejected, and review-required projections.
- Prompt-memory budget enforcement that cannot evict the current request or minimum output reserve.
- Durable admission and influence ledgers plus user-safe MCT surface events.
- Restart-stable projections and foreground timeout fallback.

## Qualification Gate

R2 is closed only when all of the following pass from the same committed source SHA:

1. `npm run check:mct-r0` and `npm run test:mct-r0`
2. `npm run check:mct-r1`, `npm run test:mct-r1`, and `npm run benchmark:mct-r1`
3. `npm run check:mct-r2`, `npm run test:mct-r2`, and `npm run benchmark:mct-r2`
4. `npm run check` and `npm test`
5. Independent review finds no remaining P0 or P1 admission defect.
6. The repository is clean after the checkpoint commit.

Earlier completion documents or results from another source state do not satisfy this gate. Exact metrics, artifact digests, and the checkpoint SHA are recorded in the external engineering evidence bundle after the commit exists.

## R3 Boundary

R3 may build growth proposals, replay comparison, limited application, observation, and rollback on top of the R2 ledgers. It must not bypass admission, mutate operating behavior directly from retrieved memory, or block foreground conversation on longitudinal evaluation.
