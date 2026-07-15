# Owner Ops Pre-Public Package Review v0.1

## 목적

이 문서는 `사장님 자동화 도우미`가 공개 마켓 제출 직전에 갖춰야 할 replay fixture와 privacy copy를 확인하는 pre-public package review다.

이 단계도 공개 제출이 아니다. public submission은 계속 차단된다.

## 포함 표면

```text
market readiness gate
-> template replay fixtures
-> privacy copy pack
-> beta feedback action queue
-> pre-public package review
```

## Template Replay Fixtures

상위 업종별로 하나 이상의 replay fixture를 둔다.

각 fixture는 다음을 포함한다.

- industry
- template
- sample input
- expected draft shape
- required assertions
- blocked actions
- replay command

필수 assertion:

```text
local preview only
Korean owner-facing language
owner confirmation required
customer auto-send blocked
local replay reference produced
```

## Privacy Copy Pack

사장님에게 보여줄 개인정보/로컬 처리 안내는 짧고 명확해야 한다.

필수 라벨:

```text
자동 전송 안 함
외부 계정 연결 안 함
고객 개인정보 비식별 권장
로컬 기록만
환불/취소/삭제 자동 실행 안 함
```

## Beta Feedback Action Queue

첫 사장님 beta result review와 market evidence bundle에서 나온 피드백은 공개 전 리뷰 전에 반드시 로컬 개선 큐로 전환되어야 한다.

필수 lane:

```text
template_replay_fixture
privacy_copy
owner_ux_copy
package_review
```

이 queue는 공개 제출을 열기 위한 승인이 아니다. 목적은 public package review 전에 replay fixture, 개인정보 안내, 첫 화면/설정 흐름, package review 연결 상태를 고치는 것이다.

## CLI 확인 명령

아래 `local-package-candidate*` 명령과 route는 현재 런타임 호환
식별자이며, 제품 성숙도 명칭이 아니다. 이 검토에서 사람이 읽는 산출물
명칭은 `내부 프로덕션 패키지`다.

```bash
node bin/gpao-t.js owner-ops template-replay-fixtures
node bin/gpao-t.js owner-ops privacy-copy-pack
node bin/gpao-t.js owner-ops beta-feedback-action-queue
node bin/gpao-t.js owner-ops beta-feedback-action-check
node bin/gpao-t.js owner-ops pre-public-package-review
node bin/gpao-t.js owner-ops pre-public-package-check
node bin/gpao-t.js owner-ops pre-public-repair-backlog
node bin/gpao-t.js owner-ops pre-public-repair-write
node bin/gpao-t.js owner-ops pre-public-repair-check
node bin/gpao-t.js owner-ops pre-public-repair-completion
node bin/gpao-t.js owner-ops pre-public-repair-completion-write
node bin/gpao-t.js owner-ops pre-public-repair-completion-check
node bin/gpao-t.js owner-ops distribution-evidence
node bin/gpao-t.js owner-ops distribution-readme
node bin/gpao-t.js owner-ops distribution-evidence-check
node bin/gpao-t.js owner-ops archive-checksum-dry-run
node bin/gpao-t.js owner-ops archive-checksum-dry-run-check
node bin/gpao-t.js owner-ops local-package-candidate-check
node bin/gpao-t.js owner-ops local-package-candidate-readback-check
```

Gateway:

```text
GET /owner-ops/template-replay-fixtures
GET /owner-ops/privacy-copy-pack
GET /owner-ops/beta-feedback-action-queue
GET /owner-ops/beta-feedback-action-queue/verify
GET /owner-ops/pre-public-package-review
GET /owner-ops/pre-public-package/verify
GET /owner-ops/pre-public-repair-backlog
POST /owner-ops/pre-public-repair-backlog
GET /owner-ops/pre-public-repair-backlog/verify
GET /owner-ops/pre-public-repair-completion
POST /owner-ops/pre-public-repair-completion
GET /owner-ops/pre-public-repair-completion/verify
GET /owner-ops/distribution-evidence
GET /owner-ops/distribution-readme
GET /owner-ops/distribution-evidence/verify
GET /owner-ops/archive-checksum-dry-run
GET /owner-ops/archive-checksum-dry-run/verify
GET /owner-ops/local-package-candidate/verify
GET /owner-ops/local-package-candidate/readback/verify
```

## Public Submission Block

`pre-public-package-review`가 `ready`여도 공개 제출은 열리지 않는다.

공개 제출 전에는 별도로 다음이 필요하다.

- 사용자 명시 승인
- 설치/업데이트/롤백 증거
- signed/package distribution evidence
- privacy copy review
- beta feedback action queue review
- marketplace authority
- 외부 계정/credential/security review

## 다음 단계

pre-public package review가 통과하면 `OWNER-OPS-BETA-FEEDBACK-ACTION-QUEUE-v0.1-ko.md`의 개선 항목을 `OWNER-OPS-PRE-PUBLIC-REPAIR-BACKLOG-v0.1-ko.md`의 공개 전 수리 backlog로 전환한 뒤 `OWNER-OPS-DISTRIBUTION-EVIDENCE-v0.1-ko.md`의 로컬 배포 증거를 확인한다. 공개 제출은 별도 승인 전까지 계속 차단한다.

내부 프로덕션 패키지를 만든 경우에는 public submission으로 넘어가기 전에 `local-package-candidate-readback-check`로 bundle / manifest / checksum / embedded file integrity를 다시 확인한다.
