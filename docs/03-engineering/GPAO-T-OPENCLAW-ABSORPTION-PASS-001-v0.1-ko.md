# GPAO-T OpenClaw Absorption Pass 001

Status: completed historical planning record / superseded as current direction
Date: 2026-07-10
Owner: 윤

This pass records the 2026-07-10 compatibility-source study. It does not define
the current product architecture. Since 2026-07-13, GPAO-T is an independent
product and OpenClaw is a separate comparison/compatibility reference.

## 0. Purpose

This pass converts the current command into four concrete outputs:

1. nbeai GitHub and local source inventory.
2. OpenClaw circuit to GPAO / BEAI absorption map.
3. Codex GPAO and T-cell absorption elements.
4. OpenClaw Gateway Dashboard to GPAO-T Control Center design direction.

Step 5, live OpenClaw mutation, is intentionally left for explicit user discussion.

The rule for this pass is:

```text
Do not attach GPAO to OpenClaw as an external device.
Understand OpenClaw as the current body, then absorb GPAO / BEAI / T-cell functions into that body.
```

No live OpenClaw file was changed in this pass.

## 1. Source Inventory

Authenticated GitHub inspection identified these nbeai repositories as the active source library.

| Repository | Local reference | Role for GPAO-T | Must-read files | Absorption candidates | Gaps / risks |
| --- | --- | --- | --- | --- | --- |
| local `gpao-t` | `gpao-t` | GPAO-T body and current product doctrine. | `README.md`, `docs/00-canon/GPAO-T-OPENCLAW-ABSORPTION-CONSTITUTION-v0.1-ko.md`, `src/core/admission.js`, `src/core/context-runtime.js`, `src/core/turn-kernel.js`, `src/core/workspace-shell.js`, `src/core/session-continuity.js` | Current OS doctrine, local control surface, admission/context/runtime/session/growth loop. | Dirty local state and no confirmed remote in this pass; high conceptual authority but not a sealed source baseline. |
| `nbeai/gpao-for-openclaw` | `gpao-t-references/nbeai-source-library/gpao-for-openclaw` | Integrated GPAO package for OpenClaw, including BEAI Runtime, Context Mesh, Knowledge Loop, verification, release evidence. | `README.md`, `README-FIRST.md`, `GPAO-FOR-OPENCLAW-PACKAGE-MANIFEST.md`, `plugin/beai-runtime/README.md`, `plugin/beai-runtime/src/runtime-core.ts`, `plugin/beai-runtime/src/index.ts`, `plugin/beai-runtime/test/turn-start-continuity.test.mjs`, `capability-pack/docs/BEAI-PACKAGE-MODULE-MAP-v0.1-ko.md`, `capability-pack/tools/gpao-openclaw-proof-ladder.mjs`, `capability-pack/tools/gpao-openclaw-tcell-live-reinforcement.mjs` | Runtime judgment, Context Mesh hard-gating, Knowledge Loop, proof ladder, felt replay, adapter matrix, T-cell live reinforcement. | Built as package/plugin surface; must be decomposed into internal OpenClaw runtime organs before GPAO-T final architecture. License/public-use boundary must be rechecked before publication. |
| `nbeai/beai-package-for-openclaw` | `gpao-t-references/nbeai-source-library/beai-package-for-openclaw` | Legacy / substrate BEAI capability package for OpenClaw. | `README.md`, `README-FIRST.md`, `capability-pack/capability-pack.json`, `capability-pack/config/beai-trust-gate-statuses.json`, `capability-pack/config/beai-action-semantics-contract.json`, `capability-pack/config/beai-control-center-contract.json`, `capability-pack/docs/BEAI-CONTROL-CENTER-v0.1-ko.md`, `capability-pack/docs/BEAI-KNOWLEDGE-LOOP-v0.1-ko.md`, `capability-pack/docs/BEAI-TRUST-GATE-v0.1-ko.md`, `capability-pack/tools/beai-package-verify.mjs` | Control Center state language, trust gate, action semantics, review-first Knowledge Loop, conversation flow review, package truth checks. | Some docs describe “package mounted on OpenClaw”; GPAO-T must reinterpret them as internal modules. License/public-use boundary must be rechecked before publication. |
| `nbeai/beai-harness-for-codex` | `beai-harness-for-codex` | Codex-native GPAO / BEAI development harness, Context Mesh, T-cell docs, replay, recovery, release gates. | `docs/00-canon/T-CELL-CANON-v0.2-ko.md`, `docs/03-product-plan/T-CELL-CALCULUS-CORE-v1.0-ko.md`, `docs/03-product-plan/GPAO-PRODUCT-SPEC-ko.md`, `docs/05-implementation/GPAO-CONTEXT-GOVERNANCE-PROTOCOL-ko.md` | Context Mesh turn-start retrieval, admission gate, answer-anchor/supporting-context separation, replay-safe growth, quality audit. | Codex-specific behavior must be generalized before embedding into OpenClaw runtime. |
| `nbeai/beai-knowledge-loop-for-codex-dist` | `gpao-t-references/nbeai-source-library/beai-knowledge-loop-for-codex-dist` | Distribution/reference for review-first Knowledge Loop. | `README.md`, `VERIFY.md`, `README-TEAM-INSTALL-ko.md` | Candidate capture, review queue, source-grounded work memory. | Distribution package is not enough; GPAO-T needs first-class internal memory lifecycle. |
| `nbeai/Awesome-Codex-Plugins` | `gpao-t-references/nbeai-source-library/Awesome-Codex-Plugins` | Reference atlas for Codex plugin / MCP / skill ecosystem. | `README.md` and catalog entries as needed. | External ecosystem comparison and plugin capability patterns. | Reference only; not GPAO-T authority source. |
| `nbeai/nbeai` | GitHub URL only | Public profile and orientation. | `README.md` if needed. | Product positioning signal. | Not an engineering source. |
| local `beai-capability-pack` | `beai-capability-pack` | Early / local capability-pack source line. | `capability-pack.json`, `PRINCIPLES.md`, `routing.md`, `skills/*`, verification ledgers if present. | Skill, development steward, release verifier, package principles. | Lower authority than current nbeai GitHub sources; use only when not contradicted by newer repos. |
| pure OpenClaw source | `openclaw-clean-lab/github-openclaw-source` | The anatomy object and body baseline for GPAO-T absorption. | `openclaw.mjs`, `src/entry.ts`, `src/gateway/*`, `src/context-engine/*`, `src/agents/embedded-agent-runner/*`, `packages/agent-core/src/*`, `ui/src/pages/chat/*`, `extensions/workboard/*`. | Runtime skeleton, gateway, context engine, agent loop, chat split, Workboard, approval/channel/plugin primitives. | Lab source is not the live OpenClaw state. Live comparison is required before mutation. |

