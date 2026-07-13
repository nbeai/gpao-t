# GPAO-T OpenClaw Source Call-Path Pass 001

Status: mapped / live mutation not applied
Date: 2026-07-11
Owner: 윤

## 0. Purpose

This pass closes Phase 2 of the current GPAO-T work sequence.

The goal is to identify the OpenClaw chat/dashboard path before dashboard fork work.

## 1. Confirmed Path

```text
ChatPane / ChatState
-> requestChatSend()
-> GatewayBrowserClient.request("chat.send")
-> chatHandlers["chat.send"]
-> beginSessionWorkAdmission()
-> createUserTurnTranscriptRecorder()
-> dispatchInboundMessage()
-> dispatchReplyFromConfig()
-> runEmbeddedAgent()
-> attempt.ts
-> contextEngine.bootstrap / assemble / afterTurn
-> subscribeEmbeddedAgentSession()
-> tool / approval / transcript / final event
-> handleChatEvent()
-> ChatState / ChatThread render
```

## 2. UI Entry

| File | Role | GPAO-T use |
| --- | --- | --- |
| `ui/src/pages/chat/chat-page.ts` | Split-pane container and pane session routing. | Keep as multi-work surface substrate. |
| `ui/src/pages/chat/chat-pane.ts` | Per-pane state, active pane binding, session switch, task suggestions, render composition. | Reinterpret as `GpaoWorkPane` host. |
| `ui/src/pages/chat/chat-state.ts` | Chat state controller and send binding. | Attach Task Packet and current work state. |
| `ui/src/pages/chat/chat-send.ts` | `requestChatSend()` calls `client.request("chat.send", ...)`. | Insert pre-send read model / Task Packet boundary. |
| `ui/src/pages/chat/chat-gateway.ts` | Event handling back into chat state. | Attach progress lane and trace events. |
| `ui/src/pages/chat/chat-view.ts` | Thread/composer/sidebar composition. | Insert progress lane and inspector without breaking composer. |

## 3. Gateway / Runtime

| File | Role | GPAO-T use |
| --- | --- | --- |
| `src/gateway/server-methods/chat.ts` | WebChat `chat.send` handler. | First server-side admission boundary. |
| `src/gateway/server-methods/sessions.ts` | Session list/create/patch/send/abort. | Multi-session Work OS substrate. |
| `src/auto-reply/dispatch.ts` | Inbound dispatch to reply runtime. | GPAO-T route/admission observation point. |
| `src/agents/embedded-agent-runner/run.ts` | Embedded run orchestration. | Preserve skeleton. |
| `src/agents/embedded-agent-runner/run/attempt.ts` | Attempt lifecycle, context engine bootstrap/assemble/afterTurn, session subscription. | Main runtime absorption point. |
| `src/context-engine/types.ts` | ContextEngine contract. | Add Context Mesh / T-cell admission semantics. |
| `src/context-engine/legacy.ts` | Pass-through legacy context behavior. | Replace meaning, preserve compatibility fallback. |
| `src/gateway/server-methods/exec-approval.ts` | Approval request/list/resolve/wait. | Upgrade to Authority Ledger classes. |

## 4. Strengths To Preserve

- Split-pane chat workspace.
- Queued send, retry, reconnect, abort, run lifecycle.
- Session key and run id handling.
- Gateway method registry and event stream.
- Agent runner attempt boundary.
- Context-engine contract.
- Existing approval plumbing.
- Transcript and session history surfaces.

## 5. Weaknesses To Replace

- `LegacyContextEngine` is mostly a pass-through default.
- Memory/context can become prompt supplement before GPAO-T admission.
- Approval is method/tool oriented, not side-effect and task authority oriented.
- Chat/session is not yet Task Packet / work objective / trace / growth aware.
- UI progress is not dashboard-native enough for long work.

## 6. First Runtime Landing Zones

1. `ui/src/pages/chat/gpao-work-pane-state.ts`
2. `ui/src/pages/chat/gpao-control-client.ts`
3. `ui/src/pages/chat/chat-pane.ts`
4. `ui/src/pages/chat/chat-view.ts`
5. `src/context-engine/types.ts`
6. `src/agents/embedded-agent-runner/run/attempt.ts`
7. `src/gateway/server-methods/chat.ts`

## 7. Flow Keeper Check

Status: on-track

Authority Boundary:

- Allowed: source analysis, local GPAO-T docs/code/tests, lab patch package.
- Not touched: live OpenClaw, Gateway process, Telegram/model turns, credentials, durable memory.

Next Action:

```text
Dashboard Fork Map -> Lab/Fork UI Slice package
```

