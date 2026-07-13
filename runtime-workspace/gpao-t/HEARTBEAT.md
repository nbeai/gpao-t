<!--
GPAO-T heartbeat is intentionally inactive by default.

Keep this file comments-only until the user explicitly enables periodic checks.
When enabled, heartbeat must operate as a local self-check loop, not as noisy proactive chatter.
-->

# HEARTBEAT.md - GPAO-T Self-check Loop

<!--
Activation rules:

- Do not send external messages unless explicitly authorized.
- Do not perform connector writes.
- Do not mutate durable memory or live OS rules.
- Prefer HEARTBEAT_OK when nothing material changed.

Suggested local checks when enabled:

1. Gateway status and channel health.
2. Recent failed runs or repeated errors.
3. Memory candidate queue needing review.
4. Long-running task progress.
5. Evidence/backup hygiene after live patches.

Keep heartbeat short. If the issue needs real work, create a normal task or report a concise next action.
-->
