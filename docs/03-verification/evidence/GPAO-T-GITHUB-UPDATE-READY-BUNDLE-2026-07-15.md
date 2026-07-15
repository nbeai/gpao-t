# GPAO-T GitHub Update Ready Bundle - 2026-07-15

## Scope

Prepared the GPAO-T `2026.07.15-r1` release bundle so installed users can receive future updates through the GPAO-T GitHub update feed instead of receiving ad hoc installer files.

## Update Runtime Changes

- `gpao-t update status --json` now resolves the configured update feed, reads it through Node `http`/`https`, verifies feed shape, compares date-release versions, and reports candidate status.
- `gpao-t update apply --yes` now has a staged update path:
  - fetch update feed
  - select `production_distribution`
  - download asset
  - verify SHA-256
  - unzip into staging
  - verify `GPAO-T-DISTRIBUTION-MANIFEST.json`
  - move release into `~/.gpao-t/releases`
  - atomically repoint `~/.gpao-t/current`
  - write a `gpao_t.github_update_receipt.v1` receipt
- Compatibility updater remains disabled.
- User state home is preserved.

## Release Bundle

Directory:

```text
/Users/jyp/Developer/gpao-t/.gpao-t/releases/github-release-2026.07.15-r1
```

Files:

```text
GPAO-T-GITHUB-RELEASE-UPLOAD-MANIFEST.json
gpao-t-2026.07.15-r1.zip
gpao-t-2026.07.15-r1.zip.sha256
gpao-t-2026.07.15-r1-macos-installer.zip
gpao-t-2026.07.15-r1-macos-installer.zip.sha256
gpao-t-update.json
```

Final asset hashes:

```text
de5d6841e849c9f3125741fa3bf087578d7449295a3335682113ba0cf4b83deb  gpao-t-2026.07.15-r1.zip
dd31630b555aec03a42d4eade5afd8827fe245bbb8cb1ca3c20a3975513a1f93  gpao-t-2026.07.15-r1-macos-installer.zip
700acf0bf3f710ae3ff1025eaed265cc34422928df6988275723f226bb612809  gpao-t-update.json
```

## Verification

Passed:

```text
npm run check
npm run verify:macos-installer
npm run check:installer
node --test test/update-boundary.test.js test/macos-installer.test.js test/settings-connection-hub.test.js --test-concurrency=1 --test-timeout=120000 --test-reporter=spec
zip -T .gpao-t/releases/github-release-2026.07.15-r1/gpao-t-2026.07.15-r1.zip
zip -T .gpao-t/releases/github-release-2026.07.15-r1/gpao-t-2026.07.15-r1-macos-installer.zip
```

Local update feed smoke:

```text
GPAO_T_UPDATE_FEED_URL=http://127.0.0.1:19457/gpao-t-update.json node .gpao-t/releases/gpao-t-2026.07.15-r1/gpao-t.mjs update status --json
```

Result:

```text
status: current
updateAvailable: false
latestVersion: 2026.07.15-r1
verification.ok: true
```

Apply same-version smoke:

```text
GPAO_T_UPDATE_FEED_URL=http://127.0.0.1:19457/gpao-t-update.json node .gpao-t/releases/gpao-t-2026.07.15-r1/gpao-t.mjs update apply --yes
```

Result:

```text
status: skipped
reason: current
```

## External Boundary

GitHub release `2026.07.15-r1` did not exist at verification time. The local bundle is ready to upload, but public GitHub Release creation/upload is an external account write boundary.

Windows installer asset is intentionally excluded from the feed unless a current Windows `node.exe` payload is supplied and the Windows installer is rebuilt and verified.
