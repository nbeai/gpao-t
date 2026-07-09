# GPAO-T Session Workspace Design Repair Pack v0.1

Status: implementation handoff pack  
Audience: GPAO-T development team, design implementation agent, Open Design pass  
Purpose: turn the current design correction into a fast, concrete implementation contract

## 1. Core Decision

GPAO-T is not a messenger app.

GPAO-T is a session-based local AI operating workspace.

The product must use:

- Codex-like session workspace structure
- OpenClaw Control-like clean local runtime dashboard discipline
- Claude Code-like permission and execution clarity
- GPAO-T-native Context Mesh, Skill route, Approval/Audit/Replay, and Korean-first operating language

Do not continue improving GPAO-T as a generic dashboard full of panels. The default user experience must become:

```text
left session rail
-> center work session
-> right context / authority / execution inspector
```

## 2. Product Surface Model

### Primary Surface: Work Session

The primary screen is the current active work session.

It must answer:

- What am I working on?
- What did GPAO-T understand?
- Which context is being used?
- What is blocked before execution?
- What can I do next?

### Secondary Surface: Control Center

The Control Center is not the product's main face.

It is an inspector for:

- runtime state
- session state
- Context Mesh / Memory Wiki status
- model router state
- connector / tool governance
- approval / audit / replay / rollback
- install / update / recovery readiness

The Control Center can be dense. The Work Session cannot feel dense.

## 3. Required Layout

### Desktop

```text
+----------------------+----------------------------------+----------------------+
| Session Rail         | Active Work Session              | Inspector            |
|                      |                                  |                      |
| New session          | Session title / state            | Context              |
| Search               | Understanding summary            | Authority            |
| Active sessions      | Conversation / work thread       | Model / Tool route   |
| Project groups       | Local draft / result preview     | Approval / Audit     |
| Archived             | Composer                         | Replay / Rollback    |
+----------------------+----------------------------------+----------------------+
```

### Mobile

Mobile must not force the full three-column structure.

```text
top operating strip
-> active work session
-> bottom or drawer controls
-> session list and inspector as separate sheets
```

Required mobile behavior:

- session list opens as a sheet or full-screen view
- inspector opens on demand
- composer remains easy to reach
- authority state is always visible before any execution-like action
- no horizontal overflow
- Korean labels must not be clipped

## 4. Left Session Rail Contract

The left rail must support multiple work sessions like Codex-style workspace navigation.

Required items:

- new session
- search sessions
- active sessions
- recent sessions
- project or workspace group
- archived sessions
- session context menu

Each session item must show:

- title
- short state label
- last activity
- optional project/workspace hint
- visual status: active, draft, waiting approval, blocked, archived

Session actions:

- rename
- archive
- restore
- delete pending
- cancel delete pending

Do not implement permanent destructive deletion as the first visible delete behavior. The first delete path should be recoverable.

Recommended session state model:

```ts
type WorkSessionState =
  | "active"
  | "draft"
  | "waiting_approval"
  | "blocked"
  | "archived"
  | "delete_pending"
```

Korean product labels:

```text
active: 진행 중
draft: 초안
waiting_approval: 확인 필요
blocked: 멈춤
archived: 보관됨
delete_pending: 삭제 대기
```

## 5. Center Work Session Contract

The center must feel calm, spacious, and task-focused.

Required sequence:

```text
session header
-> user request / work thread
-> GPAO-T understanding summary
-> context / skill / model preview
-> local draft or result preview
-> approval / execution boundary
-> composer
```

The center must not feel like a form-heavy admin page.

Design rules:

- Use fewer sections.
- Make the current task the largest visual object.
- Put evidence and technical detail behind disclosure or right inspector.
- Use short Korean labels.
- Avoid raw enum labels.
- Avoid repeated warning blocks when nothing has executed.
- Use calm locked-state language: `아직 실행하지 않음`, `저장 전 확인`, `외부 전송 없음`.

## 6. Right Inspector Contract

The right inspector is for reviewable depth, not the main reading flow.

Inspector tabs or sections:

- 맥락
- 권한
- 모델
- 도구
- 기록
- 되돌리기

Each inspector section should show:

- current state
- source or evidence reference
- authority level
- next safe action
- replay or rollback reference where relevant

The right inspector may be collapsed by default on narrower desktop widths.

## 7. Visual Direction

The visual goal is not "more decorative".

The goal is:

```text
simple
clean
quiet
trustworthy
fast to scan
pleasant to use every day
```

OpenClaw Control is the reference for dashboard discipline:

- restrained surfaces
- clear dark/light theme discipline
- compact navigation
- crisp status indicators
- predictable spacing
- local runtime seriousness

Codex is the reference for work-session flow:

- session list at left
- central working conversation
- composer-centered continuation
- natural work rhythm

Claude Code is the reference for execution authority:

- no hidden execution
- permission state is legible
- tool/model/connector output does not become action without review

## 8. Visual Tokens v0.1

Use these as a starting point unless the existing design system already defines stronger tokens.

```css
:root {
  --gpao-bg: #f6f7f4;
  --gpao-rail: #eef1ec;
  --gpao-surface: #ffffff;
  --gpao-surface-soft: #f9faf6;
  --gpao-border: #dfe6dc;
  --gpao-border-strong: #c7d2c4;

  --gpao-text: #17211b;
  --gpao-text-muted: #5f6d62;
  --gpao-text-soft: #7a877d;

  --gpao-accent: #1f7a64;
  --gpao-info: #2e6dae;
  --gpao-warn: #a86f1d;
  --gpao-danger: #a9473f;
  --gpao-purple: #6e5aa8;

  --gpao-radius-sm: 6px;
  --gpao-radius-md: 10px;
  --gpao-radius-lg: 14px;

  --gpao-shadow-soft: 0 1px 2px rgba(23, 33, 27, 0.06);
  --gpao-shadow-panel: 0 8px 24px rgba(23, 33, 27, 0.08);

  --gpao-font-body: Inter, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --gpao-font-mono: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
}
```

