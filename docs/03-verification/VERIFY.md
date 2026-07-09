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

Core work surface first slice:

- Standalone surface: `GET /work-surface` and `node bin/gpao-t.js control work-surface-html`
- State contract: `GET /work-surface/state` and `node bin/gpao-t.js control work-surface`
- Contract check: `GET /work-surface/verify` and `node bin/gpao-t.js control work-surface-check`
- Control Center integration: `control snapshot`, `control html`, `/control-center`, and `/app-shell` must include the `Work Surface` panel or allowed read-only routes.
- Visual baseline: `docs/03-verification/evidence/work-surface-visual-qa-baseline-2026-07-09.json` and `docs/03-verification/evidence/WORK-SURFACE-VISUAL-QA-BASELINE-2026-07-09.md`
- Confirmation UX baseline: `docs/03-verification/evidence/work-surface-confirmation-ux-qa-2026-07-09.json` and `docs/03-verification/evidence/WORK-SURFACE-CONFIRMATION-UX-QA-2026-07-09.md`
- Local draft preview baseline: `docs/03-verification/evidence/work-surface-local-draft-preview-qa-2026-07-09.json` and `docs/03-verification/evidence/WORK-SURFACE-LOCAL-DRAFT-PREVIEW-QA-2026-07-09.md`
- Visual screenshots:
  - Desktop viewport: `docs/03-verification/evidence/work-surface-visual-qa-2026-07-09-desktop-viewport-1440x960.jpg`
  - Mobile viewport: `docs/03-verification/evidence/work-surface-visual-qa-2026-07-09-mobile-viewport-390x844.jpg`
- Confirmation UX screenshots:
  - Desktop viewport: `docs/03-verification/evidence/work-surface-confirmation-ux-2026-07-09-desktop-viewport-1440x960.jpg`
  - Mobile viewport: `docs/03-verification/evidence/work-surface-confirmation-ux-2026-07-09-mobile-viewport-390x844.jpg`
- Local draft preview screenshots:
  - Desktop viewport: `docs/03-verification/evidence/work-surface-local-draft-preview-2026-07-09-desktop-viewport-1440x960.jpg`
  - Mobile viewport: `docs/03-verification/evidence/work-surface-local-draft-preview-2026-07-09-mobile-viewport-390x844.jpg`
- Required invariant: the surface may show a draft task input, preview thread, compact read-only task understanding summary, current task state, Context Mesh / Memory Wiki / T-cell candidate summary, Skill Pack route preview, model/tool route preview, authority/approval summary, confirmation card, first local draft preview, intent-match / needs-changes / hold confirmation flow, empty/blocked/review-needed preview states, and next safe action.
- Required understanding summary: the surface may include a read-only summary strip for understood task, context source, skill route, and execution boundary. The execution boundary card must remain locked and must not become an action control.
- Required readability interaction: the surface may include native HTML `details` / `summary` task readability sections for task brief, context/skill route, authority boundary, and a read-only checklist. This is no-script local inspection only and must not become a submit, model, tool, connector, approval-write, or dry-run action.
- Required confirmation UX: the surface may include a no-script confirmation card for understood input, Context Mesh evidence, Skill route, and Authority boundary. The card must state that nothing has executed yet and must not become a submit, approval-write, model, tool, connector, or external-send action.
- Required local draft preview: the surface may show the local preview structure for understood task, expected output, context to use, skill route, and locked execution state. It must include intent-match, needs-changes, hold, empty, blocked, and review-needed product-language states. It must not submit, generate live draft content, call a model, execute tools, activate connectors, send externally, install/update/rollback, promote durable memory, or write approval records in this slice.
- Required blocked boundary: the surface must not submit input, call external models, execute tools, activate connectors, write approval records, invoke dry-run, promote durable memory, apply self-growth, deploy, send through messenger, start recurring automation, include script, include form submission, or link to external URLs.
- Checked visual invariant: desktop/mobile evidence confirms nonblank viewport, draft input visibility, task state visibility, context/skill route readability, authority boundary visibility, next safe action visibility, no overflow, mobile topbar/action visibility, no script, no form, and no external activation.
- Next gate: the core work surface substrate is closed for the current read-only preview phase. The next major axis is Model Router boundary, not another work-surface/submission meta-gate. Live submission and all model/tool/connector execution remain blocked.

First Local Work Loop v1:

- Engineering document: `docs/03-engineering/FIRST-LOCAL-WORK-LOOP-V1.md`
- Core module: `src/core/first-local-work-loop.js`
- CLI surfaces: `node bin/gpao-t.js control work-surface-local-loop [text]` and `node bin/gpao-t.js control work-surface-local-loop-check [text]`
- Gateway routes: `POST /work-surface/local-loop` and `POST /work-surface/local-loop/verify`
- Work Surface integration: `node bin/gpao-t.js control work-surface`, `node bin/gpao-t.js control work-surface-html`, and `node bin/gpao-t.js control work-surface-check` must expose `data-first-local-work-loop="preview"` without writing records during render.
- Control Center integration: `control snapshot`, `control summary`, and `control html` must expose the first local loop preview inside the `Work Surface` panel and inspector.
- Local record invariant: explicit CLI/Gateway local-loop submission may write approval/audit JSONL records only under `.gpao-t/approval/*.jsonl` and must attach replay and rollback references. Browser rendering does not write records.
- Required blocked boundary: live model call, tool/CLI/MCP execution, connector activation, credential access, external send, paid action, destructive action, install/update/rollback execution, public release, durable memory promotion, and self-growth live apply remain blocked.
- Visual QA JSON: `docs/03-verification/evidence/first-local-work-loop-v1-visual-qa-2026-07-09.json`
- Visual QA report: `docs/03-verification/evidence/FIRST-LOCAL-WORK-LOOP-V1-VISUAL-QA-2026-07-09.md`
- Desktop screenshots:
  - `docs/03-verification/evidence/first-local-work-loop-v1-work-surface-desktop-1440x960.png`
  - `docs/03-verification/evidence/first-local-work-loop-v1-control-center-desktop-1440x960.png`
- Mobile screenshots:
  - `docs/03-verification/evidence/first-local-work-loop-v1-work-surface-mobile-390x844.png`
  - `docs/03-verification/evidence/first-local-work-loop-v1-control-center-mobile-390x844.png`
- CDP metrics:
  - `docs/03-verification/evidence/first-local-work-loop-v1-desktop-cdp-metrics-2026-07-09.json`
  - `docs/03-verification/evidence/first-local-work-loop-v1-mobile-cdp-metrics-2026-07-09.json`
- Required visual invariant: desktop/mobile CDP metrics must show nonblank viewport, no horizontal overflow, no script, no form, visible local loop, visible authority boundary, and visible next safe action.

Context Mesh admission target separation:

- Engineering document: `docs/03-engineering/CONTEXT-MESH-ADMISSION-TARGET-SEPARATION.md`
- Core policy: `src/core/context-admission-policy.js`
- Required invariant: generic Work Surface requests must use `general-runtime` even when the prior runtime active target is `release-file`.
- Required recovery invariant: explicit release-file follow-ups such as `그럼 배포파일은?` must still recover `release-file`.
- Required downgrade invariant: stale `release-file` Memory Wiki candidates may remain visible as `stale_supporting`, but `answerAnchorEligible` must be `false` and admission role must not be `anchor`.
- Required surface invariant: Work Surface / Control Center may show `주 맥락`, `보조 맥락`, or `이전 흐름 보조 맥락`; stale prior context must not be presented as the current main task.
- Required blocked boundary: this pass does not open model calls, tool/CLI/MCP execution, connector activation, external send, approval write beyond the already allowed local record substrate, paid/destructive action, public release, or durable memory promotion.
- Design track note: GPAO-T Design Reference based UI polish remains a separate product-quality track and must not be treated as completed by this admission fix.
- Regression checks: `node --test test/memory-wiki.test.js test/turn-kernel.test.js test/first-local-work-loop.test.js`.

Interactive Session Behavior v1:

- Engineering document: `docs/03-engineering/INTERACTIVE-SESSION-BEHAVIOR-V1.md`
- Core module: `src/core/session-workspace.js`
- CLI surfaces: `node bin/gpao-t.js control sessions`, `node bin/gpao-t.js control sessions-action <action> [session-id] [title/request]`, and `node bin/gpao-t.js control sessions-check`
- Gateway routes: `GET /sessions`, `GET /sessions/verify`, and `POST /sessions/action`
- Browser-local preview routes: `GET /sessions` and `GET /sessions/verify`
- Required action invariant: `new_session`, `select_session`, `rename`, `archive`, `restore`, `mark_delete_pending`, and `cancel_delete_pending` may write only local session workspace state plus local audit events.
- Required deletion invariant: permanent delete remains blocked; delete flows must use recoverable `delete_pending` first.
- Required Work Surface invariant: active local session state must feed the left session rail and center active work session without shrinking the central conversation/composer area.
- Required blocked boundary: live model call, tool/CLI/MCP execution, connector activation, credential access, external send, paid/destructive action, public release, permanent delete, and durable memory promotion remain blocked.
- Visual evidence:
  - `docs/03-verification/evidence/interactive-session-behavior-v1-work-surface-desktop-1440x960.png`
  - `docs/03-verification/evidence/interactive-session-behavior-v1-work-surface-mobile-390x844.png`
  - `docs/03-verification/evidence/interactive-session-behavior-v1-visual-qa-2026-07-09.json`
  - `docs/03-verification/evidence/INTERACTIVE-SESSION-BEHAVIOR-V1-VISUAL-QA-2026-07-09.md`

Work Surface Execution Governance Flow v1:

