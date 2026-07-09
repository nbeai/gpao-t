# GPAO-T Design Delta Report - Pass 002

Date: 2026-07-09

Open Design project: `gpao-t-design-realization-pass-002`

Open Design preview: `http://127.0.0.1:7456/api/projects/gpao-t-design-realization-pass-002/raw/index.html`

Artifact source: `/Users/jyp/Documents/Playground 2/open-design/.od/projects/gpao-t-design-realization-pass-002/index.html`

## Design Direction Used

The Open Design artifact sets the Pass 002 direction as a Korean-first local AI OS UI:

- Work Surface: request -> understanding -> evidence -> local draft -> safe next action.
- Control Center: product inspector, not backend dashboard.
- Execution Approval: first-view "nothing executed yet" confirmation, then authority, impact, audit, replay, rollback.
- Color roles: ready green, route/info blue, preview/approval amber, destructive/failure red, memory/growth violet, locked neutral.
- Technical identifiers stay in metadata or inspector surfaces, not primary user copy.

## Delta Matrix

| Current Problem | Referenced Design Principle | Change To Apply | Target Files | Desktop / Mobile QA Standard | Failure Condition |
| --- | --- | --- | --- | --- | --- |
| Primary UI exposes internal labels such as tool/action IDs, raw execution modes, and English group names. | Korean-first product language; technical identifiers only in inspector/metadata. | Replace visible labels with Korean product terms such as `행동 후보`, `권한 단계`, `되돌리기 기준`, `로컬 명령 후보`, `미리보기 후보`; keep exact IDs in data attributes or inspector rows. | `src/core/control-center-renderer.js`, `src/core/core-work-surface.js`, `src/core/control-center.js` | Desktop and mobile first viewport can be understood without reading raw IDs; inspector may still expose traceable metadata. | Primary cards show raw implementation labels or English enum-like phrases as the main text. |
| Execution Approval reads like a dense field matrix. | Claude Code-level execution trust: preview -> confirmation -> approval -> audit -> replay -> rollback. | Reframe the section around "아직 실행된 것은 없습니다", a proposal summary, authority level, expected effect, rollback basis, compact audit items, and record flow. | `src/core/control-center-renderer.js`, `src/core/core-work-surface.js` | User sees what would happen, what is still locked, and what record/replay/rollback means before scrolling through details. | Approval screen looks like a table dump or makes an execution button appear active. |
| Work Surface desktop has a narrow main column and large empty side space. | Codex-level work rhythm: the work/chat area is the main surface. | Give the main work thread more width; reduce confirmation/draft card columns; keep side rail as context/authority support. | `src/core/core-work-surface.js` | Desktop reads as a primary work surface; mobile keeps one-column readability and sticky action line. | Work Surface still feels like a report fragment or mobile cards become cramped. |
| Control Center right rail and inspector feel like a technical report. | Raycast/Linear-inspired product inspector: compact, clear, stateful. | Rename side labels and inspector rows into Korean review language; soften inspector surface; move raw values behind drilldown. | `src/core/control-center-renderer.js`, `src/core/control-center.js` | Right rail can be read as next action, authority, design gate, and evidence without backend wording. | Right rail looks like log output, JSON metadata, or backend QA report. |
| Color roles are present but not strict enough. | Stable state color grammar. | Keep amber for preview/not executed, violet for memory/growth/approval context, green ready, blue route/info, red only for destructive/failure, neutral locked. | `src/core/control-center-renderer.js`, `src/core/core-work-surface.js` | Screens use color as reinforcement, not the only state cue; red is rare and meaningful. | Approval, failure, and locked states collapse into the same color mood. |
| Korean line breaks are safe but dense. | Korean typography as first-class UI material. | Shorten labels, reduce all-caps English headings, keep `word-break: keep-all`, increase main surface width, and reduce card nesting. | `src/core/control-center-renderer.js`, `src/core/core-work-surface.js` | Long Korean text wraps naturally on 390px mobile without horizontal overflow or clipped content. | Mobile technically fits but feels like compressed desktop. |
| Approval record / audit preview is too exhaustive on the first screen. | Reviewable result first, inspectable detail second. | Show compact top-level audit/record summary in primary flow; full item list remains in inspector or lower detail areas. | `src/core/control-center-renderer.js`, `src/core/core-work-surface.js` | Primary decision is clear within the first screen section; record details remain available. | User must parse every audit field before understanding the next safe action. |

## QA Rubric For This Pass

- Visual polish: at least 4.4.
- Color quality: at least 4.4.
- Korean typography: at least 4.4.
- Tone-and-manner: at least 4.5.
- Authority clarity: at least 4.6.
- Overall product feel: at least 4.5.

## Boundaries Still Closed

- Model call.
- Tool, CLI, MCP, connector live activation.
- External send.
- Credential access.
- Paid or destructive action.
- Durable memory promotion.
- Public release.
