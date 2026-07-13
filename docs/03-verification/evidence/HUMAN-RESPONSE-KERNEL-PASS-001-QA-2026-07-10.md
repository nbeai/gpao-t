# Human Response Kernel Pass 001 QA

Date: 2026-07-10  
Status: pass  
Scope: GPAO-T repo contract, skill registry, replay fixture, tests

## 1. 흡수한 원칙

이번 pass는 외부 원천 프롬프트를 그대로 복사하지 않고, GPAO-T가 런타임에서 사용할 수 있는 Human Response T-cell 계약으로 분해했다.

흡수한 핵심은 다음과 같다.

- 현재 입력 보존
- 요청 형식 보존
- 응답 역할 선택
- 확실성 분리
- 사용자 판단권 보존
- 신호 강도 판단
- 깊이 조절
- 산출물 우선
- 내부 전략과 외부 문구 분리
- 질문 최소화
- 긴 대화 안정성
- 사용 가능한 마무리

## 2. 구현 파일

- `docs/00-canon/GPAO-T-HUMAN-CENTERED-RESPONSE-CANON-ko.md`
- `src/core/skill-ecosystem.js`
- `fixtures/replay/human-response-kernel-v1.json`
- `test/human-response-kernel.test.js`
- `docs/04-skill-ecosystem/GPAO-T-BASE-SKILL-PACKS-ko.md`

## 3. 제품 계약

`gpao-human-response-kernel-pack`은 모든 요청에 끼어드는 전역 프롬프트가 아니다. 응답 품질 실패, 말귀 문제, 불필요한 질문, 검색 없이 추측, 산출물 우선 실패 같은 신호가 있을 때 강하게 라우팅된다.

이 결정은 속도와 품질을 동시에 위한 것이다. GPAO-T는 필요한 T-cell만 admission해야 하며, 좋은 원칙이라는 이유로 모든 턴에 긴 지침을 주입하지 않는다.

## 4. 리플레이 기준

추가한 replay fixture는 다음 실패를 잡는다.

- 짧은 한국어 후속 입력을 과거 맥락에 과잉 연결
- 최신/장소 정보 요청에서 검색 없이 추측
- 산출물 요청에 설명 먼저 출력
- 복잡한 판단에서 사용자 결정권 침범
- 긴 세션에서 오래된 맥락이 현재 요청을 밀어냄

## 5. 하지 않은 것

- 원천 프롬프트 전문을 런타임에 삽입하지 않았다.
- 특정 호칭이나 페르소나 이름을 GPAO-T에 이식하지 않았다.
- live OpenClaw/GPAO-T 런타임을 직접 변경하지 않았다.
- durable memory promotion을 열지 않았다.
- external action, connector activation, model call, paid/destructive action을 열지 않았다.

## 6. 검증

Pass:

- `node --check src/core/skill-ecosystem.js`
- `node --test test/human-response-kernel.test.js`
- `node --test test/skill-ecosystem.test.js test/turn-kernel.test.js test/human-response-kernel.test.js`
- `npm run verify`
- `git diff --check`

Full repo verification result:

- 153 tests passed
- 23 suites passed
- 0 failed

## 7. 다음 적용 후보

다음 live mutation 후보는 OpenClaw/GPAO-T의 모델 입력 전 구간에서 다음을 구현하는 것이다.

- 요청 유형별 Human Response T-cell 선택
- 최신 정보 요청의 evidence route 강제
- 가벼운 대화의 tool/bash 호출 억제
- 한국어 진행 상태 안내와 closeout 개선
- 실패 대화 replay를 통한 before/after 점수화