- Engineering document: `docs/03-engineering/WORK-SURFACE-EXECUTION-GOVERNANCE-FLOW-V1.md`
- Core module: `src/core/work-surface-execution-flow.js`
- CLI surfaces: `node bin/gpao-t.js control work-surface-execution-flow [text]`, `node bin/gpao-t.js control work-surface-execution-confirmation [matches_intent|needs_changes|hold]`, `node bin/gpao-t.js control work-surface-execution-flow-check [text]`, and `node bin/gpao-t.js control work-surface-execution-record [text] matches_intent`
- Gateway routes: `GET /work-surface/execution-flow`, `GET /work-surface/execution-flow/confirmation`, `GET /work-surface/execution-flow/verify`, and `POST /work-surface/execution-flow/record`
- Work Surface integration: `executionGovernanceFlow` must expose proposal, confirmation, local record, replay, and rollback stages in Korean product language.
- Required confirmation invariant: `confirmationControl` must show `의도와 맞음`, `수정 필요`, and `보류`; only `matches_intent` can allow local approval/audit JSONL record write.
- Required local-record invariant: browser rendering must not write records during page load. The only browser write path is the same-origin `data-local-confirmation-form="approval-audit-record"` form posting to `POST /work-surface/execution-flow/record` after `의도와 맞음`; it may write only local approval/audit JSONL records and must return a result page that keeps live execution blocked.
- Required blocked boundary: live model call, tool/CLI/MCP execution, connector activation, credential access, external send, paid/destructive action, public release, and durable memory promotion remain blocked.
- Visual evidence:
  - `docs/03-verification/evidence/work-surface-execution-governance-flow-v1-desktop-1440x960.png`
  - `docs/03-verification/evidence/work-surface-execution-governance-flow-v1-mobile-390x844.png`
  - `docs/03-verification/evidence/work-surface-execution-governance-flow-v1-qa-2026-07-09.json`
  - `docs/03-verification/evidence/work-surface-execution-confirmation-control-v1-desktop-1440x960.png`
  - `docs/03-verification/evidence/work-surface-execution-confirmation-control-v1-mobile-390x844.png`
  - `docs/03-verification/evidence/work-surface-execution-confirmation-control-v1-qa-2026-07-09.json`
  - `docs/03-verification/evidence/work-surface-stage-3-complete-desktop-1440x960.png`
  - `docs/03-verification/evidence/work-surface-stage-3-complete-mobile-390x844.png`
  - `docs/03-verification/evidence/work-surface-stage-3-record-result-desktop-1440x960.png`
  - `docs/03-verification/evidence/work-surface-stage-3-record-result-mobile-390x844.png`
  - `docs/03-verification/evidence/work-surface-stage-3-complete-qa-2026-07-09.json`

Model Router boundary:

- CLI surface: `node bin/gpao-t.js adapters model-router-boundary [text]`
- CLI check: `node bin/gpao-t.js adapters model-router-boundary-check`
- Policy surface: `node bin/gpao-t.js adapters model-router-policy [text]`
- Policy check: `node bin/gpao-t.js adapters model-router-policy-check`
- Gateway routes: `GET /adapters/model-router-boundary`, `GET /adapters/model-router-boundary/verify`, `GET /adapters/model-router-policy`, and `GET /adapters/model-router-policy/verify`
- Control Center integration: `control snapshot`, `control summary`, and `control html` must expose the router boundary and policy through the `Model / Tool Adapters` panel.
- Required invariant: the boundary may show route profile, selected preview adapter, provider boundary, latency budget, cost policy, fallback chain, audit/replay/rollback references, and blocked model actions.
- Required blocked boundary: it must not call providers, read or write secrets, send network requests, spend tokens, store model output, activate tools, promote durable memory, invoke replay, write audit records, or mutate provider configuration in this slice.
- Required policy invariant: the policy may show request-type route profiles, speed/quality/cost/risk criteria, Context Mesh task-packet model-input candidate conditions, fallback failure states, model-output-to-tool boundary, and replay/audit criteria. It must not let model output become tool/CLI/MCP execution authority.
- Cleanup note: duplicate workspace note files ending in ` 2.md` are cleanup candidates only and should not be deleted during feature work.

Connector / Tool Governance:

- CLI surface: `node bin/gpao-t.js connectors tool-governance`
- CLI check: `node bin/gpao-t.js connectors tool-governance-check`
- Gateway routes: `GET /connectors/tool-governance` and `GET /connectors/tool-governance/verify`
- Control Center integration: `control snapshot`, `control summary`, and `control html` must expose execution-candidate classes, authority tiers, model-output proposal boundary, approval boundary, audit/replay/rollback references, and blocked actions through the `Connectors` panel.
- Required invariant: the governance proof may classify tool, CLI, MCP, and connector candidates, map them to `read_only`, `dry_run`, `write`, `external_send`, `destructive`, and `paid_action` tiers, and describe OpenClaw-inspired gateway/adapter/tool substrate under GPAO-T authority precedence.
- Required blocked boundary: it must not execute tools, run CLI commands, invoke MCP, activate connectors, send external network requests, read or write credentials, spend money, perform destructive actions, write approval records, invoke replay/rollback, or promote durable memory.

Execution proposal confirmation / approval packet validation:

- CLI surface: `node bin/gpao-t.js approval execution-proposal [text]`
- CLI check: `node bin/gpao-t.js approval execution-proposal-check`
- Audit design surface: `node bin/gpao-t.js approval audit-write-design [text]`
- Audit design check: `node bin/gpao-t.js approval audit-write-design-check`
- Approval record write UX surface: `node bin/gpao-t.js approval approval-record-write-ux [text]`
- Approval record write UX check: `node bin/gpao-t.js approval approval-record-write-ux-check`
- Local record substrate surfaces: `node bin/gpao-t.js approval local-record-substrate`, `node bin/gpao-t.js approval local-record-substrate-check`, `node bin/gpao-t.js approval record-write [text]`, `node bin/gpao-t.js approval audit-write [text]`, `node bin/gpao-t.js approval records`, `node bin/gpao-t.js approval audit-records`, and `node bin/gpao-t.js approval replay [record-id]`
- Gateway routes: `GET /approval/execution-proposal`, `GET /approval/execution-proposal/verify`, `GET /approval/audit-write-design`, `GET /approval/audit-write-design/verify`, `GET /approval/approval-record-write-ux`, `GET /approval/approval-record-write-ux/verify`, `GET /approval/local-record-substrate`, `GET /approval/local-record-substrate/verify`, `POST /approval/local-records/write`, `GET /approval/local-records`, `GET /approval/local-audit-records`, and `GET /approval/local-records/replay`
- Control Center integration: `control snapshot`, `control summary`, and `control html` must expose the `Execution Approval` panel with proposal, authority legend, approval packet validation, planned audit items, local approval/audit JSONL record status, replay reference, blocked actions, and next safe action.
- Work surface integration: `control work-surface`, `control work-surface-html`, and `control work-surface-check` must expose execution proposal confirmation, planned audit items, approval record preview, local JSONL record counts, latest replay reference, and blocked authority boundaries after the local draft preview and before any execution action.
- Required proposal invariant: proposal source, tool kind, action type, authority level, expected effect, risk, and rollback reference must be visible before any future invocation.
- Required Korean UX invariant: authority tiers must use product-language labels `읽기 전용`, `미리보기만`, `저장 전 확인`, `외부 전송 전 확인`, `되돌리기 어려움`, and `비용 발생 가능`; each tier must pair label, icon, color/tone role, and short explanation.
- Required validation invariant: approval packet validation must list required fields, missing-field rejection, authority-level rejection, risk visibility, rollback requirement, and confirmation-before-invocation.
- Required local record invariant: `기록 예정 항목` / `기록될 예정인 항목` must remain visible. Approval and audit records may be written only to `.gpao-t/approval/*.jsonl`, may be replay-read locally, and must include proposal id, source, requested action, authority level, expected effect, risk, rollback reference, confirmation state, audit reference, and replay reference.
- Required audit target invariant: planned audit items must include proposal id, source, requested action, authority level, expected effect, risk, rollback reference, and user confirmation state.
- Required approval record UX invariant: `승인 기록 저장 전 확인`, `저장될 항목 미리보기`, and the prior `쓰기 잠금` state language must remain understandable in the UI. Approval record write is local-record-only. It may create/read `.gpao-t/approval/approval-records.jsonl` and `.gpao-t/approval/audit-records.jsonl`; it must not invoke dry-run, execute commands, mutate user files outside the record store, activate connectors, access credentials, send externally, spend money, perform destructive actions, publish publicly, or promote durable memory.
- Required design-reference invariant: approval/execution UI must apply the GPAO-T design reference: Codex-level work/chat UX, compact inline state, reviewable result, safe next action, and Claude-Code-level permission/execution governance, preview/confirmation/approval/audit/replay/rollback separation, and hidden-execution prevention.
- Visual QA evidence: `docs/03-verification/evidence/execution-approval-ux-qa-2026-07-09.json`, `docs/03-verification/evidence/EXECUTION-APPROVAL-UX-QA-2026-07-09.md`, `docs/03-verification/evidence/audit-write-design-qa-2026-07-09.json`, `docs/03-verification/evidence/AUDIT-WRITE-DESIGN-QA-2026-07-09.md`, `docs/03-verification/evidence/approval-record-write-ux-qa-2026-07-09.json`, and `docs/03-verification/evidence/APPROVAL-RECORD-WRITE-UX-QA-2026-07-09.md`.
- Required visual invariant: desktop and mobile must preserve readable Korean wrapping, compact but calm card density, no horizontal overflow, visible authority boundary, visible next safe action, and no script/form/external activation. Mobile checks must keep the fixed topbar action line and authority cards readable.
- Required visual invariant: `로컬 승인/감사 기록`, record counts, latest replay reference, and rollback reference must be visible in Control Center and work-surface. Local JSONL approval/audit write is allowed; dry-run invocation, tool/CLI/MCP execution, connector activation, credential access, external send, paid/destructive action, public release, and durable memory promotion remain closed.
- Visual Polish Pass 002 evidence: `docs/03-verification/evidence/visual-polish-pass-002-control-center-desktop-1440x960.png`, `docs/03-verification/evidence/visual-polish-pass-002-control-center-mobile-390x844.png`, `docs/03-verification/evidence/visual-polish-pass-002-work-surface-desktop-1440x960.png`, and `docs/03-verification/evidence/visual-polish-pass-002-work-surface-mobile-390x844.png`.
- Visual Polish Pass 002 note: screenshots were captured before the final wording cleanup that replaced remaining `design only` / enum-like labels with Korean product language. The final HTML contract is `docs/03-verification/evidence/visual-polish-pass-002-control-center.html`, and tests/serve-check verify the updated no-script, no-overflow, local-record-substrate, and blocked-authority markers.

