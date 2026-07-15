# Owner Ops Supervised Testing Readiness Packet v0.1

이 문서는 한국 자영업자용 Owner Ops 자동화 도구를 팀원 alpha 또는 첫 자영업자 beta 테스트에 넘기기 직전에 확인하는 read-only 준비 표면이다.

이 packet은 테스트를 시작해도 되는지 판단하는 보조 자료일 뿐, owner decision, 공개 배포, 마켓 업로드, 설치 실행, 실계정 연결, 고객 발송을 승인하지 않는다.

## CLI

```bash
gpao-t owner-ops supervised-testing-readiness
gpao-t owner-ops supervised-testing-readiness-check
```

## Gateway

```text
GET /owner-ops/supervised-testing-readiness
GET /owner-ops/supervised-testing-readiness/verify
```

## Purpose

`Production Completion Audit`가 `localProductAxisReady: true`를 반환해도, 실제 사람에게 테스트를 맡기려면 별도의 테스트 운용 기준이 필요하다.

이 packet은 다음을 한 장으로 묶는다.

- local product axis readiness
- internal production package review packet
- next owner testing loop
- internal production owner decision next-action packet
- public release authority closed state

## Tester Scope

허용되는 테스트 범위:

- 내부 팀원 alpha
- 감독된 첫 자영업자 beta
- 샘플 데이터 또는 비식별 데이터
- 로컬 작업 흐름 확인
- 결과 preview와 authority boundary 확인
- 테스트 피드백 기록

금지되는 테스트 범위:

- 실고객 발송
- 실제 credential 입력
- 실제 스토어/예약/메신저 계정 연결
- 결제, 환불, 삭제, 주문 변경
- 공개 마켓 업로드
- 설치/업데이트/롤백 실행

## Stop Rules

다음 상황이 나오면 테스트를 중단한다.

- 실제 credential 입력이 필요해진다.
- 고객에게 무언가를 보내라는 흐름이 나온다.
- 결제, 환불, 삭제, 주문 변경이 필요해진다.
- 테스트 사용자가 권한 경계를 이해하지 못한다.
- 패키지 해시나 readback이 현재 로컬 후보와 맞지 않는다.

## Pass Criteria

통과 기준은 다음이다.

- 비개발자 자영업자가 도구가 무엇을 하고 무엇을 하지 않는지 이해한다.
- 실계정, 고객 발송, 결제/환불/삭제, credential 없이 테스트할 수 있다.
- 한국 소상공인/자영업자의 실제적인 업무 시나리오 하나 이상에서 유용한 로컬 결과를 낸다.
- 피드백이 repair queue 또는 next owner testing loop로 전환될 수 있다.

## Authority Boundary

이 packet은 항상 다음을 false로 유지한다.

```text
ownerDecisionRecordedNow
publicReleaseAllowed
marketplaceUploadAllowed
packageUploadAllowed
signingAllowed
installAllowed
updateAllowed
rollbackAllowed
customerSendAllowed
liveAccountConnectionAllowed
credentialAccessAllowed
paymentRefundDeleteAllowed
durableMemoryPromotionAllowed
```

## Use

이 packet이 `ready`이면 다음 행동은 감독 테스트다.

```text
team alpha / first owner beta
-> feedback
-> repair queue or next testing loop
-> internal-production owner decision
```

이 packet만으로 final objective가 완료되지는 않는다.
