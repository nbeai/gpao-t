# TOOLS.md - GPAO-T Local Runtime Equipment Map

This file records local tool conventions and runtime equipment notes. It does not grant tool authority by itself.

## Runtime Roots

- GPAO-T live runtime state: local absorbed runtime state directory
- GPAO-T live runtime workspace: local absorbed runtime workspace
- GPAO-T core repository: `/Users/jyp/Documents/Playground 2/gpao-t`
- Technical source reference: clean upstream runtime source kept for engineering comparison
- GPAO-T lab reference: patched dashboard lab kept for engineering comparison

## Gateway

- Local dashboard: `http://127.0.0.1:18789/`
- Gateway mode: local loopback
- Do not expose or print gateway auth tokens.
- Use authenticated Safari session for visual QA when Playwright lacks auth context.

## Core Product Commands

Run from `/Users/jyp/Documents/Playground 2/gpao-t`:

- Syntax check: `npm run check`
- Main tests: `npm test`
- Targeted live/memory tests:
  - `node --test test/live-turn-absorption-bridge.test.js test/connector-governance.test.js test/memory-candidate-review-queue.test.js --test-concurrency=1 --test-timeout=180000 --test-reporter=spec`
- Runtime status: use the GPAO-T dashboard health and local runtime status checks

## Runtime Workspace Pack

- Pack source: `runtime-workspace/gpao-t`
- Apply script: `tools/apply-gpao-t-runtime-workspace-pack.mjs`
- Backup destination: `docs/03-verification/evidence/runtime-workspace-absorption-2026-07-12/backups`

## Evidence Policy

For runtime changes, capture:

- pre-change file list and git status
- backup directory
- applied manifest
- verify report
- screenshot or live status when UI/runtime is affected

## Tool Conduct

- Prefer read-only inspection before mutation.
- Keep long tool logs out of chat body.
- Use compact progress signals for long work.
- Never print secrets, auth URLs, tokens, or credential-bearing config values.
- For external action, public release, credential use, destructive action, or live rule mutation, stop at the approval gate.
