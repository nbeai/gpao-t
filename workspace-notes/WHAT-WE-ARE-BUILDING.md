# What We Are Building

GPAO-T is a session-based local AI operating workspace: a user creates and resumes work sessions, asks GPAO-T to understand the task, sees Context Mesh / skill / model candidates, reviews execution boundaries, and only then allows local records or later execution paths.

## Current Big Stage

- Stage: 3 of 4
- Name: Work Surface execution / approval / audit governance loop
- Current slice: Work Surface Execution Confirmation Control v1
- Status: implemented and verified as the current baseline

## Current Product Shape

- Left rail: session workspace navigation.
- Center: active work session, task understanding, explicit local-record confirmation control, execution flow, and composer.
- Right rail: context, authority, model, tool, record, and rollback inspector.
- Control Center: secondary inspector, not the primary product surface.

## Completed In This Slice

- Work Surface now shows an explicit "승인 기록 남기기 전 확인" control before the execution flow.
- `의도와 맞음` is the only confirmation choice that allows local approval/audit JSONL record write.
- `수정 필요` and `보류` block local record write and keep the state preview-only.
- Browser rendering still writes no records.
- Live model calls, tool execution, connector activation, external send, credentials, paid/destructive actions, and durable memory promotion remain blocked.
- Desktop/mobile screenshot evidence was captured for the confirmation control.

## Product Principle

The user should feel: "I can give GPAO-T work here, see how it understood me, decide whether a local approval/audit record should be kept, and stay in control before anything risky happens."
