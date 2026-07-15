# GPAO-T GitHub Release Published - 2026.07.15-r1

## Result

GitHub Release published:

https://github.com/nbeai/gpao-t/releases/tag/2026.07.15-r1

Release commit pushed to `main`:

`ad62be6 release: prepare gpao-t 2026.07.15-r1 installers and updates`

## OpenClaw Coexistence Fix

The macOS installer now skips OpenClaw service and secret-mode checks when the default `migration-profile none` path is used.

Verified package-internal readback:

- preflight `verifySecretModes(options.openclawHome)` is guarded by `profile !== "none"`
- apply-time `ai.openclaw.gateway` stop requirement is guarded by `plan.openclaw.profile !== "none"`
- `plugins.allow` is removed during config normalization
- `gpaoTUpdate` stores GPAO-T GitHub update metadata separately from compatibility `update.channel`

## Uploaded Assets

- `gpao-t-2026.07.15-r1.zip`
  - SHA-256: `c2e901a193911c4ab8bf75863267740a292f8ed95f967d7ef61371e86ac3779d`
- `gpao-t-2026.07.15-r1.zip.sha256`
- `gpao-t-2026.07.15-r1-macos-installer.zip`
  - SHA-256: `dd3f9b5a768b274ae2d137dc7ed25a5c11b34eabda6dffe7f2e18c9cee282cc2`
- `gpao-t-2026.07.15-r1-macos-installer.zip.sha256`
- `gpao-t-update.json`
- `gpao-t-2026.07.15-r1-windows-installer.zip`
- `gpao-t-2026.07.15-r1-windows-installer.zip.sha256`

## Verification

- Focused installer/update/settings tests: pass
- `npm run check`: pass
- `npm run package:production`: sealed
- `npm run package:macos-installer`: sealed
- `npm run package:github-update-feed`: ready
- `npm run verify:macos-installer`: verified
- `zip -T` for production and macOS installer archives: OK
- Feed SHA readback: production and macOS installer asset hashes match local files
- GitHub Release readback: release exists, not draft, not prerelease, 7 assets uploaded
- Latest feed URL: HTTP 200, 1257 bytes
- Packaged updater status against latest feed:
  - `status: current`
  - `verification.ok: true`
  - `compatibilityUpdaterAllowed: false`

## Remaining Boundary

This release publishes the macOS updater feed. Windows installer is uploaded as a release asset, but Windows updater feed/apply behavior is still a separate platform expansion item.
