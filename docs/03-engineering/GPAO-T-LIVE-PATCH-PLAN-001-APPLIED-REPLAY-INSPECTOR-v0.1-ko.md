# GPAO-T Live Patch Plan 001

Title: Applied Replay Inspector live patch plan  
Status: live non-delete overlay applied; desktop/mobile visual QA captured  
Date: 2026-07-11  
Primary Track: Runtime & Productization  
Secondary Track: Operating Surface  
Owner: 윤  
Synthesis Lead: Codex  
Process Guardian: GPAO-T Process Guardian

## 0. Purpose

Prepare the safe live OpenClaw patch route for `Surface Work Order 001: Applied Replay Inspector`.

This plan first fixed:

- live Control UI path
- current live backup
- lab build source
- dry-run diff risk
- non-delete patch strategy
- rollback route
- Gateway restart route
- authenticated Safari visual QA requirements

It was then executed as a non-delete live overlay patch after the health and focused verification gates passed.

## 1. Current State

Live Gateway process:

```text
node /Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/index.js gateway --port 18789
```

Live Control UI:

```text
/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui
```

Lab source/build:

```text
/Users/jyp/Documents/Playground 2/openclaw-clean-lab/gpao-t-openclaw-dashboard-lab
/Users/jyp/Documents/Playground 2/openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/dist/control-ui
```

Health before mutation:

```text
curl -fsS http://127.0.0.1:18789/health
=> {"ok":true,"status":"live"}
```

## 2. Backup

Fresh backup created before this live plan:

```text
/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/live-backups/openclaw-control-ui-2026-07-11-before-applied-replay-inspector-live-plan
```

Backup file count:

```text
881
```

Backup key hashes:

```text
29e5266c6fef1589239ff747998465b2a924bf3fd673cb68ae74945493a58eda  index.html
d0bc9c913d0cfd509520bc64264723067d98bbfefb6f125151d0a056079fdeb3  assets/index-CKt8LxUP.js
b43039ac92d5ffeca161b33c6aaffbd9adb8afa9fea4fcabbe8c29d1a1ab4ba3  assets/chat-page-DzeNb-yM.js
c1174dce3ba064dcc39d3b01e904c10647806777bdfaedd4a0f61fe0a11dc431  assets/index-DnZhFp1V.css
```

## 3. Lab Build Candidate

Lab build file count:

```text
401
```

Lab index references:

```text
assets/index-BS9vlu_F.js
assets/index-DnZhFp1V.css
```

Lab key files:

```text
openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/dist/control-ui/index.html
openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/dist/control-ui/sw.js
openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/dist/control-ui/manifest.webmanifest
openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/dist/control-ui/assets/index-BS9vlu_F.js
openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/dist/control-ui/assets/chat-page-Bc9KoDxk.js
openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/dist/control-ui/assets/index-DnZhFp1V.css
```

Lab key hashes:

```text
2336c95de503b01c4f29e7be1dc8569752c783a7a9ddf893370a53326136ecfe  index.html
73ec567cb24be3fd60d3939b7e397e5dd8bee33f323e98d99f62f305685c7c04  assets/index-BS9vlu_F.js
ead5173fd1eed3238919b651dacbc78ac38ed4db4ee564379ce0c7c82281e28b  assets/chat-page-Bc9KoDxk.js
c1174dce3ba064dcc39d3b01e904c10647806777bdfaedd4a0f61fe0a11dc431  assets/index-DnZhFp1V.css
```

## 4. Dry-Run Finding

Command used:

```bash
rsync -a --dry-run --itemize-changes --delete openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/dist/control-ui/ /Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/
```

Finding:

- Live Control UI currently has 881 files.
- Lab build has 401 files.
- A delete-style sync would remove hundreds of accumulated old hashed assets.

Decision:

- Do not use `--delete` for the first live patch.
- Use a non-delete overlay patch first.
- Keep old hashed assets in place to reduce cache/session breakage risk.
- Use full restore from backup only for rollback.

