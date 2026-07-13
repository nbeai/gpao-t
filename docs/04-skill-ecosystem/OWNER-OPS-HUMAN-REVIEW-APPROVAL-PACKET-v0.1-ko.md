# Owner Ops Human Review Approval Packet v0.1

## 목적

Owner Ops 공개/마켓/팀 배포 전 사람이 확인해야 할 승인 항목을 하나의 로컬 패킷으로 만든다.

이 패킷은 승인이 아니다. `prepared_not_approved` 상태로 생성되며, public release, package upload, signing, install/update/rollback, external distribution은 계속 막힌다.

## CLI

```bash
node bin/gpao-t.js owner-ops human-review-approval-packet
node bin/gpao-t.js owner-ops human-review-approval-write
node bin/gpao-t.js owner-ops human-review-approval-check
```

## Gateway

```text
GET  /owner-ops/human-review-approval-packet
POST /owner-ops/human-review-approval-packet
GET  /owner-ops/human-review-approval-packet/verify
```

## 다음 단계

이 패킷을 검토한 뒤에는 `Owner Ops Human Review Decision Lane`에서 로컬 결정 기록을 남긴다.

```bash
node bin/gpao-t.js owner-ops human-review-decision-lane
node bin/gpao-t.js owner-ops human-review-decision-check
```

결정 기록은 별도 승인 토큰이 있을 때만 `.gpao-t/owner-ops/human-review/decision-records.jsonl`에 append된다.

이 결정 기록도 public release, marketplace upload, signing, install/update/rollback 실행을 열지 않는다.

## 검토 항목

- 패키지 목적과 대상 사용자가 맞는가?
- 고객 개인정보/실데이터가 패키지에 포함되지 않았는가?
- 자동 전송 안 함, 외부 계정 연결 안 함, 로컬 기록만이라는 설명이 명확한가?
- 베타 피드백 수리 항목이 로컬 기준으로 완료 검증됐는가?
- 설치/업데이트/롤백 안내 문구가 사용자가 이해할 수 있는가?
- 마켓/플러그인 설명 문구를 공개해도 되는가?
- 공개 배포를 명시적으로 승인하는가?

## 계속 막힌 것

- public release
- package upload
- signing/notarization
- install/update/rollback
- external distribution

## Pre-Public Repair Completion Evidence

이 패킷은 `OWNER-OPS-PRE-PUBLIC-REPAIR-COMPLETION-EVIDENCE.json`을 evidence ref로 포함한다.

검토자는 공개 배포 여부를 판단하기 전에 다음을 확인해야 한다.

- repair item 전체가 `locally_verified` 상태인가?
- `template_replay_fixture`, `privacy_copy`, `owner_ux_copy`, `package_review` lane이 모두 포함됐는가?
- 수리 완료 증거가 public release, upload, signing, customer send, install/update/rollback 실행을 의미하지 않는가?
