# GPAO-T Comparative UX / Operating Principle Matrix v0.1

Status: first research-first matrix  
Date: 2026-07-10  
Audience: 윤, Codex, future GPAO-T research/architecture/implementation agents  
Decision supported: GPAO-T first real OS flow before further third-party OpenClaw compatibility/migration narrowing
OpenClaw reference class: third-party comparison, compatibility, and migration only.

GPAO-T is an independent, local-first Growth Personal AI Operating System.

## 1. 연구 질문

이 문서는 다음 질문에 답하기 위한 1차 매트릭스다.

> OpenClaw, Codex, Claude Code, local AI tools, agent runtime, memory OS, multi-agent framework가 각각 잘하는 일을 비교한 뒤, GPAO-T가 사용자의 입장에서 어떤 운영체제 흐름을 가져야 하는가?

이 비교의 목적은 경쟁 제품을 복제하는 것이 아니다.

목적은 각 도구의 작동 원리, UI/UX 체감, 권한 구조, 기억/맥락 처리, 실행 안정성, 성장 가능성을 분해해 GPAO-T만의 OS 원리로 다시 조립하는 것이다.

## 2. 근거 등급

근거는 세 등급으로 나눈다.

- `official`: 공식 문서, 공식 README, 공식 repo
- `local-evidence`: 윤의 로컬 PC / GPAO-T / third-party OpenClaw compatibility/migration 작업 증거
- `inference`: 위 근거에서 도출한 GPAO-T 설계 판단

이 문서는 현재 시점의 연구 매트릭스다. 실제 사용자 체감, 성능, 보안, 안정성은 이후 replay / live smoke / screenshot / human scenario evidence로 다시 검증해야 한다.

## 3. Source Registry

| Source | Evidence type | What it supports | Limitation |
| --- | --- | --- | --- |
| OpenAI Codex docs, `learn.chatgpt.com/docs` | official | Codex surfaces, plugins, skills, MCP, shell, computer use, projects/tasks, permissions, sandboxing, agent configuration | 공식 docs navigation/overview 중심. 실제 Codex Desktop 체감은 로컬 사용 증거와 별도 비교 필요 |
| Anthropic Claude Code overview | official | Claude Code가 codebase read/edit/command/tool integration을 수행하는 agentic coding tool이며 terminal/IDE/desktop/browser 표면을 가진다는 점 | Claude 실제 성능/체감은 계정/환경/모델 상태에 따라 달라짐 |
| Anthropic Claude Code settings/hooks docs | official | settings, permissions, MCP, memory files, skills, hooks, lifecycle event control | 강력하지만 일반 사용자에게는 복잡할 수 있음 |
| OpenHands README / docs | official | self-hosted developer control center, local/remote/cloud backends, automations, ACP-compatible agents, sandbox warning | 개발자/팀 운영 중심. 개인 OS UX는 별도 설계 필요 |
| Open Interpreter README | official | terminal coding agent, local config/session state, model/provider/harness switching, sandbox/approvals, computer use | 현재 README는 Rust rewrite 중심이며 원래 Python 프로젝트와 분리됨 |
| Khoj README | official | AI second brain, self-hostable personal AI, local/online LLM, docs/internet/chat/agents/notifications | 지식/검색/개인 AI 중심. OS 권한/성장 커널은 별도 필요 |
| Letta README | official | advanced memory, local terminal agent, desktop/channels, stateful agents, skills/subagents, continual learning | active development moved to newer repo; memory claims require separate replay verification |
| CrewAI README | official | Crews/Flows, role-based collaboration and event-driven workflow control, observability/governance in enterprise suite | framework/developer surface; non-developer OS UX는 직접 제공하지 않음 |
| LangGraph README | official | durable execution, human-in-the-loop, memory, debugging/observability for long-running stateful agents | low-level orchestration framework; product UX는 사용자가 만들어야 함 |
| AutoGPT README | official | build/deploy/run continuous agents, frontend builder, workflow management, deployment controls, monitoring | self-hosting is technical; platform/automation focus가 강함 |
| GPAO-T Research-First OS Strategy | local-evidence | GPAO-T is independent and is not an MVP or weak third-party OpenClaw compatibility patch | 내부 기준 문서. 외부 검증은 아님 |
| Third-party OpenClaw Stage 1 Compatibility Inventory | local-evidence | compatibility Gateway state, Codex app-server attachment, search configuration, and continuity verification boundary | live behavior consumption requires separate evidence |
| GPAO-T Production Distribution Evidence | local-evidence | current GPAO-T production package, readback, and verification surfaces | local production evidence does not imply public deployment |

