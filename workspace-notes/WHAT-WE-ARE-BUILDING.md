# What We Are Building

GPAO-T is a production-aimed local personal AI operating system. The current product path is closing the Local Control Center -> browser-local app-shell -> packaged desktop/Tauri substrate while preserving speed, safety, rollback, and user authority.

## Current Phase

- Phase: future-dry-run-invocation-approval-contract
- Status: implemented, verified, and closeout-ready
- Scope closed in this slice: contract-only approval boundary for a future dry-run invocation.
- Current surface added:
  - `gpao-t control tauri-dry-run-invocation-approval`
  - `gpao-t control tauri-dry-run-invocation-approval-check`
  - `GET /app-shell/tauri-dry-run-invocation-approval`
  - `GET /app-shell/tauri-dry-run-invocation-approval/verify`

## Verification Anchor

- `node --check src/core/tauri-install-execution-contracts.js`: pass.
- `node --test test/install-hardening.test.js`: pass, 9 tests.
- `node --test test/control-center.test.js`: pass, 18 tests.
- `node bin/gpao-t.js control tauri-dry-run-invocation-approval-check`: ready.
- `npm run verify`: pass, 93 tests across 16 suites.
- `node bin/gpao-t.js control serve-check`: ready with `tauriDryRunInvocationApprovalStatus: 200` when run with local loopback bind permission.
- `beai verify --run --scenario --meaning`: pass.
- `beai closeout --apply`: ready.
- `git diff --check`: pass.

## User Authority

The user keeps authority over approval-record storage, future dry-run invocation, Tauri build, dependency installation, install/update/rollback execution, connector/model/tool activation, deployment, messenger, automation, external account, token, or public release boundary.

## Current Progress Estimate

- Full GPAO-T production product: about 32-35% complete, 65-68% remaining.
- Current desktop/local substrate track: about 70-74% complete, 26-30% remaining.
- Immediate invocation approval contract slice: closed; next micro-slice should design approval-record storage only.