## 5. Live Patch Command

Live patch was applied with non-delete overlay:

```bash
rsync -a "/Users/jyp/Documents/Playground 2/openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/dist/control-ui/" "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/"
```

Do not run:

```bash
rsync -a --delete ...
```

Reason:

- `index.html` will point to the new hashed app bundle.
- New assets will be available.
- Old assets remain harmless for currently cached pages.
- Rollback remains a full backup restore.

## 6. Rollback Command

If the live patch fails visual QA, restore the backup with delete:

```bash
rsync -a --delete "/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/live-backups/openclaw-control-ui-2026-07-11-before-applied-replay-inspector-live-plan/" "/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/"
```

Then restart Gateway only if the browser still serves stale assets or the Gateway process does not pick up static assets.

Rollback verification:

```bash
curl -fsS http://127.0.0.1:18789/health
```

Expected:

```text
{"ok":true,"status":"live"}
```

## 7. Gateway Restart Route

Current live PID observed:

```text
30734
```

Current process:

```text
/Users/jyp/.local/node-v24.14.0-darwin-arm64/bin/node /Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/index.js gateway --port 18789
```

Restart remained unnecessary during the live patch. Do not kill/restart unless stale assets or Gateway health failures appear.

Restart check sequence:

```bash
ps -axo pid,command | rg -n "openclaw.*gateway|dist/index.js gateway --port 18789"
curl -fsS http://127.0.0.1:18789/health
```

If restart is approved later, prefer the existing OpenClaw service wrapper or documented OpenClaw command rather than ad hoc process killing.

## 8. Authenticated Visual QA

Playwright fresh browser does not share the user's Safari authenticated session.

Therefore the live visual QA path must use one of:

- Safari authenticated session already open on the user's machine
- a browser session with the same stored Gateway credentials
- an approved browser/device-control path that can inspect the Safari page

Desktop QA must verify:

- page loads as `nBeAI. GPAO-T`
- chat page opens without reconnect/fallback state
- inspector rail opens
- `맥락` / `기억` / `권한` controls do not overflow
- applied replay inspector shows:
  - `적용 후보`
  - `Replay`
  - `현재 역할`
  - `anchor` or `support`
  - `자동 기억` / automatic admission blocked
  - `OpenClaw memory` 미기록
  - durable memory blocked
  - rollback signal visible but not active as unbounded authority

Mobile QA must verify:

- 390px-ish width does not hide target strip, rail, or inspector rows
- no text overlaps
- inspector rows wrap cleanly
- composer remains usable
- apply/rollback affordance does not look enabled before gate wiring

## 9. Blocked Until QA

Resolved in this unit:

- non-delete overlay patch applied
- live Gateway health re-checked after patch
- live `index.html` confirmed to point at `assets/index-BS9vlu_F.js`
- live key hashes confirmed against the lab build candidate
- authenticated Safari desktop visual QA captured
- authenticated Safari mobile-width visual QA captured

Evidence screenshots:

```text
/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/screenshots/gpao-t-live-applied-replay-inspector-desktop-2026-07-11.png
/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/screenshots/gpao-t-live-applied-replay-inspector-mobile-2026-07-11.png
```

Visual QA result:

- Desktop Safari title/url: `nBeAI. GPAO-T`, `http://127.0.0.1:18789/chat?session=agent%3Amain%3Amain`
- Desktop DOM confirmed: `.gpao-work-pane`, `nBeAI. GPAO-T`, `적용 후보`, `Replay`, `OpenClaw memory`
- Mobile-width Safari DOM confirmed: `.gpao-work-pane`, `nBeAI. GPAO-T`, `적용 후보`, `Replay`, composer present
- Mobile-width overflow check: `scrollWidth` 424, `clientWidth` 424, `overflowX: false`
- Rollback signal appears in the inspector text as `rollback`; actual rollback action remains a documented recovery command, not an active unbounded UI authority.

