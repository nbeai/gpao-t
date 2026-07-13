# Live Runtime Seal - 2026-07-12

Status: midpoint live runtime seal recorded
Scope: live GPAO-T runtime, `.openclaw` overlay, inherited OpenClaw substrate, current user-visible surface, repair and rollback boundaries.

## Runtime Identity

From this seal forward, the live local runtime is called `GPAO-T`.

Technically, it is still a patched OpenClaw runtime:

- Installed package name: `openclaw`
- Installed version: `2026.6.11`
- Installed commit: `e085fa1a3ffd32d0ea6917e1e6fb4ecbffbb77d2`
- Live install root: `/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist`
- Live state root: `/Users/jyp/.openclaw`

Product rule:

```text
The user-facing product is GPAO-T.
OpenClaw names may remain only as inherited substrate, compatibility, service, rollback, or provenance identifiers until the packaging/namespace migration lane replaces them safely.
```

## Live State Roots

Important live paths:

- Config: `/Users/jyp/.openclaw/openclaw.json`
- Runtime workspace: `/Users/jyp/.openclaw/workspace`
- Runtime manifest: `/Users/jyp/.openclaw/workspace/RUNTIME-MANIFEST.json`
- Live UI root: `/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui`
- Live logo asset: `/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/gpao-logo.jpeg`
- Live bridge bundle: `/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/gpao-t-B6WiwufB.js`
- Session store: `/Users/jyp/.openclaw/agents/main/sessions/sessions.json`
- Runtime DB: `/Users/jyp/.openclaw/state/openclaw.sqlite`

## Current Health

Last direct live status evidence from this midpoint work:

- Gateway reachable through loopback `127.0.0.1:18789`
- Telegram configured as enabled
- Codex configured as enabled
- Model configured as `openai/gpt-5.5`
- Runtime workspace manifest schema: `gpao_t.runtime_workspace_manifest.v0_1`

Known status warnings from live inspection:

- Tailscale is off or not active.
- Some telemetry/activity counters are quiet.
- Process inspection was partially permission-limited in one agent pass.

These warnings do not by themselves prove a broken runtime, but they block a clean “fully verified live runtime” claim.

## User-Visible Surface State

Confirmed sealed or mostly sealed:

- Main dashboard branding: `nBeAI. GPAO-T`
- Runtime workspace identity files
- Connection/login copy partially converted to GPAO-T language
- Settings profile, appearance, channels, communications, automation
- Chat route with developer top work pane hidden in normal user view
- Telegram direct session separated as a communication rail

Closed in P0 user-surface pass:

- `/settings/ai-agents` no longer exposes visible `Assistant` / `Keep Last Assistants`; the normal user view now shows a GPAO-T intelligence summary.
- `/settings/general` visible `OpenClaw`, `Assistant`, `Clawdette`, and `Gateway` text read back as false in Safari.
- `/chat` historical speaker label now reads `GPAO-T` instead of `Assistant`.
- `/skills` recovered from a broad-replacement bundle break; panel load error reads false, and visible `OpenClaw` / `ClawHub` read back as false.
- `/settings/profile` visible `OpenClaw`, `Assistant`, and `Clawdette` read back as false; mascot copy was converted to GPAO-T language.
- `/agents` checked in Safari after the user-screen pass; raw developer labels such as `Copy ID`, `Core Files`, `Bootstrap persona`, `Select a file to edit`, `Workspace:`, and `Cron 작업` no longer appear in the checked normal route sample.
- `/nodes` checked in Safari after exact live nodes bundle patch and Safari cache clear; raw developer labels such as `Allowlist and approval policy`, `Gateway edits local approvals`, `Default security mode`, `Default prompt policy`, `No nodes with system.run available`, `Pin agents to a specific node`, `default agent`, and `uses default` no longer appear in the checked normal route sample.
- `/dreaming` checked in Safari; previous OpenClaw-era forbidden labels were not visible in the checked normal route sample.
- `/documents` redirects back to the main chat route in the current live dashboard session; it is recorded as route behavior, not a failed standalone documents page seal.
- Post namespace-stage-one Safari `/chat` readback passed:
  - path: `/chat`
  - title: `nBeAI. GPAO-T`
  - checked visible forbidden terms: none
  - `GPAO-T` historical speaker label remained visible.

