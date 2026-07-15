# Owner Ops Release Readiness Evidence v0.1

## 목적

Owner Ops를 공개/마켓/팀 배포로 넘기기 전에 필요한 로컬 release readiness evidence를 한 곳에 묶는다.

이 gate는 배포 실행이 아니다. signed package, install/update/rollback, human review approval 조건을 확인하되, 실제 signing, upload, install, update, rollback, public release는 열지 않는다.

## CLI

```bash
node bin/gpao-t.js owner-ops release-readiness-evidence
node bin/gpao-t.js owner-ops release-readiness-check
```

## Gateway

```text
GET /owner-ops/release-readiness-evidence
GET /owner-ops/release-readiness-evidence/verify
```

## 포함 증거

- pre-public evidence bridge
- pre-public repair backlog
- pre-public repair completion evidence
- distribution evidence
- archive/checksum dry-run
- internal production package readback
- signed package evidence boundary
- install/update/rollback readiness
- human review approval boundary

## 계속 막힌 것

- public release
- public marketplace submission
- package registry upload
- signing/notarization execution
- install/update/rollback execution
- external distribution

## Pre-Public Repair Requirement

release readiness는 distribution evidence만 확인하지 않는다.

베타 피드백이 `template_replay_fixture`, `privacy_copy`, `owner_ux_copy`, `package_review` repair lane으로 전환된 `pre-public repair backlog`가 ready여야 한다.

이 조건은 공개 배포를 허용하기 위한 것이 아니라, 공개 후보가 베타 피드백 수리 공정을 우회하지 못하게 하는 로컬 품질 조건이다.

## Pre-Public Repair Completion Requirement

release readiness는 repair backlog의 존재만으로 ready가 되지 않는다.

각 repair item이 `locally_verified` 상태인 `pre-public repair completion evidence`가 ready여야 한다.

이 조건은 수리 완료 판단을 release readiness에 연결하기 위한 로컬 증거 조건이며, public release, upload, signing, install/update/rollback 실행을 열지 않는다.

## 다음 안전 행동

이 evidence가 ready여도 공개 배포는 허용되지 않는다. 다음 단계는 실제 사용자 승인, signing evidence, installer/update/rollback evidence를 별도 명시 승인 gate로 닫는 것이다.