Work surface submission decision gate:

- Gate document: `docs/03-engineering/WORK-SURFACE-SUBMISSION-DECISION-GATE.md`
- Contract check: `node bin/gpao-t.js control work-surface-submission-gate-check`
- Loopback routes: `GET /work-surface/submission-gate` and `GET /work-surface/submission-gate/verify`
- Required invariant: the gate defines input packet schema, immediate preview state, Context Mesh attachment, Skill Pack route attachment, authority boundary, pre-submit user confirmation, review/block conditions, and stop line.
- Required blocked boundary: live model call, tool/CLI/MCP execution, connector activation, external network/send, approval write, install/update/rollback, durable memory promotion, self-growth apply, deployment, messenger, and automation remain blocked.
- Next gate: submission validation and confirmation design. Do not implement live submission until that separate gate is explicit and verified.

Work surface submission validation and confirmation gate:

- Gate document: `docs/03-engineering/WORK-SURFACE-SUBMISSION-VALIDATION-CONFIRMATION-GATE.md`
- Contract check: `node bin/gpao-t.js control work-surface-submission-validation-gate-check`
- Loopback routes: `GET /work-surface/submission-validation-gate` and `GET /work-surface/submission-validation-gate/verify`
- Required invariant: the gate validates required fields, empty input, input length, risk signals, Context Mesh preview attachment, Skill route preview attachment, Authority preview attachment, and confirmation card state.
- Required confirmation boundary: the confirmation card means preview review only. It must not open live submission, call a model, execute tools/CLI/MCP, activate connectors, send externally, write approval records, install/update/rollback, promote durable memory, or apply self-growth.
- Documentation alignment: README freshness warnings are tracked as documentation alignment, not execution permission.
- Stop rule: do not split submission meta-gates further after this gate. Move next to work-surface confirmation UX or first local draft preview.

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
- Implementation design checks: `node bin/gpao-t.js control tauri-dry-run-design` and `node bin/gpao-t.js control tauri-dry-run-design-check`
- Pure plan checks: `node bin/gpao-t.js control tauri-dry-run-plan` and `node bin/gpao-t.js control tauri-dry-run-plan-check`
- Preview checks: `node bin/gpao-t.js control tauri-dry-run-preview` and `node bin/gpao-t.js control tauri-dry-run-preview-check`
- Invocation approval checks: `node bin/gpao-t.js control tauri-dry-run-invocation-approval` and `node bin/gpao-t.js control tauri-dry-run-invocation-approval-check`
- Approval storage checks: `node bin/gpao-t.js control tauri-dry-run-approval-storage` and `node bin/gpao-t.js control tauri-dry-run-approval-storage-check`
- Approval write gate checks: `node bin/gpao-t.js control tauri-dry-run-approval-write-gate` and `node bin/gpao-t.js control tauri-dry-run-approval-write-gate-check`
- Loopback routes: `GET /app-shell/tauri-prerequisite-doctor`, `GET /app-shell/tauri-prerequisite-doctor/verify`, `GET /app-shell/tauri-dry-run-contract`, `GET /app-shell/tauri-dry-run-contract/verify`, `GET /app-shell/tauri-dry-run-design`, `GET /app-shell/tauri-dry-run-design/verify`, `GET /app-shell/tauri-dry-run-plan`, `GET /app-shell/tauri-dry-run-plan/verify`, `GET /app-shell/tauri-dry-run-preview`, `GET /app-shell/tauri-dry-run-preview/verify`, `GET /app-shell/tauri-dry-run-invocation-approval`, `GET /app-shell/tauri-dry-run-invocation-approval/verify`, `GET /app-shell/tauri-dry-run-approval-storage`, `GET /app-shell/tauri-dry-run-approval-storage/verify`, `GET /app-shell/tauri-dry-run-approval-write-gate`, and `GET /app-shell/tauri-dry-run-approval-write-gate/verify`
- Required invariant: prerequisite doctor is inspection-only and must not invoke Cargo, Tauri CLI, dependency installation, build, signing, installer creation, or IPC. Dry-run executor is contract-only and must not implement, invoke, write files, download externally, build, install, update, rollback, activate connectors/models/tools, deploy, open messenger, or start automation.
- Required implementation-design invariant: dry-run implementation design must keep `implementationStatus` as `design_only`, `executorImplemented` and `executorInvoked` as `false`, and writes, commands, external network, IPC, build, install, update, and rollback blocked.
- Required pure-plan invariant: dry-run plan/verify/preview may create JSON objects only. `purity` must be `pure_object_no_write_no_command_no_network_no_ipc`, plan execution mode must be `plan_only_not_invoked`, preview execution mode must be `not_invoked`, planned commands must be `not_executed`, planned writes must be `not_written`, and install/update/rollback, Tauri build, dependency install, IPC, external network, connector/model/tool activation must remain blocked.
- Required invocation-approval invariant: invocation approval contract may define future approval packet fields only. `contractMode` must be `approval_contract_only_no_invocation`, `invocationStatus` must be `not_invoked`, approval state must remain `not_requested`, explicit approval and executor existence must remain `missing_by_design`, audit writes must remain `false`, and real install/update/rollback, Tauri build, dependency install, IPC, external network, connector/model/tool activation, deployment, messenger, and automation must remain blocked.
- Required approval-storage invariant: approval-record storage design may define local path, schema, lifecycle, replay/audit/rollback references, and write gate boundary only. It must keep approval record writes, directory creation, approval-store reads, dry-run invocation, command execution, file mutation, Tauri build, dependency install, IPC, external network, connector/model/tool activation, and install/update/rollback execution blocked.
- Required approval-write-gate invariant: write gate design may define packet requirements, missing-field rejection, duplicate/expiry/scope controls, preview/verify prerequisites, post-write reference expectations, and recovery states only. It must keep the write gate unimplemented and uninvoked, approval record writes disabled, dry-run invocation, command execution, file mutation, Tauri build, dependency install, IPC, external network, connector/model/tool activation, and install/update/rollback execution blocked.
- Required Control Center approval/preview UX invariant: `control snapshot`, `control summary`, and static Control Center HTML must expose the dry-run plan, user preview, invocation approval, approval storage, and write-gate statuses in the `Approval / Preview` panel. This is user-visible preview integration only. Approval record writes, dry-run invocation, command execution, file mutation, Tauri build, dependency install, IPC, external network, connector/model/tool activation, and install/update/rollback execution remain blocked.
- Approval/preview visual UX evidence: `docs/03-verification/evidence/control-center-approval-preview-ux-qa-2026-07-09.json` and `docs/03-verification/evidence/CONTROL-CENTER-APPROVAL-PREVIEW-UX-QA-2026-07-09.md`.
- Approval/preview visual UX screenshots:
  - Desktop viewport: `docs/03-verification/evidence/control-center-approval-preview-ux-2026-07-09-desktop-viewport-1440x960.png`
  - Mobile viewport: `docs/03-verification/evidence/control-center-approval-preview-ux-2026-07-09-mobile-viewport-390x844.png`
  - Desktop focused approval panel: `docs/03-verification/evidence/control-center-approval-preview-ux-2026-07-09-desktop-focused-1440x960.png`
  - Mobile focused approval panel: `docs/03-verification/evidence/control-center-approval-preview-ux-2026-07-09-mobile-focused-390x844.png`
