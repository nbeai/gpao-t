# GPAO-T Runtime Heart - Tool/MCP/Authority Gate Evidence

Date: 2026-07-13

## Scope

This evidence records the first source gate for GPAO-T Tool/MCP/Authority
Heart. The guiding product rule is:

> Judge allowed behavior before advertised capability.

## Implemented Surface

- Source core: `src/core/tool-authority-heart.js`
- Public API export: `src/index.js`
- Control Center endpoints:
  - `GET /runtime/tool-authority-heart`
  - `GET /runtime/tool-authority-heart/verify`
- Gateway endpoints:
  - `GET /runtime/tool-authority-heart`
  - `GET /runtime/tool-authority-heart/verify`
- CLI commands:
  - `gpao-t connectors authority-heart`
  - `gpao-t connectors authority-heart-check`

## Contract

- Model output is not execution authority.
- MCP invocation is not open by default.
- Connector activation is not open by default.
- External send is blocked.
- Credential read/write is blocked.
- Destructive and paid actions are blocked.
- Durable memory promotion is blocked.
- Local read and dry-run preview are separate from actual execution.

## Verification Run

```text
node --check src/core/tool-authority-heart.js
node --check src/index.js
node --check src/core/control-center-serving.js
node --check src/core/gateway.js
node --check bin/gpao-t-full.js
node --test test/tool-authority-heart.test.js test/connector-governance.test.js test/execution-runtime.test.js test/adapter-boundary.test.js
node bin/gpao-t.js connectors authority-heart
node bin/gpao-t.js connectors authority-heart-check
```

## Result

- Syntax checks: passed.
- Focused tool/connector/authority tests: 26/26 passed.
- `gpao-t connectors authority-heart-check`: `status: ready`, no findings.
- Current source readback:
  - selected surface: `mcp`
  - selected authority tier: `read_only`
  - model output execution authority: `false`
  - dry-run invokes now: `false`
  - connector registry count: 6
  - local read: `preview`
  - external send: `blocked`
  - risky request approvals required:
    - `data_deletion`
    - `secret_or_account_boundary`
    - `external_send`

## Non-Completion Boundary

This gate proves the source-level Tool/MCP/Authority Heart contract and CLI
readback. Full Runtime Heart completion still requires live UI authority readback
and dry-run preview QA in the dashboard.
