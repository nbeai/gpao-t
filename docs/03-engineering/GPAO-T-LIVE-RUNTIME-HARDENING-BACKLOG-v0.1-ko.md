# GPAO-T Live Runtime Hardening Backlog v0.1

## 목적

이 문서는 2026-07-12 라이브 GPAO-T 런타임 수습 이후 남은 항목을 “지금 당장 런타임을 깨는 문제”와 “테스트팀 전/후 보강해야 할 제품 위생”으로 분리한다.

라이브 OpenClaw는 이제 이 프로젝트에서 공식적으로 라이브 GPAO-T로 부른다.

## 닫힌 문제

이번 수습과 공정 봉인으로 닫힌 항목:

- Gateway entrypoint가 오래된 command chunk를 타며 RPC drift를 일으키던 문제
- `worktrees.list` unknown 계열 drift
- `device.pair.setupCode` unknown 계열 drift
- 누락된 `@openclaw/ai` 관련 plugin load error
- device metadata-upgrade pending loop
- 실제 agent 대화 turn 경로에서 `sessionStoreRuntime.loadSessionEntry is not a function`이 발생하던 session-store runtime alias mismatch
- live `plugins.allow` 미설정으로 every-turn CLI 출력에 보안 경고가 새던 문제
- 별도 세션 대화 QA에서 현재 목표/경고를 주입하지 못하던 문제를 supervised context packet QA 경로로 보강
- TUI 자동 캡처를 대화 QA의 단독 증거로 쓰던 리스크를 `openclaw agent --json` 증거 경로로 대체
- live repair가 수동 조작으로만 남아 있던 문제
- rollback이 문서 지시로만 남아 있던 문제

## 남은 하드닝 항목

### H1. SecretRef 전환

현재 일부 설정은 secret-bearing 값을 평문 필드로 보관한다. 지금은 로컬 owner runtime이고 상태 진단상 runtime blocker는 아니지만, 테스트팀 배포 전 보안 위생 항목이다.

처리 기준:

- 원본 설정의 의미를 보존한다.
- 토큰/키 값을 소스, 증거 문서, 테스트 fixture에 복사하지 않는다.
- 마이그레이션은 readback/rollback 가능한 방식으로 한다.

### H2. Optional Skill Inventory

사용하지 않거나 환경이 없는 optional skill/tool entry가 진단에서 사용자에게 오류처럼 보일 수 있다.

처리 기준:

- 필수 기능과 선택 기능을 나눈다.
- 선택 기능은 disabled, missing, install-needed, owner-auth-needed 상태를 구분한다.
- 자동 설치나 외부 계정 연결은 하지 않는다.

### H3. External Send / Message Tool Boundary

메시지 전송류 도구는 사용자 계정/외부 발송 경계다. 기본은 차단 상태가 맞다.

처리 기준:

- 대시보드에는 “비활성/승인 필요”로 보여야 한다.
- 시스템 오류처럼 보이면 안 된다.
- 테스트팀 패킷에서는 외부 발송 기능을 제외하거나 별도 승인 시나리오로 분리한다.

### H4. Browser Visual QA Auth Boundary

Safari 또는 브라우저 자동 로그인 상태는 사용자 세션 권한에 속한다.

처리 기준:

- 토큰을 소스에 넣지 않는다.
- 가능한 범위에서 읽기 전용 시각 QA를 한다.
- 인증이 필요한 경우에는 owner-auth-needed 상태로 분리한다.

### H5. Runtime Overlay Durability

현재 live runtime repair overlay는 재현 가능한 공정으로 봉인되었다. 다음 단계는 이것을 테스트팀 배포 직전의 packaging lane으로 승격하는 것이다.

처리 기준:

- pure OpenClaw source 기준과 live GPAO-T overlay 기준을 분리한다.
- repair/rollback manifest를 package evidence에 포함한다.
- 테스트팀 배포 전 `source seal -> install/readback -> live smoke -> rollback smoke` 순서를 고정한다.

### H6. Conversation Output Hygiene - 닫힘

2026-07-12 closure pass에서 처리했다. live `openclaw agent` 응답은 성공하지만 매 턴 앞에 다음 경고가 사용자에게 보이던 문제가 있었다.

`plugins.allow is empty; discovered non-bundled plugins may auto-load`

처리 결과:

- `tools/fix-live-gpao-t-plugin-allowlist.mjs` 추가
- `/Users/jyp/.openclaw/openclaw.json` 백업 후 `plugins.allow: ["codex", "telegram"]` 적용
- final automated conversation QA에서 warning leakage finding 0
- evidence: `docs/03-verification/evidence/live-plugin-allowlist/plugin-allowlist-2026-07-12T03-19-59-244Z/manifest.json`

### H7. Cross-Session Context Packet - QA 경로 보강 완료

별도 세션에서 “현재 테스트 결과”를 물으면 그 세션은 실제 QA 결과를 자동으로 모른다. 안전하게 “모른다”고 답하는 것은 맞지만, GPAO-T 제품 UX에서는 현재 프로젝트/테스트 상태를 전달하는 명시적 context packet이 필요했다.

처리 결과:

- `tools/run-live-gpao-t-conversation-qa.mjs` 추가
- runner가 separate-session turn에 compact GPAO-T context packet을 주입
- final QA에서 cross-session context recovery 내용 판정 통과
- durable memory promotion, OpenClaw memory write, external send는 계속 blocked

남은 watch item:

- cross-session turn은 모델/캐시 상태에 따라 latency warn이 발생할 수 있다. final QA에서 correctness failure는 0이지만 S4 latency가 `20237ms`로 warn 처리되었다.

### H8. Conversation Latency Watch

대화 기능 자체는 통과했지만, 사용자가 체감하는 속도는 계속 관리해야 한다.

처리 기준:

- correctness failure와 latency warn을 분리한다.
- cross-session context packet은 더 짧은 형태로 유지한다.
- 다음 performance pass에서 prompt size, workspace injected file size, cache behavior, model thinking level을 별도로 본다.

## 다음 단계 권장 순서

1. SecretRef 마이그레이션 설계 및 read-only preview.
2. Optional skill inventory matrix 생성.
3. 사용자에게 보이는 진단 오류/경고 문구 정리.
4. Runtime overlay packaging lane 설계.
5. Conversation latency watch.
6. 테스트팀 pre-release evidence packet 갱신.

## 완료 기준

이 backlog는 다음 조건에서 닫는다:

- live GPAO-T health가 오류 없이 유지된다.
- 사용자가 보는 진단 화면에서 runtime blocker와 optional warning이 분리된다.
- secret-bearing 값이 소스/문서/테스트 증거에 노출되지 않는다.
- repair/rollback/install/readback 경로가 테스트팀 패킷 안에 포함된다.
