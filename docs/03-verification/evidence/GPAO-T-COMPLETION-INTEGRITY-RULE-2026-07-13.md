# GPAO-T Completion Integrity Rule - 2026-07-13

Status: adopted

## Why this rule was added

A dashboard/login repair was incorrectly described as normal after screen-level verification. The user then found that an actual live chat turn failed with missing provider auth. This proved that screen load and health checks are not enough.

## Fixed operating rule

GPAO-T completion may not be claimed unless the user-facing workflow is verified end to end. For chat/runtime work, this means a fresh real message must produce a real answer after the change, and logs must be checked for fresh fatal/auth/provider/runtime errors.

## Minimum GPAO-T normality gate

1. Live runtime health is good.
2. Dashboard opens without blocking the user.
3. Visible UI matches the intended GPAO-T product surface.
4. A fresh chat turn succeeds through the model/provider path.
5. Relevant logs show no new fatal/auth/provider/runtime error for that fresh turn.

## Workspace-level source of truth

This rule was added to /Users/jyp/Documents/Playground 2/AGENTS.md under Completion Integrity Rule.
