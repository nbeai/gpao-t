# What We Are Building

GPAO-T is a session-based local AI operating workspace: a user creates and resumes work sessions, asks GPAO-T to understand the task, sees Context Mesh / skill / model candidates, reviews execution boundaries, and only then allows local records or later execution paths.

## Current Big Stage

- Stage: 3 of 4
- Name: Work Surface execution / approval / audit governance loop
- Current slice: Work Surface Execution Governance Flow v1
- Status: implemented, verified, and committed as the current baseline

## Current Product Shape

- Left rail: session workspace navigation.
- Center: active work session and user-facing work flow.
- Right rail: context, authority, model, tool, record, and rollback inspector.
- Control Center: secondary inspector, not the primary product surface.

## Completed In This Slice

- Work Surface now shows one readable flow: proposal -> confirmation -> local record -> replay -> rollback.
- Local approval/audit JSONL record write is allowed only after explicit confirmation.
- Live model calls, tool execution, connector activation, external send, credentials, paid/destructive actions, and durable memory promotion remain blocked.
- Desktop/mobile screenshot evidence was captured for the Work Surface execution governance flow.

## Product Principle

The user should feel: "I can give GPAO-T work here, see how it understood me, inspect what could be executed, and stay in control before anything risky happens."
