# GPAO-T 2026.07.15-r3 Production Distribution

Status language: `production_ready` only after every production seal gate passes.

## Product Contract

- Product: `nBeAI. GPAO-T`
- Version: `2026.07.15-r3`
- Distribution channel: `public-source-prep`
- Intended audience: public
- Public release: not executed
- State home: `~/.gpao-t`
- Dashboard: `http://127.0.0.1:18799/chat?session=main`

Internal distribution describes the audience, not a reduced quality level. The same
runtime, integrity, installation, recovery, browser, chat, tool, memory, context, and
self-growth gates apply to every package.

## Artifacts

- Directory: `.gpao-t/releases/gpao-t-2026.07.15-r3/`
- Archive: `.gpao-t/releases/gpao-t-2026.07.15-r3.zip`
- Checksum: `.gpao-t/releases/gpao-t-2026.07.15-r3.zip.sha256`
- Manifest: `.gpao-t/releases/gpao-t-2026.07.15-r3/GPAO-T-DISTRIBUTION-MANIFEST.json`
- GitHub update feed: `docs/05-release/update-feed/gpao-t-update.json`
- Windows installer archive: `.gpao-t/releases/gpao-t-2026.07.15-r3-windows-installer.zip`

The manifest is `gpao_t.distribution_manifest.v2`. It binds the release version,
distribution channel, package identity, runtime identity, source provenance, file
inventory, and SHA-256 hashes.

## Build And Verify

```bash
npm run package:production
node tools/verify-gpao-t-production-distribution.mjs \
  --archive .gpao-t/releases/gpao-t-2026.07.15-r3.zip
npm run package:macos-installer
npm run package:windows-installer
npm run package:github-update-feed
npm run verify
npm run seal:final
```

Do not distribute an artifact when the production seal reports `blocked` or
`standalone_rebuild_required`.

## Install

Build the macOS ordinary-user installer from the verified production distribution:

```bash
npm run package:macos-installer
```

Share the resulting archive:

```text
.gpao-t/releases/gpao-t-2026.07.15-r3-macos-installer.zip
.gpao-t/releases/gpao-t-2026.07.15-r3-windows-installer.zip
```

The recipient extracts the archive and double-clicks `GPAO-T-Install.command`.
The installer includes its own Node executable, verifies the v2 distribution
manifest, installs into `~/.gpao-t`, registers the GPAO-T LaunchAgent, checks
health, and opens the dashboard. It does not require Node.js, Docker, or Git to
be installed separately.

The developer-facing installer remains available for repair and rollback:

```bash
node installer/gpao-t-macos-local.mjs health
node installer/gpao-t-macos-local.mjs rollback --snapshot <id>
```
It keeps rollback evidence and does not use the historical pre-production package as
the default install source.

For Windows, share the Windows installer archive. The recipient extracts it and
double-clicks `GPAO-T-Install.cmd`. The package includes `runtime/node.exe`,
installs into `%USERPROFILE%\.gpao-t`, registers a Windows Task Scheduler
`ONLOGON` task, opens the authenticated dashboard, and auto-approves the first
local browser device pairing. Users should not type a connection key manually.

## GitHub Update Boundary

GPAO-T owns its update contract. The isolated compatibility runtime is never allowed
to check or install its upstream product updates while `GPAO_T_RUNTIME=1`.

- `gpao-t update status` returns the GPAO-T managed update state.
- New installs carry `GPAO_T_UPDATE_FEED_URL` in the LaunchAgent environment; `~/.gpao-t/gpao-t.json`
  keeps only compatibility-schema-valid keys, and compatibility `update.channel` remains schema-safe.
- The default feed target is
  `https://github.com/nbeai/gpao-t/releases/latest/download/gpao-t-update.json`.
- The feed must use GPAO-T manifests, SHA-256 verification, staged install,
  atomic swap, rollback, restart, health, dashboard, fresh chat, and log readback.

## Completion Evidence

Production completion requires all of the following:

1. Runtime health and installer health pass.
2. Dashboard routes load without a blocking screen or stale update banner.
3. A fresh real model-backed chat succeeds.
4. Basic tools, memory/context admission, replay, and self-growth boundaries pass.
5. Previous conversations can be expanded by the user.
6. Fresh logs contain no fatal authentication, provider, runtime, or updater error.
7. The production archive, checksum, manifest, source provenance, and rollback path pass.

Public release, code signing, notarization, and external distribution remain separate
authority gates. They do not change the quality standard of this package.
