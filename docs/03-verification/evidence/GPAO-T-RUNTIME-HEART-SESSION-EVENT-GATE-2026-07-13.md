# GPAO-T Runtime Heart - Session/Event Gate Evidence

Date: 2026-07-13

## Scope

This evidence records the first source gate for GPAO-T Session/Event Heart.
The goal is to prevent webchat sessions, Telegram direct sessions, event logs,
memory scopes, and authority boundaries from being mixed.

## Implemented Surface

- Source core: `src/core/session-event-heart.js`
- Public API export: `src/index.js`
- Control Center endpoints:
  - `GET /runtime/session-event-heart`
  - `GET /runtime/session-event-heart/verify`
- Gateway endpoints:
  - `GET /runtime/session-event-heart`
  - `GET /runtime/session-event-heart/verify`
- CLI commands:
  - `gpao-t control session-heart`
  - `gpao-t control session-heart-check`

## Contract

- Telegram is one dedicated direct communication session.
- Webchat sessions keep separate session/thread/context identity.
- Durable memory promotion is blocked by default.
- Compatibility session metadata write is blocked.
- Telegram external send is blocked unless a later explicit authority lane opens it.
- Permanent delete remains blocked.

## Verification Run

```text
node --check src/core/session-event-heart.js
node --check src/index.js
node --check src/core/control-center-serving.js
node --check src/core/gateway.js
node --check bin/gpao-t-full.js
node --test test/session-event-heart.test.js test/live-turn-identity-mapping.test.js test/live-turn-absorption-bridge.test.js
node bin/gpao-t.js control session-heart
node bin/gpao-t.js control session-heart-check
```

## Result

- Syntax checks: passed.
- Focused session/live-turn tests: 13/13 passed.
- `gpao-t control session-heart-check`: `status: ready`, no findings.
- Current source readback:
  - Telegram direct session: `session.telegram.direct`
  - Webchat active session: `session.current`
  - Session count: 6
  - Recent progress events: 38
  - Authority gates: Telegram external send, durable memory promotion,
    compatibility session metadata write, and permanent delete are blocked.

## Non-Completion Boundary

This gate proves the source-level Session/Event Heart contract and CLI readback.
Full completion still requires live browser/UI evidence and long-running
conversation QA after all five Runtime Heart lanes are implemented.
