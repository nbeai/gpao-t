# GPAO-T Live Full Audit - 2026-07-12

## Naming

From this audit forward, the live OpenClaw runtime on this machine is treated as the live GPAO-T runtime.

## Scope

This audit split GPAO-T into independently testable areas and compared the live runtime with the pure OpenClaw source kept in the lab.

- Pure OpenClaw baseline: `/Users/jyp/Documents/Playground 2/openclaw-clean-lab/github-openclaw-source`
- GPAO-T source: `/Users/jyp/Documents/Playground 2/gpao-t`
- Live GPAO-T state/runtime: `/Users/jyp/.openclaw`
- Live Gateway: `http://127.0.0.1:18789/`

## Independent Parts Checked

1. Live runtime identity and naming
2. Gateway service and LaunchAgent
3. Dashboard / chat surface
4. Multi-session workspace
5. GPAO-T chat preflight and replay hooks
6. Live turn absorption bridge
7. Memory candidate queue and Apply Gate
8. Context Mesh / Memory Wiki
9. T-cell admission and turn kernel
10. Control Center and local work surface
11. Owner Ops package and release candidate lane
12. Plugin / model / tool boundary
13. Device pairing and local auth
14. Source hygiene and test seal

## Verification Results

### GPAO-T source tests

Passed:

- `npm run check`
- `npm run test:fast` - 30 passed
- `npm run test:control` - 31 passed after loopback permission was available
- `npm run test:release` - 8 passed
- `npm run test:owner-ops` - 91 passed after making the script run its two files sequentially
- `npm test` - 314 passed, 0 failed

Change made:

- `package.json` now runs `test:owner-ops` as two explicit sequential `node --test` commands. This removes a file-level test runner ordering/race issue between `test/owner-ops.test.js` and `test/owner-ops-final-candidate.test.js`.

### Live dashboard visual check

Playwright loaded the live dashboard at `http://127.0.0.1:18789/`.

- Page title: `nBeAI. GPAO-T`
- Redirected route: `/chat?session=agent%3Amain%3Amain`
- Evidence:
  - `.playwright-mcp/gpao-t-live-dashboard-2026-07-12.png`
  - `.playwright-mcp/gpao-t-live-dashboard-console-2026-07-12.log`

Playwright did not share Safari's stored token, so its WebSocket connection produced `token_missing`. This is expected for that QA browser and is separate from the user's Safari chat error.

## Live User-Visible Errors Found

### P0 - Reply session initialization conflict

The user's dashboard chat error is supported by live logs.

Evidence:

- `channel=webchat`
- `sessionKey=agent:main:dashboard:1dc7bbec-f80e-405e-ae8a-c10a7477f727`
- `Error: reply session initialization conflicted`

The same class of error also appeared for Telegram direct session:

- `sessionKey=agent:main:telegram:direct:8601204821`
- `Error: reply session initialization conflicted`

Interpretation:

OpenClaw's reply-session initialization commits session rollover with an expected revision. When another actor changes the session store between snapshot and commit, it retries once and then throws this conflict. GPAO-T currently inherits this OpenClaw behavior.

Impact:

- User can see chat send failure.
- Telegram spooled messages can retry repeatedly before succeeding.
- This is not a GPAO-T UI-only problem; it is in the live reply session lifecycle.

### P1 - Gateway method/bundle drift

Pure OpenClaw source includes `worktrees.list` and `device.pair.setupCode`. The live dist contains both old and newer chunks:

- Old active path examples:
  - `server.impl-BEunG7u9.js`
  - `server-methods-B64pXQ-G.js`
- Newer/full path examples:
  - `server.impl-BWRGXGrX.js`
  - `server-methods-Dzut5E7H.js`

Live logs previously showed:

- `unknown method: worktrees.list`
- `unknown method: device.pair.setupCode`

Interpretation:

The installed live dist has mixed Gateway chunks. Some UI/client paths can expect methods that the active Gateway handler path does not provide.

### P1 - Device approval / stale token loop

Doctor reported:

- Pending device repair for the local CLI/control UI device.
- Local cached operator device token predates the Gateway rotation.

Actions taken:

- Backed up device state to `docs/03-verification/evidence/live-device-repair-backup-2026-07-12/`.
- Updated `/Users/jyp/.openclaw/identity/device-auth.json` from the matching `paired.json` operator token without printing token values.

Result:

- `openclaw status --all` became reachable and reports Gateway reachable.
- `openclaw devices list` and `openclaw gateway status --deep` still create fresh metadata repair request IDs.

State:

Partial recovery only. This remains an active repair item, not closed.

### P1 - Plugin load errors

Live logs and `openclaw status --all` still show:

- `clawrouter failed to load`
- `meta failed to load`
- Missing module: `@openclaw/ai/internal/openai`

Impact:

Not currently blocking basic chat/Gateway health, but it is a runtime integrity issue and must be closed before a test-team build is called clean.

### P2 - Messaging tool warning

`openclaw doctor --deep` reports:

- Agent `main` is routed from Telegram, but the `message` tool is unavailable for that agent.

Impact:

Explicit channel actions such as reply/upload may fail unless the allowlist/profile is adjusted.

## Current Product Level

GPAO-T source and local product mechanics are now strong pre-release candidate level by test evidence:

- Multi-chat workspace contract exists and passes tests.
- Memory/Context Mesh review and apply gates pass tests.
- Live-turn absorption bridge passes tests.
- Owner Ops local release candidate lane passes tests.
- Control Center and workspace shell pass tests.

The live runtime is not yet test-team-clean because the live Gateway still has P0/P1 operational risks:

- Reply session conflict on real chat turns.
- Device repair loop not fully closed.
- Plugin load errors.
- Possible active Gateway method drift.

## Fixed In This Pass

- Removed `test:owner-ops` nondeterminism by serializing the two test files in `package.json`.
- Verified full `npm test`: 314 passed, 0 failed.
- Created a backup of live device identity/pairing state.
- Partially repaired stale local device auth cache from paired record.

## Next Required Repair Order

1. Fix reply-session conflict for dashboard and Telegram direct turns.
   - Add/port a safer session initialization lock or recovery path.
   - Validate against both `agent:main:dashboard:*` and `agent:main:telegram:direct:*`.

2. Close device repair loop.
   - Prefer official OpenClaw repair path if possible.
   - If not, perform a controlled stale-device repair with backup, restart, and re-pair verification.

3. Normalize live Gateway dist path.
   - Ensure the active Gateway imports the full method bundle that includes `worktrees.*`, `device.pair.*`, and GPAO-T methods.
   - Verify with live RPC, not HTTP fallback routes.

4. Fix plugin missing module errors.
   - Determine whether `clawrouter` and `meta` should be disabled, repaired, or have the missing internal module restored.

5. Adjust Telegram/main agent messaging tool profile.
   - Restore `message` capability only inside the intended authority boundary.

6. Re-run final evidence:
   - `openclaw doctor --deep`
   - `openclaw status --all`
   - `openclaw devices list`
   - live Safari dashboard chat send
   - Telegram direct message
   - `npm test`

