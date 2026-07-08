# Shaped Request

## V0 Goal

The first real user can route a vague request, see the plan, run checks, and understand the result without reading the whole codebase so that a user can move from vague request to safer implementation with visible gates and evidence.

## First Workflow

Guided First Workflow

## Included

- route contract
- plain-language plan
- verification evidence
- next action

## Excluded

- large rewrite
- unapproved deployment
- unrelated refactor
- technical deep-dive before the first workflow is approved

## Unclear Decisions

- none

## AI First Verification

- AI/developer verifies first success path for Guided First Workflow.
- AI/developer verifies empty or first-time state before asking the user to test.
- AI/developer verifies likely failure or recovery state before claiming completion.
- AI/developer inspects the main visual flow when a UI exists.

## Final User Check

- Confirm whether "Guided First Workflow" feels like the intended product direction.
- Approve any taste, brand, operating policy, or business decision that AI cannot know.
