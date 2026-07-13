# GPAO-T 최종 완성 작업 지시서 v1.0

- 문서 상태: `LOCKED WORK ORDER`
- 기준 시각: 2026-07-13 KST
- 제품: `nBeAI. GPAO-T`
- 작업 대상: 독립 GPAO-T 소스, 배포본, macOS 라이브 런타임, 사용자 화면, 테스트팀 전달본
- 최종 종료점: **테스트팀이 설치·실행·검증할 수 있는 배포 직전 버전과 동일한 산출물이 실제 사용자 PC에서 독립 GPAO-T로 정상 라이브되는 상태**

## 1. 이 문서의 권위

이 문서는 GPAO-T 최종 완성 공정의 단일 실행 기준이다.

기존 계획서, 중간 완료 보고, 과거 evidence 문서와 내용이 충돌하면 다음 우선순위를 적용한다.

1. 실제 현재 소스·배포본·라이브 상태
2. 이 작업 지시서
3. 같은 공정에서 새로 생성된 검증 증거
4. 기존 계획서와 과거 완료 보고

과거 문서에 `완료`, `ready`, `sealed`라고 적혀 있어도 이 문서의 종료 조건을 통과하지 못하면 최종 완료로 인정하지 않는다.

## 2. 제품과 완료의 정의

### 2.1 제품 원본

다음 세 상태를 명확히 분리한다.

- 개발 원본:
  `/Users/jyp/Documents/Playground 2/openclaw-clean-lab/gpao-t-openclaw-dashboard-lab`
- 제품 운영·설치·검증 원본:
  `/Users/jyp/Documents/Playground 2/gpao-t`
- 설치 후 라이브 제품 상태:
  `~/.gpao-t`

순정 비교 기준은 다음 하나만 사용한다.

- `/Users/jyp/Documents/Playground 2/openclaw-clean-lab/github-openclaw-source`

`gpao-t-openclaw-dashboard-lab`은 이미 GPAO-T 코드가 흡수된 개발 원본이므로 순정 OpenClaw 비교 기준으로 사용하지 않는다.

### 2.2 독립 제품의 조건

다음이 모두 GPAO-T를 가리켜야 독립 제품으로 인정한다.

- 사용자 제품명과 로고: `nBeAI. GPAO-T`
- 사용자 명령: `gpao-t`
- 상태 루트: `~/.gpao-t`
- 설정 파일: `~/.gpao-t/gpao-t.json`
- 버전 포인터: `~/.gpao-t/current`
- macOS LaunchAgent: `ai.nbeai.gpao-t`
- 기본 독립 포트: `18799`
- health endpoint: `GET /health`
- 런타임 워크스페이스: GPAO-T 운영 계약과 welcome/bootstrap을 포함한 전용 구성

OpenClaw 명칭은 다음 위치에서만 허용한다.

- 순정 비교 자료
- 라이선스와 제3자 고지
- 호환성 구현 내부
- 이전 상태 마이그레이션용 read-only 키
- 롤백 증거

사용자 화면, 제품 설명, 기본 명령, 설치 안내, 오류 안내에서는 OpenClaw를 GPAO-T의 제품명처럼 노출하지 않는다.

### 2.3 최종 100%의 조건

다음 여덟 공정이 모두 `PASS`여야 한다.

1. 최종 소스 기준 고정
2. 사용자 UI·대화 회귀 봉인
3. 단일 배포본 생성·검증
4. 독립 설치·상태 이전
5. 독립 라이브 전환
6. Safari·대화·멀티 세션·Telegram 경계 QA
7. 실제 롤백·재설치 복구 시험
8. 전체 테스트·소스·테스트팀 패킷 봉인

부분 통과, 문서상 완료, dry-run 성공, 기존 OpenClaw 호환 라이브 화면의 성공은 100%로 계산하지 않는다.

## 3. 현재 기준 상태

