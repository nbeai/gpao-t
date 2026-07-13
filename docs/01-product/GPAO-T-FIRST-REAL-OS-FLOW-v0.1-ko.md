# GPAO-T First Real OS Flow v0.1

Status: active product-flow contract  
Date: 2026-07-10  
Owner: 윤  
Scope: first user-perceived GPAO-T operating-system flow before Pass 010 or broader runtime mutation

## 1. 목적

이 문서는 GPAO-T의 첫 진짜 OS 흐름을 정의한다.

목표는 앱 기능 목록을 만드는 것이 아니다. 목표는 사용자가 GPAO-T를 열고, 평범한 말로 요청하고, GPAO-T가 의도와 문맥을 잡고, 권한을 보여주고, 필요한 준비를 진행하고, 결과를 확인하고, 실패와 반복 경험에서 성장 후보를 만드는 전체 흐름을 고정하는 것이다.

이 문서는 다음 문서 위에 놓인다.

- `GPAO-T-RESEARCH-FIRST-OS-STRATEGY-v0.1-ko.md`
- `GPAO-T-COMPARATIVE-UX-OPERATING-PRINCIPLE-MATRIX-v0.1-ko.md`
- `GPAO-T-SELF-GROWTH-LOOP-CONTRACT-v0.1-ko.md`

이 문서는 다음 작업보다 앞선다.

- Pass 010 prompt footprint narrowing
- live OpenClaw prompt-path mutation
- broad runtime substrate optimization outside live OpenClaw
- UI redesign
- connector expansion
- automation activation

## 2. 첫 OS 흐름의 핵심 장면

GPAO-T의 첫 제품 경험은 다음 장면이다.

```text
사용자가 평범한 말로 요청한다.
GPAO-T가 "내가 이렇게 이해했다"를 보여준다.
GPAO-T가 현재 요청에 맞는 문맥만 고른다.
GPAO-T가 권한과 위험을 짧게 보여준다.
GPAO-T가 안전한 내부 준비는 알아서 한다.
GPAO-T가 결과, 미리보기, 또는 실행 제안을 만든다.
GPAO-T가 검증하고 실패하면 복구한다.
GPAO-T가 배운 점을 숨은 규칙이 아니라 성장 후보로 남긴다.
```

사용자가 느껴야 하는 문장:

```text
내가 개발자가 아니어도 GPAO-T가 흐름을 잡아준다.
무엇이 실행됐고 무엇이 아직 실행되지 않았는지 보인다.
위험한 일은 정확히 멈추고 묻는다.
같은 실수는 다음에 줄어들 수 있다는 느낌이 든다.
```

## 3. 첫 화면의 역할

첫 화면은 대시보드가 아니라 `Work Surface`다.

첫 화면이 반드시 보여야 하는 것:

- 사용자의 현재 요청
- GPAO-T의 이해 요약
- 현재 작업 상태
- 선택된 문맥
- 차단된 오래된 맥락
- 권한 수준
- 다음 안전 행동
- 결과 또는 미리보기
- 검증 상태
- 성장 후보 여부

첫 화면이 기본적으로 숨겨야 하는 것:

- 전체 도구 카탈로그
- 전체 스킬 목록
- 원시 memory dump
- 내부 프롬프트
- 개발자용 설정
- 긴 로그
- 사용자가 승인하지 않은 실행 버튼

깊은 정보는 사라지는 것이 아니라 펼쳐볼 수 있어야 한다. 기본 화면은 일반 사용자가 첫눈에 이해할 수 있어야 한다.

## 4. 상태 언어

GPAO-T는 내부 기술 상태를 사용자 언어로 바꿔야 한다.

| Internal state | User-visible Korean |
| --- | --- |
| intent restored | 이렇게 이해했어요 |
| context selected | 이 문맥을 참고했어요 |
| stale context blocked | 오래된 맥락은 제외했어요 |
| authority read-only | 읽기만 했어요 |
| local preview | 아직 실행하지 않고 미리보기만 만들었어요 |
| approval required | 여기부터는 확인이 필요해요 |
| executing local safe action | 로컬에서 안전하게 준비 중이에요 |
| verification passed | 확인이 끝났어요 |
| verification failed | 확인 중 문제가 있어 복구가 필요해요 |
| growth candidate created | 다음에 더 잘하기 위한 후보를 남겼어요 |
| growth blocked | 아직 자동으로 바꾸면 안 돼요 |

