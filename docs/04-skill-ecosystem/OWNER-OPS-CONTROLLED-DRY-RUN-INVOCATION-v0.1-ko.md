# Owner Ops Controlled Dry-Run Invocation v0.1

## 목적

이 문서는 Owner Ops 패키지의 install / update / rollback lane에 대해
실제 실행 전 dry-run simulation을 여는 조건을 정의한다.

이 단계는 실제 설치, 업데이트, 롤백이 아니다.  
사용자 승인 기록을 확인한 뒤, 로컬 시뮬레이션 결과를 `.gpao-t/owner-ops/dry-runs/`에 남기는 단계다.

## 선행 조건

controlled dry-run invocation은 다음 조건을 만족해야 한다.

- local package candidate가 준비되어 있어야 한다.
- deployment dry-run plan이 ready여야 한다.
- dry-run executor proof가 ready여야 한다.
- dry-run approval record design이 ready여야 한다.
- `approve-owner-ops-<lane>-dry-run` 토큰으로 생성된 승인 기록이 있어야 한다.
- 승인 기록은 만료되지 않아야 한다.
- 승인 기록의 bundle sha256이 현재 package candidate와 일치해야 한다.

## 저장 위치

```text
.gpao-t/owner-ops/dry-runs/
  dry-run-invocations.jsonl
  index.json
```

## 허용되는 것

- 승인 기록 읽기
- package candidate metadata 읽기
- dry-run lane 시뮬레이션 결과 기록
- replay / rollback reference를 위한 로컬 증거 생성

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
node bin/gpao-t.js owner-ops controlled-dry-run-gate install
node bin/gpao-t.js owner-ops controlled-dry-run-invoke install
node bin/gpao-t.js owner-ops controlled-dry-run-records
node bin/gpao-t.js owner-ops controlled-dry-run-check install
```

승인 기록이 없으면 `controlled-dry-run-invoke`는 `blocked`를 반환하고 dry-run record를 쓰지 않는다.

## 완료 기준

- 승인 기록 없이는 dry-run invocation이 차단된다.
- 유효한 승인 기록이 있으면 로컬 dry-run simulation record만 기록된다.
- dry-run invocation record가 생겨도 install / update / rollback은 false로 유지된다.
- CLI, Gateway, test가 같은 계약을 검증한다.
