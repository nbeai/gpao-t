# GPAO-T 완전 봉인 개발 계획 v1.0

작성일: 2026-07-12  
상태: 고정 개발 계획  
대상: 현재 라이브된 OpenClaw 기반 GPAO-T 런타임, GPAO-T 소스, 런타임 워크스페이스, 테스트팀 전달 패키지

## 0. 결론

GPAO-T의 완전 봉인은 단순히 로고와 문구를 바꾸는 작업이 아니다. 사용자가 보는 화면, 접근 가능한 모든 메뉴와 설정, 대화 흐름, 워크스페이스 문서, 메모리와 맥락 제어, CLI/운영 도구, 릴리즈 패키지, 테스트 증거까지 모두 `nBeAI. GPAO-T` 제품으로 일관되게 작동해야 한다.

현재 상태는 사용자 표면 1차 봉인이 라이브 적용되어 있고 전체 테스트도 통과한 상태다. 그러나 완전 봉인 기준에서는 내부 네임스페이스, 설정 전체 페이지, 서비스 워커/캐시/스토리지 키, 운영자 도구, 런타임 워크스페이스 문서, 릴리즈 패키지, 테스트팀 전달 문서까지 닫아야 한다.

이 문서는 그 남은 작업을 다음 단계로 미루기 위한 문서가 아니라, GPAO-T를 테스트팀 전달 직전 상태로 고정하기 위한 전체 개발 목록과 종료 조건이다.

## 1. 완전 봉인의 정의

다음 조건을 모두 만족해야 GPAO-T 완전 봉인으로 인정한다.

1. 사용자가 보는 모든 로고, 아이콘, 이름, 도움말, 오류, 빈 화면, 설정, 하위 페이지, 모바일 화면, 브라우저 타이틀이 `nBeAI. GPAO-T` 기준으로 통일된다.
2. 사용자가 접근 가능한 모든 메뉴, 설정 버튼, 모달, 상세 페이지, 로그 보기, 내보내기, 페어링, 알림, 권한 승인, 플러그인, 에이전트, 스킬, 노드, 드리밍, 문서, 세션 관리 화면에서 OpenClaw가 제품명처럼 드러나지 않는다.
3. 대화창 생성, 제목 자동 생성, 이름 변경, 삭제, 보관, 텔레그램 전용 세션, 멀티 세션 작업창이 GPAO-T UX로 동작한다.
4. 런타임 워크스페이스의 `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`, `MEMORY.md`, `HEARTBEAT.md`, welcome/bootstrap 문서가 GPAO-T 정체성과 작동 원칙을 기준으로 다시 작성된다.
5. 메모리, 맥락, replay, admission, apply gate, self-growth는 외부 장치처럼 붙은 것이 아니라 GPAO-T 내부 운영 흐름으로 보이고 작동한다.
6. CLI, 운영자 도구, 로그, 진단, 패치 도구, 릴리즈 도구는 사용자가 호출하는 표면에서는 GPAO-T 명령과 설명을 사용한다.
7. OpenClaw 이름은 기술 출처, 호환성 레이어, 순정 비교 문서, 보존 증거에서만 제한적으로 허용된다.
8. 서비스 워커, 캐시, 로컬 스토리지, custom element, route, API namespace는 무작정 전역 치환하지 않는다. 호환 미러와 롤백을 갖춘 마이그레이션으로 처리한다.
9. 테스트팀 전달 패키지는 설치, 실행, 첫 대화, 설정, 복구, 피드백 문서에서 OpenClaw를 제품명으로 노출하지 않는다.
10. 완료 보고는 스캔, 라우트 크롤, 스크린샷, 테스트, 라이브 적용 manifest, 롤백 경로가 모두 남아야 한다.

## 2. 현재 고정 사실

이미 완료된 사실:

- 사용자 표면 1차 봉인 라이브 적용 완료.
- 라이브 변경 파일 33개.
- 라이브 루트: `/Users/jyp/.local/node-v24.14.0-darwin-arm64/lib/node_modules/openclaw/dist/control-ui`
- 라이브 백업 manifest:
  `docs/03-verification/evidence/live-surface-seal-patch/2026-07-12T07-18-45-054Z-before-surface-seal/manifest.json`
