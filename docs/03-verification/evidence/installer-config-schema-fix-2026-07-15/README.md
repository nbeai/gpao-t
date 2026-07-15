# GPAO-T macOS Installer Config Schema Fix - 2026-07-15

## Trigger

Tester install failed during post-migration plugin verification:

- `update.channel` was written as `github-releases`, but the compatibility runtime schema only allows `stable`, `extended-stable`, `beta`, or `dev`.
- Legacy `plugins.allow` remained in `~/.gpao-t/gpao-t.json`, triggering bundled provider discovery migration diagnostics.

## Fix

- Keep compatibility runtime `update.channel` schema-safe as `stable`.
- Remove GPAO-T-only `gpaoTUpdate` from `gpao-t.json`; update feed stays in LaunchAgent `GPAO_T_UPDATE_FEED_URL`.
- Remove Telegram UI metadata from `channels.telegram`; fresh config keeps `channels.telegram.enabled` only.
- Remove legacy `plugins.allow` during install-time config normalization.
- Set `plugins.bundledDiscovery = compat` unless the user explicitly chose `allowlist`.
- Normalize an existing `~/.gpao-t/gpao-t.json` during install, not only fresh installs or migrations.
- Rebuilt the production distribution, macOS installer, and GitHub update feed.

## Corrected Artifacts

- `.gpao-t/releases/gpao-t-2026.07.15-r1.zip`
  - SHA-256: `2585d860c97ca3c8f1d745ad95454d8ad06448a9dc6a77f61dc5141a12bf3fc7`
- `.gpao-t/releases/gpao-t-2026.07.15-r1-macos-installer.zip`
  - SHA-256: `4bc345ef681c0ea70452c61247b8d8480fdd7d6949aaecd26e1e19d2b7d8f910`
- `.gpao-t/releases/github-release-2026.07.15-r1/`
  - refreshed with corrected zip files, checksums, and `gpao-t-update.json`.

## Verification

- `node --test test/macos-installer.test.js test/update-boundary.test.js test/codex-runtime-route-hardening.test.js`
  - 21 pass / 0 fail
- `npm run check`
  - pass
- `npm run package:production`
  - sealed
- `npm run package:macos-installer`
  - sealed
- `npm run package:github-update-feed`
  - ready
- `npm run verify:macos-installer`
  - verified
- `npm run check:installer`
  - pass
- `zip -T` for production and macOS installer archives
  - OK
- `npm test`
  - 483 pass / 0 fail
  - dashboard readiness sub-suites pass

## Package Internal Readback

The rebuilt installer contains:

- `tools/gpao-t-local-install-lib.mjs`
- `normalizeCompatibilityUpdateConfig`
- no `gpaoTUpdate` root key in generated `gpao-t.json`
- `channels.telegram` uses schema-valid keys only
- `plugins.bundledDiscovery = "compat"`
- `readExistingRuntimeConfig`

This confirms the zip being shared contains the installer-side repair logic, not only source changes.