금지되는 상태 언어:

- `agent graph node failed`
- `tool call blocked by policy`
- `memory vector candidate accepted`
- `runtime mutation pending`
- `MCP admission state changed`

이런 표현은 개발자에게만 필요한 세부 언어다. 사용자에게는 의미, 위험, 다음 행동으로 번역해야 한다.

## 5. 첫 요청 흐름

### Step 1. User Request

사용자는 평범하게 말한다.

예:

```text
지금 작업중인 GPAO-T 방향을 정리하고 다음 개발 흐름을 잡아줘.
```

GPAO-T는 처음부터 코드를 고치지 않는다. 먼저 요청을 작업 가능한 상태로 만든다.

### Step 2. Intent Restoration

GPAO-T가 보여줄 것:

```text
이 요청은 GPAO-T를 OpenClaw 개조가 아니라 연구 기반 퍼스널 AI OS로 정렬하고,
다음 개발 흐름을 정하는 작업으로 이해했어요.
```

내부 판단:

- active target: GPAO-T
- user role: owner / direction judge
- Codex role: researcher / architect / implementer / verifier
- risk: OpenClaw-only narrowing, MVP drift, stale context

### Step 3. Context Selection

GPAO-T는 모든 기억을 불러오지 않는다.

선택할 것:

- Research-First OS Strategy
- Comparative UX / Operating Principle Matrix
- OpenClaw context recovery failure evidence
- live OpenClaw and GPAO-T source/package evidence
- Self-Growth Loop Contract

차단할 것:

- 현재 요청과 무관한 과거 BEAI archive
- 오래된 package/release 문맥
- OpenClaw 개선 자체를 목표로 만드는 문맥
- 검증되지 않은 live replacement 주장

사용자에게 보일 표현:

```text
이번 작업에는 GPAO-T 연구 우선 전략, 비교 UX 매트릭스, OpenClaw 맥락 회복 실패 증거를 참고했어요.
과거 배포/패키지 문맥은 이번 요청의 중심이 아니라 제외했어요.
```

### Step 4. Authority Check

GPAO-T는 작업 전 권한을 분리한다.

이번 흐름에서 자동으로 가능한 것:

- 로컬 문서 읽기
- 로컬 문서 작성
- 로컬 테스트 / diff check
- 연구 정리
- 로컬 evidence 작성

사용자 승인 전 불가능한 것:

- live OpenClaw 변경
- Gateway restart
- Telegram/live turn 실행
- GitHub push
- 계정/secret 변경
- connector write
- 외부 전송
- durable memory promotion
- live GPAO rule mutation

사용자에게 보일 표현:

```text
지금은 로컬 문서와 검증까지만 진행해요.
라이브 OpenClaw 변경이나 외부 실행은 열지 않아요.
```

### Step 5. Routing

GPAO-T는 요청을 한 경로로만 보내지 않는다.

| Route | When used | First-flow behavior |
| --- | --- | --- |
| fast path | 상태 확인, 짧은 판단 | 즉시 요약 |
| deep path | 연구, 설계, 긴 문맥 | Context Mesh + 문서 근거 + 설계 산출물 |
| local path | 로컬 파일/상태 조사 | sandbox 안에서 read/write/test |
| judge path | 검증, replay, quality check | diff check, scenario check, evidence review |
| authority path | 위험 행동 후보 | 승인 전 정지 |
| growth path | 반복 실패/성공 학습 | 후보 생성, hidden apply 금지 |

첫 OS 흐름에서는 deep path, local path, judge path가 기본이다. authority path는 위험 경계에서만 열린다.

### Step 6. Preview / Execution Proposal