Route-seal automation closure:

- `npm run seal:routes`: `ready`.
- Static forbidden matches are empty.
- The route audit now reads `GPAO-T-SAFARI-ROUTE-DOM-READBACK-2026-07-12.md` and accepts the checked active Safari DOM readback evidence.
- `/documents` remains recorded as redirect behavior rather than a standalone documents page.

Remaining user-visible caution:

- Some third-party skill descriptions remain in English. They are treated as external/tool description content, not OpenClaw residue.

## Conversation State Refresh

After the latest user-surface, namespace, and visual recovery work:

- Sandboxed `npm run qa:conversation`: failed because the restricted environment could not write the live `.openclaw/state/openclaw.sqlite` database.
- Escalated live `npm run qa:conversation`: warn, 5 passed, 1 warned, 0 failed.
- Remaining QA warning: baseline response latency `34382ms`.
- `npm run qa:conversation-ux`: pass.
- QA sessions created by the live conversation run were backed up and removed.
- Cleanup verification matched count: `0`.

## Inherited Substrate Residue

The previous namespace residue is not closed for the live local runtime:

- Evidence: `docs/03-verification/evidence/gpao-t-runtime-namespace-audit-2026-07-12.json`
- Latest command status after rollback: `bundle_alias_bridge_ready_rebuild_required`
- Latest hit count: `770`
- Pre-rebuild inherited namespace hits: `1121`
- Attempted post-rebuild inherited namespace hits: `0`

The safe, accepted layer is a guarded compatibility migration rather than a blind live edit:

1. Mirror storage keys.
2. Migrate active service worker/cache and notification identifiers to GPAO-T while preserving old cache compatibility.
3. Register manifest-backed `gpao-t-*` element aliases while keeping old aliases.
4. Keep rollback aliases until live proof is stable.
5. Defer full live control-ui namespace replacement to a source rebuild path with browser-first QA.

Stage-one applied evidence:

- Backup: `docs/03-verification/evidence/live-namespace-migration/2026-07-12T10-56-11-577Z`
- Live `index.html` now contains `gpao_t_runtime_namespace_mirror_v0_1`.
- Live `sw.js` now uses active `gpao-t-control-` cache prefix, keeps `openclaw-control-` as legacy cache compatibility, and uses `gpao-t-notification` for new notifications.

Bundle alias bridge applied evidence:

- Backup: `docs/03-verification/evidence/live-namespace-migration/2026-07-12T11-21-58-307Z`
- Live `index.html` now contains `gpao_t_custom_element_alias_bridge_v0_1`.
- The alias bridge was generated from the live bundle and covers 71 inherited `openclaw-*` custom element names.
- Follow-up dry-run after apply reported `changed: false`.

Standalone namespace rebuild evidence and rollback truth:

- Dry-run: `docs/03-verification/evidence/gpao-t-standalone-namespace-rebuild-dry-run-2026-07-12.json`
- Live backup: `docs/03-verification/evidence/live-standalone-namespace-rebuild/2026-07-12T12-07-01-458Z`
- Changed live control-ui files: `85`
- Legacy custom element aliases preserved: `48`
- Attempted post-apply namespace audit: `ready`, `hitCount: 0`
- Product result: rejected after Safari displayed a non-mounted user screen.
- Rollback: restored the live control-ui backup while preserving the app manifest; current audit returned to `bundle_alias_bridge_ready_rebuild_required`, `hitCount: 770`.
- Recovery hotfix: `tools/apply-live-dashboard-cache-bust-hotfix.mjs` added a main module query marker so Safari drops the stale broken cached module.
- Recovery evidence: `docs/03-verification/evidence/live-dashboard-cache-bust-hotfix/2026-07-12T21-35-00-kst.json`

Safari chat-layout recovery evidence:

- User-reported failure after cache-bust recovery: the dashboard mounted, but the main chat surface was visually broken; the composer floated high in the center, and the visible thread looked clipped.
- Measured cause in Safari: the browser viewport was `833px` high, while the chat route custom-element chain had collapsed to `152px`.
- Applied live hotfix: `tools/apply-live-chat-layout-recovery-hotfix.mjs`.
- Hotfix marker: `gpao_t_chat_layout_recovery_v0_1`.
- Evidence JSON: `docs/03-verification/evidence/live-chat-layout-recovery-hotfix/2026-07-12T12-38-11.240Z.json`.
- Screenshots:
  - `docs/03-verification/evidence/live-chat-layout-recovery-hotfix/screenshots/safari-chat-layout-after-2026-07-12.png`
  - `docs/03-verification/evidence/live-chat-layout-recovery-hotfix/screenshots/safari-chat-layout-after-return-2026-07-12.png`
