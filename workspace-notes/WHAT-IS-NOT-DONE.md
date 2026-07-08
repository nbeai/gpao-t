# What Is Not Done

## Still Excluded

- Real dry-run executor implementation without explicit future approval.
- Dry-run executor invocation.
- Install/update/rollback execution.
- Tauri dependency installation, Cargo/Tauri build, bundle, signing, packaged installer creation, or release channel activation.
- Local IPC command activation.
- Connector/model/tool activation.
- OAuth, token vault, secret storage, external send, external account connection, or deployment.
- Durable memory promotion and self-growth apply.
- Messenger adapters and recurring automation.
- Public GitHub publication or public release.

## Current Completion Boundary

This slice is complete only as a no-execution implementation design. It defines future pure `buildDryRunPlan`, `verifyDryRunPlan`, and `renderDryRunPreview` interfaces, but it does not implement or invoke them yet.

## Blockers

No unresolved technical blocker is recorded for the current design slice. The next authority boundary is explicit user approval before implementing pure dry-run plan/verify/preview functions.
