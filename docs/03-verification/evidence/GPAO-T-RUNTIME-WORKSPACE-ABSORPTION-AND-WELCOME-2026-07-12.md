# GPAO-T Runtime Workspace Absorption And Welcome Evidence

Date: 2026-07-12
Status: applied and verified

## Scope

This pass converted the live runtime workspace prompt/setting files from an OpenClaw bootstrap-style agent home into the nBeAI. GPAO-T runtime workspace contract.

It also added a first-install welcome setup path so new users can choose:

- user name/address
- companion persona name
- tone/personality
- memory comfort boundary
- never-remember boundary
- approval-required actions
- heartbeat/self-check activation

## Live Workspace Result

Applied to:

- `/Users/jyp/.openclaw/workspace`

Applied files:

- `AGENTS.md`
- `SOUL.md`
- `IDENTITY.md`
- `USER.md`
- `TOOLS.md`
- `HEARTBEAT.md`
- `MEMORY.md`
- `WELCOME.md`
- `RUNTIME-MANIFEST.json`
- `gpao-logo.jpeg`
- `memory/2026-07-12.md`

Backup root:

- `docs/03-verification/evidence/runtime-workspace-absorption-2026-07-12/backups/2026-07-12T04-54-27-943Z`

Latest live apply report:

- `docs/03-verification/evidence/runtime-workspace-absorption-2026-07-12/runtime-workspace-absorption-2026-07-12T04-54-27-943Z.json`

Latest live verification report:

- `docs/03-verification/evidence/runtime-workspace-absorption-2026-07-12/runtime-workspace-absorption-2026-07-12T04-54-37-072Z.json`

## Implementation Added

- `runtime-workspace/gpao-t/*`: canonical GPAO-T runtime workspace pack.
- `tools/apply-gpao-t-runtime-workspace-pack.mjs`: dry-run/apply/verify tool with token, backup, logo copy, daily memory note, and evidence output.
- `src/core/runtime-workspace-welcome.js`: first-install welcome setup draft/apply/check logic.
- `test/runtime-workspace-pack.test.js`: workspace pack apply/verify coverage.
- `test/runtime-workspace-welcome.test.js`: first-install setup coverage.
- `bin/gpao-t.js workspace welcome*`: CLI surface for welcome setup.

## Verification

Passed:

- `node --test test/runtime-workspace-welcome.test.js test/runtime-workspace-pack.test.js --test-reporter=spec`
- `npm run check`
- `node tools/apply-gpao-t-runtime-workspace-pack.mjs --verify-live`
- `node bin/gpao-t.js workspace welcome-check /Users/jyp/.openclaw/workspace`
- `node bin/gpao-t.js workspace welcome-draft '{...}' /Users/jyp/.openclaw/workspace`

Key result:

- live workspace verification: `pass`
- welcome check: `ready`
- sample welcome draft: `ready`
- durable memory promotion without approval: `blocked/not_promoted`
- heartbeat activation without approval: `blocked/inactive`

## Remaining Product Integration

This pass originally closed the runtime workspace contract and CLI-level welcome setup.

The follow-up pass then exposed the same welcome setup through the Control Center/dashboard data contract and loopback routes so non-developer installers do not need to run CLI commands as the only path.

## Dashboard / Onboarding Completion Addendum

Added:

- `runtime-workspace-welcome` Control Center panel labeled `처음 설정`.
- Static dashboard HTML section with `data-runtime-workspace-welcome="ready"`.
- Gateway routes:
  - `GET /workspace/welcome`
  - `GET /workspace/welcome/check`
  - `POST /workspace/welcome/draft`
  - `POST /workspace/welcome/apply`
- Loopback preview-server routes for the same welcome contract.
- Token-gated apply behavior that returns a blocked response instead of throwing when the token is missing or wrong.

Additional verification:

- `node --test test/control-center.test.js --test-reporter=spec`
  - 31 tests passed.
- `npm run check`
  - passed.
- `node --test test/runtime-workspace-welcome.test.js test/runtime-workspace-pack.test.js --test-reporter=spec`
  - 4 tests passed.
- `node bin/gpao-t.js control html`
  - rendered the dashboard HTML with `data-panel="runtime-workspace-welcome"`, `data-runtime-workspace-welcome="ready"`, `첫 설정 메시지`, and `data-welcome-message="first-install"`.

Current state:

- runtime workspace pack: applied live
- welcome contract: ready
- dashboard/control-center exposure: complete
- durable memory during welcome: blocked unless explicitly approved
- heartbeat/self-check during welcome: blocked unless explicitly approved
- external action during welcome: blocked
