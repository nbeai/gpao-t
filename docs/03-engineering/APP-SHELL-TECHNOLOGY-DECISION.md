# App Shell Technology Decision

Status: decided
Decision date: 2026-07-09
Scope: decision gate only, no app-shell implementation

## Decision

GPAO-T's first app-shell target is a browser-local shell over the existing `127.0.0.1` preview/runtime HTTP boundary.

The first packaged desktop shell target is Tauri, after the browser-local shell proves state reading, authority visibility, screenshot QA, and failure/recovery behavior.

Electron is not selected for the first GPAO-T app shell. It remains a fallback only if Tauri blocks a required production path that browser-local plus Tauri cannot satisfy.

## Source-Grounded Comparison

| Option | Strength | Risk | GPAO-T Decision |
| --- | --- | --- | --- |
| Browser-local shell | Reuses existing loopback serving, fastest to verify, no new native runtime, excellent for no-external-activation discipline. | Not a packaged desktop app; browser chrome is not the final product feel; OS integration is limited. | Selected first target. |
| Tauri | Official positioning emphasizes small, fast, secure cross-platform apps; uses OS WebView; has Rust command/IPC model and permission/capability concepts. | Requires Rust/Tauri toolchain and later packaging/signing decisions; OS WebView behavior can vary by platform. | Selected first packaged desktop target after browser-local proof. |
| Electron | Mature desktop ecosystem, strong web stack familiarity, explicit IPC patterns, broad examples. | Bundles Chromium/Node runtime, larger footprint, and requires strict security hardening around Node integration, context isolation, sandboxing, navigation, external open, and IPC sender validation. | Deferred; not first target. |

Reference anchors:

- Tauri states its goal as small, fast, secure cross-platform applications and notes use of the OS native web renderer for minimal app size: https://v2.tauri.app/
- Tauri security docs define trust boundaries between frontend WebView and Rust core, with IPC and capabilities controlling exposed resources: https://v2.tauri.app/security/
- Tauri frontend-to-Rust communication uses commands that can accept arguments, return values, return errors, and run async: https://v2.tauri.app/develop/calling-rust/
- Electron security docs require a strict security checklist including no Node integration for remote content, context isolation, sandboxing, CSP, navigation limits, and IPC sender validation: https://www.electronjs.org/docs/latest/tutorial/security
- Electron IPC uses developer-defined channels between main and renderer processes: https://www.electronjs.org/docs/latest/tutorial/ipc

## Shell-To-Runtime Boundary

First slice boundary:

```text
Browser-local shell
-> read-mostly HTTP over 127.0.0.1
-> existing GPAO-T Control Center contracts
-> no native IPC
-> no external activation
```

First slice allowed HTTP surfaces:

- `GET /health`
- `GET /control-center`
- `GET /control-center/summary`
- `GET /control-center/design`
- `GET /control-center/ui-contract`
- `GET /control-center/ui-snapshot`
- `GET /control-center/ui-validate`

First slice blocked HTTP surfaces:

- `POST /turn`
- `POST /connectors/review`
- `POST /growth/application-gate`
- `POST /growth/application-gate/record`
- any future mutating route until an explicit shell action gate exists

Later packaged shell boundary:

```text
Tauri shell
-> HTTP for read surfaces
-> Tauri command/IPC only for explicit, approved local actions
-> per-command authority, audit, replay, and rollback contracts
```

Electron fallback boundary, if ever needed:

```text
Electron shell
-> contextIsolation on
-> nodeIntegration off
-> sandbox on
-> restrictive CSP
-> validated IPC sender for every channel
-> no shell.openExternal for untrusted content
```

## First Slice Allowed Actions

The browser-local shell may:

- read runtime and Control Center state
- navigate panels
- inspect evidence
- show authority boundaries
- show next safe action
- refresh visible state
- support desktop/mobile screenshot QA
- expose stale/unavailable/invalid-state recovery messages

It may not mutate GPAO-T runtime state.

## First Slice Blocked Actions

The browser-local shell must not:

- configure OAuth
- store tokens or secrets
- call external models
- execute external tools
- send messages or files externally
- install, update, rollback, or start a persistent daemon
- run destructive file operations
- promote durable memory
- apply self-growth proposals
- activate connectors
- deploy or publish
- trigger recurring automation
- open messenger surfaces
- run `POST` routes

## Authority, Audit, Replay, And Rollback

Authority:

- Every visible command area must show whether the action is `read_only`, `preview_only`, `approval_required`, or `blocked`.
- The first browser-local shell exposes only `read_only` and `blocked` states.

Audit:

- The first shell slice does not write audit events from UI interaction.
- Screenshot QA and verification evidence may be written by developer-owned verification commands under ignored local evidence paths.
- Any future mutating shell command must write before/after audit records.

Replay:

- The first shell slice reuses snapshot/UI validation and screenshot evidence as replayable visual state.
- Future action-capable shell commands need replay fixtures before activation.

Rollback:

- Source rollback remains local git.
- Runtime rollback remains blocked until snapshot export/import and explicit approval exist.
- Packaging/update rollback remains a later hardening gate.

## Screenshot QA Gate

Before claiming shell visual quality, verification must capture or inspect:

- desktop viewport: `1440x960`
- mobile viewport: `390x844`
- nonblank viewport
- panel navigation visible and working
- inspector visible and reachable
- no horizontal overflow
- authority boundary visible
- next safe action visible
- mobile fixed topbar action line or decision strip visible
- no `<script>` in no-script surfaces
- no external activation
- failure/recovery state visible when runtime is unavailable or schema validation fails

## Failure And Recovery States

The app shell must model these states before implementation:

- `runtime_unavailable`: loopback server not reachable; show restart/check command and keep actions blocked.
- `health_not_ready`: `/health` responds but status is not ready; show diagnostics path.
- `snapshot_invalid`: UI snapshot or validation fails; show schema failure and block shell actions.
- `stale_snapshot`: state is older than expected; show refresh path and stale marker.
- `port_conflict`: chosen loopback port is occupied; show alternate-port recovery.
- `permission_blocked`: browser or OS blocks a local action; show manual recovery and do not retry silently.
- `overflow_regression`: screenshot QA finds horizontal overflow; block visual-quality claim.
- `authority_hidden`: authority boundary is not visible; block shell progression.
- `next_action_hidden`: next safe action is not visible; block shell progression.

## Gate Result

The app-shell decision gate is closed for planning.

The first implementation step after this decision is the browser-local app-shell contract/build:

- `gpao-t control app-shell-contract`
- `gpao-t control app-shell-state`
- `gpao-t control app-shell-html`
- `gpao-t control app-shell-check`
- `GET /app-shell`
- `GET /app-shell/contract`
- `GET /app-shell/state`
- `GET /app-shell/verify`

This implementation must remain browser-local, read-mostly, loopback-only, screenshot-verifiable, and no-external-activation.
