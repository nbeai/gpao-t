# GPAO-T vs OpenClaw Advancement Baseline - 2026-07-13

Status: advancement baseline for GPAO-T after first-completion state
Owner: 윤
Purpose: compare pure/OpenClaw-style runtime strengths with current GPAO-T so Phase 2 hardening does not drift.

## 0. Current Position

윤의 현재 판단을 기준으로, GPAO-T는 1차 완성 상태에서 고도화 단계로 들어간다.

이 문서의 비교 기준은 다음이다.

- OpenClaw는 더 이상 GPAO-T의 정체성이나 조상이 아니다.
- OpenClaw는 별도 제품이자 비교 대상이며, GPAO-T가 분석할 수 있는 저수준 런타임 안정성 레퍼런스다.
- GPAO-T는 OpenClaw를 고친 제품이 아니라, 개인의 의도, 맥락, 기억, 권한, 실행, 검증, 성장 루프를 운영하는 Growth Personal AI Operating System이다.

주의: 예전 문서에 있던 local pure source path `openclaw-clean-lab/github-openclaw-source`는 현재 작업공간 정리 이후 바로 확인되는 위치에는 없다. 대신 2026-07-13에 로컬 전역 설치본 `openclaw 2026.6.11`을 제품 밖 reference 표본으로 `/Users/jyp/Developer/_references/openclaw-pure-2026.6.11`에 고정했다. 이 표본은 GPAO-T 제품 소스가 아니라 외부 비교/해부 기준이다. 정확한 upstream GitHub commit 단위 diff가 필요하면 별도 네트워크 pass에서 공식 소스를 다시 pin한다.

## 1. 한 줄 결론

OpenClaw의 강점은 로컬 AI gateway/substrate의 폭과 실전성이다.
GPAO-T의 강점은 그 substrate 위에 사용자 맥락, 기억, 권한, replay, self-growth를 OS 원리로 세우려는 제품 정의와 현재 실물이다.

따라서 다음 고도화의 핵심은 OpenClaw의 안정적인 런타임 패턴을 분석하고, GPAO-T의 Personal Growth OS 구조에 맞게 재설계해 내재화하는 것이다.

## 2. OpenClaw의 강점

### 2.1 로컬 런타임 몸체

OpenClaw는 로컬 PC 위에서 gateway, CLI, dashboard, agent runner, provider SDK, channel adapter, tool/plugin/MCP 계층을 묶는 몸체가 강하다.

현재 설치본 기준으로도 다음 자산이 확인된다.

- CLI entry: `openclaw`
- gateway/dashboard runtime
- provider SDK: OpenAI, Anthropic, Google, Mistral 등
- Telegram/channel 계층
- MCP SDK
- WebSocket/Express 기반 local control surface
- plugin/skills/docs 구조
- session/event 중심의 agent runtime

비개발자식 해석: OpenClaw는 이미 “내 컴퓨터에서 AI와 도구들을 연결해 돌리는 기본 엔진룸”이 꽤 갖춰져 있다.

### 2.2 세션과 이벤트 계층

기존 문서 기준 OpenClaw에는 `sessions.list`, `sessions.create`, `sessions.patch`, `sessions.delete`, `sessions.subscribe`, `sessions.messages.subscribe`, `session.message` 같은 session/event primitive가 있다.

이건 GPAO-T의 멀티 대화창, 작업 대화, Telegram 전용 세션, 세션별 기억/맥락 분리에 계속 배워야 할 지점이다.

### 2.3 provider/tool/plugin 폭

OpenClaw는 다양한 모델 제공자, 도구, plugin, MCP, channel을 다루는 넓은 기반을 갖는다. GPAO-T가 처음부터 다 직접 만들면 오래 걸리고 위험하다.

재설계된 내재화 방향:

- provider auth lifecycle
- model router/provider fallback
- tool call lifecycle
- plugin capability registry
- MCP server configuration
- channel adapter structure

### 2.4 설정/진단/복구 자산

