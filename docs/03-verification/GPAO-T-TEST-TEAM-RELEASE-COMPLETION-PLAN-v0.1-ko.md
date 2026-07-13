# GPAO-T Test Team Release Completion Plan v0.1

Date: 2026-07-11
Status: release/QA audit appendix
Scope: test-team distribution build, not public production release

Canonical engineering plan:

```text
docs/03-engineering/GPAO-T-TEST-TEAM-RELEASE-COMPLETION-PLAN-v0.1-ko.md
```

This file is the release/QA audit appendix. If this appendix and the
canonical engineering plan disagree, the canonical engineering plan wins.

## 1. Release Truth

GPAO-T is not yet a final public product.

Current repo evidence supports this stricter statement:

- local product axis: ready for supervised review
- stages 5-8 completion gate: ready
- owner-ops production audit: local product axis ready, final objective incomplete
- live OpenClaw Gateway: reachable on local health/chat routes
- Auto Memory + Self-Growth v1: implemented as local candidate/replay/apply-record loop
- public release, marketplace upload, signing, live account connection, credential storage, actual install/update/rollback execution, external send: still blocked

Do not use "complete", "final", "production-ready", or "public release ready" for the whole project until the blockers in this plan are closed.

Allowed current language:

- "test-team release plan"
- "local alpha/test-team candidate after P0 gates close"
- "local product axis ready"
- "external/public completion pending"

Blocked current language:

- "GPAO-T is finished"
- "public release ready"
- "OpenClaw live integration is fully complete"
- "Telegram memory/self-growth is fully wired"

## 2. Evidence Checked In This Audit

Local commands inspected during this audit:

- `gpao-t production stages-5-8-check`
  - status: ready
  - findings: none
- `gpao-t owner-ops production-completion-audit-check`
  - status: ready
  - localProductAxisReady: true
  - finalObjectiveComplete: false
  - pending: owner final-candidate decision
  - blocked: external public release
- `gpao-t owner-ops local-package-candidate-check`
  - status: ready
  - write blocked without confirmation token
- `gpao-t owner-ops archive-checksum-dry-run-check`
  - status: ready
  - archiveName: `gpao-t-owner-ops-0.1.0-local-candidate.zip`
  - manifestDigest: `1e627b9b0413e519f116052c8f64f854a127edeb9b0b3f0053ff568536b30596`
  - fileWriteExecuted: false
  - publicUploadExecuted: false
- `gpao-t owner-ops install-update-rollback-proof-check`
  - status: ready
  - proofState: proof requirements ready, not executed
  - canInstallNow/canUpdateNow/canRollbackNow: false
- `gpao-t owner-ops release-readiness-check`
  - status: ready
  - publicReleaseAllowed/packageUploadAllowed: false
  - humanReviewApprovalState: not_requested
- `gpao-t auto-memory-growth summary`
  - status: ready
  - completedLocalAutoLoops: 1
  - approvalRequired: 0
- `curl http://127.0.0.1:18789/health`
  - `{"ok":true,"status":"live"}`
- `curl -I 'http://127.0.0.1:18789/chat?session=main'`
  - HTTP 200

Important negative evidence:

- `gpao-t control serve-check` failed in this Codex sandbox with `listen EPERM 127.0.0.1`.
- `/api/sessions` returned 404 on the live OpenClaw Gateway.
- Current git worktree has many modified and untracked files. Release scope is not sealed.
- Full `npm test` was not rerun in this audit. Prior evidence says full suites passed in earlier passes, but current release judgment must require a fresh bounded full-suite run after repo sealing.

## 3. P0 Blockers Before Test-Team Distribution

These must close before giving a build to a test team.

### P0-1. Release Scope Seal

Problem:

The repo contains many modified and untracked files. Testers cannot receive an ambiguous tree.

Close condition:

- Create a release manifest that lists every included source, doc, generated state, and excluded artifact.
- Separate source files from local runtime state under `.gpao-t`.
- Decide whether current `.gpao-t` memory/growth/package records are included as seed state or excluded as local evidence.
- Produce a clean release branch or archive-source snapshot.
- Verify `git status --short` is either clean or has a documented, intentionally included file list.

Owner boundary:

- User approval is needed before public push or external sharing.

### P0-2. Fresh Bounded Verification Run

Problem:

Prior tests passed, but a release candidate needs one fresh, time-bounded verification after scope seal.

Close condition:

- `npm run check` passes.
- `npm test` passes once with the serial timeout policy.
- If a test is long-running, it must be split into a bounded release-smoke test and a separate soak test.
- `owner-ops-final-candidate.test.js` and other long owner-ops tests must not make the release gate appear hung.

Required matrix:

- unit: all core modules
- gateway route tests
- CLI command tests
- memory/context/replay/growth tests
- owner-ops package/release-gate tests
- production stages 5-8 tests
- session/workspace/control-center tests

### P0-3. Live OpenClaw Integration Truth

Problem:

Gateway health/chat is live, but earlier live inventory says continuity and live turn consumption are not fully verified.

