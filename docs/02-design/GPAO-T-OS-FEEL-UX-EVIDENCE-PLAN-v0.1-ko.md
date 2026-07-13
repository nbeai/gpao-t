# GPAO-T OS Feel UX Evidence Plan v0.1

Date: 2026-07-13
Status: active evidence plan

## Goal

Remove the feeling of a simple chat app. GPAO-T should feel like a Personal
Growth OS that preserves work, context, memory candidates, authority, and
growth state across turns and sessions.

This does not mean removing conversation. It means moving the first visual
center from message exchange to current work OS state:

```text
current work
-> context and memory status
-> authority boundary
-> progress bridge
-> next safe action
-> conversation as one operating lane
```

## Required Evidence Screens

1. Empty start
   - shows workspace, current goal, memory/context status, next safe action.
2. Short question
   - fast answer without heavy developer chrome.
3. Long answer / tool task
   - progress bridge appears before final response.
4. Memory candidate
   - shows what was considered, admitted, rejected, and why.
5. Session switch
   - active work, context source, and title remain clear.
6. Connection failure
   - user sees GPAO-T local connection recovery, not gateway internals.
7. Settings
   - identity, model, memory, connection, and automation are product language.
8. Mobile 390 x 844
   - no overlap, no clipped top content, composer reachable.

## Required Routes

Each user-accessible route must pass visible-copy and layout QA:

- `/chat`
- `/sessions`
- `/settings`
- `/agents`
- `/skills`
- `/nodes`
- `/dreaming`
- `/documents`

## P0 Criteria

- Visible OpenClaw/Gateway/ClawHub product residue: 0.
- Developer-only IDs, raw token, PID, host, session key: hidden by default.
- Progress state visible for slow turns.
- Memory/replay/apply is explainable without exposing raw internals.
- Telegram/direct appears as a dedicated communication lane, not as a raw
  session key in the normal work list.
- Slow tasks show a bridge before final response:
  `received -> context checked -> memory candidate reviewed -> running/checking -> answer`.
- Memory candidate inspector uses product labels:
  `used`, `excluded`, `held`, `reason`, `approval required`, `not promoted`.
- Connection failure screen uses GPAO-T language only and does not expose
  gateway internals by default.

## Verification

- desktop screenshot
- mobile 390 x 844 screenshot
- route visible-copy audit
- console fatal error count
- conversation lifecycle QA

## Chat-App Residue Score

The visual QA report should include a simple residue score. A route fails if
any P0 item is true.

| Signal | Pass | Fail |
| --- | --- | --- |
| Message dominance | conversation is one lane inside OS state | viewport is mostly bubbles/history/composer |
| Internal wording | product language | raw `Gateway`, `OpenClaw`, `ClawHub`, `admission`, `replay`, `session key`, token, PID, host |
| Next action | visible and useful | hidden, absent, or developer-only |
| Memory status | used/excluded/held is clear | raw memory IDs or replay IDs dominate |
| Mobile | no clipped top, no horizontal overflow, composer reachable | clipped header, overlap, unreachable composer |
