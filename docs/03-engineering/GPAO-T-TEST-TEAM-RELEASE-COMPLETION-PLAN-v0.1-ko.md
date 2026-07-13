# GPAO-T Test Team Release Completion Plan v0.1

Status: active completion plan  
Date: 2026-07-11  
Owner: 윤  
Mode: architecture audit / no code mutation  
Target: 테스트팀 배포버전까지의 GPAO-T 최종 완료 계획

Canonical completion endpoint:

- `docs/03-engineering/GPAO-T-TEST-TEAM-COMPLETION-ENDPOINT-v1.0-ko.md`
- 이 계획에서 완료/완성은 테스트팀에게 보낼 수 있는 GPAO-T 후보를 뜻한다. 공개 배포, signed installer, 상용 production-ready 기준을 섞지 않는다.

## 0.1 2026-07-11 공정감시 감사 보강

감사 역할:

- 코드 수정 금지.
- 현재 대화, Context Mesh, repo 상태, 기존 OpenClaw 흡수 문서를 기준으로 최종 릴리스까지의 phase/gate/evidence/authority boundary를 점검.
- 특히 "기능은 있으나 live OpenClaw/Telegram 경로에 안 물린 빈틈"을 P0로 판정.

이번 감사 결론:

```text
현재 GPAO-T는 내부 기능 조립 단계가 아니라 live 경로 폐쇄 단계에 들어섰다.
테스트팀 배포판의 핵심 품질 기준은 기능 개수가 아니라,
실제 OpenClaw/Telegram 사용자 턴이 GPAO-T kernel과 memory/self-growth loop를 반드시 통과하는지다.
```

확인 증거:

- Context Mesh turn-start resolve: ready.
- BEAI route: strict lifecycle, release readiness 방향, completion gate blocked.
- BEAI plan: 테스트팀 배포버전까지 최종 개발 완료 계획 saved.
- BEAI preflight: repo completion score 68/100, completion gate blocked.
- Targeted tests:
  - `node --test test/auto-memory-growth-loop.test.js test/chat-preflight-replay.test.js test/llm-ready-task-context-packet.test.js test/session-continuity.test.js test/workspace-shell.test.js`
  - 결과: 23 pass / 0 fail.
- Syntax check:
  - `npm run check`
  - 결과: pass.
- Verification gap:
  - `beai verify --scenario --meaning`
  - 결과: `Invalid string length`로 도구 실패. release gate 전 복구 또는 우회 검증 evidence 필요.

공정감시 판정:

- On track: OpenClaw를 외부 장치로 두지 않고 GPAO-T로 흡수하려는 방향은 유지됨.
- P0 gap: live OpenClaw/Telegram answer path가 `preflight -> admission -> LLM-ready packet -> post-answer replay -> auto-memory-growth`를 필수 통로로 아직 잠그지 못함.
- P0 gap: release tree가 큰 dirty/untracked 상태라 테스트팀 package include/exclude/readback manifest가 아직 고정되지 않음.
- P0 gate: 테스트팀 배포판은 MVP가 아니라 local production candidate로 다뤄야 함.
- Authority boundary: live OpenClaw mutation, Gateway restart, Telegram/external send, credential/account/secret, public release/deploy/GitHub push는 별도 승인 전까지 실행 금지.

따라서 이 계획서의 다음 개발 순서는 아래 phase를 순서대로 닫는 것으로 고정한다.

## 0.2 2026-07-11 Phase B 진행 기록: Live Turn Absorption Bridge v1

구현 상태:

- `src/core/live-turn-absorption-bridge.js` 추가.
- Gateway route 추가:
  - `GET /live-turn/absorption/policy`
  - `POST /live-turn/absorption/source`
  - `POST /live-turn/absorption/run`
  - `GET /live-turn/absorption/runs`
  - `GET /live-turn/absorption/summary`
  - `GET /live-turn/absorption/verify`
- CLI 추가:
  - `gpao-t live-turn policy`
  - `gpao-t live-turn source <kind>`
  - `gpao-t live-turn run <message>`
  - `gpao-t live-turn run-answer <message> ::: <answer>`
  - `gpao-t live-turn runs`
  - `gpao-t live-turn summary`
  - `gpao-t live-turn verify`
- Control Center에 `live-turn-absorption` panel/count 추가.
- `test/live-turn-absorption-bridge.test.js` 추가.

브리지 v1의 기능:

- OpenClaw web, Telegram direct, Gateway chat, controlled smoke 턴을 같은 source classification으로 받는다.
- 사용자 원문 메시지는 변경하지 않고, provider/send path도 변경하지 않는다.
- 답변 전에는 `chat_preflight_packet`을 기록한다.
- 답변 후에는 `post_answer_replay_record`, `answer_replay_evaluation`, review-only memory candidate preview를 만든다.
- 안전한 로컬 범위에서는 `auto-memory-growth`를 호출해 memory review queue, read-only replay, local Context Mesh candidate, rollback receipt, self-growth candidate까지 이어준다.
- 위험 문구나 외부/공개/비밀/계정/파괴/라이브 OS mutation 경계는 자동 성장 루프에서 approval-required로 멈춘다.

권한 경계:

- live OpenClaw mutation: blocked.
- OpenClaw memory write: blocked.
- provider behavior change: blocked.
- Telegram/external send: blocked.
- durable memory promotion: blocked.
- public release/deploy: blocked.
- local trace write: allowed.

검증 증거:

- `node --check src/core/live-turn-absorption-bridge.js`: pass.
- `node --check bin/gpao-t.js`: pass.
- `node --test test/live-turn-absorption-bridge.test.js`: 6 pass / 0 fail.
- `node --test test/live-turn-absorption-bridge.test.js test/chat-preflight-replay.test.js test/auto-memory-growth-loop.test.js test/llm-ready-task-context-packet.test.js`: 20 pass / 0 fail.
- `npm run check`: pass.
- 전체 `npm test`: 306 pass / 0 fail / 0 cancelled.

공정감시 판정:

- Phase B의 local bridge substrate는 구현됨.
- 아직 live OpenClaw/Telegram hook 자체는 직접 변경하지 않았다. 이는 의도된 권한 경계다.
- 다음 P0는 실제 라이브 경로 적용 전 diff/rollback/restart/visual QA 계획을 이 브리지 계약에 맞춰 고정하고, 좁은 hook을 연결하는 것이다.
- 테스트팀 배포판 완료 표현은 아직 금지한다. 현재 상태는 "Live Turn Bridge 로컬 구현/전체 테스트 통과, 실제 live hook 및 release package evidence 미완"이다.

## 0.3 2026-07-11 Phase B-2 진행 기록: OpenClaw Live Hook Readiness Gate

구현 상태:

- `src/core/openclaw-absorption-control.js`에 `OpenClaw Live Turn Hook Readiness Gate` 추가.
- Gateway route 추가:
  - `GET /openclaw/live-turn-hook/readiness`
  - `GET /openclaw/live-turn-hook/readiness/verify`
- CLI 추가:
  - `gpao-t openclaw live-turn-hook-readiness`
  - `gpao-t openclaw live-turn-hook-readiness-check`
- Control Center에 `openclaw-live-hook-readiness` panel/count/authority boundary 추가.
- `test/openclaw-absorption-control.test.js`에 readiness gate/Gateway 검증 추가.

이 단계의 의미:

- 실제 live OpenClaw/Telegram hook을 아직 적용하지 않는다.
- 대신 hook 적용 전 반드시 필요한 조건을 하나의 제품 계약으로 고정한다:
  - 원문 메시지 변경 금지.
  - provider behavior 변경 금지.
  - pre-send preflight 기록.
  - post-answer replay/growth trace 기록.
  - Control Center live-turn trace 표시.
  - file-level diff preview.
  - timestamped backup.
  - SHA-256 before/after readback.
  - rollback restore path.
  - restart approval boundary.
  - desktop/mobile visual QA.
  - controlled live-turn smoke.

권한 경계:

- live OpenClaw file write: not executed.
- Gateway restart: approval required / not allowed now.
- Telegram external send: not allowed now.
- provider behavior change: blocked.
- OpenClaw memory write: blocked.
- durable memory promotion: blocked.
- public release/deploy: blocked.

검증 증거:

- `node --check src/core/openclaw-absorption-control.js`: pass.
- `node --check src/index.js`: pass.
- `node --check src/core/gateway.js`: pass.
- `node --test test/openclaw-absorption-control.test.js`: 8 pass / 0 fail.
- `node bin/gpao-t.js openclaw live-turn-hook-readiness-check`: ready.
- `node --test test/control-center.test.js test/live-turn-absorption-bridge.test.js test/openclaw-absorption-control.test.js`: 45 pass / 0 fail.
- `npm run check`: pass.

다음 P0:

- 이 readiness gate를 기준으로 실제 live hook patch preview/diff/backup manifest를 생성한다.
- 실제 live file write, Gateway restart, Telegram smoke는 별도 승인 경계로 유지한다.

## 0.4 2026-07-11 Pre-Release Candidate 공정 고정

추가 계획:

- `docs/03-engineering/GPAO-T-PRE-RELEASE-CANDIDATE-WORK-PLAN-v0.1-ko.md`

