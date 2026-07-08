# Tauri Prerequisite Doctor And Dry-Run Executor Contract

Status: contract added, execution blocked
Scope: packaged desktop install/update/rollback prerequisite doctor and dry-run executor design

This stage does not install dependencies, run Cargo, run Tauri, build a package, create an installer, open IPC, write files as a dry-run, download externally, or execute install/update/rollback. It defines what must be inspected before a future dry-run executor may exist, and what that future dry-run must prove before any real operation is allowed.

## Machine Contract

```sh
node bin/gpao-t.js control tauri-prerequisite-doctor
node bin/gpao-t.js control tauri-prerequisite-doctor-check
node bin/gpao-t.js control tauri-dry-run-contract
node bin/gpao-t.js control tauri-dry-run-contract-check
node bin/gpao-t.js gateway GET /app-shell/tauri-prerequisite-doctor
node bin/gpao-t.js gateway GET /app-shell/tauri-prerequisite-doctor/verify
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-contract
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-contract/verify
```

Loopback preview also exposes:

- `GET /app-shell/tauri-prerequisite-doctor`
- `GET /app-shell/tauri-prerequisite-doctor/verify`
- `GET /app-shell/tauri-dry-run-contract`
- `GET /app-shell/tauri-dry-run-contract/verify`

## Prerequisite Doctor

The prerequisite doctor is inspection-only. It checks:

- Tauri install/update/rollback readiness gate verification.
- Required source, shell, Tauri config, and engineering docs.
- Package `check`, `test`, and `verify` scripts.
- Local source-control checkpoint for rollback reasoning.

It explicitly records that these actions did not happen:

- `cargo --version`
- Tauri CLI invocation
- dependency installation
- package build

## Dry-Run Executor Contract

The dry-run executor contract is contract-only. It defines the future dry-run shape but does not implement or invoke an executor.

Required future dry-run artifacts:

- operation plan without mutation
- source-control checkpoint reference
- planned file write set
- planned command list
- planned verification commands
- planned rollback trigger conditions
- audit event preview
- user-visible recovery message

Every operation plan must cover:

- install
- update
- rollback

Every operation plan currently has:

- mutation allowed: `false`
- execution allowed now: `false`
- executor implemented: `false`
- verification required: `true`
- rollback plan required: `true`

## Blocked Now

- dry-run execution
- real install/update/rollback execution
- dependency installation
- Tauri/Cargo build
- bundle/signing/installer creation
- local IPC
- external download
- connector/model/tool activation
- OAuth/token/secret storage
- deployment
- messenger
- recurring automation

## Failure And Recovery States

- `dry_run_invoked_too_early`: return the contract and require explicit approval plus prerequisite doctor readiness before any dry-run executor exists.
- `planned_write_outside_allowed_root`: block executor invocation and require a revised file write set.
- `verification_command_missing`: block executor invocation until post-operation verification commands are defined.
- `rollback_plan_missing`: block executor invocation until rollback triggers and recovery messages are defined.

## Next Safe Action

After this contract remains verified, the next gate may design an approval-gated dry-run executor implementation. Real install/update/rollback, Tauri build, IPC, external download, deployment, messenger, and automation remain blocked.
