# GPAO-T Runtime Skeleton

Status: first local implementation target

GPAO-T is the Growth Personal AI Operating System with T-cell theory as kernel doctrine.

This directory is intentionally separate from `beai-harness-for-codex`. BEAI/GPAO for Codex remains the development harness and evidence layer; `gpao-t` is the new product runtime target.

GPAO-T is now treated as an independent local product repository. Local git is the source-control and rollback substrate for product source, docs, tests, schemas, and fixtures. This does not imply public GitHub publication, deployment, installer execution, external account setup, or connector activation.

Development guidance is maintained in `docs/DEVELOPMENT-PRINCIPLES.md`: GPAO-T should absorb OpenClaw-grade local runtime stability, Codex-grade work rhythm, and prove its originality through concrete T-cell / Context Mesh / Memory Wiki / Self-Growth runtime behavior.

Local Control Center design guidance is maintained in `docs/LOCAL-CONTROL-CENTER-DESIGN-RECIPE.md`. It adapts BEAI Harness `design.md` into the GPAO-T visual UI contract before any desktop/web surface is built.

Control Center human-readability QA is maintained in `docs/03-verification/CONTROL-CENTER-HUMAN-READABILITY-CHECK.md`. It keeps first-scan clarity, state comprehension, authority visibility, next-safe-action visibility, mobile action visibility, and no-script/no-external-activation boundaries explicit before app-shell work.

The app-shell transition is governed by `docs/03-engineering/APP-SHELL-DECISION-GATE.md`, the closed technology decision in `docs/03-engineering/APP-SHELL-TECHNOLOGY-DECISION.md`, and the packaged desktop boundary in `docs/03-engineering/TAURI-PACKAGED-DESKTOP-GATE.md`. GPAO-T's first app-shell target is a browser-local shell over `127.0.0.1` read-mostly HTTP; Tauri is the first packaged desktop target after browser-local proof; Electron is deferred. The current Tauri gate is a read-mostly boundary contract only, not a full Tauri app, packaging step, or install/update/rollback executor.

Skill ecosystem guidance is maintained in `docs/04-skill-ecosystem/GPAO-T-SKILL-ECOSYSTEM-MASTER-PLAN-ko.md`. GPAO-T skills must be research-grounded, practical, T-cell-shaped operating units, not prompt decorations or copied marketplace catalogs.

## First Slice

The first slice implements a local, dependency-free runtime skeleton:

- `GpaoTurnKernel`: deterministic pre-model turn sequence
- `GpaoSessionOverlay`: flow continuity above chat sessions
- `GpaoContextRuntime`: Memory Wiki / Context Mesh / T-cell stub
- `GpaoAdmissionPacket`: retrieved context to admitted T-cells
- `GpaoAuthorityRuntime`: approval boundary detection
- `GpaoModelRouter`: fast recovery vs balanced reasoning route
- `GpaoToolRuntime`: local-preview tool admission
- `Adapter Boundary`: local model/tool adapter registry and execution boundary
- `Connector Governance`: local connector registry and permission boundary
- `Install / Update / Rollback Hardening`: local operational readiness and recovery contract
- `Local Control Center Contract`: one snapshot for runtime, ops, memory, recovery, growth, adapters, connectors, and authority
- `Local Control Center Design Recipe`: BEAI design doctrine adapted to GPAO-T UI implementation
- `Control Center Human Readability Check`: first-scan clarity and no-script/local-inspection QA before app-shell transition
- `App Shell Decision Gate`: technology, authority, rollback, IPC/local-serving, screenshot, and recovery decisions before desktop shell implementation
- `Skill Ecosystem Registry`: research-grounded base skill packs, manifest standard, routing, readiness, and future runtime integration contract
- `Skill Candidate Atlas`: full skill production field, phased roadmap, and build queue before individual pack production
- `Skill Production Status`: phase-1 production gate for registry, routing, execution contract, quality gate, replay, growth signal, and authority boundary
- `Skill Execution Plan`: selected skill packs expanded into execution steps, artifact contracts, quality gates, authority boundaries, and replay signals
- `Skill Execution Adapter`: selected skill execution plans converted into local artifact drafts, quality gate results, replay evidence, and growth signal candidates
- `GpaoDoctor`: target health check
- `GpaoRuntime`: persisted `.gpao-t` state and audit events
- `GpaoLocalGateway`: local API contract for health, state, events, and turns
- `Memory Wiki`: source-linked candidate memory entries
- `Context Mesh Resolve`: retrieved T-cell candidates before admission
- `Admission Scoring`: explains why retrieved candidates are admitted or rejected
- `Replay Recovery View`: human-readable recovery report for wrong-anchor scenarios
- `Replay Recovery History`: local replay recovery records and repeated-pattern summary
- `Self-Growth Proposals`: review-only improvement candidates from replay-proven patterns
- `Growth Application Gates`: replay, approval, audit, and rollback review before any growth proposal can become live behavior

