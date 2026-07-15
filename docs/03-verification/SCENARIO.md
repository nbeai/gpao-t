# GPAO-T Native Runtime User Scenario

## Workflow

- Name: Native Local Conversation And Recovery
- Mode: non-developer local owner
- Task type: local AI operating environment

## Goal

A first-time owner opens the native local dashboard without entering a token,
creates a conversation, receives a clearly labelled local runtime response,
and can recover from a safe failure without seeing internal errors.

## First Success Path

1. The owner opens the loopback dashboard.
2. The dashboard issues a local-only session automatically and shows the empty
   state without developer controls.
3. The owner starts a new conversation and sends a message.
4. GPAO-T uses that conversation's isolated local context and returns a receipt
   through the visible chat flow.
5. The conversation title is derived from the first message.

## Empty Or First-Time State

1. No conversation history is required.
2. The owner sees a plain-language invitation and a single visible next action:
   start a conversation.
3. The screen does not expose an owner token, a filesystem path, or a stack
   trace.

## Failure Or Recovery Path

1. An invalid conversation request is rejected before it reaches the runtime.
2. A provider failure is converted to a repair plan with a plain-language
   state, explanation, and next action.
3. If a local session expires after a runtime restart, the dashboard obtains a
   fresh local session before retrying the request once.
4. Unknown external outcomes remain review-required and are never silently
   retried.

## Boundaries

- The current verified provider is a local deterministic emulator; it is shown
  as a connection verification response, not a real model answer.
- Real provider credentials, external connectors, public deployment, and
  durable self-growth promotion are separate owner-authority gates.

## AI Verification

- Verify the empty dashboard state, local-session fresh chat, conversation
  isolation, failure-to-repair-plan mapping, desktop/mobile layout, console
  errors, and package install/recovery flow.
