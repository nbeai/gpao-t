# GPAO-T Owner Operating Guide v0.1

Status: active owner guide
Date: 2026-07-10  
Owner: 윤 (@aigis0927)  
Scope: 일반 사용자인 윤이 Codex와 함께 독립 GPAO-T 제품을 개발하고 검증하는 작업 방식
OpenClaw reference class: third-party comparison, compatibility, and migration only.

## 1. 이 문서의 목적

이 문서는 개발자용 기술 명세가 아니다.

윤이 앞으로 Codex와 함께 GPAO-T를 만들 때, 무엇을 직접 판단하고 무엇을 Codex에게 맡기면 되는지 정하는 운영 가이드다.

GPAO-T 개발에서 윤의 역할은 터미널 명령을 외우는 사람이 아니다. 윤의 역할은 제품의 방향, 사용감, 존재 이유, 위험 경계, 사람에게 맞는 언어를 판단하는 오너다.

Codex의 역할은 그 판단을 코드, 문서, 검증, 리서치, 작업 순서, 복구 가능한 변경으로 바꾸는 개발 동반자다.

중요한 추가 원칙:

- 윤이 이미 끝낸 프로젝트들은 GitHub `nbeai` 계정에 올라가 있으며, GPAO-T 작업에서 중요한 외부 기준 자료로 참고한다.
- 현재 Codex에는 윤이 만든 GPAO가 플러그인되어 있으므로, Codex는 GPAO의 Context Mesh / Knowledge Loop / T-cell / replay / growth governance 관점을 작업에 적용한다.
- 필요하면 Codex는 멀티 에이전트를 제안, 구성, 리딩할 수 있다.
- 제3자 OpenClaw 관련 작업은 비교, 호환성 유지, 독립 런타임으로의 마이그레이션에만 한정한다.

## 2. 우리가 만들고 있는 것

GPAO-T는 독립적인 로컬 우선 Growth Personal AI Operating System이다.

한 문장으로 정의하면:

> GPAO-T는 자체 런타임, T-cell 이론, GPAO Core Engine을 소유하며, 일반 사용자가 어렵지 않게 AI-native / AX 방식으로 일하고 배우고 성장할 수 있게 돕는 독립적인 자가성장형 퍼스널 AI OS다.

GPAO-T는 다음 중 하나로 축소되면 안 된다.

- 챗봇
- 메신저 봇
- OpenClaw 스킨
- 개발자용 CLI 묶음
- 관리 대시보드
- 단순 기억 저장소
- 프롬프트 모음

GPAO-T가 되어야 하는 것은 다음이다.

- 내 말을 알아듣는 작업 표면
- 내 PC에서 안전하게 일하는 로컬 운영층
- 내 기억과 맥락을 선별해서 쓰는 Context / Memory Kernel
- 내 행동과 실패에서 배우는 Self-Growth Loop
- 실행 전 권한을 분명히 나누는 Authority Runtime
- 쓸수록 나에게 맞아지지만, 몰래 바뀌지는 않는 개인 AI OS

## 3. 윤과 Codex의 역할 분담

윤이 판단할 것:

- 이것이 내가 만들고 싶은 제품인가
- 일반 사용자가 이해할 수 있는가
- 사용감이 불편하거나 불안하지 않은가
- GPAO-T답게 성장하고 있는가
- 제3자 OpenClaw 호환성/마이그레이션이 GPAO-T의 독립 제품 경계를 침범하지 않았는가
- live 변경, 외부 전송, 계정 연결, 배포, 비용, 삭제를 승인할지

Codex가 맡을 것:

- 현재 코드와 문서 상태 확인
- 필요한 문서 즉시 작성
- GitHub / 논문 / 커뮤니티 리서치
- 작업 순서 설계
- 코드 구현
- 테스트와 검증
- 실패 원인 진단
- 변경 전후 차이 설명
- 다음 안전 행동 제안
- 윤이 개발자가 아니어도 이해할 수 있는 언어로 번역
- 필요할 때 멀티 에이전트 역할 제안, 구성, 리딩, 결과 종합
- nbeai GitHub 완료 프로젝트와 현재 로컬 workspace / live state의 차이 확인

윤에게 시키지 않을 것:

- 터미널 출력 해석
- 파일 경로 추적
- 테스트 실패 원인 분석
- 코드 위치 찾기
- Git 상태 정리
- 리서치 자료 수집
- 문서 구조 설계

윤에게 반드시 물어볼 것:

