# Owner Ops Field Test Action Queue v0.1

이 문서는 한국 자영업자용 Owner Ops field-test 기록을 실제 제품 개선 작업으로 바꾸는 로컬 증거 표면이다.

`Field Test Ledger`가 테스트 기록을 안전하게 저장한다면, `Field Test Action Queue`는 그 기록에서 다음 보강 항목을 뽑는다.

```text
field-test record
-> requested template
-> setup/trust/friction signal
-> local repair action
-> package review bridge
```

## 명령

```bash
node bin/gpao-t.js owner-ops field-test-action-queue
node bin/gpao-t.js owner-ops field-test-action-write
node bin/gpao-t.js owner-ops field-test-action-check
```

## Gateway

```text
GET /owner-ops/field-test-action-queue
POST /owner-ops/field-test-action-queue
GET /owner-ops/field-test-action-queue/verify
```

## 생성되는 큐

- `template_replay_fixture`: 테스트 사용자가 요청한 템플릿을 replay fixture 후보로 만든다.
- `owner_ux_copy`: 무엇을 붙여넣고 무엇이 잠겨 있는지 처음 쓰는 사장님이 이해하도록 보강한다.
- `trust_safety_copy`: 자동 발송 금지, 샘플/비식별 데이터, 사장님 확인 경계를 더 선명하게 만든다.
- `package_review`: field-test evidence가 pre-public review와 product-axis readback에 연결되게 한다.

## 권한 경계

이 큐는 개선 작업을 제안하는 로컬 증거다. 다음을 허용하지 않는다.

- 공개 마켓 등록
- marketplace upload
- 고객 메시지 발송
- live account 연결
- 결제/환불/삭제
- credential 읽기/쓰기
- durable memory promotion
- background automation

## 완료 기준

`field-test-action-check`가 `ready`가 되려면 다음이 필요하다.

- field-test ledger가 ready여야 한다.
- 최소 1개 이상의 field-test record가 있어야 한다.
- template replay fixture lane이 있어야 한다.
- owner UX copy lane이 있어야 한다.
- trust/safety copy lane이 있어야 한다.
- public/customer/live authority boundary가 닫혀 있어야 한다.

## 제품축 의미

이 표면이 추가되면 Owner Ops field validation은 단순히 “테스트 기록이 있다”가 아니라 “테스트 기록이 다음 제품 개선 작업으로 바뀐다”는 것을 증명할 수 있다.
