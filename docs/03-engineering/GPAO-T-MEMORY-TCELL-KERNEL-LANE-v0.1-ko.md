# GPAO-T Memory / T-cell Kernel Lane v0.1

Date: 2026-07-13
Status: active lane contract

## Purpose

GPAO-T memory is not a storage feature. It is a T-cell governed operating
kernel for deciding when a traced principle may influence action.

## Kernel Flow

```text
raw source
-> review-only memory/context candidate
-> T-cell draft
-> admission
-> read-only replay
-> scoped apply request
-> local approval/audit record
-> local Context Mesh candidate append
-> post-apply replay
-> keep or rollback
```

This flow is not durable promotion. Durable memory promotion, live OS rule
mutation, connector send, external automation, and user-visible identity change
remain separate authority gates.

## P0 Work

1. Separate `apply preview/request` from `local Context Mesh candidate append`.
2. Add replay fixtures for wrong-anchor rejection, stale-memory rejection,
   current-request precedence, and rollback restoring admission result.
3. Expose in inspector:
   - used memory
   - excluded memory
   - why a candidate was support-only
   - replay result
   - rollback path
4. Keep durable promotion, live OS rule mutation, connector send, and external
   automation behind explicit approval.
5. Label `approved_for_apply` as approval for local candidate append only, not
   durable promotion.
6. Normalize source evidence as `SourceRecord[]` across memory wiki and memory
   candidate review paths.

## P1 Work

1. Add T-cell object schema for `pi`, boundary, trace, state change, authority,
   replay, invalid condition, and compression safety.
2. Add longitudinal replay score beyond token overlap.
3. Add self-growth proposal v2 that connects review-only growth gates to local
   candidate append without durable promotion.

## Verification

- `node --test test/memory-wiki.test.js test/memory-candidate-review-queue.test.js test/auto-memory-growth-loop.test.js`
- New fixtures must prove:
  - retrieved is not admitted
  - admitted support is not answer anchor
  - candidate insight is not live rule
  - rollback restores admission behavior
  - local apply followed by failed post-apply replay rolls back
  - `openclaw_memory`, `session_meta`, external send, and durable promotion
    targets stay blocked in the local apply engine
  - current request always outranks stale memory

## Inspector Contract

The UI/API inspector should expose these first-class fields without leaking raw
developer internals:

| Field | Meaning |
| --- | --- |
| `memory_used` | Memory/context that was allowed to support this answer |
| `memory_excluded` | Candidate rejected or held out |
| `why` | Human-readable reason |
| `support_only_reason` | Why this cannot become the answer anchor |
| `apply_scope` | `local_candidate_append`, not durable promotion |
| `rollback_path` | How to reverse the local append |
| `promotion_state` | `blocked`, `review_required`, or `not_requested` |
