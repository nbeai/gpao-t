# Owner Ops Human Review Decision Lane v0.1

## Purpose

Owner Ops Human Review Decision Lane은 공개 배포를 실행하기 전에 사람이 검토 결정을 로컬 기록으로 남기는 레인이다.

이 레인은 `OWNER-OPS-HUMAN-REVIEW-APPROVAL-PACKET`을 읽은 뒤 다음 결정을 기록할 수 있게 한다.

- `hold`
- `revise`
- `approve_local_review_only`
- `approve_public_release_later`

## Required Evidence

결정 레인은 다음 증거를 요구한다.

- release readiness evidence: `ready`
- pre-public repair completion evidence: `ready`
- repair items: 6/6 locally verified
- local package candidate: `ready`
- human review approval packet: `prepared_not_approved`

## Local Record Storage

승인 토큰이 맞을 때만 로컬 JSONL 기록을 append한다.

- JSONL: `.gpao-t/owner-ops/human-review/decision-records.jsonl`
- Index: `.gpao-t/owner-ops/human-review/index.json`

필수 승인 토큰:

```text
approve-owner-ops-human-review-local-only
```

## Authority Boundary

이 레인은 로컬 검토 결정 기록만 허용한다.

다음은 계속 금지된다.

- public release
- marketplace upload
- package signing
- customer send
- credential access
- install execution
- update execution
- rollback execution
- external automation

## Verification Commands

```bash
node bin/gpao-t.js owner-ops human-review-decision-lane
node bin/gpao-t.js owner-ops human-review-decision-check
node bin/gpao-t.js owner-ops human-review-decision-records
```

로컬 결정 기록이 필요할 때만 다음을 사용한다.

```bash
node bin/gpao-t.js owner-ops human-review-decision-append approve_local_review_only approve-owner-ops-human-review-local-only
```

## Product Meaning

이 레인이 닫히면 Owner Ops는 “검토 패킷이 준비됨”에서 “사람의 로컬 검토 결정이 기록될 수 있음”으로 전진한다.

단, 이 기록은 공개 배포 승인이 아니다. 공개 배포, 서명, 업로드, 설치/업데이트/롤백은 별도 explicit gate가 필요하다.

다음 확인 표면:

```bash
node bin/gpao-t.js owner-ops public-release-gate
node bin/gpao-t.js owner-ops public-release-gate-check
```
