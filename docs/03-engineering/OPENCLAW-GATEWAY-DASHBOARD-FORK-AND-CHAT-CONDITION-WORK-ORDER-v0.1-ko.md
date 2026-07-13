# OpenClaw Gateway Dashboard Fork And Chat Condition Work Order

Status: active product-direction work order
Date: 2026-07-10
Owner: 윤
Product: GPAO-T

## 0. Why This Exists

GPAO-T must be built by absorbing the user's live OpenClaw, not by drifting into a separate decorative surface.

The OpenClaw Gateway Dashboard is the current visible body. It already provides a clean local control shell, session navigation, chat composer, model/status controls, settings, skills, nodes, documents, and local runtime state.

The goal is not to improve OpenClaw for OpenClaw's sake. The goal is to turn this dashboard body into a GPAO-T Control Center: a Codex-like multi-conversation personal AI work OS powered by GPAO Core, T-cell admission, Context Mesh, authority boundaries, replay, and self-growth.

## 1. User-Provided Reference Screens

The user provided two reference captures on 2026-07-10:

1. OpenClaw Gateway Dashboard in Safari on `127.0.0.1`
   - Current state: one visible chat surface under `Main Session`.
   - Left rail: OpenClaw Control branding, `New session`, `Main Session`, usage, recent/chat/control/agent/settings/document sections.
   - Center: single assistant landing/chat panel with suggestion buttons and bottom composer.
   - Right rail: narrow utility strip.
   - Version visible: `v2026.6.11`.

2. Telegram conversation with `Aigis`
   - Shows that OpenClaw/Telegram can display live work progress while the task is running.
   - That transient progress disappears when the final response remains.
   - This behavior is useful as a reference for GPAO-T's progress lane, but Telegram is not the primary product surface.

These references must be treated as lived local evidence. They are more important than abstract UI imagination.

## 2. Non-Negotiable Product Direction

GPAO-T's main user environment path is:

```text
live OpenClaw Gateway Dashboard
  -> pure OpenClaw source anatomy
  -> dashboard fork/wrap plan
  -> Codex-like multi-chat work rhythm
  -> GPAO-T Control Center / Work OS
```

Do not invert this into:

```text
separate GPAO-T mock surface
  -> pretty dashboard
  -> maybe later OpenClaw
```

That drift is explicitly rejected.

Additional source rule:

- nbeai GitHub repositories are the first source library for GPAO / BEAI Package / OpenClaw-facing package / Codex-facing package / Knowledge Loop / T-cell-related prior work. Hardware Engine material is retired from the current GPAO-T scope unless 윤 explicitly reopens it.
- Hidden previous-work result storage is deprecated and must not be treated as the active source of truth.
- Dashboard work must avoid final sidecar/plugin-only integration. The dashboard is part of the OpenClaw body that must be transformed from within.
- Wrappers are allowed only as migration scaffolding. The target is internal absorption, replacement, modification, and verified strengthening.

## 3. Target Experience

The target is a Codex-like multi-conversation work OS built out of OpenClaw's dashboard body.

The user should feel:

- I can open several conversations or work sessions at once.
- I can switch between them without losing context.
- Each session has a visible active target, progress state, authority boundary, and context source.
- The OS shows what it is doing before the final answer.
- The dashboard is calm, direct, and work-focused, not a box/card-heavy report page.
- OpenClaw's local runtime stability is still underneath, but the visible experience is GPAO-T.

## 4. What To Keep From OpenClaw Dashboard

Keep or closely mirror:

- Local Gateway shell discipline.
- Left rail navigation.
- Session creation and session list patterns.
- Bottom composer placement.
- Model/status controls.
- Utility/settings surfaces.
- Right-side inspector potential.
- Clean spacing and restrained local dashboard feel.
- Existing source-level split chat primitives under `ui/src/pages/chat`.
- Workboard lifecycle primitives where they help Task Packet / T-cell operation cards.

## 5. What Must Change

The current dashboard feels like a single assistant chat page. GPAO-T needs a multi-work-session operating surface.

Change direction:

- `Main Session` selector becomes a real session/workspace rail.
- The center becomes multi-pane or tabbed conversation workspace.
- Each pane can bind to a separate session, active target, or Task Packet.
- The right rail becomes a context/authority/source/progress inspector.
- Progress states become first-class dashboard UI, not only temporary Telegram status.
- Chat condition must be visible in user terms: current goal, progress, waiting, tool/model state, context use, latency/placeholder state, and final answer readiness.

