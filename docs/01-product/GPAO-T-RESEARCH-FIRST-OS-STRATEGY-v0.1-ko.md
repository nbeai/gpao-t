# GPAO-T Research-First OS Strategy v0.1

Status: active direction reset  
Date: 2026-07-10  
Owner: 윤  
Scope: GPAO-T product direction, research method, and implementation guardrails
OpenClaw reference class: third-party comparison, compatibility, and migration only.

## 1. 왜 방향을 다시 잡는가

과거 GPAO-T 작업은 제3자 OpenClaw 호환성/마이그레이션 과정에서 치명적인 한계를 만났다.

문제는 단순히 기능이 부족했던 것이 아니다. Codex 작업 흐름과 제3자 OpenClaw 호환성 경로가 사용자의 입장에서 원하는 작동, 기능, 체감, 흐름을 충분히 이해하지 못했고, 그 결과 개발 방향이 너무 구현 중심으로 꼬였다.

따라서 이 문서는 GPAO-T 개발을 다음 관점으로 재정렬한다.

> GPAO-T는 독립적인 로컬 우선 Growth Personal AI Operating System이며, MVP나 성능 낮은 제3자 OpenClaw 호환성 개조물이 아니다.
> OpenClaw, Codex, Claude, 로컬 기반 AI 도구, 에이전트 런타임, UI/UX, 사용자 체감 성능은 비교 연구하되, 런타임 정체성, T-cell 이론 적용, GPAO Core Engine, 사용자 경험은 GPAO-T가 직접 소유한다.

## 2. 금지되는 작업 방식

다음 방식은 GPAO-T 개발 방향에서 금지한다.

- 제3자 OpenClaw 호환성 코드를 고치는 일을 GPAO-T 제품 개발 전체로 착각하는 것
- Codex가 편한 개발 흐름을 사용자의 운영 경험으로 착각하는 것
- MVP, 데모, 임시 패치, 낮은 성능의 개조물을 최종 제품처럼 취급하는 것
- 기능 목록을 많이 붙이는 것을 운영체제의 완성도로 착각하는 것
- 모델 호출, MCP, CLI, 플러그인, 로컬 서버 같은 부품을 연결했다는 이유로 OS 경험이 생겼다고 말하는 것
- 사용자 입장에서의 흐름, 이해도, 신뢰, 속도감, 복구감, 승인감 없이 엔진만 쌓는 것
- 이미 존재하는 도구의 UI/UX와 작동 원리를 연구하지 않고 바로 구현하는 것

## 3. 연구 대상

GPAO-T는 다음 표면을 함께 연구해야 한다.

- OpenClaw: 제3자 비교 제품으로서 로컬 PC 기반 실행, 도구 연결, MCP/CLI 흐름, 세션/작업 운영
- Codex: 개발 리듬, 코드베이스 이해, 계획/구현/검증/마감 흐름, 플러그인/스킬 구조
- Claude / Claude Code: 대화 체감, 작업 지시 이해, 파일/프로젝트 기반 개발 경험, 권한/도구 사용 흐름
- 기타 로컬 AI 운영 도구: 로컬 모델, 로컬 에이전트, 로컬 메모리, 데스크톱 자동화, 브라우저/문서/파일 작업 흐름
- 선도 에이전트/OS 프로젝트: OpenHands, AutoGPT, OpenInterpreter, Khoj, Letta, MemoryOS, LangGraph, CrewAI, MetaGPT, OS-Copilot 등
- 일반 사용자 경험: 비개발자가 느끼는 쉬움, 막힘, 불안, 신뢰, 속도, 통제감, 복구 가능성

연구의 목적은 복제가 아니다. 목적은 각 도구의 본질, 강점, 실패 지점, 체감 품질을 분해한 뒤 GPAO-T 방식으로 재구성하는 것이다.

## 4. GPAO-T가 반드시 가져야 하는 전체 흐름

GPAO-T의 핵심 운영 흐름은 다음 순서로 설계한다.

1. 사용자가 평범한 말로 요청한다.
2. GPAO-T가 사용자의 현재 의도와 이전 흐름을 복원한다.
3. 관련 문맥, 기억 후보, 프로젝트 상태, 작업 경계를 분류한다.
4. T-cell / T-sphere 관점으로 작동 원리와 핵심 기준을 뽑는다.
5. LLM에게 넘길 최적의 작업 맥락 패킷을 구성한다.
6. 모델, 도구, MCP, CLI, 로컬 앱, 브라우저, 문서 작업 중 필요한 경로를 선택한다.
7. 사용자가 알 필요 없는 내부 준비는 자동으로 진행한다.
8. 실제 외부 전송, 삭제, 배포, 비용, 계정, 비밀키, 라이브 규칙 변경 같은 권한 경계만 사용자에게 명확히 묻는다.
9. 실행 결과를 검증하고, 실패하면 복구한다.
10. 반복되는 실패와 성공에서 성장 후보를 만든다.
11. 성장 후보는 replay와 승인 게이트를 통과한 뒤에만 live rule, skill, memory, workflow로 승격된다.

이 흐름에서 중요한 것은 "AI가 많이 한다"가 아니다. 중요한 것은 사용자가 느끼기에 다음 상태가 되어야 한다는 점이다.

