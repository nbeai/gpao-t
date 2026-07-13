# GPAO-T Connection/Login Seal - 2026-07-12

## Scope

User-facing connection/login fallback for the live GPAO-T dashboard.

The issue was not the local runtime being down. The gateway was reachable, but Safari was showing a stale unauthenticated connection screen whose copy still exposed OpenClaw/Gateway-style technical language.

## Changes

- Sealed connection screen labels:
  - `Gateway 대시보드` -> `GPAO-T 연결 화면`
  - `WebSocket URL` -> `연결 주소`
  - token label -> `연결키`
  - raw error label -> `상세 오류`
  - auth/help document labels -> `GPAO-T 연결 도움말`
- Replaced developer recovery instructions with user-facing copy:
  - `GPAO-T 런타임이 켜져 있는지 확인하세요.`
  - `연결 주소는 보통 ws://127.0.0.1:18789 입니다.`
  - `문제가 계속되면 GPAO-T 연결 도움말에서 현재 연결 정보를 확인하세요.`
- Added durable patch coverage in:
  - `tools/apply-openclaw-live-user-screen-ux-patch.mjs`
  - `tools/apply-openclaw-live-gpao-t-surface-seal-patch.mjs`
- Updated regression tests:
  - `test/live-user-screen-ux-patch.test.js`
  - `test/live-surface-seal-patch.test.js`

## Live Evidence

- `openclaw status --all`: gateway reachable on `127.0.0.1:18789`, LaunchAgent running, Telegram OK.
- Targeted tests passed:
  - `node --test test/live-user-screen-ux-patch.test.js test/live-surface-seal-patch.test.js`
- Safari fallback screen after cache clear showed:
  - `nBeAI. GPAO-T`
  - `GPAO-T 연결 화면`
  - `연결 주소`
  - `연결키`
  - `GPAO-T 로컬 런타임에 연결하지 못했습니다`
  - `GPAO-T 연결 도움말`
- After opening the authenticated dashboard URL, Safari returned to the real GPAO-T chat screen:
  - sidebar brand `nBeAI. GPAO-T`
  - `Telegram` separated under communication rail
  - `Assistant Ready to chat`
  - model strip visible as `gpt-5.5 · openai · Medium`

## Notes

The visible connection failure was caused by an unauthenticated/stale Safari tab, not by a dead GPAO-T runtime. The product rule is now fixed: even when a user lands on the fallback connection screen, the screen must read as GPAO-T, not OpenClaw/Gateway internals.
