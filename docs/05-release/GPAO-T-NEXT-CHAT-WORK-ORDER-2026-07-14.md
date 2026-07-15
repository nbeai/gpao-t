# GPAO-T Next Chat Work Order - 2026-07-14

## Purpose

This document is the handoff order for the next Codex/GPAO-T work chat.

The next chat must not restart planning from scratch. It must continue the current GPAO-T quality-hardening mission from the exact verified state below.

## User Goal

윤님 considers the current GPAO-T a first-completion baseline and wants to move into hardening and advancement. The immediate mission is not a new feature brainstorm. The mission is:

1. Restore the live GPAO-T dashboard/chat to a stable user-facing state.
2. Remove or hide user-visible clutter that does not help normal use.
3. Verify memory/context and tools as a real human user would experience them.
4. Repair every confirmed error found during live use.
5. Run exactly two full, highly detailed human-experience QA loops: test -> find issues -> patch -> verify.
6. Finish with workspace hygiene and an honest evidence-based report.

The user is a non-developer. Explain technical terms in plain Korean when reporting.

## Current Verified State

### Repositories And Runtime

- Product source repo: `/Users/jyp/Developer/gpao-t`
- Live runtime home: `/Users/jyp/.gpao-t`
- Live dashboard expected URL: `http://127.0.0.1:18799/chat?session=main`
- Live dist currently used by installed package:
  `/Users/jyp/.gpao-t/current/compatibility/gpao-t/dist`
- Evidence root:
  `/Users/jyp/Developer/gpao-t/docs/03-verification/evidence`

### Important Current Truth

- The formal human QA target was revised by the owner to two precise loops. Both
  loops are now complete. Current count: `2 / 2`.
- The previous work got stuck too long on auto-login/auth. Do not repeat that mistake.
- Direct URL auto-login is important, but unless it blocks all live use, treat it as a separate P1 item and return to full product QA.
- The live runtime was recovered and the final health readback is
  `{"ok":true,"status":"live"}` on port `18799`.
- The next work must start from the final QA evidence, not repeat the recovery
  investigation unless health has freshly regressed.

## Current User Frustration To Respect

The user is angry because completion was reported too optimistically before true user-facing verification. The next agent must obey this rule:

> Do not say “정상”, “완료”, or “해결” unless the live browser/user path was checked visually or with equivalent browser evidence.

The next agent must also remember:

- GPAO-T must be an independent product, not an OpenClaw-looking derivative.
- User-facing screens must say and feel like `nBeAI. GPAO-T`.
- OpenClaw references may remain only in internal comparison/evidence, not normal user surfaces.
- Basic tools must work. Web search, news clipping, weather, Telegram, Notion read/write, image analysis, and cron were manually reported by the user as successful in some tests, but automated live QA still must verify representative tool paths.

## Known Recent Work And Risks

### Recent Patches

The following files have recent source changes and must be inspected before further edits:

- `package.json`
- `src/core/chat-preflight-replay.js`
- `src/core/first-real-os-turn-pipeline.js`
- `src/core/llm-ready-task-context-packet.js`
- `src/core/memory-search.js`
- `src/core/storage.js`
- `tools/apply-openclaw-live-user-screen-ux-patch.mjs`
- `tools/fix-live-gpao-t-plugin-allowlist.mjs`
- `test/live-user-screen-ux-patch.test.js`
- `test/llm-ready-memory-search.test.js`
- `test/memory-search.test.js`

Recent untracked work also exists:

- `docs/03-engineering/GPAO-T-TOOL-PARITY-GATE-v0.1-ko.md`
- `docs/03-product-plan/`
- `docs/03-verification/evidence/live-basic-tools-repair/`
- `docs/03-verification/evidence/live-doctor-warning-repair/`
- `docs/03-verification/evidence/live-human-qa-loop-2026-07-14/`
- `docs/03-verification/evidence/live-memory-context-tool-qa/`
- `docs/03-verification/evidence/tool-parity-audit/`
- `test/live-tool-parity-audit.test.js`
- `test/storage-jsonl-tail.test.js`
- `tools/audit-live-gpao-t-tool-parity.mjs`
- `tools/repair-live-gpao-t-basic-tools.mjs`
- `tools/repair-live-gpao-t-doctor-warnings.mjs`

Do not delete or reset these. Classify and preserve them until the user approves cleanup.

