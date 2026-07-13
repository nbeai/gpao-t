# Owner Ops Host Registration and Feedback v0.1

## 목적

이 문서는 `사장님 자동화 도우미`를 팀원 alpha에서 Codex, OpenClaw, Claude Code 같은 호스트에 로컬 stdio MCP로 붙여 보는 안내서다.

이 단계는 공개 배포가 아니다. 외부 계정 연결, 고객 메시지 전송, 결제/환불/삭제, 백그라운드 자동화는 열지 않는다.

## 로컬 MCP 등록 기준

기본 서버:

```json
{
  "name": "gpao-t-owner-ops",
  "command": "node",
  "args": ["bin/gpao-t-owner-ops-mcp.js"],
  "transport": "stdio_json_rpc",
  "network": "not_used"
}
```

선택 환경 변수:

```text
GPAO_T_ROOT=/path/to/gpao-t
```

`GPAO_T_ROOT`를 지정하지 않으면 현재 작업 폴더 기준으로 로컬 기록과 미리보기를 처리한다.

## 호스트별 확인

### Codex

Codex MCP 설정에 `gpao-t-owner-ops`를 local stdio server로 등록한다. 첫 alpha에서는 네트워크 URL이 아니라 로컬 명령만 사용한다.

### OpenClaw

OpenClaw MCP/skill host 설정에서 같은 stdio 명령을 연결한다. OpenClaw Gateway에 공개 route를 추가하는 단계가 아니다.

### Claude Code

Claude Code MCP server 설정에 command/args를 등록한다. 실제 고객 데이터, 외부 전송, credential 접근은 alpha에서 사용하지 않는다.

## Smoke Test

1. 서버 실행 가능성 확인

```bash
node bin/gpao-t-owner-ops-mcp.js
```

2. 도구 목록 확인

```text
tools/list
```

기대 도구:

```text
owner_ops.workflow_preview
owner_ops.intake_preview
owner_ops.replay
```

3. 초안 미리보기 확인

```text
owner_ops.workflow_preview
```

기대 결과:

```text
고객 전송 없이 local preview draft만 반환
```

4. 쓰기 잠금 확인

```text
owner_ops.local_record_write
```

기대 결과:

```text
명시 확인 없이는 write blocked
```

## CLI 확인 명령

```bash
node bin/gpao-t.js owner-ops host-registration-guide
node bin/gpao-t.js owner-ops host-integration-matrix
node bin/gpao-t.js owner-ops host-integration-matrix-check
node bin/gpao-t.js owner-ops alpha-feedback-form
node bin/gpao-t.js owner-ops host-alpha-check
```

Gateway:

```text
GET /owner-ops/host-registration-guide
GET /owner-ops/host-integration-matrix
GET /owner-ops/host-integration-matrix/verify
GET /owner-ops/alpha-feedback-form
GET /owner-ops/host-alpha/verify
```

## Host Integration Matrix

`host-integration-matrix`는 Codex, OpenClaw, Claude Code에서 같은 Owner Ops MCP 서버를 어떻게 등록하고 검증할지 한 화면의 계약으로 보여준다.

포함 항목:

- host id / label
- local stdio MCP registration mode
- command / args
- smoke checks
- first user action
- allowed actions
- blocked actions
- external network / credential / customer send / public publish boundary

이 매트릭스는 실제 등록 실행이 아니다. 팀원 alpha나 첫 owner beta 전에 각 호스트별 setup 경로와 차단선을 검토하기 위한 로컬 증거다.

## Alpha 피드백 질문

첫 인상:

- 사장님 입장에서 무엇을 해야 하는지 1분 안에 이해됐는가?
- 제품 이름과 첫 화면 문구가 너무 기술적으로 느껴지지는 않았는가?
- 자동 전송이 안 된다는 점이 충분히 안심되는가?

업무 적합성:

- 리뷰/문의/예약 중 어느 흐름이 가장 먼저 쓸 만했는가?
- 초안이 실제 복사 후 수정해서 쓸 수준이었는가?
- 분류가 사장님 업무 언어에 맞았는가?

호스트 연결:

- Codex/OpenClaw/Claude Code 중 어느 호스트에서 테스트했는가?
- MCP 도구 목록과 미리보기 호출이 같은 제품처럼 느껴졌는가?
- 설정 과정에서 막힌 지점이 있었는가?

안전과 신뢰:

- 잠긴 행동이 지나치게 겁주는 표현으로 느껴졌는가, 아니면 안심되는가?
- 실제 고객 데이터 사용 전 어떤 경고가 더 필요하다고 느꼈는가?
- 로컬 기록만 남는다는 표현이 충분히 명확한가?

## 합격 기준

```text
이해 쉬움 평균 4점 이상
실무 쓸모 평균 4점 이상
안심감 평균 4점 이상
설정 어려움 평균 2.5점 이하
치명 blocker 0개
```

## 아직 열지 않는 것

- 공개 마켓 게시
- 고객 메시지 자동 발송
- OAuth/API 계정 연결
- 결제, 환불, 삭제, 주문 취소
- 백그라운드 반복 자동화
- durable memory promotion

## 다음 단계

팀원 alpha에서 최소 2개 호스트의 smoke를 확인한 뒤, 피드백 결과를 `owner-facing UX copy`, 첫 시나리오 fixture, MCP 등록 문구에 반영한다. 기준을 넘기면 [OWNER-OPS-FIRST-OWNER-BETA-GUIDE-v0.1-ko.md](/Users/jyp/Documents/Playground%202/gpao-t/docs/04-skill-ecosystem/OWNER-OPS-FIRST-OWNER-BETA-GUIDE-v0.1-ko.md)로 넘어간다.
