# What We Are Building

GPAO-T is a local-first Growth Personal AI Operating System. The current product surface is the first core work surface where a user can give GPAO-T work, inspect how GPAO-T understands it, and stop before any live execution authority opens.

## Current Phase

- Phase: work-surface submission validation and confirmation gate
- Status: implemented and verified as final pre-submit / preview-only
- Product surface: `/work-surface`
- Decision gate: `/work-surface/submission-gate`
- Final pre-submit gate: `/work-surface/submission-validation-gate`
- Verification surface: `/work-surface/submission-validation-gate/verify`

## What This Slice Adds

- Required field validation for the preview submission packet.
- Empty input blocking before the turn kernel or execution path can receive it.
- Input length review for oversized draft requests.
- Risk signal detection for external send, tool/CLI/MCP execution, connector activation, durable memory, self-growth, and authority-sensitive operations.
- Checks that Context Mesh preview, Skill route preview, and Authority preview are attached.
- A confirmation card contract that tells the user nothing has executed yet.
- Product-language blocked/review states.
- README freshness warning tracked as documentation alignment, not execution permission.
- Stop rule: do not split submission meta-gates further after this gate.

## Runtime Boundary

This slice does not submit work. It validates and explains the state GPAO-T must show before live submission is ever allowed.

Blocked remains blocked:
- live submission
- live model call
- tool/CLI/MCP execution
- connector activation
- external network/send
- approval record write
- install/update/rollback execution
- durable memory promotion
- self-growth apply

## Companion Principle

AI does the work. User keeps authority. GPAO-T should feel like a clear local work companion, not a hidden automation engine.
