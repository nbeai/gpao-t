# Owner Ops Beta Feedback Action Queue v0.1

## 목적

이 문서는 첫 사장님 beta result review와 market evidence bundle 이후, 실제 피드백을 제품 개선 작업으로 바꾸는 로컬 action queue 계약이다.

이 단계의 목적은 "테스트가 좋았다"에서 멈추지 않고, 다음 보강 항목을 명확히 만드는 것이다.

```text
first-owner beta result review
-> market evidence bundle
-> beta feedback action queue
-> replay fixture / privacy copy / owner UX / package review repair
```

이 queue는 공개 배포, marketplace upload, signing, 고객 발송, credential 접근, 설치/업데이트/롤백을 실행하지 않는다.

## CLI

```bash
node bin/gpao-t.js owner-ops beta-feedback-action-queue
node bin/gpao-t.js owner-ops beta-feedback-action-write
node bin/gpao-t.js owner-ops beta-feedback-action-check
```

Gateway:

```text
GET /owner-ops/beta-feedback-action-queue
POST /owner-ops/beta-feedback-action-queue
GET /owner-ops/beta-feedback-action-queue/verify
```

## Local Output

`beta-feedback-action-write`는 `.gpao-t/packages/` 아래에 로컬 검토용 파일만 쓴다.

```text
.gpao-t/packages/OWNER-OPS-BETA-FEEDBACK-ACTION-QUEUE.json
.gpao-t/packages/OWNER-OPS-BETA-FEEDBACK-ACTION-QUEUE.md
```

## Queue Lanes

- `template_replay_fixture`: 업종별 요청 템플릿을 replay fixture로 만든다.
- `privacy_copy`: 개인정보/자동발송 금지 안내를 사장님이 이해하기 쉽게 보강한다.
- `owner_ux_copy`: 첫 화면과 setup friction을 낮추는 문구/흐름을 보강한다.
- `package_review`: pre-public package review가 beta-derived work item을 확인하게 만든다.

## 계속 차단되는 것

- public market publish
- marketplace upload
- package signing
- customer message send
- credential read/write
- install / update / rollback
- background automation

## 다음 단계

이 queue를 바탕으로 replay fixture, privacy copy, owner UX copy, pre-public package review를 보강한다. public submission은 별도 owner approval 전까지 계속 차단한다.
