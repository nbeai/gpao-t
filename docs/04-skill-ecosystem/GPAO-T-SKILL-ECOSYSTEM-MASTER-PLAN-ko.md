# GPAO-T Skill Ecosystem Master Plan

Status: production-planning baseline v0.1  
Owner: 윤 (@aigis0927) / GPAO-T  
Scope: GPAO-T skill packs, T-cell-based skill registry, user-practical skill growth loop  
Date: 2026-07-08

## 1. 목적

GPAO-T 스킬 생태계는 스킬을 많이 모으는 카탈로그가 아니다.

목표는 사용자의 실제 작업 흐름에서 반복적으로 필요한 능력을 리서치 기반으로 만들고, T-cell 작동 원리로 압축하고, 실행 가능한 절차와 품질 게이트로 고정한 뒤, 사용자의 반복 사용과 replay 증거를 통해 계속 개선되는 스킬 생태계를 만드는 것이다.

GPAO-T 본체가 완성되면 이 생태계는 결합 가능한 독립 하위 시스템으로 붙는다. 따라서 지금 단계의 산출물은 단순 계획 문서가 아니라 다음 세 표면을 갖는다.

- `gpao-t skill ecosystem`
- `gpao-t skill intent <text>`
- `gpao-t skill packs`
- `gpao-t skill manual-first`
- `gpao-t skill readiness`
- `gpao-t skill route <text>`
- `gpao-t skill execute-plan <text>`

## 2. 최우선 원칙

```text
GPAO-T Skill Prime Rule

모든 GPAO-T 스킬은 실제 사용자의 현실 문제를 해결해야 한다.
스킬은 아이디어, 역할극, 프롬프트 장식이 아니라
리서치, 도메인 지식, 실행 절차, 품질 기준, 검증 루프를 갖춘
실전 작동 단위여야 한다.
```

이 원칙은 모든 카테고리보다 우선한다.

스킬팩을 만들 때는 먼저 사용자의 결핍을 정의한다. 그 다음 해당 도메인의 좋은 사례, 공식 자료, 실무 기준, 실패 사례를 리서치한다. 리서치 결과는 그냥 저장하지 않고 T-cell 작동 원리로 추출한다. 그 원리를 실행 절차, 품질 게이트, replay case, 성장 신호로 내려야만 GPAO-T 스킬로 인정한다.

## 3. T-cell Mapping

```text
T-cell = 최소 작동 원리 단위
Skill = T-cell이 특정 작업에서 실행 가능한 절차로 굳어진 것
Skill Pack = 여러 Skill이 하나의 목적/도메인을 위해 묶인 T-sphere
Skill Ecosystem = 사용자의 흐름에 따라 스킬팩이 추천, 조합, 개선, 진화되는 운영망
```

스킬팩은 T-cell 이론을 장식어로 사용하지 않는다. 각 스킬팩은 반드시 다음 중 하나 이상으로 T-cell을 구현해야 한다.

- `tcellPrinciple`: 스킬이 지켜야 하는 작동 원리
- `triggerSignals`: 언제 이 스킬이 활성 후보가 되는지
- `qualityGates`: 좋은 산출물을 판정하는 기준
- `replayCases`: 반복 검증 시나리오
- `growthSignals`: 스킬 업그레이드 후보를 만드는 신호
- `authorityBoundary`: 자동화와 승인 경계

## 4. Skill Lifecycle

```text
research
-> tcell_extract
-> specify
-> route
-> execute
-> quality_gate
-> replay
-> growth_signal
-> upgrade_proposal
```

### research

각 스킬팩은 좋은 리서치에서 출발한다. 디자인 스킬은 현재의 좋은 웹/앱/브랜드/시각 산출물을 공부해야 한다. 한국 사업 스킬은 공식 자료와 실무 절차를 확인해야 한다. 개발 스킬은 검증된 라이브러리, 테스트 방식, 운영 패턴을 따라야 한다.

### tcell_extract

리서치 결과에서 반복 작동 원리를 추출한다. 예를 들어 좋은 UI의 본질은 "예쁘다"가 아니라 사용자의 목적, 시각 위계, 타이포, 간격, 대비, 반응형 안정성이 함께 작동하는 구조다.

### specify

스킬팩은 manifest 필드로 내려온다. 필수 필드는 다음과 같다.

