# What Is Not Done

## Still Excluded

- Tauri dependency installation
- Tauri build, bundle, signing, installer, or distribution
- Tauri command/IPC activation
- POST/mutating app-shell or packaged-shell routes
- connector, model, or tool activation
- OAuth setup, token storage, or secret storage
- external send, publish, deploy, or public release
- install/update/rollback execution
- durable memory promotion or self-growth apply
- messenger surfaces or recurring automation
- destructive file operations
- Electron implementation
- unrelated refactor or broad rewrite

## Current Completion Boundary

- Do not call a packaged desktop implementation ready unless `control app-shell-check`, `control tauri-gate-check`, `control tauri-shell-check`, packaged-shell visual QA, source-control rollback, and completion language guard pass.
- Do not cross from read-mostly source scaffold into dependency install, Tauri build, local IPC, connector activation, mutation, packaging, signing, install/update/rollback execution, or external action without an explicit gate.
- Current status: ready

## Blockers

- No unresolved session blocker is recorded.