Do not let the palette become one-note green/beige. Use status colors only where they carry meaning.

## 9. Typography and Korean Rhythm

Default body:

```text
13-15px
line-height 1.5-1.6
letter-spacing 0
```

Rules:

- Korean UI labels must be short.
- Avoid technical English labels in user-facing cards.
- Long Korean text should wrap naturally, not squeeze.
- Buttons should use icons where possible and short labels where necessary.
- Avoid large hero-type headings inside tool panels.

Bad:

```text
approval record write gate
execution proposal validation packet
```

Good:

```text
승인 기록
실행 전 확인
저장 전 검토
아직 실행 없음
```

## 10. Component Contract

### Session Item

Must include:

- title
- status chip
- last updated
- optional context hint
- menu button

States:

- active: accent left border or soft fill
- archived: muted text and archive icon
- delete pending: danger-tinted but recoverable
- waiting approval: warm status

### Composer

Must feel like the place to continue work.

Required:

- clear placeholder in Korean
- submit state
- preview state
- blocked state
- no external send ambiguity

Example placeholder:

```text
이 작업에서 GPAO-T에게 맡길 내용을 입력하세요.
```

### Authority Chip

Every execution-like surface needs:

- icon
- Korean label
- color
- one-line meaning

Authority labels:

```text
읽기 전용
미리보기만
저장 전 확인
외부 전송 전 확인
되돌리기 어려움
비용 발생 가능
```

### Empty State

Must be useful, not decorative.

Example:

```text
아직 선택된 세션이 없습니다.
왼쪽에서 세션을 선택하거나 새 작업을 시작하세요.
```

## 11. What To Remove or De-emphasize

Remove from primary Work Session:

- raw enum names
- repeated audit fields
- long technical pack descriptions
- excessive nested cards
- admin-dashboard density
- warning-heavy blocked copy
- feature explanation paragraphs

Move to inspector:

- full Context Mesh evidence
- raw task packet
- model route details
- replay matrix
- audit record fields
- rollback references

## 12. Implementation Tasks

### Pass A: Information Architecture

1. Add or redesign session rail.
2. Add session states and actions: rename, archive, restore, delete pending.
3. Move dense runtime details out of center Work Surface into inspector.
4. Keep Control Center as secondary inspector surface.

### Pass B: Visual System

1. Apply shared design tokens.
2. Normalize surfaces, borders, radius, shadow, text sizes.
3. Replace raw icon names with real icons or stable symbolic fallbacks.
4. Reduce card nesting.
5. Make status colors semantic and restrained.

### Pass C: Korean Product Language

1. Replace raw English enums.
2. Shorten labels.
3. Keep warnings calm unless real execution risk exists.
4. Make blocked states read as safety, not failure.

### Pass D: Screenshot QA

Required evidence:

- desktop Work Session 1440x960
- desktop Control Center 1440x960
- mobile Work Session 390x844
- mobile session list sheet 390x844
- mobile inspector sheet 390x844

Each screenshot must be checked for:

- no horizontal overflow
- no clipped Korean
- session rail readability
- primary task visibility
- authority state visibility
- color harmony
- icon alignment
- tone consistency

## 13. Acceptance Criteria

This pass is not accepted if:

- the screen still looks like a generic admin dashboard
- the main Work Session is visually secondary to technical panels
- session archive/delete actions are missing
- messenger/channel concepts remain primary
- user-facing labels expose raw enums
- screenshots are not inspected by human eye
- desktop/mobile screenshots exist but visual quality is not materially improved

This pass is accepted when:

- a user can immediately see their work sessions on the left
- the active work session feels like the main product
- details are inspectable without overwhelming the center
- the interface feels simple, clean, and trustworthy
- OpenClaw-level dashboard neatness is visible
- Codex-level session work rhythm is visible
- Claude-Code-level authority clarity is visible
- Korean product language feels natural

## 14. Open Design Prompt

Use this prompt if the next pass uses Open Design:

```text
Design GPAO-T as a Korean-first local AI operating workspace.

The product is not a messenger app and not a generic admin dashboard.
It is a session-based local AI OS.

Primary layout:
- left session rail with new session, search, active sessions, archived sessions, rename/archive/delete-pending actions
- center active work session with user request, GPAO-T understanding, context/skill/model preview, local draft/result preview, composer
- right collapsible inspector for context, authority, model/tool route, approval/audit, replay/rollback

Visual direction:
- simple, clean, quiet, trustworthy
- OpenClaw Control-like dashboard neatness
- Codex-like work-session rhythm
- Claude Code-like permission clarity
- Korean product language by default
- restrained palette, soft surfaces, crisp status chips, no raw enums

Do not create a marketing landing page.
Do not create a messenger/channel UI.
Do not make the Control Center the primary user surface.
Do not overfill the center with audit/debug details.
```

## 15. Developer Handoff Summary

Next design/development step:

```text
Session Workspace Repair Pass 001
```

Scope:

```text
left session rail
active work session center
right inspector
archive/delete-pending session actions
OpenClaw-level visual neatness
Codex-level session rhythm
Claude-Code-level authority clarity
desktop/mobile screenshot QA
```

Do not open:

```text
messenger adapters
external sends
live connector actions
destructive deletion
paid actions
public release
```

