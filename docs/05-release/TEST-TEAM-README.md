# GPAO-T Test-Team Pre-Release Guide

Status: supervised local pre-release candidate
Date: 2026-07-12
Candidate: `gpao-t-owner-ops-0.1.0-local-candidate.zip`

Completion endpoint:

This guide follows `docs/03-engineering/GPAO-T-TEST-TEAM-COMPLETION-ENDPOINT-v1.0-ko.md`.
For this stage, completion means a GPAO-T candidate that can be sent to the test team under supervision.

## What This Candidate Is

This is a local supervised GPAO-T candidate for test-team review.

It includes:

- GPAO-T local runtime and CLI surface
- Context/T-cell admission and replay-oriented runtime surfaces
- memory review queue and auto-memory/self-growth local candidate path
- GPAO-T runtime absorption/readiness evidence
- Owner Ops package, local stdio MCP wrapper, handoff bundle, and feedback lane
- live Gateway visual/readback evidence

It is not:

- a public release
- a signed installer
- a marketplace upload
- a Telegram/customer auto-send system
- a durable memory promotion
- an inherited runtime memory writer

## Candidate Files

- Archive: `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.zip`
- Archive SHA-256: `30d0fefa75a30104aead0166bf5ebe8796e7342a4946189e5c108732ed3f6853`
- Bundle: `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.bundle.json`
- Bundle SHA-256: `ad7215c4642da78020f1c453e6cf35ec20579356abd27eacf88f533d93db1a63`
- Bundle manifest: `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.manifest.json`
- Team handoff: `.gpao-t/packages/OWNER-OPS-TEAM-ALPHA-HANDOFF-BUNDLE.md`
- Decision packet: `.gpao-t/packages/OWNER-OPS-FINAL-LOCAL-RELEASE-CANDIDATE-DECISION-PACKET.md`
- Send packet index: `docs/05-release/TEST-TEAM-SEND-PACKET-INDEX.md`
- Feedback ledger template: `docs/05-release/TEST-TEAM-FEEDBACK-LEDGER.md`

## First Checks

Run from the `gpao-t` project root:

```bash
npm run check
node bin/gpao-t.js owner-ops local-package-candidate-readback-check gpao-t-owner-ops-0.1.0-local-candidate.zip
node bin/gpao-t.js owner-ops team-alpha-handoff-check gpao-t-owner-ops-0.1.0-local-candidate.zip
node bin/gpao-t.js owner-ops final-local-release-candidate-check
node bin/gpao-t.js runtime live-turn-hook-readiness-check
```

Expected:

- status: `ready`
- findings: `[]`
- public/upload/install/update/rollback boundaries remain closed

## What Testers Should Evaluate

- Can a normal user understand what GPAO-T is doing?
- Does the session/workspace feel more like a personal AI OS than a single chat page?
- Are context, memory, replay, apply, and authority states visible enough?
- Does the system clearly say when memory write, durable memory, inherited runtime memory, public release, or external send is blocked?
- Does the Owner Ops handoff make sense for Codex, local runtime, and Claude Code use?
- Is the Korean wording natural and reassuring?
- Is the UI too card-heavy or visually noisy?
- Does mobile remain readable?

## What Testers Must Not Do

- Do not use real customer private data.
- Do not connect OAuth/API accounts.
- Do not send Telegram/customer/business messages as part of this candidate.
- Do not publish or upload the package.
- Do not sign/notarize the package.
- Do not execute install/update/rollback against a real user environment.
- Do not promote durable memory.
- Do not write into inherited runtime memory.

## Known Limits

- Safari authenticated live UI is verified, but a separate Playwright browser shows the Gateway connection screen without the Safari session state.
- Telegram/model answer path is not claimed as fully GPAO-T memory-backed in this candidate.
- Runtime embedding quota failures must be treated as degraded memory mode, not silent memory success.
- Installer/signing/public distribution are intentionally blocked.

## Recovery

If the live UI fails:

1. Check Gateway health:
   ```bash
   curl -fsS http://127.0.0.1:18789/health
   ```
2. Check live hook readiness:
   ```bash
   node bin/gpao-t.js runtime live-turn-hook-readiness-check
   ```
3. Use Phase 3 rollback/readback package:
   `docs/03-verification/evidence/live-hook-preview/`
4. Do not run destructive rollback without explicit owner approval.

## Feedback

Use `docs/05-release/TEST-TEAM-FEEDBACK-LEDGER.md`.

Each feedback item should include:

- tester role
- host used
- scenario
- pass/fail/review
- where the user got confused
- screenshots/log references
- whether any blocked action was requested
- recommended next change
