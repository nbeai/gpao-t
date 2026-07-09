# First Local Work Loop v1

Status: implemented local product slice  
Date: 2026-07-09

## Purpose

This slice turns the Work Surface from a read-only preview substrate into the first local work loop:

```text
user work text
-> local submission packet
-> task packet
-> Context Mesh evidence
-> Skill route
-> Model Router candidate
-> local draft preview
-> approval/audit local JSONL record
-> replay / rollback reference
```

The loop is still local-first and authority-bounded. It does not call a model, execute tools, activate connectors, read credentials, send externally, spend money, perform destructive action, install/update/rollback, promote durable memory, or apply self-growth.

## Runtime Surfaces

- Core module: `src/core/first-local-work-loop.js`
- Work Surface preview: `node bin/gpao-t.js control work-surface`
- Work Surface HTML: `node bin/gpao-t.js control work-surface-html`
- Local loop submit: `node bin/gpao-t.js control work-surface-local-loop [text]`
- Local loop check: `node bin/gpao-t.js control work-surface-local-loop-check [text]`
- Gateway local submit: `POST /work-surface/local-loop`
- Gateway local check: `POST /work-surface/local-loop/verify`

Browser-local `/work-surface` remains no-script and no-form. Rendering the page never writes records. Local approval/audit JSONL records are written only by the explicit CLI/Gateway local-loop path.

## Local Record Boundary

Allowed in this slice:

- approval record write to `.gpao-t/approval/approval-records.jsonl`
- audit record write to `.gpao-t/approval/audit-records.jsonl`
- replay read
- rollback reference read

Still blocked:

- live model call
- tool / CLI / MCP execution
- connector activation
- credential access
- external send
- paid action
- destructive action
- install / update / rollback execution
- public release
- durable memory promotion
- self-growth live apply

## Visual QA

- QA JSON: `docs/03-verification/evidence/first-local-work-loop-v1-visual-qa-2026-07-09.json`
- QA report: `docs/03-verification/evidence/FIRST-LOCAL-WORK-LOOP-V1-VISUAL-QA-2026-07-09.md`
- Work Surface desktop: `docs/03-verification/evidence/first-local-work-loop-v1-work-surface-desktop-1440x960.png`
- Work Surface mobile: `docs/03-verification/evidence/first-local-work-loop-v1-work-surface-mobile-390x844.png`
- Control Center desktop: `docs/03-verification/evidence/first-local-work-loop-v1-control-center-desktop-1440x960.png`
- Control Center mobile: `docs/03-verification/evidence/first-local-work-loop-v1-control-center-mobile-390x844.png`

Open Design MCP was attempted first but the transport was closed. The implementation used the GPAO-T Visual Reference Pack as fallback design authority and captured desktop/mobile CDP evidence with overflow metrics.

## Verification

Required checks:

```sh
node --test test/first-local-work-loop.test.js
node bin/gpao-t.js control work-surface-local-loop-check "GPAO-T 첫 로컬 작업 루프를 확인해줘."
node bin/gpao-t.js control work-surface-check
npm run verify
```

