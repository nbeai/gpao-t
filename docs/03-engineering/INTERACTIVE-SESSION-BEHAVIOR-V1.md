# Interactive Session Behavior v1

## Purpose

`Interactive Session Behavior v1` turns GPAO-T from a read-only session workspace into a local session workspace that can create, select, rename, archive, restore, and recoverably delete sessions.

This slice is intentionally local-only. It does not open model calls, tool/CLI/MCP execution, connector activation, external send, paid/destructive actions, durable memory promotion, or permanent deletion.

## Product IA

The product face remains:

```text
left session rail -> center wide conversation work session -> right context / authority / execution inspector
```

The center work session stays the primary work area. Session actions must not shrink the composer into a dashboard card grid.

## Local State

- State file: `.gpao-t/state/session-workspace.json`
- Schema: `gpao_t.session_workspace_state.v1`
- Gateway state read: `GET /sessions`
- Gateway verification read: `GET /sessions/verify`
- Browser-local preview state read: `/sessions`
- Browser-local preview verification read: `/sessions/verify`

## Allowed Local Actions

- `new_session`
- `select_session`
- `rename`
- `archive`
- `restore`
- `mark_delete_pending`
- `cancel_delete_pending`

These actions may write only the local session state file and a local audit event.

## Recoverable Deletion

Permanent deletion is not available in this slice. Delete behavior moves a session into `delete_pending`, and `cancel_delete_pending` can restore it to the recoverable local session pool.

## Blocked Boundaries

- permanent session delete
- live model call
- tool, CLI, MCP, or connector execution
- connector activation or OAuth/token access
- external send
- paid or destructive action
- public release or deployment
- durable memory promotion

## Verification

Required checks:

```bash
node --test test/session-workspace.test.js
node bin/gpao-t.js control sessions-check
node bin/gpao-t.js control work-surface-check
npm run verify
```

Required visual evidence:

- `docs/03-verification/evidence/interactive-session-behavior-v1-work-surface-desktop-1440x960.png`
- `docs/03-verification/evidence/interactive-session-behavior-v1-work-surface-mobile-390x844.png`

The visual pass must confirm that the central work session remains large, the composer remains reachable, local session state is visible, recoverable deletion is visible, and authority boundaries remain clear.
