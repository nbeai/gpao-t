# GPAO-T Post-update Memory Namespace Structural Repair

- Date: 2026-07-15
- Trigger: tester conversation after update exposed OpenClaw wording, `openclaw memory index --force`, and developer git state in an ordinary stability check.
- Scope: source, runtime workspace contract, provider/auth store contract, user-facing answer guard, tests, live workspace pack application.

## Problem

The reported answer showed three product failures:

- GPAO-T described itself through a compatibility-layer identity.
- Memory index recovery used a non-GPAO-T command.
- Ordinary stability status included developer git/untracked state.

This was not treated as a copy-only issue. The structural source was that parts of the auth/runtime contract still treated `openclaw-agent.sqlite` as active runtime authority, while the runtime workspace memory pack still carried a durable comparison-product memory anchor.

## Repair

- Canonical provider/auth store is now `gpao-t-agent.sqlite`.
- `openclaw-agent.sqlite` is now an internal runtime compatibility mirror only.
- Repair plans copy legacy/compatibility auth stores into the canonical GPAO-T store, then create or refresh the internal mirror when needed.
- Runtime `MEMORY.md` now anchors `GPAO-T Memory Namespace` instead of a durable OpenClaw relationship memory.
- Runtime `AGENTS.md` now has a user stability check contract: ordinary stability answers must use the GPAO-T product path and must not expose developer git state.
- Runtime `TOOLS.md` now lists `gpao-t memory index --force`, `gpao-t logs --follow`, and blocks user-facing `openclaw ...` command guidance.
- A user-facing runtime answer guard now rewrites compatibility command/name leaks and suppresses developer git lines for ordinary stability questions.

## Verification

- `node --test test/provider-auth-heart.test.js test/model-connection-settings.test.js test/tester-failure-guards.test.js --test-concurrency=1 --test-timeout=180000 --test-reporter=spec`: 20 pass / 0 fail.
- `node --test test/memory-search.test.js test/memory-context-heart.test.js test/runtime-heart-hardening.test.js --test-concurrency=1 --test-timeout=180000 --test-reporter=spec`: 11 pass / 0 fail.
- `node tools/apply-gpao-t-runtime-workspace-pack.mjs`: dry-run verification passed.
- `node tools/apply-gpao-t-runtime-workspace-pack.mjs --apply --token apply-gpao-t-runtime-workspace`: applied to `/Users/jyp/.gpao-t/workspace` and verification passed.
- `npm run check`: passed.
- `npm test`: 489 pass / 0 fail plus dashboard readiness suites passed.
- `git diff --check`: passed.

## Evidence Paths

- Live workspace application report: `docs/03-verification/evidence/runtime-workspace-pack/runtime-workspace-absorption-2026-07-15T13-47-50-337Z.md`
- Live workspace application JSON: `docs/03-verification/evidence/runtime-workspace-pack/runtime-workspace-absorption-2026-07-15T13-47-50-337Z.json`
- Backup of previous live workspace files: `docs/03-verification/evidence/runtime-workspace-pack/backups/2026-07-15T13-47-50-337Z/`

## Remaining Follow-up

Internal engineering modules and tests still contain explicit OpenClaw absorption/compatibility terminology where they model migration and bounded compatibility. Those are not user-facing memory authority, but they should be renamed in a later source-cleanup pass to reduce future confusion.
