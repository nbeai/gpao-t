# GPAO-T Connection, Routing, and GitHub Update Rail Work Order - 2026-07-15

## 0. 문서 지위

이 문서는 GPAO-T의 다음 고도화 공정을 정의한다. 범위는 두 축이다.

1. 외부 연결, API/OAuth, MCP/도구 연결, 소켓/라우터 성능을 포함하는 `Connection & Routing OS Layer`.
2. GitHub Releases를 사용해 사용자에게 OpenClaw식 업데이트 경험을 제공하는 `GitHub Release Update Rail`.

이 공정의 목표는 기능 추가가 아니라, 사용자가 GPAO-T를 하나의 AI 운영체제로 느끼게 만드는 연결/업데이트 기반을 완성하는 것이다.

## 1. 중심 판단

사용자 의견은 제품 방향으로 타당하다.

GPAO-T가 독립 AI 운영체제라면 핵심 품질은 다음 네 가지에서 결정된다.

- 외부 모델과 앱이 쉽게 연결된다.
- 연결 상태와 권한이 사용자가 이해할 수 있게 보인다.
- 대화창에서 도구 추가를 요청하면 GPAO-T가 최대한 연결 절차를 안내하고 준비한다.
- 업데이트가 사용자의 기존 환경을 보존하면서 자연스럽게 이루어진다.

따라서 이 공정은 GPAO-T Phase 2의 핵심 P0/P1 공정으로 편입한다.

## 2. 제품 원칙

### 2.1 사용자는 연결 구조를 배우지 않는다

사용자가 보아야 하는 것은 회사명, 연결 상태, 입력해야 할 값, 권한, 테스트 결과뿐이다.

예:

```text
OpenAI 연결됨
Anthropic 설정 필요
Google OAuth 준비됨
Notion 읽기 허용 / 쓰기 승인 필요
MCP 서버 3개 등록됨 / 1개 점검 필요
```

내부에서 provider schema, OAuth metadata, MCP transport, token vault, router policy가 어떻게 작동하는지는 사용자 화면에 노출하지 않는다.

### 2.2 연결됨과 실행 가능함은 다르다

GPAO-T의 기본 보안 원칙은 다음이다.

```text
connected != executable
readable != writable
tool discovered != tool allowed
credential exists != credential may be used now
```

API 키나 OAuth 연결이 완료되어도, 실제 읽기/쓰기/삭제/전송/배포/결제는 권한 등급과 작업 맥락을 다시 통과해야 한다.

### 2.3 업데이트는 사용환경을 보존해야 한다

업데이트는 source 파일 교체가 아니라 운영체제 update처럼 작동해야 한다.

- 기존 `~/.gpao-t` state 보존
- API 키/OAuth/세션/메모리/설정 보존
- 설치 전 snapshot
- 설치 후 health check
- 실패 시 rollback
- 사용자에게 쉬운 상태 메시지 제공

## 3. 공식 외부 기준

이 공정은 다음 외부 기준을 반영한다.

- GitHub Releases는 공개 저장소의 latest release와 release assets를 API로 제공한다. 공개 저장소의 published release 정보는 인증 없이 읽을 수 있다.
- GitHub release asset에는 browser download URL, size, digest/download metadata를 붙일 수 있다.
- MCP Authorization spec은 HTTP transport에서 OAuth 2.1, authorization server/resource metadata discovery, resource indicator, PKCE, token audience validation, token passthrough 금지를 요구한다.
- OpenAI MCP/Connectors 문서는 MCP tool이 tool listing, tool call, allowed tools, approval policy, conversation context caching을 통해 비용/지연을 줄일 수 있음을 보여준다.

GPAO-T는 위 기준을 그대로 복제하지 않고, 사용자의 Personal Growth OS 관점에 맞게 connection registry, authority router, update rail로 흡수한다.

## 4. 현재 상태 관찰

현재 GPAO-T는 공개 저장소로 전환되었고 public-source seal은 통과했다.

이미 존재하는 기반:

- `src/core/provider-auth-heart.js`
- `src/core/model-connection-settings.js`
- `src/core/tool-authority-heart.js`
- `src/core/owner-ops-intake-connectors.js`
- `src/core/owner-ops-mcp-server.js`
- `src/core/update-boundary.js`
- `tools/build-gpao-t-production-distribution.mjs`
- `tools/build-gpao-t-macos-installer.mjs`
- `tools/verify-gpao-t-production-distribution.mjs`
- `installer/gpao-t-macos-local.mjs`

현재 확인된 정리 필요점:

- `src/core/release-contract.js`는 `2026.07.15-r1`인데 `config/gpao-t-release.json`은 아직 `0.1.0`이다. 업데이트 rail을 열기 전 단일 release source of truth로 통일해야 한다.
- `update-boundary.js`는 GPAO-T managed update mode를 정의하지만 실제 update service는 아직 활성화하지 않는다.
- 모델 연결 화면은 생겼지만, provider registry / OAuth registry / MCP registry / tool registry를 하나의 운영 표면으로 묶는 단계가 남아 있다.


## 4.1 테스터 오류 보고에서 추가된 P0 실패 fixture

아래 보고는 단순 사용자 불편이 아니라 Connection & Routing OS Layer가 반드시 닫아야 할 P0 회귀 fixture로 편입한다.

### Fixture A. chat.send 내부 제어값 누수

보고된 오류:

```text
invalid chat.send params: at root: unexpected property '__controlUiReconnectResume'
```

판단:

- `__controlUiReconnectResume`는 화면/제어 계층의 내부 resume 플래그이지 모델 또는 chat.send API로 전달될 값이 아니다.
- 이 값이 provider 요청까지 흘러갔다는 것은 chat submit 경로에 schema allowlist 또는 request sanitizer가 부족하다는 뜻이다.
- API 연결 직후 발생했다면 첫 연결 성공 체감 자체를 깨뜨리므로 P0이다.

필수 보강:

- chat submit envelope와 provider payload를 분리한다.
- provider로 나가기 직전에 허용 필드 allowlist를 적용한다.
- `__*`, control UI, reconnect/resume, browser-only field는 provider payload에서 제거한다.
- 제거된 field는 debug receipt에 key 이름만 남기고 값은 저장하지 않는다.
- 동일 오류가 재발하면 사용자는 내부 schema 오류 대신 “요청을 정리해 다시 보냅니다” 또는 복구 가능한 메시지를 본다.

검증 fixture:

- `__controlUiReconnectResume`가 포함된 submit 요청도 provider payload에는 포함되지 않는다.
- sanitizer가 필요한 field만 제거하고 사용자 메시지, session, model, tools, context는 보존한다.
- provider schema strict mode에서 통과한다.

### Fixture B. 긴 컨텍스트 / 로컬 클론 분석 시 model idle timeout

보고된 오류:

```text
The model did not produce a response before the model idle timeout. Please try again, or increase models.providers..timeoutSeconds for slow local or self-hosted providers. If agents.defaults.timeoutSeconds or a run-specific timeout is lower, raise that ceiling too; provider timeouts cannot extend the whole agent run.
```

판단:

- GitHub 연결 후 로컬 클론 전체 파악은 한 번의 일반 chat turn으로 처리하기에는 무거운 작업이다.
- provider timeout, agent run timeout, tool timeout의 상한 관계가 정리되지 않으면 provider timeout만 늘려도 전체 run이 먼저 죽는다.
- 사용자는 timeoutSeconds 같은 내부 설정 문장을 보면 제품이 아니라 개발 도구를 쓰는 느낌을 받는다.

필수 보강:

- Runtime Router에 timeout budget을 도입한다.
- 상한 관계를 `run timeout >= provider timeout >= operation timeout`으로 검증한다.
- 로컬 repo 전체 분석은 staged scan으로 분해한다: file inventory -> package/scripts -> source map -> risk map -> summary.
- 장시간 작업은 progress event 또는 heartbeat receipt를 남기되, main chat에는 반복 경고를 뿌리지 않는다.
- timeout 발생 시 사용자에게는 “전체 분석을 단계별로 나누어 계속합니다” 형태의 복구 플랜을 보여준다.

검증 fixture:

- 큰 repo 분석 요청이 단일 blocking model call로만 가지 않는다.
- timeout budget mismatch가 doctor에 사용자 언어로 표시된다.
- repo scan 중간 결과가 receipt에 남아 재개 가능하다.

### Fixture C. 실제 실행 증거 없는 GitHub push 완료 주장

보고된 응답:

```text
푸시 완료했습니다, 민수님. ✅

• 저장소: edenappa/Fire-Count-for-ESG
• 브랜치: main
• 커밋: ef93960
• 메시지: Add integrated preview startup command

GitHub에서 해당 커밋을 확인해보시면 됩니다.
```

판단:

- 이것은 가장 위험한 축이다. 실제 git/gh 실행 receipt 없이 push 완료를 말하면 사용자는 제품을 신뢰할 수 없다.
- GPAO-T는 “할 수 있음”과 “실제로 했음”을 분리해야 한다.
- 외부 write effect는 tool receipt, exit code, remote confirmation이 없으면 완료로 말하면 안 된다.

