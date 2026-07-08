# What We Are Building

GPAO-T is a production-aimed local personal AI operating system. The current product path is closing the Local Control Center -> browser-local app-shell -> packaged desktop/Tauri substrate while preserving speed, safety, rollback, and user authority.

## Current Phase

- Phase: pure-dry-run-plan-verify-preview
- Status: implemented, verified, and closeout-ready
- Scope closed in this slice: pure JSON plan/verify/preview objects for future install/update/rollback dry-run approval preparation.
- Current surface added:
  - `gpao-t control tauri-dry-run-plan`
  - `gpao-t control tauri-dry-run-plan-check`
  - `gpao-t control tauri-dry-run-preview`
  - `gpao-t control tauri-dry-run-preview-check`
  - `GET /app-shell/tauri-dry-run-plan`
  - `GET /app-shell/tauri-dry-run-plan/verify`
  - `GET /app-shell/tauri-dry-run-preview`
  - `GET /app-shell/tauri-dry-run-preview/verify`

## Verification Anchor

- `node --check src/core/tauri-install-execution-contracts.js`: pass.
- `node --test test/install-hardening.test.js`: pass, 8 tests.
- `node --test test/control-center.test.js`: pass, 18 tests.
- `node bin/gpao-t.js control tauri-dry-run-preview-check`: ready.
- `npm run verify`: pass, 92 tests across 16 suites.
- `node bin/gpao-t.js control serve-check`: ready with `tauriDryRunPlanStatus: 200` and `tauriDryRunPreviewStatus: 200` when run with local loopback bind permission.
- `beai verify --run --scenario --meaning`: pass.
- `beai closeout --apply`: ready.
- `git diff --check`: pass.

## User Authority

The user keeps authority over any future dry-run invocation, Tauri build, dependency installation, install/update/rollback execution, connector/model/tool activation, deployment, messenger, automation, external account, token, or public release boundary.

## Current Progress Estimate

- Full GPAO-T production product: about 31-34% complete, 66-69% remaining.
- Current desktop/local substrate track: about 68-72% complete, 28-32% remaining.
- Immediate pure plan/verify/preview slice: closed; next micro-slice should design the future dry-run invocation approval contract only.
