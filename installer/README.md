# GPAO-T macOS Local Installer

This installer targets the standalone `gpao-t-0.1.0-test-team.1` distribution.
It does not modify the source package, UI, or core runtime.

## Safety contract

- Every command is dry-run unless `--apply` is present.
- Install requires the exact token printed by dry-run:
  `APPLY:GPAO-T:<version>:LOCAL-MACOS`.
- Rollback requires `ROLLBACK:GPAO-T:<snapshot-id>`.
- Apply refuses while `ai.openclaw.gateway` is loaded, so its SQLite/WAL files
  and secret-bearing state can be backed up consistently.
- Apply also refuses while `ai.nbeai.gpao-t` is loaded, so an existing GPAO-T
  destination can be snapshotted without concurrent runtime writes.
- Existing `~/.openclaw` is read-only. Apply creates a full, mode-preserving
  backup before copying only the selected migration profile into `~/.gpao-t`.
- Secret values are never printed. Secret-bearing source modes must already be
  owner-only, and copied files retain their source modes.
- The dedicated service label is `ai.nbeai.gpao-t`; it does not replace
  `ai.openclaw.gateway`. Its default port is `18799`.

## Dry-run

```sh
node installer/gpao-t-macos-local.mjs install
```

The output includes release integrity, capacity, source-service state, selected
and excluded OpenClaw paths, managed destinations, the exact apply token, and
the rollback root. Dry-run performs no filesystem writes and no service action.

The standard migration profile selects:

```text
openclaw.json -> gpao-t.json (state paths rewritten, gateway port isolated)
credentials
devices
exec-approvals.json
identity
plugin-skills
state
workspace
workspace-attestations
```

It excludes logs, caches, temporary files, completion scripts, reports, old
config backups, OpenClaw service wrappers, agent sessions/Codex homes, and
installer-specific state. The complete pre-migration backup still preserves
the excluded agent tree for manual recovery without activating it in GPAO-T.
Use `--migration-profile none` for a clean GPAO-T state.

## Apply and rollback

Apply is intentionally documented as a separate authority step. First inspect
the dry-run output, stop the existing OpenClaw LaunchAgent, then provide the
exact printed token with `--apply --apply-token <token>`.

Each apply creates:

```text
~/.gpao-t/backups/openclaw/<install-id>/
~/.gpao-t/snapshots/<install-id>/
~/.gpao-t/receipts/<install-id>.json
```

Snapshot and backup manifests are written through fsync + temporary rename and
their directories are committed by rename. Rollback defaults to dry-run:

```sh
node installer/gpao-t-macos-local.mjs rollback --snapshot <install-id>
```

Rollback verifies every snapshot hash before mutation and first creates a guard
snapshot of the current managed targets. If restore fails, the guard is restored.

## Health

```sh
node installer/gpao-t-macos-local.mjs health
```

Health verifies the `current` release pointer, all distribution SHA-256 entries,
the protected LaunchAgent plist, `launchctl` state, and the loopback `/health`
endpoint. No health command mutates state.
