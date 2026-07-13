# Owner Ops Plugin Package v0.1

## 목적

Owner Ops는 스킬팩, 로컬 workflow, MCP, intake connector, 첫 사용자 시나리오를 통과한 뒤에만 패키지 표면으로 올라간다.

이 문서는 공개 마켓 출시 문서가 아니다. 로컬 패키지 manifest와 마켓 listing draft를 만들되, 실제 공개 게시, 계정 연결, 고객 발송, 결제/환불/삭제, 백그라운드 자동화는 열지 않는다.

## 패키지 정체성

| 항목 | 값 |
| --- | --- |
| package id | `gpao-t-owner-ops` |
| display name | 사장님 자동화 도우미 |
| 대상 | 한국 자영업자, 1인/소규모 사업자 |
| 첫 데모 | 스마트스토어 문의 CSV -> 분류 -> 초안 -> 로컬 기록 -> replay |
| 호출 표면 | CLI, Gateway, stdio MCP |
| 공개 상태 | `not_published` |

## 검증 명령

```bash
node bin/gpao-t.js owner-ops plugin-package
node bin/gpao-t.js owner-ops market-listing
node bin/gpao-t.js owner-ops plugin-package-check
```

Gateway:

```text
GET /owner-ops/plugin-package
GET /owner-ops/market-listing
GET /owner-ops/plugin-package/verify
```

## 포함되는 것

- Owner Ops skill pack 설명
- 첫 사용자 시나리오
- CLI 설치/검증 명령
- stdio MCP 실행 명령
- Gateway route
- MCP tool manifest
- 권한 경계
- 마켓 listing draft

## 아직 열지 않는 것

- 공개 마켓 게시
- OAuth / API 계정 연결
- 고객 메시지 자동 발송
- 리뷰 자동 게시
- 결제, 환불, 삭제, 주문 취소
- 백그라운드 반복 자동화
- durable memory promotion

## 다음 단계

패키지 표면이 `ready`면 다음은 팀원 alpha 안내서다.

팀원 alpha 안내서는 실제 자영업자 자료를 쓰기 전에 다음을 설명해야 한다.

- 어떤 자료를 넣을 수 있는지
- 어떤 행동은 절대 자동 실행되지 않는지
- 로컬 기록이 어디까지 남는지
- 결과가 마음에 안 들 때 어떻게 보류/수정/삭제 후보로 돌리는지
- OpenClaw, Codex, Claude Code에서 MCP로 연결할 때 무엇을 확인해야 하는지

현재 alpha 기준 문서:

```text
docs/04-skill-ecosystem/OWNER-OPS-TEAM-ALPHA-GUIDE-v0.1-ko.md
docs/04-skill-ecosystem/OWNER-OPS-HOST-REGISTRATION-AND-FEEDBACK-v0.1-ko.md
docs/04-skill-ecosystem/OWNER-OPS-FIRST-OWNER-BETA-GUIDE-v0.1-ko.md
```

검증 명령:

```bash
node bin/gpao-t.js owner-ops team-alpha-guide
node bin/gpao-t.js owner-ops owner-ux-copy
node bin/gpao-t.js owner-ops team-alpha-check
node bin/gpao-t.js owner-ops host-registration-guide
node bin/gpao-t.js owner-ops alpha-feedback-form
node bin/gpao-t.js owner-ops host-alpha-check
node bin/gpao-t.js owner-ops sample-data-kit
node bin/gpao-t.js owner-ops first-owner-beta-guide
node bin/gpao-t.js owner-ops first-owner-beta-check
```
