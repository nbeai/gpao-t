# GPAO-T Runtime Workspace Absorption Plan v0.1

## 목적

라이브 `~/.openclaw/workspace`를 OpenClaw 기본 에이전트 홈에서 GPAO-T Runtime Workspace로 흡수한다.

이 작업의 대상은 단순 브랜딩이 아니다. OpenClaw 공식 구조상 `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`는 런타임 prompt/context 주입층이다. 따라서 이 파일들은 GPAO-T의 운영헌장, 정체성, 도구 원칙, 기억 정책, 자가성장 정책, 첫 설치 welcome flow를 담아야 한다.

## 근거

순정 OpenClaw 검토 결과:

- `~/.openclaw/workspace`가 agent workspace의 기본 root다.
- `AGENTS.md`, `SOUL.md`, `TOOLS.md`는 prompt/context에 직접 관여한다.
- `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `BOOTSTRAP.md`, `MEMORY.md`도 context lifecycle에 포함된다.
- `BOOTSTRAP.md`는 brand-new workspace의 first-run ritual이며, 완료 후 삭제된다.
- `MEMORY.md`는 optional curated long-term memory다.
- `memory/YYYY-MM-DD.md`는 daily memory log이며 일반 turn마다 자동 주입되는 것이 아니라 필요할 때 검색/조회되는 성격이다.

외부 연구에서 반영할 설계 원칙:

- MemoryOS/MemOS 계열: short/mid/long memory를 나누고 storage/update/retrieval/generation을 분리한다.
- SelfMem 계열: 고정된 memory prompt보다 feedback/replay를 통해 memory strategy를 개선한다.
- MemMachine 계열: 원본 대화/근거를 보존하고, 추출된 memory는 원본과 동반시킨다.

## 현재 문제

현재 라이브 워크스페이스는 `Aigis` 개인 에이전트 홈에 가깝다.

- `AGENTS.md`는 OpenClaw 기본 agent workspace 문서가 대부분이다.
- `SOUL.md`는 일반 assistant persona 문서다.
- `TOOLS.md`는 템플릿 상태다.
- `HEARTBEAT.md`는 OpenClaw heartbeat template 상태다.
- `MEMORY.md`가 없다.
- `memory/2026-07-11.md`는 짧은 초기 메모만 있다.
- GPAO-T core, Context Mesh, replay, apply gate, progress lane, memory candidate queue와의 관계가 문서화되지 않았다.

## 작업 원칙

1. `OpenClaw` 명칭을 무조건 삭제하지 않는다. 엔진/상속 원천/호환 레이어로 필요한 곳에서는 `OpenClaw-derived runtime substrate`로 명확히 둔다.
2. 사용자-facing 정체성은 `nBeAI. GPAO-T`로 고정한다.
3. `Aigis`는 폐기하지 않고 `initial companion persona name` 또는 사용자 설정값으로 둔다. 단, OS 정체성은 GPAO-T다.
4. 기억은 자동 수집하되, durable promotion/live OpenClaw memory/session meta/external send/live rule mutation은 별도 승인 게이트를 거친다.
5. 원본과 후보를 분리한다. 원본 없는 memory는 anchor가 될 수 없다.
6. `.openclaw/workspace`는 runtime prompt pack이고, `gpao-t/.gpao-t`는 core evidence/control substrate다.
7. 모든 수정은 backup, manifest, verify, rollback 경로를 갖는다.

## 파일별 목표

- `AGENTS.md`: GPAO-T Runtime Constitution. 작업 원칙, 도구 원칙, Context Mesh, memory gate, external action boundary, self-growth loop, response quality를 정의.
- `SOUL.md`: GPAO-T의 대화 성격. 과한 캐릭터가 아니라 차분하고 고급스러운 한국어 OS companion persona.
- `IDENTITY.md`: 제품 정체성 `nBeAI. GPAO-T`, 선택된 companion name, logo/avatar reference.
- `USER.md`: 윤님 개인 설정과 privacy 경계. 앞으로 설치자별 user profile template로 확장.
- `TOOLS.md`: 실제 로컬 runtime, gateway, model, repo, QA command, evidence paths를 기록하는 운영 장비 지도.
- `HEARTBEAT.md`: 비활성 기본값을 유지하되, 활성화 시 GPAO-T self-check loop로 작동하도록 설계.
- `MEMORY.md`: curated long-term memory의 초기 구조. raw memory가 아니라 source-linked project/user/decision memory.
- `memory/YYYY-MM-DD.md`: 일일 raw log. 기존 내용 보존 후 GPAO-T absorption event를 추가.
- `WELCOME.md`: 처음 설치자에게 이름, 성격, 호칭, 말투, 메모리/자동화 경계를 정하게 하는 first-run script.
- `RUNTIME-MANIFEST.json`: pack version, installedAt, file inventory, safety boundary.

## 완료 기준

- 모든 runtime md 파일이 GPAO-T 관점으로 교체/보강된다.
- OpenClaw 기본 템플릿 문구가 user-facing identity로 남지 않는다.
- `MEMORY.md`가 생성되고 source-linked memory policy를 담는다.
- `WELCOME.md`가 first-install personalization flow를 제공한다.
- 적용 전 backup이 생성된다.
- 적용 후 workspace verify가 통과한다.
- 라이브 지파오티에게 workspace 점검을 시켰을 때 “Aigis 개인 홈”이 아니라 “GPAO-T Runtime Workspace”로 설명해야 한다.

## 이번 패치 범위

이번 패치는 runtime workspace pack 생성과 live workspace 적용 스크립트까지 포함한다.

Dashboard UI에 welcome setup 화면을 붙이는 작업은 다음 단계다. 단, `WELCOME.md`와 manifest를 먼저 만들어 UI가 읽을 계약을 고정한다.
