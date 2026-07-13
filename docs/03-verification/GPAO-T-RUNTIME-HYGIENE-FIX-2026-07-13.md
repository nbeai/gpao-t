# GPAO-T Runtime Hygiene Fix - 2026-07-13

## Scope

This pass fixed three runtime hygiene issues found after the local memory search upgrade:

1. Telegram polling failure noise.
2. `plugins.entries.codex: plugin not installed: codex` warning.
3. Development source living inside an iCloud-synced path.

## Decisions

- The canonical live runtime remains `~/.gpao-t`.
- The canonical development repository is now `/Users/jyp/Developer/gpao-t`.
- iCloud-backed project folders are no longer accepted as GPAO-T development roots.
- Telegram remains a single dedicated communication session, but the unstable isolated polling worker is disabled in the live runtime until it is reworked and tested.
- `codex` is not a default runtime plugin. It must stay disabled unless a real first-class GPAO-T Codex plugin is installed.

## Live Runtime Actions

- Backed up `~/.gpao-t/gpao-t.json`.
- Disabled `plugins.entries.codex`.
- Removed `codex` from `plugins.allow`.
- Backed up and patched the live Telegram monitor bundle to bypass isolated ingress and use the default polling path.
- Disabled the old `ai.openclaw.gateway` LaunchAgent by moving its plist out of `~/Library/LaunchAgents`.
- Recovered the gateway restart-loop breaker after the invalid interim config was repaired.

## Source Actions

- Cloned `nbeai/gpao-t` into `/Users/jyp/Developer/gpao-t`.
- Migrated local hybrid memory search source changes into the new canonical repository.
- Updated runtime workspace documentation to point at `/Users/jyp/Developer/gpao-t` and port `18799`.
- Updated plugin allowlist tooling to keep `codex` disabled unless an installed GPAO-T Codex plugin exists.
- Updated install migration to normalize plugin config for GPAO-T instead of carrying a stale OpenClaw/Codex plugin assumption forward.

## Plain-Language Meaning

- Telegram failure logs were not a memory problem. They were a separate connection worker problem.
- The Codex plugin warning meant “the config says a plugin exists, but the product cannot find it.”
- The iCloud issue meant development files could look present while their real contents were not local yet, causing imports, tests, or git commands to hang.

## Verification Targets

- `http://127.0.0.1:18799/health` must return live.
- No old listener should remain on `18789`.
- No new `plugins.entries.codex: plugin not installed: codex` warning should appear after restart.
- Telegram must no longer emit the repeated `isolated polling ingress failed` line.
- Any remaining Telegram `409 Conflict` must be treated as duplicate poller cleanup, not memory search failure.
