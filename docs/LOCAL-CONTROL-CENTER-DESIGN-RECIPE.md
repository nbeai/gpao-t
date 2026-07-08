# GPAO-T Local Control Center Design Recipe

Status: UI implementation input contract  
Source doctrine: `/Users/jyp/Documents/Playground 2/beai-harness-for-codex/design.md`  
Product: GPAO-T  
Surface: Local Control Center  

## Purpose

GPAO-T Local Control Center is an operating desk, not a marketing screen.

The first screen must let the user see:

- what GPAO-T understood as the current work
- what context and evidence are active
- what is verified, review-level, blocked, or approval-required
- what safe local action comes next

This recipe adapts the BEAI Harness `design.md` doctrine to the GPAO-T product surface. It is the design contract before building the visual desktop or web UI.

## Surface Recipe

```yaml
surface:
  type: web-ui
  audience: owner | developer | reviewer
  job: "Show GPAO-T operating state, evidence, growth, authority, and next safe action."
  current_user_state: "The user wants a Codex-like local AI OS surface that is fast, calm, transparent, and safe."
  primary_decision: "What should GPAO-T do next, and what remains gated?"
  evidence_needed:
    - Local Control Center snapshot
    - runtime doctor status
    - Memory Wiki / Context Mesh state
    - replay recovery state
    - growth proposal and application gate state
    - model/tool adapter boundary
    - connector governance
    - install/update/rollback hardening
  authority_boundary:
    - external model call
    - external tool action
    - connector activation
    - durable memory promotion
    - live growth mutation
    - install/update/rollback execution
    - public release/deployment
    - secret storage
  visual_density: compact
  tone: operational
  status_language: ready | review | blocked | approval_required | not_applicable
```

## First Viewport

The first viewport must show actual product state.

Required layout:

```text
Top rail:
  GPAO-T / current workspace / global status / next safe action

Left rail:
  Work
  Context
  Evidence
  Growth
  Authority
  Ops

Center pane:
  Current Work Decision
  Active target
  Current request or latest task
  Next safe action

Right evidence pane:
  Context used
  Checks and replay
  Blocked or approval-required actions

Lower operational band:
  Memory Wiki
  Model / Tool Adapters
  Connectors
  Install / Update / Rollback
```

The UI must not start with a hero, slogan, or abstract product pitch.

## Information Architecture

Every panel maps to one of the five BEAI design object types:

| Object | GPAO-T panels | User question |
| --- | --- | --- |
| Work | Runtime, Current Work Decision | What are we doing now? |
| Context | Memory Wiki / Context Mesh | What context is active or missing? |
| Evidence | Replay Recovery, Install Hardening | What is checked or still review-level? |
| Growth | Self-Growth Proposals, Application Gates | What can improve, and what is blocked from live mutation? |
| Authority | Authority, Adapters, Connectors | What cannot happen without approval? |

## Panel Grammar

Each panel must contain:

- `title`
- `status`
- `headline`
- `evidence`
- `limitation`
- `nextSafeAction`

Status must use text and color together. Color alone is never enough.

### Required Panels

1. **Current Work**
   - active flow
   - latest target
   - user-visible summary
   - next safe action

2. **Context Mesh**
   - current request
   - active target
   - primary anchor
   - supporting context
   - demoted or excluded context
   - missing context state

3. **Evidence / Replay**
   - latest replay recovery result
   - repeated targets
   - replay status
   - limitation

4. **Growth**
   - proposal count
   - latest proposal
   - application gate count
   - blocked live mutations
   - rollback path

5. **Authority**
   - external model call
   - external tool action
   - durable memory promotion
   - live growth mutation
   - public release
   - secret storage

6. **Model / Tool Adapters**
   - selected local preview model/tool path
   - blocked external provider/tool actions
   - routing limitation

7. **Connectors**
   - connector registry count
   - blocked connectors
   - read/write/send/automate distinction
   - OAuth/token boundary

