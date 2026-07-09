# What Is Not Done

## Still Excluded

- live model call
- provider credential read or write
- external network request
- paid token spend
- model output persistence
- tool, CLI, or MCP execution from model output
- connector activation
- approval record actual write
- install, update, or rollback execution
- durable memory promotion
- self-growth apply
- Tauri build, bundle, signing, or dependency install
- local IPC command activation
- deployment, messenger, recurring automation, or public release

## Current Completion Boundary

The Model Router replay/policy slice is implemented and verified as a read-only routing policy contract. It explains request-type route profiles, speed/quality/cost/risk criteria, Context Mesh task-packet candidate conditions, fallback/failure states, model-output-to-tool boundary, and replay/audit criteria.

It does not configure providers, store secrets, call external APIs, spend tokens, persist model output, activate tools, invoke replay, write audit records, activate connectors, or promote durable memory.

BEAI closeout reports conservative review items for human lived acceptance and blocked-boundary wording. Completion language is allowed by BEAI verify/closeout; those review items remain stop-line reminders, not implementation blockers for this local preview slice.

## Next Product Gap

The next product gap is connector/tool governance. The handoff should start from the rule that model output is a candidate/preview artifact, not execution authority.
