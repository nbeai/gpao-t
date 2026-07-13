# GPAO-T Live User Screen UX Patch 2026-07-12

## Purpose

The live GPAO-T chat dashboard must be a user screen, not a developer/debug screen.

The top work strip previously exposed internal implementation language such as raw session ids, token counts, Context Source, OpenClaw session row, admission, replay, Apply Gate, and route/speed internals in the default view.

This patch keeps the internal runtime evidence available in code/state, but changes the default visible model to user-facing labels:

- `작업 맥락`
- `기억`
- `안전`
- `응답`
- `새 대화`
- `기억 준비됨`
- `안전 모드`
- `입력 가능`

## Applied Files

- Source patch tool: `/Users/jyp/Documents/Playground 2/gpao-t/tools/apply-openclaw-live-user-screen-ux-patch.mjs`
- Test: `/Users/jyp/Documents/Playground 2/gpao-t/test/live-user-screen-ux-patch.test.js`
- Check registration: `/Users/jyp/Documents/Playground 2/gpao-t/package.json`
- Live patched bundle: `/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/chat-page-BSHc822R.js`
- Live patched bundle: `/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/chat-page-3ZW4OQeE.js`
- Live patched CSS: `/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/index-DnZhFp1V.css`
- Live patched HTML: `/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/index.html`

## Live Apply Result

### Pass 001

```json
{
  "schema": "gpao_t.live_user_screen_ux_patch.v0_1",
  "status": "applied",
  "chatPage": "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/chat-page-BSHc822R.js",
  "backupDir": "/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T05-32-42-647Z",
  "changed": true
}
```

Pass 001 changed the model labels in `chat-page-BSHc822R.js`, but the live Safari page was loading `chat-page-3ZW4OQeE.js`. The user correctly reported that the visible top work pane still remained.

### Pass 002

Pass 002 patched every live `chat-page-*.js` file and changed the readable live renderer `aE(...)` so the GPAO work pane is not rendered in the default chat screen.

```json
{
  "schema": "gpao_t.live_user_screen_ux_patch.v0_1",
  "status": "applied",
  "chatPages": [
    "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/chat-page-3ZW4OQeE.js",
    "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/chat-page-BSHc822R.js"
  ],
  "backupDir": "/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T05-37-33-559Z",
  "changed": true,
  "hidesGpaoWorkPaneByDefault": true
}
```

### Pass 003

The user provided a live Safari screenshot showing the top GPAO work pane was still visible after Pass 002. The screenshot was treated as the source of truth.

Root cause: the live page still had an already-rendered `.gpao-work-pane` DOM node and Safari was using the cached control UI stylesheet. The JS renderer patch alone was insufficient for the already-loaded user screen.

Pass 003 added a persistent CSS-level user-screen guard and cache-busted the stylesheet link from `index.html`.

```json
{
  "schema": "gpao_t.live_user_screen_ux_patch.v0_1",
  "status": "applied",
  "cssFiles": [
    "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/index-DnZhFp1V.css"
  ],
  "htmlFiles": [
    "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/index.html"
  ],
  "backupDir": "/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T06-20-12-273Z",
  "persistsWorkPaneHideInLiveCss": true,
  "bustsCachedControlUiCss": true
}
```

## Verification

- `node --check tools/apply-openclaw-live-user-screen-ux-patch.mjs`: passed
- `node --test test/live-user-screen-ux-patch.test.js --test-reporter=spec`: 6 passed
- `node tools/apply-openclaw-live-user-screen-ux-patch.mjs`: dry-run after apply reported `changed: false`
- `node --check /Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/chat-page-BSHc822R.js`: passed
- Live default inspector block check:
  - bad hits: none
  - good hits: `작업 맥락`, `기억`, `안전`, `응답`, `새 대화`, `기억 준비됨`, `안전 모드`, `입력 가능`
- `npm run check`: passed
- Safari front document reload command sent after live apply.
- Pass 002 live renderer check:
  - `function aE(...)` block contains `gpao_t_user_screen_default_hides_work_pane_v0_1`
  - `function aE(...)` block no longer contains `gpao-work-pane`
  - `node --check /Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/chat-page-3ZW4OQeE.js`: passed
  - post-apply dry-run reported `changed: false`
  - `npm run check`: passed
- Pass 003 Safari front document computed style after cache-busted reload:
  - `.gpao-work-pane` exists in DOM but is not visible.
  - `display`: `none`
  - `visibility`: `hidden`
  - `height`: `0px`
  - rendered rect height: `0`
  - stylesheet href: `http://127.0.0.1:18789/assets/index-DnZhFp1V.css?gpao_user_screen=2026071203`
  - cache-bust active: `true`

