# Owner Ops Broader Owner Testing Handoff v0.1

## Status

`local-ready / public-release-closed`

이 문서는 한국 자영업자용 Owner Ops 자동화 도구를 더 넓은 사람 테스트로 넘기기 전 확인해야 하는 로컬 인계 기준이다.

이 단계는 공개 배포가 아니다. 마켓 업로드도 아니다. 실제 고객 계정 연결도 아니다.

## Purpose

Owner Ops는 다음 순서로 사람 테스트 전환을 준비한다.

```text
field-test ledger
-> field-test action queue
-> field-test repair completion evidence
-> broader owner testing handoff
```

즉, 피드백을 받았다는 기록만으로 다음 테스트에 넘기지 않는다. 피드백이 수리 항목으로 바뀌고, 그 수리 항목이 로컬 완료 증거로 닫힌 뒤에만 더 넓은 자영업자 테스트로 넘어간다.

## Required Evidence

Broader owner testing handoff는 다음 증거를 요구한다.

- local package candidate readback
- public release readback snapshot
- field-test repair completion evidence
- sample/de-identified tester instruction
- reviewer checklist
- public/live/customer authority boundary

## Tester Rules

테스터에게 전달할 때의 기본 규칙은 다음과 같다.

- 샘플 데이터 또는 비식별 데이터만 사용한다.
- 실제 스토어, 메신저, 결제, 리뷰, 캘린더, 고객 계정은 연결하지 않는다.
- 테스트 결과물을 실제 고객에게 보내지 않는다.
- 출력은 자동 실행 결과가 아니라 사장님 검토용 초안으로 본다.
- 피드백은 로컬 field-test ledger에 기록한 뒤 제품 증거로 사용한다.

## Reviewer Checklist

리뷰어는 다음을 확인한다.

- 비개발자 사장님이 무엇을 붙여넣어야 하는지 이해하는가?
- 실제 발송이나 실제 계정 연결이 일어나지 않았다는 점이 명확한가?
- 사장님이 쓸 만한 초안이나 업무 흐름 미리보기가 나오는가?
- 부족한 템플릿이나 헷갈리는 문구가 수리 항목으로 잡히는가?
- 설치, 업데이트, 롤백, 마켓 업로드가 여전히 닫혀 있다는 점이 보이는가?

## Authority Boundary

허용:

- supervised team alpha continuation
- supervised first-owner beta expansion
- sample/de-identified data only
- local package evidence review
- local feedback recording

차단:

- public release
- marketplace upload
- package upload
- signing
- install/update/rollback execution
- customer send
- live account connection
- payment/refund/delete
- credential access
- durable memory promotion
- background automation

## Commands

```bash
node bin/gpao-t.js owner-ops broader-owner-testing-handoff
node bin/gpao-t.js owner-ops broader-owner-testing-handoff-write
node bin/gpao-t.js owner-ops broader-owner-testing-handoff-check
```

## Gateway

```text
GET  /owner-ops/broader-owner-testing-handoff
POST /owner-ops/broader-owner-testing-handoff
GET  /owner-ops/broader-owner-testing-handoff/verify
```

## Product Meaning

이 handoff가 `ready`라는 말은 다음을 뜻한다.

```text
로컬 패키지와 필드 테스트 수리 증거가 사람 테스트로 넘길 만큼 정리되어 있다.
```

이 handoff가 `ready`라는 말은 다음을 뜻하지 않는다.

```text
공개 배포가 승인되었다.
마켓 업로드가 가능하다.
실제 고객 계정을 연결해도 된다.
실제 메시지를 보내도 된다.
설치/업데이트/롤백을 실행해도 된다.
```