이 문서를 작성하는 시점의 사실은 다음과 같다.

### 3.1 완료된 기반

- GPAO-T 사용자 화면과 멀티 세션 기반이 구현되어 있다.
- 사용자 화면에서 개발자용 Context/Replay/Admission 패널을 숨겼다.
- 로그인 고급 연결 정보는 접힌 영역으로 격리했다.
- 일반 사용자 설정에서 보안·실행·호스트 운영 정보 노출을 줄였다.
- GPAO-T 브라우저 설정 키와 기존 OpenClaw 설정 키의 read-only 마이그레이션 경로를 구현했다.
- 독립 macOS 설치기, 상태 이전, 백업, apply token, snapshot, rollback 구조가 구현되어 있다.
- 설치기 단위 테스트는 8/8을 통과했다.
- source build와 runtime stage의 tree SHA-256 일치 검증 도구가 구현되어 있다.
- ZIP, checksum, manifest, help smoke, 격리 health smoke 검증 도구가 구현되어 있다.

### 3.2 아직 최종 완료가 아닌 항목

- 실제 라이브 서비스는 `ai.nbeai.gpao-t`, `~/.gpao-t`, 포트 `18799`로 전환되었고 `/health` 200 증거가 있다.
- 2026-07-13 10:15 KST 기준 테스트팀 ZIP의 canonical archive SHA-256은 `f3ba7c545c1d0fd4e64260253b47af0a388b5fee00f069f757ba7255e1313ad7`이다.
- `ai.nbeai.gpao-t`의 설치·기동·상태 이전·독립 ZIP 검증·rollback 후 재설치 복구 시험 증거는 확보되었다.
- 최종 독립 라이브에서 Safari 사용자 표면, route crawl, 대화 QA, 멀티 세션 회귀는 통과했다.
- Telegram은 하나의 전용 direct session 경계로 유지한다. 외부 발송 없이 연결·경계·session mapping 증거까지만 최종 전 범위로 인정한다.
- Stage 8 전체 테스트는 PASS 상태다. 일반 테스트 326/326, Control Center split groups 31/31을 통과했다.
- Stage 8 live conversation QA는 재설치 후 6 PASS, 0 WARN, 0 FAIL이다. cross-session context recovery latency는 `13651ms`이며 findings와 warnings는 모두 비어 있다.
- 두 소스 저장소의 최종 변경 상태와 배포 해시를 문서와 release packet에 반영하는 source seal이 마지막으로 남아 있다.
- `postMigrationRepair`의 내부 호환 경로에는 OpenClaw 계열 path 이름이 남을 수 있다. 사용자 화면, 제품명, 명령, LaunchAgent, health, 설치 안내에는 GPAO-T 기준을 유지하며, 내부 호환 trace는 release note에서 마이그레이션 증거로 등급화한다.

## 4. 절대 작업 원칙

1. 새 기능을 추가하지 않는다. 발견된 P0/P1 결함만 수정한다.
2. 한 공정의 실패를 문구 변경이나 테스트 제외로 숨기지 않는다.
3. 테스트 기대값은 실제 제품 계약이 바뀐 경우에만 수정한다.
4. source, stage, ZIP, 설치본, 라이브본의 동일성을 해시로 증명한다.
5. **테스트팀 전달 ZIP과 실제 라이브 설치에 사용하는 ZIP은 바이트 단위로 같은 파일이어야 한다.**
6. 라이브 변경 전 기존 상태 전체를 백업하고 rollback snapshot ID를 확보한다.
7. 기존 Gateway는 `kill`만 사용해 중지하지 않는다. `launchctl disable` 후 `bootout`한다.
8. 자동복구 감시자는 기존 Gateway보다 먼저 중지한다.
9. 민감한 토큰, 비밀번호, Telegram credential을 로그·문서·보고에 출력하지 않는다.
10. Telegram 실제 외부 발송은 테스트팀 배포 직전 완료 조건에 포함하지 않는다. 연결 상태와 전용 세션 경계까지만 검증한다.
11. public release, 외부 업로드, 서명·공증은 이 작업 범위가 아니다.
12. 사용자 기존 세션과 워크스페이스는 삭제하지 않는다.
13. 실패 시 새로운 기능 개발로 우회하지 않고 해당 공정을 복구한다.