## Guided First Workflow

The first real user path is intentionally small and inspectable:

1. Start from the CLI command surface.
2. Preview one vague or follow-up request, such as `그럼 배포파일은?`.
3. Let `GpaoSessionOverlay` recover the active target.
4. Let `GpaoAdmissionPacket` admit only the relevant T-cells.
5. Let `GpaoAuthorityRuntime` keep distribution-like actions in local preview until approval.
6. Show a Korean user-visible state with the next safe action.
7. Verify the path with `npm run verify`.

This maps the BEAI scenario goal into this first runtime slice: route a vague request, expose the plan/trace, run checks, and make the result understandable without reading the whole codebase.

## Why This Starts Here

The product priority is not messenger UX. The priority is a fast, safe, local-first kernel that can recover user intent, select context, gate authority, route models, and produce a traceable task packet before any UI or connector grows around it.

## Commands

```sh
npm run check
npm test
npm run verify
node bin/gpao-t.js init
node bin/gpao-t.js doctor
node bin/gpao-t.js turn "그럼 배포파일은?"
node bin/gpao-t.js replay fixtures/replay/release-file-active-target.json
node bin/gpao-t.js replay-view fixtures/replay/release-file-active-target.json
node bin/gpao-t.js replay-record fixtures/replay/release-file-active-target.json
node bin/gpao-t.js recovery history
node bin/gpao-t.js recovery summary
node bin/gpao-t.js growth preview release-file
node bin/gpao-t.js growth propose release-file
node bin/gpao-t.js growth proposals
node bin/gpao-t.js growth gate release-file
node bin/gpao-t.js growth gate-record release-file requested
node bin/gpao-t.js growth gates
node bin/gpao-t.js growth gate-summary
node bin/gpao-t.js skill ecosystem
node bin/gpao-t.js skill atlas
node bin/gpao-t.js skill atlas phase-1
node bin/gpao-t.js skill roadmap
node bin/gpao-t.js skill build-queue phase-1
node bin/gpao-t.js skill production-status phase-1
node bin/gpao-t.js skill intent "디자인 좋은 웹앱을 만들어줘"
node bin/gpao-t.js skill manifest
node bin/gpao-t.js skill manual-first
node bin/gpao-t.js skill packs
node bin/gpao-t.js skill packs design
node bin/gpao-t.js skill inspect gpao-visual-design-pack
node bin/gpao-t.js skill route "디자인 좋은 웹앱을 만들어줘"
node bin/gpao-t.js skill execute-plan "디자인 좋은 웹앱을 만들어줘"
node bin/gpao-t.js skill execute "디자인 좋은 웹앱을 만들어줘"
node bin/gpao-t.js skill execute-record "디자인 좋은 웹앱을 만들어줘"
node bin/gpao-t.js skill execution-history
node bin/gpao-t.js skill execution-summary
node bin/gpao-t.js skill readiness
node bin/gpao-t.js connectors list
node bin/gpao-t.js connectors governance
node bin/gpao-t.js connectors review github.oauth read
node bin/gpao-t.js ops hardening
node bin/gpao-t.js ops hardening-record
node bin/gpao-t.js ops hardening-history
node bin/gpao-t.js ops hardening-summary
node bin/gpao-t.js adapters models
node bin/gpao-t.js adapters tools
node bin/gpao-t.js adapters plan "그럼 배포파일은?"
node bin/gpao-t.js control snapshot
node bin/gpao-t.js control summary
node bin/gpao-t.js control design
node bin/gpao-t.js control ui-contract
node bin/gpao-t.js control ui-snapshot
node bin/gpao-t.js control ui-validate
node bin/gpao-t.js control html
node bin/gpao-t.js control render .gpao-t/control-center/index.html
node bin/gpao-t.js control serve-contract
node bin/gpao-t.js control serve-check
node bin/gpao-t.js control serve 0
node bin/gpao-t.js control app-shell-contract
node bin/gpao-t.js control app-shell-state
node bin/gpao-t.js control app-shell-check
node bin/gpao-t.js control tauri-gate
node bin/gpao-t.js control tauri-gate-check
node bin/gpao-t.js state
node bin/gpao-t.js events
node bin/gpao-t.js memory capture "배포파일 meaning" "배포파일 means GPAO Operating Package / GPAO for OpenClaw in this product flow."
node bin/gpao-t.js memory list
node bin/gpao-t.js mesh resolve "그럼 배포파일은?"
node bin/gpao-t.js gateway POST /turn '{"input":{"text":"그럼 배포파일은?"}}'
```

