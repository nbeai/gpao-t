# GPAO-T Surface Work Order 001

Title: Applied Replay Inspector  
Status: data/UI contract verified; live-auth visual QA pending  
Date: 2026-07-11  
Primary Track: Operating Surface  
Secondary Track: Core Kernel  
Owner: 윤  
Synthesis Lead: Codex  
Process Guardian: GPAO-T Process Guardian

## 0. Purpose

Expose the Core Kernel's applied Context Mesh replay/admission proof inside the GPAO-T dashboard inspector.

The user should be able to see:

```text
This context candidate exists.
It was replayed.
It was applied only as a Context Mesh candidate.
It is anchor for this active target, or support for this broader request.
It is not durable memory and not OpenClaw memory.
```

## 1. Why This Is Next

The Core Kernel now proves:

- memory candidates are review-only first
- replay is read-only
- apply requests are scoped
- approval/audit is local-only
- Context Mesh candidate apply is reversible
- applied candidates are not automatic authority
- AdmissionPacket can distinguish `anchor` from `support`

The next user-visible step is to make this proof visible in the OpenClaw/GPAO-T surface.

## 2. Track Contract

```text
track: operating_surface
target: live-dashboard-compatible inspector state for applied replay/admission
why_now: Core Kernel proof exists but is still mostly invisible to the user
allowed_scope: lab/fork UI, local data contract, tests, docs, visual QA evidence
blocked_scope: live OpenClaw mutation without explicit live patch/rollback step
evidence_required: data contract test, UI test if available, desktop/mobile visual QA
rollback_path: restore prior lab/live UI bundle from recorded backup before live mutation
next_action: add inspector data state and UI display for applied replay status
```

## 3. User-Facing Target

The inspector should show compact state, not a card-heavy explanation page.

Suggested labels:

```text
적용 후보
Replay 통과
현재 역할: anchor | support
자동 기억 아님
OpenClaw memory 미기록
Rollback 가능
```

Suggested one-line explanation:

```text
이 후보는 현재 목표와 맞아 답변 기준으로 쓸 수 있습니다.
```

or:

```text
이 후보는 관련 맥락이지만 현재 목표의 기준점은 아닙니다.
```

## 4. Data Inputs

Primary local runtime surfaces:

- `GET /mesh/applied-candidate-replay/verify`
- `POST /mesh/applied-candidate-replay`
- `GET /memory/review-summary`
- `GET /memory/review-queue`

Current proof object:

```text
gpao_t.applied_context_mesh_replay.v0_1
```

Important fields:

- `status`
- `activeTargetId`
- `appliedCandidate.anchor`
- `appliedCandidate.answerAnchorEligible`
- `admission.role`
- `admission.reason`
- `authority.mutationAllowedNow`
- `authority.openClawMemoryWrite`
- `authority.durableMemoryPromotion`

## 5. Implementation Boundaries

Allowed:

- add lab UI state mapper
- add compact inspector row/lane
- add disabled apply/rollback affordance if implementation is not yet wired
- add tests
- add screenshot evidence
- update documentation

Not allowed in this unit:

- write OpenClaw memory
- promote durable memory
- mutate session metadata
- activate external connector
- run live model/Telegram/OpenClaw turn
- restart Gateway unless separately staged
- claim whole GPAO-T completion

## 6. Acceptance Criteria

This work unit can be called locally verified when:

- applied replay state appears in inspector data/state
- `anchor` and `support` states are visually distinguishable
- blocked authorities are visible or inferable
- apply/rollback are not misleadingly active before gates are wired
- tests pass
- desktop and mobile screenshots are captured before live-facing claim
- rollback path is documented

## 7. Implementation Result

Date: 2026-07-11

Implemented in the OpenClaw dashboard lab:

- Added the Core Kernel compact surface contract:
  - `gpao_t.surface.applied_replay_inspector_state.v0_1`
  - `POST /surface/applied-replay-inspector`
  - `GET /surface/applied-replay-inspector/verify`
- Added `GpaoAppliedReplayState` to the GPAO-T work pane state contract.
- Surfaced applied Context Mesh replay/admission state in the existing inspector model.
- Added compact visible rows for:
  - applied candidate
  - replay result
  - current role: `anchor` or `support`
  - automatic admission boundary
  - OpenClaw memory boundary
  - durable memory boundary
- Kept apply/write authority blocked even when replay passes.
- Reused the existing dashboard inspector renderer rather than creating a standalone side surface.

Touched lab files:

- `/Users/jyp/Documents/Playground 2/gpao-t/src/core/context-mesh-replay.js`
- `/Users/jyp/Documents/Playground 2/gpao-t/src/core/gateway.js`
- `/Users/jyp/Documents/Playground 2/gpao-t/src/index.js`
- `/Users/jyp/Documents/Playground 2/gpao-t/test/memory-wiki.test.js`
- `/Users/jyp/Documents/Playground 2/openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/ui/src/pages/chat/gpao-work-pane-state.ts`
- `/Users/jyp/Documents/Playground 2/openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/ui/src/pages/chat/gpao-work-pane-state.test.ts`

Verification:

- `node --test gpao-t/test/memory-wiki.test.js gpao-t/test/memory-candidate-review-queue.test.js`: pass, 20 tests
- `npm --prefix gpao-t run check`: pass
- `npm --prefix openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/ui test -- gpao-work-pane-state.test.ts`: pass, 8 tests
- `npm --prefix openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/ui test -- gpao-work-pane-state.test.ts app-navigation.test.ts app-navigation-groups.test.ts`: pass, 66 tests
- `npm --prefix openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/ui run build`: pass

Evidence:

- Core data contract now distinguishes `anchor` and `support`.
- UI read-model test verifies anchor/support distinction and blocked authorities.
- UI renderer test verifies compact inspector DOM contains applied candidate, Replay, role, OpenClaw memory, and Rollback labels.
- Vite build verifies the lab Control UI bundle compiles.

Not yet fully satisfied:

- Inspector visual QA in an authenticated Gateway session is pending.
- Live OpenClaw mutation/restart has not been performed in this unit.

Live boundary:

- The lab patch is ready for a staged live diff/rollback/restart plan.
- Before live mutation, confirm current live tree diff, backup target files, restart path, and Safari Gateway authenticated visual QA path.

## 8. Process Guardian Check

Status: locally verified; live boundary pending  
Primary Track: Operating Surface  
Secondary Track: Core Kernel  
Current Target: make applied Context Mesh replay visible in the dashboard inspector

Alignment:

- OpenClaw internal absorption: pass, because the target stayed inside the OpenClaw/GPAO-T dashboard work pane inspector
- Sidecar/mock drift: contained, because no standalone surface was created
- Current user instruction: pass, user asked for process-managed continuation

Authority:

- Allowed: lab/fork UI, local contracts, docs, tests, visual QA
- Blocked: durable memory, OpenClaw memory, live mutation without boundary, external action
- Approval needed: live OpenClaw mutation or Gateway restart

Evidence:

- Present: Core Kernel replay/apply/admission tests, compact surface data contract, lab UI read-model test, lab renderer DOM test, lab Vite build
- Missing: authenticated Gateway/Safari desktop and mobile visual QA after staged live patch

Next Single Action:

```text
Prepare staged live patch plan: live tree diff, backup, rollback path, Gateway restart route, and authenticated Safari visual QA.
```