```text
id
category
title
targetUserProblem
tcellPrinciple
triggerSignals
inputTypes
outputArtifacts
researchProtocol
qualityGates
replayCases
authorityBoundary
growthSignals
```

### route

사용자 발화는 전체 스킬 목록을 무작정 불러오지 않는다. 현재 요청의 신호를 보고 필요한 스킬팩만 후보로 고른다. 현재 발화가 항상 우선이며, 과거 맥락이나 스킬 라우팅은 보조 판단이다.

v0.1.1부터 라우팅은 단순 키워드 매칭이 아니라 `intentProfile`을 먼저 만든다.

```text
user request
-> primaryIntents
-> qualityNeeds
-> outputNeeds
-> authoritySignals
-> ambiguity
-> skill score
-> task packet
```

이 흐름의 목적은 사용자가 정확한 명령어를 몰라도 필요한 스킬팩이 붙게 하는 것이다. 예를 들어 "한국 사업자를 위한 최신 통계와 공시 자료를 근거로 사업계획서 초안을 만들어줘"는 `만들어줘`라는 동사 때문에 앱 빌더로 새지 않고, research evidence / Korean business / core thinking 쪽으로 라우팅되어야 한다.

### execute

실제 실행은 GPAO-T turn kernel의 task packet에 스킬 라우팅 결과가 들어간 뒤 진행한다. 현재 구현은 selected skill packs, route role, intent reasons, first quality gate를 task packet과 user-visible state에 포함한다.

v0.1.2부터 `skill execute-plan <text>`가 선택된 스킬팩을 실제 로컬 실행 계약으로 확장한다.

```text
skill route
-> selected skill packs
-> execution steps
-> artifact contract
-> quality gate contract
-> authority contract
-> replay contract
-> task packet
```

이 단계의 의미는 중요하다. GPAO-T는 "어떤 스킬을 쓰면 좋겠다"에서 멈추지 않는다. 선택된 스킬은 다음 정보를 반드시 제공해야 한다.

- 사용자의 결과물을 이해하는 첫 단계
- 리서치/도메인 기준을 적용하는 절차
- 실제 산출물 후보
- 완료를 막는 품질 게이트
- 승인 없이는 넘지 않을 권한 경계
- 나중에 스킬을 개선할 replay case와 growth signal

live skill mutation이나 외부 실행은 여전히 승인과 replay 경계 뒤에 둔다. 그러나 로컬 초안, 계획, 품질 검사, 산출물 계약, replay 후보 생성은 적극 자동화한다.

### quality_gate

스킬이 만든 산출물은 완료 주장 전에 품질 게이트를 통과해야 한다.

예:

- 디자인: 타이포, 간격, 대비, 반응형, 도메인 적합성
- 리서치: 출처, 최신성, 추론 분리, 불확실성 표시
- 문서: 독자, 목적, 행동, 구조, 근거
- 개발: 작동 경로, empty state, failure/recovery, 테스트

### replay

대표 사용자 시나리오로 반복 검증한다. 스킬은 한 번 그럴듯하게 답하는 것이 아니라 같은 유형의 작업에서 계속 좋은 결과를 내야 한다.

### growth_signal

사용자의 반복 수정, 같은 실패, 같은 선호, 같은 도메인 요청은 스킬 업그레이드 후보가 된다.

### upgrade_proposal

업그레이드는 자동 제안될 수 있다. 그러나 live skill mutation, durable memory promotion, external send/deploy는 replay와 승인 경계 뒤에 둔다.

## 5. Base Skill Packs

v0.1 기본 스킬팩은 다음 8개다.

| ID | 역할 |
| --- | --- |
| `gpao-core-thinking-pack` | 애매한 요청을 판단 가능한 계획과 다음 행동으로 바꾼다. |
| `gpao-research-evidence-pack` | 최신 정보, 외부 사례, 정책, 기술 비교를 근거 기반으로 정리한다. |
| `gpao-document-output-pack` | 보고서, 제안서, 매뉴얼, 정책 문서, 원고를 독자 중심으로 만든다. |
| `gpao-visual-design-pack` | 웹, 앱, 발표, 보고서의 시각적 완성도를 높인다. |
| `gpao-webapp-builder-pack` | 아이디어를 실제 작동하는 웹앱/앱으로 구현하고 검증한다. |
| `gpao-korean-business-pack` | 한국 사업자용 공식 자료, 문서, 세무/법률/공시/통계 흐름을 돕는다. |
| `gpao-data-insight-pack` | 스프레드시트, 지표, 통계, 운영 데이터를 판단 자료로 바꾼다. |
| `gpao-growth-governance-pack` | 자가 성장, 승인, replay, audit, rollback 경계를 관리한다. |