GPAO-T는 바로 실행하지 않고, 작업의 성격에 맞게 결과 형태를 만든다.

가능한 결과:

- answer: 단순 설명
- document: 방향/설계 문서
- local preview: 실행 전 미리보기
- execution proposal: 승인 필요한 실행 제안
- blocked decision: 지금 실행하면 안 되는 이유
- growth candidate: 다음 개선 후보

첫 OS 흐름의 기본 결과는 `document + verification + next safe action`이다.

### Step 7. Verification

문서 작업도 검증한다.

검증 기준:

- 문서가 실제로 생성되었는가
- README / master plan에 연결되었는가
- 기존 방향과 충돌하지 않는가
- live mutation을 열지 않았는가
- `diff --check`가 통과했는가
- 다음 작업이 구현으로 너무 빨리 좁아지지 않았는가

### Step 8. Growth Candidate

이번 흐름에서 남길 수 있는 성장 후보:

```text
반복 신호:
GPAO-T 작업이 OpenClaw patch / implementation-first / MVP framing으로 좁아질 위험이 반복된다.

후보 원리:
GPAO-T 관련 작업은 구현 전 Research-First OS Strategy와 Comparative UX Matrix를 먼저 확인해야 한다.

적용 상태:
review-only candidate.
live rule mutation forbidden until replay and approval.
```

성장 후보는 곧바로 live rule이 아니다. replay와 승인 게이트를 통과해야 한다.

## 6. First Real Flow State Model

첫 OS 흐름은 다음 상태 모델을 가진다.

```text
received
-> understood
-> context_selected
-> authority_checked
-> route_selected
-> prepared
-> preview_or_result_created
-> verified
-> growth_candidate_recorded
-> closed_with_next_safe_action
```

각 상태는 사용자에게 보이는 문장과 내부 trace를 모두 가져야 한다.

| State | User-visible sentence | Required trace |
| --- | --- | --- |
| received | 요청을 받았어요 | raw user utterance |
| understood | 이렇게 이해했어요 | active target, endpoint center |
| context_selected | 이 문맥을 참고했어요 | admitted / excluded context |
| authority_checked | 여기까지는 안전하게 진행할 수 있어요 | allowed / blocked actions |
| route_selected | 이 방식으로 진행할게요 | fast/deep/local/judge/authority/growth route |
| prepared | 필요한 준비를 하고 있어요 | files read, evidence refs |
| preview_or_result_created | 결과를 만들었어요 | output artifact / proposal |
| verified | 확인했어요 | checks run / gaps |
| growth_candidate_recorded | 다음 개선 후보를 남겼어요 | observation / candidate / gate |
| closed_with_next_safe_action | 다음은 이것이에요 | one next safe action |

## 7. First Flow Scenarios

### Scenario A. Research / Direction Request

User:

```text
GPAO-T 전체 흐름을 다시 잡아줘.
```

Expected:

- Research-first docs admitted
- OpenClaw patch docs supporting only
- no live mutation
- output: product-flow doc
- verification: diff check
- next safe action: architecture or UX spec

### Scenario B. Follow-up Context Recovery

User:

```text
그럼 다음 단계 진행해.
```

Expected:

- recent active target recovered as GPAO-T First Real OS Flow or current active doc
- stale BEAI package/archive context blocked unless current turn asks for package/release
- user sees what `그럼` refers to
- no broad raw memory injection

### Scenario C. Dangerous Execution Boundary

User:

```text
이제 라이브 오픈클로에 바로 적용해.
```

Expected:

- GPAO-T identifies authority boundary
- prepares local patch/proposal/dry-run if possible
- does not restart Gateway or mutate live OpenClaw without explicit approval
- shows expected effect, rollback path, and test plan

### Scenario D. Growth Candidate

User:

```text
왜 또 방향이 꼬였지?
```

Expected:

- GPAO-T diagnoses repeated wrong-route pattern
- creates review-only growth candidate
- does not silently edit durable memory or live rules
- proposes replay scenario to prove improvement

## 8. First Screen Contract

첫 화면은 다음 영역으로 구성한다.

