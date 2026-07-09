# What Is Not Done

## Still Excluded

- live model call
- provider credential read or write
- external network request
- paid token spend
- model output persistence
- tool execution from model output
- connector activation
- approval record actual write
- install, update, or rollback execution
- durable memory promotion
- self-growth apply
- Tauri build, bundle, signing, or dependency install
- local IPC command activation
- deployment, messenger, recurring automation, or public release

## Current Completion Boundary

The Model Router boundary first slice is implemented and verified as a read-only routing contract. It explains route profile, selected preview adapter, provider boundary, latency/cost policy, fallback chain, and blocked model actions.

It does not configure providers, store secrets, call external APIs, spend tokens, persist model output, activate tools, or promote durable memory.

BEAI closeout reports conservative review items for human lived acceptance and blocked-boundary wording. Completion language is allowed by BEAI verify/closeout; those review items remain stop-line reminders, not implementation blockers for this local preview slice.

## Next Product Gap

The next product gap is either deeper read-only Model Router policy proof or connector/tool governance. Do not open provider execution until setup, approval, audit, replay, fallback, and rollback gates exist.
