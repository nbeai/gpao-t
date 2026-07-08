# What Is Not Done

## Still Excluded

- Approval-record storage or approval write.
- Dry-run executor invocation.
- Real dry-run executor implementation beyond pure object builders and approval contract.
- Install/update/rollback execution.
- Tauri dependency installation, Cargo/Tauri build, bundle, signing, packaged installer creation, or release channel activation.
- Local IPC command activation.
- Connector/model/tool activation.
- OAuth, token vault, secret storage, external send, external account connection, or deployment.
- Durable memory promotion and self-growth apply.
- Messenger adapters and recurring automation.
- Public GitHub publication or public release.

## Current Completion Boundary

This slice is complete only as a future invocation approval contract. It defines required approval packet fields, allowed approval scope, rejection rules, audit contract, and recovery states. Approval state remains `not_requested`, invocation remains `not_invoked`, and audit writes remain disabled.

## Blockers

No unresolved technical blocker is recorded for the current approval-contract slice. The next authority boundary is explicit user approval before designing or implementing approval-record storage.
