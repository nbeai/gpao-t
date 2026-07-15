# GPAO-T GitHub Release Published - 2026.07.15-r1

## Result

GitHub Release published:

https://github.com/nbeai/gpao-t/releases/tag/2026.07.15-r1

Release commit pushed to `main`:

`this commit: fix: keep installer config schema-valid`

## OpenClaw Coexistence Fix

The macOS installer now skips OpenClaw service and secret-mode checks when the default `migration-profile none` path is used.

Verified package-internal readback:

- preflight `verifySecretModes(options.openclawHome)` is guarded by `profile !== "none"`
- apply-time `ai.openclaw.gateway` stop requirement is guarded by `plan.openclaw.profile !== "none"`
- `plugins.allow` is removed during config normalization
- `gpaoTUpdate` is not written to `gpao-t.json`; GitHub update metadata is supplied by `GPAO_T_UPDATE_FEED_URL`

## Uploaded Assets

- `gpao-t-2026.07.15-r1.zip`
  - SHA-256: `76b68a0357e71c8ed92665581d5ebd76b7fe2fad152d67fa15dabdc04da65e53`
- `gpao-t-2026.07.15-r1.zip.sha256`
- `gpao-t-2026.07.15-r1-macos-installer.zip`
  - SHA-256: `44d9367d0adff118d74671e3c397fe488534e9f3b2211ac7dfe3c3ffd0f7250a`
- `gpao-t-2026.07.15-r1-macos-installer.zip.sha256`
- `gpao-t-update.json`
- `gpao-t-2026.07.15-r1-windows-installer.zip`
  - SHA-256: `4b3837537d80e5e57b7ec4d2f8a0000841ea26c65c622d6e85324f88fb62f6cc`
- `gpao-t-2026.07.15-r1-windows-installer.zip.sha256`

## Verification

- Focused installer/update/settings tests: pass
- `npm run check`: pass
- `npm run package:production`: sealed
- `npm run package:macos-installer`: sealed
- `npm run package:github-update-feed`: ready
- `npm run verify:macos-installer`: verified
- `npm run verify:windows-installer`: verified
- `npm test`: 485 pass / 0 fail + dashboard readiness checks pass
- packaged fresh config validation: `Config valid`
- `zip -T` for production, macOS installer, and Windows installer archives: OK
- Feed SHA readback: production, macOS installer, and Windows installer asset hashes match local files
- GitHub Release readback: release exists, not draft, not prerelease, 7 assets uploaded
- Latest feed URL: HTTP 200, 1257 bytes
- Packaged updater status against latest feed:
  - `status: current`
  - `verification.ok: true`
  - `compatibilityUpdaterAllowed: false`

## Remaining Boundary

This release publishes production, macOS installer, and Windows installer assets in the GitHub update feed. Platform-specific apply behavior still depends on the installed updater path on each OS.
