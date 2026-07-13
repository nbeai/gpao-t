# GPAO-T User-Facing Surface Seal Implementation - 2026-07-12

## Result

Status: applied and verified.

This pass turns the currently live dashboard surface into a more consistent `nBeAI. GPAO-T` user-facing surface. It focuses on visible product identity, dashboard fallback copy, mobile/plugin/settings/help copy, favicon branding, workspace shell language, memory approval wording, and test expectations.

## Applied Live Patch

- Tool: `tools/apply-openclaw-live-gpao-t-surface-seal-patch.mjs`
- Mode: `apply`
- Approval token used: `apply-gpao-t-surface-seal-live`
- Changed live files: 33
- Live root: `/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui`
- Backup and manifest:
  `docs/03-verification/evidence/live-surface-seal-patch/2026-07-12T07-18-45-054Z-before-surface-seal/manifest.json`

## Safety Notes

- The patch intentionally avoids changing service worker/cache/storage runtime keys such as `openclaw-control-`, `__OPENCLAW_CONTROL_UI_BUILD_ID__`, and `openclaw-notification`.
- Those names remain internal implementation keys, not user-facing product copy.
- The earlier risky global `ClawHub`, `reef`, `claws`, and notification/cache replacements were removed or narrowed before live apply.

## Source Changes

- Reframed Workspace Shell as `GPAO-T 작업 대시보드`.
- Reframed Browser Local App Shell as `GPAO-T 로컬 작업 화면`.
- Replaced user-facing `provider lane` language with model connection language.
- Replaced visible memory approval references to OpenClaw memory with `기존 런타임 기억 저장소`.
- Added GPAO-T live hook route aliases while leaving old routes as compatibility aliases.
- Updated runtime workspace pack files so first-install identity and workspace rules answer as GPAO-T first.

## Verification

- `node --check tools/apply-openclaw-live-gpao-t-surface-seal-patch.mjs`: pass
- `node --test test/live-surface-seal-patch.test.js --test-reporter=spec`: pass, 4/4
- Patch tool dry-run via relative path: JSON manifest produced
- Patch tool dry-run via absolute path with workspace-space path: JSON manifest produced
- Targeted test suite:
  `node --test test/workspace-shell.test.js test/control-center.test.js test/memory-candidate-review-queue.test.js test/live-surface-seal-patch.test.js --test-concurrency=1 --test-timeout=180000 --test-reporter=spec`
  pass, 51/51
- `npm run check`: pass
- `npm test`: pass, 335/335
- Live dist user-facing forbidden scan:
  no matches for startup fallback, docs.openclaw.ai links, OpenClaw mobile copy, official OpenClaw mobile copy, ClawHub display copy, OpenClaw optional capability copy, OpenClaw ownership/extension copy, lobster visit/sound/log display copy, and openclaw security audit display copy.

## Remaining Internal Provenance

Some internal route/module/cache/storage terms still contain OpenClaw-derived names. They are treated as technical provenance or compatibility internals until a deeper route and storage migration is planned with rollback coverage.

