# GPAO-T

GPAO-T is a local-first Growth Personal AI Operating System runtime with T-cell theory as its kernel doctrine.

This repository root is the canonical implementation target for GPAO-T. OpenClaw is treated as a separate comparison product and compatibility reference, not as the identity or origin story of this product.

Current development is governed by three tracks:

- `Core Kernel`: memory, context, T-cell admission, replay, approval/audit, reversible apply, rollback, self-growth, and task packets.
- `Operating Surface`: GPAO-T workspace dashboard, multi-session/work panes, chat UX, inspector, visible memory/replay/apply/rollback state, and visual QA.
- `Runtime & Productization`: model/tool routing, CLI/MCP/local execution, GPAO-T runtime lifecycle, install/update/rollback, doctor, Docker distribution, packaging, and long-run verification.
- `Comparison & Compatibility`: source-attributed compatibility boundaries and measured comparison against other AI runtimes, including OpenClaw as a distinct external product.

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

Docker preview:

```sh
cp .env.example .env
docker compose up --build gpao-t
curl -fsS http://127.0.0.1:18799/health
```

Docker is the universal-distribution lane. macOS LaunchAgent installation remains the local-owner lane.