Source authority summary:

1. Current user instruction and live correction.
2. Current live OpenClaw state.
3. Pure OpenClaw source lab.
4. `gpao-t`, `beai-harness-for-codex`.
5. `gpao-for-openclaw`, `beai-package-for-openclaw`.
6. Knowledge Loop dist and ecosystem references.
7. Older local capability pack only when not contradicted.

Retired source:

- `gpao-t-hardware-engine` is out of scope for the current GPAO-T/OpenClaw absorption project. It must not be treated as active source truth, a required dependency, or a completion gate unless 윤 explicitly reopens it.

Deprecated source:

- Hidden previous-work result storage is not an active truth source.
- It must not override current user instruction, live OpenClaw state, pure OpenClaw source, nbeai source library, T-cell canon, or Context Mesh retrieval.
- It was not physically deleted in this pass because deletion of unknown user work is a separate authority boundary.

## 2. OpenClaw Circuit To GPAO-T Absorption Map

| OpenClaw organ | Keep | Weakness to fix | GPAO-T absorption | Direction | First verification |
| --- | --- | --- | --- | --- | --- |
| Launcher / entry | Thin `openclaw.mjs -> src/entry.ts` path, command split. | No GPAO-T task admission at entry. | Runtime boot mode, active target initialization. | Preserve and add admission after dispatch. | `--help`, gateway, agent fast-path regression. |
| CLI routing | Gateway-first and embedded fallback paths. | Fallback is execution convenience, not explicit recovery policy. | BEAI route / plan / verify / closeout and visible recovery semantics. | Preserve shell, replace fallback judgment. | Gateway failure and embedded fallback tests. |
| Gateway | RPC registry, WebSocket/event stream, chat/session/tool/config/plugin surface. | Operator surface is broad; side-effect classes are not GPAO-T typed. | Authority Ledger, scoped operation token, purpose-bound method admission. | Preserve as body, add strong authority layer. | Method matrix: read/write/send/spend/deploy/credential/public. |
| Control plane / ACP | Active turns, queue, runtime handles, event ledger, permission relay. | Turn is not yet Task Packet / T-cell Operation. | Task Packet, T-cell Admission, runtime assertion, replayable event ledger. | Core absorption target. | Turn replay, cancel, failover, permission relay tests. |
| Agent runner | Run / attempt / lane / lifecycle / abort / model / tool / prompt boundary. | Attempt lacks Context Mesh, active-target, invalid-condition, authority gate. | T-cell admission before attempt and trace after attempt. | Preserve skeleton, wrap attempt boundary. | Admission accept/reject/retry tests. |
| Agent-core loop | Streaming, tool calls, tool results, lifecycle event loop. | Loop state does not know why the task exists, what authority it has, or what was learned. | Task Packet state, authority boundary, replay trace, growth closeout. | Strongly preserve, extend typed state. | Tool-cycle, abort, error, replay snapshot tests. |
| Context engine | Assemble / bootstrap / ingest / maintain / compact / afterTurn contract. | Memory-as-retrieval and prompt supplement. | Context Mesh retrieval-before-prompt, provenance, omitted premise recovery, context admission. | Preserve interface, replace meaning. | Mesh resolve before assemble; compaction trace preservation. |
| Session / transcript | File-backed sessions, JSONL, session key, run state. | Session is chat-centric, not work-centric. | Conversation + Task Packet + Authority + Trace + Growth state. | Preserve storage, extend ontology. | Session migration / branch / compact successor tests. |
| Memory | Search, plugin memory state, fast context path. | Retrieval is not self-growth. | Knowledge Loop, review-first memory, growth proposal, durable promotion gate. | Demote retrieval to subfunction; promote Knowledge Loop as internal organ. | Candidate -> review -> promote/reject replay. |
| Tool / approval / sandbox | Tool policy, sandbox guard, approval UI. | Tool-name policy is too coarse for real authority. | Side-effect taxonomy, operation token, approval reason ledger. | Preserve hook, make Authority Ledger owner. | Approval matrix across read/write/send/deploy/credential. |
| Plugin / package | Manifest-first capability registration. | In-process plugin trust is too broad for final kernel. | Capability admission, plugin capability ledger, revocation path. | Use as migration path, internalize final kernel. | Manifest capability and hook authority trace tests. |
| Channels | Telegram / channel owner patterns and allowlists. | Identity, channel, and operator authority need separation. | Human identity, channel identity, conversation scope, default tool-deny. | Preserve adapter, add GPAO-T identity map. | DM/group/tool-deny/approval routing tests. |
| UI shell | Lit/Vite app shell, route/navigation, gateway store. | OpenClaw schema and single-assistant feel dominate. | GPAO-T Control Center, `GpaoControlClient`, `GpaoAppContext`. | Preserve shell, wrap client/context, then replace gradually. | Route/store/reconnect UI tests. |
| Chat UI | Split panes, pane IDs, queued send, retry, attachments, abort/run status, composer state. | `ChatPane` is large and not yet WorkPane/TaskPacket/Authority/Trace aware. | Multi-conversation Work OS, active target strip, progress lane, right inspector. | Preserve split/composer; replace pane state machine. | Split layout, run lifecycle, responsive visual QA. |
| Workboard | Status, attempts, proof, artifacts, diagnostics, complete/block model. | Engine-specific and board/card-bound. | T-cell Operation Card, proof-required done, blocker authority, replay link. | High-priority absorption. | Proof/block/complete/dispatch/replay tests. |

