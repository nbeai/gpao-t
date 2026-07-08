# App Shell Decision Gate

Status: ready for decision, not approved for implementation  
Scope: transition from no-script Local Control Center reader to a local app shell

GPAO-T should not jump from a static reader into a desktop shell just because the UI is visually ready. The app shell becomes part of the operating system boundary, so it must be decided as infrastructure, not decoration.

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
   - Candidate: browser-local shell around the existing loopback server.
   - Candidate: Tauri desktop shell.
   - Candidate: Electron desktop shell.

2. What is the shell-to-runtime boundary?
   - Read-only HTTP over `127.0.0.1`.
   - Local IPC.
   - Hybrid: HTTP for read surfaces, IPC for future approved local actions.

3. What actions are allowed in the first shell slice?
   - Recommended first slice: read state, navigate panels, inspect evidence, open local files by explicit user action, and run safe verification previews.
   - Blocked first slice: external connectors, live model calls, installs, updates, rollback execution, durable memory promotion, live self-growth mutation, deployment, public release, deletion, or recurring automation.

4. How is rollback handled?
   - Source rollback remains local git.
   - Runtime rollback must be snapshot-based and explicit before any mutating shell action exists.
   - Packaging/update rollback is a later hardening gate, not part of the first shell slice.

## Recommended Decision

Proceed to app-shell contract design before implementation.

The first app-shell design should target a light local shell that reads the existing Control Center contracts and preserves no-external-activation behavior. It should not introduce connector execution, daemon persistence, packaging, or live mutation yet.

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

The gate can close only when the project can say:

- why this shell technology was chosen
- how it talks to GPAO-T runtime
- what it can and cannot do
- how authority boundaries are shown
- how failure is recovered
- how visual quality is verified
- what remains blocked until later approval

Until then, the correct product status is: app-shell decision gate open, implementation not started.
