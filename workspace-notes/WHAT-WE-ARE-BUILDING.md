# What We Are Building

GPAO-T is a local-first Growth Personal AI Operating System with T-cell as its runtime decision kernel. The current build path is moving from browser-local Control Center inspection toward a packaged desktop shell while preserving read-mostly operation, explicit authority boundaries, replayable evidence, and rollback discipline.

## Current Phase

- Phase: tauri-install-update-rollback-readiness-gate
- Command: `control tauri-install-gate`, `control tauri-install-gate-check`
- Status: verified by local product checks; BEAI closeout still records a session-history review blocker caused by route/plan evidence being refreshed after implementation during context recovery.

## Current Surface

- Browser-local Control Center and app-shell remain GET-only and read-mostly.
- Packaged desktop/Tauri gate is closed as a decision contract.
- First read-mostly Tauri shell source scaffold exists under `src-tauri/` and `tauri-shell/`.
- Packaged-shell desktop/mobile visual QA baseline evidence exists under `docs/03-verification/evidence/`.
- Packaged desktop install/update/rollback readiness gate now exposes:
  - `gpao-t control tauri-install-gate`
  - `gpao-t control tauri-install-gate-check`
  - `GET /app-shell/tauri-install-gate`
  - `GET /app-shell/tauri-install-gate/verify`

## Companion Principle

AI does the work. User keeps authority.

## Verification Anchor

- `npm run verify`: 89 tests / 16 suites passed.
- `node bin/gpao-t.js control tauri-install-gate-check`: ready.
- `node bin/gpao-t.js control serve-check`: ready with loopback preview routes, including the Tauri install gate.
- `beai verify --run --scenario --meaning`: checks passed; BEAI product-quality history remains review because route/plan evidence was refreshed after implementation during context recovery.

## User Authority

Real install/update/rollback execution, dependency installation, Tauri build, IPC activation, signing, installer creation, external download, connector/model/tool activation, deployment, messenger, and automation remain blocked until explicit future approval and gate closure.
