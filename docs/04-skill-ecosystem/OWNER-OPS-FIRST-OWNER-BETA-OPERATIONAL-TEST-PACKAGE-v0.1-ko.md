# Owner Ops First Owner Beta Operational Test Package v0.1

## 목적

이 문서는 팀원 alpha handoff와 첫 사장님 beta result review 사이에 들어가는 로컬 운영 패키지 계약이다.

목표는 실제 사장님 1명과 감독된 beta를 시작하기 전에 다음을 한 표면에서 확인하는 것이다.

- 어떤 호스트에서 테스트할 수 있는가
- local stdio MCP smoke는 어떻게 확인하는가
- 어떤 샘플/비식별 자료만 사용할 수 있는가
- 사장님에게 어떤 설명을 해야 하는가
- 결과 리뷰에 어떤 필드를 남겨야 하는가
- 어떤 행동은 계속 잠겨 있어야 하는가

이 패키지는 live host registration, 고객 자동 발송, 외부 네트워크, credential 접근, 설치/업데이트/롤백, 서명, 업로드, 공개 배포를 실행하지 않는다.

## CLI

```bash
node bin/gpao-t.js owner-ops first-owner-beta-operational-package
node bin/gpao-t.js owner-ops first-owner-beta-operational-write
node bin/gpao-t.js owner-ops first-owner-beta-operational-check
```

Gateway:

```text
GET /owner-ops/first-owner-beta-operational-package
POST /owner-ops/first-owner-beta-operational-package
GET /owner-ops/first-owner-beta-operational-package/verify
```

## Local Output

`first-owner-beta-operational-write`는 `.gpao-t/packages/` 아래에 로컬 검토용 파일만 쓴다.

```text
.gpao-t/packages/OWNER-OPS-FIRST-OWNER-BETA-OPERATIONAL-TEST-PACKAGE.json
.gpao-t/packages/OWNER-OPS-FIRST-OWNER-BETA-OPERATIONAL-TEST-PACKAGE.md
```

## 순서

```text
internal production package readback
-> team alpha handoff
-> first-owner beta handoff
-> first-owner beta operational test package
-> first-owner beta result review
-> market evidence bundle
```

## 운영 패키지 조건

- first-owner beta handoff가 ready여야 한다.
- host setup prerequisite가 ready여야 한다.
- Codex / OpenClaw / Claude Code host setup evidence가 포함되어야 한다.
- beta 시작 전에 테스트 호스트 하나를 선택한다.
- 선택한 호스트에서 local stdio MCP smoke만 확인한다.
- 샘플 또는 비식별 자료만 사용한다.
- 사장님에게 자동 발송이 아니라 초안/미리보기임을 설명한다.
- 결과 리뷰에 이해 쉬움, 쓸모, 안심감, 설정 마찰, blocker, 요청 템플릿을 남긴다.

## 계속 차단되는 것

- live host registration
- external network
- credential read/write
- customer send
- public publish
- install / update / rollback
- signing / upload
- payment / refund / delete
- background automation

## 다음 단계

감독된 첫 사장님 beta를 1회 진행한 뒤 `first-owner-beta-result-write`로 결과 리뷰를 로컬 산출물로 남긴다.