## Current Boundary

This skeleton does not connect external accounts, configure OAuth, store tokens or secrets, deploy, publish, execute host mutations, send externally, automate recurring actions, or promote durable memory. Authority actions are represented as local preview gates only.

Local runtime evidence is stored under `.gpao-t/`:

- `.gpao-t/state/runtime.json`: active flow and runtime counters
- `.gpao-t/events/audit.jsonl`: local audit events for recovery and authority review
- `.gpao-t/memory/wiki.json`: Memory Wiki entries
- `.gpao-t/memory/tcell-candidates.jsonl`: T-cell candidates shaped from wiki entries
- `.gpao-t/recovery/history.jsonl`: replay recovery records and pattern evidence
- `.gpao-t/growth/proposals.jsonl`: review-only self-growth proposals
- `.gpao-t/growth/application-gates.jsonl`: local application gate reviews for self-growth proposals
- `.gpao-t/ops/install-hardening.jsonl`: local install/update/rollback readiness reviews

These files are local runtime state, not durable memory promotion and not external telemetry.
They are ignored by git and should not be committed as product source.

Memory Wiki entries are not automatically trusted. The flow is:

```text
capture -> Memory Wiki entry -> T-cell candidate -> Context Mesh resolve -> AdmissionPacket -> TaskPacket
```

This keeps stored memory separate from admitted current-turn context.

Admission results include:

- `admissionScore`: a compact score for current-turn usefulness
- `scoreBreakdown`: active target, input signal, mesh score, confidence, risk, and lifecycle signals
- `recoveryHint`: why to use, review, or reject the cell

Replay recovery views expose the same information without mutating runtime state.

Replay recovery history is local evidence. It helps detect repeated active-target recovery cases before any self-growth proposal, durable promotion, or OS rule mutation is considered.

Self-growth proposals are still local and review-only. They can describe a candidate operating principle, expected benefit, replay gate, and authority boundary, but they cannot promote memory, mutate OS rules, activate connectors, or take external action.

Growth Application Gates review whether a proposal has enough replay evidence, approval state, audit requirements, and rollback plan. Even when those review gates are visible, this slice keeps live mutation blocked:

