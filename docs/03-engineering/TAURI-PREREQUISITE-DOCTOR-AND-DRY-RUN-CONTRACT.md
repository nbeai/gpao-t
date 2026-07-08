# Tauri Prerequisite Doctor And Dry-Run Executor Contract

Status: pure plan/verify/preview objects added, invocation blocked
Scope: packaged desktop install/update/rollback prerequisite doctor, dry-run executor contract, approval-gated implementation design, and pure dry-run plan/verify/preview objects

This stage does not install dependencies, run Cargo, run Tauri, build a package, create an installer, open IPC, write files as a dry-run, download externally, invoke a dry-run executor, or execute install/update/rollback. It defines what must be inspected before a future dry-run executor may exist, and now exposes pure JSON plan/verify/preview objects that can be shown before any future invocation gate.

## Machine Contract

```sh
node bin/gpao-t.js control tauri-prerequisite-doctor
node bin/gpao-t.js control tauri-prerequisite-doctor-check
node bin/gpao-t.js control tauri-dry-run-contract
node bin/gpao-t.js control tauri-dry-run-contract-check
node bin/gpao-t.js control tauri-dry-run-design
node bin/gpao-t.js control tauri-dry-run-design-check
node bin/gpao-t.js control tauri-dry-run-plan
node bin/gpao-t.js control tauri-dry-run-plan-check
node bin/gpao-t.js control tauri-dry-run-preview
node bin/gpao-t.js control tauri-dry-run-preview-check
node bin/gpao-t.js gateway GET /app-shell/tauri-prerequisite-doctor
node bin/gpao-t.js gateway GET /app-shell/tauri-prerequisite-doctor/verify
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-contract
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-contract/verify
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-design
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-design/verify
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-plan
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-plan/verify
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-preview
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-preview/verify
```

Loopback preview also exposes:

- `GET /app-shell/tauri-prerequisite-doctor`
- `GET /app-shell/tauri-prerequisite-doctor/verify`
- `GET /app-shell/tauri-dry-run-contract`
- `GET /app-shell/tauri-dry-run-contract/verify`
- `GET /app-shell/tauri-dry-run-design`
- `GET /app-shell/tauri-dry-run-design/verify`
- `GET /app-shell/tauri-dry-run-plan`
- `GET /app-shell/tauri-dry-run-plan/verify`
- `GET /app-shell/tauri-dry-run-preview`
- `GET /app-shell/tauri-dry-run-preview/verify`

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

## Approval-Gated Implementation Design

The implementation design records the approval boundary for the pure functions and the future executor. The pure plan/verify/preview functions are now implemented as object builders only; they still do not implement or invoke an executor.

Proposed future interfaces:

- `buildDryRunPlan`: create an install/update/rollback dry-run plan from current evidence.
- `verifyDryRunPlan`: reject unsafe plans before any future executor invocation.
- `renderDryRunPreview`: show planned commands, writes, blocked actions, rollback plan, and next safe action.

Current implementation design boundary:

- implementation status: `design_only`
- execution mode: `no_executor_no_invocation_no_mutation`
- executor implemented: `false`
- executor invoked: `false`
- implementation allowed now: `false`
- invocation allowed now: `false`
- writes files: `false`
- runs commands: `false`
- reads external network: `false`
- opens IPC: `false`

Future implementation must reject:

- operations other than install/update/rollback
- mutating commands without future approval
- writes outside the allowed root
- missing verification commands
- missing rollback plans
- external downloads
- Tauri builds
- IPC activation

## Pure Dry-Run Plan / Verify / Preview

The pure objects are safe to show before approval because they do not execute anything.

Current object surfaces:

- `buildTauriInstallDryRunPlan`: returns install/update/rollback operation plans.
- `verifyTauriInstallDryRunPlan`: rejects any plan that implies execution, mutation, network, IPC, missing rollback, or missing verification evidence.
- `renderTauriInstallDryRunPreview`: returns user-visible JSON preview cards for the three operations.
- `verifyTauriInstallDryRunPreview`: verifies the preview remains approval-prep evidence only.

Required invariant:

- purity: `pure_object_no_write_no_command_no_network_no_ipc`
- execution mode: `plan_only_not_invoked` or `not_invoked`
- dry-run executor invoked: `false`
- planned commands: `not_executed`
- planned writes: `not_written`
- network: `blocked`
- IPC: `blocked`
- install/update/rollback: blocked
- Tauri build and dependency install: blocked

The preview may show future command names and future local artifact paths, but those entries must remain marked as planned and not executed or written.

## Blocked Now

- dry-run execution
- dry-run executor invocation
- real dry-run executor implementation beyond the pure object builders
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

After these pure plan/verify/preview objects remain verified, the next gate may design a future dry-run invocation approval contract. Dry-run invocation and real install/update/rollback, Tauri build, IPC, external download, deployment, messenger, and automation remain blocked.
