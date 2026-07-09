# Next Review

## Next Safe Action

Move to `first_local_draft_preview` from the existing work-surface confirmation UX.

This should show the user what GPAO-T would draft locally after confirmation, while still avoiding live submission, model calls, tool execution, connector activation, external network/send, approval writes, install/update/rollback, and durable memory promotion.

## Stop-Line

Do not split submission into more meta-gates for now. The submission decision gate and submission validation/confirmation gate are closed enough for this phase.

## Preserve Invariants

- no script execution in the local inspection reader
- no external activation
- no live submission
- no model connector call
- no tool/CLI/MCP execution
- no connector activation
- no approval record write
- no install/update/rollback execution
- no durable memory promotion
- visible authority boundary
- visible next safe action
- no overflow on desktop or mobile

## Review Before Continuing

- Keep the confirmation card visible as the user's bridge from typed input to future draft preview.
- Keep Context Mesh evidence, Skill route, and Authority boundary on the same work surface.
- Keep mobile top action line and authority spacing stable when adding the local draft preview.

## Recent Evidence

- `npm run verify`: pass, 101 tests.
- `beai verify --cwd '/Users/jyp/Documents/Playground 2/gpao-t' --run --scenario --meaning`: ready/pass.
- `node bin/gpao-t.js control serve-check`: ready, `/work-surface` status `200`, blocked `POST` status `405`.
- `git diff --check`: pass.
- `rg -n "TODO|FIXME|XXX|HACK" ...`: no unresolved markers.
