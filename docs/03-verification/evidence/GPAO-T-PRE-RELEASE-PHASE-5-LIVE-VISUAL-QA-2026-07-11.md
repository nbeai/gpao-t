# GPAO-T Pre-Release Phase 5 Live Visual QA

Date: 2026-07-11
Status: closed with one explicit limitation
Scope: live Gateway/Safari visual state, authenticated Safari DOM evidence, independent browser blocked-state evidence

## Live Gateway Readback

- `curl -fsS http://127.0.0.1:18789/health`
  - result: `{"ok":true,"status":"live"}`
- `curl -I 'http://127.0.0.1:18789/chat?session=main'`
  - result: `HTTP/1.1 200 OK`
- `curl -fsS 'http://127.0.0.1:18789/chat?session=agent%3Amain%3Amain'`
  - HTML title: `nBeAI. GPAO-T`
  - favicon: `./gpao-logo.jpeg`

## Safari Authenticated DOM Evidence

Safari front document:

- Title: `nBeAI. GPAO-T`
- URL: `http://127.0.0.1:18789/chat?session=agent%3Amain%3Amain`
- Visible brand: `nBeAI. GPAO-T`
- Session rail:
  - `telegram:8601204821`
  - `Main Session`
- Work lanes:
  - `목표`
  - `맥락`
  - `실행`
  - `응답`
- Context/Memory/Authority/Speed lane:
  - `기억 21k 토큰`
  - `권한 로컬 승인`
  - `속도 즉시 입력`
- GPAO-T context state:
  - `입력 패킷 ready`
  - `현재 목표 openclaw-absorption`
  - `Support 3`
  - `메모리 쓰기 차단`
  - `자동 admission 차단`
  - `applied-replay-inspector`
  - `Replay review`
  - `OpenClaw memory 미기록`
  - `영구 기억 차단`
  - `적용 잠금`

This is the strongest Phase 5 evidence because Safari is the user's already-authenticated live environment.

## Playwright Independent Browser Evidence

Stored under:

`docs/03-verification/evidence/phase-5-live-visual-qa-2026-07-11/`

Files:

- `gpao-t-phase5-live-desktop-1440x960-2026-07-11.png`
- `gpao-t-phase5-live-mobile-390x844-2026-07-11.png`
- `gpao-t-phase5-live-desktop-snapshot-2026-07-11.md`
- `gpao-t-phase5-live-mobile-snapshot-2026-07-11.md`

Observed state:

- Page title is `nBeAI. GPAO-T`.
- Independent Playwright browser shows Gateway connection form and `연결할 수 없음`.
- Mobile layout does not overflow incoherently in this blocked state.
- The visual state is readable, but it is a connection/authentication blocked state, not the authenticated live work session.

## Human-Eye QA

Pass:

- User-facing OpenClaw name/title is replaced by `nBeAI. GPAO-T`.
- The GPAO logo is visible in the independent blocked-state screen.
- Mobile blocked-state layout is readable and does not show obvious incoherent overlap.
- Authenticated Safari DOM proves the live GPAO-T work OS lanes are present: session rail, current work lanes, context source, replay/apply state, authority locks.

Limit:

- Independent browser visual QA cannot see the authenticated live work session without the Safari session state.
- Therefore the strongest live visual proof is Safari DOM readback, not a fresh independent screenshot of the authenticated session.
- This limitation must stay visible for the test-team handoff.

## Phase 5 Decision

Phase 5 is closed for supervised pre-release:

- live Gateway is reachable
- Safari authenticated live UI is verified by title, URL, and DOM text
- independent browser blocked-state is documented
- visual limitation is recorded instead of hidden

This is not proof that Telegram/model answer path is fully GPAO-T memory-backed. That remains a later live smoke/field proof item.
