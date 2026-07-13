# Owner Ops Pre-Public Repair Completion Evidence v0.1

## 목적

이 문서는 `pre-public repair backlog`의 각 수리 항목이 distribution/release readiness로 넘어가기 전에 로컬 기준으로 완료 판단되었는지 확인하는 증거 계약이다.

이 단계는 공개 배포나 실행 승인이 아니다. customer send, marketplace upload, signing, credential access, install/update/rollback, background automation은 계속 차단된다.

## 위치

```text
beta feedback action queue
-> pre-public repair backlog
-> pre-public repair completion evidence
-> distribution evidence
-> release readiness evidence
```

## 완료로 보는 것

각 repair item은 다음 상태를 가져야 한다.

- `completionState: locally_verified`
- replay/assertion 기준 존재
- blocked action 기준 존재
- target artifact 명시
- done-when 문장 존재

필수 lane:

- `template_replay_fixture`
- `privacy_copy`
- `owner_ux_copy`
- `package_review`

## CLI

```bash
node bin/gpao-t.js owner-ops pre-public-repair-completion
node bin/gpao-t.js owner-ops pre-public-repair-completion-write
node bin/gpao-t.js owner-ops pre-public-repair-completion-check
```

## Gateway

```text
GET /owner-ops/pre-public-repair-completion
POST /owner-ops/pre-public-repair-completion
GET /owner-ops/pre-public-repair-completion/verify
```

## 로컬 산출물

`pre-public-repair-completion-write`는 다음 파일만 로컬에 쓴다.

- `.gpao-t/packages/OWNER-OPS-PRE-PUBLIC-REPAIR-COMPLETION-EVIDENCE.json`
- `.gpao-t/packages/OWNER-OPS-PRE-PUBLIC-REPAIR-COMPLETION-EVIDENCE.md`

## 계속 차단되는 것

- public submission
- marketplace upload
- signing
- customer message send
- credential read/write
- install/update/rollback
- background automation

## 완료 기준

이 evidence가 `ready`가 되려면 모든 repair item이 `locally_verified` 상태이고, 필수 lane 네 개가 모두 존재해야 한다.

`distribution-evidence`와 `release-readiness-evidence`는 이 completion evidence를 필수 checked surface로 본다.