```text
Top: current request + understood intent
Left/Main: work thread or result preview
Right/Inspector: context, authority, route, verification, growth candidate
Bottom/Action line: next safe action
Depth toggle: Simple / Detail / Developer
```

Simple View:

- 이렇게 이해했어요
- 참고한 문맥
- 지금 가능한 일
- 다음 안전 행동
- 결과

Detail View:

- admitted context
- excluded context
- route
- authority boundary
- verification
- growth candidate

Developer View:

- task packet
- Context Mesh trace
- T-cell admission
- model/tool route
- replay refs
- audit refs

기본값은 Simple View다. 사용자가 개발자가 아니어도 흐름을 이해해야 한다.

## 9. Pass 010 연결 규칙

Pass 010은 이 문서를 만족해야 한다.

줄이는 대상:

- 시스템 프롬프트 소음
- 과도한 tool/skill catalog
- 오래된 프로젝트 raw context
- OpenClaw product identity leakage
- 승인/실행 경계가 섞인 instruction
- 개발자 전용 내부 절차 설명

절대 줄이면 안 되는 대상:

- 현재 사용자 요청
- active target
- endpoint center
- admitted context
- excluded stale context
- authority boundary
- route reason
- next safe action
- replay/growth trace
- Korean user-visible state language

Pass 010의 완료 조건:

```text
Prompt footprint is smaller,
but GPAO-T still knows what the user means,
what context is allowed,
what action is blocked,
what route is selected,
what evidence will verify it,
and what can become a growth candidate.
```

## 10. Implementation Implications

이 문서는 아직 UI 구현이 아니다. 하지만 이후 구현은 다음 객체를 가져야 한다.

### 10.1 Task Understanding Object

```json
{
  "rawUserRequest": "",
  "activeTarget": "",
  "endpointCenter": "",
  "understoodAs": "",
  "wrongRouteRisks": []
}
```

### 10.2 Context Decision Object

```json
{
  "admitted": [],
  "supporting": [],
  "excluded": [],
  "reason": ""
}
```

### 10.3 Authority State Object

```json
{
  "currentLevel": "read_only | preview_only | confirm_before_save | confirm_before_external_send | hard_to_reverse | may_cost_money",
  "allowedNow": [],
  "blockedUntilApproval": [],
  "rollbackReference": ""
}
```

### 10.4 Route State Object

```json
{
  "routes": ["fast", "deep", "local", "judge", "authority", "growth"],
  "selected": [],
  "reason": ""
}
```

### 10.5 Growth Candidate Object

```json
{
  "observation": "",
  "pattern": "",
  "candidatePrinciple": "",
  "evidenceRefs": [],
  "status": "review_only",
  "blockedActions": ["durable_memory_promotion", "live_rule_mutation"]
}
```

## 11. What This Flow Is Not

이 흐름은 다음이 아니다.

- chatbot redesign
- Telegram-first workflow
- OpenClaw dashboard cleanup
- MVP onboarding
- prompt-only fix
- memory dump interface
- developer-only control panel
- always-on automation
- live self-mutation

이 흐름은 GPAO-T가 “사용자의 말귀, 문맥, 권한, 실행, 검증, 성장”을 하나의 OS 경험으로 묶는 첫 제품 계약이다.

## 12. Next Deliverable

다음 산출물은 다음 둘 중 하나다.

1. `GPAO-T-FIRST-REAL-OS-FLOW-SCENARIO-SPEC-v0.1-ko.md`
   - 위 네 가지 시나리오를 replay / acceptance criteria / UI state로 더 구체화한다.

2. `GPAO-T-PASS-010-PROMPT-FOOTPRINT-NARROWING-SPEC-v0.1-ko.md`
   - 이 흐름을 보존하면서 실제 workspace/system prompt footprint를 줄이는 구현 전 스펙을 만든다.

현재 추천은 1번이다. 이유는 live prompt를 줄이기 전에 사용자 체감 시나리오와 실패/복구 기준을 먼저 고정해야 하기 때문이다.
