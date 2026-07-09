# What Is Not Done

## Still Excluded

- large rewrite
- unapproved deployment
- unrelated refactor
- technical deep-dive before the first workflow is approved
- actual tool execution
- CLI command execution
- MCP invocation
- connector activation
- external network/send
- credential read/write
- paid action
- destructive action
- approval record write
- durable memory promotion

## Current Completion Boundary

- Do not call this complete unless verification evidence and completion language guard pass.
- Do not ask the user to test before AI/developer scenario verification covers success, empty, and failure states when applicable.
- Current status: Connector / Tool Governance read-only proof verified; live invocation remains blocked.

## Blockers

- No unresolved session blocker is recorded.

## Next Product Gap

- Future live invocation design still needs approval packet validation, audit write, replay invocation, rollback/compensation proof, and user-visible confirmation before any execution-capable surface opens.