- `growth gate <proposal-id|target>` previews application readiness without writing a record
- `growth gate-record <proposal-id|target> [approval-status]` writes a local review record
- `growth gates` lists recorded gate reviews
- `growth gate-summary` summarizes blocked live mutations for the Control Center
- `POST /growth/application-gate`, `POST /growth/application-gate/record`, `GET /growth/application-gates`, and `GET /growth/application-gates/summary` expose the same contract through the gateway

This keeps self-growth practical without letting a good proposal silently become a live OS rule.

Adapter Boundary keeps model freedom and tool safety separate:

- local model stubs can be selected for preview routing
- external model APIs are listed but blocked until provider setup and approval gates exist
- local preview tools can be admitted for draft/replay work
- external send, public release, deletion, secret write, and recurring automation remain blocked until explicit authority gates exist

This boundary is intentionally visible in `modelRoute`, `toolPlan`, and `adapterPlan` so a future Local Control Center can show which model/tool path was selected, which options were blocked, and why.

Connector Governance keeps account visibility separate from account execution:

- local file inspection can be reviewed as preview evidence
- OAuth connectors such as GitHub, Google Workspace, Notion, and Slack are listed but blocked until explicit setup and task approval exist
- connected does not mean executable
- readable does not mean writable
- write, send, recurring automation, secret storage, and connector activation remain blocked until replay, audit, rollback, and approval gates exist

This boundary is visible through `connectors list`, `connectors governance`, `connectors review <connector-id> [action]`, `GET /connectors`, `GET /connectors/governance`, and `POST /connectors/review`.

Install / Update / Rollback Hardening keeps operational confidence separate from real operations:

- `ops hardening` previews package, CLI, verify script, update, and rollback readiness
- `ops hardening-record` writes a local readiness review record
- `ops hardening-history` lists local hardening records
- `ops hardening-summary` summarizes the current hardening posture for the Control Center
- `GET /ops/install-hardening`, `POST /ops/install-hardening/record`, `GET /ops/install-hardening/history`, and `GET /ops/install-hardening/summary` expose the same contract through the gateway

This slice does not install GPAO-T, start a daemon, download updates, deploy, store secrets, or run destructive rollback. It only makes the safety gates visible before those executors exist.

Local Control Center readiness is exposed as data and a static UI reader, not as a daemon or desktop app yet:

- `control snapshot` returns full panel data for runtime, install/update/rollback readiness, memory, replay recovery, growth proposals/application gates, adapters, connectors, and authority
- `control summary` returns compact panel status, counts, and next safe action
- `control design` returns the Local Control Center design contract adapted from BEAI Harness `design.md`
- `control ui-contract` returns the UI schema and section contract that maps snapshot fields into visual sections
- `control ui-snapshot` returns the renderer-ready UI snapshot
- `control ui-validate` checks that the UI snapshot preserves required panel fields, visible status text, authority boundaries, and no external activation
- `control html` and `control render` now produce a no-script local inspection UI: panel anchor navigation, focus navigation, mobile next-safe-action strip, and expandable panel inspectors are interactive, but they do not start daemons, call models, connect accounts, execute tools, or mutate memory/growth state
- `control html` prints the static Local Control Center HTML reader to stdout
- `control render [output.html]` writes the static Local Control Center HTML reader to a local file
- `control serve-contract` returns the browser-safe loopback serving and screenshot verification contract
- `control serve-check` starts a temporary loopback preview server, checks `/health` and `/control-center`, then stops it
- `control serve [port]` starts an explicit `127.0.0.1` preview server for browser screenshot verification
- `control app-shell-contract` returns the browser-local app-shell first-slice contract
- `control app-shell-state` returns read-mostly shell state derived from `GET /health` and `GET /control-center/*`
- `control app-shell-html` renders the browser-local shell HTML with panel navigation, evidence inspection, failure/recovery state, and screenshot QA anchors
- `control app-shell-check` verifies the browser-local shell preserves no script, no POST form, no external URL, authority visibility, and failure/recovery markers
- `GET /control-center`, `GET /control-center/summary`, `GET /control-center/design`, `GET /control-center/ui-contract`, `GET /control-center/ui-snapshot`, and `GET /control-center/ui-validate` expose the same contracts through the local gateway handler
- `GET /app-shell`, `GET /app-shell/contract`, `GET /app-shell/state`, and `GET /app-shell/verify` expose the browser-local app-shell through the loopback preview server