8. **Ops**
   - install readiness
   - update readiness
   - rollback substrate
   - daemon/deployment/external download boundary

## Component Rules

### First Interactive Reader

The first interactive Local Control Center must stay inside a no-script local inspection boundary.

Allowed interactions:

- anchor navigation to a panel
- expandable panel inspectors with `details` / `summary`
- visible status, group, headline, and next safe action inspection

Blocked in this layer:

- inline or external scripts
- external model calls
- account connection prompts
- tool execution
- memory promotion or growth mutation
- daemon, installer, update, rollback, deploy, or publish actions

This keeps the first interactive surface fast and safe while preserving a direct path toward a richer Codex-like desktop surface later.

### StatusChip

Use for each layer status.

Allowed states:

- `ready`
- `review`
- `blocked`
- `approval_required`
- `not_applicable`
- `unknown`

Never show one global `ready` if any layer remains review-level or blocked.

### EvidenceCard

Use only when a claim has a source.

Required fields:

- claim
- source
- check
- result
- limitation

### AuthorityBoundaryBanner

Use before dangerous or external actions.

Required fields:

- blocked action
- reason
- safe local work already done
- exact approval needed
- next safe action

Do not ask for broad approval when a narrow approval is enough.

### GrowthProposalCard

Required fields:

- observation
- user meaning
- T-cell hypothesis
- proposed intervention
- dry-run path
- replay check
- rollback path
- approval boundary

Growth proposals must never look like live mutations.

## Visual Tokens

Use the BEAI design token roles from `design.md`:

```text
background: #FAFAF7
surface: #FFFFFF
surface-muted: #F3F0EA
text: #171717
text-muted: #64615C
border: #D8D3C8
primary-action: #2563EB
verified: #168A5A
review: #D97706
blocked: #DC2626
growth: #7C3AED
context: #0891B2
```

Rules:

- Use color as state, not decoration.
- Do not create a one-hue interface.
- Status color must always have a text label.
- Use 8px radius or less.
- Use compact rhythm and stable dimensions for status chips, counters, and panels.
- Long Korean labels must wrap without clipping.

## Copy Rules

Preferred labels:

- Checked
- Changed
- Verified
- Still review-level
- Needs approval before external action
- Next safe action

Korean UI copy should be direct, warm, and precise:

- 짧고 스캔 가능해야 한다.
- 검증됨, 검토 필요, 차단됨, 승인 필요를 분리한다.
- 위험을 숨기지 않는다.
- 개발자 전용 용어만으로 설명하지 않는다.

## First Implementation Scope

The first visual UI should read the existing `control snapshot` contract.

It should not:

- start a daemon
- connect accounts
- configure OAuth
- call external models
- execute external tools
- store secrets
- apply growth mutations
- install, update, rollback, deploy, or publish

The first UI is a local visual reader for existing GPAO-T state.

## Quality Gate

Before claiming a Local Control Center UI surface is ready, verify:

- first viewport shows actual GPAO-T state
- current target and next safe action are visible
- Work / Context / Evidence / Growth / Authority are represented
- verified, review, blocked, and approval-required states are distinct
- direct evidence outranks generated support
- authority boundaries appear before dangerous actions
- text fits on desktop and mobile
- mobile sticky topbar or decision strip remains visible during panel navigation
- no cards inside cards
- no marketing hero or decorative blob background
- no hidden external action or live mutation
- screenshot or render evidence exists for visual claims

## Static UI Reader Contract

The first static Local Control Center UI reader consumes the existing `buildControlCenterSnapshot()` data contract.

Required surfaces:

- `control html` prints the static HTML reader
- `control render [output.html]` writes the static HTML reader to a local file

Allowed no-script behavior:

- panel anchor navigation
- focus navigation to current state, next safe action, and authority boundary
- expandable panel inspectors
- mobile next-safe-action strip

The first UI reader should prove scanability and authority clarity before adding external connectors, daemon behavior, live mutations, or a JavaScript app shell.
