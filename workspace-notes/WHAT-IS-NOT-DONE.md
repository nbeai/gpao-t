# What Is Not Done

## Still Excluded

- Approval-record write.
- Approval-store directory creation, read, append, or mutation.
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

This slice is complete only as a future approval-record storage design. It defines local storage location, required record schema, lifecycle, replay/audit/rollback references, and write gate boundary. Approval record writes remain disabled, dry-run invocation remains blocked, and no approval-store directories or records are created.

## Blockers

No unresolved technical blocker is recorded for the current storage-design slice. The next authority boundary is explicit user approval before designing or implementing an approval-record write path.
