# GPAO-T Live Runtime Repair Process Seal - 2026-07-12

## Status

This seal converts the 2026-07-12 live GPAO-T runtime rescue from manual surgery into a repeatable, guarded product process.

Current state:

- Live OpenClaw on this machine is treated as live GPAO-T.
- The previous runtime breakage was repaired and verified in `GPAO-T-LIVE-RUNTIME-RECOVERY-2026-07-12.md`.
- This pass did not re-apply live mutation. It added guarded repair and rollback tooling, then verified the tooling with no-write dry-run and repo checks.

## Files Added Or Hardened

- `tools/repair-live-gpao-t-runtime.mjs`
- `tools/rollback-live-gpao-t-runtime-repair.mjs`
- `package.json`

The repair tool is intentionally not a casual script. Live mutation is blocked unless all of these are present:

- `--apply`
- `--approval-token GPAO-T-LIVE-RUNTIME-REPAIR-2026-07-12`
- explicit `--affected-device-id`
- `--expected-run-main-sha`
- `--expected-register-sha-list`

The rollback tool is also blocked unless all of these are present:

- `--apply`
- `--approval-token GPAO-T-LIVE-RUNTIME-ROLLBACK-2026-07-12`
- `--manifest /path/to/manifest.json`

## Guarded Repair Scope

The repair tool can reproduce the specific live recovery class from the audit:

1. Back up live entrypoint files, selected OpenClaw package overlays, and SQLite device state.
2. Restore selected missing `@openclaw/*` internal packages from the pure OpenClaw lab source.
3. Route Gateway entrypoints from the older `run-command-CuXu0kg-.js` chain to `run-command-BviuP6MM.js`.
4. Route `session-store.runtime.js` from the older `session-store.runtime-B3wkNT36.js` alias to `session-store.runtime-bko8HNru.js` so the live agent conversation path exposes `loadSessionEntry`.
5. Clear a scoped local device metadata-upgrade loop by affected device id.
6. Write an applied manifest that becomes the rollback input.

The tool defaults to dry-run. `--no-write` dry-run produces no evidence directory and does not mutate live runtime state.

## Rollback Scope

The rollback tool restores from the applied repair manifest:

- entrypoint file backups
- SQLite state files present in the backup
- `@openclaw/normalization-core`
- `@openclaw/markdown-core`
- `@openclaw/llm-core`
- `@openclaw/ai`

It writes a rollback receipt and requires a Gateway restart plus health/device/RPC smoke after restore.

## Verification Evidence

Passed after hardening:

- `node --check tools/repair-live-gpao-t-runtime.mjs`
- `node --check tools/rollback-live-gpao-t-runtime-repair.mjs`
- `node tools/repair-live-gpao-t-runtime.mjs --no-write`
- `npm run check`
- `npm run test:fast`
- live `openclaw agent --json` conversation turn after the session-store runtime alias repair

`test:fast` result:

- 30 passed
- 0 failed

Fresh read-only live checks:

- `openclaw status --all`: Gateway reachable through loopback; LaunchAgent running; Telegram OK; channel issues none.
- `openclaw gateway call health --json`: `ok: true`, `plugins.errors: []`, Telegram running.
- `openclaw devices list --json`: `pending: []`.
- `openclaw gateway call worktrees.list --json`: returns `{ "worktrees": [] }`.

## Remaining Non-Blocking Warnings

These are not treated as runtime-recovery blockers. They are tracked for the next hardening phase:

1. Secret-bearing config fields should be migrated to SecretRef-style storage.
2. Optional skills/tool profiles need inventory hygiene so unavailable optional entries do not look like product failures.
3. Public/external-send tools remain authority-blocked until the user explicitly opens that boundary.
4. Browser/Safari visual QA token handling remains an owner-auth/session boundary and must not be solved by copying secrets into source.
5. The live package overlay is now reproducible, but long-term durability should move from local repair overlay to a first-class GPAO-T-owned runtime packaging lane.

## Product Judgment

This pass closes the process gap found after live runtime recovery:

- The live runtime was already recovered.
- The recovery is now reproducible by a hash-guarded, approval-token-gated repair tool.
- Rollback is now an executable product path, not only a written instruction.
- A later conversation QA blocker in the agent turn path was added to this same repair surface.
- The remaining warnings are separated from P0/P1 runtime breakage.

This does not claim final GPAO-T product completion. It means the live runtime rescue and repair/rollback process are sealed enough to continue toward the test-team pre-release lane.
