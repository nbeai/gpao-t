# Tauri Prerequisite Doctor And Dry-Run Executor Contract

Status: approval-record write gate design added, record write and invocation blocked
Scope: packaged desktop install/update/rollback prerequisite doctor, dry-run executor contract, approval-gated implementation design, pure dry-run plan/verify/preview objects, future invocation approval contract, future approval-record storage design, and future approval-record write gate design

This stage does not install dependencies, run Cargo, run Tauri, build a package, create an installer, open IPC, write files as a dry-run, write approval records, download externally, invoke a dry-run executor, or execute install/update/rollback. It defines what must be inspected before a future dry-run executor may exist, exposes pure JSON plan/verify/preview objects, defines the approval contract that must exist before any future invocation gate, designs where future approval records should live, and now defines the gate that a future approval packet must pass before any write could be implemented.

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
node bin/gpao-t.js control tauri-dry-run-invocation-approval
node bin/gpao-t.js control tauri-dry-run-invocation-approval-check
node bin/gpao-t.js control tauri-dry-run-approval-storage
node bin/gpao-t.js control tauri-dry-run-approval-storage-check
node bin/gpao-t.js control tauri-dry-run-approval-write-gate
node bin/gpao-t.js control tauri-dry-run-approval-write-gate-check
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
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-invocation-approval
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-invocation-approval/verify
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-approval-storage
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-approval-storage/verify
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-approval-write-gate
node bin/gpao-t.js gateway GET /app-shell/tauri-dry-run-approval-write-gate/verify
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
- `GET /app-shell/tauri-dry-run-invocation-approval`
- `GET /app-shell/tauri-dry-run-invocation-approval/verify`
- `GET /app-shell/tauri-dry-run-approval-storage`
- `GET /app-shell/tauri-dry-run-approval-storage/verify`
- `GET /app-shell/tauri-dry-run-approval-write-gate`
- `GET /app-shell/tauri-dry-run-approval-write-gate/verify`

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

## Future Invocation Approval Contract

The invocation approval contract is still contract-only. It defines what a later approval-record flow must capture before a dry-run executor can be invoked, but it does not record approval and does not invoke the executor.

Current surfaces:

- `buildTauriInstallDryRunInvocationApprovalContract`: returns the future invocation approval boundary.
- `verifyTauriInstallDryRunInvocationApprovalContract`: rejects any contract that enables invocation, audit writes, real operations, IPC, external network, or tool/model/connector activation.

Required approval packet fields:

- request id
- requested operation
- source commit
- preview schema
- preview verification status
- allowed write roots
- allowed commands
- blocked actions
- rollback plan
- audit preview
- approval state
- expiration

Approval can only ever allow:

- future dry-run executor invocation
- future local dry-run audit preview write
- future local dry-run preview artifact write

Approval cannot allow:

- real install/update/rollback execution
- Tauri build
- dependency install
- external network
- IPC activation
- connector/model/tool activation
- deployment, messenger, or automation

Current contract boundary:

- contract mode: `approval_contract_only_no_invocation`
- invocation status: `not_invoked`
- approval state: `not_requested`
- explicit user approval: `missing_by_design`
- executor existence: `missing_by_design`
- audit writes now: `false`

## Approval-Record Storage Design

The approval-record storage design defines where and how a future dry-run invocation approval record should be stored. It is still design-only and does not create directories, read approval records, append approval records, or invoke dry-run.

Current surfaces:

- `buildTauriInstallDryRunApprovalRecordStorageDesign`: returns future approval-record storage location, schema, lifecycle, replay/audit/rollback references, and write gate boundary.
- `verifyTauriInstallDryRunApprovalRecordStorageDesign`: rejects any design that enables approval writes, directory creation, dry-run invocation, command execution, file mutation, build, IPC, network, connector/model/tool activation, or install/update/rollback execution.

Future local storage contract:

- runtime root: `.gpao-t/`
- approvals root: `.gpao-t/approvals/`
- primary record file: `.gpao-t/approvals/tauri-dry-run-invocation-approvals.jsonl`
- index file: `.gpao-t/approvals/index.json`
- audit reference root: `.gpao-t/audit/`
- dry-run preview root: `.gpao-t/tauri-dry-run/`
- storage mode: future local append-only JSONL
- local only: `true`

