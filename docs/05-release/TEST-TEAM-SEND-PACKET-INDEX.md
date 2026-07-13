# GPAO-T Test-Team Send Packet Index

Status: ready for supervised local test-team handoff
Date: 2026-07-12

This is the single starting point for the current GPAO-T test-team candidate.

## Candidate

- Archive: `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.zip`
- Archive SHA-256: `30d0fefa75a30104aead0166bf5ebe8796e7342a4946189e5c108732ed3f6853`
- Bundle: `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.bundle.json`
- Bundle SHA-256: `ad7215c4642da78020f1c453e6cf35ec20579356abd27eacf88f533d93db1a63`
- Manifest: `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.manifest.json`
- Manifest SHA-256: `b1c6a64f7fbe7151b2e5a53b06cc30f43ebc2262252fd858c56144c3b181262b`
- Package file count: 66

## Start Here

1. Read `docs/05-release/TEST-TEAM-README.md`.
2. Open `.gpao-t/packages/OWNER-OPS-TEAM-ALPHA-HANDOFF-BUNDLE.md`.
3. Use `.gpao-t/packages/OWNER-OPS-FINAL-LOCAL-RELEASE-CANDIDATE-DECISION-PACKET.md` for owner review.
4. Record findings in `docs/05-release/TEST-TEAM-FEEDBACK-LEDGER.md`.

## Required Local Checks

Run these from the GPAO-T project root before judging the candidate:

```bash
npm run check
node bin/gpao-t.js owner-ops local-package-candidate-readback-check gpao-t-owner-ops-0.1.0-local-candidate.zip
node bin/gpao-t.js owner-ops team-alpha-handoff-check gpao-t-owner-ops-0.1.0-local-candidate.zip
node bin/gpao-t.js owner-ops final-local-release-candidate-check
node bin/gpao-t.js runtime live-turn-hook-readiness-check
zip -T .gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.zip
```

Expected result:

- status: `ready`
- findings: `[]`
- zip integrity: `OK`

## Authority Boundary

This packet is local and supervised only.

Do not execute:

- public upload
- signing or notarization
- install/update/rollback against a real user environment
- OAuth/API account connection
- customer or Telegram auto-send
- durable memory promotion
- inherited runtime memory write
- destructive rollback

## Current Product Statement

GPAO-T has reached the test-team candidate completion point for supervised local review.
It is not yet a public release, signed installer, marketplace upload, or fully autonomous production OS.
