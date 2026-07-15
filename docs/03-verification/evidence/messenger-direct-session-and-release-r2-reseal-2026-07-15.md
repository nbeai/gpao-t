# GPAO-T Messenger Direct Session + r2 Release Reseal Evidence

Generated: 2026-07-15

## Scope

This pass corrected the messenger session model from a Telegram-specific direct-session interpretation to a channel-agnostic messenger direct-session contract.

Expected behavior:

- If Telegram is connected and messages GPAO-T, GPAO-T exposes/uses a Telegram direct session.
- If Slack is connected and messages GPAO-T, GPAO-T exposes/uses a Slack direct session.
- The same direct-session contract is prepared for Discord, Signal, WhatsApp, and iMessage.
- Web chat keeps a separate webchat session identity.
- Direct messenger sessions do not open external-send, durable-memory-promotion, or compatibility-session-metadata authority by default.

## Changed Surfaces

- `src/core/live-turn-identity-mapping.js`
  - Generalized `*_direct` identity mapping across supported messenger channels.
  - Added Slack direct-session coverage.

- `src/core/session-event-heart.js`
  - Added `messengerDirect` identity summaries.
  - Preserved `telegramDirect` as a compatibility summary only.
  - Verification now requires `messenger_direct_dedicated_session`.

- `tools/apply-openclaw-live-user-screen-ux-patch.mjs`
  - Replaced the Telegram-only rail marker with `gpao_t_messenger_direct_communication_rail_v0_23`.
  - Added channel entries for Telegram, Slack, Discord, Signal, WhatsApp, and iMessage.
  - Fixed generated regex escaping for model/auth error cleanup.
  - Ensured an existing messenger rail script is stripped and reinserted, so live bundles can actually receive corrected script content.

- `src/core/model-connection-settings.js`
  - Added real OpenAI API Key save path through the runtime CLI.
  - Added user-facing OAuth command guidance.
  - Prevents secret echo in save results.

## Live Runtime Verification

Live health:

```text
curl -fsS http://127.0.0.1:18799/health
{"ok":true,"status":"live"}
```

Live Control UI index contains:

```text
gpao_t_messenger_direct_communication_rail_v0_23
DIRECT_MESSENGER_CHANNELS
label: "Slack"
label: "Discord"
data-gpao-t-direct-channel
```

Live generated compatibility cleanup regexes were inspected and contain the corrected escaped forms:

```text
Agent failed before reply:\s*
Auth store:\s*
Logs:\s*openclaw logs --follow
```

## Release Artifacts

Production distribution:

```text
.gpao-t/releases/gpao-t-2026.07.15-r2.zip
sha256 b5d19977bb02225a47619daef84b541a59578de16acbe11524f50621c12fe041
```

macOS installer:

```text
.gpao-t/releases/gpao-t-2026.07.15-r2-macos-installer.zip
sha256 8538eeea1945a67cdfe0ec0565632858387054f5b4db059c9dcf6138b3031716
```

Windows installer:

```text
.gpao-t/releases/gpao-t-2026.07.15-r2-windows-installer.zip
sha256 16cdf1a6a8b3b25a0f52fdd2516c45bb56b34b414d76a7b5d76579113362fd98
```

Update feed:

```text
docs/05-release/update-feed/gpao-t-update.json
version 2026.07.15-r2
```

## Verification Commands

```text
node --check tools/apply-openclaw-live-user-screen-ux-patch.mjs
node --test test/live-user-screen-ux-patch.test.js test/live-turn-identity-mapping.test.js test/session-event-heart.test.js
npm run check
npm run package:production
npm run package:macos-installer
node tools/build-gpao-t-windows-installer.mjs --node-win-x64 .gpao-t/releases/gpao-t-2026.07.15-r1-windows-installer/runtime/node.exe
npm run package:github-update-feed
zip -T .gpao-t/releases/gpao-t-2026.07.15-r2.zip
zip -T .gpao-t/releases/gpao-t-2026.07.15-r2-macos-installer.zip
zip -T .gpao-t/releases/gpao-t-2026.07.15-r2-windows-installer.zip
node tools/verify-gpao-t-production-distribution.mjs --archive .gpao-t/releases/gpao-t-2026.07.15-r2.zip --checksum .gpao-t/releases/gpao-t-2026.07.15-r2.zip.sha256 --skip-source-build-check
npm run verify:macos-installer
npm run verify:windows-installer
npm test
```

Results:

```text
targeted tests: 34 pass / 0 fail
npm run check: pass
production distribution verify: verified
macOS installer verify: verified
Windows installer verify: verified
npm test: 488 pass / 0 fail, plus dashboard readiness sub-suites pass
```

## Remaining Product Boundary

This evidence proves the channel-agnostic messenger direct-session contract in code, tests, live UI patch, and rebuilt r2 artifacts.

It does not prove real external Slack/Discord/WhatsApp/iMessage account delivery, because those external account connections were not activated in this pass.
