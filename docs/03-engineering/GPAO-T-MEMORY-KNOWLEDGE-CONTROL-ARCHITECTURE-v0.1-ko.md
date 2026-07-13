# GPAO-T Memory And Knowledge Control Architecture v0.1

Status: active architecture
Date: 2026-07-11
Owner: 윤

## 0. Purpose

This document closes Phase 1 of the current GPAO-T work sequence.

The goal is to make GPAO-T's memory, raw data, wiki, Context Mesh, T-cell admission, Knowledge Loop, and Task Packet boundaries clear before changing OpenClaw UI or live runtime behavior.

## 1. Architecture

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

Operating principle:

```text
OpenClaw memory recalls.
Raw Vault preserves.
Source Record proves.
LLM Wiki organizes.
Context Mesh connects.
T-cell admits.
Knowledge Loop grows by review.
Task Packet acts.
```

## 2. Layer Roles

| Layer | Role | Must not become |
| --- | --- | --- |
| OpenClaw Memory | Fast recall/search, memory/session search, hybrid search, temporal decay, memory-wiki search. | Answer authority. |
| Raw Data Vault | Preserve original conversations, files, logs, docs, screenshots, external notes, and transcripts without destructive rewrite. | A summarized-only memory store. |
| Source Record | Bind source path/tool/time/owner/confidence/sensitivity/freshness to raw material. | Decorative citation metadata. |
| LLM Wiki Compiler | Compile raw material into LLM-readable pages, claims, digests, contradictions, stale markers, and source links. | Replacement for raw data. |
| Context Mesh | Select relevant candidates and reject stale or wrong-anchor memory for the current request. | Retrieval-only prompt stuffing. |
| T-cell Admission | Classify candidate use as answer anchor, supporting context, review-before-reuse, or do-not-anchor. | Generic ranking score. |
| Knowledge Loop | Convert repeated value or repeated failure into review-only growth candidates. | Hidden self-mutation. |
| Task Packet | Hold the current objective, authority, admitted context, evidence, progress, and next action. | A plain chat message. |

## 3. Non-Negotiable Type Separation

```text
stored memory != admitted context
retrieved result != answer anchor
wiki page != truth
old memory != current user intent
candidate insight != live operating rule
observed failure != mutation
```

OpenClaw memory can find useful material, but GPAO-T decides whether that material may act.

## 4. OpenClaw Reuse

Keep and absorb:

- `src/plugins/memory-state.ts`: memory runtime, prompt supplement, corpus supplement registration.
- `src/agents/memory-search.ts`: memory/session search settings, hybrid search, decay, sync policy.
- `extensions/memory-wiki/README.md`: source/entity/concept/synthesis/report vault, claim health, contradictions, stale pages, digest cache.
- `src/talk/fast-context-runtime.ts`: fast context lookup path.
- `packages/agent-core/src/harness/session/session.ts`: transcript, compaction, and replayable session storage skeleton.

Reframe:

- OpenClaw memory is a recall organ.
- LLM Wiki is a compiled reading surface.
- Context Mesh and T-cell Admission decide current-turn use.
- Knowledge Loop can propose growth, but cannot promote durable memory or mutate live rules without review/replay/authority gates.

## 5. GPAO-T Landing Zones

Current GPAO-T code already has the right skeleton:

- `src/core/memory-wiki.js`: candidate memory and T-cell candidate capture.
- `src/core/context-runtime.js`: Context Mesh before admission.
- `src/core/admission.js`: answer anchor / support / rejected boundary.
- `src/core/authority.js`: external and destructive authority gate.
- `src/core/turn-kernel.js`: input -> context -> admission -> authority -> task packet.
- `src/core/openclaw-absorption-control.js`: current architecture contract and one-stop absorption package.

## 6. Implementation Order

1. Convert OpenClaw memory/wiki/search results into `SourceRecord[]`.
2. Extend GPAO-T Context Mesh to accept `sourceType: "openclaw_memory" | "openclaw_memory_wiki" | "openclaw_session"`.
3. Add `memory_used`, `memory_excluded`, and `why` to Admission Packet.
4. Add admitted-only memory to Task Packet.
5. Send repeated failure or high-value behavior only to Knowledge Loop candidates.
6. Show used/excluded memory and reasons in GPAO-T Inspector.

## 7. Flow Keeper Check

Status: on-track

Drift Check:

- OpenClaw internal absorption: pass
- Lab before live: pass
- Sidecar/mock drift: pass
- Current user instruction preserved: pass

Authority Boundary:

- Allowed: local docs, local GPAO-T contract code, local tests.
- Requires boundary report: lab/fork patch application, live OpenClaw mutation, Gateway restart.
- Not touched: live OpenClaw, durable memory promotion, connector activation, external send.

Next Action:

```text
Source Call-Path Pass -> Dashboard Fork Map -> Lab UI Slice package
```

