# GPAO-T Live Runtime Recovery - 2026-07-12

## Scope

The live OpenClaw runtime on this machine is treated as the live GPAO-T runtime.

This pass repaired the live runtime issues found in the full audit:

1. Reply-session initialization conflict risk from mixed old/new dist chunks.
2. Gateway RPC method drift, including `worktrees.list` and `device.pair.setupCode`.
3. Plugin load errors for bundled plugins that imported missing `@openclaw/ai` modules.
4. Device metadata-upgrade pending loop.

## Backups

Rollback evidence and copied files are stored under:

`docs/03-verification/evidence/live-runtime-repair-2026-07-12/`

Backed up:

- live `dist/cli/run-main.js`
- live `dist/register.subclis-core-p5JdMsmU.js`
- legacy device JSON state copied before SQLite repair

## Repairs Applied

### 1. Gateway dist entrypoint aligned

Patched live:

- `/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/cli/run-main.js`
- `/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/register.subclis-core-p5JdMsmU.js`

Changed the Gateway run import from the old chain:

- `run-command-CuXu0kg-.js`

to the newer chain:

- `run-command-BviuP6MM.js`

This routes the live Gateway through the chunk set that contains the newer server methods and safer reply-session path.

### 2. Missing internal OpenClaw packages restored locally

The installed OpenClaw package was missing runtime packages required by bundled extensions and model/provider code.

Restored into live `node_modules/@openclaw` from the pure OpenClaw lab source:

- `@openclaw/normalization-core`
- `@openclaw/markdown-core`
- `@openclaw/llm-core`
- `@openclaw/ai`

Added export shims for the local `@openclaw/ai` package:

- `dist/event-stream.js`
- `dist/diagnostics.js`

Import checks passed:

- `@openclaw/ai/internal/openai`
- `@openclaw/ai/internal/runtime`
- `@openclaw/ai/providers`
- `@openclaw/ai/event-stream`
- `@openclaw/ai/diagnostics`

### 3. Gateway restarted

The Gateway LaunchAgent restarted and is running.

Current verified state:

- Gateway reachable at `ws://127.0.0.1:18789`
- Gateway service running via LaunchAgent
- Telegram channel OK
- Gateway health plugin errors: `[]`

### 4. Device metadata loop closed

After restart, OpenClaw migrated pairing state into:

`/Users/jyp/.openclaw/state/openclaw.sqlite`

The loop came from one local device id being pinned as `MacIntel` for dashboard/webchat while CLI connected as `darwin`.

Repair:

- cleared the `platform` pin only for the affected paired local device row
- deleted its stale metadata-upgrade pending row
- preserved device id, public key, scopes, role, and tokens

Verification:

- `device_pairing_pending` count: `0`
- `openclaw gateway status --deep`: connectivity probe OK
- `openclaw devices list --json`: `pending: []`

### 5. RPC drift checked

Verified:

- `openclaw gateway call worktrees.list --json` returns `{ "worktrees": [] }`
- `openclaw gateway call device.pair.setupCode --json` no longer fails as unknown method; it returns the expected loopback policy error because public setup code requires LAN/Tailscale/public URL.

### 6. Live reply smoke checked

Ran a live turn through the Gateway:

`openclaw tui --message "GPAO-T live runtime smoke. Reply exactly: OK" --session "gpao-t-runtime-smoke-20260712" --timeout-ms 60000 --deliver`

Result:

- Gateway connected
- model `openai/gpt-5.5` ran
- assistant streamed and returned `OK`
- no reply-session initialization conflict appeared in the checked log tail

## Verification Commands

Passed:

- `openclaw status --all`
- `openclaw gateway status --deep`
- `openclaw devices list --json`
- `openclaw gateway call health --json`
- `openclaw gateway call worktrees.list --json`
- live TUI smoke turn
- `npm --prefix /Users/jyp/Documents/Playground\ 2/gpao-t run check`
- `npm --prefix /Users/jyp/Documents/Playground\ 2/gpao-t run test:fast`

`test:fast` result:

- 30 passed
- 0 failed

## Remaining Warnings

These are no longer the runtime-breaking P0/P1 issues, but they remain hardening tasks:

1. `openclaw.json` contains plaintext secret-bearing fields. This should be migrated to SecretRefs in a later security-hardening pass.
2. Many optional skills are enabled but unavailable because their external binaries or env vars are not installed. These do not block current Gateway/chat health, but product hygiene should disable or satisfy unused optional skill entries.
3. The local `@openclaw/*` package restoration is a live repair. For release-quality durability, GPAO-T should own a reproducible live package overlay script instead of relying on manual runtime surgery.

## Current Judgment

The live GPAO-T runtime is recovered from the audited runtime breakage:

- Gateway is up.
- Plugin load errors are closed.
- Device pending loop is closed.
- Known RPC drift is closed.
- A live reply turn succeeds.

This does not mean the full GPAO-T product is final-release complete. It means the runtime rescue mission for the audited live breakage is complete and evidence-backed.
