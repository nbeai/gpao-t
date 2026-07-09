# What Is Not Done

## Still Excluded

- large rewrite
- unapproved deployment
- unrelated refactor
- actual tool execution
- CLI command execution
- MCP invocation
- connector activation
- external network/send
- credential read/write
- paid action
- destructive action
- approval record write
- audit write
- dry-run invocation
- durable memory promotion

## Current Completion Boundary

- Do not call this complete unless verification evidence and completion language guard pass.
- Do not ask the user to test before AI/developer scenario verification covers success, empty, and failure states when applicable.
- Current status: Execution Approval UX / approval packet validation proof is verified as preview-only; live invocation remains blocked.

## Blockers

- No unresolved session blocker is recorded.

## Next Product Gap

- Future live invocation still needs a separate approval record write implementation gate, dry-run invocation gate, audit write gate, replay invocation, rollback/compensation proof, and explicit user confirmation before any execution-capable surface opens.