OpenClaw는 doctor/status/log/device/pairing 같은 운영 진단 개념이 있다. GPAO-T가 일반 사용자용 OS가 되려면 이 개념을 더 쉬운 언어로 재설계해 내재화해야 한다.

## 3. OpenClaw의 약점

### 3.1 사용자 표면이 개발자/운영자 쪽으로 샌다

OpenClaw는 강력하지만 화면과 문구가 종종 개발자 표면을 드러낸다. 예: token, WebSocket URL, provider auth, debug, admission, Context Source 같은 용어가 그대로 노출되면 일반 사용자는 불안해진다.

GPAO-T 기준 개선 원칙:

- 내부 용어는 숨긴다.
- 사용자는 “현재 상태, 다음 행동, 승인 필요 여부, 복구 가능성”을 본다.
- 기술 디버그 정보는 설정/진단의 고급 영역으로 보낸다.

### 3.2 기억과 맥락이 OS 커널 수준은 아니다

OpenClaw의 memory/search/session은 강력한 부품이지만, GPAO-T가 원하는 수준의 Context Mesh, T-cell admission, replay-proven growth까지 자동으로 제공하지 않는다.

비개발자식 해석: OpenClaw는 “기억을 찾는 기능”은 줄 수 있지만, “그 기억이 지금 답변에 들어가도 되는지 판단하고, 틀렸을 때 성장 후보로 만들고, 검증 후 반영하는 체계”는 GPAO-T가 만들어야 한다.

### 3.3 라이브 경로와 사용자 체감 검증이 약해질 수 있다

최근 GPAO-T 작업에서 드러났듯 화면이 열려도 실제 provider auth가 깨질 수 있다. 이것은 저수준 local runtime 패턴을 GPAO-T 구조로 재설계하는 과정에서 특히 주의해야 할 위험이다.

GPAO-T 완료 판단은 반드시 다음을 포함해야 한다.

- health
- dashboard open
- user-visible surface
- fresh chat turn through provider/model
- no new fatal/auth/provider/runtime error in logs

### 3.4 정체성 혼합 위험

OpenClaw 이름, 경로, 설정, sqlite store, plugin warning, package trace가 남으면 사용자는 “이게 GPAO-T인지 OpenClaw인지” 헷갈린다.

이제 OpenClaw는 비교 대상이고 compatibility reference일 뿐이다. 사용자에게 보이는 모든 것은 GPAO-T여야 한다.

## 4. GPAO-T의 강점

### 4.1 제품 정의가 더 강하다

GPAO-T는 단순 agent runtime이 아니라 Growth Personal AI Operating System으로 정의된다.

핵심 차별점:

- 사용자의 의도 복원
- Context Mesh 기반 맥락 선택
- Memory Wiki / memory candidate / review queue
- T-cell admission
- replay / verification
- approval / authority gate
- self-growth candidate
- local runtime install/update/rollback
- user-facing OS surface

### 4.2 사용자 중심 UX 원칙이 명확하다

GPAO-T는 개발자 대시보드가 아니라 일반 사용자의 작업 OS가 되어야 한다.

현재 방향:

- nBeAI. GPAO-T branding
- 새 대화/작업 대화/Telegram 전용 세션
- Codex식 멀티 대화창 지향
- 상단 개발자 strip 제거/숨김
- 채팅 중간 진행감/bridge 출력
- 첫 입력 기반 자동 제목
- 사용자 표면에서 OpenClaw 잔재 제거

### 4.3 기억/맥락/자가성장에 대한 철학이 있다

OpenClaw의 memory는 기능이고, GPAO-T의 memory는 운영체제 기관이다.

GPAO-T는 다음을 구분한다.

- 원본 기록
- 후보 기억
- 현재 답변에 들어갈 context packet
- replay 통과 여부
- 승인 상태
- durable memory promotion
- self-growth proposal

### 4.4 검증/봉인 문화가 생겼다

GPAO-T에는 단순 테스트 외에 evidence, route crawl, live QA, rollback/reinstall receipt, package verification, completion integrity rule이 생겼다.

