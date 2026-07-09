# What Is Not Done

## Still Blocked After Stage 4

- Live model call is not open.
- Tool / CLI / MCP execution from model output is not open.
- Connector activation and OAuth / credential access are not open.
- External send is not open.
- Paid or destructive action is not open.
- Public release / deployment is not open.
- Durable memory promotion and self-growth live apply are not open.
- Tauri packaged build / dependency install / signing / installer creation is not open.
- Install / update / rollback execution is not open.
- Local IPC command execution is not open.

## Current Completion Boundary

Stage 4 is complete as a local production-hardening readiness surface only.

The browser-local app shell can show `/app-shell/production-hardening`, read Stage 4 state, verify readiness, and display desktop/mobile screenshot evidence. It still does not build, package, install, update, roll back, deploy, or execute live model/tool/connector actions.

## Known Product Quality Risks

- The Stage 4 surface is product-readable, but the future packaged desktop shell should share a tighter component system with the main Work Surface.
- The locked-action rail is intentionally explicit; later grouping can reduce density without hiding authority boundaries.
- Actual packaged desktop build/install/release remains an explicit authority-gated later stage.
