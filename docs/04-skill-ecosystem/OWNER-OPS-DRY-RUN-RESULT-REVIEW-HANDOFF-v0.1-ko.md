# Owner Ops Dry-Run Result Review Handoff v0.1

## 목적

이 문서는 Owner Ops controlled dry-run simulation 결과를 사람이 검토할 수 있는
리뷰/핸드오프 패킷으로 바꾸는 단계를 정의한다.

이 단계는 실제 설치, 업데이트, 롤백이 아니다.  
이미 생성된 dry-run simulation record를 읽고, 다음 실행 설계 전에 사람이 확인해야 할 요약, 체크리스트, 증거 경로, 계속 차단되는 행동을 정리한다.

## 입력

```text
.gpao-t/owner-ops/dry-runs/dry-run-invocations.jsonl
.gpao-t/owner-ops/approvals/dry-run-approvals.jsonl
.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.manifest.json
```

## 출력

```text
.gpao-t/packages/OWNER-OPS-DRY-RUN-RESULT-REVIEW-HANDOFF-<LANE>.json
.gpao-t/packages/OWNER-OPS-DRY-RUN-RESULT-REVIEW-HANDOFF-<LANE>.md
```

## 사람이 확인해야 할 것

- 어떤 lane의 dry-run simulation인지
- 어떤 승인 기록에 연결되어 있는지
- package checksum이 무엇인지
- 명령 실행이 없었는지
- install / update / rollback이 모두 false인지
- 외부 다운로드, 서명, 공개 업로드가 없었는지
- 다음 단계가 실제 executor 설계인지, 수정 요청인지

## 계속 차단되는 것

- 실제 install / update / rollback
- 명령 실행
- package source/bundle 파일 변경
- 외부 다운로드
- 서명 / 공증
- 공개 업로드
- connector / MCP live activation
- 고객 데이터 전송

## CLI

```bash
node bin/gpao-t.js owner-ops dry-run-result-handoff install
node bin/gpao-t.js owner-ops dry-run-result-handoff-write install
node bin/gpao-t.js owner-ops dry-run-result-handoff-check install
```

dry-run invocation record가 없으면 이 handoff는 `review` 상태가 된다.

## 완료 기준

- dry-run invocation record가 없으면 handoff가 ready로 과장되지 않는다.
- dry-run invocation record가 있으면 사람이 읽을 수 있는 요약과 replay checklist가 생성된다.
- handoff가 생성되어도 실제 install / update / rollback은 false로 유지된다.
- CLI, Gateway, test가 같은 계약을 검증한다.
