# GPAO-T Tool Parity Gate v0.1

## Status

2026-07-14 기준 제품 게이트로 채택한다.

## Principle

GPAO-T는 OpenClaw와 다른 독립 제품이다.  
하지만 OpenClaw가 제공하던 기본 도구 능력보다 부족한 상태로 “더 나은 개인 AI 운영체제”라고 주장할 수 없다.

따라서 GPAO-T는 다음 기준을 만족해야 한다.

1. 사용자가 일반 대화에서 자연스럽게 기대하는 기본 도구는 즉시 작동해야 한다.
2. 위험한 도구는 숨기거나 제거하는 것이 아니라, GPAO-T식 권한 경계 안에서 승인 후 작동해야 한다.
3. 설정이 필요한 외부 공급자 도구는 사용자가 이해할 수 있는 상태/복구 안내를 제공해야 한다.
4. 도구가 “목록에 있음”은 완료가 아니다. 실제 대화, 대시보드, 로그에서 작동 증거가 있어야 한다.
5. 완료 보고는 Safari 또는 실제 사용자 표면에서 확인한 뒤에만 가능하다.

## Plain-Language Meaning

쉽게 말하면 이렇다.

- 웹검색 같은 기본 도구가 빨간 오류로 터지면 실패다.
- 메모리 검색이 결제/쿼터 문제로 막히면 실패다.
- 파일, 브라우저, 문서, 로컬 작업 도구는 제품 안에 있지만 사용자가 못 쓰면 실패다.
- 단, 파일 쓰기/기기 제어/외부 전송처럼 위험한 기능은 바로 켜는 것이 아니라 “승인하고 실행” 구조여야 한다.

## Current Live Baseline

현재 라이브 GPAO-T에서 확인한 enabled 플러그인:

- `duckduckgo`
- `memory-core`
- `openai`
- `telegram`
- `web-readability`

확인된 복구:

- `web_search`: DuckDuckGo 기반으로 Safari 실제 대화 경로에서 성공
- `web_fetch/readability`: Safari 실제 대화 경로에서 `https://example.com/` 읽기 성공
- `memory_search`: 원격 embedding 쿼터 의존을 끊고 로컬 FTS 기준으로 정상화

증거:

- `docs/03-verification/evidence/live-basic-tools-repair/SAFARI-WEB-SEARCH-SMOKE-2026-07-14.md`
- `docs/03-verification/evidence/live-basic-tools-repair/SAFARI-WEB-FETCH-READABILITY-SMOKE-2026-07-14.md`

### 2026-07-14 Live Doctor/Status Notes

현재 `gpao-t status --all --json`과 `gpao-t doctor --lint --json` 기준:

- Gateway: reachable, loopback live
- Chat/session: main agent active, sessions present
- Memory: `provider: none`, FTS ready, vector semantic search off
- Web search: DuckDuckGo plugin enabled after repair
- Web fetch/readability: Web Readability plugin enabled after repair
- LaunchAgent: Gateway/Node service not installed
- Codex runtime route: configured model uses Codex runtime while `plugins.entries.codex` is disabled
- Plugin registry: persisted registry is available after refresh
- Security: `gpao-t.json` contains plaintext secret-bearing fields

해석:

- 현재 상태는 "기본 대화, 웹검색, 웹페이지 읽기, 로컬 텍스트 기억 검색이 작동하는 상태"다.
- 그러나 "내부 프로덕션 패키지 기본기"로는 아직 LaunchAgent 설치/복구, Codex plugin 정합성, secret migration이 닫혀야 한다.
- semantic/vector memory는 꺼져 있으므로 "의미 기반 고급 기억 검색"은 아직 완료가 아니다. 로컬 embedding provider 또는 안전한 원격 provider 설정이 별도 결정되어야 한다.

### 2026-07-14 P0 Tool Parity Update

P0 기본 도구군 중 다음은 라이브 사용자 경로에서 확인했다.

- Web search: Safari 대화창에서 실제 웹검색 도구 호출과 답변 확인
- Web fetch/readability: Safari 대화창에서 `Web Fetch from https://example.com/` 도구 호출과 답변 확인
- Memory search: 비샌드박스 `gpao-t memory status --json` 기준 `provider: none`, FTS available, index identity valid
- Runtime status: `/health` 응답 `{"ok":true,"status":"live"}`

아직 완료로 부르지 않는 항목:

- Semantic/vector memory: 현재 꺼져 있음. 기본 기억 검색 실패는 아니지만 고급 의미 검색은 미완성이다.
- Codex runtime route warning: `plugins.entries.codex`를 무리하게 켜면 `plugin not installed: codex` 경고가 생기므로, 공식 GPAO-T Codex plugin 설치 또는 런타임 정책 변경 전에는 blocked로 둔다.
- SecretRefs: 평문 토큰을 SecretRef로 옮기는 별도 보안 작업이 필요하다.
- LaunchAgent: 재부팅 후 자동 실행/복구 서비스 설치는 별도 hardening lane이다.

## Required Tool Classes

### P0: 기본 즉시 사용

사용자가 별도 설정 없이 기대하는 최소 기본기다.

- Web search: 최신 정보 검색
- Web fetch/readability: 웹페이지 내용 읽기와 기사 추출
- Memory search: 로컬 기억/맥락 검색
- Runtime status/doctor: 현재 상태 진단
- Chat/session: 대화 생성, 이름, 삭제, 보관, 세션 전환
- Provider/Auth: 기본 모델 인증 상태, 누락 시 사용자 친화 복구 안내

완료 기준:

- Safari 대화창에서 실제 요청이 성공해야 한다.
- 빨간 도구 오류가 없어야 한다.
- 새 로그에 provider 없음, auth 없음, quota 실패가 없어야 한다.

### P1: 승인 후 기본 사용

위험하거나 사용자의 로컬 환경에 영향을 줄 수 있으므로 권한 경계가 필요하다.

- Browser control: 브라우저 열기, 읽기, 클릭
- File read/list: 로컬 파일/폴더 읽기
- File write: 로컬 파일 쓰기
- Document extraction: PDF/문서 텍스트 추출
- MCP/connectors: 외부 도구 연결
- LaunchAgent service: 재부팅 후 자동 실행, 상태 확인, 복구
- SecretRefs: plaintext secret을 런타임 설정 밖으로 이동

완료 기준:

- 기본적으로 “무엇을 하려는지” 미리 보여준다.
- 읽기 전용과 쓰기/실행을 구분한다.
- 실행 후 결과와 되돌림 가능성을 남긴다.

### P2: 설정 후 사용

사용자의 계정, 키, 로컬 앱 설치, 외부 서비스 상태가 필요한 도구다.

- Google/Gemini search/provider
- Anthropic provider
- OpenRouter/provider 계열
- Speech/TTS providers
- Image/video/music generation providers
- GitHub/Codex supervisor style integrations

완료 기준:

- 설정되지 않았을 때 개발자 오류를 보이면 실패다.
- 사용자가 이해할 수 있는 “설정 필요 / 연결됨 / 실패 / 복구” 상태를 보여야 한다.

### P3: 고급/선택 기능

일반 사용자 기본 경험에는 필요하지 않지만 고급 운영체제 확장에 중요하다.

- Workboard
- Vault
- Phone control
- Canvas
- Admin RPC
- Webhooks
- Advanced model router/provider matrix

완료 기준:

- 기본 화면을 어지럽히지 않는다.
- 고급 모드 또는 설정 영역에서만 노출한다.
- 안전 권한과 로그가 있어야 한다.

## Non-Negotiable Completion Rule

도구 관련 작업은 다음 네 가지가 모두 통과해야 완료다.

1. 설정/플러그인 레지스트리에서 enabled 또는 available 상태 확인
2. 실제 명령 또는 대화 턴에서 도구 호출 성공
3. Safari 대시보드에서 사용자 화면 기준 확인
4. 새 로그에 도구 오류/메모리 오류/인증 오류가 없는지 확인

## Next Engineering Actions

1. `tool-parity audit` 스크립트를 추가해 OpenClaw/GPAO-T 도구군을 자동 분류한다.
2. P0 도구군을 모두 실제 사용자 경로로 검증한다.
3. P1 도구군은 GPAO-T 승인 게이트와 연결한다.
4. P2 도구군은 “설정 필요” 사용자 UX로 정리한다.
5. P3 도구군은 고급 모드로 숨기고 기본 화면에서 소음을 줄인다.
6. `doctor --lint` 경고를 제품 기준으로 분류해 Codex runtime route, SecretRefs, LaunchAgent, registry refresh를 닫는다.

## Product Position

OpenClaw는 비교 대상이다.  
GPAO-T는 OpenClaw의 복제품이 아니라, 기본 도구 능력은 유지하면서 맥락, 기억, 권한, replay, 자가성장 루프를 더 강하게 운영하는 Personal Growth OS다.