## 6. Design Skill Priority

GPAO-T는 일반 사용자에게 실제로 도움이 되어야 한다. 사용자가 웹과 앱을 만들 때 시각적 완성도는 매우 큰 가치다. 따라서 디자인은 보조 기능이 아니라 기본 스킬 생태계의 핵심 축이다.

디자인 스킬팩은 다음을 다뤄야 한다.

- 시각 방향 설정
- 브랜드 스타일 적응
- UI layout과 component guidance
- UX flow와 화면 전환
- landing page conversion
- presentation/report visual quality
- AI-looking output 제거
- screenshot/replay 기반 QA

## 7. Automation And Authority

GPAO-T 스킬 생태계는 적극 자동화를 지향한다.

자동 허용:

- broad capture
- draft generation
- skill routing
- quality inspection
- replay draft
- upgrade proposal
- weekly growth report draft

승인 필요:

- durable memory promotion
- live skill mutation
- OS rule mutation
- external send
- deployment
- public release
- legal, financial, security, destructive action
- paid asset or paid connector use

## 8. Manual-First Automation Gate

GPAO-T는 자동화를 약하게 만들기 위해 manual-first를 두지 않는다. 반대로 안전하게 강한 자동화를 만들기 위해 먼저 수동 미리보기, dry-run, replay, 승인, rollback 경로를 잠근다.

```text
manual_preview
-> dry_run_replay
-> review_gate
-> live_apply_candidate
```

이 계약은 `gpao-t skill manual-first`로 확인한다.

각 단계의 의미는 다음과 같다.

- `manual_preview`: 스킬팩 선택, 품질 게이트, 권한 경계를 보여준다.
- `dry_run_replay`: manifest 완성도와 replay 근거를 검증한다.
- `review_gate`: 승인 상태, rollback 계획, audit 요구사항을 확인한다.
- `live_apply_candidate`: 향후 GPAO-T apply engine이 생겼을 때 승인된 reversible 변경만 적용한다.

따라서 위험한 자동화는 대기 상태로 방치되는 것이 아니라, 실행 가능한 단계로 이동한다. 다만 live skill mutation, durable memory promotion, external send/deploy는 replay, 승인, rollback, audit 없이 바로 실행되지 않는다.

## 8. Integration Contract

현재 구현 표면:

```text
gpao-t skill ecosystem
gpao-t skill manifest
gpao-t skill packs [category]
gpao-t skill inspect <skill-pack-id>
gpao-t skill route <text>
gpao-t skill execute-plan <text>
gpao-t skill readiness
```

미래 결합 표면:

```text
turn-kernel
-> skill route
-> task packet enrichment
-> model/tool routing
-> execution
-> quality gate
-> replay record
-> growth proposal
```

## 9. 완료 기준

GPAO-T 스킬 생태계의 v0.1 baseline 완료 기준은 다음이다.

- 기본 스킬팩 registry가 존재한다.
- manifest 표준이 존재한다.
- readiness report가 모든 필수 필드를 검사한다.
- CLI에서 ecosystem, manifest, packs, inspect, route, readiness가 동작한다.
- control center summary에 skill ecosystem 패널이 노출된다.
- 테스트가 스킬팩 준비도, 라우팅, CLI, control center 결합을 검증한다.
- 선택된 스킬팩이 실행 단계, 산출물 계약, 품질 게이트 계약, 권한 계약, replay 계약으로 확장된다.
- turn kernel task packet이 skill route와 skill execution plan을 모두 담아 model/tool routing 전에 작업 품질 기준을 고정한다.

## 10. 다음 개발 순서

1. 기본 스킬팩별 상세 명세와 replay fixture 추가
2. turn-kernel task packet에 skill route 결과 주입
3. 디자인 스킬팩의 screenshot QA 및 responsive QA 연결
4. 한국 사업 스킬팩의 MCP/source registry 연결
5. 스킬 실행 결과를 growth proposal과 weekly report 후보로 연결
6. 사용자 승인 후 skill upgrade 적용 경로와 rollback 표면 추가