### Auto-Login/Auth State

Do not disable authentication as a shortcut. A previous attempt to set `gateway.auth.mode = none` was correctly rejected as unsafe.

Safer path:

- `gpao-t dashboard` may open a token-authenticated dashboard URL and copy it to clipboard.
- The direct URL experience still needs a proper product solution later, but do not let it consume the full QA mission again.

### Recent Live UI Issue

During browser QA, a panel load error appeared:

- Error: `SyntaxError: Unexpected token '-'`
- Location observed: `http://127.0.0.1:18799/assets/index-Cib9gLwy.js`
- Evidence folder:
  `/Users/jyp/Developer/gpao-t/docs/03-verification/evidence/live-human-qa-loop-2026-07-14`
- Captures include:
  - `loop-0-stack-capture.json`
  - `loop-0-error-events.json`
  - `loop-0-after-cache-key-fix.json`
  - related screenshots

The cache-key patch did not prove resolution. Treat this as unresolved until a fresh live browser load proves otherwise.

### Live Patch Backups

Recent live patch backups are under:

`/Users/jyp/Developer/gpao-t/docs/03-verification/evidence/live-user-screen-ux-patch/`

Especially inspect:

- `2026-07-13T20-18-42-195Z/client-info-BTzNQ3uA.before.js`
- `2026-07-13T20-34-44-524Z/index.before.html`
- `apply-result.json`
- `dry-run-result.json`

If the live UI is broken, prefer a precise rollback to the last known stable backed-up artifact rather than adding more blind patches.

## Required Next-Chat Operating Rules

1. Start with `beai mesh resolve` for the current request if the new chat has BEAI/GPAO/Context Mesh continuity enabled.
2. Read this work order before implementing.
3. Use a process-monitoring agent/subagent if available. The monitoring agent's job is to prevent scope drift and false completion claims.
4. Do not spend more than one focused repair pass on auto-login before returning to broad product QA.
5. Do not report final success until browser-visible user experience is checked.
6. Put screenshots, logs, JSON receipts, and QA evidence under:
   `/Users/jyp/Developer/gpao-t/docs/03-verification/evidence/`
7. Do not create temporary files in `/Users/jyp/Documents/Playground 2`.
8. Do not delete `.git`, `.gpao-t`, secrets, live state, release zips, package outputs, or active source roots.
9. Any cleanup must first create a manifest of keep/archive/delete candidates.

## P0 Work Plan

### P0-1. Recover Live Runtime

Goal: `http://127.0.0.1:18799/health` must respond, and the dashboard must be reachable.

Suggested checks:

```bash
curl -fsS http://127.0.0.1:18799/health
tail -80 /Users/jyp/.gpao-t/logs/gateway-background-20260714.log
ps -axo pid,command | rg 'gpao-t|18799|gateway'
```

If gateway is down, restart through the existing GPAO-T command path, not by inventing a new runtime layout.

### P0-2. Restore Stable Dashboard Load

Goal: the main chat page loads without blank screen, broken panel, or raw JavaScript error.

Required evidence:

- Browser screenshot after load.
- Console/error capture.
- Confirmation that the message input is visible and usable.

If `Unexpected token '-'` persists, inspect the exact bundle expression around the reported location and compare with live patch backups. Roll back only the bad patch if needed.

### P0-3. Remove The Unwanted Input-Area “Answer Evidence” Panel

The user explicitly said the panel above the input showing answer grounds such as “이번 답변의 작동 근거 / 맥락 / 도구 / 기억 후보 / 성장 제안” is unnecessary and must be removed from the normal chat screen.

Important distinction:

- Remove from default chat surface.
- It may remain available behind an advanced/debug/inspector mode if already designed that way.
- Do not leave it visible above the input for ordinary use.

### P0-4. Confirm Basic Tools Work In Live User Path

The user expects GPAO-T to match or exceed the original tool baseline. Test representative tools as a user:

- web search or news query
- weather
- Telegram boundary/status without accidental external spam
- Notion read/write if safe and already authorized
- image analysis if a local image is available
- cron/scheduler creation dry-run or safe local check

Do not send external messages or mutate third-party data unless the existing tool path is explicitly safe, dry-run, or already approved.

### P0-5. Confirm Memory/Context Does Not Error In Chat

Ask live GPAO-T about prior conversation/session continuity and check:

