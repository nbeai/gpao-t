# Owner Ops Signed Package Evidence v0.1

## 목적

`Owner Ops Signed Package Evidence`는 Owner Ops 내부 프로덕션 패키지를 공개 배포 검토나 감독된 내부 배포로 넘기기 전에, 서명/검증/설치 증거가 무엇이어야 하는지 고정하는 로컬 증거 게이트다.

이 문서는 서명을 실행했다는 뜻이 아니다. 현재 v0.1 상태는 `unsigned_local_candidate`이며, 실제 서명, 공증, 업로드, 설치, 업데이트, 롤백은 모두 닫혀 있다.

## 현재 허용되는 것

- 내부 프로덕션 패키지 readback 확인
- release readiness evidence 확인
- human review approval packet 확인
- approved signing lane 준비 상태 확인
- 서명 전 필요한 증거 목록 생성
- local-only evidence JSON/Markdown 기록

## 아직 닫힌 것

- signed archive 생성
- signed installer 생성
- signing/notarization 실행
- public package upload
- install/update/rollback 실행
- 외부 배포
- customer send
- credential/account access

## CLI

```bash
node bin/gpao-t.js owner-ops signed-package-evidence
node bin/gpao-t.js owner-ops signed-package-evidence-write
node bin/gpao-t.js owner-ops signed-package-evidence-check
node bin/gpao-t.js owner-ops approved-signing-lane
node bin/gpao-t.js owner-ops approved-signing-lane-check
node bin/gpao-t.js owner-ops marketplace-upload-approval-gate
node bin/gpao-t.js owner-ops marketplace-upload-approval-gate-check
```

## Gateway

```text
GET  /owner-ops/signed-package-evidence
POST /owner-ops/signed-package-evidence
GET  /owner-ops/signed-package-evidence/verify
GET  /owner-ops/approved-signing-lane
GET  /owner-ops/approved-signing-lane/verify
GET  /owner-ops/marketplace-upload-approval-gate
GET  /owner-ops/marketplace-upload-approval-gate/verify
```

## 공개 배포 전 필요한 증거

- 명시적 owner approval packet 결정
- approved signing lane
- signed archive 또는 signed installer
- signing 이후 checksum readback
- signature verification output
- 플랫폼 필요 시 notarization evidence
- signed artifact 기준 install/update/rollback proof
- 별도 marketplace/upload approval gate

## 권한 경계

이 게이트는 배포 실행 게이트가 아니라 배포 전 증거 요구사항 게이트다.

```text
signingExecuted: false
signedArtifactWritten: false
publicReleaseAllowed: false
packageUploadAllowed: false
installAllowed: false
updateAllowed: false
rollbackAllowed: false
externalDistributionAllowed: false
```

## 다음 단계

이 게이트가 ready여도 아직 배포 가능한 상태는 아니다. 다음 단계는 owner가 human review packet을 검토하고, 이후 별도의 signing lane / installer lane / update-rollback proof를 승인할지 결정하는 것이다.

`approved-signing-lane-check`가 ready라는 뜻도 signing 실행 허가가 아니다. 정확한 의미는 signing lane이 준비되어 있고, certificate access/sign/notarization/upload/install/update/rollback 권한이 아직 닫혀 있다는 뜻이다.

`marketplace-upload-approval-gate-check`가 ready라는 뜻도 업로드 허가가 아니다. 정확한 의미는 marketplace/upload 승인 조건과 대상이 준비되어 있고, public upload/network/credential 권한이 아직 닫혀 있다는 뜻이다.