공정감시 보강 결론:

- 현재 목표는 공개 배포가 아니라 테스트팀 배포 직전의 supervised Pre-Release Candidate다.
- 기존 Phase 0~7을 단일 공정 체계로 고정한다. Phase A~G 같은 병행 표기는 사용하지 않는다.
- Phase 0은 Flow Keeper / 권한 / 증거 / 순서 기준선이다.
- Phase 1~4는 release scope seal, fresh verification, live hook preview package, package/archive/checksum/readback을 닫는다.
- Phase 5~6은 sealed candidate 기준 visual QA와 tester handoff guide / feedback ledger를 닫는다.
- Phase 7은 owner decision lane이다. 실제 live apply, Gateway restart, Telegram external smoke, public release는 승인 전 실행하지 않는다.

즉시 다음 작업:

1. Release scope manifest를 생성한다.
2. Fresh verification matrix를 고정한다.
3. live OpenClaw 기준 preview diff / rollback manifest를 만든다.
4. package/checksum/readback과 tester guide를 닫는다.

Phase 1 진행 기록:

- `docs/03-verification/evidence/GPAO-T-PRE-RELEASE-SCOPE-MANIFEST-2026-07-11.md` 생성.
- 포함 범위: runtime CLI, Core turn kernel, Context/T-cell admission, authority/model/tool boundary, memory/replay/growth review loop, live-turn bridge, OpenClaw live-hook readiness, Gateway/Control Center, Workspace/Work Surface, Owner Ops package substrate, read-mostly app shell scaffold, tests, product/engineering/verification docs.
- 제외 범위: public upload/deploy/marketplace, GitHub push/tag, credential/secret/OAuth, Telegram/external send, live OpenClaw file write, Gateway restart, provider behavior change, OpenClaw memory write, durable memory promotion, destructive rollback, Tauri build/sign/installer, live connector activation, paid provider calls.
- 다음 gate는 Phase 2 fresh verification matrix다.

Phase 2 진행 기록:

- `docs/03-verification/evidence/GPAO-T-PRE-RELEASE-FRESH-VERIFICATION-MATRIX-2026-07-11.md` 생성.
- 통과:
  - `npm --prefix gpao-t run check`
  - Control Center / live-turn bridge / OpenClaw readiness targeted bundle: 45 pass / 0 fail / 0 cancelled
  - `openclaw live-turn-hook-readiness-check` from `gpao-t/` cwd: ready
  - local package candidate check/readback: ready
  - final local release candidate check/write: ready / written_local_only
  - final candidate owner decision lane / next action: ready
  - token 없는 decision append: blocked / recordWritten false
- review-blocked:
  - none after full rerun
- recovered on sequential rerun:
  - `owner-ops product-axis-readiness-check`: ready
  - `owner-ops production-completion-audit-check`: ready
  - `owner-ops supervised-testing-readiness-check`: ready
  - isolated `owner-ops-final-candidate.test.js`: 1 pass / 0 fail / 0 cancelled, about 280.5s
  - full `npm test`: 308 pass / 0 fail / 0 cancelled, about 1,369.3s
- 판정:
  - bounded release-smoke는 유효하다.
  - full-suite evidence도 통과했다.
  - 다음 구현은 Phase 3 live hook preview diff / rollback manifest다.
  - 긴 Owner Ops 통합 테스트는 P1 최적화 대상으로 남긴다.

Phase 3 진행 기록:

- `tools/preview-openclaw-live-gpao-bridge-patch.mjs` 추가.
- read-only preview/readback 실행 결과:
  - `docs/03-verification/evidence/live-hook-preview/openclaw-live-hook-preview-2026-07-11/manifest.json`
  - `docs/03-verification/evidence/live-hook-preview/openclaw-live-hook-preview-2026-07-11/README.md`
  - `docs/03-verification/evidence/live-hook-preview/openclaw-live-hook-preview-2026-07-11/live-readback-snapshot/`
- preview status:
  - `preview_ready_live_already_contains_gpao_bridge`
- hash/readback:
  - `server-methods-B64pXQ-G.js`: `98da4554ff147915335973d6607964cb68805288965c229fab49becb03e99a60`
  - `core-descriptors-B2lASufG.js`: `cde7f02947e1133ef512be04c1833e1d92e926586f6f81e6e00e0054f0d27c3d`
  - `gpao-t-CkviVFR2.js`: `613bfbfa256d5d3dbd05cb51a066aa17f3236e552349be736936fba4105092b1`
  - `control-ui/index.html`: `ebb004d799df15ba4656ae21eaed8753c9bf2d7ce03aae205d580b7c7e2929b9`
