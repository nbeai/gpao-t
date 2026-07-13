# GPAO-T User-Facing Surface Seal Prep Evidence

Date: 2026-07-12
Mode: read-only audit + prep document

## Request

윤님은 라이브 지파오티에서 사용자가 보는 모든 것과 경험하는 모든 것이 GPAO-T가 되어야 한다고 지시했다. OpenClaw 아이콘, 로고, 서비스명, 대시보드 메뉴, 하위페이지 전체를 감사하고 GPAO-T로 바꿀 준비를 요구했다.

추가 정정: "대시보드의 모든 메뉴"는 설정 버튼 아래의 모든 설정 섹션까지 포함한다. 즉, 사용자가 접근 가능한 모든 페이지, 하위 페이지, 모달, 팝오버, 검색 결과, 내보내기, 오류/복구 화면이 감사와 봉인 대상이다.

## Agents

- Source surface audit: `gpao-t` repo routes, menus, source-rendered labels, shell pages.
- Live dist/runtime audit: live control-ui bundles, favicon, service worker, locale bundles, runtime workspace/env/device files.
- Process guard: completion gates, rollback/live patch safety, visual QA checklist.

## Key Findings

Already sealed:

- Browser/PWA title and manifest are `nBeAI. GPAO-T`.
- Primary icon references point to GPAO logo assets.
- Default chat work-pane developer strip is hidden by the current live user-screen patch.
- Telegram direct session rail is separated as `소통`.

Remaining user-facing risks:

- `control-ui/index.html` fallback was included in the live surface seal patch scope; the applied manifest now rewrites the startup failure and troubleshooting copy to GPAO-T language and local recovery anchors.
- Locale bundles still contain OpenClaw mobile, ClawHub, and OpenClaw extension language.
- Korean bundle still contains `OpenClaw 모바일`, `공식 OpenClaw 모바일 앱`, `OpenClaw가 소유한`, `OpenClaw를 확장`.
- `favicon.svg` still contains legacy mascot material.
- Usage export filenames still use `openclaw-usage-*`.
- Service worker still uses `openclaw-control-*` cache prefix and `openclaw-notification`.
- Debug/settings/plugin surfaces still expose OpenClaw command/docs language.
- `workspace-shell.js` still publicly frames some surfaces as forked from OpenClaw instead of owned by GPAO-T.
- Runtime workspace files need a final user-facing seal so ordinary file-tab inspection reads as GPAO-T Runtime Workspace, not OpenClaw default workspace.
- Settings is a primary risk surface, not a secondary admin panel. Every nested setting section must be audited for OpenClaw, ClawHub, Control UI, Gateway-only, and developer-facing wording.

Route inventory agent result:

- The live dashboard is still OpenClaw-owned at much of the route/copy layer.
- High-risk routes: `Settings`, `Plugins`, `Nodes`, `Skills`, `Usage`, `About`, `Debug`, `Logs`, `Profile`, `Worktrees`, `Cron`, `Automation`, `MCP`, `Infrastructure`.
- Main remaining visible terms: `OpenClaw`, `ClawHub`, `Control UI`, `Gateway`, `openclaw.json`, mobile pairing copy, plugin discover copy, build/auth/fallback copy.
- Recommended strategy: rewrite normal user routes, hide/debug-gate internal routes, keep OpenClaw only in collapsed technical origin/provenance where necessary.

## Prep Artifact

Created:

- `docs/03-engineering/GPAO-T-USER-FACING-SURFACE-SEAL-PREP-v0.1-ko.md`

The prep artifact defines:

- user-facing forbidden surfaces
- allowed internal compatibility surfaces
- P0/P1 target list
- phased patch order
- live mutation safety rules
- visual/conversation QA completion gates
- settings-button-inclusive route inventory scope
- hidden-but-accessible UI scope: command palette, menu actions, modals, tooltips, aria labels, notifications, exported filenames
- full route inventory v0.1 with route-by-route rewrite/hide/internal-keep recommendations

## Next Development Unit

Implement `Phase 2 + Phase 3` from the prep document:

1. Patch source-rendered user-facing copy.
2. Add/extend tests that reject forbidden visible OpenClaw traces.
3. Build a guarded live surface seal patch tool.
4. Dry-run against live dist.
5. Apply only with manifest/rollback/readback.
6. Run Safari route walk and conversation smoke.

Before implementation, incorporate the dedicated route inventory agent output for all dashboard-accessible pages including `Settings`.

## Current Completion Claim

Preparation is complete.

The user-facing surface seal itself is not complete yet. It starts with the next implementation pass.
