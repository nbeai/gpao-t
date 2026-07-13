# GPAO-T

GPAO-T is a local-first Growth Personal AI Operating System runtime with T-cell theory as its kernel doctrine.

This repository root is the new implementation target for GPAO-T. The first implementation slice focuses on the runtime kernel, not the final desktop UI, messenger adapters, OAuth connectors, or public distribution.

Current development is governed by three tracks:

- `Core Kernel`: memory, context, T-cell admission, replay, approval/audit, reversible apply, rollback, self-growth, and task packets.
- `Operating Surface`: live OpenClaw dashboard absorption, multi-session/work panes, chat UX, inspector, visible memory/replay/apply/rollback state, and visual QA.
- `Runtime & Productization`: model/tool routing, CLI/MCP/local execution, Gateway/service lifecycle, install/update/rollback, doctor, packaging, and long-run verification.

Process guard:

- `docs/02-workflow/GPAO-T-THREE-TRACK-PROCESS-GUARD-v0.1-ko.md`
- `docs/02-workflow/GPAO-T-PROGRAM-CONTROL-AND-WORK-SEQUENCE-v0.1-ko.md`
- `docs/02-workflow/GPAO-T-MULTI-AGENT-OPERATING-PROTOCOL-v0.1-ko.md`

Run:

```sh
npm run verify
node bin/gpao-t.js init
node bin/gpao-t.js replay fixtures/replay/release-file-active-target.json
node bin/gpao-t.js state
```
