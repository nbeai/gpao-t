# Verify

Completion requires developer scenario verification and command evidence. Use `applied but unverified` until checks pass.

Minimum scenario checks:

- First success path.
- Empty or first-time state.
- Failure or recovery state.

App-shell visual baseline:

- `/app-shell` desktop baseline: `docs/03-verification/evidence/app-shell-baseline-2026-07-09-desktop-viewport-1440x960.jpg`
- `/app-shell` mobile baseline: `docs/03-verification/evidence/app-shell-baseline-2026-07-09-mobile-viewport-390x844.jpg`
- QA report: `docs/03-verification/evidence/app-shell-screenshot-qa-baseline-2026-07-09.json`
- Human-readable report: `docs/03-verification/evidence/APP-SHELL-SCREENSHOT-QA-BASELINE-2026-07-09.md`

Any deeper read-only Control Center/app-shell behavior must preserve GET-only, read-mostly, no external activation, POST blocking, authority boundary visibility, failure/recovery visibility, next safe action visibility, screenshot QA visibility, no horizontal overflow, and mobile fixed topbar action visibility.

Current deeper read-only app-shell behavior adds workflow, recovery, authority, and next-action state lanes plus per-panel state drilldowns. These are read-only UI/state contracts only; they do not add POST routes, connectors, models, tools, installation, rollback, durable memory promotion, self-growth apply, deployment, messenger, or automation.

Packaged desktop / Tauri gate:

- Gate document: `docs/03-engineering/TAURI-PACKAGED-DESKTOP-GATE.md`
- Contract check: `node bin/gpao-t.js control tauri-gate-check`
- Loopback routes: `GET /app-shell/tauri-gate` and `GET /app-shell/tauri-gate/verify`
- Required invariant: first Tauri slice remains read-mostly, with local IPC, Tauri commands, POST routes, connector/model/tool activation, OAuth/token, external send, install/update/rollback execution, durable memory promotion, self-growth apply, deployment, messenger, and recurring automation blocked.
- Required QA before implementation: desktop/mobile screenshot QA must preserve nonblank viewport, panel navigation, state lanes, panel drilldowns, evidence inspector, failure/recovery state, no overflow, authority boundary, next safe action, mobile action line or decision strip, and no external activation.

First read-mostly Tauri shell source slice:

- Source files: `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/build.rs`, `src-tauri/src/main.rs`, `src-tauri/capabilities/default.json`, and `tauri-shell/index.html`
- Contract check: `node bin/gpao-t.js control tauri-shell-check`
- Loopback routes: `GET /app-shell/tauri-shell/slice` and `GET /app-shell/tauri-shell/verify`
- Required invariant: source scaffold may exist, but dependency install, packaged build, bundle/signing, local IPC, Tauri commands, POST/mutation, connector/model/tool activation, OAuth/token, external send, install/update/rollback execution, durable memory promotion, self-growth apply, deployment, messenger, and recurring automation remain blocked.
- Next QA: packaged-shell visual QA must use the current app-shell screenshot baseline and Tauri shell source slice as regression anchors before any build, IPC, installer, or distribution gate opens.
