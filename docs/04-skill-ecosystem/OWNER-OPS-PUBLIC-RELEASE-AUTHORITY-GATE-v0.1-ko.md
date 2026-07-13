# Owner Ops Public Release Authority Gate v0.1

## Purpose

Owner Ops Public Release Authority Gate는 공개 배포를 실행하는 기능이 아니다.

이 게이트는 Owner Ops 패키지가 공개 배포, 마켓 업로드, 서명, 설치/업데이트/롤백 실행으로 넘어가기 전에 무엇이 아직 막혀 있는지 확인하는 최종 권한 경계다.

## Current Product State

현재 Owner Ops는 다음 상태까지 올 수 있다.

- skill pack ready
- MCP / connector readiness ready
- plugin / market package draft ready
- local package candidate ready
- pre-public repair completion ready
- human review approval packet ready
- human review decision lane ready
- approved signing lane prepared
- marketplace/upload approval gate prepared
- marketplace/upload decision lane prepared

하지만 공개 배포는 별도 권한이다.

## Required Before Public Release

공개 배포 전에 최소한 다음이 필요하다.

- explicit human review decision record approving public release
- approved signing lane
- signed artifact evidence
- checksum readback after signing
- signature verification output
- platform notarization evidence when required
- install/update/rollback proof against signed artifact
- separate marketplace/upload approval
- marketplace/upload decision record

## Authority Boundary

이 게이트는 다음을 허용하지 않는다.

- public release
- marketplace upload
- package signing
- signed artifact write
- customer send
- credential access
- install execution
- update execution
- rollback execution
- external distribution

`public-release-gate-check`가 `ready`라는 뜻은 공개 배포가 허용됐다는 뜻이 아니다.

정확한 의미는 다음과 같다.

```text
공개 배포 게이트가 올바르게 닫혀 있고,
필요한 차단 사유와 다음 승인 조건이 명확하다.
```

## CLI

```bash
node bin/gpao-t.js owner-ops public-release-gate
node bin/gpao-t.js owner-ops public-release-gate-check
node bin/gpao-t.js owner-ops approved-signing-lane
node bin/gpao-t.js owner-ops approved-signing-lane-check
node bin/gpao-t.js owner-ops marketplace-upload-approval-gate
node bin/gpao-t.js owner-ops marketplace-upload-approval-gate-check
node bin/gpao-t.js owner-ops marketplace-upload-decision-lane
node bin/gpao-t.js owner-ops marketplace-upload-decision-check
```

## Gateway

```text
GET /owner-ops/public-release-gate
GET /owner-ops/public-release-gate/verify
GET /owner-ops/approved-signing-lane
GET /owner-ops/approved-signing-lane/verify
GET /owner-ops/marketplace-upload-approval-gate
GET /owner-ops/marketplace-upload-approval-gate/verify
GET /owner-ops/marketplace-upload-decision-lane
GET /owner-ops/marketplace-upload-decision-lane/verify
```

## Next Safe Action

공개 배포로 넘어가려면 먼저 사람이 human review decision record를 남겨야 한다.

그 후에도 signing lane, signed artifact evidence, install/update/rollback proof against signed artifact, marketplace/upload approval이 별도 게이트로 필요하다.
