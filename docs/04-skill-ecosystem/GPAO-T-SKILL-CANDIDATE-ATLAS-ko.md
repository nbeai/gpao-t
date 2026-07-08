# GPAO-T Skill Candidate Atlas v0.1

Status: phase-1 production baseline v0.2  
Owner: 윤 (@aigis0927) / GPAO-T  
Date: 2026-07-08

## 1. 목적

GPAO-T 스킬 제작은 한두 개의 멋진 스킬을 먼저 만드는 방식으로 진행하지 않는다.

먼저 전체 제작 후보를 펼쳐놓고, 사용자의 실제 결핍, 체감 품질, 도메인 실용성, 성장 루프, 권한 경계를 기준으로 제작 순서를 정한다. 이 문서는 그 전체 지도를 설명한다.

실행 가능한 진실 원천은 `src/core/skill-ecosystem.js`이며, 다음 명령으로 같은 내용을 확인한다.

```sh
node bin/gpao-t.js skill atlas
node bin/gpao-t.js skill atlas phase-1
node bin/gpao-t.js skill roadmap
node bin/gpao-t.js skill build-queue phase-1
node bin/gpao-t.js skill production-status phase-1
```

## 2. 제작 원칙

```text
스킬은 따로 떨어진 프롬프트가 아니라
사용자 문제를 해결하는 T-cell 작동 단위다.
```

따라서 모든 스킬 후보는 다음을 가져야 한다.

- 사용자 결핍
- T-cell 작동 초점
- 제작 이유
- 의존 스킬
- 함께 제작할 스킬
- 필요한 검증 증거
- 권한 경계

## 3. Phase 구조

### Phase 1: Foundation And First Felt Quality

목표는 GPAO-T가 바로 쓸모 있게 느껴지는 최소 묶음을 만드는 것이다. 현재 Phase 1의 9개 후보는 모두 production pack으로 등록되어 있으며, `skill production-status phase-1`에서 manifest, routing, execution contract, quality gate, replay, growth signal, authority boundary가 함께 검증된다.

핵심 후보:

- `gpao-core-thinking-pack`
- `gpao-growth-governance-pack`
- `gpao-research-evidence-pack`
- `gpao-visual-design-pack`
- `gpao-webapp-builder-pack`
- `gpao-document-output-pack`
- `gpao-replay-evaluation-pack`
- `gpao-quality-audit-pack`
- `gpao-local-app-qa-pack`

이 단계는 사고, 근거, 디자인, 앱 제작, 문서, 품질 검증, replay, 성장 거버넌스를 함께 묶는다. 개별 스킬이 따로 작동하는 것이 아니라, Foundation Six와 Quality And Replay Loop가 하나의 1차 생산 기준선으로 묶인다.

### Phase 2: Practical Domain And Growth Reports

목표는 한국 일반 사용자와 실제 사업/운영 흐름에 바로 닿는 도메인 스킬을 만든다.

핵심 후보:

- `gpao-korean-business-pack`
- `gpao-data-insight-pack`
- `gpao-writing-style-pack`
- `gpao-mcp-source-connector-pack`
- `gpao-personal-productivity-pack`
- `gpao-weekly-growth-report-pack`
- `gpao-notification-timing-pack`

이 단계는 공식 자료, 데이터, 글쓰기, MCP source, 개인 생산성, 성장 리포트, 방해하지 않는 알림 시점을 다룬다.

### Phase 3: Expansion And Advanced Operations

목표는 GPAO-T의 활용 범위를 학습, 이론 연구, 접근성, 콘텐츠, 자동화, 상태 브리핑까지 확장한다.

핵심 후보:

- `gpao-learning-coach-pack`
- `gpao-tcell-research-pack`
- `gpao-accessibility-usability-pack`
- `gpao-content-distribution-pack`
- `gpao-automation-workflow-pack`
- `gpao-dashboard-briefing-pack`

이 단계는 T-cell 이론의 범용성을 실제 제품 기능으로 검증하는 확장 단계다.

## 4. 제작 묶음

### Foundation Six

가장 먼저 단단히 묶어야 하는 6개다.

- `gpao-core-thinking-pack`
- `gpao-growth-governance-pack`
- `gpao-research-evidence-pack`
- `gpao-visual-design-pack`
- `gpao-webapp-builder-pack`
- `gpao-document-output-pack`

이 묶음이 있어야 GPAO-T는 애매한 요청을 이해하고, 근거를 확인하고, 산출물을 만들고, 디자인 품질을 높이고, 성장 경계를 지킬 수 있다.

### Quality And Replay Loop

스킬 생태계가 프롬프트 모음으로 흐르지 않게 막는 묶음이다.

- `gpao-replay-evaluation-pack`
- `gpao-quality-audit-pack`
- `gpao-local-app-qa-pack`

이 묶음은 “잘했다”가 아니라 “증거로 더 나아졌다”를 확인한다.

### Korean Practicality

한국 사용자에게 즉시 실용적인 가치를 주는 묶음이다.

- `gpao-korean-business-pack`
- `gpao-data-insight-pack`
- `gpao-mcp-source-connector-pack`
- `gpao-document-output-pack`

공식 자료, 통계, 공시, 문서 산출물을 연결한다.

### Self-Growth Experience

사용자가 지파오의 자기 성장 기능을 자연스럽게 느끼게 하는 묶음이다.

- `gpao-personal-productivity-pack`
- `gpao-weekly-growth-report-pack`
- `gpao-notification-timing-pack`
- `gpao-growth-governance-pack`

좋은 제안은 만들되, 사용자의 흐름을 방해하지 않는 것이 핵심이다.

## 5. 완료 기준

개별 스킬 후보는 다음이 있어야 제작 완료로 본다.

- manifest
- intent route fixture
- execution artifact contract
- quality gate replay
- growth signal
- authority boundary
- docs
- tests

다음 중 하나라도 없으면 live skill로 승격하지 않는다.

- replay case
- quality gate
- authority boundary

Phase 1 production pack은 여기에 더해 다음 자동 게이트를 통과해야 한다.

- registry에 실제 스킬팩 manifest가 등록되어야 한다.
- 자기 설명 기반 probe에서 해당 스킬팩이 route되어야 한다.
- 선택된 route가 execution plan의 selected skill로 이어져야 한다.
- quality gate, replay case, growth signal, authority boundary가 모두 비어 있지 않아야 한다.

이 기준은 다음 명령의 `status: ready`로 확인한다.

```sh
node bin/gpao-t.js skill production-status phase-1
```

## 6. 현재 결론

지금 다음 단계는 개별 스킬을 하나씩 즉흥 제작하는 것이 아니다. Phase 1은 이미 생산 기준선으로 올라왔고, 다음은 Phase 1을 실제 turn kernel, Control Center, replay 기록, 성장 제안 루프에 더 깊게 연결하는 것이다.

다음 순서가 맞다.

```text
skill atlas
-> skill roadmap
-> skill build-queue phase-1
-> skill production-status phase-1
-> Foundation Six 생산 기준선 검증
-> Quality And Replay Loop 생산 기준선 검증
-> phase-2 도메인/성장 스킬 제작
-> phase-3 확장 스킬 제작
```

이렇게 해야 GPAO-T 스킬 생태계가 많은 스킬 목록이 아니라, 사용자의 실제 흐름에 맞춰 성장하는 운영망이 된다.