## 5. 공정 역할

### 5.1 주 실행 에이전트

- 전체 순서와 실제 변경을 책임진다.
- 각 단계 시작 전 입력 조건을 확인한다.
- 단계 종료 시 증거를 남기고 다음 단계로 이동한다.

### 5.2 공정감시 에이전트

- 이 문서만 최상위 기준으로 사용한다.
- 각 단계의 `GO`, `STOP`, `ROLLBACK`을 독립 판정한다.
- 문서상 완료가 아니라 실제 파일·프로세스·테스트·화면 증거를 확인한다.
- 라이브 전환 전과 최종 완료 전에는 반드시 별도 판정을 낸다.

### 5.3 검증 에이전트

- UI, 설치, 배포, 라이브 QA를 서로 분리해 검증한다.
- 구현 담당의 자기 판정만으로 PASS를 선언하지 않는다.

## 6. 공정 1: 최종 소스 기준 고정

### 목적

마지막 제품 코드와 테스트 수정을 포함한 정확한 빌드 입력을 고정한다.

### 작업

1. 두 저장소의 `git status --short`를 저장한다.
2. 충돌 마커, 임시 lock, 중복 index, 생성 중단 파일을 검사한다.
3. 다음 최종 결함이 소스에 반영됐는지 확인한다.
   - 사용자용 route 제한
   - 개발자 진단 패널 비노출
   - GPAO-T 설정 키 기본 사용
   - OpenClaw 설정 키 read-only migration
   - `legacyCurrentGatewaySelectionKeyForPage` 회귀 복구
   - 설치기 health endpoint `/health`
4. `git diff --check`를 두 저장소에서 통과시킨다.
5. 사용자 소스와 생성물, evidence, 임시 파일을 분류한다.

### PASS 증거

- 두 저장소 status snapshot
- 두 저장소 `git diff --check` 성공
- conflict marker 0건
- 제품 변경 목록과 생성물 제외 목록

### STOP 조건

- 출처를 판단할 수 없는 제품 코드 변경
- 충돌 마커
- 빌드 입력에 임시·부분 생성 파일 포함
- 설치기와 배포 도구가 서로 다른 release 경로를 기대함

## 7. 공정 2: 사용자 UI·대화 회귀 봉인

### 목적

사용자 화면 봉인 변경이 대화, 설정, 세션, 인증 기능을 깨뜨리지 않았음을 확인한다.

### 필수 검증 순서

1. 설정 migration 테스트
2. 사용자 route·navigation 테스트
3. 일반 설정 quick view 테스트
4. chat composer·chat send·chat gateway 테스트
5. realtime talk·plugin·skill·about 문구 테스트
6. UI 전체 unit test
7. browser test는 GUI 실행 권한이 있는 환경에서 별도로 실행
8. production UI build

### 필수 제품 계약

- Gateway가 `gpao.chatPreflight.prepare`를 광고한 경우 전송 전 preflight를 통과해야 한다.
- preflight 증거가 없거나 차단 상태이면 메시지를 보내지 않는다.
- 테스트 Gateway는 신규 preflight 계약을 명시적으로 모사해야 한다.
- 사용자 메뉴는 작업공간 중심 route만 기본 노출한다.
- 숨긴 운영 route의 직접 접근은 사용자 설정 화면으로 안전하게 되돌린다.
- 기본 사용자 화면에 raw token, password, session key, host, PID, raw log를 노출하지 않는다.

### PASS 증거