Still do not claim:

- production-ready
- GPAO-T complete
- actual endpoint fully connected
- memory system complete

Do not enable:

- actual OpenClaw memory write
- durable memory promotion
- session metadata mutation
- external connector/model/Telegram turn
- active apply/rollback button

## 10. Next Single Action

The next single action is not another surface patch. It is endpoint integration hardening:

1. Connect the live inspector read-model to the actual GPAO-T applied replay endpoint path with the same blocked write authorities.
2. Preserve the current rollback backup before any further live surface changes.
3. Add an evidence route/check that proves the live UI is reading the intended applied replay state and not only static fallback labels.
4. Keep OpenClaw memory write, durable memory promotion, and session metadata mutation blocked until Apply Gate wiring has replay evidence and rollback receipts.

## 11. Endpoint Integration Hardening Result

Result:

- The lab OpenClaw source now has a read-only Gateway bridge method: `gpao.appliedReplayInspector.get`.
- The method reads the GPAO-T surface artifact and returns `gpao_t.openclaw.applied_replay_inspector_bridge.v0_1`.
- The chat pane requests the Gateway method and feeds the returned state into the GPAO-T work pane read model.
- Missing or malformed state returns a blocked read-only state instead of throwing.
- A live micro patch was applied to the current OpenClaw installation.
- The live Gateway was restarted through LaunchAgent and returned healthy.
- Authenticated Safari proof confirmed that changing the GPAO-T state artifact changes the visible inspector value.

GPAO-T artifact:

```text
/Users/jyp/Documents/Playground 2/.gpao-t/surface/applied-replay-inspector.json
```

Current artifact status:

- `status`: `review`
- `findings`: `applied_candidate_not_retrieved`
- `openClawMemoryWrite`: `blocked`
- `durableMemoryPromotion`: `blocked`
- `sessionMetaWrite`: `blocked`
- `externalSend`: `blocked`
- `automaticAdmission`: `blocked`

Verification:

```bash
node --test gpao-t/test/memory-wiki.test.js
npm --prefix openclaw-clean-lab/gpao-t-openclaw-dashboard-lab run test:gateway -- src/gateway/server-methods/gpao-t.test.ts
npm --prefix openclaw-clean-lab/gpao-t-openclaw-dashboard-lab run tsgo:core
npm --prefix openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/ui test -- gpao-work-pane-state.test.ts chat-pane.test.ts
npm --prefix openclaw-clean-lab/gpao-t-openclaw-dashboard-lab/ui run build
```

All passed.

Live patch evidence:

- Manifest:
  - `/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/live-backups/openclaw-live-gpao-bridge-2026-07-11-before-patch/manifest.json`
- Restart:
  - `launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway`
- Health:
  - `{"ok":true,"status":"live"}`
- Latest Safari bundle:
  - `assets/index-BNuygm2R.js`
- DOM proof:
  - temporary artifact anchor `live-rpc-proof-20260711` appeared under `적용 후보`
  - restored artifact anchor `applied-replay-inspector` appeared after reload
  - `OpenClaw memory` remained `미기록`
  - durable memory remained `차단`
- Screenshot:
  - `/Users/jyp/Documents/Playground 2/gpao-t/docs/03-verification/evidence/screenshots/gpao-t-live-rpc-proof-2026-07-11.png`

Still do not claim:

- OpenClaw memory integrated as writable memory
- durable memory promotion complete
- Apply/Rollback wired
- automatic admission enabled
- memory system complete

Next patch plan:

1. Design Apply Gate as an explicit action contract, not an always-on memory write.
2. Define apply targets:
   - session metadata
   - OpenClaw memory
   - GPAO-T Memory Wiki
   - Context Mesh review queue
3. Require replay receipt and rollback receipt before any write.
4. Add UI controls only after blocked/read-only state, approval state, applied state, and rollback state are all represented.
