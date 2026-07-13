# GPAO-T Product Charter v0.1

Status: canonical product charter
Date: 2026-07-13
Owner: 윤 (@aigis0927)
Scope: GPAO-T product identity, development judgment, and user-facing direction

## 1. Mission

GPAO-T의 목표는 사용자와 함께 성장하는 독립 AI 운영체제가 되는 것이다.

GPAO-T는 사용자의 의도, 맥락, 기억, 도구, 작업 흐름을 운영해 불필요한 토큰과 반복을 줄이고, 빠르고 품질 높은 대화, 산출물, 디자인, 개발 경험을 제공한다.

GPAO-T는 특정 대기업 AI 생태계나 폐쇄형 개발 환경에 종속되지 않고, 다양한 모델과 도구를 유연하게 연결할 수 있어야 한다.

## 2. Product Identity

GPAO-T는 단순한 챗봇, 프롬프트 묶음, 모델 호출기, OpenClaw 변형판, 또는 특정 AI 서비스의 보조 도구가 아니다.

GPAO-T는 사용자의 작업과 성장을 운영하는 Personal Growth OS다.

따라서 GPAO-T의 핵심 가치는 다음에 있다.

- 사용자의 맥락을 이어받는 것
- 기억을 단순 저장이 아니라 행동 원리로 승격하는 것
- 도구와 모델을 목적에 맞게 라우팅하는 것
- 중요한 작업을 계획, 실행, 검증, 회복, closeout 흐름으로 운영하는 것
- 사용자가 특정 폐쇄형 AI 생태계에 갇히지 않도록 독립 실행 기반을 제공하는 것

## 3. Quality Target

GPAO-T는 최소 토큰 사용 자체를 목표로 하지 않는다. 목표는 낭비되는 토큰, 반복 설명, 불필요한 재시작, 맥락 손실을 줄이는 것이다.

GPAO-T는 최고 품질을 선언만 하지 않는다. 품질은 다음 증거로 판단한다.

- 사용자의 실제 맥락을 반영했는가
- 적절한 기억 후보를 찾고, 승인되지 않은 기억을 과신하지 않았는가
- 필요한 도구를 적절히 선택했는가
- 산출물이 사용 목적에 맞는가
- 검증 가능한 근거와 테스트 결과가 있는가
- 실패했을 때 회복 경로가 있는가

## 4. Independence Principle

GPAO-T는 특정 모델, 특정 API, 특정 앱, 특정 폐쇄형 개발 환경에 묶이면 안 된다.

OpenAI, Anthropic, Google, 로컬 모델, MCP 도구, 브라우저, 파일 시스템, 데이터베이스, 사내 도구는 모두 교체 가능한 실행 자원이어야 한다.

모델은 GPAO-T의 두뇌 중 하나일 수 있지만, GPAO-T의 정체성은 모델이 아니라 운영 계층에 있다.

## 5. Research And Approval Principle

GPAO-T 개발은 일방적인 속단으로 무조건 구현에 들어가는 방식을 지양한다.

다음 작업은 관련 리서치, 계획, 사용자 협의 또는 승인, 검증 기준을 거쳐야 한다.

- 제품 정체성 변경
- runtime 구조 변경
- 기억, T-cell, admission, replay, apply gate 변경
- 권한, 보안, 외부 전송, 자동화, 배포 변경
- 사용자 데이터, 회사 데이터, 공용 데이터베이스 연결
- 공개 릴리스, 설치 파일, 업데이트 체계 변경

다만 작고 되돌릴 수 있는 개선은 Codex가 자율적으로 진행할 수 있다.

- 오탈자 수정
- 문구 정리
- 테스트 보강
- 작은 버그 수정
- 문서 링크 정리
- 검증 명령 추가

자율 진행한 작업도 완료 주장 전에는 변경 내용과 검증 결과를 보고해야 한다.

## 6. Growth Principle

GPAO-T의 기억은 저장소가 아니라 성장 루프의 재료다.

기록은 바로 행동 권한이 될 수 없다. 기억 후보는 admission, replay, approval, promotion, rollback 경계를 통과해야 한다.

목표 흐름은 다음과 같다.

```text
raw record
-> candidate
-> admission
-> replay
-> approval
-> promoted operating principle
-> next action influence
```

이 흐름을 지키지 못하는 기억 기능은 GPAO-T의 핵심 원칙을 만족하지 못한다.

## 7. User Experience Principle

GPAO-T는 사용자가 챗앱을 쓰는 느낌에 머물면 안 된다.

사용자는 다음 감각을 받아야 한다.

- 내 작업 흐름이 이어지고 있다
- 내 맥락이 사라지지 않는다
- AI가 무엇을 하고 있는지 보인다
- 기억 후보와 승인 경계가 보인다
- 실패와 복구 상태가 설명된다
- 중요한 행동은 내 권한 아래 있다

## 8. Development Judgment

새 기능, 문서, UI, 배포물, 테스트는 다음 질문을 통과해야 한다.

1. 이것이 GPAO-T를 Personal Growth OS에 더 가깝게 만드는가?
2. 특정 폐쇄형 생태계 종속을 줄이는가?
3. 사용자 맥락, 기억, 권한, 검증을 더 잘 운영하게 하는가?
4. 비개발자 사용자도 결과와 상태를 이해할 수 있는가?
5. 완료 주장을 뒷받침할 증거가 있는가?

이 질문에 답하지 못하는 작업은 GPAO-T의 핵심 개발로 승격하지 않는다.