- targeted UI tests 100% 통과
- 전체 UI unit tests 100% 통과
- browser/responsive tests 100% 통과 또는 동일 항목의 Safari 수동 QA 증거
- production UI build 성공
- visible forbidden-name scan 0건

### STOP 조건

- 대화 전송 실패
- 설정 로드·저장·migration 실패
- 빈 화면
- 숨긴 route가 사용자 메뉴에 재등장
- OpenClaw 로고·제품명·mascot이 사용자 화면에 노출

## 8. 공정 3: 단일 배포본 생성·검증

### 목적

현재 소스와 동일한 단 하나의 GPAO-T 테스트팀 ZIP을 만든다.

### 입력

- source build:
  `/Users/jyp/Documents/Playground 2/openclaw-clean-lab/gpao-t-openclaw-dashboard-lab`
- release tooling:
  `/Users/jyp/Documents/Playground 2/gpao-t`
- runtime stage: 새 임시 디렉터리
- output:
  `/Users/jyp/Documents/Playground 2/gpao-t/.gpao-t/releases/gpao-t-0.1.0-test-team.1`
- archive:
  `/Users/jyp/Documents/Playground 2/gpao-t/.gpao-t/releases/gpao-t-0.1.0-test-team.1.zip`

### 작업

1. production UI를 다시 빌드한다.
2. main runtime build를 다시 수행한다.
3. runtime postbuild와 build stamp를 갱신한다.
4. 새 runtime stage를 생성한다. 기존 stale stage를 재사용하지 않는다.
5. source와 stage의 파일 목록·크기·내용 hash·tree hash를 비교한다.
6. 일치할 때만 distribution directory를 교체한다.
7. manifest, ZIP, `.sha256`을 생성한다.
8. ZIP을 새 임시 디렉터리에 추출해 독립 verifier를 실행한다.
9. `gpao-t --help`, 임의 loopback port의 `/health` 200, `zip -T`를 확인한다.
10. 최종 ZIP SHA-256을 이후 모든 공정의 `CANONICAL_ARCHIVE_SHA256`으로 고정한다.

### 단일 배포물 규칙

- 과거 Owner Ops ZIP은 최종 제품 배포본이 아니다.
- 기존 테스트팀 인덱스의 과거 archive를 최종 후보로 사용하지 않는다.
- installer, plist template, 설치·rollback 안내, archive checksum을 하나의 handoff packet에서 참조한다.
- 라이브 설치 시 `--release`는 이 ZIP에서 추출한 동일 tree만 가리킨다.

### PASS 증거

- source tree hash = runtime stage tree hash
- distribution manifest 전수 검증 성공
- archive checksum 검증 성공
- extracted help smoke 성공
- isolated health smoke 성공
- `zip -T` 성공
- canonical archive SHA-256 1개

### STOP 조건

- source/stage 파일 하나라도 누락·추가·변경
- stale build stamp
- manifest drift
- archive checksum 불일치
- help 또는 health smoke 실패

## 9. 공정 4: 독립 설치·상태 이전

### 목적

현재 사용자 상태를 보존하면서 동일 배포본을 `~/.gpao-t`에 독립 설치한다.

### 라이브 변경 전 강제 게이트

다음이 모두 참이어야 기존 서비스를 중지할 수 있다.

- 공정 1 PASS
- 공정 2 PASS
- 공정 3 PASS
- canonical archive SHA-256 고정
- installer dry-run `dry-run-ready`
- blocker 0건
- apply-only blocker 0건
- 기존 상태 전체 backup 경로 확인
- rollback snapshot 계획 확인

### 자동복구 중지 순서

1. `com.beai.facility-console.watchdog` disable·bootout
2. `ai.beai.doctor.wake-guard` disable·bootout
3. `ai.openclaw.gateway` disable·bootout

프로세스에 `kill`만 보내는 방식은 금지한다. 기존 Gateway는 `KeepAlive` 때문에 재시작될 수 있다.

