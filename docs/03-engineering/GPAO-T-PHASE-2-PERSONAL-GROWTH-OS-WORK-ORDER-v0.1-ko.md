# GPAO-T Phase 2 Personal Growth OS Work Order v0.1

Date: 2026-07-13
Status: active

## Product Boundary

GPAO-T is a Personal Growth OS. OpenClaw is a separate comparison product and
compatibility reference. GPAO-T user-facing surfaces, installer language,
runtime state, documentation, and release artifacts must not describe GPAO-T as
OpenClaw-derived identity.

Allowed OpenClaw references:

- third-party license and source attribution
- archived evidence from historical absorption work
- explicit comparison matrices
- compatibility-state migration notes

Blocked OpenClaw references:

- user-facing product name, menu, login, error, setting, or assistant identity
- active runtime state root or service name for GPAO-T
- default command instructions shown to non-developer users
- completion language that calls OpenClaw the product substrate

## Parallel Lanes

1. Docker universal distribution
   - Dockerfile, compose, healthcheck, state volume, release docs, upgrade path.
   - Contract smoke: `npm run docker:smoke`.
   - Current local status: Docker CLI is not installed on this Mac, so the
     runtime build/up/health part is an environment blocker, not a product
     pass/fail. The smoke runner must return `blocked_environment` rather than
     pretending Docker passed.
2. Comparison and performance
   - Compare GPAO-T against OpenClaw as a distinct product, plus other AI runtimes.
   - Evidence frame: Agent Runtime -> Personal Growth OS, not feature-count
     diff.
3. T-cell memory and self-growth
   - Raw source, candidate, admission, replay, approval, promotion, rollback.
   - P0 wording: `apply request` is not durable promotion. The safe local path
     is local Context Mesh candidate append plus post-apply replay and rollback.
4. UI/UX operating feel
   - Chat, progress bridge, settings, login, errors, session workspaces, mobile.
   - P0 evidence: first viewport must read as current work OS state, not a
     messenger/chat history surface.
5. Process guard
   - Completion language, evidence, false-pass prevention, source/release sync.
   - Control Center loopback serving smoke has been classified as environment
     blocked inside the managed sandbox and ready outside it.

## Completion Criteria

- Docker distribution builds and exposes a verifiable GPAO-T runtime path.
- Product docs and installer text describe GPAO-T as an independent product.
- Remaining OpenClaw mentions are classified as attribution, comparison,
  compatibility migration, or historical evidence.
- Memory/self-growth automation has a safe authority boundary.
- UI/UX work is validated with desktop and mobile evidence before completion
  claims.

## Active Evidence Artifacts

- Control Center loopback blocker classification:
  `docs/03-verification/evidence/GPAO-T-CONTROL-CENTER-LOOPBACK-BLOCKED-CLASSIFICATION-2026-07-13.md`
- Memory / T-cell kernel lane:
  `docs/03-engineering/GPAO-T-MEMORY-TCELL-KERNEL-LANE-v0.1-ko.md`
- OS feel UX evidence plan:
  `docs/02-design/GPAO-T-OS-FEEL-UX-EVIDENCE-PLAN-v0.1-ko.md`
- OpenClaw comparison as runtime ascent evidence:
  `docs/01-product/GPAO-T-AGENT-RUNTIME-TO-PERSONAL-GROWTH-OS-MATRIX-v0.1-ko.md`

## Fixed Phase 2 Exit Gate

Phase 2 is complete only when these are true:

1. Docker smoke exists and honestly reports either `ready` or a precise
   environment blocker.
2. Control Center serving blocker is classified with evidence and no longer
   counted as an unknown product failure.
3. Memory/T-cell lane separates retrieved, candidate, admitted, support-only,
   local apply, durable promotion, and rollback states.
4. UX evidence plan requires desktop/mobile proof for chat-app residue removal.
5. OpenClaw comparison proves GPAO-T as a separate Personal Growth OS, with
   remaining OpenClaw references limited to attribution, comparison,
   compatibility, or historical evidence.
