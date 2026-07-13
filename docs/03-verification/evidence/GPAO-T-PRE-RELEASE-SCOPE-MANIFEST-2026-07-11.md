# GPAO-T Pre-Release Scope Manifest

Status: Phase 1 scope sealed / review before fresh verification  
Date: 2026-07-11  
Target: supervised test-team candidate immediately before distribution  
Package version: `gpao-t@0.1.0`  
Public release: blocked  
Live apply: not executed

## 1. Scope Decision

This manifest defines what belongs to the GPAO-T Pre-Release Candidate and what must stay out.

The candidate is not a public release, not a marketplace upload, and not a live OpenClaw mutation. It is a sealed local evidence scope that lets the project proceed into fresh verification, live-hook preview diff, package/checksum/readback, visual QA, and tester handoff.

## 2. Included Product Surfaces

| Surface | Included | Evidence / Path |
| --- | --- | --- |
| GPAO-T runtime CLI | yes | `bin/gpao-t.js`, `src/index.js` |
| Core turn kernel | yes | `src/core/turn-kernel.js`, `src/core/runtime.js`, `src/core/session-continuity.js` |
| Context / admission / T-cell path | yes | `src/core/context-runtime.js`, `src/core/admission.js`, `src/core/context-admission-policy.js`, `src/core/llm-ready-task-context-packet.js` |
| Authority / tool / model boundary | yes | `src/core/authority.js`, `src/core/tool-runtime.js`, `src/core/model-router.js`, `src/core/model-invocation.js`, `src/core/execution-runtime.js` |
| Memory / replay / growth review loop | yes | `src/core/memory-wiki.js`, `src/core/memory-candidate-review-queue.js`, `src/core/auto-memory-growth-loop.js`, `src/core/growth-application-gates.js` |
| Live turn absorption local bridge | yes | `src/core/live-turn-absorption-bridge.js` |
| OpenClaw live hook readiness | yes | `src/core/openclaw-absorption-control.js`, `tools/apply-openclaw-live-gpao-bridge-patch.mjs` |
| Gateway / Control Center state | yes | `src/core/gateway.js`, `src/core/control-center.js`, `src/core/control-center-renderer.js`, `src/core/control-center-serving.js` |
| Workspace / work surface UX | yes | `src/core/workspace-shell.js`, `src/core/core-work-surface.js`, `src/core/work-surface-execution-flow.js` |
| Owner Ops package substrate | yes, as supporting release machinery | `src/core/owner-ops-distribution.js`, `src/core/owner-ops-team-alpha-package.js`, `src/core/production-completion.js` |
| Browser-local / Tauri scaffold | included as read-mostly proof only | `tauri-shell/index.html`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` |
| Test suite | yes | `test/*.test.js` |
| Product / engineering / verification docs | yes | `docs/**` |

## 3. Excluded From Candidate

| Item | Reason |
| --- | --- |
| Public upload, public deployment, marketplace release | separate owner approval required |
| GitHub push / PR / release tag | separate owner approval required |
| Credential or secret storage | outside test-team pre-release scope |
| Real external OAuth login | outside test-team pre-release scope |
| Telegram/external message send | blocked until live smoke is explicitly approved |
| live OpenClaw file write | blocked until Phase 7 owner decision |
| Gateway restart | blocked until Phase 7 owner decision |
| provider behavior change | blocked by live hook readiness gate |
| OpenClaw memory write | blocked until apply/replay/rollback gate is approved |
| durable memory promotion | blocked until review/apply gate and owner approval |
| destructive rollback execution | blocked; rollback plan only until explicit approval |
| Tauri build/sign/notarize/installer creation | not part of this candidate |
| live connector activation | blocked |
| paid model/provider calls | blocked |

## 4. Included Evidence Families

| Evidence Family | Required Before Candidate Lock | Current Status |
| --- | --- | --- |
| Phase 0 work plan | required | present: `docs/03-engineering/GPAO-T-PRE-RELEASE-CANDIDATE-WORK-PLAN-v0.1-ko.md` |
| Release scope manifest | required | present: this file |
| Fresh verification matrix | required | pending Phase 2 |
| Live hook preview diff / rollback manifest | required | pending Phase 3 |
| Package/archive/checksum/readback | required | pending Phase 4 |
| Sealed visual QA | required | pending Phase 5 |
| Tester guide / feedback ledger | required | pending Phase 6 |
| Owner decision lane | required | pending Phase 7 |

## 5. Verification Commands In Scope

Minimum fresh verification set:

```sh
npm --prefix gpao-t run check
node --test gpao-t/test/openclaw-absorption-control.test.js
node --test gpao-t/test/live-turn-absorption-bridge.test.js
node --test gpao-t/test/control-center.test.js gpao-t/test/live-turn-absorption-bridge.test.js gpao-t/test/openclaw-absorption-control.test.js
npm --prefix gpao-t test
node gpao-t/bin/gpao-t.js openclaw live-turn-hook-readiness-check
node gpao-t/bin/gpao-t.js owner-ops local-package-candidate-check
node gpao-t/bin/gpao-t.js owner-ops local-package-candidate-readback-check
node gpao-t/bin/gpao-t.js owner-ops final-local-release-candidate-check
```

If `beai verify --scenario --meaning` still fails with `Invalid string length`, the release gate must use explicit evidence files and command transcripts instead of pretending that the BEAI verification tool passed.

## 6. Dirty / Untracked State Policy

The repository currently contains many active docs, generated artifacts, and prior work products. Pre-Release Candidate sealing does not require deleting unrelated work.

It does require:

- package manifest must state exactly which paths are included.
- generated `.gpao-t` package/checksum/readback outputs must be referenced explicitly.
- hidden previous-work stores are not active truth.
- live OpenClaw install files are not included as mutable package content unless a later approved live apply step creates a backup/readback manifest.

## 7. Next Gate

Phase 2 must create fresh verification evidence against this scope. Phase 3 may then create live hook preview diff and rollback manifest. No live mutation is allowed before Phase 7 owner decision.

