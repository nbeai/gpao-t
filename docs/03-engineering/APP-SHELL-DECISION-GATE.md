# App Shell Decision Gate

Status: decision closed, implementation not started
Scope: transition from the no-script GPAO-T dashboard to a local app shell

GPAO-T should not jump from a static reader into a desktop shell just because the UI is visually ready. The app shell becomes part of the operating system boundary, so it must be decided as infrastructure, not decoration.

The decision is now recorded in `docs/03-engineering/APP-SHELL-TECHNOLOGY-DECISION.md`.

The packaged desktop transition is governed by `docs/03-engineering/TAURI-PACKAGED-DESKTOP-GATE.md`. That gate closes the safe boundary for a future read-mostly Tauri shell slice, but it does not start a full Tauri implementation, packaging, install/update/rollback execution, connector activation, model/tool activation, deployment, messenger, or automation.

## Entry Requirements

These gates must stay closed before app-shell implementation begins:

- no-script reader visual QA passed
- mobile visual/UX gate passed
- richer Control Center behavior pass 1 passed
- state/workflow views passed
- human-readability check passed
- local git rollback substrate exists
- `.gpao-t/` runtime state remains ignored
- no external activation remains preserved

## Non-Negotiable Invariants

- Local-first by default.
- Loopback-only or local IPC until a later explicit connector gate.
- No OAuth setup, token storage, external model call, external tool execution, send, publish, deploy, deletion, recurring automation, or durable memory promotion from the shell.
- Authority boundary must be visible before action.
- Next safe action must remain visible.
- Mobile fixed topbar action line or decision strip must remain visible until a better mobile command pattern replaces it.
- App shell state must be derived from runtime contracts, not from hidden UI-only state.
- Every action-capable surface must have audit, replay, rollback, and approval semantics before it mutates product state.
- Desktop and mobile screenshots remain required before visual quality claims.

## Decision Questions

1. Which shell technology is the first production target?
   - Decision: browser-local shell around the existing loopback server.
   - Next packaged desktop target: Tauri.
   - Deferred fallback: Electron.

2. What is the shell-to-runtime boundary?
   - Decision: read-mostly HTTP over `127.0.0.1` for the first browser-local shell slice.
   - Local IPC is blocked in the first slice.
   - Later hybrid target: HTTP for read surfaces, Tauri command/IPC for explicit approved local actions.

3. What actions are allowed in the first shell slice?
   - Decision: read state, navigate panels, inspect evidence, show authority boundaries, show next safe action, refresh visible state, and support screenshot QA.
   - Blocked first slice: `POST` routes, external connectors, live model calls, installs, updates, rollback execution, durable memory promotion, live self-growth mutation, deployment, public release, deletion, recurring automation, and messenger surfaces.

4. How is rollback handled?
   - Source rollback remains local git.
   - Runtime rollback must be snapshot-based and explicit before any mutating shell action exists.
   - Packaging/update rollback is a later hardening gate, not part of the first shell slice.

5. What failure states must exist before implementation?
   - Decision: runtime unavailable, health not ready, invalid snapshot, stale snapshot, port conflict, permission blocked, overflow regression, authority hidden, and next action hidden.

## Recommended Decision

Proceed to app-shell contract design before implementation.

The first app-shell design must target a browser-local shell that reads the existing Control Center contracts over `127.0.0.1` and preserves no-external-activation behavior. It must not introduce connector execution, daemon persistence, packaging, IPC, or live mutation yet.

## Required Deliverables Before Code

- Technology decision record.
- Threat model and authority boundary.
- Local server or IPC contract.
- Shell state model.
- Runtime snapshot contract reuse plan.
- Screenshot verification plan.
- Failure and recovery state map.
- Packaging/update/rollback deferral policy.

## Exit Criteria

This gate is closed because the project can now say:

- why this shell technology was chosen
- how it talks to GPAO-T runtime
- what it can and cannot do
- how authority boundaries are shown
- how failure is recovered
- how visual quality is verified
- what remains blocked until later approval

The correct product status is now: app-shell decision gate closed, implementation not started.