- 검증:
  - `npm run check` 통과
  - 대상 테스트 51/51 통과
  - `npm test` 335/335 통과
  - 주요 사용자 노출 문자열 금지 스캔 통과

아직 완전 봉인으로 볼 수 없는 사실:

- 라이브 dist 내부에 `openclaw-*` custom element, service worker cache key, storage key, notification key가 남아 있다.
- 일부 도구와 소스 파일은 `openclaw` 이름을 내부 모듈명 또는 호환 레이어로 사용한다.
- 모든 사용자 접근 가능 페이지와 설정 하위 페이지를 자동 라우트 크롤로 전수 확인한 상태는 아니다.
- 런타임 워크스페이스 MD는 GPAO-T 중심으로 보강되었지만, 순정 OpenClaw 출처와 GPAO-T 정체성의 문장 경계가 더 정교해야 한다.
- 테스트팀 전달 패키지 기준의 설치/실행/복구/피드백 문서 봉인이 아직 최종 완료되지 않았다.

## 3. 제품 영역 분할

완전 봉인은 다음 10개 영역을 독립 블록으로 나누어 진행한다. 한 블록도 생략하지 않는다.

### A. 라이브 대시보드 사용자 표면

목표:

- 사용자가 보는 첫 화면, 채팅 화면, 좌측 세션 레일, 상단 상태, 입력창, 하단 도구, 모바일 화면을 GPAO-T로 통일한다.

개발 항목:

- 모든 visible copy를 `nBeAI. GPAO-T` 기준으로 정리.
- 사용자 화면에서 보이는 `OpenClaw`, `Control UI`, `ClawHub`, mascot/reef/claw/lobster 계열 표현 제거.
- 상단 개발자형 Context Source 패널은 일반 사용자 화면에서 숨기고, 필요 시 고급/진단 패널로 격리.
- 텔레그램 전용 세션은 별도 고정 영역 또는 명확한 전용 세션으로 표시.
- 세션 목록의 기술 id 노출을 막고 첫 입력 기반 제목 자동 생성으로 정리.

검증:

- 데스크톱, 모바일 스크린샷.
- 금지 문자열 스캔.
- Safari 라이브 화면 확인.

### B. 모든 메뉴, 설정, 하위 페이지 전수 봉인

목표:

- 사용자가 클릭 가능한 모든 대시보드 영역을 전수 점검하고 GPAO-T 화면으로 바꾼다.

점검 대상:

- 개요
- 채팅
- 세션
- 최근 활동
- 작업/태스크
- 에이전트
- Skills
- Skill Workshop
- 노드
- 드리밍
- 문서
- 플러그인
- 설정
- 설정 하위 항목 전체
- 검색
- 페어링/기기 승인
- 모델 설정
- 채널 설정
- 알림
- 로그/디버그
- MCP/커넥터
- About/버전/도움말
- 빈 화면
- 오류 화면
- 로딩 화면
- 권한 거부 화면
- 재연결 화면

개발 항목:

- 라우트 크롤러 작성: `tools/run-gpao-t-dashboard-route-crawl.mjs`
- 사용자 접근 route inventory 작성: `docs/03-verification/evidence/gpao-t-dashboard-route-inventory-YYYY-MM-DD.json`
- 각 route의 visible text, title, aria-label, placeholder, button label, tooltip, toast, dialog copy 수집.
- OpenClaw 계열 노출을 `user_visible`, `operator_visible`, `compat_internal`, `technical_provenance`, `retired_archive`로 분류.
- user_visible은 전부 수정.
- operator_visible은 GPAO-T 용어로 바꾸거나 고급 진단 화면으로 격리.

검증:

- route별 스크린샷.
- route별 문자열 스캔.
- 설정 페이지 전수 클릭 로그.
- 모바일 폭 390px 기준 레이아웃 QA.

### C. 런타임 내부 네임스페이스와 호환 키 마이그레이션

목표:

- OpenClaw 내부 키가 사용자에게 드러나지 않게 하고, 장기적으로 GPAO-T namespace로 이전한다.