이건 고도화에서 매우 큰 자산이다. 앞으로 “됐다”는 말은 기능 구현이 아니라 사용자 경험까지 검증했을 때만 쓸 수 있다.

## 5. GPAO-T의 현재 약점

### 5.1 compatibility 접합부가 아직 약하다

최근 provider auth 문제처럼 GPAO-T-named store와 OpenClaw compatibility store가 갈라지면 화면은 열리지만 답변이 실패한다.

개선 방향:

- auth store canonical path 단일화
- migration/repair doctor 자동화
- install/reinstall 후 fresh chat turn 필수 smoke
- 내부 compatibility trace는 사용자 표면에서 완전 차단

### 5.2 memory search는 quota/provider에 의존하면 안 된다

OpenAI embedding quota 또는 provider 설정 문제 때문에 “메모리 검색 불가”가 뜨면 GPAO-T의 기본기가 약해 보인다.

개선 방향:

- local-first lexical search 기본 탑재
- local embedding option
- provider embedding은 고급 의미 검색 layer로 격상
- provider 실패 시에도 기본 memory/context recall은 계속 작동
- offloaded/iCloud placeholder 파일 skip/degraded evidence 처리

### 5.3 OpenClaw 순정 baseline을 다시 고정해야 한다

정확한 비교를 위해서는 순정 OpenClaw source/version/commit을 다시 확보하고 GPAO-T와 파일/기능/UX 단위 비교표를 만들어야 한다.

현재 가능한 비교는 충분히 유효하지만, 고도화 엔지니어링 기준으로는 exact source diff baseline이 필요하다.

### 5.4 성능/체감 속도는 고도화 대상이다

대화 QA에서 긴 latency가 관찰된 이력이 있다. GPAO-T가 OS로 느껴지려면 답변이 늦을 때도 사용자가 답답하지 않아야 한다.

개선 방향:

- 0~1초 내 local-first status signal
- 3초 내 작업 진행 bridge
- tool usage 중 compact progress lane
- 긴 작업은 streaming/progress narration
- memory/context read는 cache/tail/index 기반으로 최적화

## 6. 우리가 OpenClaw에서 배워야 할 것

여기서 “훔쳐온다”는 뜻은 복제나 흡수가 아니라, 공학 패턴을 분석한 뒤 GPAO-T식으로 재설계해 내재화한다는 뜻이다.

### 6.1 Gateway/session/event architecture

분석할 패턴:

- session list/create/patch/delete/subscribe
- message event streaming
- queued send/abort/retry
- websocket lifecycle
- reconnect handling

GPAO-T식 재구성:

- session -> work thread
- message -> task packet event
- event -> trace/replay source
- reconnect -> user-facing recovery state

### 6.2 Provider auth lifecycle

분석할 패턴:

- provider profile
- agent auth store
- portable auth
- doctor/status repair

GPAO-T식 재구성:

- 사용자는 “API 키 없음”이 아니라 “모델 연결이 끊겼고 복구가 필요함”을 본다.
- 내부적으로는 canonical auth store, compatibility migration, secret-safe diagnostics를 자동 실행한다.

### 6.3 Plugin/MCP capability model

분석할 패턴:

- capability registration
- plugin manifest
- MCP server config
- tool allow/block policy

GPAO-T식 재구성:

- plugin list가 아니라 “이 작업에서 허용된 능력”으로 보여준다.
- read/write/send/spend/deploy/credential/public 같은 side-effect class로 authority gate를 세운다.

### 6.4 Channel adapters

분석할 패턴:

- Telegram direct routing
- channel identity
- account/conversation/thread separation

GPAO-T식 재구성:

- Telegram은 하나의 전용 direct session으로 고정
- dashboard multi-session과 충돌하지 않게 mapping
- 외부 발송은 별도 authority boundary

### 6.5 Runtime packaging and install discipline

분석할 패턴:

- local daemon/service lifecycle
- logs/state/config separation
- update/restart/repair path

