# GPAO-T Runtime Heart Hardening Plan - 2026-07-13

Status: active Phase 2 hardening direction
Owner: 윤
Purpose: strengthen GPAO-T's low-level runtime heart without reintroducing OpenClaw identity.

## 0. Naming Rule

The official name of this hardening lane is:

```text
GPAO-T Runtime Heart Hardening
```

Do not describe this lane in product-facing documents as "OpenClaw absorption" or "OpenClaw-based enhancement."

Correct wording:

```text
Analyze low-level runtime stability patterns from comparison products and redesign them inside GPAO-T's Personal Growth OS architecture.
```

Short Korean wording:

```text
저수준 런타임 안정성 패턴을 분석하고 GPAO-T 구조에 맞게 재설계해 내재화한다.
```

## 1. Product Boundary

OpenClaw is now treated as a separate comparison product and reference sample.

Allowed:

- compare OpenClaw runtime patterns
- inspect OpenClaw reference source outside GPAO-T product paths
- cite OpenClaw only in internal evidence/comparison documents
- learn from provider, session, gateway, plugin, channel, and doctor patterns

Not allowed:

- present GPAO-T as OpenClaw-based in user-facing surfaces
- let OpenClaw names, icons, paths, login copy, or debug language leak into the dashboard
- import OpenClaw identity into GPAO-T product documents
- use OpenClaw compatibility traces as completion evidence

## 2. Heart Lanes

### 2.1 Provider/Auth Heart

Priority: P0

Goal:

Model connection must feel reliable and self-recovering. A user should not see raw missing-auth or token confusion as the first experience.

Hardening scope:

- canonical GPAO-T auth store
- compatibility auth migration
- provider health readback
- missing-auth recovery flow
- auto-login and local dashboard connection stability
- fresh chat smoke after install/reinstall/repair

User-facing evidence:

- dashboard opens without manual token entry
- fresh chat turn succeeds through provider/model
- missing provider/auth state appears as a plain GPAO-T recovery message
- logs show no new fatal/auth/provider error after repair

Plain-language meaning:

GPAO-T must know whether its model connection is alive, and if it is not, it must explain and repair the problem without dumping raw engineering errors on the user.

### 2.2 Doctor/Recovery Heart

Priority: P0

Goal:

GPAO-T should find and explain runtime problems before the user has to diagnose them.

Hardening scope:

- GPAO-T health center
- repair suggestions
- rollback/reinstall readiness
- log summarization
- safe recovery actions
- first-run and post-update checks

User-facing evidence:

- health is not only HTTP 200; it includes dashboard, provider, chat, memory, and logs
- recovery report uses GPAO-T language
- dangerous repair actions are gated
- safe local repair suggestions are visible and actionable

Plain-language meaning:

This is the difference between "the app crashed" and "GPAO-T knows what is wrong and tells you how it will recover."

### 2.3 Session/Event Heart

Priority: P1

Goal:

Dashboard sessions, Telegram direct session, work conversations, memory candidates, and audit events must not contaminate each other.

Hardening scope:

- session identity map
- thread/session/context/memory separation
- Telegram direct session contract
- event stream normalization
- message lifecycle trace
- rename/archive/delete-pending behavior

User-facing evidence:

- Telegram appears as a dedicated communication session
- dashboard multi-session remains independent
- first-input titles are stable
- session-specific memory/context does not bleed into unrelated sessions
- event/history view can explain what happened without developer jargon

Plain-language meaning:

Each conversation must know who it is, where it came from, and which memories it is allowed to use.

### 2.4 Memory/Context Heart

Priority: P1

Goal:

Memory and context must remain useful even when provider embedding quota or network-dependent semantic search is unavailable.

Hardening scope:

- local-first lexical search
- local hybrid memory search
- optional local embedding provider
- provider embedding as enhancement, not dependency
- Context Mesh admission
- replay-based memory quality check
- offloaded/iCloud placeholder safe reader

User-facing evidence:

- basic memory recall works without provider embedding quota
- semantic search degradation is explained but does not break basic recall
- context used in an answer can be inspected
- memory promotion remains gated by replay/admission

Plain-language meaning:

GPAO-T's memory should not become dumb just because an external embedding quota is exhausted.

### 2.5 Tool/MCP/Authority Heart

Priority: P2

Goal:

GPAO-T should be powerful because it knows what actions are allowed, not merely because many tools are connected.

Hardening scope:

- capability ledger
- side-effect classes
- read/write/send/spend/deploy/credential/public boundary
- MCP/tool permission map
- tool execution trace
- approval and rollback contracts

User-facing evidence:

- the user sees what action is allowed now
- external sends, deletes, deployments, credentials, and spending are clearly gated
- tool failures become recovery states, not raw stack traces
- audit trail shows why an action was allowed or blocked

Plain-language meaning:

GPAO-T's core authority principle is: possible functions matter less than permitted actions.

## 3. Priority Order

The current execution order is:

1. Provider/Auth Heart
2. Doctor/Recovery Heart
3. Session/Event Heart
4. Memory/Context Heart
5. Tool/MCP/Authority Heart

Reason:

Provider/auth and recovery determine whether the user can trust the system at all. Session identity protects context quality. Memory/context then becomes smarter. Tool/MCP authority should expand last because it can create real-world side effects.

## 4. Completion Evidence Rule

Each Heart lane requires user-experience evidence, not only unit tests.

Minimum evidence per lane:

- source/test evidence
- live/runtime health where relevant
- visible dashboard or CLI readback
- fresh user-like scenario
- log review for new fatal/auth/provider/runtime errors
- recovery path or explicit blocked reason

Never mark a Heart lane complete from health 200 alone.

## 5. Current First Target

The first implementation target is Provider/Auth Heart.

Initial tasks:

1. Map all current GPAO-T auth stores and compatibility stores.
2. Define one canonical GPAO-T provider/auth contract.
3. Add or harden migration/repair logic so install/reinstall does not split auth state.
4. Improve user-facing missing-auth guidance.
5. Add fresh chat turn verification to the completion gate.

## 6. Decision

GPAO-T Runtime Heart Hardening is the next major hardening lane after first completion.

OpenClaw remains a comparison reference only. The product direction is not OpenClaw absorption. The product direction is GPAO-T-native runtime heart hardening through redesigned internalization.
