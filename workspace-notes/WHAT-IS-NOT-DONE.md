# What Is Not Done

## Still Excluded

- Full Tauri app implementation
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

- Do not call a Tauri implementation slice ready unless `control tauri-gate-check`, `control app-shell-check`, app-shell visual QA invariants, source-control rollback, and completion language guard pass.
- Do not cross from Tauri gate into packaged desktop implementation, local IPC, connector activation, mutation, packaging, signing, install/update/rollback execution, or external action without an explicit gate.
- Current status: ready

## Blockers

- No unresolved session blocker is recorded.
