# GPAO-T Safari Route DOM Readback - 2026-07-12

Status: manual Safari DOM readback passed for active checked user routes
Scope: live GPAO-T dashboard routes visible to a normal user in Safari.

## Purpose

This evidence file records the browser-visible route checks performed after the GPAO-T user-surface seal patches.

The goal was not to prove that inherited OpenClaw-compatible source identifiers are gone. The goal was to verify that the user-facing dashboard surface no longer exposes OpenClaw-era product names, assistant labels, developer work-pane controls, or broken panels on the active routes checked in Safari.

## Method

Checks were performed against the already-open Safari session at the local GPAO-T dashboard.

For each route, Safari was navigated to the route, then `document.body.innerText` and `document.title` were read back through direct top-level `osascript` calls.

Before the final `/nodes` readback, Safari service workers and caches were cleared because the browser was still serving an older JavaScript chunk after the live bundle patch.

## Checked Routes

The following active routes were checked in Safari:

- `/chat`
- `/settings/general`
- `/settings/profile`
- `/settings/ai-agents`
- `/skills`
- `/agents`
- `/nodes`
- `/dreaming`
- `/documents`

## Route Results

### `/chat`

Result: passed

Observed:

- Document title: `nBeAI. GPAO-T`
- `OpenClaw`: not visible
- `Assistant`: not visible as the user-facing speaker label
- `Clawdette`: not visible
- Historical assistant speaker label displays as `GPAO-T`
- Normal user view hides the developer top work-pane strip.

### `/settings/general`

Result: passed

Observed:

- `OpenClaw`: not visible
- `Assistant`: not visible
- `Clawdette`: not visible
- `Gateway`: not visible
- General settings copy uses GPAO-T language for a normal user.

### `/settings/profile`

Result: passed

Observed:

- `OpenClaw`: not visible
- `Assistant`: not visible
- `Clawdette`: not visible
- Profile language uses GPAO-T identity and activity language.

### `/settings/ai-agents`

Result: passed

Observed:

- The previous developer-style assistant configuration form is hidden from the normal user surface.
- The page now presents a GPAO-T intelligence summary.
- Previous labels such as `Keep Last Assistants` and visible `Assistant` residue are not exposed in the normal view.

### `/skills`

Result: passed

Observed:

- Panel load error: false
- `OpenClaw`: not visible
- `ClawHub`: not visible
- Top-level skill filters are converted to GPAO-T user language.

Note:

Some third-party skill descriptions remain in English. They are treated as external skill description content, not OpenClaw product residue.

### `/agents`

Result: passed

Observed:

- Developer labels were converted, including:
  - `Copy ID` -> `ID 복사`
  - `Core Files` -> `핵심 파일`
  - `Bootstrap persona` no longer visible as a raw developer label
  - `Select a file to edit` no longer visible as a raw developer label
  - `Workspace:` -> `작업공간:`
  - `Cron 작업` no longer visible in the checked normal route sample
- Visible route text is presented as GPAO-T user language.

### `/nodes`

Result: passed after cache clear and live nodes bundle patch

Observed:

- Previous visible developer labels were removed or converted:
  - `Allowlist and approval policy`
  - `Gateway edits local approvals`
  - `Default security mode`
  - `Default prompt policy`
  - `No nodes with system.run available`
  - `Pin agents to a specific node`
  - `default agent`
  - `uses default`
- Final checked sample showed user-facing Korean labels such as `기기와 연결`, `실행 승인`, `실행 기기별 허용 목록과 승인 정책을 관리합니다`, and `기본 기준 사용`.

### `/dreaming`

Result: passed

Observed:

- No checked OpenClaw-era forbidden user-facing labels were visible.
- Route presents GPAO-T-style user language.

### `/documents`

Result: redirect observed

Observed:

- Direct navigation to `/documents` redirected back to the main chat route.
- No standalone `/documents` user route was available in the current live dashboard session.

Interpretation:

This is not treated as a failed documents-page surface seal. It is recorded as a router behavior to re-check if a standalone documents page becomes active later.

## Verification Tooling Note

The product route readbacks above were obtained through direct Safari DOM inspection.

Two experimental automation helpers remain weaker than the direct check:

- `tools/audit-gpao-t-safari-user-surface.mjs`
- `tools/run-gpao-t-safari-user-surface-audit.zsh`

Both can pass syntax checks, but nested script execution of Safari JavaScript through child processes is not yet reliable on this machine. This is a tooling gap, not evidence of visible product-surface failure.

## Verdict

The active checked user-visible routes no longer show the prior P0 OpenClaw-era product residue in Safari.

Remaining work moves from visible route-blocker repair to:

1. source/evidence ownership seal,
2. inherited namespace compatibility migration,
3. live patch reproducibility,
4. live conversation proof refresh,
5. final test-team handoff verification.
