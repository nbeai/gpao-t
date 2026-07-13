# GPAO-T Codex-Style Multi Chat Workspace v1 Evidence

Date: 2026-07-11
Status: local contract verified

## Changed Surface

- `src/core/session-workspace.js`
- `src/core/multi-chat-workspace.js`
- `src/core/core-work-surface.js`
- `src/core/gateway.js`
- `src/core/control-center-serving.js`
- `src/index.js`
- `bin/gpao-t.js`
- `test/multi-chat-workspace.test.js`

## Verified Behavior

- local sessions now carry thread/session/context/memory/replay/authority/activity fields.
- session lifecycle still supports create, select, rename, archive, restore, delete-pending, cancel-delete-pending.
- permanent delete remains blocked.
- durable memory promotion remains blocked.
- OpenClaw memory write remains blocked.
- external send remains blocked.
- Gateway exposes `/multi-chat-workspace` and `/multi-chat-workspace/verify`.
- CLI exposes `gpao-t control multi-chat-workspace` and `gpao-t control multi-chat-workspace-check`.
- Work Surface exposes thread context, memory scope, activity stream, memory inspector, and replay inspector.

## Test Command

```sh
node --test gpao-t/test/session-workspace.test.js gpao-t/test/multi-chat-workspace.test.js gpao-t/test/workspace-shell.test.js
npm --prefix gpao-t run check
npm --prefix gpao-t test
node bin/gpao-t.js control multi-chat-workspace-check
```

## Result

```text
targeted: 8 tests passed, 0 failed
full: 311 tests passed, 0 failed
check: passed
multi-chat-workspace-check: ready, findings []
```

## Authority Boundary

Not executed in this pass:

- live OpenClaw file write
- Gateway restart
- Telegram/customer external send
- model provider behavior change
- durable memory promotion
- OpenClaw memory write
- permanent delete
- public release
