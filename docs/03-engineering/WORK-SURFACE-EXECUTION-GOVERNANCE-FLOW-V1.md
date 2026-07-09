# Work Surface Execution Governance Flow v1

## Purpose

This slice connects execution proposal, approval preview, local approval/audit records, replay, and rollback reference into one user-visible Work Surface flow.

It does not open live model calls, tool/CLI/MCP execution, connector activation, credential access, external send, paid/destructive action, public release, or durable memory promotion.

## User Flow

```text
실행 후보
-> 의도 확인
-> 로컬 승인/감사 기록
-> 리플레이 읽기
-> 되돌리기 기준 확인
```

The browser Work Surface renders the flow without writing during page load. It exposes one same-origin loopback form for `matches_intent`; submitting that form writes only local approval/audit JSONL records and returns a local result page. Local records can also be written through explicit CLI/Gateway calls after the confirmation control selects `matches_intent`.

## Runtime Surfaces

- Core module: `src/core/work-surface-execution-flow.js`
- Work Surface data: `executionGovernanceFlow`
- CLI preview: `node bin/gpao-t.js control work-surface-execution-flow [text]`
- CLI confirmation control: `node bin/gpao-t.js control work-surface-execution-confirmation [matches_intent|needs_changes|hold]`
- CLI check: `node bin/gpao-t.js control work-surface-execution-flow-check [text]`
- CLI local record write: `node bin/gpao-t.js control work-surface-execution-record [text] matches_intent`
- Gateway preview: `GET /work-surface/execution-flow`
- Gateway confirmation control: `GET /work-surface/execution-flow/confirmation`
- Gateway check: `GET /work-surface/execution-flow/verify`
- Gateway local record write: `POST /work-surface/execution-flow/record`
- Browser-local confirmation form: `POST /work-surface/execution-flow/record` with `data-local-confirmation-form="approval-audit-record"`
- Browser-local result page: shows approval id, audit id, replay status, rollback reference, and still-blocked live actions

## Authority Boundary

Allowed in this slice:

- local JSONL approval record write after explicit confirmation
- local JSONL audit record write after explicit confirmation
- replay read
- rollback reference read
- one same-origin browser form that writes only the local approval/audit records after `의도와 맞음`

Blocked in this slice:

- live model call
- tool/CLI/MCP execution
- connector activation
- credential access
- external send
- paid action
- destructive action
- public release
- durable memory promotion

## Verification

Required checks:

```bash
node --test test/work-surface-execution-flow.test.js
node bin/gpao-t.js control work-surface-execution-confirmation matches_intent
node bin/gpao-t.js control work-surface-execution-flow-check
node bin/gpao-t.js control work-surface-check
npm run verify
```

Required visual evidence:

- `docs/03-verification/evidence/work-surface-execution-governance-flow-v1-desktop-1440x960.png`
- `docs/03-verification/evidence/work-surface-execution-governance-flow-v1-mobile-390x844.png`
- `docs/03-verification/evidence/work-surface-execution-governance-flow-v1-qa-2026-07-09.json`
- `docs/03-verification/evidence/work-surface-stage-3-complete-desktop-1440x960.png`
- `docs/03-verification/evidence/work-surface-stage-3-complete-mobile-390x844.png`
- `docs/03-verification/evidence/work-surface-stage-3-record-result-desktop-1440x960.png`
- `docs/03-verification/evidence/work-surface-stage-3-record-result-mobile-390x844.png`
- `docs/03-verification/evidence/work-surface-stage-3-complete-qa-2026-07-09.json`
