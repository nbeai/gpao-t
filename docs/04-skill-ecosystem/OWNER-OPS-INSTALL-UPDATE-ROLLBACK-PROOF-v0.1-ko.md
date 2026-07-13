# Owner Ops Install / Update / Rollback Proof v0.1

## 목적

`Owner Ops Install / Update / Rollback Proof`는 Owner Ops 로컬 패키지 후보를 실제 사용자에게 전달하기 전에 설치, 업데이트, 롤백에서 어떤 증거가 필요할지 고정하는 로컬 증거 게이트다.

이 문서는 설치를 실행했다는 뜻이 아니다. 현재 상태는 `proof_requirements_ready_not_executed`이며, 실제 설치, 업데이트, 롤백, 데몬 실행, 외부 다운로드, 공개 업로드는 모두 닫혀 있다.

## 현재 확인하는 것

- local package candidate readback
- signed package evidence prerequisite
- GPAO-T install hardening report
- install/update/rollback readiness gates
- post-install / post-update / post-rollback verification 요구사항
- explicit owner approval 전 실행 차단

## 아직 하지 않는 것

- 실제 설치
- 실제 업데이트
- 실제 롤백
- 파괴적 롤백
- 데몬/백그라운드 실행
- 외부 다운로드
- 공개 업로드
- 고객 데이터 처리

## CLI

```bash
node bin/gpao-t.js owner-ops install-update-rollback-proof
node bin/gpao-t.js owner-ops install-update-rollback-proof-write
node bin/gpao-t.js owner-ops install-update-rollback-proof-check
```

## Gateway

```text
GET  /owner-ops/install-update-rollback-proof
POST /owner-ops/install-update-rollback-proof
GET  /owner-ops/install-update-rollback-proof/verify
```

## 공개/팀 배포 전 필요한 증거

- owner-approved signing lane 이후 signed package evidence
- signed artifact 기준 install dry-run plan
- version change 기준 update dry-run plan
- source/state recovery path가 있는 rollback dry-run plan
- post-install verification command list
- post-update verification command list
- post-rollback verification command list
- 실제 실행 전 명시적 owner approval

## 권한 경계

```text
installExecuted: false
updateExecuted: false
rollbackExecuted: false
destructiveRollbackExecuted: false
daemonActivationExecuted: false
externalDownloadExecuted: false
publicReleaseAllowed: false
packageUploadAllowed: false
```

## 다음 단계

이 gate가 ready여도 실제 설치 가능한 상태는 아니다. 다음 단계는 owner가 승인한 범위 안에서 signed artifact 또는 local candidate 기준 dry-run installer/update/rollback plan을 만드는 것이다.