Close condition:

- Gateway `/health` returns live.
- `/chat?session=main` returns 200.
- Safari authenticated dashboard shows `nBeAI. GPAO-T`.
- GPAO-T live work pane is present.
- Context/Memory/Authority/Speed controls are visible.
- A real live turn shows whether GPAO-T preflight packet is consumed before model answer.
- Post-answer Auto Memory + Self-Growth loop records a safe local candidate.
- If OpenClaw memory embedding quota is exceeded, GPAO-T Context Mesh fallback path must still produce a clear degraded-mode result.

Blocked until proven:

- "Telegram/OpenClaw answers are fully GPAO-T memory-backed."
- "OpenClaw live continuity is complete."

### P0-4. Telegram Smoke Test

Problem:

Telegram response works, but it reported memory search failure due embedding-provider quota. That means the live answer path is not yet proven to use GPAO-T Context Mesh as primary/fallback memory.

Close condition:

- Telegram direct message reaches the OpenClaw/GPAO-T runtime.
- The response includes current model/session/runtime health without hallucinated unsupported state.
- A known safe memory signal is captured after the answer.
- A follow-up turn can retrieve or at least expose the captured GPAO-T candidate path.
- Embedding quota failure is surfaced as degraded memory mode, not silent memory loss.
- No external send beyond the user's Telegram reply occurs.

### P0-5. Install / Update / Rollback Execution Proof

Problem:

Current proof says requirements are ready, but actual install/update/rollback are not executed and are blocked.

Close condition for test-team build:

- At minimum, provide a local dry-run install/update/rollback script or command set with bounded outputs.
- Run dry-run install, update, rollback in a disposable directory.
- Record before/after file list and rollback receipt.
- Prove destructive rollback remains blocked without explicit approval token.
- If no actual installer is shipped, the tester guide must say "source/local package test only."

### P0-6. Package / Archive / Checksum Artifact

Problem:

Archive/checksum is currently dry-run only.

Close condition:

- Generate the local test-team archive.
- Generate checksum file.
- Verify archive integrity.
- Generate release manifest with package version, git reference, included files, excluded files, checksum, build time, and authority boundary.
- Keep upload/signing/public release blocked unless explicitly approved.

### P0-7. Visual QA Refresh For Current Build

Problem:

Many screenshots exist, but the release candidate must have visual QA for the current sealed build, not only previous design passes.

Close condition:

- Desktop 1440x960 screenshots:
  - OpenClaw/GPAO-T live dashboard
  - GPAO-T workspace/control center
  - active session/chat state
  - memory/apply gate inspector
- Mobile 390x844 screenshots:
  - session rail
  - chat/work session
  - inspector sheet/control rail
  - input/composer state
- Human-eye checklist:
  - no incoherent overlap
  - no card-heavy drift
  - Korean labels readable
  - current task is visually primary
  - authority boundary visible
  - next safe action visible
  - OpenClaw naming replaced where user-facing

### P0-8. Tester Documentation Pack

Problem:

There are many docs, but testers need one short operational pack.

Close condition:

- `TEST-TEAM-README.md`
- install/run commands
- known limitations
- what testers should evaluate
- what testers must not do
- rollback/recovery instructions
- feedback template
- privacy/secret warning
- how to capture screenshots/logs

## 4. P1 Before Wider Beta

These can follow the first supervised test-team build, but should close before wider beta.

- Live OpenClaw session API route map: replace guessed `/api/sessions` with verified OpenClaw routes.
- Automatic memory/growth dashboard visibility: show latest run, degraded memory mode, and approval boundary in the live UI.
- Context Mesh fallback hardening: prove no embedding-provider dependency for minimal local source-linked recall.
- Test state isolation: avoid root-shared fixtures causing long or order-sensitive tests.
- Owner final-candidate decision record: capture a real owner decision after supervised test.
- Release notes generator: produce human-readable changes, limitations, rollback, and test asks.
- Incident path: document what to do if Gateway fails, Telegram fails, memory quota fails, or rollback fails.

## 5. Test Matrix

### Core Runtime

- admission / authority / turn kernel
- task packet generation
- Context Mesh resolve
- session overlay
- skill routing
- model routing boundary
- execution/tool governance

Pass condition:

- deterministic tests pass
- unsafe actions blocked
- task packet contains trace and authority

### Memory / Context / Growth

- memory wiki capture/list
- memory review queue
- read-only replay
- reversible local Context Mesh apply
- rollback receipt
- Auto Memory + Self-Growth run/summary/verify
- growth proposal/gate

Pass condition:

- safe local signal auto-records
- external/secret/destructive/public signals stop at approval boundary
- no durable memory promotion without gate
- no OpenClaw memory write without absorption patch

### Gateway / CLI

- all release-critical CLI commands return valid JSON
- Gateway routes return 200 for known routes
- unknown routes return clear errors
- local serve route works in an unsandboxed user environment

Pass condition:

- command outputs are bounded
- no command hangs without timeout
- shell-sensitive URLs are quoted in scripts

