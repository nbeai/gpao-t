# GPAO-T Runtime Heart Hardening - Source Gate Evidence

Date: 2026-07-13

## Scope

This document records the source-level Runtime Heart hardening pass.

The pass implements and verifies five Heart lanes:

1. Provider/Auth Heart
2. Doctor/Recovery Heart
3. Session/Event Heart
4. Memory/Context Heart
5. Tool/MCP/Authority Heart

It also adds a consolidated Runtime Heart readback.

## Implemented Source Surface

- `src/core/provider-auth-heart.js`
- `src/core/doctor-recovery-heart.js`
- `src/core/session-event-heart.js`
- `src/core/memory-context-heart.js`
- `src/core/tool-authority-heart.js`
- `src/core/runtime-heart-hardening.js`

## Public Readback

- `gpao-t doctor-heart`
- `gpao-t doctor-heart-check`
- `gpao-t control session-heart`
- `gpao-t control session-heart-check`
- `gpao-t memory heart`
- `gpao-t memory heart-check`
- `gpao-t connectors authority-heart`
- `gpao-t connectors authority-heart-check`
- `gpao-t runtime heart`
- `gpao-t runtime heart-check`

## API Readback

- `GET /runtime/provider-auth-heart`
- `GET /runtime/provider-auth-heart/verify`
- `GET /runtime/doctor-recovery-heart`
- `GET /runtime/doctor-recovery-heart/verify`
- `GET /runtime/session-event-heart`
- `GET /runtime/session-event-heart/verify`
- `GET /runtime/memory-context-heart`
- `GET /runtime/memory-context-heart/verify`
- `GET /runtime/tool-authority-heart`
- `GET /runtime/tool-authority-heart/verify`
- `GET /runtime/heart`
- `GET /runtime/heart/verify`

## Source Verification

Focused tests:

- Provider/Auth + Doctor/Recovery: 10/10 passed
- Session/Event + live-turn identity/absorption: 13/13 passed
- Memory/Context + memory search + auto-growth + review queue: 22/22 passed
- Tool/MCP/Authority + connector/execution/adapter: 26/26 passed
- Consolidated Runtime Heart: 18/18 passed

CLI readback:

- `gpao-t doctor-heart-check`: ready
- `gpao-t control session-heart-check`: ready
- `gpao-t memory heart-check`: ready
- `gpao-t connectors authority-heart-check`: ready
- `gpao-t runtime heart-check`: ready

## Current Consolidated Status

`gpao-t runtime heart` returns:

- Provider/Auth: ready
- Doctor/Recovery: review
- Session/Event: ready
- Memory/Context: ready
- Tool/MCP/Authority: ready
- completion claim: closed

Doctor/Recovery remains `review` by design because full completion requires
fresh chat, UI readback, and log-window evidence.

## Live Deployment Boundary

This is a source gate, not a live deployment seal.

The running live distribution still needs a separate install/update seal before
the new Runtime Heart endpoints can be claimed as live-user-visible behavior.

Known live health review item before deployment seal:

- `compatibility/gpao-t/dist/probe-RjPH7tPP.js` differs from the current
  distribution manifest.

## Next Required Gate

Run the live deployment/update decision:

1. rebuild or reseal canonical distribution;
2. install/update live runtime;
3. restart/check LaunchAgent;
4. verify `/health`;
5. verify `/runtime/heart` and `/runtime/heart/verify` from the live server;
6. run fresh chat and log-window evidence;
7. capture visual/browser evidence if UI is touched.
