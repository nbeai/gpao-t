# GPAO-T Design Realization Pass 002 - Issue Classification

Date: 2026-07-09

Scope: Work Surface, Control Center, Execution Approval.

References:
- `docs/02-design/GPAO-T-VISUAL-REFERENCE.md`
- `/Users/jyp/Documents/Playground 2/gpao-t-references/gpao-t-visual-reference/08-OFFICIAL-VISUAL-SOURCE-ATLAS.md`
- `/Users/jyp/Documents/Playground 2/gpao-t-references/gpao-t-visual-reference/09-SCREEN-ANNOTATION-MATRIX.md`
- `/Users/jyp/Documents/Playground 2/gpao-t-references/gpao-t-visual-reference/10-SAFE-CAPTURE-PROTOCOL.md`
- `/Users/jyp/Documents/Playground 2/gpao-t-references/gpao-t-visual-reference/11-DESIGN-TEXTBOOK.md`
- Open Design project: `gpao-t-design-realization-pass-002`

## Current Evidence

- Control Center desktop: `docs/03-verification/evidence/visual-polish-pass-002-control-center-desktop-1440x960.png`
- Control Center mobile: `docs/03-verification/evidence/visual-polish-pass-002-control-center-mobile-390x844.png`
- Work Surface desktop: `docs/03-verification/evidence/visual-polish-pass-002-work-surface-desktop-1440x960.png`
- Work Surface mobile: `docs/03-verification/evidence/visual-polish-pass-002-work-surface-mobile-390x844.png`

## Classified Issues

| Area | Current Issue | Product Impact | Severity |
| --- | --- | --- | --- |
| Color system | The palette is calm, but many cards use similar pale surfaces without enough role contrast. Amber, blue, green, violet, and red exist, yet the hierarchy between preview, approval, locked, and record states is not always obvious. | The user can see that a boundary exists, but the screen still reads like a generated validation board rather than a product operating surface. | High |
| Visual polish | Borders and cards are consistent, but repeated nested cards create a raw dashboard feel. Execution Approval especially reads as a field matrix. | Trust is reduced because the screen feels closer to a QA artifact than a refined local AI OS. | High |
| Card / panel density | Execution Approval stacks proposal, authority levels, approval packet, audit items, record stages, record items, local substrate, and blocked actions in dense card grids. | The user has to parse too much before seeing the main decision: nothing executed, what would happen, what remains locked. | High |
| Korean typography | Korean line-height is generally safe, but many long sentences appear in small cards. Some copy mixes Korean with English technical terms. | Mobile reading feels heavy, and important state language loses speed. | High |
| English enum / technical exposure | Primary UI still exposes labels such as `Tool`, `Action`, `cli`, `dry_run`, `design only`, `actual_tool_execution`, `rollback`, `score`, and English group labels like `Work`, `Authority`, `Context`. | Non-developer users see implementation terms before product meaning. This violates Korean-first design rules. | Critical |
| Icon placement | Icons are currently fallback symbols and not always tied to a stable product meaning. Some icon text appears as symbolic decoration rather than operational guidance. | Authority levels are visible, but the icon system does not yet feel like one coherent product language. | Medium |
| Tone and manner | Safety copy is correct and calm, but repeated "design only", "blocked", and technical state words make parts of the UI feel internal. | The product voice is not fully unified across Work Surface, Control Center, and Approval. | High |
| Authority / approval UX | Authority boundaries are explicit, but the main approval story is fragmented across many cards. The primary question should be faster: what will happen, what is locked, what can be reviewed next. | Authority clarity is present, but perceived usability is lower than the target. | High |
| Mobile usability | No major horizontal overflow was observed. However, card stacking creates long vertical scanning, and dense repeated card groups make the first meaningful decision slower. | Mobile is technically safe but not yet comfortable enough for a primary user surface. | High |

## Pass 002 Design Intent

Pass 002 should not add execution capability. It should make the existing read-only and local-record surfaces feel like a product:

- Work Surface becomes the main work/chat rhythm, not an approval report page.
- Control Center becomes a compact local OS inspector, not a backend dashboard.
- Execution Approval becomes a guided confirmation flow, not a field dump.
- Technical identifiers move into inspector or metadata.
- Primary UI uses short Korean product language.
- Mobile uses fewer columns, calmer cards, and a visible action/decision rhythm.

## Blocked Boundaries

The following must remain closed during this pass:

- Actual approval record write beyond the already implemented local record substrate behavior.
- Tool, CLI, MCP, or connector live activation.
- Model calls.
- External send.
- Credential access.
- Paid or destructive action.
- Durable memory promotion.
