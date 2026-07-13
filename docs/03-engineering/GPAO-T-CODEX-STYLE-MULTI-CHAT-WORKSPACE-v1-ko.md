# GPAO-T Codex-Style Multi Chat Workspace v1

Date: 2026-07-11
Status: implemented local contract
Track: B Operating Surface, with A Core Kernel support

## 0. 목표

GPAO-T 대시보드를 단순 세션 목록이 아니라 Codex처럼 여러 대화창/작업창을 운영하는 작업 OS 표면으로 확장한다.

이번 v1의 완료 기준은 live OpenClaw를 직접 재시작하거나 외부 행동을 여는 것이 아니다.

이번 v1의 완료 기준은 다음이다.

```text
Thread + Session + ContextPacket + MemoryScope + AuthorityGate + ActivityEvent
```

이 결합 모델을 GPAO-T 내부 상태, Gateway, CLI, Work Surface, 테스트에 연결한다.

## 1. 구현된 것

### 세션 생명주기

기존 `session-workspace`를 보존하면서 세션 record를 확장했다.

지원 동작:

- `new_session`
- `select_session`
- `rename`
- `toggle_pin`
- `archive`
- `restore`
- `mark_delete_pending`
- `cancel_delete_pending`

영구 삭제는 지원하지 않는다.

```text
permanent_delete -> blocked
```

### v2 세션 필드

각 세션은 이제 다음 필드를 가진다.

- `threadId`
- `sessionId`
- `workspaceId`
- `titleMode`
- `pinned`
- `groupId`
- `lifecycle`
- `activeTargetId`
- `contextPacket`
- `memoryScope`
- `replayState`
- `authorityGate`
- `activitySummary`
- `lastOpenedAt`
- `lastUserActivityAt`
- `lastAgentActivityAt`

### 새 계약

추가 파일:

- `src/core/multi-chat-workspace.js`

핵심 함수:

- `buildCodexStyleMultiChatWorkspace`
- `verifyCodexStyleMultiChatWorkspace`

schema:

```text
gpao_t.codex_style_multi_chat_workspace.v1
```

### Gateway / CLI

추가 Gateway route:

- `GET /multi-chat-workspace`
- `GET /multi-chat-workspace/verify`

추가 CLI:

- `gpao-t control multi-chat-workspace`
- `gpao-t control multi-chat-workspace-check`

### Work Surface 연결

`core-work-surface`의 `sessionWorkspace`에 Codex-style workspace 요약을 붙였다.

추가 노출:

- active thread id
- thread count
- pinned/recent/archived count
- thread context section
- memory scope section
- activity stream section
- inspector `memory` tab
- inspector `replay` tab

## 2. 메모리 / 맥락 원칙

GPAO-T 멀티 대화창은 단순 채팅 목록이 아니다.

세션 전환은 곧 맥락 전환이다.

따라서 v1은 다음 범위를 분리한다.

- global memory
- workspace memory
- group memory
- thread memory
- ephemeral turn context

답변 anchor로 쓰려면 다음 조건이 필요하다.

```text
active target admission + replay
```

후보 기억은 자동으로 지속 기억이 되지 않는다.

## 3. 권한 경계

이번 v1에서 허용된 것:

- 로컬 세션 상태 쓰기
- 이름 변경
- 보관
- 복구
- 삭제 대기
- 삭제 대기 취소
- read-only replay
- memory candidate review

이번 v1에서 닫힌 것:

- permanent delete
- durable memory promotion
- OpenClaw memory write
- automatic admission
- external send
- connector activation
- model provider call
- public release
- live OpenClaw UI overwrite
- Gateway restart

## 4. OpenClaw 흡수 방향

순정 OpenClaw 쪽에는 다음 강점이 있다.

- `sessions.list`
- `sessions.create`
- `sessions.patch`
- `sessions.delete`
- `sessions.subscribe`
- `sessions.messages.subscribe`
- `sessions.changed`
- `session.message`

GPAO-T v1의 다음 흡수 과제는 OpenClaw의 실시간 session/event layer를 GPAO-T의 안전한 workspace contract에 연결하는 것이다.

주의:

```text
/gpao-t-workspace는 보조 evidence surface다.
최종 본류는 live OpenClaw/GPAO-T dashboard 안의 Session Rail + Active Work Session + Inspector다.
```

## 5. 검증

추가 테스트:

- `test/multi-chat-workspace.test.js`

확인한 항목:

- 세션이 thread/session/context/memory/authority 단위로 승격된다.
- 이름 변경, 보관, 복구, 삭제 대기, 영구 삭제 차단이 유지된다.
- Gateway와 CLI가 multi-chat workspace 계약을 노출한다.
- Work Surface가 memory/replay inspector와 context/memory sections를 노출한다.

실행한 검증:

```text
node --test gpao-t/test/session-workspace.test.js gpao-t/test/multi-chat-workspace.test.js gpao-t/test/workspace-shell.test.js
```

결과:

```text
8 tests passed
```

## 6. 다음 단계

다음 개발 단위:

1. OpenClaw live session RPC/event layer와 GPAO-T workspace contract 연결
2. 실제 live dashboard에서 rename/archive/delete-pending UI action readback
3. 세션별 message/context isolation test
4. mobile action sheet와 inspector sheet 시각 QA
5. memory candidate review queue를 active thread별로 필터링

