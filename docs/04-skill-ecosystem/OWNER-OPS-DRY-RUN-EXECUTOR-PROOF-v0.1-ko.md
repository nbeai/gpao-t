# Owner Ops Dry-Run Executor Proof v0.1

Status: local pre-executor proof

이 문서는 Owner Ops 패키지의 설치, 업데이트, 롤백 dry-run executor를 실제로 호출하기 전 필요한 승인 packet, 호출 preview, simulated result, authority boundary를 정의한다.

이 단계는 executor 실행 단계가 아니다. 승인 기록 쓰기, dry-run 호출, 설치, 업데이트, 롤백, 파일 변경, 명령 실행, 데몬 활성화, 외부 다운로드, 서명, 공개 업로드는 모두 닫혀 있다.

## 목적

`Deployment Dry-Run Plan`은 무엇을 확인해야 하는지 정의한다.  
`Dry-Run Executor Proof`는 그 계획 중 하나의 lane을 실제 executor로 넘기기 전에 다음을 고정한다.

- 어떤 lane을 요청하는가?
- 어떤 owner approval token이 필요한가?
- 어떤 입력을 읽을 예정인가?
- 어떤 결과를 낼 예정인가?
- 어떤 작업은 절대 실행하지 않는가?

## 대상 Lane

지원 lane:

- `install`
- `update`
- `rollback`

기본 lane은 `install`이다.

## Approval Packet

승인 packet 기본 상태:

```text
prepared_not_approved
```

필수 결정:

```text
approve_dry_run_invocation
```

승인 token 형식:

```text
approve-owner-ops-{lane}-dry-run
```

## Invocation Preview

각 lane은 다음을 보여줘야 한다.

- planned inputs
- planned checks
- stop conditions
- expected output
- execution state

execution state는 반드시 다음 상태로 시작한다.

```text
not_invoked
```

## Simulated Result

이 proof는 실제 executor 호출 없이 다음을 보여준다.

- wouldRead
- wouldWrite
- wouldExecuteCommands
- wouldMutateFiles
- wouldActivateDaemon
- wouldDownloadExternally

`wouldWrite`와 `wouldExecuteCommands`는 빈 배열이어야 한다.

## 실행 금지 경계

이 게이트는 다음을 실행하지 않는다.

- approval write
- dry-run invocation
- install
- update
- rollback
- file mutation
- command execution
- daemon activation
- external download
- signing
- public upload

## 명령

```bash
node bin/gpao-t.js owner-ops dry-run-executor-proof install
node bin/gpao-t.js owner-ops dry-run-executor-write install
node bin/gpao-t.js owner-ops dry-run-executor-check install
```

## Gateway

```text
GET  /owner-ops/dry-run-executor-proof
POST /owner-ops/dry-run-executor-proof
GET  /owner-ops/dry-run-executor-proof/verify
```

## 다음 단계

이 proof가 `ready`여도 dry-run executor 호출이 허용되는 것은 아니다. 다음 단계는 owner approval record write와 dry-run invocation을 분리해서 설계해야 한다.
