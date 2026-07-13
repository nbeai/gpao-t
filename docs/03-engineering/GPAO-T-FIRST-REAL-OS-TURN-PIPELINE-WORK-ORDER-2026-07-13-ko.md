# GPAO-T First Real OS Turn Pipeline Work Order

Status: locked-for-implementation
Date: 2026-07-13
Owner: nBeAI. GPAO-T

## 목표

GPAO-T의 다음 대단계 목표는 기능을 더 흩어 붙이는 것이 아니라, 한 번의 사용자 요청이 입력부터 답변, 도구, 기억, replay, 자가성장 후보까지 하나의 표준 턴으로 끊기지 않고 흐르게 만드는 것이다.

## 고정 작업명

`GPAO-T First Real OS Turn Pipeline`

## 완료 정의

이번 단계는 다음 7개 증거가 모두 닫혀야 완료로 말할 수 있다.

1. `runGpaoTOsTurn()` 또는 동등한 통합 턴 오케스트레이터가 존재한다.
2. 오케스트레이터는 preflight, 의도/맥락 복구, memory search, T-cell admission, model response, tool supervision, post-answer replay, memory/self-growth candidate를 하나의 turn record로 묶는다.
3. 대시보드 또는 웹챗 제출 경로 중 최소 하나가 이 오케스트레이터를 실제로 호출한다.
4. 실제 provider 응답 경로와 local deterministic fallback이 명확히 분리되어 사용자가 오해하지 않는다.
5. 도구 실행은 안전한 local supervised execution부터 시작하며, 모델 출력이 곧 실행 권한이 되지 않는다.
6. 사용자 화면 또는 surface state에 이번 답변의 참고 맥락, 도구 상태, replay 상태, 성장 후보가 보인다.
7. end-to-end 테스트와 live/Safari 사용자 화면 검증 증거가 남는다.

## 이번 단계의 5대 작업 축

### 1. 통합 턴 오케스트레이터

새 중심 함수는 한 턴의 전체 흐름을 단일 객체로 반환해야 한다.

필수 단계:

- receive_input
- preflight
- recover_intent_context
- memory_search
- tcell_admission
- model_response
- tool_supervision
- final_answer
- post_answer_replay
- memory_self_growth_candidates
- next_turn_effect

### 2. 제출 경로 연결

사용자가 메시지를 치는 경로는 내부적으로 같은 턴 규약을 따라야 한다.

우선순위:

- 기존 `/work-surface/submit` 또는 work-surface submit 계열
- 실제 webchat 메시지 송신 경로
- gateway route surface

### 3. 실제 모델 응답 경로 안정화

Provider/auth 상태가 사용자에게 명확해야 한다.

필수 상태:

- connected
- connected_candidate
- fallback_local_only
- approval_required
- blocked_auth_missing
- failed_provider

### 4. Supervised Local Tool Execution

처음부터 모든 도구 자동 실행을 열지 않는다.

필수 흐름:

- tool_need_detected
- proposal_created
- auto_allowed_or_user_confirmation_required
- executed_or_blocked
- result_attached
- replay_recorded

### 5. Memory / Replay / Self-growth 화면 노출

사용자가 GPAO-T가 왜 그렇게 답했는지, 무엇을 배웠는지 볼 수 있어야 한다.

필수 표시:

- 참고한 맥락
- 사용한 기억 또는 검색 결과
- 새 기억 후보
- replay 통과/검토/실패
- 적용 잠금 상태
- 다음부터 달라질 후보

## 금지 범위

이번 단계에서 금지하는 일:

- 외부 전송 자동화
- durable memory 즉시 promotion
- 위험 도구 자동 실행
- provider secret 출력
- public release 주장
- 사용자 화면 검증 없는 완료 보고
- 기존 live 상태를 되돌리는 리팩터링
- OpenClaw 명칭이나 구조를 사용자-facing 정체성으로 되살리는 일

## 공정관리 체크리스트

- 새 코드가 5대 작업 축 중 어디에 속하는지 명확한가?
- 사용자 입력 하나가 단일 turn id/record로 추적되는가?
- preflight와 post-answer replay가 같은 turn으로 연결되는가?
- memory candidate와 self-growth candidate가 review-only로 잠겨 있는가?
- 실제 모델 응답 실패와 local fallback이 화면에서 구분되는가?
- 도구 실행은 승인/권한/rollback/replay 상태를 가진가?
- 사용자가 화면에서 OS가 작동한 흔적을 이해할 수 있는가?
- 테스트가 unit만이 아니라 end-to-end 흐름을 검증하는가?

## 완료 주장 금지 조건

아래 중 하나라도 있으면 완료라고 말하지 않는다.

- 새 대화 fresh turn이 실패한다.
- provider/auth 오류가 사용자 답변으로 그대로 노출된다.
- replay와 memory candidate가 같은 turn id로 연결되지 않는다.
- 도구 실행 제안이 모델 출력과 구분되지 않는다.
- 화면에는 여전히 단순 챗앱처럼 보이고 OS turn evidence가 없다.
- Safari 또는 live 화면 검증이 없다.