## 4. Product Family Matrix

| Family | Strongest operating principle | User-felt strength | User-felt weakness | GPAO-T absorption | GPAO-T rejection |
| --- | --- | --- | --- | --- | --- |
| Codex | Work rhythm around repo, files, plan, edits, tests, approvals, terminal, skills/plugins | “AI가 실제 개발자로 같이 일한다”는 감각 | 개발 표면이 강해서 일반 사용자는 내부 절차를 어렵게 느낄 수 있음 | thread/task rhythm, workspace awareness, verification-first closeout, skill/plugin extensibility | 개발자 UX를 그대로 일반 OS UX로 복사 |
| Claude Code | codebase-aware agentic coding across terminal/IDE/desktop/browser, settings/hooks/permissions | 대화-작업-도구 사용 흐름이 자연스럽고 빠름 | 설정, hooks, permissions가 강력한 만큼 복잡함 | lifecycle hooks, permission/event model, multi-surface continuity | hook 자동화를 사용자 몰래 live mutation으로 사용 |
| OpenClaw | third-party local PC gateway and plugin/tool/channel runtime | 내 PC에서 작동하는 로컬 실행 인프라 감각 | 현재 GPAO-T 의도/맥락/사용자 체감 이해가 부족하면 방향이 꼬임 | comparison-derived gateway/service patterns, local state, tool bus, channel integration | third-party OpenClaw 개선 자체를 GPAO-T로 착각 |
| OpenHands | self-hosted developer control center for agents and automations | 여러 coding agent/backends를 한 컨트롤센터에서 다루는 느낌 | 개발자/팀 운영 중심, sandbox/infra 이해 필요 | agent backend switching, local/remote/cloud separation, automation scheduling boundary | always-on automation을 개인 OS 성장과 혼동 |
| Open Interpreter | terminal-first local agent, model/harness/provider switching, computer use QA | 로컬 PC를 AI가 직접 조작/검사할 수 있다는 체감 | 강력한 실행 능력이 곧 보안/권한 불안을 만든다 | local computer-use layer, model harness switching, local session/config | command execution을 기본값으로 열어두기 |
| Khoj | self-hostable AI second brain over docs/web/local/online LLMs | 내 문서와 웹을 아는 개인 지식 비서 | 지식 검색이 OS 판단/승인/성장까지 자동으로 이어지지는 않음 | Memory Wiki / personal knowledge surface / local-first knowledge access | 검색 결과를 현재 의도보다 우선 |
| Letta | stateful agents with advanced memory and continual learning | 장기 기억을 가진 agent가 쌓이는 느낌 | 기억이 강할수록 잘못 저장/잘못 재사용 위험도 커짐 | memory state model, skills/subagents, continual-learning idea | replay 없는 memory promotion |
| LangGraph | durable execution, human-in-the-loop, memory, stateful graph orchestration | 긴 작업이 끊기지 않고 재개되는 구조감 | 프레임워크라서 사용자-facing OS 경험은 직접 설계해야 함 | durable execution, checkpoint/replay, human interrupt point | 그래프 구조를 제품 UX로 노출 |
| CrewAI | role-based crews + controlled flows | 여러 역할이 나뉘어 일하는 조직감 | 역할이 많으면 사용자에게 과잉 절차처럼 보일 수 있음 | multi-agent research/dev/QA/security/UX roles | 역할 놀이가 실제 품질 증거를 대체 |
| AutoGPT | continuous agents, builder/workflow/deployment controls | “설정하면 계속 일하는 agent” 기대 | self-hosting/automation/deploy가 기술적으로 무겁고 위험 경계가 큼 | workflow builder, monitoring, deployment-control concept | continuous execution을 승인 없이 열기 |

## 5. Cross-Cutting UX Lessons

### Lesson 1. 사용자는 기능보다 “흐름을 놓치지 않는 느낌”을 먼저 평가한다

Codex와 Claude Code의 강점은 단순히 파일을 고치는 능력이 아니다. 사용자가 말한 목표를 작업 단위로 잡고, 파일을 보고, 계획하고, 수정하고, 확인하고, 보고하는 리듬이 있다.

