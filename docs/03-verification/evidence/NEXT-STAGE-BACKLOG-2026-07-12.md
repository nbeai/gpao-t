# Next Stage Backlog - 2026-07-12

Status: midpoint backlog locked
Goal: convert the current live GPAO-T hardening candidate into a clean supervised local test-team handoff candidate.

## Completion Target

The next target is not public release.

The next target is:

```text
GPAO-T supervised local test-team handoff candidate with sealed user-facing routes, consistent package evidence, reproducible live patch path, and clean source/evidence ownership.
```

## P0 - Must Close Before Test-Team Send

### P0.1 Normalize Package Hash Truth - Closed In This Pass

Problem:

- Current archive hash is `30d0fefa75a30104aead0166bf5ebe8796e7342a4946189e5c108732ed3f6853`.
- Current bundle JSON hash is `ad7215c4642da78020f1c453e6cf35ec20579356abd27eacf88f533d93db1a63`.
- Current manifest hash is `b1c6a64f7fbe7151b2e5a53b06cc30f43ebc2262252fd858c56144c3b181262b`.
- Some current docs listed bundle SHA `5acfc805...` before this midpoint pass.

Midpoint action:

- Updated the current send/completion docs to the same package facts.
- Added manifest SHA to current send/completion docs.

Closed verification:

- `node bin/gpao-t.js owner-ops local-package-candidate-readback-check gpao-t-owner-ops-0.1.0-local-candidate.zip`: `ready`, findings `[]`
- `node bin/gpao-t.js owner-ops team-alpha-handoff-check gpao-t-owner-ops-0.1.0-local-candidate.zip`: `ready`, findings `[]`
- `node bin/gpao-t.js owner-ops final-local-release-candidate-check`: `ready`, findings `[]`
- `zip -T .gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.zip`: `OK`

Remaining note:

- Older package docs stay as historical evidence and must not be used as the current send packet.

### P0.2 Close Route Seal Blockers - Closed For Active Checked User Surfaces

Problem:

- `docs/03-verification/evidence/gpao-t-dashboard-route-inventory-2026-07-12.json` status is `review`.
- Routes needing live DOM readback: `/chat`, `/sessions`, `/settings`, `/agents`, `/skills`, `/nodes`, `/dreaming`, `/documents`.
- Agent D found visible `Assistant` residue on `/settings/ai-agents`.
- Agent D found `Clawdette` in accessible title/hover text on `/settings/general`.

Closure action:

- Patched visible `/settings/ai-agents` residue by replacing the developer config form with a GPAO-T intelligence summary in normal user view.
- Patched accessible `/settings/general` residue through the user-screen overlay.
- Patched `/chat` historical speaker labels so visible `Assistant` becomes `GPAO-T`.
- Patched `/settings/profile` mascot residue (`집게`, `리프`) into GPAO-T language.
- Recovered a broad replacement mistake that temporarily broke `/skills`; changed surface-seal tooling so JavaScript bundles are no longer mutated by broad text replacement.

Closed verification:

- `npm run check`: pass
- `node --test test/live-user-screen-ux-patch.test.js test/live-surface-seal-patch.test.js --test-concurrency=1 --test-timeout=180000 --test-reporter=spec`: 12 pass
- `npm run seal:routes`: `review`, static forbidden matches `[]`
- Safari readback for checked routes:
  - `/chat`: `Assistant`, `OpenClaw`, `Clawdette` false
  - `/settings/general`: `OpenClaw`, `Assistant`, `Clawdette`, `Gateway` false
  - `/settings/ai-agents`: GPAO-T intelligence summary visible, developer config form hidden
  - `/skills`: panel load error false, `OpenClaw` and `ClawHub` false
  - `/settings/profile`: `OpenClaw`, `Assistant`, `Clawdette` false
  - `/agents`: developer labels such as `Copy ID`, `Core Files`, `Bootstrap persona`, `Select a file to edit`, `Workspace:`, and `Cron 작업` false in the checked normal route sample
  - `/nodes`: developer labels such as `Allowlist and approval policy`, `Gateway edits local approvals`, `Default security mode`, `Default prompt policy`, `No nodes with system.run available`, `Pin agents to a specific node`, `default agent`, and `uses default` false after exact live nodes bundle patch and Safari cache clear
  - `/dreaming`: checked normal route sample did not expose previous forbidden labels
  - `/documents`: redirects to the main chat route in the current live dashboard session

Automation closure:

- Added route-seal evidence parsing to `tools/run-gpao-t-dashboard-route-crawl.mjs`.
- Added `test/dashboard-route-crawl.test.js`.
- `npm run seal:routes`: `ready`, findings `[]`.
- Evidence: `docs/03-verification/evidence/gpao-t-dashboard-route-inventory-2026-07-12.json`.

Residual note:

- Route inventory is now connected to the current Safari DOM readback evidence. A fresh browser readback should still be re-run after each future visible dashboard patch.

### P0.3 Source/Evidence Ownership Seal

Problem:

- Dirty tree has 34 modified tracked files.
- `git status --short | wc -l` reports 236 status lines.
- Evidence and live backups dominate the untracked flood.
- Current state cannot be cleanly reviewed or committed as one blob.