## 3. GPAO / BEAI / T-cell Absorption Elements

The source libraries converge on seven internal GPAO-T kernel organs.

| Kernel organ | Source evidence | OpenClaw landing zone | Must preserve | Must reject |
| --- | --- | --- | --- | --- |
| Context Mesh Admission | `beai-harness-for-codex`, Context Mesh turn-start evidence, T-cell Calculus Core. | `src/context-engine/*`, prompt assembly, agent attempt boundary. | Retrieved context must be admitted before influencing answer. | Raw retrieval directly becoming answer authority. |
| Task Packet | T-cell Canon / Calculus Core, GPAO-T docs. | ACP control plane, agent runner, chat pane state. | User request, active target, authority boundary, acceptance criteria, trace. | Treating a chat message as the whole task. |
| Authority Ledger | BEAI trust gate, OpenClaw approval hooks, GPAO-T approval/audit records. | Gateway methods, tool hooks, channel adapters, UI inspector. | Side-effect class, approval state, scope, reason, replay. | Broad “approved” or tool-name-only permission. |
| Knowledge Loop | BEAI Knowledge Loop docs and dist package. | Memory engine, afterTurn, session closeout, right inspector. | Auto-capture, not auto-approve. Candidate/review/approved separation. | Durable memory promotion without review. |
| Replay / Verification | BEAI Harness, proof ladder, felt replay, package truth check, T-cell replay doctrine. | Run lifecycle, Workboard, closeout, test harness. | Done claims require evidence. | Completion language without proof. |
| Growth Proposal | GPAO self-upgrade candidates, T-cell SelfDevelop, growth proposals. | AfterTurn, Knowledge Loop, runtime closeout. | Failure -> proposal -> replay -> approval -> mutation. | Failure directly mutating behavior. |
| Human-Centered OS Surface | Codex-like work rhythm, OpenClaw Dashboard, BEAI Control Center. | Chat UI, session rail, inspector, composer, progress lane. | User can see goal, progress, source, authority, next action. | Hidden agent work with only final answer visible. |

