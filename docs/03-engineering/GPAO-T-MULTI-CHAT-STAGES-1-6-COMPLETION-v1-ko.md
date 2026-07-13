# GPAO-T Multi Chat Stages 1-6 Completion v1

Date: 2026-07-11
Status: implemented and locally verified

## Position

This pass completes the fixed stages 1-6 for the GPAO-T Codex-style multi-chat workspace.

The goal is not to improve OpenClaw as OpenClaw. The goal is to absorb the useful OpenClaw session/chat/runtime skeleton into GPAO-T's own operating surface:

- thread/session identity
- context packet
- memory scope
- replay state
- authority gate
- activity event
- mobile session sheet
- inspector sheet
- controlled smoke gate

## Completed Stages

1. OpenClaw live session RPC/event layer absorption
   - `sessions.changed`, `sessions.subscribe`, `sessions.messages.subscribe`, and `session.message` are mapped into GPAO-T thread/session/context/memory/activity contract evidence.
   - The adapter remains a GPAO-T readback contract until live OpenClaw source mutation is separately applied.

2. Live dashboard action readback
   - rename/archive/restore/delete-pending/cancel-delete-pending are represented as readback-ready actions.
   - Readback is pure preview and does not mutate state during GET verification.
   - permanent delete remains blocked.

3. Session-specific message and context isolation
   - each session has a distinct thread id, context packet id, memory thread, replay requirement, and authority gate.
   - verification fails if context packet ids collide or memory thread does not match thread id.

4. Memory candidate review queue filtered by active thread/session
   - active thread/session candidates are included.
   - foreign thread candidates are excluded from anchor use.
   - global/workspace candidates may remain supporting context.
   - durable memory promotion, OpenClaw memory write, and automatic admission remain blocked.

5. Mobile session action sheet and inspector sheet visual QA
   - generated Work Surface HTML must contain mobile session sheet, mobile inspector sheet, session actions, delete-pending cancel, memory, and replay markers.
   - existing screenshot evidence paths are recorded for visual QA continuity.

6. Controlled live smoke gate
   - backup targets, rollback targets, smoke assertions, stop rule, and authority boundaries are explicit.
   - live OpenClaw mutation, Gateway restart, model provider call, Telegram/external send, durable memory promotion, and OpenClaw memory write are not executed in this pass.

## New Surfaces

- `src/core/multi-chat-stage-six.js`
- `GET /multi-chat-workspace/stages-1-6`
- `GET /multi-chat-workspace/stages-1-6/verify`
- `GET /multi-chat-workspace/memory-review-queue`
- `gpao-t control multi-chat-stages-1-6`
- `gpao-t control multi-chat-stages-1-6-check`
- `gpao-t control multi-chat-memory-review-queue`

## Completion Language Boundary

Allowed:

- stages 1-6 local/Gateway/preview completion package is implemented
- stage 1-6 verification is ready
- next fixed stage is test-team dispatch/update packet refresh

Not allowed:

- live OpenClaw source was mutated
- Gateway was restarted
- external or Telegram send was performed
- durable memory was promoted
- OpenClaw memory was written
- public release is ready

## Next Fixed Stage

7. Test-team dispatch/update packet refresh.
