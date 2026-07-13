# OpenClaw Stage 1 Live Inventory

Date: 2026-07-10  
Status: inventory captured  
Scope: read-only inventory for converting the current local PC OpenClaw into GPAO-T substrate

Superseded scope note (2026-07-12):

Hardware Engine references in this inventory are historical only. The current GPAO-T project scope is the live OpenClaw body, the pure OpenClaw lab source, the GPAO-T source/evidence/package lane, and the connected Gateway QA path. `gpao-t-hardware-engine` is retired from the active project and must not be treated as active source truth, a dependency, a blocker, or a completion gate unless 윤 explicitly reopens that lane.

## 1. Purpose

This inventory supports:

`docs/03-engineering/OPENCLAW-CONVERSION-STAGE-1-WORK-ORDER-v0.1-ko.md`

The goal is to capture the current live OpenClaw footprint before any further GPAO-T mutation, restart, or prompt-path patch.

## 2. Boundary

This pass was read-only.

It did not:

- mutate live OpenClaw
- restart Gateway
- kill processes
- run a live Telegram/OpenClaw turn
- promote durable memory
- activate automation
- connect accounts or secrets
- send externally
- push to GitHub
- deploy or publish

## 3. Running Process Snapshot

Filtered process inspection found the current OpenClaw Gateway process:

```text
PID 47549
command: /Users/jyp/.local/node-v24.14.0-darwin-arm64/bin/node /Users/jyp/.local/lib/node_modules/openclaw/dist/index.js gateway --port 18789
elapsed: about 01:11 at capture time
```

Attached OpenClaw Codex runtime:

```text
PID 47758
command: node /Users/jyp/.openclaw/npm/projects/openclaw-codex-8902d781d4/node_modules/@openclaw/codex/node_modules/.bin/codex app-server --listen stdio://

PID 47759
command: /Users/jyp/.openclaw/npm/projects/openclaw-codex-8902d781d4/node_modules/@openclaw/codex/node_modules/@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/bin/codex app-server --listen stdio://
```

Telegram desktop was also running:

```text
PID 70059
command: /Applications/Telegram.app/Contents/MacOS/Telegram
```

Note:

- The process list was inspected with a filtered `ps` command.
- A sandboxed filtered `ps` attempt was blocked by macOS/sandbox permissions, then the same read-only process inspection was allowed with approval.

## 4. OpenClaw Configuration Snapshot

Observed root:

```text
/Users/jyp/.openclaw
```

Important files/directories:

```text
/Users/jyp/.openclaw/openclaw.json
/Users/jyp/.openclaw/openclaw.json.last-good
/Users/jyp/.openclaw/openclaw.json.before-gpao-attachment-apply-20260706T210207Z
/Users/jyp/.openclaw/gateway-supervisor-restart-handoff.json
/Users/jyp/.openclaw/logs
/Users/jyp/.openclaw/state
/Users/jyp/.openclaw/workspace
/Users/jyp/.openclaw/workspace/state/beai
```

Configuration hints from `openclaw.json`:

```text
gateway config exists
telegram plugin config exists
duckduckgo plugin config exists
tools.web.search.provider = duckduckgo
model entries exist
skills section exists
```

Sensitive values were not copied into this evidence.

## 5. Restart / Supervisor Evidence

Recent handoff file:

```text
/Users/jyp/.openclaw/gateway-supervisor-restart-handoff.json
```

Observed fields:

```text
kind: gateway-supervisor-restart-handoff
reason: gateway.restart
source: operator-restart
restartKind: full-process
supervisorMode: launchd
pid: 45732
```

Gateway restart log:

```text
/Users/jyp/.openclaw/logs/gateway-restart.log
```

The tail shows multiple launchd handoff restarts between 2026-06-20 and 2026-07-06. Some 2026-06-29 attempts failed with `Operation not permitted`; later attempts completed.

## 6. GPAO-T / BEAI State Snapshot

Important state directory:

```text
/Users/jyp/.openclaw/workspace/state/beai
```

Relevant files include:

```text
session-continuity.json
new-session-context-pack.json
live-evidence.jsonl
telegram-delivery-ledger.jsonl
memory-candidates.json
skill-routing-report.json
automation-registry.json
promotion-gate.json
```

Current continuity state:

```text
schema: gpao_t.live_session_continuity.v0_1
status: disabled_pending_live_broker_verification
mode: safe_baseline_recovery
```

Important live-state reason:

```text
Live Telegram failed new-session omitted-target continuity; hardcoded referent handoff is disabled until before_prompt_build injection and answer consumption are proven by same-condition live test.
```

Current new-session context pack:

```text
schema: gpao_t.new_session_context_pack.v0_1
status: disabled_pending_live_broker_verification
carry: []
```

Important `doNotCarry` rules:

```text
No hardcoded prior restaurant/entity carry.
No durable memory promotion.
No external action or connector activation.
No stale package/release memory as answer anchor unless current request asks for package/release.
```

## 7. Existing OpenClaw / GPAO-T Work Evidence

Existing Stage-related documents and tools were found under:

```text
/Users/jyp/Documents/Playground 2/gpao-t-openclaw-live-patch
/Users/jyp/Documents/Playground 2/gpao-t-openclaw-core-patch
```

Retired historical document:

```text
/Users/jyp/Documents/Playground 2/archive/out-of-scope/gpao-t/gpao-t-hardware-engine/docs/03-engineering/GPAO-T-OPENCLAW-TURN-START-INPUT-PACKET-ATTACHMENT-PASS-001.md
```

That document once claimed local-safe attachment was completed through:

```text
dist/gpao-t-core-context.js
dist/attempt.prompt-helpers-Cuf8j_4K.js
buildGpaoTCorePrependContext()
buildOpenClawTurnStartInputPacketAttachment()
```

But its own next stage is:

```text
OpenClaw Live Turn Smoke Pass 001
```

Therefore the correct current status is:

```text
repo/local attachment proof exists
live behavior consumption is not yet verified
current live continuity state is intentionally disabled_pending_live_broker_verification
```

## 8. Findings

### Finding 1. OpenClaw is running and usable as a live substrate candidate

OpenClaw Gateway is running on port `18789`, with an attached OpenClaw Codex app-server process.

### Finding 2. Search provider is configured to DuckDuckGo

The current OpenClaw config has `tools.web.search.provider = duckduckgo`.

This matches the prior live patch direction where search quality was partially restored.

### Finding 3. Session continuity is deliberately disabled until live broker proof

The live state is not claiming that `/new` continuity is fixed.

This is good safety behavior. It prevents stale hardcoded referents from being carried into future turns.

### Finding 4. Retired attachment proof must not be confused with live proof

Prior retired hardware-engine evidence said turn-start attachment was locally completed, but that lane is no longer active GPAO-T source truth. The current project must rely on live OpenClaw, pure OpenClaw lab source, GPAO-T source/evidence/package checks, and Gateway QA evidence.

This aligns with the current GPAO-T rule:

```text
repo-level proof != live behavior proof
```

### Finding 5. Stage 1 should continue with prompt packet check, then controlled smoke

The next safe step is not UI redesign or broad mutation.

Next:

```text
1. prompt-path packet check
2. controlled OpenClaw live smoke
3. search route observation
4. pass / patch-required / hold decision
```

## 9. Next Safe Action

Prepare `OPENCLAW-STAGE-1-PROMPT-PACKET-CHECK-2026-07-10.md`.

The check should verify whether a real OpenClaw model turn receives GPAO-T prepend/context packet material before answering.

Any action that requires Gateway restart, live runtime patch, or live turn execution should be treated as an approval boundary.
