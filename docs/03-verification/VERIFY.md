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
