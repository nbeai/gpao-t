# GPAO-T Workspace Contract v0.1

Status: active workspace contract  
Date: 2026-07-10  
Owner: 윤 (@aigis0927)  
Scope: `/Users/jyp/Documents/Playground 2` 안에서 GPAO-T 작업을 어디에 두고, 어떤 기준으로 진행할지 정하는 환경 계약
OpenClaw reference class: third-party comparison, compatibility, and migration only.

## 1. 목적

이 문서는 GPAO-T를 단일 구현 폴더나 제3자 OpenClaw 호환성 플러그인으로 좁히지 않기 위한 작업 환경 계약이다.

GPAO-T는 독립적인 로컬 우선 Growth Personal AI Operating System이다. OpenClaw는 제3자 비교 제품이며 호환성 및 마이그레이션 검증 대상으로만 다룬다. GPAO-T의 런타임 정체성, 운영 의미, Context / T-cell Kernel, 권한 의미론, 모델 라우터, 커넥터 거버넌스, 성장 루프, 사용자 경험은 GPAO-T가 소유한다.

따라서 GPAO-T 작업 환경은 다음 네 레인을 분리한다.

```text
1. Product / Kernel Source of Truth
2. Compatibility / Migration Lab
3. Product Surface / Interface Lab
4. Evidence / Replay / Readiness Rail
```

## 2. 핵심 원칙

### 2.1 GPAO-T는 OS다

GPAO-T는 메신저 봇, 제3자 OpenClaw 호환성 플러그인, 관리 대시보드, 단일 Codex skill pack이 아니다.

GPAO-T의 본체는 다음을 포함하는 개인 AI 운영체제다.

- Core OS
- Context / T-cell Kernel
- Memory Wiki / Growth Wiki
- Turn Kernel
- Model Router
- Skill / Tool Runtime
- Connector Governance
- Authority Runtime
- Replay / Audit / Rollback
- Self-Growth Loop
- Local Control Center / Work Surface

### 2.2 OpenClaw는 제3자 비교/호환성/마이그레이션 대상이다

OpenClaw는 별도 제3자 제품이다. 검증된 기능 원리는 비교할 수 있고, 필요한 기존 연동 코드는 독립 GPAO-T 런타임으로 이행하는 동안에만 경계가 분명한 호환성 계층으로 유지할 수 있다.

비교/호환성 검증에서 참고할 수 있는 원리:

- local gateway
- session runtime
- service lifecycle
- doctor / health / logs
- channel bridge
- tool / plugin skeleton
- sandbox / elevated execution distinction
- update / rollback patterns

GPAO-T가 소유해야 하는 것:

- active target recovery
- Context Mesh admission
- T-cell / T-sphere projection
- Memory Wiki admission semantics
- authority boundary semantics
- model routing policy
- connector execution policy
- growth-candidate lifecycle
- user-facing work rhythm

### 2.3 Context is admitted, not dumped

GPAO-T는 raw memory injection이나 hidden personalization으로 작동하면 안 된다.

모든 기억, 문서, 과거 대화, 작업 히스토리는 다음 순서를 지나야 한다.

```text
current utterance
-> active target
-> endpoint center
-> Memory Wiki / Context Mesh candidate read
-> T-cell / T-sphere projection
-> admission
-> task packet
-> model generation
-> trace / replay / growth or rejection
```

현재 요청이 항상 우선한다. 오래된 릴리스, 패키지, 자동화, 배포, 어댑터 기억은 현재 요청과 맞을 때만 answer anchor가 될 수 있다.

### 2.4 Fast path is default

GPAO-T는 말귀와 연속성을 높여야 하지만, 평범한 턴을 무겁게 만들면 안 된다.

기본은 fast path다.

Deep path는 다음 경우에만 열린다.

- 명시적 맥락 복구
- 고위험 권한 검토
- 사용자 요청에 의한 deep analysis
- replay / audit 실패 복구
- live runtime mutation 전 검증
- public release / connector / automation 경계

### 2.5 Local work continues, authority actions stop

Codex/GPAO-T는 로컬 읽기, 계획, 문서화, dry-run, replay, 테스트, 시각 검증, evidence capture는 계속 진행한다.

다음은 명시적 승인 없이는 실행하지 않는다.

- external send
- connector write
- recurring automation activation
- durable memory promotion
- live GPAO rule mutation
- live skill application
- credentials / secrets / account changes
- paid action
- destructive action
- public release
- GitHub push / external publication

## 3. 작업 레인

### 3.1 Product / Kernel Source of Truth

Path:

```text
/Users/jyp/Developer/gpao-t
```

역할:

