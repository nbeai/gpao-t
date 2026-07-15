# GPAO-T Three-Track Process Guard v0.1

Status: historical v0.1 process guard; track names retained, absorption rule superseded
Date: 2026-07-11  
Owner: 윤  
Synthesis Lead: Codex  
Standing side agent: GPAO-T Process Guardian

## 0. Purpose

This document turns the remaining GPAO-T work into three large tracks so the project does not drift into disconnected feature work, OpenClaw-only improvement, or a standalone side surface.

The guard exists for one reason:

```text
Every work unit must move GPAO-T closer to an independent, testable Personal Growth OS.
```

## 1. Three Tracks

### Track A. Core Kernel

Role:

```text
The brain and judgment engine of GPAO-T.
```

Includes:

- Context Mesh
- Memory Wiki
- T-cell admission
- replay
- approval/audit
- reversible apply/rollback
- self-growth proposal and application gates
- LLM-ready task packet

Current state:

- The memory/context path now has:
  - review-only candidate
  - read-only replay
  - scoped apply request
  - approval/audit bridge
  - reversible Context Mesh candidate apply
  - applied candidate replay
  - anchor/support admission proof
- Approximate maturity: 70-75%.

Next target:

- Surface the applied candidate replay/admission state in the live GPAO-T dashboard.

### Track B. Operating Surface

Role:

```text
The visible user operating environment.
```

Includes:

- GPAO-T dashboard and compatibility-surface replacement
- Codex-like multi-session / multi-work-pane UX
- chat condition and progress affordances
- session rail
- active work strip
- inspector
- memory/replay/apply/rollback state
- desktop/mobile visual QA

Current state:

- Branding, compact GPAO-T work pane, context/memory/authority/speed lane, source preview, memory/replay/apply gate indicators, and visual QA evidence exist.
- Approximate maturity: 45-50%.

Next target:

- Connect Track A replay/admission status to the visible live dashboard without turning it into a card-heavy standalone surface.

### Track C. Runtime & Productization

Role:

```text
The execution, installation, reliability, and long-term operation layer.
```

Includes:

- model routing
- local CLI/MCP/tool execution
- independent GPAO-T runtime and compatibility-module replacement
- install/update/rollback
- doctor/health check
- long replay
- packaging
- user scenario verification
- performance and stability evidence

Current state:

- Local-first preview, model/tool boundary, approval/audit, package hardening, and owner ops surfaces exist, but they are not yet fully absorbed into live OpenClaw as GPAO-T.
- Approximate maturity: 35-40%.

Next target:

- After the visible surface shows memory/context state, connect controlled execution flows to the same authority and rollback language.

## 2. Process Guardian Role

The Process Guardian is a standing side agent role.

It does not own product direction, does not write code by default, and does not override the user's current instruction.

It watches:

- track classification
- OpenClaw absorption alignment
- drift risk
- authority boundary
- evidence gap
- next action compression

The Process Guardian's output is always a review candidate until Codex admits it.

## 3. Work Unit Contract

Every GPAO-T work unit must declare:

```text
track:
target:
why_now:
allowed_scope:
blocked_scope:
evidence_required:
rollback_path:
next_action:
```

Allowed tracks:

```text
core_kernel
operating_surface
runtime_productization
cross_track
```

`cross_track` is allowed only when the work intentionally connects two or more tracks. It must still name the primary track.

## 4. Pre-Work Check

Before coding or live dashboard changes:

```text
1. Current user instruction preserved?
2. Track selected?
3. Does this move OpenClaw closer to becoming GPAO-T internally?
4. Is this lab/local only, or live OpenClaw?
5. If live, is approval boundary explicit?
6. Is source truth known?
7. Is there a rollback path?
8. What evidence will prove this unit?
```

If two or more answers are unclear, run Process Guardian review before implementation.

## 5. Post-Work Check

After every work unit:

```text
1. What changed?
2. Which track moved?
3. What evidence passed?
4. What remains blocked?
5. Did anything drift into sidecar/mock/OpenClaw-only work?
6. Is completion language allowed only for this unit?
7. What is the next single safe action?
```

## 6. Drift Rules

Flag `drift-risk` when:

- a standalone GPAO-T surface becomes the main path
- OpenClaw improvement is treated as the product goal
- plugin/sidecar integration is treated as the final architecture
- T-cell, Context Mesh, or Memory Wiki are only labels in UI
- a live mutation occurs without lab patch, visual QA, replay, and rollback
- subagent output is promoted without Codex synthesis
- the next action splits into too many branches

Flag `blocked` when:

- live OpenClaw must be changed but approval or rollback is missing
- source call path is unknown
- tests or visual QA cannot be run for a user-visible change
- memory promotion or external action is requested without authority gate
- hidden prior-work storage is used as active truth

## 7. Current Backlog By Track

### Track A. Core Kernel Backlog

| Priority | Work | Status | Evidence Needed |
| --- | --- | --- | --- |
| A1 | Show applied candidate replay/admission state as data contract for UI | next | gateway response + tests |
| A2 | Add review queue summary fields optimized for dashboard display | next | unit tests |
| A3 | Connect self-growth proposals to the same candidate/replay/apply pattern | queued | replay + approval/audit tests |
| A4 | Define raw data + wiki compiler source coexistence rules | queued | architecture doc + examples |
| A5 | Longitudinal replay for same-misread reduction | later | replay suite |

### Track B. Operating Surface Backlog

| Priority | Work | Status | Evidence Needed |
| --- | --- | --- | --- |
| B1 | Show memory/replay/admission/apply state in live dashboard inspector | next | desktop/mobile visual QA |
| B2 | Add user-facing apply/rollback controls with disabled/preview states | queued | authority gate + rollback test |
| B3 | Strengthen multi-session / Codex-like work panes | queued | session behavior tests + visual QA |
| B4 | Improve chat condition and progress affordances | queued | screenshot QA + text fit |
| B5 | Reduce card-heavy visual patterns and preserve dense OS feel | continuous | visual review |

### Track C. Runtime & Productization Backlog

| Priority | Work | Status | Evidence Needed |
| --- | --- | --- | --- |
| C1 | Align model/tool execution flows with same authority language | queued | gateway + CLI tests |
| C2 | Map OpenClaw module replacement candidates to GPAO-T runtime organs | queued | source anatomy memo |
| C3 | Package install/update/rollback path as user-facing OS maintenance | queued | dry-run evidence |
| C4 | Add health/doctor status to visible surface | queued | gateway + UI evidence |
| C5 | Long-run stability and performance measurement | later | scenario suite |

## 8. Immediate Work Order

Next primary track:

```text
operating_surface
```

Reason:

```text
Core Kernel has enough proof to expose its state.
The user must now see the kernel working inside the OpenClaw/GPAO-T dashboard.
```

Immediate unit:

```text
Show applied Context Mesh replay/admission state in the GPAO-T dashboard inspector.
```

Allowed scope:

- lab/fork UI source
- local GPAO-T runtime data contracts
- tests
- visual QA evidence
- documentation

Blocked scope:

- live OpenClaw mutation without explicit live patch/rollback step
- Gateway restart without explicit action boundary
- durable memory promotion
- external connector action
- GitHub push/public release

Evidence required:

- data contract test
- UI state test if available
- desktop/mobile screenshot QA before live claim
- rollback note

## 9. Process Guardian Report Shape

Use this compact format:

```md
## GPAO-T Process Guardian

Status: on-track | drift-risk | blocked | approval-required
Primary Track:
Secondary Track:
Current Target:

Alignment:
- OpenClaw internal absorption:
- Sidecar/mock drift:
- Current user instruction:

Authority:
- Allowed:
- Blocked:
- Approval needed:

Evidence:
- Present:
- Missing:

Next Single Action:
```