### Visual QA

- desktop and mobile screenshots for current sealed build
- authenticated Safari OpenClaw dashboard QA
- local GPAO-T control/workspace QA
- no overlap/regression

Pass condition:

- screenshots are from the release candidate build
- human-eye review is recorded

### Package / Archive / Rollback

- local package candidate
- archive generation
- checksum generation
- archive integrity check
- install/update/rollback dry-run
- rollback receipt

Pass condition:

- test team can install/run or open the exact build
- rollback path is documented and tested locally
- public upload remains blocked

### Live OpenClaw / Gateway / Telegram

- Gateway process present
- `/health` live
- `/chat?session=main` 200
- Safari authenticated UI loaded
- Telegram direct response works
- GPAO-T preflight/post-answer is observed or explicitly marked not yet wired
- embedding quota failure degrades gracefully

Pass condition:

- tester-facing claims match actual live behavior

## 6. Release Completion Milestones

### Milestone A. Audit Freeze

Goal:

Freeze the current truth and stop overclaiming.

Done when:

- this plan is accepted
- release language is corrected
- P0 checklist is tracked

### Milestone B. Scope Seal

Goal:

Make one exact candidate tree.

Done when:

- release manifest exists
- included/excluded files are fixed
- dirty tree is either cleaned or documented
- no unrelated generated clutter is included

### Milestone C. Verification Freeze

Goal:

Prove the sealed tree.

Done when:

- check/test matrix passes
- long tests are bounded
- Gateway/CLI smoke passes
- visual QA evidence is refreshed

### Milestone D. Live Path Proof

Goal:

Prove what actually happens in OpenClaw/Gateway/Telegram.

Done when:

- live Gateway and Safari are verified
- Telegram direct smoke is verified
- GPAO-T memory/preflight/post-answer path is proven or clearly marked as not included in this release

### Milestone E. Package Candidate

Goal:

Create the actual local test-team artifact.

Done when:

- archive exists
- checksum exists
- manifest exists
- install/update/rollback dry-run evidence exists
- tester docs exist

### Milestone F. Test-Team Handoff

Goal:

Give testers a controlled build and feedback lane.

Done when:

- owner approves local distribution
- package is shared through approved channel
- tester guide is included
- feedback ledger is ready
- rollback/recovery path is included

## 7. Final Test-Team Release Gate

The test-team build can be called "ready for supervised test-team distribution" only when all are true:

- P0-1 through P0-8 are closed.
- Full release matrix has fresh evidence.
- Archive/checksum/manifest exists.
- Install/update/rollback dry-run proof exists.
- Live Gateway and Telegram smoke are recorded.
- Visual QA is refreshed against the sealed build.
- Owner local distribution approval is recorded.
- Public release remains blocked unless separately approved.

If any item is missing, use:

`blocked test-team release candidate`

not:

`ready`

## 7.1 2026-07-11 Phase 4-7 Closure Update

The Phase 4-7 one-stop pass generated the local supervised candidate package and handoff evidence.

Closed for supervised local candidate:

- Phase 4 package/archive/checksum/readback:
  - archive: `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.zip`
  - archive SHA-256: `a5da2f9bed0bfb0449eaebd4f015e56aa29c063e29455e65dd5e53591f04e095`
  - readback check: ready / findings []
  - zip integrity: OK
- Phase 5 live visual QA:
  - Safari authenticated DOM proof: verified
  - independent Playwright screenshot: captured blocked Gateway connection state
  - limitation: independent browser does not inherit Safari authentication/session state
- Phase 6 tester handoff:
  - `docs/05-release/TEST-TEAM-README.md`
  - `docs/05-release/TEST-TEAM-FEEDBACK-LEDGER.md`
  - `.gpao-t/packages/OWNER-OPS-TEAM-ALPHA-HANDOFF-BUNDLE.md`
- Phase 7 decision lane:
  - `.gpao-t/packages/OWNER-OPS-FINAL-LOCAL-RELEASE-CANDIDATE-DECISION-PACKET.md`
  - final next-action check: ready
  - owner decision record: not appended by Codex

Current allowed language:

`supervised pre-release local candidate prepared`

Still blocked:

- public release
- external distribution
- signing/notarization
- install/update/rollback execution
- live OpenClaw file write
- Gateway restart
- Telegram/external send
- provider behavior change
- OpenClaw memory write
- durable memory promotion

Remaining correction before wider test use:

- Make independent browser/session connection smoother or document Safari-authenticated-only path clearly.
- Run a separate Telegram/model-path live smoke only when that authority lane is deliberately opened.

## 8. Immediate Next Work Order

Recommended next one-stop development block:

1. Seal release scope and create release manifest.
2. Build bounded release verification command set.
3. Refresh live Gateway/Safari/Telegram smoke evidence.
4. Generate local archive/checksum/readback.
5. Add tester handoff guide and feedback ledger.
6. Run final release audit and owner decision lane.

This is the shortest path to a real test-team distribution build without pretending the live memory/Telegram path is more complete than it is.