- No raw “memory error” is shown to the user.
- Local hybrid memory/FTS fallback works even when semantic embedding provider is unavailable.
- If semantic memory is disabled, UI explains it politely as “고급 의미 검색 대기/비활성” rather than failure.
- Context Mesh must not hang on iCloud/offloaded placeholder files.

Plain-language explanation for user:

- “텍스트 검색” means finding exact/near words locally.
- “의미 검색” means vector/embedding search that finds related meaning even with different wording.
- GPAO-T must remain useful when meaning search is unavailable.

## Two Human-Experience QA Loops

Run exactly two detailed loops only after P0-1 and P0-2 are stable.

Each loop must follow:

```text
test as human -> record issue -> patch -> run focused test -> browser verify -> save evidence
```

The five sections below are coverage tracks distributed across the two loops;
they are not five separate loops.

### Coverage 1. Boot And Basic Chat

- Fresh dashboard load.
- Existing session load.
- New session creation.
- One short answer.
- One longer answer.
- Check speed, typing state, no raw internal errors.

### Coverage 2. Memory And Context

- Ask what it remembers from recent sessions.
- Ask it to summarize current project status.
- Ask a follow-up that requires session continuity.
- Confirm no memory error leaks.

### Coverage 3. Tools

- Web/news.
- Weather.
- Local/session status.
- At least one safe connector/tool path already enabled.
- Tool failures must become user-friendly messages, not raw red “Tool error” with no explanation.

### Coverage 4. Session UX

- Create, rename, archive/delete if implemented safely.
- Telegram dedicated lane stays clearly separated.
- No duplicate/confusing Telegram entries.
- Chat titles should be based on first user input, not UUID-like names.

### Coverage 5. Settings And Whole Surface

- Settings pages.
- Profile/general/appearance/channel/communication/GPAO-T intelligence/automation/system/info pages.
- No user-visible OpenClaw identity except internal evidence/debug if intentionally hidden.
- Korean/English labels should be consistent and user-facing.
- Mobile/narrow viewport check.

## Verification Commands

Run targeted checks after each patch and broader checks before closeout.

Suggested focused checks:

```bash
node --check tools/apply-openclaw-live-user-screen-ux-patch.mjs
node --test test/live-user-screen-ux-patch.test.js
node --test test/live-tool-parity-audit.test.js
node --test test/memory-search.test.js test/llm-ready-memory-search.test.js
npm run check
```

Run `npm test` only after focused checks are green or when the blast radius justifies it.

## Completion Criteria

The next chat may report this work complete only when all are true:

1. Live gateway health is reachable.
2. Dashboard loads visually in browser.
3. Normal chat works with at least one fresh message.
4. Unwanted input-area evidence panel is gone from default chat.
5. Memory/context query does not show raw error.
6. Representative basic tools work or fail gracefully with user-friendly explanation.
7. Two detailed QA loops are completed with evidence files.
8. Workspace hygiene manifest is updated if cleanup is performed.
9. Remaining issues are clearly classified P0/P1/P2/P3.
10. Final report says what was verified, what changed, and what remains.

## Do Not Do

- Do not claim full completion from source tests alone.
- Do not ask the user to test what Codex can test in browser.
- Do not spend the whole session on auto-login.
- Do not disable auth to make testing easy.
- Do not add new UX panels to the chat input area without user approval.
- Do not delete legacy/evidence/source files without a delete-candidate manifest and explicit approval.

## Paste-Into-New-Chat Starter

Use this in the next chat:

```text
지금부터 GPAO-T 작업을 이어간다. 먼저 이 작업 지시서를 읽어라:
/Users/jyp/Developer/gpao-t/docs/05-release/GPAO-T-NEXT-CHAT-WORK-ORDER-2026-07-14.md

현재 정식 인간 QA 기준은 사용자의 최신 지시에 따라 정밀 2회이며, 1회차는 완료됐다. 자동 로그인은 P1로 분리하고, 라이브 런타임, 대시보드, 메모리/맥락, 기본 도구를 보강한 뒤 최종 2회차 인간 체감 QA를 진행해라.

완료라고 말하기 전 반드시 브라우저에서 사용자 입장으로 확인하고 증거를 남겨라. 모든 증거는 /Users/jyp/Developer/gpao-t/docs/03-verification/evidence/ 아래에 저장해라.
```