Required future record fields:

- record id
- request id
- requested operation
- approval state
- approved scope
- source commit
- preview reference
- plan reference
- invocation approval contract reference
- replay references
- audit references
- rollback reference
- authority boundary
- blocked actions
- created, expiration, decision, and integrity fields

Required lifecycle states:

- `draft_previewed`
- `approval_requested`
- `approved_for_dry_run_invocation_only`
- `rejected`
- `expired`
- `revoked`
- `archived`

Required references:

- replay refs for dry-run preview verification and future invocation decision replay
- audit refs for approval requested and approval decided events
- rollback ref anchored to the current source commit

Current storage design boundary:

- approval record write now: `false`
- directory creation now: `false`
- approval record read now: `false`
- dry-run invocation now: `false`
- command execution now: `false`
- file mutation now: `false`
- Tauri build now: `false`
- dependency installation now: `false`
- IPC/network/connector/model/tool activation now: `false`

## Approval-Record Write Gate Design

The approval-record write gate design defines what a future approval packet must prove before a write implementation could be considered. It is still design-only and does not implement a write gate, invoke a write gate, append an approval record, create directories, invoke dry-run, run commands, or mutate files.

Current surfaces:

- `buildTauriInstallDryRunApprovalRecordWriteGateDesign`: returns packet requirements, missing-field rejection conditions, duplicate/expiry/scope controls, pre-write preview/verify requirements, post-write reference requirements, and recovery states.
- `verifyTauriInstallDryRunApprovalRecordWriteGateDesign`: rejects any design that enables record writes, write gate invocation, dry-run invocation, command execution, file mutation, build, IPC, network, connector/model/tool activation, or install/update/rollback execution.

Only these future approval packet states are allowed:

- `approved_for_dry_run_invocation_only`
- `rejected`

Only these future operations are allowed:

- `install`
- `update`
- `rollback`

Required packet fields include:

- request id and record id
- requested operation
- approval state
- approved scope
- source commit
- preview reference and preview verification status
- plan reference and plan verification status
- storage design reference
- write gate reference
- replay references
- audit references
- rollback reference
- authority boundary
- blocked actions
- created, expiration, decision, and integrity fields

The future write gate must reject:

- missing required fields
- operations outside install/update/rollback
- approval states outside dry-run-only approval or rejection
- scope beyond dry-run invocation only
- duplicate active approval records
- expired approval packets
- source commit drift
- preview or plan verification that is not ready
- missing replay/audit/rollback references
- integrity field gaps
- write roots outside approval storage
- any dry-run invocation, command execution, file mutation, Tauri build, dependency install, IPC, external network, connector/model/tool activation, or install/update/rollback execution

Required pre-write evidence:

- invocation approval contract verification: `ready`
- approval-record storage verification: `ready`
- dry-run plan verification: `ready`
- dry-run preview verification: `ready`
- source commit matches preview
- preview is user-visible

Required future post-write references:

- append approval record to primary JSONL
- append audit event reference
- append replay decision reference
- link rollback source commit
- update approval index

Current write gate boundary:

- approval record write now: `false`
- write gate implemented: `false`
- write gate invoked: `false`
- dry-run invocation now: `false`
- command execution now: `false`
- file mutation now: `false`
- Tauri build now: `false`
- dependency installation now: `false`
- IPC/network/connector/model/tool activation now: `false`

## Blocked Now

- dry-run execution
- dry-run executor invocation
- approval record write
- approval record directory creation
- approval record read/store mutation
- approval-record write gate implementation
- approval-record write gate invocation
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
- `approval_packet_missing_required_field`: reject the future write and return the missing-field list without appending any record.
- `duplicate_active_approval`: reject the future write and show the existing active approval record reference for review.
- `approval_packet_expired`: reject the future write and require a new preview, verification, and approval packet.
- `approval_scope_exceeded`: reject the future write because approval can only cover dry-run invocation preparation.
- `source_commit_drift_before_write`: reject the future write and rebuild plan/preview evidence from the current source checkpoint.

## Next Safe Action

After this approval-record write gate design remains verified, the next gate may design or implement pure approval-packet validation. Actual approval record write, dry-run invocation, command execution, file mutation, install/update/rollback, Tauri build, IPC, external download, deployment, messenger, and automation remain blocked.
