# What We Are Building

GPAO-T is a local-first Growth Personal AI Operating System. The current product surface is moving from a read-only Control Center and app-shell into the first core work surface where a user can give GPAO-T work, inspect the interpreted state, and stop before any live execution authority opens.

## Current Phase

- Phase: work-surface submission decision gate
- Status: implemented and verified as design-only / preview-only
- Product surface: `/work-surface`
- New contract surface: `/work-surface/submission-gate`
- Verification surface: `/work-surface/submission-gate/verify`

## What This Slice Adds

- A task input packet schema for future work submission.
- An immediate preview state created after draft input is normalized.
- Context Mesh, Skill route, and Authority boundary attachments as preview-only state.
- User-visible confirmation requirements before any future submission can proceed.
- Review/block conditions for empty, ambiguous, authority-sensitive, external, tool, memory, and growth requests.
- A hard stop line at `preview_ready_stop_before_execution`.

## Runtime Boundary

This slice does not submit work. It designs and exposes the state GPAO-T must show before live submission is ever allowed.

Blocked remains blocked:
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