## 6. Codex-Like Translation

Codex is not copied visually one-to-one. Codex is the work-rhythm reference.

Translate Codex qualities into GPAO-T:

- Left rail: project/session/task navigation.
- Center: wide work/conversation area.
- Bottom: persistent composer.
- Right: environment, source, authority, and context panel.
- Threads/tasks: multiple active work surfaces, not one global chat.
- Status: visible but quiet.
- Closeout: evidence-backed, not just final text.

## 7. Telegram Progress Translation

Telegram's live progress behavior is useful, but insufficient.

GPAO-T should translate it into:

- A compact progress lane per active pane.
- Optional expandable trace.
- Clear waiting/running/blocked/finalizing states.
- Local-first placeholder or latency signal.
- Final answer plus inspectable progress history where useful.

The progress lane should not become noisy. It exists to help the user trust that work is happening and understand where the work is stuck.

## 8. First Safe Development Slices

Before mutating live OpenClaw, use pure source anatomy and local fork/lab work.

Recommended order:

1. Source call-path pass
   - `chat.send` -> agent dispatch -> runner -> context-engine -> tool approval -> session transcript.
   - `chat-page.ts` / `split-layout.ts` / `chat-pane.ts` exact UI state flow.
   - Workboard mutation path and proof/artifact model.

2. Dashboard fork map
   - Identify exact files to fork/wrap.
   - Define `GpaoControlClient`.
   - Define `GpaoAppContext`.
   - Define `GpaoWorkPane`.
   - Define `GpaoSessionRail`.
   - Define `GpaoInspector`.

3. Visual transformation pass
   - Keep OpenClaw dashboard shell.
   - Add Codex-like multi-session rail behavior.
   - Add tab/split/multi-pane affordance.
   - Add active target strip.
   - Add compact progress lane.
   - Add local-first latency/placeholder signal.

4. Evidence pass
   - Desktop screenshot.
   - Mobile screenshot.
   - Non-overlap check.
   - Text fit check.
   - No card-heavy dashboard regression.
   - No live OpenClaw mutation unless explicitly approved.

## 9. Authority Boundary

Allowed without additional user approval:

- Read pure OpenClaw source.
- Read local GPAO-T docs/code.
- Create or update local planning/design documents.
- Create lab/fork code under workspace-controlled directories.
- Run local non-live tests.
- Produce screenshot evidence for local/lab surfaces.

Requires explicit approval:

- Mutating live OpenClaw files outside the workspace boundary.
- Restarting live Gateway.
- Running live Telegram/OpenClaw model turns.
- Changing credentials or tokens.
- Activating connectors/automation.
- Promoting durable memory.
- Pushing GitHub.
- Publishing or deploying.

## 10. Current Working Truth

As of this work order:

- The previous missing work-order path was referenced by `gpao-t/docs/README.md` but the file itself was absent in the current workspace.
- This document restores that work-order anchor.
- The current source anatomy anchor is:
  `/Users/jyp/Documents/Playground 2/openclaw-clean-lab/docs/OPENCLAW-GITHUB-SOURCE-ANATOMY-PASS-001-2026-07-10.md`
- The Context Mesh turn-start command was broken by a missing module:
  `beai-harness-for-codex/src/core/gpao-t-openclaw-skill-delta-watch.js`
- A separate agent restored that module. A follow-up smoke command returned `BEAI Context Mesh Saved` and produced `TURN-START-CONTEXT.md/json`.
- Remaining `beai-harness-for-codex` full-test failures are separate from this missing-module fix. They are tied to pre-existing deleted OpenClaw adapter paths and some blocked/review expectation drift.

## 11. Success Criteria

The next dashboard work is successful only if:

- The user can recognize the OpenClaw Gateway Dashboard body.
- The UI clearly moves toward Codex-like multi-session work rhythm.
- Multiple conversations/work panes are part of the design, not an afterthought.
- Progress before final answer is visible in the dashboard.
- GPAO-T concepts appear as operating state, not decorative labels.
- OpenClaw remains the material, not the product owner.
- Live mutation remains gated until source anatomy, fork plan, rollback, and QA are ready.
