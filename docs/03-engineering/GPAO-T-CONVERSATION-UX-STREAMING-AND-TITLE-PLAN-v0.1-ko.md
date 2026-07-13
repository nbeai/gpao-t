# GPAO-T Conversation UX Streaming and Title Plan v0.1

작성일: 2026-07-12

## 고정 목표

GPAO-T의 대화 경험은 메신저처럼 “기다렸다가 한 번에 답변을 받는 화면”에 머물면 안 된다. 사용자는 답변 품질만이 아니라 기다리는 동안의 진행감, 도구 사용 상태, 중간 확인, 취소/재개 가능성, 제목/세션 정리까지 제품 품질로 체감한다.

이 문서는 live GPAO-T의 실 대화 UX 개선을 다음 기준으로 고정한다.

- 긴 작업은 무한 대기 상태로 두지 않는다.
- 응답 token streaming과 semantic progress를 분리한다.
- 도구 실행은 채팅 본문을 오염시키지 않는 접이식 실행 상태로 보여준다.
- 대화창 제목은 테스트용 timestamp가 아니라 첫 사용자 입력/작업 목표에서 자동 생성한다.
- QA용 테스트 대화창은 live dashboard 목록에 남기지 않는다.

## 리서치 요약

- ChatGPT/Codex의 긴 작업 UX는 진행 row, pause/resume/edit/clear 같은 제어와 status recap이 중요하다. OpenAI 문서는 Goal mode에서 진행 row로 일시정지, 재개, 수정, 삭제를 할 수 있다고 설명한다. [OpenAI long-running work](https://learn.chatgpt.com/docs/long-running-work)
- OpenAI API는 긴 출력에서 전체 결과를 기다리지 않고 SSE 기반 stream으로 증분 출력할 수 있다. 단 token stream만으로는 도구 작업의 의미 있는 진행감까지 해결되지 않는다. [OpenAI streaming](https://developers.openai.com/api/docs/guides/streaming-responses)
- Codex류 UX는 sandbox/approval 경계를 제품 표면에 드러낸다. 사용자는 실행이 멈춘 이유를 알아야 한다. [OpenAI approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security)
- Claude Code는 plan/permission mode를 UX의 중심으로 둔다. plan 승인 시 세션 이름을 plan 내용에서 자동 생성하는 흐름도 명시되어 있다. [Claude Code permission modes](https://code.claude.com/docs/en/permission-modes)
- OpenHands는 브라우저 기반 Agent Canvas와 backend server를 같이 운영하며, agent workbench를 독립된 제품 표면으로 본다. [OpenHands introduction](https://docs.openhands.dev/overview/introduction)
- Lovable/Replit 계열은 비개발자에게 token보다 preview, checkpoint, deploy state, visual edit의 진행감을 크게 준다. [Lovable docs](https://docs.lovable.dev/introduction/welcome)

## GPAO-T 적용 원칙

1. Token streaming은 필요하지만 충분하지 않다. GPAO-T는 `맥락 회수`, `도구 실행`, `검증`, `답변 정리` 같은 semantic progress를 별도 이벤트로 가진다.
2. 중간 브릿지 출력은 “처리 중”이 아니라 “무엇을 왜 하고 있는지”를 짧게 말한다.
3. 도구 로그는 채팅 본문에 길게 뿌리지 않고 compact lane + 펼침 로그로 분리한다.
4. 긴 작업에는 `중단`, `부분 결과로 마감`, `재개`, `현재까지 요약`을 둔다.
5. live dashboard 웹 대화창과 Telegram direct session은 같은 원칙을 공유하되, Telegram은 전용 단일 세션 + typing/status update 중심으로 둔다.
6. 대화창 제목은 첫 입력에서 자동 생성하고, 사용자가 rename하면 manual title을 우선한다.

## 구현 단계

### 1. 즉시 정리

- QA 테스트 대화창 삭제 도구를 추가한다.
- 삭제는 live session index와 transcript를 먼저 evidence로 백업한 뒤 실행한다.
- 앞으로 QA 러너는 timestamp prefix가 아니라 사람이 읽는 session key를 사용한다.

완료 기준:
- `gpao-t-live-conversation-qa`, `gpao-t-conversation-qa`, `gpao-t-runtime-smoke` 계열이 dashboard session list에서 사라진다.
- evidence backup과 cleanup result JSON이 남는다.

### 2. 제목 자동 생성

- GPAO-T 내부 session workspace에서 title 미입력 시 첫 request 기반 제목을 만든다.
- 수동 rename은 유지한다.
- title mode를 `auto_from_first_input` 또는 `manual`로 보관한다.

완료 기준:
- 새 세션의 첫 제목이 `새 작업 세션`이나 timestamp가 아니라 첫 입력 기반으로 생성된다.
- 테스트가 자동 제목과 수동 제목 우선순위를 검증한다.

### 3. 진행 브릿지 이벤트

live-turn bridge에 다음 event shape을 도입한다.

```json
{
  "type": "gpao_t.conversation_progress.v1",
  "phase": "context_retrieval | tool_running | verifying | drafting | complete | blocked",
  "label": "맥락 회수 중",
  "detail": "Context Mesh 기준과 현재 세션 후보를 대조합니다.",
  "elapsedMs": 0,
  "sessionKey": "agent:main:...",
  "turnId": "turn..."
}
```

완료 기준:
- 긴 작업에서 3초 이내 첫 progress가 보인다.
- 10초 이상 걸리는 작업은 최소 한 번 이상의 중간 상태를 남긴다.

### 4. 웹 대화창 streaming feasibility

OpenClaw live 경로에서 확인된 후보:

- OpenAI-compatible stream은 `assistant` delta와 `lifecycle` event를 다룬다.
- session operation/change event는 `emitSessionsChanged` 계열로 흐른다.
- GPAO-T는 `live-turn-absorption-bridge`를 통해 progress event를 만들어 OpenClaw event stream에 연결한다.

판단:
- 모델 token streaming은 기술적으로 가능성이 높다.
- 다만 GPAO-T UX에 더 중요한 것은 token stream 전에 보이는 semantic progress다.
- 1차 구현은 progress bridge, 2차 구현은 assistant delta streaming 연결, 3차 구현은 tool-call compact lane이다.

### 5. 도구 실행 compact lane

도구 사용 시 UI에는 한 줄 상태만 먼저 보인다.

- 실행 중: `파일 읽는 중 · 4개`
- 검증 중: `테스트 실행 중 · npm run check`
- 완료: `검증 완료 · 3개 통과`
- 실패: `막힘 · 권한 필요`

원본 명령, 파일, stdout/stderr, rollback 정보는 펼침으로 둔다.

### 6. 체감 속도

- 첫 progress까지 3초 이하를 목표로 한다.
- 응답 생성 자체가 길면 skeleton/placeholder 대신 구체적 phase를 띄운다.
- 반복 상태 조회는 JSONL 전체 읽기 대신 tail/cache/snapshot 경로로 옮긴다.
- QA 기준은 latency warn/fail을 유지하되 “느린 이유가 표시되는가”를 별도 점수로 추가한다.

## 금지 UX

- 무한 spinner
- 도구 로그를 채팅 본문에 범람시키기
- 진행 이유 없는 “처리 중”
- 삭제/취소 후 부분 결과와 재개 지점이 사라지는 흐름
- QA/test session key가 사용자 대시보드 제목처럼 노출되는 흐름

## 현재 반영 상태

- `deriveSessionTitleFromRequest()` 추가.
- title 미입력 새 세션은 첫 request 기반 자동 제목을 사용.
- 수동 rename은 `titleMode: manual`로 고정.
- QA runner 기본 session key를 사람이 읽는 이름으로 변경.
- live test session cleanup 도구 추가.
- live-turn progress event/lane 추가.
- tool progress event는 채팅 본문이 아니라 compact lane 전용으로 기록.
- `gpao.appliedReplayInspector.get` payload에 `conversationProgressLane`을 포함하도록 live GPAO-T Gateway bridge 적용.
- OpenClaw/GPAO-T 대시보드의 기존 `gpao-work-pane__progress-lane`이 최근 progress item을 최대 4개까지 표시하도록 live UI dist 적용.
- 라이브 적용 백업: `docs/03-verification/evidence/live-conversation-ux-patch/2026-07-12T03-50-43-492Z`

## 2026-07-12 완료 검증

- `npm run check`: pass.
- `node --test test/live-turn-absorption-bridge.test.js test/session-workspace.test.js test/live-test-session-cleanup.test.js --test-concurrency=1 --test-timeout=120000 --test-reporter=spec`: 13 pass / 0 fail.
- `npm run qa:conversation-ux`: pass.
- live dist syntax:
  - `node --check /Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/gpao-t-B6WiwufB.js`: pass.
  - `node --check /Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui/assets/chat-page-BSHc822R.js`: pass.
- `openclaw gateway restart`: completed, new Gateway pid observed.
- `openclaw status --all`: Gateway reachable, Telegram OK, plugin compatibility none, sessions 4.
- `openclaw gateway call gpao.appliedReplayInspector.get`: `conversationProgressLane.status=ready`, `firstProgressUnderTarget=true`, `hasMidProgressBeforeComplete=true`, `toolLogsInBody=blocked`.

## 다음 구현 단위

1. 실제 사용자 대화에서 progress lane이 너무 길거나 산만해지는지 시각 QA.
2. assistant token streaming은 OpenClaw 기본 stream을 존중하고, GPAO-T는 semantic progress lane을 우선 유지.
3. 장시간 도구 작업에서 `tool_running -> tool_complete/error` 전환을 실제 tool runtime과 더 깊게 연결.
4. 대시보드 새로고침 없이 progress lane을 더 촘촘히 갱신하는 event-subscribe 연결 검토.
