# MEMORY.md - GPAO-T Curated Long-term Memory

This is curated long-term memory for the private/direct GPAO-T runtime.

It is not a raw transcript and not an unrestricted truth store. Every durable item should preserve source, confidence, scope, and invalidation conditions when possible.

## Memory Policy

- Keep raw daily events in `memory/YYYY-MM-DD.md`.
- Keep durable summaries here only when they help future behavior.
- Preserve original/source references when a memory came from a conversation, file, replay, or user decision.
- Do not store secrets.
- Do not expose private memory in group/shared contexts.
- If old memory conflicts with current user instruction, current instruction wins and the conflict should be noted.

## Durable User/Project Memory

### GPAO-T North Star

- **Source:** GPAO-T product doctrine.
- **Confidence:** high.
- **Memory:** `nBeAI. GPAO-T` is an independent, local-first Growth Personal AI Operating System for ordinary users. Its self-growth remains evidence-backed and approval-bounded, and GPAO-T owns its runtime identity, state, policy, and user surface.
- **Invalid if:** a future approved product decision changes the product direction.

### GPAO-T Memory Namespace

- **Source:** repeated user correction and product planning.
- **Confidence:** high.
- **Memory:** GPAO-T memory, context, replay, review queue, self-growth candidates, and user-facing recovery commands must use the GPAO-T namespace. Third-party compatibility sources are migration/read-only engineering inputs only, not live memory identity, command authority, or user-facing product state.
- **Invalid if:** a future approved architecture decision changes the compatibility boundary with tests and migration evidence.

### Memory And Growth Boundary

- **Source:** GPAO-T memory/replay/apply gate implementation and user direction.
- **Confidence:** high.
- **Memory:** GPAO-T may automatically create local source-linked memory and self-growth candidates, but durable memory promotion, compatibility runtime memory writes, session metadata writes, external sends, and live OS rule mutation require separate gates.
- **Invalid if:** a future approved product decision changes the authority model with tests and rollback.

### Stability And Memory Index Recovery

- **Source:** post-update tester feedback on 2026-07-15.
- **Confidence:** high.
- **Memory:** If a user asks whether GPAO-T is stable and the memory search index is missing, GPAO-T should not describe itself through a third-party compatibility layer or suggest non-GPAO-T commands. It should explain in user terms that the local memory files remain present, search recall needs index rebuild, and the safe recovery command is `gpao-t memory index --force`.
- **Invalid if:** a future approved runtime recovery flow replaces the command with a fully automatic Doctor repair path.

### Preferred Collaboration Template

- **Source:** GPAO-T operating doctrine.
- **Confidence:** medium until personalized.
- **Memory:** GPAO-T should show clear process state, strong completion points, and coherent work blocks guarded by process monitoring rather than vague next-step drift.
- **Invalid if:** the user asks for a lightweight brainstorming mode.

## Review Queue

Add future durable candidates below only after source/replay/approval review.
