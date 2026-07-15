# GPAO-T 2026.07.15-r1 GitHub Update Channel Evidence

- Generated: 2026-07-15
- Scope: official date-version distribution plus GitHub Releases update feed
- Version: `2026.07.15-r1`

## Artifacts

- Production archive: `.gpao-t/releases/gpao-t-2026.07.15-r1.zip`
- Production archive SHA-256: `4459df57d600584999c2babc0adda8a57368049517e40548c403bab5d6d68038`
- macOS installer archive: `.gpao-t/releases/gpao-t-2026.07.15-r1-macos-installer.zip`
- macOS installer archive SHA-256: `eb0c5127c76c9499f1bf7c9781da041a0f7c4828419b82df4dc3a84db26706e8`
- GitHub update feed: `docs/05-release/update-feed/gpao-t-update.json`

## Implemented Update Contract

- Default update feed URL:
  `https://github.com/nbeai/gpao-t/releases/latest/download/gpao-t-update.json`
- Fresh runtime config writes:
  - `update.channel = github-releases`
  - `update.feedUrl = <default feed URL>`
  - `update.compatibilityUpdaterAllowed = false`
  - `update.preserveStateHome = true`
- LaunchAgent writes:
  - `GPAO_T_UPDATE_FEED_URL = <default feed URL>`
- Compatibility updater remains disabled:
  - `OPENCLAW_NO_AUTO_UPDATE = 1`
  - `compatibilityUpdaterAllowed = false`

## Verification

```text
node --test test/update-boundary.test.js test/macos-installer.test.js --test-concurrency=1 --test-timeout=120000 --test-reporter=spec
13 pass / 0 fail
```

```text
npm run check:installer
pass
```

```text
npm run package:production
status: sealed
archiveSha256: 4459df57d600584999c2babc0adda8a57368049517e40548c403bab5d6d68038
```

```text
npm run package:macos-installer
status: sealed
archiveSha256: eb0c5127c76c9499f1bf7c9781da041a0f7c4828419b82df4dc3a84db26706e8
```

```text
npm run package:github-update-feed
status: ready
output: docs/05-release/update-feed/gpao-t-update.json
```

```text
npm run verify:macos-installer
status: verified
version: 2026.07.15-r1
```

```text
node tools/verify-gpao-t-production-distribution.mjs --archive .gpao-t/releases/gpao-t-2026.07.15-r1.zip
status: verified
health smoke: passed
```

```text
npm run check
pass
```

```text
npm test
main suite: 475 pass / 0 fail
dashboard readiness suites: 9 pass, 10 pass, 9 pass, 1 pass, 1 pass
```

## Packaged Installer Dry Run

Command:

```bash
GPAO_T_DRY_RUN=1 GPAO_T_NONINTERACTIVE=1 GPAO_T_SKIP_OPEN=1 \
GPAO_T_STATE_HOME=/private/tmp/gpao-t-install-dryrun-state \
./.gpao-t/releases/gpao-t-2026.07.15-r1-macos-installer/GPAO-T-Install.command
```

Result:

```text
설치 전 점검을 통과했습니다. 실제 파일과 서비스는 변경하지 않았습니다.
```

Packaged JSON install plan includes:

```text
launchAgent.updateFeedUrl:
https://github.com/nbeai/gpao-t/releases/latest/download/gpao-t-update.json
```

## Not Executed

- GitHub Release creation/upload was not executed in this pass.
- Network download and automatic update apply UI are not completed in this pass.
- A real fresh install on a separate Mac was not executed in this pass.
