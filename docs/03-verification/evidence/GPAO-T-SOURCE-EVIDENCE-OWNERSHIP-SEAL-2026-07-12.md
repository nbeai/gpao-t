# GPAO-T Source Evidence Ownership Seal - 2026-07-12

Status: source/evidence ownership policy applied
Scope: git hygiene, generated evidence policy, live backup retention, commit grouping.

## Purpose

This seal separates product source from generated local evidence so GPAO-T can be reviewed, committed, and handed to a supervised test team without hiding rollback evidence or flooding the source tree.

## Product Source

Commit candidates:

- `src/**`
- `bin/**`
- `tools/**`
- `test/**`
- `runtime-workspace/gpao-t/**` when used as the canonical install seed
- `docs/00-canon/**`
- `docs/01-product/**`
- `docs/02-design/**`
- `docs/02-workflow/**`
- `docs/03-engineering/**`
- curated `docs/03-verification/evidence/*.md`
- curated `docs/03-verification/evidence/*.json`
- curated screenshots used in a specific QA report
- `docs/05-release/**`

## Generated Or Heavy Evidence

Excluded from normal git review by `.gitignore`:

- `docs/03-verification/evidence/live-backups/**`
- `docs/03-verification/evidence/live-*-patch/**`
- `docs/03-verification/evidence/live-test-session-cleanup/**`
- `docs/03-verification/evidence/conversation-ux-qa/*.json`
- `docs/03-verification/evidence/live-device-repair-backup-*/**`
- `docs/03-verification/evidence/live-runtime-repair-*/**`
- `docs/03-verification/evidence/live-conversation-qa-*/**`
- `docs/03-verification/evidence/live-plugin-allowlist/**`
- `docs/03-verification/evidence/live-hook-preview/**`
- `docs/03-verification/evidence/live-patch-stage/**`
- `docs/03-verification/evidence/runtime-workspace-absorption-*/backups/**`
- `docs/03-verification/evidence/**/*.before`

Exceptions:

- nested directories remain traversable
- `manifest.json` remains explicitly allowed for backup/recovery provenance

## Runtime State

Already excluded and still excluded:

- `.gpao-t/`
- `.beai-harness/`
- `node_modules/`
- `coverage/`
- `dist/`
- `tmp/`
- `*.log`

Runtime state can be referenced by evidence docs, but it is not product source unless a file is intentionally promoted into `runtime-workspace/gpao-t`.

## Commit Grouping Rule

Do not commit the current dirty tree as one lump.

Use these groups:

1. User-surface seal: live patch tools, route/audit tools, related tests, evidence docs.
2. Runtime kernel: context, memory, replay, admission, session continuity, turn kernel.
3. Gateway and CLI: `gateway.js`, `bin/`, package scripts, live repair/readback tools.
4. Owner Ops and release: package, handoff, release docs and tests.
5. Product docs: canon, design, workflow, engineering plans.
6. Curated evidence only: summary Markdown/JSON and selected screenshots.

## Current Remaining Source Hygiene

The midpoint audit found:

- 34 modified tracked files
- 236 `git status --short` lines before this ignore policy
- stale `.git/index 2` through similar numbered files
- no `.git/index.lock`

After the second evidence-hygiene update in this pass, raw live/runtime backup payloads are still retained on disk but no longer define the normal source-review surface. Product evidence should be read through the curated root-level Markdown/JSON evidence files and selected screenshots, not through raw copied runtime payloads.

The numbered git index files are local debris and should be removed only in a dedicated git-maintenance pass, not during product source edits.

## Completion Rule

This seal does not delete evidence. It prevents generated backup payloads from being mistaken for product source.

The next clean handoff claim requires:

- `git status --short` reduced to intentional source/evidence files
- generated raw backups ignored or quarantined
- current route seal evidence updated after the user-surface patch
- current test commands passing after patch

Current grouped review lanes:

1. `surface-seal`: user-screen patch tools, route seal evidence, Safari DOM readback, surface tests.
2. `runtime-kernel`: context, memory, replay, admission, session continuity, turn kernel.
3. `owner-ops-release`: package, handoff, release docs, Owner Ops CLI/MCP and tests.
4. `runtime-workspace-seed`: canonical GPAO-T workspace seed and welcome/setup files.
5. `product-docs`: canon, product, design, workflow, engineering plans.
6. `curated-evidence`: root-level evidence Markdown/JSON and selected screenshots only.