- GPAO-T 제품 본체
- kernel / runtime contract
- source implementation
- local app-shell / Work Surface implementation
- canonical docs for this repo
- replay fixtures and tests owned by the GPAO-T implementation target

여기에 둔다:

- 제품 정의
- core contracts
- implementation code
- repo-native docs
- local state schemas
- replay fixtures
- test-owned acceptance evidence

여기에 두면 안 된다:

- third-party OpenClaw comparison source audit dumps
- broad external reference captures
- unrelated BEAI Harness package release notes
- one-off screenshots that are not tied to repo verification
- speculative theory not mapped to implementation or replay

Default cwd for implementation:

```text
/Users/jyp/Developer/gpao-t
```

### 3.2 Compatibility / Migration Lab

Paths:

```text
/Users/jyp/Documents/Playground 2/openclaw-clean-lab/github-openclaw-source
/Users/jyp/Documents/Playground 2/openclaw-clean-lab/gpao-t-openclaw-dashboard-lab
/Users/jyp/.openclaw
```

역할:

- third-party OpenClaw compatibility and migration analysis
- live-safe compatibility patch planning
- gateway/session/tool skeleton checks
- third-party OpenClaw migration turn-start input packet attachment checks
- speed / health / doctor / service lifecycle evidence

Out of scope:

```text
/Users/jyp/Documents/Playground 2/archive/out-of-scope/gpao-t/gpao-t-hardware-engine
```

`gpao-t-hardware-engine` is not part of the current GPAO-T project flow and must not be used as an active dependency, blocker, or completion criterion unless 윤 explicitly reopens it.

원칙:

- 호환성 계층이 GPAO-T의 의미론이나 제품 정체성을 정의하지 않는다.
- live mutation은 별도 approval/audit/replay 경계를 지나야 한다.
- messenger, gateway dashboard, existing user surfaces는 core conversion이 안정되기 전까지 첫 전장으로 삼지 않는다.

Stage 1 우선순위:

```text
1. controlled third-party OpenClaw compatibility turn smoke
2. GPAO-T prepend/context packet presence check
3. Korean progress visibility check
4. stale release/package anchor rejection check
5. gateway/session/Codex/Telegram stability check
```

### 3.3 Product Surface / Interface Lab

Path:

```text
/Users/jyp/Documents/Playground 2/gpao-t-references/interface-architecture
```

역할:

- final product surface research
- Codex-like work rhythm reference
- third-party OpenClaw UI comparison and migration placement analysis
- Work Surface / Session Rail / Inspector / Operations IA
- visual and information hierarchy decisions

현재 기준:

```text
Layer 1. Work Surface
Layer 2. Session Rail
Layer 3. Inspector
Layer 4. Operations
```

원칙:

- GPAO-T 첫 화면은 관리 대시보드가 아니다.
- 기본 화면은 사용자가 일을 맡기는 Work Surface다.
- raw ids, backend enums, audit ids, JSONL field lists, rollback refs, blocked action lists는 기본 화면에서 숨긴다.
- 위험하거나 승인 필요한 것은 짧고 명확하게 전면에 표시한다.
- 깊은 기술 근거는 Inspector / Operations로 보낸다.

### 3.4 Evidence / Replay / Readiness Rail

Paths:

```text
/Users/jyp/Developer/gpao-t/.beai-harness
/Users/jyp/Documents/Playground 2/.beai-harness/gpao-t
/Users/jyp/Documents/Playground 2/beai-vault
```

역할:

- route and admission evidence
- replay fixture evidence
- skill-router / skill-live-simulation / skill-ux-contract evidence
- runtime-skeleton evidence
- readiness / closeout / verification reports
- Context Mesh candidate and wiki evidence

원칙:

- evidence is not live authority.
- candidate context is not durable memory.
- one successful replay is not broad proof.
- local ready is not public release.
- internal verification state is not live behavior-confirmed unless live behavior was actually verified.

## 4. 라우팅 규칙

새 작업이 들어오면 먼저 질문한다.

```text
이 작업은 GPAO-T의 제품/커널 원본을 바꾸는가?
-> gpao-t

실제 제3자 OpenClaw compatibility runtime, gateway, session, prompt path, service lifecycle을 바꾸는가?
-> compatibility/migration lab / third-party OpenClaw patch evidence under gpao-t

화면, 정보 구조, 사용자 경험, Local Control Center, Work Surface를 바꾸는가?
-> gpao-t-references/interface-architecture 또는 gpao-t/docs/02-design

검증, replay, readiness, route evidence, Context Mesh evidence를 남기는가?
-> gpao-t/.beai-harness 또는 .beai-harness/gpao-t

과거 대화, 결정, 후보 기억, 성장 후보를 다루는가?
-> beai-vault / Context Mesh review rail
```

