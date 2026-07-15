# GPAO-T 2026.07.15-r1 Windows Portable Installer v1 Evidence

- Generated: 2026-07-15
- Scope: Windows x64 portable installer package
- Version: `2026.07.15-r1`

## Artifact

- Windows installer archive:
  `.gpao-t/releases/gpao-t-2026.07.15-r1-windows-installer.zip`
- SHA-256:
  `0c1952bc8888a22c5cc8dca9094b884bf73f85752df2e46f920d48c6d75e2061`
- Manifest:
  `.gpao-t/releases/gpao-t-2026.07.15-r1-windows-installer/GPAO-T-WINDOWS-INSTALLER-MANIFEST.json`

## Bundled Runtime

- Source: official Node.js Windows x64 zip
- Downloaded file: `node-v24.18.0-win-x64.zip`
- SHA verification:

```text
node-v24.18.0-win-x64.zip: OK
```

## Installer Contract

- User entrypoint: `GPAO-T-Install.cmd`
- Runtime path: `%USERPROFILE%\.gpao-t`
- Startup mechanism: Windows Task Scheduler `ONLOGON`
- Bundled runtime: `runtime/node.exe`
- No manual connection key entry
- `gpao-t dashboard` opens the authenticated dashboard URL
- First browser device pairing is auto-approved through `devices approve`
- GitHub update feed is stored through `GPAO_T_UPDATE_FEED_URL`
- User data is preserved by default on uninstall
- Existing partial config is repaired without assuming every nested property exists
- Stop/repair only terminates a process on the GPAO-T port when the command line
  identifies it as a GPAO-T runtime
- Windows Explorer does not directly extract the long `node_modules` tree.
  The outer installer archive now contains a short `payload/gpao-t-2026.07.15-r1.zip`
  payload, plus short installer/runtime files.

## Verification

```text
node --test test/windows-installer.test.js test/update-boundary.test.js --test-concurrency=1 --test-timeout=120000 --test-reporter=spec
9 pass / 0 fail
```

```text
npm run check
pass
```

```text
npm test
478 pass / 0 fail
dashboard readiness suites: 9 pass / 0 fail, 10 pass / 0 fail,
9 pass / 0 fail, 1 pass / 0 fail, 1 pass / 0 fail
```

```text
npm run package:windows-installer
status: sealed
archiveSha256: 0c1952bc8888a22c5cc8dca9094b884bf73f85752df2e46f920d48c6d75e2061
```

```text
npm run verify:windows-installer -- --archive .gpao-t/releases/gpao-t-2026.07.15-r1-windows-installer.zip
status: verified
architecture: x64
installerFileCount: 11
runNode: false
```

```text
outer zip max entry path length: 77
outer extracted file count: 11
direct node_modules entries in outer zip: 0
```

## Update Feed

`docs/05-release/update-feed/gpao-t-update.json` includes:

```text
kind: windows_installer
name: gpao-t-2026.07.15-r1-windows-installer.zip
sha256: 0c1952bc8888a22c5cc8dca9094b884bf73f85752df2e46f920d48c6d75e2061
platform: windows-x64
```

## Not Yet Verified

- Fresh install on a real Windows PC
- Windows Task Scheduler live registration on Windows
- Windows Defender/SmartScreen user experience
- Browser auto-open and device-pairing approval on Windows
- Reboot persistence on Windows
- Windows update/repair/uninstall live loop