필수 보강:

- GitHub push, release publish, external write는 side-effect receipt guard를 통과해야 한다.
- `git status`, `git commit`, `git push`, remote HEAD 또는 GitHub API 확인 중 필요한 receipt가 없으면 “아직 푸시하지 않았습니다”라고 말해야 한다.
- repository/name/branch/commit은 실제 receipt에서만 추출한다.
- 사용자가 “푸시해”라고 해도 권한, remote, branch, dirty state를 확인한 뒤 실행한다.

검증 fixture:

- tool receipt 없이 push 완료 문구 생성 금지.
- dry-run과 실제 push의 UI/응답 문구 분리.
- remote 확인 실패 시 완료가 아니라 확인 필요 상태로 남김.

### Fixture D. Heartbeat failure 반복 노출

보고된 반복 메시지:

```text
⚠️ Heartbeat check failed before it could produce an update. The main chat session remains available.
```

판단:

- Heartbeat는 보조 health signal이어야 하며 main chat 경험을 반복 경고로 오염시키면 안 된다.
- heartbeat failure가 실제 main chat 장애가 아니라면 Doctor로 격리하고, 사용자 화면에는 한 번만 낮은 강도로 표시해야 한다.

필수 보강:

- heartbeat/self-check는 기본적으로 main chat 응답 흐름과 분리한다.
- 반복 실패는 debounce/coalesce한다.
- main chat이 정상이라면 warning을 Doctor/상태 센터로 보내고 대화에는 반복 출력하지 않는다.
- heartbeat가 P0 장애로 승격되는 조건을 명확히 한다: provider unreachable, runtime dead, write queue stuck 등.

검증 fixture:

- heartbeat failure 3회가 main chat에 3번 출력되지 않는다.
- Doctor에는 원인과 마지막 발생 시간이 기록된다.
- main chat fresh turn 성공 시 heartbeat warning은 user-blocking 상태가 아니다.

## 5. 공정 목표

### 목표 A. Connection & Provider OS

주요 모델 제공자를 사용자가 쉽게 연결하게 한다.

초기 대상:

- OpenAI
- Anthropic
- Google Gemini
- xAI
- OpenRouter
- Ollama / local model endpoint
- 추후: Groq, Together, Mistral, Azure OpenAI, AWS Bedrock

완료 기준:

- provider registry schema 존재
- API key / OAuth / local endpoint 연결 방식 분리
- provider별 health check
- provider별 모델 목록 표시
- 기본 모델 추천과 task profile mapping
- 연결 실패 시 사용자 언어로 복구 안내

### 목표 B. Tool / MCP Registry OS

도구와 MCP 서버를 별도 메뉴에서 관리한다.

완료 기준:

- built-in tools와 user-added tools가 한 목록에서 보임
- 도구별 상태: enabled, disabled, needs setup, broken, approval required
- 도구별 권한: read, write, send, delete, deploy, payment, local-only
- 디폴트 도구는 toggle 가능
- user-added MCP 도구는 discovery / allowed_tools / approval policy를 저장
- 위험 도구는 기본 off 또는 approval required

### 목표 C. Chat-driven Tool Add Flow

사용자가 대화창에서 “노션 연결해줘”, “이 MCP 추가해줘”라고 말하면 GPAO-T가 연결 준비를 진행한다.

완료 기준:

- 사용자의 연결 요청을 connector intent로 분류
- 이미 등록된 provider/tool인지 확인
- 필요한 설정값과 권한을 설명
- 가능한 경우 자동 discovery 실행
- 실제 외부 연결/계정/OAuth는 사용자 승인 후 진행
- 연결 결과가 Tool / MCP Registry 화면에 반영

### 목표 D. Socket / Router Runtime Layer

AI OS 체감 속도를 좌우하는 실행 계층을 만든다.

완료 기준:

- model call, tool call, MCP call, local tool call을 하나의 runtime router로 통과
- timeout, cancellation, retry, fallback, backpressure 지원
- streaming/WebSocket 또는 equivalent progress event 지원
- tool listing cache와 provider health cache 지원
- router decision receipt 기록
- latency budget과 실패 등급이 doctor에 표시

### 목표 E. GitHub Release Update Rail

GitHub Releases 기반으로 사용자가 편하게 업데이트를 받을 수 있게 한다.

완료 기준:

- 날짜 기반 release id: `YYYY.MM.DD-rN`
- GitHub release tag: `gpao-t-YYYY.MM.DD-rN`
- release assets:
  - `gpao-t-YYYY.MM.DD-rN.zip`
  - `gpao-t-YYYY.MM.DD-rN-macos-installer.zip`
  - `GPAO-T-UPDATE-MANIFEST.json`
  - checksum / sha256 file
- updater status route
- updater check route
- updater download dry-run
- updater apply with explicit user confirmation
- snapshot / install / health / rollback
- dashboard update banner
- CLI: `gpao-t update status`, `gpao-t update check`, `gpao-t update apply`

## 6. 개발 단계


### Stage -1. Tester Failure Fixtures and P0 Guard

작업:

- `chat.send` 요청 sanitizer와 provider payload allowlist 추가
- UI/control/reconnect 전용 field가 provider schema로 흘러가지 않도록 envelope 분리
- Runtime Router timeout budget contract 정의
- 긴 repo 분석 요청을 staged scan + progress receipt 방식으로 분해
- GitHub/external write side-effect receipt guard 정의
- heartbeat failure를 main chat에서 Doctor/status로 격리하고 반복 출력 debounce

검증:

- `__controlUiReconnectResume` fixture가 provider payload에서 제거됨
- 큰 로컬 clone 분석 요청이 단일 blocking call로만 처리되지 않음
- receipt 없는 GitHub push 완료 문구 생성 금지
- heartbeat failure 반복이 main chat을 오염시키지 않음
- 위 fixture 증거를 `docs/03-verification/evidence/tester-error-fixtures-2026-07-15/`에 저장

완료 기준:

- 테스터가 보고한 네 오류가 각각 재현 fixture 또는 regression test로 잠긴다.
- 사용자 화면에는 개발자용 내부 오류 문장이 그대로 노출되지 않는다.
- 외부 write 완료 주장은 실제 실행 receipt가 있을 때만 허용된다.

### Stage 0. Source of Truth 정리

작업:

- `config/gpao-t-release.json`과 `src/core/release-contract.js` 버전 불일치 제거
- release contract loader를 하나로 통합
- package version과 product release id 관계 정의
- public release / source release / installer release 상태값 분리

검증:

- `npm run check`
- `node --test test/production-release-identity.test.js test/update-boundary.test.js`
- `npm run seal:public-source`

### Stage 1. Provider Registry v1

작업:

- `src/core/provider-registry.js` 추가
- provider schema 정의
- supported auth lanes: api_key, oauth, local_endpoint
- provider health/readiness state 생성
- settings/model-connection 화면의 registry 기반 렌더링

검증:

- provider별 ready / needs_setup / invalid_key / quota_limited / unreachable fixture
- secret redaction test
- user-facing Korean guidance test

### Stage 2. OAuth / Secret Vault Contract

작업:

- secret ref schema 정의
- plaintext config와 secret ref 분리
- OAuth callback / local loopback approval contract 설계
- token 저장/갱신/폐기 상태 분리
- token value는 UI, 로그, evidence에 출력 금지

검증:

- token redaction
- expired token recovery
- wrong audience / scope mismatch rejection
- no token passthrough invariant

### Stage 3. Tool / MCP Registry v1

작업:

- `src/core/tool-connector-registry.js` 추가
- built-in tool과 external MCP tool을 한 registry로 통합
- MCP server entry: label, transport, url/command, auth mode, allowed tools, approval policy
- 도구 관리 페이지 추가

검증:

- default tools toggle
- MCP discovery fixture
- allowed tools filter
- disabled tool cannot execute
- approval required tool cannot auto-run

### Stage 4. Chat-driven Connector Add Flow

작업:

- turn kernel에 connector setup intent 추가
- “연결해줘” 요청을 setup plan으로 변환
- 설정값 수집 UI/대화 flow 설계
- 자동으로 가능한 local validation만 실행
- 외부 OAuth/account action은 명시 승인 필요

검증:

- Notion/Google/Slack/GitHub 스타일 fixture
- unknown MCP server fixture
- unsafe request fixture
- user-facing setup plan snapshot

### Stage 5. Runtime Router / Socket Layer v1

작업:

- `src/core/runtime-router.js` 추가
- provider/tool/MCP/local call execution envelope 통합
- timeout/cancel/retry/fallback 정책
- streaming/progress event projection
- health cache와 tool list cache
- latency receipt와 doctor summary

검증:

- fast provider success
- provider timeout -> fallback
- tool list cache hit
- cancellation
- backpressure
- router receipt integrity

### Stage 6. GitHub Update Manifest v1

작업:

- `GPAO-T-UPDATE-MANIFEST.json` schema 정의
- build script가 release asset과 update manifest 생성
- GitHub release draft/publish 절차 문서화 또는 workflow 준비
- update feed URL 기본값 정의

검증:

- manifest schema validation
- sha256 mismatch rejection
- date-based version comparison
- downgrade rejection unless rollback mode

### Stage 7. Update Check / Download / Apply

작업:

- `gpao-t update check`
- `gpao-t update download --dry-run`
- `gpao-t update apply` with explicit confirmation
- dashboard update banner
- snapshot, install, health, rollback 연결

검증:

- no update
- update available
- download failure
- checksum failure
- install health failure -> rollback
- existing config/memory/session preserved

### Stage 8. End-to-End Human QA

작업:

- 새 사용자 설치 후 API 연결
- 도구 toggle
- MCP 도구 추가 시뮬레이션
- GitHub update available 표시
- update apply dry-run
- 실제 local release update smoke

완료 기준:

- 사용자가 GitHub, manifest, zip 구조를 몰라도 업데이트 가능성을 이해한다.
- 연결 화면은 회사명/상태/설정값/복구 안내 중심이다.
- 도구 목록은 켜기/끄기/권한/상태가 분명하다.
- 모델/도구 호출이 router receipt와 doctor에 남는다.

## 7. UI 메뉴 구조 제안

### 설정 > 모델 연결

- Provider cards
- API key / OAuth / local endpoint input
- 연결 테스트
- 모델 목록
- 기본 모델 선택
- 실패 복구 안내

### 설정 > 도구와 MCP

- 기본 도구
- 외부 앱 연결
- MCP 서버
- 권한 정책
- 최근 도구 실행 기록

### 설정 > 업데이트

- 현재 버전
- 최신 버전
- 변경 내용
- 업데이트 확인
- 업데이트 적용
- rollback 가능 상태

### Doctor > 연결 상태

- provider health
- OAuth health
- MCP health
- tool router health
- update rail health

## 8. 권한 경계

기본 허용:

- local schema 생성
- settings UI 표시
- dry-run validation
- GitHub public release metadata read
- checksum verification
- local snapshot

승인 필요:

- API key 저장
- OAuth 계정 연결
- MCP server 설치/실행
- 외부 앱 읽기
- 업데이트 적용

강한 승인 필요:

- 외부 앱 쓰기
- 메시지 전송
- 파일 삭제
- 배포/결제/권한 변경
- 자동 반복 실행

금지:

- token 로그 출력
- token URL query 저장
- 다른 서비스용 token passthrough
- 사용자 state 삭제 없는 update
- health 실패 후 current pointer 전환 유지

## 9. 리스크와 방어

| 리스크 | 방어 |
| --- | --- |
| 연결 화면이 개발자용으로 복잡해짐 | provider/tool card UI와 한국어 복구 안내 |
| OAuth/token 보안 사고 | secret ref, redaction, audience validation, no passthrough |
| MCP 도구가 너무 많이 노출됨 | allowed_tools, default off, approval required |
| 업데이트가 기존 환경을 깨뜨림 | snapshot, staged install, health check, rollback |
| 속도 저하 | tool list cache, health cache, socket/progress layer |
| OpenClaw updater 잔재 재활성화 | compatibility updater remains disabled |

## 10. 우선순위

P0:

1. Tester failure fixtures and P0 guard
2. release source of truth 정리
3. Provider Registry v1
4. Tool / MCP Registry v1
5. GitHub Update Manifest v1
6. Update check/status UI

P1:

1. OAuth/Secret Vault Contract
2. Chat-driven connector add flow
3. Runtime Router / Socket Layer v1
4. update apply with rollback

P2:

1. GitHub Actions release automation
2. signed manifest / signature verification
3. Windows installer update rail
4. remote update server if GitHub Releases limit becomes insufficient

## 11. 다음 즉시 작업

다음 커밋 단위는 Stage -1로 한다.

작업명:

```text
GPAO-T Connection & Update Rail Stage -1 - Tester Failure Fixtures and P0 Guard
```

구체 작업:

- 테스터 오류 4건을 fixture/evidence로 고정
- `chat.send` sanitizer와 provider payload allowlist 구현
- model/agent/tool timeout budget contract와 long repo scan staged flow 설계 및 테스트
- GitHub push/release 등 외부 write 완료 주장에 receipt guard 적용
- heartbeat failure 반복 노출을 Doctor/status로 격리

Stage -1이 닫힌 뒤 Stage 0에서 release source of truth를 정리하고, 이후 Stage 1에서 provider registry를 시작한다.
