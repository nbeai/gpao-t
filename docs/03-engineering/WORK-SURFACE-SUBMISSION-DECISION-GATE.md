# Work Surface Submission Decision Gate

Status: design-only gate added, live submission blocked

This gate defines what must be true before `/work-surface` can move from draft input to any future live submission path.

It does not submit user input. It does not call a model, execute a tool, activate a connector, send externally, write approval records, install/update/rollback, promote durable memory, or apply self-growth.

## Contract

- Runtime contract: `gpao_t.work_surface_submission_decision_gate.v0_1`
- Verification contract: `gpao_t.work_surface_submission_decision_gate_verification.v0_1`
- CLI:
  - `node bin/gpao-t.js control work-surface-submission-gate`
  - `node bin/gpao-t.js control work-surface-submission-gate-check`
- Gateway / loopback:
  - `GET /work-surface/submission-gate`
  - `GET /work-surface/submission-gate/verify`

## Input Packet

The future input packet is preview-only:

- `draftText`
- `sourceSurface`
- `locale`
- `activeTargetId`
- `userVisibleIntent`
- `attachmentReferences`
- `requestedOutputShape`
- `createdAt`
- `submissionMode: preview_only_not_submitted`

Blocked packet fields:

- model provider token
- connector credential
- external send target
- approval record id
- durable memory promotion flag

## Immediate Preview State

After draft normalization, the preview state may attach:

- normalized task objective
- Context Mesh / Memory Wiki candidates
- Skill Pack route preview
- authority boundary and blocked actions
- review/block reason when submission cannot proceed

It must not:

- write state
- invoke a model
- execute tools, CLI, or MCP
- activate connectors

## Review / Block Conditions

Submission remains blocked when:

- input is empty or whitespace
- the request asks for external send, connector activation, or tool execution
- the request asks for durable memory promotion or self-growth apply

Submission becomes review-only when:

- active target or context is ambiguous
- authority-sensitive intent is detected

## Stop Line

The stop line is `preview_ready_stop_before_execution`.

The next gate is `submission_validation_and_confirmation_gate`.

Live submission is not implemented in this gate.
