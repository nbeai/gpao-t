# Owner Ops Final Candidate Owner Decision Lane v0.1

## 목적

이 문서는 Owner Ops의 `Final Local Release Candidate Decision Packet`을 읽은 뒤 owner가 어떤 결정을 남길 수 있는지 정의하는 local-only decision lane이다.

이 lane은 최종 로컬 후보 검토 결정을 남기기 위한 표면이다. 공개 배포 승인, 마켓 업로드 승인, 서명 실행, 설치/업데이트/롤백 실행을 열지 않는다.

## 허용 결정

- `continue_supervised_testing`: 감독형 테스트를 한 번 더 진행한다.
- `request_revision`: 수정 요청 또는 repair signal로 되돌린다.
- `approve_local_candidate_review`: 로컬 후보 검토를 승인 상태로 기록한다.
- `consider_public_release_later`: 공개 배포 검토는 별도 승인 공정에서 나중에 진행한다.

## 명령

```bash
gpao-t owner-ops final-candidate-owner-decision-lane
gpao-t owner-ops final-candidate-owner-decision-append [decision] [approval-token]
gpao-t owner-ops final-candidate-owner-decision-records
gpao-t owner-ops final-candidate-owner-decision-check
```

## Gateway

```text
GET  /owner-ops/final-candidate-owner-decision-lane
POST /owner-ops/final-candidate-owner-decision-records
GET  /owner-ops/final-candidate-owner-decision-records
GET  /owner-ops/final-candidate-owner-decision-lane/verify
```

## 기록 경계

결정 기록은 `.gpao-t/owner-ops/final-candidate/owner-decision-records.jsonl`에 local-only로 남는다.

토큰 없이 쓰기는 막힌다. 쓰기 토큰은 owner가 명시적으로 local decision을 기록하려는 경우에만 사용한다.

## 권한 경계

이 lane은 다음을 실행하지 않는다.

- public release
- marketplace upload
- package upload
- signing
- install/update/rollback
- customer send
- live account connection
- credential access
- external distribution

## 판정

`ready`는 final local candidate packet이 준비됐고, owner decision을 local-only로 기록할 수 있는 표면이 준비됐다는 뜻이다. `ready`는 공개 배포 가능 상태가 아니다.
