# GPAO-T Program Control And Work Sequence v0.1

Status: active control frame
Date: 2026-07-11
Owner: 윤

## 0. Purpose

This document fixes the next GPAO-T work order and the program-control role needed to keep the work from drifting.

The goal is not to manage more for the sake of management. The goal is to keep one hard line:

```text
OpenClaw is the current body and material.
GPAO-T must absorb, replace, strengthen, and eventually transform that body.
Do not drift into a disconnected mock surface, OpenClaw improvement project, MVP shortcut, or plugin-only attachment.
```

## 1. Decision

GPAO-T needs a dedicated work-flow monitor.

The role name is:

```text
GPAO-T Flow Keeper
```

Subtitle:

```text
Drift / Blocker / Evidence / Authority / Next Action Monitor
```

This is not a boss, product owner, or second chief engineer.

- 윤 remains product owner and direction judge.
- Codex remains synthesis lead and senior implementation driver.
- Flow Keeper watches whether the current work remains aligned with the OpenClaw absorption path, authority boundary, evidence requirement, and next safe action.

## 2. Why It Is Needed

GPAO-T is not a single feature project. Multiple axes move at the same time:

- live OpenClaw body
- pure OpenClaw source anatomy
- nbeai source library
- GPAO-T runtime and live OpenClaw absorption lane
- Context Mesh, Knowledge Loop, and T-cell admission
- OpenClaw Gateway Dashboard to GPAO-T Control Center conversion
- visual QA, replay, rollback, and live authority boundaries

In this kind of work, energetic implementation can create drift. The most dangerous drift is making something visually interesting but disconnected from OpenClaw absorption.

Flow Keeper exists to catch that early.

As of 2026-07-11, Flow Keeper uses the three-track process guard as its operating map:

```text
Core Kernel
Operating Surface
Runtime & Productization
```

The detailed three-track contract is maintained in:

```text
docs/02-workflow/GPAO-T-THREE-TRACK-PROCESS-GUARD-v0.1-ko.md
```

This means every new GPAO-T work unit must state its track before implementation. The default next track after the applied Context Mesh replay proof is `Operating Surface`, because the kernel's state must now be visible inside the OpenClaw/GPAO-T dashboard.

## 3. Flow Keeper Responsibilities

### 3.1 Drift Watch

Check that the current work follows this path:

```text
pure OpenClaw anatomy
-> live OpenClaw comparison
-> dashboard fork / lab patch
-> visual QA / replay / rollback
-> explicit live approval
-> live absorption
```

Flag these as drift:

- separate GPAO-T mock surface becoming the main path
- OpenClaw product improvement replacing GPAO-T OS development
- sidecar/plugin-only attachment being treated as final architecture
- Context Mesh, T-cell, Knowledge Loop, or Memory Wiki used only as UI labels
- implementation without source call-path evidence

### 3.2 Source Authority Watch

Keep this priority order:

```text
current user instruction
-> live OpenClaw state
-> pure OpenClaw source anatomy
-> nbeai source library / gpao-t
-> T-cell canon / calculus
-> Context Mesh hits
-> older documents
```

Hidden previous-work storage is deprecated as active truth unless 윤 explicitly reopens it.

### 3.3 Authority Boundary Watch

Mark these as approval-required stop lines:

- live OpenClaw mutation
- Gateway restart or service kill/restart
- live Telegram/OpenClaw/model turn
- credential, token, or account change
- connector or automation activation
- durable memory promotion
- GitHub push or public release
- publish or deploy
- unknown user work deletion
- live GPAO rule mutation

### 3.4 Evidence Watch

Do not allow completion language unless the needed evidence exists.

Evidence can include:

- call path confirmation
- lab/fork patch diff
- local tests
- desktop and mobile screenshot QA
- text fit and non-overlap check
- authority matrix
- replay trace
- rollback plan

### 3.5 Blocker Watch

Convert vague stuckness into named blockers:

- source not confirmed
- live/lab boundary unclear
- no test
- no visual QA
- no rollback path
- authority class unclear
- OpenClaw absorption drifting into sidecar work
- next action split into too many branches