- 제품 방향을 바꾸는 판단
- live GPAO-T runtime 변경 중 자격증명, 외부 연결, 파괴적 변경 승인
- durable memory promotion 승인
- 외부 전송 / 커넥터 write / 계정 연결 승인
- 비용 발생 승인
- 삭제 / 되돌리기 어려운 작업 승인
- public release / GitHub push / 배포 승인

## 4. 기본 작업 리듬

앞으로 GPAO-T 작업은 다음 순서로 진행한다.

```text
1. 현재 요청 확인
2. 로컬 Context Mesh / 기존 문서 확인
3. 필요한 경우 외부 리서치
4. 오늘 만들 산출물 정의
5. 문서 / 코드 / 테스트 / 증거 작성
6. 로컬 검증
7. 무엇이 됐고 무엇이 아직 아닌지 설명
8. 다음 안전 행동 제안
```

윤이 길게 설명하지 않아도 된다. 예를 들어 다음처럼 말해도 된다.

```text
이제 OpenClaw 호환성 이행을 이어가자.
검색 품질부터 잡자.
/new 이후 맥락 이어받기를 먼저 고쳐줘.
자가성장 루프 문서부터 만들어줘.
이 화면이 일반 사용자에게 맞는지 봐줘.
```

Codex는 이런 말을 작업 가능한 문서, 구현, 검증 계획으로 바꾼다.

## 5. 비교 제품과 호환성 코드를 다루는 방식

OpenClaw는 별도 제3자 비교 제품이며 호환성 reference다. 기존 호환성
코드가 남아 있는 이유는 현재 로컬 런타임의
기능을 안전하게 독립시키기 위한 이행 경로이기 때문이다.

제3자 OpenClaw 비교에서 GPAO-T 방식으로 재설계할 수 있는 원리:

- 로컬 게이트웨이
- 세션 런타임
- CLI / MCP / 도구 연결
- 서비스 실행과 로그
- 모델 연결 방식
- 로컬 PC 조작 기반
- health / doctor / restart / rollback 패턴

GPAO-T가 직접 가져야 할 것:

- active target recovery
- Memory Wiki / Context Mesh admission
- T-cell / T-sphere projection
- GPAO Core Engine
- LLM-ready task context packet
- authority boundary
- growth proposal / replay / apply gate
- 일반 사용자가 이해하는 Work Surface

호환성 코드를 고칠 때의 기준:

```text
검증된 런타임 원리는 GPAO-T 구조로 재설계한다.
비교 제품의 UX와 의미론은 그대로 따르지 않는다.
GPAO-T의 기억, 권한, 성장, 말귀 구조가 우선이다.
OpenClaw 호환성/마이그레이션 작업이 GPAO-T 전체 설계에서 벗어나면 즉시 멈추고 재정렬한다.
```

작업 중 매번 확인할 질문:

```text
이 변경이 GPAO-T OS 완성도를 높이는가?
이 변경이 기억, 맥락, 권한, 성장, 사용자 체감 중 무엇을 증명하는가?
우리가 비교 제품 자체 개선으로 편협해지고 있지는 않은가?
```

## 6. 완료 언어

우리는 앞으로 완료 표현을 좁고 정확하게 쓴다.

쓸 수 있는 표현:

- 문서화 완료
- 로컬 검증 완료
- dry-run 통과
- repo-level proof 통과
- live 적용 전 검증 상태
- live behavior not yet verified
- approval required
- rollback path prepared

증거 없이 쓰지 않을 표현:

- 완전히 고쳤다
- live에서 된다
- production-ready
- release-ready
- 자가성장 적용 완료
- 기억 문제가 해결됐다

특히 제3자 OpenClaw 호환성 live 경로는 실제 live turn으로 확인되기 전까지 성공이라고 말하지 않는다.

## 7. 윤이 보면 되는 것

윤은 매번 모든 파일을 읽을 필요 없다.

보통은 Codex가 마지막에 다음 네 가지를 말하면 된다.

```text
1. 오늘 만든 것
2. 확인한 증거
3. 아직 아닌 것
4. 다음에 할 일
```

윤은 그중 1번과 4번을 보고 방향이 맞는지 판단하면 된다.

## 8. 지금부터의 진행 원칙

이 프로젝트는 이제부터 다음 방식으로 진행한다.

- 문서 없이 감으로 진행하지 않는다.
- 리서치가 필요하면 즉시 리서치한다.
- 제3자 OpenClaw 호환성 런타임 변경 전에는 작업명령과 롤백 경계를 만든다.
- 일반 사용자의 체감을 항상 기준에 둔다.
- GPAO-T가 자가성장하더라도 몰래 바뀌지 않게 한다.
- OpenClaw 호환성은 분리된 이행 계층으로만 다루고 GPAO-T의 존재 이유를 흐리지 않는다.
