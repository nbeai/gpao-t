# What We Are Building

GPAO-T is moving from the no-script Control Center reader into a browser-local app-shell proof. The first app-shell slice is a read-mostly 127.0.0.1 surface that reads health/control-center/app-shell state, exposes panel navigation and evidence inspection, and keeps all mutating or external activation paths blocked.

## Current Phase

- Phase: visual-baseline
- Command: app-shell screenshot QA baseline
- Status: ready

## User Mode

- Mode: general user and developer friendly
- Task type: browser-local app-shell proof

## First Workflow

Browser-local Control Center inspection

## Companion Principle

AI does the work. User keeps authority.

## AI First

- AI/developer verifies GET-only routes, blocked POST routes, and no external activation.
- AI/developer verifies desktop/mobile visual QA before claiming the app-shell proof is ready.
- AI/developer verifies failure/recovery, authority, next safe action, and screenshot QA visibility.
- AI/developer keeps Tauri/Electron, local IPC, connector/model/tool activation, durable memory promotion, install/update/rollback execution, deployment, messenger, and automation outside this slice.

## User Authority

- Confirm whether the browser-local app-shell feels like the intended product direction.
- Approve any taste, brand, operating policy, or business decision that AI cannot know.

## Latest Summary

App-shell-specific desktop/mobile screenshot QA baseline evidence is captured under `docs/03-verification/evidence/`, separate from the existing Control Center screen evidence.