GPAO-T 원리:

```text
Every request becomes a visible work state:
understood intent -> context route -> safe next action -> execution/preview -> verification -> growth candidate.
```

### Lesson 2. 로컬 실행 능력은 중요하지만, 사용자 의도 복원이 없으면 위험하다

제3자 비교 제품인 OpenClaw, Open Interpreter, OpenHands는 local tool/runtime 관점에서 강하다. 하지만 사용자가 원하는 것은 “도구가 실행됨”이 아니라 “내 의도대로 안전하게 진행됨”이다.

GPAO-T 원리:

```text
Tool power is admitted only after intent, context, authority, expected effect, and rollback are visible.
```

### Lesson 3. 기억은 자산이면서 공격면이다

Khoj와 Letta 계열은 개인 지식과 장기 기억의 가치를 보여준다. 하지만 GPAO-T에서는 기억 저장 자체가 성장이나 지능이 아니다.

GPAO-T 원리:

```text
Memory must pass Context Mesh selection and T-cell admission before it can influence the current turn.
Growth requires replay-proven effect, not storage.
```

### Lesson 4. 자동화는 “편리함”과 “불안”을 동시에 만든다

AutoGPT, OpenHands automations, CrewAI flows는 반복 작업 자동화의 가능성을 보여준다. 동시에 외부 발송, 배포, 계정, 비용, 삭제, 스케줄 실행은 사용자의 통제감을 흔들 수 있다.

GPAO-T 원리:

```text
Internal preparation auto-continues.
External effect waits at a precise authority boundary.
```

### Lesson 5. framework-level power는 user-level comfort로 번역되어야 한다

LangGraph, CrewAI, AutoGen류는 개발자에게 강력한 추상화를 준다. 그러나 일반 사용자에게 중요한 것은 graph, crew, agent, hook 용어가 아니라 “지금 무엇이 안전하게 준비됐고, 무엇을 승인해야 하는가”다.

GPAO-T 원리:

```text
Expose state language, not framework jargon.
Expose control, not configuration burden.
```

## 6. GPAO-T OS Pillars Derived From The Matrix

### Pillar 1. Work Surface

한 화면에서 사용자의 말, GPAO-T의 이해, 현재 작업 상태, 다음 안전 행동이 보여야 한다.

흡수:
- Codex task/thread rhythm
- Claude Code plan/diff/session rhythm
- OpenHands control-center idea

GPAO-T화:
- 개발자 도구가 아니라 일반 사용자의 AI-native work desk
- Simple View 기본, 깊은 정보는 필요할 때만 펼침

### Pillar 2. Context / Memory Kernel

기억은 전부 불러오는 것이 아니라 현재 요청에 맞게 선별되어야 한다.

흡수:
- Khoj personal knowledge
- Letta stateful memory
- LangGraph short/long memory distinction

GPAO-T화:
- Memory Wiki는 지식 저장소
- Context Mesh는 현재 요청 선택 엔진
- T-cell Admission은 작동 원리 적용 게이트

### Pillar 3. Authority Center

사용자는 실행 전에 “무엇이 어디까지 작동할지” 알아야 한다.

흡수:
- Codex approvals/sandboxing
- Claude Code permissions/hooks
- Open Interpreter sandbox/approvals
- OpenHands backend/sandbox warning

GPAO-T화:
- `읽기 전용`
- `미리보기만`
- `저장 전 확인`
- `외부 전송 전 확인`
- `되돌리기 어려움`
- `비용 발생 가능`

### Pillar 4. Model / Tool Router

모든 요청에 같은 속도와 깊이를 쓰면 체감이 나빠진다.

흡수:
- Codex/Codex-like model/tool routing
- Open Interpreter harness/provider switching
- Letta/Khoj model-agnostic posture

GPAO-T화:
- fast path: 의도 분류, 짧은 답, 상태 확인
- deep path: 연구, 설계, 긴 문맥, 검증
- private/local path: 민감한 문서/개인 지식
- judge path: replay, QA, self-growth 검증

### Pillar 5. Replay / Growth Loop

자가성장은 기능 추가가 아니라 반복 경험에서 검증된 operating principle을 얻는 것이다.

