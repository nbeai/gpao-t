# What We Are Building

GPAO-T is building a browser-local app-shell proof over the Local Control Center. The current shell remains read-mostly over 127.0.0.1 and now exposes workflow, recovery, authority, and next-action state lanes plus per-panel state drilldowns without opening any mutating route.

## Current Phase

- Phase: deeper-read-only-app-shell
- Command: app-shell state lanes and panel drilldowns
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
- AI/developer verifies desktop/mobile visual QA after app-shell UI changes.
- AI/developer verifies state lanes, panel state drilldowns, failure/recovery, authority, next safe action, and screenshot QA visibility.
- AI/developer keeps Tauri/Electron, local IPC, connector/model/tool activation, durable memory promotion, install/update/rollback execution, deployment, messenger, and automation outside this slice.

## User Authority

- Confirm whether the browser-local app-shell feels like the intended product direction.
- Approve any taste, brand, operating policy, or business decision that AI cannot know.

## Latest Summary

Deeper read-only app-shell behavior is implemented and verified: workflow/recovery/authority/next-action lanes and per-panel state drilldowns are available while mutation gates remain blocked.