This keeps the future Codex-like desktop surface light: the first visual layer reads the existing snapshot/design contracts before adding interactivity, daemon behavior, or external activation.

Browser-safe serving is local preview only. It binds to `127.0.0.1`, does not configure OAuth, does not call external models or tools, does not store secrets, does not deploy, and does not become a persistent daemon. The purpose is to capture desktop/mobile screenshots and verify visible state before interactive Control Center work.

Browser-local app-shell first slice is also local preview only. It reads `GET /health` and `GET /control-center/*`, supports panel navigation and evidence inspection, exposes failure/recovery states, and keeps screenshot QA visible. It now includes read-only state lanes for workflow, recovery, authority, and next action, plus per-panel state drilldowns. It blocks `POST` routes, connector/model/tool activation, install/update/rollback execution, durable memory promotion, self-growth application, deployment, messenger surfaces, and recurring automation.

The app-shell-specific visual baseline is stored separately from the older Control Center screenshots:

- `03-verification/evidence/app-shell-baseline-2026-07-09-desktop-viewport-1440x960.jpg`
- `03-verification/evidence/app-shell-baseline-2026-07-09-mobile-viewport-390x844.jpg`
- `03-verification/evidence/app-shell-screenshot-qa-baseline-2026-07-09.json`
- `03-verification/evidence/APP-SHELL-SCREENSHOT-QA-BASELINE-2026-07-09.md`

Skill Ecosystem readiness is exposed as data before live execution:

- `skill ecosystem` returns the product plan, base pack registry, and future runtime hook contract
- `skill manifest` returns the required manifest fields and automation policy
- `skill packs [category]` lists base packs or one category
- `skill inspect <skill-pack-id>` returns one pack's full operating contract
- `skill route <text>` selects advisory skill packs for the current request
- `skill execute-plan <text>` expands selected packs into execution steps, output artifacts, quality gates, authority boundaries, and replay signals
- `skill execute <text>` creates a local preview run with artifact drafts, quality gate results, replay evidence, and growth signal candidates
- `skill execute-record <text>` records that local preview evidence under `.gpao-t/skill-execution/history.jsonl`
- `skill execution-history` and `skill execution-summary` expose recorded skill execution evidence
- `skill production-status [phase]` verifies that phase skill candidates have become registered, routeable, executable, quality-gated, replay-backed, growth-aware, authority-bounded production packs
- `skill readiness` verifies every base pack has target problem, T-cell principle, research protocol, quality gates, replay cases, authority boundary, and growth signals

This keeps GPAO-T skills practical: a skill is accepted only when it maps research into an operating principle, execution procedure, quality gate, replay case, and growth signal. A selected skill is not treated as a vague recommendation; it must become a local execution contract that states what artifact will be produced, which quality gates block completion, which authority boundaries remain approval-gated, and which replay cases can improve the skill later.

Skill execution remains local-first. It drafts inspectable artifacts and checks quality gates, but does not mutate live skills, promote durable memory, send externally, deploy, call external models, start daemons, or activate connectors.

The visual Local Control Center must follow `docs/LOCAL-CONTROL-CENTER-DESIGN-RECIPE.md`:

- first viewport shows actual GPAO-T state, not a marketing hero
- layout maps to Work / Context / Evidence / Growth / Authority
- status chips separate ready, review, blocked, approval-required, and not-applicable layers
- authority boundaries appear before dangerous or external actions
- the first UI reads the existing `control snapshot` contract without starting a daemon or activating external systems
- screenshot or render evidence must exist before claiming visual quality
- the next visual/UX gate must explicitly check mobile sticky topbar or decision strip visibility
