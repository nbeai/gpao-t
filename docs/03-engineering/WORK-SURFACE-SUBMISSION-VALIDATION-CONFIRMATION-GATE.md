# Work Surface Submission Validation And Confirmation Gate

Status: final pre-submit gate added, live submission blocked

This gate is the last pre-submit contract before GPAO-T can later move toward user-facing confirmation UX or a first local draft preview.

It does not submit user input. It does not call a model, execute tools, activate connectors, send externally, write approval records, install/update/rollback, promote durable memory, or apply self-growth.

## Contract

- Runtime contract: `gpao_t.work_surface_submission_validation_confirmation_gate.v0_1`
- Verification contract: `gpao_t.work_surface_submission_validation_confirmation_gate_verification.v0_1`
- CLI:
  - `node bin/gpao-t.js control work-surface-submission-validation-gate`
  - `node bin/gpao-t.js control work-surface-submission-validation-gate-check`
- Gateway / loopback:
  - `GET /work-surface/submission-validation-gate`
  - `GET /work-surface/submission-validation-gate/verify`

## Validated Before Confirmation

- Required packet fields are present.
- Empty or whitespace-only input is blocked.
- Input length is checked against the local preview limit.
- Risk signals are detected before any execution path exists.
- Context Mesh / Memory Wiki preview is attached.
- Skill route preview is attached.
- Authority preview is attached and visible.

## Confirmation Card

The confirmation card must show:

- what GPAO-T understood
- which context preview is being used
- which skill route is proposed
- which actions remain locked
- that no live submission has happened

The confirmation action means only "I reviewed the preview." It does not open live submission and does not write an approval record.

## Product Language

Blocked/review states must be readable as product guidance:

- "아직 제출할 수 없습니다."
- "작업 의도나 권한을 한 번 더 확인해야 합니다."
- "아직 실행된 것은 없음."

The user should understand that the system is still in a preview state.

## Documentation Alignment

README freshness warnings are tracked as a documentation alignment item. They do not grant permission to open execution or bypass the pre-submit stop line.

## Stop Line

The stop line is `pre_submit_confirmation_stop_before_live_submission`.

After this gate, do not split submission meta-gates further. Move to:

- work-surface confirmation UX
- first local draft preview

Live submission remains blocked until a later explicitly approved implementation path.
