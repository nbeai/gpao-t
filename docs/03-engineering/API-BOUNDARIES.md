# API Boundaries

Document local, external, mock, dry-run, and approval boundaries.

## App Shell Boundary

The first GPAO-T app-shell slice is browser-local and read-mostly over `127.0.0.1` HTTP.

Allowed read surfaces:

- `GET /health`
- `GET /control-center`
- `GET /control-center/summary`
- `GET /control-center/design`
- `GET /control-center/design-reference-gate`
- `GET /control-center/design-reference-gate/verify`
- `GET /control-center/ui-contract`
- `GET /control-center/ui-snapshot`
- `GET /control-center/ui-validate`
- `GET /app-shell`
- `GET /app-shell/contract`
- `GET /app-shell/state`
- `GET /app-shell/verify`

Blocked first-slice surfaces:

- `POST /turn`
- connector writes or reviews
- growth application writes
- install, update, rollback, daemon, deploy, publish, external send, model call, tool execution, durable memory promotion, or recurring automation

Tauri command/IPC is the later packaged-shell path for explicit approved local actions. Electron IPC is a deferred fallback only.

The browser-local shell must return blocked status for non-GET requests. A blocked `POST` is not a failed feature; it is the first-slice authority boundary working as designed.