- diff/readback:
  - previous backup -> current live: server methods 463 changed lines, core descriptors 490 changed lines, control-ui index 1 changed line
  - staged patch -> current live: server methods 0, core descriptors 0, gpao bridge 0
- rollback plan:
  - previous backup dir: `docs/03-verification/evidence/live-backups/openclaw-live-gpao-bridge-2026-07-11-before-patch`
  - restore server methods / core descriptors / control-ui from backup
  - remove `gpao-t-CkviVFR2.js` if rolling back this bridge
- 권한 경계:
  - 이 실행은 live OpenClaw file write, Gateway restart, Telegram/external send, provider behavior change, OpenClaw memory write, durable memory promotion, public release를 열지 않았다.
- 검증:
  - `node --check tools/preview-openclaw-live-gpao-bridge-patch.mjs`: pass
  - `node bin/gpao-t.js openclaw live-turn-hook-readiness-check`: ready
- 다음 구현:
  - Phase 4 package/archive/checksum/readback과 Phase 5 visual QA 계획으로 이동한다.

Phase 4 진행 기록:

- 실제 로컬 archive/checksum/readback을 생성하고 검증했다.
- 증거:
  - `docs/03-verification/evidence/GPAO-T-PRE-RELEASE-PHASE-4-PACKAGE-READBACK-2026-07-11.md`
  - `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.zip`
  - `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.zip.sha256`
  - `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.bundle.json`
  - `.gpao-t/packages/gpao-t-owner-ops-0.1.0-local-candidate.manifest.json`
- archive SHA-256:
  - `a5da2f9bed0bfb0449eaebd4f015e56aa29c063e29455e65dd5e53591f04e095`
- bundle SHA-256:
  - `03c87ff51619fb115037ebd39c96129726c4addab37b55cfd3fe91076f4cadb3`
- 검증:
  - `zip -T`: OK
  - `local-package-candidate-readback-check`: ready / findings []
  - `install-update-rollback-proof-check`: ready / proof requirements ready, not executed
- public upload, signing, install/update/rollback execution은 열지 않았다.

Phase 5 진행 기록:

- live Gateway/Safari 시각 QA를 갱신했다.
- 증거:
  - `docs/03-verification/evidence/GPAO-T-PRE-RELEASE-PHASE-5-LIVE-VISUAL-QA-2026-07-11.md`
  - `docs/03-verification/evidence/phase-5-live-visual-qa-2026-07-11/`
- Gateway:
  - `/health`: live
  - `/chat?session=main`: 200
- Safari:
  - title/url/DOM readback으로 `nBeAI. GPAO-T`, session rail, 목표/맥락/실행/응답 lane, memory/replay/apply/authority lock 확인.
- 제한:
  - Playwright 독립 브라우저는 인증 세션이 없어 Gateway 연결 blocked-state를 표시했다.
  - 따라서 Phase 5는 Safari authenticated DOM proof + independent blocked-state screenshot proof로 닫는다.

Phase 6 진행 기록:

- 테스트팀 직전 안내서와 피드백 ledger를 작성했다.
- 증거:
  - `docs/05-release/TEST-TEAM-README.md`
  - `docs/05-release/TEST-TEAM-FEEDBACK-LEDGER.md`
  - `.gpao-t/packages/OWNER-OPS-TEAM-ALPHA-HANDOFF-BUNDLE.md`
- 테스트팀 전달물은 sample/deidentified data, no customer send, no OAuth/API, no public upload, no install/update/rollback execution 기준으로 고정했다.

Phase 7 진행 기록:

- owner decision lane과 final candidate next-action map을 닫았다.
- 증거:
  - `docs/03-verification/evidence/GPAO-T-PRE-RELEASE-PHASE-7-OWNER-DECISION-LANE-2026-07-11.md`
  - `.gpao-t/packages/OWNER-OPS-FINAL-LOCAL-RELEASE-CANDIDATE-DECISION-PACKET.md`
- 검증:
  - `final-local-release-candidate-write`: written_local_only / ready / findings []
  - `final-candidate-next-action-check`: ready / findings []
- 이번 실행에서 owner decision record는 임의로 append하지 않았다.
- public release, external distribution, live OpenClaw write, Gateway restart, Telegram/external send, durable memory promotion은 실행하지 않았다.

금지:

- live OpenClaw file write
- Gateway restart
- Telegram/external send
- credential/secret access
- durable memory promotion
- public release / deploy / GitHub push
- destructive rollback execution

## 0. 결론

현재 GPAO-T는 내부 OS 골격, Control Center, Context/T-cell admission, memory review queue, auto memory/self-growth v1, model/tool/connector authority boundary, local team-alpha package substrate를 상당히 갖췄다.