### 상태 이전 범위

보존·이전:

- config
- credentials
- devices
- identity
- workspace
- workspace attestations
- plugin·skill 상태
- 필요한 session·channel 연속성 정보
- Telegram 연결 설정

기본 제외:

- 임시 로그
- 오래된 cache
- test session
- 부분 생성 파일
- 기존 프로세스 lock

### 적용

1. canonical ZIP을 검증한다.
2. canonical ZIP을 버전 디렉터리로 설치한다.
3. `~/.gpao-t/current`를 해당 버전에 원자적으로 연결한다.
4. 기존 상태 backup과 migration manifest를 작성한다.
5. `ai.nbeai.gpao-t` plist를 설치한다.
6. 정확한 apply token으로만 설치를 실행한다.
7. install receipt의 snapshot ID를 별도 기록한다.

### PASS 증거

- `~/.gpao-t/current` 존재
- installed tree hash = canonical distribution tree hash
- `ai.nbeai.gpao-t` LaunchAgent 존재
- migration manifest 존재
- install receipt 존재
- snapshot ID 존재
- secret 파일 권한 유지
- 이전 대상 누락 0건

### STOP·ROLLBACK 조건

- state migration 누락
- credential 권한 완화
- canonical hash 불일치
- 기존 Gateway 자동 재기동
- 새 service가 설치 후 health를 통과하지 못함

## 10. 공정 5: 독립 라이브 전환

### 목적

기존 OpenClaw 서비스가 아니라 독립 GPAO-T 서비스가 실제 사용자 PC에서 동작하게 한다.

### 필수 확인

- LaunchAgent label: `ai.nbeai.gpao-t`
- service state: running
- listener: `127.0.0.1:18799`
- `GET /health`: HTTP 200
- working package: `~/.gpao-t/current`
- state/config root: `~/.gpao-t`
- old listener `18789`: 없음
- Facility listener `18878`: 전환 중 없음
- old service label: disabled/unloaded

### 첫 기동 확인

1. health
2. dashboard HTML
3. Control UI assets
4. WebSocket connection
5. authentication
6. session list
7. current session history
8. workspace
9. memory/context preflight methods
10. Telegram dedicated session 표시

### PASS 증거

- process·LaunchAgent·listener·working path readback
- health response
- dashboard asset 200
- authenticated Gateway connection
- session count와 주요 session continuity
- old service 미실행 증거

### ROLLBACK 조건

- 빈 화면
- 인증 실패
- 세션 손실
- Telegram 설정 손실
- preflight method 미등록
- 반복 재시작
- 치명적 지연 또는 메모리 폭증

## 11. 공정 6: Safari·대화·멀티 세션·Telegram 경계 QA

### 목적

사용자가 실제로 보는 경험이 독립 GPAO-T로 완성됐는지 검증한다.

### Safari 데스크톱

- 최초 로드
- 새로고침
- cache 제거 후 재로드
- 로그인·자동 연결
- 빈 화면 없음
- 상단 잘림 없음
- composer가 viewport를 가리지 않음
- 대화 스크롤 정상
- 설정 페이지 정상
- 직접 숨김 route 접근 시 안전 redirect

### Safari 모바일 폭

- 390 x 844 기준
- 가로 overflow 없음
- sidebar 열기·닫기
- 긴 세션 제목 말줄임
- 입력창, 전송, 중지 버튼 접근 가능
- 텍스트와 버튼 겹침 없음

### 대화 흐름

다음 시나리오를 독립 session에서 검증한다.

1. 짧은 일반 질문
2. 긴 답변
3. 도구 사용 작업
4. 진행 bridge와 최종 응답
5. 실패·재시도
6. 새 대화 생성과 첫 입력 기반 제목
7. 이름 변경
8. 보관·복원
9. 삭제
10. session 간 전환
11. 재연결 후 연속성

### 메모리·맥락