T-cell application rule:

```text
Extract broadly.
Admit narrowly.
Trace always.
Replay before hardening.
```

For GPAO-T this means:

- OpenClaw memory becomes candidate evidence, not action authority.
- Session history becomes source material, not the active target.
- A T-cell is not a note; it is a bounded operating-principle object with trace, authority, state change, replay, invalid conditions, and compression safety.
- Self-growth is not automatic mutation. It is authority-bounded structural correction after replay.

## 4. Gateway Dashboard To GPAO-T Control Center

The live OpenClaw Gateway Dashboard is the visible body for the first user environment pass.

The target is:

```text
OpenClaw chat dashboard
-> GPAO-T Control Center
-> Codex-like multi-conversation Work OS
```

### 4.1 Structure

| Surface | Direction |
| --- | --- |
| Left rail | Keep OpenClaw rail; expand from `New session / Main Session` to workspace, pinned sessions, running sessions, blocked sessions, recent sessions. |
| Central plane | Use existing split chat primitives, but interpret each pane as `GpaoWorkPane`, not only `ChatPane`. |
| Top strip | Add active target, runtime/model status, Context Mesh state, authority state, running/finalizing/blocked. |
| Bottom composer | Preserve composer position and shortcuts, but bind clearly to active pane/session/task packet. |
| Right inspector | Add Context / Authority / Progress / Sources / Trace tabs. Keep it operational, not decorative. |
| Drawers / sheets | Use for approval, trace expansion, settings, artifact preview. Avoid nested card dashboards. |

### 4.2 Minimal Data Model

