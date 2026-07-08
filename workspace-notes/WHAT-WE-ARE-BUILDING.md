# What We Are Building

GPAO-T is moving from the no-script Local Control Center reader into a browser-local app-shell build path while preserving local-first operation, authority visibility, next safe action visibility, screenshot QA, and no external activation.

## Current Phase

- Phase: app-shell decision gate
- Command: docs/test gate
- Status: decision closed, implementation not started

## User Mode

- Mode: beginner
- Task type: plugin

## First Workflow

Browser-local app shell over `127.0.0.1` read-mostly HTTP

## Companion Principle

AI does the work. User keeps authority.

## AI First

- AI/developer verifies first success path for Guided First Workflow.
- AI/developer verifies empty or first-time state before asking the user to test.
- AI/developer verifies likely failure or recovery state before claiming completion.
- AI/developer inspects the main visual flow when a UI exists.

## User Authority

- Approve later if the product should move from browser-local shell to packaged Tauri desktop shell.
- Approve any taste, brand, operating policy, or business decision that AI cannot know.

## Latest Summary

App-shell decision gate is closed in docs and tests. First target is browser-local shell over `127.0.0.1` read-mostly HTTP; Tauri is the first packaged desktop target after proof; Electron is deferred. BEAI closeout remains conservative because implementation is intentionally not started.