하지만 테스트팀 배포버전 기준으로는 아직 "하나의 사용 경로"가 완전히 닫히지 않았다.

가장 큰 빈틈은 다음이다.

```text
OpenClaw / Telegram live user turn
-> GPAO-T preflight Task Packet
-> Context Mesh / T-cell Admission
-> model input discipline
-> assistant answer
-> post-answer replay
-> auto memory / self-growth loop
-> Control Center visibility
-> release evidence
```

현재 이 흐름의 부품은 존재하지만, live OpenClaw/Telegram 답변 경로에 강제로 흡수된 단일 pipeline으로 아직 잠기지 않았다.

따라서 테스트팀 배포판 전까지의 핵심 목표는 새 기능을 많이 늘리는 것이 아니라:

1. live turn 경로를 GPAO-T kernel로 통과시키기
2. memory/self-growth 자동 루프를 post-answer에 연결하기
3. Control Center에서 그 상태를 사람이 이해하게 보여주기
4. 패키징/롤백/검증 증거를 하나의 release candidate로 묶기

이다.

## 1. 감사 기준

이 계획은 다음 원칙을 기준으로 한다.

- GPAO-T는 OpenClaw에 붙는 외부 장치가 아니다.
- OpenClaw는 현재 몸체이자 재료이며, GPAO-T가 내부 장기로 흡수해야 한다.
- OpenClaw memory는 recall organ이고, GPAO-T가 admission과 action authority를 소유한다.
- T-cell은 memory 조각이 아니라 trace, authority, state, lifecycle을 가진 작동 원리 단위다.
- 기억과 자가성장은 안전한 로컬 범위에서는 자동화한다.
- 외부전송, 공개배포, 계정/비밀/결제, 파괴, 정체성/헌법 변경, live OpenClaw mutation은 승인 경계다.
- 테스트팀 배포판은 MVP가 아니라 local production candidate다.

## 2. 현재 완료된 주요 골격

### 2.1 Core OS

확인된 파일:

- `src/core/turn-kernel.js`
- `src/core/runtime.js`
- `src/core/llm-ready-task-context-packet.js`
- `src/core/authority.js`
- `src/core/model-router.js`
- `src/core/tool-runtime.js`

현재 상태:

- `input -> context -> admission -> authority -> skill/model/tool route -> task packet` 골격이 있다.
- LLM-ready packet은 admitted memory와 excluded memory를 분리한다.
- 모델 출력이 tool authority가 아니라는 경계가 있다.

남은 통합:

- 이 Core OS가 live OpenClaw `chat.send` 전 경로에서 필수 preflight로 호출되어야 한다.
- Telegram direct session도 같은 Task Packet discipline을 타야 한다.
- Task Packet id, run id, session key, post-answer replay id가 하나의 trace로 이어져야 한다.

### 2.2 OpenClaw Live Absorption

확인된 파일:

- `docs/00-canon/GPAO-T-OPENCLAW-ABSORPTION-CONSTITUTION-v0.1-ko.md`
- `src/core/openclaw-absorption-control.js`
- `tools/apply-openclaw-live-gpao-bridge-patch.mjs`
- live patch evidence files under `docs/03-verification/evidence/`

현재 상태:

- OpenClaw source anatomy와 live mutation 경계가 문서화되어 있다.
- Dashboard fork 방향, call path, lab patch 원칙이 있다.
- 일부 live UI patch evidence가 존재한다.

남은 통합:

- lab/source mapping, live diff, rollback, restart, visual QA가 release phase의 필수 gate로 묶여야 한다.
- OpenClaw memory/search/session을 GPAO-T SourceRecord로 변환하는 adapter가 필요하다.
- 기존 OpenClaw prompt/context path에 GPAO-T admission result가 실제로 들어가는지 evidence가 필요하다.

### 2.3 Context / T-cell Kernel

확인된 파일:

- `src/core/context-runtime.js`
- `src/core/admission.js`
- `src/core/context-admission-policy.js`
- `docs/03-engineering/GPAO-T-MEMORY-KNOWLEDGE-CONTROL-ARCHITECTURE-v0.1-ko.md`

현재 상태:

- Context Mesh retrieval과 Admission Packet 분리가 있다.
- retrieved result가 곧 answer anchor가 아니라는 원칙이 구현되어 있다.
- active target, stale support, risk penalty, candidate penalty가 있다.

남은 통합:

- OpenClaw memory/wiki/session search 결과를 `SourceRecord[]`로 받아야 한다.
- Admission Packet에 `memory_used`, `memory_excluded`, `why`가 테스트팀이 볼 수 있는 형태로 들어가야 한다.
- T-cell candidate와 runtime admitted T-cell의 lifecycle 전환 기준이 더 명확해야 한다.

