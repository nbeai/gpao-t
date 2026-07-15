# Owner Ops Final Local Release Candidate Decision Packet v0.1

## 목적

이 문서는 한국 자영업자용 Owner Ops 자동화 도구의 로컬 패키지 후보, public release readback, 다음 owner testing loop, release authority gate, human/marketplace decision record를 한 화면에서 검토하기 위한 최종 로컬 후보 판단 표면이다.

`ready`는 공개 배포 완료가 아니다. `ready`는 “로컬 기준으로 owner가 최종 후보를 읽고 판단할 수 있다”는 뜻이다.

## 포함 증거

- local package candidate readback
- public release readback snapshot
- next owner testing loop
- public release authority gate
- human review decision records
- marketplace/upload decision records

## 명령

```bash
gpao-t owner-ops final-local-release-candidate
gpao-t owner-ops final-local-release-candidate-write
gpao-t owner-ops final-local-release-candidate-check
```

## Gateway

```text
GET  /owner-ops/final-local-release-candidate
POST /owner-ops/final-local-release-candidate
GET  /owner-ops/final-local-release-candidate/verify
```

## 권한 경계

이 패킷은 판단 표면일 뿐이며 다음을 실행하지 않는다.

- public release
- marketplace upload
- package upload
- signing
- install/update/rollback
- customer send
- live account connection
- credential access
- external distribution

## 외부 배포 전 필요 조건

- public release를 명시적으로 승인하는 human review decision record
- marketplace upload를 의도할 경우 별도 marketplace/upload decision record
- 선택된 signing target과 owner-approved signing lane
- signed artifact evidence와 checksum readback
- signed artifact 기준 install/update/rollback proof
- 최종 owner public upload/external distribution 승인

## 판정

이 문서가 패키지에 포함되고 check가 `ready`가 되면 Owner Ops는 로컬 최종 후보 검토 표면을 가진다. 그래도 공개 배포와 외부 실행 권한은 계속 닫혀 있어야 한다.
