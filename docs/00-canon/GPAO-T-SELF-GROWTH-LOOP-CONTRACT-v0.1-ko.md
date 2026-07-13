# GPAO-T Self-Growth Loop Contract v0.1

Status: active canon candidate  
Date: 2026-07-10  
Scope: GPAO-T 자체가 자가성장루프를 가질 때 지켜야 할 안전, 승인, 검증 계약

## 1. 목적

GPAO-T는 사용자의 성장을 돕는 도구이면서, 자기 자신도 더 나아지는 운영체제가 되어야 한다.

하지만 자가성장은 몰래 바뀌는 것과 다르다.

GPAO-T의 자가성장은 다음을 의미한다.

> 반복되는 작업, 실패, 수정, 사용자의 판단, replay 결과에서 작동 원리를 추출하고, 그것을 검증 가능한 성장 후보로 만든 뒤, 안전한 경계를 지나 future behavior에 반영하는 것.

GPAO-T의 자가성장은 다음을 의미하지 않는다.

- 몰래 기억 저장
- 몰래 규칙 변경
- live prompt hidden mutation
- 사용자 모르게 도구 권한 확대
- 실패 한 번으로 원칙 생성
- 검증 없는 자기확신
- 외부 전송 또는 자동화 활성화

## 2. 기본 루프

공식 Self-Growth Loop:

```text
Observe
-> Diagnose
-> Extract
-> Propose
-> Replay
-> Apply Gate
-> Observe Again
-> Stabilize or Rollback
```

각 단계의 의미:

| 단계 | 의미 | 산출물 |
| --- | --- | --- |
| Observe | 사용자의 요청, 실패, 반복 패턴, 수정 압력 관찰 | trace / event / replay candidate |
| Diagnose | 무엇이 문제였는지 분리 | diagnosis note |
| Extract | 반복되는 작동 원리 후보 추출 | T-cell candidate / growth candidate |
| Propose | 적용 가능한 개선안으로 정리 | growth proposal |
| Replay | 과거/가상 케이스로 검증 | replay evidence |
| Apply Gate | 적용 가능 여부와 권한 확인 | approval / rejection / hold |
| Observe Again | 적용 후 실제 효과 관찰 | post-apply observation |
| Stabilize or Rollback | 안정화하거나 되돌림 | stable rule / rollback note |

## 3. 자동으로 해도 되는 것

다음은 Codex/GPAO-T가 사용자에게 매번 묻지 않고 진행할 수 있다.

- 로컬 문서 읽기
- 현재 코드/문서 상태 확인
- Context Mesh resolve
- candidate memory 읽기
- 실패 후보 캡처
- growth proposal 초안 작성
- 로컬 dry-run
- replay fixture 작성
- 테스트 실행
- 증거 문서 작성
- rollback 계획 작성
- 리서치 요약
- 낮은 위험의 문서/테스트/로컬 proof 업데이트

단, 이 행동들도 완료 언어는 좁게 써야 한다.

## 4. 반드시 승인 받아야 하는 것

다음은 사용자 승인 전까지 적용하지 않는다.

- durable memory promotion
- live GPAO rule mutation
- live OpenClaw runtime patch
- live skill application
- connector write
- external send
- recurring automation activation
- account / credential / secret 변경
- paid action
- destructive action
- public release / deploy / GitHub push
- 법률 / 금융 / 보안상 실질 영향이 있는 실행

승인이 필요한 경우 Codex는 이렇게 말해야 한다.

```text
여기부터는 로컬 후보가 아니라 실제 적용 경계입니다.
무엇이 바뀌는지, 되돌릴 수 있는지, 어떤 위험이 있는지 먼저 보여드리겠습니다.
```

## 5. 성장 후보의 최소 요건

성장 후보는 다음을 만족해야 한다.

- 어떤 사건에서 나왔는지 trace가 있다.
- 어떤 반복 문제를 줄이려는지 명확하다.
- 적용 대상과 적용 제외 대상이 있다.
- 현재 요청 우선 원칙을 침해하지 않는다.
- 권한을 확대하지 않는다.
- replay로 효과를 확인할 수 있다.
- 실패 시 rollback 또는 rejection이 가능하다.

다음은 성장 후보가 아니다.

- 좋은 말
- 일반 교훈
- 프롬프트 문장
- 단일 성공 사례
- 단일 실패 사례의 과잉 일반화
- 출처 없는 기억
- 사용자 의도와 무관한 최적화

## 6. T-cell과의 관계

GPAO-T에서 T-cell은 메모리 조각이 아니다.

T-cell은 다음 조건을 만족하는 작동 원리 단위다.

```text
x: 실제로 나타난 사건이나 발화
pi: 그 안에서 반복 가능하게 작동하는 원리
c: pi가 경계, trace, state, authority, lifecycle을 가진 운영 단위로 구현된 것
```

따라서 Self-Growth Loop는 raw event를 바로 규칙으로 만들지 않는다.

반드시 다음 경로를 지난다.

```text
event
-> pattern candidate
-> pi extraction
-> T-cell candidate
-> admission
-> replay
-> growth proposal
-> apply gate
```

## 7. OpenClaw 개조와의 관계

OpenClaw를 GPAO-T로 흡수하는 과정에서 자가성장 루프는 특히 중요하다.

OpenClaw에서 발견된 문제:

- `/new` 이후 맥락 회복 실패
- 검색 품질/속도 문제
- live state contract와 실제 prompt path의 불일치
- 사용자가 보기 어려운 실행/권한 경계

이 문제들은 바로 live patch로 덮지 않는다.

GPAO-T 방식:

```text
live symptom
-> local diagnosis
-> repo-level proof
-> controlled OpenClaw smoke
-> live behavior evidence
-> growth proposal
-> approval-gated apply
```

## 8. 금지된 성장

다음은 GPAO-T에서 금지한다.

- 현재 요청보다 과거 기억을 우선하는 성장
- 사용자 불안을 키우는 자동화
- 설명할 수 없는 개인화
- 실패를 숨기고 성공처럼 말하는 성장
- 권한 경계를 줄이는 성장
- live 검증 없는 live behavior claim
- replay 없는 rule promotion

## 9. 완료 조건

GPAO-T Self-Growth Loop가 작동한다고 말하려면 최소한 다음 증거가 필요하다.

- 반복 문제 또는 개선 기회가 trace로 잡힘
- growth proposal 생성
- replay fixture 또는 dry-run 검증
- 적용 권한 경계 표시
- 승인 전/후 상태 분리
- 적용 후 관찰 또는 rollback 기준

이 문서 자체는 자가성장 구현 완료 증거가 아니다.

2026-07-11 v1 구현 증거:

- `src/core/auto-memory-growth-loop.js`가 safe local signal을 자동으로 Memory Wiki capture, memory review queue, read-only replay, local approval/audit trace, rollback receipt가 붙은 Context Mesh candidate append, self-growth candidate record까지 연결한다.
- `GET /auto-memory-growth/policy`, `POST /auto-memory-growth/classify`, `POST /auto-memory-growth/run`, `GET /auto-memory-growth/summary`, `GET /auto-memory-growth/verify`를 Gateway에 연결했다.
- `gpao-t auto-memory-growth policy|classify|run|runs|summary|verify` CLI를 연결했다.
- `test/auto-memory-growth-loop.test.js`는 safe local automation, minimal approval boundary block, Gateway exposure, policy verification을 검증한다.

이 문서는 앞으로 GPAO-T가 스스로 성장할 때 지켜야 할 계약이다.