### 2.4 Memory / Self-Growth

확인된 파일:

- `src/core/memory-wiki.js`
- `src/core/memory-candidate-review-queue.js`
- `src/core/auto-memory-growth-loop.js`
- `src/core/chat-preflight-replay.js`
- `src/core/growth-proposals.js`
- `src/core/growth-application-gates.js`
- `docs/00-canon/GPAO-T-SELF-GROWTH-LOOP-CONTRACT-v0.1-ko.md`

현재 상태:

- memory candidate, read-only replay, apply request, approval/audit bridge, reversible local Context Mesh apply가 있다.
- auto memory/self-growth v1은 안전한 로컬 신호를 자동 처리한다.
- durable memory promotion, OpenClaw memory write, live OS rule mutation은 막혀 있다.

남은 통합:

- auto memory/self-growth loop가 실제 chat post-answer 경로에서 자동 호출되어야 한다.
- OpenClaw 기존 memory search가 실패할 때 GPAO-T Context Mesh fallback이 답변 전 단계에 들어가야 한다.
- "자동으로 저장한 후보"와 "답변에 실제 사용한 admitted context"가 Control Center에서 분리되어 보여야 한다.

### 2.5 Gateway / Telegram

확인된 파일:

- `src/core/gateway.js`
- `src/core/chat-preflight-replay.js`
- `src/core/model-invocation.js`
- `src/core/execution-runtime.js`

현재 상태:

- Gateway에 `/chat/preflight-*`, `/auto-memory-growth/*`, `/turn`, `/control-center`, `/production/*` 라우트가 있다.
- Telegram direct session은 live OpenClaw 상태에서 존재하지만, GPAO-T repo 기준으로는 흡수된 정식 adapter evidence가 아직 부족하다.

남은 통합:

- Telegram message receive/send lifecycle을 GPAO-T route로 관찰하고 evidence화해야 한다.
- preflight packet이 live answer 전 model input에 영향을 주는지 확인해야 한다.
- post-answer replay와 auto-growth가 Telegram 답변 이후 자동 기록되는지 확인해야 한다.

### 2.6 UI / Control Center

확인된 파일:

- `src/core/control-center.js`
- `src/core/control-center-renderer.js`
- `src/core/workspace-shell.js`
- `src/core/session-workspace.js`
- `docs/02-design/*`

현재 상태:

- Control Center data contract와 rendered surface가 있다.
- multi-session/workspace shell 방향과 Codex-like work surface가 있다.
- memory, growth, authority, skill, connector, first-completion panels가 있다.

남은 통합:

- live OpenClaw dashboard에서 테스트팀이 볼 화면과 GPAO-T local Control Center 화면이 같은 상태 source를 봐야 한다.
- session rail, active work, inspector, memory/replay panel이 "실제 대화 경로"와 연결되어야 한다.
- card-heavy dashboard 느낌을 줄이고 Work OS surface를 첫 화면으로 고정해야 한다.

### 2.7 Packaging / Release

확인된 파일:

- `src/core/production-completion.js`
- `src/core/owner-ops-*.js`
- `.gpao-t/release/*`
- `.gpao-t/packages/*`
- `package.json`

현재 상태:

- stage 5-8 local production/team alpha/tester distribution substrate가 있다.
- package manifest, team-alpha README, release readiness evidence 구조가 있다.
- `npm run check`, `npm test`, `npm run verify`가 존재한다.

남은 통합:

- stage 5-8 정의에 live OpenClaw/Telegram absorption evidence와 auto-memory post-answer integration gate를 추가해야 한다.
- dirty/untracked release tree를 정리하고 package manifest에 포함/제외 파일을 고정해야 한다.
- 테스트팀 배포판의 install/run/update/rollback 문서를 실제 파일 기준으로 다시 닫아야 한다.

## 3. 통합 누락 목록

P0 통합 누락:

1. Live OpenClaw `chat.send` preflight에 GPAO-T Task Packet이 강제 연결되지 않음.
2. Telegram direct answer 후 `post-answer replay -> auto-memory-growth`가 자동 연결되지 않음.
3. OpenClaw memory/search failure 시 GPAO-T Context Mesh fallback/primary path가 live model input에 들어가지 않음.
4. Control Center summary가 live answer trace와 완전히 같은 run id를 공유하지 않음.
5. 테스트팀 배포판 phase gate가 현재 새 auto-memory/live-absorption gap을 반영하지 않음.

P1 통합 누락:

