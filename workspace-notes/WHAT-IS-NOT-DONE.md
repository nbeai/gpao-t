# What Is Not Done

## Still Excluded

- Tauri dependency installation.
- Cargo/Tauri build, bundle, package signing, notarization, or installer creation.
- Real install, update, rollback, destructive file operation, or release-channel download.
- Local IPC/Tauri command activation.
- Connector, model, or tool activation.
- OAuth, token vault, secret storage, or external account connection.
- Durable memory promotion or self-growth apply.
- Deployment, public release, messenger, or recurring automation.
- Electron implementation.

## Current Completion Boundary

- The install/update/rollback readiness gate is an inspection and design contract only.
- It may describe prerequisites, blocked actions, recovery states, and future implementation order.
- It must not execute install/update/rollback or open any external/action authority.

## Remaining Production Path

- Prerequisite doctor contract.
- Dry-run executor contract.
- Packaged desktop dependency/build gate after explicit approval.
- Installer/update/rollback implementation and visual/ops QA after the dry-run gates prove safe.
