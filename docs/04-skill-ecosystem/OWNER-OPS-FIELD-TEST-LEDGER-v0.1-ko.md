# Owner Ops Field Test Ledger v0.1

Owner Ops Field Test Ledger는 팀원 alpha와 first-owner beta 테스트 결과를 로컬 evidence로 누적하기 위한 append-only 기록 표면이다.

## 목적

Owner Ops는 한국 자영업자에게 실제로 도움이 되어야 한다. 따라서 패키지와 readiness 문서만으로 끝내지 않고, 감독된 테스트 결과를 다음 조건으로 기록할 수 있어야 한다.

- 샘플 또는 비식별 데이터만 사용
- 고객 자동 전송 없음
- 라이브 계정 연결 없음
- 결제, 환불, 삭제 없음
- 공개 제출 또는 마켓 게시 없음
- 로컬 JSONL 기록만 남김

## CLI

```bash
node bin/gpao-t.js owner-ops field-test-ledger
node bin/gpao-t.js owner-ops field-test-record-append team_alpha record-owner-ops-field-test-local-only
node bin/gpao-t.js owner-ops field-test-records
node bin/gpao-t.js owner-ops field-test-ledger-check
```

## Gateway

```text
GET /owner-ops/field-test-ledger
POST /owner-ops/field-test-records
GET /owner-ops/field-test-records
GET /owner-ops/field-test-ledger/verify
```

## 기록 스키마 핵심

- `stage`: `team_alpha` 또는 `first_owner_beta`
- `host`: `codex`, `openclaw`, `claude_code`
- `industry`
- `dataMode`: 반드시 `sample_or_deidentified`
- `understoodNoAutoSend`: 반드시 `true`
- `actualCustomerSendExecuted`: 반드시 `false`
- `liveAccountConnected`: 반드시 `false`
- `paymentRefundDeleteExecuted`: 반드시 `false`
- `ratings`: 이해 쉬움, 쓸모, 신뢰, 설정 마찰
- `blockerTags`
- `requestedTemplates`
- `notes`

## 권한 경계

이 ledger가 ready라는 뜻은 테스트 결과를 로컬에 기록할 수 있다는 뜻이다. 다음을 의미하지 않는다.

- 고객 메시지 전송
- 외부 업로드
- OAuth/API 계정 연결
- 공개 마켓 게시
- public release
- 결제, 환불, 삭제
- durable memory promotion

## 제품축에서의 의미

`Product Axis Readiness Matrix`는 field validation phase에서 이 ledger를 확인한다. 이는 Owner Ops가 단순한 패키지 후보가 아니라 실제 팀원/첫 사장님 테스트 결과를 받아 개선 루프로 연결될 수 있는 제품축임을 증명하기 위한 것이다.
