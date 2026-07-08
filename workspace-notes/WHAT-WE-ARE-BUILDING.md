# What We Are Building

GPAO-T is a local-first Growth Personal AI Operating System with T-cell as its runtime decision kernel. The current build path is moving from browser-local Control Center inspection toward a packaged desktop shell while preserving read-mostly operation, explicit authority boundaries, replayable evidence, and rollback discipline.

## Current Phase

- Phase: tauri-prerequisite-doctor-and-dry-run-contract
- Status: verified and closeout-ready as no-execution contracts.

## Current Surface

- Browser-local Control Center and app-shell remain GET-only and read-mostly.
- Packaged desktop/Tauri gate is closed as a decision contract.
- First read-mostly Tauri shell source scaffold exists under `src-tauri/` and `tauri-shell/`.
- Packaged-shell desktop/mobile visual QA baseline evidence exists under `docs/03-verification/evidence/`.
- Packaged desktop install/update/rollback readiness gate is exposed through CLI, Gateway, loopback serving, docs, and tests.
- Prerequisite doctor / dry-run contracts expose:
  - `gpao-t control tauri-prerequisite-doctor`
  - `gpao-t control tauri-prerequisite-doctor-check`
  - `gpao-t control tauri-dry-run-contract`
  - `gpao-t control tauri-dry-run-contract-check`
  - `GET /app-shell/tauri-prerequisite-doctor`
  - `GET /app-shell/tauri-prerequisite-doctor/verify`
  - `GET /app-shell/tauri-dry-run-contract`
  - `GET /app-shell/tauri-dry-run-contract/verify`

## Verification Anchor

- `npm run verify`: passed with 90 tests / 16 suites.
- `node bin/gpao-t.js control tauri-prerequisite-doctor-check`: ready.
- `node bin/gpao-t.js control tauri-dry-run-contract-check`: ready.
- `node bin/gpao-t.js control serve-check`: ready with prerequisite doctor and dry-run contract loopback routes.
- `beai verify --run --scenario --meaning`: pass.
- `beai closeout`: ready.

## User Authority

Dry-run execution, real install/update/rollback execution, dependency installation, Tauri build, IPC activation, signing, installer creation, external download, connector/model/tool activation, deployment, messenger, and automation remain blocked until explicit future approval and gate closure.
