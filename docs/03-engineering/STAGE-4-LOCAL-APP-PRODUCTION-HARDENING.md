# Stage 4 Local App / Desktop Production Hardening

Status: local production-hardening surface added and verified
Scope: browser-local proof to packaged-desktop readiness without opening build, install, deployment, live model, connector, or tool execution

## Purpose

Stage 4 ties together the browser-local app shell, Tauri source scaffold, local approval/audit record substrate, replay read, rollback reference, screenshot baseline, and source-control rollback posture into one inspectable product surface.

This is not a Tauri build. It is the strongest local production-readiness artifact before explicit user approval for build/install/release authority.

## Product Surface

User-visible page:

```sh
node bin/gpao-t.js control serve 0
# then open /app-shell/production-hardening
```

Machine-readable state:

```sh
node bin/gpao-t.js control stage-4-production-hardening
node bin/gpao-t.js control stage-4-production-hardening-check
node bin/gpao-t.js gateway GET /app-shell/production-hardening
node bin/gpao-t.js gateway GET /app-shell/production-hardening/verify
```

Loopback routes:

- `GET /app-shell/production-hardening`
- `GET /app-shell/production-hardening/state`
- `GET /app-shell/production-hardening/verify`

## Readiness Checks

The Stage 4 surface verifies:

- browser-local loopback serving contract
- app-shell read surface
- Tauri source scaffold presence
- read-only Tauri shell contract
- local approval/audit JSONL record substrate
- replay and rollback reference read
- desktop/mobile visual QA baseline
- local git source-control rollback posture

## Authority Boundary

Allowed now:

- read loopback health
- inspect browser-local app-shell state
- inspect Tauri scaffold files
- inspect local approval/audit records
- read replay and rollback reference
- capture desktop/mobile screenshots
- run local verification commands

Still blocked:

- Tauri build
- dependency install
- bundle/signing/installer creation
- install/update/rollback execution
- local IPC command execution
- live model call
- tool/CLI/MCP execution from model output
- connector activation
- OAuth/token/credential access
- external send
- paid/destructive action
- public release/deployment
- durable memory promotion
- self-growth apply

## Failure And Recovery States

- `loopback_preview_unavailable`: run the ephemeral serve-check; do not start a persistent daemon silently.
- `tauri_scaffold_missing`: restore missing source files before any build conversation.
- `app_shell_state_review`: inspect `/app-shell/verify` first.
- `local_record_substrate_review`: inspect local approval/audit JSONL paths and replay read.
- `visual_evidence_missing`: capture desktop and mobile screenshots before quality claims.
- `authority_boundary_hidden`: restore visible locked/allowed behavior before further product work.

## Visual Evidence

Required evidence:

- Desktop: `docs/03-verification/evidence/stage-4-production-hardening-desktop-1440x960.png`
- Mobile: `docs/03-verification/evidence/stage-4-production-hardening-mobile-390x844.png`
- QA report: `docs/03-verification/evidence/STAGE-4-PRODUCTION-HARDENING-QA-2026-07-09.md`
- Replayable QA JSON: `docs/03-verification/evidence/stage-4-production-hardening-qa-2026-07-09.json`

## Completion Meaning

Stage 4 closes the local-app/desktop production-hardening readiness surface. It does not claim that GPAO-T is packaged, installed, signed, distributed, or public-release-ready.

The next authority step requires explicit user approval before any actual Tauri build, dependency install, package signing, installer creation, install/update/rollback execution, connector/model/tool activation, external send, public release, or durable memory promotion.
