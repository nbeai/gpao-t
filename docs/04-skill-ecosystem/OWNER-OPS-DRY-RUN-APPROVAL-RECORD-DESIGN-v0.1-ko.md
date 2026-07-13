# Owner Ops Dry-Run Approval Record Design v0.1

Status: local approval-write design

이 문서는 Owner Ops dry-run executor invocation을 열기 전에 필요한 approval record write 구조를 정의한다.

이 단계는 승인 기록을 실제로 쓰는 단계가 아니다. approval record append, dry-run invocation, 설치, 업데이트, 롤백, 파일 변경, 명령 실행, 데몬 활성화, 외부 다운로드, 서명, 공개 업로드는 모두 닫혀 있다.

## 목적

`Dry-Run Executor Proof`는 executor 호출 직전의 승인 packet과 invocation preview를 만든다.  
`Dry-Run Approval Record Design`은 그 승인 packet을 나중에 어떤 형식으로 로컬 기록에 남길지 정의한다.

## 저장 위치 설계

```text
.gpao-t/owner-ops/approvals/
.gpao-t/owner-ops/approvals/dry-run-approvals.jsonl
.gpao-t/owner-ops/approvals/index.json
```

저장 방식:

```text
future_append_only
```

현재 상태:

```text
not_executed
```

## Approval Record 필수 필드

- `id`
- `createdAt`
- `reviewer`
- `decision`
- `requestedLane`
- `approvalToken`
- `packageId`
- `packageVersion`
- `bundleSha256`
- `allowedEffect`
- `expiresAt`
- `sourceProofRef`

## 허용 결정값

```text
hold
revise
approve_dry_run_invocation
```

## 검증 규칙

- decision은 `approve_dry_run_invocation`이어야 한다.
- approvalToken은 요청 lane과 일치해야 한다.
- requestedLane은 executor proof lane과 일치해야 한다.
- bundleSha256은 local package candidate와 일치해야 한다.
- approval은 invocation 전에 만료되지 않아야 한다.
- approval은 install/update/rollback 실행 권한이 아니다.
- approval은 file mutation, signing, upload, external download 권한이 아니다.

## 거부 조건

- 필수 필드 누락
- 잘못된 approval token
- lane mismatch
- package checksum drift
- expired approval
- dry-run invocation을 넘어선 scope
- install/update/rollback 실행 시도
- file mutation 또는 external operation 시도

## 실행 금지 경계

이 게이트는 다음을 실행하지 않는다.

- approval record write
- dry-run invocation
- install
- update
- rollback
- file mutation
- command execution
- external download
- signing
- public upload

## 명령

```bash
node bin/gpao-t.js owner-ops dry-run-approval-record-design install
node bin/gpao-t.js owner-ops dry-run-approval-record-write install
node bin/gpao-t.js owner-ops dry-run-approval-record-check install
```

`write` 명령은 design evidence 파일을 쓰는 명령이다. 실제 approval JSONL append가 아니다.

## Gateway

```text
GET  /owner-ops/dry-run-approval-record-design
POST /owner-ops/dry-run-approval-record-design
GET  /owner-ops/dry-run-approval-record-design/verify
```

## 다음 단계

이 design이 `ready`여도 승인 기록 쓰기나 dry-run 호출이 허용되는 것은 아니다. 다음 단계는 별도 owner-approved approval record write lane이며, 그 이후에야 dry-run invocation lane을 검토한다.
