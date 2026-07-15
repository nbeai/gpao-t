# GPAO-T Settings / Telegram Hub Pass

Date: 2026-07-15

## Scope

This pass addresses the user-facing settings failure class:

- settings menu routes must not be empty shells
- model connection must remain visible and verifiable
- Telegram must have a first-class settings surface
- Telegram setup must expose required fields without echoing secret values
- fresh installs must include a disabled-but-visible Telegram connection slot

## Source Changes

- Added `src/core/settings-connection-hub.js`
  - settings hub state
  - settings hub HTML
  - Telegram connection state
  - Telegram local config save helper
  - settings verification gate
- Wired settings routes into `src/core/gateway.js`
  - `/settings`
  - `/settings/general`
  - `/settings/channels`
  - `/settings/profile`
  - `/settings/ai-agents`
  - `/settings/state`
  - `/settings/verify`
  - `/settings/channels/telegram/state`
  - `/settings/channels/telegram/verify`
- Wired settings routes into `src/core/control-center-serving.js`
  - HTML settings pages
  - protected Telegram save route
  - protected Telegram verify-connection boundary route
- Updated fresh install config in `tools/gpao-t-local-install-lib.mjs`
  - `channels.telegram.enabled = false`
  - token/chat ID secret refs
  - visible setup route `/settings/channels`
- Added `test/settings-connection-hub.test.js`
  - settings route coverage
  - Telegram state coverage
  - Gateway route coverage
  - Telegram save without secret echo
- Added `src/core/settings-connection-hub.js` to `npm run check`.

## Verification

Targeted check:

```text
node --check src/core/settings-connection-hub.js
node --check src/core/control-center-serving.js
node --check src/core/gateway.js
node --check src/index.js
node --test test/settings-connection-hub.test.js test/macos-installer.test.js test/model-connection-settings.test.js --test-concurrency=1 --test-timeout=120000 --test-reporter=spec
```

Result:

```text
17 pass / 0 fail
```

Broad check:

```text
npm run check
```

Result:

```text
pass
```

Full test suite:

```text
npm test
```

Result:

```text
482 pass / 0 fail
dashboard readiness suites pass
```

## Important Boundary

This pass verifies source-level and test-level behavior. It does not claim that
a rebuilt installer has been shipped to users or that the currently running live
dashboard has already been replaced with this source state.

Before release/package completion, rebuild the dated macOS/Windows installers,
install on a clean user-like Mac, open `/settings/channels`, save Telegram test
settings, verify no secret echo, and run a real Telegram send/receive smoke only
after explicit external-send approval.
