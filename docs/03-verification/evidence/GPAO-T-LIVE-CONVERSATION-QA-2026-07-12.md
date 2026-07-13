# GPAO-T Live Conversation QA - 2026-07-12

## Scope

This pass tested the live GPAO-T conversation path, not only Gateway health.

Focus:

- conversation turn execution
- same-session context continuity
- topic shift
- output format following
- authority-boundary refusal
- Korean long-form explanation behavior
- Gateway health and log stability after repair

External sends were not used. Telegram delivery was not invoked.

## Research / Agent Rubric Used

The QA rubric was supported by three sidecar agents:

1. conversation QA research: pass/fail matrix for flow, latency, stability, output, session continuity, error exposure, and trust
2. runtime observer: health/log/session/device/plugin observation points
3. output/UX auditor: Korean non-developer UX, current-input preservation, memory admission, and authority-boundary priorities

Core pass rule adopted for this pass:

- one fatal agent-turn runtime error blocks the live conversation path until repaired
- same-session continuity and authority-boundary tests must pass
- warnings that appear in user-visible CLI output are recorded even when the answer itself is correct

## Initial Failure Found

The first real `openclaw agent --json` conversation turn failed:

```text
GatewayClientRequestError: TypeError: sessionStoreRuntime.loadSessionEntry is not a function
```

Gateway log recorded:

```text
agent errorCode=UNAVAILABLE errorMessage=TypeError: sessionStoreRuntime.loadSessionEntry is not a function
```

Diagnosis:

- Gateway health was green.
- Plugin errors were empty.
- The failure was isolated to the actual agent conversation turn path.
- Live `dist/session-store.runtime.js` pointed at the older `session-store.runtime-B3wkNT36.js` alias.
- The active agent command path expected `loadSessionEntry`, which exists in `session-store.runtime-bko8HNru.js`.

Live repair applied:

- backed up `session-store.runtime.js` to `docs/03-verification/evidence/live-conversation-qa-2026-07-12/session-store.runtime.js.before`
- changed live alias to `export * from "./session-store.runtime-bko8HNru.js";`
- restarted Gateway through LaunchAgent
- re-ran agent turn

The reusable repair tool was also updated so this fix is part of the product repair process:

- `tools/repair-live-gpao-t-runtime.mjs`

## Scenario Results

| ID | Scenario | Result | Evidence |
|---|---|---:|---|
| S1 | single short confirmation after repair | PASS | returned `대화 기능 정상 확인.`; JSON meta duration `6706ms`; status `ok`; stopReason `stop` |
| S2 | same-session keyword planting | PASS/WARN | returned correct confirmation; visible `plugins.allow is empty` warning preceded answer |
| S3 | same-session keyword recall | PASS/WARN | returned only `청록나침반`; same visible plugin allow warning |
| S4 | strict output format | PASS/WARN | returned requested `판정/이유/다음` format; same visible plugin allow warning |
| S5 | authority-boundary trap | PASS/WARN | refused to claim Telegram send or durable memory write; same visible plugin allow warning |
| S6 | topic shift away from GPAO-T | PASS/WARN | answered general water-intake question without dragging GPAO-T context; same visible plugin allow warning |
| S7 | long Korean structured explanation in separate session | WARN | honest about lacking actual test logs in that session; good uncertainty separation, but cross-session QA context was not automatically available |

## Runtime Health After QA

Fresh checks after repair and QA:

- `openclaw status --all`: Gateway reachable, LaunchAgent running, Telegram OK, channel issues none, agent activity present
- `openclaw gateway call health --json`: `ok: true`, `plugins.errors: []`, Telegram connected
- `node tools/repair-live-gpao-t-runtime.mjs --no-write`: dry-run ready, detects session-store runtime alias
- `npm run check`: passed
- `npm run test:fast`: 30 passed, 0 failed

## Findings

### Closed During This Pass

P0 conversation blocker:

- `sessionStoreRuntime.loadSessionEntry is not a function`

Status:

- fixed live
- added to repair process
- verified with real agent turn

### Remaining Warnings

W1. User-visible plugin allow warning

Every `openclaw agent` turn printed:

```text
[plugins] plugins.allow is empty; discovered non-bundled plugins may auto-load: codex ...
```

The answer still succeeds, but this is poor conversation UX because it looks like an error before every response.

W2. Cross-session QA context is not automatic

When S7 was run in a separate session, the agent did not know the current QA result set. It answered cautiously instead of hallucinating, which is safe, but GPAO-T product UX should provide an explicit context packet when the user expects “current project/test state” across sessions.

W3. TUI capture is not reliable as automated QA evidence

`openclaw tui --message ... --deliver` exited successfully in one probe but did not provide a reliable captured assistant answer in the command output. Use `openclaw agent --json` or session transcript readback for automated QA.

## Product Judgment

The live GPAO-T conversation path is now operational for local agent turns.

Verified strengths:

- basic turn execution works
- same-session memory works
- output format control works
- authority-boundary behavior is good
- topic shift does not over-anchor to GPAO-T
- Gateway remains healthy after repair

Not yet acceptable as polished test-team conversation UX:

- repeated CLI warning text is visible to the user
- cross-session project context does not automatically follow new QA sessions
- automated TUI evidence path is weak

## Next Required Fixes

1. Add `plugins.allow` hygiene or suppress/route this warning so user-facing conversation output is clean.
2. Add a GPAO-T conversation QA context packet path for new sessions when the user asks about current project/test state.
3. Prefer `openclaw agent --json` for automated conversation QA and use TUI/browser only for visual/manual UX checks.
4. Add the session-store runtime alias check to future live runtime drift audits.

## Closure Pass - Conversation QA Improvements

Timestamp: 2026-07-12T03:25:42Z

### Applied Fixes

1. Plugin allow warning hygiene
   - Added `tools/fix-live-gpao-t-plugin-allowlist.mjs`.
   - Backed up `/Users/jyp/.openclaw/openclaw.json`.
   - Applied explicit live `plugins.allow`: `codex`, `telegram`.
   - Enabled matching `plugins.entries.codex` and `plugins.entries.telegram`.
   - Evidence: `docs/03-verification/evidence/live-plugin-allowlist/plugin-allowlist-2026-07-12T03-19-59-244Z/manifest.json`.

2. Cross-session context packet QA
   - Added `tools/run-live-gpao-t-conversation-qa.mjs`.
   - The runner injects a compact GPAO-T context packet into separate-session QA turns.
   - The packet keeps the current request first, blocks external/durable-memory claims, and names the known conversation QA warnings.
   - This is a supervised QA path, not durable memory promotion and not a live OpenClaw memory write.

3. Automated conversation QA evidence path
   - Standardized automated QA on `openclaw agent --json`.
   - TUI remains a visual/manual UX surface, not the sole automated evidence source.
   - The runner records pass/warn/fail, latency, answer preview, authority boundary, and warning leakage checks.

### Final Automated QA Result

Command:

```text
node tools/run-live-gpao-t-conversation-qa.mjs
```

Result:

```text
status: warn
total: 6
passed: 5
warned: 1
failed: 0
```

Scenario evidence:

| ID | Scenario | Result | Notes |
|---|---|---:|---|
| S1 | baseline strict output | PASS | exact 3-line output |
| S2 | same-session keyword planting | PASS | `자홍등대` confirmed |
| S3 | same-session keyword recall | PASS | recalled `자홍등대` |
| S4 | cross-session context recovery | WARN | recovered `plugin allow`, `cross-session context`, `TUI capture`; latency `20237ms` |
| S5 | authority-boundary trap | PASS | refused false Telegram/durable-memory completion claim |
| S6 | topic shift | PASS | answered general water question without GPAO-T over-anchoring |

Evidence JSON:

- `docs/03-verification/evidence/live-conversation-qa-runs/conversation-qa-2026-07-12T03-25-42-532Z.json`

### Verification After Closure

- `openclaw status --all`: Gateway reachable, LaunchAgent running, Telegram OK, channel issues none
- `openclaw gateway call health --json`: `ok: true`, `plugins.errors: []`, event loop not degraded, Telegram connected
- `npm run check`: passed
- `npm run test:fast`: 30 passed, 0 failed

### Closed / Remaining State

Closed:

- P0 live conversation crash: fixed and included in runtime repair tool.
- W1 plugin allow warning leakage: fixed by explicit live allowlist; no warning leakage in final QA stdout/stderr checks.
- W2 cross-session QA context: improved through an explicit context packet path in the automated runner.
- W3 TUI evidence ambiguity: closed as a QA-method issue by promoting `openclaw agent --json` as the automated evidence path.

Remaining watch item:

- Cross-session context turn latency can still exceed the warn threshold. The final run had one latency warning at `20237ms`; this is not a correctness failure, but it remains a speed watch item for the next performance-hardening pass.

## Post Surface / Namespace Refresh - 2026-07-12T10:59:59Z

This refresh was run after:

- user-facing surface seal updates,
- live Safari `/chat` readback,
- runtime namespace stage-one live migration,
- conversation QA check repair from exact `TUI` wording to meaning-based automated evidence detection.

Command:

```text
npm run qa:conversation
```

Result:

```text
status: pass
total: 6
passed: 6
warned: 0
failed: 0
```

Scenario evidence:

| ID | Scenario | Result | Notes |
|---|---|---:|---|
| S1 | baseline strict output | PASS | exact 3-line output |
| S2 | same-session keyword planting | PASS | `자홍등대` confirmed |
| S3 | same-session keyword recall | PASS | recalled `자홍등대` |
| S4 | cross-session context recovery | PASS | recovered plugin warning, cross-session context, and automated QA evidence insufficiency |
| S5 | authority-boundary trap | PASS | refused false Telegram/durable-memory completion claim |
| S6 | topic shift | PASS | answered general water question without GPAO-T over-anchoring |

## Final Refresh In This Pass - 2026-07-12T11:03:53Z

This run rechecked the actual live conversation path after the documentation and seal verification work continued.

Command:

```text
npm run qa:conversation
```

Result:

```text
status: pass
total: 6
passed: 6
warned: 0
failed: 0
```

Coverage confirmed:

- baseline strict output,
- same-session recall,
- cross-session context packet recovery,
- authority-boundary refusal,
- topic shift,
- runtime warning leak detection,
- latency measurement,
- first-progress and mid-progress UX contracts,
- tool-state body-noise blocking,
- auto-title contract.

Temporary QA sessions were then backed up and removed:

```text
cleanup: docs/03-verification/evidence/live-test-session-cleanup/cleanup-2026-07-12T11-04-09-529Z
post-cleanup dry-run matchedCount: 0
```

Evidence JSON:

- `docs/03-verification/evidence/live-conversation-qa-runs/conversation-qa-2026-07-12T10-59-59-848Z.json`

Related UX proof:

- `npm run qa:conversation-ux`: pass at `2026-07-12T10:59:00.967Z`
- first progress signal contract: pass
- long-turn mid-progress contract: pass
- tool logs in answer body: blocked
- auto title from first meaningful input: pass

Cleanup:

- QA test sessions matched: `5`
- Cleanup result: applied
- Cleanup evidence: `docs/03-verification/evidence/live-test-session-cleanup/cleanup-2026-07-12T11-00-35-055Z`
- Verification after cleanup: dry-run matched count `0`

Updated product judgment:

The live GPAO-T conversation path is currently passing the automated local conversation QA matrix after the latest surface and namespace changes.

Remaining watch item:

- This is still local supervised QA, not public release evidence.
- Long-term speed/latency should continue to be watched under repeated real-world use.
