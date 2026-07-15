# GPAO-T Pre-Release Candidate Work Plan v0.1

Status: active work plan / Phase 0 locked  
Date: 2026-07-11  
Owner: 윤  
Target: 테스트팀 배포 버전 바로 전단계  
Mode: local reversible implementation, release evidence, authority-gated live work

Canonical completion endpoint:

- `docs/03-engineering/GPAO-T-TEST-TEAM-COMPLETION-ENDPOINT-v1.0-ko.md`
- 이 공정에서 "완성"은 public release / signed installer / commercial production-ready가 아니라 `테스트팀에게 보낼 수 있는 GPAO-T`를 뜻한다.

## 0. 목표

이 문서는 GPAO-T를 "테스트팀에게 배포하기 직전" 상태까지 끌어올리는 실제 공정 계획이다.

최종 목표는 공개 배포가 아니다. 목표는 아래 조건을 모두 만족하는 supervised test-team candidate를 만드는 것이다.

- live OpenClaw / Telegram 사용자 턴이 GPAO-T preflight, admission, LLM-ready packet, post-answer replay, memory/self-growth review loop, Control Center trace를 통과했는지 증거로 확인된다.
- 실제 live mutation 전에는 preview diff, timestamped backup, SHA-256 readback, rollback manifest, restart plan, visual QA plan, smoke plan이 먼저 존재한다.
- 테스트팀 전달물에는 include/exclude manifest, archive/checksum/readback evidence, tester guide, known limits, rollback/recovery path가 포함된다.
- 모든 공개 배포, 외부 전송, 계정/비밀, destructive rollback, durable memory promotion, live OpenClaw file write, Gateway restart는 별도 승인 전까지 닫혀 있다.

## 1. 완료 정의

Pre-Release Candidate는 다음을 만족할 때만 "고정"이라고 부른다.

```text
release scope sealed
-> live hook preview diff and rollback manifest generated
-> fresh release verification evidence recorded
-> visual QA evidence generated from the sealed candidate
-> local package/archive/checksum/readback generated
-> tester guide and feedback ledger prepared
-> final audit says public release and live destructive boundaries remain blocked
```

이 단계에서도 다음 표현은 금지한다.

- public release ready
- production-ready
- 최종 배포 완료

허용되는 표현은 다음이다.

- GPAO-T test-team candidate complete
- Pre-Release Candidate locked
- supervised test-team candidate prepared
- blocked public release candidate
- live apply 준비 완료, 실제 적용은 승인 대기

## 2. 현재 기준선

현재 이미 닫힌 기준선:

- Live Turn Absorption Bridge v1 implemented.
- OpenClaw Live Turn Hook Readiness Gate implemented.
- Control Center에 live-turn absorption과 live hook readiness 상태가 노출된다.
- 전체 `npm --prefix gpao-t test` 최근 증거: 306 pass / 0 fail / 0 cancelled.
- `npm --prefix gpao-t run check` 최근 증거: pass.

현재 남은 P0:

- 실제 live OpenClaw install 기준 preview diff와 rollback manifest가 아직 생성되지 않았다.
- live hook은 아직 적용되지 않았고, Gateway restart / Telegram smoke / visual QA도 아직 실행되지 않았다.
- release tree의 include/exclude/readback manifest가 최종 고정되지 않았다.
- sealed build 기준 desktop/mobile visual QA evidence가 아직 필요하다.
- `beai verify --scenario --meaning`의 `Invalid string length` 실패는 release gate 도구 gap으로 남아 있다.
- dirty/untracked 상태를 release candidate 판단에 포함할 수 있는 manifest와 audit 문구가 필요하다.

## 3. Phase 체계 고정

기존 Phase 0~7을 이 문서의 유일한 공정 체계로 사용한다. Phase A~G 같은 병행 표기는 금지한다.

### Phase 0. Flow Keeper / 권한 / 증거 / 순서 기준선

목표:
- 공정감시 기준, 권한 경계, 완료 언어, evidence path를 고정한다.
- 다음 단계가 live apply가 아니라 preview/release scope seal임을 고정한다.

작업:
- 이 문서를 생성한다.
- 기존 테스트팀 릴리즈 계획과 README에 이 문서를 연결한다.
- 마스터 플랜에 Phase 0 lock 결정을 기록한다.

Done:
- `GPAO-T-PRE-RELEASE-CANDIDATE-WORK-PLAN-v0.1-ko.md`가 존재한다.
- 기존 계획서가 이 문서를 참조한다.
- 공정감시 결론이 반영되어 Phase 5~6이 실제 핵심, Phase 7은 승인 전 준비/검토 패키지로 제한된다.

권한 경계:
- live file write, Gateway restart, Telegram/external send, public release, durable memory promotion 없음.

### Phase 1. Release Scope Seal

목표:
- 배포 직전 후보에 무엇이 들어가고 무엇이 빠지는지 고정한다.

작업:
- release scope manifest 생성.
- included source/docs/tests/evidence/generated state와 excluded artifacts 분리.
- known limits와 blocked boundaries를 tester-facing language로 고정.