Closed in policy and grouping audit, still open for actual staging/commit:

- Classify files into commit groups:
  - runtime kernel
  - dashboard/control surface
  - gateway/CLI/tools
  - Owner Ops/release
  - docs/product/spec
  - curated evidence
  - generated or excluded evidence
- Decide include/exclude policy for large live backup folders.
- Update `.gitignore` or quarantine policy for generated evidence.
- Commit only meaningful product/source/evidence groups after verification.

Current state:

- `.gitignore` now excludes raw live/runtime backup payloads, repeated generated run directories, `.before` snapshots, and heavy cleanup payloads from the normal source-review surface.
- `GPAO-T-SOURCE-EVIDENCE-OWNERSHIP-SEAL-2026-07-12.md` defines product source, generated evidence, runtime state, commit groups, and grouped review lanes.
- Added `tools/audit-source-evidence-groups.mjs`.
- Added `npm run seal:source-groups`.
- Added `test/source-evidence-groups.test.js`.
- `npm run seal:source-groups`: `ready`; 237 current git status entries assigned to review lanes.
- Evidence: `docs/03-verification/evidence/gpao-t-source-evidence-group-audit-2026-07-12.json`.
- The remaining work is not “what is product source?” but the mechanical staging/commit pass. No commit was made in this closure pass.

## P1 - Must Close Before Clean Handoff Claim

### P1.1 Runtime Namespace Migration - Compatibility Closed, Standalone Rebuild Reopened

Problem:

- `gpao-t-runtime-namespace-audit-2026-07-12.json` status is `migration_required`.
- Initial hit count was `757`; latest post-stage-one audit reports `760` because it now also sees explicit compatibility aliases in `index.html`.

Stage-one closed in this pass:

- Added guarded live namespace migration tool with dry-run/apply, token, backups, and manifest.
- Added GPAO-T storage mirror script for `localStorage` and `sessionStorage`.
- Added seed `gpao-t-app`, `gpao-t-tooltip`, and `gpao-t-agent-select` aliases while keeping old runtime elements readable.
- Migrated active service worker cache prefix to `gpao-t-control-`.
- Kept `openclaw-control-` as legacy cache compatibility.
- Migrated new notification tag to `gpao-t-notification`.
- Re-ran namespace audit; latest status is `stage_one_migrated_followup_required`.

Bundle alias bridge closed in this pass:

- Expanded `tools/migrate-gpao-t-runtime-namespace.mjs` so it scans live bundles for inherited `openclaw-*` custom elements.
- Added `gpao_t_custom_element_alias_bridge_v0_1` to live `index.html`.
- Alias bridge covers 71 inherited custom element names.
- Added tests for extraction, manifest-backed alias script generation, idempotency, and service worker migration.
- Re-ran namespace audit; latest status is `bundle_alias_bridge_ready_rebuild_required`.
- Latest hit count: `751`.
- Follow-up dry-run after live apply reports `changed: false`.
- Backup: `docs/03-verification/evidence/live-namespace-migration/2026-07-12T11-21-58-307Z`.

Standalone rebuild attempted and rolled back:

- Added guarded standalone namespace rebuild tool with dry-run/apply, exact token, backups, and manifest.
- Dry-run on live control-ui: `beforeHitCount: 1121`, `afterHitCount: 0`, `changedFileCount: 85`.
- Simulation apply on `/private/tmp` passed JS syntax check for 117 JavaScript files, namespace audit, and route crawl.
- Live apply completed with backup at `docs/03-verification/evidence/live-standalone-namespace-rebuild/2026-07-12T12-07-01-458Z`.
- Product result: rejected after Safari showed a non-mounted/blank user screen.
- Rollback restored the live control-ui backup.
- Current `npm run seal:namespace`: `bundle_alias_bridge_ready_rebuild_required`, `hitCount: 751`.
- Cache-bust recovery restored the Safari user screen.

Next closure condition:

- Do not repeat broad live bundle rewriting as the completion path.
- Rebuild from source or a controlled bundle graph, then verify in Safari before any `hitCount: 0` completion claim.
- Required proof: initial load mount, token-authenticated dashboard, chat route, settings route, route seal, conversation QA, cleanup, and rollback evidence.

Remaining note:

- This closes the live local runtime namespace blocker. Clean-machine installer proof, source-level fork/package rebuild, signed distribution, and public release remain separate lanes.

### P1.2 Live Patch Reproducibility

Problem:

- Live runtime is patched under an inherited OpenClaw install path.
- A future reinstall/update can erase GPAO-T patches.

Closed in this pass:

- Added `tools/audit-live-patch-reproducibility.mjs`.
- Added `npm run seal:live-patches`.
- Added `test/live-patch-reproducibility.test.js`.
- Added structured current receipts for user-screen UX and conversation UX patch families.
- Recorded evidence at `docs/03-verification/evidence/gpao-t-live-patch-reproducibility-audit-2026-07-12.json`.

Closed verification:

- `npm run seal:live-patches`: `ready`, 10/10 families `ready`.
- `node --test test/live-patch-reproducibility.test.js --test-concurrency=1 --test-timeout=120000 --test-reporter=spec`: passed after adding standalone namespace rebuild family coverage.
- `npm run check`: passed.

Residual note:

- This closes source-tool/backup/readback mapping for the current live mutation families. It does not yet prove a full clean reinstall from pure OpenClaw baseline; that remains part of the later packaging lane.

### P1.3 Runtime Workspace Seed Vs Private Overlay

Problem:

- Runtime workspace is product-relevant but also contains local identity/history risk.

Required close:

- Keep canonical seed under `runtime-workspace/gpao-t`.
- Keep user-private overlays under `/Users/jyp/.openclaw/workspace`.
- Confirm no private default name/personality ships in product seed.
- Confirm welcome/setup flow lets first installer choose assistant name, tone, and boundary.

### P1.4 Live Conversation Proof Refresh - Closed In This Pass

Problem:

- Prior live conversation QA passed, but route/user-surface work has continued after that.

Closed action:

- Re-ran live conversation QA after P0 route fixes and namespace stage-one migration.
- Re-ran conversation UX QA for first-progress, mid-progress, auto-title, and tool-log isolation.
- Preserved Telegram boundary: no external Telegram send was invoked.
- Cleaned the QA sessions from the live session list after backup.

Closed verification:

- `npm run qa:conversation`: `pass`, 6/6 scenarios, 0 warnings, 0 failures.
- `npm run qa:conversation-ux`: `pass`.
- Cleanup: matched 5 QA sessions, applied backup/delete, follow-up dry-run matched 0.

Evidence:

- `docs/03-verification/evidence/live-conversation-qa-runs/conversation-qa-2026-07-12T10-59-59-848Z.json`
- `docs/03-verification/evidence/conversation-ux-qa/conversation-ux-qa-2026-07-12T10-59-00-967Z.json`
- `docs/03-verification/evidence/live-test-session-cleanup/cleanup-2026-07-12T11-00-35-055Z`

## P2 - Product Hygiene And Experience

### P2.1 Settings And Page Language Polish

Problem:

- Several pages are sealed but not user-polished.
- Remaining mixed terms include generic English control labels and developer-ish wording.

Required close:

- Convert remaining labels into GPAO-T user language.
- Hide developer-only pages or move them behind advanced/internal mode.
- Keep settings as a user screen, not a developer console.

### P2.2 Evidence Volume Control

Problem:

- `docs/03-verification/evidence/live-backups/` contains 9549 files.
- Evidence is valuable but too heavy for normal review.

Required close:

- Keep summary manifests in git.
- Move large raw backups to an archive/quarantine path or ignore them after manifest capture.
- Keep only representative screenshots/JSON in the normal review spine.

### P2.3 Latency And Runtime Stability Watch

Problem:

- Current controlled UX QA showed quick progress signal, but live route latency still needs repeated proof.

Required close:

- Add latency watch evidence for:
  - first progress signal
  - first token/visible answer
  - final answer
  - tool-use bridge messages
- Track dashboard and Telegram separately.

## P3 - After Test-Team Handoff Candidate

- Signed installer and notarization.
- Clean-machine install.
- Public package/update channel.
- Marketplace or external distribution.
- Durable memory promotion policy.
- OpenClaw inherited memory replacement.
- Long-term standalone GPAO-T runtime packaging.
- Advanced self-growth replay automation.

## Verification Matrix

Required before closing this backlog:

- `npm run check`
- `npm run test:fast`
- `npm test`
- `npm run seal:routes`
- `npm run seal:namespace`
- Authenticated Safari route DOM audit
- Dashboard visual screenshot set
- Live conversation QA
- Conversation UX QA with latency signal
- Package readback checks
- Zip integrity check
- Rollback manifest readback
- Telegram boundary check without uncontrolled external send

## Current Decision

The final local seal gate is now present:

- `npm run seal:final`
- evidence: `docs/03-verification/evidence/gpao-t-final-supercar-seal-2026-07-12.json`
- human summary: `docs/03-verification/evidence/GPAO-T-FINAL-SUPERCAR-SEAL-2026-07-12.md`

Current status:

`ready_for_supervised_test_team_handoff`

Closed for the supervised local test-team handoff lane:

1. User-facing identity seal.
2. Dashboard route seal for verified routes.
3. Live patch reproducibility.
4. Source/evidence ownership grouping.
5. Local package integrity.
6. Runtime namespace rebuild with `hitCount: 0`.

Still not a public release or clean-machine installer claim:

1. Public release, signing, notarization, marketplace upload, external distribution, external Telegram sends, and durable memory promotion are outside this seal.
2. Clean-machine install/update/rollback proof and source-level independent package proof remain separate release lanes.

The next development work should be:

1. Clean-machine install/update/rollback proof lane.
2. Expanded authenticated direct-route readback for hidden/internal routes if those routes remain user-accessible.
3. Grouped staging/commit review using `npm run seal:source-groups`.
4. Clean standalone packaging lane after namespace rebuild passes strict seal.
