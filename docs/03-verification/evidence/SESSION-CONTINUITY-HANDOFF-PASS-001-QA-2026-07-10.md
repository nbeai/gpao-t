# Session Continuity Handoff Pass 001 QA

Date: 2026-07-10  
Status: pass  
Scope: GPAO-T repo-level new-session continuity, recent referent recovery, admission trace, live OpenClaw/GPAO-T state contract

## 1. 문제

Telegram/OpenClaw에서 다음 흐름이 실패했다.

```text
청담동 팔식당 정보 확인
→ /new
→ 거기 후기는 어때?
→ 어디 말하는 거야?
```

사람 기준으로 `거기`는 직전 세션의 `청담동 팔식당`을 가리킨다. 실패 원인은 장기기억 부재라기보다 `/new` 이후 첫 턴에 직전 referent가 모델 입력 전단계로 admission되지 않은 것이다.

## 2. 구현

추가:

- `src/core/session-continuity.js`
- `fixtures/replay/session-continuity-handoff-v1.json`
- `test/session-continuity.test.js`

수정:

- `src/core/session-overlay.js`
- `src/core/context-runtime.js`
- `src/core/admission.js`
- `src/core/context-admission-policy.js`
- `src/core/turn-kernel.js`
- `src/index.js`
- `package.json`

## 3. 제품 동작

새 계층은 세 가지로 나뉜다.

```text
Recent Referent Ledger
  직전 세션에서 언급된 핵심 대상만 짧게 보관

Session Continuity Handoff Pack
  /new 이후 1~3턴 동안만 후보로 쓰는 연결 다리

Session Continuity T-cell
  현재 요청에 영향을 줄 수 있는지 admission packet에서 추적
```

## 4. Admission 원칙

- 현재 요청이 우선한다.
- 최근 referent는 영구기억이 아니다.
- retrieved referent는 곧바로 정답 앵커가 아니다.
- confidence가 낮으면 짧게 확인한다.
- 외부 실행, durable memory promotion은 열지 않는다.

## 5. Replay 케이스

고정한 케이스:

- `팔식당 → /new → 거기 후기는 어때?`는 `청담동 팔식당`으로 자동 이어받음
- `팔식당 → /new → 거기 예약돼?`는 `청담동 팔식당`으로 자동 이어받음
- `팔식당 → /new → 테슬라 주가 알려줘`는 이전 맥락을 버림
- ledger 없는 `그거 계속해`는 대상을 짧게 확인해야 함

## 6. Focused 검증

Pass:

- `node --check src/core/session-continuity.js`
- `node --test test/session-continuity.test.js test/turn-kernel.test.js`
- `node --test test/guided-first-workflow.test.js test/control-center.test.js test/session-continuity.test.js`
- `npm run verify`
- `git diff --check`

Result:

- Focused: 12 tests passed, 2 suites passed, 0 failed
- Regression target: 41 tests passed, 3 suites passed, 0 failed
- Full repo: 159 tests passed, 24 suites passed, 0 failed

## 7. Live OpenClaw/GPAO-T state 반영

다음 live state 파일을 로컬에서 갱신했다.

- `/Users/jyp/.openclaw/workspace/state/beai/session-continuity.json`
- `/Users/jyp/.openclaw/workspace/state/beai/new-session-context-pack.json`

반영 내용:

- `Recent Referent Ledger`를 live state contract로 추가
- 현재 referent: `청담동 팔식당`
- aliases: `팔식당`, `청담동 팔식당`, `거기`, `그곳`, `그 가게`
- safe follow-up lanes: `후기`, `예약`, `메뉴`, `위치`, `가격`, `영업시간`
- admission policy: current request wins, confidence >= 0.75 auto carry, confidence >= 0.45 short clarification
- blocked: durable memory promotion, external action, connector activation, full transcript dump

이 반영은 Telegram/Gateway UI, OpenClaw core, connector, credential, external send, durable memory promotion을 변경하지 않았다.

## 8. 남은 live 검증

Live state contract는 반영했지만, Telegram에서 실제 모델이 이 상태를 소비하는지는 사용자의 다음 live 대화 또는 OpenClaw live run으로 확인해야 한다. 최소 live 테스트:

- `팔식당 → /new → 거기 후기는 어때?`
- `팔식당 → /new → 거기 예약돼?`
- `GPAO 패키지 → /new → 그 배포파일 확인해줘`
- `이전 주제 있음 → /new → 완전히 다른 최신 뉴스 요청`
- `ledger 없음 → /new → 그거 계속해`
