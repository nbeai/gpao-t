# GPAO-T Dashboard Fork Map And Lab UI Slice 001

Status: lab patch package ready / live mutation not applied
Date: 2026-07-11
Owner: 윤

## 0. Purpose

This document closes Phase 3 and Phase 4 of the current GPAO-T work sequence.

The goal is not to create a separate GPAO-T mock dashboard. The goal is to convert the OpenClaw Gateway Dashboard body into a GPAO-T Control Center by absorbing GPAO-T state into OpenClaw's existing pane/session/composer shell.

## 1. Keep

- `ui/src/app/context.ts`: gateway, sessions, agents, workboard, navigation, theme.
- `ui/src/api/gateway.ts`: `GatewayBrowserClient.request(method, params)`.
- `ui/src/components/app-sidebar.ts`: session create, pin, unread, active run spinner, grouping, drag/drop.
- `ui/src/pages/chat/chat-page.ts`: `ChatSplitLayout`, pane insert/close/resize/drop.
- `ui/src/pages/chat/chat-pane.ts`: active pane binding, session switch, queue/reconnect/run lifecycle.
- `ui/src/pages/chat/components/chat-composer.ts`: bottom composer, queue, abort, compact, model controls.

## 2. Introduce

| GPAO-T part | Target | First purpose |
| --- | --- | --- |
| `GpaoControlClient` | `ui/src/pages/chat/gpao-control-client.ts` | Thin wrapper over `GatewayBrowserClient.request`. |
| `GpaoAppContext` / read model | `ui/src/pages/chat/gpao-app-context.ts` | Pane/session/task/context/authority/progress state. |
| `GpaoWorkPane` meaning | `ui/src/pages/chat/chat-pane.ts` | Expand `ChatPane` into work pane without replacing it. |
| `GpaoInspector` | `ui/src/pages/chat/components/gpao-inspector.ts` | Context / Authority / Progress / Sources / Trace tabs. |

## 3. First Lab UI Slice

1. Add a thin active target strip under the pane header.
2. Add compact progress lane under the active target strip.
3. Add a right inspector to the active pane area.
4. Preserve the existing composer and split layout.
5. Preserve mobile/narrow behavior by showing only the active pane.

## 4. Acceptance Criteria

- The OpenClaw Gateway Dashboard body remains recognizable.
- Multiple sessions/panes can still open and switch.
- Each pane shows current target, progress, authority, context, and latency state.
- Progress remains dashboard-native instead of disappearing after final answer.
- The UI does not become a nested card dashboard.
- Desktop/mobile screenshot QA is required after applying the patch to a lab/fork.
- Live OpenClaw mutation waits for a diff package and rollback path.

## 5. Patch Package

Patch package:

```text
docs/03-engineering/patches/openclaw-dashboard-gpao-workpane-slice-001.patch
```

The patch is a lab/fork package. It is not applied to live OpenClaw in this pass.

## 6. Flow Keeper Check

Status: on-track

Drift Check:

- OpenClaw internal absorption: pass
- Lab before live: pass
- Sidecar/mock drift: pass
- Current user instruction preserved: pass

Evidence:

- Source call-path mapped.
- Memory/knowledge control architecture fixed.
- Dashboard fork map fixed.
- Local GPAO-T contract code and tests added.
- Lab patch package written for review/application.

Missing Before Live:

- Apply patch to a lab/fork.
- Run OpenClaw UI checks.
- Capture desktop/mobile screenshot QA after patch.
- Confirm exact live OpenClaw source path and rollback path.

