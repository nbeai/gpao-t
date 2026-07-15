# Owner Ops Distribution Evidence v0.1

## 목적

이 문서는 `사장님 자동화 도우미`를 팀원 alpha, 첫 사장님 beta, 향후 공개 제출 검토로 넘기기 전에 확인해야 하는 로컬 배포 증거 계약이다.

이 단계는 배포 실행이 아니다. archive 생성, 서명, 공증, 공개 업로드, 설치, 업데이트, 롤백 실행은 계속 차단된다.

## 포함 표면

```text
plugin package manifest
-> pre-public package review
-> pre-public repair backlog
-> pre-public repair completion evidence
-> install/update/rollback evidence
-> distribution file checksum manifest
-> local distribution readme
```

## Distribution Evidence

`distribution-evidence`는 다음을 확인한다.

- 패키지 id / 표시 이름 / package version
- 핵심 소스와 문서 파일 존재 여부
- 각 파일의 `sha256` / byte size
- stdio MCP wrapper 포함 여부
- install/update/rollback readiness 상태
- pre-public package review 상태
- pre-public repair backlog 상태와 repair lane
- pre-public repair completion evidence 상태와 locally verified 항목 수
- archive/signing/upload 미실행 상태
- public submission 차단 상태

## CLI 확인 명령

아래 `local-package-candidate*` 명령과 route는 현재 런타임 호환
식별자다. 이 문서에서 사람이 읽는 제품 용어는 `내부 프로덕션 패키지`로
통일한다.

```bash
node bin/gpao-t.js owner-ops distribution-evidence
node bin/gpao-t.js owner-ops distribution-readme
node bin/gpao-t.js owner-ops distribution-evidence-check
node bin/gpao-t.js owner-ops pre-public-repair-check
node bin/gpao-t.js owner-ops pre-public-repair-completion-check
node bin/gpao-t.js owner-ops archive-checksum-dry-run
node bin/gpao-t.js owner-ops archive-checksum-dry-run-check
node bin/gpao-t.js owner-ops local-package-candidate
node bin/gpao-t.js owner-ops local-package-candidate confirm-owner-ops-internal-production-package
node bin/gpao-t.js owner-ops local-package-candidate-check
node bin/gpao-t.js owner-ops local-package-candidate-readback
node bin/gpao-t.js owner-ops local-package-candidate-readback-check
node bin/gpao-t.js owner-ops team-alpha-handoff-bundle
node bin/gpao-t.js owner-ops team-alpha-handoff-write
node bin/gpao-t.js owner-ops team-alpha-handoff-check
```

Gateway:

```text
GET /owner-ops/distribution-evidence
GET /owner-ops/distribution-readme
GET /owner-ops/distribution-evidence/verify
GET /owner-ops/archive-checksum-dry-run
GET /owner-ops/archive-checksum-dry-run/verify
POST /owner-ops/local-package-candidate
GET /owner-ops/local-package-candidate/verify
GET /owner-ops/local-package-candidate/readback
GET /owner-ops/local-package-candidate/readback/verify
GET /owner-ops/team-alpha-handoff-bundle
POST /owner-ops/team-alpha-handoff-bundle
GET /owner-ops/team-alpha-handoff-bundle/verify
```

## Authority Boundary

이 단계에서 허용되는 것은 로컬 증거 생성과 확인뿐이다.

계속 차단되는 것:

- 공개 업로드
- archive 생성
- 서명/공증
- 실제 설치 실행
- 자동 업데이트
- 파괴적 롤백
- 외부 계정 연결
- 고객 자동 발송
- marketplace 제출

## Pre-Public Repair Backlog

`distribution-evidence`는 이제 `pre-public package review`만 보지 않는다.

공개 후보로 넘어가기 전에 `pre-public repair backlog`가 ready여야 한다.

필수 repair lane:

- `template_replay_fixture`
- `privacy_copy`
- `owner_ux_copy`
- `package_review`

이 backlog는 베타 피드백이 실제 수리 항목으로 바뀌었는지 확인하는 로컬 증거다. 이 단계도 공개 제출, 업로드, 서명, 고객 발송, credential 접근, 설치/업데이트/롤백 실행을 열지 않는다.

## Pre-Public Repair Completion Evidence

`distribution-evidence`는 repair backlog가 존재하는지만 보지 않는다.

각 repair item이 `locally_verified` 상태로 completion evidence에 들어가야 한다.

필수 completion lane:

- `template_replay_fixture`
- `privacy_copy`
- `owner_ux_copy`
- `package_review`

이 evidence도 로컬 검토 증거일 뿐이며 공개 제출, 업로드, 서명, 고객 발송, credential 접근, 설치/업데이트/롤백 실행을 열지 않는다.

## Archive / Checksum Dry-run

`archive-checksum-dry-run`은 실제 압축 파일을 만들지 않고 다음만 계산한다.

- planned archive name
- planned archive / manifest / checksum path
- included file list
- included file sha256 / byte size
- manifest digest
- archive/checksum/sign/upload/install/update/rollback 미실행 상태

이 dry-run이 통과해도 파일 쓰기 권한이 열린 것은 아니다.

## Internal Production Package Writer

`local-package-candidate`는 기본 호출에서는 차단된다.

파일 쓰기는 다음 확인 토큰이 있을 때만 열린다.

```text
confirm-owner-ops-internal-production-package
```

확인 토큰이 있으면 `.gpao-t/packages/` 아래에 다음 로컬 파일만 쓴다.

- `.bundle.json`
- `.manifest.json`
- `.sha256`

이 파일들은 내부 프로덕션 패키지 검토 자료이며, 공개 업로드/서명/공증/설치/업데이트/롤백 실행을 의미하지 않는다.

## Internal Production Package Readback

`local-package-candidate-readback`은 `.gpao-t/packages/`에 생성된 내부 프로덕션 패키지를 다시 읽어 다음을 검증한다.

- `.bundle.json` 존재 여부
- `.manifest.json` 존재 여부
- `.sha256` 존재 여부
- bundle sha256과 checksum 파일 일치
- bundle 내부 manifest와 별도 manifest 파일 일치
- base64로 포함된 각 파일 내용의 sha256 / byte size 일치
- public upload / signing / install / update / rollback 미실행 상태

이 단계도 읽기 검증이다. 공개 업로드, 서명, 설치, 업데이트, 롤백은 열리지 않는다.

## Team Alpha Handoff Bundle

`team-alpha-handoff-bundle`은 검증된 내부 프로덕션 패키지를 감독된 팀원 alpha 테스트 순서로 묶는다.

포함 표면:

- internal production package readback
- team alpha guide
- host registration guide
- sample data kit
- owner-facing UX copy
- alpha feedback form

`team-alpha-handoff-write`는 `.gpao-t/packages/OWNER-OPS-TEAM-ALPHA-HANDOFF-BUNDLE.json/md`만 로컬로 쓴다.

이 파일은 팀원 alpha 안내용이며, 공개 배포나 설치 실행을 의미하지 않는다.

## 다음 단계

distribution evidence와 archive/checksum dry-run이 통과하면 사용자 명시 승인 아래에서만 internal production package writer를 열 수 있다.

공개 제출, 서명, 업로드, 설치/업데이트/롤백 실행은 별도의 권한 gate와 검증 증거가 필요하다.
