# Owner Ops Deployment Dry-Run Plan v0.1

Status: local evidence contract

이 문서는 한국 자영업자용 Owner Ops 패키지를 실제 설치, 업데이트, 롤백하기 전에 필요한 dry-run 계획 증거를 정의한다.

이 단계는 실행 단계가 아니다. 설치, 업데이트, 롤백, 파일 변경, 데몬 활성화, 외부 다운로드, 서명, 업로드, 공개 배포는 모두 닫혀 있다.

## 목적

Owner Ops 패키지 후보가 실제 사용자에게 전달되기 전에 다음 세 가지 질문에 답한다.

- 설치 전에 어떤 파일과 checksum을 확인해야 하는가?
- 업데이트 전에 어떤 버전/파일 변경 영향을 확인해야 하는가?
- 실패 시 어떤 기준으로 롤백할 수 있는가?

## 입력 증거

- `.gpao-t/packages/gpao-t-owner-ops-*-local-candidate.bundle.json`
- `.gpao-t/packages/gpao-t-owner-ops-*-local-candidate.manifest.json`
- `.gpao-t/packages/gpao-t-owner-ops-*-local-candidate.sha256`
- `.gpao-t/packages/OWNER-OPS-INSTALL-UPDATE-ROLLBACK-PROOF.json`

## Dry-Run Lanes

### 1. 로컬 설치 dry-run

확인 항목:

- manifest schema와 package version readback
- bundle sha256과 checksum 일치
- embedded file count와 manifest fileCount 일치
- 고객 데이터나 credential 파일 후보가 포함되지 않았는지 확인
- post-install verification command list 존재

중단 조건:

- checksum mismatch
- manifest 또는 bundle 누락
- 예기치 않은 실행 side effect 후보
- 고객 데이터 또는 credential file 후보 발견

### 2. 로컬 업데이트 dry-run

확인 항목:

- package version comparison
- 추가/변경/삭제 파일 영향 요약
- command surface 하위 호환성
- post-update verification command list 존재

중단 조건:

- rollback 의도 없는 version downgrade
- migration note 없는 command 제거
- state directory migration 설명 누락

### 3. 로컬 롤백 dry-run

확인 항목:

- previous package reference 존재
- 현재 package quarantine 가능성
- local state backup path 확인
- post-rollback verification command list 존재

중단 조건:

- previous package reference 누락
- local state backup path 누락
- 사용자 데이터 삭제 위험
- rollback verification command 누락

## 실행 금지 경계

이 게이트는 다음을 실행하지 않는다.

- install
- update
- rollback
- file mutation
- daemon activation
- external download
- public upload
- signing

## 명령

```bash
node bin/gpao-t.js owner-ops deployment-dry-run-plan
node bin/gpao-t.js owner-ops deployment-dry-run-write
node bin/gpao-t.js owner-ops deployment-dry-run-check
```

## Gateway

```text
GET  /owner-ops/deployment-dry-run-plan
POST /owner-ops/deployment-dry-run-plan
GET  /owner-ops/deployment-dry-run-plan/verify
```

## 다음 단계

이 계획이 `ready`여도 실제 설치/업데이트/롤백이 허용되는 것은 아니다. 다음 단계는 owner approval이 있는 별도 executor lane이며, 그 전까지는 dry-run evidence로만 사용한다.
