# GPAO-T P0 User Surface Seal Pass - 2026-07-12

Status: applied and verified
Scope: live GPAO-T dashboard user-visible surface, settings pages, chat label cleanup, route static seal, and safe patch discipline.

## What Changed

- Reworked `tools/apply-openclaw-live-user-screen-ux-patch.mjs` so the default user screen hides developer work-pane controls and rewrites visible OpenClaw/Gateway/Assistant-era labels into GPAO-T language.
- Added Telegram direct session rail in the sidebar as a separate communication section.
- Converted `/settings/ai-agents` from a developer config-form surface into a GPAO-T intelligence summary screen for normal users.
- Cleaned visible profile/settings/skills residues such as `Assistant`, `Clawdette`, `Keep Last Assistants`, `집게`, `리프`, `No changes`, and top-level skill filter labels.
- Repaired `tools/apply-openclaw-live-gpao-t-surface-seal-patch.mjs` so it no longer mutates JavaScript bundles. It now preserves JS runtime identifiers and only applies safe non-JS/fallback/favicon replacements.

## Important Recovery

During this pass, a broad surface replacement changed JavaScript identifiers in `skills-page-*.js` from `clawhub` to `gpao-t-extension-hub`, which broke the skills route with:

```text
Unexpected identifier 'Extension'. Expected a closing '}' following an expression in template literal.
```

Recovery was completed by restoring the live control-ui assets from:

```text
docs/03-verification/evidence/live-surface-seal-patch/2026-07-12T10-02-53-808Z-before-surface-seal/
```

Then the safer user-screen overlay was reapplied.

## Live Backups Created

- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-02-49-807Z`
- `docs/03-verification/evidence/live-surface-seal-patch/2026-07-12T10-02-53-808Z-before-surface-seal`
- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-08-36-289Z`
- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-10-49-105Z`
- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-12-00-452Z`
- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-13-31-408Z`
- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-15-26-837Z`
- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-16-31-900Z`
- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-18-14-461Z`
- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-41-01-858Z`
- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-42-17-006Z`
- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-43-15-424Z`
- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-46-00-838Z`
- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-47-55-185Z`
- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-49-44-451Z`
- `docs/03-verification/evidence/live-user-screen-ux-patch/2026-07-12T10-50-35-754Z`

## Verification

Passed:

```text
npm run check
node --test test/live-user-screen-ux-patch.test.js test/live-surface-seal-patch.test.js --test-concurrency=1 --test-timeout=180000 --test-reporter=spec
npm run seal:routes
node --check /Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/skills-page-B_eli0xC.js
node --check /Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/skills-page-uW6UAy8M.js
node --check /Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/plugins-page-BS1LhHiD.js
node --check /Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/plugins-page-CvaVrMck.js
node --check /Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/nodes-page-BfySYahx.js
node --check /Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/nodes-page-DfzfWESN.js
```

Safari readback samples confirmed:

- `/chat`: `Assistant`, `OpenClaw`, `Clawdette` visible text all false; historical speaker label displays as `GPAO-T`.
- `/settings/general`: `OpenClaw`, `Assistant`, `Clawdette`, `Gateway` visible text all false.
- `/settings/ai-agents`: advanced config form hidden; user-facing GPAO-T intelligence summary visible.
- `/skills`: panel load error false; `OpenClaw` and `ClawHub` visible text false; top filter language converted.
- `/settings/profile`: `OpenClaw`, `Assistant`, `Clawdette` visible text false; profile copy uses GPAO-T language.
- `/agents`: raw developer labels such as `Copy ID`, `Core Files`, `Bootstrap persona`, `Select a file to edit`, `Workspace:`, and `Cron 작업` no longer appear in the checked normal route sample.
- `/nodes`: raw developer labels such as `Allowlist and approval policy`, `Gateway edits local approvals`, `Default security mode`, `Default prompt policy`, `No nodes with system.run available`, `Pin agents to a specific node`, `default agent`, and `uses default` no longer appear after live nodes bundle patch and Safari cache clear.
- `/dreaming`: checked normal route sample did not expose the previous OpenClaw-era forbidden labels.
- `/documents`: direct route navigation redirects to the main chat route in the current live dashboard session, so no standalone documents surface was available to seal in this pass.

Additional evidence:

- `docs/03-verification/evidence/GPAO-T-SAFARI-ROUTE-DOM-READBACK-2026-07-12.md`

## Current Limits

- `npm run seal:routes` is `review`, not `blocked`. It has no forbidden static matches, but still records static-inventory-only DOM readback findings for routes it cannot prove from static files alone.
- Direct Safari DOM readback passed for the active checked user routes, but the experimental automated Safari audit helper still needs repair because nested child-process Safari JavaScript execution is unreliable on this machine.
- Some third-party skill descriptions remain in English. They are not OpenClaw residue and should not be machine-rewritten without per-skill translation ownership.
- Runtime namespace migration remains P1 because inherited `openclaw` identifiers still exist as compatibility substrate.

## Verdict

P0 user-facing surface blockers found in the previous midpoint seal are closed for the active checked live surfaces. The current approach is now safer: broad JavaScript bundle mutation is avoided, exact bundle strings are patched only where necessary, and user-facing cleanup is handled through the GPAO-T overlay layer with live backups.
