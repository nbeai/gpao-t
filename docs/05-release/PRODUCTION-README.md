# GPAO-T 0.1.0 Production Distribution

Status language: `production_ready` only after every production seal gate passes.

## Product Contract

- Product: `nBeAI. GPAO-T`
- Version: `0.1.0`
- Distribution channel: `internal-production`
- Intended audience: internal company users
- Public release: not executed
- State home: `~/.gpao-t`
- Dashboard: `http://127.0.0.1:18799/chat?session=main`

Internal distribution describes the audience, not a reduced quality level. The same
runtime, integrity, installation, recovery, browser, chat, tool, memory, context, and
self-growth gates apply to every package.

## Artifacts

- Directory: `.gpao-t/releases/gpao-t-0.1.0/`
- Archive: `.gpao-t/releases/gpao-t-0.1.0.zip`
- Checksum: `.gpao-t/releases/gpao-t-0.1.0.zip.sha256`
- Manifest: `.gpao-t/releases/gpao-t-0.1.0/GPAO-T-DISTRIBUTION-MANIFEST.json`

The manifest is `gpao_t.distribution_manifest.v2`. It binds the release version,
distribution channel, package identity, runtime identity, source provenance, file
inventory, and SHA-256 hashes.

## Build And Verify

```bash
npm run package:production
node tools/verify-gpao-t-production-distribution.mjs \
  --archive .gpao-t/releases/gpao-t-0.1.0.zip
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
.gpao-t/releases/gpao-t-0.1.0-macos-installer.zip
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

## Update Boundary

GPAO-T owns its update contract. The isolated compatibility runtime is never allowed
to check or install its upstream product updates while `GPAO_T_RUNTIME=1`.

- `gpao-t update status` returns the GPAO-T managed update state.
- `gpao-t update` fails closed until the GPAO-T update service is activated.
- A future feed must use signed GPAO-T manifests, digest verification, staged install,
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
