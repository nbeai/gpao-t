# Owner Ops Pre-Public Repair Backlog v0.1

## 목적

이 문서는 첫 사장님 beta feedback action queue를 공개 전 수리 작업으로 바꾸는 로컬 backlog 계약이다.

이 단계는 공개 제출, 마켓 업로드, 서명, 설치, 업데이트, 롤백, 고객 전송을 실행하지 않는다.

## 위치

```text
first-owner beta result review
-> market evidence bundle
-> beta feedback action queue
-> pre-public package review
-> pre-public repair backlog
-> pre-public repair completion evidence
-> distribution evidence
```

## 필수 repair lane

```text
template_replay_fixture
privacy_copy
owner_ux_copy
package_review
```

각 lane은 다음 의미를 가진다.

- `template_replay_fixture`: 업종별 샘플 입력, 로컬 초안, owner confirmation, replay assertion을 고정한다.
- `privacy_copy`: 개인정보/자동발송 금지/로컬 기록 문구를 사장님이 이해할 수 있게 점검한다.
- `owner_ux_copy`: 첫 화면과 host setup 흐름에서 무엇을 붙여넣고 무엇이 잠겨 있는지 명확히 한다.
- `package_review`: pre-public review와 evidence bridge가 beta-derived repair work를 우회하지 못하게 한다.

## CLI

```bash
node bin/gpao-t.js owner-ops pre-public-repair-backlog
node bin/gpao-t.js owner-ops pre-public-repair-write
node bin/gpao-t.js owner-ops pre-public-repair-check
node bin/gpao-t.js owner-ops pre-public-repair-completion
node bin/gpao-t.js owner-ops pre-public-repair-completion-write
node bin/gpao-t.js owner-ops pre-public-repair-completion-check
```

## Gateway

```text
GET /owner-ops/pre-public-repair-backlog
POST /owner-ops/pre-public-repair-backlog
GET /owner-ops/pre-public-repair-backlog/verify
GET /owner-ops/pre-public-repair-completion
POST /owner-ops/pre-public-repair-completion
GET /owner-ops/pre-public-repair-completion/verify
```

## 로컬 산출물

`pre-public-repair-write`는 다음 파일만 로컬에 쓴다.

```text
.gpao-t/packages/OWNER-OPS-PRE-PUBLIC-REPAIR-BACKLOG.json
.gpao-t/packages/OWNER-OPS-PRE-PUBLIC-REPAIR-BACKLOG.md
```

## 계속 차단되는 것

```text
public_market_publish
marketplace_upload
package_signing
customer_message_send
credential_read_write
install_update_rollback
background_automation
```

## 완료 기준

- repair backlog status가 `ready`다.
- repair item이 최소 4개 이상이다.
- 네 개 lane이 모두 존재한다.
- public submission, customer send, signing, install/update/rollback은 false다.
- distribution evidence가 beta-derived repair work를 우회하지 못한다.
- repair completion evidence가 모든 repair item을 `locally_verified`로 확인한다.