- Required approval/preview visual UX invariant: five stages must be visually distinct, blocked actions must read as calm locked states, the panel must state `아직 실행된 것은 없음`, next safe action must remain visible, mobile fixed topbar action line must remain visible, no horizontal overflow is allowed, and no script, form, external link, write, invocation, build, install/update/rollback execution, IPC, network, or connector/model/tool activation may open.
- Packaged desktop planning review: `docs/03-engineering/PACKAGED-DESKTOP-PLANNING-REVIEW.md`, `node bin/gpao-t.js control packaged-desktop-review`, `node bin/gpao-t.js control packaged-desktop-review-check`, `GET /app-shell/packaged-desktop-review`, and `GET /app-shell/packaged-desktop-review/verify`.
- Required packaged desktop planning invariant: the review must list closed read-only/preview surfaces, keep approval record write, dry-run invocation, Tauri build, install/update/rollback execution, IPC, external network, and connector/model/tool activation blocked, define minimum conditions before any packaged desktop build or executor, and set a stop-line against further meta-gate repetition.
- Next gate: return to user-facing GPAO-T core work surface planning/build. Do not add another approval/write/dry-run/packaged-desktop meta-gate unless a concrete mutating action is explicitly approved.

GPAO-T design reference gate:

- Runtime contract: `node bin/gpao-t.js control design-reference-gate [slice]`
- Contract check: `node bin/gpao-t.js control design-reference-gate-check`
- Loopback routes: `GET /control-center/design-reference-gate` and `GET /control-center/design-reference-gate/verify`
- Control Center panel: `Design Reference`
- Required axes: Codex급 시각/대화 UX, Claude Code급 운영/권한 UX, 시각 디자인 전체, 한국어 UI/UX, 톤앤매너 통일성.
- Required report fields: `appliedSurfaces`, `visualAdjustments`, `desktopMobileFindings`, `codexLevelFit`, `claudeCodeLevelFit`, `remainingAestheticRisks`, and `userPerceivedQualityRisk`.
- Required visual evidence: desktop screenshot, mobile screenshot, full-page screenshot when needed, human visual polish review, color quality review, layout rhythm review, icon alignment review, Korean typography / line break review, tone-and-manner consistency review, and user-perceived product quality risk.
- Visual QA evidence: `docs/03-verification/evidence/design-reference-gate-qa-2026-07-09.json` and `docs/03-verification/evidence/DESIGN-REFERENCE-GATE-QA-2026-07-09.md`.
- Visual QA screenshots:
  - Desktop viewport: `docs/03-verification/evidence/design-reference-gate-2026-07-09-control-center-desktop-1440x960.png`
  - Mobile viewport: `docs/03-verification/evidence/design-reference-gate-2026-07-09-control-center-mobile-390x844.png`
  - Desktop full page: `docs/03-verification/evidence/design-reference-gate-2026-07-09-control-center-desktop-full-1440x960.png`
  - Mobile full page: `docs/03-verification/evidence/design-reference-gate-2026-07-09-control-center-mobile-full-390x844.png`