대상:

- service worker cache key: `openclaw-control-*`
- notification key: `openclaw-notification`
- storage key: `openclaw.control.*`, `openclaw.device.*`
- DOM/custom element: `openclaw-*`
- HTML id/class/data key: `openclaw-app`, `openclaw-mount-*`, `openclaw_mount_recovery`
- API route alias: 기존 OpenClaw route
- 빌드 상수: `__OPENCLAW_CONTROL_UI_BUILD_ID__`

개발 원칙:

- 전역 치환 금지.
- 기존 로그인, 세션, 기기 승인, 캐시를 깨지 않기 위해 2단계 마이그레이션.
- 1단계: GPAO-T 키를 추가하고 기존 OpenClaw 키를 read-compatible로 유지.
- 2단계: GPAO-T 키를 기본값으로 쓰고 기존 키는 자동 이전 후 read-only fallback으로 유지.
- 3단계: 충분한 검증 후 제거 후보로 분류.

개발 항목:

- `tools/audit-gpao-t-runtime-namespace.mjs` 작성.
- `tools/migrate-gpao-t-runtime-namespace.mjs` 작성.
- service worker unregister/cache bust 안전 루틴 추가.
- localStorage/sessionStorage key mirror 테스트.
- custom element rename은 wrapper 우선 적용 후 source-build 전략으로 이동.

검증:

- 기존 로그인 유지.
- 세션 목록 유지.
- 텔레그램 전용 세션 유지.
- 브라우저 새로고침 후 정상 복구.
- service worker cache 교체 후 정상 로딩.
- rollback manifest 생성.

### D. 런타임 워크스페이스 MD와 첫 설치 경험

목표:

- GPAO-T를 처음 설치한 사람이 모델 이름, 성격, 호칭, 말투, 기억 범위, 권한 경계를 설정할 수 있게 한다.
- 모든 MD 파일이 단순 정보 파일이 아니라 GPAO-T의 시스템 운영 계약으로 작동하게 한다.

대상 파일:

- `runtime-workspace/gpao-t/AGENTS.md`
- `runtime-workspace/gpao-t/SOUL.md`
- `runtime-workspace/gpao-t/IDENTITY.md`
- `runtime-workspace/gpao-t/USER.md`
- `runtime-workspace/gpao-t/TOOLS.md`
- `runtime-workspace/gpao-t/MEMORY.md`
- `runtime-workspace/gpao-t/HEARTBEAT.md`
- `runtime-workspace/gpao-t/openclaw-workspace-state.json` 또는 후속 GPAO-T state 파일
- welcome/bootstrap 생성 로직

개발 항목:

- 첫 설치 welcome flow 작성.
- 모델 이름/성격/말투/호칭/기억 정책 설정 UI 또는 CLI entry 작성.
- OpenClaw 출처 문장은 “기술적 기반” 문서로만 격리.
- AGENTS 문서는 GPAO-T 툴 사용 원칙, 외부 행동 승인, 메모리 후보 생성, 자동화 권한, self-growth 기준을 포함.
- MEMORY는 원본/후보/승인/반려/적용 위치를 구분.
- TOOLS는 실제 로컬 도구, 브라우저, 터미널, MCP, Telegram, Safari, Gateway 정보를 기록.

검증:

- 새 workspace bootstrap 테스트.
- 기존 workspace migration 테스트.
- dashboard에서 “내 워크스페이스 점검” 질문 시 OpenClaw 홈이 아니라 GPAO-T 운영 공간으로 답하는지 확인.

### E. 대화 UX와 출력 흐름 봉인

목표:

- GPAO-T의 핵심 체감인 대화 품질, 응답 대기감, 중간 진행 표시, 도구 사용 브릿지 출력, 스트리밍 느낌을 제품화한다.

개발 항목:

- 긴 작업 시작 시 즉시 응답하는 progress bridge.
- 도구 사용 중 단계별 status event 출력.
- 최종 응답 전 임시 진행 메시지 유지/정리 정책.
- 답변 완료 후 activity compact lane.
- 실패 시 사용자가 이해 가능한 회복 메시지.
- 테스트 대화 자동 생성 후 정리 루틴.
- 첫 입력 기반 대화 제목 자동 생성.

