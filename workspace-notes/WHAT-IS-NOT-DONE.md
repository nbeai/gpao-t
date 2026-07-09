# What Is Not Done

## Still Excluded

- live model/provider calls
- tool / CLI / MCP execution from model output
- connector activation
- credential read/write
- external send
- paid or destructive action
- public release / deployment
- durable memory promotion
- permanent deletion without recoverable pending state

## Current Completion Boundary

- Stage 3 is not fully complete until browser-mediated local confirmation, replay review, and rollback reference reading are all user-visible and authority-bounded.
- Current slice status: Work Surface Execution Confirmation Control v1 is implemented and verified.
- Do not claim live execution readiness. This slice intentionally keeps live model/tool/connector/external action blocked.

## Blockers

- No unresolved session blocker is recorded.

## Next Product Gap

- The user can see the confirmation choices and the CLI/Gateway can enforce `matches_intent`; the next slice should make the browser-mediated local confirmation action itself visible without opening live execution.
