# What We Are Building

GPAO-T is closing the packaged desktop/Tauri transition gate after the browser-local app-shell proof. The gate defines the read-mostly boundary, allowed first slice, blocked authority actions, rollback/source-control requirements, screenshot QA, install/update/rollback ordering, and failure/recovery states without implementing the full Tauri app.

## Current Phase

- Phase: packaged-desktop-tauri-gate
- Command: tauri packaged desktop gate and check
- Status: ready

## User Mode

- Mode: general user and developer friendly
- Task type: packaged desktop shell gate

## First Workflow

Browser-local app-shell to read-mostly Tauri shell gate

## Companion Principle

AI does the work. User keeps authority.

## AI First

- AI/developer verifies the Tauri gate contract before any packaged desktop implementation.
- AI/developer verifies `app-shell-check` remains ready as the browser-local regression anchor.
- AI/developer verifies the first Tauri slice stays read-mostly with local IPC and mutation authority blocked.
- AI/developer keeps connector/model/tool activation, OAuth/token, external send, install/update/rollback execution, durable memory promotion, self-growth apply, deployment, messenger, and automation outside this slice.

## User Authority

- Confirm whether the read-mostly Tauri transition boundary feels like the intended product direction.
- Approve any taste, brand, operating policy, real install, packaging, signing, deployment, account, or external-action decision that AI cannot own.

## Latest Summary

Packaged desktop/Tauri gate is implemented and verified as a read-only contract and verification surface. It prepares the next read-mostly Tauri shell slice while keeping full Tauri implementation, packaging, mutation, connectors, models, tools, install/update/rollback, self-growth apply, deployment, messenger, and automation blocked.
