# Owner Ops Team Alpha Handoff Bundle v0.1

## 목적

이 문서는 `사장님 자동화 도우미`를 내부 팀원 alpha에게 넘기기 위한 로컬 handoff bundle 계약이다.

이 단계는 공개 배포가 아니다. marketplace publish, public upload, package signing, installer execution, live OAuth/API connection, customer message send, background automation은 계속 차단된다.

## 포함 표면

```text
internal production package readback
-> team alpha guide
-> host integration matrix
-> host registration guide
-> sample data kit
-> owner-facing UX copy
-> alpha feedback form
-> team alpha handoff bundle
```

## CLI

```bash
node bin/gpao-t.js owner-ops team-alpha-handoff-bundle
node bin/gpao-t.js owner-ops team-alpha-handoff-write
node bin/gpao-t.js owner-ops team-alpha-handoff-check
```

Gateway:

```text
GET /owner-ops/team-alpha-handoff-bundle
POST /owner-ops/team-alpha-handoff-bundle
GET /owner-ops/team-alpha-handoff-bundle/verify
```

## Local Output

`team-alpha-handoff-write`는 `.gpao-t/packages/` 아래에 로컬 검토용 파일만 쓴다.

```text
.gpao-t/packages/OWNER-OPS-TEAM-ALPHA-HANDOFF-BUNDLE.json
.gpao-t/packages/OWNER-OPS-TEAM-ALPHA-HANDOFF-BUNDLE.md
```

## 팀원에게 보여줄 순서

1. 내부 프로덕션 패키지 무결성 확인
2. 팀원 alpha 안내 확인
3. Codex / OpenClaw / Claude Code 호스트별 등록 매트릭스 확인
4. 호스트 등록 smoke 안내 확인
5. 첫 사장님 시나리오 실행
6. alpha feedback form 작성

## Host Integration

팀원 alpha handoff bundle은 `host-integration-matrix`를 포함한다.

확인해야 할 것:

- Codex / OpenClaw / Claude Code가 모두 같은 local stdio MCP command를 사용한다.
- 첫 등록 경로에서 external network가 필요하지 않다.
- credential, customer send, public publish는 모두 false로 남는다.
- local record write는 명시 확인이 있는 local JSONL write일 뿐 실제 고객 업무 실행이 아니다.

## 계속 차단되는 것

- 공개 업로드
- 서명 / 공증
- installer 실행
- 업데이트 / 롤백 실행
- 고객 자동 발송
- OAuth/API 계정 연결
- 결제 / 환불 / 취소 / 삭제
- 백그라운드 자동화

## 다음 단계

팀원 alpha에서 critical blocker가 없고 이해 쉬움 / 실무 쓸모 / 안심감 기준을 넘기면 첫 사장님 beta로 넘어간다.

기준 미달이면 public packaging으로 가지 않고 owner-facing copy, sample data, first scenario, host registration guide를 먼저 수정한다.
