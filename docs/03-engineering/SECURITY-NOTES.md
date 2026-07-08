# Security Notes

Do not print or commit secrets. Keep external actions, deployment, payment, automation, and destructive behavior behind approval.

## App Shell Security Decision

The first app-shell slice must stay browser-local, loopback-only, read-mostly, and no-external-activation.

- Browser-local shell is selected first because it reuses the current Control Center contracts without adding a native runtime.
- Tauri is selected as the first packaged desktop target because its security model is built around a WebView/core trust boundary, IPC, permissions, scopes, and capabilities.
- Electron is deferred because it requires a larger hardening surface around Chromium/Node integration, context isolation, sandboxing, navigation, external opening, and IPC sender validation.

No shell UI may configure OAuth, store tokens, call external models, execute external tools, activate connectors, mutate durable memory, apply self-growth, install/update/rollback, deploy, publish, delete data, send externally, or start recurring automation until a later explicit authority/audit/replay/rollback gate exists.
