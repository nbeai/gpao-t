# GPAO-T Documentation Map

Status: current documentation entry point
Updated: 2026-07-14

GPAO-T is an independent local-first Personal Growth OS. OpenClaw is a
separate comparison product and a compatibility reference. Technical
compatibility identifiers may remain inside implementation provenance, but
they do not define GPAO-T's product identity, live state root, or user surface.

## Authority Order

Use current documents in this order:

1. The user's latest instruction.
2. `docs/00-canon/GPAO-T-PRODUCT-CHARTER-v0.1-ko.md`.
3. Current runtime and authority contracts in `docs/00-canon/`.
4. Current Phase 2 engineering and product plans dated 2026-07-13 or later.
5. Current verification evidence from the intended user path.
6. Historical design/research documents, only as provenance.

A historical document cannot override a newer canon, current source, live
runtime evidence, or the user's current decision.

## Active Product Contracts

- Product identity and mission:
  `00-canon/GPAO-T-PRODUCT-CHARTER-v0.1-ko.md`
- Human-centered response behavior:
  `00-canon/GPAO-T-HUMAN-CENTERED-RESPONSE-CANON-ko.md`
- Memory and self-growth authority:
  `00-canon/GPAO-T-SELF-GROWTH-LOOP-CONTRACT-v0.1-ko.md`
- Runtime/iCloud boundary:
  `00-canon/GPAO-T-RUNTIME-AND-ICLOUD-BOUNDARY-2026-07-13.md`
- Runtime heart hardening:
  `03-engineering/GPAO-T-RUNTIME-HEART-HARDENING-PLAN-2026-07-13-ko.md`
- First real OS turn:
  `03-engineering/GPAO-T-FIRST-REAL-OS-TURN-PIPELINE-WORK-ORDER-2026-07-13-ko.md`
- Phase 2 program:
  `03-engineering/GPAO-T-PHASE-2-PERSONAL-GROWTH-OS-WORK-ORDER-v0.1-ko.md`
- Tool readiness gate:
  `03-engineering/GPAO-T-TOOL-PARITY-GATE-v0.1-ko.md`

## Current Design And App-Shell Contracts

- Dashboard design recipe:
  `GPAO-T-DASHBOARD-DESIGN-RECIPE.md`
  - required operating-desk structure: `Work / Context / Evidence / Growth / Authority`
- Human readability verification:
  `03-verification/CONTROL-CENTER-HUMAN-READABILITY-CHECK.md`
- App-shell decision gate:
  `03-engineering/APP-SHELL-DECISION-GATE.md`
- App-shell technology decision:
  `03-engineering/APP-SHELL-TECHNOLOGY-DECISION.md`

The current first app-shell slice is a browser-local shell over `127.0.0.1` read-mostly HTTP.
Packaged desktop work follows the separate technology and authority decisions
in the documents above; it does not silently widen runtime or external-action
authority.

## Current Verified Runtime

Canonical owner-Mac paths:

- source: `/Users/jyp/Developer/gpao-t`
- live state: `~/.gpao-t`
- live workspace: `~/.gpao-t/workspace`
- dashboard: `http://127.0.0.1:18799/`

Verified local capabilities as of 2026-07-14:

- real provider-backed chat turns
- multi-session dashboard and user-visible tool activity
- DuckDuckGo web search and webpage readability
- browser interaction in the active coding profile
- local file patch and bounded command-read path
- local-hybrid memory retrieval without external embedding quota
- source-linked memory support candidates with admission boundaries
- replay and review-only self-growth candidate handling
- PDF extraction at the live handler boundary

Current boundaries:

- credential migration to secret references requires explicit authority
- paired-node file transfer requires node/path/tool approval
- fresh browser attachment-picker-to-answer QA needs an authenticated
  upload-capable driver
- public release, signed installers, and unsupervised automatic update are not
  claimed by the local runtime evidence

## Current Evidence

- Code/runtime consistency:
  `03-verification/evidence/phase-1-code-runtime-consistency-2026-07-14/`
- Dashboard human QA loop 1:
  `03-verification/evidence/phase-2-dashboard-human-qa-2026-07-14/`
- Tools, memory, context, and self-growth:
  `03-verification/evidence/phase-3-tools-memory-growth-2026-07-14/`
- Tool parity audit:
  `03-verification/evidence/tool-parity-audit/`

Completion still requires broad regression, final release sealing, and human QA
loop 2 through the live dashboard.

## Historical Documents

Documents dated 2026-07-10 through 2026-07-12 that describe OpenClaw as
GPAO-T's body, primary material, or constitutional owner are retained as
engineering history. They explain how the compatibility layer was studied and
absorbed. They are not active product doctrine after the Product Charter and
Phase 2 identity decision.

This includes:

- `00-canon/GPAO-T-OPENCLAW-ABSORPTION-CONSTITUTION-v0.1-ko.md`
- `03-engineering/GPAO-T-OPENCLAW-ABSORPTION-PASS-001-v0.1-ko.md`
- early dashboard fork/live-patch plans
- early owner/workflow guides whose scope says "OpenClaw absorption"

Historical evidence under `03-verification/evidence/` remains immutable
evidence of what was true at the time. It must not be rewritten to make old
results look current.

## Verification Rule

No document may call a user-facing capability complete from source tests alone.
For chat/runtime work, completion requires live health, dashboard load, a fresh
real model answer, relevant log inspection, and evidence from the actual user
path. Unverified boundaries must be stated explicitly.