- Required invariant: future UI/UX slices may not close with "design reference applied" unless the affected screens have screenshot evidence and a human-eye visual polish, color, layout, icon, Korean typography, tone, and product-quality-risk review.
- Required blocked boundary: actual approval record write, audit write, dry-run invocation, tool/CLI/MCP execution, connector activation, credential access, external send, paid/destructive action, and durable memory promotion remain blocked.

GPAO-T Design Reference Realization Pass 001:

- QA report: `docs/03-verification/evidence/design-realization-pass-001-qa-2026-07-09.json`
- Human-readable report: `docs/03-verification/evidence/DESIGN-REALIZATION-PASS-001-QA-2026-07-09.md`
- Screens changed: Control Center Work Surface panel, Control Center Execution Approval panel, Work Surface, Execution Approval / Approval Record Write UX surfaces, and Design Reference Gate tone system.
- Visual evidence:
  - Control Center desktop: `docs/03-verification/evidence/design-realization-pass-001-control-center-desktop-1440x960.png`
  - Control Center mobile: `docs/03-verification/evidence/design-realization-pass-001-control-center-mobile-390x844.png`
  - Work Surface desktop: `docs/03-verification/evidence/design-realization-pass-001-work-surface-desktop-1440x960.png`
  - Work Surface mobile: `docs/03-verification/evidence/design-realization-pass-001-work-surface-mobile-390x844.png`

GPAO-T Design Realization Pass 002:
- QA report: `docs/03-verification/evidence/design-realization-pass-002-qa-2026-07-09.json`
- Human-readable report: `docs/03-verification/evidence/DESIGN-REALIZATION-PASS-002-QA-2026-07-09.md`
- Design issue classification: `docs/02-design/DESIGN-REALIZATION-PASS-002-ISSUE-CLASSIFICATION.md`
- Design Delta Report: `docs/02-design/DESIGN-DELTA-REPORT-PASS-002.md`
- Open Design preview: `http://127.0.0.1:7456/api/projects/gpao-t-design-realization-pass-002/raw/index.html`
- Open Design artifact source: `/Users/jyp/Documents/Playground 2/open-design/.od/projects/gpao-t-design-realization-pass-002/index.html`
- Visual evidence:
  - Open Design desktop: `docs/03-verification/evidence/design-realization-pass-002-open-design-desktop-1440x960.png`
  - Open Design mobile: `docs/03-verification/evidence/design-realization-pass-002-open-design-mobile-390x844.png`
  - Control Center desktop: `docs/03-verification/evidence/design-realization-pass-002-control-center-desktop-1440x960.png`
  - Control Center mobile: `docs/03-verification/evidence/design-realization-pass-002-control-center-mobile-390x844.png`
  - Work Surface desktop: `docs/03-verification/evidence/design-realization-pass-002-work-surface-desktop-1440x960.png`
  - Work Surface mobile: `docs/03-verification/evidence/design-realization-pass-002-work-surface-mobile-390x844.png`
- Required threshold: visual polish >= 4.4, color quality >= 4.4, Korean typography >= 4.4, tone-and-manner >= 4.5, authority clarity >= 4.6, overall product feel >= 4.5.
- Checked invariant: primary UI does not expose raw labels such as `cli.dry_run`, `actual_tool_execution`, `dry_run`, `design only`, `Tool`, `Action`, `blocked_until`, or English pack names. Desktop/mobile evidence preserves no-script, no-form, no external link, no overflow, next safe action visibility, authority boundary visibility, and Korean-first product language.
- Closed boundary: no new execution function is opened. Actual approval write expansion, audit write expansion, dry-run invocation, tool/CLI/MCP execution, connector activation, model call, credential access, external send, paid/destructive action, and durable memory promotion remain blocked.
- Applied tokens: `#F5F7F2`, `#EEF3EC`, `#FBFCF8`, `#DDE5DC`, `#BFD0C0`, `#17211B`, `#526257`, `#1F7A64`, `#2E6DAE`, `#A86F1D`, `#A9473F`, and `#6E5AA8`.
- Required score threshold: human visual QA, visual polish, color quality, layout rhythm, Korean typography, and tone-and-manner must all be 4.0 or higher before calling the pass ready.
- QA result: human visual QA 4.2, visual polish 4.1, color quality 4.4, layout rhythm 4.1, Korean typography 4.2, tone-and-manner 4.2.
- Remaining risk: Control Center technical sidebar language, English pack descriptions in Work Surface right rail, fallback icon system, and one fallback desktop capture dimension should be improved in the next visual readiness pass.
- Required blocked boundary: actual approval record write, audit write, dry-run invocation, tool/CLI/MCP execution, connector activation, credential access, external send, paid/destructive action, and durable memory promotion remain blocked.

