# GPAO-T First Real OS Turn Live QA - 2026-07-13

## Scope

This evidence folder records live dashboard verification for the GPAO-T first real OS turn path.

The verification target was not only source-level routing. The target was user-visible behavior:

1. Open the live GPAO-T dashboard.
2. Recover from the login/connection screen without exposing the gateway token.
3. Confirm that the plain chat URL opens into the connected GPAO-T work screen after bootstrap.
4. Send a real message from the dashboard.
5. Confirm that the live turn creates preflight, replay, replay evaluation, and memory candidate records.

## Live Runtime

- Dashboard URL tested: `http://127.0.0.1:18799/chat?session=main`
- Connected session after normalization: `agent:main:main`
- Page title: `nBeAI. GPAO-T`
- Runtime state root: `/Users/jyp/.gpao-t`

## What Passed

- The original plain URL first showed the connection screen. This was confirmed as not acceptable.
- A token bootstrap was performed without printing the token or URL containing the token.
- After token bootstrap, reopening the plain URL entered the connected GPAO-T chat screen instead of the login screen.
- The connected screen showed:
  - `nBeAI. GPAO-T`
  - `GPAO-T 상태: 온라인`
  - `Telegram` as a dedicated communication session
  - `Message GPAO-T` input
- A real dashboard message was submitted:
  - `GPAO-T 라이브 턴 QA야. 지금 현재 상태를 한 문장으로 짧게 말해줘.`
- The answer was captured:
  - `현재 GPAO-T는 웹챗 응답과 게이트웨이는 정상이나, repo 전체 테스트 실패가 남아 있어 완전 정상 상태는 아닙니다.`
- Record counts increased after the turn:
  - `preflight-records.jsonl`: `24 -> 25`
  - `post-answer-replay-records.jsonl`: `17 -> 18`
  - `answer-replay-evaluations.jsonl`: `17 -> 18`
  - `answer-memory-candidate-drafts.jsonl`: `17 -> 18`
- Latest replay evaluation had no findings and kept memory promotion blocked.
- Latest memory candidate remained `review_only`.

## Evidence Files

- `gpao-t-live-dashboard-connected-after-token-bootstrap-2026-07-13.png`
- `gpao-t-live-chat-before-os-turn-2026-07-13.png`
- `page-2026-07-13T15-05-35-895Z.yml`
- `page-2026-07-13T15-06-18-763Z.yml`

## Remaining Limits

- Plain URL direct entry now works for the browser profile where token bootstrap was performed. This is a browser-profile/session behavior, not yet a universal installer-level auto-login guarantee.
- Gateway authentication was not disabled. A direct auth-off mutation was intentionally not applied because it would weaken security.
- The live answer itself reported that full repo tests still have failures. This live QA proves the dashboard turn path, not final release completeness.
- Older logs still contain historical provider-auth, token-missing, Telegram polling, and embedding quota errors. The live QA did not add a new fatal error, but those historical lanes still need separate closure if they remain active.

## Completion Claim Boundary

Allowed claim:

> The live GPAO-T dashboard can be connected without exposing the token, the plain URL reopens into the connected work screen for that browser profile, and a real user-visible chat turn produced preflight, replay, replay evaluation, and review-only memory candidate records.

Not allowed claim yet:

> Universal auto-login is sealed for all browsers/installations, full release packaging is complete, or the entire GPAO-T repository is fully green.
