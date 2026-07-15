# GPAO-T macOS Local Installer

This installer targets the standalone `gpao-t-0.1.0` production distribution.
It does not modify the source package, UI, or core runtime.

For ordinary users, use the packaged `GPAO-T-Install.command` entrypoint. It
includes a compatible Node executable, runs the dry-run and apply steps without
exposing the operation token, starts the GPAO-T LaunchAgent, verifies health,
and opens the dashboard. The command-line interface below remains the repair,
health, and rollback surface for operators.

## Safety contract

- Every command is dry-run unless `--apply` is present.
- Install requires the exact token printed by dry-run:
  `APPLY:GPAO-T:<version>:LOCAL-MACOS`.
- Rollback requires `ROLLBACK:GPAO-T:<snapshot-id>`.
- The default `none` migration profile does not read, copy, stop, or alter an
  existing compatibility runtime, so both products can coexist.
- When `standard` migration is explicitly selected, apply refuses while the
  source service is loaded so SQLite/WAL and secret-bearing state can be
  backed up consistently.
- Apply also refuses while `ai.nbeai.gpao-t` is loaded, so an existing GPAO-T
  destination can be snapshotted without concurrent runtime writes.
- Existing compatibility state is read-only. An explicit `standard` migration
  creates a full, mode-preserving backup before copying only the selected
  migration profile into `~/.gpao-t`.
- Secret values are never printed. Secret-bearing source modes must already be
  owner-only, and copied files retain their source modes.
- The dedicated service label is `ai.nbeai.gpao-t`; it does not reuse or
  replace any previous gateway service. Its default port is `18799`.

## Dry-run

```sh
node installer/gpao-t-macos-local.mjs install
```

The output includes release integrity, capacity, source-service state, selected
and excluded compatibility-state paths, managed destinations, the exact apply
token, and the rollback root. Dry-run performs no filesystem writes and no
service action.

The default is a clean GPAO-T state:

```text
--migration-profile none
```

The optional `standard` migration profile selects:

```text
previous gateway config -> gpao-t.json (state paths rewritten, gateway port isolated)
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
config backups, previous service wrappers, agent sessions/Codex homes, and
installer-specific state. The complete pre-migration backup still preserves
the excluded agent tree for manual recovery without activating it in GPAO-T.
Inherited channels, webhooks, hooks, Telegram, and browser mutation authority
remain disabled until the user enables them through a separate product approval flow.

## Apply and rollback

Apply is intentionally documented as a separate authority step. First inspect
the dry-run output. For an explicit `standard` migration, stop the existing
compatibility gateway LaunchAgent if one is running. Then provide the exact printed token with
`--apply --apply-token <token>`.

Each apply creates:

```text
~/.gpao-t/backups/compatibility/<install-id>/
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