흡수:
- LangGraph durability/checkpointing
- AutoGPT benchmark/evaluation impulse
- BEAI/GPAO replay discipline

GPAO-T화:
- 실패나 성공을 observation으로 남김
- 반복 패턴을 뽑음
- T-cell candidate로 구조화
- replay로 효과 확인
- approval gate 후에만 live behavior로 승격

### Pillar 6. Owned Runtime / Execution Infrastructure

GPAO-T는 실제 로컬 PC에서 작동해야 한다.

흡수:
- third-party OpenClaw gateway/service/plugin/channel patterns as comparison and compatibility references
- OpenHands local/remote/cloud backend separation
- Open Interpreter local session/config/computer-use layer

GPAO-T화:
- GPAO-T owns the active local runtime and execution infrastructure
- third-party OpenClaw compatibility runtime is a migration-only reference, not the product
- compatibility replacement 전에는 prompt-path packet, controlled smoke, rollback evidence 필요

## 7. First Real GPAO-T OS Flow Draft

이 매트릭스에서 도출되는 첫 OS 흐름은 다음이다.

```text
1. User says a normal request.
2. GPAO-T shows "I understood this as..." in plain Korean.
3. GPAO-T selects current context, not the largest memory.
4. GPAO-T shows the current authority level before action.
5. GPAO-T prepares internally without asking unnecessary questions.
6. GPAO-T routes the task to fast/deep/local/judge/model/tool paths.
7. GPAO-T produces preview, result, or execution proposal.
8. GPAO-T verifies the outcome.
9. GPAO-T records what was learned as a growth candidate, not a hidden rule.
10. GPAO-T proposes a replay-tested improvement only when evidence exists.
```

사용자 체감 문장:

```text
GPAO-T는 내가 말한 일을 놓치지 않고,
내 PC와 도구를 안전하게 다루며,
위험한 일은 정확히 묻고,
반복 경험에서 스스로 좋아질 후보를 만든다.
```

## 8. What This Means For Pass 010

Pass 010은 더 이상 단순한 prompt footprint narrowing이 아니다.

Pass 010의 재정의:

```text
GPAO-T live/system/workspace prompt footprint narrowing must reduce runtime noise while preserving:
- current user intent
- visible authority boundary
- admitted Context Mesh packet
- T-cell operating principle
- model/tool route basis
- replay/growth trace
- non-developer state language
```

줄여야 할 것:
- 거대한 도구/스킬 카탈로그
- 오래된 프로젝트 맥락 raw dump
- developer-only configuration noise
- third-party OpenClaw product identity leakage
- 실행과 승인 경계가 섞인 문구

남겨야 할 것:
- 지금 사용자의 말
- 현재 endpoint center
- 선택된 context
- 차단된 stale anchor
- 다음 안전 행동
- 권한 경계
- 실패 시 복구 기준

## 9. Next Research Pass

다음 research pass는 이 문서를 확장해 다음 표를 만든다.

```text
Tool / product
-> actual operating loop
-> UI surface
-> permission model
-> memory/context model
-> automation model
-> failure/recovery model
-> user-felt strength
-> user-felt pain
-> GPAO-T absorption rule
-> GPAO-T rejection rule
-> implementation candidate
-> verification scenario
```

우선순위:

1. Codex / Claude Code / third-party OpenClaw comparison UX anatomy
2. OpenHands / Open Interpreter / AutoGPT local-runtime anatomy
3. Khoj / Letta / MemoryOS memory-context anatomy
4. LangGraph / CrewAI / AutoGen orchestration anatomy
5. GPAO-T first real OS flow spec v0.1

## 10. Current Conclusion

GPAO-T의 첫 제품 방향은 다음으로 수렴한다.

```text
GPAO-T is an independent, local-first Growth Personal AI Operating System that owns its runtime, state, policy, and user surface while learning from:
- Codex-like work rhythm
- Claude-Code-like agentic task continuity
- third-party comparison-derived local runtime patterns from OpenClaw/OpenHands/OpenInterpreter
- Khoj/Letta-like personal memory and statefulness
- LangGraph/CrewAI-like controlled orchestration
- GPAO/T-cell-owned context admission, authority, replay, and self-growth.
```

중요한 차별점:

```text
GPAO-T does not become smarter by remembering more.
GPAO-T becomes smarter when repeated experience becomes replay-tested operating principle.
```