Session Workspace Repair Pass 001:
- Implementation contract: `docs/02-design/GPAO-T-SESSION-WORKSPACE-DESIGN-REPAIR-PACK-v0.1-ko.md`
- QA report: `docs/03-verification/evidence/session-workspace-repair-pass-001-qa-2026-07-09.json`
- Human-readable report: `docs/03-verification/evidence/SESSION-WORKSPACE-REPAIR-PASS-001-QA-2026-07-09.md`
- Implemented IA: left session rail -> center active work session -> right context / authority / execution inspector.
- Session states: `active` = 진행 중, `draft` = 초안, `waiting_approval` = 확인 필요, `blocked` = 멈춤, `archived` = 보관됨, `delete_pending` = 삭제 대기.
- Session actions: 새 세션, 세션 검색, 이름 변경, 보관, 복구, 삭제 대기, 삭제 대기 취소. Permanent delete remains closed.
- Work Session change: central screen now presents session title/state, user request thread, GPAO-T understanding, Context Mesh / Skill / Model preview, local draft preview, execution boundary, and composer.
- Control Center change: Control Center is kept as a secondary inspector and now summarizes the session workspace IA instead of becoming the primary product face.
- Inspector change: right inspector exposes 맥락, 권한, 모델, 도구, 기록, 되돌리기 as reviewable depth areas.
- Visual evidence:
  - Desktop Work Session: `docs/03-verification/evidence/session-workspace-repair-pass-001-work-session-desktop-1440x960.png`
  - Desktop Control Center: `docs/03-verification/evidence/session-workspace-repair-pass-001-control-center-desktop-1440x960.png`
  - Mobile Work Session: `docs/03-verification/evidence/session-workspace-repair-pass-001-work-session-mobile-390x844.png`
  - Mobile session list sheet: `docs/03-verification/evidence/session-workspace-repair-pass-001-mobile-session-list-sheet-390x844.png`
  - Mobile inspector sheet: `docs/03-verification/evidence/session-workspace-repair-pass-001-mobile-inspector-sheet-390x844.png`
  - Mobile inspector sheet element: `docs/03-verification/evidence/session-workspace-repair-pass-001-mobile-inspector-sheet-element.png`
- Visual QA result: human visual QA 4.45, visual polish 4.35, color quality 4.45, layout rhythm 4.5, Korean typography 4.45, tone-and-manner 4.45, authority clarity 4.7, overall product feel 4.45.
- Checked invariant: no messenger/channel-primary UI, no generic dashboard primary surface, no permanent delete, no raw enum in the central user-facing work session, no forced mobile three-column layout, no script/form/external activation, no model call, no tool/CLI/MCP execution, no connector activation, no external send, and no durable memory promotion.
- Remaining risk: inspector-depth technical references, English `Work Surface` product identifier, hash-anchor mobile sheet QA, and favicon 404 cleanup should be handled in a later polish/interactive shell pass.

Conversation Workspace Repair 001:
- Trigger: actual OpenClaw chat/dashboard inspection showed GPAO-T should keep operational rail discipline but must give the center a broad working conversation surface. The previous GPAO-T Work Session was too card-heavy and made the user workspace/composer feel too small.
- QA report: `docs/03-verification/evidence/conversation-workspace-repair-001-qa-2026-07-09.json`
- Human-readable report: `docs/03-verification/evidence/CONVERSATION-WORKSPACE-REPAIR-001-QA-2026-07-09.md`
- Reference evidence:
  - OpenClaw real chat: `docs/03-verification/evidence/openclaw-control-real-chat-reference-1440x960.png`
  - GPAO-T before correction: `docs/03-verification/evidence/gpao-t-before-card-heavy-workspace-1440x960.png`
- Implementation change: active Work Session now uses `data-workspace-layout="conversation-first"` and `data-work-conversation-canvas="wide"`, with a large bottom composer. The left session rail and right inspector are narrower so the center has priority.
- Visual evidence:
  - Desktop Work Session: `docs/03-verification/evidence/conversation-workspace-repair-001-work-session-desktop-1440x960.png`
  - Mobile Work Session: `docs/03-verification/evidence/conversation-workspace-repair-001-work-session-mobile-390x844.png`
  - Desktop snapshot: `docs/03-verification/evidence/conversation-workspace-repair-001-desktop-snapshot.md`
  - Mobile snapshot: `docs/03-verification/evidence/conversation-workspace-repair-001-mobile-snapshot.md`
- Checked invariant: nonblank desktop/mobile viewport, session rail visible on desktop, center active work session dominant, large composer visible, mobile composer visible in first viewport, authority boundary visible, no horizontal overflow observed, no script/form/external activation, and no model/tool/connector execution.
- Remaining risk: center preview blocks are still somewhat card-like and should be softened into lighter inline work notes in the next product-grade design pass. Right inspector language also needs further product polish.