검증:

- 일반 질문.
- 긴 리서치.
- 파일 점검.
- 도구 사용.
- 실패/재시도.
- 텔레그램 전용 세션.
- 멀티 세션 전환 중 응답.

### F. 메모리, 맥락, replay, self-growth 내부 흡수

목표:

- GPAO-T가 기억과 자가성장 루프를 외부 장치처럼 붙인 것이 아니라 자기 운영 체계로 사용하게 한다.

개발 항목:

- memory candidate review queue를 제품 표면에 맞게 정리.
- 원본, 후보, 이유, replay 결과, 승인 상태, 적용 위치를 명확히 저장.
- durable memory 직접 쓰기 금지. 후보 검토 후 승인 적용.
- OpenClaw memory 표현은 `기존 런타임 기억 저장소` 또는 `기술 기반 저장소`로 재정리.
- T-cell admission, trace, replay, SelfDevelop 결과를 후보 판단 로직에 연결.
- 사용자 수정, 반복 실패, 승인된 기억을 self-growth candidate로 생성.

검증:

- 기억 후보 생성.
- 승인 전 차단.
- 승인 후 지정 위치 반영.
- 반려 후 재적용 방지.
- replay before/after 비교.
- 자동화 최소 범위 동작.

### G. Gateway, API, CLI, 운영자 도구 표면 봉인

목표:

- 사용자가 직접 보거나 테스트팀이 실행하는 명령, API, 로그, 진단 도구가 GPAO-T로 정리된다.

개발 항목:

- `gpao-t` CLI 도움말 정리.
- 기존 OpenClaw patch/preview/repair 도구는 GPAO-T 이름 wrapper로 이동.
- openclaw route는 compatibility alias로 남기되 docs와 사용자 표면에서는 GPAO-T route를 기본으로 사용.
- logs, diagnostics, health, doctor, verify 출력에서 제품명 통일.
- `openclaw`가 꼭 필요한 경우 `compatibility substrate`로 분류해 설명.

검증:

- `gpao-t --help`
- `gpao-t doctor`
- `gpao-t verify`
- live gateway health
- route alias 테스트
- 로그/진단 문자열 스캔

### H. 릴리즈, 설치, 업데이트, 롤백, 테스트팀 전달 패키지

목표:

- 테스트팀에게 보낼 수 있는 설치/실행/복구 가능한 GPAO-T 패키지를 만든다.

개발 항목:

- 테스트팀 전달 manifest.
- 설치 안내.
- 첫 실행 안내.
- 알려진 제한.
- 피드백 양식.
- 롤백 안내.
- live patch manifest.
- source seal manifest.
- package readback.
- zip/archive integrity 검증.

검증:

- clean readback.
- archive hash.
- install smoke.
- rollback rehearsal.
- tester guide에서 OpenClaw 제품명 노출 없음.

### I. 소스 위생과 out-of-scope 격리

목표:

- 무엇이 제품이고, 무엇이 실험실/증거/퇴역물인지 명확히 한다.

개발 항목:

- `docs/99-out-of-scope`는 제품 스캔에서 제외하되 보존.
- 하드웨어 엔진 등 현재 GPAO-T 봉인과 무관한 항목은 out-of-scope로 고정.
- live backup, evidence backup, lab copy는 제품 문자열 실패로 계산하지 않도록 `.sealignore` 또는 scanner allowlist 작성.
- untracked 산출물 분류: product source, evidence, release, retired, temp.
- 제품 후보 파일만 source seal manifest에 포함.

검증:

- source seal manifest.
- retired archive exclusion proof.
- 임시 파일 없음.
- 테스트팀 패키지에 불필요한 lab/backup 포함 없음.

### J. 순정 OpenClaw 비교 감사

목표:

- 순정 OpenClaw의 강점과 현재 GPAO-T 변경점을 구조적으로 비교하고, 우리가 깨뜨린 기능이 없는지 확인한다.

비교 기준:

- 순정 기준: `/Users/jyp/Documents/Playground 2/openclaw-clean-lab/github-openclaw-source`
- GPAO-T 라이브: 현재 라이브 OpenClaw/GPAO-T 런타임
- GPAO-T 소스: `/Users/jyp/Documents/Playground 2/gpao-t`

개발 항목:

- route diff.
- visible page diff.
- API diff.
- storage/cache diff.
- session model diff.
- settings diff.
- memory/workspace diff.
- performance path diff.

검증:

- 순정 대비 기능 손실 목록 0개 또는 의도된 변경으로 분류.
- 의도되지 않은 오류/느림/깨짐은 모두 repair queue로 이동 후 해결.

## 4. 실행 순서

순서는 위험도 때문에 고정한다. 그러나 어느 항목도 “언젠가”로 미루지 않는다.

### 1단계. 봉인 기준선 고정

산출물:

- `docs/03-verification/evidence/GPAO-T-COMPLETE-SEAL-BASELINE-YYYY-MM-DD.md`
- live dist manifest
- source status manifest
- current route inventory
- current forbidden-string inventory

완료 조건:

- 현재 상태를 되돌릴 수 있는 백업과 manifest가 있다.
- 제품 파일, 증거 파일, 퇴역 파일, 실험 파일의 경계가 기록된다.

### 2단계. 전수 스캐너와 라우트 크롤러 작성

산출물:

- `tools/audit-gpao-t-complete-seal.mjs`
- `tools/run-gpao-t-dashboard-route-crawl.mjs`
- `docs/03-verification/evidence/gpao-t-complete-seal-inventory-YYYY-MM-DD.json`

완료 조건:

- 소스, 라이브 dist, docs, runtime workspace, release package를 같은 기준으로 스캔한다.
- 모든 hit가 분류된다.
- 사용자가 접근 가능한 route가 목록화된다.

### 3단계. 사용자 화면 전면 봉인

산출물:

- live dashboard patch
- route별 스크린샷
- 사용자 surface scan report

완료 조건:

- 일반 사용자 모드에서 OpenClaw 흔적이 보이지 않는다.
- 설정 전체와 하위 페이지에서도 보이지 않는다.
- 개발자형 패널은 고급 진단 뒤로 숨겨져 있다.

### 4단계. 런타임 워크스페이스와 welcome/bootstrap 봉인

산출물:

- 새 workspace pack
- migration tool
- welcome flow spec and test

완료 조건:

- 새 사용자가 모델 이름과 성격을 설정할 수 있다.
- 기존 사용자 workspace가 GPAO-T 정체성으로 마이그레이션된다.
- 워크스페이스 점검 답변이 GPAO-T 운영 공간으로 나온다.

### 5단계. 대화 UX와 멀티 세션 체감 봉인

산출물:

- progress bridge
- streaming-like status event
- first-message title generator
- test session cleanup
- Telegram dedicated session contract

완료 조건:

- 긴 작업에서 사용자가 답답하게 멈춘 화면을 보지 않는다.
- 대화창 생성/이름변경/삭제/보관/전환이 정상 동작한다.
- 텔레그램은 전용 세션으로 안정적으로 유지된다.

### 6단계. 메모리/맥락/self-growth 흡수 봉인

산출물:

- memory candidate schema final
- replay evaluation final
- apply gate final
- self-growth proposal queue

완료 조건:

- 승인 전 자동 durable write가 없다.
- 승인 후 반영 위치가 명확하다.
- 반복 실패와 사용자 수정이 성장 후보로 생성된다.
- replay로 개선 여부를 검증한다.

### 7단계. Gateway/API/CLI/운영자 표면 봉인

산출물:

- GPAO-T route namespace
- compatibility alias manifest
- CLI help/output patch
- diagnostic output patch

완료 조건:

- 테스트팀이 호출하는 명령과 문서가 GPAO-T 기준이다.
- OpenClaw route는 호환용으로만 남고 기본 안내는 GPAO-T route다.
- 로그와 진단 출력도 제품명 기준이 맞다.

### 8단계. 내부 namespace 마이그레이션

산출물:

