# TOOLS.md - GPAO-T Local Runtime Equipment Map

This file records local tool conventions and runtime equipment notes. It does not grant tool authority by itself.

## Runtime Roots

- GPAO-T live runtime state: `~/.gpao-t`
- GPAO-T live runtime workspace: `~/.gpao-t/workspace`
- GPAO-T core repository on the owner Mac: `/Users/jyp/Developer/gpao-t`
- Compatibility sources are engineering references only; they are not live state or product identity.

## Gateway

- Local dashboard: `http://127.0.0.1:18799/`
- Gateway mode: local loopback
- Do not expose or print gateway auth tokens.
- Use authenticated Safari session for visual QA when Playwright lacks auth context.

## Current Tool Surface

- Web search: local DuckDuckGo plugin, P0.
- Web page reading: readability/fetch path, P0.
- Browser interaction: enabled in the `coding` profile; user-visible calls are logged.
- Local files: provider-native patch and bounded command execution in `coding/full`; there is no separate model tool named `read` in the current transport.
- Paired-node file transfer: separate `file-transfer` capability; disabled until node, paths, and explicit authority are configured.
- Documents: `document-extract` handles PDF extraction; browser picker-to-answer QA still requires an authenticated upload-capable driver.
- Memory: `local_hybrid_memory_search`; external embedding quota is not required for the default path.
- Self-growth: routine turns may be classified automatically, but only source-linked review candidates may be captured. Approval and live apply are never fabricated.

## Core Product Commands

Run from `/Users/jyp/Developer/gpao-t`:

- Syntax check: `npm run check`
- Main tests: `npm test`
- Targeted live/memory tests:
  - `node --test test/live-turn-absorption-bridge.test.js test/connector-governance.test.js test/memory-candidate-review-queue.test.js --test-concurrency=1 --test-timeout=180000 --test-reporter=spec`
- Runtime health: `curl -fsS http://127.0.0.1:18799/health`
- Runtime doctor: `gpao-t doctor`
- Runtime logs: `gpao-t logs --follow`
- Memory status: `gpao-t memory status --index`
- Memory index rebuild: `gpao-t memory index --force`
- Plugin diagnostics: run the GPAO-T runtime plugin doctor through the installed local runtime command lane.

Never suggest legacy compatibility CLI commands in user-facing GPAO-T answers.
If an internal compatibility log or model output contains a legacy logs,
memory-index, or runtime command, translate it to the corresponding GPAO-T
command before showing it to the user.

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