Done:
- release manifest가 source path, evidence path, generated path, excluded path, git reference, package version, authority boundary를 가진다.

현재 증거:
- `docs/03-verification/evidence/GPAO-T-PRE-RELEASE-SCOPE-MANIFEST-2026-07-11.md`

판정:
- Phase 1은 scope seal 기준으로 닫혔다.
- 아직 package/archive/checksum/readback 자체를 생성한 것은 아니다. 그것은 Phase 4의 작업이다.

### Phase 2. Fresh Verification Matrix

목표:
- 현재 sealed scope 기준으로 fresh verification을 남긴다.

작업:
- bounded release-smoke command set 구성.
- full suite 또는 bounded full-suite equivalent 실행.
- long-running/soak tests는 release gate와 분리한다.
- `beai verify` 도구 실패는 explicit evidence matrix로 보완한다.

Done:
- syntax, targeted P0 tests, release-smoke, package/readback tests의 fresh evidence가 존재한다.

현재 증거:
- `docs/03-verification/evidence/GPAO-T-PRE-RELEASE-FRESH-VERIFICATION-MATRIX-2026-07-11.md`

판정:
- bounded release-smoke는 통과했다.
- product-axis / production audit / supervised testing readiness는 sequential rerun 기준 ready다.
- full-suite evidence도 충분한 예산으로 재실행해 308 pass / 0 fail / 0 cancelled로 통과했다.
- Phase 2는 닫혔다.

남은 개선:
- `owner-ops-final-candidate.test.js`와 Owner Ops 통합 구간은 매우 느리므로, release-smoke와 soak로 분리하거나 진행 가시성을 높이는 P1 개선이 필요하다.

### Phase 3. Live Hook Preview / Diff / Backup Manifest

목표:
- live OpenClaw를 바꾸기 전, 바뀔 파일과 되돌릴 방법을 눈으로 확인 가능한 상태로 만든다.

작업:
- current live OpenClaw path inventory.
- preview diff 생성.
- timestamped backup manifest 생성.
- before/after SHA-256 readback plan 생성.
- rollback command / restore path 문서화.

Done:
- live hook preview package가 존재하지만 live write는 아직 없다.

권한 경계:
- 실제 live file write와 Gateway restart는 여기서 금지.

현재 증거:
- `tools/preview-openclaw-live-gpao-bridge-patch.mjs`
- `docs/03-verification/evidence/live-hook-preview/openclaw-live-hook-preview-2026-07-11/manifest.json`
- `docs/03-verification/evidence/live-hook-preview/openclaw-live-hook-preview-2026-07-11/README.md`
- `docs/03-verification/evidence/live-hook-preview/openclaw-live-hook-preview-2026-07-11/live-readback-snapshot/`

판정:
- Phase 3 preview/readback package는 생성됐다.
- 현재 live OpenClaw에는 이미 GPAO bridge가 감지된다.
- staged patch와 current live의 핵심 파일 diff는 0이다.
- previous backup 대비 current live 변경은 server methods 463 lines, core descriptors 490 lines, control-ui index 1 line이다.
- 이 실행은 live OpenClaw file write, Gateway restart, Telegram/external send, durable memory promotion, public release를 실행하지 않았다.

남은 경계:
- 실제 rollback 실행은 금지.
- 실제 Gateway restart는 금지.
- 실제 live chat/Telegram smoke는 Phase 7 owner decision 전까지 금지.

### Phase 4. Package / Archive / Checksum / Readback

목표:
- 테스트팀 후보가 전달 가능한 로컬 패키지 형태로 검증된다.

작업:
- local package candidate 생성.
- archive checksum dry-run 또는 실제 local archive 생성.
- readback check.
- package manifest와 checksum 파일 연결.

Done:
- tester에게 줄 수 있는 archive/readback evidence가 존재한다.
- public upload/signing/marketplace release는 blocked로 남는다.

현재 증거:
- `docs/03-verification/evidence/GPAO-T-PRE-RELEASE-PHASE-4-PACKAGE-READBACK-2026-07-11.md`
- `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.zip`
- `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.zip.sha256`
- `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.bundle.json`
- `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.manifest.json`

판정:
- Phase 4는 local supervised candidate 기준으로 닫혔다.
- archive SHA-256: `a5da2f9bed0bfb0449eaebd4f015e56aa29c063e29455e65dd5e53591f04e095`
- bundle SHA-256: `03c87ff51619fb115037ebd39c96129726c4addab37b55cfd3fe91076f4cadb3`
- readback file count: 66
- zip integrity: OK
- public upload, signing, install/update/rollback execution은 열지 않았다.

### Phase 5. Visual QA / User-Perceived OS Check

목표:
- 현재 후보가 눈으로 보아도 GPAO-T 작업 OS처럼 보이는지 확인한다.

작업:
- Gateway / Control Center / Workspace 또는 현재 사용자 화면의 desktop/mobile visual QA.
- live-turn trace, memory/replay/apply gate, session rail, inspector, compact status lanes 확인.
- 박스/카드 남발, 텍스트 overflow, 모바일 action visibility, 한국어 가독성 점검.