- 현재 session context가 다른 session에 잘못 섞이지 않음
- preflight evidence 생성
- replay evidence 기록
- durable memory 자동 promotion 없음
- 사용자 승인 전 apply 차단

### Telegram 경계

- Telegram은 하나의 전용 direct session으로 표시
- webchat multi-session과 session identity가 충돌하지 않음
- Telegram credential과 channel 상태 유지
- 외부 메시지 발송 없이 연결·경계·session mapping만 확인

### PASS 증거

- Safari 데스크톱 스크린샷
- Safari 모바일 스크린샷
- route별 DOM·visible copy 확인표
- 대화 시나리오 결과
- session lifecycle 결과
- Telegram boundary 결과
- 브라우저 console fatal error 0건

### STOP 조건

- 사용자에게 OpenClaw 제품명·로고 노출
- 개발자 진단 화면 기본 노출
- 화면 잘림·겹침·빈 화면
- 대화 유실·중복 전송
- session identity 혼선
- Telegram과 webchat session 혼선

## 12. 공정 7: 실제 롤백·재설치 복구 시험

### 목적

설치 실패나 업데이트 실패 시 사용자 상태를 잃지 않고 복구할 수 있음을 증명한다.

### 롤백 시험

1. install receipt의 snapshot ID를 확인한다.
2. rollback dry-run을 실행한다.
3. rollback plan과 token을 검증한다.
4. GPAO-T service를 bootout한다.
5. rollback guard snapshot을 생성한다.
6. 기존 managed target을 복원한다.
7. 기존 Gateway를 enable·bootstrap·kickstart한다.
8. 기존 `18789` health와 session continuity를 확인한다.

Facility watchdog은 기존 Gateway 복구가 확인된 뒤에만 다시 활성화한다. 실행 파일이 불완전한 wake guard는 복구되지 않은 상태에서 재활성화하지 않는다.

### GPAO-T 재설치

1. 기존 Gateway와 감시자를 다시 안전하게 중지한다.
2. 같은 canonical ZIP을 다시 설치한다.
3. 설치 tree hash를 재확인한다.
4. `18799` health와 Safari 핵심 smoke를 다시 확인한다.

### PASS 증거

- rollback dry-run
- rollback apply receipt
- guard snapshot
- 기존 상태 복구 확인
- 동일 canonical ZIP 재설치 receipt
- 재설치 후 tree hash 일치
- 재설치 후 health·Safari smoke 성공

### STOP 조건

- rollback 후 상태 손실
- rollback token·snapshot 불일치
- 이전 서비스와 새 서비스 동시 실행
- 재설치 tree hash 불일치

## 13. 공정 8: 전체 테스트·소스·테스트팀 패킷 봉인

### 목적

검증된 라이브 제품과 테스트팀 전달물이 같은 제품임을 최종 고정한다.

### 전체 테스트

최소 다음을 실행한다.

- GPAO-T installer tests
- GPAO-T fast tests
- GPAO-T full tests
- source check
- source verify
- UI targeted tests
- UI full unit tests
- browser/responsive tests
- distribution verifier
- install health
- live conversation smoke
- rollback·reinstall smoke

테스트는 실패를 제외하거나 timeout을 성공으로 해석하지 않는다. 환경 권한 문제는 동일 검증을 권한 있는 실행 환경에서 다시 수행한다.

### 소스 봉인

1. 두 저장소의 최종 diff를 검토한다.
2. 제품 코드, 테스트, 문서, evidence를 의미 있는 범위로 분류한다.
3. 임시 산출물과 secret을 제외한다.
4. 로컬 commit을 생성한다.
5. commit SHA와 canonical archive SHA-256을 최종 manifest에 기록한다.
6. commit 기준 clean clone 또는 동등한 source readback으로 build 가능성을 검증한다.

### 테스트팀 패킷

최종 인덱스는 다음만 가리킨다.