- runtime namespace migration plan
- storage/cache/service worker migration tool
- rollback manifest
- compatibility readback test

완료 조건:

- 기존 로그인과 세션을 잃지 않는다.
- GPAO-T 키가 기본값이 된다.
- 기존 OpenClaw 키는 호환 fallback으로만 남는다.
- cache bust 후에도 정상 로딩된다.

### 9단계. 순정 OpenClaw 비교 회귀 감사

산출물:

- `docs/03-verification/evidence/GPAO-T-PURE-OPENCLAW-COMPAT-DIFF-YYYY-MM-DD.md`

완료 조건:

- 순정 대비 기능 손실이 없다.
- 의도된 차이는 GPAO-T 제품 결정으로 기록된다.
- 오류, 속도 저하, 깨진 route가 repair 완료된다.

### 10단계. 테스트팀 배포 직전 패키지 봉인

산출물:

- release candidate archive
- source seal manifest
- tester handoff guide
- rollback guide
- known limits
- feedback intake

완료 조건:

- 테스트팀이 설치, 실행, 첫 대화, 설정, 피드백을 수행할 수 있다.
- 테스트팀 문서에서 OpenClaw가 제품명처럼 나오지 않는다.
- archive integrity와 package readback이 통과한다.

### 11단계. 최종 완전 봉인 검증

산출물:

- `docs/03-verification/evidence/GPAO-T-COMPLETE-SEAL-COMPLETION-YYYY-MM-DD.md`

완료 조건:

- `npm run check` 통과.
- `npm test` 전체 통과.
- complete seal scanner 통과.
- dashboard route crawl 통과.
- desktop/mobile visual QA 통과.
- live Safari readback 통과.
- rollback rehearsal 통과.
- 테스트팀 전달 패키지 readback 통과.

## 5. 금지 사항

다음은 절대 하지 않는다.

- `OpenClaw` 문자열을 무작정 전역 치환하지 않는다.
- live dist 내부 키를 백업 없이 바꾸지 않는다.
- service worker/cache/storage를 한 번에 제거하지 않는다.
- `.openclaw` 상태 폴더를 삭제하지 않는다.
- 순정 비교 기준을 GPAO-T 패치가 들어간 lab copy로 삼지 않는다.
- 하드웨어 엔진처럼 현재 봉인과 무관한 저장소를 핵심 범위에 끌어오지 않는다.
- 스크린샷이나 테스트 없이 “완료”라고 하지 않는다.
- 사용자가 보는 화면을 개발자 진단 화면처럼 방치하지 않는다.

## 6. 공정 관리 에이전트 운영 기준

완전 봉인 작업은 다음 역할로 병렬 운용한다.

1. 공정감시 에이전트
   - 이 문서를 작업 계약으로 삼고 이탈을 감시한다.
   - 각 단계의 산출물, 테스트, rollback 여부를 확인한다.

2. 사용자 표면 감사 에이전트
   - 모든 route, 메뉴, 설정, 모달, 오류, 빈 화면을 점검한다.

3. 런타임 namespace 에이전트
   - service worker, cache, storage, custom element, API alias를 담당한다.

4. 워크스페이스/메모리 에이전트
   - MD 파일, memory candidate, apply gate, self-growth 흐름을 담당한다.

5. QA/replay 에이전트
   - 대화 시나리오, before/after replay, 속도, 안정성, 오류 회복을 검증한다.

6. 릴리즈 에이전트
   - 테스트팀 패키지, 설치 안내, rollback, archive, source seal을 담당한다.

## 7. 최종 종료 조건

GPAO-T 완전 봉인 완료는 다음 문장으로 판정한다.

> 테스트팀이 GPAO-T를 설치하고 실행하고 대화하고 설정하고 피드백하는 전 과정에서, 제품 정체성은 `nBeAI. GPAO-T`로 일관되며, OpenClaw는 기술 기반 또는 호환 출처로만 제한되고, 모든 핵심 기능은 순정 대비 손실 없이 작동하며, 메모리/맥락/replay/self-growth는 GPAO-T 내부 운영 체계로 검증된다.

이 조건을 만족하지 못하면 완료가 아니다.

