# Owner Ops Final Candidate Next Action Packet v0.1

이 문서는 `Final Candidate Owner Decision Lane` 이후, owner가 선택한 결정값을 다음 로컬 운영 행동으로 연결하는 read-only packet 계약이다.

이 packet은 결정을 기록하지 않는다. 결정을 대신 승인하지 않는다. 공개 배포, 패키지 업로드, 서명, 설치/업데이트/롤백 실행, 고객 발송, 라이브 계정 연결도 열지 않는다.

## Decisions

지원하는 decision 값은 다음 네 가지다.

```text
continue_supervised_testing
request_revision
approve_local_candidate_review
consider_public_release_later
```

## CLI

```bash
gpao-t owner-ops final-candidate-next-action [decision]
gpao-t owner-ops final-candidate-next-action-check
```

## Gateway

```text
GET /owner-ops/final-candidate-next-action
GET /owner-ops/final-candidate-next-action/verify
```

## Decision To Action Map

### continue_supervised_testing

다음 표면:

```text
owner-ops next-owner-testing-loop
owner-ops next-owner-testing-loop-write
owner-ops next-owner-testing-loop-check
```

샘플/비식별 데이터로 감독형 테스트를 계속한다.

### request_revision

다음 표면:

```text
owner-ops field-test-action-queue
owner-ops field-test-action-write
owner-ops field-test-action-check
```

수정 요청을 로컬 repair item으로 바꾼다.

### approve_local_candidate_review

다음 표면:

```text
owner-ops team-alpha-handoff-bundle
owner-ops team-alpha-handoff-write
owner-ops team-alpha-handoff-check
```

로컬 후보를 내부/팀 검토 산출물로 사용한다.

### consider_public_release_later

다음 표면:

```text
owner-ops public-release-readback
owner-ops human-review-decision-lane
owner-ops public-release-readback-check
```

나중에 별도 public-release review를 연다. 이 decision 자체는 공개 배포 승인이 아니다.

## Authority Boundary

이 packet은 항상 다음을 유지한다.

```text
ownerDecisionRecordedNow: false
publicReleaseAllowed: false
marketplaceUploadAllowed: false
packageUploadAllowed: false
signingAllowed: false
installAllowed: false
updateAllowed: false
rollbackAllowed: false
customerSendAllowed: false
liveAccountConnectionAllowed: false
credentialAccessAllowed: false
externalDistributionAllowed: false
```

## Meaning

`ready`는 owner decision 이후 어디로 가야 하는지 읽을 수 있다는 뜻이다.

`ready`는 owner decision 기록, public release, marketplace upload, install/update/rollback, 고객 자동화 실행을 뜻하지 않는다.
