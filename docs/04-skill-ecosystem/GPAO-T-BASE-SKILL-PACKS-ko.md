# GPAO-T Base Skill Packs v0.1

Status: phase-1 production registry baseline v0.2
Owner: 윤 (@aigis0927) / GPAO-T  
Date: 2026-07-08

## 1. 개요

이 문서는 GPAO-T에 기본 탑재할 1차 스킬팩을 정리한다. 실제 실행 데이터 계약은 `src/core/skill-ecosystem.js`가 단일 진실 원천이다. 이 문서는 사용자가 읽을 수 있는 제품 설명과 개발 기준이다.

현재 Phase 1 production baseline은 9개 스킬팩이다. 전체 registry에는 Phase 2/도메인용 seed pack까지 포함해 11개 기본 pack이 존재한다.

## 2. 기본 스킬팩

### gpao-core-thinking-pack

사용자의 애매한 요청을 목표, 판단 기준, 다음 행동으로 정리한다.

핵심 품질:

- 사실, 가정, 위험, 다음 행동 분리
- 현재 사용자 요청 우선
- 이론을 실행 가능한 결정으로 변환

### gpao-research-evidence-pack

외부 사례, 최신 정보, 정책, 기술 비교를 근거 기반으로 정리한다.

핵심 품질:

- 주요 claim과 source mapping
- 사실, 인용, 추론, 불확실성 분리
- 최신성 또는 검증 수준 과장 금지

### gpao-document-output-pack

보고서, 제안서, 매뉴얼, 정책 문서, 원고를 독자 중심 산출물로 만든다.

핵심 품질:

- 독자와 목적이 선명함
- 불필요한 형식 채우기 없음
- source 기반 claim 추적 가능

### gpao-visual-design-pack

웹, 앱, 발표, 보고서, 랜딩페이지의 시각적 완성도를 높인다.

핵심 품질:

- 타이포, 간격, 대비, 반응형, 시각 위계
- 도메인에 맞는 디자인 감각
- AI-looking output 제거

### gpao-webapp-builder-pack

아이디어를 작동하는 웹앱/앱으로 만들고 검증한다.

핵심 품질:

- 첫 화면이 실제 사용 가능
- core workflow, empty state, failure/recovery 확인
- 기존 코드 패턴 우선

### gpao-korean-business-pack

한국 사업자와 일반 사용자의 사업 실무 자료 확인을 돕는다.

핵심 품질:

- 공식 한국 source 우선
- 법률, 세무, 금융 경계 분리
- 실무 action plan 제공

### gpao-data-insight-pack

스프레드시트, 통계, 운영 지표를 의사결정 자료로 바꾼다.

핵심 품질:

- 계산 trace 보존
- 차트는 장식이 아니라 판단 질문에 답해야 함
- 데이터 한계와 불확실성 표시

### gpao-growth-governance-pack

GPAO-T의 자가 성장, 승인, replay, audit, rollback을 관리한다.

핵심 품질:

- broad capture는 적극 허용
- durable promotion/live mutation은 승인과 replay 뒤
- 모든 upgrade는 evidence와 rollback note 보유

### gpao-replay-evaluation-pack

업그레이드가 실제로 나아졌는지 before/after replay로 확인한다.

핵심 품질:

- 이전 실패/비효율 시나리오를 기준 사례로 고정
- 적용 전후 점수와 회귀 위험 분리
- 개선 증거 없이는 성장 완료 주장 금지

### gpao-quality-audit-pack

완료 주장, 품질 drift, 근거 누락, 검증 부족을 감사한다.

핵심 품질:

- completion claim 전에 evidence checklist 확인
- 사실, 추론, 미검증, 위험을 분리
- 품질 기준 위반은 growth signal로 남김

### gpao-local-app-qa-pack

로컬 앱/웹앱의 첫 사용자 흐름과 상태 품질을 검증한다.

핵심 품질:

- first workflow, empty state, error/recovery 확인
- 반응형, 텍스트 overflow, 화면 전환 안정성 점검
- local preview와 external deployment 경계 분리

## 2.1 Phase 1 Production Baseline

Phase 1은 다음 9개 pack을 생산 기준선으로 본다.

- `gpao-core-thinking-pack`
- `gpao-growth-governance-pack`
- `gpao-research-evidence-pack`
- `gpao-visual-design-pack`
- `gpao-webapp-builder-pack`
- `gpao-document-output-pack`
- `gpao-replay-evaluation-pack`
- `gpao-quality-audit-pack`
- `gpao-local-app-qa-pack`

완료 기준은 후보 문서에 적힌 의지나 설명이 아니다. 다음 명령에서 9개 모두 통과해야 한다.

```sh
node bin/gpao-t.js skill production-status phase-1
```

이 게이트는 각 pack이 registry에 있고, 자기 probe로 route되며, execution contract로 이어지고, quality gate, replay case, growth signal, authority boundary를 갖는지 확인한다.

## 3. 운영 원칙

기본 스킬팩은 완성된 끝이 아니라 성장의 시작점이다. 사용자의 반복 사용, 반복 실패, 반복 수정, 반복 선호는 Context Mesh와 Growth Loop를 통해 스킬 업그레이드 후보가 된다.

하지만 다음은 자동 적용하지 않는다.

- live skill mutation
- durable memory promotion
- OS rule mutation
- external send/deploy
- public release
- legal, financial, security, destructive action

이 경계는 GPAO-T가 수동적인 도구가 아니라 적극적인 OS가 되기 위한 최소 통제선이다.
