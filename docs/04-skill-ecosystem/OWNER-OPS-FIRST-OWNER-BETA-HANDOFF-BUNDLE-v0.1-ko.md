# Owner Ops First Owner Beta Handoff Bundle v0.1

## 목적

이 문서는 팀원 alpha 이후, 실제 사장님 1명에게 감독된 beta 테스트를 진행하기 위한 로컬 handoff bundle 계약이다.

이 단계는 공개 배포가 아니며, 실제 고객 자동 발송 / 외부 계정 연결 / 결제·환불·취소·삭제 / 백그라운드 자동화는 계속 차단한다.

## CLI

```bash
node bin/gpao-t.js owner-ops first-owner-beta-handoff-bundle
node bin/gpao-t.js owner-ops first-owner-beta-handoff-write
node bin/gpao-t.js owner-ops first-owner-beta-handoff-check
```

Gateway:

```text
GET /owner-ops/first-owner-beta-handoff-bundle
POST /owner-ops/first-owner-beta-handoff-bundle
GET /owner-ops/first-owner-beta-handoff-bundle/verify
```

## Local Output

`first-owner-beta-handoff-write`는 `.gpao-t/packages/` 아래에 로컬 검토용 파일만 쓴다.

```text
.gpao-t/packages/OWNER-OPS-FIRST-OWNER-BETA-HANDOFF-BUNDLE.json
.gpao-t/packages/OWNER-OPS-FIRST-OWNER-BETA-HANDOFF-BUNDLE.md
```

## Beta 조건

- 팀원 alpha handoff가 먼저 ready여야 한다.
- 팀원 alpha handoff에 포함된 Codex / OpenClaw / Claude Code host integration matrix가 ready여야 한다.
- 실제 사장님 beta 전에 테스트 호스트 하나를 선택하고, 해당 호스트에서 local stdio MCP smoke만 확인한다.
- 이 단계의 host setup은 등록/검증 계약이지 live host registration 실행이 아니다.
- 샘플 또는 비식별 자료만 사용한다.
- 실제 고객 개인정보가 보이면 중단한다.
- 고객 자동 발송과 외부 계정 연결은 열지 않는다.
- 사장님이 초안과 실제 전송의 차이를 이해하지 못하면 중단한다.

## Host Setup Prerequisite

첫 사장님 beta handoff는 팀원 alpha의 host integration matrix를 직접 상속한다. 따라서 beta handoff에는 다음 정보가 함께 포함되어야 한다.

- Codex / OpenClaw / Claude Code별 local stdio MCP 등록 모드
- 공통 명령: `node bin/gpao-t-owner-ops-mcp.js`
- external network: blocked
- credential read/write: blocked
- customer send: blocked
- public publish: blocked
- 선택된 테스트 호스트: supervised beta 직전에 결정

이 전제조건은 실제 사용자 테스트에서 "어떤 호스트 설정으로 검증했는가"가 끊기지 않게 하기 위한 것이다. 이 문서나 bundle은 live host registration, 외부 계정 연결, 고객 전송, 공개 배포 권한을 열지 않는다.

## 다음 단계

첫 사장님 beta 결과를 업종 템플릿, owner-facing UX copy, privacy copy, market readiness gate에 반영한다.
