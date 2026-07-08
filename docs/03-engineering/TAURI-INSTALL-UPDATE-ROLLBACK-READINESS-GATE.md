# Tauri Install / Update / Rollback Readiness Gate

Status: readiness gate added, execution blocked
Scope: packaged desktop install/update/rollback readiness after packaged-shell visual QA

This gate is not an installer, updater, rollback executor, package build, signing step, or distribution step. It is a read-only product contract that checks whether GPAO-T has enough source, visual, package, and rollback evidence to design later executors safely.

## Entry Requirements

- Packaged desktop / Tauri gate is `ready`.
- Read-mostly Tauri shell source slice is `ready`.
- Packaged-shell desktop/mobile visual QA baseline is `ready`.
- General install/update/rollback hardening report is not blocked.
- Local git source-control rollback substrate exists.

## Machine Contract

```sh
node bin/gpao-t.js control tauri-install-gate
node bin/gpao-t.js control tauri-install-gate-check
node bin/gpao-t.js gateway GET /app-shell/tauri-install-gate
node bin/gpao-t.js gateway GET /app-shell/tauri-install-gate/verify
```

Loopback preview also exposes:

- `GET /app-shell/tauri-install-gate`
- `GET /app-shell/tauri-install-gate/verify`

## Allowed Now

- Read package hardening status.
- Read Tauri gate status.
- Read Tauri shell source-slice status.
- Read packaged-shell visual QA evidence.
- Show install, update, and rollback readiness requirements.
- Show failure/recovery states.
- Show next safe action.

## Blocked Now

- dependency installation
- Cargo/Tauri build
- bundle/signing/installer creation
- install execution
- update execution
- rollback execution
- destructive file operations
- local IPC commands
- external download
- connector/model/tool activation
- OAuth/token/secret storage
- deployment
- messenger surfaces
- recurring automation

## Gates

Install gate:

- executor implemented: `false`
- allowed now: `false`
- installer created: `false`
- dependency install executed: `false`
- Tauri build executed: `false`
- signing executed: `false`

Update gate:

- executor implemented: `false`
- allowed now: `false`
- release channel: `not_configured`
- external download: `blocked`
- migration policy required before state schema change

Rollback gate:

- executor implemented: `false`
- allowed now: `false`
- destructive rollback: `blocked`
- rollback substrate comes from local source-control readiness
- state backup/restore contract is still required before execution

## Failure And Recovery States

- `toolchain_missing`: keep build and install executors blocked; show prerequisite guidance and stay on read-only checks.
- `visual_baseline_missing`: re-run packaged-shell visual QA before any readiness claim.
- `package_hardening_blocked`: fix package, verify script, CLI, or source-control readiness before executor design.
- `rollback_checkpoint_missing`: create or confirm a source-control checkpoint before destructive rollback design.
- `executor_requested_too_early`: return this readiness gate and require explicit later approval before real install, update, rollback, build, or IPC implementation.

## Next Safe Action

Design prerequisite doctor and dry-run executor contracts next. Keep real install, update, rollback, Tauri build, IPC, external download, connectors, models, tools, deployment, messenger, and automation blocked.