- canonical GPAO-T ZIP
- ZIP SHA-256
- distribution manifest
- installer CLI
- LaunchAgent template
- 설치 안내
- rollback 안내
- 테스트 시나리오
- feedback ledger
- 알려진 제한과 public-release 경계

과거 Owner Ops ZIP은 기록 보존용으로만 분류하고 최종 시작점에서 제거한다.

### PASS 증거

- 전체 테스트 결과
- source commit SHA 2개
- canonical archive SHA-256
- live installed tree hash
- source/stage/archive/installed hash 연결표
- 최종 테스트팀 인덱스
- 설치·rollback·Safari·대화 evidence 링크
- secret scan 성공

## 14. 공정 상태 표준

각 공정은 다음 네 상태만 사용한다.

- `NOT_STARTED`: 시작 전
- `IN_PROGRESS`: 작업 중
- `STOP`: 실패 또는 선행조건 미충족
- `PASS`: 모든 증거 확보

`거의 완료`, `기능상 완료`, `부분 완료`, `화면상 완료`, `문서상 완료`는 공정 상태로 사용하지 않는다.

## 15. 최종 완료 매트릭스

| 공정 | PASS 필수 증거 | 현재 기준 상태 |
|---|---|---|
| 1. 최종 소스 기준 | status, diff-check, conflict 0 | IN_PROGRESS |
| 2. UI·대화 회귀 | targeted/full/browser/build | IN_PROGRESS |
| 3. 단일 배포본 | source=stage, ZIP, checksum, smoke | IN_PROGRESS |
| 4. 독립 설치·이전 | receipt, snapshot, migration, tree hash | NOT_STARTED |
| 5. 독립 라이브 | LaunchAgent, 18799, health, continuity | NOT_STARTED |
| 6. Safari·대화 QA | desktop/mobile/conversation/session evidence | NOT_STARTED |
| 7. rollback·재설치 | rollback receipt, restore, same ZIP reinstall | NOT_STARTED |
| 8. 소스·패킷 봉인 | full tests, commits, final index | NOT_STARTED |

상태 변경은 증거 파일이 생성된 뒤에만 수행한다.

## 16. 최종 완료 선언문 조건

다음 문장은 모든 공정이 PASS일 때만 사용할 수 있다.

> GPAO-T 테스트팀 배포 직전 버전이 완성되었다. 동일한 canonical 배포본이 독립 GPAO-T 서비스로 실제 라이브되어 있으며, 설치·상태 이전·대화·멀티 세션·Telegram 경계·Safari 데스크톱/모바일·rollback·재설치·전체 테스트·소스 봉인을 모두 통과했다.

하나라도 미통과이면 완료 선언 대신 다음을 보고한다.

- 미통과 공정
- 실패한 증거
- 사용자 영향
- 현재 안전 상태
- 정확한 복구 조건

## 17. 이 공정에서 하지 않는 일

- 공개 배포
- GitHub public push
- 패키지 registry 업로드
- Apple 서명·공증
- 외부 테스트팀 실제 전송
- Telegram 시험 메시지 발송
- OAuth/API 계정 신규 연결
- durable memory 무승인 promotion
- 새 기능 개발
- 대규모 비필수 리팩터링

이 항목들은 GPAO-T 테스트팀 배포 직전 버전의 완성 이후 별도 승인 공정으로 다룬다.

## 18. 실행 종료 규칙

1. 공정 1부터 8까지 순서대로 진행한다.
2. 안전하게 병렬화할 수 있는 테스트와 감사만 병렬 수행한다.
3. 라이브 변경은 공정 1~3 PASS 후에만 시작한다.
4. 공정 4~7은 rollback 준비가 없는 상태에서 진행하지 않는다.
5. 공정 8이 PASS하기 전 100%를 선언하지 않는다.
6. 최종 보고는 계획이 아니라 실제 증거와 경로를 제시한다.