## 5. 문서 쓰기 규칙

### 5.1 Canon / contract

다음 성격은 `gpao-t/docs/00-canon` 또는 repo root contract로 둔다.

- 인간 중심 응답 원칙
- workspace contract
- runtime contract
- authority contract
- durable product naming rule

### 5.2 Product docs

다음 성격은 `gpao-t/docs/01-product`에 둔다.

- problem frame
- scope
- non-goals
- first version
- product decisions

### 5.3 Design docs

다음 성격은 `gpao-t/docs/02-design` 또는 `gpao-t-references/interface-architecture`에 둔다.

- screen map
- user flow
- state matrix
- visual reference
- interface blueprint
- repair pack

기준:

- 구현에 직접 연결되는 디자인은 `gpao-t/docs/02-design`.
- 외부 UI 분석과 큰 IA 연구는 `gpao-t-references/interface-architecture`.

### 5.4 Engineering docs

다음 성격은 `gpao-t/docs/03-engineering`에 둔다.

- architecture
- API boundaries
- data model
- runtime gates
- dry-run executor contract
- install/update/rollback readiness
- work-surface governance

### 5.5 Verification docs

다음 성격은 `gpao-t/docs/03-verification`에 둔다.

- scenario
- verify
- screenshot evidence
- replay evidence
- QA notes

## 6. 현재 우선순위

### P0. Workspace separation

이 문서를 기준으로 작업 레인을 섞지 않는다.

특히 다음 혼동을 금지한다.

- third-party OpenClaw compatibility/migration work를 GPAO-T product truth로 착각
- Gateway Control UI를 최종 GPAO-T UX로 착각
- Context Mesh 후보를 durable memory로 착각
- replay artifact를 live behavior proof로 착각
- internal verification state를 public release로 착각

### P0. Live-safe third-party compatibility migration smoke

GPAO-T의 제3자 OpenClaw compatibility migration Stage 1에서 다음 큰 작업은 UI 재설계가 아니다.

다음이 먼저다.

```text
controlled third-party OpenClaw compatibility turn
-> prompt path packet attachment check
-> stale anchor rejection check
-> Korean progress visibility check
-> runtime stability check
```

### P0. Runtime skeleton consistency

GPAO-T runtime skeleton은 다음 closed chain을 계속 증명해야 한다.

```text
utterance input
-> flow restoration
-> task context packet
-> Memory Wiki read
-> Context Mesh selection
-> T-cell/T-sphere projection
-> admission
-> response/action contract
-> trace/replay
-> growth candidate
-> stabilization or rejection
```

### P1. Interface realignment

Core conversion and runtime skeleton evidence가 안정된 뒤, interface realignment를 진행한다.

기준:

- Work Surface가 중심이다.
- Inspector는 근거 확인이다.
- Operations는 운영 후면이다.
- 사용자가 보는 언어는 자연스러운 한국어다.
- 개발자에게 필요한 raw field는 접힌다.

### P1. Growth OS evidence

GPAO-T는 지식 저장소가 아니라 성장 OS다.

증거는 다음 연결을 보여야 한다.

```text
knowledge
-> operating principle
-> loop
-> replay / dry-run
-> admitted intervention
-> observed effect
-> growth or rejection
```

## 7. 완료 언어 규칙

다음 표현은 증거가 있을 때만 쓴다.

- ready
- complete
- verified
- production-ready
- release-ready
- live behavior-confirmed

대신 좁은 상태를 정확히 쓴다.

- local evidence ready
- read-only proof
- dry-run verified
- internal verification state
- review-blocked
- public release blocked
- live mutation blocked
- behavior not yet verified

## 8. 다음 작업 핸들

이 계약 이후의 권장 순서:

```text
1. GPAO-T live-safe third-party OpenClaw compatibility turn smoke plan
2. runtime skeleton / workspace contract alignment check
3. Work Surface interface realignment work order
4. Growth OS evidence rail cleanup
5. package/distribution path only after local converted system is stable
```

## 9. 이 문서의 지위

이 문서는 GPAO-T 작업 환경의 v0.1 계약이다.

상위 기준:

- `BEAI-HARNESS-GLOBAL-PRODUCTION-MASTER-PLAN-ko.md`
- T-cell Canon / Calculus Core / Formal Theory
- GPAO-T runtime skeleton and final product design specs

이 문서는 상위 이론이나 마스터 플랜을 대체하지 않는다. 대신 실제 작업자가 매번 파일, 폴더, 증거, 권한 경계를 선택할 때 사용하는 operational workspace contract다.