Done:
- sealed candidate 기준 screenshot evidence와 visual QA markdown이 존재한다.

현재 증거:
- `docs/03-verification/evidence/GPAO-T-PRE-RELEASE-PHASE-5-LIVE-VISUAL-QA-2026-07-11.md`
- `docs/03-verification/evidence/phase-5-live-visual-qa-2026-07-11/gpao-t-phase5-live-desktop-1440x960-2026-07-11.png`
- `docs/03-verification/evidence/phase-5-live-visual-qa-2026-07-11/gpao-t-phase5-live-mobile-390x844-2026-07-11.png`

판정:
- Phase 5는 supervised pre-release 기준으로 닫혔다.
- Safari 인증 live UI는 DOM readback으로 `nBeAI. GPAO-T`, session rail, 목표/맥락/실행/응답 lane, memory/replay/apply/authority lock을 확인했다.
- 독립 Playwright 브라우저는 인증 세션이 없어 Gateway 연결 blocked-state를 보여준다. 이 limitation은 숨기지 않고 test-team guide에 반영했다.
- Telegram/model answer path의 완전한 memory-backed 증거로 과장하지 않는다.

### Phase 6. Tester Handoff Guide / Feedback Ledger

목표:
- 일반 테스터가 무엇을 해도 되고, 무엇을 하면 안 되는지 알 수 있게 한다.

작업:
- tester guide 작성.
- first-run instruction.
- expected behavior / known limits / blocked actions / recovery path 작성.
- feedback ledger schema 또는 local record path 준비.

Done:
- 테스트팀 전달 전 읽을 단일 안내서와 feedback ledger가 존재한다.

현재 증거:
- `docs/05-release/TEST-TEAM-README.md`
- `docs/05-release/TEST-TEAM-FEEDBACK-LEDGER.md`
- `.gpao-t/packages/OWNER-OPS-TEAM-ALPHA-HANDOFF-BUNDLE.md`

판정:
- Phase 6은 local supervised handoff 기준으로 닫혔다.
- tester guide는 archive/checksum, known limits, blocked actions, recovery path, feedback ledger를 연결한다.
- 외부 공유/업로드 자체는 아직 실행하지 않았다.

### Phase 7. Owner Decision Lane / Approved Live Apply Boundary

목표:
- live apply 또는 테스트팀 전달 여부를 owner decision으로 분리한다.

작업:
- owner decision packet 생성.
- 선택지:
  - continue_supervised_testing
  - request_revision
  - approve_local_candidate_review
  - consider_public_release_later
  - approve_live_apply_later
- live apply가 필요하면 Phase 3 preview package와 rollback manifest를 기준으로 별도 승인 후 진행한다.

Done:
- 승인 전 실행 금지 경계가 유지된다.
- 승인 패킷 없이 live OpenClaw write, Gateway restart, Telegram send, public release는 실행되지 않는다.

현재 증거:
- `docs/03-verification/evidence/GPAO-T-PRE-RELEASE-PHASE-7-OWNER-DECISION-LANE-2026-07-11.md`
- `.gpao-t/packages/OWNER-OPS-FINAL-LOCAL-RELEASE-CANDIDATE-DECISION-PACKET.md`

판정:
- Phase 7은 local decision lane 기준으로 닫혔다.
- decision packet과 next-action map은 ready다.
- 이번 실행에서 owner decision record를 임의로 append하지 않았다.
- live file write, Gateway restart, Telegram/external send, provider behavior change, OpenClaw memory write, durable memory promotion, public release/deploy/GitHub push, destructive rollback은 실행하지 않았다.

## 4. 공정감시 기준

공정감시 에이전트 또는 Codex는 이후 주요 단계마다 아래를 확인한다.

- 현재 작업이 Pre-Release Candidate 목표에 직접 연결되는가.
- live apply를 준비 작업과 섞지 않았는가.
- package/readback/rollback/visual QA/tester guide 중 빠진 것이 없는가.
- completion language가 과장되지 않았는가.
- OpenClaw를 외부 sidecar가 아니라 GPAO-T로 흡수하는 방향이 유지되는가.
- T-cell / Context Mesh / memory / self-growth가 실제 live turn trace에 연결되는가.

## 5. 다음 실행 순서

Phase 4~7 one-stop pass는 2026-07-11에 닫혔다.

다음 단계는 수정/보강 단계다.

1. Safari 인증 live UI는 확인됐으나, 독립 브라우저는 Gateway 연결 blocked-state를 보인다. 테스트팀 전에는 인증/연결 조건을 더 자연스럽게 만드는 개선이 필요하다.
2. Telegram/model answer path가 GPAO-T memory-backed임을 과장하지 않는다. 다음 live smoke에서 preflight/post-answer/memory degraded mode를 별도 검증한다.
3. 실제 public release, external distribution, durable memory promotion, live OpenClaw memory write는 계속 별도 owner decision 이후에만 가능하다.
