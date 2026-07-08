# Tauri Packaged Desktop Gate

Status: gate closed, first read-mostly source slice added, packaged-shell visual QA baseline captured, install/update/rollback readiness gate added
Scope: transition from browser-local app-shell proof to the first packaged desktop shell slice

GPAO-T's next shell target is Tauri, but the first step is not a full Tauri app. This gate defines the minimum safe boundary for moving from the browser-local app-shell to a packaged desktop shell.

## Gate Result

- First packaged desktop target: Tauri.
- First Tauri slice: read-mostly shell only.
- Implementation status: first read-mostly source scaffold is allowed after this gate; full app, build, bundle, signing, IPC, and mutation remain blocked.
- Runtime boundary: load or mirror the existing browser-local app-shell state, with no mutation authority.
- Local IPC: blocked in the first slice.
- Tauri commands: disabled until each command has authority, audit, replay, rollback, failure/recovery, and QA contracts.

## Browser-Local To Tauri Boundary

Browser-local app-shell remains the regression anchor:

- `GET /health`
- `GET /app-shell`
- `GET /app-shell/contract`
- `GET /app-shell/state`
- `GET /app-shell/verify`
- `GET /control-center/*`

The first Tauri shell may only read those surfaces or an equivalent packaged static snapshot. It must not introduce POST routes, native IPC commands, connector activation, model calls, tool execution, account setup, installation, update, rollback execution, deployment, messenger, or automation.

Future hybrid boundary:

```text
Tauri shell
-> HTTP or packaged snapshot for read surfaces
-> Tauri command/IPC only after explicit per-command gate
-> authority + audit + replay + rollback + failure recovery required
```

## Allowed First Tauri Slice

The first Tauri slice may:

- open a packaged desktop window
- load the read-only app-shell surface
- read health, Control Center, and app-shell state
- show workflow, recovery, authority, and next-action lanes
- show per-panel state drilldowns
- navigate panels
- inspect evidence
- show failure/recovery state
- show authority boundary
- show next safe action
- support desktop/mobile screenshot QA

It may not mutate GPAO-T runtime state.

## Blocked Authority Actions

The first Tauri slice must keep these blocked:

- POST routes
- connector activation
- model activation
- tool activation
- OAuth setup
- token or secret storage
- external send
- install execution
- update execution
- rollback execution
- durable memory promotion
- self-growth apply
- deployment
- messenger surfaces
- recurring automation
- destructive file operations
- public release

## Rollback And Source-Control

- Source rollback remains local git.
- `.gpao-t/` remains ignored runtime state and must not become product source.
- Generated QA evidence belongs in `docs/03-verification/evidence/` or ignored local evidence paths.
- Runtime rollback remains blocked until snapshot export/import and explicit approval exist.
- Install/update/rollback executors remain a later gate.

## Screenshot And Visual QA

Packaged-shell visual QA baseline is captured for:

- desktop viewport: `1440x960`
- mobile viewport: `390x844`
- nonblank viewport
- panel navigation visible
- state lanes visible
- panel drilldown visible
- evidence inspector visible
- failure/recovery state visible
- no horizontal overflow
- authority boundary visible
- next safe action visible
- mobile fixed topbar action or decision strip visible
- no external activation

Evidence:

- `docs/03-verification/evidence/tauri-shell-visual-qa-2026-07-09-desktop-viewport-1440x960.jpg`
- `docs/03-verification/evidence/tauri-shell-visual-qa-2026-07-09-mobile-viewport-390x844.jpg`
- `docs/03-verification/evidence/tauri-shell-visual-qa-baseline-2026-07-09.json`
- `docs/03-verification/evidence/TAURI-SHELL-VISUAL-QA-BASELINE-2026-07-09.md`

Browser policy note: direct `file://` inspection was blocked by browser policy, so the packaged-shell visual QA uses the safer read-only loopback preview route `GET /app-shell/tauri-shell`.

Blocked visual signals:

- blank WebView
- external navigation
- account connection prompt
- token prompt
- install/update/rollback prompt
- send or deploy prompt
- hidden authority boundary

## Install / Update / Rollback Order

The order is:

1. Browser-local app-shell proof.
2. Tauri packaged desktop gate.
3. Read-mostly Tauri shell slice.
4. Packaged-shell screenshot QA.
5. Install/update/rollback readiness review.
6. Signed or distributed package gate.
7. Install/update/rollback executor gate after approval.

This keeps a packaged window separate from real installation, update, rollback, signing, or distribution.

## Failure And Recovery States

- `tauri_toolchain_missing`: keep implementation blocked and use browser-local checks until prerequisites are explicitly installed.
- `loopback_runtime_unavailable`: show local recovery and use `gpao-t control serve-check`; do not retry silently or start a persistent daemon.
- `health_not_ready`: show `/health` diagnostics and keep shell actions read-only or blocked.
- `app_shell_state_invalid`: show `/app-shell/verify` findings and block packaged shell progression.
- `ipc_not_allowed`: keep Tauri commands disabled until command-level gates exist.
- `permission_blocked`: show the blocked permission and require manual approval before a later local capability is opened.
- `overflow_regression`: block packaged-shell quality claims until screenshot QA passes.
- `authority_hidden`: block packaged-shell progression until authority boundary text is visible.
- `next_action_hidden`: block packaged-shell progression until the next safe action is visible.

## Machine Contract

The gate is inspectable through:

```sh
node bin/gpao-t.js control tauri-gate
node bin/gpao-t.js control tauri-gate-check
node bin/gpao-t.js gateway GET /app-shell/tauri-gate
node bin/gpao-t.js gateway GET /app-shell/tauri-gate/verify
```

Loopback preview also exposes:

- `GET /app-shell/tauri-gate`
- `GET /app-shell/tauri-gate/verify`
- `GET /app-shell/tauri-install-gate`
- `GET /app-shell/tauri-install-gate/verify`
- `GET /app-shell/tauri-shell`
- `GET /app-shell/tauri-shell.html`

The first read-mostly source slice is inspectable through:

```sh
node bin/gpao-t.js control tauri-shell-slice
node bin/gpao-t.js control tauri-shell-html
node bin/gpao-t.js control tauri-shell-check
node bin/gpao-t.js gateway GET /app-shell/tauri-shell
node bin/gpao-t.js gateway GET /app-shell/tauri-shell/slice
node bin/gpao-t.js gateway GET /app-shell/tauri-shell/verify
```

The install/update/rollback readiness gate is inspectable through:

```sh
node bin/gpao-t.js control tauri-install-gate
node bin/gpao-t.js control tauri-install-gate-check
node bin/gpao-t.js gateway GET /app-shell/tauri-install-gate
node bin/gpao-t.js gateway GET /app-shell/tauri-install-gate/verify
```

Source scaffold:

- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `src-tauri/build.rs`
- `src-tauri/src/main.rs`
- `src-tauri/capabilities/default.json`
- `tauri-shell/index.html`

The scaffold is source-only. It does not install dependencies, run `cargo`, run Tauri build, bundle, sign, create an installer, activate IPC commands, or execute local/system actions.

## Exit Criteria

This gate is closed only when:

- docs, CLI, Gateway, serving route, and tests all describe the same boundary
- `control tauri-gate-check` returns `ready`
- `control app-shell-check` remains `ready`
- `npm run verify` passes
- BEAI verify and closeout pass
- master plan history and backlog are updated

The next safe implementation after this readiness gate is prerequisite doctor and dry-run executor contract design only, not execution. Full desktop build, dependency installation, IPC, signing, installer creation, distribution, or install/update/rollback execution remain blocked until their later gates are explicit and approved.