### Pass 004

Telegram direct sessions are now separated from normal workspace sessions in the default user screen.

Contract:

- `telegram:*` rows remain backed by the original OpenClaw session link.
- They are moved visually into a top `소통` section.
- The visible label is `Telegram`, not the raw `telegram:...` session key.
- Normal workspace sessions remain in the regular `세션` list.
- The script performs DOM writes only when values actually need to change and schedules observer work by animation frame to avoid a mutation loop.

Live apply:

```json
{
  "schema": "gpao_t.live_user_screen_ux_patch.v0_1",
  "status": "applied",
  "backupDir": "/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T06-33-35-801Z",
  "telegramCommunicationRail": true,
  "separatesTelegramDirectCommunicationRail": true
}
```

Verification:

- `node --test gpao-t/test/live-user-screen-ux-patch.test.js --test-reporter=spec`: 7 passed
- `node --check gpao-t/tools/apply-openclaw-live-user-screen-ux-patch.mjs`: passed
- `node gpao-t/tools/apply-openclaw-live-user-screen-ux-patch.mjs`: dry-run after apply reported `changed: false`
- `npm --prefix gpao-t run check`: passed
- Served HTML contains only `gpao_t_telegram_direct_communication_rail_v0_3`; no v0.1/v0.2 rail script remains.

Safari note:

- During live verification, the already-loaded v0.2 page could make Safari's AppleScript `do JavaScript` checks slow/unresponsive.
- v0.3 replaced that script in served HTML and removes the repeated mutation-write risk.
- Visual QA should use a freshly loaded Safari document after v0.3.

## Boundary

This patch intentionally does not delete the underlying GPAO-T evidence model. It changes the default screen contract so user-facing chat is not dominated by developer diagnostics.

### Pass 005

Pass 005 closes the dynamic Safari user-surface gap found after the static seal audit.

Root cause:

- The default screen patch had removed the main developer work pane renderer and CSS-visible panel.
- Safari still generated dynamic labels and text from shadow roots, accessibility labels, route pages, and existing message history.
- Static bundle scanning could therefore report `ready` while the live authenticated screen still contained user-visible developer terms.

Pass 005 upgrades the injected live user-screen script to:

- inject the work-pane hide CSS into every collected document/shadow root
- mark `.gpao-work-pane` sections as hidden and `aria-hidden`
- rewrite visible labels for `Gateway`, `OpenClaw`, `Control UI`, `ClawHub`, `admission`, `replay`, `rollback`, and raw dashboard session names into GPAO-T language
- move `telegram:*` rows into the dedicated `소통` rail
- translate the visible Skills page language into user-facing `기능` language
- keep underlying logs/evidence intact while changing only the live presentation layer

Live apply:

```json
{
  "schema": "gpao_t.live_user_screen_ux_patch.v0_1",
  "status": "applied",
  "backupDir": "/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T08-36-59-497Z",
  "telegramCommunicationRail": true,
  "surfaceScript": "gpao_t_telegram_direct_communication_rail_v0_4"
}
```

Verification:

- `node --check tools/apply-openclaw-live-user-screen-ux-patch.mjs`: passed
- `node --test test/live-user-screen-ux-patch.test.js --test-concurrency=1 --test-timeout=180000 --test-reporter=spec`: 7 passed
- `node --test test/live-user-screen-ux-patch.test.js test/live-surface-seal-patch.test.js --test-concurrency=1 --test-timeout=180000 --test-reporter=spec`: 11 passed
- `node tools/audit-gpao-t-safari-user-surface.mjs --out docs/03-verification/evidence/gpao-t-safari-user-surface-audit-2026-07-12.json`: status `ready`
- Safari route audit covered `/chat`, `/sessions`, `/settings`, `/agents`, `/skills`, `/nodes`, `/dreaming`, and `/documents`.
- Safari route audit visible forbidden hit count: `0` for all checked routes.
- `node tools/audit-gpao-t-complete-seal.mjs --out docs/03-verification/evidence/gpao-t-complete-seal-inventory-2026-07-12.json`: status `ready`, `userVisibleHitCount: 0`
- `npm run check`: passed
- `npm test`: 336 tests, 40 suites, 336 passed, 0 failed

Updated live marker:

- Served HTML now uses `gpao_t_telegram_direct_communication_rail_v0_4`.
- Older v0.1/v0.2/v0.3 rail scripts are replaced when the patch tool runs.