1. `SourceRecord[]` 표준이 OpenClaw memory/wiki/session에서 완전히 구현되지 않음.
2. `memory_used`, `memory_excluded`, `why`가 Admission Packet과 UI inspector에 충분히 노출되지 않음.
3. T-cell candidate -> admitted runtime T-cell -> growth proposal -> apply gate lifecycle이 release evidence로 묶이지 않음.
4. Gateway/Telegram/Control Center status language가 같은 사용자 언어 체계를 공유하지 않음.
5. package manifest가 현재 많은 untracked docs/evidence/source additions를 품질 기준으로 분류하지 않음.

P2 통합 누락:

1. Tauri packaged desktop은 scaffold/readiness 중심이고 실제 build/sign/notarization은 승인 경계 뒤에 있음.
2. external provider/API lane은 approval packet과 transport gate가 있으나 테스트팀용 계정/비용 정책은 아직 final이 아님.
3. multi-agent 공정감시가 문서상 필요하지만 현재 repo-scoped background agent creation 환경은 비어 있음.

## 4. 최종 완료 Phase

### Phase A. Release Architecture Freeze

목표:

- 테스트팀 배포판의 정확한 구성, 제외 범위, 권한 경계, 완료 언어를 고정한다.

작업:

- 이 문서를 기준 계획으로 채택한다.
- `production-completion` stage 정의를 live absorption gap까지 확장할 준비를 한다.
- dirty/untracked 파일을 release inclusion, evidence, lab backup, excluded scratch로 분류한다.
- 공정감시 lane을 필수 운영 규칙으로 둔다.

완료 증거:

- final phase list 문서화.
- release include/exclude manifest 초안.
- 승인 경계 목록 고정.

### Phase B. Live Turn Absorption Pipeline

목표:

- OpenClaw/Telegram live user turn이 GPAO-T Core OS를 통과하게 만든다.

필수 pipeline:

```text
incoming message
-> chat preflight packet
-> runtime turn / task packet
-> context mesh
-> tcell admission
-> authority decision
-> LLM-ready packet
-> original OpenClaw send path
```

작업:

- OpenClaw chat call path의 preflight bridge를 확정한다.
- Telegram direct session도 같은 bridge를 타게 한다.
- live mutation은 lab patch, diff, backup, rollback, visual QA 후 승인 경계로 적용한다.

완료 증거:

- live 또는 controlled live smoke에서 preflight id, session key, run id가 기록됨.
- memory retrieval failure 상황에서도 GPAO-T packet이 fallback context를 제공함.
- 기존 OpenClaw send/reconnect/abort/queued behavior 회귀 없음.

### Phase C. Post-Answer Memory / Self-Growth Automation

목표:

- 답변 후 자동 replay와 auto memory/self-growth loop가 실제로 돈다.

필수 pipeline:

```text
assistant answer
-> post-answer replay record
-> answer replay evaluation
-> memory candidate
-> read-only replay
-> safe local context mesh candidate apply
-> self-growth candidate
-> Control Center summary
```

작업:

- `chat-preflight-replay`와 `auto-memory-growth-loop`를 post-answer hook에서 연결한다.
- 승인 경계 문구를 live answer flow와 UI에 동일하게 표시한다.
- durable memory/OpenClaw memory write는 계속 차단한다.

완료 증거:

- Telegram 또는 Gateway chat 1회 후 `.gpao-t/chat/*`와 `.gpao-t/growth/*`에 연결 기록 생성.
- `auto-memory-growth summary`가 증가.
- Control Center에서 latest run, replay, growth candidate 확인 가능.

### Phase D. Context / T-cell Kernel Hardening

목표:

- OpenClaw memory와 GPAO-T Context Mesh가 같은 체계에서 작동하게 한다.

작업:

- OpenClaw memory/wiki/session result -> `SourceRecord[]` 변환.
- Admission Packet에 used/excluded/reason 추가.
- T-cell candidate lifecycle과 invalid conditions를 release-grade schema로 정리.
- stale/wrong-anchor memory가 현재 요청을 이기는 회귀를 replay로 막는다.

완료 증거:

- source conversion tests.
- admission used/excluded tests.
- wrong-anchor replay fixture 통과.
- Inspector에 used/excluded context 표시.

### Phase E. Work OS UI / Control Center Integration

목표:

- 테스트팀이 "대시보드"가 아니라 "작업 OS"로 느끼게 한다.

작업:

- Work Surface를 첫 사용 경로로 고정.
- session rail, active target strip, progress lane, right inspector를 live trace와 연결.
- memory/replay/growth 상태를 숨은 내부 기록이 아니라 사용자 이해 언어로 표시.
- 모바일/데스크톱 배치 QA 유지.

완료 증거:

- desktop/mobile screenshot QA.
- live run id와 Control Center run id 일치.
- empty/success/blocked/recovery visual states 확인.