```ts
type GpaoWorkspace = {
  id: string;
  name: string;
  sessions: GpaoSessionRef[];
  activePaneId: string;
  layout: unknown;
};

type GpaoWorkPane = {
  id: string;
  sessionId: string;
  taskPacketId?: string;
  activeTarget: string;
  status: "idle" | "shaping" | "retrieving-context" | "running" | "waiting-approval" | "tool-running" | "blocked" | "finalizing" | "done";
  progressLane: GpaoProgressEvent[];
  authorityState: GpaoAuthorityState;
  contextState: GpaoContextState;
  latencyState: GpaoLatencyState;
  inspectorTab: "context" | "authority" | "progress" | "sources" | "trace";
};

type GpaoTaskPacket = {
  id: string;
  userRequest: string;
  activeTarget: string;
  acceptanceCriteria: string[];
  authorityBoundary: string[];
  contextSources: string[];
  replayTraceId?: string;
  closeoutState: "draft" | "evidence-backed" | "blocked" | "review";
};

type GpaoAuthorityState = {
  sideEffectClass: "read" | "write" | "send" | "spend" | "deploy" | "credential" | "identity" | "public";
  approvalRequired: boolean;
  approvedScopes: string[];
  blockedReason?: string;
};
```

### 4.3 First Implementation Slice

Do this in a lab/fork before live OpenClaw mutation:

1. Confirm `chat.send -> gateway -> agent run -> provider/tool loop -> transcript` call path.
2. Split `ChatPane` ownership into `ChatPane` rendering and `GpaoWorkPane` read model.
3. Add `GpaoControlClient` over `GatewayBrowserClient.request(method, params)`.
4. Add `GpaoAppContext` with workspace, pane, task packet, authority, context, progress state.
5. Add only three visible affordances first:
   - active target strip
   - compact progress lane
   - right inspector with Context / Authority / Progress
6. Keep OpenClaw shell, rail, composer, model controls, reconnect, abort, queued send behavior.
7. Run desktop/mobile screenshot QA before any live mutation.

### 4.4 Chat Condition Requirements

Every active pane must show:

- current goal
- current status
- authority boundary
- context source
- latency / waiting reason
- final answer versus draft versus blocked closeout

Telegram-style transient progress is a reference, not the final UI. GPAO-T should show dashboard-native progress lanes and inspectable trace.

## 5. Step 5 Discussion Target

The next phase is not “change live OpenClaw now.” The next phase should be discussed with the user as a controlled live absorption plan.

Recommended Step 5 choices:

1. **Lab patch first**: implement the first UI slice in the pure OpenClaw lab copy or a dedicated GPAO-T OpenClaw fork.
2. **Shadow adapter first**: read live OpenClaw state and render GPAO-T WorkPane state beside it without writing live files.
3. **Direct live patch with rollback**: patch live OpenClaw UI only after exact file list, backup path, rollback command, and visual QA plan are approved.

Recommended default:

```text
Lab patch first -> visual QA -> live diff review -> explicit live apply
```

This keeps the Ferrari rule intact: understand, map, modify in lab, verify, then touch the live body.

## 6. Evidence Checked

- Context Mesh turn-start retrieval returned `BEAI Context Mesh Saved`.
- nbeai repositories were listed through authenticated GitHub API.
- `gpao-for-openclaw`, `beai-package-for-openclaw`, `beai-knowledge-loop-for-codex-dist`, and `Awesome-Codex-Plugins` were cloned into `gpao-t-references/nbeai-source-library`.
- Pure OpenClaw source anatomy document was reread.
- OpenClaw chat UI files inspected:
  - `ui/src/pages/chat/chat-page.ts`
  - `ui/src/pages/chat/chat-pane.ts`
  - `ui/src/pages/chat/chat-state.ts`
  - `ui/src/pages/chat/components/chat-composer.ts`
- T-cell Canon and Calculus Core were reread for admission / trace / replay boundaries.

No live OpenClaw mutation, Gateway restart, Telegram send, durable memory promotion, GitHub push, or public deployment was performed.
