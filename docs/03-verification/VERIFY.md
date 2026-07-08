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
- Loopback routes: `GET /app-shell/tauri-shell`, `GET /app-shell/tauri-shell/slice`, and `GET /app-shell/tauri-shell/verify`
- Required invariant: source scaffold may exist, but dependency install, packaged build, bundle/signing, local IPC, Tauri commands, POST/mutation, connector/model/tool activation, OAuth/token, external send, install/update/rollback execution, durable memory promotion, self-growth apply, deployment, messenger, and recurring automation remain blocked.

Packaged-shell visual QA baseline:

- `/app-shell/tauri-shell` desktop baseline: `docs/03-verification/evidence/tauri-shell-visual-qa-2026-07-09-desktop-viewport-1440x960.jpg`
- `/app-shell/tauri-shell` mobile baseline: `docs/03-verification/evidence/tauri-shell-visual-qa-2026-07-09-mobile-viewport-390x844.jpg`
- QA report: `docs/03-verification/evidence/tauri-shell-visual-qa-baseline-2026-07-09.json`
- Human-readable report: `docs/03-verification/evidence/TAURI-SHELL-VISUAL-QA-BASELINE-2026-07-09.md`
- Checked invariant: nonblank viewport, panel navigation, state lanes, evidence inspector, failure/recovery state, no horizontal overflow, authority boundary, next safe action, mobile fixed topbar action line, no script, no form, and no external activation.
- Browser policy note: direct `file://` inspection was blocked by browser policy, so visual QA uses the safer read-only `127.0.0.1` loopback route.
- Next gate: use this visual baseline before opening any Tauri build, local IPC, installer, install/update/rollback executor, connector, model, tool, deployment, messenger, or automation gate.

Tauri install / update / rollback readiness gate:

- Gate document: `docs/03-engineering/TAURI-INSTALL-UPDATE-ROLLBACK-READINESS-GATE.md`
- Contract check: `node bin/gpao-t.js control tauri-install-gate-check`
- Loopback routes: `GET /app-shell/tauri-install-gate` and `GET /app-shell/tauri-install-gate/verify`
- Required invariant: this gate is read-only and review-only. It may inspect package hardening, Tauri gate status, Tauri shell status, visual QA evidence, source files, and rollback substrate, but it must not install dependencies, run Cargo/Tauri build, bundle, sign, create an installer, execute install/update/rollback, activate IPC, download externally, mutate state, or activate connectors/models/tools.
- Next gate: prerequisite doctor and dry-run executor contract design only; real install/update/rollback execution remains blocked until explicit later approval.

Tauri prerequisite doctor and dry-run executor contract:

- Gate document: `docs/03-engineering/TAURI-PREREQUISITE-DOCTOR-AND-DRY-RUN-CONTRACT.md`
- Prerequisite checks: `node bin/gpao-t.js control tauri-prerequisite-doctor` and `node bin/gpao-t.js control tauri-prerequisite-doctor-check`
- Dry-run checks: `node bin/gpao-t.js control tauri-dry-run-contract` and `node bin/gpao-t.js control tauri-dry-run-contract-check`
- Loopback routes: `GET /app-shell/tauri-prerequisite-doctor`, `GET /app-shell/tauri-prerequisite-doctor/verify`, `GET /app-shell/tauri-dry-run-contract`, and `GET /app-shell/tauri-dry-run-contract/verify`
- Required invariant: prerequisite doctor is inspection-only and must not invoke Cargo, Tauri CLI, dependency installation, build, signing, installer creation, or IPC. Dry-run executor is contract-only and must not implement, invoke, write files, download externally, build, install, update, rollback, activate connectors/models/tools, deploy, open messenger, or start automation.
- Next gate: approval-gated dry-run executor implementation design only; real install/update/rollback execution remains blocked.