### 3.6 Next Action Compression

Every work unit must close with one next action:

```text
track:
next_action:
owner:
allowed_scope:
blocked_scope:
required_evidence:
approval_required: yes/no
```

## 4. Flow Keeper Prohibitions

Flow Keeper must not:

- change development priority by itself
- command detailed implementation design
- create management documents for their own sake
- treat subagent output as product truth
- mutate live OpenClaw
- promote durable memory
- override the user's latest instruction with old context
- permit "done" language without evidence
- normalize disconnected GPAO-T side surfaces as the main path

## 5. Reporting Shape

Use this compact report when a task is risky, long, or crossing a boundary:

```md
## GPAO-T Flow Keeper Check

Status: on-track | drift-risk | blocked | approval-required

Current Target:
-

Source Anchor:
-

Drift Check:
- OpenClaw internal absorption: pass/fail
- Lab before live: pass/fail
- Sidecar/mock drift: pass/fail
- Current user instruction preserved: pass/fail

Authority Boundary:
- Allowed:
- Requires approval:
- Not touched:

Evidence:
- Checked:
- Missing:

Blockers:
-

Next Action:
-

Stop Condition:
-
```

## 6. Progress And Remaining-Stage Reporting Rule

As of 2026-07-11, every GPAO-T work report must include two fixed views together:

```text
1. Current Work Progress
2. Fixed Remaining Stages
```

This is required because GPAO-T work can otherwise feel endless or drift into another development lane.

### 6.1 Current Work Progress

Each report must say where the current work unit stands:

- current task name
- track: Core Kernel / Operating Surface / Runtime & Productization
- status: planning / implementing / verifying / complete / blocked
- completed in this unit
- verified evidence
- not touched

### 6.2 Fixed Remaining Stages

Each report must also restate the locked remaining project stages from the current endpoint.

For the current post test-team-candidate phase, the fixed remaining stages are:

1. Completed: OpenClaw live session RPC/event layer absorption
2. Completed: Live dashboard action readback for rename/archive/delete-pending/restore
3. Completed: Session-specific message and context isolation
4. Completed: Memory candidate review queue filtered by active thread/session
5. Completed: Mobile session action sheet and inspector sheet visual QA
6. Completed: Controlled live smoke gate after backup, rollback, and authority gate
7. Remaining: Test-team dispatch/update packet refresh

When a stage is completed, Codex must mark it as completed and keep the remaining list visible. Do not replace the list with a new vague roadmap unless 윤 explicitly changes the endpoint.

This report should be short. Its job is control, not ceremony.

### 6.3 Latest Fixed Progress

As of 2026-07-11, stages 1-6 are implemented as the GPAO-T multi-chat stage completion package:

- `src/core/multi-chat-stage-six.js`
- `GET /multi-chat-workspace/stages-1-6`
- `GET /multi-chat-workspace/stages-1-6/verify`
- `GET /multi-chat-workspace/memory-review-queue`
- `gpao-t control multi-chat-stages-1-6`
- `gpao-t control multi-chat-stages-1-6-check`
- `gpao-t control multi-chat-memory-review-queue`

Verification evidence:

- `docs/03-engineering/GPAO-T-MULTI-CHAT-STAGES-1-6-COMPLETION-v1-ko.md`
- `docs/03-verification/evidence/GPAO-T-MULTI-CHAT-STAGES-1-6-COMPLETION-v1-2026-07-11.md`

Boundary:

- live OpenClaw source mutation was not executed in this pass
- Gateway restart was not executed in this pass
- durable memory promotion, OpenClaw memory write, permanent delete, external send, and public release remain blocked

## 7. Immediate Work Sequence

The next implementation must follow this order.

### Phase 0. Control Frame Lock

Create and maintain this document.

Done when:

- Flow Keeper role is defined
- next work sequence is explicit
- multi-agent protocol and README point to this control frame

### Phase 1. Memory And Knowledge Control Architecture

Finish the memory/context design before touching live OpenClaw.

Target architecture:

```text
OpenClaw Memory
-> Raw Data Vault
-> Source Record
-> LLM Wiki Compiler
-> Context Mesh
-> T-cell Admission
-> Knowledge Loop
-> Task Packet
```

Principle:

```text
OpenClaw memory recalls.
Raw Vault preserves.
LLM Wiki organizes.
Context Mesh connects.
T-cell admits.
Knowledge Loop grows.
Task Packet acts.
```

Output:

- memory/control architecture document
- state boundary between raw data, wiki page, context hit, admitted T-cell, durable memory, and growth proposal
- OpenClaw memory reuse plan

### Phase 2. Source Call-Path Pass

Confirm the real OpenClaw call path before UI work:

```text
chat.send
-> gateway
-> agent run
-> context-engine
-> tool approval
-> transcript/session
```

Output:

- source file map
- call-path diagram
- mutation candidate list
- test/QA hooks

### Phase 3. Dashboard Fork Map

Map the Gateway Dashboard conversion boundary:

- keep OpenClaw shell, rail, composer, reconnect, abort, queued send, split panes
- introduce `GpaoControlClient`
- introduce `GpaoAppContext`
- reinterpret `ChatPane` as `GpaoWorkPane`
- add `GpaoInspector`
- bind visible UI to read models, not fake labels

Output:

- exact target files
- keep/replace table
- read model contract
- visual acceptance criteria

### Phase 4. Lab/Fork UI Slice

Patch only the lab/fork first.

First visible slice:

- active target strip
- compact progress lane
- right inspector with Context / Authority / Progress
- multi-pane/session direction preserved

Output:

- lab/fork diff
- no live OpenClaw mutation
- local build/check evidence

### Phase 5. Replay And Visual QA

Verify before live apply:

- desktop screenshot
- mobile screenshot
- no horizontal overflow
- no incoherent overlap
- composer remains usable
- active target, progress, context, authority, and next action are visible
- blocked/approval/running/finalizing states are visible

Output:

- QA evidence doc
- screenshots or screenshot paths
- pass/fail notes

### Phase 6. Live Diff Review Package

Prepare a live-apply package, but do not apply yet.

Output:

- exact file list
- diff summary
- rollback path
- restart/smoke plan
- approval boundary report

### Phase 7. Explicit Live Apply

Only after 윤 approval:

- mutate live OpenClaw
- restart Gateway if needed
- run live smoke
- verify visual and behavior evidence
- record closeout

## 8. Specialist Agent Matrix

Use agents only when they reduce risk or improve parallel evidence.

| Agent | Use when | Output |
| --- | --- | --- |
| Flow Keeper | Every large or boundary-sensitive work unit | drift/evidence/authority/next-action check |
| OpenClaw Anatomy Agent | Source call path, module map, pure vs live comparison | file map and circuit memo |
| Memory Architecture Agent | Raw data, OpenClaw memory, LLM Wiki, Context Mesh, T-cell admission | memory/control architecture memo |
| UX/Visual Agent | Dashboard conversion, Codex-like multi-pane work rhythm, chat condition | visual acceptance and risk memo |
| Runtime Agent | gateway, ACP, agent runner, context-engine, transcript, tools | runtime evidence and patch proposal |
| QA Agent | replay, screenshots, tests, no-overlap, rollback | QA report |
| Security/Authority Agent | secrets, connectors, durable memory, external actions, live mutation | authority matrix |

Codex remains the synthesis lead. Agent output is review material until Codex integrates it under the current user instruction and project constitution.

## 9. Completion Language

Allowed:

```text
planned
mapped
lab-patched
visually checked
locally verified
approval-ready
live-applied
blocked
```

Not allowed without proof:

```text
complete
production-ready
safe
absorbed
fixed
finished
```

## 10. Immediate Next Action

The next owned action is:

```text
Phase 1: Memory And Knowledge Control Architecture
```

Scope:

- design only
- local documents only
- no live OpenClaw mutation
- no durable memory promotion
- no connector activation
- no Gateway restart

The next code-facing action after Phase 1 is:

```text
Phase 2: Source Call-Path Pass
```
