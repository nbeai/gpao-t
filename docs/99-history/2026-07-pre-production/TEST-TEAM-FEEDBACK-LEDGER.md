# GPAO-T Test-Team Feedback Ledger

Status: ready for supervised local feedback
Date: 2026-07-11

Use this ledger for supervised test-team feedback only. Do not paste secrets, API keys, customer personal information, or private business records.

## Feedback Item Template

```yaml
- id: feedback-YYYYMMDD-001
  testerRole: ""
  host: "Codex | GPAO-T local runtime | Claude Code | Safari Gateway | Other"
  scenario: ""
  dataMode: "sample | deidentified | no-data"
  result: "pass | review | blocked | fail"
  userUnderstanding:
    score1to5:
    note: ""
  usefulness:
    score1to5:
    note: ""
  trustAndSafety:
    score1to5:
    note: ""
  setupFriction:
    score1to5LowerIsBetter:
    note: ""
  visualQuality:
    score1to5:
    note: ""
  memoryContextReplay:
    observed: true
    note: ""
  blockedActionRequested:
    occurred: false
    action: ""
  screenshotsOrLogs:
    - ""
  recommendedChange: ""
  severity: "P0 | P1 | P2 | note"
```

## Acceptance Threshold For This Candidate

- 이해 쉬움: average `>= 4`
- 실무 쓸모: average `>= 4`
- 신뢰/안심감: average `>= 4`
- 설정 어려움: average `<= 2.5`
- P0 blockers: `0`

## P0 Blocker Examples

- Tester cannot tell what GPAO-T is.
- Tester thinks customer/Telegram sending is automatic.
- Context/memory/replay/apply state is invisible or misleading.
- Mobile layout blocks normal use.
- Package/readback/checksum cannot be verified.
- Live Gateway/Safari state contradicts the tester-facing guide.
- Any public upload/signing/install/rollback/customer-send action is accidentally opened.
