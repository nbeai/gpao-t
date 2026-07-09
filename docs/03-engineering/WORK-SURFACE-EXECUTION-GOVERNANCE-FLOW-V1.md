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

The browser Work Surface renders the flow without writing records. Local records are written only through explicit CLI/Gateway calls.

## Runtime Surfaces

- Core module: `src/core/work-surface-execution-flow.js`
- Work Surface data: `executionGovernanceFlow`
- CLI preview: `node bin/gpao-t.js control work-surface-execution-flow [text]`
- CLI check: `node bin/gpao-t.js control work-surface-execution-flow-check [text]`
- CLI local record write: `node bin/gpao-t.js control work-surface-execution-record [text]`
- Gateway preview: `GET /work-surface/execution-flow`
- Gateway check: `GET /work-surface/execution-flow/verify`
- Gateway local record write: `POST /work-surface/execution-flow/record`

## Authority Boundary

Allowed in this slice:

- local JSONL approval record write after explicit confirmation
- local JSONL audit record write after explicit confirmation
- replay read
- rollback reference read

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
node bin/gpao-t.js control work-surface-execution-flow-check
node bin/gpao-t.js control work-surface-check
npm run verify
```

Required visual evidence:

- `docs/03-verification/evidence/work-surface-execution-governance-flow-v1-desktop-1440x960.png`
- `docs/03-verification/evidence/work-surface-execution-governance-flow-v1-mobile-390x844.png`
- `docs/03-verification/evidence/work-surface-execution-governance-flow-v1-qa-2026-07-09.json`
