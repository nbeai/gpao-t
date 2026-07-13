# Owner Ops Dry-Run Approval Record Write Lane v0.1

## 목적

이 문서는 Owner Ops 패키지의 install / update / rollback dry-run을 실제로 호출하기 전에,
사용자 승인을 로컬 기록으로 남기는 write lane을 정의한다.

이 단계는 dry-run 실행이 아니다.  
승인 기록을 `.gpao-t/owner-ops/approvals/` 아래에 append-only JSONL로 남기는 로컬 기록 단계다.

## 승인 조건

승인 기록 append는 다음 조건을 모두 만족해야 한다.

- `requestedLane`은 `install`, `update`, `rollback` 중 하나여야 한다.
- `decision`은 `approve_dry_run_invocation`이어야 한다.
- `approvalToken`은 `approve-owner-ops-<lane>-dry-run`과 정확히 일치해야 한다.
- local package candidate의 bundle checksum과 approval record design의 checksum이 맞아야 한다.
- `expiresAt`은 현재 시각 이후여야 한다.
- 승인 범위는 dry-run invocation 준비까지만 허용한다.

## 저장 위치

```text
.gpao-t/owner-ops/approvals/
  dry-run-approvals.jsonl
  index.json
```

`dry-run-approvals.jsonl`은 append-only 기록이다.  
`index.json`은 최신 기록 id, lane, decision, record count를 빠르게 확인하기 위한 읽기용 인덱스다.

## 계속 차단되는 것

이 lane은 다음을 열지 않는다.

- dry-run invocation
- 실제 install / update / rollback
- 명령 실행
- approval store 밖 파일 변경
- 외부 다운로드
- 서명 / 공증
- 공개 업로드
- 고객 데이터 전송
- connector / MCP live activation

## CLI

```bash
node bin/gpao-t.js owner-ops dry-run-approval-record-lane install
node bin/gpao-t.js owner-ops dry-run-approval-record-append install approve-owner-ops-install-dry-run
node bin/gpao-t.js owner-ops dry-run-approval-records
node bin/gpao-t.js owner-ops dry-run-approval-record-lane-check install
```

토큰 없이 append를 호출하면 `blocked`가 반환되고 기록은 쓰이지 않는다.

## Gateway

```text
GET  /owner-ops/dry-run-approval-record-lane
POST /owner-ops/dry-run-approval-record-append
GET  /owner-ops/dry-run-approval-records
GET  /owner-ops/dry-run-approval-record-lane/verify
```

## 완료 기준

이 lane이 완료됐다고 말하려면 다음이 증명되어야 한다.

- 정확한 승인 토큰 없이는 append가 차단된다.
- 정확한 승인 토큰이 있을 때만 로컬 approval JSONL과 index가 생성된다.
- 기록이 생겨도 dry-run은 호출되지 않는다.
- install / update / rollback 실행은 계속 차단된다.
- CLI, Gateway, test가 같은 계약을 검증한다.