- Post-fix Safari geometry: `openclaw-chat-pane` height `833px`, `.chat-thread` height `712px`, textarea y `729`, textarea bottom `765`.

## Live Mutation Tools

Live mutation scripts exist and are useful, but must remain guarded:

- `tools/apply-openclaw-live-gpao-bridge-patch.mjs`
- `tools/apply-openclaw-live-gpao-t-surface-seal-patch.mjs`
- `tools/apply-openclaw-live-user-screen-ux-patch.mjs`
- `tools/apply-openclaw-live-conversation-ux-patch.mjs`
- `tools/apply-gpao-t-runtime-workspace-pack.mjs`
- `tools/repair-live-gpao-t-runtime.mjs`
- `tools/rollback-live-gpao-t-runtime-repair.mjs`
- `tools/fix-live-gpao-t-plugin-allowlist.mjs`
- `tools/cleanup-live-gpao-t-test-sessions.mjs`

Current rule:

```text
Dry-run/read-only checks may run during audit.
Apply paths require exact approval token, backup manifest, and post-apply verification.
```

Reproducibility audit refresh:

- `npm run seal:live-patches`: `ready`
- Evidence: `docs/03-verification/evidence/gpao-t-live-patch-reproducibility-audit-2026-07-12.json`
- Covered live mutation families:
  - GPAO-T live bridge
  - surface seal
  - user-screen UX
  - conversation UX
  - runtime workspace pack
  - live runtime repair/rollback
  - plugin allowlist
  - live test-session cleanup
- runtime namespace stage-one
  - standalone namespace rebuild

## Rollback And Backup Evidence

Existing backup families:

- `docs/03-verification/evidence/live-backups/`
- `docs/03-verification/evidence/live-runtime-repair-2026-07-12/`
- `docs/03-verification/evidence/live-user-screen-ux-patch/`
- `docs/03-verification/evidence/live-surface-seal-patch/`
- `docs/03-verification/evidence/live-conversation-ux-patch/`
- `docs/03-verification/evidence/live-device-repair-backup-2026-07-12/`
- `docs/03-verification/evidence/live-test-session-cleanup/`
- `docs/03-verification/evidence/live-standalone-namespace-rebuild/`

Rollback readiness is documented, but destructive rollback execution was not performed in this midpoint seal.

## Closed Or Improved Live Risks

Previously documented risks have strong evidence of repair or mitigation:

- Reply-session conflict was investigated and later live conversation QA passed in prior evidence.
- Device/auth repair had backup and partial recovery evidence.
- Plugin allowlist and live runtime repair tooling exist.
- Test QA sessions were cleaned from live session list after backup.
- Settings/general visible forbidden terms were removed in recent Safari text audit.

Current caution:

Some older docs still describe these as open. Some newer docs describe them as closed. This midpoint seal treats them as “improved but still requiring current live route/conversation proof” until the route-seal backlog passes.

## Live Runtime Verdict

The live runtime is usable as the local GPAO-T work environment and is sealed as a supervised local test-team handoff candidate.

Latest final gate:

- command: `npm run seal:final`
- evidence: `docs/03-verification/evidence/gpao-t-final-supercar-seal-2026-07-12.json`
- status: `ready_for_supervised_test_team_handoff_with_rebuild_debt`
- hard blockers: `0`

What this means:

1. User-visible GPAO-T identity, checked dashboard routes, live patch reproducibility, source/evidence grouping, and local package integrity are closed for supervised local testing.
2. Namespace bridge and user-facing overlays are accepted for supervised local testing, but the full standalone live namespace rebuild is not closed. Current live audit remains `bundle_alias_bridge_ready_rebuild_required`, `hitCount: 770`.
3. Clean-machine installer, signed/public distribution, and source-level independent package proof remain separate release lanes.

The next stronger claim must be the strict standalone seal with browser-first QA, not another vague completion statement.