GPAO-T식 재구성:

- `~/.gpao-t` canonical runtime
- Docker universal lane
- macOS owner lane
- snapshot/rollback/receipt 기본화

## 7. OpenClaw에서 그대로 가져오면 안 되는 것

- 개발자/운영자 문구를 사용자 화면에 그대로 노출
- provider/auth/gateway/token 문제를 사용자에게 raw error로 노출
- memory retrieval을 self-growth로 착각
- plugin 연결을 OS 완성으로 착각
- 기능이 있다는 이유로 사용자 체감 검증 없이 완료 선언
- OpenClaw path/name/schema를 GPAO-T identity와 섞어두기

## 8. 차별점 요약표

| 항목 | OpenClaw | GPAO-T |
| --- | --- | --- |
| 제품 정체성 | multi-channel AI gateway | Growth Personal AI Operating System |
| 핵심 강점 | gateway/tool/channel/provider substrate | intent/context/memory/authority/replay/growth OS |
| 사용자 표면 | 개발자/운영자 성격이 남음 | 일반 사용자 작업 OS 지향 |
| 기억 | search/session/memory 기능 | Context Mesh + Memory Wiki + T-cell admission + replay |
| 자동화 | plugin/tool/channel execution | authority-bounded execution and growth proposal |
| 세션 | chat/session 중심 | work thread/session/context/memory 단위 |
| 검증 | health/status/doctor 중심 | health + visual QA + live chat + logs + evidence + rollback |
| 배포 | OpenClaw package/runtime | GPAO-T package + ~/.gpao-t + Docker/macOS lanes |
| 위험 | 강력하지만 의도/권한이 섞일 수 있음 | 새 커널과 compatibility 접합부가 약해질 수 있음 |

## 9. Phase 2 우선순위

### P0. Exact OpenClaw baseline 재고정

- 순정 OpenClaw source/version/commit 확보
- 현재 GPAO-T와 source/function/UX/ops 비교 matrix 작성
- “OpenClaw에서 온 것 / GPAO-T가 대체한 것 / 아직 compatibility인 것” 분류

### P1. Runtime/auth/memory 기본기 강화

- auth store canonicalization
- provider missing-auth user-safe recovery
- local-first memory search
- semantic embedding fallback/local option
- iCloud/offloaded file safe reader

### P1. User-experience completion gate 강화

- 모든 완료 보고 전 fresh chat turn 확인
- 브라우저 시각 검토
- 로그 fatal/auth/provider error 확인
- 설정/로그인/메모리/Telegram/direct session route까지 사용자 관점 QA

### P2. OpenClaw 강점의 GPAO-T식 재설계

- session/event layer를 GPAO-T workspace contract에 더 깊게 연결
- tool/plugin/MCP capability를 authority ledger와 통합
- channel adapter identity mapping 정교화

### P2. OS 체감 강화

- 챗앱 느낌 제거
- 작업 진행, 현재 목표, 기억 근거, 승인 경계, 복구 상태를 사용자가 쉽게 느끼게 만들기
- 긴 응답/도구 작업 중 bridge/progress/streaming 경험 개선

## 10. Decision

GPAO-T Phase 2의 첫 비교 결론은 다음이다.

1. OpenClaw는 버릴 대상이 아니라 공학적으로 배울 비교 제품이다.
2. GPAO-T는 OpenClaw보다 기능이 많아지는 것이 목표가 아니라, 사용자의 성장과 맥락을 운영하는 OS가 되는 것이 목표다.
3. OpenClaw에서 가장 먼저 분석해 GPAO-T식으로 재설계할 자산은 session/event/provider/auth/plugin/channel/runtime packaging이다.
4. GPAO-T가 반드시 더 잘해야 할 영역은 memory/context/self-growth/authority/user-facing completion integrity다.
5. 다음 pass는 exact OpenClaw baseline을 다시 확보하고, 이 문서를 source-diff 기반 비교표로 확장하는 것이다.