### Phase F. Test Team Release Candidate Packaging

목표:

- 테스트팀이 설치, 실행, 확인, 피드백, 롤백할 수 있는 local release candidate를 만든다.

작업:

- package manifest include/exclude 고정.
- team alpha guide 갱신.
- install/run/update/rollback proof 갱신.
- version, checksum, local archive, readback snapshot 생성.
- external distribution은 별도 승인 전까지 실행하지 않는다.

완료 증거:

- `npm run check` 통과.
- targeted live absorption tests 통과.
- relevant `npm test` 통과 또는 장시간/외부 경계 테스트 분리 사유 기록.
- local package manifest ready.
- rollback/readback evidence ready.

### Phase G. Test Team Handoff Gate

목표:

- 사용자 승인 후 테스트팀에게 넘길 수 있는 상태를 만든다.

작업:

- 테스트팀용 one-page guide 작성.
- known limitations를 숨기지 않고 명확히 표기.
- feedback intake form/ledger를 준비.
- public release, GitHub push, external send는 여전히 별도 승인 경계로 둔다.

완료 증거:

- test team handoff bundle.
- first tester scenario checklist.
- issue/feedback triage lane.
- "테스트팀 배포 가능" 판단 문장과 차단 조건이 분리됨.

## 5. 공정감시 에이전트 운영 규칙

다음 구현부터 공정감시 에이전트는 필수다.

역할:

- 목표가 OpenClaw 개선으로 좁아지는지 감시.
- 외부 장치화/sidecar drift 감시.
- live mutation 승인 경계 감시.
- phase 완료 증거 누락 감시.
- 테스트 실패를 묻어두지 않고 owner와 recovery를 붙임.

작업 방식:

- 코드 수정 권한 없음.
- phase 시작 시 planned gates 확인.
- phase 종료 시 pass/review/blocked 보고.
- “완료” 언어가 증거보다 앞서면 차단.

## 6. 테스트팀 배포판 완료 정의

테스트팀 배포판은 다음을 만족해야 한다.

1. OpenClaw/Telegram live turn이 GPAO-T preflight/admission/authority packet을 통과한다.
2. 답변 후 replay와 auto memory/self-growth local candidate가 자동 기록된다.
3. Control Center에서 session, active target, context used/excluded, authority, replay, growth state가 보인다.
4. 위험 행동은 승인 경계에서 멈춘다.
5. 설치/실행/검증/롤백 경로가 문서와 manifest에 있다.
6. 테스트팀이 따라 할 첫 시나리오가 있다.
7. 실패/복구/known limitations가 문서화되어 있다.
8. local release artifact와 checksum/readback evidence가 있다.

이 조건 전에는 "테스트팀 배포버전 완료"라고 부르지 않는다.

## 7. 현재 진척 판단

현재 진척률:

```text
내부 OS 골격 기준: 약 70%
테스트팀 배포판 기준: 약 55-60%
```

이 차이가 생기는 이유:

- 내부 기능은 많다.
- 하지만 live OpenClaw/Telegram 답변 경로와 post-answer growth loop가 아직 완전히 연결되지 않았다.
- release packaging은 존재하지만, 현재 새 통합 기준을 반영해 다시 닫아야 한다.

## 8. 다음 실행 순서

다음 개발은 이 순서로 진행한다.

1. Phase A 문서/manifest freeze.
2. Phase B live turn preflight bridge.
3. Phase C post-answer auto memory/self-growth hook.
4. Phase D OpenClaw memory -> SourceRecord -> Admission hardening.
5. Phase E Control Center live trace integration.
6. Phase F local release candidate package.
7. Phase G test team handoff gate.

추천 첫 구현 단위:

```text
Live Turn Absorption Bridge v1
```

포함:

- preflight id/run id/session key trace linking
- OpenClaw/Telegram source record capture
- no provider behavior change first
- post-answer record hook
- Control Center latest live-turn lane
- targeted tests and smoke

금지:

- broad OpenClaw rewrite
- durable memory promotion
- external send activation
- public release
- hidden prompt/rule mutation

## 9. 감사 결과

아키텍처 방향은 맞다.

지금까지의 작업은 헛간 것이 아니라, 필요한 장기들을 많이 만들었다. 다만 테스트팀 배포판에서 중요한 것은 장기의 존재가 아니라 혈관 연결이다. 현재 남은 일은 "더 많은 아이디어"가 아니라 `live turn -> kernel -> answer -> growth -> visible OS -> package`를 하나의 검증 가능한 회로로 닫는 일이다.

이 계획을 다음 개발의 공정 기준으로 삼는다.
