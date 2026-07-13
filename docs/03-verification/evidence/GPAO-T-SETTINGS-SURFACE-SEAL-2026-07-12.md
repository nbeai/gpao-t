# GPAO-T Settings Surface Seal Evidence - 2026-07-12

## Scope

This evidence records the settings-page user-surface seal for the live GPAO-T dashboard at `http://127.0.0.1:18789/settings/general`.

The user-visible goal was to remove remaining OpenClaw/developer-facing residue from the settings page and make the screen read as nBeAI. GPAO-T.

## Applied Changes

- Updated `tools/apply-openclaw-live-user-screen-ux-patch.mjs`.
  - Repaired injected runtime cleanup script escaping so `\b`, `\s`, `\d`, and `/` patterns execute correctly in the live HTML.
  - Converted visible settings copy such as `Gateway`, `token`, `allowlist`, `connected`, `User`, `Avatar text / emoji`, `Memory`, `Disk`, and theme labels into GPAO-T/Korean user-facing labels.
  - Hid low-level settings navigation items from the user surface: `MCP`, `Worktree`, `진단`, `기록`, `정보`, and advanced infrastructure labels.
  - Hid the general-page automation summary card because it exposed broken developer pluralization such as `scheduled tasks` and `MCP servers`.
  - Narrowed the GPAO-T companion-log hide rule to the row level so it does not hide the whole settings workspace.
- Updated `tools/apply-openclaw-live-gpao-t-surface-seal-patch.mjs`.
  - Added static fallback replacements for settings-related strings where safe.
  - Avoided broad one-word static replacements that could mutate bundled code.
- Updated `test/live-user-screen-ux-patch.test.js`.
  - Added settings-surface assertions and hidden-menu marker checks.

## Verification

Commands:

```bash
node --check tools/apply-openclaw-live-user-screen-ux-patch.mjs
node --check tools/apply-openclaw-live-gpao-t-surface-seal-patch.mjs
node --test test/live-user-screen-ux-patch.test.js test/live-surface-seal-patch.test.js
node tools/apply-openclaw-live-gpao-t-surface-seal-patch.mjs --apply --approval-token apply-gpao-t-surface-seal-live
node tools/apply-openclaw-live-user-screen-ux-patch.mjs --apply --token apply-gpao-t-user-screen-ux-live
```

Result:

- `node --check` passed for both live patch tools.
- `node --test test/live-user-screen-ux-patch.test.js test/live-surface-seal-patch.test.js` passed: 12 tests, 0 failures.
- Live static surface seal applied with backup:
  - `docs/03-verification/evidence/live-surface-seal-patch/2026-07-12T09-18-30-029Z-before-surface-seal/manifest.json`
- Live user-screen UX patch applied with latest backup:
  - `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T09-23-24-306Z`

## Live Safari Readback

After clearing Safari service worker/cache and reloading the live settings page, the visible-text audit returned no forbidden residue.

Forbidden terms checked:

```text
OpenClaw
Claw
Gateway
Worktree
Debug
디버그
로그
MCP server
scheduled task
Fallback logo
Assistant
companion log
token
allowlist
Avatar text
```

Result:

```json
{"forbidden":[]}
```

Representative visible text after seal:

```text
nBeAI. GPAO-T
대화로 돌아가기
설정
프로필
일반
모양
연결
채널
소통
기능과 도구
GPAO-T 지능
자동화
시스템
런타임 상태: 온라인
GPAO-T 실행 설정을 조정합니다.
모델과 사고
응답 모드
연결 채널
GPAO-T 연결 보안
연결키
실행 승인
허용 목록
브라우저 도구
도구 범위
로컬 실행 환경
메모리
저장공간
화면
화면 스타일
개인 설정
사용자
표시 이름 / 아이콘
GPAO-T
```

## Remaining Judgment

This seals the current settings-general user surface. It does not prove every reachable settings subpage is fully sealed; each route still needs the same route-level visible-text audit before claiming full-dashboard completion.