- 내가 무슨 말을 했는지 제대로 알아듣는다.
- 내가 개발자가 아니어도 흐름을 놓치지 않는다.
- 뭐가 실행됐고 뭐가 아직 실행되지 않았는지 구분된다.
- 위험한 일은 묻고, 안전한 준비는 알아서 한다.
- 실패해도 복구할 길이 보인다.
- 쓸수록 내 일과 생각을 더 잘 이해한다.

## 5. 연구-설계-구현 순서

앞으로 GPAO-T 개발은 다음 순서를 기본값으로 삼는다.

### Phase A. Comparative Study

제3자 비교 제품인 OpenClaw, Codex, Claude, 로컬 AI 도구, 에이전트 런타임, memory OS, agent OS 사례를 조사한다.

산출물:
- 기능/작동원리 비교표
- UI/UX 체감 비교
- 일반 사용자 관점의 장단점
- GPAO-T에 흡수할 원리와 버릴 원리

### Phase B. User-Perceived OS Flow

사용자가 실제로 느끼는 GPAO-T의 첫 화면, 첫 요청, 작업 진행, 승인, 결과 확인, 복구, 성장 제안을 설계한다.

산출물:
- 사용자 여정
- 화면/대화 흐름
- 상태 언어
- 승인/권한 UX
- 실패/복구 UX

### Phase C. Core Operating Architecture

사용자 흐름을 가능하게 하는 내부 OS 구조를 설계한다.

산출물:
- GPAO Core Engine 역할
- LLM-ready task context packet
- Context Mesh / Memory Wiki / T-cell admission
- Model Router
- Tool / MCP / CLI / connector governance
- Replay / Growth Loop
- Authority / Audit / Rollback layer

### Phase D. Independent Runtime Design And Compatibility Migration

GPAO-T 독립 런타임을 설계하고, 제3자 OpenClaw 호환성 코드에서 필요한 기능을 GPAO-T 소유 구성요소로 재구현하거나 이행한다.

산출물:
- 제3자 OpenClaw 비교에서 재설계할 기능 원리
- 버릴 기능
- 바꿔야 할 프롬프트/시스템 주입 구조
- 바꿔야 할 UX/상태 언어
- 호환성 런타임 변경 전 검증 시나리오

### Phase E. Implementation With Evidence

구현은 연구와 설계에 의해 정렬된 뒤 진행한다.

산출물:
- 작게 검증 가능한 구현 단위
- 사용자 시나리오 테스트
- 성능/체감/안정성 기준
- replay evidence
- closeout과 다음 성장 후보

## 6. 현재 작업의 재분류

현재 GPAO-T의 Compatibility / Migration Lab은 다음으로 제한한다.

- third-party OpenClaw compatibility runtime on 윤's PC
- third-party OpenClaw comparison source under `openclaw-clean-lab/github-openclaw-source`
- GPAO-T compatibility/migration dashboard lab under `openclaw-clean-lab/gpao-t-openclaw-dashboard-lab`
- GPAO-T source, docs, tests, and evidence under this repository

`gpao-t-hardware-engine`은 현재 공정에서 제외한다. 이 저장소는 GPAO-T 제품 소스, 제3자 OpenClaw 호환성/마이그레이션 근거, source seal, production package seal, or completion gate가 아니다.

## 7. 다음 우선순위

다음 우선순위는 다음 세 가지다.

1. GPAO-T Competitive / UX / Operating Principle Research Matrix를 만든다.
2. 제3자 비교 제품인 OpenClaw / Codex / Claude / local AI tools를 사용자 체감 기준으로 비교한다.
3. 그 결과를 바탕으로 GPAO-T의 first real OS flow를 다시 정의한다.

그 뒤에는 제3자 OpenClaw 호환성 prompt-path migration check, UI surface redesign, memory/replay/self-growth hardening을 이어간다.

## 8. Codex의 작업 태도

Codex는 이 프로젝트에서 단순 개발자가 아니다.

Codex의 역할:
- 연구자
- 제품 설계자
- 구현자
- 검증자
- 사용자 언어 번역자
- 멀티 에이전트 리더
- 방향 이탈 감시자

Codex는 사용자가 전문 개발자가 아니라는 사실을 작업 설계에 반영해야 한다. 기술 세부사항을 숨기라는 뜻이 아니다. 사용자가 결정해야 할 것은 제품 방향, 체감, 승인 경계이고, Codex가 처리해야 할 것은 조사, 정리, 구현, 검증, 문서화다.

## 9. 성공 기준

GPAO-T가 성공하려면 다음 질문에 답해야 한다.

- 왜 제3자 제품인 OpenClaw나 Codex나 Claude만 쓰면 안 되는가?
- 일반 사용자는 GPAO-T에서 무엇을 더 편하고 안전하게 느끼는가?
- GPAO-T는 어떻게 사용자의 반복 경험에서 성장하는가?
- 성장은 어떻게 검증되고, 잘못된 성장은 어떻게 막히는가?
- 로컬 PC 기반 운영체제로서 무엇을 직접 실행하고, 무엇을 승인받고, 무엇을 절대 숨기지 않는가?
- 사용자는 첫날부터 어떤 핵심 경험을 느끼는가?
- 시간이 지날수록 어떤 체감 성능이 좋아지는가?

이 질문들에 대한 답이 문서, 화면, 런타임, 검증 증거로 연결될 때 GPAO-T는 단순한 도구 묶음이 아니라 하나의 운영체제로 성장한다.
